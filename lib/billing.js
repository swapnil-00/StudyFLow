// lib/billing.js — Billing orders: the record of every purchase and what it bought
//
// One row per checkout attempt. finalizeOrder() is the single place a paid order is
// turned into a plan change, and it is idempotent: the webhook and the return-from-
// checkout sync can both call it, in any order, and the purchase is applied once.
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { HttpError } = require('./errors');
const { applyPlanPurchase, applyAutoNotifyPayment } = require('./subscription');
const { consumeCoupon } = require('./coupons');

const ORDER_KIND = Object.freeze({ PLAN: 'plan', AUTO_NOTIFY: 'auto_notify' });
const ORDER_STATUS = Object.freeze({ CREATED: 'created', PAID: 'paid', FAILED: 'failed', EXPIRED: 'expired' });

/** Cashfree accepts letters, digits, '-' and '_' (max 50 chars). */
function newOrderId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function createOrderRecord({ orgId, userId, kind, plan, seats, months, quote, provider, metadata }, exec = query) {
  const id = newOrderId();
  const res = await exec(
    `INSERT INTO billing_orders
       (id, organization_id, created_by, kind, plan, seats, months, amount, currency, description, status, provider, metadata,
        coupon_code, discount, subtotal)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '${ORDER_STATUS.CREATED}', $11, $12, $13, $14, $15)
     RETURNING *`,
    [id, orgId, userId || null, kind, plan || null, seats || null, months || null,
     quote.total, quote.currency, quote.description, provider, JSON.stringify(metadata || {}),
     quote.couponCode || null, Number(quote.discount || 0), quote.subtotalBeforeDiscount != null ? quote.subtotalBeforeDiscount : quote.subtotal]
  );
  return res.rows[0];
}

async function getOrder(orderId, exec = query) {
  const res = await exec('SELECT * FROM billing_orders WHERE id = $1', [orderId]);
  return res.rows[0] || null;
}

async function attachPaymentSession(orderId, { paymentSessionId, providerOrderId }, exec = query) {
  await exec(
    `UPDATE billing_orders SET payment_session_id = $2, provider_order_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [orderId, paymentSessionId || null, providerOrderId || null]
  );
}

/**
 * Apply a paid order. Call inside a transaction with exec = client.
 * Returns { applied: true, order } the first time and { applied: false, alreadyPaid: true }
 * on every later call for the same order.
 */
async function finalizeOrder(orderId, { providerPaymentId, paidAmount, paidAt, source } = {}, exec = query) {
  const locked = await exec('SELECT * FROM billing_orders WHERE id = $1 FOR UPDATE', [orderId]);
  const order = locked.rows[0];
  if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  if (order.status === ORDER_STATUS.PAID) return { applied: false, alreadyPaid: true, order };

  if (paidAmount != null && Number(paidAmount) + 0.005 < Number(order.amount)) {
    throw new HttpError(409, 'UNDERPAID', `Payment of ${paidAmount} is less than the order amount ${order.amount}.`);
  }

  const claimed = await exec(
    `UPDATE billing_orders
     SET status = '${ORDER_STATUS.PAID}', paid_at = COALESCE($2::timestamptz, CURRENT_TIMESTAMP),
         provider_payment_id = COALESCE($3, provider_payment_id),
         metadata = metadata || $4::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status <> '${ORDER_STATUS.PAID}'
     RETURNING *`,
    [orderId, paidAt ? new Date(paidAt).toISOString() : null, providerPaymentId || null, JSON.stringify({ paidVia: source || 'unknown' })]
  );
  if (claimed.rows.length === 0) return { applied: false, alreadyPaid: true, order };
  const paid = claimed.rows[0];

  let subscription;
  if (paid.kind === ORDER_KIND.PLAN) {
    subscription = await applyPlanPurchase(paid.organization_id, { plan: paid.plan, seats: paid.seats, orderId: paid.id }, exec);
  } else if (paid.kind === ORDER_KIND.AUTO_NOTIFY) {
    subscription = await applyAutoNotifyPayment(paid.organization_id, { months: paid.months, orderId: paid.id }, exec);
  } else {
    throw new HttpError(500, 'UNKNOWN_ORDER_KIND', `Unknown order kind ${paid.kind}.`);
  }
  await exec('UPDATE billing_orders SET applied_at = CURRENT_TIMESTAMP WHERE id = $1', [orderId]);
  // A coupon counts as used only once the purchase it discounted is final
  if (paid.coupon_code) await consumeCoupon(paid.coupon_code, exec);
  return { applied: true, order: paid, subscription };
}

/** A failed or abandoned attempt. Never overwrites a paid order. */
async function markOrderFailed(orderId, { reason, providerPaymentId, status = ORDER_STATUS.FAILED } = {}, exec = query) {
  const res = await exec(
    `UPDATE billing_orders
     SET status = $2, failure_reason = $3, provider_payment_id = COALESCE($4, provider_payment_id), updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = '${ORDER_STATUS.CREATED}'
     RETURNING *`,
    [orderId, status, reason ? String(reason).slice(0, 500) : null, providerPaymentId || null]
  );
  return res.rows[0] || null;
}

async function listOrders(orgId, { limit = 20 } = {}, exec = query) {
  const res = await exec(
    `SELECT id, kind, plan, seats, months, amount, currency, description, status, provider, provider_payment_id,
            failure_reason, paid_at, created_at, coupon_code, discount
     FROM billing_orders WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit]
  );
  return res.rows.map(r => ({
    id: r.id, kind: r.kind, plan: r.plan, seats: r.seats, months: r.months,
    amount: Number(r.amount), currency: r.currency, description: r.description, status: r.status,
    provider: r.provider, providerPaymentId: r.provider_payment_id, failureReason: r.failure_reason,
    couponCode: r.coupon_code || null, discount: Number(r.discount || 0),
    paidAt: r.paid_at, createdAt: r.created_at,
  }));
}

/** Webhook de-duplication. Returns true the first time an event id is seen. */
async function recordEvent({ id, provider, type, orderId, payload }, exec = query) {
  const res = await exec(
    `INSERT INTO billing_events (id, provider, event_type, order_id, payload)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [id, provider, type || null, orderId || null, JSON.stringify(payload || {})]
  );
  return res.rowCount > 0;
}

module.exports = {
  ORDER_KIND,
  ORDER_STATUS,
  newOrderId,
  createOrderRecord,
  getOrder,
  attachPaymentSession,
  finalizeOrder,
  markOrderFailed,
  listOrders,
  recordEvent,
};
