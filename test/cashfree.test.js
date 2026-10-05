// test/cashfree.test.js — Cashfree client (lib/cashfree.js): requests, signatures, parsing
'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const cashfree = require('../lib/cashfree');

const SECRET = 'cf_test_secret_' + crypto.randomBytes(6).toString('hex');

describe('Cashfree webhook signature', () => {
  test('accepts the documented HMAC-SHA256(secret, timestamp + rawBody) in Base64', () => {
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'ORD-1' } } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac('sha256', SECRET).update(timestamp + rawBody).digest('base64');
    assert.equal(cashfree.verifyWebhookSignature({ rawBody, timestamp, signature, secret: SECRET }), true);
  });

  test('rejects a tampered body, wrong secret, or missing parts', () => {
    const rawBody = '{"a":1}';
    const timestamp = '1700000000';
    const signature = crypto.createHmac('sha256', SECRET).update(timestamp + rawBody).digest('base64');
    assert.equal(cashfree.verifyWebhookSignature({ rawBody: '{"a":2}', timestamp, signature, secret: SECRET }), false);
    assert.equal(cashfree.verifyWebhookSignature({ rawBody, timestamp, signature, secret: 'other' }), false);
    assert.equal(cashfree.verifyWebhookSignature({ rawBody, timestamp, signature: '', secret: SECRET }), false);
    assert.equal(cashfree.verifyWebhookSignature({ rawBody, timestamp: '', signature, secret: SECRET }), false);
    assert.equal(cashfree.verifyWebhookSignature({ rawBody, timestamp, signature, secret: '' }), false);
  });

  test('timestamp freshness accepts seconds or milliseconds within 10 minutes', () => {
    const now = Date.now();
    assert.equal(cashfree.isTimestampFresh(String(Math.floor(now / 1000)), { nowMs: now }), true);
    assert.equal(cashfree.isTimestampFresh(String(now), { nowMs: now }), true);
    assert.equal(cashfree.isTimestampFresh(String(Math.floor(now / 1000) - 11 * 60), { nowMs: now }), false);
    assert.equal(cashfree.isTimestampFresh('garbage', { nowMs: now }), false);
  });

  test('eventId is stable for the same body and differs for a different body', () => {
    assert.equal(cashfree.eventId('abc'), cashfree.eventId('abc'));
    assert.notEqual(cashfree.eventId('abc'), cashfree.eventId('abd'));
  });
});

describe('Cashfree payload parsing', () => {
  test('parses a PAYMENT_SUCCESS_WEBHOOK', () => {
    const e = cashfree.parseWebhookEvent({
      type: 'PAYMENT_SUCCESS_WEBHOOK', event_time: '2026-10-05T10:00:00+05:30',
      data: { order: { order_id: 'ORD-1', order_amount: 5000 }, payment: { cf_payment_id: 123456, payment_status: 'SUCCESS', payment_amount: 5000, payment_time: '2026-10-05T10:00:00+05:30' } },
    });
    assert.equal(e.kind, 'payment');
    assert.equal(e.orderId, 'ORD-1');
    assert.equal(e.paymentStatus, 'SUCCESS');
    assert.equal(e.cfPaymentId, '123456');
    assert.equal(e.paymentAmount, 5000);
  });

  test('unknown events are tolerated', () => {
    assert.equal(cashfree.parseWebhookEvent({ type: 'SOMETHING_ELSE' }).kind, 'unknown');
    assert.equal(cashfree.parseWebhookEvent(null).kind, 'unknown');
  });

  test('normalizePhone accepts Indian mobiles with or without +91', () => {
    assert.equal(cashfree.normalizePhone('+91 98765 43210'), '9876543210');
    assert.equal(cashfree.normalizePhone('919876543210'), '9876543210');
    assert.equal(cashfree.normalizePhone('09876543210'), '9876543210');
    assert.equal(cashfree.normalizePhone('12345'), null);
    assert.equal(cashfree.normalizePhone('1234567890'), null, 'must start with 6-9');
  });
});

describe('Cashfree API requests', () => {
  const saved = {};
  beforeEach(() => {
    for (const k of ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_ENV']) saved[k] = process.env[k];
    process.env.CASHFREE_APP_ID = 'app_test';
    process.env.CASHFREE_SECRET_KEY = SECRET;
    process.env.CASHFREE_ENV = 'sandbox';
  });
  afterEach(() => {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });

  test('createOrder posts the documented body with secret headers and returns the session id', async () => {
    let captured = null;
    const fetchImpl = async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, text: async () => JSON.stringify({ order_id: 'ORD-1', cf_order_id: 987, payment_session_id: 'session_abc', order_status: 'ACTIVE' }) };
    };
    const r = await cashfree.createOrder({
      orderId: 'ORD-1', amount: 5000, customer: { id: 'ORG-1', name: 'Owner', email: 'o@example.com', phone: '+91 98765 43210' },
      returnUrl: 'https://app/#/billing?order={order_id}', notifyUrl: 'https://app/api/webhooks/cashfree', note: 'Basic plan',
    }, { fetchImpl });
    assert.equal(r.paymentSessionId, 'session_abc');
    assert.equal(r.cfOrderId, '987');
    assert.equal(captured.url, 'https://sandbox.cashfree.com/pg/orders');
    assert.equal(captured.init.headers['x-client-id'], 'app_test');
    assert.equal(captured.init.headers['x-client-secret'], SECRET);
    assert.equal(captured.init.headers['x-api-version'], '2023-08-01');
    const body = JSON.parse(captured.init.body);
    assert.equal(body.order_id, 'ORD-1');
    assert.equal(body.order_amount, 5000);
    assert.equal(body.order_currency, 'INR');
    assert.equal(body.customer_details.customer_phone, '9876543210');
    assert.equal(body.order_meta.notify_url, 'https://app/api/webhooks/cashfree');
  });

  test('createOrder refuses without a valid phone and when not configured', async () => {
    await assert.rejects(() => cashfree.createOrder({ orderId: 'x', amount: 1, customer: { phone: '123' } }, { fetchImpl: async () => { throw new Error('should not be called'); } }), (e) => e.code === 'PHONE_REQUIRED');
    delete process.env.CASHFREE_SECRET_KEY;
    assert.equal(cashfree.isConfigured(), false);
    await assert.rejects(() => cashfree.getOrder('ORD-1', { fetchImpl: async () => { throw new Error('should not be called'); } }), (e) => e.code === 'NOT_CONFIGURED');
  });

  test('API errors become CashfreeError with the provider status and message', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, text: async () => JSON.stringify({ message: 'order not found', code: 'order_not_found' }) });
    await assert.rejects(() => cashfree.getOrder('ORD-X', { fetchImpl }), (e) => e.name === 'CashfreeError' && e.status === 404 && /order not found/.test(e.message));
  });

  test('getOrderPayments maps the payment list', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, text: async () => JSON.stringify([{ cf_payment_id: 1, payment_status: 'FAILED', payment_amount: 5000, payment_time: 't1', payment_group: 'upi', payment_message: 'declined' }]) });
    const list = await cashfree.getOrderPayments('ORD-1', { fetchImpl });
    assert.deepEqual(list, [{ cfPaymentId: '1', status: 'FAILED', amount: 5000, time: 't1', method: 'upi', message: 'declined' }]);
  });
});
