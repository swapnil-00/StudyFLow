// StudyFlow Bundled Application Scripts
window.Pages = window.Pages || {};

// ─── PAGE: dashboard.js ───
(function() {
// Dashboard Page
window.Pages.renderDashboard = function renderDashboard(container) {
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

})();

// ─── PAGE: seat-map.js ───
(function() {
// Seat Map Page — Visual seat management
window.Pages.renderSeatMap = function renderSeatMap(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const floors = store.getFloors(branchId);

  const state = {
    floorId: floors[0]?.id || null,
    roomId: null,
    filter: 'all',
    zoom: 1,
    selectedSeatId: null,
    searchQuery: ''
  };

  function render() {
    const floor = state.floorId ? store.getFloor(state.floorId) : null;
    const rooms = state.floorId ? store.getRooms(state.floorId) : [];
    const activeRoom = state.roomId ? store.getRoom(state.roomId) : rooms[0];
    const seats = activeRoom ? store.getSeats(activeRoom.id) : [];

    const stats = store.getDashboardStats(branchId);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Seat Map</h1>
            <p class="page-subtitle">${branch?.name} · Visual seat management</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" onclick="seatMapState.zoom=Math.max(0.6,seatMapState.zoom-0.1);updateZoom()">
              ${icons.zoomOut}
            </button>
            <button class="btn btn-secondary" onclick="seatMapState.zoom=Math.min(1.8,seatMapState.zoom+0.1);updateZoom()">
              ${icons.zoomIn}
            </button>
            <button class="btn btn-primary" onclick="openAssignModal()">
              ${icons.plus} Assign Seat
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5);">
        ${renderSeatStat('Total', stats.totalSeats, 'neutral')}
        ${renderSeatStat('Occupied', stats.occupied, 'indigo')}
        ${renderSeatStat('Available', stats.available, 'success')}
        ${renderSeatStat('Reserved', stats.reserved, 'warning')}
        ${renderSeatStat('Maintenance', stats.maintenance, 'neutral')}
      </div>

      <div class="seat-map-container">
        <!-- Toolbar -->
        <div class="seat-map-toolbar">
          <!-- Floor selector -->
          <select class="select" style="width:auto;" id="floor-select" onchange="handleFloorChange(this.value)">
            ${floors.map(f => `<option value="${f.id}" ${f.id === state.floorId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>

          <!-- Room selector -->
          <select class="select" style="width:auto;" id="room-select" onchange="handleRoomChange(this.value)">
            ${rooms.map(r => `<option value="${r.id}" ${r.id === activeRoom?.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>

          <div style="flex:1;"></div>

          <!-- Search -->
          <div class="input-group" style="max-width:200px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search seat/student..." id="seat-search"
              value="${state.searchQuery}"
              oninput="handleSeatSearch(this.value)"
            />
          </div>

          <!-- Filter -->
          <div class="filter-tabs" id="seat-filters">
            ${['all','available','occupied','reserved','payment-due','expiring','maintenance','blocked'].map(f => `
              <button class="filter-tab ${state.filter === f ? 'active' : ''}"
                onclick="handleFilterChange('${f}')">
                ${f === 'all' ? 'All' : capitalizeFirst(f)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Legend -->
        <div class="seat-map-legend">
          ${[
            { status: 'available', label: 'Available', bg: 'var(--seat-available-dot)' },
            { status: 'occupied', label: 'Occupied', bg: 'var(--seat-occupied-dot)' },
            { status: 'reserved', label: 'Reserved', bg: 'var(--seat-reserved-dot)' },
            { status: 'payment-due', label: 'Payment Due', bg: 'var(--seat-payment-due-dot)' },
            { status: 'expiring', label: 'Expiring Soon', bg: 'var(--seat-expiring-dot)' },
            { status: 'maintenance', label: 'Maintenance', bg: 'var(--seat-maintenance-dot)' },
            { status: 'blocked', label: 'Blocked', bg: 'var(--seat-blocked-dot)' },
          ].map(item => `
            <div class="legend-item">
              <div class="legend-dot" style="background:${item.bg};"></div>
              ${item.label}
            </div>
          `).join('')}
          <div style="flex:1;"></div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
            ${activeRoom ? `${activeRoom.name} · ${seats.length} seats` : 'No room selected'}
          </div>
        </div>

        <!-- Seat Grid -->
        <div class="seat-map-floor" id="seat-map-floor" style="transform-origin:top left;">
          ${activeRoom ? renderRoom(activeRoom, seats, state) : `
            <div class="empty-state">
              <div class="empty-icon">${icons.map}</div>
              <div class="empty-title">No room selected</div>
              <div class="empty-desc">Please select a floor and room to view the seat map.</div>
            </div>
          `}
        </div>
      </div>
    `;

    // Store state globally for event handlers
    window.seatMapState = state;
    window.handleFloorChange = (id) => { state.floorId = id; state.roomId = null; render(); };
    window.handleRoomChange = (id) => { state.roomId = id; render(); };
    window.handleFilterChange = (f) => { state.filter = f; render(); };
    window.handleSeatSearch = (q) => { state.searchQuery = q; render(); };
    window.updateZoom = () => {
      const floor = document.getElementById('seat-map-floor');
      if (floor) floor.style.transform = `scale(${seatMapState.zoom})`;
    };
  }

  render();
}

function renderSeatStat(label, count, color) {
  const colorMap = {
    neutral: { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    warning: { bg: 'var(--sf-warning-50)', text: 'var(--sf-warning-700)' },
    error: { bg: 'var(--sf-error-50)', text: 'var(--sf-error-700)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div style="background:${c.bg};border-radius:var(--radius-xl);padding:var(--space-3) var(--space-4);display:flex;flex-direction:column;gap:var(--space-1);">
      <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:${c.text};">${count}</div>
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${label}</div>
    </div>
  `;
}

function renderRoom(room, seats, state) {
  if (!seats.length) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icons.map}</div>
        <div class="empty-title">No seats configured</div>
        <div class="empty-desc">Add seats to this room in Floors & Rooms settings.</div>
        <button class="btn btn-secondary" onclick="app.navigate('/floors')">Configure Room</button>
      </div>
    `;
  }

  // Group by row
  const rows = {};
  seats.forEach(seat => {
    if (!rows[seat.row]) rows[seat.row] = [];
    rows[seat.row].push(seat);
  });

  // Apply filter and search
  const q = state.searchQuery?.toLowerCase();

  let html = `<div class="room-section">`;
  html += `<div class="room-label">${room.name}${room.acAvailable ? ' · AC' : ''} · ${room.type.toUpperCase()} · ${seats.length} seats</div>`;

  Object.entries(rows).sort(([a],[b]) => a.localeCompare(b)).forEach(([rowLabel, rowSeats]) => {
    html += `<div class="seat-row"><div class="row-label">${rowLabel}</div>`;

    rowSeats.sort((a, b) => a.col - b.col).forEach((seat, i) => {
      // Add aisle after column 3
      if (i > 0 && i % 3 === 0) {
        html += `<div class="seat-aisle"></div>`;
      }

      const status = store.getSeatStatus(seat.id);
      const assignment = store.getActiveAssignment(seat.id);
      const student = assignment ? store.getStudent(assignment.studentId) : null;

      // Filter
      if (state.filter !== 'all' && status !== state.filter) {
        html += `<div class="seat" style="visibility:hidden;pointer-events:none;"></div>`;
        return;
      }

      // Search
      let highlighted = false;
      if (q) {
        const matchesSeat = seat.label.toLowerCase().includes(q);
        const matchesStudent = student?.name.toLowerCase().includes(q);
        if (!matchesSeat && !matchesStudent) {
          html += `<div class="seat" style="opacity:0.15;pointer-events:none;"></div>`;
          return;
        }
        highlighted = true;
      }

      const statusClass = `seat-${status}`;
      const initials_ = student ? utils.initials(student.name) : '';
      const selected = state.selectedSeatId === seat.id;

      html += `
        <div class="seat ${statusClass} ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''}"
          id="seat-${seat.id}"
          onclick="openSeatDrawer('${seat.id}')"
          title="${seat.label}${student ? ' · ' + student.name : ''} · ${capitalizeFirst(status)}"
          role="button"
          aria-label="Seat ${seat.label}, ${capitalizeFirst(status)}${student ? ', ' + student.name : ''}"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ')openSeatDrawer('${seat.id}')"
        >
          <span class="seat-status-dot"></span>
          <span class="seat-number">${seat.label}</span>
          ${initials_ ? `<span class="seat-initials">${initials_}</span>` : ''}
        </div>
      `;
    });

    html += `</div>`; // seat-row
  });

  html += `</div>`; // room-section

  return html;
}

// ── Seat Drawer ───────────────────────────────────────────────────
window.openSeatDrawer = function(seatId) {
  const seat = store.getSeat(seatId);
  if (!seat) return;

  const status = store.getSeatStatus(seatId);
  const assignment = store.getActiveAssignment(seatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;
  const membership = assignment ? store.getMembership(assignment.membershipId) : null;
  const paymentStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const paidAmount = membership ? store.getPaidAmount(membership.id) : 0;
  const pendingAmount = membership ? store.getPendingAmount(membership.id) : 0;
  const todayAtt = student ? store.getAttendance(student.id, new Date().toISOString().split('T')[0]) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const room = store.getRoom(seat.roomId);
  const floor = room ? store.getFloor(room.floorId) : null;

  const bodyHTML = `
    <!-- Seat Header -->
    <div style="display:flex;align-items:center;gap:var(--space-3);padding-bottom:var(--space-5);border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-5);">
      <div style="width:48px;height:48px;background:var(--seat-${status}-bg);border:2px solid var(--seat-${status}-border);border-radius:var(--radius-lg);display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-size:0.625rem;font-weight:var(--fw-bold);color:var(--seat-${status}-text);">${seat.label}</span>
      </div>
      <div>
        <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">Seat ${seat.label}</div>
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:2px;">
          ${seatStatusBadge(status)}
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat.type.toUpperCase()} · ${room?.name || '—'}</span>
        </div>
      </div>
    </div>

    ${student ? renderStudentSection(student, membership, plan, paymentStatus, paidAmount, pendingAmount, todayAtt) : renderAvailableSection(seat)}
  `;

  const footerHTML = renderSeatActions(status, seat, student, membership);

  drawer.open(`Seat ${seat.label}`, bodyHTML, footerHTML);

  // Highlight selected seat
  document.querySelectorAll('.seat.selected').forEach(el => el.classList.remove('selected'));
  document.getElementById(`seat-${seatId}`)?.classList.add('selected');
}

function renderStudentSection(student, membership, plan, paymentStatus, paidAmount, pendingAmount, todayAtt) {
  const daysLeft = membership ? utils.daysUntil(membership.endDate) : null;

  return `
    <!-- Student Info -->
    <div class="drawer-section">
      <div class="drawer-section-title">Student</div>
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">
        <div class="avatar avatar-lg" style="background:${student.avatar};">${utils.initials(student.name)}</div>
        <div>
          <div style="font-size:var(--text-lg);font-weight:var(--fw-semibold);color:var(--color-text-primary);">${student.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${student.id}</div>
          <div style="display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-1);">
            ${icons.phone}<span style="font-size:var(--text-xs);color:var(--color-text-secondary);">${student.phone}</span>
          </div>
        </div>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Course</span>
        <span class="drawer-row-value">${student.course || '—'}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Email</span>
        <span class="drawer-row-value" style="font-size:var(--text-xs);">${student.email || '—'}</span>
      </div>
    </div>

    ${membership ? `
    <!-- Membership -->
    <div class="drawer-section">
      <div class="drawer-section-title">Membership</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Plan</span>
        <span class="drawer-row-value">${plan?.name || membership.planName || '—'}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Start Date</span>
        <span class="drawer-row-value">${utils.formatDate(membership.startDate)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Expiry Date</span>
        <span class="drawer-row-value">${utils.formatDate(membership.endDate)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Days Left</span>
        <span class="drawer-row-value" style="color:${daysLeft !== null && daysLeft <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-primary)'}">
          ${daysLeft !== null ? (daysLeft > 0 ? daysLeft + ' days' : 'Expired') : '—'}
        </span>
      </div>
    </div>

    <!-- Payment -->
    <div class="drawer-section">
      <div class="drawer-section-title">Payment</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Total Amount</span>
        <span class="drawer-row-value">${utils.formatINR(membership.price)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Paid</span>
        <span class="drawer-row-value" style="color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Pending</span>
        <span class="drawer-row-value" style="color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-tertiary)'};">
          ${utils.formatINR(pendingAmount)}
        </span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Status</span>
        <span class="drawer-row-value">${paymentStatusBadge(paymentStatus)}</span>
      </div>
    </div>
    ` : ''}

    <!-- Attendance Today -->
    <div class="drawer-section">
      <div class="drawer-section-title">Today's Attendance</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Status</span>
        <span class="drawer-row-value">
          ${todayAtt ? seatStatusBadge(todayAtt.status === 'checked-in' ? 'occupied' : 'available') : `<span class="badge badge-neutral"><span class="badge-dot"></span>Not arrived</span>`}
        </span>
      </div>
      ${todayAtt?.checkIn ? `
      <div class="drawer-row">
        <span class="drawer-row-label">Check-in</span>
        <span class="drawer-row-value">${utils.formatTime(todayAtt.checkIn)}</span>
      </div>` : ''}
      ${todayAtt?.checkOut ? `
      <div class="drawer-row">
        <span class="drawer-row-label">Check-out</span>
        <span class="drawer-row-value">${utils.formatTime(todayAtt.checkOut)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Duration</span>
        <span class="drawer-row-value">${todayAtt.duration ? Math.floor(todayAtt.duration/60)+'h '+todayAtt.duration%60+'m' : '—'}</span>
      </div>` : ''}
    </div>
  `;
}

function renderAvailableSection(seat) {
  return `
    <div class="empty-state" style="padding:var(--space-8) 0;">
      <div class="empty-icon" style="background:var(--seat-available-bg);color:var(--seat-available-text);">${icons.checkCircle}</div>
      <div class="empty-title">Seat Available</div>
      <div class="empty-desc">This seat is currently available for assignment. Click "Assign Seat" to allocate it to a student.</div>
    </div>
  `;
}

function renderSeatActions(status, seat, student, membership) {
  if (status === 'available') {
    return `
      <button class="btn btn-primary w-full" onclick="openAssignModal('${seat.id}')">
        ${icons['user-plus']} Assign Seat
      </button>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-secondary flex-1" onclick="openReservationModal('${seat.id}')">
          ${icons.calendar} Reserve
        </button>
        <button class="btn btn-secondary flex-1" onclick="setSeatMaintenance('${seat.id}')">
          ${icons.tool} Maintenance
        </button>
      </div>
    `;
  }

  if (status === 'maintenance' || status === 'blocked') {
    return `
      <button class="btn btn-success w-full" onclick="releaseMaintenance('${seat.id}')">
        ${icons.checkCircle} Mark Available
      </button>
    `;
  }

  // Occupied / payment-due / expiring / reserved
  return `
    ${student ? `
    <button class="btn btn-secondary w-full" onclick="app.navigate('/student', {id:'${student.id}'}); drawer.close()">
      ${icons.user} View Student Profile
    </button>` : ''}
    <div style="display:flex;gap:var(--space-2);">
      ${membership ? `
      <button class="btn btn-primary flex-1" onclick="openPaymentModal('${student?.id}', '${membership.id}')">
        ${icons['dollar-sign']} Payment
      </button>
      <button class="btn btn-secondary flex-1" onclick="openRenewModal('${student?.id}', '${seat.id}')">
        ${icons.repeat} Renew
      </button>
      ` : ''}
    </div>
    <div style="display:flex;gap:var(--space-2);">
      <button class="btn btn-secondary flex-1" onclick="openTransferModal('${seat.id}')">
        ${icons['arrow-right']} Transfer
      </button>
      <button class="btn btn-danger flex-1" onclick="openReleaseModal('${seat.id}')">
        ${icons.trash} Release
      </button>
    </div>
  `;
}

// ── Seat Actions ──────────────────────────────────────────────────
window.setSeatMaintenance = function(seatId) {
  confirmDialog('Mark as Maintenance', 'Are you sure you want to mark this seat as under maintenance? It will be unavailable for assignment.', () => {
    try {
      store.updateSeat(seatId, { status: 'maintenance' });
      store.addActivity({ action: 'seat_maintenance', entity: 'seat', entityId: seatId, description: `Seat marked for maintenance` });
      drawer.close();
      toast.show('Seat marked as maintenance', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  });
};

window.releaseMaintenance = function(seatId) {
  try {
    store.updateSeat(seatId, { status: 'available' });
    store.addActivity({ action: 'seat_available', entity: 'seat', entityId: seatId, description: `Seat marked available` });
    drawer.close();
    toast.show('Seat is now available', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Assign Seat Modal ─────────────────────────────────────────────
window.openAssignModal = function(seatId) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const plans = store.getMembershipPlans(branchId);

  // Pre-fill if seat already selected
  const seat = seatId ? store.getSeat(seatId) : null;

  // Get available seats
  const allSeats = store.getSeatsForBranch(branchId);
  const availableSeats = allSeats.filter(s => store.getSeatStatus(s.id) === 'available');

  const today_ = new Date().toISOString().split('T')[0];

  modal.open('Assign Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-5);">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="select" id="assign-student-id" onchange="updateAssignStudentInfo(this.value)">
          <option value="">Select student...</option>
          ${students.map(s => {
            const hasActiveSeat = !!store.getStudentAssignment(s.id);
            return `<option value="${s.id}" ${hasActiveSeat ? 'disabled' : ''}>${s.name} — ${s.phone}${hasActiveSeat ? ' (has seat)' : ''}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Seat <span class="required">*</span></label>
        <select class="select" id="assign-seat-id">
          ${seat ? `<option value="${seat.id}" selected>${seat.label}</option>` : `<option value="">Select seat...</option>`}
          ${availableSeats.filter(s => !seat || s.id !== seat.id).map(s => {
            const room = store.getRoom(s.roomId);
            return `<option value="${s.id}">${s.label} — ${room?.name || '—'}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Membership Plan <span class="required">*</span></label>
        <select class="select" id="assign-plan-id" onchange="updateAssignPrice(this.value)">
          <option value="">Select plan...</option>
          ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-duration="${p.duration}">${p.name} — ${utils.formatINR(p.price)} (${p.duration} days)</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" class="input" id="assign-start-date" value="${today_}" onchange="updateAssignEndDate()">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" class="input" id="assign-end-date" readonly style="background:var(--color-bg-secondary);">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-price" min="0" placeholder="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Discount (₹)</label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-discount" value="0" min="0">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Status <span class="required">*</span></label>
        <div class="filter-tabs" id="assign-payment-status-tabs">
          ${['paid','partial','pending'].map((s, i) => `
            <button class="filter-tab ${i === 0 ? 'active' : ''}"
              onclick="document.querySelectorAll('#assign-payment-status-tabs .filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.getElementById('assign-payment-amount-wrap').style.display=this.dataset.status!=='paid'?'block':'none';document.getElementById('assign-pay-amt').required=this.dataset.status!=='pending';"
              data-status="${s}">${capitalizeFirst(s)}</button>
          `).join('')}
        </div>
      </div>

      <div id="assign-payment-amount-wrap" style="display:none;">
        <div class="form-group">
          <label class="form-label">Amount Paid (₹)</label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-pay-amt" min="0" placeholder="Amount paid now">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select class="select" id="assign-payment-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="assign-notes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmAssignSeat()">
      ${icons['user-plus']} Assign Seat
    </button>
  `, { size: 'lg' });

  // Setup helpers
  window.updateAssignPrice = (planId) => {
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('assign-price').value = plan.price;
    updateAssignEndDate();
  };

  window.updateAssignEndDate = () => {
    const planId = document.getElementById('assign-plan-id').value;
    const startDate = document.getElementById('assign-start-date').value;
    if (!planId || !startDate) return;
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('assign-end-date').value = utils.addDays(startDate, plan.duration);
  };

  window.updateAssignStudentInfo = (studentId) => {
    // Could show student info preview
  };
};

window.confirmAssignSeat = function() {
  const studentId = document.getElementById('assign-student-id')?.value;
  const seatId = document.getElementById('assign-seat-id')?.value;
  const planId = document.getElementById('assign-plan-id')?.value;
  const startDate = document.getElementById('assign-start-date')?.value;
  const price = parseFloat(document.getElementById('assign-price')?.value || 0);
  const discount = parseFloat(document.getElementById('assign-discount')?.value || 0);
  const payMethod = document.getElementById('assign-payment-method')?.value;
  const notes = document.getElementById('assign-notes')?.value;

  if (!studentId) { toast.show('Please select a student', 'error'); return; }
  if (!seatId) { toast.show('Please select a seat', 'error'); return; }
  if (!planId) { toast.show('Please select a membership plan', 'error'); return; }
  if (!startDate) { toast.show('Please enter a start date', 'error'); return; }
  if (!price || price <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

  const plan = store.getMembershipPlan(planId);
  const endDate = utils.addDays(startDate, plan.duration);

  try {
    // Create membership
    const membership = store.addMembership({
      studentId,
      planId,
      planName: plan.name,
      startDate,
      endDate,
      price,
      discount,
      notes
    });

    // Assign seat
    store.assignSeat({
      studentId,
      seatId,
      membershipId: membership.id,
      startDate,
      endDate
    });

    // Record payment
    const activeTab = document.querySelector('#assign-payment-status-tabs .filter-tab.active');
    const payStatus = activeTab?.dataset.status || 'paid';
    let payAmount = price - discount;

    if (payStatus === 'partial') {
      payAmount = parseFloat(document.getElementById('assign-pay-amt')?.value || 0);
    } else if (payStatus === 'pending') {
      payAmount = 0;
    }

    if (payAmount > 0) {
      store.recordPayment({
        membershipId: membership.id,
        studentId,
        amount: payAmount,
        method: payMethod,
        notes
      });
    }

    modal.close();
    drawer.close();
    toast.show(`Seat assigned to ${store.getStudent(studentId)?.name} successfully!`, 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Transfer Modal ────────────────────────────────────────────────
window.openTransferModal = function(fromSeatId) {
  const fromSeat = store.getSeat(fromSeatId);
  const assignment = store.getActiveAssignment(fromSeatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;

  const branchId = store.getActiveBranchId();
  const availableSeats = store.getSeatsForBranch(branchId).filter(s =>
    store.getSeatStatus(s.id) === 'available' && s.id !== fromSeatId
  );

  modal.open('Transfer Seat', `
    <div style="margin-bottom:var(--space-5);padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-2);">CURRENT SEAT</div>
      <div style="display:flex;align-items:center;gap:var(--space-3);">
        ${student ? `<div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>` : ''}
        <div>
          <div style="font-weight:var(--fw-semibold);">${student?.name || 'Unknown Student'}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Seat ${fromSeat.label}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">New Seat <span class="required">*</span></label>
        <select class="select" id="transfer-to-seat">
          <option value="">Select available seat...</option>
          ${availableSeats.map(s => {
            const room = store.getRoom(s.roomId);
            return `<option value="${s.id}">${s.label} — ${room?.name || '—'}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Reason <span class="required">*</span></label>
        <select class="select" id="transfer-reason">
          <option>Student request</option>
          <option>Maintenance</option>
          <option>Operational</option>
          <option>Other</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmTransfer('${fromSeatId}', '${student?.id}')">
      ${icons['arrow-right']} Confirm Transfer
    </button>
  `);
};

window.confirmTransfer = function(fromSeatId, studentId) {
  const toSeatId = document.getElementById('transfer-to-seat')?.value;
  const reason = document.getElementById('transfer-reason')?.value;

  if (!toSeatId) { toast.show('Please select a destination seat', 'error'); return; }

  try {
    store.transferSeat(fromSeatId, toSeatId, studentId, reason);
    modal.close();
    drawer.close();
    const toSeat = store.getSeat(toSeatId);
    toast.show(`Seat transferred to ${toSeat.label}!`, 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Release Modal ─────────────────────────────────────────────────
window.openReleaseModal = function(seatId) {
  const seat = store.getSeat(seatId);
  const assignment = store.getActiveAssignment(seatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;
  const membership = assignment ? store.getMembership(assignment.membershipId) : null;
  const pending = membership ? store.getPendingAmount(membership.id) : 0;

  modal.open('Release Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      ${pending > 0 ? `
        <div style="padding:var(--space-3) var(--space-4);background:var(--sf-error-50);border:1px solid var(--sf-error-200);border-radius:var(--radius-lg);display:flex;align-items:center;gap:var(--space-3);">
          ${icons['alert-triangle']}
          <div>
            <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--sf-error-700);">Outstanding Balance</div>
            <div style="font-size:var(--text-xs);color:var(--sf-error-600);">Student has pending dues of ${utils.formatINR(pending)}. Please collect before releasing.</div>
          </div>
        </div>
      ` : ''}

      <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          ${student ? `<div class="avatar" style="background:${student.avatar};">${utils.initials(student.name)}</div>` : ''}
          <div>
            <div style="font-weight:var(--fw-semibold);">${student?.name || '—'}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Seat ${seat.label} · ${membership ? 'Expires ' + utils.formatDate(membership.endDate, {day:'numeric',month:'short'}) : '—'}</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Reason for Release <span class="required">*</span></label>
        <select class="select" id="release-reason">
          <option>Membership expired</option>
          <option>Student left</option>
          <option>Transferred to another branch</option>
          <option>Fee dispute</option>
          <option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Release Timing</label>
        <div class="filter-tabs">
          <button class="filter-tab active" id="release-now-btn" onclick="document.getElementById('release-now-btn').classList.add('active');document.getElementById('release-later-btn').classList.remove('active');">Immediately</button>
          <button class="filter-tab" id="release-later-btn" onclick="document.getElementById('release-later-btn').classList.add('active');document.getElementById('release-now-btn').classList.remove('active');">After Expiry</button>
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-danger" onclick="confirmRelease('${seatId}')">
      ${icons.trash} Release Seat
    </button>
  `);
};

window.confirmRelease = function(seatId) {
  const reason = document.getElementById('release-reason')?.value;
  try {
    store.releaseSeat(seatId, reason, 'admin');
    modal.close();
    drawer.close();
    toast.show('Seat released successfully', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Payment Modal ─────────────────────────────────────────────────
window.openPaymentModal = function(studentId, membershipId) {
  const student = store.getStudent(studentId);
  const membership = store.getMembership(membershipId);
  const pending = store.getPendingAmount(membershipId);
  const paid = store.getPaidAmount(membershipId);
  const plan = store.getMembershipPlan(membership?.planId);

  modal.open('Record Payment', `
    <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Total Due</span>
        <span style="font-weight:var(--fw-semibold);">${utils.formatINR(membership?.price)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Already Paid</span>
        <span style="color:var(--sf-success-600);font-weight:var(--fw-semibold);">${utils.formatINR(paid)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
        <span style="font-size:var(--text-sm);font-weight:var(--fw-semibold);">Outstanding</span>
        <span style="font-weight:var(--fw-bold);color:var(--sf-error-600);">${utils.formatINR(pending)}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">Amount (₹) <span class="required">*</span></label>
        <div class="input-group">
          <span class="input-group-prefix">₹</span>
          <input type="number" class="input" id="pay-amount" value="${pending}" min="1" max="${pending + 5000}">
        </div>
        <div class="form-hint">Outstanding: ${utils.formatINR(pending)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method <span class="required">*</span></label>
        <select class="select" id="pay-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Transaction / Reference ID</label>
        <input type="text" class="input" id="pay-txn-id" placeholder="Optional reference number">
      </div>

      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="input" id="pay-date" value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="pay-notes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmPayment('${membershipId}', '${studentId}')">
      ${icons['dollar-sign']} Record Payment
    </button>
  `);
};

window.confirmPayment = function(membershipId, studentId) {
  const amount = parseFloat(document.getElementById('pay-amount')?.value || 0);
  const method = document.getElementById('pay-method')?.value;
  const txnId = document.getElementById('pay-txn-id')?.value;
  const notes = document.getElementById('pay-notes')?.value;

  if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

  try {
    store.recordPayment({ membershipId, studentId, amount, method, txnId, notes });
    modal.close();
    toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Renew Modal ───────────────────────────────────────────────────
window.openRenewModal = function(studentId, seatId) {
  const student = store.getStudent(studentId);
  const branchId = store.getActiveBranchId();
  const currentMembership = store.getActiveMembership(studentId);
  const plans = store.getMembershipPlans(branchId);

  const newStart = currentMembership
    ? utils.addDays(currentMembership.endDate, 1)
    : new Date().toISOString().split('T')[0];

  modal.open('Renew Membership', `
    <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1);">RENEWING FOR</div>
      <div style="font-weight:var(--fw-semibold);">${student?.name}</div>
      ${currentMembership ? `
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1);">Current plan expires: ${utils.formatDate(currentMembership.endDate)}</div>
      ` : ''}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">New Plan <span class="required">*</span></label>
        <select class="select" id="renew-plan" onchange="updateRenewDates(this.value, '${newStart}')">
          <option value="">Select plan...</option>
          ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-duration="${p.duration}">${p.name} — ${utils.formatINR(p.price)}</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input type="date" class="input" id="renew-start" value="${newStart}" onchange="updateRenewEndDate()">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" class="input" id="renew-end" readonly style="background:var(--color-bg-secondary);">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount (₹)</label>
        <div class="input-group">
          <span class="input-group-prefix">₹</span>
          <input type="number" class="input" id="renew-price" min="0">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select class="select" id="renew-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmRenew('${studentId}', '${seatId}')">
      ${icons.repeat} Renew Membership
    </button>
  `);

  window.updateRenewDates = (planId, start) => {
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('renew-price').value = plan.price;
    const startDate = document.getElementById('renew-start').value || start;
    document.getElementById('renew-end').value = utils.addDays(startDate, plan.duration);
  };

  window.updateRenewEndDate = () => {
    const planId = document.getElementById('renew-plan').value;
    const startDate = document.getElementById('renew-start').value;
    if (!planId || !startDate) return;
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('renew-end').value = utils.addDays(startDate, plan.duration);
  };
};

window.confirmRenew = function(studentId, seatId) {
  const planId = document.getElementById('renew-plan')?.value;
  const startDate = document.getElementById('renew-start')?.value;
  const price = parseFloat(document.getElementById('renew-price')?.value || 0);
  const method = document.getElementById('renew-method')?.value;

  if (!planId) { toast.show('Please select a plan', 'error'); return; }
  if (!startDate) { toast.show('Please enter a start date', 'error'); return; }

  const plan = store.getMembershipPlan(planId);
  const endDate = utils.addDays(startDate, plan.duration);

  try {
    // Cancel old membership
    const oldMem = store.getActiveMembership(studentId);
    if (oldMem) store.updateMembership(oldMem.id, { status: 'renewed' });

    // Create new membership
    const newMem = store.addMembership({
      studentId, planId, planName: plan.name, startDate, endDate, price, discount: 0
    });

    // Update assignment
    const assignment = store.getStudentAssignment(studentId);
    if (assignment) {
      const db = store.db;
      const idx = db.seatAssignments.findIndex(a => a.id === assignment.id);
      if (idx !== -1) { db.seatAssignments[idx].membershipId = newMem.id; db.seatAssignments[idx].endDate = endDate; store._save(db); }
    }

    // Record payment
    if (price > 0) {
      store.recordPayment({ membershipId: newMem.id, studentId, amount: price, method });
    }

    store.addActivity({ action: 'membership_renewed', entity: 'membership', entityId: newMem.id, description: `Membership renewed for ${store.getStudent(studentId)?.name}` });

    modal.close();
    drawer.close();
    toast.show('Membership renewed successfully!', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Reservation Modal ─────────────────────────────────────────────
window.openReservationModal = function(seatId) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const seat = store.getSeat(seatId);
  const today_ = new Date().toISOString().split('T')[0];

  modal.open('Reserve Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="select" id="reserve-student">
          <option value="">Select student...</option>
          ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" class="input" id="reserve-start" value="${today_}">
        </div>
        <div class="form-group">
          <label class="form-label">End Date <span class="required">*</span></label>
          <input type="date" class="input" id="reserve-end" value="${utils.addDays(today_, 30)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="reserve-notes" rows="2" placeholder="Reason for reservation..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmReservation('${seatId}')">
      ${icons.calendar} Reserve Seat
    </button>
  `);
};

window.confirmReservation = function(seatId) {
  const studentId = document.getElementById('reserve-student')?.value;
  const startDate = document.getElementById('reserve-start')?.value;
  const endDate = document.getElementById('reserve-end')?.value;
  const notes = document.getElementById('reserve-notes')?.value;

  if (!studentId) { toast.show('Please select a student', 'error'); return; }
  if (!startDate || !endDate) { toast.show('Please enter dates', 'error'); return; }
  if (new Date(endDate) <= new Date(startDate)) { toast.show('End date must be after start date', 'error'); return; }

  try {
    store.addReservation({ studentId, seatId, startDate, endDate, notes });
    modal.close();
    drawer.close();
    toast.show('Seat reserved!', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

})();

// ─── PAGE: students.js ───
(function() {
// Students Page
window.Pages.renderStudents = function renderStudents(container) {
  const branchId = store.getActiveBranchId();
  let students = store.getStudents(branchId);
  let filter = 'all';
  let search = '';
  let page = 1;
  const perPage = 15;

  function getFilteredStudents() {
    let result = [...students];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      const today_ = new Date();
      result = result.filter(s => {
        const membership = store.getActiveMembership(s.id);
        const assignment = store.getStudentAssignment(s.id);
        switch (filter) {
          case 'active': return membership && new Date(membership.endDate) >= today_;
          case 'expired': return !membership || new Date(membership.endDate) < today_;
          case 'expiring': {
            if (!membership) return false;
            const d = utils.daysUntil(membership.endDate);
            return d !== null && d >= 0 && d <= 7;
          }
          case 'payment-due': {
            if (!membership) return false;
            return store.getPaymentStatus(membership.id) !== 'paid';
          }
          case 'no-seat': return !assignment;
          default: return true;
        }
      });
    }
    return result;
  }

  function render() {
    const filtered = getFilteredStudents();
    const totalPages = Math.ceil(filtered.length / perPage);
    const pageStudents = filtered.slice((page - 1) * perPage, page * perPage);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Students</h1>
            <p class="page-subtitle">${students.length} students registered</p>
          </div>
          <button class="btn btn-primary" id="add-student-btn" onclick="openAddStudentModal()">
            ${icons['user-plus']} Add Student
          </button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
            <div class="input-group" style="width:260px;">
              <div class="input-group-prefix">${icons.search}</div>
              <input class="input" type="text" placeholder="Search by name, phone, ID..." id="student-search"
                value="${search}"
                oninput="handleStudentSearch(this.value)"
              />
            </div>
            <div class="filter-tabs">
              ${['all','active','expired','expiring','payment-due','no-seat'].map(f => `
                <button class="filter-tab ${filter === f ? 'active' : ''}" onclick="setStudentFilter('${f}')">
                  ${f === 'all' ? 'All' : f === 'payment-due' ? 'Payment Due' : f === 'no-seat' ? 'No Seat' : capitalizeFirst(f)}
                </button>
              `).join('')}
            </div>
          </div>
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${filtered.length} result${filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Seat</th>
                <th>Plan</th>
                <th>Start</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${pageStudents.length ? pageStudents.map(s => renderStudentRow(s)).join('') : `
                <tr><td colspan="9">
                  <div class="empty-state">
                    <div class="empty-icon">${icons.users}</div>
                    <div class="empty-title">No students found</div>
                    <div class="empty-desc">${search ? 'Try a different search.' : 'Add a student to get started.'}</div>
                    ${!search ? `<button class="btn btn-primary" onclick="openAddStudentModal()">Add Student</button>` : ''}
                  </div>
                </td></tr>
              `}
            </tbody>
          </table>
        </div>

        ${totalPages > 1 ? `
        <div class="table-footer">
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">
            Showing ${(page-1)*perPage+1}–${Math.min(page*perPage,filtered.length)} of ${filtered.length}
          </div>
          <div class="table-pagination">
            <button class="page-btn" onclick="setPage(${page-1})" ${page === 1 ? 'disabled' : ''}>${icons.chevronLeft}</button>
            ${Array.from({length:Math.min(totalPages,5)}).map((_,i) => {
              const p = i + 1;
              return `<button class="page-btn ${page === p ? 'active' : ''}" onclick="setPage(${p})">${p}</button>`;
            }).join('')}
            <button class="page-btn" onclick="setPage(${page+1})" ${page === totalPages ? 'disabled' : ''}>${icons.chevronRight}</button>
          </div>
        </div>` : ''}
      </div>
    `;

    window.handleStudentSearch = (q) => { search = q; page = 1; render(); };
    window.setStudentFilter = (f) => { filter = f; page = 1; render(); };
    window.setPage = (p) => { page = p; render(); };
  }

  render();
}

function renderStudentRow(s) {
  const membership = store.getActiveMembership(s.id);
  const assignment = store.getStudentAssignment(s.id);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const payStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const today_ = new Date();
  const isActive = membership && new Date(membership.endDate) >= today_;

  return `
    <tr onclick="app.navigate('/student', {id:'${s.id}'})">
      <td>
        <div class="student-cell">
          <div class="avatar" style="background:${s.avatar};">${utils.initials(s.name)}</div>
          <div>
            <div class="student-name">${s.name}</div>
            <div class="student-id">${s.id}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--color-text-secondary);">${s.phone}</td>
      <td>
        ${seat ? `<span class="badge badge-indigo"><span class="badge-dot"></span>${seat.label}</span>` : `<span style="color:var(--color-text-quaternary);">—</span>`}
      </td>
      <td style="color:var(--color-text-secondary);">${plan?.name || '—'}</td>
      <td style="color:var(--color-text-secondary);">${membership ? utils.formatDate(membership.startDate, {day:'numeric',month:'short'}) : '—'}</td>
      <td>${membership ? `<span style="color:${utils.daysUntil(membership.endDate) <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-secondary)'};">${utils.formatDate(membership.endDate, {day:'numeric',month:'short'})}</span>` : '—'}</td>
      <td>${payStatus ? paymentStatusBadge(payStatus) : '—'}</td>
      <td>${isActive ? `<span class="badge badge-success"><span class="badge-dot"></span>Active</span>` : `<span class="badge badge-neutral"><span class="badge-dot"></span>${membership ? 'Expired' : 'No Membership'}</span>`}</td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openStudentActions(event, '${s.id}')" title="Actions">
          ${icons['more-vertical']}
        </button>
      </td>
    </tr>
  `;
}

window.openStudentActions = function(event, studentId) {
  event.stopPropagation();
  document.getElementById('student-actions-menu')?.remove();

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'student-actions-menu';
  menu.className = 'dropdown-menu';
  menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:300;`;

  const assignment = store.getStudentAssignment(studentId);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const membership = store.getActiveMembership(studentId);

  menu.innerHTML = `
    <button class="dropdown-item" onclick="app.navigate('/student', {id:'${studentId}'}); document.getElementById('student-actions-menu')?.remove()">${icons.eye} View Profile</button>
    ${!assignment ? `<button class="dropdown-item" onclick="openAssignModal(); document.getElementById('student-actions-menu')?.remove()">${icons['map-pin']} Assign Seat</button>` : ''}
    ${assignment ? `<button class="dropdown-item" onclick="openTransferModal('${assignment.seatId}'); document.getElementById('student-actions-menu')?.remove()">${icons['arrow-right']} Transfer Seat</button>` : ''}
    ${membership ? `<button class="dropdown-item" onclick="openPaymentModal('${studentId}', '${membership.id}'); document.getElementById('student-actions-menu')?.remove()">${icons['dollar-sign']} Record Payment</button>` : ''}
    ${membership ? `<button class="dropdown-item" onclick="openRenewModal('${studentId}', '${assignment?.seatId}'); document.getElementById('student-actions-menu')?.remove()">${icons.repeat} Renew Membership</button>` : ''}
    <div class="dropdown-separator"></div>
    <button class="dropdown-item danger" onclick="confirmDisableStudent('${studentId}'); document.getElementById('student-actions-menu')?.remove()">${icons.trash} Deactivate</button>
  `;

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }));
};

window.confirmDisableStudent = function(studentId) {
  const student = store.getStudent(studentId);
  confirmDialog('Deactivate Student', `Are you sure you want to deactivate ${student?.name}? This will not delete their history.`, () => {
    store.updateStudent(studentId, { status: 'inactive' });
    toast.show('Student deactivated', 'success');
    app._navigate();
  });
};

window.openAddStudentModal = function() {
  const branchId = store.getActiveBranchId();

  modal.open('Add New Student', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" class="input" id="new-student-name" placeholder="Rahul Sharma">
        </div>
        <div class="form-group">
          <label class="form-label">Phone <span class="required">*</span></label>
          <input type="tel" class="input" id="new-student-phone" placeholder="9876543210">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="input" id="new-student-email" placeholder="student@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="select" id="new-student-gender">
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Course / Exam</label>
          <input type="text" class="input" id="new-student-course" placeholder="UPSC Civil Services">
        </div>
        <div class="form-group">
          <label class="form-label">College / Institution</label>
          <input type="text" class="input" id="new-student-college" placeholder="City College">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input type="text" class="input" id="new-student-address" placeholder="Full address">
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input type="date" class="input" id="new-student-dob">
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Emergency Contact Name</label>
          <input type="text" class="input" id="new-ec-name" placeholder="Parent / Guardian">
        </div>
        <div class="form-group">
          <label class="form-label">Emergency Contact Phone</label>
          <input type="tel" class="input" id="new-ec-phone" placeholder="9876543210">
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmAddStudent('${branchId}')">
      ${icons['user-plus']} Add Student
    </button>
  `, { size: 'lg' });
};

window.confirmAddStudent = function(branchId) {
  const name = document.getElementById('new-student-name')?.value?.trim();
  const phone = document.getElementById('new-student-phone')?.value?.trim();
  const email = document.getElementById('new-student-email')?.value?.trim();
  const gender = document.getElementById('new-student-gender')?.value;
  const course = document.getElementById('new-student-course')?.value?.trim();
  const college = document.getElementById('new-student-college')?.value?.trim();
  const address = document.getElementById('new-student-address')?.value?.trim();
  const dob = document.getElementById('new-student-dob')?.value;
  const ecName = document.getElementById('new-ec-name')?.value?.trim();
  const ecPhone = document.getElementById('new-ec-phone')?.value?.trim();

  if (!name) { toast.show('Student name is required', 'error'); return; }
  if (!phone) { toast.show('Phone number is required', 'error'); return; }
  if (phone.length < 10) { toast.show('Please enter a valid 10-digit phone number', 'error'); return; }

  try {
    const student = store.addStudent({
      name, phone, email, gender, course, college, address, dob, branchId,
      emergencyContact: ecName ? { name: ecName, phone: ecPhone } : null
    });
    modal.close();
    toast.show(`Student ${name} added successfully!`, 'success');
    app.navigate('/student', { id: student.id });
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

})();

// ─── PAGE: student-profile.js ───
(function() {
// Student Profile Page
window.Pages.renderStudentProfile = function renderStudentProfile(container, params) {
  const studentId = params.id;
  if (!studentId) { app.navigate('/students'); return; }

  const student = store.getStudent(studentId);
  if (!student) {
    container.innerHTML = `<div class="empty-state"><div class="empty-title">Student not found</div><button class="btn btn-secondary" onclick="app.navigate('/students')">Back to Students</button></div>`;
    return;
  }

  const membership = store.getActiveMembership(studentId);
  const allMemberships = store.getMemberships(studentId);
  const assignment = store.getStudentAssignment(studentId);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const room = seat ? store.getRoom(seat.roomId) : null;
  const floor = room ? store.getFloor(room.floorId) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const payStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const paidAmount = membership ? store.getPaidAmount(membership.id) : 0;
  const pendingAmount = membership ? store.getPendingAmount(membership.id) : 0;
  const payments = store.getPaymentsForStudent(studentId);
  const allAssignments = store.getAssignments(null).filter(a => a.studentId === studentId);
  const transfers = (store.db.seatTransfers || []).filter(t => t.studentId === studentId);
  const attendanceRecords = store.getAttendance(studentId);
  const recentActivity = store.getActivityLogs(100).filter(a => a.entityId === studentId || a.description?.includes(student.name)).slice(0, 10);

  // Attendance stats
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(a => a.checkIn).length;
  const avgDuration = attendanceRecords.filter(a => a.duration).reduce((sum, a) => sum + a.duration, 0) / Math.max(attendanceRecords.filter(a=>a.duration).length, 1);

  let activeTab = 'overview';

  function render() {
    container.innerHTML = `
      <!-- Back button -->
      <div style="margin-bottom:var(--space-4);">
        <button class="btn btn-ghost" onclick="app.navigate('/students')" style="gap:var(--space-2);">
          ${icons.chevronLeft} Back to Students
        </button>
      </div>

      <!-- Profile Header -->
      <div class="profile-header">
        <div class="avatar avatar-xl" style="background:${student.avatar};">${utils.initials(student.name)}</div>
        <div class="profile-info">
          <div class="profile-name">${student.name}</div>
          <div class="profile-id">${student.id}</div>
          <div class="profile-meta">
            ${membership ? membershipStatusBadge(membership.endDate, membership.status) : `<span class="badge badge-neutral"><span class="badge-dot"></span>No Membership</span>`}
            ${seat ? `<span class="badge badge-indigo"><span class="badge-dot"></span>Seat ${seat.label}</span>` : ''}
            <span style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${student.course || '—'}</span>
          </div>
        </div>
        <div class="profile-actions">
          ${membership ? `
          <button class="btn btn-secondary" onclick="openPaymentModal('${studentId}', '${membership.id}')">
            ${icons['dollar-sign']} Payment
          </button>
          <button class="btn btn-secondary" onclick="openRenewModal('${studentId}', '${seat?.id}')">
            ${icons.repeat} Renew
          </button>` : ''}
          ${!assignment ? `<button class="btn btn-primary" onclick="openAssignModal()">
            ${icons['map-pin']} Assign Seat
          </button>` : ''}
          <button class="btn btn-secondary" onclick="openEditStudentModal('${studentId}')">
            ${icons.edit} Edit
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total Paid</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Outstanding</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Attendance Days</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${presentDays}</div>
          <div class="stat-card-change neutral">of ${totalDays} recorded</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Avg. Daily Hours</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${Math.floor(avgDuration / 60)}h ${Math.floor(avgDuration % 60)}m</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        ${['overview','payments','attendance','history'].map(t => `
          <button class="tab-btn ${activeTab === t ? 'active' : ''}" onclick="switchProfileTab('${t}')">${capitalizeFirst(t)}</button>
        `).join('')}
      </div>

      <div id="profile-tab-content">
        ${renderTab(activeTab)}
      </div>
    `;

    window.switchProfileTab = (tab) => {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase() === tab));
      document.getElementById('profile-tab-content').innerHTML = renderTab(tab);
    };
  }

  function renderTab(tab) {
    switch (tab) {
      case 'overview': return renderOverviewTab();
      case 'payments': return renderPaymentsTab();
      case 'attendance': return renderAttendanceTab();
      case 'history': return renderHistoryTab();
      default: return '';
    }
  }

  function renderOverviewTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Personal Info -->
        <div class="card">
          <div class="card-header"><div class="card-title">Personal Information</div></div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${student.name}</div></div>
              <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${student.phone}</div></div>
              <div class="info-item"><div class="info-label">Email</div><div class="info-value">${student.email || '—'}</div></div>
              <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${student.gender || '—'}</div></div>
              <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${student.dob ? utils.formatDate(student.dob) : '—'}</div></div>
              <div class="info-item"><div class="info-label">Course</div><div class="info-value">${student.course || '—'}</div></div>
              <div class="info-item"><div class="info-label">College</div><div class="info-value">${student.college || '—'}</div></div>
              <div class="info-item"><div class="info-label">Address</div><div class="info-value">${student.address || '—'}</div></div>
              <div class="info-item"><div class="info-label">Emergency Contact</div><div class="info-value">${student.emergencyContact?.name || '—'} ${student.emergencyContact?.phone ? '· ' + student.emergencyContact.phone : ''}</div></div>
              <div class="info-item"><div class="info-label">Member Since</div><div class="info-value">${utils.formatDate(student.createdAt)}</div></div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <!-- Current Seat -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Current Seat</div>
              ${seat ? `<button class="btn btn-secondary btn-sm" onclick="app.navigate('/seat-map')">View on Map</button>` : ''}
            </div>
            <div class="card-body">
              ${seat ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Seat</div><div class="info-value"><span class="badge badge-indigo">${seat.label}</span></div></div>
                  <div class="info-item"><div class="info-label">Type</div><div class="info-value">${capitalizeFirst(seat.type)}</div></div>
                  <div class="info-item"><div class="info-label">Room</div><div class="info-value">${room?.name || '—'}</div></div>
                  <div class="info-item"><div class="info-label">Floor</div><div class="info-value">${floor?.name || '—'}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons.map}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No seat assigned</div>
                  <button class="btn btn-secondary btn-sm" onclick="openAssignModal()">Assign Seat</button>
                </div>
              `}
            </div>
          </div>

          <!-- Membership -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Membership</div>
              ${membership ? `<button class="btn btn-primary btn-sm" onclick="openRenewModal('${studentId}', '${seat?.id}')">Renew</button>` : ''}
            </div>
            <div class="card-body">
              ${membership ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Plan</div><div class="info-value">${plan?.name || membership.planName}</div></div>
                  <div class="info-item"><div class="info-label">Status</div><div class="info-value">${membershipStatusBadge(membership.endDate, membership.status)}</div></div>
                  <div class="info-item"><div class="info-label">Start Date</div><div class="info-value">${utils.formatDate(membership.startDate)}</div></div>
                  <div class="info-item"><div class="info-label">End Date</div><div class="info-value">${utils.formatDate(membership.endDate)}</div></div>
                  <div class="info-item"><div class="info-label">Price</div><div class="info-value">${utils.formatINR(membership.price)}</div></div>
                  <div class="info-item"><div class="info-label">Payment</div><div class="info-value">${paymentStatusBadge(payStatus)}</div></div>
                  <div class="info-item"><div class="info-label">Paid</div><div class="info-value" style="color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div></div>
                  <div class="info-item"><div class="info-label">Pending</div><div class="info-value" style="color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons['credit-card']}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No active membership</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaymentsTab() {
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Payment History</div>
          ${membership ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${studentId}', '${membership.id}')">Record Payment</button>` : ''}
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Receipt</th><th>Amount</th><th>Method</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${payments.length ? payments.sort((a,b)=>new Date(b.recordedAt)-new Date(a.recordedAt)).map(p => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt)}</td>
                  <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                  <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                  <td style="color:var(--color-text-secondary);">${p.method}</td>
                  <td><span class="badge badge-success"><span class="badge-dot"></span>Recorded</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons['dollar-sign']}</div>
                  <div class="empty-title">No payments yet</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAttendanceTab() {
    const recent = [...attendanceRecords].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Attendance Record (Last 30 days)</div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-success btn-sm" onclick="doCheckIn('${studentId}')">Check In</button>
            <button class="btn btn-secondary btn-sm" onclick="doCheckOut('${studentId}')">Check Out</button>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${recent.length ? recent.map(a => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(a.date)}</td>
                  <td>${a.checkIn ? utils.formatTime(a.checkIn) : '—'}</td>
                  <td>${a.checkOut ? utils.formatTime(a.checkOut) : '—'}</td>
                  <td>${a.duration ? Math.floor(a.duration/60)+'h '+a.duration%60+'m' : '—'}</td>
                  <td>${a.status === 'checked-out' ? `<span class="badge badge-success"><span class="badge-dot"></span>Checked Out</span>` : `<span class="badge badge-indigo"><span class="badge-dot"></span>Checked In</span>`}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.clock}</div>
                  <div class="empty-title">No attendance records</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderHistoryTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Seat History -->
        <div class="card">
          <div class="card-header"><div class="card-title">Seat History</div></div>
          <div class="card-body">
            <div class="timeline">
              ${allAssignments.length ? allAssignments.map(a => {
                const s_ = store.getSeat(a.seatId);
                return `
                  <div class="timeline-item">
                    <div class="timeline-dot">${icons['map-pin']}</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Seat ${s_?.label || a.seatId}</div>
                      <div class="timeline-time">${utils.formatDate(a.startDate)} → ${a.status === 'active' ? 'Present' : utils.formatDate(a.endDate)}</div>
                      <div style="font-size:var(--text-xs);margin-top:2px;">${a.status === 'active' ? `<span class="badge badge-success">Current</span>` : `<span class="badge badge-neutral">${capitalizeFirst(a.status)}</span>`}</div>
                    </div>
                  </div>
                `;
              }).join('') : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No seat history</div>'}
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card">
          <div class="card-header"><div class="card-title">Activity Timeline</div></div>
          <div class="card-body">
            <div class="timeline">
              ${recentActivity.length ? recentActivity.map(a => `
                <div class="timeline-item">
                  <div class="timeline-dot">${icons.activity}</div>
                  <div class="timeline-content">
                    <div class="timeline-title">${a.description}</div>
                    <div class="timeline-time">${utils.formatRelative(a.timestamp)}</div>
                  </div>
                </div>
              `).join('') : `
                <div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No recent activity</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.doCheckIn = function(studentId) {
    try {
      store.checkIn(studentId);
      toast.show('Student checked in!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.doCheckOut = function(studentId) {
    try {
      store.checkOut(studentId);
      toast.show('Student checked out!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.openEditStudentModal = function(studentId) {
    const s = store.getStudent(studentId);
    modal.open('Edit Student', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="input" id="edit-name" value="${s.name}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="edit-phone" value="${s.phone}"></div>
        </div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="edit-email" value="${s.email || ''}"></div>
        <div class="form-group"><label class="form-label">Course</label><input type="text" class="input" id="edit-course" value="${s.course || ''}"></div>
        <div class="form-group"><label class="form-label">Address</label><input type="text" class="input" id="edit-address" value="${s.address || ''}"></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmEditStudent('${studentId}')">Save Changes</button>
    `);
  };

  window.confirmEditStudent = function(studentId) {
    const name = document.getElementById('edit-name')?.value?.trim();
    const phone = document.getElementById('edit-phone')?.value?.trim();
    if (!name || !phone) { toast.show('Name and phone are required', 'error'); return; }
    store.updateStudent(studentId, {
      name,
      phone,
      email: document.getElementById('edit-email')?.value?.trim(),
      course: document.getElementById('edit-course')?.value?.trim(),
      address: document.getElementById('edit-address')?.value?.trim(),
    });
    modal.close();
    toast.show('Student updated!', 'success');
    render();
  };

  render();
}

})();

// ─── PAGE: memberships.js ───
(function() {
// Memberships Page
window.Pages.renderMemberships = function renderMemberships(container) {
  const branchId = store.getActiveBranchId();
  const plans = store.getMembershipPlans(branchId);
  const activeMemberships = store.getStudents(branchId).map(s => {
    const m = store.getActiveMembership(s.id);
    return m ? { ...m, student: s } : null;
  }).filter(Boolean);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Memberships</h1>
          <p class="page-subtitle">Manage plans and active memberships</p>
        </div>
        <button class="btn btn-primary" onclick="openAddPlanModal()">
          ${icons.plus} New Plan
        </button>
      </div>
    </div>

    <!-- Membership Plans -->
    <div style="margin-bottom:var(--space-6);">
      <div class="card-title" style="margin-bottom:var(--space-4);">Membership Plans</div>
      <div class="grid-5">
        ${plans.map(plan => renderPlanCard(plan)).join('')}
        <div style="border:2px dashed var(--color-border-primary);border-radius:var(--radius-xl);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-8);gap:var(--space-2);cursor:pointer;" onclick="openAddPlanModal()">
          <div style="color:var(--color-icon-tertiary);">${icons.plus}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Custom Plan</div>
        </div>
      </div>
    </div>

    <!-- Active Memberships Table -->
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Active Memberships</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${activeMemberships.length} total</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Plan</th><th>Start</th><th>Expiry</th><th>Days Left</th><th>Payment</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${activeMemberships.map(m => {
              const daysLeft = utils.daysUntil(m.endDate);
              const payStatus = store.getPaymentStatus(m.id);
              return `
                <tr onclick="app.navigate('/student', {id:'${m.studentId}'})">
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${m.student?.avatar};">${utils.initials(m.student?.name || '')}</div>
                      <div class="student-name">${m.student?.name}</div>
                    </div>
                  </td>
                  <td style="color:var(--color-text-secondary);">${m.planName || '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(m.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:${daysLeft <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-secondary)'};">${utils.formatDate(m.endDate, {day:'numeric',month:'short'})}</td>
                  <td>
                    <span class="${daysLeft <= 3 ? 'badge badge-error' : daysLeft <= 7 ? 'badge badge-warning' : 'badge badge-neutral'}">
                      ${daysLeft !== null ? (daysLeft > 0 ? daysLeft + 'd' : 'Expired') : '—'}
                    </span>
                  </td>
                  <td>${paymentStatusBadge(payStatus)}</td>
                  <td>${membershipStatusBadge(m.endDate, m.status)}</td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="7"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['credit-card']}</div>
                <div class="empty-title">No active memberships</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddPlanModal = function() {
    modal.open('Create Membership Plan', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Plan Name <span class="required">*</span></label>
          <input type="text" class="input" id="plan-name" placeholder="Monthly Premium">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Duration (days) <span class="required">*</span></label>
            <input type="number" class="input" id="plan-duration" placeholder="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Price (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="plan-price" min="0"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Access Hours</label>
          <input type="text" class="input" id="plan-hours" placeholder="06:00 – 23:00">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="plan-desc" rows="2" placeholder="Describe this plan..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddPlan()">Create Plan</button>
    `);
  };

  window.confirmAddPlan = function() {
    const name = document.getElementById('plan-name')?.value?.trim();
    const duration = parseInt(document.getElementById('plan-duration')?.value);
    const price = parseFloat(document.getElementById('plan-price')?.value);
    const hours = document.getElementById('plan-hours')?.value?.trim();
    const desc = document.getElementById('plan-desc')?.value?.trim();

    if (!name) { toast.show('Plan name is required', 'error'); return; }
    if (!duration || duration < 1) { toast.show('Please enter a valid duration', 'error'); return; }
    if (!price || price < 0) { toast.show('Please enter a valid price', 'error'); return; }

    store.addMembershipPlan({ name, duration, durationUnit: 'days', price, accessHours: hours, description: desc });
    modal.close();
    toast.show('Membership plan created!', 'success');
    app._navigate();
  };
}

function renderPlanCard(plan) {
  const studentCount = store.db.memberships.filter(m => m.planId === plan.id && m.status === 'active').length;
  return `
    <div class="card" style="text-align:center;padding:var(--space-5);cursor:pointer;transition:all var(--transition-fast);"
      onmouseenter="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
      onmouseleave="this.style.boxShadow='';this.style.transform=''"
    >
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2);">${plan.duration} DAYS</div>
      <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-bottom:var(--space-2);">${plan.name}</div>
      <div style="font-size:var(--text-2xl);font-weight:var(--fw-bold);color:var(--sf-indigo-600);margin-bottom:var(--space-3);">${utils.formatINR(plan.price)}</div>
      ${plan.accessHours ? `<div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">${plan.accessHours}</div>` : ''}
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${studentCount} active</div>
    </div>
  `;
}

})();

// ─── PAGE: payments.js ───
(function() {
// Payments Page
window.Pages.renderPayments = function renderPayments(container) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  let allPayments = [];
  let filter = 'all';
  let search = '';

  // Get all payments for this branch
  students.forEach(s => {
    store.getPaymentsForStudent(s.id).forEach(p => {
      allPayments.push({ ...p, student: s });
    });
  });
  allPayments.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  const todayPayments = allPayments.filter(p => new Date(p.recordedAt).toDateString() === new Date().toDateString());
  const monthPayments = allPayments.filter(p => {
    const d = new Date(p.recordedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  const pendingDues = store.getPendingDues(branchId);
  const totalPending = pendingDues.reduce((s, d) => s + d.pendingAmount, 0);

  function getFiltered() {
    let result = [...allPayments];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.student?.name.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q)
      );
    }
    return result;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Payments</h1>
          <p class="page-subtitle">Track collections and pending dues</p>
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" onclick="switchPaymentsTab('dues')">
            ${icons['alert-circle']} Pending Dues
          </button>
          <button class="btn btn-primary" onclick="openQuickPayModal()">
            ${icons.plus} Record Payment
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderPayStat('Today\'s Collection', todayTotal, 'success')}
      ${renderPayStat('This Month', monthTotal, 'indigo')}
      ${renderPayStat('Total Outstanding', totalPending, 'error')}
      ${renderPayStat('Total Transactions', allPayments.length + '', 'neutral')}
    </div>

    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:0;">
      <button class="tab-btn active" id="tab-payments" onclick="switchPaymentsTab('payments')">All Payments</button>
      <button class="tab-btn" id="tab-dues" onclick="switchPaymentsTab('dues')">Pending Dues</button>
    </div>

    <div id="payments-tab-content">
      ${renderPaymentsTable(getFiltered(), search)}
    </div>
  `;

  window.switchPaymentsTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    const content = document.getElementById('payments-tab-content');
    if (tab === 'payments') content.innerHTML = renderPaymentsTable(getFiltered(), search);
    else content.innerHTML = renderDuesTable(pendingDues);
  };

  window.openQuickPayModal = function() {
    const students_ = store.getStudents(branchId);
    modal.open('Record Payment', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Student <span class="required">*</span></label>
          <select class="select" id="qpay-student" onchange="loadStudentMembership(this.value)">
            <option value="">Select student...</option>
            ${students_.map(s => `<option value="${s.id}">${s.name} — ${s.phone}</option>`).join('')}
          </select>
        </div>
        <div id="qpay-membership-info" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);"></div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="qpay-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Method</label>
          <select class="select" id="qpay-method"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Reference ID</label>
          <input type="text" class="input" id="qpay-ref" placeholder="Optional">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="textarea" id="qpay-notes" rows="2" placeholder="Optional"></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmQuickPay()">Record Payment</button>
    `);

    window.loadStudentMembership = (studentId) => {
      if (!studentId) return;
      const membership = store.getActiveMembership(studentId);
      const info = document.getElementById('qpay-membership-info');
      if (membership) {
        const pending = store.getPendingAmount(membership.id);
        info.style.display = 'block';
        info.innerHTML = `<strong>Outstanding:</strong> ${utils.formatINR(pending)} &nbsp;·&nbsp; Plan: ${membership.planName}`;
        document.getElementById('qpay-amount').value = pending;
      } else {
        info.style.display = 'block';
        info.innerHTML = '<span style="color:var(--sf-warning-600);">No active membership found</span>';
      }
      info.dataset.membershipId = membership?.id || '';
    };

    window.confirmQuickPay = () => {
      const studentId = document.getElementById('qpay-student')?.value;
      const membershipId = document.getElementById('qpay-membership-info')?.dataset.membershipId;
      const amount = parseFloat(document.getElementById('qpay-amount')?.value || 0);
      const method = document.getElementById('qpay-method')?.value;
      const ref = document.getElementById('qpay-ref')?.value;
      const notes = document.getElementById('qpay-notes')?.value;

      if (!studentId) { toast.show('Please select a student', 'error'); return; }
      if (!membershipId) { toast.show('No active membership for this student', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

      try {
        store.recordPayment({ membershipId, studentId, amount, method, txnId: ref, notes });
        modal.close();
        toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
        app._navigate();
      } catch (e) { toast.show(e.message, 'error'); }
    };
  };
}

function renderPayStat(label, value, color) {
  const colorMap = {
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    error: { bg: 'var(--sf-error-50)', text: 'var(--sf-error-700)' },
    neutral: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div class="stat-card">
      <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-2xl);color:${c.text};">${typeof value === 'number' ? utils.formatINR(value) : value}</div>
    </div>
  `;
}

function renderPaymentsTable(payments, search) {
  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Payments</div>
        <div class="input-group" style="width:240px;">
          <div class="input-group-prefix">${icons.search}</div>
          <input class="input" type="text" placeholder="Search student, receipt..." value="${search}"
            oninput="filterPaymentsSearch(this.value)">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Receipt</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${payments.slice(0, 50).map(p => `
              <tr>
                <td>
                  <div class="student-cell">
                    <div class="avatar avatar-sm" style="background:${p.student?.avatar};">${utils.initials(p.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${p.student?.name || '—'}</div>
                      <div class="student-id">${p.student?.id || ''}</div>
                    </div>
                  </div>
                </td>
                <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                <td style="color:var(--color-text-secondary);">${p.method || '—'}</td>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt, {day:'numeric',month:'short',year:'numeric'})}</td>
                <td><span class="badge badge-success"><span class="badge-dot"></span>Recorded</span></td>
              </tr>
            `).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['dollar-sign']}</div>
                <div class="empty-title">No payments found</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDuesTable(pendingDues) {
  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Pending Dues</div>
        <div style="font-size:var(--text-sm);color:var(--sf-error-600);font-weight:var(--fw-semibold);">
          Total: ${utils.formatINR(pendingDues.reduce((s,d)=>s+d.pendingAmount,0))}
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>Plan</th><th>Due Amount</th><th>Days Pending</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${pendingDues.map(d => `
              <tr onclick="app.navigate('/student', {id:'${d.student.id}'})">
                <td>
                  <div class="student-cell">
                    <div class="avatar avatar-sm" style="background:${d.student?.avatar};">${utils.initials(d.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${d.student?.name || '—'}</div>
                    </div>
                  </div>
                </td>
                <td>${d.seat ? `<span class="badge badge-indigo">${d.seat.label}</span>` : '—'}</td>
                <td style="color:var(--color-text-secondary);">${d.membership?.planName || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(d.pendingAmount)}</td>
                <td><span class="badge badge-warning">${d.daysDue}d pending</span></td>
                <td onclick="event.stopPropagation()">
                  <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${d.student.id}', '${d.membership.id}')">
                    Collect
                  </button>
                </td>
              </tr>
            `).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.checkCircle}</div>
                <div class="empty-title">No pending dues!</div>
                <div class="empty-desc">All students are up to date on payments.</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.filterPaymentsSearch = function(q) {
  // Simple re-filter without full re-render
  const rows = document.querySelectorAll('#payments-tab-content tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q ? (text.includes(q.toLowerCase()) ? '' : 'none') : '';
  });
};

})();

// ─── PAGE: attendance.js ───
(function() {
// Attendance Page
window.Pages.renderAttendance = function renderAttendance(container) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const todayISO = new Date().toISOString().split('T')[0];
  const todayAttendance = store.getTodayAttendance();

  const branchStudentIds = students.map(s => s.id);
  const todayBranchAtt = todayAttendance.filter(a => branchStudentIds.includes(a.studentId));

  const presentCount = todayBranchAtt.filter(a => a.checkIn).length;
  const checkedInCount = todayBranchAtt.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOutCount = todayBranchAtt.filter(a => a.checkOut).length;
  const absentCount = students.length - presentCount;

  let searchQ = '';

  function render() {
    const filtered = students.filter(s => {
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.phone.includes(q);
    });

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Attendance</h1>
            <p class="page-subtitle">${new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" onclick="app.navigate('/reports')">View Reports</button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        ${renderAttStat('Present', presentCount, 'success')}
        ${renderAttStat('Checked In', checkedInCount, 'indigo')}
        ${renderAttStat('Checked Out', checkedOutCount, 'neutral')}
        ${renderAttStat('Absent / Not Arrived', absentCount, 'warning')}
      </div>

      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Today's Attendance</div>
          <div class="input-group" style="width:240px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search student..." oninput="handleAttSearch(this.value)">
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Student</th><th>Seat</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const att = todayBranchAtt.find(a => a.studentId === s.id);
                const assignment = store.getStudentAssignment(s.id);
                const seat = assignment ? store.getSeat(assignment.seatId) : null;

                let statusBadge, actionBtn;
                if (!att || !att.checkIn) {
                  statusBadge = `<span class="badge badge-neutral"><span class="badge-dot"></span>Not Arrived</span>`;
                  actionBtn = `<button class="btn btn-success btn-sm" onclick="doManualCheckIn('${s.id}')">Check In</button>`;
                } else if (att.checkIn && !att.checkOut) {
                  statusBadge = `<span class="badge badge-indigo"><span class="badge-dot"></span>Checked In</span>`;
                  actionBtn = `<button class="btn btn-secondary btn-sm" onclick="doManualCheckOut('${s.id}')">Check Out</button>`;
                } else {
                  statusBadge = `<span class="badge badge-success"><span class="badge-dot"></span>Checked Out</span>`;
                  actionBtn = `<span style="color:var(--color-text-quaternary);font-size:var(--text-xs);">Done</span>`;
                }

                return `
                  <tr>
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${s.avatar};">${utils.initials(s.name)}</div>
                        <div>
                          <div class="student-name">${s.name}</div>
                          <div class="student-id">${s.course || s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>${seat ? `<span class="badge badge-indigo">${seat.label}</span>` : '—'}</td>
                    <td>${att?.checkIn ? utils.formatTime(att.checkIn) : '—'}</td>
                    <td>${att?.checkOut ? utils.formatTime(att.checkOut) : '—'}</td>
                    <td>${att?.duration ? Math.floor(att.duration/60)+'h '+att.duration%60+'m' : '—'}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.handleAttSearch = (q) => { searchQ = q; render(); };
    window.doManualCheckIn = (studentId) => {
      try { store.checkIn(studentId); toast.show('Checked in!', 'success'); render(); } catch (e) { toast.show(e.message, 'error'); }
    };
    window.doManualCheckOut = (studentId) => {
      try { store.checkOut(studentId); toast.show('Checked out!', 'success'); render(); } catch (e) { toast.show(e.message, 'error'); }
    };
  }

  render();
}

function renderAttStat(label, count, color) {
  const colorMap = {
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    warning: { bg: 'var(--sf-warning-50)', text: 'var(--sf-warning-700)' },
    neutral: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div class="stat-card">
      <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-3xl);color:${c.text};">${count}</div>
    </div>
  `;
}

})();

// ─── PAGE: floors.js ───
(function() {
// Floors & Rooms Page
window.Pages.renderFloors = function renderFloors(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const floors = store.getFloors(branchId);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Floors & Rooms</h1>
          <p class="page-subtitle">${branch?.name} — Physical space configuration</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="openAddFloorModal()">
            ${icons.layers} Add Floor
          </button>
          <button class="btn btn-primary" onclick="openAddRoomModal()">
            ${icons.plus} Add Room
          </button>
        </div>
      </div>
    </div>

    ${floors.length ? floors.map(floor => renderFloorSection(floor)).join('') : `
      <div class="empty-state" style="margin-top:var(--space-8);">
        <div class="empty-icon">${icons.layers}</div>
        <div class="empty-title">No floors configured</div>
        <div class="empty-desc">Start by adding a floor to this branch.</div>
        <button class="btn btn-primary" onclick="openAddFloorModal()">Add First Floor</button>
      </div>
    `}
  `;

  window.openAddFloorModal = function() {
    modal.open('Add Floor', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor Name <span class="required">*</span></label>
          <input type="text" class="input" id="floor-name" placeholder="Ground Floor / First Floor">
        </div>
        <div class="form-group">
          <label class="form-label">Level</label>
          <input type="number" class="input" id="floor-level" value="0" min="0">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddFloor('${branchId}')">Add Floor</button>
    `);
  };

  window.confirmAddFloor = function(branchId) {
    const name = document.getElementById('floor-name')?.value?.trim();
    const level = parseInt(document.getElementById('floor-level')?.value || 0);
    if (!name) { toast.show('Floor name is required', 'error'); return; }
    store.addFloor({ branchId, name, level });
    modal.close();
    toast.show('Floor added!', 'success');
    app._navigate();
  };

  window.openAddRoomModal = function(floorId) {
    const floors_ = store.getFloors(branchId);
    modal.open('Add Room', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor <span class="required">*</span></label>
          <select class="select" id="room-floor">
            ${floors_.map(f => `<option value="${f.id}" ${f.id === floorId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Room Name <span class="required">*</span></label>
          <input type="text" class="input" id="room-name" placeholder="General Study Hall">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="select" id="room-type">
              <option value="general">General</option>
              <option value="silent">Silent</option>
              <option value="premium">Premium</option>
              <option value="discussion">Discussion</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">AC Available</label>
            <select class="select" id="room-ac">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Rows</label>
            <input type="number" class="input" id="room-rows" value="4" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="form-label">Columns (seats per row)</label>
            <input type="number" class="input" id="room-cols" value="6" min="1" max="20">
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddRoom()">Add Room & Generate Seats</button>
    `);
  };

  window.confirmAddRoom = function() {
    const floorId = document.getElementById('room-floor')?.value;
    const name = document.getElementById('room-name')?.value?.trim();
    const type = document.getElementById('room-type')?.value;
    const ac = document.getElementById('room-ac')?.value === 'true';
    const rows = parseInt(document.getElementById('room-rows')?.value || 4);
    const cols = parseInt(document.getElementById('room-cols')?.value || 6);

    if (!name) { toast.show('Room name is required', 'error'); return; }

    const room = store.addRoom({ floorId, name, type, acAvailable: ac, rows, cols, capacity: rows * cols });

    // Auto-generate seats
    const rowLetters = 'ABCDEFGHIJ'.split('');
    const db = store.db;
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const label = `${rowLetters[r] || String.fromCharCode(65 + r)}${String(c).padStart(2, '0')}`;
        db.seats.push({
          id: `SEAT-${room.id}-${label}`,
          roomId: room.id,
          label,
          row: rowLetters[r] || String.fromCharCode(65 + r),
          col: c,
          type: 'standard',
          status: 'available',
          createdAt: utils.now()
        });
      }
    }
    store._save(db);

    modal.close();
    toast.show(`Room "${name}" added with ${rows * cols} seats!`, 'success');
    app._navigate();
  };
}

function renderFloorSection(floor) {
  const rooms = store.getRooms(floor.id);

  return `
    <div class="card" style="margin-bottom:var(--space-5);">
      <div class="card-header">
        <div>
          <div class="card-title">${floor.name}</div>
          <div class="card-subtitle">${rooms.length} room${rooms.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal('${floor.id}')">
          ${icons.plus} Add Room
        </button>
      </div>
      <div class="card-body">
        ${rooms.length ? `
          <div class="grid-3">
            ${rooms.map(room => renderRoomCard(room)).join('')}
          </div>
        ` : `
          <div class="empty-state" style="padding:var(--space-6);">
            <div class="empty-title" style="font-size:var(--text-sm);">No rooms on this floor</div>
            <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal('${floor.id}')">Add Room</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderRoomCard(room) {
  const seats = store.getSeats(room.id);
  let occupied = 0, available = 0;
  seats.forEach(s => {
    const status = store.getSeatStatus(s.id);
    if (status === 'occupied' || status === 'payment-due' || status === 'expiring') occupied++;
    else if (status === 'available') available++;
  });

  const occupancyPct = seats.length > 0 ? Math.round((occupied / seats.length) * 100) : 0;

  return `
    <div class="card" style="cursor:pointer;"
      onclick="app.navigate('/seat-map')"
      onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='var(--shadow-xs)'"
    >
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);">${room.name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${capitalizeFirst(room.type)} · ${room.acAvailable ? 'AC' : 'Non-AC'}</div>
          </div>
          <span class="badge badge-${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'success'}">
            ${occupancyPct}%
          </span>
        </div>
        <div class="progress-bar" style="margin-bottom:var(--space-3);">
          <div class="progress-fill ${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'indigo'}" style="width:${occupancyPct}%;"></div>
        </div>
        <div style="display:flex;gap:var(--space-4);font-size:var(--text-xs);color:var(--color-text-secondary);">
          <span>${seats.length} total</span>
          <span style="color:var(--sf-indigo-600);">${occupied} occupied</span>
          <span style="color:var(--sf-success-600);">${available} free</span>
        </div>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: expenses.js ───
(function() {
// Expenses Page
window.Pages.renderExpenses = function renderExpenses(container) {
  const branchId = store.getActiveBranchId();
  const expenses = store.getExpenses(branchId).sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Expenses</h1>
          <p class="page-subtitle">Track and manage operational expenses</p>
        </div>
        <button class="btn btn-primary" onclick="openAddExpenseModal()">
          ${icons.plus} Add Expense
        </button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">This Month</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${utils.formatINR(getMonthExpenses(expenses))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Records</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${expenses.length}</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Expenses</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th></tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(e.date)}</td>
                <td><span class="badge badge-neutral">${e.category}</span></td>
                <td style="color:var(--color-text-secondary);">${e.description || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(e.amount)}</td>
                <td style="color:var(--color-text-secondary);">${e.method || '—'}</td>
              </tr>
            `).join('') || `
              <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['trending-down']}</div>
                <div class="empty-title">No expenses recorded</div>
                <button class="btn btn-primary" onclick="openAddExpenseModal()">Add First Expense</button>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddExpenseModal = function() {
    modal.open('Add Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Category <span class="required">*</span></label>
          <select class="select" id="exp-category">
            <option>Rent</option><option>Electricity</option><option>Internet</option>
            <option>Staff Salary</option><option>Maintenance</option><option>Cleaning</option>
            <option>Furniture</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="exp-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="required">*</span></label>
          <input type="date" class="input" id="exp-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select class="select" id="exp-method">
            <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="exp-desc" rows="2" placeholder="Description..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddExpense('${branchId}')">Save Expense</button>
    `);
  };

  window.confirmAddExpense = function(branchId) {
    const category = document.getElementById('exp-category')?.value;
    const amount = parseFloat(document.getElementById('exp-amount')?.value);
    const date = document.getElementById('exp-date')?.value;
    const method = document.getElementById('exp-method')?.value;
    const description = document.getElementById('exp-desc')?.value?.trim();

    if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }
    if (!date) { toast.show('Please select a date', 'error'); return; }

    store.addExpense({ branchId, category, amount, date, method, description });
    modal.close();
    toast.show('Expense recorded!', 'success');
    app._navigate();
  };
}

function getMonthExpenses(expenses) {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
}

})();

// ─── PAGE: reports.js ───
(function() {
// Reports Page
window.Pages.renderReports = function renderReports(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const revenueChart = store.getRevenueChart(branchId, 30);

  const students = store.getStudents(branchId);
  const payments = students.flatMap(s => store.getPaymentsForStudent(s.id));
  const expenses = store.getExpenses(branchId);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Expense by category
  const expenseByCategory = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">${branch?.name} · Financial & Operations Overview</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="window.print()">
            ${icons.print} Print Report
          </button>
        </div>
      </div>
    </div>

    <!-- P&L Summary -->
    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Revenue (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${utils.formatINR(totalRevenue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card" style="background:${netProfit >= 0 ? 'var(--sf-success-50)' : 'var(--sf-error-50)'};">
        <div class="stat-card-top"><div class="stat-card-label">Net Profit</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:${netProfit >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};">${utils.formatINR(netProfit)}</div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);margin-bottom:var(--space-5);">
      <!-- Revenue Trend -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">30-Day Revenue Trend</div>
        </div>
        <div class="card-body">
          ${renderMiniBarChart(revenueChart)}
        </div>
      </div>

      <!-- Expenses by Category -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Expenses by Category</div>
        </div>
        <div class="card-body">
          ${Object.entries(expenseByCategory).map(([cat, amount]) => {
            const maxAmt = Math.max(...Object.values(expenseByCategory), 1);
            const pct = Math.round((amount / maxAmt) * 100);
            return `
              <div style="margin-bottom:var(--space-3);">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:var(--space-1);">
                  <span style="color:var(--color-text-secondary);">${cat}</span>
                  <span style="font-weight:var(--fw-semibold);">${utils.formatINR(amount)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill indigo" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Occupancy Table -->
    <div class="card">
      <div class="card-header"><div class="card-title">Occupancy Summary by Room</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Room</th><th>Floor</th><th>Type</th><th>Total</th><th>Occupied</th><th>Available</th><th>Occupancy</th></tr>
          </thead>
          <tbody>
            ${store.getRoomsForBranch(branchId).map(room => {
              const seats = store.getSeats(room.id);
              let occ = 0, avail = 0;
              seats.forEach(s => {
                const status = store.getSeatStatus(s.id);
                if (['occupied','payment-due','expiring'].includes(status)) occ++;
                else if (status === 'available') avail++;
              });
              const pct = seats.length > 0 ? Math.round((occ / seats.length) * 100) : 0;
              const floor = store.getFloor(room.floorId);
              return `
                <tr>
                  <td style="font-weight:var(--fw-medium);">${room.name}</td>
                  <td style="color:var(--color-text-secondary);">${floor?.name || '—'}</td>
                  <td><span class="badge badge-neutral">${capitalizeFirst(room.type)}</span></td>
                  <td style="text-align:center;">${seats.length}</td>
                  <td style="text-align:center;color:var(--sf-indigo-600);font-weight:var(--fw-semibold);">${occ}</td>
                  <td style="text-align:center;color:var(--sf-success-600);">${avail}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <div class="progress-bar" style="flex:1;">
                        <div class="progress-fill ${pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'indigo'}" style="width:${pct}%;"></div>
                      </div>
                      <span style="font-size:var(--text-xs);font-weight:var(--fw-semibold);">${pct}%</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMiniBarChart(data) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
        ${data.map((d, i) => {
          const height = max > 0 ? Math.round((d.amount / max) * 100) : 4;
          const isToday = i === data.length - 1;
          return `
            <div style="flex:1;height:${Math.max(height, 4)}%;background:${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'};border-radius:2px 2px 0 0;" title="${d.label}: ${utils.formatINR(d.amount)}"></div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--color-text-quaternary);">
        <span>${data[0]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: staff.js ───
(function() {
// Staff Page
window.Pages.renderStaff = function renderStaff(container) {
  const branchId = store.getActiveBranchId();
  const staff = store.getStaff(branchId);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Staff</h1>
          <p class="page-subtitle">Manage staff members and roles</p>
        </div>
        <button class="btn btn-primary" onclick="openAddStaffModal()">
          ${icons['user-plus']} Add Staff
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Staff Member</th><th>Role</th><th>Phone</th><th>Email</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${staff.map(s => `
              <tr>
                <td>
                  <div class="student-cell">
                    <div class="avatar" style="background:${utils.getAvatarColor(s.name)};">${utils.initials(s.name)}</div>
                    <div>
                      <div class="student-name">${s.name}</div>
                      <div class="student-id">${s.id}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-indigo">${s.role}</span></td>
                <td style="color:var(--color-text-secondary);">${s.phone || '—'}</td>
                <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${s.email || '—'}</td>
                <td><span class="badge badge-success"><span class="badge-dot"></span>Active</span></td>
              </tr>
            `).join('') || `
              <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['user-check']}</div>
                <div class="empty-title">No staff added</div>
                <button class="btn btn-primary" onclick="openAddStaffModal()">Add First Staff</button>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddStaffModal = function() {
    modal.open('Add Staff Member', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input type="text" class="input" id="staff-name"></div>
          <div class="form-group"><label class="form-label">Role <span class="required">*</span></label>
            <select class="select" id="staff-role">
              <option>Manager</option><option>Receptionist</option><option>Cleaner</option><option>Security</option><option>Other</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="staff-phone"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="staff-email"></div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddStaff('${branchId}')">Add Staff</button>
    `);
  };

  window.confirmAddStaff = function(branchId) {
    const name = document.getElementById('staff-name')?.value?.trim();
    const role = document.getElementById('staff-role')?.value;
    const phone = document.getElementById('staff-phone')?.value?.trim();
    const email = document.getElementById('staff-email')?.value?.trim();
    if (!name) { toast.show('Name is required', 'error'); return; }
    store.addStaff({ name, role, phone, email, branchId });
    modal.close();
    toast.show('Staff member added!', 'success');
    app._navigate();
  };
}

})();

// ─── PAGE: notifications.js ───
(function() {
// Notifications Page
window.Pages.renderNotifications = function renderNotifications(container) {
  const branchId = store.getActiveBranchId();
  const notifications = store.getNotifications(branchId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread = notifications.filter(n => !n.read).length;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Notifications</h1>
          <p class="page-subtitle">${unread} unread notification${unread !== 1 ? 's' : ''}</p>
        </div>
        ${unread > 0 ? `<button class="btn btn-secondary" onclick="markAllRead()">Mark All Read</button>` : ''}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-2);" id="notif-list">
      ${notifications.map(n => renderNotifItem(n)).join('') || `
        <div class="empty-state" style="margin-top:var(--space-8);">
          <div class="empty-icon">${icons.bell}</div>
          <div class="empty-title">No notifications</div>
          <div class="empty-desc">You're all caught up!</div>
        </div>
      `}
    </div>
  `;

  window.markAllRead = function() {
    store.markAllRead();
    toast.show('All notifications marked as read', 'success');
    app._navigate();
  };
}

function renderNotifItem(n) {
  const iconColorMap = {
    expiry: 'var(--sf-warning-500)',
    payment: 'var(--sf-error-500)',
    reservation: 'var(--sf-indigo-500)',
    system: 'var(--sf-gray-500)',
    transfer: 'var(--sf-indigo-500)',
  };

  return `
    <div style="background:${n.read ? 'var(--color-bg-primary)' : 'var(--sf-indigo-50)'};border:1px solid ${n.read ? 'var(--color-border-secondary)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);display:flex;align-items:flex-start;gap:var(--space-4);cursor:pointer;"
      onclick="readNotif('${n.id}')"
      onmouseenter="this.style.boxShadow='var(--shadow-xs)'" onmouseleave="this.style.boxShadow=''"
    >
      <div style="width:36px;height:36px;border-radius:var(--radius-lg);background:${iconColorMap[n.type] || 'var(--sf-gray-400)'}20;color:${iconColorMap[n.type] || 'var(--sf-gray-400)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${icons[n.icon] || icons.bell}
      </div>
      <div style="flex:1;">
        <div style="font-size:var(--text-sm);${n.read ? '' : 'font-weight:var(--fw-semibold);'}color:var(--color-text-primary);">${n.message}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${utils.formatRelative(n.createdAt)}</div>
      </div>
      ${!n.read ? `<div style="width:8px;height:8px;background:var(--sf-indigo-500);border-radius:50%;flex-shrink:0;margin-top:var(--space-1);"></div>` : ''}
    </div>
  `;
}

window.readNotif = function(id) {
  store.markNotificationRead(id);
  app._updateNotifBadge();
  // update inline
  app._navigate();
};

})();

// ─── PAGE: activity.js ───
(function() {
// Activity Log Page
window.Pages.renderActivity = function renderActivity(container) {
  const activities = store.getActivityLogs(100);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Activity Log</h1>
          <p class="page-subtitle">Complete audit trail of all actions</p>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Time</th><th>Action</th><th>Description</th><th>Type</th></tr>
          </thead>
          <tbody>
            ${activities.map(a => {
              const actionIconMap = {
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
              const icon = actionIconMap[a.action] || icons.activity;

              return `
                <tr>
                  <td style="color:var(--color-text-secondary);white-space:nowrap;">${utils.formatRelative(a.timestamp)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-text-secondary);">
                      ${icon}
                      <span style="font-size:var(--text-xs);">${a.action?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td style="color:var(--color-text-primary);">${a.description}</td>
                  <td><span class="badge badge-neutral">${a.entity || '—'}</span></td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="4"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.activity}</div>
                <div class="empty-title">No activity recorded</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: settings.js ───
(function() {
// Settings Page
window.Pages.renderSettings = function renderSettings(container) {
  const settings = store.getSettings();
  const branches = store.getBranches();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Organization, appearance, and configuration</p>
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);align-items:start;">
      <!-- Organization -->
      <div class="card">
        <div class="card-header"><div class="card-title">Organization</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="input" id="set-org-name" value="${settings.orgName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="input" id="set-address" value="${settings.address || ''}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="input" id="set-phone" value="${settings.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="input" id="set-email" value="${settings.email || ''}">
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
                  <div style="font-weight:var(--fw-medium);">${b.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${b.city} · ${b.phone}</div>
                </div>
                <span class="badge badge-success"><span class="badge-dot"></span>${b.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border-color:var(--sf-error-200);">
          <div class="card-header"><div class="card-title" style="color:var(--sf-error-600);">Danger Zone</div></div>
          <div class="card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);">Reset Demo Data</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Clear all data and reload fresh demo</div>
              </div>
              <button class="btn btn-danger" onclick="app.resetApp()">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.saveOrgSettings = function() {
    store.updateSettings({
      orgName: document.getElementById('set-org-name')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
    });
    toast.show('Settings saved!', 'success');
  };
}

})();

// ─── PAGE: reservations.js ───
(function() {
// Reservations Page
window.Pages.renderReservations = function renderReservations(container) {
  const branchId = store.getActiveBranchId();
  const reservations = store.getReservations().filter(r => {
    const seats = store.getSeatsForBranch(branchId).map(s => s.id);
    return seats.includes(r.seatId);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reservations</h1>
          <p class="page-subtitle">Manage seat reservations and waitlist</p>
        </div>
        <button class="btn btn-primary" onclick="openReservationModal()">
          ${icons.calendar} New Reservation
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header"><div class="table-title">All Reservations</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>From</th><th>To</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${reservations.map(r => {
              const student = store.getStudent(r.studentId);
              const seat = store.getSeat(r.seatId);
              const today_ = new Date();
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              const isActive = start <= today_ && end >= today_;
              const isFuture = start > today_;
              const status = r.status === 'cancelled' ? 'cancelled' : end < today_ ? 'expired' : isFuture ? 'upcoming' : 'active';
              const badgeClass = { upcoming: 'badge-indigo', active: 'badge-success', expired: 'badge-neutral', cancelled: 'badge-error' }[status];
              return `
                <tr>
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${student?.avatar};">${utils.initials(student?.name || '')}</div>
                      <div class="student-name">${student?.name || '—'}</div>
                    </div>
                  </td>
                  <td>${seat ? `<span class="badge badge-indigo">${seat.label}</span>` : '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.endDate, {day:'numeric',month:'short'})}</td>
                  <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${capitalizeFirst(status)}</span></td>
                  <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${r.notes || '—'}</td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.calendar}</div>
                <div class="empty-title">No reservations</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

})();

// ─── APP CORE ───
// StudyFlow Application — Main Entry Point

// ── Router ─────────────────────────────────────────────────────────
const routes = {
  '/dashboard': () => Promise.resolve(window.Pages.renderDashboard),
  '/seat-map': () => Promise.resolve(window.Pages.renderSeatMap),
  '/students': () => Promise.resolve(window.Pages.renderStudents),
  '/student': () => Promise.resolve(window.Pages.renderStudentProfile),
  '/memberships': () => Promise.resolve(window.Pages.renderMemberships),
  '/payments': () => Promise.resolve(window.Pages.renderPayments),
  '/attendance': () => Promise.resolve(window.Pages.renderAttendance),
  '/floors': () => Promise.resolve(window.Pages.renderFloors),
  '/expenses': () => Promise.resolve(window.Pages.renderExpenses),
  '/reports': () => Promise.resolve(window.Pages.renderReports),
  '/staff': () => Promise.resolve(window.Pages.renderStaff),
  '/notifications': () => Promise.resolve(window.Pages.renderNotifications),
  '/activity': () => Promise.resolve(window.Pages.renderActivity),
  '/settings': () => Promise.resolve(window.Pages.renderSettings),
  '/reservations': () => Promise.resolve(window.Pages.renderReservations),
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

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => app.init()); } else { app.init(); }

