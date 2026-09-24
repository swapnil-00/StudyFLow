// test/api.test.js — Production Readiness Test Suite
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getPool, query } = require('../api/db');
const dataHandler = require('../api/data');
const writeHandler = require('../api/write');
const notifyHandler = require('../api/notify');

// Helper to mock request/response for serverless handlers
function mockReqRes(method, body = {}, queryParams = {}) {
  const req = {
    method,
    body,
    query: queryParams,
    headers: {}
  };
  const res = {
    _status: 200,
    _headers: {},
    _json: null,
    setHeader(k, v) { res._headers[k] = v; return res; },
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    end() { return res; }
  };
  return { req, res };
}

test('1. Database Connection and Pool Verification', async () => {
  const pool = getPool();
  assert.ok(pool, 'Database pool should be initialized');
  const result = await query('SELECT 1 + 1 AS sum');
  assert.equal(result.rows[0].sum, 2, 'PostgreSQL query should return 2');
});

test('2. Schema Constraints: Unique Active Seat Assignment Index', async () => {
  const indexCheck = await query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'seat_assignments' AND indexname = 'idx_unique_active_seat'
  `);
  assert.equal(indexCheck.rows.length, 1, 'idx_unique_active_seat index must exist in database');
});

test('3. API /data: Sanitizes credentials and returns library schema', async () => {
  const { req, res } = mockReqRes('GET');
  await dataHandler(req, res);

  assert.equal(res._status, 200, 'GET /api/data must return HTTP 200');
  assert.ok(res._json.ok, 'Response ok flag must be true');
  assert.ok(Array.isArray(res._json.db.branches), 'Branches must be an array');
  assert.ok(Array.isArray(res._json.db.seats), 'Seats must be an array');
  assert.ok(Array.isArray(res._json.db.students), 'Students must be an array');
  assert.ok(Array.isArray(res._json.db.documents), 'Documents must be an array');

  // Verify sensitive credentials are NOT exposed in settings
  assert.equal(res._json.db.settings.waToken, undefined, 'waToken must not be exposed');
  assert.equal(res._json.db.settings.accessToken, undefined, 'accessToken must not be exposed');
});

test('4. API /write: Concurrency Protection on Seat Assignment', async () => {
  // Create an isolated test seat in an existing room
  const roomRes = await query('SELECT id, branch_id FROM rooms LIMIT 1');
  assert.ok(roomRes.rows.length > 0, 'At least one room must exist');
  const room = roomRes.rows[0];

  const testSeatId = `TEST-SEAT-${Date.now()}`;
  await query(
    `INSERT INTO seats (id, room_id, branch_id, seat_number, status) VALUES ($1, $2, $3, $4, 'available')`,
    [testSeatId, room.id, room.branch_id, 'TEST-01']
  );

  const testStudent1 = `TEST-STU-${Date.now()}-1`;
  const testStudent2 = `TEST-STU-${Date.now()}-2`;

  // Insert mock students for testing
  await query('INSERT INTO students (id, name, branch_id) VALUES ($1, $2, $3)', [testStudent1, 'Test Student 1', room.branch_id]);
  await query('INSERT INTO students (id, name, branch_id) VALUES ($1, $2, $3)', [testStudent2, 'Test Student 2', room.branch_id]);

  try {
    // 1. First assignment succeeds
    const { req: req1, res: res1 } = mockReqRes('POST', {
      table: 'seat_assignments',
      action: 'insert',
      data: {
        seatId: testSeatId,
        studentId: testStudent1,
        branchId: room.branch_id,
        startDate: '2026-09-01',
        endDate: '2026-10-01'
      }
    });
    await writeHandler(req1, res1);
    assert.equal(res1._status, 200, 'First assignment should succeed with HTTP 200');

    // 2. Second concurrent assignment to SAME seat must be rejected with 409 Conflict
    const { req: req2, res: res2 } = mockReqRes('POST', {
      table: 'seat_assignments',
      action: 'insert',
      data: {
        seatId: testSeatId,
        studentId: testStudent2,
        branchId: room.branch_id,
        startDate: '2026-09-01',
        endDate: '2026-10-01'
      }
    });
    await writeHandler(req2, res2);
    assert.equal(res2._status, 409, 'Duplicate active seat assignment must be rejected with HTTP 409');
    assert.match(res2._json.error, /occupied|already assigned/i, 'Error must indicate seat is already occupied');

  } finally {
    // Cleanup test assignments, students, and seat
    await query('DELETE FROM seat_assignments WHERE student_id IN ($1, $2)', [testStudent1, testStudent2]);
    await query('DELETE FROM seats WHERE id = $1', [testSeatId]);
    await query('DELETE FROM students WHERE id IN ($1, $2)', [testStudent1, testStudent2]);
  }
});

test('5. API /write: Payment Recording & Persistence', async () => {
  const stuRes = await query('SELECT id, branch_id FROM students LIMIT 1');
  assert.ok(stuRes.rows.length > 0, 'At least one student must exist');
  const student = stuRes.rows[0];

  const testPayId = `TEST-PAY-${Date.now()}`;
  const { req, res } = mockReqRes('POST', {
    table: 'payments',
    action: 'insert',
    data: {
      id: testPayId,
      studentId: student.id,
      branchId: student.branch_id,
      amount: 1500,
      mode: 'upi',
      receiptNumber: `REC-${Date.now()}`,
      notes: 'Test Automated Payment'
    }
  });

  await writeHandler(req, res);
  assert.equal(res._status, 200, 'Payment recording must return HTTP 200');
  assert.ok(res._json.ok, 'Payment ok flag must be true');

  // Verify stored in DB
  const check = await query('SELECT * FROM payments WHERE id = $1', [testPayId]);
  assert.equal(check.rows.length, 1, 'Payment record must exist in PostgreSQL');
  assert.equal(Number(check.rows[0].amount), 1500, 'Payment amount must match');

  // Cleanup
  await query('DELETE FROM payments WHERE id = $1', [testPayId]);
});

test('6. API /notify: Serverless WhatsApp Mock Dispatcher', async () => {
  const { req, res } = mockReqRes('POST', {
    to: '+919876543210',
    templateName: 'seat_assignment_confirmation',
    variables: { student_name: 'Rahul', seat_number: 'B-12' }
  });

  await notifyHandler(req, res);
  assert.equal(res._status, 200, 'WhatsApp dispatch must return HTTP 200');
  assert.ok(res._json.ok, 'Notification ok flag must be true');
  assert.ok(res._json.providerMessageId, 'Provider message ID must be returned');
});

after(async () => {
  await getPool().end();
});

