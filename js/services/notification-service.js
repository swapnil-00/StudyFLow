// StudyFlow — Decoupled Notification & Communication Service
// Manages Event Bus, Safe Template Engine, Multi-language Support, Idempotency & Queue

const NOTIFICATION_EVENTS = {
  STUDENT_REGISTERED: 'STUDENT_REGISTERED',
  SEAT_ASSIGNED: 'SEAT_ASSIGNED',
  SEAT_TRANSFERRED: 'SEAT_TRANSFERRED',
  SEAT_RELEASED: 'SEAT_RELEASED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_DUE: 'PAYMENT_DUE',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_REMINDER: 'PAYMENT_REMINDER',
  MEMBERSHIP_CREATED: 'MEMBERSHIP_CREATED',
  MEMBERSHIP_RENEWED: 'MEMBERSHIP_RENEWED',
  MEMBERSHIP_EXPIRING: 'MEMBERSHIP_EXPIRING',
  MEMBERSHIP_EXPIRED: 'MEMBERSHIP_EXPIRED',
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  RESERVATION_CONFIRMED: 'RESERVATION_CONFIRMED',
  IMPORTANT_ANNOUNCEMENT: 'IMPORTANT_ANNOUNCEMENT'
};

// ── Standard Approved WhatsApp Templates (EN, HI, MR) ────────────────────────
const DEFAULT_TEMPLATES = {
  // 1. Seat Assignment Confirmation
  'seat_assignment_confirmation_en': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'en',
    category: 'Booking',
    text: `Hello {{student_name}},

Your StudyFlow library membership has been successfully activated.

Seat: {{seat_number}}
Branch: {{branch_name}}
Room: {{room_name}}

Membership: {{membership_name}}
Start Date: {{start_date}}
Expiry Date: {{expiry_date}}

Amount: ₹{{amount}}
Payment Status: {{payment_status}}

Your invoice/receipt is attached.

Thank you,
{{branch_name}} — StudyFlow`
  },
  'seat_assignment_confirmation_hi': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'hi',
    category: 'Booking',
    text: `नमस्ते {{student_name}},

आपकी StudyFlow लाइब्रेरी सदस्यता सफलतापूर्वक सक्रिय हो गई है।

सीट: {{seat_number}}
शाखा: {{branch_name}}
कमरा: {{room_name}}

सदस्यता योजना: {{membership_name}}
आरंभ तिथि: {{start_date}}
समाप्ति तिथि: {{expiry_date}}

शुल्क: ₹{{amount}}
भुगतान स्थिति: {{payment_status}}

आपका इनवॉइस / रसीद संलग्न है।

धन्यवाद,
{{branch_name}} — StudyFlow`
  },
  'seat_assignment_confirmation_mr': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'mr',
    category: 'Booking',
    text: `नमस्कार {{student_name}},

तुमचे StudyFlow लायब्ररीचे सदस्यत्व यशस्वीरित्या सक्रिय झाले आहे.

सीट क्रमांक: {{seat_number}}
शाखा: {{branch_name}}
खोली: {{room_name}}

प्लॅन: {{membership_name}}
सुरुवात: {{start_date}}
मुदत संपण्याची तारीख: {{expiry_date}}

रक्कम: ₹{{amount}}
पेमेंट स्थिती: {{payment_status}}

आपली पावती सोबत जोडलेली आहे.

धन्यवाद,
{{branch_name}} — StudyFlow`
  },

  // 2. Payment Receipt
  'payment_receipt_en': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

We have received your payment.

Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Receipt: {{receipt_number}}
Date: {{payment_date}}

Your official receipt is attached.

Thank you,
{{branch_name}} — StudyFlow`
  },
  'payment_receipt_hi': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'hi',
    category: 'Payments',
    text: `नमस्ते {{student_name}},

हमें आपका भुगतान प्राप्त हो गया है।

राशि: ₹{{amount}}
भुगतान माध्यम: {{payment_method}}
रसीद संख्या: {{receipt_number}}
तारीख: {{payment_date}}

आपकी आधिकारिक रसीद संलग्न है।

धन्यवाद,
{{branch_name}} — StudyFlow`
  },
  'payment_receipt_mr': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'mr',
    category: 'Payments',
    text: `नमस्कार {{student_name}},

आम्हाला आपले पेमेंट प्राप्त झाले आहे.

रक्कम: ₹{{amount}}
पेमेंट पद्धत: {{payment_method}}
पावती क्र.: {{receipt_number}}
तारीख: {{payment_date}}

आपली पावती सोबत जोडली आहे.

धन्यवाद,
{{branch_name}} — StudyFlow`
  },

  // 3. Payment Due Reminder
  'payment_due_reminder_en': {
    name: 'payment_due_reminder',
    event: 'PAYMENT_DUE',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

This is a reminder from StudyFlow.

Your library membership fee is due.

Seat: {{seat_number}}
Amount Due: ₹{{amount}}
Due Date: {{due_date}}

Please contact the library or complete the payment to maintain uninterrupted access.

Thank you,
{{branch_name}}`
  },

  // 4. Overdue Notice
  'payment_overdue_notice_en': {
    name: 'payment_overdue_notice',
    event: 'PAYMENT_OVERDUE',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

Your StudyFlow library fee is currently overdue.

Seat: {{seat_number}}
Outstanding Amount: ₹{{amount}}
Due Since: {{due_date}}

Please contact the library desk to clear the outstanding balance and retain your assigned seat.

Thank you,
{{branch_name}}`
  },

  // 5. Membership Expiry Reminder
  'membership_expiring_reminder_en': {
    name: 'membership_expiring_reminder',
    event: 'MEMBERSHIP_EXPIRING',
    language: 'en',
    category: 'Membership',
    text: `Hello {{student_name}},

Your StudyFlow membership is expiring soon.

Seat: {{seat_number}}
Expiry Date: {{expiry_date}}

Renew your membership in advance to retain your dedicated seat.

Please visit the front desk for seamless renewal.

Thank you,
{{branch_name}}`
  },

  // 6. Seat Transfer Confirmation
  'seat_transfer_notification_en': {
    name: 'seat_transfer_notification',
    event: 'SEAT_TRANSFERRED',
    language: 'en',
    category: 'Booking',
    text: `Hello {{student_name}},

Your library seat has been updated.

Previous Seat: {{previous_seat}}
New Seat: {{seat_number}}
Branch: {{branch_name}}
Room: {{room_name}}

Effective From: {{effective_date}}

Please reach out if you have any questions.

Thank you,
{{branch_name}} — StudyFlow`
  },

  // 7. Reservation Confirmation
  'reservation_confirmation_en': {
    name: 'reservation_confirmation',
    event: 'RESERVATION_CREATED',
    language: 'en',
    category: 'Reservations',
    text: `Hello {{student_name}},

Your study desk reservation is confirmed!

Seat: {{seat_number}}
Room: {{room_name}}
Date: {{reservation_date}}
Time Slot: {{start_time}} to {{end_time}}

We look forward to hosting your study session.

Thank you,
{{branch_name}} — StudyFlow`
  },

  // 8. Student Registration Welcome
  'student_welcome_en': {
    name: 'student_welcome',
    event: 'STUDENT_REGISTERED',
    language: 'en',
    category: 'Onboarding',
    text: `Hello {{student_name}},

Welcome to StudyFlow! Your library account has been successfully created.

Branch: {{branch_name}}

You can now reserve your dedicated seat and track your study hours seamlessly.

Thank you,
{{branch_name}} — StudyFlow`
  },
  'student_welcome_hi': {
    name: 'student_welcome',
    event: 'STUDENT_REGISTERED',
    language: 'hi',
    category: 'Onboarding',
    text: `नमस्ते {{student_name}},

StudyFlow लाइब्रेरी में आपका स्वागत है! आपका खाता सफलतापूर्वक बना दिया गया है।

शाखा: {{branch_name}}

धन्यवाद,
{{branch_name}} — StudyFlow`
  },
  'student_welcome_mr': {
    name: 'student_welcome',
    event: 'STUDENT_REGISTERED',
    language: 'mr',
    category: 'Onboarding',
    text: `नमस्कार {{student_name}},

StudyFlow लायब्ररीमध्ये आपले स्वागत आहे! आपले खाते यशस्वीरित्या तयार झाले आहे.

शाखा: {{branch_name}}

धन्यवाद,
{{branch_name}} — StudyFlow`
  }
};

class NotificationService {
  constructor() {
    this.templates = { ...DEFAULT_TEMPLATES };
    this.isProcessingQueue = false;
  }

  // ── Template Engine ──────────────────────────────────────────────
  getTemplate(templateName, language = 'en') {
    const keyWithLang = `${templateName}_${language}`;
    if (this.templates[keyWithLang]) return this.templates[keyWithLang];
    // Fallback to English
    const fallbackKey = `${templateName}_en`;
    return this.templates[fallbackKey] || null;
  }

  renderTemplate(templateText, variables = {}) {
    if (!templateText) return '';
    // Safe variable substitution: only replace {{var_name}} with string values
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match;
    });
  }

  // ── Event Dispatcher & Message Queue ─────────────────────────────
  async dispatch(eventType, payload, options = {}) {
    const studentId = payload.studentId;
    const student = store.getStudent(studentId);

    if (!student) {
      console.warn(`[NotificationService] Student not found for ID: ${studentId}`);
      return { queued: false, reason: 'student_not_found' };
    }

    // Normalization & Consent Checks
    const normalizedPhone = student.normalized_phone || student.phone;
    if (!normalizedPhone) {
      console.warn(`[NotificationService] Student ${student.name} has no valid phone number`);
      return { queued: false, reason: 'no_phone' };
    }

    const optIn = student.whatsapp_opt_in !== false;
    const prefs = student.communication_preferences || {
      whatsapp: true,
      payment_reminders: true,
      membership_reminders: true,
      booking_notifications: true,
      receipt_notifications: true
    };

    // Category Preference Enforcement
    if (!optIn || prefs.whatsapp === false) {
      console.log(`[NotificationService] Skipped: Student ${student.name} has opted out of WhatsApp.`);
      return { queued: false, reason: 'opted_out' };
    }

    if (eventType === NOTIFICATION_EVENTS.PAYMENT_DUE || eventType === NOTIFICATION_EVENTS.PAYMENT_OVERDUE) {
      if (prefs.payment_reminders === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING || eventType === NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRED) {
      if (prefs.membership_reminders === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.SEAT_ASSIGNED || eventType === NOTIFICATION_EVENTS.SEAT_TRANSFERRED) {
      if (prefs.booking_notifications === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.PAYMENT_RECEIVED) {
      if (prefs.receipt_notifications === false) return { queued: false, reason: 'preference_disabled' };
    }

    // Idempotency Protection
    const idempotencyKey = options.idempotencyKey || `${eventType}:${payload.entityId || studentId}:${payload.qualifier || utils.today()}`;
    const existingMsg = store.getNotificationMessageByIdempotency(idempotencyKey);
    if (existingMsg && (existingMsg.status === 'SENT' || existingMsg.status === 'DELIVERED' || existingMsg.status === 'READ')) {
      console.log(`[NotificationService] Skipped duplicate message with idempotencyKey: ${idempotencyKey}`);
      return { queued: false, duplicate: true, messageId: existingMsg.id };
    }

    // Select Template & Language
    const preferredLang = student.preferred_language || 'en';
    const templateName = options.templateName || this._getTemplateNameForEvent(eventType);
    const template = this.getTemplate(templateName, preferredLang);
    const bodyText = template ? this.renderTemplate(template.text, payload.variables || {}) : (options.customText || '');

    const messageRecord = {
      id: `NOTIF-MSG-${utils.uid()}`,
      studentId: student.id,
      studentName: student.name,
      phoneNumber: normalizedPhone,
      eventType,
      templateName,
      language: preferredLang,
      bodyText,
      variables: payload.variables || {},
      documentId: payload.documentId || null,
      documentNumber: payload.documentNumber || null,
      documentType: payload.documentType || null,
      idempotencyKey,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: null
    };

    // Save to store queue
    store.saveNotificationMessage(messageRecord);

    // Asynchronous Execution (Decoupled from booking flow)
    setTimeout(() => {
      this.processMessage(messageRecord.id);
    }, 100);

    return {
      queued: true,
      messageId: messageRecord.id,
      documentId: payload.documentId,
      status: 'QUEUED'
    };
  }

  // ── Worker & Delivery Execution ───────────────────────────────────
  async processMessage(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg || msg.status === 'SENT' || msg.status === 'DELIVERED' || msg.status === 'READ') return;

    msg.status = 'PROCESSING';
    store.saveNotificationMessage(msg);

    const provider = getWhatsAppProvider();

    try {
      let result;
      const document = msg.documentId ? store.getDocument(msg.documentId) : null;

      if (msg.templateName) {
        result = await provider.sendTemplateMessage({
          to: msg.phoneNumber,
          templateName: msg.templateName,
          language: msg.language,
          variables: msg.variables,
          document: document ? { id: document.id, filename: `${document.documentNumber}.pdf`, url: `http://localhost:5173/api/documents/${document.id}` } : null
        });
      } else {
        result = await provider.sendTextMessage({
          to: msg.phoneNumber,
          text: msg.bodyText
        });
      }

      if (result.success) {
        msg.status = 'SENT';
        msg.sentAt = new Date().toISOString();
        msg.providerMessageId = result.providerMessageId;
        store.saveNotificationMessage(msg);

        // Simulate realistic delivery transition for mock provider
        setTimeout(() => {
          const current = store.getNotificationMessage(messageId);
          if (current && current.status === 'SENT') {
            current.status = 'DELIVERED';
            current.deliveredAt = new Date().toISOString();
            store.saveNotificationMessage(current);
          }
        }, 1200);

      } else {
        throw new Error(result.error || 'Provider rejected message');
      }

    } catch (err) {
      console.error(`[NotificationService] Delivery error for ${messageId}:`, err);
      msg.retryCount += 1;
      if (msg.retryCount >= msg.maxRetries) {
        msg.status = 'FAILED';
        msg.failedAt = new Date().toISOString();
        msg.failureReason = err.message;
      } else {
        msg.status = 'QUEUED'; // Re-queue for next retry attempt
      }
      store.saveNotificationMessage(msg);
    }
  }

  // ── Retry Failed Message ──────────────────────────────────────────
  async retryMessage(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg) return { success: false, error: 'Message not found' };

    msg.status = 'QUEUED';
    msg.retryCount = 0;
    msg.failureReason = null;
    store.saveNotificationMessage(msg);

    return this.processMessage(messageId);
  }

  // ── Automated Reminder Scheduler ──────────────────────────────────
  async runAutomatedReminders() {
    const branchId = store.getActiveBranchId();
    const activeMemberships = store.getMemberships().filter(m => m.status === 'active');
    let reminderCount = 0;

    for (const mem of activeMemberships) {
      const student = store.getStudent(mem.studentId);
      if (!student) continue;

      const seat = mem.seatId ? store.getSeat(mem.seatId) : null;
      const daysUntilExpiry = utils.daysUntil(mem.endDate);
      const branch = store.getBranch(mem.branchId || branchId);

      // Expiry Reminders (7d, 3d, 1d)
      if (daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1) {
        const idempKey = `membership_expiring:${mem.id}:${daysUntilExpiry}d`;
        const res = await this.dispatch(NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING, {
          studentId: student.id,
          entityId: mem.id,
          qualifier: `${daysUntilExpiry}d`,
          variables: {
            student_name: student.name,
            seat_number: seat?.label || 'General',
            expiry_date: mem.endDate,
            branch_name: branch?.name || 'StudyFlow Library'
          }
        }, { idempotencyKey: idempKey });

        if (res.queued) reminderCount++;
      }

      // Overdue & Fee Due Reminders
      if (mem.paymentStatus === 'pending' || mem.paymentStatus === 'partial') {
        const pendingAmount = mem.finalAmount - (mem.paidAmount || 0);
        if (pendingAmount > 0) {
          const idempKey = `fee_due:${mem.id}:${utils.today()}`;
          const res = await this.dispatch(NOTIFICATION_EVENTS.PAYMENT_DUE, {
            studentId: student.id,
            entityId: mem.id,
            qualifier: 'payment_due',
            variables: {
              student_name: student.name,
              seat_number: seat?.label || 'General',
              amount: pendingAmount,
              due_date: mem.startDate,
              branch_name: branch?.name || 'StudyFlow Library'
            }
          }, { idempotencyKey: idempKey });

          if (res.queued) reminderCount++;
        }
      }
    }

    return { processed: activeMemberships.length, dispatched: reminderCount };
  }

  async dispatchEvent(eventType, payload = {}, options = {}) {
    try {
      return await this.dispatch(eventType, payload, options);
    } catch (err) {
      console.error('[NotificationService] Error in dispatchEvent:', err);
      return { queued: false, error: err.message };
    }
  }

  _getTemplateNameForEvent(eventType) {
    switch (eventType) {
      case NOTIFICATION_EVENTS.STUDENT_REGISTERED: return 'student_welcome';
      case NOTIFICATION_EVENTS.SEAT_ASSIGNED: return 'seat_assignment_confirmation';
      case NOTIFICATION_EVENTS.SEAT_TRANSFERRED: return 'seat_transfer_notification';
      case NOTIFICATION_EVENTS.PAYMENT_RECEIVED: return 'payment_receipt';
      case NOTIFICATION_EVENTS.PAYMENT_DUE: return 'payment_due_reminder';
      case NOTIFICATION_EVENTS.PAYMENT_OVERDUE: return 'payment_overdue_notice';
      case NOTIFICATION_EVENTS.PAYMENT_REMINDER: return 'payment_due_reminder';
      case NOTIFICATION_EVENTS.MEMBERSHIP_CREATED: return 'seat_assignment_confirmation';
      case NOTIFICATION_EVENTS.MEMBERSHIP_RENEWED: return 'seat_assignment_confirmation';
      case NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING: return 'membership_expiring_reminder';
      case NOTIFICATION_EVENTS.RESERVATION_CREATED: return 'reservation_confirmation';
      case NOTIFICATION_EVENTS.RESERVATION_CONFIRMED: return 'reservation_confirmation';
      default: return 'student_welcome';
    }
  }
}

const notificationService = new NotificationService();

if (typeof window !== 'undefined') {
  window.NOTIFICATION_EVENTS = NOTIFICATION_EVENTS;
  window.notificationService = notificationService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOTIFICATION_EVENTS,
    notificationService
  };
}
