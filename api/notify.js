// api/notify.js — Server-side WhatsApp notification dispatcher
// SEC-005 FIX: Authentication required. Accept studentId, resolve phone server-side.
// SEC-006 FIX: No client-supplied phoneNumberId/token. Validate phoneNumberId format.
// SEC-029 FIX: Return 503 when no credentials configured (not mock "SENT").
'use strict';
const { query } = require('../lib/db');
const { checkRateLimit } = require('../lib/ratelimit');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');

module.exports = withHandler(async function handler(req, res) {
  const session = req.session;
  const orgId = session.orgId;

  const {
    studentId,
    templateName,
    language = 'en',
    variables = {},
    document: docAttachment = null,
    customText = null,
    text = null,
  } = req.body || {};

  // ── SEC-005: Rate limiting per organization (max 60 notifications per hour) ──
  await checkRateLimit(query, `notify:${orgId}`, 60, 3600);

  // ── Credentials: server-side only (SEC-005/006/022) ────────────
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  // SEC-029: Return 503 instead of mock success when not configured
  if (!token || !phoneNumberId) {
    return res.status(503).json({
      ok: false,
      error: 'WhatsApp is not configured. Contact support to set up messaging.',
      code: 'NOT_CONFIGURED'
    });
  }

  // SEC-006: Validate phoneNumberId is purely numeric
  if (!/^\d+$/.test(phoneNumberId)) {
    console.error(`[${req.correlationId}] Invalid WHATSAPP_PHONE_ID format in env`);
    return res.status(500).json({ ok: false, error: 'Internal configuration error' });
  }

  // ── Resolve recipient from student record (SEC-005) ────────────
  if (!studentId) {
    throw new HttpError(400, 'MISSING_RECIPIENT', 'studentId is required for notifications.');
  }

  // Resolve phone number server-side within the caller's tenant
  const studentRes = await query(
    'SELECT phone, whatsapp_opt_in, communication_preferences FROM students WHERE id = $1 AND organization_id = $2',
    [studentId, orgId]
  );
  if (studentRes.rows.length === 0) {
    throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student not found in your organization');
  }
  const student = studentRes.rows[0];

  // Enforce opt-in (SEC-005)
  if (student.whatsapp_opt_in === false) {
    throw new HttpError(403, 'OPT_OUT', 'Student has opted out of WhatsApp notifications');
  }

  let cleanTo = String(student.phone || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) {
    cleanTo = '91' + cleanTo;
  }

  if (!cleanTo || cleanTo.length < 10) {
    throw new HttpError(400, 'INVALID_PHONE', 'Student does not have a valid phone number on file');
  }

  // ── Build WhatsApp payload ─────────────────────────────────────
  let payload;
  const msgText = customText || text;

  if (msgText && !templateName) {
    // Direct text message
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { body: msgText }
    };
  } else {
    // Template message
    const parameters = Object.entries(variables).map(([key, value]) => ({
      type: 'text',
      text: String(value)
    }));

    const components = [{ type: 'body', parameters }];

    if (docAttachment && docAttachment.url) {
      components.unshift({
        type: 'header',
        parameters: [{
          type: 'document',
          document: {
            link: docAttachment.url,
            filename: docAttachment.filename || 'Invoice.pdf'
          }
        }]
      });
    }

    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName || 'seat_assignment_confirmation',
        language: { code: language },
        components
      }
    };
  }

  // ── Send via Meta Graph API ────────────────────────────────────
  // SEC-006: phoneNumberId is validated as numeric and URL-encoded
  const metaUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`;

  const metaRes = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseData = await metaRes.json();
  if (!metaRes.ok) {
    // SEC-006/021: Never return upstream error details to client
    console.error(`[${req.correlationId}] Meta WhatsApp API error:`, responseData);
    return res.status(502).json({
      ok: false,
      error: 'Message delivery failed. Please try again later.',
      code: 'DELIVERY_FAILED'
    });
  }

  const providerMessageId = responseData.messages?.[0]?.id || `meta_${Date.now()}`;

  // Write communication log server-side (SEC-023)
  try {
    const crypto = require('crypto');
    const logId = `CL-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
    const idempotencyKey = `${orgId}-${studentId || cleanTo}-${Date.now()}`;

    await query(
      `INSERT INTO communication_logs (id, organization_id, student_id, event_type, phone_number, template_name, language, body_text, status, provider, provider_message_id, idempotency_key, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [logId, orgId, studentId || null, templateName ? 'template' : 'text', cleanTo,
       templateName || null, language, msgText || templateName || '', 'sent', 'meta',
       providerMessageId, idempotencyKey]
    ).catch(err => {
      // Don't fail the request if logging fails (idempotency_key column might not exist yet)
      console.error(`[${req.correlationId}] Failed to log communication:`, err.message);
    });
  } catch (logErr) {
    console.error(`[${req.correlationId}] Communication log error:`, logErr.message);
  }

  return res.status(200).json({
    ok: true,
    provider: 'meta',
    providerMessageId,
    status: 'SENT'
  });
}, { methods: ['POST'], auth: true });
