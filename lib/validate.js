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
      return {
        name: sanitizeString(data.name, 100),
        phone: sanitizeString(data.phone || '', 20),
        email: sanitizeString(data.email || '', 100),
        branchId: sanitizeString(data.branchId, 64),
        address: sanitizeString(data.address || '', 500),
        emergencyContact: sanitizeString(data.emergencyContact || '', 100),
        idProof: sanitizeString(data.idProof || data.idProofNumber || '', 50),
        idProofType: sanitizeString(data.idProofType || '', 50),
        idProofNumber: sanitizeString(data.idProofNumber || data.idProof || '', 50),
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
      if (data.idProof !== undefined) cleaned.idProof = sanitizeString(data.idProof, 50);
      if (data.idProofType !== undefined) cleaned.idProofType = sanitizeString(data.idProofType, 50);
      if (data.idProofNumber !== undefined) cleaned.idProofNumber = sanitizeString(data.idProofNumber, 50);
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

  payments: {
    insert: (data) => {
      if (!data?.studentId) throw new HttpError(400, 'VALIDATION_ERROR', 'Student ID is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      if (!isPositiveDecimal(data?.amount)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Payment amount must be a positive number with at most 2 decimal places');
      }
      const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
      const mode = (data.mode || 'cash').toLowerCase();
      if (!allowedModes.includes(mode)) {
        throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
      }
      return {
        studentId: sanitizeString(data.studentId, 64),
        membershipId: data.membershipId ? sanitizeString(data.membershipId, 64) : null,
        branchId: sanitizeString(data.branchId, 64),
        amount: Math.round(Number(data.amount) * 100) / 100,
        mode,
        receiptNumber: sanitizeString(data.receiptNumber || '', 50),
        notes: sanitizeString(data.notes || '', 500),
      };
    }
  },

  expenses: {
    insert: (data) => {
      if (!data?.title) throw new HttpError(400, 'VALIDATION_ERROR', 'Expense title is required');
      if (!data?.branchId) throw new HttpError(400, 'VALIDATION_ERROR', 'Branch ID is required');
      if (!isPositiveDecimal(data?.amount)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Expense amount must be a positive number');
      }
      return {
        title: sanitizeString(data.title, 100),
        category: sanitizeString(data.category || 'general', 50),
        branchId: sanitizeString(data.branchId, 64),
        amount: Math.round(Number(data.amount) * 100) / 100,
        date: isDateString(data.date) ? data.date : new Date().toISOString().slice(0, 10),
        notes: sanitizeString(data.notes || '', 500),
      };
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
