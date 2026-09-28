// Reports Page — Branch-scoped, audit-consistent P&L, Dues Aging, Trends, and CSV Export
export function renderReports(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  let selectedPeriod = 'this-month'; // 'today' | 'this-week' | 'this-month' | 'last-month' | 'all'

  function getPeriodData() {
    const allPayments = store.getPayments(null, branchId);
    const allExpenses = store.getExpenses(branchId, false);

    const todayStr = utils.today();
    const [y, m, d] = todayStr.split('-').map(Number);
    const thisMonthPrefix = todayStr.slice(0, 7);

    const lastM = m === 1 ? 12 : m - 1;
    const lastY = m === 1 ? y - 1 : y;
    const lastMonthPrefix = `${lastY}-${String(lastM).padStart(2, '0')}`;

    // Week start (7 days ago) in IST
    const weekAgoStr = utils.addDays(todayStr, -7);

    let payments = allPayments.filter(p => p.status === 'recorded');
    let expenses = allExpenses.filter(e => e.status !== 'voided');

    if (selectedPeriod === 'today') {
      payments = payments.filter(p => p.date === todayStr);
      expenses = expenses.filter(e => e.date === todayStr);
    } else if (selectedPeriod === 'this-week') {
      payments = payments.filter(p => p.date && p.date >= weekAgoStr && p.date <= todayStr);
      expenses = expenses.filter(e => e.date && e.date >= weekAgoStr && e.date <= todayStr);
    } else if (selectedPeriod === 'this-month') {
      payments = payments.filter(p => p.date && p.date.startsWith(thisMonthPrefix));
      expenses = expenses.filter(e => e.date && e.date.startsWith(thisMonthPrefix));
    } else if (selectedPeriod === 'last-month') {
      payments = payments.filter(p => p.date && p.date.startsWith(lastMonthPrefix));
      expenses = expenses.filter(e => e.date && e.date.startsWith(lastMonthPrefix));
    }

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // By Method
    const revenueByMethod = {};
    payments.forEach(p => {
      const m = (p.mode || p.method || 'cash').toUpperCase();
      revenueByMethod[m] = (revenueByMethod[m] || 0) + p.amount;
    });

    // By Category
    const expenseByCategory = {};
    expenses.forEach(e => {
      const cat = e.category || 'General';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    // Month-by-month historical P&L (last 6 months)
    const monthlyHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const prefix = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const mRev = allPayments.filter(p => p.date && p.date.startsWith(prefix)).reduce((s, p) => s + p.amount, 0);
      const mExp = allExpenses.filter(e => e.date && e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
      monthlyHistory.push({
        monthKey: prefix,
        label,
        revenue: mRev,
        expenses: mExp,
        net: mRev - mExp
      });
    }

    // Dues Aging
    const pendingDues = store.getPendingDues(branchId);
    const aging = {
      under7: { label: '0–7 Days', amount: 0, count: 0 },
      under30: { label: '8–30 Days', amount: 0, count: 0 },
      over30: { label: '30+ Days', amount: 0, count: 0 }
    };
    pendingDues.forEach(d => {
      if (d.daysDue <= 7) {
        aging.under7.amount += d.pendingAmount;
        aging.under7.count++;
      } else if (d.daysDue <= 30) {
        aging.under30.amount += d.pendingAmount;
        aging.under30.count++;
      } else {
        aging.over30.amount += d.pendingAmount;
        aging.over30.count++;
      }
    });

    return {
      payments,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit,
      revenueByMethod,
      expenseByCategory,
      monthlyHistory,
      aging,
      totalOutstanding: pendingDues.reduce((s, d) => s + d.pendingAmount, 0)
    };
  }

  function renderView() {
    const data = getPeriodData();
    const revenueChart = store.getRevenueChart(branchId, selectedPeriod === 'today' ? 1 : (selectedPeriod === 'this-week' ? 7 : 30));

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Financial Reports</h1>
            <p class="page-subtitle">${esc(branch?.name || 'Main Branch')} · Revenue, Expenses, P&L & Dues</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" id="rep-export-btn">
              ${icons.download || icons.fileText} Export CSV
            </button>
            <button class="btn btn-secondary" onclick="window.print()">
              ${icons.print} Print
            </button>
          </div>
        </div>
      </div>

      <!-- Period Tabs -->
      <div class="filter-tabs" style="margin-bottom:var(--space-5);">
        <button class="filter-tab ${selectedPeriod === 'today' ? 'active' : ''}" data-period="today">Today</button>
        <button class="filter-tab ${selectedPeriod === 'this-week' ? 'active' : ''}" data-period="this-week">This Week</button>
        <button class="filter-tab ${selectedPeriod === 'this-month' ? 'active' : ''}" data-period="this-month">This Month</button>
        <button class="filter-tab ${selectedPeriod === 'last-month' ? 'active' : ''}" data-period="last-month">Last Month</button>
        <button class="filter-tab ${selectedPeriod === 'all' ? 'active' : ''}" data-period="all">All Time</button>
      </div>

      <!-- P&L Summary Cards -->
      <div class="grid-3" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Revenue (${esc(selectedPeriod.replace('-', ' '))})</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${utils.formatINR(data.totalRevenue)}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${data.payments.length} transactions</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Expenses (${esc(selectedPeriod.replace('-', ' '))})</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(data.totalExpenses)}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${data.expenses.length} expense records</div>
        </div>
        <div class="stat-card" style="background:${data.netProfit >= 0 ? 'var(--sf-success-50)' : 'var(--sf-error-50)'};">
          <div class="stat-card-top"><div class="stat-card-label">Net Operating Profit</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:${data.netProfit >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};">${utils.formatINR(data.netProfit)}</div>
          <div style="font-size:var(--text-xs);color:${data.netProfit >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};margin-top:var(--space-1);">Margin: ${data.totalRevenue > 0 ? Math.round((data.netProfit / data.totalRevenue) * 100) : 0}%</div>
        </div>
      </div>

      <!-- Charts & Breakdown Row -->
      <div class="grid-2" style="gap:var(--space-5);margin-bottom:var(--space-6);">
        <!-- Revenue Trend -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Daily Revenue Trend</div>
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
            ${Object.entries(data.expenseByCategory).map(([cat, amount]) => {
              const maxAmt = Math.max(...Object.values(data.expenseByCategory), 1);
              const pct = Math.round((amount / maxAmt) * 100);
              return `
                <div style="margin-bottom:var(--space-3);">
                  <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:var(--space-1);">
                    <span style="color:var(--color-text-secondary);">${esc(cat)}</span>
                    <span style="font-weight:var(--fw-semibold);">${utils.formatINR(amount)}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill indigo" style="width:${pct}%;"></div>
                  </div>
                </div>
              `;
            }).join('') || '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);padding:var(--space-4);text-align:center;">No expenses in this period.</div>'}
          </div>
        </div>
      </div>

      <!-- Month-by-Month P&L History Table -->
      <div class="card" style="margin-bottom:var(--space-6);">
        <div class="card-header">
          <div class="card-title">Month-by-Month Profit & Loss (Last 6 Months)</div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              ${data.monthlyHistory.map(m => {
                const margin = m.revenue > 0 ? Math.round((m.net / m.revenue) * 100) : 0;
                return `
                  <tr>
                    <td style="font-weight:var(--fw-medium);">${esc(m.label)}</td>
                    <td style="color:var(--sf-success-600);font-weight:var(--fw-semibold);">${utils.formatINR(m.revenue)}</td>
                    <td style="color:var(--sf-error-600);font-weight:var(--fw-semibold);">${utils.formatINR(m.expenses)}</td>
                    <td style="font-weight:var(--fw-bold);color:${m.net >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};">${utils.formatINR(m.net)}</td>
                    <td><span class="badge ${margin >= 0 ? 'badge-success' : 'badge-error'}">${margin}%</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Dues Aging Table -->
      <div class="card" style="margin-bottom:var(--space-6);">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div class="card-title">Outstanding Dues Aging</div>
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);color:var(--sf-error-600);">Total Due: ${utils.formatINR(data.totalOutstanding)}</div>
        </div>
        <div class="grid-3" style="padding:var(--space-4);gap:var(--space-4);">
          <div class="card" style="margin:0;background:var(--sf-warning-50);border-color:var(--sf-warning-200);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--sf-warning-700);font-weight:600;">0–7 DAYS (RECENT)</div>
            <div style="font-size:var(--text-xl);font-weight:bold;color:var(--sf-warning-800);margin-top:4px;">${utils.formatINR(data.aging.under7.amount)}</div>
            <div style="font-size:11px;color:var(--sf-warning-700);">${data.aging.under7.count} memberships</div>
          </div>
          <div class="card" style="margin:0;background:var(--sf-error-50);border-color:var(--sf-error-200);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--sf-error-700);font-weight:600;">8–30 DAYS (MODERATE)</div>
            <div style="font-size:var(--text-xl);font-weight:bold;color:var(--sf-error-800);margin-top:4px;">${utils.formatINR(data.aging.under30.amount)}</div>
            <div style="font-size:11px;color:var(--sf-error-700);">${data.aging.under30.count} memberships</div>
          </div>
          <div class="card" style="margin:0;background:#fef2f2;border-color:#fca5a5;padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:#991b1b;font-weight:600;">30+ DAYS (SEVERE)</div>
            <div style="font-size:var(--text-xl);font-weight:bold;color:#991b1b;margin-top:4px;">${utils.formatINR(data.aging.over30.amount)}</div>
            <div style="font-size:11px;color:#991b1b;">${data.aging.over30.count} memberships</div>
          </div>
        </div>
      </div>
    `;

    // Bind Period Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        selectedPeriod = tab.dataset.period;
        renderView();
      });
    });

    document.getElementById('rep-export-btn')?.addEventListener('click', () => {
      exportReportCSV(data);
    });
  }

  function exportReportCSV(data) {
    const headers = ['Month', 'Revenue', 'Expenses', 'Net Profit'];
    const rows = data.monthlyHistory.map(m => [
      `"${m.label}"`,
      m.revenue,
      m.expenses,
      m.net
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `studyflow_pnl_report_${branchId || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Financial Report CSV exported!', 'success');
  }

  renderView();
}

function renderMiniBarChart(data) {
  if (!data || !data.length) return '<div style="color:var(--color-text-tertiary);text-align:center;padding:var(--space-4);">No trend data.</div>';
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;align-items:flex-end;gap:4px;height:120px;padding-top:var(--space-4);">
      ${data.map(d => {
        const h = Math.max(Math.round((d.amount / max) * 100), 4);
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;" title="${d.label}: ${utils.formatINR(d.amount)}">
            <div style="width:100%;background:var(--sf-indigo-500);border-radius:3px 3px 0 0;height:${h}%;"></div>
            <div style="font-size:9px;color:var(--color-text-tertiary);margin-top:4px;writing-mode:horizontal-tb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.label.split(' ')[0]}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
