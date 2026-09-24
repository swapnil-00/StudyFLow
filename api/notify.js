// api/notify.js — Server-side WhatsApp notification dispatcher
// Ensures WhatsApp Business API credentials stay strictly on the server
const { cors, query } = require('./db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const { to, templateName, language = 'en', variables = {}, document = null, messageId = null } = req.body || {};

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  // If no server-side credentials are configured, return mock delivery response
  if (!token || !phoneNumberId) {
    const mockId = `mock_server_wa_${Date.now()}`;
    return res.status(200).json({
      ok: true,
      provider: 'mock',
      providerMessageId: mockId,
      status: 'SENT',
      note: 'Processed via Mock Provider. Set WHATSAPP_TOKEN & WHATSAPP_PHONE_ID in Vercel to enable live delivery.'
    });
  }

  // Format body parameters for Meta WhatsApp Cloud API
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
          filename: document.filename || 'Document.pdf'
        }
      }]
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to).replace(/[^0-9]/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components
    }
  };

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
