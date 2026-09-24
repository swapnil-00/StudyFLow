// StudyFlow — WhatsApp Provider Abstraction Layer
// Supports Mock (Development), Meta WhatsApp Cloud API, and Twilio

class BaseWhatsAppProvider {
  constructor(name) {
    this.name = name;
  }

  async sendTemplateMessage(params) {
    throw new Error('sendTemplateMessage must be implemented by provider');
  }

  async sendTextMessage(params) {
    throw new Error('sendTextMessage must be implemented by provider');
  }

  async sendDocument(params) {
    throw new Error('sendDocument must be implemented by provider');
  }

  async getMessageStatus(providerMessageId) {
    throw new Error('getMessageStatus must be implemented by provider');
  }
}

// ─── 1. Mock WhatsApp Provider (Development & Testing) ────────────────────────
class MockWhatsAppProvider extends BaseWhatsAppProvider {
  constructor() {
    super('MockWhatsAppProvider');
    this.simulatedFailureRate = 0; // 0 to 1
    this._logs = []; // In-memory log store (replaces localStorage)
  }

  setSimulatedFailureRate(rate) {
    this.simulatedFailureRate = Math.max(0, Math.min(1, rate));
  }

  async sendTemplateMessage({ to, templateName, language = 'en', variables = {}, document = null }) {
    const providerMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Simulate slight network delay
    await new Promise(r => setTimeout(r, 180));

    if (this.simulatedFailureRate > 0 && Math.random() < this.simulatedFailureRate) {
      return {
        success: false,
        providerMessageId,
        status: 'FAILED',
        error: 'Simulated WhatsApp delivery failure (Mock Provider)',
        timestamp: new Date().toISOString()
      };
    }

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      templateName,
      language,
      variables,
      document,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: new Date(Date.now() + 500).toISOString(),
      readAt: null
    };

    // Store in mock delivery logs for debugging
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async sendTextMessage({ to, text }) {
    const providerMessageId = `mock_wa_text_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await new Promise(r => setTimeout(r, 150));

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    };
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async sendDocument({ to, documentUrl, filename, caption = '' }) {
    const providerMessageId = `mock_wa_doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await new Promise(r => setTimeout(r, 220));

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      documentUrl,
      filename,
      caption,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async getMessageStatus(providerMessageId) {
    const logs = this._getMockLogs();
    const entry = logs.find(l => l.providerMessageId === providerMessageId);
    if (!entry) return { status: 'UNKNOWN' };
    return { status: entry.status, deliveredAt: entry.deliveredAt, readAt: entry.readAt };
  }

  _saveMockLog(entry) {
    this._logs.unshift(entry);
    if (this._logs.length > 200) this._logs.pop();
  }

  _getMockLogs() {
    return this._logs;
  }
}

// ─── 2. Meta WhatsApp Cloud API Provider ─────────────────────────────────────
class MetaWhatsAppProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super('MetaWhatsAppProvider');
    this.apiUrl = config.apiUrl || 'https://graph.facebook.com/v19.0';
    this.phoneNumberId = config.phoneNumberId || '';
    this.accessToken = config.accessToken || '';
    this.businessAccountId = config.businessAccountId || '';
  }

  async sendTemplateMessage({ to, templateName, language = 'en', variables = {}, document = null }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, templateName, language, variables, document })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.error || 'WhatsApp delivery failed',
          status: 'FAILED',
          details: data
        };
      }

      return {
        success: true,
        providerMessageId: data.providerMessageId || `meta_${Date.now()}`,
        status: data.status || 'SENT',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: 'FAILED'
      };
    }
  }
        data
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        status: 'FAILED'
      };
    }
  }

  async sendTextMessage({ to, text }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, customText: text })
      });
      const data = await response.json();
      return {
        success: response.ok && data.ok,
        providerMessageId: data.providerMessageId,
        status: data.status || 'SENT',
        error: data.error
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }

  async sendDocument({ to, documentUrl, filename, caption = '' }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          document: { url: documentUrl, filename: filename || 'Invoice.pdf', caption }
        })
      });
      const data = await response.json();
      return {
        success: response.ok && data.ok,
        providerMessageId: data.providerMessageId,
        status: data.status || 'SENT',
        error: data.error
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }
}

// ─── 3. Twilio WhatsApp Provider ─────────────────────────────────────────────
class TwilioWhatsAppProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super('TwilioWhatsAppProvider');
    this.accountSid = config.accountSid || '';
    this.authToken = config.authToken || '';
    this.fromNumber = config.fromNumber || ''; // e.g. whatsapp:+14155238886
  }

  async sendTemplateMessage({ to, variables = {}, document = null }) {
    // Basic text/media dispatch for Twilio sandbox/messaging
    const bodyText = Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join('\n');
    return this.sendTextMessage({ to, text: bodyText, mediaUrl: document?.url });
  }

  async sendTextMessage({ to, text, mediaUrl = null }) {
    if (!this.accountSid || !this.authToken) {
      return { success: false, error: 'Twilio credentials missing', status: 'FAILED' };
    }

    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const params = new URLSearchParams();
    params.append('From', this.fromNumber);
    params.append('To', formattedTo);
    params.append('Body', text);
    if (mediaUrl) params.append('MediaUrl', mediaUrl);

    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await response.json();
      return {
        success: response.ok,
        providerMessageId: data.sid,
        status: response.ok ? 'SENT' : 'FAILED',
        error: data.message
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }
}

// ─── 4. Provider Factory & Global Registry ────────────────────────────────────
const providers = {
  mock: new MockWhatsAppProvider(),
  meta: null,
  twilio: null
};

function getWhatsAppProvider(customConfig = null) {
  let providerType = 'mock';
  try {
    if (typeof store !== 'undefined' && store.getSettings) {
      const settings = store.getSettings();
      providerType = settings.whatsappProvider || 'mock';
    }
  } catch (e) {}

  if (providerType === 'meta') {
    if (!providers.meta || customConfig) {
      providers.meta = new MetaWhatsAppProvider(customConfig || {});
    }
    return providers.meta;
  }

  if (providerType === 'twilio') {
    if (!providers.twilio || customConfig) {
      providers.twilio = new TwilioWhatsAppProvider(customConfig || {});
    }
    return providers.twilio;
  }

  return providers.mock;
}

if (typeof window !== 'undefined') {
  window.MockWhatsAppProvider = MockWhatsAppProvider;
  window.MetaWhatsAppProvider = MetaWhatsAppProvider;
  window.TwilioWhatsAppProvider = TwilioWhatsAppProvider;
  window.getWhatsAppProvider = getWhatsAppProvider;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MockWhatsAppProvider,
    MetaWhatsAppProvider,
    TwilioWhatsAppProvider,
    getWhatsAppProvider
  };
}
