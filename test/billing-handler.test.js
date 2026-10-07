// test/billing-handler.test.js — Real api/billing.js and api/webhooks.js against a scripted DB
'use strict';
process.env.AUTO_NOTIFY_ENABLED = 'true'; // the add-on is on hold in production; these tests cover it switched on
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);

const billingHandler = require('../api/billing');
const webhooksHandler = require('../api/webhooks');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

const SECRET = 'cf_secret_' + crypto.randomBytes(8).toString('hex');
const ENV_KEYS = ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_ENV', 'APP_URL', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID'];
const saved = {};
const realFetch = global.fetch;

function unconfigure() {
  for (const k of ENV_KEYS) delete process.env[k];
}
function configure() {
  process.env.CASHFREE_APP_ID = 'app_test';
  process.env.CASHFREE_SECRET_KEY = SECRET;
  process.env.CASHFREE_ENV = 'sandbox';
  process.env.APP_URL = 'https://studyflow.example';
}

function orgRow(over = {}) {
  return { id: 'ORG-1', name: 'Test Library', plan: 'basic', seat_limit: 100, subscription_status: 'active', is_demo: false,
    plan_paid_at: null, whatsapp_mode: 'manual', whatsapp_auto_status: 'not_subscribed', whatsapp_auto_until: null, whatsapp_auto_ref: null,
    phone: '9876543210', email: 'owner@example.com', ...over };
}

function billingDb({ org = orgRow(), session, seats = 72, extra = [] } = {}) {
  const sess = session || sessionRow({ plan: org.plan, seat_limit: org.seat_limit, is_demo: org.is_demo, whatsapp_mode: org.whatsapp_mode, whatsapp_auto_status: org.whatsapp_auto_status, whatsapp_auto_until: org.whatsapp_auto_until });
  return fakeDb([
    ...baseAnswers(sess),
    ...extra,
    [/FROM organizations WHERE id = \$1$/, { rows: [org], rowCount: 1 }],
    [/SELECT COUNT\(\*\)::int AS n FROM seats/, { rows: [{ n: seats }], rowCount: 1 }],
    [/INSERT INTO billing_orders/, (sql, p) => ({ rows: [{ id: p[0], organization_id: p[1], kind: p[3], plan: p[4], seats: p[5], months: p[6], amount: p[7], status: 'created', provider: p[10] }], rowCount: 1 })],
  ]);
}

const post = (db, body, headers = COOKIE) => call(billingHandler, db, { body, headers });

describe('api/billing: status & quotes', () => {
  beforeEach(() => { for (const k of ENV_KEYS) saved[k] = process.env[k]; unconfigure(); });
  afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } global.fetch = realFetch; });

  test('status returns the derived subscription, seat usage, pricing and whether payments are live', async () => {
    const res = await post(billingDb(), { action: 'status' });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.subscription.plan, 'basic');
    assert.equal(res.body.subscription.seatLimit, 100);
    assert.equal(res.body.seatsUsed, 72);
    assert.equal(res.body.pricing.basic.price, 5000);
    assert.equal(res.body.payments.configured, false);
    assert.equal(res.body.subscription.autoLabel, 'Manual');
  });

  test('quotes come from the server: custom 300 = ₹15,000; add-on 3 months on 100 seats = ₹3,000', async () => {
    const q1 = await post(billingDb(), { action: 'quote', kind: 'plan', plan: 'custom', seats: 300 });
    assert.equal(q1.body.quote.total, 15000);
    const q2 = await post(billingDb(), { action: 'quote', kind: 'auto_notify', months: 3 });
    assert.equal(q2.body.quote.total, 3000);
    const bad = await post(billingDb(), { action: 'quote', kind: 'plan', plan: 'custom', seats: 50 });
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.body.code, 'INVALID_QUOTE');
  });

  test('anonymous requests are rejected', async () => {
    const res = call(billingHandler, fakeDb([]), { body: { action: 'status' } });
    assert.equal((await res).statusCode, 401);
  });
});

describe('api/billing: checkout', () => {
  beforeEach(() => { for (const k of ENV_KEYS) saved[k] = process.env[k]; unconfigure(); });
  afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } global.fetch = realFetch; });

  test('without Cashfree keys the owner is told to pay manually and no order is written', async () => {
    const db = billingDb({ org: orgRow({ plan: 'free', seat_limit: 5 }) });
    const res = await post(db, { action: 'checkout', kind: 'plan', plan: 'basic' });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'PAYMENTS_NOT_CONFIGURED');
    assert.equal(db.sqlMatching(/INSERT INTO billing_orders/).length, 0);
  });

  test('Free → Basic: creates the order with the server price and starts a Cashfree session', async () => {
    configure();
    let cfRequest = null;
    global.fetch = async (url, init) => {
      cfRequest = { url, body: JSON.parse(init.body), headers: init.headers };
      return { ok: true, status: 200, text: async () => JSON.stringify({ order_id: cfRequest.body.order_id, cf_order_id: 555, payment_session_id: 'sess_123', order_status: 'ACTIVE' }) };
    };
    const db = billingDb({ org: orgRow({ plan: 'free', seat_limit: 5 }) });
    const res = await post(db, { action: 'checkout', kind: 'plan', plan: 'basic', phone: '9876543210' });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.paymentSessionId, 'sess_123');
    assert.equal(res.body.amount, 5000);
    const ins = db.sqlMatching(/INSERT INTO billing_orders/)[0];
    assert.equal(ins.params[3], 'plan');
    assert.equal(ins.params[4], 'basic');
    assert.equal(ins.params[5], 100);
    assert.equal(Number(ins.params[7]), 5000);
    assert.equal(cfRequest.body.order_amount, 5000, 'Cashfree gets the server price');
    assert.equal(cfRequest.body.order_meta.notify_url, 'https://studyflow.example/api/webhooks/cashfree');
    assert.match(cfRequest.body.order_meta.return_url, /^https:\/\/studyflow\.example\/#\/billing\?order=ORD-/);
    assert.equal(cfRequest.headers['x-client-secret'], SECRET);
  });

  test('the client cannot pick its own price: amount/plan fields in the body are ignored', async () => {
    configure();
    let sent = null;
    global.fetch = async (url, init) => { sent = JSON.parse(init.body); return { ok: true, status: 200, text: async () => JSON.stringify({ payment_session_id: 's', order_status: 'ACTIVE' }) }; };
    const res = await post(billingDb({ org: orgRow({ plan: 'free', seat_limit: 5 }) }), { action: 'checkout', kind: 'plan', plan: 'basic', amount: 1, total: 1, seatLimit: 9999 });
    assert.equal(res.statusCode, 200);
    assert.equal(sent.order_amount, 5000);
  });

  test('Basic cannot be bought twice; Custom must be an upgrade', async () => {
    configure();
    global.fetch = async () => { throw new Error('must not reach Cashfree'); };
    const twice = await post(billingDb(), { action: 'checkout', kind: 'plan', plan: 'basic' });
    assert.equal(twice.statusCode, 409);
    assert.equal(twice.body.code, 'ALREADY_PAID');
    const down = await post(billingDb({ org: orgRow({ plan: 'custom', seat_limit: 300 }) }), { action: 'checkout', kind: 'plan', plan: 'custom', seats: 200 });
    assert.equal(down.statusCode, 409);
    assert.equal(down.body.code, 'NOT_AN_UPGRADE');
  });

  test('the add-on needs a paid plan, and prices by the plan seat capacity', async () => {
    configure();
    let sent = null;
    global.fetch = async (url, init) => { sent = JSON.parse(init.body); return { ok: true, status: 200, text: async () => JSON.stringify({ payment_session_id: 's', order_status: 'ACTIVE' }) }; };
    const free = await post(billingDb({ org: orgRow({ plan: 'free', seat_limit: 5 }) }), { action: 'checkout', kind: 'auto_notify', months: 3 });
    assert.equal(free.statusCode, 403);
    assert.equal(free.body.code, 'AUTO_NOTIFY_NOT_ELIGIBLE');
    const db = billingDb({ org: orgRow({ plan: 'custom', seat_limit: 200 }) });
    const res = await post(db, { action: 'checkout', kind: 'auto_notify', months: 6 });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.amount, 200 * 10 * 6);
    assert.equal(sent.order_amount, 12000);
    const ins = db.sqlMatching(/INSERT INTO billing_orders/)[0];
    assert.equal(ins.params[3], 'auto_notify');
    assert.equal(ins.params[6], 6);
  });

  test('staff cannot buy; the demo library has no billing', async () => {
    configure();
    const staff = await post(billingDb({ session: sessionRow({ role: 'staff' }) }), { action: 'checkout', kind: 'plan', plan: 'basic' });
    assert.equal(staff.statusCode, 403);
    const demo = await post(billingDb({ org: orgRow({ plan: 'demo', is_demo: true }) }), { action: 'checkout', kind: 'plan', plan: 'custom', seats: 200 });
    assert.equal(demo.statusCode, 403);
    assert.equal(demo.body.code, 'DEMO_LOCKED');
  });

  test('a phone number is required for the receipt', async () => {
    configure();
    const res = await post(billingDb({ org: orgRow({ plan: 'free', seat_limit: 5, phone: '' }), session: sessionRow({ phone: null }) }), { action: 'checkout', kind: 'plan', plan: 'basic' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'PHONE_REQUIRED');
  });

  test('switching to automatic without an active add-on is refused with 402', async () => {
    const res = await post(billingDb(), { action: 'set_whatsapp_mode', mode: 'automatic' });
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.code, 'AUTO_NOTIFY_PAYMENT_REQUIRED');
  });

  test('sync returns a paid order without asking Cashfree again', async () => {
    configure();
    global.fetch = async () => { throw new Error('must not reach Cashfree'); };
    const paid = { id: 'ORD-PAID', organization_id: 'ORG-1', kind: 'plan', plan: 'basic', seats: 100, amount: '5000.00', status: 'paid', provider: 'cashfree' };
    const db = billingDb({ extra: [[/SELECT \* FROM billing_orders WHERE id = \$1$/, { rows: [paid], rowCount: 1 }]] });
    const res = await post(db, { action: 'sync', orderId: 'ORD-PAID' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.orderStatus, 'PAID');
  });
});

describe('api/webhooks: Cashfree', () => {
  beforeEach(() => { for (const k of ENV_KEYS) saved[k] = process.env[k]; unconfigure(); configure(); });
  afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } global.fetch = realFetch; });

  function signed(payload, { timestamp = String(Math.floor(Date.now() / 1000)), secret = SECRET } = {}) {
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
    return { rawBody, body: payload, headers: { 'content-type': 'application/json', 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp } };
  }

  function webhookDb(order, { orgRowOverrides = {} } = {}) {
    const seen = new Set();
    let currentOrder = { ...order };
    const db = fakeDb([
      [/INSERT INTO billing_events/, (sql, p) => { if (seen.has(p[0])) return { rowCount: 0 }; seen.add(p[0]); return { rowCount: 1 }; }],
      [/SELECT \* FROM billing_orders WHERE id = \$1 FOR UPDATE/, () => ({ rows: [currentOrder], rowCount: 1 })],
      [/SELECT \* FROM billing_orders WHERE id = \$1$/, () => ({ rows: [currentOrder], rowCount: 1 })],
      [/UPDATE billing_orders\s+SET status = 'paid'/, (sql, p) => { if (currentOrder.status === 'paid') return { rows: [], rowCount: 0 }; currentOrder = { ...currentOrder, status: 'paid', provider_payment_id: p[2] }; return { rows: [currentOrder], rowCount: 1 }; }],
      [/UPDATE organizations\s+SET plan = \$2/, (sql, p) => ({ rows: [orgRow({ plan: p[1], seat_limit: p[2], ...orgRowOverrides })], rowCount: 1 })],
      [/UPDATE organizations\s+SET whatsapp_auto_until/, (sql, p) => ({ rows: [orgRow({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: new Date(Date.now() + p[1] * 30 * 86400000).toISOString(), ...orgRowOverrides })], rowCount: 1 })],
      [/UPDATE organizations\s+SET whatsapp_auto_status = 'payment_failed'/, { rows: [{ id: 'ORG-1' }], rowCount: 1 }],
      [/UPDATE billing_orders\s+SET status = \$2, failure_reason/, (sql, p) => ({ rows: [{ ...currentOrder, status: p[1] }], rowCount: 1 })],
    ]);
    return db;
  }

  const planOrder = { id: 'ORD-1', organization_id: 'ORG-1', kind: 'plan', plan: 'basic', seats: 100, months: null, amount: '5000.00', status: 'created', provider: 'cashfree' };
  const successPayload = (orderId = 'ORD-1', amount = 5000) => ({
    type: 'PAYMENT_SUCCESS_WEBHOOK', event_time: new Date().toISOString(),
    data: { order: { order_id: orderId, order_amount: amount }, payment: { cf_payment_id: 42, payment_status: 'SUCCESS', payment_amount: amount, payment_time: new Date().toISOString() } },
  });

  test('a valid PAYMENT_SUCCESS applies the plan once; a replay is answered 200 without re-applying', async () => {
    const db = webhookDb(planOrder);
    const s = signed(successPayload());
    const first = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(first.statusCode, 200, JSON.stringify(first.body));
    assert.equal(first.body.applied, true);
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET plan = \$2/).length, 1);
    const upd = db.sqlMatching(/UPDATE organizations\s+SET plan = \$2/)[0];
    assert.deepEqual(upd.params, ['ORG-1', 'basic', 100]);

    const replay = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET plan = \$2/).length, 1, 'not applied twice');
  });

  test('the same payment reported twice with different bodies is still applied once (finalizeOrder is idempotent)', async () => {
    const db = webhookDb(planOrder);
    const a = signed(successPayload());
    const b = signed({ ...successPayload(), event_time: 'later' });
    await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: a.body, rawBody: a.rawBody, headers: a.headers });
    const second = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: b.body, rawBody: b.rawBody, headers: b.headers });
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.applied, false);
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET plan = \$2/).length, 1);
  });

  test('bad signature, stale timestamp and unknown provider are rejected before anything is read', async () => {
    const db = webhookDb(planOrder);
    const s = signed(successPayload(), { secret: 'wrong' });
    const bad = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(bad.statusCode, 401);
    const stale = signed(successPayload(), { timestamp: String(Math.floor(Date.now() / 1000) - 3600) });
    const old = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: stale.body, rawBody: stale.rawBody, headers: stale.headers });
    assert.equal(old.statusCode, 401);
    const other = await call(webhooksHandler, db, { url: '/api/webhooks/paypal', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(other.statusCode, 404);
    assert.equal(db.sqlMatching(/billing_orders|organizations/).length, 0);
  });

  test('an underpaid success is not applied', async () => {
    const db = webhookDb(planOrder);
    const s = signed(successPayload('ORD-1', 100));
    const res = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(res.statusCode, 409);
    assert.equal(db.sqlMatching(/UPDATE organizations/).length, 0);
  });

  test('a successful add-on payment activates automatic notifications', async () => {
    const autoOrder = { ...planOrder, id: 'ORD-A', kind: 'auto_notify', plan: null, seats: 100, months: 3, amount: '3000.00' };
    const db = webhookDb(autoOrder);
    const s = signed(successPayload('ORD-A', 3000));
    const res = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.applied, true);
    const upd = db.sqlMatching(/UPDATE organizations\s+SET whatsapp_auto_until/)[0];
    assert.deepEqual(upd.params, ['ORG-1', 3, 'ORD-A']);
  });

  test('a failed add-on payment marks the order failed and the add-on payment_failed (→ manual)', async () => {
    const autoOrder = { ...planOrder, id: 'ORD-F', kind: 'auto_notify', plan: null, months: 1, amount: '1000.00' };
    const db = webhookDb(autoOrder);
    const s = signed({ type: 'PAYMENT_FAILED_WEBHOOK', data: { order: { order_id: 'ORD-F', order_amount: 1000 }, payment: { cf_payment_id: 7, payment_status: 'FAILED', payment_amount: 1000, payment_message: 'Insufficient funds' } } });
    const res = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.recorded, 'failure');
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET whatsapp_auto_status = 'payment_failed'/).length, 1);
    assert.equal(db.sqlMatching(/UPDATE billing_orders\s+SET status = \$2, failure_reason/).length, 1);
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET plan/).length, 0);
  });

  test('a webhook for an unknown order is acknowledged and ignored', async () => {
    const db = fakeDb([[/INSERT INTO billing_events/, { rowCount: 1 }]]);
    const s = signed(successPayload('ORD-NOPE'));
    const res = await call(webhooksHandler, db, { url: '/api/webhooks/cashfree', body: s.body, rawBody: s.rawBody, headers: s.headers });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ignored, 'unknown_order');
  });
});
