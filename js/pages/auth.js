// js/pages/auth.js — Dedicated Auth Pages: Login, Signup, Staff Invite, Forgot Password
// Implements Google Sign-In, Phone OTP (+91 India SMS), and Email+Password.

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

      <!-- Social & Phone Identity Options -->
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

        <button type="button" class="btn-phone" id="btn-phone-toggle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          Continue with Phone OTP
        </button>
      </div>

      <!-- Phone OTP Flow Section (Collapsible) -->
      <div id="phone-auth-section" class="phone-auth-section" style="display:none;">
        <div id="phone-input-step">
          <label class="form-label" for="phone-number-input">Mobile Number</label>
          <div class="phone-input-group">
            <span class="phone-prefix">+91</span>
            <input type="tel" id="phone-number-input" class="input" placeholder="98765 43210" maxlength="10" inputmode="numeric" />
          </div>
          <div id="recaptcha-container"></div>
          <button type="button" class="btn btn-primary btn-block" id="btn-send-otp" style="margin-top:12px;">
            Send OTP Code
          </button>
        </div>

        <div id="otp-verify-step" style="display:none;">
          <div class="otp-header">
            <span id="otp-sent-target" style="font-size:13px;color:var(--color-text-secondary);"></span>
            <button type="button" class="btn-link" id="btn-change-phone" style="font-size:12px;">Change</button>
          </div>
          <label class="form-label" for="otp-code-input" style="margin-top:12px;">Enter 6-Digit OTP</label>
          <input type="text" id="otp-code-input" class="input otp-input" placeholder="••••••" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />
          <div class="otp-footer">
            <span id="otp-timer" style="font-size:12px;color:var(--color-text-tertiary);">Resend in <b id="timer-sec">30</b>s</span>
            <button type="button" class="btn-link" id="btn-resend-otp" style="display:none;font-size:12px;">Resend Code</button>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="btn-verify-otp" style="margin-top:12px;">
            Verify & Sign In
          </button>
        </div>
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

  // Attach interactive listeners
  setTimeout(() => setupLoginEvents(container), 0);
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

      <!-- Step 1: Account Creation -->
      <div id="signup-step-1">
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
            <label class="form-label" for="reg-org-name">Library / Reading Hall Name *</label>
            <input type="text" id="reg-org-name" class="input" required placeholder="e.g. Apex Reading Lounge" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-name">Your Full Name *</label>
            <input type="text" id="reg-name" class="input" required placeholder="e.g. Rahul Sharma" autocomplete="name" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email Address *</label>
            <input type="email" id="reg-email" class="input" required placeholder="owner@yourlibrary.com" autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-phone">Mobile Number</label>
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
              <input type="checkbox" id="reg-terms-check" required style="margin-top:2px;" />
              <span>I agree to the <a href="javascript:void(0)" style="color:var(--color-primary);text-decoration:underline;">Terms of Service</a> and <a href="javascript:void(0)" style="color:var(--color-primary);text-decoration:underline;">Privacy Policy</a> (India DPDP compliant).</span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="btn-signup-submit" style="margin-top:14px;">
            Create My Library
          </button>
        </form>
      </div>

      <!-- Step 2: Create Library Details (for Google/Phone users without a library yet) -->
      <div id="signup-step-2" style="display:none;">
        <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:16px;">
          Your identity is verified! Enter your library details to complete setup:
        </p>
        <form id="create-library-form" class="auth-form" onsubmit="event.preventDefault();">
          <div class="form-group">
            <label class="form-label" for="new-lib-name">Library / Reading Hall Name *</label>
            <input type="text" id="new-lib-name" class="input" required placeholder="e.g. Apex Reading Lounge" />
          </div>

          <div class="form-group">
            <label class="form-label" for="new-lib-city">City *</label>
            <input type="text" id="new-lib-city" class="input" required placeholder="e.g. Pune" />
          </div>

          <div class="form-group">
            <label class="form-label" for="new-owner-name">Owner / Admin Name</label>
            <input type="text" id="new-owner-name" class="input" placeholder="Your name" />
          </div>

          <div class="form-group terms-checkbox-group">
            <label class="checkbox-label" style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--color-text-secondary);cursor:pointer;">
              <input type="checkbox" id="lib-terms-check" required checked style="margin-top:2px;" />
              <span>I agree to the Terms of Service and Privacy Policy.</span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="btn-create-lib-submit" style="margin-top:14px;">
            Launch Library Dashboard
          </button>
        </form>
      </div>

      <div class="auth-footer">
        Already have an account? <a href="#/login" class="auth-switch-link">Sign In</a>
      </div>
    </div>
  `;

  setTimeout(() => setupSignupEvents(container), 0);
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
        <p class="auth-subtitle" id="invite-subheading">Loading invitation details...</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <div id="invite-card-content" style="display:none;">
        <div class="invite-info-box" style="padding:16px;background:var(--color-bg-secondary);border-radius:12px;margin-bottom:20px;border:1px solid var(--color-border);">
          <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;">Invited to join</div>
          <div id="invite-org-name" style="font-size:18px;font-weight:700;color:var(--color-text-primary);margin-top:2px;"></div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <span id="invite-role-badge" class="badge badge-primary" style="text-transform:capitalize;"></span>
            <span id="invite-recipient" style="font-size:12px;color:var(--color-text-secondary);"></span>
          </div>
        </div>

        <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:16px;">
          To accept this invitation, sign in with your verified Google account or phone number:
        </p>

        <div class="auth-identity-buttons">
          <button type="button" class="btn-google" id="btn-invite-google">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Accept with Google
          </button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => setupInviteEvents(container, token), 0);
  return container;
}

export function renderForgotPasswordPage() {
  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Reset password</h1>
        <p class="auth-subtitle">Enter your account email to receive a password reset link.</p>
      </div>

      <div id="auth-alert" class="auth-alert" style="display:none;" role="alert" aria-live="assertive"></div>

      <form id="forgot-form" class="auth-form" onsubmit="event.preventDefault();">
        <div class="form-group">
          <label class="form-label" for="reset-email">Email Address</label>
          <input type="email" id="reset-email" class="input" required placeholder="owner@yourlibrary.com" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="btn-reset-submit" style="margin-top:12px;">
          Send Reset Instructions
        </button>
      </form>

      <div class="auth-footer">
        Remember your password? <a href="#/login" class="auth-switch-link">Back to Sign In</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    const form = container.querySelector('#forgot-form');
    const emailInput = container.querySelector('#reset-email');
    const alertBox = container.querySelector('#auth-alert');
    const btn = container.querySelector('#btn-reset-submit');

    form?.addEventListener('submit', async () => {
      const email = emailInput?.value?.trim();
      if (!email) return;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'password_reset', email }),
        });
        const json = await res.json();
        alertBox.className = 'auth-alert alert-success';
        alertBox.textContent = json.message || 'If an account exists with this email, instructions have been sent.';
        alertBox.style.display = 'block';
        form.reset();
      } catch (e) {
        alertBox.className = 'auth-alert alert-error';
        alertBox.textContent = e.message || 'Unable to process reset request.';
        alertBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Instructions';
      }
    });
  }, 0);

  return container;
}

// ── Event Handlers ─────────────────────────────────────────────────────────

function showAlert(container, msg, type = 'error') {
  const alertBox = container.querySelector('#auth-alert');
  if (!alertBox) return;
  alertBox.className = `auth-alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
}

function clearAlert(container) {
  const alertBox = container.querySelector('#auth-alert');
  if (alertBox) alertBox.style.display = 'none';
}

function setupLoginEvents(container) {
  // Password show/hide toggle
  const toggleBtn = container.querySelector('.password-toggle-btn');
  const pwdInput = container.querySelector('#login-password');
  toggleBtn?.addEventListener('click', () => {
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
  });

  // Email form submit
  const emailForm = container.querySelector('#email-login-form');
  const emailSubmitBtn = container.querySelector('#btn-email-submit');
  emailForm?.addEventListener('submit', async () => {
    const email = container.querySelector('#login-email')?.value?.trim();
    const password = pwdInput?.value;
    if (!email || !password) return;

    emailSubmitBtn.disabled = true;
    emailSubmitBtn.textContent = 'Signing in...';
    clearAlert(container);

    try {
      const res = await store.login(email, password);
      toast.show(`Welcome back, ${res.user.name || 'User'}!`, 'success');
      window.location.hash = res.organization?.onboardingCompleted === false ? '#/dashboard' : '#/dashboard';
      if (typeof app !== 'undefined') app._navigate();
    } catch (e) {
      showAlert(container, e.message || 'Invalid email or password.');
    } finally {
      emailSubmitBtn.disabled = false;
      emailSubmitBtn.textContent = 'Sign In';
    }
  });

  // Phone section toggle
  const phoneToggleBtn = container.querySelector('#btn-phone-toggle');
  const phoneSection = container.querySelector('#phone-auth-section');
  phoneToggleBtn?.addEventListener('click', () => {
    phoneSection.style.display = phoneSection.style.display === 'none' ? 'block' : 'none';
  });

  // Google Sign-In
  const googleBtn = container.querySelector('#btn-google-login');
  googleBtn?.addEventListener('click', async () => {
    googleBtn.disabled = true;
    clearAlert(container);
    try {
      await initiateGoogleSignIn(container);
    } catch (e) {
      showAlert(container, e.message || 'Google sign-in failed.');
      googleBtn.disabled = false;
    }
  });

  // Phone OTP Flow
  setupPhoneOtpFlow(container);
}

function setupSignupEvents(container) {
  const toggleBtn = container.querySelector('.password-toggle-btn');
  const pwdInput = container.querySelector('#reg-password');
  toggleBtn?.addEventListener('click', () => {
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
  });

  // Email Signup Form
  const form = container.querySelector('#email-signup-form');
  const submitBtn = container.querySelector('#btn-signup-submit');
  form?.addEventListener('submit', async () => {
    const orgName = container.querySelector('#reg-org-name')?.value?.trim();
    const name = container.querySelector('#reg-name')?.value?.trim();
    const email = container.querySelector('#reg-email')?.value?.trim();
    const phone = container.querySelector('#reg-phone')?.value?.trim();
    const password = pwdInput?.value;
    const termsChecked = container.querySelector('#reg-terms-check')?.checked;

    if (!termsChecked) {
      showAlert(container, 'Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating library...';
    clearAlert(container);

    try {
      await store.register(orgName, name, email, password, phone ? `+91${phone}` : '');
      toast.show('Library created! Welcome to StudyFlow.', 'success');
      window.location.hash = '#/dashboard';
      if (typeof app !== 'undefined') app._navigate();
    } catch (e) {
      showAlert(container, e.message || 'Registration failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create My Library';
    }
  });

  // Google Signup
  const googleBtn = container.querySelector('#btn-google-signup');
  googleBtn?.addEventListener('click', async () => {
    googleBtn.disabled = true;
    clearAlert(container);
    try {
      await initiateGoogleSignIn(container, true /* isSignup */);
    } catch (e) {
      showAlert(container, e.message || 'Google sign-up failed.');
      googleBtn.disabled = false;
    }
  });

  // Create Library Form (Step 2)
  const libForm = container.querySelector('#create-library-form');
  const libSubmitBtn = container.querySelector('#btn-create-lib-submit');
  libForm?.addEventListener('submit', async () => {
    const orgName = container.querySelector('#new-lib-name')?.value?.trim();
    const city = container.querySelector('#new-lib-city')?.value?.trim();
    const name = container.querySelector('#new-owner-name')?.value?.trim();

    libSubmitBtn.disabled = true;
    libSubmitBtn.textContent = 'Setting up library...';
    clearAlert(container);

    try {
      await store.createLibrary({ orgName, city, name });
      toast.show('Library ready! Welcome aboard.', 'success');
      window.location.hash = '#/dashboard';
      if (typeof app !== 'undefined') app._navigate();
    } catch (e) {
      showAlert(container, e.message || 'Failed to create library.');
    } finally {
      libSubmitBtn.disabled = false;
      libSubmitBtn.textContent = 'Launch Library Dashboard';
    }
  });
}

function setupInviteEvents(container, token) {
  const subheading = container.querySelector('#invite-subheading');
  const content = container.querySelector('#invite-card-content');
  const orgNameEl = container.querySelector('#invite-org-name');
  const roleEl = container.querySelector('#invite-role-badge');
  const recipientEl = container.querySelector('#invite-recipient');
  const googleBtn = container.querySelector('#btn-invite-google');

  // Load invitation public info
  fetch(`/api/auth?action=invitation_info&token=${encodeURIComponent(token)}`)
    .then(r => r.json())
    .then(data => {
      if (!data.ok) {
        subheading.textContent = data.error || 'Invitation is invalid or expired.';
        return;
      }
      subheading.textContent = 'You have been invited to join as staff';
      orgNameEl.textContent = data.organizationName;
      roleEl.textContent = data.role;
      recipientEl.textContent = data.email || data.phone || '';
      content.style.display = 'block';
    })
    .catch(err => {
      subheading.textContent = 'Unable to load invitation details.';
    });

  googleBtn?.addEventListener('click', async () => {
    googleBtn.disabled = true;
    clearAlert(container);
    try {
      await initiateGoogleSignIn(container, false);
      // Once signed in, accept the invite
      const acceptRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'accept_invitation', token }),
      });
      const acceptJson = await acceptRes.json();
      if (!acceptJson.ok) throw new Error(acceptJson.error || 'Failed to accept invitation');

      toast.show('Invitation accepted! Welcome to the team.', 'success');
      await store.load();
      window.location.hash = '#/dashboard';
      if (typeof app !== 'undefined') app._navigate();
    } catch (e) {
      showAlert(container, e.message || 'Failed to accept invitation.');
      googleBtn.disabled = false;
    }
  });
}

// ── Firebase Helpers ───────────────────────────────────────────────────────

let confirmationResult = null;

async function initiateGoogleSignIn(container, isSignup = false) {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    throw new Error('Google Sign-In is initializing. If you are developing locally, please ensure Firebase configuration is set.');
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  const result = await firebase.auth().signInWithPopup(provider);
  const idToken = await result.user.getIdToken();

  const sessionRes = await store.sessionFromIdToken(idToken);
  if (sessionRes.needsLibrary) {
    // Switch to step 2 in signup
    const step1 = container.querySelector('#signup-step-1');
    const step2 = container.querySelector('#signup-step-2');
    if (step1 && step2) {
      step1.style.display = 'none';
      step2.style.display = 'block';
      const nameInput = container.querySelector('#new-owner-name');
      if (nameInput && result.user.displayName) nameInput.value = result.user.displayName;
      return;
    }
  }

  toast.show(`Signed in as ${result.user.displayName || result.user.email}!`, 'success');
  window.location.hash = '#/dashboard';
  if (typeof app !== 'undefined') app._navigate();
}

function setupPhoneOtpFlow(container) {
  const phoneInput = container.querySelector('#phone-number-input');
  const sendBtn = container.querySelector('#btn-send-otp');
  const otpInput = container.querySelector('#otp-code-input');
  const verifyBtn = container.querySelector('#btn-verify-otp');
  const changeBtn = container.querySelector('#btn-change-phone');
  const resendBtn = container.querySelector('#btn-resend-otp');
  const inputStep = container.querySelector('#phone-input-step');
  const verifyStep = container.querySelector('#otp-verify-step');
  const targetLabel = container.querySelector('#otp-sent-target');
  const timerSec = container.querySelector('#timer-sec');
  const timerWrap = container.querySelector('#otp-timer');

  let countdownInterval = null;

  function startTimer(seconds = 30) {
    let remaining = seconds;
    timerWrap.style.display = 'inline';
    resendBtn.style.display = 'none';
    timerSec.textContent = remaining;

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      remaining--;
      timerSec.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        timerWrap.style.display = 'none';
        resendBtn.style.display = 'inline';
      }
    }, 1000);
  }

  sendBtn?.addEventListener('click', async () => {
    const rawDigits = phoneInput.value.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      showAlert(container, 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const fullPhone = `+91${rawDigits}`;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending SMS...';
    clearAlert(container);

    try {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error('Phone authentication service is not initialized.');
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
        });
      }

      confirmationResult = await firebase.auth().signInWithPhoneNumber(fullPhone, window.recaptchaVerifier);
      inputStep.style.display = 'none';
      verifyStep.style.display = 'block';
      targetLabel.textContent = `Code sent to +91 ${rawDigits.slice(0, 2)}••••••${rawDigits.slice(-2)}`;
      startTimer(30);
      otpInput.focus();
    } catch (e) {
      showAlert(container, e.message || 'Failed to send OTP code.');
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.render().then(id => grecaptcha.reset(id)); } catch (_) {}
      }
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send OTP Code';
    }
  });

  changeBtn?.addEventListener('click', () => {
    verifyStep.style.display = 'none';
    inputStep.style.display = 'block';
    clearInterval(countdownInterval);
  });

  resendBtn?.addEventListener('click', () => {
    sendBtn?.click();
  });

  // Auto-submit OTP on 6 digits
  otpInput?.addEventListener('input', () => {
    const val = otpInput.value.replace(/\D/g, '');
    otpInput.value = val;
    if (val.length === 6) {
      verifyBtn?.click();
    }
  });

  verifyBtn?.addEventListener('click', async () => {
    const code = otpInput.value.trim();
    if (code.length !== 6) {
      showAlert(container, 'Please enter the 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      showAlert(container, 'Please request an OTP first.');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    clearAlert(container);

    try {
      const result = await confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();
      const sessionRes = await store.sessionFromIdToken(idToken);

      toast.show('Signed in successfully!', 'success');
      window.location.hash = sessionRes.needsLibrary ? '#/signup' : '#/dashboard';
      if (typeof app !== 'undefined') app._navigate();
    } catch (e) {
      showAlert(container, e.message || 'Incorrect OTP code. Please try again.');
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Sign In';
    }
  });
}
