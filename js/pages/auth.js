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

      <!-- Email + password sign in -->
      <form id="email-login-form" class="auth-form" novalidate onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="login-email">Email address</label>
          <input type="email" id="login-email" class="input" required placeholder="name@yourlibrary.com" autocomplete="username email" autocapitalize="off" spellcheck="false" />
        </div>

        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label class="form-label" for="login-password">Password</label>
            <a href="#/forgot-password" class="auth-forgot-link" id="login-forgot-link">Forgot password?</a>
          </div>
          <div class="password-input-wrap">
            <input type="password" id="login-password" class="input" required placeholder="Enter your password" autocomplete="current-password" />
            <button type="button" class="password-toggle-btn" aria-label="Show password" aria-pressed="false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-email-submit">Sign in</button>
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

      <form id="email-signup-form" class="auth-form" novalidate onsubmit="event.preventDefault();">
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

        <div class="form-group">
          <label class="form-label" for="reg-password-confirm">Confirm Password *</label>
          <input type="password" id="reg-password-confirm" class="input" required placeholder="Type the same password again" minlength="10" autocomplete="new-password" />
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
  // If passwords are disabled, redirect to login page immediately
  getClientConfig().then((config) => {
    if (config?.authMethods?.password === false) {
      window.location.hash = '#/login';
    }
  }).catch(() => {});

  const isSetMode = params.mode === 'set';
  const prefillEmail = String(params.email || '');
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  const eyeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const spinner = '<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">${isSetMode ? 'Set a password' : 'Reset your password'}</h1>
        <p class="auth-subtitle" id="forgot-subtitle">${isSetMode
          ? 'We will email you a 6-digit code to confirm it is you. After that you can sign in with your email and password as well as with Google.'
          : 'Enter the email you use for StudyFlow and we will send you a 6-digit code.'}</p>
      </div>

      <ol class="auth-steps" aria-label="Progress" style="display:flex;gap:6px;list-style:none;padding:0;margin:0 0 16px;">
        <li data-step="1" style="flex:1;height:4px;border-radius:2px;background:var(--color-primary);"></li>
        <li data-step="2" style="flex:1;height:4px;border-radius:2px;background:var(--color-border);"></li>
        <li data-step="3" style="flex:1;height:4px;border-radius:2px;background:var(--color-border);"></li>
      </ol>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <!-- Step 1: email -->
      <form id="forgot-request-form" class="auth-form" novalidate onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-email">Email address</label>
          <input type="email" id="reset-email" class="input" required placeholder="name@yourlibrary.com" autocomplete="username email" autocapitalize="off" spellcheck="false" value="${utils.escapeAttr(prefillEmail)}" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-request-reset">Send code</button>
      </form>

      <!-- Step 2: verify the code -->
      <form id="forgot-verify-form" class="auth-form" style="display:none;" novalidate onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-code">6-digit code</label>
          <input type="text" id="reset-code" class="input" required placeholder="••••••" maxlength="6" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" style="letter-spacing:10px;font-weight:700;font-size:22px;text-align:center;" />
          <p style="margin:8px 0 0;font-size:12px;color:var(--color-text-secondary);line-height:1.5;">
            Not in your inbox? Check <strong>Spam</strong> and <strong>Promotions</strong>. Only the code from the most recent email works.
          </p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-verify-code">Verify code</button>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:12px;">
          <button type="button" id="btn-use-other-email" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:0;">Use a different email</button>
          <button type="button" id="btn-resend-code" style="background:none;border:none;color:var(--color-primary);font-weight:600;cursor:pointer;padding:0;" disabled>Resend code</button>
        </div>
      </form>

      <!-- Step 3: new password (only after the code is verified) -->
      <form id="forgot-password-form" class="auth-form" style="display:none;" novalidate onsubmit="event.preventDefault();">
        <input type="email" id="reset-email-hidden" autocomplete="username" style="display:none;" tabindex="-1" aria-hidden="true" />
        <div class="form-group">
          <label class="form-label" for="reset-new-password">New password</label>
          <div class="password-input-wrap">
            <input type="password" id="reset-new-password" class="input" required minlength="10" autocomplete="new-password" placeholder="At least 10 characters" />
            <button type="button" class="password-toggle-btn" data-target="reset-new-password" aria-label="Show password">${eyeIcon}</button>
          </div>
          <div id="pwd-length-hint" style="margin-top:6px;font-size:12px;color:var(--color-text-tertiary);">At least 10 characters</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-confirm-password">Confirm new password</label>
          <div class="password-input-wrap">
            <input type="password" id="reset-confirm-password" class="input" required minlength="10" autocomplete="new-password" placeholder="Type the same password again" />
            <button type="button" class="password-toggle-btn" data-target="reset-confirm-password" aria-label="Show password">${eyeIcon}</button>
          </div>
          <div id="pwd-match-hint" style="margin-top:6px;font-size:12px;min-height:16px;"></div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-set-password">${isSetMode ? 'Set password &amp; sign in' : 'Reset password &amp; sign in'}</button>
      </form>

      <div class="auth-footer">
        <a href="#/login" class="auth-switch-link">Back to sign in</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const $ = (sel) => container.querySelector(sel);
    const alertEl = $('#auth-alert');
    const subtitle = $('#forgot-subtitle');
    const forms = { 1: $('#forgot-request-form'), 2: $('#forgot-verify-form'), 3: $('#forgot-password-form') };
    const emailInput = $('#reset-email');
    const codeInput = $('#reset-code');
    const pwdInput = $('#reset-new-password');
    const confirmInput = $('#reset-confirm-password');
    const resendBtn = $('#btn-resend-code');
    let setMode = isSetMode;

    // Accounts created with Google have no password yet: word the page as "Set a password".
    const applySetMode = () => {
      setMode = true;
      container.querySelector('.auth-title').textContent = 'Set a password';
      const setBtn = $('#btn-set-password');
      setBtn.innerHTML = 'Set password &amp; sign in';
      setBtn.dataset.label = setBtn.innerHTML;
    };
    const detectGoogleOnly = async (email) => {
      if (setMode) return;
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'check_email', email }),
        });
        const json = await res.json();
        if (json.ok && Array.isArray(json.methods) && !json.methods.includes('password')) applySetMode();
      } catch (_) { /* wording only; ignore */ }
    };
    let emailVal = '';
    let resetToken = '';
    let cooldownTimer = null;

    const hideAlert = () => { alertEl.style.display = 'none'; };
    const busy = (btn, on, label) => {
      if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
      btn.disabled = on;
      btn.innerHTML = on ? `${spinner}<span>${label}</span>` : btn.dataset.label;
    };
    const showStep = (n) => {
      Object.entries(forms).forEach(([k, f]) => { f.style.display = Number(k) === n ? 'block' : 'none'; });
      container.querySelectorAll('.auth-steps li').forEach(li => {
        li.style.background = Number(li.dataset.step) <= n ? 'var(--color-primary)' : 'var(--color-border)';
      });
    };
    const post = async (body) => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        const err = new Error(json.error || 'Something went wrong. Please try again.');
        err.code = json.code;
        throw err;
      }
      return json;
    };

    container.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = $('#' + btn.dataset.target);
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

    // Step 1 → send the code
    forms[1].addEventListener('submit', async () => {
      hideAlert();
      emailVal = emailInput.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showAuthAlert(alertEl, 'Enter a valid email address, for example name@example.com.');
        emailInput.focus();
        return;
      }
      const btn = $('#btn-request-reset');
      busy(btn, true, 'Sending code...');
      try {
        const [json] = await Promise.all([
          post({ action: 'password_reset_request', email: emailVal }),
          detectGoogleOnly(emailVal),
        ]);
        showAuthAlert(alertEl, json.message || 'If an account exists for this email, we have sent a code.', 'success');
        subtitle.textContent = 'Enter the 6-digit code we emailed to ' + emailVal + '.';
        codeInput.value = '';
        showStep(2);
        codeInput.focus();
        startCooldown(60);
      } catch (err) {
        showAuthAlert(alertEl, err.message);
      } finally {
        busy(btn, false);
      }
    });

    resendBtn.addEventListener('click', async () => {
      hideAlert();
      resendBtn.disabled = true;
      try {
        const json = await post({ action: 'password_reset_request', email: emailVal });
        showAuthAlert(alertEl, (json.message || 'A new code has been sent.') + ' Earlier codes no longer work.', 'success');
        codeInput.value = '';
        codeInput.focus();
        startCooldown(60);
      } catch (err) {
        showAuthAlert(alertEl, err.message);
        resendBtn.disabled = false;
      }
    });

    $('#btn-use-other-email').addEventListener('click', () => {
      clearInterval(cooldownTimer);
      hideAlert();
      showStep(1);
      emailInput.focus();
    });

    // Step 2 → verify the code (auto-submits at 6 digits)
    let verifying = false;
    const verifyCode = async () => {
      if (verifying) return;
      hideAlert();
      const code = codeInput.value.replace(/\D/g, '');
      if (code.length !== 6) {
        showAuthAlert(alertEl, 'Enter the 6-digit code from the email.');
        codeInput.focus();
        return;
      }
      verifying = true;
      const btn = $('#btn-verify-code');
      busy(btn, true, 'Verifying...');
      try {
        const json = await post({ action: 'password_reset_verify', email: emailVal, code });
        resetToken = json.resetToken;
        clearInterval(cooldownTimer);
        showAuthAlert(alertEl, 'Code verified. Now choose your new password.', 'success');
        subtitle.textContent = 'Choose a new password for ' + emailVal + '.';
        $('#reset-email-hidden').value = emailVal;
        showStep(3);
        pwdInput.focus();
      } catch (err) {
        showAuthAlert(alertEl, err.message);
        codeInput.select();
      } finally {
        verifying = false;
        busy(btn, false);
      }
    };
    forms[2].addEventListener('submit', verifyCode);
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
      if (codeInput.value.length === 6) verifyCode();
    });

    // Step 3 → live checks, then set the password and sign in
    const updateHints = () => {
      const len = pwdInput.value.length;
      const lenHint = $('#pwd-length-hint');
      lenHint.textContent = len >= 10 ? '✓ Length looks good' : `At least 10 characters (${len}/10)`;
      lenHint.style.color = len >= 10 ? 'var(--sf-success-600, #079455)' : 'var(--color-text-tertiary)';
      const matchHint = $('#pwd-match-hint');
      if (!confirmInput.value) { matchHint.textContent = ''; return; }
      const same = confirmInput.value === pwdInput.value;
      matchHint.textContent = same ? '✓ Passwords match' : 'Passwords do not match';
      matchHint.style.color = same ? 'var(--sf-success-600, #079455)' : 'var(--sf-error-600, #d92d20)';
    };
    pwdInput.addEventListener('input', updateHints);
    confirmInput.addEventListener('input', updateHints);

    forms[3].addEventListener('submit', async () => {
      hideAlert();
      const newPassword = pwdInput.value;
      if (newPassword.length < 10) return showAuthAlert(alertEl, 'Your new password must be at least 10 characters.');
      if (newPassword !== confirmInput.value) return showAuthAlert(alertEl, 'The two passwords do not match.');

      const btn = $('#btn-set-password');
      busy(btn, true, 'Saving password...');
      try {
        const json = await post({ action: 'password_reset_confirm', email: emailVal, resetToken, newPassword });
        showAuthAlert(alertEl, json.message || 'Your password has been set. Signing you in...', 'success');
        const target = json.state === 'needs_library' ? '#/setup-library'
          : json.state === 'needs_onboarding' ? '#/onboarding'
          : '#/dashboard';
        // Full reload so the whole app starts fresh with the new signed-in session.
        setTimeout(() => {
          window.location.hash = target;
          window.location.reload();
        }, 600);
      } catch (err) {
        busy(btn, false);
        if (err.code === 'RESET_EXPIRED') {
          showAuthAlert(alertEl, err.message);
          resetToken = '';
          showStep(1);
          return;
        }
        showAuthAlert(alertEl, err.message);
      }
    });

    // "Set a password" from the login page sends the code immediately (one click, not two).
    if (params.autosend && EMAIL_RE.test(prefillEmail)) {
      forms[1].requestSubmit ? forms[1].requestSubmit() : forms[1].dispatchEvent(new Event('submit'));
    } else if (prefillEmail) {
      $('#btn-request-reset').focus();
    } else {
      emailInput.focus();
    }
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

// ── Firebase Client SDK Loader & Client Config ──────────────────────────────
let clientConfigPromise = null;

async function getClientConfig() {
  if (clientConfigPromise) return clientConfigPromise;
  clientConfigPromise = (async () => {
    try {
      const configRes = await fetch('/api/auth?action=client_config');
      const configData = await configRes.json();
      if (configData.ok) return configData;
    } catch (_) {}
    return { authMethods: { google: true, password: false } };
  })();
  return clientConfigPromise;
}

let firebaseInitPromise = null;

async function ensureFirebaseSdk() {
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    return window.firebase;
  }
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    const configData = await getClientConfig();
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

function showAuthAlert(alertEl, message, type = 'error', { html = false } = {}) {
  if (!alertEl) return;
  if (html) alertEl.innerHTML = message; else alertEl.textContent = message;
  alertEl.className = `auth-alert ${type === 'success' ? 'alert-success' : 'alert-error'}`;
  alertEl.removeAttribute('style'); // drop inline styles left by custom panels
  alertEl.style.display = 'block';
  if (type !== 'success') {
    const card = alertEl.closest('.auth-card');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // restart the animation
      card.classList.add('shake');
    }
  }
  const rect = alertEl.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > window.innerHeight) alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Field-level error: red border + message under the field (or under its password wrapper).
function setFieldError(input, message) {
  if (!input) return;
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  const anchor = input.closest('.password-input-wrap, .phone-input-group') || input;
  let msg = anchor.parentElement.querySelector(`.auth-field-error[data-for="${input.id}"]`);
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'auth-field-error';
    msg.dataset.for = input.id;
    msg.id = `${input.id}-error`;
    anchor.insertAdjacentElement('afterend', msg);
    input.setAttribute('aria-describedby', msg.id);
  }
  msg.textContent = message;
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove('is-invalid');
  input.removeAttribute('aria-invalid');
  const anchor = input.closest('.password-input-wrap, .phone-input-group') || input;
  anchor.parentElement.querySelector(`.auth-field-error[data-for="${input.id}"]`)?.remove();
}

function clearAllFieldErrors(root) {
  root.querySelectorAll('.input.is-invalid').forEach(clearFieldError);
}

// Clears a field's error as soon as the user edits it.
function clearErrorOnInput(root) {
  root.querySelectorAll('.auth-form .input').forEach(input => {
    input.addEventListener('input', () => clearFieldError(input));
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth and turn every failure into a readable message with status + code.
async function postAuth(body) {
  let res;
  try {
    res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
  } catch (_) {
    const err = new Error('Can\'t reach StudyFlow. Check your internet connection and try again.');
    err.code = 'NETWORK';
    throw err;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const err = new Error(json.error || (res.status >= 500
      ? 'Something went wrong on our side. Please try again in a moment.'
      : 'Request failed. Please try again.'));
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json;
}

function setupLoginEvents(container) {
  const alertEl = container.querySelector('#auth-alert');
  const googleBtn = container.querySelector('#btn-google-login');
  const form = container.querySelector('#email-login-form');
  const divider = container.querySelector('.auth-divider');
  const submitBtn = container.querySelector('#btn-email-submit');

  // Adapt UI if password authentication is switched off
  getClientConfig().then((config) => {
    if (config?.authMethods?.password === false) {
      if (form) form.style.display = 'none';
      if (divider) divider.style.display = 'none';
      let note = container.querySelector('.auth-google-only-note');
      if (!note) {
        note = document.createElement('p');
        note.className = 'auth-google-only-note';
        note.style.cssText = 'text-align:center;font-size:13px;color:var(--color-text-secondary);margin-top:16px;line-height:1.5;';
        note.textContent = 'StudyFlow uses your Google account to sign in securely.';
        const identityBtns = container.querySelector('.auth-identity-buttons');
        if (identityBtns) identityBtns.insertAdjacentElement('afterend', note);
      }
    }
  }).catch(() => {});

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
  // Email + password sign in with field-level validation and a clear message for every outcome.
  if (form) {
    const emailInput = container.querySelector('#login-email');
    const forgotLink = container.querySelector('#login-forgot-link');
    const idleLabel = 'Sign in';
    clearErrorOnInput(container);

    // Keep "Forgot password?" pointed at whatever email is typed.
    const syncForgotLink = () => {
      const email = emailInput.value.trim();
      forgotLink.setAttribute('href', EMAIL_RE.test(email) ? `#/forgot-password?email=${encodeURIComponent(email)}` : '#/forgot-password');
    };
    emailInput.addEventListener('input', syncForgotLink);

    form.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      clearAllFieldErrors(container);
      const email = emailInput.value.trim();
      const password = pwdInput.value;

      let firstInvalid = null;
      if (!email) {
        setFieldError(emailInput, 'Enter your email address.');
        firstInvalid = firstInvalid || emailInput;
      } else if (!EMAIL_RE.test(email)) {
        setFieldError(emailInput, 'Enter a valid email address, for example name@example.com.');
        firstInvalid = firstInvalid || emailInput;
      }
      if (!password) {
        setFieldError(pwdInput, 'Enter your password.');
        firstInvalid = firstInvalid || pwdInput;
      }
      if (firstInvalid) {
        showAuthAlert(alertEl, 'Please fix the highlighted fields.');
        firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span><span>Signing in...</span>';

      try {
        const res = await postAuth({ action: 'login', email, password });
        store._loaded = false;
        await store.load();
        const state = res.state || store.authState;
        window.location.hash = state === 'needs_library' ? '#/setup-library'
          : state === 'needs_onboarding' ? '#/onboarding'
          : '#/dashboard';
      } catch (err) {
        const setPwdHref = `#/forgot-password?mode=set&email=${encodeURIComponent(email)}`;
        const resetHref = `#/forgot-password?email=${encodeURIComponent(email)}`;
        if (err.code === 'INVALID_CREDENTIALS') {
          setFieldError(pwdInput, 'Incorrect email or password.');
          showAuthAlert(alertEl,
            `The email or password you entered is incorrect. Please try again, or <a href="${resetHref}">reset your password</a>.`,
            'error', { html: true });
          pwdInput.value = '';
          pwdInput.focus();
        } else if (err.code === 'USE_GOOGLE') {
          // Account was created with Google and has no password yet: offer both ways forward.
          pwdInput.value = '';
          alertEl.className = 'auth-alert';
          alertEl.style.cssText = 'display:block;border:1px solid var(--color-border);background:var(--color-bg-secondary);color:var(--color-text-primary);';
          alertEl.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">This account uses Google sign-in</div>
            <div style="color:var(--color-text-secondary);margin-bottom:12px;">
              <strong>${utils.escapeHtml(email)}</strong> was created with Google, so it doesn't have a password yet.
              Continue with Google, or set a password to sign in with email too.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-use-google-instead">Continue with Google</button>
              <a class="btn btn-secondary btn-sm" href="${setPwdHref}&autosend=1">Set a password</a>
            </div>`;
          container.querySelector('#btn-use-google-instead')?.addEventListener('click', () => googleBtn?.click());
        } else if (err.status === 429) {
          showAuthAlert(alertEl, `Too many sign-in attempts. ${err.message.replace(/^Too many requests\.\s*/i, '')} You can also reset your password.`);
        } else if (err.code === 'ACCOUNT_DISABLED') {
          showAuthAlert(alertEl, 'This account has been disabled. Please contact your library owner or support.');
        } else {
          showAuthAlert(alertEl, err.message || 'Sign in failed. Please try again.');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = idleLabel;
      }
    });
  }
}

function setupSignupEvents(container) {
  const alertEl = container.querySelector('#auth-alert');
  const googleBtn = container.querySelector('#btn-google-signup');
  const form = container.querySelector('#email-signup-form');
  const divider = container.querySelector('.auth-divider');
  const submitBtn = container.querySelector('#btn-signup-submit');

  // Adapt UI if password authentication is switched off
  getClientConfig().then((config) => {
    if (config?.authMethods?.password === false) {
      if (form) form.style.display = 'none';
      if (divider) divider.style.display = 'none';
      let note = container.querySelector('.auth-google-only-note');
      if (!note) {
        note = document.createElement('p');
        note.className = 'auth-google-only-note';
        note.style.cssText = 'text-align:center;font-size:13px;color:var(--color-text-secondary);margin-top:16px;line-height:1.5;';
        note.textContent = 'StudyFlow uses your Google account to sign in securely.';
        const identityBtns = container.querySelector('.auth-identity-buttons');
        if (identityBtns) identityBtns.insertAdjacentElement('afterend', note);
      }
    }
  }).catch(() => {});

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
    clearErrorOnInput(container);
    form.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      clearAllFieldErrors(container);
      const nameInput = container.querySelector('#reg-name');
      const emailInput = container.querySelector('#reg-email');
      const phoneInput = container.querySelector('#reg-phone');
      const passwordInput = container.querySelector('#reg-password');
      const confirmInput = container.querySelector('#reg-password-confirm');
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.replace(/\D/g, '');
      const password = passwordInput.value;
      const termsAccepted = container.querySelector('#reg-terms-check').checked;

      const errors = [];
      const fail = (input, msg) => { setFieldError(input, msg); errors.push(input); };
      if (name.length < 2) fail(nameInput, 'Enter your full name.');
      if (!email) fail(emailInput, 'Enter your email address.');
      else if (!EMAIL_RE.test(email)) fail(emailInput, 'Enter a valid email address, for example name@example.com.');
      if (phone && phone.length !== 10) fail(phoneInput, 'Enter a 10-digit mobile number, or leave it empty.');
      if (password.length < 10) fail(passwordInput, 'Password must be at least 10 characters long.');
      if (!confirmInput.value) fail(confirmInput, 'Type your password again to confirm it.');
      else if (confirmInput.value !== password) fail(confirmInput, 'Passwords do not match.');

      if (errors.length) {
        showAuthAlert(alertEl, 'Please fix the highlighted fields.');
        errors[0].focus();
        return;
      }
      if (!termsAccepted) {
        showAuthAlert(alertEl, 'Please agree to the Terms of Service and Privacy Policy to create an account.');
        container.querySelector('#reg-terms-check').focus();
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
        const message = err.message || 'Registration failed. Please try again.';
        if (/already exists/i.test(message)) {
          setFieldError(container.querySelector('#reg-email'), 'This email is already registered.');
          showAuthAlert(alertEl,
            `An account with this email already exists. <a href="#/login">Sign in</a> or <a href="#/forgot-password?email=${encodeURIComponent(email)}">reset your password</a>.`,
            'error', { html: true });
        } else if (/password/i.test(message)) {
          setFieldError(container.querySelector('#reg-password'), message);
          showAuthAlert(alertEl, message);
        } else if (err instanceof TypeError) {
          showAuthAlert(alertEl, 'Can\'t reach StudyFlow. Check your internet connection and try again.');
        } else {
          showAuthAlert(alertEl, message);
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }
}
