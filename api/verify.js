// api/verify.js — Public invoice / receipt verification (no login)
//
// GET /api/verify?n=INV-2026-000012&c=XXXX-XXXX-XXXX
// Finds the library's original record by document number + verification code and returns a
// limited view of it. The code is recomputed from the stored fields, so a record edited in
// the database fails too. Unknown or mismatched → { valid: false } with no further detail.
'use strict';
const { query } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { checkRateLimit } = require('../lib/ratelimit');
const invoices = require('../lib/invoices');

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'ip';
  await checkRateLimit(query, `verify:ip:${ip}`, 60, 600, { failClosed: true });

  const src = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  const number = String(src.n || src.number || '').trim().toUpperCase().slice(0, 40);
  const code = invoices.normalizeCode(src.c || src.code);
  if (!/^[A-Z]{2,4}-\d{4}-\d{3,8}$/.test(number) || !code) {
    return res.json({ ok: true, valid: false });
  }

  const found = await query(
    `SELECT d.id, d.organization_id, d.document_type, d.document_number, d.document_data, d.verification_code, d.issued_at,
            o.name AS org_name
     FROM documents d
     JOIN organizations o ON o.id = d.organization_id
     WHERE d.document_number = $1 AND d.verification_code IS NOT NULL
     LIMIT 20`,
    [number]
  );
  const row = found.rows.find(r => invoices.codesMatch(r.verification_code, code));
  if (!row) return res.json({ ok: true, valid: false });

  // Recompute from what is stored: a changed amount or date in the database would show here.
  const recomputed = invoices.verificationCode({
    ...(row.document_data || {}),
    organizationId: row.organization_id,
    documentType: row.document_type,
    documentNumber: row.document_number,
  });
  if (!invoices.codesMatch(recomputed, row.verification_code)) {
    console.error(`[${req.correlationId}] document ${row.document_number} failed recomputation`);
    return res.json({ ok: true, valid: false });
  }

  return res.json({ ok: true, valid: true, document: invoices.publicView(row) });
}, { methods: ['GET', 'POST'], auth: false, rejectOrgId: false });
