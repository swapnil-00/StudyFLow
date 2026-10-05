// lib/subscription.js — Subscription state for an organization
//
// The organizations row holds the raw facts (plan, seat_limit, whatsapp_mode,
// whatsapp_auto_status, whatsapp_auto_until). deriveSubscription() turns them into
// the single answer every caller needs: which plan, how many seats, and whether
// WhatsApp reminders go out automatically right now.
//
// Transitions below are the ONLY code that changes these columns. Webhooks, the
// return-from-checkout sync and the admin scripts all call them, so a manual payment
// recorded by the owner and a Cashfree payment behave identically.
'use strict';
const { query } = require('./db');
const { HttpError } = require('./errors');
const { PRICING, planFor, seatLimitFor, normalizePlanKey, validateCustomSeats, formatINR, isAutoNotifyEnabled } = require('./plans');

const AUTO_STATUS = Object.freeze({
  NOT_SUBSCRIBED: 'not_subscribed',
  ACTIVE: 'active',
  PAYMENT_FAILED: 'payment_failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const WHATSAPP_MODE = Object.freeze({ MANUAL: 'manual', AUTOMATIC: 'automatic' });

const ORG_SUBSCRIPTION_COLUMNS =
  'id, name, plan, seat_limit, subscription_status, is_demo, plan_paid_at, ' +
  'whatsapp_mode, whatsapp_auto_status, whatsapp_auto_until, whatsapp_auto_ref, phone, email';

function formatDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(dt);
}

/**
 * Pure: organization row → subscription view. No I/O, safe to call anywhere.
 *
 * @param {object} org  organizations row (snake_case columns)
 * @param {Date} [now]
 */
function deriveSubscription(org, now = new Date()) {
  const o = org || {};
  const plan = planFor(o);
  const seatLimit = seatLimitFor(o);
  const isDemo = Boolean(o.is_demo);
  const suspended = String(o.subscription_status || 'active') === 'suspended';

  const until = o.whatsapp_auto_until ? new Date(o.whatsapp_auto_until) : null;
  const untilValid = until && !Number.isNaN(until.getTime()) ? until : null;
  let autoStatus = String(o.whatsapp_auto_status || AUTO_STATUS.NOT_SUBSCRIBED);
  // A paid period that ran out is "expired" even before the nightly job persists it.
  if (autoStatus === AUTO_STATUS.ACTIVE && (!untilValid || untilValid <= now)) {
    autoStatus = AUTO_STATUS.EXPIRED;
  }

  const featureOn = isAutoNotifyEnabled();
  const autoEligible = featureOn && plan.paid; // paid plans (Basic, Custom, Demo) can use the add-on, once the feature is live
  const selected = o.whatsapp_mode === WHATSAPP_MODE.AUTOMATIC ? WHATSAPP_MODE.AUTOMATIC : WHATSAPP_MODE.MANUAL;
  const autoPaid = autoStatus === AUTO_STATUS.ACTIVE;
  const whatsappMode = autoEligible && selected === WHATSAPP_MODE.AUTOMATIC && autoPaid && !suspended
    ? WHATSAPP_MODE.AUTOMATIC
    : WHATSAPP_MODE.MANUAL;

  const daysLeft = untilValid ? Math.max(0, Math.ceil((untilValid - now) / 86400000)) : 0;
  const untilText = formatDate(untilValid);

  let autoLabel = 'Manual';
  let autoReason = 'Automatic notifications are not enabled. Reminders are sent by hand from the Notifications page.';
  if (!featureOn) {
    autoReason = 'Reminders are sent with one tap from the Notifications page.';
  } else if (!autoEligible) {
    autoReason = 'Automatic WhatsApp notifications are available on paid plans.';
  } else if (suspended) {
    autoLabel = 'Manual';
    autoReason = 'This library is suspended, so automatic notifications are paused.';
  } else {
    switch (autoStatus) {
      case AUTO_STATUS.ACTIVE:
        if (selected === WHATSAPP_MODE.AUTOMATIC) {
          autoLabel = 'Automatic — Active';
          autoReason = `Reminders go out automatically every morning. Paid until ${untilText} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).`;
        } else {
          autoLabel = 'Manual';
          autoReason = `Automatic notifications are paid until ${untilText} but switched off. Turn them on from Billing.`;
        }
        break;
      case AUTO_STATUS.PAYMENT_FAILED:
        autoLabel = 'Automatic — Payment Failed';
        autoReason = 'The last payment did not go through, so reminders are back to manual. Renew to switch automatic notifications on again.';
        break;
      case AUTO_STATUS.EXPIRED:
        autoLabel = 'Automatic — Payment Required';
        autoReason = `Your automatic-notification period ended${untilText ? ` on ${untilText}` : ''}. Reminders are manual until you renew.`;
        break;
      case AUTO_STATUS.CANCELLED:
        autoLabel = 'Automatic — Cancelled';
        autoReason = 'You cancelled automatic notifications. Renew any time to switch them back on.';
        break;
      default:
        break;
    }
  }

  return {
    plan: plan.key,
    planName: plan.name,
    paid: plan.paid,
    isDemo,
    suspended,
    seatLimit,
    planPaidAt: o.plan_paid_at || null,
    whatsappMode,                       // what actually happens: 'automatic' | 'manual'
    whatsappSelectedMode: selected,     // what the owner chose
    autoStatus,                         // not_subscribed | active | payment_failed | expired | cancelled
    autoFeatureEnabled: featureOn,      // false while the add-on is on hold (AUTO_NOTIFY_ENABLED)
    autoEligible,
    autoUntil: untilValid ? untilValid.toISOString() : null,
    autoUntilText: untilText,
    autoDaysLeft: daysLeft,
    autoLabel,
    autoReason,
    autoMonthlyFee: autoEligible ? seatLimit * PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY : 0,
  };
}

async function loadOrg(orgId, exec = query) {
  const res = await exec(`SELECT ${ORG_SUBSCRIPTION_COLUMNS} FROM organizations WHERE id = $1`, [orgId]);
  if (res.rows.length === 0) throw new HttpError(404, 'ORG_NOT_FOUND', 'Library not found.');
  return res.rows[0];
}

async function loadSubscription(orgId, exec = query) {
  return deriveSubscription(await loadOrg(orgId, exec));
}

/**
 * A paid plan purchase (Basic or Custom seats). Idempotent: applying the same
 * purchase twice leaves the same plan and seat limit.
 */
async function applyPlanPurchase(orgId, { plan, seats, orderId } = {}, exec = query) {
  const key = normalizePlanKey(plan);
  let seatLimit;
  if (key === 'basic') {
    seatLimit = PRICING.BASE_SEATS;
  } else if (key === 'custom') {
    const v = validateCustomSeats(seats);
    if (!v.ok) throw new HttpError(400, 'INVALID_SEATS', v.error);
    seatLimit = v.seats;
  } else {
    throw new HttpError(400, 'INVALID_PLAN', 'Only the Basic and Custom plans can be purchased.');
  }

  const res = await exec(
    `UPDATE organizations
     SET plan = $2, seat_limit = $3, plan_paid_at = CURRENT_TIMESTAMP,
         subscription_status = 'active', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_demo IS NOT TRUE
     RETURNING ${ORG_SUBSCRIPTION_COLUMNS}`,
    [orgId, key, seatLimit]
  );
  if (res.rows.length === 0) {
    throw new HttpError(409, 'PLAN_NOT_APPLIED', 'The plan could not be applied to this library.');
  }
  void orderId;
  return deriveSubscription(res.rows[0]);
}

/**
 * A successful payment for the automatic-notification add-on. Extends the paid-through
 * date from today, or from the current end if time is still left, and switches the
 * library to automatic mode.
 */
async function applyAutoNotifyPayment(orgId, { months, orderId } = {}, exec = query) {
  const m = Number(months);
  if (!Number.isInteger(m) || m <= 0 || m > 36) throw new HttpError(400, 'INVALID_MONTHS', 'Invalid number of months.');
  const res = await exec(
    `UPDATE organizations
     SET whatsapp_auto_until = (CASE WHEN whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until > CURRENT_TIMESTAMP
                                     THEN whatsapp_auto_until ELSE CURRENT_TIMESTAMP END) + make_interval(months => $2::int),
         whatsapp_auto_status = '${AUTO_STATUS.ACTIVE}',
         whatsapp_mode = '${WHATSAPP_MODE.AUTOMATIC}',
         whatsapp_auto_ref = COALESCE($3, whatsapp_auto_ref),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING ${ORG_SUBSCRIPTION_COLUMNS}`,
    [orgId, m, orderId || null]
  );
  if (res.rows.length === 0) throw new HttpError(404, 'ORG_NOT_FOUND', 'Library not found.');
  return deriveSubscription(res.rows[0]);
}

/**
 * A failed or abandoned add-on payment. Only changes anything when no paid period
 * remains: a failed early renewal must not cut off time that was already paid for.
 */
async function markAutoNotifyPaymentFailed(orgId, ref, exec = query) {
  const res = await exec(
    `UPDATE organizations
     SET whatsapp_auto_status = '${AUTO_STATUS.PAYMENT_FAILED}', whatsapp_auto_ref = COALESCE($2, whatsapp_auto_ref),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND NOT (whatsapp_auto_status = '${AUTO_STATUS.ACTIVE}' AND whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until > CURRENT_TIMESTAMP)
     RETURNING id`,
    [orgId, ref || null]
  );
  return res.rows.length > 0;
}

/** The owner's choice between manual and automatic. Automatic needs an active, paid add-on. */
async function setWhatsappMode(orgId, mode, exec = query) {
  const wanted = mode === WHATSAPP_MODE.AUTOMATIC ? WHATSAPP_MODE.AUTOMATIC : WHATSAPP_MODE.MANUAL;
  if (wanted === WHATSAPP_MODE.AUTOMATIC) {
    if (!isAutoNotifyEnabled()) {
      throw new HttpError(403, 'AUTO_NOTIFY_ON_HOLD', 'Automatic WhatsApp notifications are not available yet.');
    }
    const current = await loadSubscription(orgId, exec);
    if (!current.autoEligible) {
      throw new HttpError(403, 'AUTO_NOTIFY_NOT_ELIGIBLE', 'Automatic WhatsApp notifications are available on paid plans. Upgrade your plan first.');
    }
    if (current.autoStatus !== AUTO_STATUS.ACTIVE) {
      throw new HttpError(402, 'AUTO_NOTIFY_PAYMENT_REQUIRED', `Automatic notifications need an active subscription (${formatINR(current.autoMonthlyFee)}/month for ${current.seatLimit} seats). Pay for it from Billing to switch on.`);
    }
  }
  const res = await exec(
    `UPDATE organizations SET whatsapp_mode = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${ORG_SUBSCRIPTION_COLUMNS}`,
    [orgId, wanted]
  );
  if (res.rows.length === 0) throw new HttpError(404, 'ORG_NOT_FOUND', 'Library not found.');
  return deriveSubscription(res.rows[0]);
}

/** Owner cancels the add-on: reminders become manual immediately; renewing re-activates. */
async function cancelAutoNotify(orgId, exec = query) {
  const res = await exec(
    `UPDATE organizations
     SET whatsapp_auto_status = '${AUTO_STATUS.CANCELLED}', whatsapp_mode = '${WHATSAPP_MODE.MANUAL}', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING ${ORG_SUBSCRIPTION_COLUMNS}`,
    [orgId]
  );
  if (res.rows.length === 0) throw new HttpError(404, 'ORG_NOT_FOUND', 'Library not found.');
  return deriveSubscription(res.rows[0]);
}

/** Nightly: persist 'expired' for every add-on whose paid period has ended. */
async function expireLapsedAutoNotify(exec = query) {
  const res = await exec(
    `UPDATE organizations
     SET whatsapp_auto_status = '${AUTO_STATUS.EXPIRED}', updated_at = CURRENT_TIMESTAMP
     WHERE whatsapp_auto_status = '${AUTO_STATUS.ACTIVE}'
       AND whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until <= CURRENT_TIMESTAMP
     RETURNING id, name`,
    []
  );
  return res.rows;
}

/** Libraries whose reminders should go out automatically today. */
async function listAutomaticOrgs(exec = query) {
  const res = await exec(
    `SELECT ${ORG_SUBSCRIPTION_COLUMNS} FROM organizations
     WHERE whatsapp_mode = '${WHATSAPP_MODE.AUTOMATIC}'
       AND whatsapp_auto_status = '${AUTO_STATUS.ACTIVE}'
       AND whatsapp_auto_until IS NOT NULL AND whatsapp_auto_until > CURRENT_TIMESTAMP
       AND COALESCE(subscription_status, 'active') <> 'suspended'
     ORDER BY created_at ASC`,
    []
  );
  // deriveSubscription re-checks plan eligibility (a free plan can never be automatic).
  return res.rows.filter(row => deriveSubscription(row).whatsappMode === WHATSAPP_MODE.AUTOMATIC);
}

module.exports = {
  AUTO_STATUS,
  WHATSAPP_MODE,
  ORG_SUBSCRIPTION_COLUMNS,
  deriveSubscription,
  loadOrg,
  loadSubscription,
  applyPlanPurchase,
  applyAutoNotifyPayment,
  markAutoNotifyPaymentFailed,
  setWhatsappMode,
  cancelAutoNotify,
  expireLapsedAutoNotify,
  listAutomaticOrgs,
};
