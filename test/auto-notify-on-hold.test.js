// test/auto-notify-on-hold.test.js — With AUTO_NOTIFY_ENABLED unset/false the add-on cannot be
// bought, switched on, shown or sent, whatever the organization row says.
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
delete process.env.AUTO_NOTIFY_ENABLED;

const plans = require('../lib/plans');
const sub = require('../lib/subscription');
const jobs = require('../lib/jobs');
const billingHandler = require('../api/billing');
const authHandler = require('../api/auth');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

const paidAutoOrg = () => ({ id: 'ORG-1', name: 'Lib', plan: 'basic', seat_limit: 100, subscription_status: 'active', is_demo: false,
  whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: new Date(Date.now() + 30 * 86400000).toISOString(), phone: '9876543210', email: 'o@example.com' });

describe('Automatic WhatsApp add-on on hold', () => {
  test('feature flag defaults to off', () => {
    assert.equal(plans.isAutoNotifyEnabled(), false);
    assert.deepEqual(plans.featureFlags(), { autoNotify: false });
  });

  test('an org row that says active+automatic still derives to manual', () => {
    const s = sub.deriveSubscription(paidAutoOrg());
    assert.equal(s.whatsappMode, 'manual');
    assert.equal(s.autoEligible, false);
    assert.equal(s.autoFeatureEnabled, false);
    assert.equal(s.autoLabel, 'Manual');
  });

  test('checkout, quote and mode switch for the add-on are refused with AUTO_NOTIFY_ON_HOLD', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
      [/FROM organizations WHERE id = \$1$/, { rows: [paidAutoOrg()], rowCount: 1 }],
    ]);
    for (const body of [
      { action: 'checkout', kind: 'auto_notify', months: 3 },
      { action: 'quote', kind: 'auto_notify', months: 3 },
      { action: 'set_whatsapp_mode', mode: 'automatic' },
      { action: 'run_reminders_now' },
      { action: 'whatsapp_test', phone: '9876543210' },
    ]) {
      const res = await call(billingHandler, db, { body, headers: COOKIE });
      assert.equal(res.statusCode, 403, `${body.action}: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.code, 'AUTO_NOTIFY_ON_HOLD', body.action);
    }
    assert.equal(db.sqlMatching(/INSERT INTO billing_orders/).length, 0);
  });

  test('plan purchases still work while the add-on is on hold', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'free', seat_limit: 5 })),
      [/FROM organizations WHERE id = \$1$/, { rows: [{ ...paidAutoOrg(), plan: 'free', seat_limit: 5 }], rowCount: 1 }],
    ]);
    const res = await call(billingHandler, db, { body: { action: 'quote', kind: 'plan', plan: 'basic' }, headers: COOKIE });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.quote.total, 5000);
  });

  test('status and client_config tell the client the feature is off', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
      [/FROM organizations WHERE id = \$1$/, { rows: [paidAutoOrg()], rowCount: 1 }],
      [/SELECT COUNT\(\*\)::int AS n FROM seats/, { rows: [{ n: 10 }], rowCount: 1 }],
    ]);
    const status = await call(billingHandler, db, { body: { action: 'status' }, headers: COOKIE });
    assert.equal(status.body.features.autoNotify, false);
    const cfg = await call(authHandler, fakeDb([]), { body: { action: 'client_config' } });
    assert.equal(cfg.body.features.autoNotify, false);
  });

  test('the daily job sends nothing', async () => {
    const calls = [];
    const exec = async (sql, params) => {
      calls.push(sql);
      if (/FROM organizations\s+WHERE whatsapp_mode = 'automatic'/.test(sql)) return { rows: [paidAutoOrg()], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    };
    const summary = await jobs.runScheduledJobs({ cron: '30 3 * * *', exec });
    assert.equal(summary.reason, 'auto_notify_on_hold');
    assert.equal(summary.libraries.length, 0);
    assert.equal(calls.some(s => /INSERT INTO communication_logs/.test(s)), false);
  });
});
