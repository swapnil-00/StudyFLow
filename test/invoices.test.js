// test/invoices.test.js — Verifiable documents: codes (lib/invoices.js), issuance (api/write.js), public check (api/verify.js)
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
process.env.APP_URL = 'https://studyflow.example';

const invoices = require('../lib/invoices');
const writeHandler = require('../api/write');
const verifyHandler = require('../api/verify');
const { fakeDb, call, sessionRow, baseAnswers, COOKIE } = require('./helpers/fake-db');

const baseDoc = () => ({
  organizationId: 'ORG-1', documentType: 'invoice', documentNumber: 'INV-2026-000012', studentId: 'STU-1', studentName: 'Priya Patel',
  seatNumber: 'A2', planName: 'Monthly', startDate: '2026-10-05', endDate: '2026-11-04', finalAmount: 500, paidAmount: 500, status: 'PAID',
  issuedAt: '2026-10-05T04:00:00.000Z',
});

describe('Verification codes', () => {
  test('are deterministic, formatted XXXX-XXXX-XXXX, and change with any covered field', () => {
    const a = invoices.verificationCode(baseDoc());
    assert.equal(a, invoices.verificationCode(baseDoc()));
    assert.match(a, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    for (const change of [{ finalAmount: 5000 }, { endDate: '2026-12-04' }, { studentName: 'Someone Else' }, { seatNumber: 'B9' }, { status: 'PENDING' }, { organizationId: 'ORG-2' }, { issuedAt: '2026-10-06T04:00:00.000Z' }]) {
      assert.notEqual(invoices.verificationCode({ ...baseDoc(), ...change }), a, JSON.stringify(change));
    }
  });

  test('cosmetic fields do not affect the code; whitespace/case in covered text does not either', () => {
    const a = invoices.verificationCode(baseDoc());
    assert.equal(invoices.verificationCode({ ...baseDoc(), branchAddress: 'different', paymentRef: 'x' }), a);
    assert.equal(invoices.verificationCode({ ...baseDoc(), studentName: '  priya   PATEL ' }), a);
  });

  test('normalizeCode accepts what people type or scan', () => {
    const a = invoices.verificationCode(baseDoc());
    assert.equal(invoices.normalizeCode(a.toLowerCase()), a);
    assert.equal(invoices.normalizeCode(a.replace(/-/g, ' ')), a);
    assert.equal(invoices.normalizeCode('too-short'), null);
    assert.equal(invoices.normalizeCode('0O1I'.repeat(3)), '0011-0011-0011', 'O→0 and I→1');
  });

  test('a different signing key gives a different code', () => {
    const a = invoices.verificationCode(baseDoc(), { JWT_SECRET: 'x'.repeat(64) });
    const b = invoices.verificationCode(baseDoc(), { JWT_SECRET: 'y'.repeat(64) });
    assert.notEqual(a, b);
  });
});

describe('Issuing a document (api/write.js documents.save)', () => {
  test('the server assigns a sequential number, issue time and verification code; the client number is ignored', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
      [/FROM students WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'STU-1' }], rowCount: 1 }],
      [/FROM memberships WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'MEM-1' }], rowCount: 1 }],
      [/INSERT INTO document_sequences/, { rows: [{ current_number: 12 }], rowCount: 1 }],
    ]);
    const clientDoc = { ...baseDoc(), id: 'DOC-CLIENT', documentNumber: 'INV-2026-99999', membershipId: 'MEM-1', verificationCode: 'FAKE' };
    const res = await call(writeHandler, db, { body: { table: 'documents', action: 'save', data: clientDoc }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.documentNumber, `INV-${new Date().getFullYear()}-000012`);
    assert.match(res.body.verificationCode, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    assert.match(res.body.verifyUrl, /^https:\/\/studyflow\.example\/#\/verify\?n=INV-\d{4}-000012&c=/);
    assert.ok(res.body.issuedAt);
    const ins = db.sqlMatching(/INSERT INTO documents/)[0];
    const stored = JSON.parse(ins.params[7]);
    assert.equal(ins.params[3], res.body.documentNumber);
    assert.equal(ins.params[8], res.body.verificationCode);
    assert.equal(stored.verificationCode, res.body.verificationCode);
    assert.equal(stored.documentNumber, res.body.documentNumber);
    // the stored record re-signs to the same code (what api/verify recomputes)
    assert.equal(invoices.verificationCode({ ...stored, organizationId: 'ORG-1' }), res.body.verificationCode);
    assert.equal(ins.params[7].includes('%PDF'), false, 'no PDF is stored');
  });

  test('a receipt keeps the payment\'s own REC- number when that payment belongs to the library', async () => {
    const db = fakeDb([
      ...baseAnswers(sessionRow({ plan: 'basic', seat_limit: 100 })),
      [/FROM students WHERE id = \$1 AND organization_id = \$2/, { rows: [{ id: 'STU-1' }], rowCount: 1 }],
      [/FROM payments WHERE receipt_number = \$1 AND organization_id = \$2/, { rows: [{ 1: 1 }], rowCount: 1 }],
    ]);
    const res = await call(writeHandler, db, { body: { table: 'documents', action: 'save', data: { ...baseDoc(), documentType: 'receipt', documentNumber: 'REC-2026-000007', amount: 500 } }, headers: COOKIE });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.documentNumber, 'REC-2026-000007');
    assert.equal(db.sqlMatching(/INSERT INTO document_sequences/).length, 0);
  });
});

describe('Public verification (api/verify.js)', () => {
  function storedRow(over = {}) {
    const data = { ...baseDoc(), branchName: 'Sharma Library', studentPhone: '9876543210', ...over };
    delete data.organizationId;
    const code = invoices.verificationCode({ ...data, organizationId: 'ORG-1' });
    return {
      id: 'DOC-1', organization_id: 'ORG-1', document_type: 'invoice', document_number: data.documentNumber,
      document_data: { ...data, verificationCode: code }, verification_code: code, issued_at: data.issuedAt, org_name: 'Sharma Study Library',
    };
  }
  const RATE = [/INSERT INTO rate_limits/, { rows: [{ hits: 1, reset_at: new Date(Date.now() + 60000) }], rowCount: 1 }];

  test('a matching number + code returns the record with the student phone masked', async () => {
    const row = storedRow();
    const db = fakeDb([RATE, [/FROM documents d/, { rows: [row], rowCount: 1 }]]);
    const res = await call(verifyHandler, db, { method: 'GET', url: '/api/verify', query: { n: row.document_number, c: row.verification_code.toLowerCase() } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.valid, true);
    assert.equal(res.body.document.documentNumber, 'INV-2026-000012');
    assert.equal(res.body.document.finalAmount, 500);
    assert.equal(res.body.document.student.phoneMasked, '••••••3210');
    assert.equal(res.body.document.library.name, 'Sharma Library');
    assert.equal(res.body.document.startDate, '2026-10-05');
  });

  test('a wrong code is simply "not valid"', async () => {
    const row = storedRow();
    const db = fakeDb([RATE, [/FROM documents d/, { rows: [row], rowCount: 1 }]]);
    const res = await call(verifyHandler, db, { method: 'GET', url: '/api/verify', query: { n: row.document_number, c: 'ZZZZ-ZZZZ-ZZZZ' } });
    assert.equal(res.body.valid, false);
    assert.equal(res.body.document, undefined);
  });

  test('a record whose stored amount was altered after issue fails recomputation', async () => {
    const row = storedRow();
    row.document_data.finalAmount = 50; // tampered in the database, code left as issued
    const db = fakeDb([RATE, [/FROM documents d/, { rows: [row], rowCount: 1 }]]);
    const res = await call(verifyHandler, db, { method: 'GET', url: '/api/verify', query: { n: row.document_number, c: row.verification_code } });
    assert.equal(res.body.valid, false);
  });

  test('malformed input never hits the database; rate limiting fails closed', async () => {
    const db = fakeDb([RATE]);
    const res = await call(verifyHandler, db, { method: 'GET', url: '/api/verify', query: { n: "' OR 1=1", c: 'x' } });
    assert.equal(res.body.valid, false);
    assert.equal(db.sqlMatching(/FROM documents/).length, 0);
    const limited = fakeDb([[/INSERT INTO rate_limits/, { rows: [{ hits: 999, reset_at: new Date(Date.now() + 60000) }], rowCount: 1 }]]);
    const r2 = await call(verifyHandler, limited, { method: 'GET', url: '/api/verify', query: { n: 'INV-2026-000012', c: 'AAAA-AAAA-AAAA' } });
    assert.equal(r2.statusCode, 429);
  });
});
