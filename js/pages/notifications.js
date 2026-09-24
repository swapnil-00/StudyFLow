// Communication Center (WhatsApp Automation & System Notifications)
export function renderNotifications(container) {
  const branchId = store.getActiveBranchId();
  const systemNotifs = store.getNotifications(branchId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadAlerts = systemNotifs.filter(n => !n.read).length;

  const waMessages = (store.getNotificationMessages ? store.getNotificationMessages() : []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const deliveredCount = waMessages.filter(m => m.status === 'delivered').length;
  const queuedCount = waMessages.filter(m => m.status === 'queued' || m.status === 'sent').length;
  const failedCount = waMessages.filter(m => m.status === 'failed').length;

  let currentTab = 'whatsapp';
  let waFilter = 'all';
  let waSearch = '';

  function getFilteredMessages() {
    return waMessages.filter(m => {
      const matchFilter = waFilter === 'all' || m.status === waFilter;
      const q = waSearch.toLowerCase();
      const student = store.getStudent(m.studentId);
      const matchSearch = !q ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.eventType && m.eventType.toLowerCase().includes(q)) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        (student && student.name.toLowerCase().includes(q)) ||
        (m.metadata?.receiptNumber && m.metadata.receiptNumber.toLowerCase().includes(q)) ||
        (m.metadata?.invoiceNumber && m.metadata.invoiceNumber.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Communication Center</h1>
            <p class="page-subtitle">WhatsApp automation triggers, invoice dispatches, delivery logs & system alerts</p>
          </div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-secondary" onclick="triggerRunReminders()">
              ${icons.repeat} Run Automated Reminders
            </button>
            <button class="btn btn-primary" onclick="openBroadcastWhatsAppModal()">
              ${icons.bell} Send WhatsApp Notice
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total Dispatched</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-indigo-600);">${waMessages.length}</div>
          <div class="stat-card-change neutral">WhatsApp messages logged</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Delivered</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${deliveredCount}</div>
          <div class="stat-card-change positive">${waMessages.length ? Math.round((deliveredCount/waMessages.length)*100) : 100}% delivery rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Queued / In Flight</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-warning-600);">${queuedCount}</div>
          <div class="stat-card-change neutral">Pending async dispatch</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Unread System Alerts</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:${unreadAlerts > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${unreadAlerts}</div>
          <div class="stat-card-change neutral">Internal staff alerts</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:0;">
        <button class="tab-btn ${currentTab === 'whatsapp' ? 'active' : ''}" onclick="switchCommTab('whatsapp')">
          WhatsApp Messages (${waMessages.length})
        </button>
        <button class="tab-btn ${currentTab === 'alerts' ? 'active' : ''}" onclick="switchCommTab('alerts')">
          System Alerts (${unreadAlerts} unread)
        </button>
      </div>

      <div id="comm-tab-content">
        ${currentTab === 'whatsapp' ? renderWhatsAppTab() : renderAlertsTab()}
      </div>
    `;
  }

  function renderWhatsAppTab() {
    const list = getFilteredMessages();
    return `
      <div class="table-container">
        <div class="table-header">
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
            ${['all', 'delivered', 'sent', 'queued', 'failed', 'skipped'].map(f => `
              <button class="btn btn-sm ${waFilter === f ? 'btn-primary' : 'btn-secondary'}" onclick="setWaFilter('${f}')">
                ${capitalizeFirst(f)}
              </button>
            `).join('')}
          </div>
          <div class="input-group" style="width:260px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search student, phone, event..." value="${waSearch}"
              oninput="handleWaSearch(this.value)">
          </div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Trigger Event</th>
                <th>Message Content</th>
                <th>Attached Doc</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.slice(0, 50).map(m => {
                const student = store.getStudent(m.studentId);
                const badgeClass = m.status === 'delivered' ? 'badge-success' : m.status === 'failed' ? 'badge-error' : m.status === 'skipped' ? 'badge-neutral' : 'badge-indigo';
                return `
                  <tr style="cursor:pointer;" onclick="showWhatsAppDetails('${m.id}')">
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${student?.avatar || 'var(--sf-gray-400)'};">${utils.initials(student?.name || 'WA')}</div>
                        <div>
                          <div class="student-name">${student?.name || 'General Notification'}</div>
                          <div class="student-id">${m.studentId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);">${m.phone}</span></td>
                    <td><span class="badge badge-indigo" style="font-size:11px;">${m.eventType}</span></td>
                    <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--text-xs);color:var(--color-text-secondary);" title="${m.content}">
                      ${m.content}
                    </td>
                    <td onclick="event.stopPropagation()">
                      ${m.metadata?.documentId ? `
                        <button class="btn btn-ghost btn-sm" onclick="invoiceGenerator.previewDocument('${m.metadata.documentId}')" title="Preview Attached Document">
                          ${icons.fileText} ${m.metadata.invoiceNumber || m.metadata.receiptNumber || 'View Doc'}
                        </button>
                      ` : '<span style="color:var(--color-text-quaternary);font-size:var(--text-xs);">None</span>'}
                    </td>
                    <td><span class="badge ${badgeClass}" style="font-size:11px;"><span class="badge-dot"></span>${m.status.toUpperCase()}</span></td>
                    <td style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${utils.formatDate(m.createdAt, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    <td onclick="event.stopPropagation()">
                      <div style="display:flex;gap:var(--space-2);">
                        <button class="btn btn-ghost btn-sm" onclick="showWhatsAppDetails('${m.id}')" title="View Payload & Timeline">
                          ${icons.eye}
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="resendWhatsAppMessage('${m.id}')" title="Resend Message">
                          ${icons.repeat}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.bell}</div>
                  <div class="empty-title">No WhatsApp messages match your filter</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAlertsTab() {
    return `
      <div style="margin-top:var(--space-4);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-3);">
          ${unreadAlerts > 0 ? `<button class="btn btn-secondary btn-sm" onclick="markAllAlertsRead()">${icons.check} Mark All Read</button>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          ${systemNotifs.map(n => renderNotifItem(n)).join('') || `
            <div class="empty-state" style="margin-top:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title">All caught up!</div>
              <div class="empty-desc">No unread system alerts.</div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderNotifItem(n) {
    const iconColorMap = {
      expiry: 'var(--sf-warning-500)',
      payment: 'var(--sf-error-500)',
      reservation: 'var(--sf-indigo-500)',
      system: 'var(--sf-gray-500)',
      transfer: 'var(--sf-indigo-500)',
    };

    return `
      <div style="background:${n.read ? 'var(--color-bg-primary)' : 'var(--sf-indigo-50)'};border:1px solid ${n.read ? 'var(--color-border-secondary)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);display:flex;align-items:flex-start;gap:var(--space-4);cursor:pointer;"
        onclick="readNotifItem('${n.id}')"
        onmouseenter="this.style.boxShadow='var(--shadow-xs)'" onmouseleave="this.style.boxShadow=''"
      >
        <div style="width:36px;height:36px;border-radius:var(--radius-lg);background:${iconColorMap[n.type] || 'var(--sf-gray-400)'}20;color:${iconColorMap[n.type] || 'var(--sf-gray-400)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${icons[n.icon] || icons.bell}
        </div>
        <div style="flex:1;">
          <div style="font-size:var(--text-sm);${n.read ? '' : 'font-weight:var(--fw-semibold);'}color:var(--color-text-primary);">${n.message}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${utils.formatRelative(n.createdAt)}</div>
        </div>
        ${!n.read ? `<div style="width:8px;height:8px;background:var(--sf-indigo-500);border-radius:50%;flex-shrink:0;margin-top:var(--space-1);"></div>` : ''}
      </div>
    `;
  }

  window.switchCommTab = (tab) => {
    currentTab = tab;
    render();
  };

  window.setWaFilter = (f) => {
    waFilter = f;
    render();
  };

  window.handleWaSearch = (q) => {
    waSearch = q;
    const content = document.getElementById('comm-tab-content');
    if (content) content.innerHTML = renderWhatsAppTab();
  };

  window.readNotifItem = function(id) {
    store.markNotificationRead(id);
    app._updateNotifBadge();
    render();
  };

  window.markAllAlertsRead = function() {
    store.markAllRead();
    toast.show('All alerts marked as read', 'success');
    render();
  };

  window.triggerRunReminders = function() {
    if (window.notificationService && window.notificationService.runAutomatedReminders) {
      const summary = window.notificationService.runAutomatedReminders();
      toast.show(`Ran scheduler: ${summary.expiriesSent} expiry notices, ${summary.duesSent} fee reminders queued.`, 'success');
      render();
    } else {
      toast.show('Automated reminders triggered', 'info');
    }
  };

  window.showWhatsAppDetails = function(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg) return;

    const student = store.getStudent(msg.studentId);
    const badgeClass = msg.status === 'delivered' ? 'badge-success' : msg.status === 'failed' ? 'badge-error' : 'badge-indigo';

    modal.open(`WhatsApp Dispatch #${msg.id}`, `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <!-- Student Info Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
          <div>
            <div style="font-weight:var(--fw-bold);">${student?.name || 'Direct / Broadcast'}</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-secondary);">${msg.phone}</div>
          </div>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${msg.status.toUpperCase()}</span>
        </div>

        <!-- WhatsApp Chat Bubble Rendering -->
        <div style="background:#e5ddd5;padding:var(--space-4);border-radius:var(--radius-xl);display:flex;flex-direction:column;gap:var(--space-2);">
          <div style="font-size:11px;color:#667781;text-align:center;margin-bottom:var(--space-1);">WHATSAPP DELIVERY PREVIEW</div>
          <div style="align-self:flex-end;max-width:85%;background:#dcf8c6;padding:10px 14px;border-radius:10px 0 10px 10px;box-shadow:0 1px 2px rgba(0,0,0,0.1);font-size:13px;line-height:1.5;color:#111b21;white-space:pre-wrap;">
${msg.content}
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;font-size:10px;color:#667781;margin-top:4px;">
              <span>${utils.formatDate(msg.createdAt, {hour:'2-digit',minute:'2-digit'})}</span>
              <span style="color:#53bdeb;font-weight:bold;">✓✓</span>
            </div>
          </div>
        </div>

        <!-- Technical Metadata -->
        <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);padding:var(--space-3);font-size:var(--text-xs);display:flex;flex-direction:column;gap:var(--space-2);">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Event Type</span><strong>${msg.eventType}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Template</span><strong>${msg.templateName}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Idempotency Key</span><code style="font-family:var(--font-mono);font-size:10px;">${msg.idempotencyKey || '—'}</code></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Provider</span><strong>${msg.provider || 'Mock (Sandbox)'}</strong></div>
          ${msg.error ? `<div style="display:flex;justify-content:space-between;color:var(--sf-error-600);"><span style="color:var(--sf-error-600);">Failure Reason</span><strong>${msg.error}</strong></div>` : ''}
        </div>
      </div>
    `, `
      ${msg.metadata?.documentId ? `<button class="btn btn-secondary" onclick="invoiceGenerator.previewDocument('${msg.metadata.documentId}')">${icons.fileText} Attached Document</button>` : ''}
      <button class="btn btn-primary" onclick="resendWhatsAppMessage('${msg.id}'); modal.close();">Resend Now</button>
    `);
  };

  window.resendWhatsAppMessage = function(messageId) {
    if (window.notificationService && window.notificationService.retryFailedMessage) {
      window.notificationService.retryFailedMessage(messageId).then(res => {
        toast.show('WhatsApp message queued & resent!', 'success');
        render();
      }).catch(e => toast.show(e.message, 'error'));
    }
  };

  window.openBroadcastWhatsAppModal = function() {
    const students = store.getStudents(branchId);
    modal.open('Send WhatsApp Notice', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Recipient Group <span class="required">*</span></label>
          <select class="select" id="broadcast-group">
            <option value="all">All Active Students (${students.length})</option>
            <option value="dues">Students with Pending Dues</option>
            <option value="expiring">Students Expiring Soon (&lt; 14 days)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Message Notice <span class="required">*</span></label>
          <textarea class="textarea" id="broadcast-text" rows="4" placeholder="Dear Students, please be informed that..."></textarea>
          <div class="form-hint">Respects student opt-in consent; automatically queued asynchronously.</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmBroadcastWhatsApp()">${icons.bell} Dispatch Notice</button>
    `);

    window.confirmBroadcastWhatsApp = () => {
      const text = document.getElementById('broadcast-text')?.value?.trim();
      const group = document.getElementById('broadcast-group')?.value;
      if (!text) { toast.show('Please enter a message', 'error'); return; }

      let targetStudents = students;
      if (group === 'dues') {
        const dues = store.getPendingDues(branchId);
        targetStudents = dues.map(d => d.student);
      } else if (group === 'expiring') {
        const expiring = store.getExpiringMemberships(branchId, 14);
        targetStudents = expiring.map(e => e.student);
      }

      let count = 0;
      targetStudents.forEach(s => {
        if (s.whatsapp_opt_in !== false && window.notificationService) {
          window.notificationService.queueMessage({
            studentId: s.id,
            phone: s.normalized_phone || s.phone,
            eventType: 'ANNOUNCEMENT',
            templateName: 'general_notice',
            content: text.replace('Dear Students', `Dear ${s.name}`)
          });
          count++;
        }
      });

      modal.close();
      toast.show(`Dispatched WhatsApp broadcast to ${count} students!`, 'success');
      render();
    };
  };

  render();
}
