// Seat Map Page — Visual seat management
export function renderSeatMap(container) {
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
