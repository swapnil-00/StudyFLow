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

// ── Genuine Draw.io Full Drawing Sheet Layout Editor ──────────────────
window.openSeatLayoutEditor = function(roomId) {
  const room = store.getRoom(roomId);
  if (!room) { toast.show('Room not found', 'error'); return; }
  const floor = store.getFloor(room.floorId);
  const seats = store.getSeats(roomId);

  // Generate mxGraph XML for Draw.io
  function generateDrawioXml(currentSeats) {
    const seatCells = currentSeats.map(s => {
      const x = Math.max(40, s.position?.x || s.position_x || 60);
      const y = Math.max(40, s.position?.y || s.position_y || 60);
      const status = store.getSeatStatus(s.id);

      // Status color styles matching StudyFlow palette
      let style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#14532d;strokeColor=#22c55e;fontColor=#ffffff;fontSize=13;fontStyle=1;shadow=1;";
      if (status === 'occupied') {
        style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#1e1b4b;strokeColor=#6366f1;fontColor=#ffffff;fontSize=13;fontStyle=1;shadow=1;";
      } else if (status === 'reserved') {
        style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#431407;strokeColor=#f97316;fontColor=#ffffff;fontSize=13;fontStyle=1;shadow=1;";
      } else if (status === 'payment-due') {
        style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#450a0a;strokeColor=#ef4444;fontColor=#ffffff;fontSize=13;fontStyle=1;shadow=1;";
      } else if (status === 'expiring') {
        style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#422006;strokeColor=#eab308;fontColor=#ffffff;fontSize=13;fontStyle=1;shadow=1;";
      } else if (status === 'maintenance' || status === 'blocked') {
        style = "rounded=1;whiteSpace=wrap;html=1;arcSize=16;strokeWidth=2;fillColor=#1f2937;strokeColor=#64748b;fontColor=#94a3b8;fontSize=13;fontStyle=1;";
      }

      return `<mxCell id="seat_${s.id}" value="${s.label}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="62" height="40" as="geometry"/>
      </mxCell>`;
    }).join('\n    ');

    return `<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="0" arrows="0" fold="1" page="1" pageScale="1" pageWidth="2400" pageHeight="1600" background="#121417">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="room_boundary" value="📍 ${room.name} · ${floor?.name || 'Floor Plan'} Boundary" style="rounded=1;whiteSpace=wrap;html=1;arcSize=2;fillColor=#181a1d;strokeColor=#36393f;strokeWidth=2;fontColor=#72767d;fontSize=14;fontStyle=1;align=left;verticalAlign=top;spacingLeft=18;spacingTop=14;dashed=1;" vertex="1" parent="1">
      <mxGeometry x="20" y="20" width="2300" height="1500" as="geometry"/>
    </mxCell>
    ${seatCells}
  </root>
</mxGraphModel>`;
  }

  const initialXml = generateDrawioXml(seats);

  const editorHtml = `
    <div style="display:flex;flex-direction:column;flex:1;height:100%;overflow:hidden;background:#181a1b;">
      <!-- Top Control Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#202225;border-bottom:1px solid #36393f;gap:10px;flex-wrap:wrap;z-index:10;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div>
            <div style="font-size:14px;font-weight:700;color:#ffffff;display:flex;align-items:center;gap:6px;">
              <span>📐 ${room.name}</span>
              <span style="font-size:11px;font-weight:normal;color:#8e9297;">(${floor?.name || ''})</span>
            </div>
            <div style="font-size:11px;color:#8e9297;">
              <span id="drawio-seat-count">${seats.length}</span> seats loaded · Full Draw.io Sheet Engine Active
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="drawioAddSeatViaPrompt('${roomId}')" title="Add New Seat into Draw.io">
            + Add Seat
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="drawioAddRowViaPrompt('${roomId}')" title="Add Row of Seats into Draw.io">
            + Add Row
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="drawio-save-button" onclick="drawioTriggerSave('${roomId}')" style="background:#007acc;border-color:#0098ff;">
            ${icons.checkCircle || '✓'} Save & Lock Layout
          </button>
        </div>
      </div>

      <!-- Hint bar -->
      <div style="background:#181a1d;padding:4px 14px;border-bottom:1px solid #282b30;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#8e9297;flex-shrink:0;">
        <span>🎨 <b>Draw.io Sheet</b>: Full Zoom, Pan, Multi-select, Align, Distribute, Duplicate (Ctrl+D), Snap to Grid & Stencils enabled.</span>
        <span style="color:#00ffff;font-weight:600;">Click "Save & Lock Layout" when done</span>
      </div>

      <!-- Embedded Draw.io Iframe -->
      <div style="flex:1;position:relative;overflow:hidden;background:#1e2022;">
        <iframe id="drawio-frame"
          src="drawio/index.html?embed=1&ui=atlas&spin=1&proto=json&configure=1&noExitBtn=1&saveAndExit=0"
          style="width:100%;height:100%;border:none;display:block;"
          allow="fullscreen"
        ></iframe>
      </div>
    </div>
  `;

  modal.open(`Draw.io Sheet Layout Designer — ${room.name}`, editorHtml, `
    <button class="btn btn-secondary" onclick="modal.close()">Close</button>
    <button class="btn btn-primary" onclick="drawioTriggerSave('${roomId}')">
      ${icons.checkCircle || '✓'} Save & Finish
    </button>
  `, { size: 'full' });

  // Add resizable class if available
  const modalDialog = document.getElementById('modal-dialog');
  if (modalDialog) modalDialog.classList.add('is-resizable');

  const iframe = document.getElementById('drawio-frame');

  // Fallback to online embed.diagrams.net if local drawio isn't hosted
  let loaded = false;
  const loadTimeout = setTimeout(() => {
    if (!loaded && iframe) {
      console.log('Falling back to embed.diagrams.net CDN...');
      iframe.src = `https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&configure=1&noExitBtn=1&saveAndExit=0`;
    }
  }, 3000);

  // ── Draw.io postMessage Protocol Listener ──
  async function onDrawioMessage(evt) {
    if (!evt.data || typeof evt.data !== 'string') return;

    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch (_) {
      return;
    }

    if (!msg.event && !msg.action) return;

    // 1. Draw.io Init event -> Load diagram XML
    if (msg.event === 'init') {
      loaded = true;
      clearTimeout(loadTimeout);
      iframe.contentWindow.postMessage(JSON.stringify({
        action: 'load',
        autosave: 1,
        xml: initialXml,
        title: `${room.name} - Seat Layout`
      }), '*');
    }

    // 2. Draw.io Configure event -> Setup dark theme and default grid
    else if (msg.event === 'configure') {
      iframe.contentWindow.postMessage(JSON.stringify({
        action: 'configure',
        config: {
          defaultGridEnabled: true,
          defaultGridColor: '#36393f',
          defaultPageVisible: true,
          defaultPageBackgroundColor: '#121417',
          dark: true
        }
      }), '*');
    }

    // 3. Draw.io Export / Save event -> Parse XML and save coordinates to store
    else if (msg.event === 'export' || msg.event === 'save') {
      const xmlString = msg.data || msg.xml;
      if (!xmlString) return;

      const saveBtn = document.getElementById('drawio-save-button');
      if (saveBtn) saveBtn.textContent = 'Saving...';

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const cells = xmlDoc.querySelectorAll('mxCell');

        const currentSeats = store.getSeats(roomId);
        const seatMapById = new Map(currentSeats.map(s => [s.id, s]));
        const seatMapByLabel = new Map(currentSeats.map(s => [s.label, s]));

        const updates = [];
        const addedSeats = [];

        cells.forEach(cell => {
          const rawId = cell.getAttribute('id') || '';
          if (!rawId || rawId === '0' || rawId === '1' || rawId === 'room_boundary') return;

          const geo = cell.querySelector('mxGeometry');
          if (!geo) return;

          const x = Math.round(parseFloat(geo.getAttribute('x') || 40));
          const y = Math.round(parseFloat(geo.getAttribute('y') || 40));
          const label = (cell.getAttribute('value') || '').trim();

          const realId = rawId.startsWith('seat_') ? rawId.replace('seat_', '') : rawId;

          if (seatMapById.has(realId)) {
            updates.push({ id: realId, x, y });
          } else if (label && seatMapByLabel.has(label)) {
            const existingSeat = seatMapByLabel.get(label);
            updates.push({ id: existingSeat.id, x, y });
          } else if (label) {
            // User created a new seat inside Draw.io
            addedSeats.push({ label, x, y });
          }
        });

        // 1. Batch update all existing seat coordinates
        if (updates.length > 0) {
          await store.batchUpdateSeatPositions(updates);
        }

        // 2. Add any newly drawn seats
        for (const newS of addedSeats) {
          try {
            await store.addSeat({
              roomId,
              branchId: store.getActiveBranchId(),
              label: newS.label,
              number: newS.label,
              status: 'available',
              position: { x: newS.x, y: newS.y },
              position_x: newS.x,
              position_y: newS.y
            });
          } catch (err) {
            console.error('Add seat from draw.io error:', err);
          }
        }

        toast.show(`🎉 Layout saved! Updated ${updates.length} seats.`, 'success');
        modal.close();
        app._navigate();
      } catch (err) {
        console.error('Save Draw.io layout error:', err);
        toast.show('Failed to save layout: ' + err.message, 'error');
        if (saveBtn) saveBtn.textContent = 'Save & Lock Layout';
      }
    }
  }

  window.addEventListener('message', onDrawioMessage);

  // Clean up listener on modal close
  const originalClose = modal.close.bind(modal);
  modal.close = function() {
    clearTimeout(loadTimeout);
    window.removeEventListener('message', onDrawioMessage);
    originalClose();
    modal.close = originalClose;
  };

  // Trigger Save
  window.drawioTriggerSave = function() {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ action: 'export', format: 'xml' }), '*');
  };

  // Add Seat helper
  window.drawioAddSeatViaPrompt = async function(rId) {
    const currentSeats = store.getSeats(rId);
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });

    const input = prompt('Enter new seat label/number:', String(maxNum + 1));
    if (!input) return;
    const label = input.trim();
    if (!label) return;

    if (currentSeats.some(s => s.label === label || s.number === label)) {
      toast.show(`Seat "${label}" already exists!`, 'error');
      return;
    }

    try {
      const newSeat = await store.addSeat({
        roomId: rId,
        branchId: store.getActiveBranchId(),
        label,
        number: label,
        status: 'available',
        position: { x: 80, y: 80 },
        position_x: 80,
        position_y: 80
      });

      // Reload XML in Draw.io
      const updatedSeats = store.getSeats(rId);
      const newXml = generateDrawioXml(updatedSeats);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ action: 'load', autosave: 1, xml: newXml }), '*');
      }
      const countEl = document.getElementById('drawio-seat-count');
      if (countEl) countEl.textContent = updatedSeats.length;
      toast.show(`Seat "${label}" added to sheet!`, 'success');
    } catch (e) {
      toast.show('Failed to add seat: ' + e.message, 'error');
    }
  };

  // Add Row helper
  window.drawioAddRowViaPrompt = async function(rId) {
    const countInput = prompt('How many seats in this row?', '5');
    if (!countInput) return;
    const count = parseInt(countInput.trim(), 10);
    if (isNaN(count) || count <= 0) return;

    const currentSeats = store.getSeats(rId);
    let maxNum = 0;
    currentSeats.forEach(s => {
      const parsed = parseInt(s.label || s.number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });

    const startNumInput = prompt('Starting seat number:', String(maxNum + 1));
    if (!startNumInput) return;
    const startNum = parseInt(startNumInput.trim(), 10) || 1;

    for (let i = 0; i < count; i++) {
      const label = String(startNum + i);
      if (currentSeats.some(s => s.label === label || s.number === label)) continue;
      try {
        await store.addSeat({
          roomId: rId,
          branchId: store.getActiveBranchId(),
          label,
          number: label,
          status: 'available',
          position: { x: 80 + i * 76, y: 120 },
          position_x: 80 + i * 76,
          position_y: 120
        });
      } catch (_) {}
    }

    const updatedSeats = store.getSeats(rId);
    const newXml = generateDrawioXml(updatedSeats);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ action: 'load', autosave: 1, xml: newXml }), '*');
    }
    const countEl = document.getElementById('drawio-seat-count');
    if (countEl) countEl.textContent = updatedSeats.length;
    toast.show(`Added row of seats to sheet!`, 'success');
  };
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
