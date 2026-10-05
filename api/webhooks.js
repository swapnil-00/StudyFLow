// api/webhooks.js — Payment provider webhooks (Cashfree)
//
// Unauthenticated by design: the proof is the HMAC signature over the raw body, keyed by
// the Cashfree client secret. Every delivery is recorded by a body hash before it is
// acted on, so retries are answered 200 without applying the purchase twice, and
// finalizeOrder() is idempotent on top of that.
'use strict';
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');
const cashfree = require('../lib/cashfree');
const billing = require('../lib/billing');
const subscription = require('../lib/subscription');

const clientExec = (client) => (sql, params) => client.query(sql, params);

function providerFromUrl(req) {
  const path = String(req.url || '').split('?')[0];
  const m = path.match(/\/api\/webhooks\/?([^/]*)/);
  return (m && m[1]) || req.query?.provider || '';
}

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  if (providerFromUrl(req) !== 'cashfree') {
    throw new HttpError(404, 'UNKNOWN_PROVIDER', 'Unknown webhook provider.');
  }
  if (!cashfree.isConfigured()) {
    throw new HttpError(503, 'PAYMENTS_NOT_CONFIGURED', 'Cashfree is not configured.');
  }

  const rawBody = req.rawBody;
  if (typeof rawBody !== 'string' || rawBody.length === 0) {
    throw new HttpError(400, 'RAW_BODY_REQUIRED', 'Webhook body unavailable.');
  }
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  if (!cashfree.verifyWebhookSignature({ rawBody, timestamp, signature })) {
    console.warn(`[${req.correlationId}] Cashfree webhook signature mismatch`);
    throw new HttpError(401, 'INVALID_SIGNATURE', 'Webhook signature mismatch.');
  }
  if (!cashfree.isTimestampFresh(timestamp)) {
    throw new HttpError(401, 'STALE_WEBHOOK', 'Webhook timestamp is too old.');
  }

  const event = cashfree.parseWebhookEvent(req.body);
  const first = await billing.recordEvent({
    id: cashfree.eventId(rawBody), provider: 'cashfree', type: event.type, orderId: event.orderId || null, payload: req.body,
  });
  if (!first) return res.json({ ok: true, duplicate: true });

  if (event.kind === 'payment' && event.orderId) {
    const order = await billing.getOrder(event.orderId);
    if (!order) {
      console.warn(`[${req.correlationId}] Cashfree webhook for unknown order ${event.orderId}`);
      return res.json({ ok: true, ignored: 'unknown_order' });
    }

    const succeeded = event.type === 'PAYMENT_SUCCESS_WEBHOOK' || event.paymentStatus === 'SUCCESS';
    if (succeeded) {
      const result = await withTransaction(client => billing.finalizeOrder(order.id, {
        providerPaymentId: event.cfPaymentId,
        paidAmount: event.paymentAmount,
        paidAt: event.paymentTime,
        source: 'webhook',
      }, clientExec(client)));
      return res.json({ ok: true, applied: result.applied });
    }

    const failed = ['PAYMENT_FAILED_WEBHOOK', 'PAYMENT_USER_DROPPED_WEBHOOK'].includes(event.type)
      || ['FAILED', 'USER_DROPPED', 'CANCELLED', 'VOID'].includes(String(event.paymentStatus || ''));
    if (failed) {
      await billing.markOrderFailed(order.id, { reason: event.message || event.paymentStatus || event.type, providerPaymentId: event.cfPaymentId });
      if (order.kind === billing.ORDER_KIND.AUTO_NOTIFY) {
        await subscription.markAutoNotifyPaymentFailed(order.organization_id, order.id);
      }
      return res.json({ ok: true, recorded: 'failure' });
    }
    return res.json({ ok: true, ignored: event.type });
  }

  if (event.kind === 'subscription') {
    // Autopay mandates are not used yet (the add-on is prepaid). Logged for visibility.
    console.log(`[${req.correlationId}] Cashfree subscription event ignored: ${event.type} ${event.subscriptionId || ''} ${event.status || ''}`);
  }
  return res.json({ ok: true, ignored: event.type || 'unknown' });
}, { methods: ['POST'], auth: false, rejectOrgId: false });
