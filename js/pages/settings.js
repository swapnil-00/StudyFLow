// Settings Page
export function renderSettings(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const settings = store.getSettings();
  const branches = store.getBranches();
  const org = store.organization || { name: 'StudyFlow Library', plan: 'trial', seatLimit: 75 };
  const user = store.currentUser || { name: 'Admin', email: 'admin@studyflow.in', role: 'owner' };
  const isAuth = store.isAuthenticated();
  const seatsCount = store.getSeats().length;
  const seatLimit = org.seatLimit || 75;
  const seatUsagePct = Math.min(100, Math.round((seatsCount / seatLimit) * 100));

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Organization, subscription plans, and system configuration</p>
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);align-items:start;">
      <!-- SaaS Account & Subscription -->
      <div class="card" style="border:1.5px solid rgba(97, 114, 243, 0.3);">
        <div class="card-header" style="background:rgba(97, 114, 243, 0.04);">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <span>SaaS Plan & Subscription</span>
            <span class="badge badge-indigo" style="font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;">${esc(org.plan)}</span>
          </div>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div style="display:flex;align-items:center;gap:12px;padding-bottom:var(--space-3);border-bottom:1px solid var(--color-border-secondary);">
            <div style="width:40px;height:40px;border-radius:50%;background:${escAttr(user.avatarColor || 'var(--color-primary)')};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">
              ${utils.initials(user.name || 'Admin')}
            </div>
            <div style="flex:1;overflow:hidden;">
              <div style="font-weight:var(--fw-bold);font-size:var(--text-sm);color:var(--color-text-primary);" class="truncate">${esc(org.name)}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(user.email)} · ${esc((user.role || 'Owner').toUpperCase())}</div>
            </div>
          </div>

          <!-- Seat Usage Bar -->
          <div>
            <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:6px;">
              <span style="font-weight:600;color:var(--color-text-secondary);">Seat Allocation Capacity</span>
              <span style="font-weight:700;color:var(--color-text-primary);">${seatsCount} / ${seatLimit} seats (${seatUsagePct}%)</span>
            </div>
            <div style="width:100%;height:8px;background:var(--color-bg-secondary);border-radius:4px;overflow:hidden;">
              <div style="width:${seatUsagePct}%;height:100%;background:${seatUsagePct > 90 ? 'var(--sf-error-500)' : (seatUsagePct > 70 ? 'var(--sf-warning-500)' : 'var(--color-primary)')};border-radius:4px;transition:width 0.3s;"></div>
            </div>
          </div>

          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);">
            <button class="btn btn-primary flex-1" onclick="modal.open('Upgrade Plan', '<p style=\\'margin-bottom:var(--space-4);line-height:1.6;\\'>To upgrade your subscription, expand seat capacity, or request dedicated deployment, please reach out to our team at <strong>sales@studyflow.in</strong> or WhatsApp support at <strong>+91 99999 99999</strong>.</p><a href=\\'mailto:sales@studyflow.in?subject=StudyFlow%20Plan%20Upgrade\\' class=\\'btn btn-primary w-full\\' style=\\'display:inline-block;text-align:center;text-decoration:none;\\'>Email Sales</a>', '<button class=\\'btn btn-secondary\\' onclick=\\'modal.close()\\'>Close</button>')">Contact Us</button>
            <button class="btn btn-secondary" onclick="app.openOnboardingModal()">Setup Wizard</button>
            ${isAuth ? `
              <button class="btn btn-secondary" onclick="app.handleLogout()">Sign Out</button>
            ` : `
              <button class="btn btn-secondary" onclick="app.openLoginModal()">Sign In</button>
            `}
          </div>
        </div>
      </div>

      <!-- Organization Details -->
      <div class="card">
        <div class="card-header"><div class="card-title">Library Profile</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="input" id="set-org-name" value="${escAttr(org.name || settings.orgName || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="input" id="set-address" value="${escAttr(settings.address || '')}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="input" id="set-phone" value="${escAttr(settings.phone || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="input" id="set-email" value="${escAttr(settings.email || '')}">
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
                  <div style="font-weight:var(--fw-medium);">${esc(b.name)}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(b.city)} · ${esc(b.phone)}</div>
                </div>
                <span class="badge badge-success"><span class="badge-dot"></span>${esc(b.status)}</span>
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
                <input type="text" class="input" id="set-wa-phone-id" placeholder="e.g. 109384729384729" value="${escAttr(settings.waPhoneId || '')}">
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Account ID / Namespace</label>
                <input type="text" class="input" id="set-wa-acc-id" placeholder="e.g. studyflow_notifications" value="${escAttr(settings.waAccId || '')}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Permanent Access Token</label>
              <input type="password" class="input" id="set-wa-token" placeholder="Bearer EAAG..." value="${escAttr(settings.waToken || '')}">
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

        ${user.role === 'owner' ? `
        <!-- Email delivery self-test (password reset codes) -->
        <div class="card">
          <div class="card-header"><div class="card-title">Email Delivery</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-3);">
            <p style="font-size:12px;color:var(--color-text-secondary);margin:0;">
              Password reset codes are sent by email. Send yourself a test to check the setup
              (Gmail <code>SMTP_URL</code> or <code>RESEND_API_KEY</code> + <code>MAIL_FROM</code> in Vercel).
            </p>
            <button class="btn btn-secondary" id="btn-send-test-email" onclick="sendTestEmail()">Send test email to ${esc(user.email || 'me')}</button>
            <div id="test-email-result" style="display:none;padding:var(--space-3);border-radius:var(--radius-lg);font-size:12px;line-height:1.5;"></div>
          </div>
        </div>
        ` : ''}

        <!-- Security & Active Sessions (Plan §4.3 & §5) -->
        <div class="card">
          <div class="card-header"><div class="card-title">Security & Active Devices</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div>
              <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:4px;">Linked Identity</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-secondary);">
                ${user.firebaseUid ? '✓ Google / Phone authentication linked' : 'Standard email & password account'}
              </div>
            </div>

            <div style="padding-top:var(--space-3);border-top:1px solid var(--color-border-secondary);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);">Active Sessions</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Devices currently signed in to your account</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="app.handleLogoutAll()">Sign Out Everywhere</button>
              </div>
              <div id="active-sessions-list" style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                <span style="color:var(--color-text-tertiary);">Loading active devices...</span>
              </div>
            </div>

            <div style="padding-top:var(--space-3);border-top:1px solid var(--color-border-secondary);">
              ${user.hasPassword === false ? `
              <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:6px;">Password</div>
              <p style="font-size:12px;color:var(--color-text-secondary);margin:0 0 12px;">
                You sign in with Google. You can also add a password so you can sign in with your email.
                We'll email a 6-digit code to <strong>${esc(user.email || 'your email')}</strong> to confirm it's you.
              </p>
              <a class="btn btn-primary w-full" href="#/forgot-password?mode=set&email=${encodeURIComponent(user.email || '')}">Set a password</a>
              ` : `
              <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:8px;">Change Password</div>
              <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" for="set-cur-pwd">Current Password</label>
                <input type="password" class="input" id="set-cur-pwd" placeholder="••••••••" autocomplete="current-password" />
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" for="set-new-pwd">New Password (min 10 chars)</label>
                <input type="password" class="input" id="set-new-pwd" placeholder="••••••••••" minlength="10" autocomplete="new-password" />
              </div>
              <button class="btn btn-primary w-full" onclick="updateUserPassword()">Update Password</button>
              <a href="#/forgot-password?email=${encodeURIComponent(user.email || '')}" style="display:block;margin-top:8px;font-size:12px;color:var(--color-primary);text-align:center;">Forgot your current password?</a>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load active sessions
  setTimeout(async () => {
    try {
      const res = await fetch('/api/auth?action=sessions', { credentials: 'same-origin' });
      const json = await res.json();
      const listEl = document.getElementById('active-sessions-list');
      if (listEl && json.ok && json.sessions) {
        listEl.innerHTML = json.sessions.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--color-bg-secondary);border-radius:8px;border:1px solid var(--color-border);">
            <div>
              <div style="font-weight:600;color:var(--color-text-primary);">
                ${s.isCurrent ? '🟢 This Device (Current)' : '💻 Device'}
              </div>
              <div style="font-size:11px;color:var(--color-text-tertiary);">${esc(s.ipAddress || 'Unknown IP')} · ${new Date(s.lastSeenAt || s.createdAt).toLocaleDateString()}</div>
            </div>
            ${!s.isCurrent ? `<button class="btn btn-ghost btn-sm" style="color:var(--sf-error-600);font-size:11px;" onclick="revokeSessionAction('${escAttr(s.id)}')">Revoke</button>` : ''}
          </div>
        `).join('');
      }
    } catch (_) {}
  }, 0);

  window.sendTestEmail = async function() {
    const btn = document.getElementById('btn-send-test-email');
    const box = document.getElementById('test-email-result');
    if (!btn || !box) return;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';
    box.style.display = 'none';
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'send_test_email' })
      });
      const json = await res.json().catch(() => ({}));
      const ok = res.ok && json.ok && json.delivered !== false;
      box.style.background = ok ? 'var(--sf-success-50, #ecfdf3)' : 'var(--sf-error-50, #fef3f2)';
      box.style.color = ok ? 'var(--sf-success-700, #067647)' : 'var(--sf-error-700, #b42318)';
      box.innerHTML = ok
        ? `<strong>Sent.</strong> ${esc(json.message || '')}<br><span style="opacity:.8;">From: ${esc(json.from || '')}</span>`
        : `<strong>Not sent.</strong> ${esc(json.hint || json.message || json.error || 'Unknown error')}`
          + (json.error ? `<div style="margin-top:6px;font-family:var(--font-mono);opacity:.8;word-break:break-word;">${esc(json.error)}</div>` : '')
          + (json.provider ? `<div style="margin-top:4px;opacity:.8;">Provider: ${esc(json.provider)} · From: ${esc(json.from || '')}</div>` : '');
      box.style.display = 'block';
    } catch (e) {
      box.style.display = 'block';
      box.textContent = e.message || 'Request failed';
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  };

  window.revokeSessionAction = async function(sessionId) {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'revoke_session', sessionId })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to revoke session');
      toast.show('Device session revoked', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to revoke session', 'error');
    }
  };

  window.updateUserPassword = async function() {
    const curPwd = document.getElementById('set-cur-pwd')?.value;
    const newPwd = document.getElementById('set-new-pwd')?.value;
    const user = store.currentUser || {};
    if (!newPwd || newPwd.length < 10) {
      toast.show('New password must be at least 10 characters long', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update_profile',
          name: user.name,
          currentPassword: curPwd || undefined,
          newPassword: newPwd
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to update password');
      toast.show('Password updated successfully! Other sessions logged out.', 'success');
      document.getElementById('set-cur-pwd').value = '';
      document.getElementById('set-new-pwd').value = '';
    } catch (e) {
      toast.show(e.message || 'Failed to update password', 'error');
    }
  };

  window.app.handleLogoutAll = async function() {
    const confirmed = await modal.confirm({
      title: 'Sign Out Everywhere',
      message: 'This will log you out of all active devices and browsers. Are you sure?',
      confirmText: 'Sign Out Everywhere',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await store.logoutAll();
      toast.show('Signed out of all devices', 'info');
      app._render();
      app.navigate('/login');
    } catch (e) {
      toast.show(e.message || 'Failed to sign out', 'error');
    }
  };

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
