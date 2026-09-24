// api/notify.js — Server-side WhatsApp notification dispatcher
// Supports Meta WhatsApp Cloud API (Graph API) with custom tenant credentials or server env variables
const { cors } = require('./db');
const { getAuthSession } = require('./auth-util');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const {
    to,
    templateName,
    language = 'en',
    variables = {},
    document = null,
    customText = null,
    text = null,
    phoneNumberId: overridePhoneId,
    token: overrideToken
  } = req.body || {};

  // Priority: 1. Body override / tenant settings, 2. Process environment variables
  const token = overrideToken || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = overridePhoneId || process.env.WHATSAPP_PHONE_ID;

  // Clean and format recipient phone number (E.164 without plus)
  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) {
    cleanTo = '91' + cleanTo; // Default to India prefix if 10 digits
  }

  // If no live WhatsApp Cloud API credentials are provided, return mock success with helpful guide
  if (!token || !phoneNumberId) {
    const mockId = `mock_wa_${Date.now()}`;
    return res.status(200).json({
      ok: true,
      provider: 'mock',
      providerMessageId: mockId,
      status: 'SENT',
      note: 'Processed via Mock Sandbox. To deliver real WhatsApp messages, enter WhatsApp Phone ID & Token in Settings or set WHATSAPP_TOKEN & WHATSAPP_PHONE_ID in Vercel.'
    });
  }

  if (!cleanTo) {
    return res.status(400).json({ ok: false, error: 'Recipient phone number is required' });
  }

  let payload;

  const msgText = customText || text;
  if (msgText && !templateName) {
    // Direct WhatsApp Text Message
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { body: msgText }
    };
  } else {
    // Official Approved WhatsApp Template
    const parameters = Object.entries(variables).map(([key, value]) => ({
      type: 'text',
      text: String(value)
    }));

    const components = [{ type: 'body', parameters }];

    if (document && document.url) {
      components.unshift({
        type: 'header',
        parameters: [{
          type: 'document',
          document: {
            link: document.url,
            filename: document.filename || 'Invoice.pdf'
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

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await metaRes.json();
    if (!metaRes.ok) {
      console.error('Meta WhatsApp API error:', data);
      return res.status(metaRes.status).json({
        ok: false,
        error: data.error?.message || 'Meta WhatsApp API delivery failed',
        details: data
      });
    }

    const providerMessageId = data.messages?.[0]?.id || `meta_${Date.now()}`;
    return res.status(200).json({
      ok: true,
      provider: 'meta',
      providerMessageId,
      status: 'SENT'
    });
  } catch (err) {
    console.error('WhatsApp dispatch exception:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

