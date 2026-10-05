// test/signup-handler.test.js — Self-signup on the Free plan (real api/auth.js, scripted DB)
'use strict';
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studyflow-test-project';

const authHandler = require('../api/auth');
const { setMockVerifier } = require('../lib/firebase');
const { PRICING } = require('../lib/plans');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

const noLibrarySession = () => sessionRow({ organization_id: null, role: null, mem_org_id: null, org_name: null, slug: null, plan: null, seat_limit: null });

describe('Self-signup (Free plan)', () => {
  beforeEach(() => {
    setMockVerifier(async () => ({ uid: 'goog-uid-new', email: 'newowner@example.com', email_verified: true, name: 'New Owner' }));
  });
  after(() => setMockVerifier(null));

  test('intent=login with an unknown Google account is still refused (no silent account creation)', async () => {
    const db = fakeDb(baseAnswers(noLibrarySession()));
    const res = await call(authHandler, db, { body: { action: 'session', idToken: 'tok', intent: 'login' } });
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 'NO_ACCOUNT');
    assert.match(res.body.error, /Create a free library/);
    assert.equal(db.sqlMatching(/INSERT INTO users/).length, 0);
  });

  test('intent=signup without accepting the terms creates nothing', async () => {
    const db = fakeDb(baseAnswers(noLibrarySession()));
    const res = await call(authHandler, db, { body: { action: 'session', idToken: 'tok', intent: 'signup' } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'TERMS_REQUIRED');
    assert.equal(db.sqlMatching(/INSERT INTO users/).length, 0);
  });

  test('intent=signup with terms creates the user and signs them in with no library yet', async () => {
    const db = fakeDb([
      ...baseAnswers(noLibrarySession()),
      [/INSERT INTO users/, (sql, p) => ({ rows: [{ id: p[0], firebase_uid: p[1], email: p[2], name: p[4], status: 'active', avatar_color: p[5] }], rowCount: 1 })],
    ]);
    const res = await call(authHandler, db, { body: { action: 'session', idToken: 'tok', intent: 'signup', termsAccepted: true } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.ok, true);
    assert.equal(res.body.state, 'no_library');
    assert.equal(res.body.user.email, 'newowner@example.com');
    assert.equal(db.sqlMatching(/INSERT INTO users/).length, 1);
    assert.equal(db.sqlMatching(/INSERT INTO sessions/).length, 1);
    assert.match(res.headers['set-cookie'] || '', /sf_session=/);
  });

  test('an unverified Google email cannot sign up', async () => {
    setMockVerifier(async () => ({ uid: 'goog-uid-x', email: 'x@example.com', email_verified: false }));
    const db = fakeDb(baseAnswers(noLibrarySession()));
    const res = await call(authHandler, db, { body: { action: 'session', idToken: 'tok', intent: 'signup', termsAccepted: true } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'EMAIL_UNVERIFIED');
  });
});

describe('create_library', () => {
  test('creates the library on the Free plan with the configured seat limit', async () => {
    const db = fakeDb([
      ...baseAnswers(noLibrarySession()),
      [/SELECT om\.role, o\.is_demo\s+FROM org_members om/, { rows: [{ role: 'owner', is_demo: false }], rowCount: 1 }],
    ]);
    const res = await call(authHandler, db, { body: { action: 'create_library', orgName: 'Sharma Study Library', city: 'Pune' }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.state, 'needs_onboarding');
    assert.equal(res.body.activeLibrary.plan, 'free');
    assert.equal(res.body.activeLibrary.seat_limit, PRICING.FREE_SEAT_LIMIT);
    const ins = db.sqlMatching(/INSERT INTO organizations/)[0];
    assert.match(ins.sql, /'free', \$5/);
    assert.equal(ins.params[4], PRICING.FREE_SEAT_LIMIT);
    assert.equal(ins.params[1], 'Sharma Study Library');
    assert.equal(db.sqlMatching(/INSERT INTO org_members/).length, 1);
    assert.equal(db.sqlMatching(/INSERT INTO settings/).length, 1);
  });

  test('an owner who already has a library is sent back to it instead of getting a second one', async () => {
    const db = fakeDb([
      ...baseAnswers(noLibrarySession()),
      [/WHERE om\.user_id = \$1 AND om\.role = 'owner' AND om\.status = 'active'/, { rows: [{ organization_id: 'ORG-EXIST', name: 'Existing', slug: 'existing', plan: 'basic', onboarding_completed: true, subscription_status: 'active' }], rowCount: 1 }],
      [/SELECT om\.role, o\.is_demo\s+FROM org_members om/, { rows: [{ role: 'owner', is_demo: false }], rowCount: 1 }],
    ]);
    const res = await call(authHandler, db, { body: { action: 'create_library', orgName: 'Another', city: 'Pune' }, headers: COOKIE });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.activeLibrary.id, 'ORG-EXIST');
    assert.equal(db.sqlMatching(/INSERT INTO organizations/).length, 0);
  });

  test('library name is required and anonymous users cannot create one', async () => {
    const missing = await call(authHandler, fakeDb(baseAnswers(noLibrarySession())), { body: { action: 'create_library', orgName: '  ' }, headers: COOKIE });
    assert.equal(missing.statusCode, 400);
    const anon = await call(authHandler, fakeDb([]), { body: { action: 'create_library', orgName: 'X' } });
    assert.equal(anon.statusCode, 401);
  });
});

describe('onboarding wizard respects the plan seat limit', () => {
  test('a Free library asking for 40 seats gets 5', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'free', seat_limit: 5, onboarding_completed: false })),
      [/SELECT plan, seat_limit, is_demo FROM organizations WHERE id = \$1 FOR UPDATE/, { rows: [{ plan: 'free', seat_limit: 5, is_demo: false }], rowCount: 1 }],
      [/SELECT COUNT\(\*\)::int AS n FROM seats/, { rows: [{ n: 0 }], rowCount: 1 }],
    ]);
    const res = await call(authHandler, db, { body: { action: 'onboarding', branchName: 'Main', city: 'Pune', roomName: 'Hall A', seatCount: 40 }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.seatsCreated, 5);
    assert.equal(res.body.seatLimit, 5);
    assert.equal(db.sqlMatching(/INSERT INTO seats/).length, 5);
  });

  test('a Basic library asking for 40 seats gets 40', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100, onboarding_completed: false })),
      [/SELECT plan, seat_limit, is_demo FROM organizations WHERE id = \$1 FOR UPDATE/, { rows: [{ plan: 'basic', seat_limit: 100, is_demo: false }], rowCount: 1 }],
      [/SELECT COUNT\(\*\)::int AS n FROM seats/, { rows: [{ n: 0 }], rowCount: 1 }],
    ]);
    const res = await call(authHandler, db, { body: { action: 'onboarding', branchName: 'Main', city: 'Pune', roomName: 'Hall A', seatCount: 40 }, headers: COOKIE });
    assert.equal(res.body.seatsCreated, 40);
    assert.equal(db.sqlMatching(/INSERT INTO seats/).length, 40);
  });

  test('client_config advertises signup, prices and payment status', async () => {
    const res = await call(authHandler, fakeDb([]), { body: { action: 'client_config' } });
    assert.equal(res.body.signup.enabled, true);
    assert.equal(res.body.signup.freeSeats, PRICING.FREE_SEAT_LIMIT);
    assert.equal(res.body.pricing.basic.price, PRICING.BASE_PRICE);
    assert.equal(typeof res.body.payments.configured, 'boolean');
  });
});
