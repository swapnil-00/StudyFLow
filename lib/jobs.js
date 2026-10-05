// lib/jobs.js — Scheduled work (Cloudflare Cron Trigger → worker/index.js scheduled())
//
// Once a day, in this order:
//   1. expire add-on subscriptions whose paid period ended (they fall back to manual);
//   2. send automatic WhatsApp reminders for every library still on automatic.
// Every run is recorded in job_runs so the Notifications page can show "last run".
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { expireLapsedAutoNotify, listAutomaticOrgs } = require('./subscription');
const { runAutomaticRemindersForOrg } = require('./reminders');

function runId() {
  return `JOB-${crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`;
}

async function startRun(job, organizationId, exec) {
  const id = runId();
  await exec(`INSERT INTO job_runs (id, job, organization_id, status) VALUES ($1, $2, $3, 'running')`, [id, job, organizationId || null]);
  return id;
}

async function finishRun(id, status, summary, exec) {
  await exec(
    `UPDATE job_runs SET finished_at = CURRENT_TIMESTAMP, status = $2, summary = $3 WHERE id = $1`,
    [id, status, JSON.stringify(summary || {})]
  );
}

/** Reminders for one library, recorded as its own job run (used by cron and by "Run now"). */
async function runRemindersJobForOrg(org, { exec = query, ...opts } = {}) {
  const id = await startRun('reminders', org.id, exec);
  try {
    const summary = await runAutomaticRemindersForOrg(org, { exec, ...opts });
    await finishRun(id, summary.failed > 0 ? 'partial' : 'ok', summary, exec);
    return summary;
  } catch (err) {
    await finishRun(id, 'failed', { error: String(err && err.message ? err.message : err).slice(0, 500) }, exec);
    throw err;
  }
}

/** The daily job. Never throws for one library's failure; the platform run records it. */
async function runScheduledJobs({ cron, exec = query } = {}) {
  const id = await startRun('daily', null, exec);
  const summary = { cron: cron || null, expired: [], libraries: [] };
  try {
    const expired = await expireLapsedAutoNotify(exec);
    summary.expired = expired.map(r => r.id);

    const orgs = await listAutomaticOrgs(exec);
    for (const org of orgs) {
      try {
        const s = await runRemindersJobForOrg(org, { exec });
        summary.libraries.push({ orgId: org.id, planned: s.planned, sent: s.sent, failed: s.failed, skipped: s.skipped, reason: s.reason });
      } catch (err) {
        summary.libraries.push({ orgId: org.id, error: String(err && err.message ? err.message : err).slice(0, 300) });
      }
    }
    await finishRun(id, 'ok', summary, exec);
    return summary;
  } catch (err) {
    await finishRun(id, 'failed', { ...summary, error: String(err && err.message ? err.message : err).slice(0, 500) }, exec);
    throw err;
  }
}

/** Most recent reminders run for a library (for the Notifications/Billing pages). */
async function lastReminderRun(orgId, exec = query) {
  const res = await exec(
    `SELECT id, started_at, finished_at, status, summary FROM job_runs
     WHERE job = 'reminders' AND organization_id = $1 ORDER BY started_at DESC LIMIT 1`,
    [orgId]
  );
  const r = res.rows[0];
  return r ? { id: r.id, startedAt: r.started_at, finishedAt: r.finished_at, status: r.status, summary: r.summary || {} } : null;
}

module.exports = { runScheduledJobs, runRemindersJobForOrg, lastReminderRun };
