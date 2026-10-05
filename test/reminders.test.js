// test/reminders.test.js — Automatic WhatsApp reminders (lib/reminders.js, lib/jobs.js)
'use strict';
process.env.AUTO_NOTIFY_ENABLED = 'true'; // the add-on is on hold in production; these tests cover it switched on
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { addDaysIST } = require('../lib/dates');
const reminders = require('../lib/reminders');
const jobs = require('../lib/jobs');

const TODAY = '2026-10-05';
const DAY = 86400000;

function row(over = {}) {
  return {
    membership_id: 'MEM-1', student_id: 'STU-1', start_date: '2026-09-01', end_date: '2026-10-31', due_date: '2026-10-08',
    final_amount: '1200', price: '1200', discount: '0', paid: '0',
    student_name: 'Priya Patel', phone: '9876543210', whatsapp_opt_in: true, communication_preferences: null, seat_number: 'A2',
    ...over,
  };
}

describe('planReminders (pure)', () => {
  test('payment due in 3 days and due today', () => {
    assert.equal(reminders.planReminders([row({ due_date: addDaysIST(TODAY, 3) })], TODAY)[0].event, 'payment_due');
    assert.equal(reminders.planReminders([row({ due_date: TODAY })], TODAY)[0].event, 'payment_due');
    assert.equal(reminders.planReminders([row({ due_date: addDaysIST(TODAY, 2) })], TODAY).length, 0, 'not on the schedule');
  });

  test('overdue nudges at 3 and 10 days, then stop', () => {
    assert.equal(reminders.planReminders([row({ due_date: addDaysIST(TODAY, -3) })], TODAY)[0].event, 'payment_overdue');
    assert.equal(reminders.planReminders([row({ due_date: addDaysIST(TODAY, -10) })], TODAY)[0].daysOverdue, 10);
    assert.equal(reminders.planReminders([row({ due_date: addDaysIST(TODAY, -30) })], TODAY).length, 0);
  });

  test('fully paid memberships get expiry notices at 7, 3 and 1 days', () => {
    for (const d of [7, 3, 1]) {
      const items = reminders.planReminders([row({ paid: '1200', end_date: addDaysIST(TODAY, d) })], TODAY);
      assert.equal(items[0].event, 'membership_expiring', `day ${d}`);
      assert.equal(items[0].daysLeft, d);
    }
  });

  test('money first: an unpaid membership gets the payment reminder, never the expiry one', () => {
    const items = reminders.planReminders([row({ due_date: TODAY, end_date: addDaysIST(TODAY, 3) })], TODAY);
    assert.equal(items.length, 1);
    assert.equal(items[0].event, 'payment_due');
  });

  test('opt-out, preferences and missing phone are respected', () => {
    assert.equal(reminders.planReminders([row({ due_date: TODAY, whatsapp_opt_in: false })], TODAY).length, 0);
    assert.equal(reminders.planReminders([row({ due_date: TODAY, communication_preferences: { payment_reminders: false } })], TODAY).length, 0);
    assert.equal(reminders.planReminders([row({ due_date: TODAY, communication_preferences: '{"whatsapp":false}' })], TODAY).length, 0);
    assert.equal(reminders.planReminders([row({ due_date: TODAY, phone: '' })], TODAY).length, 0);
    assert.equal(reminders.planReminders([row({ paid: '1200', end_date: addDaysIST(TODAY, 3), communication_preferences: { membership_reminders: false } })], TODAY).length, 0);
  });

  test('buildMessage fills the approved template parameters in order', () => {
    const item = reminders.planReminders([row({ due_date: TODAY })], TODAY)[0];
    const msg = reminders.buildMessage(item, 'Sharma Library');
    assert.equal(msg.template, 'sf_payment_due');
    assert.deepEqual(msg.params, ['Priya Patel', 'Sharma Library', '₹1,200', '5 Oct 2026', 'A2']);
    assert.match(msg.text, /₹1,200/);
  });
});

describe('runAutomaticRemindersForOrg', () => {
  const saved = {};
  beforeEach(() => {
    for (const k of ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID']) saved[k] = process.env[k];
    process.env.WHATSAPP_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_ID = '123456789';
  });
  afterEach(() => {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });

  const autoOrg = () => ({ id: 'ORG-1', name: 'Sharma Library', plan: 'basic', seat_limit: 100, subscription_status: 'active', is_demo: false,
    whatsapp_mode: 'automatic', whatsapp_auto_status: 'active', whatsapp_auto_until: new Date(Date.now() + 10 * DAY).toISOString() });

  function fakeExec(candidates) {
    const claimed = new Set();
    const calls = [];
    const exec = async (sql, params) => {
      calls.push({ sql, params });
      if (/FROM memberships m/.test(sql)) return { rows: candidates, rowCount: candidates.length };
      if (/INSERT INTO communication_logs/.test(sql)) {
        const key = params[params.length - 1];
        if (claimed.has(key)) return { rows: [], rowCount: 0 };
        claimed.add(key);
        return { rows: [{ id: params[0] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    };
    return { exec, calls };
  }

  test('manual libraries are skipped without touching the database', async () => {
    const { exec, calls } = fakeExec([row({ due_date: TODAY })]);
    const s = await reminders.runAutomaticRemindersForOrg({ ...autoOrg(), whatsapp_mode: 'manual' }, { today: TODAY, exec, sender: async () => { throw new Error('must not send'); } });
    assert.equal(s.reason, 'manual_mode');
    assert.equal(calls.length, 0);
  });

  test('an expired add-on is skipped even if the row still says active', async () => {
    const { exec, calls } = fakeExec([row({ due_date: TODAY })]);
    const s = await reminders.runAutomaticRemindersForOrg({ ...autoOrg(), whatsapp_auto_until: new Date(Date.now() - DAY).toISOString() }, { today: TODAY, exec, sender: async () => { throw new Error('must not send'); } });
    assert.equal(s.reason, 'manual_mode');
    assert.equal(calls.length, 0);
  });

  test('sends once per membership/event/day and records the provider id', async () => {
    const { exec, calls } = fakeExec([row({ due_date: TODAY }), row({ membership_id: 'MEM-2', student_id: 'STU-2', paid: '1200', end_date: addDaysIST(TODAY, 3), phone: '9123456789' })]);
    const sent = [];
    const sender = async (m) => { sent.push(m); return { providerMessageId: `wamid.${sent.length}` }; };
    const first = await reminders.runAutomaticRemindersForOrg(autoOrg(), { today: TODAY, exec, sender });
    assert.deepEqual([first.planned, first.sent, first.failed, first.skipped], [2, 2, 0, 0]);
    assert.equal(sent[0].template, 'sf_payment_due');
    assert.equal(sent[1].template, 'sf_membership_expiring');
    assert.equal(calls.filter(c => /SET status = 'sent'/.test(c.sql)).length, 2);

    const again = await reminders.runAutomaticRemindersForOrg(autoOrg(), { today: TODAY, exec, sender });
    assert.deepEqual([again.sent, again.skipped], [0, 2], 'same day: nothing re-sent');
  });

  test('a provider failure is logged on the row and does not stop the run', async () => {
    const { exec, calls } = fakeExec([row({ due_date: TODAY }), row({ membership_id: 'MEM-2', student_id: 'STU-2', due_date: TODAY, phone: '9123456789' })]);
    let n = 0;
    const sender = async () => { n++; if (n === 1) { const e = new Error('(#131026) Message undeliverable'); e.code = 131026; throw e; } return { providerMessageId: 'wamid.ok' }; };
    const s = await reminders.runAutomaticRemindersForOrg(autoOrg(), { today: TODAY, exec, sender });
    assert.deepEqual([s.sent, s.failed], [1, 1]);
    const failed = calls.find(c => /SET status = 'failed'/.test(c.sql));
    assert.match(failed.params[1], /131026/);
  });

  test('without WhatsApp credentials nothing is sent and the reason is reported', async () => {
    delete process.env.WHATSAPP_TOKEN;
    const { exec, calls } = fakeExec([row({ due_date: TODAY })]);
    const s = await reminders.runAutomaticRemindersForOrg(autoOrg(), { today: TODAY, exec, sender: async () => { throw new Error('must not send'); } });
    assert.equal(s.reason, 'whatsapp_not_configured');
    assert.equal(calls.length, 0);
  });

  test('the daily job expires lapsed add-ons first, then runs every automatic library, and records the run', async () => {
    const calls = [];
    const exec = async (sql, params) => {
      calls.push({ sql, params });
      if (/SET whatsapp_auto_status = 'expired'/.test(sql)) return { rows: [{ id: 'ORG-9', name: 'Lapsed' }], rowCount: 1 };
      if (/FROM organizations\s+WHERE whatsapp_mode = 'automatic'/.test(sql)) return { rows: [autoOrg()], rowCount: 1 };
      if (/FROM memberships m/.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    };
    const summary = await jobs.runScheduledJobs({ cron: '30 3 * * *', exec });
    assert.deepEqual(summary.expired, ['ORG-9']);
    assert.equal(summary.libraries.length, 1);
    assert.equal(summary.libraries[0].orgId, 'ORG-1');
    const runs = calls.filter(c => /INSERT INTO job_runs/.test(c.sql));
    assert.equal(runs.length, 2, 'one platform run + one per-library run');
    assert.ok(calls.some(c => /UPDATE job_runs SET finished_at/.test(c.sql) && c.params[1] === 'ok'));
  });
});
