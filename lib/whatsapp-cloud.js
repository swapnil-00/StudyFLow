// lib/whatsapp-cloud.js — Meta WhatsApp Cloud API sender (StudyFlow's own business number)
//
// Used only by the automatic-notification job (lib/reminders.js) and the owner's test
// message. Credentials are platform-level secrets: WHATSAPP_TOKEN (permanent system-user
// token) and WHATSAPP_PHONE_ID (the phone number id from Meta Business Manager).
// Libraries never configure Meta themselves; the message comes from the StudyFlow number
// and names the library in the text.
//
// Business-initiated messages must use pre-approved templates (Meta rule), so there is no
// free-text send here. Template names are configurable: see getConfig().
'use strict';

const DEFAULT_API_VERSION = 'v21.0';

class WhatsAppError extends Error {
  constructor(message, { code, subcode, status, raw, retryable = false } = {}) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.subcode = subcode;
    this.status = status;
    this.raw = raw;
    this.retryable = retryable;
  }
}

function getConfig(env = process.env) {
  return {
    token: env.WHATSAPP_TOKEN || '',
    phoneNumberId: env.WHATSAPP_PHONE_ID || '',
    apiVersion: env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION,
    language: env.WHATSAPP_TPL_LANG || 'en',
    templates: {
      payment_due: env.WHATSAPP_TPL_PAYMENT_DUE || 'sf_payment_due',
      payment_overdue: env.WHATSAPP_TPL_PAYMENT_OVERDUE || 'sf_payment_overdue',
      membership_expiring: env.WHATSAPP_TPL_MEMBERSHIP_EXPIRING || 'sf_membership_expiring',
    },
  };
}

function isConfigured(env = process.env) {
  const c = getConfig(env);
  return Boolean(c.token) && /^\d{5,}$/.test(c.phoneNumberId);
}

/** E.164 digits without '+'. Indian 10-digit numbers get the 91 prefix. */
function toWaNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Template parameters may not contain newlines/tabs or long runs of spaces (Meta rule). */
function sanitizeParam(value) {
  return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 1024) || '-';
}

/**
 * Send one approved template message.
 * @param {{ to: string, template: string, language?: string, bodyParams?: string[], headerDocument?: { link: string, filename?: string } }} msg
 */
async function sendTemplate(msg, { fetchImpl = fetch, env = process.env } = {}) {
  const c = getConfig(env);
  if (!isConfigured(env)) throw new WhatsAppError('WhatsApp is not configured on this server.', { code: 'NOT_CONFIGURED' });
  const to = toWaNumber(msg.to);
  if (!to) throw new WhatsAppError('Invalid phone number.', { code: 'INVALID_PHONE' });
  if (!msg.template) throw new WhatsAppError('Template name is required.', { code: 'TEMPLATE_REQUIRED' });

  const components = [];
  if (msg.headerDocument && msg.headerDocument.link) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: { link: msg.headerDocument.link, filename: msg.headerDocument.filename || 'document.pdf' } }],
    });
  }
  const bodyParams = Array.isArray(msg.bodyParams) ? msg.bodyParams : [];
  if (bodyParams.length > 0) {
    components.push({ type: 'body', parameters: bodyParams.map(v => ({ type: 'text', text: sanitizeParam(v) })) });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: { name: msg.template, language: { code: msg.language || c.language }, components },
  };

  const res = await fetchImpl(`https://graph.facebook.com/${c.apiVersion}/${encodeURIComponent(c.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    // 130429 = throughput limit, 131056 = pair rate limit: safe to retry on the next run.
    const retryable = res.status >= 500 || e.code === 130429 || e.code === 131056;
    throw new WhatsAppError(e.message || `Meta API error ${res.status}`, { code: e.code, subcode: e.error_subcode, status: res.status, raw: e, retryable });
  }
  return { ok: true, to, providerMessageId: json.messages?.[0]?.id || null, raw: json };
}

module.exports = { WhatsAppError, getConfig, isConfigured, toWaNumber, sanitizeParam, sendTemplate };
