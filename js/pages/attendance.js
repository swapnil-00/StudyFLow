// Attendance Page
export function renderAttendance(container) {
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
