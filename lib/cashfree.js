// lib/cashfree.js — Cashfree Payment Gateway client (orders, status, webhook verification)
//
// Secrets stay on the server: CASHFREE_APP_ID and CASHFREE_SECRET_KEY are read from the
// environment (Cloudflare secrets in production). The browser only ever sees a
// payment_session_id, which is single-use and tied to one order.
//
// Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
'use strict';
const crypto = require('crypto');

const ENDPOINTS = Object.freeze({
  sandbox: 'https://sandbox.cashfree.com/pg',
  production: 'https://api.cashfree.com/pg',
});
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
const DEFAULT_API_VERSION = '2023-08-01';

class CashfreeError extends Error {
  constructor(message, { status, code, raw } = {}) {
    super(message);
    this.name = 'CashfreeError';
    this.status = status;
    this.code = code;
    this.raw = raw;
  }
}

function getConfig(env = process.env) {
  const mode = String(env.CASHFREE_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  return {
    appId: env.CASHFREE_APP_ID || '',
    secret: env.CASHFREE_SECRET_KEY || '',
    mode,
    apiVersion: env.CASHFREE_API_VERSION || DEFAULT_API_VERSION,
    baseUrl: ENDPOINTS[mode],
  };
}

function isConfigured(env = process.env) {
  const c = getConfig(env);
  return Boolean(c.appId && c.secret);
}

/** 10-digit Indian mobile number, or null. Accepts +91/91 prefixes and punctuation. */
function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

async function apiRequest(method, path, body, { fetchImpl = fetch, env = process.env } = {}) {
  const c = getConfig(env);
  if (!c.appId || !c.secret) throw new CashfreeError('Cashfree is not configured', { code: 'NOT_CONFIGURED' });
  const res = await fetchImpl(`${c.baseUrl}${path}`, {
    method,
    headers: {
      'x-client-id': c.appId,
      'x-client-secret': c.secret,
      'x-api-version': c.apiVersion,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) { json = {}; }
  if (!res.ok) {
    throw new CashfreeError(
      `Cashfree ${method} ${path} failed (${res.status}): ${json.message || json.code || text.slice(0, 200)}`,
      { status: res.status, code: json.code || json.type, raw: json }
    );
  }
  return json;
}

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/**
 * Create a Cashfree order for a one-time payment.
 * @returns {{ orderId, cfOrderId, paymentSessionId, orderStatus, raw }}
 */
async function createOrder({ orderId, amount, currency = 'INR', customer = {}, returnUrl, notifyUrl, note, tags }, deps = {}) {
  const phone = normalizePhone(customer.phone);
  if (!phone) throw new CashfreeError('A valid 10-digit mobile number is required for the payment.', { code: 'PHONE_REQUIRED' });
  const body = compact({
    order_id: orderId,
    order_amount: Math.round(Number(amount) * 100) / 100,
    order_currency: currency,
    customer_details: compact({
      customer_id: String(customer.id || 'guest').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50),
      customer_name: customer.name ? String(customer.name).slice(0, 100) : undefined,
      customer_email: customer.email || undefined,
      customer_phone: phone,
    }),
    order_meta: compact({ return_url: returnUrl, notify_url: notifyUrl }),
    order_note: note ? String(note).slice(0, 200) : undefined,
    order_tags: tags,
  });
  const json = await apiRequest('POST', '/orders', body, deps);
  return {
    orderId: json.order_id || orderId,
    cfOrderId: json.cf_order_id != null ? String(json.cf_order_id) : null,
    paymentSessionId: json.payment_session_id || null,
    orderStatus: json.order_status || null,
    raw: json,
  };
}

/** @returns {{ orderId, orderStatus: 'ACTIVE'|'PAID'|'EXPIRED'|'TERMINATED'|string, orderAmount, raw }} */
async function getOrder(orderId, deps = {}) {
  const json = await apiRequest('GET', `/orders/${encodeURIComponent(orderId)}`, null, deps);
  return {
    orderId: json.order_id || orderId,
    orderStatus: json.order_status || null,
    orderAmount: json.order_amount != null ? Number(json.order_amount) : null,
    raw: json,
  };
}

/** Payment attempts for an order, newest first. */
async function getOrderPayments(orderId, deps = {}) {
  const json = await apiRequest('GET', `/orders/${encodeURIComponent(orderId)}/payments`, null, deps);
  const list = Array.isArray(json) ? json : (Array.isArray(json.payments) ? json.payments : []);
  return list.map(p => ({
    cfPaymentId: p.cf_payment_id != null ? String(p.cf_payment_id) : null,
    status: p.payment_status || null,          // SUCCESS | FAILED | PENDING | USER_DROPPED | CANCELLED | VOID | NOT_ATTEMPTED
    amount: p.payment_amount != null ? Number(p.payment_amount) : null,
    time: p.payment_time || p.payment_completion_time || null,
    method: p.payment_group || (p.payment_method ? Object.keys(p.payment_method)[0] : null),
    message: p.payment_message || null,
  }));
}

/**
 * Cashfree signs webhooks with HMAC-SHA256 over `timestamp + rawBody`, keyed by the
 * merchant's client secret, and sends it Base64-encoded in x-webhook-signature.
 */
function verifyWebhookSignature({ rawBody, timestamp, signature, secret } = {}) {
  const key = secret !== undefined ? secret : getConfig().secret;
  if (!rawBody || !timestamp || !signature || !key) return false;
  const expected = crypto.createHmac('sha256', key).update(String(timestamp) + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Replay protection: the webhook timestamp (seconds or milliseconds) must be recent. */
function isTimestampFresh(timestamp, { nowMs = Date.now(), toleranceMs = 10 * 60 * 1000 } = {}) {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return false;
  const ms = n > 1e12 ? n : n * 1000;
  return Math.abs(nowMs - ms) <= toleranceMs;
}

/** Normalize a webhook payload into the few fields the billing code acts on. */
function parseWebhookEvent(payload) {
  const type = String(payload?.type || '');
  const d = payload?.data || {};
  if (type.startsWith('PAYMENT_')) {
    return {
      kind: 'payment',
      type,
      orderId: d.order?.order_id || null,
      orderAmount: d.order?.order_amount != null ? Number(d.order.order_amount) : null,
      paymentStatus: d.payment?.payment_status || null,
      cfPaymentId: d.payment?.cf_payment_id != null ? String(d.payment.cf_payment_id) : null,
      paymentAmount: d.payment?.payment_amount != null ? Number(d.payment.payment_amount) : null,
      paymentTime: d.payment?.payment_time || payload?.event_time || null,
      message: d.payment?.payment_message || null,
    };
  }
  if (type.startsWith('SUBSCRIPTION_')) {
    const sub = d.subscription_details || d.subscription || {};
    return {
      kind: 'subscription',
      type,
      subscriptionId: sub.subscription_id || d.subscription_id || null,
      status: sub.subscription_status || d.subscription_status || null,
      paymentStatus: d.payment?.payment_status || d.payment_status || null,
    };
  }
  return { kind: 'unknown', type };
}

/** Stable id for de-duplicating webhook deliveries (Cashfree retries the same body). */
function eventId(rawBody) {
  return `cf_${crypto.createHash('sha256').update(String(rawBody)).digest('hex').slice(0, 48)}`;
}

module.exports = {
  SDK_URL,
  CashfreeError,
  getConfig,
  isConfigured,
  normalizePhone,
  createOrder,
  getOrder,
  getOrderPayments,
  verifyWebhookSignature,
  isTimestampFresh,
  parseWebhookEvent,
  eventId,
};
