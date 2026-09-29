// js/services/notification-service.js — In-App System Alerts & Event Constants
// Replaced automatic background WhatsApp queuing with 1-click Manual WhatsApp (whatsappManual).

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

class NotificationService {
  constructor() {
    this.events = NOTIFICATION_EVENTS;
  }

  /**
   * Dispatches an in-app system notification event.
   */
  async dispatch(eventType, payload = {}, options = {}) {
    // In-app alert logging if store is available
    if (typeof store !== 'undefined' && store.addNotification) {
      try {
        const student = payload.studentId ? store.getStudent(payload.studentId) : null;
        const title = options.title || this._getTitleForEvent(eventType);
        const message = options.message || payload.message || `Event ${eventType} recorded for ${student?.name || 'student'}`;
        store.addNotification({
          type: eventType.toLowerCase(),
          title,
          message,
          studentId: payload.studentId || null,
          entityId: payload.entityId || null
        });
      } catch (err) {
        console.warn('[NotificationService] In-app notification log failed:', err);
      }
    }
    return { ok: true, eventType };
  }

  async dispatchEvent(eventType, payload = {}, options = {}) {
    return this.dispatch(eventType, payload, options);
  }

  _getTitleForEvent(eventType) {
    switch (eventType) {
      case NOTIFICATION_EVENTS.SEAT_ASSIGNED: return 'Seat Assigned';
      case NOTIFICATION_EVENTS.SEAT_TRANSFERRED: return 'Seat Transferred';
      case NOTIFICATION_EVENTS.PAYMENT_RECEIVED: return 'Payment Received';
      case NOTIFICATION_EVENTS.PAYMENT_DUE: return 'Payment Due';
      case NOTIFICATION_EVENTS.MEMBERSHIP_RENEWED: return 'Membership Renewed';
      case NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING: return 'Membership Expiring Soon';
      default: return 'System Alert';
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
