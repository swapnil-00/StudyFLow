// StudyFlow Application — Main Entry Point

// ── Router ─────────────────────────────────────────────────────────
const routes = {
  '/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard),
  '/seat-map': () => import('./pages/seat-map.js').then(m => m.renderSeatMap),
  '/students': () => import('./pages/students.js').then(m => m.renderStudents),
  '/student': () => import('./pages/student-profile.js').then(m => m.renderStudentProfile),
  '/memberships': () => import('./pages/memberships.js').then(m => m.renderMemberships),
  '/payments': () => import('./pages/payments.js').then(m => m.renderPayments),
  '/attendance': () => import('./pages/attendance.js').then(m => m.renderAttendance),
  '/floors': () => import('./pages/floors.js').then(m => m.renderFloors),
  '/expenses': () => import('./pages/expenses.js').then(m => m.renderExpenses),
  '/reports': () => import('./pages/reports.js').then(m => m.renderReports),
  '/staff': () => import('./pages/staff.js').then(m => m.renderStaff),
  '/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications),
  '/activity': () => import('./pages/activity.js').then(m => m.renderActivity),
  '/settings': () => import('./pages/settings.js').then(m => m.renderSettings),
  '/reservations': () => import('./pages/reservations.js').then(m => m.renderReservations),
};

class App {
  constructor() {
    this.currentRoute = null;
    this.sidebarCollapsed = localStorage.getItem('sf_sidebar_collapsed') === 'true';
    this._themeInit();
  }

  init() {
    // Seed if needed
    if (!store.isSeeded()) {
      const db = seedDatabase();
      store._save(db);
    }

    this._render();
    this._setupRouter();
    this._navigate();

    // Subscribe to store changes for reactive updates
    store.subscribe(() => {
      this._updateNotifBadge();
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
  }

  _themeInit() {
    const saved = store.isSeeded() ? store.getSettings().theme : 'light';
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  }

  _render() {
    document.getElementById('app').innerHTML = `
      <aside class="sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">SF</div>
          <span class="sidebar-logo-text">StudyFlow</span>
        </div>

        <nav class="sidebar-nav" id="sidebar-nav">
          ${this._renderNav()}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user-avatar">AM</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name truncate">Arjun Mehta</div>
            <div class="sidebar-user-role">Owner</div>
          </div>
        </div>

        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar">
          ${this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft}
        </button>
      </aside>

      <div class="sidebar-overlay" id="sidebar-overlay" style="display:none;" onclick="app.closeMobileSidebar()"></div>

      <div class="main-area" id="main-area">
        <header class="topbar" id="topbar">
          <button class="topbar-icon-btn" id="mobile-menu-btn" style="display:none;" onclick="app.openMobileSidebar()">
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

            <div class="topbar-avatar" title="Arjun Mehta · Owner" onclick="app.openUserMenu(this)">AM</div>
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
      ]},
      { label: 'OPERATIONS', items: [
        { route: '/seat-map', label: 'Seat Map', icon: 'map' },
        { route: '/students', label: 'Students', icon: 'users' },
        { route: '/memberships', label: 'Memberships', icon: 'credit-card' },
        { route: '/attendance', label: 'Attendance', icon: 'clock' },
        { route: '/reservations', label: 'Reservations', icon: 'calendar' },
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
    const hash = location.hash.replace('#', '') || '/dashboard';
    const path = hash.split('?')[0];
    const params = new URLSearchParams(hash.split('?')[1] || '');

    this.currentRoute = path;
    this._updateActiveNav(path);

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
    localStorage.setItem('sf_sidebar_collapsed', this.sidebarCollapsed);
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-collapse-btn');
    sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    btn.innerHTML = this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft;
  }

  openMobileSidebar() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('sidebar-overlay').style.display = 'block';
  }

  closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebar-overlay').style.display = 'none';
  }

  _handleResize() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const isMobile = window.innerWidth <= 1024;
    if (mobileBtn) mobileBtn.style.display = isMobile ? 'flex' : 'none';
    if (!isMobile) this.closeMobileSidebar();
  }

  toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.updateSettings({ theme: next });
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
      { label: 'Add Reservation', icon: 'calendar', action: `app.navigate('/reservations')` },
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

    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${window.innerWidth - rect.right}px;z-index:300;min-width:200px;`;
    menu.innerHTML = `
      <div style="padding:var(--space-3);border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-2);">
        <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);font-size:var(--text-sm);">Arjun Mehta</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">arjun@studyflow.in</div>
      </div>
      <button class="dropdown-item" onclick="app.navigate('/settings'); document.getElementById('user-menu')?.remove()">
        ${icons.settings} Settings
      </button>
      <button class="dropdown-item" onclick="app.toggleTheme(); document.getElementById('user-menu')?.remove()">
        ${icons.sun} Toggle Theme
      </button>
      <div class="dropdown-separator"></div>
      <button class="dropdown-item danger" onclick="app.resetApp()">
        ${icons.logOut} Reset Demo Data
      </button>
    `;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }));
  }

  resetApp() {
    if (confirm('Reset all demo data? This will reload the page.')) {
      localStorage.removeItem('studyflow_db');
      localStorage.removeItem('sf_active_branch');
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

    const iconMap = { success: icons.checkCircle, error: icons['alert-circle'], warning: icons['alert-triangle'] };
    const icon = iconMap[type] || icons.info;

    t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-msg">${msg}</div>`;
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
function confirmDialog(title, message, onConfirm, type = 'danger') {
  modal.open(title, `
    <div style="text-align:center;">
      <div class="confirm-dialog-icon ${type}" style="margin:0 auto var(--space-4);">
        ${type === 'danger' ? icons['alert-triangle'] : icons['alert-circle']}
      </div>
      <p style="color:var(--color-text-secondary);font-size:var(--text-sm);">${message}</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-danger" onclick="modal.close(); (${onConfirm})()">Confirm</button>
  `, { size: 'sm', noBackdropClose: false });
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

document.addEventListener('DOMContentLoaded', () => app.init());
