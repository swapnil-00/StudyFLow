// Memberships Page
export function renderMemberships(container) {
  const branchId = store.getActiveBranchId();
  const plans = store.getMembershipPlans(branchId);
  const activeMemberships = store.getStudents(branchId).map(s => {
    const m = store.getActiveMembership(s.id);
    return m ? { ...m, student: s } : null;
  }).filter(Boolean);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Memberships</h1>
          <p class="page-subtitle">Manage plans and active memberships</p>
        </div>
        <button class="btn btn-primary" onclick="openAddPlanModal()">
          ${icons.plus} New Plan
        </button>
      </div>
    </div>

    <!-- Membership Plans -->
    <div style="margin-bottom:var(--space-6);">
      <div class="card-title" style="margin-bottom:var(--space-4);">Membership Plans</div>
      <div class="grid-5">
        ${plans.map(plan => renderPlanCard(plan)).join('')}
        <div style="border:2px dashed var(--color-border-primary);border-radius:var(--radius-xl);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-8);gap:var(--space-2);cursor:pointer;" onclick="openAddPlanModal()">
          <div style="color:var(--color-icon-tertiary);">${icons.plus}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Custom Plan</div>
        </div>
      </div>
    </div>

    <!-- Active Memberships Table -->
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Active Memberships</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${activeMemberships.length} total</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Plan</th><th>Start</th><th>Expiry</th><th>Days Left</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${activeMemberships.map(m => {
              const daysLeft = utils.daysUntil(m.endDate);
              const payStatus = store.getPaymentStatus(m.id);
              return `
                <tr onclick="app.navigate('/student', {id:'${m.studentId}'})">
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${m.student?.avatar};">${utils.initials(m.student?.name || '')}</div>
                      <div class="student-name">${m.student?.name}</div>
                    </div>
                  </td>
                  <td style="color:var(--color-text-secondary);">${m.planName || '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(m.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:${daysLeft <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-secondary)'};">${utils.formatDate(m.endDate, {day:'numeric',month:'short'})}</td>
                  <td>
                    <span class="${daysLeft <= 3 ? 'badge badge-error' : daysLeft <= 7 ? 'badge badge-warning' : 'badge badge-neutral'}">
                      ${daysLeft !== null ? (daysLeft > 0 ? daysLeft + 'd' : 'Expired') : '—'}
                    </span>
                  </td>
                  <td>${paymentStatusBadge(payStatus)}</td>
                  <td>${membershipStatusBadge(m.endDate, m.status)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" style="color:var(--sf-error-600);padding:4px 8px;" title="Delete Membership" onclick="event.stopPropagation(); deleteMembershipAction('${m.id}', '${(m.student?.name || '').replace(/'/g, "\\'")}')">
                      ${icons.trash} Delete
                    </button>
                  </td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['credit-card']}</div>
                <div class="empty-title">No active memberships</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddPlanModal = function() {
    modal.open('Create Membership Plan', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Plan Name <span class="required">*</span></label>
          <input type="text" class="input" id="plan-name" placeholder="Monthly Premium">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Duration (days) <span class="required">*</span></label>
            <input type="number" class="input" id="plan-duration" placeholder="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Price (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="plan-price" min="0"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Access Hours</label>
          <input type="text" class="input" id="plan-hours" placeholder="06:00 – 23:00">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="plan-desc" rows="2" placeholder="Describe this plan..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddPlan()">Create Plan</button>
    `);
  };

  window.confirmAddPlan = async function() {
    const name = document.getElementById('plan-name')?.value?.trim();
    const duration = parseInt(document.getElementById('plan-duration')?.value);
    const price = parseFloat(document.getElementById('plan-price')?.value);
    const hours = document.getElementById('plan-hours')?.value?.trim();
    const desc = document.getElementById('plan-desc')?.value?.trim();

    if (!name) { toast.show('Plan name is required', 'error'); return; }
    if (!duration || duration < 1) { toast.show('Please enter a valid duration', 'error'); return; }
    if (!price || price < 0) { toast.show('Please enter a valid price', 'error'); return; }

    try {
      await store.addMembershipPlan({ name, duration, durationUnit: 'days', price, accessHours: hours, description: desc });
      modal.close();
      toast.show('Membership plan created!', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to create plan', 'error');
    }
  };

  window.deleteMembershipAction = async function(membershipId, studentName) {
    const confirmed = await modal.confirm({
      title: 'Delete Membership',
      message: `Are you sure you want to delete the membership for ${studentName || 'this student'}? This will also release any assigned seat.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await store.deleteMembership(membershipId);
      toast.show('Membership deleted successfully', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to delete membership', 'error');
    }
  };

  window.deletePlanAction = async function(planId, planName) {
    const confirmed = await modal.confirm({
      title: 'Delete Plan',
      message: `Are you sure you want to delete the plan "${planName}"?`,
      confirmText: 'Delete Plan',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await store.deleteMembershipPlan(planId);
      toast.show('Membership plan deleted successfully', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message || 'Failed to delete plan', 'error');
    }
  };
}

function renderPlanCard(plan) {
  const studentCount = (store.db.memberships || []).filter(m => m.planId === plan.id && m.status === 'active').length;
  return `
    <div class="card" style="position:relative;text-align:center;padding:var(--space-5);transition:all var(--transition-fast);"
      onmouseenter="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
      onmouseleave="this.style.boxShadow='';this.style.transform=''"
    >
      <button class="btn btn-ghost btn-sm" style="position:absolute;top:8px;right:8px;padding:4px;color:var(--color-text-tertiary);border-radius:var(--radius-full);"
        title="Delete Plan"
        onclick="event.stopPropagation(); deletePlanAction('${plan.id}', '${(plan.name || '').replace(/'/g, "\\'")}')"
        onmouseenter="this.style.color='var(--sf-error-600)'"
        onmouseleave="this.style.color='var(--color-text-tertiary)'"
      >
        ${icons.trash}
      </button>
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2);">${plan.duration} DAYS</div>
      <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-bottom:var(--space-2);">${plan.name}</div>
      <div style="font-size:var(--text-2xl);font-weight:var(--fw-bold);color:var(--sf-indigo-600);margin-bottom:var(--space-3);">${utils.formatINR(plan.price)}</div>
      ${plan.accessHours ? `<div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">${plan.accessHours}</div>` : ''}
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${studentCount} active</div>
    </div>
  `;
}
