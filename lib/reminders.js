// lib/reminders.js — Automatic WhatsApp reminders for libraries on the paid add-on
//
// Runs once a day (worker scheduled handler) and on demand from Billing → "Run now".
// It only ever sends for a library whose subscription says whatsappMode === 'automatic'
// (lib/subscription.js); every other library keeps the manual flow on the Notifications
// page. Each (library, membership, event, day) is sent at most once: the row in
// communication_logs is claimed through its unique idempotency_key before the message
// goes out, so an overlapping run cannot double-send.
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { getTodayIST, daysBetweenIST } = require('./dates');
const { formatINR } = require('./plans');
const whatsapp = require('./whatsapp-cloud');
const { deriveSubscription, WHATSAPP_MODE } = require('./subscription');

// Days relative to the date on the membership. Short on purpose: a nudge, not a stream.
const SCHEDULE = Object.freeze({
  payment_due: Object.freeze([3, 0]),             // days BEFORE the due date
  payment_overdue: Object.freeze([3, 10]),        // days AFTER the due date
  membership_expiring: Object.freeze([7, 3, 1]),  // days BEFORE the end date
});

const EVENT_TEMPLATE_KEY = Object.freeze({
  payment_due: 'payment_due',
  payment_overdue: 'payment_overdue',
  membership_expiring: 'membership_expiring',
});

function dateText(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(dt);
}

function prefsOf(row) {
  const p = row.communication_preferences;
  if (!p) return {};
  if (typeof p === 'string') { try { return JSON.parse(p); } catch (_) { return {}; } }
  return p;
}

/** Active memberships with the student's contact details and what has been paid. */
async function loadReminderCandidates(orgId, exec = query) {
  const res = await exec(
    `SELECT m.id AS membership_id, m.student_id, m.start_date, m.end_date, m.due_date,
            m.final_amount, m.price, m.discount,
            s.name AS student_name, s.phone, s.whatsapp_opt_in, s.communication_preferences,
            COALESCE((SELECT SUM(p.amount) FROM payments p
                      WHERE p.membership_id = m.id AND p.organization_id = m.organization_id AND p.status = 'recorded'), 0) AS paid,
            (SELECT se.seat_number FROM seat_assignments sa
               JOIN seats se ON se.id = sa.seat_id
              WHERE sa.membership_id = m.id AND sa.organization_id = m.organization_id AND sa.status = 'active'
              LIMIT 1) AS seat_number
     FROM memberships m
     JOIN students s ON s.id = m.student_id AND s.organization_id = m.organization_id
     WHERE m.organization_id = $1 AND m.status = 'active'
       AND s.deleted_at IS NULL AND COALESCE(s.status, 'active') = 'active'`,
    [orgId]
  );
  return res.rows;
}

/**
 * Pure: which reminders are due today. Money first: a membership with an outstanding
 * balance gets the payment reminder, never the expiry one.
 */
function planReminders(rows, today = getTodayIST()) {
  const items = [];
  for (const row of rows) {
    const prefs = prefsOf(row);
    if (row.whatsapp_opt_in === false || prefs.whatsapp === false) continue;
    if (!whatsapp.toWaNumber(row.phone)) continue;

    const finalAmount = row.final_amount != null ? Number(row.final_amount) : Number(row.price || 0) - Number(row.discount || 0);
    const pending = Math.max(0, finalAmount - Number(row.paid || 0));
    const dueDate = String(row.due_date || row.start_date || '').split('T')[0];
    const endDate = String(row.end_date || '').split('T')[0];
    const base = {
      membershipId: row.membership_id, studentId: row.student_id, studentName: row.student_name,
      phone: row.phone, seat: row.seat_number || '-',
    };

    if (pending > 0 && dueDate) {
      if (prefs.payment_reminders === false) continue;
      const daysToDue = daysBetweenIST(today, dueDate);
      if (SCHEDULE.payment_due.includes(daysToDue)) {
        items.push({ ...base, event: 'payment_due', amount: pending, dueDate, daysToDue });
      } else if (daysToDue < 0 && SCHEDULE.payment_overdue.includes(-daysToDue)) {
        items.push({ ...base, event: 'payment_overdue', amount: pending, dueDate, daysOverdue: -daysToDue });
      }
      continue;
    }

    if (endDate) {
      if (prefs.membership_reminders === false) continue;
      const daysToEnd = daysBetweenIST(today, endDate);
      if (SCHEDULE.membership_expiring.includes(daysToEnd)) {
        items.push({ ...base, event: 'membership_expiring', endDate, daysLeft: daysToEnd });
      }
    }
  }
  return items;
}

/** Template name, ordered body parameters, and a readable copy for the log. */
function buildMessage(item, libraryName, cfg = whatsapp.getConfig()) {
  const template = cfg.templates[EVENT_TEMPLATE_KEY[item.event]];
  switch (item.event) {
    case 'payment_due':
      return {
        template,
        params: [item.studentName, libraryName, formatINR(item.amount), dateText(item.dueDate), item.seat],
        text: `Hello ${item.studentName}, your fee of ${formatINR(item.amount)} for seat ${item.seat} at ${libraryName} is due on ${dateText(item.dueDate)}.`,
      };
    case 'payment_overdue':
      return {
        template,
        params: [item.studentName, libraryName, formatINR(item.amount), String(item.daysOverdue), item.seat],
        text: `Hello ${item.studentName}, your fee of ${formatINR(item.amount)} for seat ${item.seat} at ${libraryName} is ${item.daysOverdue} days overdue.`,
      };
    case 'membership_expiring':
      return {
        template,
        params: [item.studentName, libraryName, dateText(item.endDate), String(item.daysLeft), item.seat],
        text: `Hello ${item.studentName}, your membership for seat ${item.seat} at ${libraryName} ends on ${dateText(item.endDate)} (${item.daysLeft} days left).`,
      };
    default:
      throw new Error(`Unknown reminder event ${item.event}`);
  }
}

function logId() {
  return `CL-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
}

/**
 * Send today's reminders for one library. Returns a summary; never throws for a single
 * failed message (it is logged on the communication_logs row instead).
 */
async function runAutomaticRemindersForOrg(org, { today = getTodayIST(), exec = query, sender = whatsapp.sendTemplate, dryRun = false, now = new Date() } = {}) {
  const sub = deriveSubscription(org, now);
  const summary = { orgId: org.id, date: today, planned: 0, sent: 0, failed: 0, skipped: 0, reason: null };
  if (sub.whatsappMode !== WHATSAPP_MODE.AUTOMATIC) { summary.reason = 'manual_mode'; return summary; }
  if (!dryRun && !whatsapp.isConfigured()) { summary.reason = 'whatsapp_not_configured'; return summary; }

  const rows = await loadReminderCandidates(org.id, exec);
  const items = planReminders(rows, today);
  summary.planned = items.length;
  const cfg = whatsapp.getConfig();

  for (const item of items) {
    const key = `auto:${org.id}:${item.membershipId}:${item.event}:${today}`;
    const msg = buildMessage(item, org.name, cfg);
    const claim = await exec(
      `INSERT INTO communication_logs
         (id, organization_id, student_id, event_type, phone_number, template_name, language, body_text, status, provider, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'meta', $9, CURRENT_TIMESTAMP)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [logId(), org.id, item.studentId, item.event, whatsapp.toWaNumber(item.phone), msg.template, cfg.language, msg.text, key]
    );
    if (claim.rows.length === 0) { summary.skipped++; continue; } // already sent today
    const rowId = claim.rows[0].id;

    if (dryRun) {
      await exec(`UPDATE communication_logs SET status = 'dry_run' WHERE id = $1`, [rowId]);
      summary.skipped++;
      continue;
    }
    try {
      const result = await sender({ to: item.phone, template: msg.template, language: cfg.language, bodyParams: msg.params });
      await exec(
        `UPDATE communication_logs SET status = 'sent', provider_message_id = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [rowId, result.providerMessageId || null]
      );
      summary.sent++;
    } catch (err) {
      await exec(
        `UPDATE communication_logs SET status = 'failed', error_message = $2 WHERE id = $1`,
        [rowId, String(err && err.message ? err.message : err).slice(0, 500)]
      );
      summary.failed++;
      if (err && err.code === 'NOT_CONFIGURED') { summary.reason = 'whatsapp_not_configured'; break; }
    }
  }
  return summary;
}

module.exports = {
  SCHEDULE,
  loadReminderCandidates,
  planReminders,
  buildMessage,
  runAutomaticRemindersForOrg,
};
