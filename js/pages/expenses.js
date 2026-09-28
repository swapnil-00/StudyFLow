// Expenses Page — Full-featured expense management with Edit, Void, Filters, and CSV Export
export function renderExpenses(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const branchId = store.getActiveBranchId();
  let filterCategory = 'all';
  let filterPeriod = 'this-month';
  let filterSearch = '';

  function getFilteredExpenses() {
    let list = store.getExpenses(branchId, true); // get all including voided for tabling or active by default
    const now = new Date();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7);

    // Period filter
    if (filterPeriod === 'this-month') {
      list = list.filter(e => e.date && e.date.startsWith(currentMonthPrefix));
    } else if (filterPeriod === 'last-month') {
      list = list.filter(e => e.date && e.date.startsWith(lastMonthPrefix));
    }

    // Category filter
    if (filterCategory !== 'all') {
      list = list.filter(e => (e.category || '').toLowerCase() === filterCategory.toLowerCase());
    }

    // Search filter
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.receiptRef || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function renderView() {
    const allActive = store.getExpenses(branchId, false);
    const totalActiveExpenses = allActive.reduce((s, e) => s + e.amount, 0);
    const thisMonthExpenses = allActive
      .filter(e => e.date && e.date.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((s, e) => s + e.amount, 0);

    const filtered = getFilteredExpenses();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Expenses</h1>
            <p class="page-subtitle">Track, audit and manage operational expenses</p>
          </div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-secondary" id="exp-export-btn">
              ${icons.download || icons.fileText} Export CSV
            </button>
            <button class="btn btn-primary" id="exp-add-btn">
              ${icons.plus} Add Expense
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid-3" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">This Month Expenses</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(thisMonthExpenses)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total All-Time (Active)</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);">${utils.formatINR(totalActiveExpenses)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Active Records</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);">${allActive.length}</div>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-3) var(--space-4);">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
            <div class="input-group" style="width:220px;">
              <span class="input-group-prefix">${icons.search}</span>
              <input type="text" class="input" id="exp-search-input" placeholder="Search title, vendor..." value="${escAttr(filterSearch)}">
            </div>
            <select class="select" id="exp-period-select" style="width:140px;">
              <option value="this-month" ${filterPeriod === 'this-month' ? 'selected' : ''}>This Month</option>
              <option value="last-month" ${filterPeriod === 'last-month' ? 'selected' : ''}>Last Month</option>
              <option value="all" ${filterPeriod === 'all' ? 'selected' : ''}>All Time</option>
            </select>
            <select class="select" id="exp-category-select" style="width:150px;">
              <option value="all">All Categories</option>
              <option value="Rent" ${filterCategory === 'Rent' ? 'selected' : ''}>Rent</option>
              <option value="Electricity" ${filterCategory === 'Electricity' ? 'selected' : ''}>Electricity</option>
              <option value="Internet" ${filterCategory === 'Internet' ? 'selected' : ''}>Internet</option>
              <option value="Staff Salary" ${filterCategory === 'Staff Salary' ? 'selected' : ''}>Staff Salary</option>
              <option value="Maintenance" ${filterCategory === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Cleaning" ${filterCategory === 'Cleaning' ? 'selected' : ''}>Cleaning</option>
              <option value="Furniture" ${filterCategory === 'Furniture' ? 'selected' : ''}>Furniture</option>
              <option value="Other" ${filterCategory === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
            Showing <strong>${filtered.length}</strong> items (Total: <strong style="color:var(--sf-error-600);">${utils.formatINR(filtered.filter(e => e.status !== 'voided').reduce((s, e) => s + e.amount, 0))}</strong>)
          </div>
        </div>
      </div>

      <!-- Expenses Table -->
      <div class="table-container">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Title / Description</th>
                <th>Vendor / Ref</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(e => {
                const isVoided = e.status === 'voided';
                return `
                  <tr style="${isVoided ? 'opacity:0.5;background:var(--color-bg-secondary);' : ''}">
                    <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${utils.formatDate(e.date)}</td>
                    <td><span class="badge badge-neutral">${esc(e.category || 'General')}</span></td>
                    <td>
                      <div style="font-weight:var(--fw-medium);${isVoided ? 'text-decoration:line-through;' : ''}">${esc(e.title || e.description || '—')}</div>
                      ${e.notes && e.notes !== e.title ? `<div style="font-size:11px;color:var(--color-text-tertiary);">${esc(e.notes)}</div>` : ''}
                      ${isVoided && e.voidReason ? `<div style="font-size:11px;color:var(--sf-error-600);">Void reason: ${esc(e.voidReason)}</div>` : ''}
                    </td>
                    <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">
                      ${esc(e.vendor || '—')}
                      ${e.receiptRef ? `<div style="font-size:10px;font-family:var(--font-mono);">${esc(e.receiptRef)}</div>` : ''}
                    </td>
                    <td style="font-weight:var(--fw-semibold);color:${isVoided ? 'var(--color-text-tertiary)' : 'var(--sf-error-600)'};">${utils.formatINR(e.amount)}</td>
                    <td style="color:var(--color-text-secondary);text-transform:capitalize;font-size:var(--text-xs);">${esc(e.method || e.paymentMode || 'cash')}</td>
                    <td>
                      <span class="badge ${isVoided ? 'badge-error' : 'badge-success'}" style="font-size:11px;">
                        ${isVoided ? 'VOIDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      ${!isVoided ? `
                        <div style="display:flex;gap:var(--space-1);">
                          <button class="btn btn-ghost btn-sm exp-edit-action" data-eid="${escAttr(e.id)}" title="Edit Expense">
                            ${icons.edit}
                          </button>
                          <button class="btn btn-ghost btn-sm exp-void-action" data-eid="${escAttr(e.id)}" data-title="${escAttr(e.title || '')}" title="Void Expense">
                            ${icons.trash}
                          </button>
                        </div>
                      ` : `
                        <span style="font-size:11px;color:var(--color-text-tertiary);">—</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons['trending-down']}</div>
                  <div class="empty-title">No expenses found</div>
                  <div class="empty-desc">Try changing filters or record a new expense.</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Attach Event Listeners
    document.getElementById('exp-add-btn')?.addEventListener('click', openAddModal);
    document.getElementById('exp-export-btn')?.addEventListener('click', exportExpensesCSV);

    document.getElementById('exp-search-input')?.addEventListener('input', (ev) => {
      filterSearch = ev.target.value.trim();
      renderView();
    });

    document.getElementById('exp-period-select')?.addEventListener('change', (ev) => {
      filterPeriod = ev.target.value;
      renderView();
    });

    document.getElementById('exp-category-select')?.addEventListener('change', (ev) => {
      filterCategory = ev.target.value;
      renderView();
    });

    document.querySelectorAll('.exp-edit-action').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.eid));
    });

    document.querySelectorAll('.exp-void-action').forEach(btn => {
      btn.addEventListener('click', () => openVoidModal(btn.dataset.eid, btn.dataset.title));
    });
  }

  function openAddModal() {
    modal.open('Add Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Expense Title / Description <span class="required">*</span></label>
          <input type="text" class="input" id="exp-title-input" placeholder="e.g. Electricity Bill March, Router Repair">
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Category <span class="required">*</span></label>
            <select class="select" id="exp-category-input">
              <option>Rent</option><option>Electricity</option><option>Internet</option>
              <option>Staff Salary</option><option>Maintenance</option><option>Cleaning</option>
              <option>Furniture</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Amount (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="exp-amount-input" min="1" step="0.01"></div>
          </div>
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Date <span class="required">*</span></label>
            <input type="date" class="input" id="exp-date-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="select" id="exp-method-input">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Vendor / Payee</label>
            <input type="text" class="input" id="exp-vendor-input" placeholder="Optional vendor name">
          </div>
          <div class="form-group">
            <label class="form-label">Bill / Receipt Ref</label>
            <input type="text" class="input" id="exp-ref-input" placeholder="Optional invoice #">
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save Expense</button>
    `);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.close());
    document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
      const title = document.getElementById('exp-title-input')?.value?.trim();
      const category = document.getElementById('exp-category-input')?.value;
      const amount = parseFloat(document.getElementById('exp-amount-input')?.value);
      const date = document.getElementById('exp-date-input')?.value;
      const paymentMode = document.getElementById('exp-method-input')?.value;
      const vendor = document.getElementById('exp-vendor-input')?.value?.trim();
      const receiptRef = document.getElementById('exp-ref-input')?.value?.trim();

      if (!title) { toast.show('Please enter an expense title', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }
      if (!date) { toast.show('Please select a date', 'error'); return; }

      const saveBtn = document.getElementById('modal-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

      try {
        await store.addExpense({
          branchId,
          title,
          category,
          amount,
          date,
          paymentMode,
          vendor,
          receiptRef
        });
        modal.close();
        toast.show('Expense recorded successfully!', 'success');
        renderView();
      } catch (err) {
        toast.show(err.message || 'Failed to save expense', 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Expense'; }
      }
    });
  }

  function openEditModal(expenseId) {
    const expense = store.getExpenses(branchId, true).find(e => e.id === expenseId);
    if (!expense) return;

    modal.open('Edit Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Expense Title / Description <span class="required">*</span></label>
          <input type="text" class="input" id="exp-edit-title" value="${escAttr(expense.title || expense.description || '')}">
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Category <span class="required">*</span></label>
            <select class="select" id="exp-edit-category">
              ${['Rent', 'Electricity', 'Internet', 'Staff Salary', 'Maintenance', 'Cleaning', 'Furniture', 'Other'].map(c => `
                <option value="${escAttr(c)}" ${expense.category === c ? 'selected' : ''}>${esc(c)}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Amount (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="exp-edit-amount" value="${expense.amount}" min="1" step="0.01"></div>
          </div>
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Date <span class="required">*</span></label>
            <input type="date" class="input" id="exp-edit-date" value="${escAttr(expense.date || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="select" id="exp-edit-method">
              ${['cash', 'upi', 'bank_transfer', 'card', 'cheque'].map(m => `
                <option value="${escAttr(m)}" ${(expense.paymentMode || expense.method) === m ? 'selected' : ''}>${esc(m.toUpperCase())}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Vendor / Payee</label>
            <input type="text" class="input" id="exp-edit-vendor" value="${escAttr(expense.vendor || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Bill / Receipt Ref</label>
            <input type="text" class="input" id="exp-edit-ref" value="${escAttr(expense.receiptRef || '')}">
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-update-btn">Update Expense</button>
    `);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.close());
    document.getElementById('modal-update-btn')?.addEventListener('click', async () => {
      const title = document.getElementById('exp-edit-title')?.value?.trim();
      const category = document.getElementById('exp-edit-category')?.value;
      const amount = parseFloat(document.getElementById('exp-edit-amount')?.value);
      const date = document.getElementById('exp-edit-date')?.value;
      const paymentMode = document.getElementById('exp-edit-method')?.value;
      const vendor = document.getElementById('exp-edit-vendor')?.value?.trim();
      const receiptRef = document.getElementById('exp-edit-ref')?.value?.trim();

      if (!title) { toast.show('Title is required', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Valid amount required', 'error'); return; }

      const updateBtn = document.getElementById('modal-update-btn');
      if (updateBtn) { updateBtn.disabled = true; updateBtn.textContent = 'Updating...'; }

      try {
        await store.updateExpense(expenseId, { title, category, amount, date, paymentMode, vendor, receiptRef });
        modal.close();
        toast.show('Expense updated!', 'success');
        renderView();
      } catch (err) {
        toast.show(err.message || 'Update failed', 'error');
        if (updateBtn) { updateBtn.disabled = false; updateBtn.textContent = 'Update Expense'; }
      }
    });
  }

  function openVoidModal(expenseId, title) {
    modal.open('Void Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);">
          Are you sure you want to void this expense: <strong>${esc(title || 'Expense')}</strong>?
          Voided expenses are retained for auditing but excluded from financial totals.
        </p>
        <div class="form-group">
          <label class="form-label">Reason for Voiding <span class="required">*</span></label>
          <input type="text" class="input" id="exp-void-reason" placeholder="e.g. Duplicate entry, Incorrect bill amount">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-error" id="modal-confirm-void-btn">Void Expense</button>
    `);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.close());
    document.getElementById('modal-confirm-void-btn')?.addEventListener('click', async () => {
      const reason = document.getElementById('exp-void-reason')?.value?.trim();
      if (!reason) { toast.show('Please provide a void reason', 'error'); return; }

      const voidBtn = document.getElementById('modal-confirm-void-btn');
      if (voidBtn) { voidBtn.disabled = true; voidBtn.textContent = 'Voiding...'; }

      try {
        await store.voidExpense(expenseId, reason);
        modal.close();
        toast.show('Expense voided successfully', 'success');
        renderView();
      } catch (err) {
        toast.show(err.message || 'Failed to void expense', 'error');
        if (voidBtn) { voidBtn.disabled = false; voidBtn.textContent = 'Void Expense'; }
      }
    });
  }

  function exportExpensesCSV() {
    const list = getFilteredExpenses();
    if (!list.length) { toast.show('No expenses to export', 'info'); return; }

    const headers = ['ID', 'Date', 'Category', 'Title', 'Amount', 'Payment Mode', 'Vendor', 'Receipt Ref', 'Status', 'Void Reason'];
    const rows = list.map(e => [
      e.id,
      e.date,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.title || e.description || '').replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMode || e.method || 'cash',
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
      `"${(e.receiptRef || '').replace(/"/g, '""')}"`,
      e.status || 'active',
      `"${(e.voidReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `studyflow_expenses_${branchId || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Expenses CSV exported!', 'success');
  }

  renderView();
}
