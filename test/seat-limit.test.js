// test/seat-limit.test.js — Server-side seat limits (api/write.js + lib/plans.js)
// Drives the real write handler with a fake DB: the limit is enforced from the plan on the
// organization row, under a row lock, never from anything the client sends.
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);

const writeHandler = require('../api/write');
const { seatLimitMessage } = require('../lib/plans');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

function seatDb({ plan, dbSeatLimit, seatCount, role = 'owner' }) {
  const session = sessionRow({ role, plan, seat_limit: dbSeatLimit });
  return fakeDb([
    ...baseAnswers(session),
    [/SELECT plan, seat_limit, is_demo FROM organizations WHERE id = \$1 FOR UPDATE/, { rows: [{ plan, seat_limit: dbSeatLimit, is_demo: false }], rowCount: 1 }],
    [/SELECT COUNT\(\*\) as count FROM seats WHERE organization_id/, { rows: [{ count: String(seatCount) }], rowCount: 1 }],
    [/FROM branches WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'BR-1', organization_id: 'ORG-1' }], rowCount: 1 }],
    [/FROM rooms WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'RM-1', organization_id: 'ORG-1' }], rowCount: 1 }],
  ]);
}

const seat = (n) => ({ seatNumber: String(n), roomId: 'RM-1', branchId: 'BR-1', x: 0, y: 0 });
const insertSeat = (db, n) => call(writeHandler, db, { body: { table: 'seats', action: 'insert', data: seat(n) }, headers: COOKIE });
const inserted = (db) => db.sqlMatching(/INSERT INTO seats/).length;

describe('Free plan: 5 seats', () => {
  test('the 5th seat is accepted', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 5, seatCount: 4 });
    const res = await insertSeat(db, 5);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(inserted(db), 1);
  });

  test('the 6th seat is refused with the upgrade message and the numbers for the prompt', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 5, seatCount: 5 });
    const res = await insertSeat(db, 6);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'SEAT_LIMIT_REACHED');
    assert.equal(res.body.error, seatLimitMessage('free', 5));
    assert.equal(res.body.error, 'Your free plan is limited to 5 seats. Please upgrade your subscription to add more members.');
    assert.deepEqual(res.body.details, { seatLimit: 5, seatsUsed: 5, plan: 'free', requested: 1 });
    assert.equal(inserted(db), 0, 'nothing written');
  });

  test('a Free row with seat_limit=100 in the database is still capped at 5 (limits come from the plan)', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 100, seatCount: 5 });
    const res = await insertSeat(db, 6);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.details.seatLimit, 5);
  });

  test('a library already over the limit (e.g. migrated) keeps its seats but cannot add more', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 5, seatCount: 9 });
    const res = await insertSeat(db, 10);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.details.seatsUsed, 9);
    assert.equal(db.sqlMatching(/DELETE FROM seats/).length, 0, 'never deletes seats');
  });

  test('bulk insert past the limit is refused as a whole', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 5, seatCount: 3 });
    const res = await call(writeHandler, db, { body: { table: 'seats', action: 'batch_insert', data: [seat(4), seat(5), seat(6)] }, headers: COOKIE });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'SEAT_LIMIT_REACHED');
    assert.equal(res.body.details.requested, 3);
    assert.equal(inserted(db), 0);
  });
});

describe('Paid plans', () => {
  test('Basic: 100th seat accepted, 101st refused', async () => {
    const ok = seatDb({ plan: 'basic', dbSeatLimit: 100, seatCount: 99 });
    assert.equal((await insertSeat(ok, 100)).statusCode, 200);
    const full = seatDb({ plan: 'basic', dbSeatLimit: 100, seatCount: 100 });
    const res = await insertSeat(full, 101);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.details.seatLimit, 100);
    assert.match(res.body.error, /Custom plan/);
  });

  test('Custom 200 seats: limit is the purchased quantity', async () => {
    const ok = seatDb({ plan: 'custom', dbSeatLimit: 200, seatCount: 199 });
    assert.equal((await insertSeat(ok, 200)).statusCode, 200);
    const full = seatDb({ plan: 'custom', dbSeatLimit: 200, seatCount: 200 });
    const res = await insertSeat(full, 201);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.details.seatLimit, 200);
  });

  test('Custom 500 seats', async () => {
    const full = seatDb({ plan: 'custom', dbSeatLimit: 500, seatCount: 500 });
    assert.equal((await insertSeat(full, 501)).statusCode, 403);
    const ok = seatDb({ plan: 'custom', dbSeatLimit: 500, seatCount: 250 });
    assert.equal((await insertSeat(ok, 251)).statusCode, 200);
  });

  test('the limit is read under FOR UPDATE on the organization row', async () => {
    const db = seatDb({ plan: 'basic', dbSeatLimit: 100, seatCount: 1 });
    await insertSeat(db, 2);
    assert.equal(db.sqlMatching(/FROM organizations WHERE id = \$1 FOR UPDATE/).length, 1);
  });

  test('a client cannot raise its own limit: seat_limit in the request body is ignored', async () => {
    const db = seatDb({ plan: 'free', dbSeatLimit: 5, seatCount: 5 });
    const res = await call(writeHandler, db, { body: { table: 'seats', action: 'insert', data: { ...seat(6), seatLimit: 1000, plan: 'custom' } }, headers: COOKIE });
    assert.equal(res.statusCode, 403);
  });
});
