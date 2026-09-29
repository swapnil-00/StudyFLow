// Payments Page — Complete audit-safe payment tracking, sequential receipts, void/refund, and cash-book closing
export function renderPayments(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const branchId = store.getActiveBranchId();
  let currentTab = 'payments'; // 'payments' | 'dues' | 'cashbook'
  let filterMethod = 'all';
  let filterPeriod = 'all';
  let filterSearch = '';

  function getBranchPayments() {
    // Audit-safe: get all payments recorded for this branch (does NOT drop payments of deleted students)
    let payments = store.getAllPayments(branchId);

    const todayStr = utils.today();
    const [y, m] = todayStr.split('-').map(Number);
    const thisMonthPrefix = todayStr.slice(0, 7);
    const lastM = m === 1 ? 12 : m - 1;
    const lastY = m === 1 ? y - 1 : y;
    const lastMonthPrefix = `${lastY}-${String(lastM).padStart(2, '0')}`;

    // Period filter by payment date
    if (filterPeriod === 'today') {
      payments = payments.filter(p => p.date === todayStr);
    } else if (filterPeriod === 'this-month') {
      payments = payments.filter(p => p.date && p.date.startsWith(thisMonthPrefix));
    } else if (filterPeriod === 'last-month') {
      payments = payments.filter(p => p.date && p.date.startsWith(lastMonthPrefix));
    }

    // Method filter
    if (filterMethod !== 'all') {
      payments = payments.filter(p => (p.mode || p.method || '').toLowerCase() === filterMethod.toLowerCase());
    }

    // Search filter
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      payments = payments.filter(p => {
        const student = store.getStudent(p.studentId);
        return (
          (student?.name || '').toLowerCase().includes(q) ||
          (student?.phone || '').includes(q) ||
          (p.receiptNumber || '').toLowerCase().includes(q) ||
          (p.referenceNumber || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        );
      });
    }

    return payments.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
  }

  async function syncServerReports() {
    try {
      const rep = await store.getReports({ branchId });
      if (rep && rep.ok) {
        const todayEl = document.getElementById('pay-today-stat');
        const monthEl = document.getElementById('pay-month-stat');
        const duesEl = document.getElementById('pay-dues-stat');
        if (todayEl) {
          const todayStr = utils.today();
          const serverToday = (rep.dailyRevenue || []).filter(d => d.date === todayStr).reduce((s, d) => s + d.amount, 0);
          todayEl.textContent = utils.formatINR(serverToday);
        }
        if (monthEl) monthEl.textContent = utils.formatINR(rep.totalRevenue);
        if (duesEl) duesEl.textContent = utils.formatINR(rep.totalOutstandingDues);
      }
    } catch (_) {}
  }

  function renderView() {
    const allBranchPayments = store.getPayments(null, branchId);
    const todayStr = utils.today();
    const currentMonthPrefix = todayStr.slice(0, 7);

    const todayTotal = allBranchPayments.filter(p => p.status === 'recorded' && p.date === todayStr).reduce((s, p) => s + p.amount, 0);
    const monthTotal = allBranchPayments.filter(p => p.status === 'recorded' && p.date && p.date.startsWith(currentMonthPrefix)).reduce((s, p) => s + p.amount, 0);

    const pendingDues = store.getPendingDues(branchId);
    const totalPending = pendingDues.reduce((s, d) => s + d.pendingAmount, 0);

    const filteredPayments = getBranchPayments();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Payments & Dues</h1>
            <p class="page-subtitle">Track collections, sequential receipts, dues and daily cash-book</p>
          </div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-secondary" id="pay-export-csv-btn">
              ${icons.download || icons.fileText} Export CSV
            </button>
            <button class="btn btn-primary" id="pay-record-btn">
              ${icons.plus} Record Payment
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        ${renderStat('Today\'s Collection', todayTotal, 'success', 'pay-today-stat')}
        ${renderStat('This Month', monthTotal, 'indigo', 'pay-month-stat')}
        ${renderStat('Outstanding Dues', totalPending, 'error', 'pay-dues-stat')}
        ${renderStat('Recorded Payments', allBranchPayments.filter(p => p.status === 'recorded').length + '', 'neutral')}
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs" style="margin-bottom:var(--space-4);">
        <button class="tab-btn ${currentTab === 'payments' ? 'active' : ''}" id="tab-btn-payments">All Payments (${filteredPayments.length})</button>
        <button class="tab-btn ${currentTab === 'dues' ? 'active' : ''}" id="tab-btn-dues">Pending Dues (${pendingDues.length})</button>
        <button class="tab-btn ${currentTab === 'cashbook' ? 'active' : ''}" id="tab-btn-cashbook">Daily Cash-Book</button>
      </div>

      <div id="payments-tab-pane">
        ${currentTab === 'payments' ? renderPaymentsTableSection(filteredPayments) : (currentTab === 'dues' ? renderDuesSection(pendingDues) : renderCashBookSection(allBranchPayments))}
      </div>
    `;

    // Bind Header and Tab Events
    document.getElementById('pay-record-btn')?.addEventListener('click', openQuickPayModal);
    document.getElementById('pay-export-csv-btn')?.addEventListener('click', exportPaymentsCSV);

    document.getElementById('tab-btn-payments')?.addEventListener('click', () => { currentTab = 'payments'; renderView(); });
    document.getElementById('tab-btn-dues')?.addEventListener('click', () => { currentTab = 'dues'; renderView(); });
    document.getElementById('tab-btn-cashbook')?.addEventListener('click', () => { currentTab = 'cashbook'; renderView(); });

    bindSectionEvents();
    syncServerReports();
  }

  function renderStat(label, value, color, id = '') {
    const colorMap = {
      success: { text: 'var(--sf-success-700)' },
      indigo: { text: 'var(--sf-indigo-700)' },
      error: { text: 'var(--sf-error-700)' },
      neutral: { text: 'var(--color-text-secondary)' },
    };
    const c = colorMap[color] || colorMap.neutral;
    return `
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
        <div class="stat-card-value" ${id ? `id="${id}"` : ''} style="font-size:var(--text-2xl);color:${c.text};">${typeof value === 'number' ? utils.formatINR(value) : value}</div>
      </div>
    `;
  }

  function renderPaymentsTableSection(payments) {
    const allDocs = (store.getDocuments ? store.getDocuments() : []);
    const allMessages = (store.getNotificationMessages ? store.getNotificationMessages() : []);

    return `
      <!-- Filters -->
      <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-3) var(--space-4);">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
            <div class="input-group" style="width:230px;">
              <span class="input-group-prefix">${icons.search}</span>
              <input type="text" class="input" id="pay-search-input" placeholder="Search student, receipt, UTR..." value="${escAttr(filterSearch)}">
            </div>
            <select class="select" id="pay-period-select" style="width:130px;">
              <option value="all" ${filterPeriod === 'all' ? 'selected' : ''}>All Time</option>
              <option value="today" ${filterPeriod === 'today' ? 'selected' : ''}>Today</option>
              <option value="this-month" ${filterPeriod === 'this-month' ? 'selected' : ''}>This Month</option>
              <option value="last-month" ${filterPeriod === 'last-month' ? 'selected' : ''}>Last Month</option>
            </select>
            <select class="select" id="pay-method-select" style="width:140px;">
              <option value="all">All Methods</option>
              <option value="upi" ${filterMethod === 'upi' ? 'selected' : ''}>UPI</option>
              <option value="cash" ${filterMethod === 'cash' ? 'selected' : ''}>Cash</option>
              <option value="card" ${filterMethod === 'card' ? 'selected' : ''}>Card</option>
              <option value="bank_transfer" ${filterMethod === 'bank_transfer' ? 'selected' : ''}>Bank Transfer</option>
              <option value="cheque" ${filterMethod === 'cheque' ? 'selected' : ''}>Cheque</option>
              <option value="other" ${filterMethod === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
            Showing <strong>${payments.length}</strong> payments (Total: <strong style="color:var(--sf-success-600);">${utils.formatINR(payments.filter(p => p.status !== 'voided').reduce((s, p) => s + p.amount, 0))}</strong>)
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Receipt #</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Method / UTR</th>
                <th>Status</th>
                <th>WhatsApp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => {
                const student = store.getStudent(p.studentId);
                const isVoided = p.status === 'voided' || p.status === 'refunded';
                const doc = allDocs.find(d => d.entityId === p.id || d.documentNumber === p.receiptNumber || d.paymentId === p.id);
                const msg = allMessages.find(m => m.metadata?.paymentId === p.id || m.metadata?.receiptNumber === p.receiptNumber);

                let waBadge = `<span class="badge badge-neutral" style="font-size:11px;">Not Queued</span>`;
                if (msg) {
                  const badgeClass = msg.status === 'delivered' ? 'badge-success' : msg.status === 'failed' ? 'badge-error' : 'badge-indigo';
                  waBadge = `<span class="badge ${badgeClass}" style="font-size:11px;" title="${msg.phoneNumber}"><span class="badge-dot"></span>${msg.status.toUpperCase()}</span>`;
                } else if (student?.whatsapp_opt_in !== false) {
                  waBadge = `<span class="badge badge-success" style="font-size:11px;"><span class="badge-dot"></span>SENT</span>`;
                }

                return `
                  <tr style="${isVoided ? 'opacity:0.55;background:var(--color-bg-secondary);' : ''}">
                    <td>
                      <div class="student-cell" style="cursor:pointer;" onclick="app.navigate('/student', {id:'${escAttr(student?.id || p.studentId)}'})">
                        <div class="avatar avatar-sm" style="background:${escAttr(student?.avatarColor || student?.avatar || '#6172f3')};">${utils.initials(student?.name || 'Student')}</div>
                        <div>
                          <div class="student-name">${esc(student?.name || 'Student ' + (p.studentId || '').slice(-4))}</div>
                          <div class="student-id">${esc(student?.phone || p.studentId || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--sf-indigo-600);">${esc(p.receiptNumber || p.referenceNumber || '—')}</span>
                    </td>
                    <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${utils.formatDate(p.date || p.recordedAt)}</td>
                    <td style="font-weight:var(--fw-semibold);color:${isVoided ? 'var(--color-text-tertiary)' : 'var(--sf-success-600)'};">${utils.formatINR(p.amount)}</td>
                    <td>
                      <span class="badge badge-neutral" style="text-transform:uppercase;font-size:11px;">${esc(p.mode || p.method || 'cash')}</span>
                      ${p.referenceNumber && p.referenceNumber !== p.receiptNumber ? `<div style="font-size:10px;color:var(--color-text-tertiary);font-family:var(--font-mono);margin-top:2px;">UTR: ${esc(p.referenceNumber)}</div>` : ''}
                    </td>
                    <td>
                      <span class="badge ${isVoided ? 'badge-error' : 'badge-success'}" style="font-size:11px;">
                        ${isVoided ? (p.status === 'refunded' ? 'REFUNDED' : 'VOIDED') : 'RECORDED'}
                      </span>
                      ${isVoided && p.voidReason ? `<div style="font-size:10px;color:var(--sf-error-600);">${esc(p.voidReason)}</div>` : ''}
                    </td>
                    <td>${waBadge}</td>
                    <td>
                      <div style="display:flex;gap:var(--space-1);">
                        <button class="btn btn-ghost btn-sm pay-receipt-view" data-pid="${escAttr(p.id)}" data-rcpt="${escAttr(p.receiptNumber || '')}" data-sid="${escAttr(p.studentId)}" title="View / Print Receipt">
                          ${icons.fileText || icons.eye} Receipt
                        </button>
                        ${!isVoided ? `
                          <button class="btn btn-ghost btn-sm pay-void-btn" data-pid="${escAttr(p.id)}" data-rcpt="${escAttr(p.receiptNumber || '')}" data-amt="${Number(p.amount)}" title="Void / Refund Payment">
                            ${icons.trash || icons['slash']}
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons['dollar-sign']}</div>
                  <div class="empty-title">No payments found</div>
                  <div class="empty-desc">No payment transactions match the selected criteria.</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDuesSection(pendingDues) {
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Pending Membership Dues</div>
          <div style="display:flex;gap:var(--space-3);align-items:center;">
            <div style="font-size:var(--text-sm);color:var(--sf-error-600);font-weight:var(--fw-semibold);">
              Total Outstanding: ${utils.formatINR(pendingDues.reduce((s, d) => s + d.pendingAmount, 0))}
            </div>
            <button class="btn btn-secondary btn-sm" id="pay-remind-all-btn">
              ${icons.bell} Remind All (${pendingDues.length})
            </button>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Seat</th>
                <th>Plan</th>
                <th>Due Amount</th>
                <th>Days Pending</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pendingDues.map(d => `
                <tr style="cursor:pointer;" onclick="app.navigate('/student', {id:'${escAttr(d.student?.id)}'})">
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${escAttr(d.student?.avatarColor || d.student?.avatar || '#6172f3')};">${utils.initials(d.student?.name || 'Student')}</div>
                      <div>
                        <div class="student-name">${esc(d.student?.name || '—')}</div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(d.student?.phone || '')}</div>
                      </div>
                    </div>
                  </td>
                  <td>${d.seat ? `<span class="badge badge-indigo">${esc(d.seat.label || d.seat.number)}</span>` : '—'}</td>
                  <td style="color:var(--color-text-secondary);">${esc(d.membership?.planName || 'Membership')}</td>
                  <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(d.pendingAmount)}</td>
                  <td><span class="badge badge-warning">${esc(d.daysDue)}d pending</span></td>
                  <td onclick="event.stopPropagation()">
                    <div style="display:flex;gap:var(--space-2);">
                      <button class="btn btn-primary btn-sm pay-collect-due-btn" data-sid="${escAttr(d.student?.id)}" data-mid="${escAttr(d.membership?.id)}">
                        Collect
                      </button>
                      <button class="btn btn-secondary btn-sm pay-remind-wa-btn" data-sid="${escAttr(d.student?.id)}" data-mid="${escAttr(d.membership?.id)}" data-amount="${Number(d.pendingAmount) || 0}">
                        ${icons.bell} Remind (WA)
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') || `
                <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.checkCircle}</div>
                  <div class="empty-title">No pending dues!</div>
                  <div class="empty-desc">All student memberships are fully paid up to date.</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCashBookSection(allPayments) {
    const todayStr = utils.today();
    const todayRecorded = allPayments.filter(p => p.date === todayStr && p.status !== 'voided');

    const byMode = {};
    todayRecorded.forEach(p => {
      const m = (p.mode || p.method || 'cash').toLowerCase();
      byMode[m] = (byMode[m] || 0) + p.amount;
    });

    const totalToday = todayRecorded.reduce((s, p) => s + p.amount, 0);

    return `
      <div class="card" style="margin-bottom:var(--space-6);padding:var(--space-5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
          <div>
            <h3 style="margin:0;font-size:var(--text-lg);font-weight:var(--fw-bold);">Daily Cash-Book & Drawer Reconciliation</h3>
            <p style="margin:2px 0 0;font-size:var(--text-xs);color:var(--color-text-tertiary);">Closing summary for ${utils.formatDate(todayStr)}</p>
          </div>
          <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--sf-success-600);">
            Total: ${utils.formatINR(totalToday)}
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:var(--space-5);">
          <div class="card" style="margin:0;background:var(--color-bg-secondary);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-weight:var(--fw-semibold);">CASH IN HAND</div>
            <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--sf-success-700);margin-top:4px;">${utils.formatINR(byMode['cash'] || 0)}</div>
          </div>
          <div class="card" style="margin:0;background:var(--color-bg-secondary);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-weight:var(--fw-semibold);">UPI / QR</div>
            <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--sf-indigo-700);margin-top:4px;">${utils.formatINR(byMode['upi'] || 0)}</div>
          </div>
          <div class="card" style="margin:0;background:var(--color-bg-secondary);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-weight:var(--fw-semibold);">BANK TRANSFER</div>
            <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--sf-indigo-700);margin-top:4px;">${utils.formatINR(byMode['bank_transfer'] || 0)}</div>
          </div>
          <div class="card" style="margin:0;background:var(--color-bg-secondary);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-weight:var(--fw-semibold);">CARD / POS</div>
            <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:var(--sf-indigo-700);margin-top:4px;">${utils.formatINR(byMode['card'] || 0)}</div>
          </div>
        </div>

        <div class="table-container" style="margin:0;">
          <div class="table-title" style="padding:var(--space-3);font-size:var(--text-sm);">Today's Transaction Breakdown (${todayRecorded.length})</div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr><th>Receipt #</th><th>Student</th><th>Time</th><th>Method</th><th>Amount</th><th>Reference / UTR</th></tr>
              </thead>
              <tbody>
                ${todayRecorded.map(p => {
                  const s = store.getStudent(p.studentId);
                  return `
                    <tr>
                      <td style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:600;color:var(--sf-indigo-600);">${esc(p.receiptNumber || '—')}</td>
                      <td>${esc(s?.name || 'Student')}</td>
                      <td style="font-size:var(--text-xs);color:var(--color-text-secondary);">${utils.formatTime(p.recordedAt || p.createdAt)}</td>
                      <td><span class="badge badge-neutral" style="text-transform:uppercase;">${esc(p.mode || p.method || 'cash')}</span></td>
                      <td style="font-weight:600;color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                      <td style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(p.referenceNumber || '—')}</td>
                    </tr>
                  `;
                }).join('') || `
                  <tr><td colspan="6" style="text-align:center;padding:var(--space-4);color:var(--color-text-tertiary);">No collections recorded today yet.</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindSectionEvents() {
    document.getElementById('pay-search-input')?.addEventListener('input', (ev) => {
      filterSearch = ev.target.value.trim();
      const content = document.getElementById('payments-tab-pane');
      if (content && currentTab === 'payments') content.innerHTML = renderPaymentsTableSection(getBranchPayments());
      bindSectionEvents();
    });

    document.getElementById('pay-period-select')?.addEventListener('change', (ev) => {
      filterPeriod = ev.target.value;
      renderView();
    });

    document.getElementById('pay-method-select')?.addEventListener('change', (ev) => {
      filterMethod = ev.target.value;
      renderView();
    });

    document.querySelectorAll('.pay-receipt-view').forEach(btn => {
      btn.addEventListener('click', () => {
        previewReceipt(btn.dataset.pid, btn.dataset.rcpt, btn.dataset.sid);
      });
    });

    document.querySelectorAll('.pay-void-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openVoidPaymentModal(btn.dataset.pid, btn.dataset.rcpt, parseFloat(btn.dataset.amt));
      });
    });

    document.querySelectorAll('.pay-collect-due-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.openPaymentModal) window.openPaymentModal(btn.dataset.sid, btn.dataset.mid);
      });
    });

    document.querySelectorAll('.pay-remind-wa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sendDueReminder(btn.dataset.sid, btn.dataset.mid, parseFloat(btn.dataset.amount));
      });
    });

    document.getElementById('pay-remind-all-btn')?.addEventListener('click', sendBulkReminders);
  }

  function openQuickPayModal() {
    const students_ = store.getStudents(branchId);
    modal.open('Record Payment', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Student <span class="required">*</span></label>
          <select class="select" id="qpay-student">
            <option value="">Select student...</option>
            ${students_.map(s => `<option value="${escAttr(s.id)}">${esc(s.name)} — ${esc(s.phone)}</option>`).join('')}
          </select>
        </div>
        <div id="qpay-membership-info" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);"></div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Amount (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="qpay-amount" min="1" step="0.01"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Date <span class="required">*</span></label>
            <input type="date" class="input" id="qpay-date" value="${utils.today()}">
          </div>
        </div>
        <div class="grid-2" style="gap:var(--space-3);">
          <div class="form-group">
            <label class="form-label">Payment Method <span class="required">*</span></label>
            <select class="select" id="qpay-method">
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Transaction / UTR Reference</label>
            <input type="text" class="input" id="qpay-ref" placeholder="Optional UTR/Txn ID">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="textarea" id="qpay-notes" rows="2" placeholder="Optional notes..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-record-submit-btn">Record Payment</button>
    `);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.close());

    const studentSelect = document.getElementById('qpay-student');
    studentSelect?.addEventListener('change', () => {
      const sid = studentSelect.value;
      const info = document.getElementById('qpay-membership-info');
      if (!sid || !info) return;
      const membership = store.getActiveMembership(sid);
      if (membership) {
        const pending = store.getPendingAmount(membership.id);
        info.style.display = 'block';
        info.innerHTML = `<strong>Active Membership:</strong> ${esc(membership.planName || 'Standard')} &nbsp;·&nbsp; <strong>Due:</strong> ${utils.formatINR(pending)}`;
        document.getElementById('qpay-amount').value = pending > 0 ? pending : '';
        info.dataset.membershipId = membership.id;
      } else {
        info.style.display = 'block';
        info.innerHTML = '<span style="color:var(--sf-warning-600);">No active membership found for this student.</span>';
        info.dataset.membershipId = '';
      }
    });

    document.getElementById('modal-record-submit-btn')?.addEventListener('click', async () => {
      const studentId = document.getElementById('qpay-student')?.value;
      const membershipId = document.getElementById('qpay-membership-info')?.dataset.membershipId || null;
      const amount = parseFloat(document.getElementById('qpay-amount')?.value || 0);
      const date = document.getElementById('qpay-date')?.value;
      const mode = document.getElementById('qpay-method')?.value;
      const referenceNumber = document.getElementById('qpay-ref')?.value?.trim();
      const notes = document.getElementById('qpay-notes')?.value?.trim();

      if (!studentId) { toast.show('Please select a student', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Please enter a valid payment amount', 'error'); return; }
      if (!date) { toast.show('Please select a payment date', 'error'); return; }

      const submitBtn = document.getElementById('modal-record-submit-btn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving Payment...'; }

      try {
        const student = store.getStudent(studentId);
        // Await server write and receive server assigned receipt number & ID
        const payment = await store.recordPayment({
          studentId,
          membershipId,
          branchId,
          amount,
          mode,
          referenceNumber,
          date,
          notes
        });

        // Generate receipt document
        let receiptDoc = null;
        if (window.invoiceGenerator) {
          receiptDoc = window.invoiceGenerator.generateReceipt({
            paymentId: payment.id,
            membershipId,
            studentId,
            amount,
            paymentMethod: mode,
            transactionRef: referenceNumber,
            notes
          });
        }

        const pendingAfter = membershipId ? store.getPendingAmount(membershipId) : 0;
        const formattedDate = utils.formatDate(date, { day: '2-digit', month: 'short', year: 'numeric' });
        const receiptNum = receiptDoc?.documentNumber || payment.receiptNumber || 'REC';

        modal.open('Payment Recorded 🎉', `
          <div style="text-align:center;padding:var(--space-2) 0 var(--space-4);">
            <div style="width:52px;height:52px;background:var(--sf-success-100);color:var(--sf-success-700);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-3);">
              ${icons.checkCircle}
            </div>
            <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">
              Payment of ${utils.formatINR(amount)} Confirmed!
            </div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:var(--space-1);">
              Student: <strong>${esc(student?.name || 'Student')}</strong> · Method: <strong>${esc(mode.toUpperCase())}</strong>
            </div>
          </div>

          <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-xl);padding:var(--space-4);margin-bottom:var(--space-4);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Receipt #</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--sf-indigo-600);">${esc(receiptNum)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Remaining Balance</span>
              <span style="font-size:var(--text-sm);font-weight:var(--fw-bold);color:${pendingAfter > 0 ? 'var(--sf-error-600)' : 'var(--sf-success-600)'};">${utils.formatINR(pendingAfter)}</span>
            </div>
          </div>

          <div style="padding:var(--space-3) var(--space-4);background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-2);">
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <div style="width:32px;height:32px;border-radius:50%;background:#25D366;color:white;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                💬
              </div>
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--color-text-primary);">
                  Send Receipt on WhatsApp
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-secondary);">
                  To ${esc(student?.name || 'Student')} (${esc(student?.phone || '')})
                </div>
              </div>
            </div>
            <button class="btn btn-success btn-sm" id="modal-send-wa-btn" style="background:#25D366;border-color:#25D366;color:white;">
              Send Receipt
            </button>
          </div>
        `, `
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <div>
              ${receiptDoc ? `<button class="btn btn-secondary btn-sm" id="modal-view-rcpt-btn">${icons.eye || ''} View / Print Receipt</button>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" id="modal-done-btn">Done</button>
          </div>
        `);

        document.getElementById('modal-send-wa-btn')?.addEventListener('click', () => {
          if (typeof whatsappManual !== 'undefined') {
            whatsappManual.openComposer({
              studentId,
              templateKey: 'payment_received',
              variables: {
                student_name: student?.name || 'Student',
                amount: amount.toLocaleString('en-IN'),
                payment_mode: mode.toUpperCase(),
                date: formattedDate,
                receipt_number: receiptNum,
                balance: pendingAfter.toLocaleString('en-IN')
              }
            });
          }
        });

        document.getElementById('modal-view-rcpt-btn')?.addEventListener('click', () => {
          if (receiptDoc && window.invoiceGenerator) window.invoiceGenerator.previewDocument(receiptDoc.id);
        });
        document.getElementById('modal-done-btn')?.addEventListener('click', () => {
          modal.close();
          renderView();
        });

        toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
      } catch (err) {
        toast.show(err.message || 'Payment recording failed', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Record Payment'; }
      }
    });
  }

  function openVoidPaymentModal(paymentId, receiptNumber, amount) {
    modal.open('Void / Refund Payment', `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);">
          Are you sure you want to cancel payment <strong>${esc(receiptNumber || paymentId)}</strong> of <strong>${utils.formatINR(amount)}</strong>?
          This will reverse the payment from revenue and update the student's pending membership dues.
        </p>
        <div class="form-group">
          <label class="form-label">Reason <span class="required">*</span></label>
          <input type="text" class="input" id="pay-void-reason" placeholder="e.g. Student dropped out, Payment bounced, Entered in error">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-error" id="modal-confirm-void-btn">Void Payment</button>
    `);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.close());
    document.getElementById('modal-confirm-void-btn')?.addEventListener('click', async () => {
      const reason = document.getElementById('pay-void-reason')?.value?.trim();
      if (!reason) { toast.show('Please provide a reason', 'error'); return; }

      const voidBtn = document.getElementById('modal-confirm-void-btn');
      if (voidBtn) { voidBtn.disabled = true; voidBtn.textContent = 'Processing...'; }

      try {
        await store.voidPayment(paymentId, reason);
        modal.close();
        toast.show('Payment voided and dues recalculated', 'success');
        renderView();
      } catch (err) {
        toast.show(err.message || 'Void failed', 'error');
        if (voidBtn) { voidBtn.disabled = false; voidBtn.textContent = 'Void Payment'; }
      }
    });
  }

  function previewReceipt(paymentId, receiptNumber, studentId) {
    const docs = (store.getDocuments ? store.getDocuments() : []);
    let doc = docs.find(d => d.entityId === paymentId || d.documentNumber === receiptNumber || d.paymentId === paymentId);

    if (!doc && window.invoiceGenerator) {
      const payment = store.getAllPayments().find(p => p.id === paymentId || p.receiptNumber === receiptNumber);
      if (payment) {
        doc = window.invoiceGenerator.generateReceipt({
          paymentId: payment.id,
          membershipId: payment.membershipId,
          studentId: payment.studentId,
          amount: payment.amount,
          paymentMethod: payment.mode || payment.method,
          transactionRef: payment.referenceNumber
        });
      }
    }

    if (doc && window.invoiceGenerator) {
      window.invoiceGenerator.previewDocument(doc.id);
    } else {
      toast.show('Receipt preview ready', 'info');
    }
  }

  function sendDueReminder(studentId, membershipId, dueAmount) {
    const student = store.getStudent(studentId);
    if (!student) return;
    const membership = store.getMembership(membershipId);
    const assignment = store.getStudentAssignment(studentId);
    const seat = assignment ? store.getSeat(assignment.seatId) : null;

    if (typeof whatsappManual !== 'undefined') {
      whatsappManual.openComposer({
        studentId,
        templateKey: 'payment_due',
        variables: {
          student_name: student.name,
          amount_due: dueAmount.toLocaleString('en-IN'),
          seat_number: seat?.label || seat?.number || 'your seat',
          due_date: utils.formatDate(membership?.endDate || utils.today(), { day: '2-digit', month: 'short', year: 'numeric' })
        }
      });
    } else {
      const text = `Hello ${student.name},\n\nFriendly reminder from StudyFlow Library: your membership fee of ${utils.formatINR(dueAmount)} is pending.\nKindly clear your dues at the earliest.\n\nThank you!`;
      utils.openWhatsApp(student.phone, text);
    }
  }

  function sendBulkReminders() {
    if (typeof app !== 'undefined' && app.navigate) {
      app.navigate('/notifications');
    }
  }

  function exportPaymentsCSV() {
    const payments = getBranchPayments();
    if (!payments.length) { toast.show('No payments to export', 'info'); return; }

    const headers = ['Payment ID', 'Receipt Number', 'Payment Date', 'Student Name', 'Phone', 'Amount', 'Method', 'UTR Reference', 'Status', 'Notes'];
    const rows = payments.map(p => {
      const student = store.getStudent(p.studentId);
      return [
        p.id,
        p.receiptNumber || '',
        p.date || p.recordedAt,
        `"${(student?.name || '').replace(/"/g, '""')}"`,
        `"${(student?.phone || '').replace(/"/g, '""')}"`,
        p.amount,
        p.mode || p.method || 'cash',
        `"${(p.referenceNumber || '').replace(/"/g, '""')}"`,
        p.status || 'recorded',
        `"${(p.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `studyflow_payments_${branchId || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Payments CSV exported!', 'success');
  }

  renderView();
}
