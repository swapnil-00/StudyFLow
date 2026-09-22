// StudyFlow Data Store — localStorage-based relational data store
// Abstracted for easy migration to a real backend

const DB_KEY = 'studyflow_db';
const DB_VERSION = 1;

class Store {
  constructor() {
    this._cache = null;
    this._subscribers = [];
  }

  // ── Core ────────────────────────────────────────────────────────
  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(DB_KEY);
      this._cache = raw ? JSON.parse(raw) : null;
    } catch (e) {
      this._cache = null;
    }
    return this._cache;
  }

  _save(db) {
    this._cache = db;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Storage error:', e);
    }
    this._notify();
  }

  _notify() {
    this._subscribers.forEach(fn => fn());
  }

  subscribe(fn) {
    this._subscribers.push(fn);
    return () => { this._subscribers = this._subscribers.filter(s => s !== fn); };
  }

  get db() {
    return this._load();
  }

  isSeeded() {
    return !!this._load();
  }

  // ── Branches ────────────────────────────────────────────────────
  getBranches() { return this.db.branches || []; }
  getBranch(id) { return this.getBranches().find(b => b.id === id); }
  getActiveBranchId() { return localStorage.getItem('sf_active_branch') || this.getBranches()[0]?.id; }
  setActiveBranch(id) { localStorage.setItem('sf_active_branch', id); this._notify(); }

  // ── Floors ──────────────────────────────────────────────────────
  getFloors(branchId) {
    const floors = this.db.floors || [];
    return branchId ? floors.filter(f => f.branchId === branchId) : floors;
  }
  getFloor(id) { return (this.db.floors || []).find(f => f.id === id); }

  addFloor(data) {
    const db = this.db;
    const floor = { id: uid('FLR'), createdAt: now(), ...data };
    db.floors.push(floor);
    this._save(db);
    return floor;
  }

  // ── Rooms ───────────────────────────────────────────────────────
  getRooms(floorId) {
    const rooms = this.db.rooms || [];
    return floorId ? rooms.filter(r => r.floorId === floorId) : rooms;
  }
  getRoom(id) { return (this.db.rooms || []).find(r => r.id === id); }

  getRoomsForBranch(branchId) {
    const floorIds = this.getFloors(branchId).map(f => f.id);
    return (this.db.rooms || []).filter(r => floorIds.includes(r.floorId));
  }

  addRoom(data) {
    const db = this.db;
    const room = { id: uid('RM'), createdAt: now(), ...data };
    db.rooms.push(room);
    this._save(db);
    return room;
  }

  // ── Seats ───────────────────────────────────────────────────────
  getSeats(roomId) {
    const seats = this.db.seats || [];
    return roomId ? seats.filter(s => s.roomId === roomId) : seats;
  }

  getSeatsForBranch(branchId) {
    const roomIds = this.getRoomsForBranch(branchId).map(r => r.id);
    return (this.db.seats || []).filter(s => roomIds.includes(s.roomId));
  }

  getSeat(id) { return (this.db.seats || []).find(s => s.id === id); }

  getSeatStatus(seatId) {
    const seat = this.getSeat(seatId);
    if (!seat) return 'unknown';
    if (seat.status === 'maintenance') return 'maintenance';
    if (seat.status === 'blocked') return 'blocked';

    // Check active assignment
    const assignment = this.getActiveAssignment(seatId);
    if (!assignment) return 'available';

    // Check reservation
    const reservation = this.getActiveReservation(seatId);
    if (reservation && !assignment) return 'reserved';

    // Check membership payment
    const membership = this.getMembership(assignment.membershipId);
    if (!membership) return 'available';

    const today = new Date();
    const expiry = new Date(membership.endDate);

    // Payment due?
    const payment = this.getPaymentStatus(membership.id);
    if (payment === 'overdue' || payment === 'pending') return 'payment-due';

    // Expiring soon (within 7 days)?
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7 && daysLeft > 0) return 'expiring';

    // Expired?
    if (expiry < today) return 'available';

    return 'occupied';
  }

  addSeat(data) {
    const db = this.db;
    const seat = { id: uid('SEAT'), status: 'available', type: 'standard', createdAt: now(), ...data };
    db.seats.push(seat);
    this._save(db);
    return seat;
  }

  updateSeat(id, updates) {
    const db = this.db;
    const idx = db.seats.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Seat not found');
    db.seats[idx] = { ...db.seats[idx], ...updates, updatedAt: now() };
    this._save(db);
    return db.seats[idx];
  }

  // ── Students ────────────────────────────────────────────────────
  getStudents(branchId) {
    const students = this.db.students || [];
    return branchId ? students.filter(s => s.branchId === branchId) : students;
  }

  getStudent(id) { return (this.db.students || []).find(s => s.id === id); }

  searchStudents(query, branchId) {
    const q = query.toLowerCase();
    return this.getStudents(branchId).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }

  addStudent(data) {
    const db = this.db;
    const student = {
      id: uid('STU'),
      status: 'active',
      createdAt: now(),
      avatar: getAvatarColor(data.name),
      ...data
    };
    db.students.push(student);
    this._save(db);
    this.addActivity({ action: 'student_created', entity: 'student', entityId: student.id, description: `Student ${student.name} added` });
    return student;
  }

  updateStudent(id, updates) {
    const db = this.db;
    const idx = db.students.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');
    db.students[idx] = { ...db.students[idx], ...updates, updatedAt: now() };
    this._save(db);
    return db.students[idx];
  }

  // ── Membership Plans ────────────────────────────────────────────
  getMembershipPlans(branchId) {
    const plans = this.db.membershipPlans || [];
    return branchId ? plans.filter(p => p.branchId === branchId || !p.branchId) : plans;
  }

  getMembershipPlan(id) { return (this.db.membershipPlans || []).find(p => p.id === id); }

  addMembershipPlan(data) {
    const db = this.db;
    const plan = { id: uid('PLAN'), active: true, createdAt: now(), ...data };
    db.membershipPlans.push(plan);
    this._save(db);
    return plan;
  }

  // ── Memberships ─────────────────────────────────────────────────
  getMemberships(studentId) {
    const memberships = this.db.memberships || [];
    return studentId ? memberships.filter(m => m.studentId === studentId) : memberships;
  }

  getActiveMembership(studentId) {
    const today = new Date();
    return this.getMemberships(studentId).find(m =>
      m.status === 'active' && new Date(m.endDate) >= today
    );
  }

  getMembership(id) { return (this.db.memberships || []).find(m => m.id === id); }

  addMembership(data) {
    const db = this.db;
    const membership = { id: uid('MEM'), status: 'active', createdAt: now(), ...data };
    db.memberships.push(membership);
    this._save(db);
    return membership;
  }

  updateMembership(id, updates) {
    const db = this.db;
    const idx = db.memberships.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Membership not found');
    db.memberships[idx] = { ...db.memberships[idx], ...updates, updatedAt: now() };
    this._save(db);
    return db.memberships[idx];
  }

  // ── Seat Assignments ────────────────────────────────────────────
  getAssignments(seatId) {
    const assignments = this.db.seatAssignments || [];
    return seatId ? assignments.filter(a => a.seatId === seatId) : assignments;
  }

  getStudentAssignment(studentId) {
    const today = new Date();
    return (this.db.seatAssignments || []).find(a =>
      a.studentId === studentId &&
      a.status === 'active' &&
      new Date(a.endDate) >= today
    );
  }

  getActiveAssignment(seatId) {
    const today = new Date();
    return (this.db.seatAssignments || []).find(a =>
      a.seatId === seatId &&
      a.status === 'active' &&
      new Date(a.endDate) >= today
    );
  }

  assignSeat(data) {
    // Validate seat availability
    const existing = this.getActiveAssignment(data.seatId);
    if (existing) throw new Error('Seat is already occupied. Please choose a different seat.');

    const db = this.db;
    const assignment = { id: uid('ASN'), status: 'active', createdAt: now(), ...data };
    db.seatAssignments.push(assignment);
    this._save(db);
    this.addActivity({
      action: 'seat_assigned',
      entity: 'seat',
      entityId: data.seatId,
      description: `Seat assigned to student`,
      meta: data
    });
    return assignment;
  }

  releaseSeat(seatId, reason, userId) {
    const db = this.db;
    const idx = db.seatAssignments.findIndex(a => a.seatId === seatId && a.status === 'active');
    if (idx === -1) throw new Error('No active assignment found');
    db.seatAssignments[idx] = {
      ...db.seatAssignments[idx],
      status: 'released',
      releasedAt: now(),
      releaseReason: reason,
      releasedBy: userId
    };
    this._save(db);
    this.addActivity({
      action: 'seat_released',
      entity: 'seat',
      entityId: seatId,
      description: `Seat released. Reason: ${reason}`
    });
    return db.seatAssignments[idx];
  }

  transferSeat(fromSeatId, toSeatId, studentId, reason) {
    // Validate destination
    const destAssignment = this.getActiveAssignment(toSeatId);
    if (destAssignment) throw new Error('Destination seat is already occupied.');

    const db = this.db;

    // Release old seat
    const fromIdx = db.seatAssignments.findIndex(a => a.seatId === fromSeatId && a.status === 'active');
    if (fromIdx === -1) throw new Error('Source seat has no active assignment.');

    const oldAssignment = db.seatAssignments[fromIdx];
    db.seatAssignments[fromIdx] = { ...oldAssignment, status: 'transferred', transferredAt: now(), transferReason: reason };

    // Create new assignment
    const newAssignment = {
      id: uid('ASN'),
      status: 'active',
      seatId: toSeatId,
      studentId: oldAssignment.studentId,
      membershipId: oldAssignment.membershipId,
      startDate: now(),
      endDate: oldAssignment.endDate,
      createdAt: now(),
      transferredFrom: fromSeatId
    };
    db.seatAssignments.push(newAssignment);

    // Create seat transfer record
    const fromSeat = this.getSeat(fromSeatId);
    const toSeat = this.getSeat(toSeatId);
    db.seatTransfers = db.seatTransfers || [];
    db.seatTransfers.push({
      id: uid('TRF'),
      studentId,
      fromSeatId,
      toSeatId,
      reason,
      date: now(),
      fromSeatLabel: fromSeat?.label,
      toSeatLabel: toSeat?.label
    });

    this._save(db);
    this.addActivity({
      action: 'seat_transferred',
      entity: 'seat',
      entityId: fromSeatId,
      description: `Seat transferred from ${fromSeat?.label} to ${toSeat?.label}. Reason: ${reason}`
    });
    return newAssignment;
  }

  // ── Reservations ─────────────────────────────────────────────────
  getReservations(seatId) {
    const reservations = this.db.reservations || [];
    return seatId ? reservations.filter(r => r.seatId === seatId) : reservations;
  }

  getActiveReservation(seatId) {
    const today = new Date();
    return (this.db.reservations || []).find(r =>
      r.seatId === seatId &&
      r.status === 'upcoming' &&
      new Date(r.startDate) <= today &&
      new Date(r.endDate) >= today
    );
  }

  addReservation(data) {
    const db = this.db;
    const reservation = { id: uid('RES'), status: 'upcoming', createdAt: now(), ...data };
    db.reservations.push(reservation);
    this._save(db);
    return reservation;
  }

  updateReservation(id, updates) {
    const db = this.db;
    const idx = db.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reservation not found');
    db.reservations[idx] = { ...db.reservations[idx], ...updates, updatedAt: now() };
    this._save(db);
    return db.reservations[idx];
  }

  // ── Payments ────────────────────────────────────────────────────
  getPayments(membershipId) {
    const payments = this.db.payments || [];
    return membershipId ? payments.filter(p => p.membershipId === membershipId) : payments;
  }

  getPaymentsForStudent(studentId) {
    const membershipIds = this.getMemberships(studentId).map(m => m.id);
    return (this.db.payments || []).filter(p => membershipIds.includes(p.membershipId));
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
    return this.getPayments(membershipId)
      .filter(p => p.status !== 'refunded')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getPendingAmount(membershipId) {
    const membership = this.getMembership(membershipId);
    if (!membership) return 0;
    const totalDue = membership.price - (membership.discount || 0);
    const paid = this.getPaidAmount(membershipId);
    return Math.max(0, totalDue - paid);
  }

  recordPayment(data) {
    const membership = this.getMembership(data.membershipId);
    if (!membership) throw new Error('Membership not found');

    const pending = this.getPendingAmount(data.membershipId);
    if (data.amount > pending + 1000) {
      // Allow up to 1000 advance, otherwise warn
      // (not throwing, just logging)
      console.warn('Payment exceeds outstanding amount — recording as advance');
    }

    const db = this.db;
    const payment = {
      id: uid('PAY'),
      status: 'recorded',
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      recordedAt: now(),
      ...data
    };
    db.payments.push(payment);
    this._save(db);
    this.addActivity({
      action: 'payment_recorded',
      entity: 'payment',
      entityId: payment.id,
      description: `Payment of ${formatINR(payment.amount)} recorded`
    });
    return payment;
  }

  // ── Attendance ──────────────────────────────────────────────────
  getAttendance(studentId, date) {
    const records = this.db.attendance || [];
    if (studentId && date) return records.find(a => a.studentId === studentId && a.date === date);
    if (studentId) return records.filter(a => a.studentId === studentId);
    if (date) return records.filter(a => a.date === date);
    return records;
  }

  getTodayAttendance() {
    return this.getAttendance(null, today());
  }

  checkIn(studentId, time) {
    const db = this.db;
    const dateStr = today();
    const existing = db.attendance.find(a => a.studentId === studentId && a.date === dateStr);
    if (existing) {
      existing.checkIn = time || now();
      existing.status = 'checked-in';
    } else {
      db.attendance.push({
        id: uid('ATT'),
        studentId,
        date: dateStr,
        checkIn: time || now(),
        status: 'checked-in'
      });
    }
    this._save(db);
    this.addActivity({
      action: 'check_in',
      entity: 'student',
      entityId: studentId,
      description: 'Student checked in'
    });
  }

  checkOut(studentId, time) {
    const db = this.db;
    const dateStr = today();
    const idx = db.attendance.findIndex(a => a.studentId === studentId && a.date === dateStr);
    if (idx === -1) throw new Error('No check-in record found for today');
    const record = db.attendance[idx];
    const checkOutTime = time || now();
    const duration = record.checkIn
      ? Math.round((new Date(checkOutTime) - new Date(record.checkIn)) / 60000)
      : null;
    db.attendance[idx] = { ...record, checkOut: checkOutTime, status: 'checked-out', duration };
    this._save(db);
    return db.attendance[idx];
  }

  // ── Expenses ─────────────────────────────────────────────────────
  getExpenses(branchId) {
    const expenses = this.db.expenses || [];
    return branchId ? expenses.filter(e => e.branchId === branchId) : expenses;
  }

  addExpense(data) {
    const db = this.db;
    const expense = { id: uid('EXP'), createdAt: now(), ...data };
    db.expenses.push(expense);
    this._save(db);
    return expense;
  }

  // ── Notifications ────────────────────────────────────────────────
  getNotifications(branchId) {
    return (this.db.notifications || []).filter(n => !branchId || n.branchId === branchId);
  }

  getUnreadCount() {
    return this.getNotifications().filter(n => !n.read).length;
  }

  markNotificationRead(id) {
    const db = this.db;
    const notif = db.notifications.find(n => n.id === id);
    if (notif) { notif.read = true; this._save(db); }
  }

  markAllRead() {
    const db = this.db;
    db.notifications.forEach(n => { n.read = true; });
    this._save(db);
  }

  // ── Activity Log ─────────────────────────────────────────────────
  getActivityLogs(limit) {
    const logs = [...(this.db.activityLog || [])].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  addActivity(data) {
    const db = this.db;
    db.activityLog = db.activityLog || [];
    db.activityLog.push({
      id: uid('ACT'),
      timestamp: now(),
      userId: 'admin',
      ...data
    });
    // Keep last 500 activities
    if (db.activityLog.length > 500) {
      db.activityLog = db.activityLog.slice(-500);
    }
    this._save(db);
  }

  // ── Waitlist ─────────────────────────────────────────────────────
  getWaitlist(branchId) {
    return (this.db.waitlist || []).filter(w => !branchId || w.branchId === branchId);
  }

  addToWaitlist(data) {
    const db = this.db;
    const entry = { id: uid('WL'), status: 'waiting', createdAt: now(), priority: 1, ...data };
    db.waitlist.push(entry);
    this._save(db);
    return entry;
  }

  // ── Staff ────────────────────────────────────────────────────────
  getStaff(branchId) {
    return (this.db.staff || []).filter(s => !branchId || s.branchId === branchId);
  }

  addStaff(data) {
    const db = this.db;
    const staff = { id: uid('STF'), status: 'active', createdAt: now(), ...data };
    db.staff.push(staff);
    this._save(db);
    return staff;
  }

  // ── Aggregations ─────────────────────────────────────────────────
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

    // Revenue today
    const todayPayments = (this.db.payments || []).filter(p => {
      const d = new Date(p.recordedAt);
      return d.toDateString() === today_.toDateString();
    });
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    // This month
    const monthPayments = (this.db.payments || []).filter(p => {
      const d = new Date(p.recordedAt);
      return d.getMonth() === today_.getMonth() && d.getFullYear() === today_.getFullYear();
    });
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Pending dues
    const activeMemberships = (this.db.memberships || []).filter(m => {
      const students = this.getStudents(branchId).map(s => s.id);
      return students.includes(m.studentId) && m.status === 'active';
    });
    let totalPending = 0;
    activeMemberships.forEach(m => {
      totalPending += this.getPendingAmount(m.id);
    });

    // Expiring this week
    const nextWeek = new Date(today_);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const expiringCount = activeMemberships.filter(m => {
      const exp = new Date(m.endDate);
      return exp >= today_ && exp <= nextWeek;
    }).length;

    // Attendance today
    const todayAtt = this.getTodayAttendance();
    const branchStudentIds = this.getStudents(branchId).map(s => s.id);
    const presentToday = todayAtt.filter(a => branchStudentIds.includes(a.studentId)).length;

    return {
      totalSeats, occupied, available, reserved, maintenance,
      todayRevenue, monthRevenue, totalPending,
      expiringCount, presentToday
    };
  }

  getExpiringMemberships(branchId, days = 7) {
    const today_ = new Date();
    const future = new Date(today_);
    future.setDate(future.getDate() + days);

    const studentIds = this.getStudents(branchId).map(s => s.id);
    return (this.db.memberships || [])
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

    (this.db.memberships || []).forEach(m => {
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

      const dayPayments = (this.db.payments || []).filter(p =>
        new Date(p.recordedAt).toDateString() === dateStr
      );
      const amount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      result.push({
        date: d,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        amount
      });
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

  // ── Settings ─────────────────────────────────────────────────────
  getSettings() { return this.db.settings || {}; }
  updateSettings(updates) {
    const db = this.db;
    db.settings = { ...db.settings, ...updates };
    this._save(db);
  }
}

// ── Utilities ──────────────────────────────────────────────────────
function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

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

window.Store = Store;
window.store = new Store();
window.utils = { uid, now, today, formatINR, getAvatarColor, initials, formatDate, formatTime, formatRelative, daysUntil, addDays };
