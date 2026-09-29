// lib/validate.js — Centralized Input Validation (SEC-010, SEC-016)
'use strict';
const { HttpError } = require('./errors');

function isPositiveDecimal(val, max = 10000000) {
  if (val === undefined || val === null) return false;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num <= 0 || num > max) return false;
  // At most 2 decimal places
  const parts = String(val).split('.');
  if (parts.length > 1 && parts[1].length > 2) return false;
  return true;
}

function isDateString(val) {
  if (!val || typeof val !== 'string') return false;
  return !isNaN(Date.parse(val));
}

function sanitizeString(val, maxLength = 255) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

const SCHEMAS = {
  branches: {
    insert: (data) => {
      if (!data?.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Branch name is required');
      }
      return {
        name: sanitizeString(data.name, 100),
        city: sanitizeString(data.city || '', 100),
        address: sanitizeString(data.address || '', 500),
        phone: sanitizeString(data.phone || '', 20),
        email: sanitizeString(data.email || '', 100),
        status: sanitizeString(data.status || 'active', 20),
        openTime: sanitizeString(data.openTime || data.open_time || '06:00', 10),
        closeTime: sanitizeString(data.closeTime || data.close_time || '23:00', 10),
        capacity: Number(data.capacity) || 0,
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.name !== undefined) cleaned.name = sanitizeString(data.name, 100);
      if (data.city !== undefined) cleaned.city = sanitizeString(data.city, 100);
      if (data.address !== undefined) cleaned.address = sanitizeString(data.address, 500);
      if (data.phone !== undefined) cleaned.phone = sanitizeString(data.phone, 20);
      if (data.email !== undefined) cleaned.email = sanitizeString(data.email, 100);
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 20);
      if (data.openTime !== undefined || data.open_time !== undefined) {
        cleaned.openTime = sanitizeString(data.openTime || data.open_time, 10);
      }
      if (data.closeTime !== undefined || data.close_time !== undefined) {
        cleaned.closeTime = sanitizeString(data.closeTime || data.close_time, 10);
      }
      if (data.capacity !== undefined) cleaned.capacity = Number(data.capacity) || 0;
      return cleaned;
    }
  },

  floors: {
    insert: (data) => {
      if (!data?.name) throw new HttpError(400, 'VALIDATION_ERROR', 'Floor name is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      return {
        name: sanitizeString(data.name, 100),
        branchId: sanitizeString(data.branchId, 64),
        floorNumber: Number(data.floorNumber) || 1,
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.name !== undefined) cleaned.name = sanitizeString(data.name, 100);
      if (data.floorNumber !== undefined) cleaned.floorNumber = Number(data.floorNumber) || 1;
      return cleaned;
    }
  },

  rooms: {
    insert: (data) => {
      if (!data?.name) throw new HttpError(400, 'VALIDATION_ERROR', 'Room name is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      return {
        name: sanitizeString(data.name, 100),
        branchId: sanitizeString(data.branchId, 64),
        floorId: data.floorId ? sanitizeString(data.floorId, 64) : null,
        roomType: sanitizeString(data.roomType || data.type || 'study', 50),
        capacity: Number(data.capacity) || 0,
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.name !== undefined) cleaned.name = sanitizeString(data.name, 100);
      if (data.roomType !== undefined || data.type !== undefined) {
        cleaned.roomType = sanitizeString(data.roomType || data.type, 50);
      }
      if (data.capacity !== undefined) cleaned.capacity = Number(data.capacity) || 0;
      return cleaned;
    }
  },

  seats: {
    insert: (data) => {
      const seatNumber = data?.seatNumber || data?.number || data?.label;
      if (!seatNumber) throw new HttpError(400, 'VALIDATION_ERROR', 'Seat number is required');
      if (!data?.roomId) throw new HttpError(400, 'VALIDATION_ERROR', 'Room ID is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      const posX = data.x !== undefined ? data.x : (data.position?.x !== undefined ? data.position.x : 0);
      const posY = data.y !== undefined ? data.y : (data.position?.y !== undefined ? data.position.y : 0);
      return {
        seatNumber: sanitizeString(String(seatNumber), 20),
        roomId: sanitizeString(data.roomId, 64),
        branchId: sanitizeString(data.branchId, 64),
        floorId: data.floorId ? sanitizeString(data.floorId, 64) : null,
        rowLabel: sanitizeString(data.rowLabel || data.label || '', 20),
        x: Number(posX) || 0,
        y: Number(posY) || 0,
        width: Number(data.width) || 40,
        height: Number(data.height) || 40,
        type: sanitizeString(data.type || data.seatType || 'standard', 30),
      };
    },
    update: (data) => {
      // SEC-016: Explicitly block client from modifying status or currentStudentId directly!
      const cleaned = {};
      const seatNumber = data.seatNumber !== undefined ? data.seatNumber : (data.number !== undefined ? data.number : data.label);
      if (seatNumber !== undefined) cleaned.seatNumber = sanitizeString(String(seatNumber), 20);
      if (data.x !== undefined) cleaned.x = Number(data.x) || 0;
      else if (data.position?.x !== undefined) cleaned.x = Number(data.position.x) || 0;
      if (data.y !== undefined) cleaned.y = Number(data.y) || 0;
      else if (data.position?.y !== undefined) cleaned.y = Number(data.position.y) || 0;
      if (data.width !== undefined) cleaned.width = Number(data.width) || 40;
      if (data.height !== undefined) cleaned.height = Number(data.height) || 40;
      if (data.type !== undefined || data.seatType !== undefined) {
        cleaned.type = sanitizeString(data.type || data.seatType, 30);
      }
      if (data.rowLabel !== undefined || data.label !== undefined) {
        cleaned.rowLabel = sanitizeString(data.rowLabel || data.label, 20);
      }
      return cleaned;
    }
  },

  students: {
    insert: (data) => {
      if (!data?.name) throw new HttpError(400, 'VALIDATION_ERROR', 'Student name is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      const aadhaarVal = data.idProof || data.idProofNumber || data.aadhaar || data.aadhar || '';
      return {
        name: sanitizeString(data.name, 100),
        phone: sanitizeString(data.phone || '', 20),
        email: sanitizeString(data.email || '', 100),
        branchId: sanitizeString(data.branchId, 64),
        address: sanitizeString(data.address || '', 500),
        emergencyContact: sanitizeString(data.emergencyContact || '', 100),
        idProof: sanitizeString(aadhaarVal, 50),
        idProofType: sanitizeString(data.idProofType || (aadhaarVal ? 'Aadhaar' : ''), 50),
        idProofNumber: sanitizeString(aadhaarVal, 50),
        status: sanitizeString(data.status || 'active', 20),
        country_code: sanitizeString(data.country_code || '+91', 10),
        avatar: sanitizeString(data.avatar || data.avatarColor || '', 50),
        avatarColor: sanitizeString(data.avatarColor || data.avatar || '', 50),
        notes: sanitizeString(data.notes || '', 1000),
        whatsappOptIn: data.whatsappOptIn !== false && data.whatsapp_opt_in !== false,
        communicationPreferences: data.communicationPreferences || data.communication_preferences || { whatsapp: true, email: false, sms: false },
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.name !== undefined) cleaned.name = sanitizeString(data.name, 100);
      if (data.phone !== undefined) cleaned.phone = sanitizeString(data.phone, 20);
      if (data.email !== undefined) cleaned.email = sanitizeString(data.email, 100);
      if (data.address !== undefined) cleaned.address = sanitizeString(data.address, 500);
      if (data.emergencyContact !== undefined) cleaned.emergencyContact = sanitizeString(data.emergencyContact, 100);
      if (data.idProof !== undefined || data.idProofNumber !== undefined || data.aadhaar !== undefined || data.aadhar !== undefined) {
        const val = data.idProof ?? data.idProofNumber ?? data.aadhaar ?? data.aadhar ?? '';
        cleaned.idProof = sanitizeString(val, 50);
        cleaned.idProofNumber = sanitizeString(val, 50);
      }
      if (data.idProofType !== undefined) cleaned.idProofType = sanitizeString(data.idProofType, 50);
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 20);
      if (data.country_code !== undefined) cleaned.country_code = sanitizeString(data.country_code, 10);
      if (data.avatarColor !== undefined || data.avatar !== undefined) {
        cleaned.avatarColor = sanitizeString(data.avatarColor || data.avatar, 50);
      }
      if (data.notes !== undefined) cleaned.notes = sanitizeString(data.notes, 1000);
      if (data.branchId !== undefined) cleaned.branchId = sanitizeString(data.branchId, 64);
      if (data.whatsappOptIn !== undefined) cleaned.whatsappOptIn = Boolean(data.whatsappOptIn);
      if (data.whatsapp_opt_in !== undefined) cleaned.whatsappOptIn = Boolean(data.whatsapp_opt_in);
      if (data.communicationPreferences !== undefined) cleaned.communicationPreferences = data.communicationPreferences;
      if (data.communication_preferences !== undefined) cleaned.communicationPreferences = data.communication_preferences;
      return cleaned;
    }
  },

  waitlist: {
    insert: (data) => {
      return {
        studentId: sanitizeString(data.studentId || data.student_id, 64),
        branchId: (data.branchId || data.branch_id) ? sanitizeString(data.branchId || data.branch_id, 64) : null,
        requestedSeatType: sanitizeString(data.requestedSeatType || data.requested_seat_type || 'standard', 50),
        priority: Number(data.priority) || 1,
        notes: sanitizeString(data.notes || '', 500),
        status: sanitizeString(data.status || 'waiting', 50),
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 50);
      if (data.notes !== undefined) cleaned.notes = sanitizeString(data.notes, 500);
      if (data.priority !== undefined) cleaned.priority = Number(data.priority) || 1;
      if (data.requestedSeatType !== undefined || data.requested_seat_type !== undefined) {
        cleaned.requestedSeatType = sanitizeString(data.requestedSeatType || data.requested_seat_type, 50);
      }
      return cleaned;
    }
  },

  memberships: {
    insert: (data) => {
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.planId) throw new HttpError(400, 'VALIDATION_ERROR', 'Plan ID is required');
      return {
        studentId: sanitizeString(data.studentId, 64),
        planId: sanitizeString(data.planId, 64),
        branchId: data.branchId ? sanitizeString(data.branchId, 64) : null,
        seatId: data.seatId ? sanitizeString(data.seatId, 64) : null,
        startDate: isDateString(data.startDate) ? data.startDate : new Date().toISOString().slice(0, 10),
        endDate: isDateString(data.endDate) ? data.endDate : null,
        price: isPositiveDecimal(data.price) ? Math.round(Number(data.price) * 100) / 100 : 0,
        discount: Number(data.discount) || 0,
        finalAmount: Number(data.finalAmount) || (Number(data.price) - (Number(data.discount) || 0)),
        status: sanitizeString(data.status || 'active', 50),
      };
    },
    update: (data) => {
      // Payment status is owned exclusively by the server based on recorded payments
      const cleaned = {};
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 50);
      if (data.startDate !== undefined && isDateString(data.startDate)) cleaned.startDate = data.startDate;
      if (data.endDate !== undefined && isDateString(data.endDate)) cleaned.endDate = data.endDate;
      if (data.seatId !== undefined) cleaned.seatId = data.seatId ? sanitizeString(data.seatId, 64) : null;
      if (data.notes !== undefined) cleaned.notes = sanitizeString(data.notes, 500);
      // Explicitly reject direct client modification of payment status
      if (data.paymentStatus !== undefined || data.payment_status !== undefined) {
        if (Object.keys(cleaned).length === 0) {
          throw new HttpError(400, 'INVALID_MUTATION', 'Payment status is computed automatically by the server from payment records.');
        }
      }
      return cleaned;
    }
  },

  seat_assignments: {
    insert: (data) => {
      if (!data?.seatId) throw new HttpError(400, 'VALIDATION_ERROR', 'Seat ID is required');
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      return {
        seatId: sanitizeString(data.seatId, 64),
        studentId: sanitizeString(data.studentId, 64),
        membershipId: data.membershipId ? sanitizeString(data.membershipId, 64) : null,
        branchId: data.branchId ? sanitizeString(data.branchId, 64) : null,
        startDate: isDateString(data.startDate) ? data.startDate : null,
        endDate: isDateString(data.endDate) ? data.endDate : null,
        slotType: sanitizeString(data.slotType || 'full-day', 30),
        status: sanitizeString(data.status || 'active', 30),
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.status !== undefined) {
        const allowed = ['active', 'released', 'transferred', 'expired'];
        if (!allowed.includes(data.status)) {
          throw new HttpError(400, 'VALIDATION_ERROR', `Invalid status: ${data.status}`);
        }
        cleaned.status = data.status;
      }
      if (data.endDate !== undefined) cleaned.endDate = data.endDate;
      if (data.membershipId !== undefined) cleaned.membershipId = data.membershipId;
      return cleaned;
    },
    release: (data) => {
      if (!data?.seatId) throw new HttpError(400, 'VALIDATION_ERROR', 'Seat ID is required');
      return { seatId: sanitizeString(data.seatId, 64) };
    },
    transfer: (data) => {
      if (!data?.fromSeatId || !data?.toSeatId) throw new HttpError(400, 'VALIDATION_ERROR', 'Source and destination seat IDs are required');
      return {
        fromSeatId: sanitizeString(data.fromSeatId, 64),
        toSeatId: sanitizeString(data.toSeatId, 64),
        reason: sanitizeString(data.reason || '', 500)
      };
    }
  },

  bookings: {
    create: (data) => {
      if (!data?.seatId) throw new HttpError(400, 'VALIDATION_ERROR', 'Seat ID is required');
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.planId) throw new HttpError(400, 'VALIDATION_ERROR', 'Membership plan ID is required');
      if (data?.startDate && !isDateString(data.startDate)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date must be a valid date');
      }
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      let mode = data.mode || data.method || data.payMethod || null;
      if (mode) {
        mode = String(mode).toLowerCase().replace(/\s+/g, '_');
        if (!allowedModes.includes(mode)) {
          throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
        }
      }
      return {
        seatId: sanitizeString(data.seatId, 64),
        studentId: sanitizeString(data.studentId, 64),
        planId: sanitizeString(data.planId, 64),
        startDate: data.startDate ? sanitizeString(data.startDate, 30) : undefined,
        endDate: data.endDate ? sanitizeString(data.endDate, 30) : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        discount: data.discount !== undefined ? Math.max(0, Number(data.discount)) : 0,
        payAmount: data.payAmount !== undefined ? Number(data.payAmount) : undefined,
        payStatus: sanitizeString(data.payStatus || '', 30),
        mode: mode || undefined,
        method: mode || undefined,
        referenceNumber: sanitizeString(data.referenceNumber || data.txnId || '', 100),
        notes: sanitizeString(data.notes || '', 500),
        idempotencyKey: sanitizeString(data.idempotencyKey || data.idempotency_key || '', 100)
      };
    },
    insert: (data) => {
      if (!data?.seatId) throw new HttpError(400, 'VALIDATION_ERROR', 'Seat ID is required');
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.planId) throw new HttpError(400, 'VALIDATION_ERROR', 'Membership plan ID is required');
      if (data?.startDate && !isDateString(data.startDate)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date must be a valid date');
      }
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      let mode = data.mode || data.method || data.payMethod || null;
      if (mode) {
        mode = String(mode).toLowerCase().replace(/\s+/g, '_');
        if (!allowedModes.includes(mode)) {
          throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
        }
      }
      return {
        seatId: sanitizeString(data.seatId, 64),
        studentId: sanitizeString(data.studentId, 64),
        planId: sanitizeString(data.planId, 64),
        startDate: data.startDate ? sanitizeString(data.startDate, 30) : undefined,
        endDate: data.endDate ? sanitizeString(data.endDate, 30) : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        discount: data.discount !== undefined ? Math.max(0, Number(data.discount)) : 0,
        payAmount: data.payAmount !== undefined ? Number(data.payAmount) : undefined,
        payStatus: sanitizeString(data.payStatus || '', 30),
        mode: mode || undefined,
        method: mode || undefined,
        referenceNumber: sanitizeString(data.referenceNumber || data.txnId || '', 100),
        notes: sanitizeString(data.notes || '', 500),
        idempotencyKey: sanitizeString(data.idempotencyKey || data.idempotency_key || '', 100)
      };
    },
    renew: (data) => {
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.planId) throw new HttpError(400, 'VALIDATION_ERROR', 'Membership plan ID is required');
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      let mode = data.mode || data.method || data.payMethod || null;
      if (mode) {
        mode = String(mode).toLowerCase().replace(/\s+/g, '_');
        if (!allowedModes.includes(mode)) {
          throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
        }
      }
      return {
        studentId: sanitizeString(data.studentId, 64),
        seatId: data.seatId ? sanitizeString(data.seatId, 64) : undefined,
        planId: sanitizeString(data.planId, 64),
        startDate: data.startDate ? sanitizeString(data.startDate, 30) : undefined,
        endDate: data.endDate ? sanitizeString(data.endDate, 30) : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        discount: data.discount !== undefined ? Math.max(0, Number(data.discount)) : 0,
        payAmount: data.payAmount !== undefined ? Number(data.payAmount) : (data.amount !== undefined ? Number(data.amount) : undefined),
        mode: mode || undefined,
        method: mode || undefined,
        referenceNumber: sanitizeString(data.referenceNumber || data.txnId || '', 100),
        notes: sanitizeString(data.notes || '', 500),
        idempotencyKey: sanitizeString(data.idempotencyKey || data.idempotency_key || '', 100)
      };
    }
  },

  payments: {
    insert: (data) => {
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.branchId && !data?.membershipId) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID or Membership ID is required');
      }
      if (!isPositiveDecimal(data?.amount)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Payment amount must be a positive number with at most 2 decimal places');
      }
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      const rawMode = data.mode || data.method || 'cash';
      const mode = String(rawMode).toLowerCase().replace(/\s+/g, '_');
      if (!allowedModes.includes(mode)) {
        throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
      }
      return {
        studentId: sanitizeString(data.studentId, 64),
        membershipId: data.membershipId ? sanitizeString(data.membershipId, 64) : null,
        branchId: data.branchId ? sanitizeString(data.branchId, 64) : null,
        amount: Math.round(Number(data.amount) * 100) / 100,
        mode,
        referenceNumber: sanitizeString(data.referenceNumber || data.txnId || data.reference_number || '', 100),
        receiptNumber: sanitizeString(data.receiptNumber || '', 100),
        date: isDateString(data.date) ? data.date : new Date().toISOString().slice(0, 10),
        notes: sanitizeString(data.notes || '', 500),
        idempotencyKey: sanitizeString(data.idempotencyKey || data.idempotency_key || '', 100),
      };
    },
    void: (data) => {
      return {
        reason: sanitizeString(data?.reason || data?.voidReason || data?.notes || 'Payment voided', 500)
      };
    },
    refund: (data) => {
      return {
        reason: sanitizeString(data?.reason || data?.refundReason || data?.notes || 'Payment refunded', 500),
        amount: data?.amount ? Math.round(Number(data.amount) * 100) / 100 : undefined
      };
    }
  },

  expenses: {
    insert: (data) => {
      const title = sanitizeString(data?.title || data?.description || '', 255);
      if (!title) throw new HttpError(400, 'VALIDATION_ERROR', 'Expense title or description is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      if (!isPositiveDecimal(data?.amount)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Expense amount must be a positive number');
      }
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      const rawMode = data?.paymentMode || data?.method || 'cash';
      const paymentMode = String(rawMode).toLowerCase().replace(/\s+/g, '_');
      if (!allowedModes.includes(paymentMode)) {
        throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
      }

      return {
        title,
        category: sanitizeString(data.category || 'General', 100),
        branchId: sanitizeString(data.branchId, 64),
        amount: Math.round(Number(data.amount) * 100) / 100,
        date: isDateString(data.date) ? data.date : new Date().toISOString().slice(0, 10),
        paymentMode,
        vendor: sanitizeString(data.vendor || '', 255),
        receiptRef: sanitizeString(data.receiptRef || data.receipt_ref || '', 100),
        notes: sanitizeString(data.notes || data.description || '', 500),
        status: sanitizeString(data.status || 'active', 50),
        isRecurring: Boolean(data.isRecurring),
        recurringFrequency: sanitizeString(data.recurringFrequency || '', 50),
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.title !== undefined || data.description !== undefined) {
        const title = sanitizeString(data.title || data.description, 255);
        if (title) cleaned.title = title;
      }
      if (data.category !== undefined) cleaned.category = sanitizeString(data.category, 100);
      if (data.branchId !== undefined) cleaned.branchId = sanitizeString(data.branchId, 64);
      if (data.amount !== undefined) {
        if (!isPositiveDecimal(data.amount)) throw new HttpError(400, 'VALIDATION_ERROR', 'Amount must be positive');
        cleaned.amount = Math.round(Number(data.amount) * 100) / 100;
      }
      if (data.date !== undefined && isDateString(data.date)) cleaned.date = data.date;
      if (data.paymentMode !== undefined || data.method !== undefined) {
        const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
        const rawMode = data.paymentMode || data.method;
        const mode = String(rawMode).toLowerCase().replace(/\s+/g, '_');
        if (!allowedModes.includes(mode)) {
          throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
        }
        cleaned.paymentMode = mode;
      }
      if (data.vendor !== undefined) cleaned.vendor = sanitizeString(data.vendor, 255);
      if (data.receiptRef !== undefined || data.receipt_ref !== undefined) {
        cleaned.receiptRef = sanitizeString(data.receiptRef || data.receipt_ref, 100);
      }
      if (data.notes !== undefined) cleaned.notes = sanitizeString(data.notes, 500);
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 50);
      return cleaned;
    },
    void: (data) => {
      return {
        reason: sanitizeString(data?.reason || data?.voidReason || data?.notes || 'Expense voided', 500)
      };
    }
  },

  settings: {
    update: (data) => {
      const cleaned = {};
      if (data.currency !== undefined) cleaned.currency = sanitizeString(data.currency, 10);
      if (data.timezone !== undefined) cleaned.timezone = sanitizeString(data.timezone, 50);
      if (data.orgName !== undefined) cleaned.orgName = sanitizeString(data.orgName, 100);
      if (data.address !== undefined) cleaned.address = sanitizeString(data.address, 500);
      if (data.phone !== undefined) cleaned.phone = sanitizeString(data.phone, 20);
      if (data.email !== undefined) cleaned.email = sanitizeString(data.email, 100);
      if (data.theme !== undefined) cleaned.theme = sanitizeString(data.theme, 20);
      if (data.whatsappOpenIn !== undefined) cleaned.whatsappOpenIn = sanitizeString(data.whatsappOpenIn, 20);
      if (data.whatsappSignature !== undefined) cleaned.whatsappSignature = sanitizeString(data.whatsappSignature, 200);
      if (data.whatsappTemplates !== undefined && typeof data.whatsappTemplates === 'object' && data.whatsappTemplates !== null) {
        const t = {};
        for (const [k, v] of Object.entries(data.whatsappTemplates)) {
          if (typeof v === 'string') t[sanitizeString(k, 50)] = sanitizeString(v, 1000);
        }
        cleaned.whatsappTemplates = t;
      }
      return cleaned;
    }
  },

  communication_logs: {
    insert: (data) => {
      return {
        studentId: data.studentId ? sanitizeString(data.studentId, 64) : null,
        eventType: sanitizeString(data.eventType || data.templateKey || 'custom', 100),
        phoneNumber: sanitizeString(data.phoneNumber || data.phone || '', 50),
        templateName: sanitizeString(data.templateName || data.templateKey || '', 100),
        bodyText: sanitizeString(data.bodyText || data.message || '', 2000),
        status: sanitizeString(data.status || 'opened', 50),
      };
    },
    update: (data) => {
      const cleaned = {};
      if (data.status !== undefined) cleaned.status = sanitizeString(data.status, 50);
      return cleaned;
    }
  }
};

/**
 * Validates mutation data for a table and action.
 */
function validate(table, action, data) {
  const tableSchema = SCHEMAS[table];
  if (!tableSchema) return data; // Default pass-through if table has no strict schema
  const actionValidator = tableSchema[action];
  if (!actionValidator) return data;
  return actionValidator(data);
}

module.exports = {
  validate,
  isPositiveDecimal,
  isDateString,
  sanitizeString,
};
