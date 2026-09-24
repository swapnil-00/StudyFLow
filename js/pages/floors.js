// Floors & Rooms Page — Complete Visual Space Configuration & Drag-and-Drop Floor Plan Editor

export function renderFloors(container) {
  const branchId = store.getActiveBranchId();

  function render() {
    const branch = store.getBranch(branchId);
    const floors = store.getFloors(branchId);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Floors & Rooms</h1>
            <p class="page-subtitle">${branch?.name || 'StudyFlow'} — Physical space & seat layout configuration</p>
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
  }

  // Live subscription so changes show instantly without requiring page reload
  const unsubscribe = store.subscribe(() => {
    if (container && container.isConnected) {
      render();
    }
  });

  // ── Floor Modals ──────────────────────────────────────────────────
  window.openAddFloorModal = function() {
    const currentFloors = store.getFloors(branchId);
    modal.open('Add Floor', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor Name <span class="required">*</span></label>
          <input type="text" class="input" id="floor-name" placeholder="e.g. Floor 4 / Main Floor">
        </div>
        <div class="form-group">
          <label class="form-label">Level / Floor Number</label>
          <input type="number" class="input" id="floor-level" value="${currentFloors.length + 1}" min="0">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddFloor('${branchId}')">Add Floor</button>
    `);
  };

  window.confirmAddFloor = async function(bId) {
    const name = document.getElementById('floor-name')?.value?.trim();
    const level = parseInt(document.getElementById('floor-level')?.value || 1);
    if (!name) { toast.show('Floor name is required', 'error'); return; }
    try {
      await store.addFloor({ branchId: bId, name, level, floorNumber: level });
      modal.close();
      toast.show(`Floor "${name}" added successfully!`, 'success');
      render();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  // ── Room Modals ───────────────────────────────────────────────────
  window.openAddRoomModal = function(floorId) {
    const floors_ = store.getFloors(branchId);
    if (!floors_.length) {
      toast.show('Please create a floor first', 'error');
      openAddFloorModal();
      return;
    }
    const defaultFloorId = floorId || floors_[0].id;

    modal.open('Add Room & Populate Seats', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor <span class="required">*</span></label>
          <select class="select" id="room-floor">
            ${floors_.map(f => `<option value="${f.id}" ${f.id === defaultFloorId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Room Name <span class="required">*</span></label>
          <input type="text" class="input" id="room-name" placeholder="e.g. Main Hall / Reading Room">
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Total Seats in Room <span class="required">*</span></label>
            <input type="number" class="input" id="room-seat-count" value="68" min="1" max="500">
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;display:block;">
              Direct seat capacity (no formula needed)
            </span>
          </div>
          <div class="form-group">
            <label class="form-label">Starting Seat Number</label>
            <input type="number" class="input" id="room-seat-start" value="1" min="1">
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;display:block;">
              Default: 1 (seats 1 to 68)
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Initial Floor Plan Arrangement</label>
          <select class="select" id="room-layout-preset">
            <option value="blueprint">Library Blueprint (4-cluster layout matching diagram)</option>
            <option value="grid">Structured Grid Block</option>
          </select>
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;display:block;">
            You can freely drag and reposition any seat after creation.
          </span>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddRoom()">
        ${icons.plus} Create Room & Populate Seats
      </button>
    `, { size: 'md' });
  };

  window.confirmAddRoom = async function() {
    const floorId = document.getElementById('room-floor')?.value;
    const name = document.getElementById('room-name')?.value?.trim();
    const seatCount = parseInt(document.getElementById('room-seat-count')?.value || 68);
    const startNum = parseInt(document.getElementById('room-seat-start')?.value || 1);
    const preset = document.getElementById('room-layout-preset')?.value || 'blueprint';

    if (!name) { toast.show('Room name is required', 'error'); return; }
    if (!seatCount || seatCount <= 0) { toast.show('Please enter a valid seat count', 'error'); return; }

    try {
      const room = await store.addRoom({
        floorId,
        branchId,
        name,
        type: 'hall',
        acAvailable: false,
        capacity: seatCount
      });

      // Generate seats with initial coordinates
      const seatsList = generateInitialSeatCoordinates(room.id, branchId, seatCount, startNum, preset);
      await store.batchInsertSeats(seatsList);

      modal.close();
      toast.show(`Room "${name}" created with ${seatCount} seats! Opening layout editor...`, 'success');
      render();

      // Open the visual layout canvas immediately
      setTimeout(() => {
        if (window.openSeatLayoutEditor) {
          window.openSeatLayoutEditor(room.id);
        }
      }, 250);
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  window.confirmDeleteRoom = async function(roomId) {
    const room = store.getRoom(roomId);
    if (!confirm(`Are you sure you want to delete room "${room?.name || roomId}" and all its seats?`)) return;
    try {
      await store.deleteRoom(roomId);
      toast.show('Room deleted', 'success');
      render();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  // Initial render
  render();
}

// ── Floor Plan Blueprint Layout Coordinates Generator ─────────────
function generateInitialSeatCoordinates(roomId, branchId, count, startNum = 1, preset = 'blueprint') {
  const seats = [];

  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const seatId = `SEAT-${roomId}-${num}`;
    let x = 40;
    let y = 60;

    if (preset === 'blueprint') {
      // 4-Cluster Blueprint matching user diagram:
      // Cluster 1: Right Grid (first 36 seats: 1 to 36) -> 4 columns x 9 rows
      if (i < 36) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        x = 460 + (col * 74);
        y = 60 + (row * 50);
      }
      // Cluster 2: Center Face-to-Face Benches (next 16 seats: 37 to 52) -> 2 columns of 8 with aisle
      else if (i < 52) {
        const idx = i - 36;
        const isRightCol = idx % 2 === 1;
        const pairRow = Math.floor(idx / 2);
        x = isRightCol ? 320 : 220;
        // Add aisle gap after row 4
        y = 60 + (pairRow * 48) + (pairRow >= 4 ? 20 : 0);
      }
      // Cluster 3: Bottom Left Pod (next 12 seats: 53 to 64) -> 4 columns x 3 rows
      else if (i < 64) {
        const idx = i - 52;
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        x = 40 + (col * 74);
        y = 470 + (row * 50);
      }
      // Cluster 4: Left Wall Booths (remaining seats: 65 to 68) -> 1 column
      else {
        const idx = i - 64;
        x = 40;
        y = 210 + (idx * 50);
      }
    } else {
      // Standard grid layout: 8 seats per row
      const col = i % 8;
      const row = Math.floor(i / 8);
      x = 50 + (col * 80);
      y = 60 + (row * 55);
    }

    seats.push({
      id: seatId,
      roomId,
      branchId,
      label: String(num),
      number: String(num),
      row: '',
      col: i + 1,
      type: 'standard',
      status: 'available',
      position: { x, y },
      position_x: x,
      position_y: y,
      createdAt: utils.now()
    });
  }

  return seats;
}

window.generateInitialSeatCoordinates = generateInitialSeatCoordinates;
window.Pages = window.Pages || {};
window.Pages.generateInitialSeatCoordinates = generateInitialSeatCoordinates;

export { generateInitialSeatCoordinates };

// ── Interactive Drag & Drop Floor Plan Canvas Editor ──────────────
window.openSeatLayoutEditor = function(roomId) {
  const room = store.getRoom(roomId);
  if (!room) { toast.show('Room not found', 'error'); return; }
  const floor = store.getFloor(room.floorId);
  const seats = store.getSeats(roomId);

  let isArrangeMode = true; // start in Arrange Mode by default
  const localPositions = {};

  // Initialize local coordinates map
  seats.forEach(s => {
    localPositions[s.id] = {
      x: s.position?.x || s.position_x || 40,
      y: s.position?.y || s.position_y || 40
    };
  });

  const editorHtml = `
    <div class="floor-plan-editor-container">
      <div class="floor-plan-toolbar">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div>
            <div style="font-size:var(--text-md);font-weight:var(--fw-bold);color:var(--color-text-primary);">
              ${room.name} — Floor Plan Editor
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
              ${floor?.name || ''} · <span id="editor-seat-count">${seats.length}</span> seats
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="editor-mode-toggle" onclick="toggleEditorMode()">
            ${icons.edit} <span id="editor-mode-text">Arrange Mode: ON</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="applyEditorBlueprint()">
            ${icons.grid} Apply Blueprint Layout
          </button>
          <button class="btn btn-secondary btn-sm" onclick="addSingleSeatToEditor('${roomId}')">
            ${icons.plus} Add Seat
          </button>
          <button class="btn btn-primary btn-sm" id="editor-save-btn" onclick="saveEditorLayout('${roomId}')">
            ${icons.checkCircle} Lock & Save Layout
          </button>
        </div>
      </div>

      <div style="font-size:12px;color:var(--color-text-secondary);display:flex;align-items:center;justify-content:space-between;padding:0 var(--space-1);">
        <span>💡 <strong>Tip:</strong> Drag any seat card to reposition. Snaps automatically to 10px grid. Click "Lock & Save Layout" to persist.</span>
        <span id="drag-coord-display" style="font-family:monospace;color:var(--sf-indigo-400);"></span>
      </div>

      <!-- Canvas Area -->
      <div class="floor-plan-canvas-wrap" id="editor-canvas-wrap">
        <div class="floor-plan-canvas" id="editor-canvas" style="width:820px;height:660px;">
          <!-- Visual Blueprint Cluster Boundaries -->
          <div class="floor-plan-cluster" style="left:445px;top:45px;width:320px;height:475px;" title="Right Desk Block (Seats 1-36)"></div>
          <div class="floor-plan-cluster" style="left:205px;top:45px;width:200px;height:460px;" title="Center Face-to-Face Benches"></div>
          <div class="floor-plan-cluster" style="left:25px;top:450px;width:315px;height:175px;" title="Bottom Pod"></div>
          <div class="floor-plan-cluster" style="left:25px;top:195px;width:90px;height:220px;" title="Left Wall Booths"></div>

          <!-- Draggable Seats Container -->
          <div id="editor-seats-container"></div>
        </div>
      </div>
    </div>
  `;

  modal.open(`Seat Layout Designer — ${room.name}`, editorHtml, `
    <button class="btn btn-secondary" onclick="modal.close()">Close</button>
    <button class="btn btn-primary" onclick="saveEditorLayout('${roomId}')">
      ${icons.checkCircle} Save & Finish
    </button>
  `, { size: 'xl' });

  // Render seats onto canvas
  function renderCanvasSeats() {
    const containerEl = document.getElementById('editor-seats-container');
    if (!containerEl) return;
    const currentSeats = store.getSeats(roomId);
    document.getElementById('editor-seat-count').textContent = currentSeats.length;

    containerEl.innerHTML = currentSeats.map(seat => {
      const pos = localPositions[seat.id] || { x: seat.position?.x || 50, y: seat.position?.y || 60 };
      const status = store.getSeatStatus(seat.id);
      return `
        <div class="floor-plan-seat ${status} ${isArrangeMode ? 'is-arrange-mode' : ''}"
          id="canvas-seat-${seat.id}"
          data-seat-id="${seat.id}"
          style="left:${pos.x}px;top:${pos.y}px;"
        >
          <span class="seat-led"></span>
          <span>${seat.label}</span>
          <button class="seat-delete-btn" onclick="event.stopPropagation(); deleteSeatFromEditor('${seat.id}', '${roomId}')" title="Delete Seat">✕</button>
        </div>
      `;
    }).join('');

    attachDragListeners();
  }

  // Drag-and-drop listener engine with snap-to-grid
  function attachDragListeners() {
    const canvasWrap = document.getElementById('editor-canvas-wrap');
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;

    let activeDragEl = null;
    let dragSeatId = null;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const coordDisplay = document.getElementById('drag-coord-display');

    canvas.querySelectorAll('.floor-plan-seat').forEach(el => {
      el.onpointerdown = (e) => {
        if (!isArrangeMode) return;
        if (e.target.classList.contains('seat-delete-btn')) return;

        activeDragEl = el;
        dragSeatId = el.dataset.seatId;
        el.classList.add('dragging');
        el.setPointerCapture(e.pointerId);

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(el.style.left) || 0;
        initialTop = parseFloat(el.style.top) || 0;
      };

      el.onpointermove = (e) => {
        if (!activeDragEl || activeDragEl !== el) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let rawX = initialLeft + dx;
        let rawY = initialTop + dy;

        // 10px Snap-to-Grid
        const snap = 10;
        let snappedX = Math.round(rawX / snap) * snap;
        let snappedY = Math.round(rawY / snap) * snap;

        // Boundaries
        snappedX = Math.max(10, Math.min(760, snappedX));
        snappedY = Math.max(10, Math.min(600, snappedY));

        el.style.left = `${snappedX}px`;
        el.style.top = `${snappedY}px`;

        if (localPositions[dragSeatId]) {
          localPositions[dragSeatId].x = snappedX;
          localPositions[dragSeatId].y = snappedY;
        }

        if (coordDisplay) {
          coordDisplay.textContent = `Seat ${el.querySelector('span:nth-child(2)')?.textContent || ''}: X=${snappedX}, Y=${snappedY}`;
        }
      };

      el.onpointerup = (e) => {
        if (activeDragEl === el) {
          el.classList.remove('dragging');
          el.releasePointerCapture(e.pointerId);
          activeDragEl = null;
          dragSeatId = null;
        }
      };

      el.onpointercancel = (e) => {
        if (activeDragEl === el) {
          el.classList.remove('dragging');
          activeDragEl = null;
        }
      };
    });
  }

  window.toggleEditorMode = function() {
    isArrangeMode = !isArrangeMode;
    const textEl = document.getElementById('editor-mode-text');
    if (textEl) textEl.textContent = isArrangeMode ? 'Arrange Mode: ON' : 'Arrange Mode: LOCKED';
    renderCanvasSeats();
  };

  window.applyEditorBlueprint = function() {
    const currentSeats = store.getSeats(roomId);
    currentSeats.forEach((s, i) => {
      let x = 40, y = 60;
      if (i < 36) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        x = 460 + (col * 74);
        y = 60 + (row * 50);
      } else if (i < 52) {
        const idx = i - 36;
        const isRightCol = idx % 2 === 1;
        const pairRow = Math.floor(idx / 2);
        x = isRightCol ? 320 : 220;
        y = 60 + (pairRow * 48) + (pairRow >= 4 ? 20 : 0);
      } else if (i < 64) {
        const idx = i - 52;
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        x = 40 + (col * 74);
        y = 470 + (row * 50);
      } else {
        const idx = i - 64;
        x = 40;
        y = 210 + (idx * 50);
      }
      localPositions[s.id] = { x, y };
    });
    renderCanvasSeats();
    toast.show('Applied blueprint layout to seats! Click "Lock & Save" to persist.', 'success');
  };

  window.addSingleSeatToEditor = async function(rId) {
    const currentSeats = store.getSeats(rId);
    const nextNum = currentSeats.length + 1;
    try {
      const newSeat = await store.addSeat({
        roomId: rId,
        branchId: store.getActiveBranchId(),
        label: String(nextNum),
        number: String(nextNum),
        status: 'available',
        position: { x: 50, y: 50 },
        position_x: 50,
        position_y: 50
      });
      localPositions[newSeat.id] = { x: 50, y: 50 };
      renderCanvasSeats();
      toast.show(`Seat ${nextNum} added to canvas!`, 'success');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  window.deleteSeatFromEditor = async function(seatId, rId) {
    const seat = store.getSeat(seatId);
    if (!confirm(`Delete seat ${seat?.label || seatId}?`)) return;
    try {
      await store.deleteSeat(seatId);
      delete localPositions[seatId];
      renderCanvasSeats();
      toast.show('Seat deleted', 'success');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  window.saveEditorLayout = async function(rId) {
    const saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) saveBtn.textContent = 'Saving...';

    const updates = Object.entries(localPositions).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y
    }));

    try {
      await store.batchUpdateSeatPositions(updates);
      toast.show('Floor plan layout saved and locked successfully! 🎉', 'success');
      modal.close();
      app._navigate();
    } catch (e) {
      toast.show('Failed to save layout: ' + e.message, 'error');
      if (saveBtn) saveBtn.textContent = 'Lock & Save Layout';
    }
  };

  // Initial draw
  renderCanvasSeats();
};

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
    <div class="card" style="transition:all 0.15s ease;"
      onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='var(--shadow-xs)'"
    >
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);font-size:var(--text-base);">${room.name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seats.length} seats configured</div>
          </div>
          <span class="badge badge-${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'success'}">
            ${occupancyPct}%
          </span>
        </div>
        <div class="progress-bar" style="margin-bottom:var(--space-3);">
          <div class="progress-fill ${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'indigo'}" style="width:${occupancyPct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4);">
          <span><strong>${seats.length}</strong> total seats</span>
          <span style="color:var(--sf-success-600);"><strong>${available}</strong> free</span>
          <span style="color:var(--sf-indigo-600);"><strong>${occupied}</strong> booked</span>
        </div>

        <div style="display:flex;gap:var(--space-2);border-top:1px solid var(--color-border-secondary);padding-top:var(--space-3);">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="openSeatLayoutEditor('${room.id}')" title="Drag and drop seat arrangement">
            ${icons.map} Arrange Layout
          </button>
          <button class="btn btn-ghost btn-sm" onclick="app.navigate('/seat-map')" title="View on Live Seat Map">
            ${icons.grid} View Map
          </button>
          <button class="btn btn-ghost btn-sm" style="color:var(--sf-error-600);" onclick="confirmDeleteRoom('${room.id}')" title="Delete Room">
            ✕
          </button>
        </div>
      </div>
    </div>
  `;
}
