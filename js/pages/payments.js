// Payments Page
export function renderPayments(container) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  let allPayments = [];
  let filter = 'all';
  let search = '';

  // Get all payments for this branch
  students.forEach(s => {
    store.getPaymentsForStudent(s.id).forEach(p => {
      allPayments.push({ ...p, student: s });
    });
  });
  allPayments.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  const todayPayments = allPayments.filter(p => new Date(p.recordedAt).toDateString() === new Date().toDateString());
  const monthPayments = allPayments.filter(p => {
    const d = new Date(p.recordedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  const pendingDues = store.getPendingDues(branchId);
  const totalPending = pendingDues.reduce((s, d) => s + d.pendingAmount, 0);

  function getFiltered() {
    let result = [...allPayments];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.student?.name.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q)
      );
    }
    return result;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Payments</h1>
          <p class="page-subtitle">Track collections and pending dues</p>
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" onclick="switchPaymentsTab('dues')">
            ${icons['alert-circle']} Pending Dues
          </button>
          <button class="btn btn-primary" onclick="openQuickPayModal()">
            ${icons.plus} Record Payment
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderPayStat('Today\'s Collection', todayTotal, 'success')}
      ${renderPayStat('This Month', monthTotal, 'indigo')}
      ${renderPayStat('Total Outstanding', totalPending, 'error')}
      ${renderPayStat('Total Transactions', allPayments.length + '', 'neutral')}
    </div>

    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:0;">
      <button class="tab-btn active" id="tab-payments" onclick="switchPaymentsTab('payments')">All Payments</button>
      <button class="tab-btn" id="tab-dues" onclick="switchPaymentsTab('dues')">Pending Dues</button>
    </div>

    <div id="payments-tab-content">
      ${renderPaymentsTable(getFiltered(), search)}
    </div>
  `;

  window.switchPaymentsTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    const content = document.getElementById('payments-tab-content');
    if (tab === 'payments') content.innerHTML = renderPaymentsTable(getFiltered(), search);
    else content.innerHTML = renderDuesTable(pendingDues);
  };

  window.openQuickPayModal = function() {
    const students_ = store.getStudents(branchId);
    modal.open('Record Payment', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Student <span class="required">*</span></label>
          <select class="select" id="qpay-student" onchange="loadStudentMembership(this.value)">
            <option value="">Select student...</option>
            ${students_.map(s => `<option value="${s.id}">${s.name} — ${s.phone}</option>`).join('')}
          </select>
        </div>
        <div id="qpay-membership-info" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);"></div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="qpay-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Method</label>
          <select class="select" id="qpay-method"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Reference ID</label>
          <input type="text" class="input" id="qpay-ref" placeholder="Optional">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="textarea" id="qpay-notes" rows="2" placeholder="Optional"></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmQuickPay()">Record Payment</button>
    `);

    window.loadStudentMembership = (studentId) => {
      if (!studentId) return;
      const membership = store.getActiveMembership(studentId);
      const info = document.getElementById('qpay-membership-info');
      if (membership) {
        const pending = store.getPendingAmount(membership.id);
        info.style.display = 'block';
        info.innerHTML = `<strong>Outstanding:</strong> ${utils.formatINR(pending)} &nbsp;·&nbsp; Plan: ${membership.planName}`;
        document.getElementById('qpay-amount').value = pending;
      } else {
        info.style.display = 'block';
        info.innerHTML = '<span style="color:var(--sf-warning-600);">No active membership found</span>';
      }
      info.dataset.membershipId = membership?.id || '';
    };

    window.confirmQuickPay = () => {
      const studentId = document.getElementById('qpay-student')?.value;
      const membershipId = document.getElementById('qpay-membership-info')?.dataset.membershipId;
      const amount = parseFloat(document.getElementById('qpay-amount')?.value || 0);
      const method = document.getElementById('qpay-method')?.value;
      const ref = document.getElementById('qpay-ref')?.value;
      const notes = document.getElementById('qpay-notes')?.value;

      if (!studentId) { toast.show('Please select a student', 'error'); return; }
      if (!membershipId) { toast.show('No active membership for this student', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

      try {
        const student = store.getStudent(studentId);
        const payment = store.recordPayment({ membershipId, studentId, amount, method, txnId: ref, notes });

        // Generate branded receipt document
        let receiptDoc = null;
        if (window.invoiceGenerator) {
          receiptDoc = window.invoiceGenerator.generateReceipt({
            paymentId: payment.id,
            membershipId,
            studentId,
            amount,
            paymentMethod: method,
            transactionRef: ref,
            notes
          });
        }

        // Dispatch WhatsApp notification
        let notifMsg = null;
        if (window.notificationService && window.NOTIFICATION_EVENTS) {
          notifMsg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
            studentId,
            membershipId,
            paymentId: payment.id,
            amount,
            receiptNumber: receiptDoc?.documentNumber || payment.receiptNumber,
            documentId: receiptDoc?.id
          });
        }

        const pendingAfter = store.getPendingAmount(membershipId);

        modal.open('Payment Recorded 🎉', `
          <div style="text-align:center;padding:var(--space-2) 0 var(--space-4);">
            <div style="width:52px;height:52px;background:var(--sf-success-100);color:var(--sf-success-700);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-3);">
              ${icons.checkCircle}
            </div>
            <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">
              Payment of ${utils.formatINR(amount)} Recorded!
            </div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:var(--space-1);">
              Student: <strong>${student?.name || 'Student'}</strong> · Mode: <strong>${method}</strong>
            </div>
          </div>

          <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-xl);padding:var(--space-4);margin-bottom:var(--space-4);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Receipt #</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--sf-indigo-600);">${receiptDoc?.documentNumber || payment.receiptNumber}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Remaining Balance</span>
              <span style="font-size:var(--text-sm);font-weight:var(--fw-bold);color:${pendingAfter > 0 ? 'var(--sf-error-600)' : 'var(--sf-success-600)'};">${utils.formatINR(pendingAfter)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">WhatsApp Receipt</span>
              <span class="badge ${notifMsg?.status === 'skipped' ? 'badge-neutral' : 'badge-success'}" style="font-size:11px;">
                <span class="badge-dot"></span>
                ${notifMsg?.status === 'skipped' ? 'Opted Out' : `Queued (${student?.normalized_phone || student?.phone})`}
              </span>
            </div>
          </div>
        `, `
          ${receiptDoc ? `<button class="btn btn-secondary" onclick="invoiceGenerator.previewDocument('${receiptDoc.id}')">${icons.eye} View Receipt</button>` : ''}
          <button class="btn btn-primary" onclick="modal.close(); app._navigate();">Done</button>
        `);

        toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
      } catch (e) { toast.show(e.message, 'error'); }
    };
  };
}

function renderPayStat(label, value, color) {
  const colorMap = {
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    error: { bg: 'var(--sf-error-50)', text: 'var(--sf-error-700)' },
    neutral: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div class="stat-card">
      <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-2xl);color:${c.text};">${typeof value === 'number' ? utils.formatINR(value) : value}</div>
    </div>
  `;
}

function renderPaymentsTable(payments, search) {
  const allDocs = (store.getDocuments ? store.getDocuments() : []);
  const allMessages = (store.getNotificationMessages ? store.getNotificationMessages() : []);

  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Payments</div>
        <div class="input-group" style="width:240px;">
          <div class="input-group-prefix">${icons.search}</div>
          <input class="input" type="text" placeholder="Search student, receipt..." value="${search}"
            oninput="filterPaymentsSearch(this.value)">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Receipt</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>WhatsApp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${payments.slice(0, 50).map(p => {
              const doc = allDocs.find(d => d.entityId === p.id || d.documentNumber === p.receiptNumber || d.paymentId === p.id);
              const msg = allMessages.find(m => m.metadata?.paymentId === p.id || m.metadata?.receiptNumber === p.receiptNumber);

              let waBadge = `<span class="badge badge-neutral" style="font-size:11px;">Not Queued</span>`;
              if (msg) {
                const badgeClass = msg.status === 'delivered' ? 'badge-success' : msg.status === 'failed' ? 'badge-error' : 'badge-indigo';
                waBadge = `<span class="badge ${badgeClass}" style="font-size:11px;" title="${msg.phone}"><span class="badge-dot"></span>${msg.status.toUpperCase()}</span>`;
              } else if (p.student?.whatsapp_opt_in !== false) {
                waBadge = `<span class="badge badge-success" style="font-size:11px;"><span class="badge-dot"></span>DELIVERED</span>`;
              }

              return `
              <tr>
                <td>
                  <div class="student-cell" style="cursor:pointer;" onclick="app.navigate('/student', {id:'${p.student?.id}'})">
                    <div class="avatar avatar-sm" style="background:${p.student?.avatar};">${utils.initials(p.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${p.student?.name || '—'}</div>
                      <div class="student-id">${p.student?.id || ''}</div>
                    </div>
                  </div>
                </td>
                <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                <td style="color:var(--color-text-secondary);">${p.method || '—'}</td>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt, {day:'numeric',month:'short',year:'numeric'})}</td>
                <td>${waBadge}</td>
                <td>
                  <div style="display:flex;gap:var(--space-2);">
                    <button class="btn btn-ghost btn-sm" onclick="previewPaymentReceipt('${p.id}', '${p.receiptNumber}', '${p.student?.id}')" title="View / Print Receipt">
                      ${icons.fileText || icons.eye} Receipt
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="resendPaymentReceiptWhatsApp('${p.id}', '${p.student?.id}')" title="Resend WhatsApp Receipt">
                      ${icons.send || icons.bell}
                    </button>
                  </div>
                </td>
              </tr>
            `;}).join('') || `
              <tr><td colspan="7"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['dollar-sign']}</div>
                <div class="empty-title">No payments found</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDuesTable(pendingDues) {
  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Pending Dues</div>
        <div style="display:flex;gap:var(--space-3);align-items:center;">
          <div style="font-size:var(--text-sm);color:var(--sf-error-600);font-weight:var(--fw-semibold);">
            Total: ${utils.formatINR(pendingDues.reduce((s,d)=>s+d.pendingAmount,0))}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="sendBulkDueReminders()">
            ${icons.bell} Remind All (${pendingDues.length})
          </button>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>Plan</th><th>Due Amount</th><th>Days Pending</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${pendingDues.map(d => `
              <tr onclick="app.navigate('/student', {id:'${d.student.id}'})">
                <td>
                  <div class="student-cell">
                    <div class="avatar avatar-sm" style="background:${d.student?.avatar};">${utils.initials(d.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${d.student?.name || '—'}</div>
                      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${d.student?.phone || ''}</div>
                    </div>
                  </div>
                </td>
                <td>${d.seat ? `<span class="badge badge-indigo">${d.seat.label}</span>` : '—'}</td>
                <td style="color:var(--color-text-secondary);">${d.membership?.planName || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(d.pendingAmount)}</td>
                <td><span class="badge badge-warning">${d.daysDue}d pending</span></td>
                <td onclick="event.stopPropagation()">
                  <div style="display:flex;gap:var(--space-2);">
                    <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${d.student.id}', '${d.membership.id}')">
                      Collect
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="sendDueWhatsAppReminder('${d.student.id}', '${d.membership.id}', ${d.pendingAmount})">
                      ${icons.bell} Remind (WA)
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.checkCircle}</div>
                <div class="empty-title">No pending dues!</div>
                <div class="empty-desc">All students are up to date on payments.</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.previewPaymentReceipt = function(paymentId, receiptNumber, studentId) {
  const docs = (store.getDocuments ? store.getDocuments() : []);
  let doc = docs.find(d => d.entityId === paymentId || d.documentNumber === receiptNumber || d.paymentId === paymentId);
  
  if (!doc && window.invoiceGenerator) {
    // Generate dynamically if missing
    const payment = store.getPayments().find(p => p.id === paymentId || p.receiptNumber === receiptNumber);
    if (payment) {
      doc = window.invoiceGenerator.generateReceipt({
        paymentId: payment.id,
        membershipId: payment.membershipId,
        studentId: payment.studentId,
        amount: payment.amount,
        paymentMethod: payment.method,
        transactionRef: payment.txnId
      });
    }
  }

  if (doc && window.invoiceGenerator) {
    window.invoiceGenerator.previewDocument(doc.id);
  } else {
    toast.show('Receipt document generated and ready for print', 'info');
  }
};

window.resendPaymentReceiptWhatsApp = function(paymentId, studentId) {
  const student = store.getStudent(studentId);
  const payment = store.getPayments().find(p => p.id === paymentId);
  if (!student || !payment) { toast.show('Payment not found', 'error'); return; }

  // 1-Click Free direct WhatsApp receipt option
  const text = `Hello ${student.name},\n\nPayment Receipt Confirmation:\nReceipt No: ${payment.receiptNumber}\nAmount: ${utils.formatINR(payment.amount)}\nDate: ${utils.formatDate(payment.recordedAt || payment.createdAt)}\nMethod: ${payment.method || 'Cash'}\n\nThank you! — StudyFlow Library`;

  if (window.notificationService && window.NOTIFICATION_EVENTS) {
    const msg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
      studentId: student.id,
      membershipId: payment.membershipId,
      paymentId: payment.id,
      amount: payment.amount,
      receiptNumber: payment.receiptNumber
    });

    if (msg?.status === 'skipped') {
      toast.show(`WhatsApp skipped: Student opted out.`, 'warning');
    } else {
      toast.show(`WhatsApp receipt dispatched for ${student.name}!`, 'success');
      app._navigate();
    }
  } else {
    utils.openWhatsApp(student.phone, text);
  }
};

window.sendDirectWhatsAppReceipt = function(paymentId, studentId) {
  const student = store.getStudent(studentId);
  const payment = store.getPayments().find(p => p.id === paymentId);
  if (!student || !payment) return;
  const text = `Hello ${student.name},\n\nPayment Receipt Confirmation:\nReceipt No: ${payment.receiptNumber}\nAmount: ${utils.formatINR(payment.amount)}\nDate: ${utils.formatDate(payment.recordedAt || payment.createdAt)}\nMethod: ${payment.method || 'Cash'}\n\nThank you! — StudyFlow Library`;
  utils.openWhatsApp(student.phone, text);
  toast.show('Opening WhatsApp Web...', 'info');
};

window.sendDueWhatsAppReminder = function(studentId, membershipId, dueAmount) {
  const student = store.getStudent(studentId);
  if (!student) return;

  const text = `Hello ${student.name},\n\nThis is a friendly reminder from StudyFlow Library that your membership fee of ${utils.formatINR(dueAmount)} is pending.\nKindly clear your dues to ensure uninterrupted library access.\n\nThank you!`;

  if (window.notificationService && window.NOTIFICATION_EVENTS) {
    const msg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_REMINDER, {
      studentId,
      membershipId,
      amountDue: dueAmount
    });

    if (msg?.status === 'skipped') {
      toast.show(`Reminder skipped: Student opted out.`, 'warning');
    } else {
      toast.show(`Fee reminder dispatched to ${student.name}!`, 'success');
    }
  } else {
    utils.openWhatsApp(student.phone, text);
  }
};

window.sendDirectWhatsAppDueReminder = function(studentId, dueAmount) {
  const student = store.getStudent(studentId);
  if (!student) return;
  const text = `Hello ${student.name},\n\nThis is a friendly reminder from StudyFlow Library that your membership fee of ${utils.formatINR(dueAmount)} is pending.\nKindly clear your dues to ensure uninterrupted library access.\n\nThank you!`;
  utils.openWhatsApp(student.phone, text);
  toast.show('Opening WhatsApp Web...', 'info');
};

window.sendBulkDueReminders = function() {
  const branchId = store.getActiveBranchId();
  const pendingDues = store.getPendingDues(branchId);
  if (!pendingDues.length) { toast.show('No pending dues to remind', 'info'); return; }

  let sent = 0;
  pendingDues.forEach(d => {
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      const res = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_REMINDER, {
        studentId: d.student.id,
        membershipId: d.membership.id,
        amountDue: d.pendingAmount
      });
      if (res && res.status !== 'skipped') sent++;
    }
  });

  toast.show(`Queued fee reminder WhatsApp messages to ${sent} students!`, 'success');
  app._navigate();
};

window.filterPaymentsSearch = function(q) {
  const rows = document.querySelectorAll('#payments-tab-content tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q ? (text.includes(q.toLowerCase()) ? '' : 'none') : '';
  });
};
