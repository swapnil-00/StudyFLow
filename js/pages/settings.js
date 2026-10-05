// Settings Page
export function renderSettings(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const settings = store.getSettings();
  const branches = store.getBranches();
  const org = store.organization || { name: 'StudyFlow Library', plan: 'free', seatLimit: 5 };
  const sub = org.subscription || {};
  const user = store.currentUser || { name: 'Admin', email: 'admin@studyflow.in', role: 'owner' };
  const isAuth = store.isAuthenticated();
  const isOwner = (user.role || 'owner') === 'owner';
  const seatsCount = store.getSeats().length;
  const seatLimit = Number(sub.seatLimit || org.seatLimit || org.seat_limit) || 5;
  const seatUsagePct = Math.min(100, Math.round((seatsCount / seatLimit) * 100));
  const planName = sub.planName || org.planName || String(org.plan || 'free');
  const isDemo = Boolean(org.isDemo || org.is_demo || org.plan === 'demo');
  const isSuspended = (org.subscriptionStatus || org.subscription_status) === 'suspended';
  const statusLabel = isSuspended ? 'SUSPENDED' : (isDemo ? 'DEMO' : 'ACTIVE');
  const statusBadgeClass = isSuspended ? 'badge-danger' : (isDemo ? 'badge-warning' : 'badge-success');
  const waLabel = sub.autoLabel || (org.whatsappMode === 'automatic' ? 'Automatic — Active' : 'Manual');
  const waBadgeClass = (sub.whatsappMode || org.whatsappMode) === 'automatic' ? 'badge-success'
    : (sub.autoStatus === 'expired' || sub.autoStatus === 'payment_failed') ? 'badge-danger' : 'badge-neutral';

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
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="badge ${statusBadgeClass}" style="font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;">${statusLabel}</span>
              <span class="badge badge-indigo" style="font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;">${esc(planName)}</span>
            </div>
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
              <span style="font-weight:600;color:var(--color-text-secondary);">Seats used</span>
              <span style="font-weight:700;color:${seatsCount >= seatLimit ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${seatsCount} / ${seatLimit} seats (${seatUsagePct}%)</span>
            </div>
            <div style="width:100%;height:8px;background:var(--color-bg-secondary);border-radius:4px;overflow:hidden;">
              <div style="width:${seatUsagePct}%;height:100%;background:${seatUsagePct >= 100 ? 'var(--sf-error-500)' : (seatUsagePct > 80 ? 'var(--sf-warning-500)' : 'var(--color-primary)')};border-radius:4px;transition:width 0.3s;"></div>
            </div>
          </div>

          <!-- WhatsApp notification mode -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:var(--text-xs);">
            <span style="font-weight:600;color:var(--color-text-secondary);">WhatsApp notifications</span>
            <span class="badge ${waBadgeClass}">${esc(waLabel)}</span>
          </div>
          ${sub.autoReason ? `<div style="font-size:12px;color:var(--color-text-tertiary);margin-top:-6px;">${esc(sub.autoReason)}</div>` : ''}

          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);">
            ${isOwner && !isDemo ? `<button class="btn btn-primary flex-1" onclick="app.navigate('/billing')">Billing & Plan</button>` : `<button class="btn btn-primary flex-1" onclick="app.openContactModal()">Contact Us</button>`}
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

        <!-- WhatsApp (Manual) Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">💬 WhatsApp Messaging (Manual Flow)</div>
              <div class="card-subtitle">1-click WhatsApp Web & App messaging from your own library phone</div>
            </div>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-xs);line-height:1.6;color:var(--color-text-secondary);border-left:3px solid var(--color-primary);">
              💡 <strong>How it works:</strong> Messages open directly in WhatsApp Web (desktop) or the WhatsApp app (mobile) with recipient and message pre-filled. Simply click "Send" inside WhatsApp. Scan the QR code once at <strong>web.whatsapp.com</strong> on this computer. Zero setup, no API fees, 100% reliable.
            </div>

            <div class="form-group">
              <label class="form-label">Open WhatsApp in</label>
              <select class="select" id="set-wa-open-in">
                <option value="auto" ${(!settings.whatsappOpenIn || settings.whatsappOpenIn === 'auto') ? 'selected' : ''}>Auto (Desktop app on computers, WhatsApp app on phones) — recommended</option>
                <option value="desktop" ${settings.whatsappOpenIn === 'desktop' ? 'selected' : ''}>WhatsApp Desktop app (no new browser tabs)</option>
                <option value="web" ${settings.whatsappOpenIn === 'web' ? 'selected' : ''}>WhatsApp Web (opens a new tab for each message)</option>
                <option value="app" ${settings.whatsappOpenIn === 'app' ? 'selected' : ''}>WhatsApp App link (wa.me)</option>
              </select>
              <div class="form-hint">WhatsApp Web can't reuse an open tab (WhatsApp blocks it for security), so each message opens a new tab. The free <a href="https://www.whatsapp.com/download" target="_blank" rel="noopener">WhatsApp Desktop app</a> switches chats in one window instead. Staff can override this per computer in the Send window.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Library Signature Line</label>
              <input type="text" class="input" id="set-wa-signature" placeholder="— ${escAttr(org.name || 'Apex Reading Lounge')}, ${escAttr(settings.phone || '9876543210')}" value="${escAttr(settings.whatsappSignature || '')}">
              <div class="form-hint">Automatically appended to the end of all outgoing messages.</div>
            </div>

            <!-- Message Templates Editor -->
            <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:var(--space-3);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--color-text-secondary);text-transform:uppercase;">Message Templates</span>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-reset-current-template" style="font-size:11px;color:var(--sf-error-600);">Reset to Default</button>
              </div>

              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:var(--text-xs);">Select Template to Edit</label>
                <select class="select" id="set-wa-template-key">
                  <option value="seat_assigned">Seat Assignment Confirmation</option>
                  <option value="payment_received">Payment Receipt</option>
                  <option value="payment_due">Payment Due Reminder</option>
                  <option value="payment_overdue">Payment Overdue Notice</option>
                  <option value="membership_expiring">Membership Expiring Notice</option>
                  <option value="membership_renewed">Membership Renewed Confirmation</option>
                  <option value="seat_transferred">Seat Transfer Notice</option>
                  <option value="welcome">Welcome Registration Message</option>
                  <option value="custom">Custom Announcement / Free Text</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <label class="form-label" style="font-size:var(--text-xs);margin-bottom:0;">Template Text</label>
                  <span id="wa-template-char-count" style="font-size:11px;color:var(--color-text-tertiary);font-family:var(--font-mono);">0 / 1000</span>
                </div>
                <textarea class="textarea" id="set-wa-template-text" rows="4" maxlength="1000" style="font-family:var(--font-mono);font-size:12px;line-height:1.4;"></textarea>
                <div class="form-hint" style="font-size:11px;">Supported placeholders: <code>{{student_name}}</code>, <code>{{seat_number}}</code>, <code>{{room_name}}</code>, <code>{{branch_name}}</code>, <code>{{plan_name}}</code>, <code>{{start_date}}</code>, <code>{{end_date}}</code>, <code>{{days_left}}</code>, <code>{{amount}}</code>, <code>{{amount_due}}</code>, <code>{{due_date}}</code>, <code>{{balance}}</code>, <code>{{receipt_number}}</code>, <code>{{payment_mode}}</code>, <code>{{from_seat}}</code>, <code>{{to_seat}}</code></div>
              </div>

              <!-- Live Preview -->
              <div style="margin-top:var(--space-2);">
                <div style="font-size:11px;font-weight:var(--fw-semibold);color:var(--color-text-tertiary);text-transform:uppercase;margin-bottom:4px;">Live Preview</div>
                <div id="wa-template-preview" style="padding:var(--space-3);background:var(--color-bg-primary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-md);font-size:12px;white-space:pre-wrap;line-height:1.5;color:var(--color-text-primary);"></div>
              </div>
            </div>

            <button class="btn btn-primary w-full" id="btn-save-wa-settings">Save WhatsApp Settings</button>
          </div>
        </div>

        ${user.role === 'owner' ? `
        <!-- Email delivery self-test (password reset codes) -->
        <div class="card">
          <div class="card-header"><div class="card-title">Email Delivery</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-3);">
            <p style="font-size:12px;color:var(--color-text-secondary);margin:0;">
              Password reset and notification emails are sent via your configured provider. Send yourself a test to check the setup
              (<code>BREVO_API_KEY</code> (preferred) or <code>RESEND_API_KEY</code>, plus <code>MAIL_FROM</code> in Cloudflare Workers settings).
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
              <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:8px;">Sign-in methods</div>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-bg-secondary);">
                  <div>
                    <div style="font-weight:600;color:var(--color-text-primary);">Google</div>
                    <div style="color:var(--color-text-tertiary);">${esc(user.email || '')}</div>
                  </div>
                  <span class="badge badge-success">✓ Connected</span>
                </div>
                ${store.authMethods?.password !== false ? `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-bg-secondary);">
                  <div>
                    <div style="font-weight:600;color:var(--color-text-primary);">Email &amp; password</div>
                    <div style="color:var(--color-text-tertiary);">${user.hasPassword ? 'You can sign in with your email and password' : 'Not set — add a password to sign in without Google'}</div>
                  </div>
                  ${user.hasPassword
                    ? '<span class="badge badge-success">✓ Set</span>'
                    : `<a class="btn btn-primary btn-sm" href="#/forgot-password?mode=set&autosend=1&email=${encodeURIComponent(user.email || '')}">Set password</a>`}
                </div>
                ` : ''}
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

            ${store.authMethods?.password !== false ? `
            <div style="padding-top:var(--space-3);border-top:1px solid var(--color-border-secondary);">
              ${user.hasPassword === false ? `
              <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:6px;">Password</div>
              <p style="font-size:12px;color:var(--color-text-secondary);margin:0 0 12px;">
                You sign in with Google. You can also add a password so you can sign in with your email.
                We'll email a 6-digit code to <strong>${esc(user.email || 'your email')}</strong> to confirm it's you.
              </p>
              <a class="btn btn-primary w-full" href="#/forgot-password?mode=set&autosend=1&email=${encodeURIComponent(user.email || '')}">Set a password</a>
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
            ` : ''}
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

  // WhatsApp Manual Settings logic
  const waOpenInSelect = document.getElementById('set-wa-open-in');
  const waSigInput = document.getElementById('set-wa-signature');
  const waTplSelect = document.getElementById('set-wa-template-key');
  const waTplText = document.getElementById('set-wa-template-text');
  const waCharCount = document.getElementById('wa-template-char-count');
  const waPreview = document.getElementById('wa-template-preview');
  const btnResetTpl = document.getElementById('btn-reset-current-template');
  const btnSaveWa = document.getElementById('btn-save-wa-settings');

  const defaultTemplates = (typeof whatsappManual !== 'undefined' && whatsappManual.DEFAULT_TEMPLATES) ? whatsappManual.DEFAULT_TEMPLATES : {};
  const currentTemplates = { ...(settings.whatsappTemplates || {}) };

  const sampleVars = {
    student_name: 'Rahul Sharma',
    seat_number: 'A-12',
    room_name: 'Main Hall',
    branch_name: org.name || 'Apex Reading Lounge',
    plan_name: 'Full Day (30 Days)',
    start_date: '01 Oct 2026',
    end_date: '31 Oct 2026',
    days_left: '5',
    amount: '1,500',
    amount_due: '1,500',
    balance: '0',
    payment_status: 'Paid',
    payment_mode: 'UPI',
    receipt_number: 'REC-2026-0042',
    date: '30 Sep 2026',
    due_date: '05 Oct 2026',
    from_seat: 'B-04',
    to_seat: 'A-12',
    message: 'This is an important update regarding the library schedule for the upcoming holidays.'
  };

  function updateTemplateEditor() {
    if (!waTplSelect || !waTplText) return;
    const key = waTplSelect.value;
    const text = currentTemplates[key] !== undefined ? currentTemplates[key] : (defaultTemplates[key] || '');
    waTplText.value = text;
    updatePreview();
  }

  function updatePreview() {
    if (!waTplSelect || !waTplText || !waPreview || !waCharCount) return;
    const key = waTplSelect.value;
    const text = waTplText.value;
    waCharCount.textContent = `${text.length} / 1000`;

    const sig = waSigInput?.value?.trim() || (org.name ? `— ${org.name}${settings.phone ? ', ' + settings.phone : ''}` : '');
    const tempSettings = {
      ...settings,
      whatsappSignature: sig,
      whatsappTemplates: { ...currentTemplates, [key]: text }
    };

    if (typeof whatsappManual !== 'undefined') {
      const rendered = whatsappManual.renderMessage(key, sampleVars, tempSettings);
      waPreview.textContent = rendered;
    } else {
      waPreview.textContent = text;
    }
  }

  if (waTplSelect) {
    waTplSelect.addEventListener('change', () => {
      updateTemplateEditor();
    });
  }

  if (waTplText) {
    waTplText.addEventListener('input', () => {
      const key = waTplSelect.value;
      currentTemplates[key] = waTplText.value;
      updatePreview();
    });
  }

  if (waSigInput) {
    waSigInput.addEventListener('input', () => {
      updatePreview();
    });
  }

  if (btnResetTpl) {
    btnResetTpl.addEventListener('click', () => {
      const key = waTplSelect.value;
      const def = defaultTemplates[key] || '';
      currentTemplates[key] = def;
      waTplText.value = def;
      updatePreview();
      toast.show(`Reset template "${key}" to default`, 'info');
    });
  }

  if (btnSaveWa) {
    btnSaveWa.addEventListener('click', async () => {
      try {
        btnSaveWa.disabled = true;
        btnSaveWa.textContent = 'Saving...';
        await store.updateSettings({
          whatsappOpenIn: waOpenInSelect?.value || 'auto',
          whatsappSignature: waSigInput?.value?.trim() || '',
          whatsappTemplates: currentTemplates
        });
        toast.show('WhatsApp settings & templates saved successfully!', 'success');
      } catch (err) {
        toast.show(err.message || 'Failed to save WhatsApp settings', 'error');
      } finally {
        btnSaveWa.disabled = false;
        btnSaveWa.textContent = 'Save WhatsApp Settings';
      }
    });
  }

  // Initial load of template text and preview
  updateTemplateEditor();
}

