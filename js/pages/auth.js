// js/pages/auth.js — Dedicated Auth Pages: Login, Signup, Setup Library, Onboarding, Invite, Forgot Password
// Multi-Tenant SaaS auth flow with strict state routing, Google OAuth, and zero fake defaults.

export function renderLoginPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-subtitle">Sign in to manage your study library</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <!-- Google Sign In -->
      <div class="auth-identity-buttons">
        <button type="button" class="btn-google" id="btn-google-login">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div class="auth-divider">
        <span>or use email</span>
      </div>

      <!-- Email-first sign in: the password box only appears for accounts that have a password -->
      <form id="email-login-form" class="auth-form" novalidate onsubmit="event.preventDefault();">
        <div class="form-group" id="login-email-group">
          <label class="form-label" for="login-email">Email address</label>
          <input type="email" id="login-email" class="input" required placeholder="name@yourlibrary.com" autocomplete="username email" autocapitalize="off" spellcheck="false" />
        </div>

        <div id="login-email-chip" class="auth-email-chip" style="display:none;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;margin-bottom:12px;border:1px solid var(--color-border);border-radius:999px;font-size:13px;color:var(--color-text-primary);background:var(--color-bg-secondary);">
          <span id="login-email-display" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          <button type="button" id="btn-change-email" style="background:none;border:none;color:var(--color-primary);font-size:12px;font-weight:600;cursor:pointer;padding:0;">Change</button>
        </div>

        <div class="form-group" id="login-password-group" style="display:none;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label class="form-label" for="login-password">Password</label>
            <a href="#/forgot-password" class="auth-forgot-link" id="login-forgot-link">Forgot password?</a>
          </div>
          <div class="password-input-wrap">
            <input type="password" id="login-password" class="input" placeholder="Enter your password" autocomplete="current-password" />
            <button type="button" class="password-toggle-btn" aria-label="Show password" aria-pressed="false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div id="login-google-only" style="display:none;margin-bottom:12px;padding:12px 14px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-bg-secondary);font-size:13px;line-height:1.5;color:var(--color-text-primary);">
          <div style="font-weight:600;margin-bottom:4px;">This account signs in with Google</div>
          <div style="color:var(--color-text-secondary);margin-bottom:10px;">Use <strong>Continue with Google</strong> above. Please don't type your Google password here.</div>
          <a href="#/forgot-password?mode=set" id="login-set-password-link" style="color:var(--color-primary);font-weight:600;">Or set a password by email</a>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-email-submit">
          Continue
        </button>
      </form>

      <div class="auth-footer">
        Don't have a library account? <a href="#/signup" class="auth-switch-link">Create Library (Free Trial)</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    setupLoginEvents(container);
    ensureFirebaseSdk().catch(() => {});
  }, 0);
  return container;
}

export function renderSignupPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Create your library</h1>
        <p class="auth-subtitle">Start your 14-day free trial. No credit card required.</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <!-- Google Sign Up -->
      <div class="auth-identity-buttons">
        <button type="button" class="btn-google" id="btn-google-signup">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Sign up with Google
        </button>
      </div>

      <div class="auth-divider">
        <span>or sign up with email</span>
      </div>

      <form id="email-signup-form" class="auth-form" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reg-name">Your Full Name *</label>
          <input type="text" id="reg-name" class="input" required placeholder="e.g. Rahul Sharma" autocomplete="name" />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-email">Email Address *</label>
          <input type="email" id="reg-email" class="input" required placeholder="owner@yourlibrary.com" autocomplete="email" />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-phone">Mobile Number (Optional)</label>
          <div class="phone-input-group">
            <span class="phone-prefix">+91</span>
            <input type="tel" id="reg-phone" class="input" placeholder="98765 43210" maxlength="10" inputmode="numeric" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-password">Password * (at least 10 characters)</label>
          <div class="password-input-wrap">
            <input type="password" id="reg-password" class="input" required placeholder="••••••••••" minlength="10" autocomplete="new-password" />
            <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div class="form-group terms-checkbox-group" style="margin-top:10px;">
          <label class="checkbox-label" style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--color-text-secondary);cursor:pointer;">
            <input type="checkbox" id="reg-terms-check" style="margin-top:2px;" />
            <span>I agree to the <a href="javascript:void(0)" style="color:var(--color-primary);text-decoration:underline;">Terms of Service</a> and <a href="javascript:void(0)" style="color:var(--color-primary);text-decoration:underline;">Privacy Policy</a>.</span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-signup-submit" style="margin-top:14px;">
          Continue to Library Setup
        </button>
      </form>

      <div class="auth-footer">
        Already have a library account? <a href="#/login" class="auth-switch-link">Sign In</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    setupSignupEvents(container);
    ensureFirebaseSdk().catch(() => {});
  }, 0);
  return container;
}

export function renderSetupLibraryPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Set up your library</h1>
        <p class="auth-subtitle">Enter your library or study hall details to get started.</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <form id="setup-library-form" class="auth-form" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="setup-org-name">Library / Reading Hall Name *</label>
          <input type="text" id="setup-org-name" class="input" required placeholder="e.g. Apex Reading Lounge & Library" />
        </div>

        <div class="form-group">
          <label class="form-label" for="setup-org-city">City / Location *</label>
          <input type="text" id="setup-org-city" class="input" required placeholder="e.g. Pune, Maharashtra" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-setup-submit" style="margin-top:14px;">
          Create Library & Continue
        </button>
      </form>

      <div class="auth-footer">
        <a href="javascript:void(0)" id="btn-logout-setup" style="color:var(--color-text-secondary);font-size:12px;">Sign out / Switch account</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const alertEl = container.querySelector('#auth-alert');
    const form = container.querySelector('#setup-library-form');
    const submitBtn = container.querySelector('#btn-setup-submit');
    const logoutBtn = container.querySelector('#btn-logout-setup');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await store.logout();
        window.location.hash = '#/login';
      });
    }

    form.addEventListener('submit', async () => {
      const orgName = container.querySelector('#setup-org-name').value.trim();
      const city = container.querySelector('#setup-org-city').value.trim();

      if (!orgName || !city) {
        showAuthAlert(alertEl, 'Please fill in both library name and city.');
        return;
      }

      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Creating Library...</span>
      `;

      try {
        await store.createLibrary({ orgName, city });
        window.location.hash = '#/onboarding';
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Failed to create library');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    });
  }, 0);

  return container;
}

export function renderOnboardingPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  const org = store.organization || { name: 'My Library' };

  container.innerHTML = `
    <div class="auth-card" style="max-width:540px;">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Configure Initial Setup</h1>
        <p class="auth-subtitle">Set up your main branch and initial seating capacity for <strong>${utils.escapeHtml(org.name || 'your library')}</strong>.</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <form id="onboarding-form" class="auth-form" onsubmit="event.preventDefault();">
        <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);margin-bottom:8px;">1. Main Branch</div>
        
        <div class="form-group">
          <label class="form-label" for="ob-branch-name">Branch Name *</label>
          <input type="text" id="ob-branch-name" class="input" required placeholder="e.g. Main Branch / Kothrud Campus" />
        </div>

        <div class="form-group">
          <label class="form-label" for="ob-branch-city">Branch City *</label>
          <input type="text" id="ob-branch-city" class="input" required placeholder="e.g. Pune" />
        </div>

        <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);margin:16px 0 8px 0;">2. Study Hall & Seats</div>

        <div class="form-group">
          <label class="form-label" for="ob-room-name">Main Hall / Room Name *</label>
          <input type="text" id="ob-room-name" class="input" required placeholder="e.g. Silent Reading Hall A" />
        </div>

        <div class="form-group">
          <label class="form-label" for="ob-seat-count">Initial Number of Seats (10 – 100)</label>
          <input type="number" id="ob-seat-count" class="input" min="10" max="100" value="40" required />
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-ob-submit" style="margin-top:18px;">
          🚀 Complete Setup & Launch Dashboard
        </button>
      </form>

      <div class="auth-footer">
        <a href="javascript:void(0)" id="btn-logout-ob" style="color:var(--color-text-secondary);font-size:12px;">Sign out</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const alertEl = container.querySelector('#auth-alert');
    const form = container.querySelector('#onboarding-form');
    const submitBtn = container.querySelector('#btn-ob-submit');
    const logoutBtn = container.querySelector('#btn-logout-ob');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await store.logout();
        window.location.hash = '#/login';
      });
    }

    form.addEventListener('submit', async () => {
      const branchName = container.querySelector('#ob-branch-name').value.trim();
      const city = container.querySelector('#ob-branch-city').value.trim();
      const roomName = container.querySelector('#ob-room-name').value.trim();
      const seatCount = parseInt(container.querySelector('#ob-seat-count').value, 10) || 40;

      if (!branchName || !city || !roomName) {
        showAuthAlert(alertEl, 'Please fill in all required setup fields.');
        return;
      }

      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Setting up Library...</span>
      `;

      try {
        await store.completeOnboarding({ branchName, city, roomName, seatCount });
        window.location.hash = '#/dashboard';
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Onboarding failed');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    });
  }, 0);

  return container;
}

export function renderForgotPasswordPage(_container, params = {}) {
  const isSetMode = params.mode === 'set';
  const prefillEmail = String(params.email || '');
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  const eyeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">${isSetMode ? 'Set a password' : 'Reset your password'}</h1>
        <p class="auth-subtitle" id="forgot-subtitle">${isSetMode
          ? 'We will email you a 6-digit code to confirm it is you. After that you can sign in with your email and password as well as with Google.'
          : 'Enter the email you use for StudyFlow and we will send you a 6-digit code.'}</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <!-- Step 1: Request Code -->
      <form id="forgot-request-form" class="auth-form" novalidate onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-email">Email address</label>
          <input type="email" id="reset-email" class="input" required placeholder="name@yourlibrary.com" autocomplete="username email" autocapitalize="off" spellcheck="false" value="${utils.escapeAttr(prefillEmail)}" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-request-reset">Send code</button>
      </form>

      <!-- Step 2: Enter Code & New Password -->
      <form id="forgot-confirm-form" class="auth-form" style="display:none;" novalidate onsubmit="event.preventDefault();">
        <input type="email" id="reset-email-hidden" autocomplete="username" style="display:none;" tabindex="-1" aria-hidden="true" />
        <div class="form-group">
          <label class="form-label" for="reset-code">6-digit code</label>
          <input type="text" id="reset-code" class="input" required placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" style="letter-spacing:6px;font-weight:700;font-size:18px;text-align:center;" />
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;color:var(--color-text-secondary);">
            <span>Check your inbox and spam folder.</span>
            <button type="button" id="btn-resend-code" style="background:none;border:none;color:var(--color-primary);font-weight:600;cursor:pointer;padding:0;" disabled>Resend code</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-new-password">New password <span style="font-weight:400;color:var(--color-text-tertiary);">(at least 10 characters)</span></label>
          <div class="password-input-wrap">
            <input type="password" id="reset-new-password" class="input" required minlength="10" autocomplete="new-password" placeholder="Create a password" />
            <button type="button" class="password-toggle-btn" data-target="reset-new-password" aria-label="Show password">${eyeIcon}</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-confirm-password">Confirm new password</label>
          <input type="password" id="reset-confirm-password" class="input" required minlength="10" autocomplete="new-password" placeholder="Type it again" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-confirm-reset">${isSetMode ? 'Set password &amp; sign in' : 'Reset password &amp; sign in'}</button>
        <button type="button" id="btn-use-other-email" style="display:block;margin:10px auto 0;background:none;border:none;color:var(--color-text-secondary);font-size:12px;cursor:pointer;">Use a different email</button>
      </form>

      <div class="auth-footer">
        <a href="#/login" class="auth-switch-link">Back to sign in</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const alertEl = container.querySelector('#auth-alert');
    const reqForm = container.querySelector('#forgot-request-form');
    const confForm = container.querySelector('#forgot-confirm-form');
    const emailInput = container.querySelector('#reset-email');
    const reqBtn = container.querySelector('#btn-request-reset');
    const confBtn = container.querySelector('#btn-confirm-reset');
    const resendBtn = container.querySelector('#btn-resend-code');
    const subtitle = container.querySelector('#forgot-subtitle');
    const confirmLabel = confBtn.textContent;
    let emailVal = '';
    let cooldownTimer = null;

    container.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = container.querySelector('#' + btn.dataset.target);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });

    const startCooldown = (seconds) => {
      clearInterval(cooldownTimer);
      let left = seconds;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Resend code in ' + left + 's';
      cooldownTimer = setInterval(() => {
        left -= 1;
        if (left <= 0 || !container.isConnected) {
          clearInterval(cooldownTimer);
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend code';
          return;
        }
        resendBtn.textContent = 'Resend code in ' + left + 's';
      }, 1000);
    };

    const requestCode = async () => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'password_reset_request', email: emailVal }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not send the code. Please try again.');
      return json;
    };

    reqForm.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      emailVal = emailInput.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showAuthAlert(alertEl, 'Enter a valid email address, for example name@example.com.');
        emailInput.focus();
        return;
      }

      reqBtn.disabled = true;
      reqBtn.textContent = 'Sending...';
      try {
        const json = await requestCode();
        showAuthAlert(alertEl, json.message || 'If an account exists for this email, we have sent a code.', 'success');
        subtitle.textContent = 'Enter the code we sent to ' + emailVal + ' and choose a new password.';
        container.querySelector('#reset-email-hidden').value = emailVal;
        reqForm.style.display = 'none';
        confForm.style.display = 'block';
        container.querySelector('#reset-code').focus();
        startCooldown(60);
      } catch (err) {
        showAuthAlert(alertEl, err.message);
      } finally {
        reqBtn.disabled = false;
        reqBtn.textContent = 'Send code';
      }
    });

    resendBtn.addEventListener('click', async () => {
      alertEl.style.display = 'none';
      resendBtn.disabled = true;
      try {
        const json = await requestCode();
        showAuthAlert(alertEl, json.message || 'A new code has been sent.', 'success');
        startCooldown(60);
      } catch (err) {
        showAuthAlert(alertEl, err.message);
        resendBtn.disabled = false;
      }
    });

    container.querySelector('#btn-use-other-email').addEventListener('click', () => {
      clearInterval(cooldownTimer);
      alertEl.style.display = 'none';
      confForm.style.display = 'none';
      reqForm.style.display = 'block';
      emailInput.focus();
    });

    confForm.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      const code = container.querySelector('#reset-code').value.replace(/\D/g, '');
      const newPassword = container.querySelector('#reset-new-password').value;
      const confirmPassword = container.querySelector('#reset-confirm-password').value;

      if (code.length !== 6) return showAuthAlert(alertEl, 'Enter the 6-digit code from the email.');
      if (newPassword.length < 10) return showAuthAlert(alertEl, 'Your new password must be at least 10 characters.');
      if (newPassword !== confirmPassword) return showAuthAlert(alertEl, 'The two passwords do not match.');

      confBtn.disabled = true;
      confBtn.textContent = 'Saving...';
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'password_reset_confirm', email: emailVal, code, newPassword }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not set your password. Please try again.');

        clearInterval(cooldownTimer);
        showAuthAlert(alertEl, json.message || 'Your password has been set. Signing you in...', 'success');
        // The server signed this device in; reload auth state and continue into the app.
        store._loaded = false;
        await store.load();
        const state = store.authState;
        window.location.hash = state === 'needs_library' ? '#/setup-library'
          : state === 'needs_onboarding' ? '#/onboarding'
          : state === 'ready' ? '#/dashboard' : '#/login';
      } catch (err) {
        showAuthAlert(alertEl, err.message);
        confBtn.disabled = false;
        confBtn.textContent = confirmLabel;
      }
    });

    if (prefillEmail) reqBtn.focus(); else emailInput.focus();
  }, 0);

  return container;
}

export function renderInvitePage(token) {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Staff Invitation</h1>
        <p class="auth-subtitle" id="invite-subtitle">Loading invitation details...</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>
      <div id="invite-content"></div>
    </div>
  `;

  setTimeout(async () => {
    const alertEl = container.querySelector('#auth-alert');
    const subtitleEl = container.querySelector('#invite-subtitle');
    const contentEl = container.querySelector('#invite-content');

    if (!token) {
      subtitleEl.textContent = 'Invalid invitation link.';
      showAuthAlert(alertEl, 'No invitation token found in link.');
      return;
    }

    try {
      const res = await fetch(`/api/auth?action=invitation_info&token=${encodeURIComponent(token)}`);
      const json = await res.json();

      if (!json.ok) {
        subtitleEl.textContent = 'Invitation Unavailable';
        showAuthAlert(alertEl, json.error || 'Invitation is invalid or expired.');
        return;
      }

      subtitleEl.innerHTML = `You have been invited to join <strong>${utils.escapeHtml(json.organizationName || 'StudyFlow Library')}</strong> as <strong>${utils.escapeHtml(json.role || 'staff')}</strong>.`;

      contentEl.innerHTML = `
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
          <button type="button" class="btn-google" id="btn-invite-google">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Accept Invitation with Google
          </button>
        </div>
      `;

      const googleBtn = contentEl.querySelector('#btn-invite-google');
      if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
          try {
            await ensureFirebaseSdk();
            const auth = window.firebase.auth();
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const idToken = await result.user.getIdToken();

            await store.sessionFromIdToken(idToken, 'invite', token);
            window.location.hash = '#/dashboard';
          } catch (err) {
            showAuthAlert(alertEl, err.message || 'Invitation acceptance failed');
          }
        });
      }
    } catch (err) {
      showAuthAlert(alertEl, 'Failed to fetch invitation details.');
    }
  }, 0);

  return container;
}

// ── Firebase Client SDK Loader ──────────────────────────────────────────────
let firebaseInitPromise = null;

async function ensureFirebaseSdk() {
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    return window.firebase;
  }
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    const configRes = await fetch('/api/auth?action=client_config');
    const configData = await configRes.json();
    if (!configData.ok || !configData.firebase?.projectId) {
      throw new Error('Firebase client configuration is not available on this server.');
    }

    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js');
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp({
        apiKey: configData.firebase.apiKey,
        authDomain: configData.firebase.authDomain,
        projectId: configData.firebase.projectId,
        appId: configData.firebase.appId,
      });
    }

    return window.firebase;
  })();

  return firebaseInitPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function showAuthAlert(alertEl, message, type = 'error') {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `auth-alert ${type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`;
  alertEl.style.display = 'block';
}

function setupLoginEvents(container) {
  const alertEl = container.querySelector('#auth-alert');
  const googleBtn = container.querySelector('#btn-google-login');
  const form = container.querySelector('#email-login-form');
  const submitBtn = container.querySelector('#btn-email-submit');

  // Password visibility toggle
  const pwdToggle = container.querySelector('.password-toggle-btn');
  const pwdInput = container.querySelector('#login-password');
  if (pwdToggle && pwdInput) {
    pwdToggle.addEventListener('click', () => {
      const show = pwdInput.type === 'password';
      pwdInput.type = show ? 'text' : 'password';
      pwdToggle.setAttribute('aria-pressed', String(show));
      pwdToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  // Google Sign In (AUTH-07: Login intent only, never silently create accounts)
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      alertEl.style.display = 'none';
      const origHtml = googleBtn.innerHTML;
      googleBtn.disabled = true;
      googleBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Connecting to Google...</span>
      `;

      try {
        await ensureFirebaseSdk();
        const auth = window.firebase.auth();
        const provider = new window.firebase.auth.GoogleAuthProvider();
        
        googleBtn.innerHTML = `
          <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
          <span>Awaiting Google Authorization...</span>
        `;
        
        const result = await auth.signInWithPopup(provider);
        const idToken = await result.user.getIdToken();

        googleBtn.innerHTML = `
          <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
          <span>Loading your library...</span>
        `;

        const res = await store.sessionFromIdToken(idToken, 'login');

        if (res.state === 'needs_library') {
          window.location.hash = '#/setup-library';
        } else if (res.state === 'needs_onboarding') {
          window.location.hash = '#/onboarding';
        } else {
          window.location.hash = '#/dashboard';
        }
      } catch (err) {
        if (err.code === 'NO_ACCOUNT') {
          alertEl.innerHTML = `
            <div>No StudyFlow account found for this Google email.</div>
            <div style="margin-top:8px;">
              <a href="#/signup" class="btn btn-sm btn-primary" style="display:inline-block;padding:4px 12px;font-size:12px;">Create a Library</a>
            </div>
          `;
          alertEl.className = 'auth-alert auth-alert-error';
          alertEl.style.display = 'block';
        } else if (err.code === 'auth/popup-closed-by-user') {
          // User cancelled the popup
        } else {
          showAuthAlert(alertEl, err.message || 'Google sign in failed');
        }
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = origHtml;
      }
    });
  }

  // Email + Password Sign In
  // Email-first sign in: step 'email' → ask the server which methods the email uses →
  // step 'password' (password accounts) or step 'google' (Google-only accounts).
  if (form) {
    const emailInput = container.querySelector('#login-email');
    const emailGroup = container.querySelector('#login-email-group');
    const emailChip = container.querySelector('#login-email-chip');
    const emailDisplay = container.querySelector('#login-email-display');
    const passwordGroup = container.querySelector('#login-password-group');
    const googleOnlyBox = container.querySelector('#login-google-only');
    const forgotLink = container.querySelector('#login-forgot-link');
    const setPasswordLink = container.querySelector('#login-set-password-link');
    let step = 'email';

    const setBusy = (busy, label) => {
      submitBtn.disabled = busy;
      submitBtn.innerHTML = busy
        ? `<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span><span>${label}</span>`
        : label;
    };

    const showStep = (next, email) => {
      step = next;
      const onEmail = next === 'email';
      emailGroup.style.display = onEmail ? '' : 'none';
      emailChip.style.display = onEmail ? 'none' : 'flex';
      passwordGroup.style.display = next === 'password' ? '' : 'none';
      googleOnlyBox.style.display = next === 'google' ? '' : 'none';
      submitBtn.style.display = next === 'google' ? 'none' : '';
      submitBtn.innerHTML = next === 'password' ? 'Sign in' : 'Continue';
      if (email) {
        emailDisplay.textContent = email;
        const q = `email=${encodeURIComponent(email)}`;
        forgotLink.setAttribute('href', `#/forgot-password?${q}`);
        setPasswordLink.setAttribute('href', `#/forgot-password?mode=set&${q}`);
      }
      if (onEmail) {
        pwdInput.value = '';
        emailInput.focus();
      } else if (next === 'password') {
        pwdInput.focus();
      }
    };

    container.querySelector('#btn-change-email').addEventListener('click', () => {
      alertEl.style.display = 'none';
      showStep('email');
    });

    form.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      const email = emailInput.value.trim();

      if (step === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showAuthAlert(alertEl, 'Enter a valid email address, for example name@example.com.');
          emailInput.focus();
          return;
        }
        setBusy(true, 'Checking...');
        let methods = ['password'];
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'check_email', email }),
          });
          const json = await res.json();
          if (!json.ok) throw new Error(json.error || 'Could not check this email. Please try again.');
          methods = json.methods || ['password'];
        } catch (err) {
          setBusy(false, 'Continue');
          showAuthAlert(alertEl, err.message);
          return;
        }
        setBusy(false, 'Continue');
        // A password manager may have filled the password already: sign straight in.
        const autofilled = pwdInput.value;
        showStep(methods.includes('password') ? 'password' : 'google', email);
        if (step === 'password' && autofilled) {
          pwdInput.value = autofilled;
          form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit'));
        }
        return;
      }

      if (step !== 'password') return;
      const password = pwdInput.value;
      if (!password) {
        showAuthAlert(alertEl, 'Enter your password.');
        pwdInput.focus();
        return;
      }

      setBusy(true, 'Signing in...');
      try {
        const res = await store.login(email, password);
        if (res.state === 'needs_library') {
          window.location.hash = '#/setup-library';
        } else if (res.state === 'needs_onboarding') {
          window.location.hash = '#/onboarding';
        } else {
          window.location.hash = '#/dashboard';
        }
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Incorrect email or password.');
        pwdInput.select();
      } finally {
        setBusy(false, 'Sign in');
      }
    });
  }
}

function setupSignupEvents(container) {
  const alertEl = container.querySelector('#auth-alert');
  const googleBtn = container.querySelector('#btn-google-signup');
  const form = container.querySelector('#email-signup-form');
  const submitBtn = container.querySelector('#btn-signup-submit');

  const pwdToggle = container.querySelector('.password-toggle-btn');
  const pwdInput = container.querySelector('#reg-password');
  if (pwdToggle && pwdInput) {
    pwdToggle.addEventListener('click', () => {
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
    });
  }

  // Google Sign Up
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      alertEl.style.display = 'none';
      const termsCheck = container.querySelector('#reg-terms-check');
      if (termsCheck && !termsCheck.checked) {
        showAuthAlert(alertEl, 'Please agree to the Terms of Service to create an account.');
        termsCheck.focus();
        return;
      }

      const origHtml = googleBtn.innerHTML;
      googleBtn.disabled = true;
      googleBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Connecting to Google...</span>
      `;

      try {
        await ensureFirebaseSdk();
        const auth = window.firebase.auth();
        const provider = new window.firebase.auth.GoogleAuthProvider();
        
        googleBtn.innerHTML = `
          <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
          <span>Awaiting Google Authorization...</span>
        `;

        const result = await auth.signInWithPopup(provider);
        const idToken = await result.user.getIdToken();

        googleBtn.innerHTML = `
          <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
          <span>Creating your account...</span>
        `;

        await store.sessionFromIdToken(idToken, 'signup', null, true);
        window.location.hash = '#/setup-library';
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user') {
          // User closed popup
        } else {
          showAuthAlert(alertEl, err.message || 'Google sign up failed');
        }
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = origHtml;
      }
    });
  }

  // Email + Password Sign Up
  if (form) {
    form.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      const name = container.querySelector('#reg-name').value.trim();
      const email = container.querySelector('#reg-email').value.trim();
      const phone = container.querySelector('#reg-phone').value.trim();
      const password = container.querySelector('#reg-password').value;
      const termsAccepted = container.querySelector('#reg-terms-check').checked;

      if (!termsAccepted) {
        showAuthAlert(alertEl, 'Please agree to the Terms of Service to create an account.');
        return;
      }

      if (password.length < 10) {
        showAuthAlert(alertEl, 'Password must be at least 10 characters long.');
        return;
      }

      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Creating Account...</span>
      `;

      try {
        await store.register(name, email, password, phone, termsAccepted);
        window.location.hash = '#/setup-library';
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Registration failed');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }
}
