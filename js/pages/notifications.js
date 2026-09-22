// Notifications Page
export function renderNotifications(container) {
  const branchId = store.getActiveBranchId();
  const notifications = store.getNotifications(branchId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread = notifications.filter(n => !n.read).length;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Notifications</h1>
          <p class="page-subtitle">${unread} unread notification${unread !== 1 ? 's' : ''}</p>
        </div>
        ${unread > 0 ? `<button class="btn btn-secondary" onclick="markAllRead()">Mark All Read</button>` : ''}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-2);" id="notif-list">
      ${notifications.map(n => renderNotifItem(n)).join('') || `
        <div class="empty-state" style="margin-top:var(--space-8);">
          <div class="empty-icon">${icons.bell}</div>
          <div class="empty-title">No notifications</div>
          <div class="empty-desc">You're all caught up!</div>
        </div>
      `}
    </div>
  `;

  window.markAllRead = function() {
    store.markAllRead();
    toast.show('All notifications marked as read', 'success');
    app._navigate();
  };
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
      onclick="readNotif('${n.id}')"
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

window.readNotif = function(id) {
  store.markNotificationRead(id);
  app._updateNotifBadge();
  // update inline
  app._navigate();
};
