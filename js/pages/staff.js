// Staff Page
export function renderStaff(container) {
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
