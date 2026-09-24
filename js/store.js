// StudyFlow Data Store — Neon PostgreSQL backend via REST API
// Replaces localStorage store with server-backed persistence
// All reads are from in-memory cache (loaded once on boot).
// All writes go to /api/write immediately, then update the cache.

const API_BASE = '';  // Same origin — works on Vercel and local

async function apiWrite(table, action, data, id) {
  const res = await fetch(`${API_BASE}/api/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ table, action, data, id }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Write failed');
  return json;
}

class Store {
  constructor() {
    this._db = null;
    this._subscribers = [];
    this._loading = false;
    this._loaded = false;
    this._lastLoadError = null;
    this._activeBranchId = null; // in-memory branch selection (no sessionStorage)
  }

  // ── Bootstrap ────────────────────────────────────────────────────
  async load() {
    if (this._loaded) return;
    if (this._loading) {
      // Wait for in-flight load
      await new Promise(resolve => {
        const unsub = this.subscribe(() => { if (this._loaded) { unsub(); resolve(); } });
      });
      return;
    }
    this._loading = true;
    try {
      const res = await fetch(`${API_BASE}/api/data`, { credentials: 'same-origin' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load data');
      this._db = json.db;
      this._loaded = true;
    } catch (e) {
      console.error('Store load failed:', e);
      this._lastLoadError = e.message;
      // Fallback: empty DB so app doesn't crash
      this._db = { branches:[], floors:[], rooms:[], seats:[], students:[], membershipPlans:[], memberships:[], seatAssignments:[], reservations:[], payments:[], attendance:[], expenses:[], notifications:[], activityLog:[], waitlist:[], staff:[], seatTransfers:[], notificationMessages:[], documents:[], settings:{} };
      this._loaded = true;
    }
    this._loading = false;
    this._notify();
  }

  isSeeded() {
    return this._loaded && (this._db?.branches?.length > 0);
  }

  get db() {
    return this._db || {};
  }

  _notify() {
    this._subscribers.forEach(fn => fn());
  }

  subscribe(fn) {
    this._subscribers.push(fn);
    return () => { this._subscribers = this._subscribers.filter(s => s !== fn); };
  }

  // Keep _save for compatibility: it only updates the in-memory cache
  _save(db) {
    this._db = db;
    this._notify();
  }

  getActiveBranchId() {
    return this._activeBranchId || (this._db?.branches?.[0]?.id);
  }
  setActiveBranch(id) { this._activeBranchId = id; this._notify(); }

  // ── Branches ──────────────────────────────────────────────────────
  getBranches() { return this._db?.branches || []; }
  getBranch(id) { return this.getBranches().find(b => b.id === id); }

  async addBranch(data) {
    const branch = { id: uid('BR'), createdAt: now(), ...data };
    await apiWrite('branches', 'insert', branch);
    this._db.branches.push(branch);
    this._notify();
    return branch;
  }

  async updateBranch(id, updates) {
    const idx = this._db.branches.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Branch not found');
    this._db.branches[idx] = { ...this._db.branches[idx], ...updates };
    await apiWrite('branches', 'update', this._db.branches[idx], id);
    this._notify();
    return this._db.branches[idx];
  }

  // ── Floors ────────────────────────────────────────────────────────
  getFloors(branchId) {
    const floors = this._db?.floors || [];
    return branchId ? floors.filter(f => f.branchId === branchId) : floors;
  }
  getFloor(id) { return (this._db?.floors || []).find(f => f.id === id); }

  async addFloor(data) {
    const floor = { id: uid('FLR'), createdAt: now(), ...data };
    await apiWrite('floors', 'insert', floor);
    this._db.floors.push(floor);
    this._notify();
    return floor;
  }

  // ── Rooms ─────────────────────────────────────────────────────────
  getRooms(floorId) {
    const rooms = this._db?.rooms || [];
    return floorId ? rooms.filter(r => r.floorId === floorId) : rooms;
  }
  getRoom(id) { return (this._db?.rooms || []).find(r => r.id === id); }

  getRoomsForBranch(branchId) {
    const floorIds = this.getFloors(branchId).map(f => f.id);
    return (this._db?.rooms || []).filter(r => floorIds.includes(r.floorId));
  }

  async addRoom(data) {
    const room = { id: uid('RM'), createdAt: now(), ...data };
    await apiWrite('rooms', 'insert', room);
    this._db.rooms.push(room);
    this._notify();
    return room;
  }

  async updateRoom(id, updates) {
    const idx = this._db.rooms.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Room not found');
    this._db.rooms[idx] = { ...this._db.rooms[idx], ...updates };
    await apiWrite('rooms', 'update', this._db.rooms[idx], id);
    this._notify();
    return this._db.rooms[idx];
  }

  async deleteRoom(id) {
    await apiWrite('rooms', 'delete', {}, id);
    this._db.rooms = this._db.rooms.filter(r => r.id !== id);
    this._notify();
  }

  // ── Seats ─────────────────────────────────────────────────────────
  getSeats(roomId) {
    const seats = this._db?.seats || [];
    return roomId ? seats.filter(s => s.roomId === roomId) : seats;
  }

  getSeatsForBranch(branchId) {
    const roomIds = this.getRoomsForBranch(branchId).map(r => r.id);
    return (this._db?.seats || []).filter(s => roomIds.includes(s.roomId));
  }

  getSeat(id) { return (this._db?.seats || []).find(s => s.id === id); }

  getSeatStatus(seatId) {
    const seat = this.getSeat(seatId);
    if (!seat) return 'unknown';
    if (seat.status === 'maintenance') return 'maintenance';
    if (seat.status === 'blocked') return 'blocked';

    const assignment = this.getActiveAssignment(seatId);
    if (!assignment) return 'available';

    const reservation = this.getActiveReservation(seatId);
    if (reservation && !assignment) return 'reserved';

    const membership = this.getMembership(assignment.membershipId);
    if (!membership) return 'available';

    const today = new Date();
    const expiry = new Date(membership.endDate);

    const payment = this.getPaymentStatus(membership.id);
    if (payment === 'overdue' || payment === 'pending') return 'payment-due';

    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7 && daysLeft > 0) return 'expiring';
    if (expiry < today) return 'available';

    return 'occupied';
  }

  async addSeat(data) {
    const seat = { id: uid('SEAT'), status: 'available', type: 'standard', createdAt: now(), ...data };
    await apiWrite('seats', 'insert', seat);
    this._db.seats.push(seat);
    this._notify();
    return seat;
  }

  async updateSeat(id, updates) {
    const idx = this._db.seats.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Seat not found');
    this._db.seats[idx] = { ...this._db.seats[idx], ...updates, updatedAt: now() };
    await apiWrite('seats', 'update', updates, id);
    this._notify();
    return this._db.seats[idx];
  }

  async deleteSeat(id) {
    await apiWrite('seats', 'delete', {}, id);
    this._db.seats = this._db.seats.filter(s => s.id !== id);
    this._notify();
  }

  // ── Students ──────────────────────────────────────────────────────
  getStudents(branchId) {
    const students = this._db?.students || [];
    return branchId ? students.filter(s => s.branchId === branchId) : students;
  }

  getStudent(id) { return (this._db?.students || []).find(s => s.id === id); }

  searchStudents(query, branchId) {
    const q = query.toLowerCase();
    return this.getStudents(branchId).filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.phone||'').includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.email||'').toLowerCase().includes(q)
    );
  }

  async addStudent(data) {
    const phone = data.phone || '';
    const countryCode = data.country_code || '+91';
    const normalized_phone = data.normalized_phone || utils.normalizePhone(phone, countryCode);

    const student = {
      id: uid('STU'),
      status: 'active',
      createdAt: now(),
      avatar: getAvatarColor(data.name),
      avatarColor: getAvatarColor(data.name),
      country_code: countryCode,
      phone_number: phone.replace(/[^0-9]/g, ''),
      normalized_phone,
      whatsapp_opt_in: data.whatsapp_opt_in !== false,
      whatsapp_opt_in_at: data.whatsapp_opt_in_at || now(),
      whatsapp_opt_out_at: null,
      preferred_language: data.preferred_language || 'en',
      communication_preferences: data.communication_preferences || {
        whatsapp: true, payment_reminders: true, membership_reminders: true,
        booking_notifications: true, receipt_notifications: true, announcements: true
      },
      ...data,
      phone: normalized_phone || phone
    };

    await apiWrite('students', 'insert', student);
    this._db.students.push(student);
    this.addActivity({ action: 'student_created', entity: 'student', entityId: student.id, description: `Student ${student.name} added` });
    this._notify();
    return student;
  }

  async updateStudent(id, updates) {
    const idx = this._db.students.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');

    if (updates.phone) {
      const countryCode = updates.country_code || this._db.students[idx].country_code || '+91';
      updates.normalized_phone = utils.normalizePhone(updates.phone, countryCode);
      updates.phone = updates.normalized_phone;
    }

    if (updates.whatsapp_opt_in !== undefined && updates.whatsapp_opt_in !== this._db.students[idx].whatsapp_opt_in) {
      if (updates.whatsapp_opt_in) updates.whatsapp_opt_in_at = now();
      else updates.whatsapp_opt_out_at = now();
    }

    this._db.students[idx] = { ...this._db.students[idx], ...updates, updatedAt: now() };
    await apiWrite('students', 'update', updates, id);
    this._notify();
    return this._db.students[idx];
  }

  // ── Membership Plans ──────────────────────────────────────────────
  getMembershipPlans(branchId) {
    const plans = this._db?.membershipPlans || [];
    return branchId ? plans.filter(p => p.branchId === branchId || !p.branchId) : plans;
  }

  getMembershipPlan(id) { return (this._db?.membershipPlans || []).find(p => p.id === id); }

  async addMembershipPlan(data) {
    const plan = { id: uid('PLAN'), active: true, createdAt: now(), ...data };
    await apiWrite('membership_plans', 'insert', plan);
    this._db.membershipPlans.push(plan);
    this._notify();
    return plan;
  }

  async updateMembershipPlan(id, updates) {
    const idx = this._db.membershipPlans.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    this._db.membershipPlans[idx] = { ...this._db.membershipPlans[idx], ...updates };
    await apiWrite('membership_plans', 'update', this._db.membershipPlans[idx], id);
    this._notify();
    return this._db.membershipPlans[idx];
  }

  // ── Memberships ───────────────────────────────────────────────────
  getMemberships(studentId) {
    const memberships = this._db?.memberships || [];
    return studentId ? memberships.filter(m => m.studentId === studentId) : memberships;
  }

  getActiveMembership(studentId) {
    const today = new Date();
    return this.getMemberships(studentId).find(m =>
      m.status === 'active' && new Date(m.endDate) >= today
    );
  }

  getMembership(id) { return (this._db?.memberships || []).find(m => m.id === id); }

  async addMembership(data) {
    const membership = { id: uid('MEM'), status: 'active', createdAt: now(), ...data };
    await apiWrite('memberships', 'insert', membership);
    this._db.memberships.push(membership);
    this._notify();
    return membership;
  }

  async updateMembership(id, updates) {
    const idx = this._db.memberships.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Membership not found');
    this._db.memberships[idx] = { ...this._db.memberships[idx], ...updates, updatedAt: now() };
    await apiWrite('memberships', 'update', updates, id);
    this._notify();
    return this._db.memberships[idx];
  }

  // ── Seat Assignments ──────────────────────────────────────────────
  getAssignments(seatId) {
    const assignments = this._db?.seatAssignments || [];
    return seatId ? assignments.filter(a => a.seatId === seatId) : assignments;
  }

  getStudentAssignment(studentId) {
    const today = new Date();
    return (this._db?.seatAssignments || []).find(a =>
      a.studentId === studentId && a.status === 'active' && new Date(a.endDate) >= today
    );
  }

  getActiveAssignment(seatId) {
    const today = new Date();
    return (this._db?.seatAssignments || []).find(a =>
      a.seatId === seatId && a.status === 'active' && new Date(a.endDate) >= today
    );
  }

  async assignSeat(data) {
    const existing = this.getActiveAssignment(data.seatId);
    if (existing) throw new Error('Seat is already occupied. Please choose a different seat.');

    const assignment = { id: uid('ASN'), status: 'active', createdAt: now(), ...data };
    const res = await apiWrite('seat_assignments', 'insert', assignment);
    if (res && res.id) assignment.id = res.id;
    this._db.seatAssignments.push(assignment);
    const seat = this.getSeat(data.seatId);
    if (seat) {
      seat.status = 'occupied';
      seat.currentStudentId = data.studentId;
    }
    this.addActivity({ action: 'seat_assigned', entity: 'seat', entityId: data.seatId, description: `Seat ${seat?.label || data.seatId} assigned to student`, meta: data });
    this._notify();
    return assignment;
  }

  async releaseSeat(seatId, reason, userId) {
    const idx = this._db.seatAssignments.findIndex(a => a.seatId === seatId && a.status === 'active');
    if (idx === -1) throw new Error('No active assignment found');
    await apiWrite('seat_assignments', 'release', { seatId, reason, userId });
    this._db.seatAssignments[idx] = {
      ...this._db.seatAssignments[idx],
      status: 'released',
      releasedAt: now(),
      releaseReason: reason,
      releasedBy: userId
    };
    const seat = this.getSeat(seatId);
    if (seat) {
      seat.status = 'available';
      seat.currentStudentId = null;
    }
    this.addActivity({ action: 'seat_released', entity: 'seat', entityId: seatId, description: `Seat released. Reason: ${reason}` });
    this._notify();
    return this._db.seatAssignments[idx];
  }

  async transferSeat(fromSeatId, toSeatId, studentId, reason) {
    const destAssignment = this.getActiveAssignment(toSeatId);
    if (destAssignment) throw new Error('Destination seat is already occupied.');

    const fromIdx = this._db.seatAssignments.findIndex(a => a.seatId === fromSeatId && a.status === 'active');
    if (fromIdx === -1) throw new Error('Source seat has no active assignment.');

    const oldAssignment = this._db.seatAssignments[fromIdx];
    const fromSeat = this.getSeat(fromSeatId);
    const toSeat = this.getSeat(toSeatId);

    // Atomic transfer execution in backend
    const res = await apiWrite('seat_assignments', 'transfer', { fromSeatId, toSeatId, studentId, reason });

    this._db.seatAssignments[fromIdx] = {
      ...oldAssignment,
      status: 'transferred',
      transferredAt: now(),
      transferReason: reason
    };

    const newAssignment = {
      id: res.id || uid('ASN'),
      status: 'active',
      seatId: toSeatId,
      studentId: oldAssignment.studentId,
      membershipId: oldAssignment.membershipId,
      startDate: now(),
      endDate: oldAssignment.endDate,
      createdAt: now(),
      transferredFrom: fromSeatId
    };
    this._db.seatAssignments.push(newAssignment);

    if (fromSeat) { fromSeat.status = 'available'; fromSeat.currentStudentId = null; }
    if (toSeat) { toSeat.status = 'occupied'; toSeat.currentStudentId = oldAssignment.studentId; }

    const transfer = {
      id: res.transferId || uid('TRF'),
      studentId,
      fromSeatId,
      toSeatId,
      reason,
      date: now(),
      fromSeatLabel: fromSeat?.label,
      toSeatLabel: toSeat?.label
    };
    this._db.seatTransfers = this._db.seatTransfers || [];
    this._db.seatTransfers.push(transfer);

    this.addActivity({
      action: 'seat_transferred',
      entity: 'seat',
      entityId: fromSeatId,
      description: `Seat transferred from ${fromSeat?.label || fromSeatId} to ${toSeat?.label || toSeatId}. Reason: ${reason}`
    });
    this._notify();
    return newAssignment;
  }

  // ── Reservations ──────────────────────────────────────────────────
  getReservations(seatId) {
    const reservations = this._db?.reservations || [];
    return seatId ? reservations.filter(r => r.seatId === seatId) : reservations;
  }

  getActiveReservation(seatId) {
    const today = new Date();
    return (this._db?.reservations || []).find(r =>
      r.seatId === seatId && r.status === 'upcoming' &&
      new Date(r.startDate) <= today && new Date(r.endDate) >= today
    );
  }

  async addReservation(data) {
    const reservation = { id: uid('RES'), status: 'upcoming', createdAt: now(), ...data };
    await apiWrite('reservations', 'insert', reservation);
    this._db.reservations.push(reservation);
    this._notify();
    return reservation;
  }

  async updateReservation(id, updates) {
    const idx = this._db.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reservation not found');
    this._db.reservations[idx] = { ...this._db.reservations[idx], ...updates, updatedAt: now() };
    await apiWrite('reservations', 'update', updates, id);
    this._notify();
    return this._db.reservations[idx];
  }

  // ── Payments ──────────────────────────────────────────────────────
  getPayments(membershipId) {
    const payments = this._db?.payments || [];
    return membershipId ? payments.filter(p => p.membershipId === membershipId) : payments;
  }

  getPaymentsForStudent(studentId) {
    const membershipIds = this.getMemberships(studentId).map(m => m.id);
    return (this._db?.payments || []).filter(p => membershipIds.includes(p.membershipId));
  }

  getPaymentStatus(membershipId) {
    const membership = this.getMembership(membershipId);
    if (!membership) return 'unknown';

    const payments = this.getPayments(membershipId);
    const totalPaid = payments.filter(p => p.status !== 'refunded').reduce((sum, p) => sum + p.amount, 0);
    const totalDue = membership.price - (membership.discount || 0);

    if (totalPaid >= totalDue) return 'paid';
    if (totalPaid > 0) return 'partial';

    const today = new Date();
    const startDate = new Date(membership.startDate);
    if (today > startDate) return 'overdue';
    return 'pending';
  }

  getPaidAmount(membershipId) {
    return this.getPayments(membershipId).filter(p => p.status !== 'refunded').reduce((sum, p) => sum + p.amount, 0);
  }

  getPendingAmount(membershipId) {
    const membership = this.getMembership(membershipId);
    if (!membership) return 0;
    const totalDue = membership.price - (membership.discount || 0);
    const paid = this.getPaidAmount(membershipId);
    return Math.max(0, totalDue - paid);
  }

  async recordPayment(data) {
    const membership = this.getMembership(data.membershipId);
    if (!membership) throw new Error('Membership not found');

    const payment = {
      id: uid('PAY'),
      status: 'recorded',
      receiptNumber: data.receiptNumber || `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      recordedAt: now(),
      ...data
    };
    await apiWrite('payments', 'insert', payment);
    this._db.payments.push(payment);

    // Update membership payment status
    const newStatus = this.getPaymentStatus(data.membershipId);
    if (membership.paymentStatus !== newStatus) {
      membership.paymentStatus = newStatus;
      apiWrite('memberships', 'update', { paymentStatus: newStatus }, membership.id).catch(e => console.warn('Membership status sync error:', e));
    }

    this.addActivity({ action: 'payment_recorded', entity: 'payment', entityId: payment.id, description: `Payment of ${formatINR(payment.amount)} recorded` });
    this._notify();
    return payment;
  }

  // ── Attendance ────────────────────────────────────────────────────
  getAttendance(studentId, date) {
    const records = this._db?.attendance || [];
    if (studentId && date) return records.find(a => a.studentId === studentId && a.date === date);
    if (studentId) return records.filter(a => a.studentId === studentId);
    if (date) return records.filter(a => a.date === date);
    return records;
  }

  getTodayAttendance() { return this.getAttendance(null, today()); }

  async checkIn(studentId, time) {
    const dateStr = today();
    const existing = this._db.attendance.find(a => a.studentId === studentId && a.date === dateStr);
    if (existing) {
      existing.checkIn = time || now();
      existing.status = 'checked-in';
      await apiWrite('attendance', 'update', { checkIn: existing.checkIn }, existing.id);
    } else {
      const record = { id: uid('ATT'), studentId, date: dateStr, checkIn: time || now(), status: 'checked-in' };
      await apiWrite('attendance', 'insert', record);
      this._db.attendance.push(record);
    }
    this.addActivity({ action: 'check_in', entity: 'student', entityId: studentId, description: 'Student checked in' });
    this._notify();
  }

  async checkOut(studentId, time) {
    const dateStr = today();
    const idx = this._db.attendance.findIndex(a => a.studentId === studentId && a.date === dateStr);
    if (idx === -1) throw new Error('No check-in record found for today');
    const record = this._db.attendance[idx];
    const checkOutTime = time || now();
    const duration = record.checkIn ? Math.round((new Date(checkOutTime) - new Date(record.checkIn)) / 60000) : null;
    this._db.attendance[idx] = { ...record, checkOut: checkOutTime, status: 'checked-out', duration };
    await apiWrite('attendance', 'update', { checkOut: checkOutTime }, record.id);
    this._notify();
    return this._db.attendance[idx];
  }

  // ── Expenses ──────────────────────────────────────────────────────
  getExpenses(branchId) {
    const expenses = this._db?.expenses || [];
    return branchId ? expenses.filter(e => e.branchId === branchId) : expenses;
  }

  async addExpense(data) {
    const expense = { id: uid('EXP'), createdAt: now(), ...data };
    await apiWrite('expenses', 'insert', expense);
    this._db.expenses.push(expense);
    this._notify();
    return expense;
  }

  // ── Notifications ─────────────────────────────────────────────────
  getNotifications(branchId) {
    return (this._db?.notifications || []).filter(n => !branchId || n.branchId === branchId);
  }

  getUnreadCount() { return this.getNotifications().filter(n => !n.read).length; }

  async markNotificationRead(id) {
    const notif = (this._db?.notifications || []).find(n => n.id === id);
    if (notif) { notif.read = true; }
    await apiWrite('notifications', 'markRead', {}, id);
    this._notify();
  }

  async markAllRead() {
    (this._db?.notifications || []).forEach(n => { n.read = true; });
    await apiWrite('notifications', 'markRead', {});
    this._notify();
  }

  // ── Documents (in-memory, not persisted to DB) ────────────────────
  getDocuments() { return this._db?.documents || []; }
  getDocument(id) { return (this._db?.documents || []).find(d => d.id === id); }
  getDocumentByNumber(docNum) { return (this._db?.documents || []).find(d => d.documentNumber === docNum); }

  saveDocument(doc) {
    this._db.documents = this._db.documents || [];
    const idx = this._db.documents.findIndex(d => d.id === doc.id);
    if (idx !== -1) this._db.documents[idx] = { ...this._db.documents[idx], ...doc };
    else this._db.documents.unshift(doc);
    // Persist document to Neon DB asynchronously
    apiWrite('documents', 'save', doc).catch(e => console.warn('Document DB persistence failed:', e.message));
    this._notify();
    return doc;
  }

  getDocumentsForStudent(studentId) { return (this._db?.documents || []).filter(d => d.studentId === studentId); }

  // ── WhatsApp notification messages (Persisted) ───────────────────
  getNotificationMessages() { return this._db?.notificationMessages || []; }
  getNotificationMessage(id) { return (this._db?.notificationMessages || []).find(m => m.id === id); }
  getNotificationMessageByIdempotency(key) { return (this._db?.notificationMessages || []).find(m => m.idempotencyKey === key); }

  saveNotificationMessage(msg) {
    this._db.notificationMessages = this._db.notificationMessages || [];
    const idx = this._db.notificationMessages.findIndex(m => m.id === msg.id);
    if (idx !== -1) this._db.notificationMessages[idx] = { ...this._db.notificationMessages[idx], ...msg };
    else this._db.notificationMessages.unshift(msg);
    // Persist log to Neon DB asynchronously
    apiWrite('communication_logs', 'save', msg).catch(e => console.warn('Comm log DB persistence failed:', e.message));
    this._notify();
    return msg;
  }

  getNotificationMessagesForStudent(studentId) { return (this._db?.notificationMessages || []).filter(m => m.studentId === studentId); }

  getNotificationStats() {
    const msgs = this.getNotificationMessages();
    const todayStr = utils.today();
    const todayMsgs = msgs.filter(m => m.createdAt && m.createdAt.startsWith(todayStr));
    const delivered = msgs.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length;
    const pending = msgs.filter(m => m.status === 'QUEUED' || m.status === 'PROCESSING' || m.status === 'SENT').length;
    const failed = msgs.filter(m => m.status === 'FAILED').length;
    return { todayCount: todayMsgs.length || msgs.length, delivered, pending, failed };
  }

  // ── Activity Log ──────────────────────────────────────────────────
  getActivityLogs(limit) {
    const logs = [...(this._db?.activityLog || [])].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  addActivity(data) {
    const entry = { id: uid('ACT'), timestamp: now(), userId: 'admin', ...data };
    this._db.activityLog = this._db.activityLog || [];
    this._db.activityLog.push(entry);
    if (this._db.activityLog.length > 500) this._db.activityLog = this._db.activityLog.slice(-500);
    // Fire-and-forget write
    apiWrite('activity_logs', 'insert', entry).catch(e => console.warn('Activity log write failed:', e));
    this._notify();
  }

  // ── Waitlist ──────────────────────────────────────────────────────
  getWaitlist(branchId) { return (this._db?.waitlist || []).filter(w => !branchId || w.branchId === branchId); }

  async addToWaitlist(data) {
    const entry = { id: uid('WL'), status: 'waiting', createdAt: now(), priority: 1, ...data };
    await apiWrite('waitlist', 'insert', entry);
    this._db.waitlist.push(entry);
    this._notify();
    return entry;
  }

  // ── Staff ─────────────────────────────────────────────────────────
  getStaff(branchId) { return (this._db?.staff || []).filter(s => !branchId || s.branchId === branchId); }

  async addStaff(data) {
    const staff = { id: uid('STF'), status: 'active', createdAt: now(), ...data };
    await apiWrite('staff', 'insert', staff);
    this._db.staff.push(staff);
    this._notify();
    return staff;
  }

  async deleteStaff(id) {
    await apiWrite('staff', 'delete', {}, id);
    this._db.staff = this._db.staff.filter(s => s.id !== id);
    this._notify();
  }

  // ── Aggregations ──────────────────────────────────────────────────
  getDashboardStats(branchId) {
    const seats = this.getSeatsForBranch(branchId);
    const totalSeats = seats.length;
    const today_ = new Date();

    let occupied = 0, available = 0, reserved = 0, maintenance = 0;
    seats.forEach(seat => {
      const status = this.getSeatStatus(seat.id);
      if (status === 'occupied' || status === 'payment-due' || status === 'expiring') occupied++;
      else if (status === 'available') available++;
      else if (status === 'reserved') reserved++;
      else if (status === 'maintenance' || status === 'blocked') maintenance++;
    });

    const todayPayments = (this._db?.payments || []).filter(p => {
      const d = new Date(p.recordedAt || p.createdAt);
      return d.toDateString() === today_.toDateString();
    });
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthPayments = (this._db?.payments || []).filter(p => {
      const d = new Date(p.recordedAt || p.createdAt);
      return d.getMonth() === today_.getMonth() && d.getFullYear() === today_.getFullYear();
    });
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeMemberships = (this._db?.memberships || []).filter(m => {
      const students = this.getStudents(branchId).map(s => s.id);
      return students.includes(m.studentId) && m.status === 'active';
    });
    let totalPending = 0;
    activeMemberships.forEach(m => { totalPending += this.getPendingAmount(m.id); });

    const nextWeek = new Date(today_);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const expiringCount = activeMemberships.filter(m => {
      const exp = new Date(m.endDate);
      return exp >= today_ && exp <= nextWeek;
    }).length;

    const todayAtt = this.getTodayAttendance();
    const branchStudentIds = this.getStudents(branchId).map(s => s.id);
    const presentToday = todayAtt.filter(a => branchStudentIds.includes(a.studentId)).length;

    return { totalSeats, occupied, available, reserved, maintenance, todayRevenue, monthRevenue, totalPending, expiringCount, presentToday };
  }

  getExpiringMemberships(branchId, days = 7) {
    const today_ = new Date();
    const future = new Date(today_);
    future.setDate(future.getDate() + days);

    const studentIds = this.getStudents(branchId).map(s => s.id);
    return (this._db?.memberships || [])
      .filter(m => {
        if (!studentIds.includes(m.studentId)) return false;
        if (m.status !== 'active') return false;
        const exp = new Date(m.endDate);
        return exp >= today_ && exp <= future;
      })
      .map(m => {
        const student = this.getStudent(m.studentId);
        const assignment = this.getStudentAssignment(m.studentId);
        const seat = assignment ? this.getSeat(assignment.seatId) : null;
        const daysLeft = Math.ceil((new Date(m.endDate) - today_) / (1000 * 60 * 60 * 24));
        return { ...m, student, seat, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  getPendingDues(branchId) {
    const studentIds = this.getStudents(branchId).map(s => s.id);
    const result = [];
    const today_ = new Date();

    (this._db?.memberships || []).forEach(m => {
      if (!studentIds.includes(m.studentId)) return;
      if (m.status !== 'active') return;
      const pending = this.getPendingAmount(m.id);
      if (pending <= 0) return;

      const student = this.getStudent(m.studentId);
      const assignment = this.getStudentAssignment(m.studentId);
      const seat = assignment ? this.getSeat(assignment.seatId) : null;
      const daysDue = Math.ceil((today_ - new Date(m.startDate)) / (1000 * 60 * 60 * 24));

      result.push({ membership: m, student, seat, pendingAmount: pending, daysDue });
    });

    return result.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }

  getRevenueChart(branchId, days = 7) {
    const result = [];
    const today_ = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today_);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();

      const dayPayments = (this._db?.payments || []).filter(p =>
        new Date(p.recordedAt || p.createdAt).toDateString() === dateStr
      );
      const amount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      result.push({ date: d, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), amount });
    }

    return result;
  }

  getOccupancyData(branchId) {
    const stats = this.getDashboardStats(branchId);
    return [
      { label: 'Occupied', value: stats.occupied, color: 'var(--sf-indigo-500)' },
      { label: 'Available', value: stats.available, color: 'var(--sf-success-500)' },
      { label: 'Reserved', value: stats.reserved, color: 'var(--sf-orange-500)' },
      { label: 'Maintenance', value: stats.maintenance, color: 'var(--sf-gray-400)' },
    ];
  }

  // ── Settings ──────────────────────────────────────────────────────
  getSettings() { return this._db?.settings || {}; }

  async updateSettings(updates) {
    this._db.settings = { ...(this._db?.settings || {}), ...updates };
    await apiWrite('settings', 'update', this._db.settings);
    this._notify();
  }
}

// ── Utilities ──────────────────────────────────────────────────────
function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().split('T')[0]; }

function formatINR(amount) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getAvatarColor(name) {
  const colors = [
    '#6172f3', '#444ce7', '#3538cd',
    '#17b26a', '#079455', '#067647',
    '#f79009', '#dc6803', '#b54708',
    '#f04438', '#d92d20', '#b42318',
    '#0ba5ec', '#0086c9', '#026aa2',
    '#ee46bc', '#dd2590', '#c11574',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name) {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso, opts) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now_ = new Date();
  const diff = now_ - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatDate(iso);
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now_ = new Date();
  return Math.ceil((d - now_) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function normalizePhone(phone, defaultCountry = '+91') {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `${defaultCountry}${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  return `${defaultCountry}${cleaned}`;
}

window.Store = Store;
window.store = new Store();
window.utils = { uid, now, today, formatINR, getAvatarColor, initials, formatDate, formatTime, formatRelative, daysUntil, addDays, normalizePhone };
