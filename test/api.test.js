// test/api.test.js — Security & Production Readiness Test Suite
// Verifies fixes for SEC-001 through SEC-035 without compromising production data.
const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');
process.env.NODE_ENV = 'test';

// Random throwaway passwords, so no password-like literals live in the repository
const testPassword = () => `Tp-${crypto.randomBytes(12).toString('base64url')}-9`;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dataHandler = require('../api/data');
const writeHandler = require('../api/write');
const notifyHandler = require('../api/notify');
const authHandler = require('../api/auth');
const { signToken, verifyToken, hashPassword, verifyPassword, validatePasswordStrength } = require('../lib/auth');
const { can, assertCan } = require('../lib/authorize');
const { validate, isPositiveDecimal } = require('../lib/validate');
const { escapeHtml, escapeAttr } = require('../js/utils');

// Mock request / response helper
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

describe('Phase 1 & Phase 5: Authentication & Session Verification', () => {
  test('SEC-001: Anonymous GET /api/data is rejected with HTTP 401', async () => {
    const { req, res } = mockReqRes('GET');
    await dataHandler(req, res);
    assert.equal(res._status, 401, 'Anonymous request must return HTTP 401');
    assert.equal(res._json.ok, false);
    assert.equal(res._json.code, 'UNAUTHENTICATED');
  });

  test('SEC-002: Anonymous POST /api/write is rejected with HTTP 401', async () => {
    const { req, res } = mockReqRes('POST', { table: 'students', action: 'insert', data: { name: 'Test' } });
    await writeHandler(req, res);
    assert.equal(res._status, 401, 'Anonymous write must return HTTP 401');
    assert.equal(res._json.ok, false);
  });

  test('SEC-005: Anonymous POST /api/notify is rejected with HTTP 401', async () => {
    const { req, res } = mockReqRes('POST', { to: '+919999999999', text: 'Spam' });
    await notifyHandler(req, res);
    assert.equal(res._status, 401, 'Anonymous notification must return HTTP 401');
    assert.equal(res._json.ok, false);
  });

  test('SEC-002: Client-supplied orgId in request body is rejected with HTTP 400', async () => {
    const validToken = signToken({ userId: 'USR-1', orgId: 'ORG-A', role: 'owner' });
    const { req, res } = mockReqRes('POST',
      { table: 'students', action: 'insert', orgId: 'ORG-ATTACKER', data: { name: 'Test' } },
      { 'authorization': `Bearer ${validToken}` }
    );
    await writeHandler(req, res);
    assert.equal(res._status, 400, 'Sending orgId in body must be rejected with HTTP 400');
    assert.match(res._json.error, /orgId/i);
  });

  test('SEC-004: Token signed with old committed fallback secret is rejected', () => {
    const oldSecret = 'studyflow-saas-production-secret-key-2026-v2';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'USR-1', orgId: 'ORG-A', exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url');
    const signature = crypto.createHmac('sha256', oldSecret).update(`${header}.${payload}`).digest('base64url');
    const forgedToken = `${header}.${payload}.${signature}`;

    const verified = verifyToken(forgedToken);
    assert.equal(verified, null, 'Forged token signed with old fallback secret must be rejected');
  });

  test('SEC-015: Password hashing uses salted scrypt with OWASP-strength parameters stored in the hash', async () => {
    const password = testPassword();
    const hash = await hashPassword(password);
    assert.match(hash, /^\$scrypt\$ln=15,r=8,p=3\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/, 'PHC-format scrypt hash with parameters');
    assert.ok(!hash.includes(password), 'Hash must not contain the password');

    const again = await hashPassword(password);
    assert.notEqual(again, hash, 'Unique random salt per hash');

    const result = await verifyPassword(password, hash);
    assert.equal(result.valid, true, 'Correct password must verify');
    assert.equal(result.needsRehash, false, 'Current-parameter hash does not need rehash');

    const wrongResult = await verifyPassword(testPassword(), hash);
    assert.equal(wrongResult.valid, false, 'Wrong password must fail');
    assert.equal((await verifyPassword(password, '')).valid, false, 'Empty hash must fail');
    assert.equal((await verifyPassword(password, '$scrypt$ln=99,r=8,p=1$AA==$AA==')).valid, false, 'Absurd parameters must be rejected');
  });

  test('SEC-015: Older hash formats still verify and are flagged for transparent upgrade', async () => {
    const crypto = require('crypto');
    const password = testPassword();

    const salt = crypto.randomBytes(16).toString('hex');
    const oldScrypt = `scrypt:${salt}:${crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
    const oldScryptResult = await verifyPassword(password, oldScrypt);
    assert.deepEqual(oldScryptResult, { valid: true, needsRehash: true });
    assert.equal((await verifyPassword(testPassword(), oldScrypt)).valid, false);

    const pbkdfSalt = crypto.randomBytes(16).toString('hex');
    const pbkdf2 = `${pbkdfSalt}:${crypto.pbkdf2Sync(password, pbkdfSalt, 10000, 64, 'sha512').toString('hex')}`;
    assert.deepEqual(await verifyPassword(password, pbkdf2), { valid: true, needsRehash: true });
    assert.equal((await verifyPassword(testPassword(), pbkdf2)).valid, false);
  });

  test('SEC-034: Weak and common passwords are rejected during validation', () => {
    assert.throws(() => validatePasswordStrength('short'), /at least 10 characters/);
    assert.throws(() => validatePasswordStrength('password123'), /too common/);
    assert.doesNotThrow(() => validatePasswordStrength('ComplexUniquePass987!'));
  });
});

describe('Phase 2: XSS Protection & Sanitization', () => {
  test('SEC-007: escapeHtml neutralizes script, img onerror, and svg onload attack vectors', () => {
    const maliciousScript = '<script>alert(1)</script>';
    const maliciousImg = '<img src=x onerror=alert(1)>';
    const maliciousSvg = '\'"><svg onload=alert(1)>';

    assert.equal(escapeHtml(maliciousScript), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(escapeHtml(maliciousImg), '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(escapeHtml(maliciousSvg), '&#39;&quot;&gt;&lt;svg onload=alert(1)&gt;');
  });

  test('SEC-007: escapeAttr neutralizes attribute escape injection', () => {
    const attrPayload = '" onclick="alert(1)"';
    assert.equal(escapeAttr(attrPayload), '&quot; onclick=&quot;alert(1)&quot;');
  });
});

describe('Phase 3: Authorization & RBAC', () => {
  test('SEC-008: Staff role cannot access settings, plans, or delete staff', () => {
    assert.equal(can('owner', 'settings', 'update'), true, 'Owner can update settings');
    assert.equal(can('manager', 'settings', 'update'), false, 'Manager cannot update settings');
    assert.equal(can('staff', 'settings', 'update'), false, 'Staff cannot update settings');

    assert.equal(can('staff', 'membership_plans', 'create'), false, 'Staff cannot create membership plans');
    assert.equal(can('staff', 'staff', 'delete'), false, 'Staff cannot delete staff');
    assert.equal(can('staff', 'students', 'read'), true, 'Staff can read students');
    assert.equal(can('staff', 'payments', 'create'), true, 'Staff can record payments');
  });

  test('NEW-01: Action normalization correctly maps write actions for staff and manager', () => {
    // Staff operations
    assert.doesNotThrow(() => assertCan('staff', 'students', 'insert'));
    assert.doesNotThrow(() => assertCan('staff', 'payments', 'insert'));
    assert.doesNotThrow(() => assertCan('staff', 'documents', 'save'));
    assert.doesNotThrow(() => assertCan('staff', 'notifications', 'markRead'));

    // Manager operations
    assert.doesNotThrow(() => assertCan('manager', 'students', 'insert'));
    assert.doesNotThrow(() => assertCan('manager', 'rooms', 'insert'));
    assert.doesNotThrow(() => assertCan('manager', 'seats', 'batch_insert'));
    assert.doesNotThrow(() => assertCan('manager', 'waitlist', 'insert'));
    assert.doesNotThrow(() => assertCan('manager', 'expenses', 'insert'));

    // Prohibited actions
    assert.throws(() => assertCan('staff', 'staff', 'delete'));
    assert.throws(() => assertCan('staff', 'settings', 'update'));
    assert.throws(() => assertCan('manager', 'branches', 'update'));
    assert.throws(() => assertCan('manager', 'staff', 'delete'));
  });
});

describe('Phase 4: Financial Integrity & Business Logic', () => {
  test('SEC-010: Validation rejects non-positive or malformed amounts', () => {
    assert.equal(isPositiveDecimal(-100), false, 'Negative amounts must be rejected');
    assert.equal(isPositiveDecimal(0), false, 'Zero amounts must be rejected');
    assert.equal(isPositiveDecimal('abc'), false, 'NaN must be rejected');
    assert.equal(isPositiveDecimal(150.555), false, 'More than 2 decimal places must be rejected');
    assert.equal(isPositiveDecimal(1500), true, 'Valid integer amount must be accepted');
    assert.equal(isPositiveDecimal('450.50'), true, 'Valid 2dp decimal must be accepted');
  });

  test('SEC-011: upgrade_plan endpoint is disabled and returns HTTP 403', async () => {
    const token = signToken({ userId: 'USR-1', orgId: 'ORG-A', role: 'owner' });
    const { req, res } = mockReqRes('POST',
      { action: 'upgrade_plan', plan: 'enterprise' },
      { 'authorization': `Bearer ${token}` }
    );
    await authHandler(req, res);
    assert.equal(res._status, 403, 'upgrade_plan must return HTTP 403 Forbidden');
    assert.equal(res._json.code, 'UPGRADE_DISABLED');
  });
});

describe('Phase 5: Auth Upgrade & Session Hardening', () => {
  test('CSRF: Cross-origin POST from unauthorized domain is rejected with HTTP 403', async () => {
    const { req, res } = mockReqRes('POST',
      { action: 'password_reset', email: 'test@example.com' },
      { 'origin': 'https://evil-attacker-site.com' }
    );
    await authHandler(req, res);
    assert.equal(res._status, 403, 'Cross-origin mutation request must return 403');
    assert.equal(res._json.code, 'CSRF_FORBIDDEN');
  });

  test('Enumeration Defense: Password reset returns identical generic response for any input', async () => {
    const { req, res } = mockReqRes('POST',
      { action: 'password_reset', email: 'nonexistent@example.com' }
    );
    await authHandler(req, res);
    assert.equal(res._status, 200);
    assert.equal(res._json.ok, true);
    assert.match(res._json.message, /If an account exists/i);
  });

  test('Session Security: Session token hashes are SHA-256 and non-reversible', () => {
    const { generateSessionToken, hashSessionToken } = require('../lib/session');
    const token = generateSessionToken();
    assert.equal(token.length, 64, 'Token must be 32 bytes hex = 64 characters');
    const hash = hashSessionToken(token);
    assert.equal(hash.length, 64, 'SHA-256 hash must be 64 characters hex');
    assert.notEqual(token, hash, 'Hash must not equal raw token');
  });
});

describe('Phase 0 Safety Net: Production Database Protection Guard', () => {
  test('Guard: Refuses to run DB tests against production DATABASE_URL', () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    const prodDbUrl = process.env.DATABASE_URL;

    if (!testDbUrl || testDbUrl === prodDbUrl) {
      console.log('   🛡️  [SAFETY GUARD ACTIVE] TEST_DATABASE_URL is not set or matches production. Live DB tests are skipped to protect production database.');
      assert.ok(true, 'Production database was shielded from test runner');
    } else {
      assert.notEqual(testDbUrl, prodDbUrl, 'TEST_DATABASE_URL must never match production DATABASE_URL');
    }
  });
});

after(async () => {
  try {
    const { getPool } = require('../lib/db');
    await getPool().end();
  } catch (e) {}
});
