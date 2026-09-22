// Students Page
export function renderStudents(container) {
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
