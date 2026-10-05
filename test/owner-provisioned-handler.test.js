// test/owner-provisioned-handler.test.js — Drives the real api/auth.js handler (not a re-implementation)
// against a scripted in-memory DB context, for the owner-provisioned / no-self-signup rules.
'use strict';
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studyflow-test-project';

const authHandler = require('../api/auth');
const { runWithDb } = require('../lib/db');
const { setMockVerifier } = require('../lib/firebase');

// Records every SQL statement and answers it from `answers` (first regex that matches wins).
function fakeDb(answers) {
  const log = [];
  const run = async (sql, params) => {
    log.push({ sql, params });
    for (const [re, reply] of answers) {
      if (re.test(sql)) return typeof reply === 'function' ? reply(sql, params) : reply;
    }
    return { rows: [], rowCount: 0 };
  };
  return {
    log,
    ctx: {
      query: run,
      withTransaction: async (cb) => cb({ query: run }),
      cleanup: async () => {},
    },
  };
}

function call(db, body) {
  const req = {
    method: 'POST',
    url: '/api/auth',
    headers: { 'content-type': 'application/json' },
    body,
    query: {},
  };
  const res = {
    statusCode: 200,
    body: null,
    headersSent: false,
    setHeader() { return res; },
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; res.headersSent = true; return res; },
    end() { res.headersSent = true; return res; },
  };
  return runWithDb(db.ctx, () => authHandler(req, res)).then(() => res);
}

const RATE_OK = [/INSERT INTO rate_limits/, () => ({ rows: [{ hits: 1, reset_at: new Date(Date.now() + 60000) }] })];
const inserted = (log, re) => log.filter(e => re.test(e.sql));

describe('Owner-provisioned libraries: real handler', () => {
  beforeEach(() => {
    setMockVerifier(async () => ({ uid: 'goog-uid-new', email: 'stranger@example.com', email_verified: true, name: 'Stranger' }));
  });
  after(() => setMockVerifier(null));

  test('unknown Google account with intent "login" gets 404 NO_ACCOUNT and no user row', async () => {
    const db = fakeDb([RATE_OK]);
    const res = await call(db, { action: 'session', idToken: 'tok', intent: 'login' });
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 'NO_ACCOUNT');
    assert.equal(inserted(db.log, /INSERT INTO users/).length, 0, 'must not create a user');
  });

  // Self-signup on the Free plan is covered in test/signup-handler.test.js; here only the
  // guard that signup needs explicit consent.
  test('unknown Google account with intent "signup" but no accepted terms creates no user', async () => {
    const db = fakeDb([RATE_OK]);
    const res = await call(db, { action: 'session', idToken: 'tok', intent: 'signup' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'TERMS_REQUIRED');
    assert.equal(inserted(db.log, /INSERT INTO users/).length, 0, 'must not create a user');
  });

  test('register always returns 403', async () => {
    const db = fakeDb([RATE_OK]);
    const res = await call(db, { action: 'register', name: 'X', email: 'x@example.com', password: 'Abcdefghij123!', termsAccepted: true });
    assert.equal(res.statusCode, 403);
    assert.equal(inserted(db.log, /INSERT INTO users/).length, 0);
  });

  test('create_library without a session returns 401 and creates nothing', async () => {
    const db = fakeDb([RATE_OK]);
    const res = await call(db, { action: 'create_library', orgName: 'Sneaky Library' });
    assert.equal(res.statusCode, 401);
    assert.equal(inserted(db.log, /INSERT INTO organizations/).length, 0);
  });

  test('an invitation that was already claimed cannot be used again (atomic claim)', async () => {
    const invite = {
      id: 'INV-1', organization_id: 'ORG-1', email: 'stranger@example.com', role: 'staff',
      branch_ids: [], is_demo: false,
    };
    const db = fakeDb([
      RATE_OK,
      [/FROM invitations i/, { rows: [invite], rowCount: 1 }],
      [/INSERT INTO users/, (sql, p) => ({ rows: [{ id: p[0], status: 'active', email: p[2], name: p[4] }], rowCount: 1 })],
      // Another request claimed it between our SELECT and UPDATE: the conditional UPDATE matches nothing.
      [/UPDATE invitations SET accepted_at/, { rows: [], rowCount: 0 }],
    ]);
    const res = await call(db, { action: 'session', idToken: 'tok', intent: 'login', inviteToken: 'secret' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVITE_INVALID');
    assert.equal(inserted(db.log, /INSERT INTO org_members/).length, 0, 'must not join the library');
    const claim = inserted(db.log, /UPDATE invitations SET accepted_at/)[0];
    assert.match(claim.sql, /accepted_at IS NULL/, 'claim must be conditional on the invite still being unused');
  });

  test('invitation into the demo library is refused with DEMO_LOCKED', async () => {
    const db = fakeDb([
      RATE_OK,
      [/FROM invitations i/, { rows: [{ id: 'INV-2', organization_id: 'ORG-DEMO', email: 'stranger@example.com', role: 'staff', is_demo: true }], rowCount: 1 }],
    ]);
    const res = await call(db, { action: 'session', idToken: 'tok', intent: 'login', inviteToken: 'secret' });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'DEMO_LOCKED');
    assert.equal(inserted(db.log, /INSERT INTO users/).length, 0);
  });

  test('invitation sent to a different email is refused', async () => {
    const db = fakeDb([
      RATE_OK,
      [/FROM invitations i/, { rows: [{ id: 'INV-3', organization_id: 'ORG-1', email: 'someone.else@example.com', role: 'staff', is_demo: false }], rowCount: 1 }],
    ]);
    const res = await call(db, { action: 'session', idToken: 'tok', intent: 'login', inviteToken: 'secret' });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'INVITE_EMAIL_MISMATCH');
    assert.equal(inserted(db.log, /INSERT INTO users/).length, 0);
  });
});
