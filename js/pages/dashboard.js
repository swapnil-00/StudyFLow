// Dashboard Page
export function renderDashboard(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const expiring = store.getExpiringMemberships(branchId, 14);
  const pendingDues = store.getPendingDues(branchId).slice(0, 5);
  const recentActivity = store.getActivityLogs(8);
  const occupancyData = store.getOccupancyData(branchId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = store.currentUser || {};
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';

  // Revenue chart range, remembered per browser (7, 30 or 90 days)
  let revenueDays = 7;
  try { const saved = Number(localStorage.getItem('sf_revenue_days')); if ([7, 30, 90].includes(saved)) revenueDays = saved; } catch (_) { }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">${greeting}, ${utils.escapeHtml(firstName)} 👋</h1>
          <p class="page-subtitle" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px;">
            <span>Here's what's happening at</span>
            <button type="button" onclick="openEditLibraryNameModal()" style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;background:var(--color-bg-secondary);border:1px solid var(--color-border-primary);border-radius:var(--radius-sm);cursor:pointer;color:var(--color-text-primary);font-size:12.5px;font-weight:600;transition:all var(--transition-fast);" title="Click to change your custom library & branch name">
              <span>${utils.escapeHtml(branch?.name || store.organization?.name || 'Your Library')}</span>
              <span style="color:var(--color-text-tertiary);font-size:11px;display:inline-flex;align-items:center;">✎ Edit</span>
            </button>
            <span>today.</span>
          </p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="app.navigate('/notifications')">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--sf-success-500);margin-right:6px;"></span>
            WhatsApp
          </button>
          <button class="btn btn-secondary" onclick="app.navigate('/seat-map')">
            ${icons.map} Seat Map
          </button>
          <button class="btn btn-primary" onclick="app.navigate('/students')" id="add-student-btn">
            ${icons.plus} Add Student
          </button>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderStatCard('Total Seats', stats.totalSeats, '', 'seat-count', '#eef4ff', '#6172f3', icons.map)}
      ${renderStatCard('Occupied', stats.occupied, `${Math.round((stats.occupied / Math.max(stats.totalSeats, 1)) * 100)}% occupancy`, 'occupied', '#eef4ff', '#444ce7', icons.users)}
      ${renderStatCard('Available', stats.available, `${stats.available} unassigned`, 'available', '#ecfdf3', '#17b26a', icons.checkCircle)}
      ${renderStatCard("Today's Revenue", utils.formatINR(stats.todayRevenue), `${utils.formatINR(stats.monthRevenue)} this month`, 'revenue', '#fef0c7', '#f79009', icons['dollar-sign'])}
    </div>

    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderStatCard('Pending Dues', utils.formatINR(stats.totalPending), 'Total outstanding', 'dues', '#fee4e2', '#f04438', icons['alert-circle'])}
      ${renderStatCard('Expiring Soon', stats.expiringCount, 'Within 14 days', 'expiring', '#fef0c7', '#dc6803', icons.clock)}
      ${renderStatCard('Active Memberships', stats.activeMembershipsCount ?? store.getMemberships().filter(m => m.status === 'active').length, 'Currently active', 'memberships', '#ecfdf3', '#079455', icons['credit-card'])}
      ${renderStatCard('Under Maintenance', stats.maintenance, 'Seats blocked', 'maintenance', '#f3f4f6', '#6c737f', icons.tool)}
    </div>

    <!-- WhatsApp & Invoice Automation Banner -->
    <div style="background:linear-gradient(135deg, var(--sf-indigo-900) 0%, #1e1b4b 100%);color:white;border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;gap:var(--space-4);">
        <div style="width:44px;height:44px;background:rgba(255,255,255,0.12);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:#4ade80;">
          ${icons.bell}
        </div>
        <div>
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);display:flex;align-items:center;gap:var(--space-2);">
            <span>WhatsApp & Invoice Automation Active</span>
            <span class="badge" style="background:rgba(74,222,128,0.2);color:#4ade80;font-size:10px;border:none;">● LIVE</span>
          </div>
          <div style="font-size:var(--text-xs);color:rgba(255,255,255,0.7);margin-top:2px;">
            Seat assignments auto-generate tax invoices & receipts with instant WhatsApp delivery.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border:none;" onclick="triggerRunReminders()">
          ${icons.repeat} Run Reminders
        </button>
        <button class="btn btn-sm" style="background:white;color:var(--sf-indigo-950);border:none;font-weight:var(--fw-semibold);" onclick="app.navigate('/notifications')">
          View Logs
        </button>
      </div>
    </div>

    <!-- Charts + Lists Row -->
    <div class="grid-3" style="gap:var(--space-5);margin-bottom:var(--space-6);">
      <!-- Revenue Chart -->
      <div class="card" style="grid-column: span 2;" id="revenue-card">
        <div class="card-header">
          <div>
            <div class="card-title" id="revenue-title">Revenue — Last ${revenueDays} Days</div>
            <div class="card-subtitle">${revenueDays === 90 ? 'Weekly' : 'Daily'} collection at ${utils.escapeHtml(branch?.name || '')}</div>
          </div>
          <div class="filter-tabs" id="revenue-range">
            ${[7, 30, 90].map(d => `<button type="button" class="filter-tab ${d === revenueDays ? 'active' : ''}" data-days="${d}">${d}D</button>`).join('')}
          </div>
        </div>
        <div class="card-body" id="revenue-body">
          ${renderRevenueChart(store.getRevenueChart(branchId, revenueDays), revenueDays)}
        </div>
      </div>

      <!-- Occupancy Donut -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Occupancy</div>
            <div class="card-subtitle">By status</div>
          </div>
        </div>
        <div class="card-body">
          ${renderOccupancyChart(occupancyData, stats.totalSeats)}
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid-3" style="gap:var(--space-5);">
      <!-- Expiring memberships -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Expiring Memberships</div>
            <div class="card-subtitle">Next 14 days</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/memberships')">View All</button>
        </div>
        <div style="max-height:320px;overflow-y:auto;">
          ${expiring.length ? expiring.slice(0, 6).map(item => renderExpiryItem(item)).join('') : `
            <div class="empty-state" style="padding:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title" style="font-size:var(--text-sm);">No memberships expiring soon</div>
            </div>
          `}
        </div>
      </div>

      <!-- Pending dues -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Pending Dues</div>
            <div class="card-subtitle">Requires collection</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/payments')">View All</button>
        </div>
        <div style="max-height:320px;overflow-y:auto;">
          ${pendingDues.length ? pendingDues.map(item => renderDueItem(item)).join('') : `
            <div class="empty-state" style="padding:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title" style="font-size:var(--text-sm);">All dues cleared!</div>
            </div>
          `}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">Latest updates</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/activity')">View All</button>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${recentActivity.map(a => renderActivityItem(a)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Revenue range: 7D / 30D / 90D redraw only the chart
  container.querySelectorAll('#revenue-range [data-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      revenueDays = Number(btn.getAttribute('data-days'));
      try { localStorage.setItem('sf_revenue_days', String(revenueDays)); } catch (_) { }
      container.querySelectorAll('#revenue-range [data-days]').forEach(b => b.classList.toggle('active', b === btn));
      const title = container.querySelector('#revenue-title');
      if (title) title.textContent = `Revenue — Last ${revenueDays} Days`;
      const sub = title?.parentElement?.querySelector('.card-subtitle');
      if (sub) sub.textContent = `${revenueDays === 90 ? 'Weekly' : 'Daily'} collection at ${branch?.name || ''}`;
      const body = container.querySelector('#revenue-body');
      if (body) body.innerHTML = renderRevenueChart(store.getRevenueChart(branchId, revenueDays), revenueDays);
    });
  });

  // Animate cards
  container.querySelectorAll('.stat-card, .card').forEach((el, i) => {
    el.style.animationDelay = `${i * 40}ms`;
    el.classList.add('animate-fadeInUp');
  });

  // Reconcile financial KPIs with /api/reports authoritative server calculations
  store.getReports({ branchId }).then(rep => {
    if (rep && rep.ok) {
      const revCard = document.querySelector('#stat-revenue .stat-card-value');
      const revSub = document.querySelector('#stat-revenue .stat-card-change');
      const duesCard = document.querySelector('#stat-dues .stat-card-value');
      if (revCard) {
        const todayStr = utils.today();
        const serverToday = (rep.dailyRevenue || []).filter(d => d.date === todayStr).reduce((s, d) => s + d.amount, 0);
        revCard.textContent = utils.formatINR(serverToday);
      }
      if (revSub) {
        revSub.textContent = `${utils.formatINR(rep.totalRevenue)} this month`;
      }
      if (duesCard) {
        duesCard.textContent = utils.formatINR(rep.totalOutstandingDues);
      }
    }
  }).catch(() => { });
}

function renderStatCard(label, value, sub, id, iconBg, iconColor, iconSvg) {
  return `
    <div class="stat-card" id="stat-${id}">
      <div class="stat-card-top">
        <div class="stat-card-label">${label}</div>
        <div class="stat-card-icon" style="background:${iconBg};color:${iconColor};">${iconSvg}</div>
      </div>
      <div class="stat-card-value">${value}</div>
      ${sub ? `<div class="stat-card-change neutral">${sub}</div>` : ''}
    </div>
  `;
}

// Daily bars for 7 and 30 days; 90 days is grouped into weeks so the bars stay readable.
// Colours use theme tokens so the chart is legible in both light and dark mode.
function renderRevenueChart(daily, days = daily.length) {
  let bars = daily;
  if (days >= 60) {
    bars = [];
    for (let i = 0; i < daily.length; i += 7) {
      const week = daily.slice(i, i + 7);
      const first = week[0], lastDay = week[week.length - 1];
      bars.push({
        amount: week.reduce((s, d) => s + d.amount, 0),
        label: first.label,
        title: `${first.label} – ${lastDay.label}`,
      });
    }
  }
  const total = daily.reduce((s, d) => s + d.amount, 0);
  const activeDays = daily.filter(d => d.amount > 0).length;
  const best = daily.reduce((b, d) => (d.amount > (b ? b.amount : 0) ? d : b), null);
  const max = Math.max(...bars.map(d => d.amount), 1);
  const showValues = bars.length <= 14;
  const labelEvery = bars.length > 14 ? Math.ceil(bars.length / 8) : 1;

  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;gap:var(--space-5);flex-wrap:wrap;font-size:var(--text-xs);color:var(--color-text-secondary);">
        <div>Collected <strong style="font-size:var(--text-base);color:var(--color-text-primary);">${utils.formatINR(total)}</strong></div>
        <div>Avg / day <strong style="color:var(--color-text-primary);">${utils.formatINR(Math.round(total / Math.max(daily.length, 1)))}</strong></div>
        <div>Days with collections <strong style="color:var(--color-text-primary);">${activeDays} / ${daily.length}</strong></div>
        ${best && best.amount > 0 ? `<div>Best day <strong style="color:var(--color-text-primary);">${utils.escapeHtml(best.label)} · ${utils.formatINR(best.amount)}</strong></div>` : ''}
      </div>
      <div style="display:flex;align-items:flex-end;gap:${bars.length > 14 ? '2px' : 'var(--space-2)'};height:140px;">
        ${bars.map((d, i) => {
    const height = Math.round((d.amount / max) * 100);
    const isLast = i === bars.length - 1;
    const tip = `${d.title || d.label}: ${utils.formatINR(d.amount)}`;
    return `
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="${utils.escapeHtml(tip)}">
              ${showValues && d.amount > 0 ? `<div style="font-size:0.625rem;font-weight:600;color:var(--color-text-secondary);margin-bottom:2px;white-space:nowrap;">${utils.formatINR(d.amount)}</div>` : ''}
              <div style="width:100%;height:${d.amount > 0 ? Math.max(height, 4) : 2}%;background:var(--color-primary);opacity:${d.amount > 0 ? (isLast ? 1 : 0.6) : 0.18};border-radius:var(--radius-xs) var(--radius-xs) 0 0;transition:height 0.4s, opacity 0.15s;cursor:default;"
                onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=${d.amount > 0 ? (isLast ? 1 : 0.6) : 0.18}"></div>
            </div>
          `;
  }).join('')}
      </div>
      <div style="display:flex;gap:${bars.length > 14 ? '2px' : 'var(--space-2)'};">
        ${bars.map((d, i) => `<div style="flex:1;min-width:0;text-align:center;font-size:0.625rem;color:var(--color-text-secondary);white-space:nowrap;overflow:visible;">${(i % labelEvery === 0 || i === bars.length - 1) ? utils.escapeHtml(d.label) : ''}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderOccupancyChart(data, total) {
  const occupancyPct = total > 0 ? Math.round((data[0]?.value / total) * 100) : 0;
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <!-- Donut chart simulation with CSS -->
      <div style="position:relative;display:flex;align-items:center;justify-content:center;height:140px;">
        <svg viewBox="0 0 140 140" width="140" height="140">
          ${renderDonutSegments(data, total)}
        </svg>
        <div style="position:absolute;text-align:center;">
          <div style="font-size:var(--text-2xl);font-weight:var(--fw-bold);color:var(--color-text-primary);">${occupancyPct}%</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Occupied</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-2);">
        ${data.map(d => `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <div style="width:10px;height:10px;border-radius:var(--radius-sm);background:${d.color};flex-shrink:0;"></div>
              <span style="font-size:var(--text-xs);color:var(--color-text-secondary);">${d.label}</span>
            </div>
            <span style="font-size:var(--text-xs);font-weight:var(--fw-semibold);color:var(--color-text-primary);">${d.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDonutSegments(data, total) {
  if (total === 0) return `<circle cx="70" cy="70" r="50" fill="none" stroke="var(--color-bg-tertiary)" stroke-width="20"/>`;

  const circumference = 2 * Math.PI * 50;
  let currentOffset = 0;
  const segments = [];

  data.forEach(d => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    segments.push(`
      <circle cx="70" cy="70" r="50" fill="none"
        stroke="${d.color}" stroke-width="20"
        stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${-currentOffset}"
        transform="rotate(-90 70 70)"
        opacity="0.9"
      />
    `);
    currentOffset += dash;
  });

  if (!segments.length) {
    return `<circle cx="70" cy="70" r="50" fill="none" stroke="var(--color-bg-tertiary)" stroke-width="20"/>`;
  }

  return segments.join('');
}

function renderExpiryItem(item) {
  const { student, seat, daysLeft, endDate } = item;
  if (!student) return '';

  const urgency = daysLeft <= 3 ? 'error' : daysLeft <= 7 ? 'warning' : 'neutral';
  const colors = { error: 'var(--sf-error-500)', warning: 'var(--sf-warning-500)', neutral: 'var(--sf-gray-400)' };

  return `
    <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-secondary);cursor:pointer;"
      onclick="app.navigate('/student', {id:'${student.id}'})"
      onmouseenter="this.style.background='var(--color-bg-hover)'" onmouseleave="this.style.background='transparent'">
      <div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat ? 'Seat ' + seat.label : 'No seat'} · Exp ${utils.formatDate(endDate, { day: 'numeric', month: 'short' })}</div>
      </div>
      <div style="font-size:var(--text-xs);font-weight:var(--fw-semibold);color:${colors[urgency]};flex-shrink:0;">
        ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
      </div>
    </div>
  `;
}

function renderDueItem(item) {
  const { student, seat, pendingAmount } = item;
  if (!student) return '';

  return `
    <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-secondary);cursor:pointer;"
      onclick="app.navigate('/student', {id:'${student.id}'})"
      onmouseenter="this.style.background='var(--color-bg-hover)'" onmouseleave="this.style.background='transparent'">
      <div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat ? 'Seat ' + seat.label : 'No seat'}</div>
      </div>
      <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--sf-error-600);flex-shrink:0;">${utils.formatINR(pendingAmount)}</div>
    </div>
  `;
}

function renderActivityItem(a) {
  const actionIcons = {
    seat_assigned: icons['map-pin'],
    payment_recorded: icons['dollar-sign'],
    seat_released: icons.checkCircle,
    seat_transferred: icons['arrow-right'],
    membership_renewed: icons.repeat,
    student_created: icons['user-plus'],
    check_in: icons.clock,
    check_out: icons.clock,
    seat_maintenance: icons.tool,
  };
  const icon = actionIcons[a.action] || icons.activity;

  return `
    <div class="timeline-item">
      <div class="timeline-dot">${icon}</div>
      <div class="timeline-content">
        <div class="timeline-title">${a.description}</div>
        <div class="timeline-time">${utils.formatRelative(a.timestamp)}</div>
      </div>
    </div>
  `;
}

// ── Quick Edit Custom Library & Branch Name ────────────────────────
if (typeof window !== 'undefined') {
  window.openEditLibraryNameModal = function () {
    const branchId = store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const org = store.organization || {};
    const currentOrgName = org.name || 'My Library';
    const currentBranchName = branch?.name || 'Main Branch';

    const escA = (s) => (utils.escapeAttr ? utils.escapeAttr(s) : String(s || ''));

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0;line-height:1.5;">
          Enter your custom <strong>Library Name</strong> and <strong>Branch Name</strong>. This will be updated everywhere across your dashboard, invoices, receipts, and WhatsApp templates.
        </p>
        <div class="form-group">
          <label class="form-label" for="modal-edit-org-name">Library / Organization Name *</label>
          <input type="text" class="input" id="modal-edit-org-name" value="${escA(currentOrgName)}" placeholder="e.g. Sangarsh Study Hub / Apex Library" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-edit-branch-name">Branch Name *</label>
          <input type="text" class="input" id="modal-edit-branch-name" value="${escA(currentBranchName)}" placeholder="e.g. Main Branch / Kothrud Campus" required />
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-custom-library-name" onclick="saveCustomLibraryName('${branchId || ''}')">Save Custom Name</button>
    `;

    modal.open('Customize Library & Branch Name', bodyHtml, footerHtml);
  };

  window.saveCustomLibraryName = async function (branchId) {
    const orgInput = document.getElementById('modal-edit-org-name');
    const branchInput = document.getElementById('modal-edit-branch-name');
    const btn = document.getElementById('btn-save-custom-library-name');

    const newOrgName = orgInput?.value?.trim();
    const newBranchName = branchInput?.value?.trim();

    if (!newOrgName || !newBranchName) {
      toast.show('Please fill in both Library Name and Branch Name', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#ffffff;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Saving...`;
    }

    try {
      // 1. Update organization name in settings & store
      await store.updateSettings({ orgName: newOrgName });
      if (store.organization) {
        store.organization.name = newOrgName;
      }

      // 2. Update branch name in store & DB if branch exists
      if (branchId) {
        await store.updateBranch(branchId, { name: newBranchName });
      }

      modal.close();
      toast.show(`Library name updated to "${newOrgName}"!`, 'success');
      app._navigate();
    } catch (err) {
      toast.show(err.message || 'Failed to update library name', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Custom Name';
      }
    }
  };
}

