// api/billing.js — Plans, seat purchases and the automatic-notification add-on
//
// Prices come from lib/plans.js; state changes go through lib/subscription.js; orders
// through lib/billing.js; Cashfree through lib/cashfree.js. The browser never decides a
// price or a plan: it sends an intent (plan + seats, or months) and gets a quote back.
'use strict';
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');
const { checkRateLimit } = require('../lib/ratelimit');
const plans = require('../lib/plans');
const subscription = require('../lib/subscription');
const billing = require('../lib/billing');
const cashfree = require('../lib/cashfree');
const whatsapp = require('../lib/whatsapp-cloud');
const coupons = require('../lib/coupons');
const { runRemindersJobForOrg, lastReminderRun } = require('../lib/jobs');

/** Apply a coupon to a quote, or throw a 400 the client can show. */
async function withCoupon(quote, couponInput, kind) {
  if (!couponInput) return quote;
  const v = await coupons.validateCoupon(couponInput, kind);
  if (!v.ok) throw new HttpError(400, v.code, v.error);
  return coupons.applyCoupon(quote, v.coupon);
}

function requireOwner(session) {
  if (session.role !== 'owner') {
    throw new HttpError(403, 'FORBIDDEN', 'Only the library owner can manage billing.');
  }
}

// The origin used in return/notify URLs. Never derived from the Host header in
// production: APP_URL is set as a Worker var.
function appOrigin(req) {
  const configured = process.env.APP_URL || process.env.APP_ORIGIN;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV !== 'production' && req.headers.host) return `http://${req.headers.host}`;
  throw new HttpError(500, 'APP_URL_MISSING', 'APP_URL is not configured on the server.');
}

function contactInfo() {
  return {
    email: process.env.CONTACT_EMAIL || 'studyflowbusiness0@gmail.com',
    whatsapp: process.env.CONTACT_WHATSAPP || null,
  };
}

function publicOrder(o) {
  if (!o) return null;
  return {
    id: o.id, kind: o.kind, plan: o.plan, seats: o.seats, months: o.months, amount: Number(o.amount),
    currency: o.currency, description: o.description, status: o.status, provider: o.provider,
    providerPaymentId: o.provider_payment_id, failureReason: o.failure_reason, paidAt: o.paid_at, createdAt: o.created_at,
  };
}

const clientExec = (client) => (sql, params) => client.query(sql, params);

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const session = req.session;
  const orgId = session.orgId;
  const action = req.body?.action || req.query?.action || 'status';
  if (!orgId) throw new HttpError(409, 'NEEDS_LIBRARY', 'No library selected.');

  // ── Current plan, add-on state, prices, payment history ────────────────────
  if (action === 'status') {
    const org = await subscription.loadOrg(orgId);
    const sub = subscription.deriveSubscription(org);
    const seats = await query('SELECT COUNT(*)::int AS n FROM seats WHERE organization_id = $1', [orgId]);
    const orders = session.role === 'owner' ? await billing.listOrders(orgId) : [];
    const lastRun = await lastReminderRun(orgId).catch(() => null);
    return res.json({
      ok: true,
      subscription: sub,
      seatsUsed: seats.rows[0]?.n || 0,
      pricing: plans.publicPricing(),
      features: plans.featureFlags(),
      phone: org.phone || '',
      payments: { provider: 'cashfree', configured: cashfree.isConfigured(), mode: cashfree.getConfig().mode, sdkUrl: cashfree.SDK_URL },
      whatsapp: { configured: whatsapp.isConfigured(), lastRun },
      contact: contactInfo(),
      orders,
    });
  }

  // ── Price without buying ───────────────────────────────────────────────────
  if (action === 'quote') {
    const { kind, plan, seats, months, coupon } = req.body || {};
    let quote;
    if (kind === 'auto_notify') {
      if (!plans.isAutoNotifyEnabled()) {
        throw new HttpError(403, 'AUTO_NOTIFY_ON_HOLD', 'Automatic WhatsApp notifications are not available yet.');
      }
      const sub = await subscription.loadSubscription(orgId);
      quote = plans.quoteAutoNotify({ seatLimit: sub.seatLimit, months });
    } else {
      quote = plans.quotePlan({ plan, seats });
    }
    if (!quote.ok) throw new HttpError(400, 'INVALID_QUOTE', quote.error);
    quote = await withCoupon(quote, coupon, kind === 'auto_notify' ? 'auto_notify' : 'plan');
    return res.json({ ok: true, quote });
  }

  // ── Start a Cashfree payment ───────────────────────────────────────────────
  if (action === 'checkout') {
    requireOwner(session);
    await checkRateLimit(query, `billing:checkout:${orgId}`, 10, 3600, { failClosed: true });

    const org = await subscription.loadOrg(orgId);
    const sub = subscription.deriveSubscription(org);
    if (sub.isDemo) throw new HttpError(403, 'DEMO_LOCKED', 'The demo library has no billing.');

    const { kind, plan, seats, months, phone, coupon } = req.body || {};
    let quote;
    let record;
    if (kind === 'auto_notify') {
      if (!plans.isAutoNotifyEnabled()) {
        throw new HttpError(403, 'AUTO_NOTIFY_ON_HOLD', 'Automatic WhatsApp notifications are not available yet.');
      }
      if (!sub.autoEligible) {
        throw new HttpError(403, 'AUTO_NOTIFY_NOT_ELIGIBLE', 'Automatic WhatsApp notifications are available on paid plans. Upgrade your plan first.');
      }
      quote = plans.quoteAutoNotify({ seatLimit: sub.seatLimit, months });
      if (!quote.ok) throw new HttpError(400, 'INVALID_QUOTE', quote.error);
      record = { kind: billing.ORDER_KIND.AUTO_NOTIFY, months: quote.months, seats: quote.seats };
    } else if (kind === 'plan') {
      quote = plans.quotePlan({ plan, seats });
      if (!quote.ok) throw new HttpError(400, 'INVALID_QUOTE', quote.error);
      if (quote.plan === 'basic' && sub.paid) {
        throw new HttpError(409, 'ALREADY_PAID', `Your library is already on the ${sub.planName} plan. Choose a Custom plan to add seats.`);
      }
      if (quote.plan === 'custom' && quote.seats <= sub.seatLimit) {
        throw new HttpError(409, 'NOT_AN_UPGRADE', `Choose more than your current ${sub.seatLimit} seats.`);
      }
      record = { kind: billing.ORDER_KIND.PLAN, plan: quote.plan, seats: quote.seats };
    } else {
      throw new HttpError(400, 'INVALID_KIND', 'kind must be "plan" or "auto_notify".');
    }

    quote = await withCoupon(quote, coupon, record.kind === billing.ORDER_KIND.PLAN ? 'plan' : 'auto_notify');

    // A 100% coupon needs no payment provider: apply immediately, exactly like a paid order.
    if (quote.couponCode && quote.total === 0) {
      const result = await withTransaction(async (client) => {
        const exec = clientExec(client);
        const order = await billing.createOrderRecord({
          orgId, userId: session.userId, ...record, quote, provider: 'coupon', metadata: { coupon: quote.couponCode },
        }, exec);
        return billing.finalizeOrder(order.id, { source: 'coupon' }, exec);
      });
      return res.json({
        ok: true, free: true, applied: result.applied, orderId: result.order.id, amount: 0,
        description: quote.description, subscription: result.subscription || await subscription.loadSubscription(orgId),
      });
    }

    if (!cashfree.isConfigured()) {
      throw new HttpError(503, 'PAYMENTS_NOT_CONFIGURED',
        'Online payment is not set up yet. Contact StudyFlow to pay by UPI or bank transfer; your plan is activated as soon as the payment is confirmed.');
    }

    const customerPhone = cashfree.normalizePhone(phone) || cashfree.normalizePhone(org.phone) || cashfree.normalizePhone(session.phone);
    if (!customerPhone) throw new HttpError(400, 'PHONE_REQUIRED', 'Enter a 10-digit mobile number for the payment receipt.');

    const order = await billing.createOrderRecord({
      orgId, userId: session.userId, ...record, quote, provider: 'cashfree', metadata: { phone: customerPhone },
    });

    let cf;
    try {
      const origin = appOrigin(req);
      cf = await cashfree.createOrder({
        orderId: order.id,
        amount: quote.total,
        customer: { id: orgId, name: session.name || org.name, email: session.email || org.email, phone: customerPhone },
        returnUrl: `${origin}/#/billing?order=${encodeURIComponent(order.id)}`,
        notifyUrl: `${origin}/api/webhooks/cashfree`,
        note: quote.description,
        tags: { org: orgId, kind: record.kind },
      });
    } catch (err) {
      await billing.markOrderFailed(order.id, { reason: `create_order: ${String(err.message).slice(0, 300)}` }).catch(() => {});
      if (err.code === 'PHONE_REQUIRED') throw new HttpError(400, 'PHONE_REQUIRED', err.message);
      if (err.code === 'APP_URL_MISSING') throw err;
      console.error(`[${req.correlationId}] Cashfree create order failed:`, err.message);
      throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not start the payment. Please try again in a moment.');
    }
    await billing.attachPaymentSession(order.id, { paymentSessionId: cf.paymentSessionId, providerOrderId: cf.cfOrderId });
    if (!org.phone) {
      await query(`UPDATE organizations SET phone = $2 WHERE id = $1 AND (phone IS NULL OR phone = '')`, [orgId, customerPhone]).catch(() => {});
    }

    return res.json({
      ok: true,
      orderId: order.id,
      paymentSessionId: cf.paymentSessionId,
      mode: cashfree.getConfig().mode,
      sdkUrl: cashfree.SDK_URL,
      amount: quote.total,
      description: quote.description,
    });
  }

  // ── Back from checkout: ask Cashfree what happened and apply it ───────────
  if (action === 'sync') {
    requireOwner(session);
    const { orderId } = req.body || {};
    const order = await billing.getOrder(String(orderId || ''));
    if (!order || order.organization_id !== orgId) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (order.status === billing.ORDER_STATUS.PAID) {
      return res.json({ ok: true, applied: false, orderStatus: 'PAID', order: publicOrder(order), subscription: await subscription.loadSubscription(orgId) });
    }
    if (order.provider !== 'cashfree' || !cashfree.isConfigured()) {
      return res.json({ ok: true, applied: false, orderStatus: order.status.toUpperCase(), order: publicOrder(order), subscription: await subscription.loadSubscription(orgId) });
    }

    const cf = await cashfree.getOrder(order.id);
    if (cf.orderStatus === 'PAID') {
      const payments = await cashfree.getOrderPayments(order.id).catch(() => []);
      const success = payments.find(p => p.status === 'SUCCESS') || null;
      const result = await withTransaction(client => billing.finalizeOrder(order.id, {
        providerPaymentId: success ? success.cfPaymentId : null,
        paidAmount: success && success.amount != null ? success.amount : cf.orderAmount,
        paidAt: success ? success.time : null,
        source: 'sync',
      }, clientExec(client)));
      return res.json({
        ok: true, applied: result.applied, orderStatus: 'PAID',
        order: publicOrder(await billing.getOrder(order.id)),
        subscription: await subscription.loadSubscription(orgId),
      });
    }
    if (cf.orderStatus === 'EXPIRED' || cf.orderStatus === 'TERMINATED') {
      await billing.markOrderFailed(order.id, { reason: cf.orderStatus, status: billing.ORDER_STATUS.EXPIRED });
    } else {
      const payments = await cashfree.getOrderPayments(order.id).catch(() => []);
      const last = payments[0];
      if (last && ['FAILED', 'USER_DROPPED', 'CANCELLED', 'VOID'].includes(last.status)) {
        await billing.markOrderFailed(order.id, { reason: last.message || last.status, providerPaymentId: last.cfPaymentId });
        if (order.kind === billing.ORDER_KIND.AUTO_NOTIFY) await subscription.markAutoNotifyPaymentFailed(orgId, order.id);
      }
    }
    return res.json({
      ok: true, applied: false, orderStatus: cf.orderStatus,
      order: publicOrder(await billing.getOrder(order.id)),
      subscription: await subscription.loadSubscription(orgId),
    });
  }

  // ── Manual ⇄ Automatic (automatic needs an active, paid add-on) ───────────
  if (action === 'set_whatsapp_mode') {
    requireOwner(session);
    const sub = await subscription.setWhatsappMode(orgId, req.body?.mode);
    return res.json({ ok: true, subscription: sub });
  }

  if (action === 'cancel_auto_notify') {
    requireOwner(session);
    const sub = await subscription.cancelAutoNotify(orgId);
    return res.json({ ok: true, subscription: sub });
  }

  // ── Owner tools: run today's reminders now / send a test message ───────────
  if ((action === 'run_reminders_now' || action === 'whatsapp_test') && !plans.isAutoNotifyEnabled()) {
    throw new HttpError(403, 'AUTO_NOTIFY_ON_HOLD', 'Automatic WhatsApp notifications are not available yet.');
  }

  if (action === 'run_reminders_now') {
    requireOwner(session);
    await checkRateLimit(query, `billing:run_now:${orgId}`, 3, 3600);
    const org = await subscription.loadOrg(orgId);
    const sub = subscription.deriveSubscription(org);
    if (sub.whatsappMode !== subscription.WHATSAPP_MODE.AUTOMATIC) {
      throw new HttpError(402, 'AUTO_NOTIFY_PAYMENT_REQUIRED', sub.autoReason);
    }
    if (!whatsapp.isConfigured()) {
      throw new HttpError(503, 'WHATSAPP_NOT_CONFIGURED', 'The WhatsApp sender is not configured on the server yet. Contact StudyFlow.');
    }
    const summary = await runRemindersJobForOrg(org);
    return res.json({ ok: true, summary });
  }

  if (action === 'whatsapp_test') {
    requireOwner(session);
    await checkRateLimit(query, `billing:wa_test:${orgId}`, 5, 3600);
    const org = await subscription.loadOrg(orgId);
    const sub = subscription.deriveSubscription(org);
    if (sub.whatsappMode !== subscription.WHATSAPP_MODE.AUTOMATIC) {
      throw new HttpError(402, 'AUTO_NOTIFY_PAYMENT_REQUIRED', sub.autoReason);
    }
    if (!whatsapp.isConfigured()) {
      throw new HttpError(503, 'WHATSAPP_NOT_CONFIGURED', 'The WhatsApp sender is not configured on the server yet. Contact StudyFlow.');
    }
    const to = whatsapp.toWaNumber(req.body?.phone) || whatsapp.toWaNumber(org.phone) || whatsapp.toWaNumber(session.phone);
    if (!to) throw new HttpError(400, 'PHONE_REQUIRED', 'Enter the mobile number to send the test to.');
    const cfg = whatsapp.getConfig();
    try {
      const result = await whatsapp.sendTemplate({
        to, template: cfg.templates.payment_due, language: cfg.language,
        bodyParams: [session.name || 'Test Student', org.name, plans.formatINR(500), 'tomorrow', 'A1'],
      });
      return res.json({ ok: true, to: result.to, providerMessageId: result.providerMessageId });
    } catch (err) {
      console.error(`[${req.correlationId}] WhatsApp test failed:`, err.message, err.code);
      throw new HttpError(502, 'WHATSAPP_SEND_FAILED', `WhatsApp did not accept the message${err.code ? ` (error ${err.code})` : ''}: ${String(err.message).slice(0, 200)}`);
    }
  }

  throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown billing action');
}, { methods: ['GET', 'POST'], auth: true, rejectOrgId: true });
