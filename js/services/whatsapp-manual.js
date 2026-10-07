// js/services/whatsapp-manual.js — Manual "Send on WhatsApp" Flow
// 1-click WhatsApp Web / App integration from staff's own logged-in WhatsApp device.
// Zero Meta Cloud API, zero tokens, zero per-message cost.

(function() {
  'use strict';

  // Multi-line, one fact per line, so the student can read it at a glance on a phone.
  // {{library_name}} is the library's name from Settings; {{branch_name}} the branch.
  // {{invoice_line}}, {{balance_note}} and {{days_left_text}} are filled in by renderMessage().
  const DEFAULT_TEMPLATES = {
    seat_assigned: `Hello {{student_name}},

Your seat at {{library_name}} is confirmed.

Seat: {{seat_number}} ({{room_name}}, {{branch_name}})
Plan: {{plan_name}}
Validity: {{start_date}} to {{end_date}}
Amount: ₹{{amount}} ({{payment_status}})
{{invoice_line}}

Please keep this message for your records. We look forward to seeing you!`,

    payment_received: `Hello {{student_name}},

Thank you! We have received your payment at {{library_name}}.

Amount: ₹{{amount}}
Mode: {{payment_mode}}
Date: {{date}}
Receipt: {{receipt_number}}
{{balance_note}}
{{invoice_line}}`,

    payment_due: `Hello {{student_name}},

A friendly reminder from {{library_name}}: your library fee of ₹{{amount_due}} for seat {{seat_number}} is due by {{due_date}}.

You can pay at the front desk or by UPI. If you have already paid, please ignore this message.`,

    payment_overdue: `Hello {{student_name}},

Your library fee of ₹{{amount_due}} for seat {{seat_number}} at {{library_name}} was due on {{due_date}} and is still pending.

Please clear it at the earliest to keep your seat. If you have already paid, kindly share the payment details with us.`,

    membership_expiring: `Hello {{student_name}},

Your {{plan_name}} membership for seat {{seat_number}} at {{library_name}} ends {{days_left_text}} ({{end_date}}).

Please renew before then to keep your seat. Visit the front desk or reply to this message to renew.`,

    membership_renewed: `Hello {{student_name}},

Your membership at {{library_name}} has been renewed. Thank you for continuing with us!

Seat: {{seat_number}}
Plan: {{plan_name}}
Validity: {{start_date}} to {{end_date}}
Amount: ₹{{amount}}
{{invoice_line}}`,

    seat_transferred: `Hello {{student_name}},

Your seat at {{library_name}} has been changed.

Previous seat: {{from_seat}}
New seat: {{to_seat}} ({{room_name}}, {{branch_name}})

Everything else about your membership stays the same.`,

    welcome: `Hello {{student_name}},

Welcome to {{library_name}}! Your registration is complete.

Please save this number: fee reminders, receipts and important updates will come from here. For any help, reply to this message or visit the front desk.`,

    custom: `{{message}}`
  };

  const PAYMENT_MODE_LABELS = {
    upi: 'UPI', cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer', bank: 'Bank transfer',
    netbanking: 'Net banking', cheque: 'Cheque', wallet: 'Wallet', other: 'Other'
  };

  function formatAmountValue(v) {
    if (v === undefined || v === null || v === '') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString('en-IN') : '';
    const s = String(v).trim();
    return /^\d+(\.\d+)?$/.test(s) ? Number(s).toLocaleString('en-IN') : s;
  }

  function daysLeftText(daysLeft) {
    const n = Number(daysLeft);
    if (!Number.isFinite(n)) return '';
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n > 1) return `in ${n} days`;
    return n === -1 ? 'yesterday' : `${-n} days ago`;
  }

  /** Values every template may use, derived from what the page passed and from Settings. */
  function deriveVariables(variables, settings) {
    const vars = { ...variables };
    const activeBranch = (typeof store !== 'undefined' && store.getBranch && store.getActiveBranchId) ? store.getBranch(store.getActiveBranchId()) : null;
    vars.library_name = vars.library_name || settings.orgName || vars.branch_name || activeBranch?.name || 'our library';
    vars.branch_name = vars.branch_name || activeBranch?.name || vars.library_name;
    for (const k of ['amount', 'amount_due', 'balance']) vars[k] = formatAmountValue(vars[k]);
    if (vars.payment_mode !== undefined && vars.payment_mode !== null) {
      const key = String(vars.payment_mode).toLowerCase().replace(/\s+/g, '_');
      vars.payment_mode = PAYMENT_MODE_LABELS[key] || String(vars.payment_mode);
    }
    if (vars.balance_note === undefined && vars.balance !== undefined) {
      const due = Number(String(vars.balance).replace(/[^0-9.]/g, ''));
      vars.balance_note = due > 0 ? `Balance due: ₹${vars.balance}` : 'No balance due. Your account is fully paid.';
    }
    if (vars.days_left_text === undefined && vars.days_left !== undefined) vars.days_left_text = daysLeftText(vars.days_left);
    if (vars.invoice_line === undefined) vars.invoice_line = '';
    return vars;
  }

  const TEMPLATE_NAMES = {
    seat_assigned: 'Seat Assignment Confirmation',
    payment_received: 'Payment Receipt',
    payment_due: 'Payment Due Reminder',
    payment_overdue: 'Payment Overdue Alert',
    membership_expiring: 'Membership Expiring Notice',
    membership_renewed: 'Membership Renewed Confirmation',
    seat_transferred: 'Seat Transfer Notice',
    welcome: 'Welcome Registration Message',
    custom: 'Custom Announcement / Message'
  };

  /**
   * Normalizes a phone number to digits with country code.
   * - 10-digit Indian numbers get prefixed with '91'.
   * - Strips leading '+', spaces, dashes, dots, parentheses, and leading '0'.
   * - Result must be between 10 and 15 digits, otherwise returns null.
   */
  function normalizePhone(phone, defaultCountryCode = '91') {
    if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) return null;
    let str = String(phone).trim();
    let digits = str.replace(/[^\d]/g, '');

    // Strip leading zero if 11 digits (e.g. 09876543210 -> 9876543210)
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }

    // If 10 digits, add country code (default 91 for India)
    if (digits.length === 10) {
      const cc = String(defaultCountryCode).replace(/[^\d]/g, '') || '91';
      digits = cc + digits;
    }

    if (digits.length >= 10 && digits.length <= 15) {
      return digits;
    }
    return null;
  }

  /**
   * Formats phone number for display (e.g. +91 98765 43210).
   */
  function formatPhoneDisplay(phone) {
    const norm = normalizePhone(phone);
    if (!norm) return phone || '—';
    if (norm.startsWith('91') && norm.length === 12) {
      return `+91 ${norm.slice(2, 7)} ${norm.slice(7)}`;
    }
    return `+${norm}`;
  }

  /**
   * Detects mobile or tablet device.
   */
  function isMobileDevice() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isTouch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    return isTouch || isSmallScreen;
  }

  /**
   * Builds the direct WhatsApp Web or App link.
   * mode: 'web' | 'app' | 'auto'
   */
  /**
   * Resolves the effective opening mode:
   *   'desktop' → WhatsApp Desktop app via whatsapp:// (no browser tab at all; the open app
   *               switches to the chat). Default on computers.
   *   'web'     → web.whatsapp.com in a browser tab. WhatsApp Web sends
   *               Cross-Origin-Opener-Policy, which cuts the link to the opener page, so the
   *               browser cannot reuse an existing WhatsApp Web tab: each send opens a new tab.
   *   'app'     → wa.me link (opens the WhatsApp app on phones/tablets).
   * Precedence: this browser's choice (localStorage) → library setting → auto.
   */
  function resolveMode(mode = 'auto') {
    let chosen = mode;
    if (!chosen || chosen === 'auto') {
      let pref = '';
      try { pref = localStorage.getItem('sf_wa_mode') || ''; } catch (_) {}
      if (!pref || pref === 'auto') {
        try { pref = (typeof store !== 'undefined' && store.getSettings && store.getSettings().whatsappOpenIn) || 'auto'; } catch (_) { pref = 'auto'; }
      }
      chosen = pref;
    }
    if (chosen === 'auto') chosen = isMobileDevice() ? 'app' : 'desktop';
    if (chosen === 'desktop' && isMobileDevice()) chosen = 'app';
    return chosen;
  }

  function buildLink(phoneDigits, text = '', mode = 'auto') {
    const cleanPhone = normalizePhone(phoneDigits) || String(phoneDigits || '').replace(/[^\d]/g, '');
    const encodedText = encodeURIComponent(text || '');
    const targetMode = resolveMode(mode);

    if (targetMode === 'desktop') {
      return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    }
    if (targetMode === 'app') {
      return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Opens a whatsapp:// link in the installed desktop app without navigating this page.
  // Browsers give no success signal for custom protocols, so if this window never loses
  // focus the app is probably not installed: offer WhatsApp Web / download instead.
  function openDesktopApp(link) {
    let appOpened = false;
    const onBlur = () => { appOpened = true; };
    window.addEventListener('blur', onBlur, { once: true });
    document.addEventListener('visibilitychange', onBlur, { once: true });

    const a = document.createElement('a');
    a.href = link;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      if (appOpened || typeof toast === 'undefined') return;
      const webLink = link.replace(/^whatsapp:\/\/send\?/, 'https://web.whatsapp.com/send?');
      toast.show(
        `WhatsApp Desktop didn't open. <a href="${webLink}" target="_blank" rel="noopener" style="text-decoration:underline;color:inherit;font-weight:600;">Open in WhatsApp Web</a> · ` +
        `<a href="https://www.whatsapp.com/download" target="_blank" rel="noopener" style="text-decoration:underline;color:inherit;font-weight:600;">Get WhatsApp Desktop</a>`,
        'warning', 9000
      );
    }, 2000);
    return true;
  }

  /**
   * Opens WhatsApp for a link from buildLink().
   * Desktop app links open in the installed app (no new tab). Web/wa.me links open a tab named
   * 'studyflow-whatsapp' (reused where the browser allows; WhatsApp Web prevents reuse).
   */
  function open(link) {
    if (!link || typeof window === 'undefined') return false;
    try {
      if (link.startsWith('whatsapp://')) return openDesktopApp(link);
      const win = window.open(link, 'studyflow-whatsapp');
      if (!win) {
        if (typeof toast !== 'undefined') {
          toast.show(`Popup blocked. <a href="${link}" target="_blank" rel="noopener" style="text-decoration:underline;color:inherit;font-weight:600;">Click here to open WhatsApp</a>`, 'warning', 7000);
        }
        return false;
      }
      return true;
    } catch (e) {
      if (typeof toast !== 'undefined') {
        toast.show(`Could not open WhatsApp: ${e.message}`, 'error');
      }
      return false;
    }
  }

  /**
   * Renders a message template by substituting {{placeholders}} and appending signature.
   */
  function renderMessage(templateKey, variables = {}, orgSettings = null) {
    const settings = orgSettings || (typeof store !== 'undefined' && store.getSettings ? store.getSettings() : {});
    const customTemplates = settings.whatsappTemplates || {};
    let templateText = customTemplates[templateKey] || DEFAULT_TEMPLATES[templateKey] || DEFAULT_TEMPLATES.custom;

    const vars = deriveVariables(variables, settings);
    // A free-text message (announcements) may itself contain {{student_name}} etc.:
    // fill those in too, so the student never sees raw placeholders.
    if (typeof vars.message === 'string' && vars.message.includes('{{')) {
      vars.message = vars.message.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
        (key !== 'message' && vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : '');
    }
    // An empty value leaves a marker so a line that held only that placeholder can be dropped
    const EMPTY = '\u0000';
    let rendered = templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      if (vars[key] !== undefined && vars[key] !== null && String(vars[key]) !== '') {
        return String(vars[key]);
      }
      return EMPTY;
    });
    rendered = rendered.split('\n')
      .filter(line => line.replace(/\u0000/g, '').trim() !== '' || !line.includes(EMPTY))
      .map(line => line.replace(/\u0000/g, ''))
      .join('\n');

    // The invoice/receipt line (number + verify link) is always included when available,
    // even if the library's custom template predates it.
    if (vars.invoice_line && !templateText.includes('invoice_line')) {
      rendered = `${rendered.trim()}\n${String(vars.invoice_line)}`;
    }

    // Tidy up: no trailing spaces, no blank lines left by empty placeholders
    rendered = rendered.split('\n').map(l => l.replace(/[ \t]+$/g, '')).join('\n').replace(/\n{3,}/g, '\n\n');

    let signature = settings.whatsappSignature;
    if (!signature && settings.orgName) {
      signature = `— ${settings.orgName}${settings.phone ? ', ' + settings.phone : ''}`;
    }

    if (signature && signature.trim() && !rendered.includes(signature.trim())) {
      rendered = `${rendered.trim()}\n\n${signature.trim()}`;
    }

    if (rendered.length > 1500) {
      rendered = rendered.slice(0, 1500);
    }

    return rendered.trim();
  }

  /**
   * Opens the reusable "Send on WhatsApp" composer modal.
   */
  function openComposer({ studentId, templateKey = 'custom', variables = {}, onSent = null, document: attachment = null }) {
    if (typeof modal === 'undefined') return;
    // WhatsApp links cannot carry a file: the bill is shared from the phone's share sheet
    // (straight into WhatsApp) or downloaded and dropped into the chat.
    const canShareFiles = Boolean(attachment && typeof invoiceGenerator !== 'undefined' && invoiceGenerator.canShareFiles && invoiceGenerator.canShareFiles());
    const student = (typeof store !== 'undefined' && store.getStudent) ? store.getStudent(studentId) : null;
    const settings = (typeof store !== 'undefined' && store.getSettings) ? store.getSettings() : {};

    const rawPhone = student?.phone || student?.normalized_phone || variables.phone || '';
    const cleanDigits = normalizePhone(rawPhone);
    const displayPhone = formatPhoneDisplay(rawPhone);
    const hasValidPhone = Boolean(cleanDigits);
    const isOptedOut = student && student.whatsapp_opt_in === false;

    const initialText = renderMessage(templateKey, {
      student_name: student?.name || 'Student',
      ...variables
    }, settings);

    const savedMode = (typeof localStorage !== 'undefined' && localStorage.getItem('sf_wa_mode')) || 'auto';
    const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s || ''));

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <!-- Student Recipient Info -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3) var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
          <div>
            <div style="font-weight:var(--fw-semibold);font-size:var(--text-sm);color:var(--color-text-primary);">
              ${esc(student?.name || 'Recipient')}
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-text-secondary);font-family:var(--font-mono);margin-top:2px;">
              ${esc(displayPhone)}
              ${!hasValidPhone ? ' <span style="color:var(--sf-error-600);font-weight:600;">(Invalid or missing phone)</span>' : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-2);">
            ${isOptedOut ? `<span class="badge badge-warning">Opted Out</span>` : `<span class="badge badge-success"><span class="badge-dot"></span>WhatsApp Ready</span>`}
            ${student ? `<button type="button" class="btn btn-ghost btn-sm" id="composer-edit-student" style="font-size:11px;">Edit Student</button>` : ''}
          </div>
        </div>

        ${isOptedOut ? `
        <div style="padding:var(--space-3);background:var(--sf-warning-50, #fffbeb);border:1px solid var(--sf-warning-200, #fde68a);border-radius:var(--radius-md);color:var(--sf-warning-800, #92400e);font-size:var(--text-xs);line-height:1.5;">
          ⚠️ <strong>This student has opted out of WhatsApp messages.</strong> Messaging opted-out students is disabled.
        </div>` : ''}

        ${!hasValidPhone ? `
        <div style="padding:var(--space-3);background:var(--sf-error-50, #fef2f2);border:1px solid var(--sf-error-200, #fecaca);border-radius:var(--radius-md);color:var(--sf-error-800, #991b1b);font-size:var(--text-xs);line-height:1.5;">
          ❌ <strong>Invalid Phone Number:</strong> Please update the student's mobile number (10-digit mobile number) to send WhatsApp messages.
        </div>` : ''}

        <!-- Message Editor -->
        <div class="form-group" style="margin-bottom:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label class="form-label" for="wa-composer-text" style="margin-bottom:0;">Message Preview & Edit</label>
            <span id="wa-char-count" style="font-size:var(--text-xs);color:var(--color-text-tertiary);font-family:var(--font-mono);">${initialText.length} / 1500</span>
          </div>
          <textarea class="textarea" id="wa-composer-text" rows="7" style="font-size:var(--text-sm);line-height:1.5;resize:vertical;" maxlength="1500">${esc(initialText)}</textarea>
        </div>

        ${attachment ? `
        <!-- The bill as a PDF -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px dashed var(--color-border-secondary);border-radius:var(--radius-md);background:var(--color-bg-secondary);">
          <div style="font-size:12px;line-height:1.5;">
            <div style="font-weight:600;color:var(--color-text-primary);">📄 ${esc(attachment.documentType === 'receipt' ? 'Receipt' : 'Invoice')} ${esc(attachment.documentNumber)} (PDF)</div>
            <div style="color:var(--color-text-tertiary);">${canShareFiles
              ? 'Tap <strong>Share PDF + message</strong>, choose WhatsApp and the student. The message is also copied, so if WhatsApp shows only the file, paste it as the caption.'
              : 'Download the PDF, then drag it into the WhatsApp chat that opens.'}</div>
          </div>
          <div style="display:flex;gap:6px;">
            ${canShareFiles ? '<button type="button" class="btn btn-primary btn-sm" id="wa-btn-share-pdf" style="background:#25d366;border-color:#25d366;color:#fff;">📎 Share PDF + message</button>' : ''}
            <button type="button" class="btn btn-secondary btn-sm" id="wa-btn-download-pdf">Download PDF</button>
          </div>
        </div>` : ''}

        <!-- Open In Preference Toggle -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);">
            Open WhatsApp in:
          </div>
          <div class="filter-tabs" id="wa-mode-tabs" style="font-size:11px;">
            <button type="button" class="filter-tab ${savedMode === 'auto' ? 'active' : ''}" data-mode="auto" title="Desktop app on computers, WhatsApp app on phones">Auto</button>
            <button type="button" class="filter-tab ${savedMode === 'desktop' ? 'active' : ''}" data-mode="desktop" title="Opens the chat in the installed WhatsApp Desktop app. No new browser tabs.">Desktop app</button>
            <button type="button" class="filter-tab ${savedMode === 'web' ? 'active' : ''}" data-mode="web" title="web.whatsapp.com. WhatsApp Web opens a new tab for each message.">WhatsApp Web</button>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
        <button type="button" class="btn btn-secondary" id="wa-btn-copy">
          ${icons.copy || '📋'} Copy Text
        </button>
        <div style="display:flex;gap:var(--space-2);">
          <button type="button" class="btn btn-secondary" id="wa-btn-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="wa-btn-send" ${(!hasValidPhone || isOptedOut) ? 'disabled' : ''} style="background:#25d366;border-color:#25d366;color:#ffffff;">
            💬 Send on WhatsApp
          </button>
        </div>
      </div>
    `;

    modal.open('Send on WhatsApp', bodyHtml, footerHtml, { size: 'md' });

    // Setup Event Listeners
    const textarea = document.getElementById('wa-composer-text');
    const charCount = document.getElementById('wa-char-count');
    if (textarea && charCount) {
      textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length} / 1500`;
      });
    }

    // Mode Toggle
    document.querySelectorAll('#wa-mode-tabs .filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#wa-mode-tabs .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode || 'auto';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('sf_wa_mode', mode);
        }
      });
    });

    // PDF of the bill (share sheet on phones, download elsewhere)
    document.getElementById('wa-btn-share-pdf')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      const text = textarea?.value || '';
      // The file and the text go to the share sheet together. WhatsApp sometimes keeps only
      // the file, so the text is also put on the clipboard for a one-tap paste as the caption.
      try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard may be unavailable */ }
      const result = await invoiceGenerator.sharePdf(attachment, { text });
      btn.disabled = false;
      if (result === 'shared') {
        if (typeof onSent === 'function') onSent();
        if (typeof toast !== 'undefined') toast.show('Shared. If only the PDF arrived, long-press the caption box and paste the message.', 'info', 7000);
      } else if (result === 'downloaded' && typeof toast !== 'undefined') {
        toast.show('Sharing is not available here, so the PDF was downloaded. Attach it in the chat.', 'info', 6000);
      }
    });
    document.getElementById('wa-btn-download-pdf')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      await invoiceGenerator.downloadPdf(attachment);
      btn.disabled = false;
    });

    // Edit student helper
    document.getElementById('composer-edit-student')?.addEventListener('click', () => {
      modal.close();
      if (typeof window.openEditStudentModal === 'function' && studentId) {
        window.openEditStudentModal(studentId);
      }
    });

    // Copy Button
    document.getElementById('wa-btn-copy')?.addEventListener('click', async () => {
      const text = textarea?.value || '';
      try {
        await navigator.clipboard.writeText(text);
        if (typeof toast !== 'undefined') toast.show('Message copied to clipboard! 📋', 'success');
      } catch (_) {
        textarea?.select();
        document.execCommand('copy');
        if (typeof toast !== 'undefined') toast.show('Message copied! 📋', 'success');
      }
    });

    // Cancel Button
    document.getElementById('wa-btn-cancel')?.addEventListener('click', () => {
      modal.close();
    });

    // Send Button
    document.getElementById('wa-btn-send')?.addEventListener('click', async () => {
      const text = textarea?.value || '';
      const mode = (typeof localStorage !== 'undefined' && localStorage.getItem('sf_wa_mode')) || 'auto';
      const link = buildLink(cleanDigits, text, mode);

      if (typeof store !== 'undefined' && store.logCommunication) {
        store.logCommunication({
          studentId: student?.id || null,
          phoneNumber: cleanDigits,
          templateKey,
          bodyText: text,
          status: 'opened'
        }).catch(err => console.warn('Could not record communication log:', err));
      }

      const opened = open(link);
      modal.close();

      if (opened && typeof toast !== 'undefined') {
        toast.show(`WhatsApp opened for ${student?.name || 'student'}. Press Send in WhatsApp to deliver!`, 'success');
      }
      if (typeof onSent === 'function') onSent({ link, text, phone: cleanDigits });
    });
  }

  // Export module
  const whatsappManual = {
    DEFAULT_TEMPLATES,
    TEMPLATE_NAMES,
    normalizePhone,
    formatPhoneDisplay,
    isMobileDevice,
    resolveMode,
    buildLink,
    open,
    renderMessage,
    openComposer
  };

  if (typeof window !== 'undefined') {
    window.whatsappManual = whatsappManual;
    window.openSendWhatsAppModal = function(studentId, templateKey, variables) {
      whatsappManual.openComposer({ studentId, templateKey: templateKey || 'custom', variables: variables || {} });
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = whatsappManual;
  }
})();
