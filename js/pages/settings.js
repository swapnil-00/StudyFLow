// Settings Page
export function renderSettings(container) {
  const settings = store.getSettings();
  const branches = store.getBranches();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Organization, appearance, and configuration</p>
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);align-items:start;">
      <!-- Organization -->
      <div class="card">
        <div class="card-header"><div class="card-title">Organization</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="input" id="set-org-name" value="${settings.orgName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="input" id="set-address" value="${settings.address || ''}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="input" id="set-phone" value="${settings.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="input" id="set-email" value="${settings.email || ''}">
            </div>
          </div>
          <button class="btn btn-primary w-full" onclick="saveOrgSettings()">Save Changes</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <!-- Appearance -->
        <div class="card">
          <div class="card-header"><div class="card-title">Appearance</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div style="display:flex;gap:var(--space-2);">
                <button class="btn ${document.documentElement.dataset.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Light</button>
                <button class="btn ${document.documentElement.dataset.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Dark</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Branches -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Branches</div>
          </div>
          <div class="card-body">
            ${branches.map(b => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-secondary);">
                <div>
                  <div style="font-weight:var(--fw-medium);">${b.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${b.city} · ${b.phone}</div>
                </div>
                <span class="badge badge-success"><span class="badge-dot"></span>${b.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- WhatsApp & Invoice Automation Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication & Invoicing</div>
              <div class="card-subtitle">Provider API credentials and automated message dispatches</div>
            </div>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label class="form-label">Active WhatsApp Provider</label>
              <select class="select" id="set-wa-provider">
                <option value="mock" selected>Mock / Sandbox Simulator (No external API needed)</option>
                <option value="meta">Meta WhatsApp Cloud API (Graph API)</option>
                <option value="twilio">Twilio Programmable Messaging</option>
              </select>
              <div class="form-hint">Mock mode simulates delivery ticks and logs messages in Communication Center.</div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">WhatsApp Business Phone ID</label>
                <input type="text" class="input" id="set-wa-phone-id" placeholder="e.g. 109384729384729" value="${settings.waPhoneId || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Account ID / Namespace</label>
                <input type="text" class="input" id="set-wa-acc-id" placeholder="e.g. studyflow_notifications" value="${settings.waAccId || ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Permanent Access Token</label>
              <input type="password" class="input" id="set-wa-token" placeholder="Bearer EAAG..." value="${settings.waToken || ''}">
            </div>

            <!-- Automation Rules -->
            <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:var(--space-3);">
              <div style="font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--color-text-secondary);text-transform:uppercase;">Automated Event Dispatches</div>
              
              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-seat-assign" checked style="accent-color:var(--sf-indigo-600);">
                <span>Seat Allocation: Auto-issue Invoice and send WhatsApp confirmation</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-payment-receipt" checked style="accent-color:var(--sf-indigo-600);">
                <span>Payment Recorded: Auto-issue Receipt and dispatch WhatsApp</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-expiry-reminder" checked style="accent-color:var(--sf-indigo-600);">
                <span>Expiry Notice: Send 3-day and 1-day automated reminders</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-due-reminder" checked style="accent-color:var(--sf-indigo-600);">
                <span>Fee Due Alerts: Send automated overdue notices</span>
              </label>
            </div>

            <button class="btn btn-secondary w-full" onclick="saveWhatsAppSettings()">Save WhatsApp Configuration</button>

            <!-- Test Simulator -->
            <div style="margin-top:var(--space-2);padding-top:var(--space-4);border-top:1px solid var(--color-border-secondary);">
              <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-2);">🧪 Test WhatsApp Sandbox</div>
              <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);">
                <input type="tel" class="input flex-1" id="test-wa-phone" placeholder="+919876543210" value="+919876543210">
                <select class="select" id="test-wa-template" style="width:160px;">
                  <option value="seat_assigned">Seat Assignment</option>
                  <option value="payment_receipt">Payment Receipt</option>
                  <option value="expiry_reminder">Expiry Reminder</option>
                  <option value="fee_reminder">Fee Due Alert</option>
                </select>
                <button class="btn btn-primary" onclick="sendTestWhatsApp()">Test Send</button>
              </div>
              <div id="test-wa-result" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-xs);font-family:var(--font-mono);"></div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border-color:var(--sf-error-200);">
          <div class="card-header"><div class="card-title" style="color:var(--sf-error-600);">Danger Zone</div></div>
          <div class="card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);">Reset Demo Data</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Clear all data and reload fresh demo</div>
              </div>
              <button class="btn btn-danger" onclick="app.resetApp()">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.saveOrgSettings = async function() {
    await store.updateSettings({
      orgName: document.getElementById('set-org-name')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
    });
    toast.show('Organization settings saved!', 'success');
  };

  window.saveWhatsAppSettings = async function() {
    await store.updateSettings({
      waProvider: document.getElementById('set-wa-provider')?.value,
      waPhoneId: document.getElementById('set-wa-phone-id')?.value?.trim(),
      waAccId: document.getElementById('set-wa-acc-id')?.value?.trim(),
      waToken: document.getElementById('set-wa-token')?.value?.trim()
    });
    toast.show('WhatsApp configuration saved!', 'success');
  };

  window.sendTestWhatsApp = function() {
    const phone = document.getElementById('test-wa-phone')?.value?.trim();
    const template = document.getElementById('test-wa-template')?.value;
    const resBox = document.getElementById('test-wa-result');

    if (!phone) { toast.show('Please enter a phone number', 'error'); return; }

    const provider = window.getWhatsAppProvider ? window.getWhatsAppProvider() : null;
    if (!provider) { toast.show('WhatsApp provider not loaded', 'error'); return; }

    resBox.style.display = 'block';
    resBox.innerHTML = '<span style="color:var(--sf-indigo-600);">Dispatching test message via ' + provider.name + '...</span>';

    const testContent = `[StudyFlow Test] Hello! This is a test simulation of the "${template}" WhatsApp template dispatch to ${phone}. Everything is functioning normally!`;

    provider.sendTextMessage(phone, testContent).then(result => {
      resBox.innerHTML = `
        <div style="color:var(--sf-success-600);font-weight:bold;margin-bottom:4px;">✓ DISPATCH SUCCESSFUL</div>
        <div>Provider: <strong>${provider.name}</strong></div>
        <div>Message ID: <code>${result.messageId}</code></div>
        <div>Timestamp: ${result.timestamp}</div>
        <div style="margin-top:6px;color:var(--color-text-secondary);font-family:var(--font-sans);">${testContent}</div>
      `;
      toast.show('Test WhatsApp delivered successfully!', 'success');
    }).catch(err => {
      resBox.innerHTML = `
        <div style="color:var(--sf-error-600);font-weight:bold;">✗ DISPATCH FAILED</div>
        <div>${err.message}</div>
      `;
      toast.show('Test WhatsApp failed: ' + err.message, 'error');
    });
  };
}
