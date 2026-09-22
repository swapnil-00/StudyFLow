// Dashboard Page
export function renderDashboard(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const expiring = store.getExpiringMemberships(branchId, 14);
  const pendingDues = store.getPendingDues(branchId).slice(0, 5);
  const recentActivity = store.getActivityLogs(8);
  const revenueChart = store.getRevenueChart(branchId, 7);
  const occupancyData = store.getOccupancyData(branchId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">${greeting}, Admin 👋</h1>
          <p class="page-subtitle">Here's what's happening at <strong>${branch?.name || 'your library'}</strong> today.</p>
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" onclick="app.navigate('/seat-map')">
            ${icons.map} View Seat Map
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
      ${renderStatCard('Occupied', stats.occupied, `${Math.round((stats.occupied/Math.max(stats.totalSeats,1))*100)}% occupancy`, 'occupied', '#eef4ff', '#444ce7', icons.users)}
      ${renderStatCard('Available', stats.available, `${stats.reserved} reserved`, 'available', '#ecfdf3', '#17b26a', icons.checkCircle)}
      ${renderStatCard("Today's Revenue", utils.formatINR(stats.todayRevenue), `${utils.formatINR(stats.monthRevenue)} this month`, 'revenue', '#fef0c7', '#f79009', icons['dollar-sign'])}
    </div>

    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderStatCard('Pending Dues', utils.formatINR(stats.totalPending), 'Total outstanding', 'dues', '#fee4e2', '#f04438', icons['alert-circle'])}
      ${renderStatCard('Expiring Soon', stats.expiringCount, 'Within 14 days', 'expiring', '#fef0c7', '#dc6803', icons.clock)}
      ${renderStatCard("Today's Attendance", stats.presentToday, `of ${store.getStudents(branchId).length} students`, 'attendance', '#ecfdf3', '#079455', icons.checkCircle)}
      ${renderStatCard('Under Maintenance', stats.maintenance, 'Seats blocked', 'maintenance', '#f3f4f6', '#6c737f', icons.tool)}
    </div>

    <!-- Charts + Lists Row -->
    <div class="grid-3" style="gap:var(--space-5);margin-bottom:var(--space-6);">
      <!-- Revenue Chart -->
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <div>
            <div class="card-title">Revenue — Last 7 Days</div>
            <div class="card-subtitle">Daily collection at ${branch?.name}</div>
          </div>
          <div class="filter-tabs">
            <button class="filter-tab active">7D</button>
            <button class="filter-tab">30D</button>
            <button class="filter-tab">90D</button>
          </div>
        </div>
        <div class="card-body">
          ${renderRevenueChart(revenueChart)}
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
          ${expiring.length ? expiring.slice(0,6).map(item => renderExpiryItem(item)).join('') : `
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

  // Animate cards
  container.querySelectorAll('.stat-card, .card').forEach((el, i) => {
    el.style.animationDelay = `${i * 40}ms`;
    el.classList.add('animate-fadeInUp');
  });
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

function renderRevenueChart(data) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;align-items:flex-end;gap:var(--space-2);height:120px;">
        ${data.map((d, i) => {
          const height = max > 0 ? Math.round((d.amount / max) * 100) : 5;
          const isToday = i === data.length - 1;
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);height:100%;">
              <div class="tooltip-wrap" style="flex:1;width:100%;display:flex;align-items:flex-end;">
                <div style="width:100%;height:${Math.max(height, 4)}%;background:${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xs) var(--radius-xs) 0 0;transition:height 0.5s;cursor:pointer;"
                  onmouseenter="this.style.background='var(--sf-indigo-500)'" onmouseleave="this.style.background='${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'}'">
                </div>
                <div class="tooltip">${utils.formatINR(d.amount)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;gap:var(--space-2);">
        ${data.map(d => `<div style="flex:1;text-align:center;font-size:0.625rem;color:var(--color-text-quaternary);">${d.label}</div>`).join('')}
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
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat ? 'Seat ' + seat.label : 'No seat'} · Exp ${utils.formatDate(endDate, {day:'numeric',month:'short'})}</div>
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
