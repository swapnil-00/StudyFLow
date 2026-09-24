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

// ── Draw.io-Grade Precision Seat Layout Sheet Editor ──────────────────
window.openSeatLayoutEditor = function(roomId) {
  const room = store.getRoom(roomId);
  if (!room) { toast.show('Room not found', 'error'); return; }
  const floor = store.getFloor(room.floorId);
  const seats = store.getSeats(roomId);

  // ── Canvas state (Draw.io pan, zoom & grid) ──
  let canvasZoom = 1;
  let panX = 40, panY = 40;
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let panStartPanX = 0, panStartPanY = 0;
  let spaceHeld = false;
  let snapGridSize = 10; // 5, 10, 20 or 0 (off)

  // Selection state
  const selectedSeatIds = new Set();
  const localPositions = {};

  // Initialize local coordinates map
  seats.forEach(s => {
    localPositions[s.id] = {
      x: s.position?.x || s.position_x || 50,
      y: s.position?.y || s.position_y || 50
    };
  });

  const editorHtml = `
    <div class="drawio-editor-shell">
      <!-- Draw.io Styled Top Control Toolbar -->
      <div class="drawio-toolbar">
        <!-- Room Details & Seat Count -->
        <div style="display:flex;align-items:center;gap:12px;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#ffffff;display:flex;align-items:center;gap:6px;">
              <span>📐 ${room.name}</span>
              <span style="font-size:11px;font-weight:normal;color:#8e9297;">(${floor?.name || 'Floor Plan'})</span>
            </div>
            <div style="font-size:11px;color:#8e9297;">
              <span id="editor-seat-count">${seats.length}</span> seats total · <span id="editor-selected-count" style="color:#00c3ff;font-weight:600;">0 selected</span>
            </div>
          </div>
        </div>

        <!-- Middle Tools: Zoom, Grid Snap, Alignment, Generators -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <!-- Zoom Controls -->
          <div class="drawio-tool-group">
            <button type="button" class="drawio-btn" onclick="drawioZoom(-0.15)" title="Zoom Out (Ctrl+Minus)">−</button>
            <span id="drawio-zoom-label" style="font-size:11px;font-family:monospace;min-width:36px;text-align:center;font-weight:600;color:#ffffff;">100%</span>
            <button type="button" class="drawio-btn" onclick="drawioZoom(0.15)" title="Zoom In (Ctrl+Plus)">+</button>
            <button type="button" class="drawio-btn" onclick="drawioZoom(0)" title="Fit to Drawing Sheet">Fit</button>
          </div>

          <!-- Snap to Grid -->
          <div class="drawio-tool-group">
            <span style="font-size:11px;color:#8e9297;padding-left:2px;">Snap:</span>
            <select id="drawio-snap-select" onchange="drawioSetSnap(this.value)" style="background:#202225;color:#dcddde;border:1px solid #36393f;border-radius:4px;font-size:11px;padding:2px 4px;outline:none;cursor:pointer;">
              <option value="10" selected>10px (Normal)</option>
              <option value="20">20px (Coarse)</option>
              <option value="5">5px (Fine)</option>
              <option value="0">Off (Free)</option>
            </select>
          </div>

          <!-- Alignment & Distribution Controls -->
          <div class="drawio-tool-group" id="drawio-align-group">
            <button type="button" class="drawio-btn" onclick="drawioAlign('left')" title="Align Left (Select 2+ seats)">⇤ Left</button>
            <button type="button" class="drawio-btn" onclick="drawioAlign('centerX')" title="Align Center X">⬌ Mid X</button>
            <button type="button" class="drawio-btn" onclick="drawioAlign('top')" title="Align Top">⤒ Top</button>
            <button type="button" class="drawio-btn" onclick="drawioAlign('centerY')" title="Align Center Y">⬍ Mid Y</button>
            <button type="button" class="drawio-btn" onclick="drawioDistribute('horizontal')" title="Distribute Horizontally (Select 3+ seats)">↔ Distribute</button>
            <button type="button" class="drawio-btn" onclick="drawioDistribute('vertical')" title="Distribute Vertically">↕ Distribute</button>
          </div>

          <!-- Add Seats / Stencils -->
          <div class="drawio-tool-group">
            <button type="button" class="drawio-btn btn-primary-action" onclick="drawioAddSingleSeat('${roomId}')" title="Add Single Seat with Custom Number">
              + Add Seat
            </button>
            <button type="button" class="drawio-btn" onclick="drawioAddSeatRow('${roomId}')" title="Add Row of Multiple Seats">
              + Add Row
            </button>
          </div>
        </div>

        <!-- Actions: Lock & Save -->
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="drawio-btn btn-success-action" id="drawio-save-btn" onclick="drawioSaveLayout('${roomId}')">
            ${icons.checkCircle || '✓'} Save & Lock
          </button>
        </div>
      </div>

      <!-- Quick Hint Bar -->
      <div style="background:#1e2124;padding:3px 14px;border-bottom:1px solid #2f333a;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#8e9297;flex-shrink:0;">
        <span>💡 <b>Click & Drag Canvas</b> = Box Select · <b>Space+Drag / Middle-click</b> = Pan · <b>Scroll</b> = Zoom · <b>Drag Seat</b> = Move Selection · <b>Ctrl+D</b> = Duplicate · <b>Del</b> = Delete</span>
        <span id="drawio-coord-hud" style="font-family:monospace;color:#00ffff;font-weight:bold;"></span>
      </div>

      <!-- Main Drawing Workspace with Synchronized Rulers -->
      <div class="drawio-workspace-area" id="drawio-workspace">
        <!-- Ruler Corner -->
        <div class="drawio-ruler-corner">px</div>

        <!-- Top Ruler Canvas -->
        <canvas class="drawio-ruler-top" id="drawio-ruler-top" height="24"></canvas>

        <!-- Left Ruler Canvas -->
        <canvas class="drawio-ruler-left" id="drawio-ruler-left" width="24"></canvas>

        <!-- Viewport Area -->
        <div class="drawio-viewport" id="drawio-viewport">
          <!-- Transformable Drawing Sheet Paper -->
          <div class="drawio-sheet-paper" id="drawio-sheet">
            <!-- Dynamic SVG Grid Overlay -->
            <svg class="drawio-grid-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="drawioMinorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="0.75" fill="rgba(255,255,255,0.12)" />
                </pattern>
                <pattern id="drawioMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#drawioMinorGrid)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#drawioMajorGrid)" />
            </svg>

            <!-- Seats Layer -->
            <div id="drawio-seats-layer" style="position:relative;width:100%;height:100%;z-index:10;"></div>

            <!-- Smart Alignment Guides Layer -->
            <div id="drawio-guides-layer" style="position:absolute;inset:0;pointer-events:none;z-index:25;"></div>

            <!-- Marquee Selection Box Overlay -->
            <div id="drawio-selection-box" class="drawio-selection-box" style="display:none;"></div>
          </div>

          <!-- Bottom-left HUD Overlay -->
          <div class="drawio-hud-info" id="drawio-hud-info">
            Zoom: 100% · Origin: (0, 0)
          </div>

          <!-- Floating Multi-Selection HUD (When 1+ seats selected) -->
          <div class="drawio-selection-hud" id="drawio-selection-hud" style="display:none;">
            <span id="drawio-hud-sel-text" style="font-weight:700;color:#00c3ff;">1 seat selected</span>
            <span style="color:#4f545c;">|</span>
            <button type="button" class="drawio-btn" onclick="drawioDuplicateSelected('${roomId}')" title="Duplicate selected seats (Ctrl+D)">📋 Duplicate</button>
            <button type="button" class="drawio-btn btn-danger-action" onclick="drawioDeleteSelected('${roomId}')" title="Delete selected seats (Delete)">🗑️ Delete</button>
            <button type="button" class="drawio-btn" onclick="drawioClearSelection()" title="Clear Selection (Esc)">✕ Deselect</button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.open(`Drawing Sheet Layout Editor — ${room.name}`, editorHtml, `
    <button class="btn btn-secondary" onclick="modal.close()">Close</button>
    <button class="btn btn-primary" onclick="drawioSaveLayout('${roomId}')">
      ${icons.checkCircle || '✓'} Save & Finish
    </button>
  `, { size: 'full' });

  // Add resizable class if available
  const modalDialog = document.getElementById('modal-dialog');
  if (modalDialog) modalDialog.classList.add('is-resizable');

  // ── Engine DOM Elements ──
  const viewport = document.getElementById('drawio-viewport');
  const sheet = document.getElementById('drawio-sheet');
  const seatsLayer = document.getElementById('drawio-seats-layer');
  const guidesLayer = document.getElementById('drawio-guides-layer');
  const selectionBoxEl = document.getElementById('drawio-selection-box');
  const rulerTopCanvas = document.getElementById('drawio-ruler-top');
  const rulerLeftCanvas = document.getElementById('drawio-ruler-left');
  const selectionHud = document.getElementById('drawio-selection-hud');
  const selCountText = document.getElementById('drawio-hud-sel-text');
  const topSelCount = document.getElementById('editor-selected-count');

  // ── Transform & Rulers Renderer ──
  function applyTransform() {
    if (!sheet) return;
    sheet.style.transform = `translate(${panX}px, ${panY}px) scale(${canvasZoom})`;
    sheet.style.transformOrigin = '0 0';

    const zoomLabel = document.getElementById('drawio-zoom-label');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(canvasZoom * 100)}%`;

    const hud = document.getElementById('drawio-hud-info');
    if (hud) hud.textContent = `Zoom: ${Math.round(canvasZoom * 100)}% · Pan: (${Math.round(panX)}, ${Math.round(panY)})`;

    drawRulers();
  }

  function drawRulers() {
    if (!rulerTopCanvas || !rulerLeftCanvas || !viewport) return;

    const vpRect = viewport.getBoundingClientRect();
    const width = vpRect.width;
    const height = vpRect.height;

    // Adjust resolution for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    rulerTopCanvas.width = width * dpr;
    rulerTopCanvas.height = 24 * dpr;
    rulerLeftCanvas.width = 24 * dpr;
    rulerLeftCanvas.height = height * dpr;

    const ctxTop = rulerTopCanvas.getContext('2d');
    const ctxLeft = rulerLeftCanvas.getContext('2d');

    ctxTop.scale(dpr, dpr);
    ctxLeft.scale(dpr, dpr);

    // Clear
    ctxTop.fillStyle = '#202225';
    ctxTop.fillRect(0, 0, width, 24);
    ctxLeft.fillStyle = '#202225';
    ctxLeft.fillRect(0, 0, 24, height);

    ctxTop.fillStyle = '#72767d';
    ctxTop.font = '9px monospace';
    ctxTop.strokeStyle = '#36393f';
    ctxTop.lineWidth = 1;

    ctxLeft.fillStyle = '#72767d';
    ctxLeft.font = '9px monospace';
    ctxLeft.strokeStyle = '#36393f';
    ctxLeft.lineWidth = 1;

    // Calculate visible coordinate range
    const step = canvasZoom < 0.35 ? 200 : canvasZoom < 0.75 ? 100 : canvasZoom > 1.8 ? 20 : 50;
    const minorStep = step / 5;

    // Top Ruler (X coordinates)
    const startX = Math.floor((-panX / canvasZoom) / step) * step;
    const endX = Math.ceil(((width - panX) / canvasZoom) / step) * step;

    for (let x = startX; x <= endX; x += minorStep) {
      const screenX = panX + x * canvasZoom;
      if (screenX < 0 || screenX > width) continue;

      const isMajor = Math.abs(x % step) < 0.01;
      const tickHeight = isMajor ? 14 : 6;

      ctxTop.beginPath();
      ctxTop.moveTo(screenX + 0.5, 24 - tickHeight);
      ctxTop.lineTo(screenX + 0.5, 24);
      ctxTop.stroke();

      if (isMajor && screenX + 30 < width) {
        ctxTop.fillText(`${Math.round(x)}`, screenX + 3, 11);
      }
    }

    // Left Ruler (Y coordinates)
    const startY = Math.floor((-panY / canvasZoom) / step) * step;
    const endY = Math.ceil(((height - panY) / canvasZoom) / step) * step;

    for (let y = startY; y <= endY; y += minorStep) {
      const screenY = panY + y * canvasZoom;
      if (screenY < 0 || screenY > height) continue;

      const isMajor = Math.abs(y % step) < 0.01;
      const tickWidth = isMajor ? 14 : 6;

      ctxLeft.beginPath();
      ctxLeft.moveTo(24 - tickWidth, screenY + 0.5);
      ctxLeft.lineTo(24, screenY + 0.5);
      ctxLeft.stroke();

      if (isMajor && screenY + 15 < height) {
        ctxLeft.save();
        ctxLeft.translate(10, screenY + 12);
        ctxLeft.rotate(-Math.PI / 2);
        ctxLeft.fillText(`${Math.round(y)}`, 0, 0);
        ctxLeft.restore();
      }
    }
  }

  // ── Snap Configuration ──
  window.drawioSetSnap = function(val) {
    snapGridSize = parseInt(val, 10) || 0;
  };

  // ── Zoom Handler ──
  window.drawioZoom = function(delta) {
    if (delta === 0) {
      // Fit to sheet or center
      canvasZoom = 1;
      panX = 50;
      panY = 50;
    } else {
      canvasZoom = Math.min(3.5, Math.max(0.15, Math.round((canvasZoom + delta) * 100) / 100));
    }
    applyTransform();
  };

  // ── Viewport Panning & Marquee Drag Box ──
  let isMarqueeSelecting = false;
  let marqueeStartX = 0, marqueeStartY = 0;

  if (viewport) {
    // Wheel Zoom towards pointer
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = canvasZoom;
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      canvasZoom = Math.min(3.5, Math.max(0.15, Math.round((canvasZoom + delta) * 100) / 100));

      const zoomRatio = canvasZoom / oldZoom;
      panX = mouseX - (mouseX - panX) * zoomRatio;
      panY = mouseY - (mouseY - panY) * zoomRatio;

      applyTransform();
    }, { passive: false });

    // Pointer down on Viewport
    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.floor-plan-seat')) return; // handled by seat drag

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Middle click (button 1) or Space + Left click = Pan
      if (e.button === 1 || (spaceHeld && e.button === 0)) {
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartPanX = panX;
        panStartPanY = panY;
        viewport.style.cursor = 'grabbing';
        viewport.setPointerCapture(e.pointerId);
        return;
      }

      // Left click on background = Start Marquee Box Selection
      if (e.button === 0) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          selectedSeatIds.clear();
          updateSelectionVisuals();
        }
        isMarqueeSelecting = true;
        marqueeStartX = mouseX;
        marqueeStartY = mouseY;

        if (selectionBoxEl) {
          selectionBoxEl.style.display = 'block';
          // Place relative to sheet coords
          const sheetX = (mouseX - panX) / canvasZoom;
          const sheetY = (mouseY - panY) / canvasZoom;
          selectionBoxEl.style.left = `${sheetX}px`;
          selectionBoxEl.style.top = `${sheetY}px`;
          selectionBoxEl.style.width = '0px';
          selectionBoxEl.style.height = '0px';
        }
        viewport.setPointerCapture(e.pointerId);
      }
    });

    viewport.addEventListener('pointermove', (e) => {
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isPanning) {
        panX = panStartPanX + (e.clientX - panStartX);
        panY = panStartPanY + (e.clientY - panStartY);
        applyTransform();
        return;
      }

      if (isMarqueeSelecting && selectionBoxEl) {
        const sheetStartX = (marqueeStartX - panX) / canvasZoom;
        const sheetStartY = (marqueeStartY - panY) / canvasZoom;
        const currentSheetX = (mouseX - panX) / canvasZoom;
        const currentSheetY = (mouseY - panY) / canvasZoom;

        const left = Math.min(sheetStartX, currentSheetX);
        const top = Math.min(sheetStartY, currentSheetY);
        const width = Math.abs(currentSheetX - sheetStartX);
        const height = Math.abs(currentSheetY - sheetStartY);

        selectionBoxEl.style.left = `${left}px`;
        selectionBoxEl.style.top = `${top}px`;
        selectionBoxEl.style.width = `${width}px`;
        selectionBoxEl.style.height = `${height}px`;

        // Live check intersection with all seats
        const right = left + width;
        const bottom = top + height;
        const currentSeats = store.getSeats(roomId);

        currentSeats.forEach(seat => {
          const pos = localPositions[seat.id] || { x: 50, y: 50 };
          const sRight = pos.x + 62;
          const sBottom = pos.y + 40;

          // Box intersection
          const isInside = !(pos.x > right || sRight < left || pos.y > bottom || sBottom < top);
          if (isInside) {
            selectedSeatIds.add(seat.id);
          } else if (!e.shiftKey) {
            selectedSeatIds.delete(seat.id);
          }
        });

        updateSelectionVisuals();
      }
    });

    viewport.addEventListener('pointerup', (e) => {
      if (isPanning) {
        isPanning = false;
        viewport.style.cursor = spaceHeld ? 'grab' : 'default';
        try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      if (isMarqueeSelecting) {
        isMarqueeSelecting = false;
        if (selectionBoxEl) selectionBoxEl.style.display = 'none';
        try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    });

    viewport.addEventListener('pointercancel', () => {
      isPanning = false;
      isMarqueeSelecting = false;
      if (selectionBoxEl) selectionBoxEl.style.display = 'none';
      viewport.style.cursor = 'default';
    });
  }

  // ── Keyboard Shortcuts ──
  function onKeyDown(e) {
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (isInputFocused) return;

    if (e.code === 'Space' && !e.repeat && document.getElementById('drawio-viewport')) {
      e.preventDefault();
      spaceHeld = true;
      if (viewport && !isPanning) viewport.style.cursor = 'grab';
    }

    // Ctrl+A = Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      store.getSeats(roomId).forEach(s => selectedSeatIds.add(s.id));
      updateSelectionVisuals();
    }

    // Ctrl+D = Duplicate Selected
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      drawioDuplicateSelected(roomId);
    }

    // Delete / Backspace = Delete Selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedSeatIds.size > 0) {
        e.preventDefault();
        drawioDeleteSelected(roomId);
      }
    }

    // Escape = Deselect All
    if (e.key === 'Escape') {
      drawioClearSelection();
    }

    // Arrow keys nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedSeatIds.size > 0) {
      e.preventDefault();
      const step = e.shiftKey ? (snapGridSize || 10) : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;

      selectedSeatIds.forEach(id => {
        if (localPositions[id]) {
          localPositions[id].x = Math.max(0, localPositions[id].x + dx);
          localPositions[id].y = Math.max(0, localPositions[id].y + dy);
          const el = document.getElementById(`drawio-seat-${id}`);
          if (el) {
            el.style.left = `${localPositions[id].x}px`;
            el.style.top = `${localPositions[id].y}px`;
          }
        }
      });
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      spaceHeld = false;
      if (viewport && !isPanning) viewport.style.cursor = 'default';
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Clean up on modal close
  const originalClose = modal.close.bind(modal);
  modal.close = function() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    originalClose();
    modal.close = originalClose;
  };

  // ── Selection Visuals Update ──
  function updateSelectionVisuals() {
    const seatEls = seatsLayer ? seatsLayer.querySelectorAll('.floor-plan-seat') : [];
    seatEls.forEach(el => {
      const id = el.dataset.seatId;
      if (selectedSeatIds.has(id)) {
        el.classList.add('is-selected');
      } else {
        el.classList.remove('is-selected');
      }
    });

    const count = selectedSeatIds.size;
    if (topSelCount) topSelCount.textContent = `${count} selected`;

    if (count > 0) {
      if (selectionHud) selectionHud.style.display = 'flex';
      if (selCountText) selCountText.textContent = `${count} seat${count > 1 ? 's' : ''} selected`;
    } else {
      if (selectionHud) selectionHud.style.display = 'none';
    }
  }

  window.drawioClearSelection = function() {
    selectedSeatIds.clear();
    updateSelectionVisuals();
  };

  // ── Smart Alignment Guides Computation ──
  function showSmartGuides(draggingIds, currentBounds) {
    if (!guidesLayer) return;
    guidesLayer.innerHTML = '';

    const tolerance = 6;
    let guidesHtml = '';

    // Check against all other unselected seats
    const otherSeats = store.getSeats(roomId).filter(s => !draggingIds.has(s.id));
    for (const other of otherSeats) {
      const oPos = localPositions[other.id];
      if (!oPos) continue;

      const oLeft = oPos.x;
      const oCenterX = oPos.x + 31;
      const oRight = oPos.x + 62;
      const oTop = oPos.y;
      const oCenterY = oPos.y + 20;
      const oBottom = oPos.y + 40;

      // X-axis alignments (vertical lines)
      if (Math.abs(currentBounds.x - oLeft) < tolerance) {
        guidesHtml += `<div class="drawio-smart-guide vertical" style="left:${oLeft}px;"></div>`;
      } else if (Math.abs(currentBounds.x + 31 - oCenterX) < tolerance) {
        guidesHtml += `<div class="drawio-smart-guide vertical" style="left:${oCenterX}px;"></div>`;
      }

      // Y-axis alignments (horizontal lines)
      if (Math.abs(currentBounds.y - oTop) < tolerance) {
        guidesHtml += `<div class="drawio-smart-guide horizontal" style="top:${oTop}px;"></div>`;
      } else if (Math.abs(currentBounds.y + 20 - oCenterY) < tolerance) {
        guidesHtml += `<div class="drawio-smart-guide horizontal" style="top:${oCenterY}px;"></div>`;
      }
    }

    guidesLayer.innerHTML = guidesHtml;
  }

  function clearSmartGuides() {
    if (guidesLayer) guidesLayer.innerHTML = '';
  }

  // ── Render Seats on Drawing Sheet ──
  function renderCanvasSeats() {
    if (!seatsLayer) return;
    const currentSeats = store.getSeats(roomId);
    const countEl = document.getElementById('editor-seat-count');
    if (countEl) countEl.textContent = currentSeats.length;

    seatsLayer.innerHTML = currentSeats.map(seat => {
      const pos = localPositions[seat.id] || { x: seat.position?.x || seat.position_x || 50, y: seat.position?.y || seat.position_y || 60 };
      const status = store.getSeatStatus(seat.id);
      const isSelected = selectedSeatIds.has(seat.id);

      return `
        <div class="floor-plan-seat ${status} is-arrange-mode ${isSelected ? 'is-selected' : ''}"
          id="drawio-seat-${seat.id}"
          data-seat-id="${seat.id}"
          style="left:${pos.x}px;top:${pos.y}px;"
        >
          <span class="seat-led"></span>
          <span>${seat.label}</span>
          <button type="button" class="seat-delete-btn"
            title="Delete Seat ${seat.label}"
            onpointerdown="event.stopPropagation();"
            onmousedown="event.stopPropagation();"
            onclick="event.stopPropagation(); event.preventDefault(); window.drawioDeleteSeat('${seat.id}', '${roomId}');"
          >✕</button>
        </div>
      `;
    }).join('');

    attachMultiDragListeners();
    updateSelectionVisuals();
  }

  // ── Group Multi-Drag Listeners ──
  function attachMultiDragListeners() {
    if (!seatsLayer) return;
    const coordHud = document.getElementById('drawio-coord-hud');

    seatsLayer.querySelectorAll('.floor-plan-seat').forEach(el => {
      let isDragging = false;
      let startMouseX = 0, startMouseY = 0;
      const initialPositions = {};

      el.onpointerdown = (e) => {
        if (spaceHeld) return;
        if (e.target.closest('.seat-delete-btn')) {
          e.stopPropagation();
          return;
        }
        if (e.button !== 0) return;

        e.stopPropagation();
        const seatId = el.dataset.seatId;

        // Shift or Ctrl click toggles selection
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          if (selectedSeatIds.has(seatId)) {
            selectedSeatIds.delete(seatId);
          } else {
            selectedSeatIds.add(seatId);
          }
          updateSelectionVisuals();
          return;
        }

        // If clicking a seat not in current selection, select only this seat
        if (!selectedSeatIds.has(seatId)) {
          selectedSeatIds.clear();
          selectedSeatIds.add(seatId);
          updateSelectionVisuals();
        }

        // Begin dragging all selected seats
        isDragging = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;

        selectedSeatIds.forEach(id => {
          const seatEl = document.getElementById(`drawio-seat-${id}`);
          if (seatEl) {
            seatEl.classList.add('dragging');
            initialPositions[id] = {
              x: parseFloat(seatEl.style.left) || 0,
              y: parseFloat(seatEl.style.top) || 0
            };
          }
        });

        el.setPointerCapture(e.pointerId);
      };

      el.onpointermove = (e) => {
        if (!isDragging) return;

        // Delta accounting for zoom scale
        let dx = (e.clientX - startMouseX) / (canvasZoom || 1);
        let dy = (e.clientY - startMouseY) / (canvasZoom || 1);

        // Apply grid snap
        if (snapGridSize > 0) {
          dx = Math.round(dx / snapGridSize) * snapGridSize;
          dy = Math.round(dy / snapGridSize) * snapGridSize;
        }

        let primarySeatPos = null;

        selectedSeatIds.forEach(id => {
          const init = initialPositions[id];
          if (!init) return;

          let targetX = Math.max(0, init.x + dx);
          let targetY = Math.max(0, init.y + dy);

          if (snapGridSize > 0) {
            targetX = Math.round(targetX / snapGridSize) * snapGridSize;
            targetY = Math.round(targetY / snapGridSize) * snapGridSize;
          }

          const seatEl = document.getElementById(`drawio-seat-${id}`);
          if (seatEl) {
            seatEl.style.left = `${targetX}px`;
            seatEl.style.top = `${targetY}px`;
          }

          if (localPositions[id]) {
            localPositions[id].x = targetX;
            localPositions[id].y = targetY;
          }

          if (id === el.dataset.seatId) {
            primarySeatPos = { x: targetX, y: targetY };
          }
        });

        // Show smart guide lines
        if (primarySeatPos) {
          showSmartGuides(selectedSeatIds, primarySeatPos);
          if (coordHud) {
            coordHud.textContent = `X: ${primarySeatPos.x}px, Y: ${primarySeatPos.y}px (${selectedSeatIds.size} moving)`;
          }
        }
      };

      el.onpointerup = (e) => {
        if (isDragging) {
          isDragging = false;
          selectedSeatIds.forEach(id => {
            const seatEl = document.getElementById(`drawio-seat-${id}`);
            if (seatEl) seatEl.classList.remove('dragging');
          });
          clearSmartGuides();
          if (coordHud) coordHud.textContent = '';
          try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      el.onpointercancel = () => {
        isDragging = false;
        clearSmartGuides();
        if (coordHud) coordHud.textContent = '';
      };
    });
  }

  // ── Draw.io Alignment & Distribution Operations ──
  window.drawioAlign = function(type) {
    if (selectedSeatIds.size < 2) {
      toast.show('Select at least 2 seats to align', 'info');
      return;
    }

    const selIds = Array.from(selectedSeatIds);
    const xs = selIds.map(id => localPositions[id].x);
    const ys = selIds.map(id => localPositions[id].y);

    if (type === 'left') {
      const minX = Math.min(...xs);
      selIds.forEach(id => { localPositions[id].x = minX; });
    } else if (type === 'right') {
      const maxX = Math.max(...xs);
      selIds.forEach(id => { localPositions[id].x = maxX; });
    } else if (type === 'top') {
      const minY = Math.min(...ys);
      selIds.forEach(id => { localPositions[id].y = minY; });
    } else if (type === 'bottom') {
      const maxY = Math.max(...ys);
      selIds.forEach(id => { localPositions[id].y = maxY; });
    } else if (type === 'centerX') {
      const avgX = snapGridSize > 0
        ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) / snapGridSize) * snapGridSize
        : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
      selIds.forEach(id => { localPositions[id].x = avgX; });
    } else if (type === 'centerY') {
      const avgY = snapGridSize > 0
        ? Math.round((ys.reduce((a, b) => a + b, 0) / ys.length) / snapGridSize) * snapGridSize
        : Math.round(ys.reduce((a, b) => a + b, 0) / ys.length);
      selIds.forEach(id => { localPositions[id].y = avgY; });
    }

    renderCanvasSeats();
    toast.show(`Aligned ${selIds.length} seats (${type})`, 'success');
  };

  window.drawioDistribute = function(axis) {
    if (selectedSeatIds.size < 3) {
      toast.show('Select at least 3 seats to distribute evenly', 'info');
      return;
    }

    const selIds = Array.from(selectedSeatIds);

    if (axis === 'horizontal') {
      // Sort by X coordinate
      selIds.sort((a, b) => localPositions[a].x - localPositions[b].x);
      const minX = localPositions[selIds[0]].x;
      const maxX = localPositions[selIds[selIds.length - 1]].x;
      const step = (maxX - minX) / (selIds.length - 1);

      selIds.forEach((id, index) => {
        let posX = minX + index * step;
        if (snapGridSize > 0) posX = Math.round(posX / snapGridSize) * snapGridSize;
        localPositions[id].x = Math.round(posX);
      });
    } else if (axis === 'vertical') {
      // Sort by Y coordinate
      selIds.sort((a, b) => localPositions[a].y - localPositions[b].y);
      const minY = localPositions[selIds[0]].y;
      const maxY = localPositions[selIds[selIds.length - 1]].y;
      const step = (maxY - minY) / (selIds.length - 1);

      selIds.forEach((id, index) => {
        let posY = minY + index * step;
        if (snapGridSize > 0) posY = Math.round(posY / snapGridSize) * snapGridSize;
        localPositions[id].y = Math.round(posY);
      });
    }

    renderCanvasSeats();
    toast.show(`Distributed ${selIds.length} seats ${axis}ly`, 'success');
  };

  // ── Add Single Seat (with custom numbering & duplicate check) ──
  window.drawioAddSingleSeat = async function(rId) {
    const currentSeats = store.getSeats(rId);

    // Compute next suggested integer
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });
    const suggestedNum = maxNum + 1;

    const input = prompt(
      `Enter seat number/label:\n(Existing: ${currentSeats.map(s => s.label).join(', ') || 'none'})`,
      String(suggestedNum)
    );
    if (input === null) return;
    const seatLabel = input.trim();
    if (!seatLabel) { toast.show('Seat label cannot be empty', 'error'); return; }

    // Duplicate check
    const duplicate = currentSeats.find(s => s.label === seatLabel || s.number === seatLabel);
    if (duplicate) {
      toast.show(`Seat "${seatLabel}" already exists! Choose a unique number.`, 'error');
      return;
    }

    // Find clean non-overlapping coordinate
    const seatWidth = 62, seatHeight = 40;
    const stepX = 76, stepY = 54;
    const existingPositions = Object.values(localPositions);

    function isOccupied(x, y) {
      return existingPositions.some(p => Math.abs(p.x - x) < (seatWidth + 6) && Math.abs(p.y - y) < (seatHeight + 6));
    }

    let freeSpot = null;
    for (let y = 60; y <= 2200 && !freeSpot; y += stepY) {
      for (let x = 60; x <= 3000; x += stepX) {
        if (!isOccupied(x, y)) { freeSpot = { x, y }; break; }
      }
    }
    if (!freeSpot) freeSpot = { x: 60 + ((currentSeats.length * 30) % 700), y: 60 };

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
      selectedSeatIds.clear();
      selectedSeatIds.add(newSeat.id);
      renderCanvasSeats();
      toast.show(`Seat "${seatLabel}" created!`, 'success');
    } catch (e) {
      console.error('Add seat error:', e);
      toast.show('Failed to add seat: ' + e.message, 'error');
    }
  };

  // ── Quick Row Generator (Draw.io stencil pattern) ──
  window.drawioAddSeatRow = async function(rId) {
    const countInput = prompt('How many seats to add in this row?', '5');
    if (!countInput) return;
    const count = parseInt(countInput.trim(), 10);
    if (isNaN(count) || count <= 0 || count > 50) {
      toast.show('Please enter a valid count between 1 and 50', 'error');
      return;
    }

    const currentSeats = store.getSeats(rId);
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });

    const startNumInput = prompt('Starting seat number:', String(maxNum + 1));
    if (!startNumInput) return;
    const startNum = parseInt(startNumInput.trim(), 10) || 1;

    // Find starting Y row
    let startY = 60;
    const existingYs = Object.values(localPositions).map(p => p.y);
    if (existingYs.length > 0) {
      startY = Math.max(...existingYs) + 54;
    }

    let addedCount = 0;
    const newIds = [];

    for (let i = 0; i < count; i++) {
      const label = String(startNum + i);
      const posX = 60 + i * 76;
      const posY = startY;

      // Duplicate check
      if (currentSeats.some(s => s.label === label || s.number === label)) {
        continue;
      }

      try {
        const newSeat = await store.addSeat({
          roomId: rId,
          branchId: store.getActiveBranchId(),
          label,
          number: label,
          status: 'available',
          position: { x: posX, y: posY },
          position_x: posX,
          position_y: posY
        });
        localPositions[newSeat.id] = { x: posX, y: posY };
        newIds.push(newSeat.id);
        addedCount++;
      } catch (err) {
        console.error('Error in batch add:', err);
      }
    }

    selectedSeatIds.clear();
    newIds.forEach(id => selectedSeatIds.add(id));
    renderCanvasSeats();
    toast.show(`Added row of ${addedCount} seats!`, 'success');
  };

  // ── Duplicate Selected Seats (Ctrl+D) ──
  window.drawioDuplicateSelected = async function(rId) {
    if (selectedSeatIds.size === 0) {
      toast.show('Select seat(s) to duplicate', 'info');
      return;
    }

    const currentSeats = store.getSeats(rId);
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });

    const newSelected = new Set();
    const selArray = Array.from(selectedSeatIds);

    for (let i = 0; i < selArray.length; i++) {
      const srcId = selArray[i];
      const origPos = localPositions[srcId] || { x: 50, y: 50 };
      const nextNum = maxNum + 1 + i;
      const newPos = { x: origPos.x + 30, y: origPos.y + 30 };

      try {
        const newSeat = await store.addSeat({
          roomId: rId,
          branchId: store.getActiveBranchId(),
          label: String(nextNum),
          number: String(nextNum),
          status: 'available',
          position: newPos,
          position_x: newPos.x,
          position_y: newPos.y
        });
        localPositions[newSeat.id] = newPos;
        newSelected.add(newSeat.id);
      } catch (err) {
        console.error('Duplicate error:', err);
      }
    }

    selectedSeatIds.clear();
    newSelected.forEach(id => selectedSeatIds.add(id));
    renderCanvasSeats();
    toast.show(`Duplicated ${newSelected.size} seats!`, 'success');
  };

  // ── Delete Seat Operations ──
  window.drawioDeleteSeat = async function(seatId, rId) {
    const seat = store.getSeat(seatId);
    const label = seat?.label || seat?.number || seatId;
    if (!confirm(`Delete seat "${label}"?`)) return;

    try {
      await store.deleteSeat(seatId);
      delete localPositions[seatId];
      selectedSeatIds.delete(seatId);
      renderCanvasSeats();
      toast.show(`Seat "${label}" deleted`, 'success');
    } catch (e) {
      toast.show('Failed to delete seat: ' + e.message, 'error');
    }
  };

  window.drawioDeleteSelected = async function(rId) {
    if (selectedSeatIds.size === 0) return;
    const count = selectedSeatIds.size;
    if (!confirm(`Delete all ${count} selected seats?`)) return;

    const ids = Array.from(selectedSeatIds);
    let deleted = 0;

    for (const id of ids) {
      try {
        await store.deleteSeat(id);
        delete localPositions[id];
        selectedSeatIds.delete(id);
        deleted++;
      } catch (e) {
        console.error('Delete error for', id, e);
      }
    }

    renderCanvasSeats();
    toast.show(`Deleted ${deleted} seats`, 'success');
  };

  // ── Save Layout & Lock Coordinates ──
  window.drawioSaveLayout = async function(rId) {
    const saveBtn = document.getElementById('drawio-save-btn');
    if (saveBtn) saveBtn.textContent = 'Saving...';

    const updates = Object.entries(localPositions).map(([id, pos]) => ({
      id, x: pos.x, y: pos.y
    }));

    try {
      await store.batchUpdateSeatPositions(updates);
      toast.show('🎉 Seat layout saved and locked successfully!', 'success');
      modal.close();
      app._navigate();
    } catch (e) {
      toast.show('Failed to save layout: ' + e.message, 'error');
      if (saveBtn) saveBtn.textContent = 'Save & Lock';
    }
  };

  // ── Initial Setup & Draw ──
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
