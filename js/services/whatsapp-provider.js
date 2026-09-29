// js/services/whatsapp-provider.js — Backward-compatibility bridge to Manual WhatsApp
(function() {
  'use strict';
  // All automated / Meta Cloud API providers removed.
  // Replaced with 1-click Manual WhatsApp (whatsappManual).
  if (typeof window !== 'undefined' && typeof whatsappManual !== 'undefined') {
    window.getWhatsAppProvider = () => ({
      name: 'ManualWhatsApp',
      sendTemplateMessage: async (params) => {
        whatsappManual.openComposer({
          studentId: params.studentId,
          templateKey: params.templateName || 'custom',
          variables: params.variables || {}
        });
        return { success: true, status: 'OPENED' };
      },
      sendTextMessage: async (params) => {
        whatsappManual.openComposer({
          studentId: params.studentId,
          templateKey: 'custom',
          variables: { message: params.text || '' }
        });
        return { success: true, status: 'OPENED' };
      }
    });
  }
})();
