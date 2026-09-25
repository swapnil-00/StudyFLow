// StudyFlow Application — Main Entry Point

// ── Router ─────────────────────────────────────────────────────────
const routes = {
  '/landing': () => import('./pages/landing.js').then(m => m.renderLanding),
  '/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard),
  '/seat-map': () => import('./pages/seat-map.js').then(m => m.renderSeatMap),
  '/students': () => import('./pages/students.js').then(m => m.renderStudents),
  '/student': () => import('./pages/student-profile.js').then(m => m.renderStudentProfile),
  '/memberships': () => import('./pages/memberships.js').then(m => m.renderMemberships),
  '/payments': () => import('./pages/payments.js').then(m => m.renderPayments),
  '/floors': () => import('./pages/floors.js').then(m => m.renderFloors),
  '/expenses': () => import('./pages/expenses.js').then(m => m.renderExpenses),
  '/reports': () => import('./pages/reports.js').then(m => m.renderReports),
  '/staff': () => import('./pages/staff.js').then(m => m.renderStaff),
  '/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications),
  '/activity': () => import('./pages/activity.js').then(m => m.renderActivity),
  '/settings': () => import('./pages/settings.js').then(m => m.renderSettings),
  '/layout-editor': () => import('./pages/layout-editor.js').then(m => m.renderLayoutEditor),
};

class App {
  constructor() {
    this.currentRoute = null;
    this.sidebarCollapsed = false; // in-memory, resets to expanded on reload
    this._themeInit();
  }

  async init() {
    // Load all data from Neon DB before rendering
    await store.load();

    this._render();
    this._setupRouter();
    this._navigate();

    // Subscribe to store changes for reactive updates
    store.subscribe(() => {
      this._updateNotifBadge();
      this._updateBranchName();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.openSpotlight();
      }
      if (e.key === 'Escape') {
        this.closeAllOverlays();
      }
    });

    if (typeof dismissAppLoader === 'function') {
      dismissAppLoader();
    }

    // Automatically prompt onboarding if new organization has 0 branches or hasn't completed setup
    const org = store.organization;
    if (store.isAuthenticated() && org && (!org.onboardingCompleted || store.getBranches().length === 0)) {
      setTimeout(() => this.openOnboardingModal(), 600);
    }
  }

  _themeInit() {
    let theme = localStorage.getItem('sf_theme');
    if (!theme && store.getSettings) {
      theme = store.getSettings()?.theme;
    }
    if (!theme) {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  _render() {
    const user = store.currentUser || { name: 'Admin', email: 'admin@studyflow.in', role: 'owner', avatarColor: '#6172f3' };
    const org = store.organization || { name: 'StudyFlow Library', plan: 'trial' };
    const isAuth = store.isAuthenticated();
    const initials = utils.initials(user.name || 'User');
    const avatarColor = user.avatarColor || 'var(--color-primary)';

    document.getElementById('app').innerHTML = `
      <aside class="sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
        <div class="sidebar-logo" onclick="app.navigate('/dashboard')" style="cursor:pointer;" title="${org.name}">
          <div class="sidebar-logo-icon">SF</div>
          <div style="display:flex;flex-direction:column;overflow:hidden;line-height:1.2;">
            <span class="sidebar-logo-text truncate">${org.name || 'StudyFlow'}</span>
            <span style="font-size:10px;font-weight:700;color:var(--color-primary);letter-spacing:0.5px;text-transform:uppercase;">${(org.plan || 'trial')} Plan</span>
          </div>
        </div>

        <nav class="sidebar-nav" id="sidebar-nav">
          ${this._renderNav()}
        </nav>

        <div class="sidebar-footer" onclick="app.openUserMenu(this)" style="cursor:pointer;" title="Click to manage account & subscription">
          <div class="sidebar-user-avatar" style="background:${avatarColor};color:#ffffff;font-weight:700;">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name truncate">${user.name || 'Admin'}</div>
            <div class="sidebar-user-role">${(user.role || 'Owner').toUpperCase()} · ${isAuth ? 'Cloud' : 'Demo'}</div>
          </div>
        </div>

        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar">
          ${this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft}
        </button>
      </aside>

      <div class="sidebar-overlay" id="sidebar-overlay" style="display:none;" onclick="app.closeMobileSidebar()"></div>

      <div class="main-area" id="main-area">
        <header class="topbar" id="topbar">
          <button class="topbar-icon-btn" id="mobile-menu-btn" aria-label="Open mobile menu" onclick="app.openMobileSidebar()">
            ${icons.menu}
          </button>

          <div class="topbar-search">
            <div class="topbar-search-icon">${icons.search}</div>
            <input type="text" class="topbar-search-input" id="topbar-search-input"
              placeholder="Search students, seats, payments..."
              onclick="app.openSpotlight()"
              readonly
            />
            <span class="topbar-search-shortcut">⌘K</span>
          </div>

          <div class="topbar-spacer"></div>

          <div class="topbar-actions">
            <div class="branch-selector" id="branch-selector" onclick="app.openBranchDropdown(this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span id="active-branch-name">Andheri West</span>
              ${icons.chevronDown}
            </div>

            <button class="topbar-icon-btn" title="Notifications" id="notif-btn" onclick="app.navigate('/notifications')">
              ${icons.bell}
              <span class="topbar-notif-badge" id="notif-badge" style="display:none;"></span>
            </button>

            <button class="topbar-icon-btn" title="Toggle theme" onclick="app.toggleTheme()">
              ${icons.sun}
            </button>

            <button class="topbar-quick-add" id="quick-add-btn" onclick="app.openQuickAdd(this)">
              ${icons.plus}
              <span>Add</span>
            </button>

            <div class="topbar-avatar" style="background:${avatarColor};color:#ffffff;font-weight:700;cursor:pointer;" title="${user.name} · ${org.name}" onclick="app.openUserMenu(this)">${initials}</div>
          </div>
        </header>

        <main class="page-content" id="page-content">
          <div class="page-inner">
            <div style="display:flex;align-items:center;justify-content:center;height:300px;">
              <div class="spinner"></div>
            </div>
          </div>
        </main>
      </div>

      <div id="toast-container" class="toast-container"></div>
    `;

    // Setup sidebar collapse
    document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Mobile responsiveness
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());

    // Active branch name
    this._updateBranchName();
    this._updateNotifBadge();
  }

  _renderNav() {
    const navSections = [
      { label: 'OVERVIEW', items: [
        { route: '/dashboard', label: 'Dashboard', icon: 'grid' },
        { route: '/landing', label: 'Landing Page', icon: 'home' },
      ]},
      { label: 'OPERATIONS', items: [
        { route: '/seat-map', label: 'Seat Map', icon: 'map' },
        { route: '/students', label: 'Students', icon: 'users' },
        { route: '/memberships', label: 'Memberships', icon: 'credit-card' },
      ]},
      { label: 'FINANCE', items: [
        { route: '/payments', label: 'Payments', icon: 'dollar-sign' },
        { route: '/expenses', label: 'Expenses', icon: 'trending-down' },
      ]},
      { label: 'MANAGEMENT', items: [
        { route: '/floors', label: 'Floors & Rooms', icon: 'layers' },
        { route: '/staff', label: 'Staff', icon: 'user-check' },
        { route: '/reports', label: 'Reports', icon: 'bar-chart-2' },
        { route: '/notifications', label: 'Notifications', icon: 'bell', badgeId: 'nav-notif-badge' },
      ]},
      { label: 'SYSTEM', items: [
        { route: '/activity', label: 'Activity Log', icon: 'activity' },
        { route: '/settings', label: 'Settings', icon: 'settings' },
      ]},
    ];

    return navSections.map(section => `
      <div class="sidebar-section">
        <div class="sidebar-section-label">${section.label}</div>
        <div class="sidebar-nav-items">
          ${section.items.map(item => `
            <div class="nav-item" data-route="${item.route}" onclick="app.navigate('${item.route}')">
              <div class="nav-icon">${icons[item.icon] || ''}</div>
              <span class="nav-label">${item.label}</span>
              ${item.badgeId ? `<span class="nav-badge" id="${item.badgeId}" style="display:none;"></span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  _setupRouter() {
    window.addEventListener('hashchange', () => this._navigate());
  }

  async _navigate() {
    let rawHash = location.hash.replace('#', '');
    if (!rawHash || rawHash === '/' || rawHash === '') {
      rawHash = store.isAuthenticated() ? '/dashboard' : '/landing';
    }
    const path = rawHash.split('?')[0];
    const params = new URLSearchParams(rawHash.split('?')[1] || '');

    this.currentRoute = path;
    this._updateActiveNav(path);
    this.closeMobileSidebar();

    const appEl = document.getElementById('app');
    if (appEl) {
      if (path === '/landing') {
        document.documentElement.classList.add('landing-html');
        document.body.classList.add('landing-body');
        appEl.classList.add('landing-mode');
        appEl.classList.remove('full-screen-mode');
        window.scrollTo(0, 0);
      } else if (path === '/layout-editor') {
        document.documentElement.classList.remove('landing-html');
        document.body.classList.remove('landing-body');
        appEl.classList.remove('landing-mode');
        appEl.classList.add('full-screen-mode');
      } else {
        document.documentElement.classList.remove('landing-html');
        document.body.classList.remove('landing-body');
        appEl.classList.remove('landing-mode');
        appEl.classList.remove('full-screen-mode');
      }
    }

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-inner">
        <div style="display:flex;align-items:center;justify-content:center;height:300px;">
          <div class="spinner"></div>
        </div>
      </div>
    `;

    // Find matching route
    let routeFn = routes[path];
    if (!routeFn) {
      // Check for partial matches (e.g., /student?id=...)
      const basePath = '/' + path.split('/').filter(Boolean)[0];
      routeFn = routes[basePath];
    }

    if (routeFn) {
      try {
        const renderFn = await routeFn();
        const inner = document.createElement('div');
        inner.className = 'page-inner';
        content.innerHTML = '';
        content.appendChild(inner);
        renderFn(inner, Object.fromEntries(params));
      } catch (e) {
        console.error('Page load error:', e);
        content.innerHTML = `
          <div class="page-inner">
            <div class="empty-state">
              <div class="empty-icon">${icons['alert-circle']}</div>
              <div class="empty-title">Page Error</div>
              <div class="empty-desc">Failed to load page: ${e.message}</div>
              <button class="btn btn-secondary" onclick="app.navigate('/dashboard')">Go to Dashboard</button>
            </div>
          </div>
        `;
      }
    } else {
      content.innerHTML = `
        <div class="page-inner">
          <div class="empty-state">
            <div class="empty-icon">${icons.search}</div>
            <div class="empty-title">Page Not Found</div>
            <div class="empty-desc">The page you're looking for doesn't exist.</div>
            <button class="btn btn-secondary" onclick="app.navigate('/dashboard')">Go to Dashboard</button>
          </div>
        </div>
      `;
    }
  }

  navigate(route, params) {
    const queryStr = params ? '?' + new URLSearchParams(params).toString() : '';
    location.hash = route + queryStr;
  }

  _updateActiveNav(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
  }

  _updateBranchName() {
    const branchId = store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const el = document.getElementById('active-branch-name');
    if (el && branch) el.textContent = branch.name;
  }

  _updateNotifBadge() {
    const count = store.getUnreadCount();
    const badge = document.getElementById('notif-badge');
    const navBadge = document.getElementById('nav-notif-badge');
    if (badge) badge.style.display = count > 0 ? 'block' : 'none';
    if (navBadge) {
      navBadge.textContent = count > 0 ? count : '';
      navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-collapse-btn');
    sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    btn.innerHTML = this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft;
  }

  openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.classList.add('active');
    }
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  _handleResize() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const isMobile = window.innerWidth <= 1024;
    if (mobileBtn) mobileBtn.style.display = isMobile ? 'flex' : 'none';
    if (!isMobile) this.closeMobileSidebar();
  }

  async toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    await store.updateSettings({ theme: next });
    toast.show(`Switched to ${next} mode`, 'success');
  }

  openBranchDropdown(btn) {
    const existing = document.getElementById('branch-dropdown');
    if (existing) { existing.remove(); return; }

    const branches = store.getBranches();
    const activeBranchId = store.getActiveBranchId();
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.id = 'branch-dropdown';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;left:${rect.left}px;z-index:300;min-width:200px;`;
    menu.innerHTML = branches.map(b => `
      <button class="dropdown-item ${b.id === activeBranchId ? 'active' : ''}" onclick="app.switchBranch('${b.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        ${b.name}
        ${b.id === activeBranchId ? `<svg style="margin-left:auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>
    `).join('');

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.remove(); }, { once: true }));
  }

  switchBranch(branchId) {
    store.setActiveBranch(branchId);
    this._updateBranchName();
    document.getElementById('branch-dropdown')?.remove();
    // Re-render current page
    this._navigate();
    toast.show(`Switched to ${store.getBranch(branchId)?.name}`, 'success');
  }

  openQuickAdd(btn) {
    const existing = document.getElementById('quick-add-menu');
    if (existing) { existing.remove(); return; }

    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'quick-add-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${window.innerWidth - rect.right}px;z-index:300;min-width:200px;`;

    const items = [
      { label: 'Add Student', icon: 'user-plus', action: `app.navigate('/students'); setTimeout(()=>document.getElementById('add-student-btn')?.click(),300)` },
      { label: 'Assign Seat', icon: 'map-pin', action: `app.navigate('/seat-map')` },
      { label: 'Record Payment', icon: 'dollar-sign', action: `app.navigate('/payments')` },
      { label: 'Add Expense', icon: 'trending-down', action: `app.navigate('/expenses')` },
      { label: 'Add Staff', icon: 'user-check', action: `app.navigate('/staff')` },
    ];

    menu.innerHTML = items.map(item => `
      <button class="dropdown-item" onclick="${item.action}; document.getElementById('quick-add-menu')?.remove()">
        <div style="width:16px;height:16px;flex-shrink:0;">${icons[item.icon] || ''}</div>
        ${item.label}
      </button>
    `).join('');

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }));
  }

  openUserMenu(btn) {
    const existing = document.getElementById('user-menu');
    if (existing) { existing.remove(); return; }

    const user = store.currentUser || { name: 'Admin', email: 'admin@studyflow.in', role: 'owner' };
    const org = store.organization || { name: 'StudyFlow Library', plan: 'trial', seatLimit: 75 };
    const isAuth = store.isAuthenticated();
    const currentSeats = store.getSeats().length;
    const seatLimit = org.seatLimit || 75;

    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${Math.max(8, window.innerWidth - rect.right)}px;z-index:300;min-width:240px;box-shadow:var(--shadow-xl);`;
    menu.innerHTML = `
      <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-2);">
        <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);font-size:var(--text-sm);display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span class="truncate">${user.name}</span>
          <span class="badge badge-indigo" style="font-size:10px;padding:2px 6px;text-transform:uppercase;font-weight:700;">${org.plan}</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;">${user.email}</div>
        <div style="font-size:11px;color:var(--color-text-secondary);font-weight:500;margin-top:6px;display:flex;align-items:center;gap:4px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
          <span class="truncate">${org.name}</span>
          <span style="color:var(--color-text-tertiary);margin-left:auto;">${currentSeats}/${seatLimit} seats</span>
        </div>
      </div>

      <button class="dropdown-item" onclick="app.openUpgradeModal(); document.getElementById('user-menu')?.remove()">
        <span style="color:#d97706;font-weight:600;display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Upgrade / Change Plan
        </span>
      </button>

      <button class="dropdown-item" onclick="app.openOnboardingModal(); document.getElementById('user-menu')?.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Setup Wizard / Add Halls
      </button>

      <button class="dropdown-item" onclick="app.navigate('/settings'); document.getElementById('user-menu')?.remove()">
        ${icons.settings} Settings & Organization
      </button>

      <button class="dropdown-item" onclick="app.toggleTheme(); document.getElementById('user-menu')?.remove()">
        ${icons.sun} Toggle Theme
      </button>

      <div class="dropdown-separator"></div>

      ${isAuth ? `
        <button class="dropdown-item" onclick="app.openLoginModal(); document.getElementById('user-menu')?.remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Switch Account
        </button>
        <button class="dropdown-item danger" onclick="app.handleLogout(); document.getElementById('user-menu')?.remove()">
          ${icons.logOut} Sign Out
        </button>
      ` : `
        <button class="dropdown-item" onclick="app.openLoginModal(); document.getElementById('user-menu')?.remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Log In to Your Cloud Library
        </button>
        <button class="dropdown-item" style="color:var(--color-primary);font-weight:600;" onclick="app.openRegisterModal(); document.getElementById('user-menu')?.remove()">
          ✨ Create New Library (Free Trial)
        </button>
      `}
    `;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.remove(); }, { once: true }));
  }

  // ── SaaS Auth Modals ──────────────────────────────────────────────
  openLoginModal() {
    const bodyHTML = `
      <form id="login-form" onsubmit="event.preventDefault(); app.submitLogin();" style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div id="login-error-msg" style="display:none;padding:var(--space-3);background:rgba(239, 68, 68, 0.1);border:1px solid #ef4444;color:#ef4444;border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:600;"></div>
        
        <div class="form-group">
          <label class="form-label">Email Address *</label>
          <input type="email" class="input" id="login-email" required placeholder="admin@yourlibrary.com" autofocus autocomplete="email">
        </div>

        <div class="form-group">
          <label class="form-label">Password *</label>
          <input type="password" class="input" id="login-password" required placeholder="••••••••" autocomplete="current-password">
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:var(--text-xs);color:var(--color-text-tertiary);">
          <span>Default Demo Account:</span>
          <a href="javascript:void(0)" onclick="document.getElementById('login-email').value='admin@studyflow.in';document.getElementById('login-password').value='studyflow123';" style="color:var(--color-primary);font-weight:600;">Auto-fill Demo</a>
        </div>
      </form>
    `;

    const footerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <span style="font-size:var(--text-xs);color:var(--color-text-secondary);">
          Don't have an account? <a href="javascript:void(0)" onclick="modal.close(); app.openRegisterModal();" style="color:var(--color-primary);font-weight:600;">Create Library</a>
        </span>
        <div style="display:flex;gap:var(--space-2);">
          <button type="button" class="btn btn-secondary" onclick="modal.close()">Cancel</button>
          <button type="button" class="btn btn-primary" id="login-submit-btn" onclick="app.submitLogin()">Sign In</button>
        </div>
      </div>
    `;

    modal.open('Sign In to StudyFlow', bodyHTML, footerHTML, { size: 'sm' });
  }

  async submitLogin() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const btn = document.getElementById('login-submit-btn');
    const errBox = document.getElementById('login-error-msg');

    if (!email || !password) {
      if (errBox) { errBox.textContent = 'Please fill in both email and password'; errBox.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    if (errBox) errBox.style.display = 'none';

    try {
      const res = await store.login(email, password);
      modal.close();
      toast.show(`Welcome back, ${res.user.name}!`, 'success');
      this._render();
      this._navigate();
    } catch (e) {
      if (errBox) {
        errBox.textContent = e.message || 'Login failed';
        errBox.style.display = 'block';
      } else {
        toast.show(e.message || 'Login failed', 'error');
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
  }

  openRegisterModal() {
    const bodyHTML = `
      <form id="register-form" onsubmit="event.preventDefault(); app.submitRegister();" style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div id="register-error-msg" style="display:none;padding:var(--space-3);background:rgba(239, 68, 68, 0.1);border:1px solid #ef4444;color:#ef4444;border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:600;"></div>
        
        <div class="form-group">
          <label class="form-label">Library / Reading Hall Name *</label>
          <input type="text" class="input" id="reg-org-name" required placeholder="e.g. Apex Reading Lounge" autofocus>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Your Full Name *</label>
            <input type="text" class="input" id="reg-name" required placeholder="e.g. Rahul Sharma">
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input type="tel" class="input" id="reg-phone" placeholder="e.g. +919876543210">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email Address *</label>
          <input type="email" class="input" id="reg-email" required placeholder="owner@yourlibrary.com">
        </div>

        <div class="form-group">
          <label class="form-label">Password *</label>
          <input type="password" class="input" id="reg-password" required placeholder="At least 6 characters" minlength="6">
        </div>
      </form>
    `;

    const footerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <span style="font-size:var(--text-xs);color:var(--color-text-secondary);">
          Already have an account? <a href="javascript:void(0)" onclick="modal.close(); app.openLoginModal();" style="color:var(--color-primary);font-weight:600;">Sign In</a>
        </span>
        <div style="display:flex;gap:var(--space-2);">
          <button type="button" class="btn btn-secondary" onclick="modal.close()">Cancel</button>
          <button type="button" class="btn btn-primary" id="reg-submit-btn" onclick="app.submitRegister()">Create Free Library</button>
        </div>
      </div>
    `;

    modal.open('Create Your Library Account', bodyHTML, footerHTML, { size: 'md' });
  }

  async submitRegister() {
    const orgName = document.getElementById('reg-org-name')?.value?.trim();
    const name = document.getElementById('reg-name')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value;
    const phone = document.getElementById('reg-phone')?.value?.trim();
    const btn = document.getElementById('reg-submit-btn');
    const errBox = document.getElementById('register-error-msg');

    if (!orgName || !name || !email || !password) {
      if (errBox) { errBox.textContent = 'Please fill in all required fields'; errBox.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Creating Library...'; }
    if (errBox) errBox.style.display = 'none';

    try {
      const res = await store.register(orgName, name, email, password, phone);
      modal.close();
      toast.show(`Library created! Welcome ${res.user.name}.`, 'success');
      this._render();
      this._navigate();
      // Prompt onboarding wizard immediately
      setTimeout(() => this.openOnboardingModal(), 500);
    } catch (e) {
      if (errBox) {
        errBox.textContent = e.message || 'Registration failed';
        errBox.style.display = 'block';
      } else {
        toast.show(e.message || 'Registration failed', 'error');
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Create Free Library'; }
    }
  }

  // ── Onboarding Wizard ─────────────────────────────────────────────
  openOnboardingModal() {
    const org = store.organization || { name: 'My Library' };
    const bodyHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <div style="padding:var(--space-3) var(--space-4);background:rgba(97, 114, 243, 0.08);border:1px solid rgba(97, 114, 243, 0.2);border-radius:var(--radius-lg);display:flex;align-items:center;gap:12px;">
          <div style="font-size:24px;">🚀</div>
          <div>
            <div style="font-weight:var(--fw-bold);color:var(--color-primary);font-size:var(--text-sm);">Welcome to StudyFlow SaaS!</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary);">Let's quickly set up your first branch, study hall, and seats in 30 seconds.</div>
          </div>
        </div>

        <!-- Section 1: Branch -->
        <div class="card" style="margin:0;padding:var(--space-4);border-color:var(--color-border-secondary);">
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-3);display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:var(--color-primary);color:white;border-radius:50%;font-size:11px;">1</span>
            First Branch Details
          </div>
          <div class="grid-2" style="gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Branch Name</label>
              <input type="text" class="input" id="ob-branch-name" value="${org.name} - Main Branch" placeholder="e.g. Main Branch / Kothrud">
            </div>
            <div class="grid-2" style="gap:var(--space-2);">
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" class="input" id="ob-city" value="Pune" placeholder="City">
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="input" id="ob-phone" value="+919876543210" placeholder="+91...">
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Hall & Seats -->
        <div class="card" style="margin:0;padding:var(--space-4);border-color:var(--color-border-secondary);">
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-3);display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:var(--color-primary);color:white;border-radius:50%;font-size:11px;">2</span>
            Study Room & Seat Generator
          </div>
          <div class="grid-3" style="gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Floor</label>
              <input type="text" class="input" id="ob-floor-name" value="Ground Floor">
            </div>
            <div class="form-group">
              <label class="form-label">Room / Hall Name</label>
              <input type="text" class="input" id="ob-room-name" value="Quiet Study Hall">
            </div>
            <div class="form-group">
              <label class="form-label">Number of Seats</label>
              <input type="number" class="input" id="ob-seat-count" value="30" min="5" max="100">
            </div>
          </div>
        </div>

        <!-- Section 3: Starter Membership Plans -->
        <div class="card" style="margin:0;padding:var(--space-4);border-color:var(--color-border-secondary);">
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-3);display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:var(--color-primary);color:white;border-radius:50%;font-size:11px;">3</span>
            Starter Membership Plans
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--text-xs);">
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--color-bg-secondary);border-radius:var(--radius-md);cursor:pointer;">
              <input type="checkbox" id="ob-plan-std" checked style="accent-color:var(--color-primary);">
              <span style="font-weight:600;flex:1;">Full Day Reserved (24 Hours)</span>
              <span style="color:var(--color-text-tertiary);">₹1,800 / mo</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--color-bg-secondary);border-radius:var(--radius-md);cursor:pointer;">
              <input type="checkbox" id="ob-plan-morn" checked style="accent-color:var(--color-primary);">
              <span style="font-weight:600;flex:1;">Morning Shift (6 AM - 2 PM)</span>
              <span style="color:var(--color-text-tertiary);">₹1,100 / mo</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--color-bg-secondary);border-radius:var(--radius-md);cursor:pointer;">
              <input type="checkbox" id="ob-plan-eve" checked style="accent-color:var(--color-primary);">
              <span style="font-weight:600;flex:1;">Evening Shift (2 PM - 10 PM)</span>
              <span style="color:var(--color-text-tertiary);">₹1,100 / mo</span>
            </label>
          </div>
        </div>
      </div>
    `;

    const footerHTML = `
      <button type="button" class="btn btn-secondary" onclick="modal.close()">Skip for Now</button>
      <button type="button" class="btn btn-primary" id="ob-submit-btn" onclick="app.submitOnboarding()">⚡ Generate Study Hall & Launch</button>
    `;

    modal.open('Quick Setup Wizard', bodyHTML, footerHTML, { size: 'lg' });
  }

  async submitOnboarding() {
    const branchName = document.getElementById('ob-branch-name')?.value?.trim() || 'Main Branch';
    const city = document.getElementById('ob-city')?.value?.trim() || 'Pune';
    const phone = document.getElementById('ob-phone')?.value?.trim() || '+919876543210';
    const floorName = document.getElementById('ob-floor-name')?.value?.trim() || 'Ground Floor';
    const roomName = document.getElementById('ob-room-name')?.value?.trim() || 'Main Reading Hall';
    const seatCount = parseInt(document.getElementById('ob-seat-count')?.value, 10) || 30;

    const plans = [];
    if (document.getElementById('ob-plan-std')?.checked) {
      plans.push({ name: 'Full Day Reserved', shift: '24-hour', price: 1800, durationMonths: 1, deposit: 500 });
    }
    if (document.getElementById('ob-plan-morn')?.checked) {
      plans.push({ name: 'Morning Shift', shift: 'morning', price: 1100, durationMonths: 1, deposit: 300 });
    }
    if (document.getElementById('ob-plan-eve')?.checked) {
      plans.push({ name: 'Evening Shift', shift: 'evening', price: 1100, durationMonths: 1, deposit: 300 });
    }

    const btn = document.getElementById('ob-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating Room & Seats...'; }

    try {
      await store.completeOnboarding({
        branchName,
        city,
        phone,
        floorName,
        roomName,
        seatCount,
        plans
      });

      modal.close();
      toast.show('🎉 Your study hall and seats are configured and ready!', 'success');
      this._render();
      this.navigate('/seat-map');
    } catch (e) {
      toast.show(e.message || 'Setup failed', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⚡ Generate Study Hall & Launch'; }
    }
  }

  // ── SaaS Plan Upgrade Modal ───────────────────────────────────────
  openUpgradeModal() {
    const org = store.organization || { plan: 'trial', seatLimit: 75 };
    const currentPlan = org.plan || 'trial';

    const tiers = [
      {
        id: 'starter',
        name: 'Starter Plan',
        price: '₹1,499',
        period: '/ month',
        seats: 'Up to 75 Seats',
        branches: '1 Branch',
        features: [
          'Full Seat Map & Grid Visualizer',
          'Student Profiles & Memberships',
          'Payment Tracking & Receipts',
          'Export CSV & Reports'
        ],
        highlight: false
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        badge: 'MOST POPULAR',
        price: '₹3,499',
        period: '/ month',
        seats: 'Up to 250 Seats',
        branches: 'Up to 3 Branches',
        features: [
          'Everything in Starter',
          'WhatsApp Cloud Automation',
          'Multi-Shift Seat Allocation',
          'Expense Tracker & Profit Reports',
          'Role-based Staff Management'
        ],
        highlight: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: '₹7,999',
        period: '/ month',
        seats: 'Up to 1,000 Seats',
        branches: 'Unlimited Branches',
        features: [
          'Everything in Pro',
          'Interactive Custom Room Designer',
          'Dedicated Fast Database Node',
          'Custom Invoicing & Branding',
          '24/7 Priority Support & Onboarding'
        ],
        highlight: false
      }
    ];

    const bodyHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-6);">
        <div style="text-align:center;">
          <h3 style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--color-text-primary);margin:0;">Choose the Perfect Plan for Your Library</h3>
          <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:var(--space-2);">Scale your study rooms, branches, and student admissions seamlessly.</p>
        </div>

        <div class="grid-3" style="gap:var(--space-4);align-items:stretch;">
          ${tiers.map(t => {
            const isCurrent = currentPlan.toLowerCase() === t.id;
            return `
              <div style="border-radius:var(--radius-xl);border:2px solid ${t.highlight ? 'var(--color-primary)' : 'var(--color-border-secondary)'};background:var(--color-bg-primary);padding:var(--space-5);display:flex;flex-direction:column;position:relative;box-shadow:${t.highlight ? 'var(--shadow-md)' : 'none'};">
                ${t.badge ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--color-primary);color:#fff;font-size:10px;font-weight:800;padding:2px 10px;border-radius:var(--radius-full);letter-spacing:0.5px;">${t.badge}</div>` : ''}
                
                <div style="font-size:var(--text-base);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-top:${t.badge ? '4px' : '0'};">${t.name}</div>
                <div style="display:flex;align-items:baseline;gap:4px;margin-top:var(--space-2);margin-bottom:var(--space-4);">
                  <span style="font-size:var(--text-2xl);font-weight:800;color:var(--color-text-primary);">${t.price}</span>
                  <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${t.period}</span>
                </div>

                <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-primary);margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--color-border-secondary);">
                  ${t.seats} · ${t.branches}
                </div>

                <ul style="list-style:none;padding:0;margin:0 0 var(--space-5) 0;display:flex;flex-direction:column;gap:8px;flex:1;">
                  ${t.features.map(f => `
                    <li style="font-size:var(--text-xs);color:var(--color-text-secondary);display:flex;align-items:center;gap:6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--sf-success-600);flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>${f}</span>
                    </li>
                  `).join('')}
                </ul>

                <button class="btn ${isCurrent ? 'btn-secondary' : (t.highlight ? 'btn-primary' : 'btn-secondary')} w-full"
                  ${isCurrent ? 'disabled' : ''}
                  onclick="app.selectPlan('${t.id}')">
                  ${isCurrent ? '✓ Current Plan' : `Upgrade to ${t.name.split(' ')[0]}`}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const footerHTML = `
      <button type="button" class="btn btn-secondary" onclick="modal.close()">Close</button>
    `;

    modal.open('StudyFlow Subscription Plans', bodyHTML, footerHTML, { size: 'xl' });
  }

  async selectPlan(planId) {
    try {
      await store.upgradePlan(planId);
      modal.close();
      toast.show(`Successfully upgraded to the ${planId.toUpperCase()} Plan!`, 'success');
      this._render();
      this._navigate();
    } catch (e) {
      toast.show(e.message || 'Upgrade failed', 'error');
    }
  }

  async handleLogout() {
    const ok = await modal.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out? You can sign back in anytime with your credentials.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (ok) {
      await store.logout();
      toast.show('Signed out successfully. Switched to demo environment.', 'info');
      this._render();
      this._navigate();
    }
  }

  async resetApp() {
    const ok = await modal.confirm({
      title: 'Refresh Data',
      message: 'Reload app and refresh data from database?',
      confirmText: 'Reload',
      type: 'warning'
    });
    if (ok) {
      location.reload();
    }
  }

  openSpotlight() {
    if (document.getElementById('spotlight-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'spotlight-backdrop';
    backdrop.className = 'spotlight-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    backdrop.innerHTML = `
      <div class="spotlight">
        <div class="spotlight-input-wrap">
          <div style="color:var(--color-icon-secondary);">${icons.search}</div>
          <input type="text" class="spotlight-input" id="spotlight-input" placeholder="Search students, seats, payments..." autofocus />
          <div class="kbd">ESC</div>
        </div>
        <div class="spotlight-results" id="spotlight-results">
          ${this._renderSpotlightDefault()}
        </div>
        <div class="spotlight-footer">
          <div class="spotlight-hint"><div class="kbd">↑↓</div> navigate</div>
          <div class="spotlight-hint"><div class="kbd">↵</div> select</div>
          <div class="spotlight-hint"><div class="kbd">ESC</div> close</div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => document.getElementById('spotlight-input')?.focus(), 50);

    document.getElementById('spotlight-input').addEventListener('input', (e) => {
      this._spotlightSearch(e.target.value);
    });
  }

  _renderSpotlightDefault() {
    const recentActivity = store.getActivityLogs(5);
    return `
      <div class="spotlight-group-label">Recent Activity</div>
      ${recentActivity.map(a => `
        <div class="spotlight-item" onclick="app.navigate('/activity'); document.getElementById('spotlight-backdrop')?.remove()">
          <div class="spotlight-item-icon">${icons.activity || ''}</div>
          <div class="spotlight-item-info">
            <div class="spotlight-item-title">${a.description}</div>
            <div class="spotlight-item-sub">${utils.formatRelative(a.timestamp)}</div>
          </div>
          <span class="spotlight-item-type">Activity</span>
        </div>
      `).join('')}
    `;
  }

  _spotlightSearch(query) {
    const results = document.getElementById('spotlight-results');
    if (!query.trim()) { results.innerHTML = this._renderSpotlightDefault(); return; }

    const q = query.toLowerCase();
    const branchId = store.getActiveBranchId();
    const students = store.searchStudents(query, branchId).slice(0, 5);
    const allSeats = store.getSeatsForBranch(branchId).filter(s =>
      s.label.toLowerCase().includes(q)
    ).slice(0, 5);
    const payments = (store.db.payments || []).filter(p =>
      p.receiptNumber?.toLowerCase().includes(q)
    ).slice(0, 3);

    let html = '';

    if (students.length) {
      html += `<div class="spotlight-group-label">Students</div>`;
      html += students.map(s => {
        const assignment = store.getStudentAssignment(s.id);
        const seat = assignment ? store.getSeat(assignment.seatId) : null;
        return `
          <div class="spotlight-item" onclick="app.navigate('/student', {id:'${s.id}'}); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon" style="background:${s.avatar};">
              <span style="color:white;font-size:var(--text-xs);font-weight:var(--fw-bold);">${utils.initials(s.name)}</span>
            </div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">${s.name}</div>
              <div class="spotlight-item-sub">${s.id} · ${seat ? 'Seat ' + seat.label : 'No seat'}</div>
            </div>
            <span class="spotlight-item-type">Student</span>
          </div>
        `;
      }).join('');
    }

    if (allSeats.length) {
      html += `<div class="spotlight-group-label">Seats</div>`;
      html += allSeats.map(s => {
        const status = store.getSeatStatus(s.id);
        const assignment = store.getActiveAssignment(s.id);
        const student = assignment ? store.getStudent(assignment.studentId) : null;
        return `
          <div class="spotlight-item" onclick="app.navigate('/seat-map'); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon">${icons.map || ''}</div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">Seat ${s.label}</div>
              <div class="spotlight-item-sub">${student ? student.name : capitalizeFirst(status)}</div>
            </div>
            <span class="spotlight-item-type">Seat</span>
          </div>
        `;
      }).join('');
    }

    if (payments.length) {
      html += `<div class="spotlight-group-label">Receipts</div>`;
      html += payments.map(p => {
        const student = store.getStudent(p.studentId);
        return `
          <div class="spotlight-item" onclick="app.navigate('/payments'); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon">${icons['dollar-sign'] || ''}</div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">${p.receiptNumber}</div>
              <div class="spotlight-item-sub">${student?.name || '—'} · ${utils.formatINR(p.amount)}</div>
            </div>
            <span class="spotlight-item-type">Payment</span>
          </div>
        `;
      }).join('');
    }

    if (!html) {
      html = `
        <div class="empty-state" style="padding:var(--space-8);">
          <div class="empty-icon">${icons.search}</div>
          <div class="empty-title" style="font-size:var(--text-sm);">No results for "${query}"</div>
        </div>
      `;
    }

    results.innerHTML = html;
  }

  closeAllOverlays() {
    document.getElementById('spotlight-backdrop')?.remove();
    document.getElementById('branch-dropdown')?.remove();
    document.getElementById('quick-add-menu')?.remove();
    document.getElementById('user-menu')?.remove();
    document.querySelectorAll('.modal-backdrop, .drawer-backdrop, .drawer').forEach(el => el.remove());
    this.closeMobileSidebar();
  }
}

// ── Toast System ───────────────────────────────────────────────────
const toast = {
  show(msg, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = `toast ${type}`;

    const isDark = document.documentElement.dataset.theme === 'dark' ||
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   (!document.documentElement.dataset.theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const iconMap = { success: icons.checkCircle, error: icons['alert-circle'], warning: icons['alert-triangle'] };
    const icon = iconMap[type] || icons.info;

    // Apply explicit inline styles so text is 100% visible regardless of CSS cache
    if (isDark) {
      if (type === 'success') {
        t.style.background = '#062e1c';
        t.style.borderColor = '#166534';
        t.style.color = '#dcfce7';
      } else if (type === 'error') {
        t.style.background = '#3f1015';
        t.style.borderColor = '#991b1b';
        t.style.color = '#fee2e2';
      } else if (type === 'warning') {
        t.style.background = '#3d2008';
        t.style.borderColor = '#9a3412';
        t.style.color = '#ffedd5';
      } else {
        t.style.background = '#1e293b';
        t.style.borderColor = '#334155';
        t.style.color = '#f8fafc';
      }
    } else {
      if (type === 'success') {
        t.style.background = '#f0fdf4';
        t.style.borderColor = '#bbf7d0';
        t.style.color = '#15803d';
      } else if (type === 'error') {
        t.style.background = '#fef2f2';
        t.style.borderColor = '#fecaca';
        t.style.color = '#b91c1c';
      } else if (type === 'warning') {
        t.style.background = '#fffbeb';
        t.style.borderColor = '#fde68a';
        t.style.color = '#b45309';
      } else {
        t.style.background = '#ffffff';
        t.style.borderColor = '#e5e7eb';
        t.style.color = '#111827';
      }
    }

    t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-msg" style="color:inherit !important;font-weight:500;">${msg}</div>`;
    container.appendChild(t);

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      t.style.transition = 'all 0.2s';
      setTimeout(() => t.remove(), 200);
    }, duration);
  }
};

// ── Modal System ───────────────────────────────────────────────────
const modal = {
  open(title, bodyHTML, footerHTML, opts = {}) {
    this.close();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';

    const sizeClass = opts.size ? `modal-${opts.size}` : '';
    backdrop.innerHTML = `
      <div class="modal ${sizeClass}" id="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="modal.close()" aria-label="Close">
            ${icons.x}
          </button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;

    if (!opts.noBackdropClose) {
      backdrop.addEventListener('click', e => { if (e.target === backdrop) modal.close(); });
    }

    document.body.appendChild(backdrop);
    return backdrop;
  },

  confirm({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' } = {}) {
    return new Promise((resolve) => {
      const isDanger = type === 'danger' || type === 'error';
      const btnClass = isDanger ? 'btn btn-danger' : (type === 'warning' ? 'btn btn-warning' : 'btn btn-primary');
      const iconClass = isDanger ? 'danger' : (type === 'warning' ? 'warning' : 'info');
      const iconSvg = isDanger ? (icons.trash || icons['alert-triangle']) : (type === 'warning' ? icons['alert-triangle'] : icons.info);

      const bodyHTML = `
        <div style="display:flex;gap:var(--space-4);align-items:flex-start;">
          <div class="confirm-icon-box ${iconClass}">
            ${iconSvg}
          </div>
          <div style="flex:1;">
            <p style="margin:0;font-size:var(--text-sm);line-height:1.6;color:var(--color-text-secondary);white-space:pre-line;">${message}</p>
          </div>
        </div>
      `;

      const footerHTML = `
        <button type="button" class="btn btn-secondary" id="modal-confirm-cancel">${cancelText}</button>
        <button type="button" class="${btnClass}" id="modal-confirm-ok">${confirmText}</button>
      `;

      modal.open(title, bodyHTML, footerHTML, { size: 'sm' });

      document.getElementById('modal-confirm-cancel')?.addEventListener('click', () => {
        modal.close();
        resolve(false);
      });

      document.getElementById('modal-confirm-ok')?.addEventListener('click', () => {
        modal.close();
        resolve(true);
      });
    });
  },

  close() {
    document.getElementById('modal-backdrop')?.remove();
  }
};

// ── Drawer System ──────────────────────────────────────────────────
const drawer = {
  open(title, bodyHTML, footerHTML) {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.onclick = () => this.close();

    const drawerEl = document.createElement('div');
    drawerEl.className = 'drawer';
    drawerEl.id = 'main-drawer';
    drawerEl.innerHTML = `
      <div class="drawer-header">
        <h2 class="drawer-title">${title}</h2>
        <button class="drawer-close" onclick="drawer.close()" aria-label="Close">
          ${icons.x}
        </button>
      </div>
      <div class="drawer-body" id="drawer-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="drawer-footer">${footerHTML}</div>` : ''}
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawerEl);

    return drawerEl;
  },

  close() {
    document.querySelector('.drawer-backdrop')?.remove();
    document.getElementById('main-drawer')?.remove();
  }
};

// ── Confirm Dialog ─────────────────────────────────────────────────
async function confirmDialog(title, message, onConfirm, type = 'danger', confirmText = 'Confirm') {
  const confirmed = await modal.confirm({ title, message, type, confirmText });
  if (confirmed && typeof onConfirm === 'function') {
    onConfirm();
  }
}

// ── Utility ────────────────────────────────────────────────────────
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function seatStatusBadge(status) {
  const map = {
    'available': { cls: 'badge-success', label: 'Available' },
    'occupied': { cls: 'badge-indigo', label: 'Occupied' },
    'reserved': { cls: 'badge-orange', label: 'Reserved' },
    'payment-due': { cls: 'badge-error', label: 'Payment Due' },
    'expiring': { cls: 'badge-warning', label: 'Expiring Soon' },
    'maintenance': { cls: 'badge-neutral', label: 'Maintenance' },
    'blocked': { cls: 'badge-neutral', label: 'Blocked' },
  };
  const { cls, label } = map[status] || map['available'];
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

function paymentStatusBadge(status) {
  const map = {
    'paid': { cls: 'badge-success', label: 'Paid' },
    'partial': { cls: 'badge-warning', label: 'Partial' },
    'pending': { cls: 'badge-error', label: 'Pending' },
    'overdue': { cls: 'badge-error', label: 'Overdue' },
  };
  const { cls, label } = map[status] || { cls: 'badge-neutral', label: capitalizeFirst(status) };
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

function membershipStatusBadge(endDate, status) {
  if (status !== 'active') return `<span class="badge badge-neutral"><span class="badge-dot"></span>${capitalizeFirst(status)}</span>`;
  const days = utils.daysUntil(endDate);
  if (days < 0) return `<span class="badge badge-error"><span class="badge-dot"></span>Expired</span>`;
  if (days <= 7) return `<span class="badge badge-warning"><span class="badge-dot"></span>Expiring in ${days}d</span>`;
  return `<span class="badge badge-success"><span class="badge-dot"></span>Active</span>`;
}

// ── Bootstrap ──────────────────────────────────────────────────────
window.app = new App();
window.toast = toast;
window.modal = modal;
window.drawer = drawer;
window.confirmDialog = confirmDialog;
window.seatStatusBadge = seatStatusBadge;
window.paymentStatusBadge = paymentStatusBadge;
window.membershipStatusBadge = membershipStatusBadge;
window.capitalizeFirst = capitalizeFirst;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
