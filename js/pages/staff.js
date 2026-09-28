// Staff Page
export function renderStaff(container) {
  const branchId = store.getActiveBranchId();
  const staff = store.getStaff(branchId);

  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Staff</h1>
          <p class="page-subtitle">Manage staff members and roles</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" onclick="openInviteStaffModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Invite Staff (Login Access)
          </button>
          <button class="btn btn-primary" onclick="openAddStaffModal()">
            ${icons['user-plus']} Add Staff
          </button>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Staff Member</th><th>Role</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${staff.map(s => `
              <tr>
                <td>
                  <div class="student-cell">
                    <div class="avatar" style="background:${utils.getAvatarColor(s.name)};">${utils.initials(s.name)}</div>
                    <div>
                      <div class="student-name">${esc(s.name)}</div>
                      <div class="student-id">${esc(s.id)}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-indigo">${esc(s.role)}</span></td>
                <td style="color:var(--color-text-secondary);">${esc(s.phone || '—')}</td>
                <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${esc(s.email || '—')}</td>
                <td><span class="badge badge-success"><span class="badge-dot"></span>Active</span></td>
                <td>
                  <button class="btn btn-ghost btn-sm" style="color:var(--sf-error-600);padding:4px 8px;" title="Delete Staff" onclick="deleteStaffAction(this.dataset.id, this.dataset.name)" data-id="${escAttr(s.id)}" data-name="${escAttr(s.name)}">
                    ${icons.trash} Delete
                  </button>
                </td>
              </tr>
            `).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
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

  window.confirmAddStaff = async function(branchId) {
    const name = document.getElementById('staff-name')?.value?.trim();
    const role = document.getElementById('staff-role')?.value;
    const phone = document.getElementById('staff-phone')?.value?.trim();
    const email = document.getElementById('staff-email')?.value?.trim();
    if (!name) { toast.show('Name is required', 'error'); return; }
    try {
      await store.addStaff({ name, role, phone, email, branchId });
      modal.close();
      toast.show('Staff member added!', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to add staff', 'error');
    }
  };

  window.deleteStaffAction = async function(staffId, staffName) {
    const confirmed = await modal.confirm({
      title: 'Delete Staff Member',
      message: `Are you sure you want to remove ${staffName || 'this staff member'}?`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await store.deleteStaff(staffId);
      toast.show('Staff member removed successfully', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to remove staff', 'error');
    }
  };

  window.openInviteStaffModal = function() {
    const branches = store.getBranches();
    const branchCheckboxes = branches.map(b => `
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
        <input type="checkbox" class="invite-branch-check" value="${escAttr(b.id)}" checked />
        <span>${esc(b.name)}</span>
      </label>
    `).join('');

    modal.open('Invite Staff Member to Library', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0;">
          Staff will receive a secure 72-hour invite link to sign in with Google or Phone and access assigned branches.
        </p>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="input" id="invite-email" placeholder="staff@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Phone (+91)</label>
            <input type="tel" class="input" id="invite-phone" placeholder="9876543210" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Access Role</label>
          <select class="select" id="invite-role">
            <option value="staff">Staff (Operational Branch Access)</option>
            <option value="manager">Manager (Branch & Financial Operations)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Assigned Branches</label>
          <div style="display:flex;flex-direction:column;gap:8px;padding:10px;background:var(--color-bg-secondary);border-radius:8px;border:1px solid var(--color-border);">
            ${branchCheckboxes || '<span style="font-size:12px;color:var(--color-text-tertiary);">No branches available</span>'}
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmInviteStaff()">Create Invite Link</button>
    `);
  };

  window.confirmInviteStaff = async function() {
    const email = document.getElementById('invite-email')?.value?.trim();
    const phone = document.getElementById('invite-phone')?.value?.trim();
    const role = document.getElementById('invite-role')?.value || 'staff';
    const branchCheckboxes = document.querySelectorAll('.invite-branch-check:checked');
    const branchIds = Array.from(branchCheckboxes).map(cb => cb.value);

    if (!email && !phone) {
      toast.show('Please provide an email address or mobile number for the invite', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'invitations',
          email: email || undefined,
          phone: phone ? `+91${phone.replace(/\D/g, '').slice(-10)}` : undefined,
          role,
          branchIds
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to create invite');

      modal.close();
      const fullLink = `${window.location.origin}${json.inviteLink}`;
      modal.open('Staff Invitation Created', `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <p style="font-size:13px;color:var(--color-text-secondary);margin:0;">
            Share this link with your staff member. It expires in 72 hours.
          </p>
          <div style="display:flex;gap:8px;">
            <input type="text" class="input" value="${escAttr(fullLink)}" id="invite-link-copy" readonly style="font-size:12px;" />
            <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${escAttr(fullLink)}'); toast.show('Invite link copied!', 'success');">Copy</button>
          </div>
        </div>
      `, `<button class="btn btn-secondary" onclick="modal.close()">Done</button>`);
    } catch (e) {
      toast.show(e.message || 'Failed to create invite', 'error');
    }
  };
}
