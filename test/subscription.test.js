// test/subscription.test.js — Subscription state machine (lib/subscription.js)
'use strict';
process.env.AUTO_NOTIFY_ENABLED = 'true'; // the add-on is on hold in production; these tests cover it switched on
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const sub = require('../lib/subscription');

const DAY = 86400000;
const future = (days) => new Date(Date.now() + days * DAY).toISOString();
const past = (days) => new Date(Date.now() - days * DAY).toISOString();

function org(over = {}) {
  return { id: 'ORG-1', name: 'Lib', plan: 'basic', seat_limit: 100, subscription_status: 'active', is_demo: false,
    whatsapp_mode: 'manual', whatsapp_auto_status: 'not_subscribed', whatsapp_auto_until: null, ...over };
}

describe('deriveSubscription', () => {
  test('Free plan: 5 seats, manual, add-on not eligible', () => {
    const s = sub.deriveSubscription(org({ plan: 'free', seat_limit: 100 }));
    assert.equal(s.plan, 'free');
    assert.equal(s.seatLimit, 5);
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.autoEligible, false);
    assert.equal(s.autoLabel, 'Manual');
  });

  test('Basic without the add-on: manual', () => {
    const s = sub.deriveSubscription(org());
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.autoStatus, 'not_subscribed');
    assert.equal(s.autoEligible, true);
    assert.equal(s.autoMonthlyFee, 100 * 10);
  });

  test('Active, paid, selected automatic → automatic', () => {
    const s = sub.deriveSubscription(org({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: future(10) }));
    assert.equal(s.whatsappMode, 'automatic');
    assert.equal(s.autoLabel, 'Automatic — Active');
    assert.equal(s.autoDaysLeft, 10);
  });

  test('Active but owner selected manual → manual, still paid', () => {
    const s = sub.deriveSubscription(org({ whatsapp_mode: 'manual', whatsapp_auto_status: 'active', whatsapp_auto_until: future(10) }));
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.autoStatus, 'active');
    assert.equal(s.whatsappSelectedMode, 'manual');
  });

  test('Paid period over → expired and manual, even before the nightly job runs', () => {
    const s = sub.deriveSubscription(org({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: past(1) }));
    assert.equal(s.autoStatus, 'expired');
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.autoLabel, 'Automatic — Payment Required');
  });

  test('Payment failed / cancelled → manual with a clear label', () => {
    assert.equal(sub.deriveSubscription(org({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'payment_failed' })).autoLabel, 'Automatic — Payment Failed');
    assert.equal(sub.deriveSubscription(org({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'payment_failed' })).whatsappMode, 'manual');
    assert.equal(sub.deriveSubscription(org({ whatsapp_auto_status: 'cancelled' })).autoLabel, 'Automatic — Cancelled');
  });

  test('Suspended library is never automatic', () => {
    const s = sub.deriveSubscription(org({ subscription_status: 'suspended', whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: future(10) }));
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.suspended, true);
  });

  test('Free plan can never be automatic, whatever the columns say', () => {
    const s = sub.deriveSubscription(org({ plan: 'free', whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: future(10) }));
    assert.equal(s.whatsappMode, 'manual');
  });

  test('Demo plan is eligible for the add-on (so the owner can demo it)', () => {
    const s = sub.deriveSubscription(org({ plan: 'demo', is_demo: true, whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: future(30) }));
    assert.equal(s.whatsappMode, 'automatic');
    assert.equal(s.isDemo, true);
  });
});

describe('Transitions (SQL shape and guards)', () => {
  function execRecorder(reply) {
    const calls = [];
    const exec = async (sql, params) => { calls.push({ sql, params }); return typeof reply === 'function' ? reply(sql, params) : reply; };
    return { exec, calls };
  }

  test('applyAutoNotifyPayment extends from the later of now / current end and switches to automatic', async () => {
    const row = org({ whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: future(90) });
    const { exec, calls } = execRecorder({ rows: [row], rowCount: 1 });
    const s = await sub.applyAutoNotifyPayment('ORG-1', { months: 3, orderId: 'ORD-1' }, exec);
    assert.equal(s.whatsappMode, 'automatic');
    assert.match(calls[0].sql, /whatsapp_auto_until > CURRENT_TIMESTAMP\s+THEN whatsapp_auto_until ELSE CURRENT_TIMESTAMP END\) \+ make_interval\(months => \$2::int\)/);
    assert.match(calls[0].sql, /whatsapp_auto_status = 'active'/);
    assert.match(calls[0].sql, /whatsapp_mode = 'automatic'/);
    assert.deepEqual(calls[0].params, ['ORG-1', 3, 'ORD-1']);
  });

  test('applyAutoNotifyPayment rejects invalid months', async () => {
    const { exec } = execRecorder({ rows: [], rowCount: 0 });
    await assert.rejects(() => sub.applyAutoNotifyPayment('ORG-1', { months: 0 }, exec), /Invalid number of months/);
  });

  test('markAutoNotifyPaymentFailed never cuts off a period that is still paid', async () => {
    const { exec, calls } = execRecorder({ rows: [], rowCount: 0 });
    const changed = await sub.markAutoNotifyPaymentFailed('ORG-1', 'ORD-9', exec);
    assert.equal(changed, false);
    assert.match(calls[0].sql, /NOT \(whatsapp_auto_status = 'active' AND whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until > CURRENT_TIMESTAMP\)/);
  });

  test('setWhatsappMode(automatic) is refused without an active paid add-on', async () => {
    const { exec } = execRecorder({ rows: [org()], rowCount: 1 });
    await assert.rejects(() => sub.setWhatsappMode('ORG-1', 'automatic', exec), (err) => err.code === 'AUTO_NOTIFY_PAYMENT_REQUIRED' && err.status === 402);
  });

  test('setWhatsappMode(automatic) is refused on the Free plan', async () => {
    const { exec } = execRecorder({ rows: [org({ plan: 'free' })], rowCount: 1 });
    await assert.rejects(() => sub.setWhatsappMode('ORG-1', 'automatic', exec), (err) => err.code === 'AUTO_NOTIFY_NOT_ELIGIBLE');
  });

  test('setWhatsappMode(manual) always works and returns the new state', async () => {
    const { exec, calls } = execRecorder((sql) => ({ rows: [org({ whatsapp_mode: 'manual', whatsapp_auto_status: 'active', whatsapp_auto_until: future(5) })], rowCount: 1 }));
    const s = await sub.setWhatsappMode('ORG-1', 'manual', exec);
    assert.equal(s.whatsappMode, 'manual');
    assert.match(calls[calls.length - 1].sql, /SET whatsapp_mode = \$2/);
    assert.deepEqual(calls[calls.length - 1].params, ['ORG-1', 'manual']);
  });

  test('applyPlanPurchase sets plan + seat limit and refuses the demo library', async () => {
    const { exec, calls } = execRecorder({ rows: [org({ plan: 'custom', seat_limit: 300 })], rowCount: 1 });
    const s = await sub.applyPlanPurchase('ORG-1', { plan: 'custom', seats: 300, orderId: 'ORD-2' }, exec);
    assert.equal(s.seatLimit, 300);
    assert.match(calls[0].sql, /is_demo IS NOT TRUE/);
    assert.deepEqual(calls[0].params, ['ORG-1', 'custom', 300]);
    await assert.rejects(() => sub.applyPlanPurchase('ORG-1', { plan: 'custom', seats: 150 }, exec), (e) => e.code === 'INVALID_SEATS');
    await assert.rejects(() => sub.applyPlanPurchase('ORG-1', { plan: 'free' }, exec), (e) => e.code === 'INVALID_PLAN');
  });

  test('expireLapsedAutoNotify only touches active rows whose period ended', async () => {
    const { exec, calls } = execRecorder({ rows: [{ id: 'ORG-1', name: 'Lib' }], rowCount: 1 });
    const rows = await sub.expireLapsedAutoNotify(exec);
    assert.equal(rows.length, 1);
    assert.match(calls[0].sql, /whatsapp_auto_status = 'active'\s+AND whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until <= CURRENT_TIMESTAMP/);
  });
});
