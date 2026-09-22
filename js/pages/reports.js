// Reports Page
export function renderReports(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const revenueChart = store.getRevenueChart(branchId, 30);

  const students = store.getStudents(branchId);
  const payments = students.flatMap(s => store.getPaymentsForStudent(s.id));
  const expenses = store.getExpenses(branchId);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Expense by category
  const expenseByCategory = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">${branch?.name} · Financial & Operations Overview</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="window.print()">
            ${icons.print} Print Report
          </button>
        </div>
      </div>
    </div>

    <!-- P&L Summary -->
    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Revenue (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${utils.formatINR(totalRevenue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card" style="background:${netProfit >= 0 ? 'var(--sf-success-50)' : 'var(--sf-error-50)'};">
        <div class="stat-card-top"><div class="stat-card-label">Net Profit</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:${netProfit >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};">${utils.formatINR(netProfit)}</div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);margin-bottom:var(--space-5);">
      <!-- Revenue Trend -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">30-Day Revenue Trend</div>
        </div>
        <div class="card-body">
          ${renderMiniBarChart(revenueChart)}
        </div>
      </div>

      <!-- Expenses by Category -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Expenses by Category</div>
        </div>
        <div class="card-body">
          ${Object.entries(expenseByCategory).map(([cat, amount]) => {
            const maxAmt = Math.max(...Object.values(expenseByCategory), 1);
            const pct = Math.round((amount / maxAmt) * 100);
            return `
              <div style="margin-bottom:var(--space-3);">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:var(--space-1);">
                  <span style="color:var(--color-text-secondary);">${cat}</span>
                  <span style="font-weight:var(--fw-semibold);">${utils.formatINR(amount)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill indigo" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Occupancy Table -->
    <div class="card">
      <div class="card-header"><div class="card-title">Occupancy Summary by Room</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Room</th><th>Floor</th><th>Type</th><th>Total</th><th>Occupied</th><th>Available</th><th>Occupancy</th></tr>
          </thead>
          <tbody>
            ${store.getRoomsForBranch(branchId).map(room => {
              const seats = store.getSeats(room.id);
              let occ = 0, avail = 0;
              seats.forEach(s => {
                const status = store.getSeatStatus(s.id);
                if (['occupied','payment-due','expiring'].includes(status)) occ++;
                else if (status === 'available') avail++;
              });
              const pct = seats.length > 0 ? Math.round((occ / seats.length) * 100) : 0;
              const floor = store.getFloor(room.floorId);
              return `
                <tr>
                  <td style="font-weight:var(--fw-medium);">${room.name}</td>
                  <td style="color:var(--color-text-secondary);">${floor?.name || '—'}</td>
                  <td><span class="badge badge-neutral">${capitalizeFirst(room.type)}</span></td>
                  <td style="text-align:center;">${seats.length}</td>
                  <td style="text-align:center;color:var(--sf-indigo-600);font-weight:var(--fw-semibold);">${occ}</td>
                  <td style="text-align:center;color:var(--sf-success-600);">${avail}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <div class="progress-bar" style="flex:1;">
                        <div class="progress-fill ${pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'indigo'}" style="width:${pct}%;"></div>
                      </div>
                      <span style="font-size:var(--text-xs);font-weight:var(--fw-semibold);">${pct}%</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMiniBarChart(data) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
        ${data.map((d, i) => {
          const height = max > 0 ? Math.round((d.amount / max) * 100) : 4;
          const isToday = i === data.length - 1;
          return `
            <div style="flex:1;height:${Math.max(height, 4)}%;background:${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'};border-radius:2px 2px 0 0;" title="${d.label}: ${utils.formatINR(d.amount)}"></div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--color-text-quaternary);">
        <span>${data[0]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  `;
}
