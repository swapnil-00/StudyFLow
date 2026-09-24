// api/data.js — Main data API: returns app data from Neon DB
const { cors, query } = require('./db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const branchFilter = req.query.branchId;

    const [
      branches, floors, rooms, seats, students,
      membershipPlans, memberships, seatAssignments,
      reservations, payments, attendance, expenses,
      notifications, activityLogs, waitlist, staff,
      seatTransfers, settingsRes, documentsRes, commLogsRes
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY created_at'),
      query('SELECT * FROM floors ORDER BY created_at'),
      query('SELECT * FROM rooms ORDER BY created_at'),
      query('SELECT * FROM seats ORDER BY created_at'),
      query('SELECT * FROM students ORDER BY created_at DESC'),
      query('SELECT * FROM membership_plans ORDER BY created_at'),
      query('SELECT * FROM memberships ORDER BY created_at DESC'),
      query('SELECT * FROM seat_assignments ORDER BY created_at DESC'),
      query('SELECT * FROM reservations ORDER BY created_at DESC'),
      query('SELECT * FROM payments ORDER BY created_at DESC'),
      query('SELECT * FROM attendance ORDER BY created_at DESC'),
      query('SELECT * FROM expenses ORDER BY created_at DESC'),
      query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'),
      query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500'),
      query('SELECT * FROM waitlist ORDER BY created_at DESC'),
      query('SELECT * FROM staff ORDER BY created_at'),
      query('SELECT * FROM seat_transfers ORDER BY created_at DESC'),
      query('SELECT * FROM settings WHERE id=$1', ['default']),
      query('SELECT * FROM documents ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
      query('SELECT * FROM communication_logs ORDER BY created_at DESC LIMIT 200').catch(() => ({ rows: [] })),
    ]);

    // Map snake_case DB columns → camelCase for frontend compatibility
    function mapBranch(b) {
      return { id: b.id, name: b.name, city: b.city, address: b.address, phone: b.phone, email: b.email, status: b.status, openTime: b.open_time, closeTime: b.close_time, createdAt: b.created_at };
    }
    function mapFloor(f) {
      return { id: f.id, branchId: f.branch_id, name: f.name, floorNumber: f.floor_number, description: f.description, createdAt: f.created_at };
    }
    function mapRoom(r) {
      return { id: r.id, floorId: r.floor_id, branchId: r.branch_id, name: r.name, type: r.room_type, capacity: r.capacity, createdAt: r.created_at };
    }
    function mapSeat(s) {
      return { id: s.id, roomId: s.room_id, branchId: s.branch_id, label: s.seat_number, number: s.seat_number, row: s.row_label, type: s.seat_type, amenities: s.amenities || [], status: s.status, currentStudentId: s.current_student_id, position: { x: parseFloat(s.position_x) || 0, y: parseFloat(s.position_y) || 0 }, createdAt: s.created_at };
    }
    function mapStudent(s) {
      return { id: s.id, name: s.name, email: s.email, phone: s.phone, emergencyContact: s.emergency_contact, avatar: s.avatar_color, avatarColor: s.avatar_color, idProof: s.id_proof, address: s.address, notes: s.notes, status: s.status, joinDate: s.join_date, branchId: s.branch_id, country_code: s.country_code || '+91', normalized_phone: s.normalized_phone || s.phone, whatsapp_opt_in: s.whatsapp_opt_in !== false, communication_preferences: s.communication_preferences || { whatsapp: true, payment_reminders: true, membership_reminders: true, booking_notifications: true, receipt_notifications: true, announcements: true }, createdAt: s.created_at };
    }
    function mapPlan(p) {
      return { id: p.id, name: p.name, duration: p.duration, durationUnit: p.duration_unit, price: parseFloat(p.price), description: p.description, active: p.active, accessHours: p.access_hours, createdAt: p.created_at };
    }
    function mapMembership(m) {
      return { id: m.id, studentId: m.student_id, planId: m.plan_id, branchId: m.branch_id, seatId: m.seat_id, startDate: m.start_date, endDate: m.end_date, price: parseFloat(m.price), discount: parseFloat(m.discount) || 0, finalAmount: parseFloat(m.final_amount), status: m.status, paymentStatus: m.payment_status, createdAt: m.created_at };
    }
    function mapAssignment(a) {
      return { id: a.id, seatId: a.seat_id, studentId: a.student_id, membershipId: a.membership_id, branchId: a.branch_id, startDate: a.start_date, endDate: a.end_date, slotType: a.slot_type, status: a.status, createdAt: a.created_at };
    }
    function mapReservation(r) {
      return { id: r.id, seatId: r.seat_id, studentId: r.student_id, branchId: r.branch_id, startDate: r.reservation_date || r.start_date, endDate: r.end_date, slotType: r.slot_type, startTime: r.start_time, endTime: r.end_time, notes: r.notes, status: r.status, createdAt: r.created_at };
    }
    function mapPayment(p) {
      return { id: p.id, studentId: p.student_id, membershipId: p.membership_id, branchId: p.branch_id, amount: parseFloat(p.amount), method: p.mode, mode: p.mode, receiptNumber: p.reference_number, referenceNumber: p.reference_number, date: p.date, recordedAt: p.created_at, notes: p.notes, status: p.status, createdAt: p.created_at };
    }
    function mapAttendance(a) {
      return { id: a.id, studentId: a.student_id, seatId: a.seat_id, branchId: a.branch_id, checkIn: a.check_in, checkOut: a.check_out, date: a.date, method: a.method, status: a.check_out ? 'checked-out' : 'checked-in', createdAt: a.created_at };
    }
    function mapExpense(e) {
      return { id: e.id, branchId: e.branch_id, category: e.category, title: e.title, description: e.title, amount: parseFloat(e.amount), date: e.date, method: e.payment_mode, paymentMode: e.payment_mode, vendor: e.vendor, receiptRef: e.receipt_ref, recordedBy: e.recorded_by, createdAt: e.created_at };
    }
    function mapNotification(n) {
      return { id: n.id, title: n.title, message: n.message, type: n.type, date: n.date, read: n.read, link: n.link, createdAt: n.created_at };
    }
    function mapActivity(a) {
      return { id: a.id, userId: a.user_id, action: a.action, description: a.details, details: a.details, timestamp: a.timestamp || a.created_at, entity: a.entity_type, entityType: a.entity_type, entityId: a.entity_id, createdAt: a.created_at };
    }
    function mapWaitlist(w) {
      return { id: w.id, studentId: w.student_id, branchId: w.branch_id, requestedSeatType: w.requested_seat_type, priority: w.priority, notes: w.notes, status: w.status, createdAt: w.created_at };
    }
    function mapStaff(s) {
      return { id: s.id, name: s.name, role: s.role, email: s.email, phone: s.phone, branchId: s.branch_id, status: s.status, createdAt: s.created_at };
    }
    function mapTransfer(t) {
      return { id: t.id, studentId: t.student_id, fromSeatId: t.from_seat_id, toSeatId: t.to_seat_id, date: t.date, reason: t.reason, approvedBy: t.approved_by, createdAt: t.created_at };
    }
    function mapDocument(d) {
      return {
        id: d.id,
        documentType: d.document_type,
        documentNumber: d.document_number,
        studentId: d.student_id,
        branchId: d.branch_id,
        membershipId: d.membership_id,
        ...(d.document_data || {}),
        createdAt: d.created_at
      };
    }
    function mapCommLog(c) {
      return {
        id: c.id,
        studentId: c.student_id,
        eventType: c.event_type,
        phoneNumber: c.phone_number,
        templateName: c.template_name,
        language: c.language,
        bodyText: c.body_text,
        idempotencyKey: c.idempotency_key,
        status: c.status,
        provider: c.provider,
        providerMessageId: c.provider_message_id,
        documentId: c.document_id,
        retryCount: c.retry_count,
        errorMessage: c.error_message,
        sentAt: c.sent_at,
        deliveredAt: c.delivered_at,
        createdAt: c.created_at
      };
    }

    const rawSettings = settingsRes.rows[0] || {};
    const sanitizedData = { ...(rawSettings.data || {}) };
    // Security: never leak sensitive credentials to client
    delete sanitizedData.waToken;
    delete sanitizedData.accessToken;
    delete sanitizedData.apiKey;
    delete sanitizedData.secretKey;

    const settings = {
      currency: rawSettings.currency || 'INR',
      timezone: rawSettings.timezone || 'Asia/Kolkata',
      orgName: rawSettings.org_name || 'StudyFlow Library',
      address: rawSettings.address || '',
      phone: rawSettings.phone || '',
      email: rawSettings.email || '',
      theme: rawSettings.theme || 'light',
      ...sanitizedData,
      waConfigured: Boolean(rawSettings.data?.waToken || process.env.WHATSAPP_TOKEN),
    };

    const db = {
      branches: branches.rows.map(mapBranch),
      floors: floors.rows.map(mapFloor),
      rooms: rooms.rows.map(mapRoom),
      seats: seats.rows.map(mapSeat),
      students: students.rows.map(mapStudent),
      membershipPlans: membershipPlans.rows.map(mapPlan),
      memberships: memberships.rows.map(mapMembership),
      seatAssignments: seatAssignments.rows.map(mapAssignment),
      reservations: reservations.rows.map(mapReservation),
      payments: payments.rows.map(mapPayment),
      attendance: attendance.rows.map(mapAttendance),
      expenses: expenses.rows.map(mapExpense),
      notifications: notifications.rows.map(mapNotification),
      activityLog: activityLogs.rows.map(mapActivity),
      waitlist: waitlist.rows.map(mapWaitlist),
      staff: staff.rows.map(mapStaff),
      seatTransfers: seatTransfers.rows.map(mapTransfer),
      documents: documentsRes.rows.map(mapDocument),
      notificationMessages: commLogsRes.rows.map(mapCommLog),
      settings,
    };

    res.status(200).json({ ok: true, db });
  } catch (err) {
    console.error('API /data error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
