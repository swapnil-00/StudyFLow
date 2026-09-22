// Activity Log Page
export function renderActivity(container) {
  const activities = store.getActivityLogs(100);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Activity Log</h1>
          <p class="page-subtitle">Complete audit trail of all actions</p>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Time</th><th>Action</th><th>Description</th><th>Type</th></tr>
          </thead>
          <tbody>
            ${activities.map(a => {
              const actionIconMap = {
                seat_assigned: icons['map-pin'],
                payment_recorded: icons['dollar-sign'],
                seat_released: icons.checkCircle,
                seat_transferred: icons['arrow-right'],
                membership_renewed: icons.repeat,
                student_created: icons['user-plus'],
                check_in: icons.clock,
                check_out: icons.clock,
                seat_maintenance: icons.tool,
              };
              const icon = actionIconMap[a.action] || icons.activity;

              return `
                <tr>
                  <td style="color:var(--color-text-secondary);white-space:nowrap;">${utils.formatRelative(a.timestamp)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-text-secondary);">
                      ${icon}
                      <span style="font-size:var(--text-xs);">${a.action?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td style="color:var(--color-text-primary);">${a.description}</td>
                  <td><span class="badge badge-neutral">${a.entity || '—'}</span></td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="4"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.activity}</div>
                <div class="empty-title">No activity recorded</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
