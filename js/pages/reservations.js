// Reservations Page
export function renderReservations(container) {
  const branchId = store.getActiveBranchId();
  const reservations = store.getReservations().filter(r => {
    const seats = store.getSeatsForBranch(branchId).map(s => s.id);
    return seats.includes(r.seatId);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reservations</h1>
          <p class="page-subtitle">Manage seat reservations and waitlist</p>
        </div>
        <button class="btn btn-primary" onclick="openReservationModal()">
          ${icons.calendar} New Reservation
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header"><div class="table-title">All Reservations</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>From</th><th>To</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${reservations.map(r => {
              const student = store.getStudent(r.studentId);
              const seat = store.getSeat(r.seatId);
              const today_ = new Date();
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              const isActive = start <= today_ && end >= today_;
              const isFuture = start > today_;
              const status = r.status === 'cancelled' ? 'cancelled' : end < today_ ? 'expired' : isFuture ? 'upcoming' : 'active';
              const badgeClass = { upcoming: 'badge-indigo', active: 'badge-success', expired: 'badge-neutral', cancelled: 'badge-error' }[status];
              return `
                <tr>
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${student?.avatar};">${utils.initials(student?.name || '')}</div>
                      <div class="student-name">${student?.name || '—'}</div>
                    </div>
                  </td>
                  <td>${seat ? `<span class="badge badge-indigo">${seat.label}</span>` : '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.endDate, {day:'numeric',month:'short'})}</td>
                  <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${capitalizeFirst(status)}</span></td>
                  <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${r.notes || '—'}</td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.calendar}</div>
                <div class="empty-title">No reservations</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
