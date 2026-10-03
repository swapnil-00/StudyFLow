// test/cloudflare-hardening.test.js — Tests for Cloudflare Workers migration & hardening fixes
'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');

const { withHandler } = require('../lib/http');
const authHandler = require('../api/auth');
const { createRequestDb } = require('../lib/db');
const { SECURITY_HEADERS, CSP_REPORT_ONLY, generateHeadersFile } = require('../lib/security-headers');

function mockReqRes(method, body = null, headers = {}, queryParams = {}) {
  const req = {
    method,
    body,
    headers: { ...headers },
    query: queryParams,
    url: '/api/test'
  };
  if (body && !req.headers['content-type']) {
    req.headers['content-type'] = 'application/json';
  }
  const res = {
    _status: 200,
    _headers: {},
    _json: null,
    setHeader(k, v) { res._headers[k.toLowerCase()] = v; return res; },
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    end() { return res; }
  };
  return { req, res };
}

describe('Cloudflare Hardening: Error Masking (H1 / C1)', () => {
  test('Unexpected server error does NOT leak error message or details to client', async () => {
    const sensitiveMessage = 'FATAL: database "production" connection failed on ep-steep-recipe-123456.us-east-2.aws.neon.tech:5432';
    const buggyHandler = withHandler(async () => {
      throw new Error(sensitiveMessage);
    }, { auth: false, methods: ['POST'] });

    const { req, res } = mockReqRes('POST', { foo: 'bar' });
    await buggyHandler(req, res);

    assert.equal(res._status, 500, 'Must return HTTP 500');
    assert.equal(res._json.ok, false);
    assert.equal(res._json.error, 'Internal server error', 'Must return generic error string');
    assert.equal(res._json.details, undefined, 'details field must be omitted');
    assert.ok(typeof res._json.correlationId === 'string' && res._json.correlationId.length > 0, 'Must include correlationId');

    const serialized = JSON.stringify(res._json);
    assert.equal(serialized.includes(sensitiveMessage), false, 'Sensitive error message must not appear in JSON response');
    assert.equal(serialized.includes('ep-steep-recipe'), false, 'Hostname must not appear in JSON response');
  });

  test('Database unique constraint error returns clean 409 conflict message without column/table details', async () => {
    const constraintError = 'duplicate key value violates unique constraint "users_email_key" Key (email)=(test@example.com) already exists.';
    const conflictHandler = withHandler(async () => {
      throw new Error(constraintError);
    }, { auth: false, methods: ['POST'] });

    const { req, res } = mockReqRes('POST', { email: 'test@example.com' });
    await conflictHandler(req, res);

    assert.equal(res._status, 409, 'Must return HTTP 409 Conflict');
    assert.equal(res._json.ok, false);
    assert.equal(res._json.error, 'A conflict occurred with an existing record.');
    assert.equal(res._json.details, undefined, 'details field must be omitted');
    assert.ok(typeof res._json.correlationId === 'string');
  });
});

describe('Cloudflare Hardening: Google-Only Sign-In & Disabled Password Actions (B2 / C8)', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.AUTH_PASSWORD_ENABLED;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AUTH_PASSWORD_ENABLED;
    } else {
      process.env.AUTH_PASSWORD_ENABLED = originalEnv;
    }
  });

  test('client_config reflects AUTH_PASSWORD_ENABLED setting', async () => {
    process.env.AUTH_PASSWORD_ENABLED = 'false';
    const { req: reqFalse, res: resFalse } = mockReqRes('POST', { action: 'client_config' });
    await authHandler(reqFalse, resFalse);
    assert.equal(resFalse._status, 200);
    assert.equal(resFalse._json.ok, true);
    assert.deepEqual(resFalse._json.authMethods, { google: true, password: false });

    process.env.AUTH_PASSWORD_ENABLED = 'true';
    const { req: reqTrue, res: resTrue } = mockReqRes('POST', { action: 'client_config' });
    await authHandler(reqTrue, resTrue);
    assert.equal(resTrue._status, 200);
    assert.equal(resTrue._json.ok, true);
    assert.deepEqual(resTrue._json.authMethods, { google: true, password: true });
  });

  test('AUTH_PASSWORD_ENABLED=false rejects all 5 password actions with 403 PASSWORD_AUTH_DISABLED without running scrypt', async () => {
    process.env.AUTH_PASSWORD_ENABLED = 'false';

    let scryptCallCount = 0;
    const origScrypt = crypto.scrypt;
    crypto.scrypt = function (...args) {
      scryptCallCount++;
      return origScrypt.apply(this, args);
    };

    try {
      const actionsToTest = [
        { action: 'login', email: 'owner@example.com', password: 'Password123!' },
        { action: 'register', name: 'Owner', email: 'new@example.com', password: 'Password123!', termsAccepted: true },
        { action: 'password_reset_request', email: 'owner@example.com' },
        { action: 'password_reset_verify', email: 'owner@example.com', code: '123456' },
        { action: 'password_reset_confirm', email: 'owner@example.com', resetToken: 'tok-123', newPassword: 'NewPassword123!' },
      ];

      for (const payload of actionsToTest) {
        const { req, res } = mockReqRes('POST', payload);
        await authHandler(req, res);

        assert.equal(res._status, 403, `Action ${payload.action} must return HTTP 403`);
        assert.equal(res._json.ok, false);
        assert.equal(res._json.code, 'PASSWORD_AUTH_DISABLED', `Action ${payload.action} must return code PASSWORD_AUTH_DISABLED`);
        assert.match(res._json.error, /Continue with Google/i);
      }

      assert.equal(scryptCallCount, 0, 'No scrypt hashing or dummy verification must run when password auth is disabled');
    } finally {
      crypto.scrypt = origScrypt;
    }
  });
});

describe('Cloudflare Hardening: Database Lazy Connection & Error Handling (C5 / C6)', () => {
  test('createRequestDb creates context lazily without initiating connection on construct', async () => {
    const env = {
      DATABASE_URL: 'postgres://nonexistent-user:wrong-pwd@127.0.0.1:54329/fake_db_test'
    };

    const reqDb = createRequestDb(env);
    assert.ok(reqDb, 'createRequestDb should construct without throwing');
    assert.equal(typeof reqDb.query, 'function');
    assert.equal(typeof reqDb.cleanup, 'function');

    // cleanup on an unopened connection should be a safe no-op
    await reqDb.cleanup();
  });
});

describe('Cloudflare Hardening: Security Headers Module (C2)', () => {
  test('SECURITY_HEADERS includes essential hardening headers', () => {
    assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
    assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'SAMEORIGIN');
    assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.equal(SECURITY_HEADERS['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains');
  });

  test('generateHeadersFile emits valid Cloudflare _headers format', () => {
    const headersContent = generateHeadersFile();
    assert.match(headersContent, /\/\*\s+X-Content-Type-Options: nosniff/);
    assert.match(headersContent, /Strict-Transport-Security: max-age=63072000; includeSubDomains/);
    assert.match(headersContent, /\/js\/bundle\.\*\s+Cache-Control: public, max-age=31536000, immutable/);
    assert.match(headersContent, /\/css\/app\.\*\s+Cache-Control: public, max-age=31536000, immutable/);
  });
});
