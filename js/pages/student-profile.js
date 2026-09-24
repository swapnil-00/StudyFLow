// Student Profile Page
export function renderStudentProfile(container, params) {
  const studentId = params.id;
  if (!studentId) { app.navigate('/students'); return; }

  const student = store.getStudent(studentId);
  if (!student) {
    container.innerHTML = `<div class="empty-state"><div class="empty-title">Student not found</div><button class="btn btn-secondary" onclick="app.navigate('/students')">Back to Students</button></div>`;
    return;
  }

  const membership = store.getActiveMembership(studentId);
  const allMemberships = store.getMemberships(studentId);
  const assignment = store.getStudentAssignment(studentId);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const room = seat ? store.getRoom(seat.roomId) : null;
  const floor = room ? store.getFloor(room.floorId) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const payStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const paidAmount = membership ? store.getPaidAmount(membership.id) : 0;
  const pendingAmount = membership ? store.getPendingAmount(membership.id) : 0;
  const payments = store.getPaymentsForStudent(studentId);
  const allAssignments = store.getAssignments(null).filter(a => a.studentId === studentId);
  const transfers = (store.db.seatTransfers || []).filter(t => t.studentId === studentId);
  const attendanceRecords = store.getAttendance(studentId);
  const recentActivity = store.getActivityLogs(100).filter(a => a.entityId === studentId || a.description?.includes(student.name)).slice(0, 10);

  // Attendance stats
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(a => a.checkIn).length;
  const avgDuration = attendanceRecords.filter(a => a.duration).reduce((sum, a) => sum + a.duration, 0) / Math.max(attendanceRecords.filter(a=>a.duration).length, 1);

  let activeTab = 'overview';

  function render() {
    container.innerHTML = `
      <!-- Back button -->
      <div style="margin-bottom:var(--space-4);">
        <button class="btn btn-ghost" onclick="app.navigate('/students')" style="gap:var(--space-2);">
          ${icons.chevronLeft} Back to Students
        </button>
      </div>

      <!-- Profile Header -->
      <div class="profile-header">
        <div class="avatar avatar-xl" style="background:${student.avatar};">${utils.initials(student.name)}</div>
        <div class="profile-info">
          <div class="profile-name">${student.name}</div>
          <div class="profile-id">${student.id}</div>
          <div class="profile-meta">
            ${membership ? membershipStatusBadge(membership.endDate, membership.status) : `<span class="badge badge-neutral"><span class="badge-dot"></span>No Membership</span>`}
            ${seat ? `<span class="badge badge-indigo"><span class="badge-dot"></span>Seat ${seat.label}</span>` : ''}
            <span style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${student.course || '—'}</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn-secondary" onclick="openSendWhatsAppModal('${studentId}')" style="color:var(--sf-success-700);border-color:var(--sf-success-300);">
            ${icons.bell} Send WhatsApp
          </button>
          ${membership ? `
          <button class="btn btn-secondary" onclick="openPaymentModal('${studentId}', '${membership.id}')">
            ${icons['dollar-sign']} Payment
          </button>
          <button class="btn btn-secondary" onclick="openRenewModal('${studentId}', '${seat?.id}')">
            ${icons.repeat} Renew
          </button>` : ''}
          ${!assignment ? `<button class="btn btn-primary" onclick="openAssignModal(null, '${studentId}')">
            ${icons['map-pin']} Assign Seat
          </button>` : ''}
          <button class="btn btn-secondary" onclick="openEditStudentModal('${studentId}')">
            ${icons.edit} Edit
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total Paid</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Outstanding</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Attendance Days</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${presentDays}</div>
          <div class="stat-card-change neutral">of ${totalDays} recorded</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Avg. Daily Hours</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${Math.floor(avgDuration / 60)}h ${Math.floor(avgDuration % 60)}m</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        ${['overview','payments','attendance','history','communication'].map(t => `
          <button class="tab-btn ${activeTab === t ? 'active' : ''}" onclick="switchProfileTab('${t}')">${capitalizeFirst(t)}</button>
        `).join('')}
      </div>

      <div id="profile-tab-content">
        ${renderTab(activeTab)}
      </div>
    `;

    window.switchProfileTab = (tab) => {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase() === tab));
      document.getElementById('profile-tab-content').innerHTML = renderTab(tab);
    };
  }

  function renderTab(tab) {
    switch (tab) {
      case 'overview': return renderOverviewTab();
      case 'payments': return renderPaymentsTab();
      case 'attendance': return renderAttendanceTab();
      case 'history': return renderHistoryTab();
      case 'communication': return renderCommunicationTab();
      default: return '';
    }
  }

  function renderOverviewTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Personal Info -->
        <div class="card">
          <div class="card-header"><div class="card-title">Personal Information</div></div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${student.name}</div></div>
              <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${student.phone}</div></div>
              <div class="info-item"><div class="info-label">Email</div><div class="info-value">${student.email || '—'}</div></div>
              <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${student.gender || '—'}</div></div>
              <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${student.dob ? utils.formatDate(student.dob) : '—'}</div></div>
              <div class="info-item"><div class="info-label">Course</div><div class="info-value">${student.course || '—'}</div></div>
              <div class="info-item"><div class="info-label">College</div><div class="info-value">${student.college || '—'}</div></div>
              <div class="info-item"><div class="info-label">Address</div><div class="info-value">${student.address || '—'}</div></div>
              <div class="info-item"><div class="info-label">Emergency Contact</div><div class="info-value">${student.emergencyContact?.name || '—'} ${student.emergencyContact?.phone ? '· ' + student.emergencyContact.phone : ''}</div></div>
              <div class="info-item"><div class="info-label">Member Since</div><div class="info-value">${utils.formatDate(student.createdAt)}</div></div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <!-- Current Seat -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Current Seat</div>
              ${seat ? `<button class="btn btn-secondary btn-sm" onclick="app.navigate('/seat-map?roomId=${seat.roomId}&seatId=${seat.id}')">View on Map</button>` : ''}
            </div>
            <div class="card-body">
              ${seat ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Seat</div><div class="info-value"><span class="badge badge-indigo">${seat.label}</span></div></div>
                  <div class="info-item"><div class="info-label">Type</div><div class="info-value">${capitalizeFirst(seat.type)}</div></div>
                  <div class="info-item"><div class="info-label">Room</div><div class="info-value">${room?.name || '—'}</div></div>
                  <div class="info-item"><div class="info-label">Floor</div><div class="info-value">${floor?.name || '—'}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons.map}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No seat assigned</div>
                  <button class="btn btn-secondary btn-sm" onclick="openAssignModal(null, '${studentId}')">Assign Seat</button>
                </div>
              `}
            </div>
          </div>

          <!-- Membership -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Membership</div>
              ${membership ? `<button class="btn btn-primary btn-sm" onclick="openRenewModal('${studentId}', '${seat?.id}')">Renew</button>` : ''}
            </div>
            <div class="card-body">
              ${membership ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Plan</div><div class="info-value">${plan?.name || membership.planName}</div></div>
                  <div class="info-item"><div class="info-label">Status</div><div class="info-value">${membershipStatusBadge(membership.endDate, membership.status)}</div></div>
                  <div class="info-item"><div class="info-label">Start Date</div><div class="info-value">${utils.formatDate(membership.startDate)}</div></div>
                  <div class="info-item"><div class="info-label">End Date</div><div class="info-value">${utils.formatDate(membership.endDate)}</div></div>
                  <div class="info-item"><div class="info-label">Price</div><div class="info-value">${utils.formatINR(membership.price)}</div></div>
                  <div class="info-item"><div class="info-label">Payment</div><div class="info-value">${paymentStatusBadge(payStatus)}</div></div>
                  <div class="info-item"><div class="info-label">Paid</div><div class="info-value" style="color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div></div>
                  <div class="info-item"><div class="info-label">Pending</div><div class="info-value" style="color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons['credit-card']}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No active membership</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaymentsTab() {
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Payment History</div>
          ${membership ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${studentId}', '${membership.id}')">Record Payment</button>` : ''}
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Receipt</th><th>Amount</th><th>Method</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${payments.length ? payments.sort((a,b)=>new Date(b.recordedAt)-new Date(a.recordedAt)).map(p => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt)}</td>
                  <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                  <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                  <td style="color:var(--color-text-secondary);">${p.method}</td>
                  <td><span class="badge badge-success"><span class="badge-dot"></span>Recorded</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons['dollar-sign']}</div>
                  <div class="empty-title">No payments yet</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAttendanceTab() {
    const recent = [...attendanceRecords].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Attendance Record (Last 30 days)</div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-success btn-sm" onclick="doCheckIn('${studentId}')">Check In</button>
            <button class="btn btn-secondary btn-sm" onclick="doCheckOut('${studentId}')">Check Out</button>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${recent.length ? recent.map(a => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(a.date)}</td>
                  <td>${a.checkIn ? utils.formatTime(a.checkIn) : '—'}</td>
                  <td>${a.checkOut ? utils.formatTime(a.checkOut) : '—'}</td>
                  <td>${a.duration ? Math.floor(a.duration/60)+'h '+a.duration%60+'m' : '—'}</td>
                  <td>${a.status === 'checked-out' ? `<span class="badge badge-success"><span class="badge-dot"></span>Checked Out</span>` : `<span class="badge badge-indigo"><span class="badge-dot"></span>Checked In</span>`}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.clock}</div>
                  <div class="empty-title">No attendance records</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderHistoryTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Seat History -->
        <div class="card">
          <div class="card-header"><div class="card-title">Seat History</div></div>
          <div class="card-body">
            <div class="timeline">
              ${allAssignments.length ? allAssignments.map(a => {
                const s_ = store.getSeat(a.seatId);
                return `
                  <div class="timeline-item">
                    <div class="timeline-dot">${icons['map-pin']}</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Seat ${s_?.label || a.seatId}</div>
                      <div class="timeline-time">${utils.formatDate(a.startDate)} → ${a.status === 'active' ? 'Present' : utils.formatDate(a.endDate)}</div>
                      <div style="font-size:var(--text-xs);margin-top:2px;">${a.status === 'active' ? `<span class="badge badge-success">Current</span>` : `<span class="badge badge-neutral">${capitalizeFirst(a.status)}</span>`}</div>
                    </div>
                  </div>
                `;
              }).join('') : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No seat history</div>'}
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card">
          <div class="card-header"><div class="card-title">Activity Timeline</div></div>
          <div class="card-body">
            <div class="timeline">
              ${recentActivity.length ? recentActivity.map(a => `
                <div class="timeline-item">
                  <div class="timeline-dot">${icons.activity}</div>
                  <div class="timeline-content">
                    <div class="timeline-title">${a.description}</div>
                    <div class="timeline-time">${utils.formatRelative(a.timestamp)}</div>
                  </div>
                </div>
              `).join('') : `
                <div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No recent activity</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCommunicationTab() {
    const studentDocs = (store.getDocumentsForStudent ? store.getDocumentsForStudent(studentId) : []);
    const studentMsgs = (store.getNotificationMessagesForStudent ? store.getNotificationMessagesForStudent(studentId) : []);
    const optIn = student.whatsapp_opt_in !== false;
    const phoneDisplay = student.normalized_phone || student.phone;

    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <!-- WhatsApp Profile & Preferences Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication Status</div>
              <div class="card-subtitle">Consent, registered phone, and automated dispatch settings</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openSendWhatsAppModal('${studentId}')">
              ${icons.bell} Send Message
            </button>
          </div>
          <div class="card-body">
            <div class="grid-3" style="gap:var(--space-4);align-items:stretch;">
              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Registered WhatsApp Phone</div>
                <div style="font-size:var(--text-base);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-top:var(--space-2);display:flex;align-items:center;gap:var(--space-2);">
                  <span>${phoneDisplay}</span>
                  <span class="badge badge-success" style="font-size:10px;">E.164</span>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">Primary delivery destination</div>
              </div>

              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Delivery Consent</div>
                <div style="margin-top:var(--space-2);display:flex;align-items:center;justify-content:space-between;">
                  <span class="badge ${optIn ? 'badge-success' : 'badge-neutral'}">
                    <span class="badge-dot"></span>${optIn ? 'Opted In' : 'Opted Out'}
                  </span>
                  <button class="btn btn-ghost btn-sm" onclick="toggleWhatsAppOptIn('${studentId}')">
                    ${optIn ? 'Revoke' : 'Opt In'}
                  </button>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${optIn ? 'Consented to receive automated messages' : 'Messages will be suppressed'}</div>
              </div>

              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Language Preference</div>
                <div style="font-size:var(--text-base);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-top:var(--space-2);">
                  ${student.preferred_language === 'hi' ? 'हिन्दी (Hindi)' : student.preferred_language === 'mr' ? 'मराठी (Marathi)' : 'English (en)'}
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">Template locale</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generated Documents (Invoices & Receipts) -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Generated Documents & Tax Invoices</div>
              <div class="card-subtitle">Official printable tax invoices and payment receipts</div>
            </div>
            <span class="badge badge-indigo">${studentDocs.length} Total</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Doc Number</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${studentDocs.map(d => `
                  <tr>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-semibold);color:var(--sf-indigo-600);">${d.documentNumber}</span></td>
                    <td><span class="badge ${d.type === 'invoice' ? 'badge-indigo' : 'badge-success'}">${d.type === 'invoice' ? 'Tax Invoice' : 'Payment Receipt'}</span></td>
                    <td style="color:var(--color-text-secondary);">${utils.formatDate(d.createdAt)}</td>
                    <td style="font-weight:var(--fw-semibold);">${utils.formatINR(d.amount)}</td>
                    <td><span class="badge badge-success"><span class="badge-dot"></span>${d.status.toUpperCase()}</span></td>
                    <td>
                      <div style="display:flex;gap:var(--space-2);">
                        <button class="btn btn-secondary btn-sm" onclick="invoiceGenerator.previewDocument('${d.id}')">
                          ${icons.eye} View
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="invoiceGenerator.printDocument('${d.id}')">
                          ${icons.fileText} Print
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') || `
                  <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-6);"><div class="empty-title" style="font-size:var(--text-sm);">No documents generated yet</div></div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- WhatsApp Dispatch & Delivery Logs -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication History</div>
              <div class="card-subtitle">Automated event triggers, reminders, and delivery timeline</div>
            </div>
            <span class="badge badge-success">${studentMsgs.length} Dispatches</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Message Preview</th>
                  <th>Status</th>
                  <th>Dispatched At</th>
                  <th>Idempotency Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${studentMsgs.map(m => {
                  const badgeClass = m.status === 'delivered' ? 'badge-success' : m.status === 'failed' ? 'badge-error' : m.status === 'skipped' ? 'badge-neutral' : 'badge-indigo';
                  return `
                    <tr>
                      <td><span class="badge badge-indigo" style="font-size:11px;">${m.eventType}</span></td>
                      <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--text-xs);color:var(--color-text-secondary);" title="${m.content}">
                        ${m.content}
                      </td>
                      <td><span class="badge ${badgeClass}" style="font-size:11px;"><span class="badge-dot"></span>${m.status.toUpperCase()}</span></td>
                      <td style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${utils.formatDate(m.createdAt, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td><span style="font-family:var(--font-mono);font-size:10px;color:var(--color-text-tertiary);">${m.idempotencyKey || '—'}</span></td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="retryStudentWhatsAppMessage('${m.id}')">
                          ${icons.repeat} Resend
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('') || `
                  <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-6);"><div class="empty-title" style="font-size:var(--text-sm);">No WhatsApp dispatches recorded</div></div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  window.doCheckIn = function(studentId) {
    try {
      store.checkIn(studentId);
      toast.show('Student checked in!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.doCheckOut = function(studentId) {
    try {
      store.checkOut(studentId);
      toast.show('Student checked out!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.openEditStudentModal = function(studentId) {
    const s = store.getStudent(studentId);
    modal.open('Edit Student', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="input" id="edit-name" value="${s.name}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="edit-phone" value="${s.phone}"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="edit-email" value="${s.email || ''}"></div>
          <div class="form-group">
            <label class="form-label">Notification Language</label>
            <select class="select" id="edit-lang">
              <option value="en" ${s.preferred_language === 'en' ? 'selected' : ''}>English</option>
              <option value="hi" ${s.preferred_language === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
              <option value="mr" ${s.preferred_language === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Course</label><input type="text" class="input" id="edit-course" value="${s.course || ''}"></div>
        <div class="form-group"><label class="form-label">Address</label><input type="text" class="input" id="edit-address" value="${s.address || ''}"></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmEditStudent('${studentId}')">Save Changes</button>
    `);
  };

  window.confirmEditStudent = function(studentId) {
    const name = document.getElementById('edit-name')?.value?.trim();
    const phone = document.getElementById('edit-phone')?.value?.trim();
    const lang = document.getElementById('edit-lang')?.value || 'en';
    if (!name || !phone) { toast.show('Name and phone are required', 'error'); return; }
    
    const countryCode = '+91';
    const normalized = (window.utils && window.utils.normalizePhone) ? window.utils.normalizePhone(phone, countryCode) : (countryCode + phone.replace(/\D/g, ''));
    
    store.updateStudent(studentId, {
      name,
      phone,
      normalized_phone: normalized,
      preferred_language: lang,
      email: document.getElementById('edit-email')?.value?.trim(),
      course: document.getElementById('edit-course')?.value?.trim(),
      address: document.getElementById('edit-address')?.value?.trim(),
    });
    modal.close();
    toast.show('Student updated!', 'success');
    render();
  };

  window.toggleWhatsAppOptIn = function(studentId) {
    const s = store.getStudent(studentId);
    if (!s) return;
    const current = s.whatsapp_opt_in !== false;
    store.updateStudent(studentId, {
      whatsapp_opt_in: !current,
      whatsapp_opt_in_at: !current ? new Date().toISOString() : null
    });
    toast.show(`WhatsApp status updated: ${!current ? 'Opted In' : 'Opted Out'}`, 'info');
    render();
  };

  window.retryStudentWhatsAppMessage = function(messageId) {
    if (window.notificationService && window.notificationService.retryFailedMessage) {
      window.notificationService.retryFailedMessage(messageId).then(res => {
        toast.show('Message resent via WhatsApp provider!', 'success');
        render();
      }).catch(err => {
        toast.show(err.message, 'error');
      });
    } else {
      toast.show('Message re-queued for delivery', 'info');
      render();
    }
  };

  window.openSendWhatsAppModal = function(studentId) {
    const s = store.getStudent(studentId);
    if (!s) return;

    modal.open(`Send WhatsApp to ${s.name}`, `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);">
          <div>Recipient: <strong>${s.name}</strong> (${s.normalized_phone || s.phone})</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;">
            Status: ${s.whatsapp_opt_in !== false ? '<span style="color:var(--sf-success-600);font-weight:600;">Consented</span>' : '<span style="color:var(--sf-warning-600);font-weight:600;">Opted Out</span>'}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Template / Notification Type <span class="required">*</span></label>
          <select class="select" id="custom-wa-template" onchange="updateCustomWaPreview('${studentId}', this.value)">
            <option value="GENERAL_NOTICE">General Notice / Alert</option>
            <option value="PAYMENT_REMINDER">Fee Due Reminder</option>
            <option value="EXPIRY_REMINDER">Membership Expiry Notice</option>
            <option value="HOLIDAY_ANNOUNCEMENT">Holiday / Schedule Notice</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Message Content Preview</label>
          <textarea class="textarea" id="custom-wa-content" rows="4">Hello ${s.name}, this is an official update from your study library.</textarea>
          <div class="form-hint">Variables and library contact details will be automatically included.</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmSendCustomWhatsApp('${studentId}')">
        ${icons.bell} Send via WhatsApp
      </button>
    `);

    window.updateCustomWaPreview = (sId, templateType) => {
      const stud = store.getStudent(sId);
      const ta = document.getElementById('custom-wa-content');
      if (!ta || !stud) return;
      if (templateType === 'PAYMENT_REMINDER') {
        ta.value = `Hello ${stud.name}, this is a gentle reminder that your membership fee is pending. Kindly clear your dues to ensure uninterrupted access.`;
      } else if (templateType === 'EXPIRY_REMINDER') {
        ta.value = `Hello ${stud.name}, your study library membership will expire soon. Please renew your seat promptly.`;
      } else if (templateType === 'HOLIDAY_ANNOUNCEMENT') {
        ta.value = `Dear ${stud.name}, please note that the study library will remain closed tomorrow for scheduled maintenance. Thank you.`;
      } else {
        ta.value = `Hello ${stud.name}, this is an official update from your study library.`;
      }
    };
  };

  window.confirmSendCustomWhatsApp = function(studentId) {
    const s = store.getStudent(studentId);
    const content = document.getElementById('custom-wa-content')?.value?.trim();
    if (!content) { toast.show('Message content cannot be empty', 'error'); return; }

    if (window.notificationService) {
      window.notificationService.queueMessage({
        studentId: s.id,
        phone: s.normalized_phone || s.phone,
        eventType: 'CUSTOM_NOTICE',
        templateName: 'custom_notice',
        content,
        metadata: { custom: true }
      });
      modal.close();
      toast.show(`WhatsApp notice queued for ${s.name}!`, 'success');
      render();
    }
  };

  render();
}
