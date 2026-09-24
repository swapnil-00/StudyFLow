// StudyFlow — Full-Window Draw.io Seat Layout Designer Page

export function renderLayoutEditor(container, params = {}) {
  const allRooms = store.getRooms();
  if (allRooms.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-12);">
        <div class="empty-icon">${icons.layers}</div>
        <div class="empty-title">No Rooms Found</div>
        <div class="empty-desc">Please create a floor and a room first before arranging seats.</div>
        <button class="btn btn-primary" onclick="app.navigate('/floors')">Go to Floors</button>
      </div>
    `;
    return;
  }

  let activeRoomId = params.roomId || params.id;
  let room = store.getRoom(activeRoomId);
  if (!room) {
    room = allRooms[0];
    activeRoomId = room.id;
  }

  const floor = store.getFloor(room.floorId);
  const seats = store.getSeats(room.id);

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

  let currentXml = generateDrawioXml(seats);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100vw;height:100vh;overflow:hidden;background:#181a1b;">
      <!-- Top Control Navigation Header -->
      <header style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#202225;border-bottom:1px solid #36393f;gap:12px;flex-wrap:wrap;z-index:20;height:52px;flex-shrink:0;">
        <!-- Left: Back Navigation & Room Selector -->
        <div style="display:flex;align-items:center;gap:12px;">
          <button type="button" class="btn btn-ghost btn-sm" style="color:#dcddde;padding:6px 10px;" onclick="app.navigate('/floors')" title="Back to Floors & Rooms">
            ${icons.arrowLeft || '←'} <span style="font-weight:600;">Back to Floors</span>
          </button>

          <div style="width:1px;height:22px;background:#36393f;"></div>

          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;color:#8e9297;">Room:</span>
            <select id="layout-room-select" onchange="app.navigate('/layout-editor?roomId=' + this.value)" style="background:#2c2f33;color:#ffffff;border:1px solid #4f545c;border-radius:6px;padding:4px 10px;font-size:13px;font-weight:600;outline:none;cursor:pointer;">
              ${allRooms.map(r => {
                const fl = store.getFloor(r.floorId);
                return `<option value="${r.id}" ${r.id === room.id ? 'selected' : ''}>${r.name} (${fl?.name || 'Floor'})</option>`;
              }).join('')}
            </select>
            <span id="full-editor-seat-count" class="badge badge-indigo" style="font-size:11px;">
              ${seats.length} seats
            </span>
          </div>
        </div>

        <!-- Right: Actions (Add Seat, Add Row, Delete Seat, Save) -->
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="drawioPageAddSeat('${room.id}')" title="Add New Seat with Custom Number">
            ${icons.plus || '+'} Add Seat
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="drawioPageAddRow('${room.id}')" title="Add Row of Seats">
            ${icons.plus || '+'} Add Row
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color:#ef4444;" onclick="drawioPageDeleteSeatPrompt('${room.id}')" title="Delete a seat by number">
            ${icons.trash || '🗑️'} Delete Seat
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="full-editor-save-btn" onclick="drawioPageSave('${room.id}')" style="background:#007acc;border-color:#0098ff;padding:6px 14px;font-weight:700;">
            ${icons.checkCircle || '✓'} Save & Lock Layout
          </button>
        </div>
      </header>

      <!-- Draw.io Iframe Canvas (100% Remaining Screen) -->
      <main style="flex:1;position:relative;overflow:hidden;background:#1e2022;">
        <iframe id="drawio-page-frame"
          src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&configure=1&noExitBtn=1&saveAndExit=0"
          style="width:100%;height:100%;border:none;display:block;"
          allow="fullscreen"
        ></iframe>
      </main>
    </div>
  `;

  const iframe = document.getElementById('drawio-page-frame');

  // ── Draw.io postMessage Protocol Listener ──
  async function onDrawioPageMessage(evt) {
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
      iframe.contentWindow.postMessage(JSON.stringify({
        action: 'load',
        autosave: 1,
        xml: currentXml,
        title: `${room.name} - Full Drawing Sheet`
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

    // 3. Draw.io Export / Save event -> Parse XML, delete removed seats, update moved seats, add new seats
    else if (msg.event === 'export' || msg.event === 'save') {
      const xmlString = msg.data || msg.xml;
      if (!xmlString) return;

      const saveBtn = document.getElementById('full-editor-save-btn');
      if (saveBtn) saveBtn.textContent = 'Saving...';

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const cells = xmlDoc.querySelectorAll('mxCell');

        const currentSeats = store.getSeats(room.id);
        const seatMapById = new Map(currentSeats.map(s => [s.id, s]));
        const seatMapByLabel = new Map(currentSeats.map(s => [s.label, s]));

        const updates = [];
        const addedSeats = [];
        const presentSeatIds = new Set();
        const presentSeatLabels = new Set();

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
            presentSeatIds.add(realId);
            if (label) presentSeatLabels.add(label);
          } else if (label && seatMapByLabel.has(label)) {
            const existingSeat = seatMapByLabel.get(label);
            updates.push({ id: existingSeat.id, x, y });
            presentSeatIds.add(existingSeat.id);
            presentSeatLabels.add(label);
          } else if (label) {
            // User created a new seat inside Draw.io
            addedSeats.push({ label, x, y });
          }
        });

        // 1. Delete seats that were deleted in Draw.io
        const deletedSeats = currentSeats.filter(s => !presentSeatIds.has(s.id) && !presentSeatLabels.has(s.label));
        for (const delSeat of deletedSeats) {
          try {
            await store.deleteSeat(delSeat.id);
          } catch (delErr) {
            console.error('Error deleting seat from database:', delSeat.id, delErr);
          }
        }

        // 2. Batch update all remaining seat coordinates
        if (updates.length > 0) {
          await store.batchUpdateSeatPositions(updates);
        }

        // 3. Add any newly drawn seats
        for (const newS of addedSeats) {
          try {
            await store.addSeat({
              roomId: room.id,
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

        const finalSeats = store.getSeats(room.id);
        const countEl = document.getElementById('full-editor-seat-count');
        if (countEl) countEl.textContent = `${finalSeats.length} seats`;

        let msgText = `🎉 Layout saved!`;
        if (updates.length > 0) msgText += ` Updated ${updates.length} seats.`;
        if (deletedSeats.length > 0) msgText += ` Deleted ${deletedSeats.length} seat${deletedSeats.length > 1 ? 's' : ''}.`;
        if (addedSeats.length > 0) msgText += ` Added ${addedSeats.length} new seat${addedSeats.length > 1 ? 's' : ''}.`;

        toast.show(msgText, 'success');
        if (saveBtn) saveBtn.textContent = '✓ Saved!';
        setTimeout(() => {
          if (saveBtn) saveBtn.textContent = 'Save & Lock Layout';
        }, 2000);
      } catch (err) {
        console.error('Save Draw.io layout error:', err);
        toast.show('Failed to save layout: ' + err.message, 'error');
        if (saveBtn) saveBtn.textContent = 'Save & Lock Layout';
      }
    }
  }

  window.addEventListener('message', onDrawioPageMessage);

  // Trigger Save
  window.drawioPageSave = function(rId) {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ action: 'export', format: 'xml' }), '*');
  };

  // Delete Seat Prompt helper
  window.drawioPageDeleteSeatPrompt = async function(rId) {
    const currentSeats = store.getSeats(rId);
    if (currentSeats.length === 0) {
      toast.show('No seats to delete', 'info');
      return;
    }

    const labelInput = prompt(`Enter seat number to delete:\n(Existing: ${currentSeats.map(s => s.label).join(', ')})`);
    if (!labelInput) return;
    const label = labelInput.trim();

    const targetSeat = currentSeats.find(s => s.label === label || s.number === label);
    if (!targetSeat) {
      toast.show(`Seat "${label}" not found`, 'error');
      return;
    }

    const ok = await modal.confirm({
      title: 'Delete Seat',
      message: `Are you sure you want to delete seat "${label}"?`,
      confirmText: 'Delete Seat',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await store.deleteSeat(targetSeat.id);
      const updatedSeats = store.getSeats(rId);
      currentXml = generateDrawioXml(updatedSeats);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ action: 'load', autosave: 1, xml: currentXml }), '*');
      }
      const countEl = document.getElementById('full-editor-seat-count');
      if (countEl) countEl.textContent = `${updatedSeats.length} seats`;
      toast.show(`Seat "${label}" deleted successfully!`, 'success');
    } catch (e) {
      toast.show('Failed to delete seat: ' + e.message, 'error');
    }
  };

  // Add Seat helper
  window.drawioPageAddSeat = async function(rId) {
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
      await store.addSeat({
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
      currentXml = generateDrawioXml(updatedSeats);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ action: 'load', autosave: 1, xml: currentXml }), '*');
      }
      const countEl = document.getElementById('full-editor-seat-count');
      if (countEl) countEl.textContent = `${updatedSeats.length} seats`;
      toast.show(`Seat "${label}" added to sheet!`, 'success');
    } catch (e) {
      toast.show('Failed to add seat: ' + e.message, 'error');
    }
  };

  // Add Row helper
  window.drawioPageAddRow = async function(rId) {
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
    currentXml = generateDrawioXml(updatedSeats);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ action: 'load', autosave: 1, xml: currentXml }), '*');
    }
    const countEl = document.getElementById('full-editor-seat-count');
    if (countEl) countEl.textContent = `${updatedSeats.length} seats`;
    toast.show(`Added row of seats to sheet!`, 'success');
  };
}
