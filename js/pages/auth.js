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

      <!-- Email + Password Form -->
      <form id="email-login-form" class="auth-form" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="login-email">Email Address</label>
          <input type="email" id="login-email" class="input" required placeholder="name@yourlibrary.com" autocomplete="email" />
        </div>

        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label class="form-label" for="login-password">Password</label>
            <a href="#/forgot-password" class="auth-forgot-link">Forgot password?</a>
          </div>
          <div class="password-input-wrap">
            <input type="password" id="login-password" class="input" required placeholder="••••••••" autocomplete="current-password" />
            <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-email-submit">
          Sign In
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

export function renderForgotPasswordPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Reset Password</h1>
        <p class="auth-subtitle">Enter your email address to receive a password reset code.</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <!-- Step 1: Request Code -->
      <form id="forgot-request-form" class="auth-form" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-email">Email Address</label>
          <input type="email" id="reset-email" class="input" required placeholder="owner@yourlibrary.com" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-request-reset">
          Send Reset Code
        </button>
      </form>

      <!-- Step 2: Enter Code & New Password -->
      <form id="forgot-confirm-form" class="auth-form" style="display:none;" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-code">6-Digit Reset Code</label>
          <input type="text" id="reset-code" class="input" required placeholder="123456" maxlength="6" inputmode="numeric" style="letter-spacing:4px;font-weight:700;font-size:18px;text-align:center;" />
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-new-password">New Password (at least 10 chars)</label>
          <input type="password" id="reset-new-password" class="input" required placeholder="••••••••••" minlength="10" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-confirm-reset">
          Reset Password & Sign In
        </button>
      </form>

      <div class="auth-footer">
        Remember your password? <a href="#/login" class="auth-switch-link">Sign In</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const alertEl = container.querySelector('#auth-alert');
    const reqForm = container.querySelector('#forgot-request-form');
    const confForm = container.querySelector('#forgot-confirm-form');
    let emailVal = '';

    reqForm.addEventListener('submit', async () => {
      emailVal = container.querySelector('#reset-email').value.trim();
      if (!emailVal) return;

      const btn = container.querySelector('#btn-request-reset');
      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'password_reset_request', email: emailVal })
        });
        const json = await res.json();
        showAuthAlert(alertEl, json.message || 'Reset code sent! Check your inbox.', 'success');
        reqForm.style.display = 'none';
        confForm.style.display = 'block';
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Request failed');
        btn.disabled = false;
        btn.textContent = 'Send Reset Code';
      }
    });

    confForm.addEventListener('submit', async () => {
      const code = container.querySelector('#reset-code').value.trim();
      const newPassword = container.querySelector('#reset-new-password').value;

      const btn = container.querySelector('#btn-confirm-reset');
      btn.disabled = true;
      btn.textContent = 'Resetting...';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'password_reset_confirm', email: emailVal, code, newPassword })
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Failed to reset password');

        showAuthAlert(alertEl, 'Password reset successfully! Redirecting to login...', 'success');
        setTimeout(() => { window.location.hash = '#/login'; }, 1200);
      } catch (err) {
        showAuthAlert(alertEl, err.message || 'Failed to reset password');
        btn.disabled = false;
        btn.textContent = 'Reset Password & Sign In';
      }
    });
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
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
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
  if (form) {
    form.addEventListener('submit', async () => {
      alertEl.style.display = 'none';
      const email = container.querySelector('#login-email').value.trim();
      const password = container.querySelector('#login-password').value;

      if (!email || !password) {
        showAuthAlert(alertEl, 'Please enter both email and password.');
        return;
      }

      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:8px;"></span>
        <span>Signing in...</span>
      `;

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
        showAuthAlert(alertEl, err.message || 'Invalid email or password');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
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
