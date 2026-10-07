// test/admin-handler.test.js — Developer Lab (api/admin.js) and coupons at checkout (api/billing.js)
'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
delete process.env.PLATFORM_ADMIN_EMAILS;

const adminHandler = require('../api/admin');
const billingHandler = require('../api/billing');
const { isPlatformAdmin } = require('../lib/platform-admin');
const coupons = require('../lib/coupons');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

const ADMIN_EMAIL = 'srchaudhari324@gmail.com';
const adminSession = (over = {}) => sessionRow({ email: ADMIN_EMAIL, name: 'Swapnil', plan: 'demo', seat_limit: 100, is_demo: true, ...over });

describe('Platform admin access', () => {
  test('only the configured email is a platform admin (case-insensitive); env overrides', () => {
    assert.equal(isPlatformAdmin(ADMIN_EMAIL), true);
    assert.equal(isPlatformAdmin('SRChaudhari324@gmail.com '), true);
    assert.equal(isPlatformAdmin('someone@example.com'), false);
    assert.equal(isPlatformAdmin(''), false);
    assert.equal(isPlatformAdmin('other@x.com', { PLATFORM_ADMIN_EMAILS: 'other@x.com, two@x.com' }), true);
    assert.equal(isPlatformAdmin(ADMIN_EMAIL, { PLATFORM_ADMIN_EMAILS: 'other@x.com' }), false);
  });

  test('a library owner who is not the platform admin gets 403 on every action', async () => {
    const db = fakeDb(baseAnswers(sessionRow({ email: 'owner@example.com' })));
    for (const action of ['overview', 'libraries', 'set_plan', 'coupons', 'coupon_create']) {
      const res = await call(adminHandler, db, { body: { action }, headers: COOKIE });
      assert.equal(res.statusCode, 403, action);
    }
    assert.equal(db.sqlMatching(/FROM coupons|INSERT INTO coupons|UPDATE organizations|FROM organizations o ORDER/).length, 0);
  });

  test('anonymous → 401', async () => {
    const res = await call(adminHandler, fakeDb([]), { body: { action: 'overview' } });
    assert.equal(res.statusCode, 401);
  });
});

describe('Developer Lab actions', () => {
  const libRow = (over = {}) => ({
    id: 'ORG-9', name: 'Sharma Library', slug: 'sharma', plan: 'free', seat_limit: 5, subscription_status: 'active', is_demo: false,
    created_at: '2026-10-01T00:00:00Z', plan_paid_at: null, onboarding_completed: true, whatsapp_mode: 'manual', whatsapp_auto_status: 'not_subscribed', whatsapp_auto_until: null,
    seats_used: 5, students: 12, owner_email: 'owner@example.com', owner_name: 'Rahul', owner_last_login: null, revenue: '0', ...over,
  });

  test('overview summarises plans, revenue and coupons', async () => {
    const db = fakeDb([
      ...baseAnswers(adminSession()),
      [/SELECT plan, COUNT\(\*\)::int AS n FROM organizations GROUP BY plan/, { rows: [{ plan: 'free', n: 3 }, { plan: 'basic', n: 2 }, { plan: 'starter', n: 1 }] }],
      [/\(SELECT COUNT\(\*\)::int FROM organizations\) AS libraries/, { rows: [{ libraries: 6, suspended: 1, seats: 240, students: 300, users: 8, auto_active: 0 }] }],
      [/FROM billing_orders WHERE status = 'paid'/, { rows: [{ total: '15000', orders: 3, this_month: '5000' }] }],
      [/FROM coupons ORDER BY/, { rows: [{ code: 'SWAP100', percent_off: 100, applies_to: 'any', max_uses: null, uses: 1, expires_at: null, active: true }] }],
    ]);
    const res = await call(adminHandler, db, { body: { action: 'overview' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.totals.libraries, res.body.totals.free, res.body.totals.basic, res.body.totals.custom], [6, 3, 2, 1]);
    assert.equal(res.body.revenue.total, 15000);
    assert.equal(res.body.coupons[0].code, 'SWAP100');
  });

  test('libraries lists every library with owner, plan, seats and status', async () => {
    const db = fakeDb([
      ...baseAnswers(adminSession()),
      [/FROM organizations o ORDER BY o\.created_at DESC/, { rows: [libRow(), libRow({ id: 'ORG-10', plan: 'custom', seat_limit: 300, subscription_status: 'suspended' })] }],
    ]);
    const res = await call(adminHandler, db, { body: { action: 'libraries' }, headers: COOKIE });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.libraries.length, 2);
    assert.deepEqual([res.body.libraries[0].planName, res.body.libraries[0].seatLimit, res.body.libraries[0].ownerEmail], ['Free', 5, 'owner@example.com']);
    assert.deepEqual([res.body.libraries[1].seatLimit, res.body.libraries[1].status], [300, 'suspended']);
  });

  test('set_plan Free → Basic updates the row, records a manual order and an audit entry', async () => {
    const db = fakeDb([
      ...baseAnswers(adminSession()),
      [/FROM organizations WHERE id = \$1$/, { rows: [libRow()] }],
      [/INSERT INTO billing_orders/, (sql, p) => ({ rows: [{ id: p[0] }] })],
      [/FROM organizations o\s+WHERE o\.id = \$1/, { rows: [libRow({ plan: 'basic', seat_limit: 100 })] }],
    ]);
    const res = await call(adminHandler, db, { body: { action: 'set_plan', orgId: 'ORG-9', plan: 'basic', note: 'paid by UPI' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.library.planName, 'Basic');
    const upd = db.sqlMatching(/UPDATE organizations\s+SET plan = \$1/)[0];
    assert.deepEqual(upd.params.slice(0, 4), ['basic', 100, 'active', false]);
    const order = db.sqlMatching(/INSERT INTO billing_orders/)[0];
    assert.equal(order.params[10], 'manual');
    assert.equal(Number(order.params[7]), 5000);
    const auditRow = db.sqlMatching(/INSERT INTO audit_logs/)[0];
    assert.equal(auditRow.params[4], 'platform.set_plan');
  });

  test('set_plan validates custom seats and status', async () => {
    const db = fakeDb([...baseAnswers(adminSession()), [/FROM organizations WHERE id = \$1$/, { rows: [libRow()] }]]);
    const bad = await call(adminHandler, db, { body: { action: 'set_plan', orgId: 'ORG-9', plan: 'custom', seats: 50 }, headers: COOKIE });
    assert.equal(bad.statusCode, 400);
    const badStatus = await call(adminHandler, db, { body: { action: 'set_plan', orgId: 'ORG-9', status: 'deleted' }, headers: COOKIE });
    assert.equal(badStatus.statusCode, 400);
    assert.equal(db.sqlMatching(/UPDATE organizations/).length, 0);
  });

  test('coupon_create validates and stores; duplicates are refused', async () => {
    const db = fakeDb([
      ...baseAnswers(adminSession()),
      [/INSERT INTO coupons/, (sql, p) => ({ rows: [{ code: p[0], percent_off: p[1], applies_to: p[2], max_uses: p[3], expires_at: p[4], active: true, note: p[5], uses: 0 }] })],
    ]);
    const res = await call(adminHandler, db, { body: { action: 'coupon_create', code: ' swap100 ', percentOff: 100, appliesTo: 'plan', maxUses: 5 }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.coupon.code, res.body.coupon.percentOff, res.body.coupon.maxUses], ['SWAP100', 100, 5]);
    for (const body of [{ code: 'x', percentOff: 10 }, { code: 'OK10', percentOff: 0 }, { code: 'OK10', percentOff: 101 }, { code: 'OK10', percentOff: 10, appliesTo: 'everything' }]) {
      const bad = await call(adminHandler, db, { body: { action: 'coupon_create', ...body }, headers: COOKIE });
      assert.equal(bad.statusCode, 400, JSON.stringify(body));
    }
    const dup = fakeDb([...baseAnswers(adminSession()), [/INSERT INTO coupons/, { rows: [] }]]);
    const d = await call(adminHandler, dup, { body: { action: 'coupon_create', code: 'SWAP100', percentOff: 100 }, headers: COOKIE });
    assert.equal(d.statusCode, 409);
  });
});

describe('Coupons at checkout (api/billing.js)', () => {
  const saved = {};
  const realFetch = global.fetch;
  beforeEach(() => { for (const k of ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'APP_URL']) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } global.fetch = realFetch; });

  const couponRow = (over = {}) => ({ code: 'SWAP100', percent_off: 100, applies_to: 'any', max_uses: null, uses: 0, expires_at: null, active: true, ...over });
  const freeOrg = () => ({ id: 'ORG-1', name: 'Lib', plan: 'free', seat_limit: 5, subscription_status: 'active', is_demo: false, whatsapp_mode: 'manual', whatsapp_auto_status: 'not_subscribed', whatsapp_auto_until: null, phone: '9876543210', email: 'o@example.com' });

  function checkoutDb(coupon, { orderStatus = 'created' } = {}) {
    let order = null;
    return fakeDb([
      ...baseAnswers(sessionRow({ plan: 'free', seat_limit: 5 })),
      [/FROM organizations WHERE id = \$1$/, { rows: [freeOrg()] }],
      [/SELECT \* FROM coupons WHERE code = \$1/, { rows: coupon ? [coupon] : [] }],
      [/INSERT INTO billing_orders/, (sql, p) => { order = { id: p[0], organization_id: p[1], kind: p[3], plan: p[4], seats: p[5], months: p[6], amount: p[7], status: orderStatus, provider: p[10], coupon_code: p[12], discount: p[13] }; return { rows: [order] }; }],
      [/SELECT \* FROM billing_orders WHERE id = \$1 FOR UPDATE/, () => ({ rows: [order] })],
      [/UPDATE billing_orders\s+SET status = 'paid'/, () => { order = { ...order, status: 'paid' }; return { rows: [order] }; }],
      [/UPDATE organizations\s+SET plan = \$2/, (sql, p) => ({ rows: [{ ...freeOrg(), plan: p[1], seat_limit: p[2] }] })],
      [/UPDATE coupons SET uses = uses \+ 1/, { rows: [{ code: 'SWAP100' }] }],
    ]);
  }

  test('quote shows the discount; 100% → ₹0', async () => {
    const db = checkoutDb(couponRow());
    const res = await call(billingHandler, db, { body: { action: 'quote', kind: 'plan', plan: 'basic', coupon: 'swap100' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.quote.subtotalBeforeDiscount, res.body.quote.discount, res.body.quote.total, res.body.quote.couponCode], [5000, 5000, 0, 'SWAP100']);
    const half = await call(billingHandler, checkoutDb(couponRow({ code: 'HALF', percent_off: 50 })), { body: { action: 'quote', kind: 'plan', plan: 'custom', seats: 300, coupon: 'HALF' }, headers: COOKIE });
    assert.deepEqual([half.body.quote.discount, half.body.quote.total], [7500, 7500]);
  });

  test('a 100% coupon activates the plan immediately with no payment provider, and counts a use', async () => {
    global.fetch = async () => { throw new Error('Cashfree must not be called'); };
    const db = checkoutDb(couponRow());
    const res = await call(billingHandler, db, { body: { action: 'checkout', kind: 'plan', plan: 'basic', coupon: 'SWAP100' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.free, true);
    assert.equal(res.body.applied, true);
    assert.equal(res.body.subscription.plan, 'basic');
    const ins = db.sqlMatching(/INSERT INTO billing_orders/)[0];
    assert.deepEqual([ins.params[10], ins.params[12], Number(ins.params[7]), Number(ins.params[13])], ['coupon', 'SWAP100', 0, 5000]);
    assert.equal(db.sqlMatching(/UPDATE organizations\s+SET plan = \$2/).length, 1);
    assert.equal(db.sqlMatching(/UPDATE coupons SET uses = uses \+ 1/).length, 1);
  });

  test('a partial coupon reduces what Cashfree is asked to collect', async () => {
    process.env.CASHFREE_APP_ID = 'app'; process.env.CASHFREE_SECRET_KEY = 'secret'; process.env.APP_URL = 'https://studyflow.example';
    let sent = null;
    global.fetch = async (url, init) => { sent = JSON.parse(init.body); return { ok: true, status: 200, text: async () => JSON.stringify({ payment_session_id: 's', order_status: 'ACTIVE' }) }; };
    const db = checkoutDb(couponRow({ code: 'HALF', percent_off: 50 }));
    const res = await call(billingHandler, db, { body: { action: 'checkout', kind: 'plan', plan: 'basic', coupon: 'HALF' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.amount, 2500);
    assert.equal(sent.order_amount, 2500);
    assert.equal(db.sqlMatching(/UPDATE coupons SET uses/).length, 0, 'not consumed until the payment completes');
  });

  test('invalid, expired, exhausted and not-applicable coupons are refused before any order exists', async () => {
    const cases = [
      [null, 'COUPON_INVALID'],
      [couponRow({ active: false }), 'COUPON_INVALID'],
      [couponRow({ expires_at: new Date(Date.now() - 1000).toISOString() }), 'COUPON_EXPIRED'],
      [couponRow({ max_uses: 1, uses: 1 }), 'COUPON_EXHAUSTED'],
      [couponRow({ applies_to: 'auto_notify' }), 'COUPON_NOT_APPLICABLE'],
    ];
    for (const [row, code] of cases) {
      const db = checkoutDb(row);
      const res = await call(billingHandler, db, { body: { action: 'checkout', kind: 'plan', plan: 'basic', coupon: 'SWAP100' }, headers: COOKIE });
      assert.equal(res.statusCode, 400, code);
      assert.equal(res.body.code, code);
      assert.equal(db.sqlMatching(/INSERT INTO billing_orders/).length, 0, code);
    }
  });

  test('lib/coupons.applyCoupon recomputes tax on the discounted amount', () => {
    const q = coupons.applyCoupon({ subtotal: 5000, taxPercent: 18, tax: 900, total: 5900, description: 'Basic' }, { code: 'HALF', percentOff: 50 });
    assert.deepEqual([q.discount, q.subtotal, q.tax, q.total], [2500, 2500, 450, 2950]);
  });
});
