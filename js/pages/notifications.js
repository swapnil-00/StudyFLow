// js/pages/notifications.js — WhatsApp Reminders & System Alerts
// 1-Click manual reminders for fee dues, overdues, expiries, and announcements.
// No Meta Cloud API, no bulk automated spam.

export function renderNotifications(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const escAttr = (s) => (typeof window !== 'undefined' && window.escapeAttr ? window.escapeAttr(s) : String(s == null ? '' : s));

  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const branchName = branch?.name || 'StudyFlow Library';
  const waSub = (store.organization && store.organization.subscription) || { whatsappMode: store.organization?.whatsappMode || 'manual', autoLabel: 'Manual', autoReason: '' };

  let currentTab = 'payment_due'; // 'payment_due' | 'payment_overdue' | 'expiring' | 'announcements' | 'alerts'
  let searchQuery = '';

  // In-memory or session tracking for "Mark as sent" in current session
  if (!window._sf_sent_reminders) {
    window._sf_sent_reminders = new Set();
  }

  function isReminderSent(uniqueKey) {
    return window._sf_sent_reminders.has(uniqueKey);
  }

  function setReminderSent(uniqueKey, sent = true) {
    if (sent) {
      window._sf_sent_reminders.add(uniqueKey);
    } else {
      window._sf_sent_reminders.delete(uniqueKey);
    }
  }

  function getDueItems() {
    const dues = (store.getPendingDues ? store.getPendingDues(branchId) : []) || [];
    const todayStr = utils.today();

    const dueList = [];
    const overdueList = [];

    dues.forEach(d => {
      const student = d.student || store.getStudent(d.studentId);
      const membership = d.membership || store.getMembership(d.membershipId);
      if (!student) return;

      const assignment = store.getStudentAssignment(student.id);
      const seat = assignment ? store.getSeat(assignment.seatId) : null;
      const dueDate = membership?.endDate || todayStr;
      const isOverdue = dueDate < todayStr;
      const pendingAmt = d.pendingAmount || store.getPendingAmount(membership?.id || d.id) || 0;

      if (pendingAmt <= 0) return;

      const item = {
        id: `due_${student.id}_${membership?.id || ''}`,
        student,
        membership,
        seat,
        amountDue: pendingAmt,
        dueDate,
        isOverdue,
        phone: student.phone || student.normalized_phone || '—',
        optIn: student.whatsapp_opt_in !== false
      };

      if (isOverdue) {
        overdueList.push(item);
      } else {
        dueList.push(item);
      }
    });

    return { dueList, overdueList };
  }

  function getExpiringItems() {
    const expiring = (store.getExpiringMemberships ? store.getExpiringMemberships(branchId, 7) : []) || [];
    return expiring.map(e => {
      const student = e.student || store.getStudent(e.studentId);
      const membership = e.membership || store.getMembership(e.membershipId || e.id);
      const assignment = student ? store.getStudentAssignment(student.id) : null;
      const seat = assignment ? store.getSeat(assignment.seatId) : null;
      const plan = membership ? store.getMembershipPlan(membership.planId) : null;
      const daysLeft = membership ? utils.daysUntil(membership.endDate) : 0;

      return {
        id: `exp_${student?.id}_${membership?.id || ''}`,
        student,
        membership,
        seat,
        plan,
        daysLeft,
        endDate: membership?.endDate,
        phone: student?.phone || student?.normalized_phone || '—',
        optIn: student?.whatsapp_opt_in !== false
      };
    }).filter(e => Boolean(e.student));
  }

  function getAnnouncementRecipients(groupFilter = 'all') {
    const students = store.getStudents(branchId).filter(s => s.status !== 'inactive');
    if (groupFilter === 'all') return students;
    if (groupFilter === 'dues') {
      const { dueList, overdueList } = getDueItems();
      const ids = new Set([...dueList, ...overdueList].map(d => d.student.id));
      return students.filter(s => ids.has(s.id));
    }
    if (groupFilter === 'expiring') {
      const exp = getExpiringItems();
      const ids = new Set(exp.map(e => e.student.id));
      return students.filter(s => ids.has(s.id));
    }
    return students;
  }

  function render() {
    const { dueList, overdueList } = getDueItems();
    const expiringList = getExpiringItems();
    const systemNotifs = store.getNotifications(branchId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadAlerts = systemNotifs.filter(n => !n.read).length;

    const filterSearch = (list) => {
      if (!searchQuery) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(item => {
        const name = item.student?.name || '';
        const phone = item.phone || '';
        return name.toLowerCase().includes(q) || phone.includes(q);
      });
    };

    const currentDueList = filterSearch(dueList);
    const currentOverdueList = filterSearch(overdueList);
    const currentExpiringList = filterSearch(expiringList);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">WhatsApp Reminders</h1>
            <p class="page-subtitle">${waSub.whatsappMode === 'automatic'
              ? 'Fee and expiry reminders are sent automatically every morning. Use this page for anything extra.'
              : '1-click manual WhatsApp reminders, dues alerts, and member announcements'}</p>
          </div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-secondary" id="btn-send-next-reminder" style="color:var(--sf-success-700);border-color:var(--sf-success-300);">
              💬 Send Next Unsent
            </button>
            <button class="btn btn-primary" id="btn-open-announcement-modal">
              ${icons.bell || ''} Create Announcement
            </button>
          </div>
        </div>
      </div>

      <!-- Notification mode (from the subscription; the server decides) -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;margin-bottom:var(--space-5);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);background:var(--color-bg-secondary);font-size:13px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:600;color:var(--color-text-secondary);">Notification mode</span>
          <span class="badge ${waSub.whatsappMode === 'automatic' ? 'badge-success' : (waSub.autoStatus === 'expired' || waSub.autoStatus === 'payment_failed') ? 'badge-danger' : 'badge-neutral'}">${esc(waSub.autoLabel || 'Manual')}</span>
          <span style="color:var(--color-text-tertiary);">${esc(waSub.autoReason || '')}</span>
        </div>
        ${(store.currentUser?.role || 'owner') === 'owner' && !store.organization?.isDemo
          ? `<button class="btn btn-secondary btn-sm" onclick="app.navigate('/billing')">${waSub.whatsappMode === 'automatic' ? 'Manage' : 'Turn on automatic'}</button>` : ''}
      </div>

      <!-- Overview Cards -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card" style="cursor:pointer;" onclick="switchTab('payment_due')">
          <div class="stat-card-top"><div class="stat-card-label">Payment Due</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-indigo-600);">${dueList.length}</div>
          <div class="stat-card-change neutral">Pending upcoming dues</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="switchTab('payment_overdue')">
          <div class="stat-card-top"><div class="stat-card-label">Overdue</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${overdueList.length}</div>
          <div class="stat-card-change negative">Immediate payment needed</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="switchTab('expiring')">
          <div class="stat-card-top"><div class="stat-card-label">Expiring in 7 Days</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-warning-600);">${expiringList.length}</div>
          <div class="stat-card-change neutral">Seats up for renewal</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="switchTab('alerts')">
          <div class="stat-card-top"><div class="stat-card-label">System Alerts</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:${unreadAlerts > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${unreadAlerts}</div>
          <div class="stat-card-change neutral">Internal notifications</div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-3);">
        <div class="tabs" style="margin-bottom:0;border-bottom:none;">
          <button class="tab-btn ${currentTab === 'payment_due' ? 'active' : ''}" onclick="switchTab('payment_due')">
            Payment Due (${dueList.length})
          </button>
          <button class="tab-btn ${currentTab === 'payment_overdue' ? 'active' : ''}" onclick="switchTab('payment_overdue')">
            Overdue (${overdueList.length})
          </button>
          <button class="tab-btn ${currentTab === 'expiring' ? 'active' : ''}" onclick="switchTab('expiring')">
            Expiring in 7 Days (${expiringList.length})
          </button>
          <button class="tab-btn ${currentTab === 'announcements' ? 'active' : ''}" onclick="switchTab('announcements')">
            Announcements
          </button>
          <button class="tab-btn ${currentTab === 'alerts' ? 'active' : ''}" onclick="switchTab('alerts')">
            System Alerts (${unreadAlerts})
          </button>
        </div>

        ${currentTab !== 'alerts' && currentTab !== 'announcements' ? `
          <div class="input-group" style="width:260px;margin-bottom:var(--space-2);">
            <div class="input-group-prefix">${icons.search || '🔍'}</div>
            <input class="input" type="text" placeholder="Search student or phone..." value="${escAttr(searchQuery)}" id="reminders-search-input">
          </div>
        ` : ''}
      </div>

      <!-- Tab Content Area -->
      <div id="reminders-tab-container">
        ${currentTab === 'payment_due' ? renderDuesTable(currentDueList, 'payment_due') : ''}
        ${currentTab === 'payment_overdue' ? renderDuesTable(currentOverdueList, 'payment_overdue') : ''}
        ${currentTab === 'expiring' ? renderExpiringTable(currentExpiringList) : ''}
        ${currentTab === 'announcements' ? renderAnnouncementsView() : ''}
        ${currentTab === 'alerts' ? renderAlertsView(systemNotifs, unreadAlerts) : ''}
      </div>
    `;

    // Attach search input listener
    const searchInput = document.getElementById('reminders-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        render();
      });
    }

    // Attach "Send Next" button listener
    const btnSendNext = document.getElementById('btn-send-next-reminder');
    if (btnSendNext) {
      btnSendNext.addEventListener('click', () => {
        handleSendNext();
      });
    }

    // Attach "Create Announcement" button listener
    const btnAnnouncement = document.getElementById('btn-open-announcement-modal');
    if (btnAnnouncement) {
      btnAnnouncement.addEventListener('click', () => {
        openAnnouncementModal();
      });
    }
  }

  function renderDuesTable(items, templateKey) {
    const isOverdue = templateKey === 'payment_overdue';
    return `
      <div class="table-container">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th style="width:50px;">Sent</th>
                <th>Student</th>
                <th>Phone</th>
                <th>Seat</th>
                <th>Amount Due</th>
                <th>Due Date</th>
                <th>Consent</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const isSent = isReminderSent(item.id);
                return `
                  <tr style="${isSent ? 'opacity:0.6;background:var(--color-bg-secondary);' : ''}">
                    <td>
                      <input type="checkbox" style="accent-color:var(--sf-indigo-600);cursor:pointer;" ${isSent ? 'checked' : ''} onchange="toggleSentState('${escAttr(item.id)}', this.checked)">
                    </td>
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${item.student.avatar || 'var(--sf-gray-400)'};">${utils.initials(item.student.name)}</div>
                        <div>
                          <div class="student-name" style="cursor:pointer;" onclick="app.navigate('/student', { id: '${item.student.id}' })">${esc(item.student.name)}</div>
                          <div class="student-id">${esc(item.student.email || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);">${esc(item.phone)}</span></td>
                    <td><span class="badge badge-neutral" style="font-size:11px;">${esc(item.seat?.label || '—')}</span></td>
                    <td><span style="font-weight:var(--fw-bold);color:${isOverdue ? 'var(--sf-error-600)' : 'var(--sf-indigo-600)'};">${utils.formatINR(item.amountDue)}</span></td>
                    <td style="font-size:var(--text-xs);color:${isOverdue ? 'var(--sf-error-600)' : 'var(--color-text-secondary)'};font-weight:${isOverdue ? '600' : 'normal'};">
                      ${utils.formatDate(item.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span class="badge ${item.optIn ? 'badge-success' : 'badge-warning'}" style="font-size:10px;">
                        <span class="badge-dot"></span>${item.optIn ? 'Consented' : 'Opted Out'}
                      </span>
                    </td>
                    <td style="text-align:right;">
                      <button class="btn ${isSent ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="sendDueMessage('${escAttr(item.student.id)}', '${escAttr(item.membership?.id || '')}', '${escAttr(templateKey)}', ${item.amountDue}, '${escAttr(item.dueDate)}', '${escAttr(item.id)}')">
                        💬 ${isSent ? 'Resend' : 'Send'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);"><div class="empty-title">No ${isOverdue ? 'overdue dues' : 'pending dues'} at this time!</div></div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderExpiringTable(items) {
    return `
      <div class="table-container">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th style="width:50px;">Sent</th>
                <th>Student</th>
                <th>Phone</th>
                <th>Seat</th>
                <th>Plan</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Consent</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const isSent = isReminderSent(item.id);
                return `
                  <tr style="${isSent ? 'opacity:0.6;background:var(--color-bg-secondary);' : ''}">
                    <td>
                      <input type="checkbox" style="accent-color:var(--sf-indigo-600);cursor:pointer;" ${isSent ? 'checked' : ''} onchange="toggleSentState('${escAttr(item.id)}', this.checked)">
                    </td>
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${item.student.avatar || 'var(--sf-gray-400)'};">${utils.initials(item.student.name)}</div>
                        <div>
                          <div class="student-name" style="cursor:pointer;" onclick="app.navigate('/student', { id: '${item.student.id}' })">${esc(item.student.name)}</div>
                          <div class="student-id">${esc(item.student.email || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);">${esc(item.phone)}</span></td>
                    <td><span class="badge badge-neutral" style="font-size:11px;">${esc(item.seat?.label || '—')}</span></td>
                    <td><span style="font-size:var(--text-xs);color:var(--color-text-secondary);">${esc(item.plan?.name || 'Membership')}</span></td>
                    <td style="font-size:var(--text-xs);color:var(--sf-warning-700);font-weight:600;">
                      ${utils.formatDate(item.endDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span class="badge badge-warning" style="font-size:11px;font-weight:700;">
                        ${item.daysLeft <= 0 ? 'Expires Today' : `${item.daysLeft} days left`}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${item.optIn ? 'badge-success' : 'badge-warning'}" style="font-size:10px;">
                        <span class="badge-dot"></span>${item.optIn ? 'Consented' : 'Opted Out'}
                      </span>
                    </td>
                    <td style="text-align:right;">
                      <button class="btn ${isSent ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="sendExpiringMessage('${escAttr(item.student.id)}', '${escAttr(item.id)}')">
                        💬 ${isSent ? 'Resend' : 'Send'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="9"><div class="empty-state" style="padding:var(--space-8);"><div class="empty-title">No memberships expiring in the next 7 days!</div></div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAnnouncementsView() {
    const students = getAnnouncementRecipients('all');
    return `
      <div class="card" style="max-width:800px;margin:0 auto;">
        <div class="card-header">
          <div>
            <div class="card-title">📢 Member Announcements</div>
            <div class="card-subtitle">Compose a message and work through student recipients one-by-one</div>
          </div>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-xs);line-height:1.5;color:var(--color-text-secondary);">
            ⚠️ <strong>Notice:</strong> WhatsApp Web requires 1 click per recipient to open the chat window with your pre-filled message. Keep batches small (&lt; 50) to protect your WhatsApp account from anti-spam rate limits.
          </div>

          <div class="form-group">
            <label class="form-label">Target Audience</label>
            <select class="select" id="ann-audience-select" onchange="updateAnnouncementRecipientCount(this.value)">
              <option value="all">All Active Students in Branch (${students.length})</option>
              <option value="dues">Students with Pending Dues</option>
              <option value="expiring">Students Expiring Soon (&lt; 7 Days)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Announcement Message</label>
            <textarea class="textarea" id="ann-message-text" rows="4" placeholder="Dear Students, please note that the reading hall will remain open on Sunday..."></textarea>
            <div class="form-hint">Tip: Use placeholders like <code>{{student_name}}</code> to personalize each message.</div>
          </div>

          <button class="btn btn-primary" onclick="startAnnouncementBatch()">
            🚀 Start Sending Announcements (1-by-1)
          </button>
        </div>
      </div>
    `;
  }

  function renderAlertsView(systemNotifs, unreadAlerts) {
    return `
      <div style="margin-top:var(--space-2);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-3);">
          ${unreadAlerts > 0 ? `<button class="btn btn-secondary btn-sm" onclick="markAllAlertsRead()">${icons.check || '✓'} Mark All Read</button>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          ${systemNotifs.map(n => `
            <div style="background:${n.read ? 'var(--color-bg-primary)' : 'var(--sf-indigo-50)'};border:1px solid ${n.read ? 'var(--color-border-secondary)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);display:flex;align-items:flex-start;gap:var(--space-4);cursor:pointer;"
              onclick="readNotifItem('${n.id}')"
            >
              <div style="width:36px;height:36px;border-radius:var(--radius-lg);background:rgba(97,114,243,0.1);color:var(--sf-indigo-600);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${icons[n.icon] || icons.bell || '🔔'}
              </div>
              <div style="flex:1;">
                <div style="font-size:var(--text-sm);${n.read ? '' : 'font-weight:var(--fw-semibold);'}color:var(--color-text-primary);">${esc(n.message)}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${utils.formatRelative(n.createdAt)}</div>
              </div>
              ${!n.read ? `<div style="width:8px;height:8px;background:var(--sf-indigo-500);border-radius:50%;flex-shrink:0;margin-top:var(--space-1);"></div>` : ''}
            </div>
          `).join('') || `
            <div class="empty-state" style="margin-top:var(--space-8);">
              <div class="empty-title">All caught up!</div>
              <div class="empty-desc">No unread system alerts.</div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // --- Actions & Helpers ---

  window.switchTab = function(tab) {
    currentTab = tab;
    render();
  };

  window.toggleSentState = function(key, isChecked) {
    setReminderSent(key, isChecked);
    render();
  };

  window.sendDueMessage = function(studentId, membershipId, templateKey, amountDue, dueDate, itemKey) {
    const student = store.getStudent(studentId);
    if (!student) return;
    const assignment = store.getStudentAssignment(studentId);
    const seat = assignment ? store.getSeat(assignment.seatId) : null;
    const formattedDueDate = utils.formatDate(dueDate, { day: '2-digit', month: 'short', year: 'numeric' });

    if (typeof whatsappManual !== 'undefined') {
      whatsappManual.openComposer({
        studentId,
        templateKey,
        variables: {
          student_name: student.name,
          amount_due: amountDue.toLocaleString('en-IN'),
          seat_number: seat?.label || seat?.number || 'your seat',
          due_date: formattedDueDate
        },
        onSent: () => {
          if (itemKey) setReminderSent(itemKey, true);
          render();
        }
      });
    }
  };

  window.sendExpiringMessage = function(studentId, itemKey) {
    const student = store.getStudent(studentId);
    if (!student) return;
    const assignment = store.getStudentAssignment(studentId);
    const seat = assignment ? store.getSeat(assignment.seatId) : null;
    const membership = store.getActiveMembership(studentId);
    const plan = membership ? store.getMembershipPlan(membership.planId) : null;
    const daysLeft = membership ? utils.daysUntil(membership.endDate) : 0;
    const formattedEndDate = utils.formatDate(membership?.endDate || utils.today(), { day: '2-digit', month: 'short', year: 'numeric' });

    if (typeof whatsappManual !== 'undefined') {
      whatsappManual.openComposer({
        studentId,
        templateKey: 'membership_expiring',
        variables: {
          student_name: student.name,
          plan_name: plan?.name || 'Membership',
          seat_number: seat?.label || seat?.number || 'your seat',
          end_date: formattedEndDate,
          days_left: String(daysLeft)
        },
        onSent: () => {
          if (itemKey) setReminderSent(itemKey, true);
          render();
        }
      });
    }
  };

  function handleSendNext() {
    if (currentTab === 'payment_due' || currentTab === 'payment_overdue') {
      const { dueList, overdueList } = getDueItems();
      const list = currentTab === 'payment_due' ? dueList : overdueList;
      const nextItem = list.find(item => !isReminderSent(item.id) && item.optIn);
      if (!nextItem) {
        toast.show('All reminders in this list have been sent or opted out!', 'info');
        return;
      }
      sendDueMessage(nextItem.student.id, nextItem.membership?.id || '', currentTab, nextItem.amountDue, nextItem.dueDate, nextItem.id);
    } else if (currentTab === 'expiring') {
      const expiringList = getExpiringItems();
      const nextItem = expiringList.find(item => !isReminderSent(item.id) && item.optIn);
      if (!nextItem) {
        toast.show('All expiring notices have been sent or opted out!', 'info');
        return;
      }
      sendExpiringMessage(nextItem.student.id, nextItem.id);
    } else {
      toast.show('Please switch to Payment Due, Overdue, or Expiring tab to send reminders.', 'info');
    }
  }

  function openAnnouncementModal() {
    const students = getAnnouncementRecipients('all');
    modal.open('Compose Announcement', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-xs);line-height:1.5;color:var(--color-text-secondary);">
          💡 <strong>Manual Delivery:</strong> Each announcement opens directly in WhatsApp Web for 1-click delivery from your computer.
        </div>

        <div class="form-group">
          <label class="form-label">Recipient Group <span class="required">*</span></label>
          <select class="select" id="modal-ann-audience" onchange="const cnt = document.getElementById('modal-ann-count'); if(cnt) cnt.textContent = this.value === 'all' ? '${students.length}' : 'Selected';">
            <option value="all">All Active Students (${students.length})</option>
            <option value="dues">Students with Pending Dues</option>
            <option value="expiring">Students Expiring Soon</option>
          </select>
          <div class="form-hint">Total eligible recipients: <strong id="modal-ann-count">${students.length}</strong></div>
        </div>

        <div class="form-group">
          <label class="form-label">Message Content <span class="required">*</span></label>
          <textarea class="textarea" id="modal-ann-text" rows="5" placeholder="Dear Students, please note that..."></textarea>
          <div class="form-hint">Placeholders: <code>{{student_name}}</code>, <code>{{branch_name}}</code></div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" id="btn-start-modal-ann">Start Sending</button>
    `);

    document.getElementById('btn-start-modal-ann')?.addEventListener('click', () => {
      const aud = document.getElementById('modal-ann-audience')?.value || 'all';
      const text = document.getElementById('modal-ann-text')?.value?.trim();
      if (!text) { toast.show('Please enter message content', 'error'); return; }

      const targetStudents = getAnnouncementRecipients(aud).filter(s => s.whatsapp_opt_in !== false);
      if (!targetStudents.length) { toast.show('No consented recipients found in this group', 'warning'); return; }

      if (targetStudents.length > 50) {
        toast.show(`Notice: Batch contains ${targetStudents.length} students. Sending more than 50 messages rapidly may trigger WhatsApp limits.`, 'warning', 6000);
      }

      modal.close();

      // Launch announcement queue
      let currentIndex = 0;
      function openNextAnnouncement() {
        if (currentIndex >= targetStudents.length) {
          toast.show('Finished sending announcements to all recipients!', 'success');
          return;
        }
        const student = targetStudents[currentIndex];
        currentIndex++;

        if (typeof whatsappManual !== 'undefined') {
          whatsappManual.openComposer({
            studentId: student.id,
            templateKey: 'custom',
            variables: {
              student_name: student.name,
              branch_name: branchName,
              message: text
            },
            onSent: () => {
              if (currentIndex < targetStudents.length) {
                setTimeout(() => {
                  toast.show(`Announcement ${currentIndex}/${targetStudents.length} sent! Ready for next recipient.`, 'info');
                }, 400);
              }
            }
          });
        }
      }

      openNextAnnouncement();
    });
  }

  window.readNotifItem = function(id) {
    store.markNotificationRead(id);
    if (app._updateNotifBadge) app._updateNotifBadge();
    render();
  };

  window.markAllAlertsRead = function() {
    store.markAllRead();
    toast.show('All alerts marked as read', 'success');
    render();
  };

  render();
}
