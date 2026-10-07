// test/write-consistency.test.js — Every database write matches the real schema
//
// Found in manual testing: editing an expense failed (expenses had no updated_at) and editing
// a student failed (four request keys were written to the same id_proof column). These checks
// read the schema (db/schema.sql, db/migrations, lib/db-init.js) and every UPDATE in the API, so
// the same class of bug fails the test suite instead of production.
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);

const root = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const schemaSrc = ['db/schema.sql', ...fs.readdirSync(path.join(root, 'db/migrations')).map(f => 'db/migrations/' + f), 'lib/db-init.js'].map(rd).join('\n');

function columnsOf(table) {
  const out = new Set();
  const re = new RegExp('CREATE TABLE IF NOT EXISTS ' + table + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(schemaSrc))) {
    let i = m.index + m[0].length, depth = 1, body = '';
    while (i < schemaSrc.length && depth > 0) {
      const c = schemaSrc[i];
      if (c === '(') depth++; else if (c === ')') depth--;
      if (depth > 0) body += c;
      i++;
    }
    for (const line of body.split('\n')) {
      const w = line.trim().split(/\s+/)[0];
      if (/^[a-z_]+$/.test(w)) out.add(w);
    }
  }
  const alt = new RegExp('ALTER TABLE ' + table + ' ADD COLUMN IF NOT EXISTS ([a-z_]+)', 'g');
  while ((m = alt.exec(schemaSrc))) out.add(m[1]);
  return out;
}

const SOURCES = ['api/write.js', 'api/auth.js', 'api/admin.js', 'api/data.js', 'lib/subscription.js', 'lib/billing.js', 'lib/coupons.js', 'lib/session.js'];

describe('Database writes match the schema', () => {
  test('every UPDATE ... SET column exists on its table (including updated_at)', () => {
    const problems = [];
    for (const f of SOURCES) {
      const s = rd(f);
      for (const m of s.matchAll(/UPDATE\s+([a-z_]+)\s+SET([\s\S]*?)(WHERE|`)/g)) {
        const table = m[1];
        const cols = columnsOf(table);
        if (cols.size === 0) continue; // not a table we model (e.g. dynamic)
        const line = s.slice(0, m.index).split('\n').length;
        for (const cm of m[2].matchAll(/(?:^|[,\s])([a-z_]+)\s*=/g)) {
          if (!cols.has(cm[1])) problems.push(`${f}:${line} ${table}.${cm[1]}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  test('write.js update maps only name real columns and never assign one column twice', () => {
    const w = rd('api/write.js');
    const problems = [];
    for (const block of w.split(/if \(table === '/).slice(1)) {
      const table = block.slice(0, block.indexOf("'"));
      const cols = columnsOf(table);
      if (cols.size === 0) continue;
      for (const mm of block.matchAll(/const map = \{([\s\S]*?)\};/g)) {
        const targets = {};
        for (const cm of mm[1].matchAll(/([a-zA-Z_]+):\s*'([a-z_]+)'/g)) {
          if (!cols.has(cm[2])) problems.push(`${table}: ${cm[1]} → missing column ${cm[2]}`);
          (targets[cm[2]] = targets[cm[2]] || []).push(cm[1]);
        }
        // the loop that turns the map into SET clauses sits between the map and its UPDATE
        const after = block.slice(mm.index);
        const loop = after.slice(0, Math.max(after.indexOf('UPDATE '), 0) || 2000);
        const dedupes = /assigned\.has\(col\)/.test(loop);
        for (const [col, keys] of Object.entries(targets)) {
          if (keys.length > 1 && !dedupes) problems.push(`${table}: ${keys.join(', ')} all write ${col} without de-duplication`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  test('expenses and students have the columns their editors write', () => {
    assert.ok(columnsOf('expenses').has('updated_at'));
    for (const c of ['course', 'preferred_language', 'normalized_phone', 'updated_at']) assert.ok(columnsOf('students').has(c), c);
  });
});

describe('Student edit (api/write.js students.update)', () => {
  const writeHandler = require('../api/write');
  const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

  function studentDb(role = 'owner') {
    return fakeDb([
      ...baseAnswers(sessionRow({ role, plan: 'basic', seat_limit: 100 })),
      [/FROM students WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'STU-1', organization_id: 'ORG-1' }], rowCount: 1 }],
    ]);
  }

  test('the profile form (id under three names, course, language) becomes one valid UPDATE', async () => {
    const db = studentDb();
    const res = await call(writeHandler, db, {
      body: { table: 'students', action: 'update', id: 'STU-1', data: {
        name: 'Swapnil Chaudhari', phone: '9876543210', email: 'a@b.com', idProof: '123412341234', idProofNumber: '123412341234',
        aadhaar: '123412341234', idProofType: 'Aadhaar', course: 'UPSC', preferredLanguage: 'mr', address: 'Pune',
      } },
      headers: COOKIE,
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const upd = db.sqlMatching(/UPDATE students SET/)[0];
    const assignments = upd.sql.match(/([a-z_]+)=\$\d+/g).map(a => a.split('=')[0]);
    assert.equal(new Set(assignments).size, assignments.length, `a column is assigned twice: ${assignments}`);
    assert.ok(assignments.includes('id_proof') && assignments.includes('course') && assignments.includes('preferred_language'));
    assert.equal(upd.params[assignments.indexOf('course')], 'UPSC');
    assert.equal(upd.params[assignments.indexOf('preferred_language')], 'mr');
  });

  test('a masked ID (***1234, what staff see) never overwrites the stored number', async () => {
    const db = studentDb('manager');
    const res = await call(writeHandler, db, {
      body: { table: 'students', action: 'update', id: 'STU-1', data: { name: 'X', idProof: '***1234' } },
      headers: COOKIE,
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const upd = db.sqlMatching(/UPDATE students SET/)[0];
    assert.equal(/id_proof=/.test(upd.sql), false);
  });

  test('an empty name is refused', async () => {
    const res = await call(writeHandler, studentDb(), { body: { table: 'students', action: 'update', id: 'STU-1', data: { name: '   ' } }, headers: COOKIE });
    assert.equal(res.statusCode, 400);
  });
});

describe('Seat maintenance (api/write.js seats.set_status)', () => {
  const writeHandler = require('../api/write');
  const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');
  const seatDb = (occupied) => fakeDb([
    ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
    [/SELECT id, status, seat_number FROM seats WHERE id = \$1 AND organization_id = \$2 FOR UPDATE/, { rows: [{ id: 'ST-1', status: 'available', seat_number: '7' }], rowCount: 1 }],
    [/FROM seat_assignments WHERE seat_id = \$1/, { rows: occupied ? [{ 1: 1 }] : [], rowCount: occupied ? 1 : 0 }],
  ]);

  test('marking a free seat as maintenance is saved to the database', async () => {
    const db = seatDb(false);
    const res = await call(writeHandler, db, { body: { table: 'seats', action: 'set_status', id: 'ST-1', data: { status: 'maintenance' } }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const upd = db.sqlMatching(/UPDATE seats SET status = \$1/)[0];
    assert.deepEqual(upd.params, ['maintenance', 'ST-1', 'ORG-1']);
  });

  test('an occupied seat cannot be taken out of service or marked free', async () => {
    for (const status of ['maintenance', 'available', 'blocked']) {
      const db = seatDb(true);
      const res = await call(writeHandler, db, { body: { table: 'seats', action: 'set_status', id: 'ST-1', data: { status } }, headers: COOKIE });
      assert.equal(res.statusCode, 409, status);
      assert.equal(db.sqlMatching(/UPDATE seats SET status/).length, 0);
    }
  });

  test('unknown statuses are refused; staff cannot change seat status', async () => {
    const bad = await call(writeHandler, seatDb(false), { body: { table: 'seats', action: 'set_status', id: 'ST-1', data: { status: 'occupied' } }, headers: COOKIE });
    assert.equal(bad.statusCode, 400);
    const staffDb = fakeDb([...baseAnswers(sessionRow({ role: 'staff', plan: 'basic', seat_limit: 100 }))]);
    const staff = await call(writeHandler, staffDb, { body: { table: 'seats', action: 'set_status', id: 'ST-1', data: { status: 'maintenance' } }, headers: COOKIE });
    assert.equal(staff.statusCode, 403);
  });
});

describe('Expense edit (api/write.js expenses.update)', () => {
  const writeHandler = require('../api/write');
  const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

  test('an edit issues one UPDATE with only real expense columns', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
      [/SELECT \* FROM expenses WHERE id = \$1 AND organization_id = \$2 FOR UPDATE/, { rows: [{ id: 'EXP-1', organization_id: 'ORG-1', branch_id: 'BR-1' }], rowCount: 1 }],
      [/FROM branches WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'BR-1' }], rowCount: 1 }],
    ]);
    const res = await call(writeHandler, db, {
      body: { table: 'expenses', action: 'update', id: 'EXP-1', data: { title: 'Electricity bill', amount: 1500, date: '2026-10-05', paymentMode: 'upi', category: 'Utilities', vendor: 'MSEDCL', receiptRef: 'R1', branchId: 'BR-1' } },
      headers: COOKIE,
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const upd = db.sqlMatching(/UPDATE expenses SET/)[0];
    const cols = columnsOf('expenses');
    for (const a of upd.sql.match(/([a-z_]+)=/g).map(x => x.slice(0, -1))) assert.ok(cols.has(a), `expenses.${a} does not exist`);
  });
});
