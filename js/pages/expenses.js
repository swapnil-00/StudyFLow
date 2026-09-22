// Expenses Page
export function renderExpenses(container) {
  const branchId = store.getActiveBranchId();
  const expenses = store.getExpenses(branchId).sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Expenses</h1>
          <p class="page-subtitle">Track and manage operational expenses</p>
        </div>
        <button class="btn btn-primary" onclick="openAddExpenseModal()">
          ${icons.plus} Add Expense
        </button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">This Month</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${utils.formatINR(getMonthExpenses(expenses))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Records</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${expenses.length}</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Expenses</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th></tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(e.date)}</td>
                <td><span class="badge badge-neutral">${e.category}</span></td>
                <td style="color:var(--color-text-secondary);">${e.description || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(e.amount)}</td>
                <td style="color:var(--color-text-secondary);">${e.method || '—'}</td>
              </tr>
            `).join('') || `
              <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['trending-down']}</div>
                <div class="empty-title">No expenses recorded</div>
                <button class="btn btn-primary" onclick="openAddExpenseModal()">Add First Expense</button>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddExpenseModal = function() {
    modal.open('Add Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Category <span class="required">*</span></label>
          <select class="select" id="exp-category">
            <option>Rent</option><option>Electricity</option><option>Internet</option>
            <option>Staff Salary</option><option>Maintenance</option><option>Cleaning</option>
            <option>Furniture</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="exp-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="required">*</span></label>
          <input type="date" class="input" id="exp-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select class="select" id="exp-method">
            <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="exp-desc" rows="2" placeholder="Description..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddExpense('${branchId}')">Save Expense</button>
    `);
  };

  window.confirmAddExpense = function(branchId) {
    const category = document.getElementById('exp-category')?.value;
    const amount = parseFloat(document.getElementById('exp-amount')?.value);
    const date = document.getElementById('exp-date')?.value;
    const method = document.getElementById('exp-method')?.value;
    const description = document.getElementById('exp-desc')?.value?.trim();

    if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }
    if (!date) { toast.show('Please select a date', 'error'); return; }

    store.addExpense({ branchId, category, amount, date, method, description });
    modal.close();
    toast.show('Expense recorded!', 'success');
    app._navigate();
  };
}

function getMonthExpenses(expenses) {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
}
