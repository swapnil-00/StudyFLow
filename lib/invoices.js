// lib/invoices.js — Tamper-evident invoices and receipts
//
// StudyFlow never stores a PDF. A document is a ~1 KB JSON record in `documents` plus a
// VERIFICATION CODE: an HMAC over the fields that matter (library, number, student, seat,
// dates, amounts, status, issue time) with a server-only key. The code is printed on the
// document and encoded in its QR; anyone can open the verify page and see the library's
// original record. Editing the PDF changes nothing on the server, so a forged bill fails
// verification. The PDF itself is regenerated on demand from the record.
'use strict';
const crypto = require('crypto');

// Crockford base32: no I, L, O, U, so codes survive handwriting and phone screens.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_CHARS = 12; // 60 bits

const SEQUENCE_PREFIX = Object.freeze({ invoice: 'INV', receipt: 'RCT' });

function signingKey(env = process.env) {
  const base = env.INVOICE_SIGNING_KEY || env.JWT_SECRET;
  if (!base) throw new Error('INVOICE_SIGNING_KEY or JWT_SECRET is required to sign documents');
  return crypto.createHmac('sha256', base).update('studyflow-document-signing-v1').digest();
}

const norm = (v) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
const dateOnly = (v) => (v ? String(v).split('T')[0] : '');
const money = (v) => (Number(v) || 0).toFixed(2);

/** The fields a verification covers, in a fixed order. Anything else on the document is cosmetic. */
function canonicalFields(doc) {
  const d = doc || {};
  const total = d.finalAmount != null ? d.finalAmount : d.amount;
  const paid = d.paidAmount != null ? d.paidAmount : d.amount;
  return {
    org: norm(d.organizationId),
    type: norm(d.documentType).toLowerCase(),
    number: norm(d.documentNumber).toUpperCase(),
    student: norm(d.studentId),
    name: norm(d.studentName).toLowerCase(),
    seat: norm(d.seatNumber),
    plan: norm(d.planName),
    start: dateOnly(d.startDate),
    end: dateOnly(d.endDate),
    total: money(total),
    paid: money(paid),
    status: norm(d.status).toUpperCase(),
    issued: norm(d.issuedAt),
  };
}

function canonicalString(doc) {
  return Object.entries(canonicalFields(doc)).map(([k, v]) => `${k}=${v}`).join('|');
}

function toBase32(buf, chars) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= chars) break;
  }
  return out;
}

function formatCode(raw) {
  return String(raw).replace(/(.{4})(?=.)/g, '$1-');
}

/** HMAC of the canonical fields → XXXX-XXXX-XXXX */
function verificationCode(doc, env = process.env) {
  const mac = crypto.createHmac('sha256', signingKey(env)).update(canonicalString(doc)).digest();
  return formatCode(toBase32(mac, CODE_CHARS));
}

/** Accepts what a person typed or scanned; returns the canonical XXXX-XXXX-XXXX or null. */
function normalizeCode(input) {
  const cleaned = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  if (cleaned.length !== CODE_CHARS) return null;
  for (const ch of cleaned) if (!ALPHABET.includes(ch)) return null;
  return formatCode(cleaned);
}

function codesMatch(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verifyUrl(origin, documentNumber, code) {
  return `${String(origin).replace(/\/+$/, '')}/#/verify?n=${encodeURIComponent(documentNumber)}&c=${encodeURIComponent(code)}`;
}

/** Next sequential number for a library and kind: INV-2026-000012. Call inside a transaction. */
async function nextDocumentNumber(exec, orgId, kind, now = new Date()) {
  const prefix = SEQUENCE_PREFIX[kind] || 'DOC';
  const res = await exec(
    `INSERT INTO document_sequences (organization_id, kind, current_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (organization_id, kind)
     DO UPDATE SET current_number = document_sequences.current_number + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING current_number`,
    [orgId, kind]
  );
  const n = res.rows[0].current_number;
  return `${prefix}-${now.getFullYear()}-${String(n).padStart(6, '0')}`;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '';
  return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/** What the public verify page may see: enough to check the bill, no contact details of the student. */
function publicView(row) {
  const d = row.document_data || {};
  const total = d.finalAmount != null ? Number(d.finalAmount) : Number(d.amount || 0);
  const paid = d.paidAmount != null ? Number(d.paidAmount) : Number(d.amount || 0);
  return {
    documentType: row.document_type,
    documentNumber: row.document_number,
    issuedAt: d.issuedAt || row.issued_at || null,
    date: d.date || null,
    verificationCode: row.verification_code,
    library: {
      name: d.branchName || row.org_name || '',
      organization: row.org_name || '',
      address: d.branchAddress || '',
      phone: d.branchPhone || '',
    },
    student: { name: d.studentName || '', phoneMasked: maskPhone(d.studentPhone), id: d.studentId || '' },
    planName: d.planName || '',
    seatNumber: d.seatNumber || '',
    roomName: d.roomName || '',
    startDate: dateOnly(d.startDate),
    endDate: dateOnly(d.endDate),
    baseAmount: d.baseAmount != null ? Number(d.baseAmount) : total,
    discount: Number(d.discount || 0),
    finalAmount: total,
    paidAmount: paid,
    pendingAmount: Math.max(0, total - paid),
    status: d.status || '',
    paymentMethod: d.paymentMethod || '',
    paymentRef: d.paymentRef || '',
    paymentDate: d.paymentDate || d.date || null,
    currency: d.currency || 'INR',
  };
}

module.exports = {
  SEQUENCE_PREFIX,
  canonicalFields,
  canonicalString,
  verificationCode,
  normalizeCode,
  codesMatch,
  verifyUrl,
  nextDocumentNumber,
  publicView,
};
