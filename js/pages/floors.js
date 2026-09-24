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

  window.confirmDeleteFloor = async function(floorId) {
    const floor = store.getFloor(floorId);
    if (!floor) return;
    const rooms = store.getRooms(floorId);
    const totalSeats = rooms.reduce((acc, r) => acc + store.getSeats(r.id).length, 0);

    let msg = `Are you sure you want to delete floor "${floor.name}"?`;
    if (rooms.length > 0) {
      msg += `\n\nThis will also delete ${rooms.length} room(s) and ${totalSeats} seat(s) on this floor.`;
    }

    if (!confirm(msg)) return;

    try {
      await store.deleteFloor(floorId);
      toast.show(`Floor "${floor.name}" deleted successfully`, 'success');
      render();
    } catch (e) {
      toast.show('Failed to delete floor: ' + e.message, 'error');
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

// ── Interactive Canva-like Seat Layout Editor ──────────────────────
window.openSeatLayoutEditor = function(roomId) {
  const room = store.getRoom(roomId);
  if (!room) { toast.show('Room not found', 'error'); return; }
  const floor = store.getFloor(room.floorId);
  const seats = store.getSeats(roomId);

  // ── Canvas transform state (Canva-like pan & zoom) ──
  let canvasZoom = 1;
  let panX = 0, panY = 0;
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let panStartPanX = 0, panStartPanY = 0;
  let spaceHeld = false;

  const localPositions = {};

  // Initialize local coordinates map
  seats.forEach(s => {
    localPositions[s.id] = {
      x: s.position?.x || s.position_x || 40,
      y: s.position?.y || s.position_y || 40
    };
  });

  const editorHtml = `
    <div class="floor-plan-editor-container" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
      <div class="floor-plan-toolbar" style="flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
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
          <!-- Zoom Controls -->
          <div style="display:flex;align-items:center;gap:3px;background:var(--color-bg-secondary);padding:3px 8px;border-radius:var(--radius-md);border:1px solid var(--color-border-primary);">
            <button type="button" class="btn btn-ghost btn-xs" style="padding:2px 7px;height:auto;font-weight:bold;" onclick="editorZoom(-0.15)" title="Zoom Out">−</button>
            <span id="canvas-zoom-label" style="font-size:11px;font-family:monospace;min-width:38px;text-align:center;font-weight:600;">100%</span>
            <button type="button" class="btn btn-ghost btn-xs" style="padding:2px 7px;height:auto;font-weight:bold;" onclick="editorZoom(0.15)" title="Zoom In">+</button>
            <button type="button" class="btn btn-ghost btn-xs" style="padding:2px 7px;height:auto;font-size:10px;" onclick="editorZoom(0)" title="Reset Zoom & Pan">Fit</button>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" onclick="addSingleSeatToEditor('${roomId}')">
            ${icons.plus} Add Seat
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="editor-save-btn" onclick="saveEditorLayout('${roomId}')">
            ${icons.checkCircle} Lock & Save Layout
          </button>
        </div>
      </div>

      <div style="font-size:11px;color:var(--color-text-tertiary);display:flex;align-items:center;justify-content:space-between;padding:2px var(--space-2);flex-wrap:wrap;gap:var(--space-1);flex-shrink:0;">
        <span>🖱️ <b>Scroll</b> = Zoom · <b>Middle-click drag</b> or <b>Space + drag</b> = Pan · <b>Drag seat</b> = Move · <b>Hover + ✕</b> = Delete</span>
        <span id="drag-coord-display" style="font-family:monospace;color:var(--sf-indigo-400);font-weight:bold;"></span>
      </div>

      <!-- Canva-like Infinite Canvas Viewport -->
      <div id="editor-viewport" style="flex:1;overflow:hidden;position:relative;background:#0d1117;border-radius:var(--radius-lg);cursor:grab;">
        <!-- Grid pattern background -->
        <svg id="editor-grid-bg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;">
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
            </pattern>
            <pattern id="bigGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#smallGrid)"/>
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bigGrid)"/>
        </svg>

        <!-- Transformable canvas layer -->
        <div id="editor-canvas" style="position:absolute;top:0;left:0;transform-origin:0 0;transition:none;width:4000px;height:3000px;">
          <div id="editor-seats-container"></div>
        </div>

        <!-- Minimap / zoom info overlay -->
        <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.6);padding:4px 10px;border-radius:6px;font-size:10px;font-family:monospace;color:#94a3b8;z-index:50;pointer-events:none;">
          <span id="canvas-info-overlay">Zoom: 100% · Pan: 0, 0</span>
        </div>
      </div>
    </div>
  `;

  modal.open(`Seat Layout Designer — ${room.name}`, editorHtml, `
    <button class="btn btn-secondary" onclick="modal.close()">Close</button>
    <button class="btn btn-primary" onclick="saveEditorLayout('${roomId}')">
      ${icons.checkCircle} Save & Finish
    </button>
  `, { size: 'full' });

  // Make modal dialog resizable
  const modalDialog = document.getElementById('modal-dialog');
  if (modalDialog) {
    modalDialog.classList.add('is-resizable');
  }

  // ── Canvas Transform Engine ──────────────────────────────────────
  const viewport = document.getElementById('editor-viewport');
  const canvas = document.getElementById('editor-canvas');

  function applyTransform() {
    if (!canvas) return;
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${canvasZoom})`;
    const zoomLabel = document.getElementById('canvas-zoom-label');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(canvasZoom * 100)}%`;
    const info = document.getElementById('canvas-info-overlay');
    if (info) info.textContent = `Zoom: ${Math.round(canvasZoom * 100)}% · Pan: ${Math.round(panX)}, ${Math.round(panY)}`;
  }

  // Zoom via mouse wheel
  if (viewport) {
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = canvasZoom;
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      canvasZoom = Math.min(3, Math.max(0.15, Math.round((canvasZoom + delta) * 100) / 100));

      // Zoom towards mouse pointer
      const zoomRatio = canvasZoom / oldZoom;
      panX = mouseX - (mouseX - panX) * zoomRatio;
      panY = mouseY - (mouseY - panY) * zoomRatio;

      applyTransform();
    }, { passive: false });

    // Pan via middle-click or space+left-click
    viewport.addEventListener('pointerdown', (e) => {
      // Middle mouse button (button 1) or space held + left button
      if (e.button === 1 || (spaceHeld && e.button === 0)) {
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartPanX = panX;
        panStartPanY = panY;
        viewport.style.cursor = 'grabbing';
        viewport.setPointerCapture(e.pointerId);
      }
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!isPanning) return;
      panX = panStartPanX + (e.clientX - panStartX);
      panY = panStartPanY + (e.clientY - panStartY);
      applyTransform();
    });

    viewport.addEventListener('pointerup', (e) => {
      if (isPanning) {
        isPanning = false;
        viewport.style.cursor = spaceHeld ? 'grab' : 'default';
        try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    });

    viewport.addEventListener('pointercancel', () => {
      isPanning = false;
      viewport.style.cursor = 'default';
    });
  }

  // Space key for pan mode
  function onKeyDown(e) {
    if (e.code === 'Space' && !e.repeat && document.getElementById('editor-viewport')) {
      e.preventDefault();
      spaceHeld = true;
      const vp = document.getElementById('editor-viewport');
      if (vp) vp.style.cursor = 'grab';
    }
  }
  function onKeyUp(e) {
    if (e.code === 'Space') {
      spaceHeld = false;
      const vp = document.getElementById('editor-viewport');
      if (vp && !isPanning) vp.style.cursor = 'default';
    }
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Cleanup on modal close (override modal.close to remove listeners)
  const originalClose = modal.close.bind(modal);
  modal.close = function() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    originalClose();
    modal.close = originalClose; // restore original
  };

  // Toolbar zoom button
  window.editorZoom = function(delta) {
    if (delta === 0) {
      // Fit / reset
      canvasZoom = 1;
      panX = 20;
      panY = 20;
    } else {
      canvasZoom = Math.min(3, Math.max(0.15, Math.round((canvasZoom + delta) * 100) / 100));
    }
    applyTransform();
  };

  // ── Render Seats ──────────────────────────────────────────────────
  function renderCanvasSeats() {
    const containerEl = document.getElementById('editor-seats-container');
    if (!containerEl) return;
    const currentSeats = store.getSeats(roomId);
    const countEl = document.getElementById('editor-seat-count');
    if (countEl) countEl.textContent = currentSeats.length;

    containerEl.innerHTML = currentSeats.map(seat => {
      const pos = localPositions[seat.id] || { x: seat.position?.x || seat.position_x || 50, y: seat.position?.y || seat.position_y || 60 };
      const status = store.getSeatStatus(seat.id);
      return `
        <div class="floor-plan-seat ${status} is-arrange-mode"
          id="canvas-seat-${seat.id}"
          data-seat-id="${seat.id}"
          style="left:${pos.x}px;top:${pos.y}px;"
        >
          <span class="seat-led"></span>
          <span>${seat.label}</span>
          <button type="button" class="seat-delete-btn"
            title="Delete Seat ${seat.label}"
            onpointerdown="event.stopPropagation();"
            onmousedown="event.stopPropagation();"
            onclick="event.stopPropagation(); event.preventDefault(); window.deleteSeatFromEditor('${seat.id}', '${roomId}');"
          >✕</button>
        </div>
      `;
    }).join('');

    attachDragListeners();
  }

  // ── Drag Listeners (zoom-aware) ───────────────────────────────────
  function attachDragListeners() {
    const canvasEl = document.getElementById('editor-canvas');
    if (!canvasEl) return;

    const coordDisplay = document.getElementById('drag-coord-display');

    canvasEl.querySelectorAll('.floor-plan-seat').forEach(el => {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      el.onpointerdown = (e) => {
        if (spaceHeld) return; // let panning take over
        if (e.target.closest('.seat-delete-btn')) {
          e.stopPropagation();
          return;
        }
        if (e.button !== 0) return; // only left-click

        e.stopPropagation(); // prevent viewport panning
        isDragging = true;
        el.classList.add('dragging');
        el.setPointerCapture(e.pointerId);

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(el.style.left) || 0;
        initialTop = parseFloat(el.style.top) || 0;
      };

      el.onpointermove = (e) => {
        if (!isDragging) return;
        // Adjust deltas by zoom so movement feels 1:1
        const dx = (e.clientX - startX) / (canvasZoom || 1);
        const dy = (e.clientY - startY) / (canvasZoom || 1);

        const snap = 10;
        let snappedX = Math.round((initialLeft + dx) / snap) * snap;
        let snappedY = Math.round((initialTop + dy) / snap) * snap;

        snappedX = Math.max(0, snappedX);
        snappedY = Math.max(0, snappedY);

        el.style.left = `${snappedX}px`;
        el.style.top = `${snappedY}px`;

        const seatId = el.dataset.seatId;
        if (localPositions[seatId]) {
          localPositions[seatId].x = snappedX;
          localPositions[seatId].y = snappedY;
        }

        if (coordDisplay) {
          coordDisplay.textContent = `Seat ${el.querySelector('span:nth-child(2)')?.textContent || ''}: X=${snappedX}, Y=${snappedY}`;
        }
      };

      el.onpointerup = (e) => {
        if (isDragging) {
          isDragging = false;
          el.classList.remove('dragging');
          try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      el.onpointercancel = () => {
        isDragging = false;
        el.classList.remove('dragging');
      };
    });
  }

  // ── Add Seat (with custom label + duplicate check) ────────────────
  window.addSingleSeatToEditor = async function(rId) {
    const currentSeats = store.getSeats(rId);

    // Calculate default next number
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });
    const suggestedNum = maxNum + 1;

    // Prompt user for custom seat label
    const input = prompt(
      `Enter seat number/label:\n(Existing seats: ${currentSeats.map(s => s.label).join(', ') || 'none'})`,
      String(suggestedNum)
    );
    if (input === null) return; // user cancelled
    const seatLabel = input.trim();
    if (!seatLabel) { toast.show('Seat label cannot be empty', 'error'); return; }

    // Duplicate check
    const duplicate = currentSeats.find(s => s.label === seatLabel || s.number === seatLabel);
    if (duplicate) {
      toast.show(`Seat "${seatLabel}" already exists! Choose a different number.`, 'error');
      return;
    }

    // Find non-overlapping position
    const seatWidth = 60, seatHeight = 44;
    const stepX = 74, stepY = 56;
    const existingPositions = Object.values(localPositions);

    function isOccupied(x, y) {
      return existingPositions.some(p => Math.abs(p.x - x) < (seatWidth + 6) && Math.abs(p.y - y) < (seatHeight + 6));
    }

    let freeSpot = null;
    for (let y = 40; y <= 2800 && !freeSpot; y += stepY) {
      for (let x = 40; x <= 3800; x += stepX) {
        if (!isOccupied(x, y)) { freeSpot = { x, y }; break; }
      }
    }
    if (!freeSpot) freeSpot = { x: 50 + ((currentSeats.length * 25) % 800), y: 50 };

    try {
      const newSeat = await store.addSeat({
        roomId: rId,
        branchId: store.getActiveBranchId(),
        label: seatLabel,
        number: seatLabel,
        status: 'available',
        position: freeSpot,
        position_x: freeSpot.x,
        position_y: freeSpot.y
      });
      localPositions[newSeat.id] = { x: freeSpot.x, y: freeSpot.y };
      renderCanvasSeats();
      toast.show(`Seat "${seatLabel}" added at (${freeSpot.x}, ${freeSpot.y})`, 'success');
    } catch (e) {
      console.error('Add seat error:', e);
      toast.show('Failed to add seat: ' + e.message, 'error');
    }
  };

  // ── Delete Seat ───────────────────────────────────────────────────
  window.deleteSeatFromEditor = async function(seatId, rId) {
    const seat = store.getSeat(seatId);
    const seatLabel = seat?.label || seat?.number || seatId;
    if (!confirm(`Delete Seat "${seatLabel}"?`)) return;
    try {
      await store.deleteSeat(seatId);
      delete localPositions[seatId];
      renderCanvasSeats();
      toast.show(`Seat "${seatLabel}" deleted`, 'success');
    } catch (e) {
      console.error('Delete seat error:', e);
      toast.show('Failed to delete seat: ' + (e.message || 'Unknown error'), 'error');
    }
  };

  // ── Save Layout ───────────────────────────────────────────────────
  window.saveEditorLayout = async function(rId) {
    const saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) saveBtn.textContent = 'Saving...';

    const updates = Object.entries(localPositions).map(([id, pos]) => ({
      id, x: pos.x, y: pos.y
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

  // ── Initial draw & set pan offset ─────────────────────────────────
  panX = 20;
  panY = 20;
  applyTransform();
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
        <div style="display:flex;gap:var(--space-2);align-items:center;">
          <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal('${floor.id}')">
            ${icons.plus} Add Room
          </button>
          <button class="btn btn-ghost btn-sm" style="color:var(--sf-error-600);" onclick="confirmDeleteFloor('${floor.id}')" title="Delete Floor">
            ${icons.trash} Delete Floor
          </button>
        </div>
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
