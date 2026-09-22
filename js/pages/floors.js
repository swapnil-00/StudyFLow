// Floors & Rooms Page
export function renderFloors(container) {
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
