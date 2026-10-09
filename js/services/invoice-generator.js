// StudyFlow — Professional Invoice & Receipt Document Generator

const invoiceGenerator = {
  // ── 1. Generate Invoice ──────────────────────────────────────────
  async generateInvoice({ membershipId, studentId, seatId, paymentId = null }) {
    const student = store.getStudent(studentId);
    const membership = store.getMembership(membershipId);
    const seat = seatId ? store.getSeat(seatId) : (membership?.seatId ? store.getSeat(membership.seatId) : null);
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const floor = room?.floorId ? store.getFloor(room.floorId) : null;
    const branchId = membership?.branchId || seat?.branchId || store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const settings = store.getSettings();

    // Placeholder only: the server issues the real sequential number and the verification code
    const invoiceNumber = 'PENDING';
    const payment = paymentId
      ? (store.getPayment ? store.getPayment(paymentId) : (store.getPayments ? store.getPayments().find(p => p.id === paymentId) : null))
      : (membership ? (store.getPaymentsForMembership ? store.getPaymentsForMembership(membership.id)[0] : (store.getPayments ? store.getPayments(membership.id)[0] : null)) : null);

    const baseAmount = membership?.price || 0;
    const discount = membership?.discount || 0;
    const finalAmount = membership?.finalAmount || (baseAmount - discount);
    const paidAmount = payment?.amount || (membership?.paymentStatus === 'paid' ? finalAmount : 0);
    const pendingAmount = Math.max(0, finalAmount - paidAmount);

    const docId = `DOC-${utils.uid()}`;
    const documentData = {
      id: docId,
      documentType: 'invoice',
      documentNumber: invoiceNumber,
      date: utils.today(),
      createdAt: new Date().toISOString(),
      studentId: student?.id,
      studentName: student?.name,
      studentPhone: student?.phone || student?.normalized_phone,
      branchId: branch?.id,
      branchName: branch?.name,
      branchAddress: branch?.address,
      branchPhone: branch?.phone,
      branchEmail: branch?.email,
      membershipId: membership?.id,
      planName: membership?.planName || 'Study Space Access',
      startDate: membership?.startDate,
      endDate: membership?.endDate,
      seatNumber: seat?.label || seat?.number || 'Flexible',
      roomName: room?.name || 'Study Hall',
      floorName: floor?.name || 'Main Floor',
      baseAmount,
      discount,
      finalAmount,
      paidAmount,
      pendingAmount,
      paymentMethod: payment?.method || payment?.mode || 'UPI',
      paymentRef: payment?.referenceNumber || payment?.receiptNumber || 'N/A',
      paymentDate: payment?.date || utils.today(),
      status: pendingAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING'),
      currency: settings?.currency || 'INR'
    };

    // Issued by the server: number, issue time, verification code (lib/invoices.js)
    return store.saveDocument(documentData);
  },

  // ── 2. Generate Payment Receipt ──────────────────────────────────
  async generateReceipt({ paymentId, studentId = null, membershipId = null }) {
    const payment = (store.getPayment ? store.getPayment(paymentId) : (store.getPayments ? store.getPayments().find(p => p.id === paymentId) : null)) || null;
    const mId = membershipId || payment?.membershipId;
    const membership = mId ? store.getMembership(mId) : null;
    const sId = studentId || payment?.studentId || membership?.studentId;
    const student = store.getStudent(sId);
    const seat = membership?.seatId ? store.getSeat(membership.seatId) : null;
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const branchId = payment?.branchId || membership?.branchId || store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const settings = store.getSettings();

    // The payment's server-issued REC- number is kept; otherwise the server sequences one
    const receiptNumber = payment?.receiptNumber || 'PENDING';
    const docId = `DOC-${utils.uid()}`;

    const documentData = {
      id: docId,
      documentType: 'receipt',
      documentNumber: receiptNumber,
      date: payment?.date || utils.today(),
      createdAt: new Date().toISOString(),
      studentId: student?.id,
      studentName: student?.name,
      studentPhone: student?.phone || student?.normalized_phone,
      branchId: branch?.id,
      branchName: branch?.name,
      branchAddress: branch?.address,
      branchPhone: branch?.phone,
      membershipId: membership?.id,
      planName: membership?.planName || 'Study Space Access',
      startDate: membership?.startDate,
      endDate: membership?.endDate,
      seatNumber: seat?.label || 'General',
      roomName: room?.name || 'Study Area',
      amount: payment?.amount || 0,
      paymentMethod: payment?.method || payment?.mode || 'UPI',
      paymentRef: payment?.referenceNumber || 'N/A',
      status: 'SUCCESS',
      currency: settings?.currency || 'INR'
    };

    return store.saveDocument(documentData);
  },

  // ── 2a. Real PDF (jsPDF): what the owner downloads or shares on WhatsApp ──
  // Text-based (small, selectable), with the QR, the verification code and PDF metadata
  // (title/subject/keywords carry number, validity, amount and code). Rupee amounts are
  // written as "Rs." because the built-in PDF fonts have no ₹ glyph.
  buildPdf(doc, libs = {}) {
    const jsPDF = libs.jsPDF || (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF);
    const qrcode = libs.qrcode || (typeof window !== 'undefined' && window.qrcode);
    if (!jsPDF) throw new Error('PDF library not loaded');
    const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
    const s = (v) => (v == null ? '' : String(v));
    const isReceipt = doc.documentType === 'receipt';
    const total = Number(doc.finalAmount != null ? doc.finalAmount : (doc.amount || 0));
    const paid = Number(doc.paidAmount != null ? doc.paidAmount : (doc.amount || 0));
    const pending = Math.max(0, Number(doc.pendingAmount != null ? doc.pendingAmount : total - paid));
    const period = doc.startDate && doc.endDate ? `${doc.startDate} to ${doc.endDate}` : '';
    const library = s(doc.branchName || 'Study Library');
    const origin = (doc.verifyUrl && doc.verifyUrl.split('/#/')[0]) || (typeof location !== 'undefined' ? location.origin : '');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    pdf.setProperties({
      title: [s(doc.documentNumber), library, period, rs(total), doc.verificationCode ? `Verify ${doc.verificationCode}` : ''].filter(Boolean).join(' · '),
      subject: `${isReceipt ? 'Payment receipt' : 'Tax invoice'} ${s(doc.documentNumber)} for ${s(doc.studentName)}${period ? `; valid ${period}` : ''}; amount ${rs(total)}; status ${s(doc.status)}${doc.verificationCode ? `; verification code ${doc.verificationCode}` : ''}`,
      author: `${library} via StudyFlow`,
      keywords: [s(doc.documentNumber), doc.verificationCode, doc.startDate, doc.endDate, 'StudyFlow'].filter(Boolean).join(', '),
      creator: 'StudyFlow',
    });

    const L = 40, R = 555, W = R - L;
    const dark = [24, 29, 39], gray = [83, 88, 98], light = [113, 118, 128], rule = [233, 234, 235];
    const text = (str, x, y, o = {}) => {
      pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
      pdf.setFontSize(o.size || 10);
      pdf.setTextColor(...(o.color || dark));
      pdf.text(s(str), x, y, { align: o.align || 'left', maxWidth: o.maxWidth });
    };
    const hr = (y) => { pdf.setDrawColor(...rule); pdf.setLineWidth(0.8); pdf.line(L, y, R, y); };

    // Header
    pdf.setFillColor(...dark); pdf.roundedRect(L, 40, 36, 36, 8, 8, 'F');
    text('SF', L + 18, 63, { bold: true, size: 14, color: [255, 255, 255], align: 'center' });
    text('StudyFlow', L + 46, 58, { bold: true, size: 16 });
    text(library, L + 46, 74, { size: 10, color: gray });
    text(isReceipt ? 'PAYMENT RECEIPT' : 'TAX INVOICE', R, 56, { bold: true, size: 15, align: 'right' });
    text(`# ${s(doc.documentNumber)}`, R, 72, { size: 10, color: gray, align: 'right' });
    const statusColor = (doc.status === 'PAID' || doc.status === 'SUCCESS') ? [7, 148, 85] : doc.status === 'PARTIAL' ? [220, 104, 3] : [217, 45, 32];
    text(`● ${s(doc.status || '')}`, R, 88, { bold: true, size: 9, color: statusColor, align: 'right' });
    hr(102);

    // Parties
    text('BILLED TO', L, 122, { bold: true, size: 8, color: light });
    text(s(doc.studentName || 'Student'), L, 138, { bold: true, size: 12 });
    text(`Phone: ${s(doc.studentPhone || 'N/A')}`, L, 152, { size: 9, color: gray });
    if (doc.studentId) text(`Student ID: ${s(doc.studentId)}`, L, 164, { size: 8, color: light });
    text('LIBRARY DETAILS', R, 122, { bold: true, size: 8, color: light, align: 'right' });
    text(s(doc.branchAddress || ''), R, 138, { size: 9, align: 'right', maxWidth: 240 });
    text(`Support: ${s(doc.branchPhone || '')}`, R, 152, { size: 9, color: gray, align: 'right' });
    text(`Date: ${s(doc.date || '')}`, R, 164, { size: 8, color: light, align: 'right' });
    hr(180);

    // Facility card
    pdf.setFillColor(250, 250, 250); pdf.setDrawColor(...rule); pdf.roundedRect(L, 194, W, 62, 6, 6, 'FD');
    text('ALLOCATED FACILITY', L + 12, 210, { bold: true, size: 8, color: light });
    const cols = [['Seat', s(doc.seatNumber || 'N/A')], ['Room', s(doc.roomName || 'General')], ['Plan', s(doc.planName || 'Monthly')], ['Valid until', s(doc.endDate || 'N/A')]];
    cols.forEach(([k, v], i) => {
      const x = L + 12 + i * (W - 24) / 4;
      text(k, x, 228, { size: 8, color: light });
      text(v, x, 244, { bold: true, size: 11, maxWidth: (W - 24) / 4 - 8 });
    });

    // Line item
    pdf.setFillColor(250, 250, 250); pdf.rect(L, 272, W, 22, 'F');
    text('Description', L + 10, 287, { bold: true, size: 9, color: gray });
    text('Period', L + 330, 287, { bold: true, size: 9, color: gray });
    text('Amount', R - 10, 287, { bold: true, size: 9, color: gray, align: 'right' });
    text(`Library study space access (${s(doc.planName || 'Membership')})`, L + 10, 312, { size: 10 });
    text(`Seat ${s(doc.seatNumber || '-')}, ${s(doc.roomName || 'Study area')}`, L + 10, 325, { size: 8, color: light });
    text(period || '-', L + 330, 312, { size: 9, color: gray });
    text(rs(doc.baseAmount != null ? doc.baseAmount : total), R - 10, 312, { bold: true, size: 11, align: 'right' });
    hr(338);

    // Payment info (left) and totals (right)
    text(`Payment method: ${s(doc.paymentMethod || 'UPI')}`, L, 360, { bold: true, size: 9 });
    text(`Reference: ${s(doc.paymentRef || 'Verified')}`, L, 374, { size: 9, color: gray });
    text(`Paid on: ${s(doc.paymentDate || doc.date || '')}`, L, 388, { size: 9, color: gray });
    let ty = 360;
    const totalRow = (label, value, o = {}) => { text(label, R - 150, ty, { size: 9, color: o.color || gray, bold: o.bold }); text(value, R, ty, { size: 10, bold: true, color: o.color || dark, align: 'right' }); ty += 16; };
    if (Number(doc.discount) > 0) totalRow('Discount', `- ${rs(doc.discount)}`, { color: [7, 148, 85] });
    totalRow('Total fee', rs(total));
    totalRow('Amount paid', rs(paid), { color: [7, 148, 85] });
    if (pending > 0) totalRow('Balance due', rs(pending), { color: [217, 45, 32], bold: true });
    hr(Math.max(ty, 400) + 6);

    // Verification block
    let vy = Math.max(ty, 400) + 24;
    pdf.setFillColor(250, 250, 250); pdf.setDrawColor(207, 212, 220); pdf.roundedRect(L, vy, W, 108, 6, 6, 'FD');
    let tx = L + 14;
    if (doc.verificationCode && qrcode && doc.verifyUrl) {
      try {
        const qr = qrcode(0, 'M'); qr.addData(doc.verifyUrl); qr.make();
        const n = qr.getModuleCount(); const cell = 84 / n;
        pdf.setFillColor(...dark);
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) pdf.rect(L + 12 + c * cell, vy + 12 + r * cell, cell, cell, 'F');
        tx = L + 112;
      } catch (_) { /* no QR */ }
    }
    if (doc.verificationCode) {
      text('VERIFICATION', tx, vy + 22, { bold: true, size: 8, color: light });
      text(`Code: ${doc.verificationCode}`, tx, vy + 40, { bold: true, size: 13 });
      const lines = [
        `Scan the QR or open ${origin}/#/verify and enter the ${isReceipt ? 'receipt' : 'invoice'} number and this code to confirm it against ${library}'s records.`,
        `${period ? `Valid ${period}. ` : ''}Issued ${doc.issuedAt ? new Date(doc.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : s(doc.date)}. An edited copy will not match the record.`,
      ];
      let ly = vy + 58;
      for (const line of lines) {
        const wrapped = pdf.splitTextToSize(line, R - tx - 14);
        text(wrapped, tx, ly, { size: 8.5, color: gray });
        ly += wrapped.length * 11;
      }
    } else {
      text('This copy was generated before the server issued the document; reopen it for the verified version.', tx, vy + 40, { size: 9, color: gray, maxWidth: W - 28 });
    }

    // Footer
    text('Thank you for studying with us.', L, 800, { bold: true, size: 9 });
    text('Computer-generated document; no signature required.', L, 812, { size: 8, color: light });
    text('StudyFlow', R, 800, { bold: true, size: 9, align: 'right' });
    text(origin.replace(/^https?:\/\//, ''), R, 812, { size: 8, color: light, align: 'right' });
    return pdf;
  },

  _jsPdfPromise: null,
  ensureJsPdf() {
    if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!this._jsPdfPromise) {
      this._jsPdfPromise = new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = '/vendor/jspdf.umd.min.js';
        sc.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF library failed to load')));
        sc.onerror = () => { this._jsPdfPromise = null; reject(new Error('PDF library failed to load. Check your connection and try again.')); };
        document.head.appendChild(sc);
      });
    }
    return this._jsPdfPromise;
  },

  async pdfBlob(doc) {
    const jsPDF = await this.ensureJsPdf();
    return this.buildPdf(doc, { jsPDF }).output('blob');
  },

  pdfFileName(doc) {
    return `${String(doc.documentNumber || 'document').replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
  },

  _saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  async downloadPdf(doc) {
    try {
      const blob = await this.pdfBlob(doc);
      this._saveBlob(blob, this.pdfFileName(doc));
      return true;
    } catch (err) {
      if (typeof toast !== 'undefined') toast.show(err.message || 'Could not create the PDF.', 'error', 6000);
      return false;
    }
  },

  downloadPdfById(docId) {
    const doc = store.getDocument(docId);
    if (!doc) { if (typeof toast !== 'undefined') toast.show('Document not found', 'error'); return; }
    return this.downloadPdf(doc);
  },

  /** Phones can share a file straight into WhatsApp; elsewhere the PDF is downloaded instead. */
  canShareFiles() {
    try {
      return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] });
    } catch (_) { return false; }
  },

  async sharePdf(doc, { text = '' } = {}) {
    let blob;
    try { blob = await this.pdfBlob(doc); }
    catch (err) { if (typeof toast !== 'undefined') toast.show(err.message || 'Could not create the PDF.', 'error', 6000); return 'failed'; }
    const file = new File([blob], this.pdfFileName(doc), { type: 'application/pdf' });
    if (this.canShareFiles() && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: doc.documentNumber, text });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
      }
    }
    this._saveBlob(blob, file.name);
    return 'downloaded';
  },

  // ── 2b. Verification block (code + QR) printed on every issued document ──
  verificationBlockHTML(doc, esc) {
    if (!doc.verificationCode) {
      return `<div style="margin-top:16px;font-size:11px;color:#717680;">Verification pending: this copy was generated before the server issued the document. Reopen it from the student's profile for the verified version.</div>`;
    }
    let qrSvg = '';
    try {
      if (typeof window !== 'undefined' && window.qrcode && doc.verifyUrl) {
        const qr = window.qrcode(0, 'M');
        qr.addData(doc.verifyUrl);
        qr.make();
        qrSvg = typeof qr.createSvgTag === 'function' ? qr.createSvgTag({ cellSize: 3, margin: 2 }) : '';
      }
    } catch (_) { qrSvg = ''; }
    const period = doc.startDate && doc.endDate ? `Valid ${esc(doc.startDate)} to ${esc(doc.endDate)}.` : '';
    return `
      <div style="display:flex;gap:16px;align-items:center;border:1px dashed #cfd4dc;border-radius:8px;padding:12px 14px;margin-top:18px;background:#fafafa;">
        ${qrSvg ? `<div style="flex-shrink:0;line-height:0;">${qrSvg}</div>` : ''}
        <div style="font-size:12px;color:#535862;line-height:1.5;">
          <div style="font-weight:700;color:#181d27;">Verification code
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;letter-spacing:1px;margin-left:6px;">${esc(doc.verificationCode)}</span>
          </div>
          <div>Scan the QR code or open <span style="word-break:break-all;">${esc(doc.verifyUrl || '')}</span> to confirm this ${doc.documentType === 'receipt' ? 'receipt' : 'invoice'} against ${esc(doc.branchName || 'the library')}'s records. ${period}</div>
          <div style="color:#717680;">Issued ${esc(doc.issuedAt ? new Date(doc.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : doc.date || '')}. An edited copy will not match the record.</div>
        </div>
      </div>`;
  },

  // ── 3. Render Branded Document HTML (SEC-007: XSS Sanitization) ──
  renderDocumentHTML(doc) {
    const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const isReceipt = doc.documentType === 'receipt';
    const statusColor = doc.status === 'PAID' || doc.status === 'SUCCESS' ? '#079455' : (doc.status === 'PARTIAL' ? '#dc6803' : '#d92d20');

    return `
      <div class="sf-invoice-sheet" id="invoice-sheet-${esc(doc.id)}" style="
        background: #ffffff;
        color: #181d27;
        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        padding: 36px 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        max-width: 720px;
        margin: 0 auto;
        line-height: 1.5;
        border: 1px solid #e9eaeb;
      ">
        <!-- Document Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:1px solid #e9eaeb;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="
              width:44px;height:44px;border-radius:10px;
              background:linear-gradient(135deg, #181d27 0%, #252b37 100%);
              color:#ffffff;display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:18px;letter-spacing:-0.5px;
            ">SF</div>
            <div>
              <div style="font-size:18px;font-weight:700;color:#181d27;letter-spacing:-0.3px;">StudyFlow</div>
              <div style="font-size:12px;color:#535862;">${esc(doc.branchName || 'Main Study Library')}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:700;color:#181d27;text-transform:uppercase;letter-spacing:0.5px;">
              ${isReceipt ? 'Payment Receipt' : 'Tax Invoice'}
            </div>
            <div style="font-size:13px;font-weight:600;color:#535862;margin-top:2px;">
              # ${esc(doc.documentNumber)}
            </div>
            <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;">
              ● ${esc(doc.status)}
            </div>
          </div>
        </div>

        <!-- Meta Details: Two Columns -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px 0;border-bottom:1px solid #e9eaeb;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Billed To</div>
            <div style="font-size:15px;font-weight:600;color:#181d27;">${esc(doc.studentName || 'Student')}</div>
            <div style="font-size:13px;color:#535862;margin-top:2px;">Phone: ${esc(doc.studentPhone || 'N/A')}</div>
            ${doc.studentId ? `<div style="font-size:12px;color:#717680;">Student ID: ${esc(doc.studentId)}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Library Details</div>
            <div style="font-size:13px;font-weight:500;color:#181d27;">${esc(doc.branchAddress || 'Mumbai, Maharashtra')}</div>
            <div style="font-size:13px;color:#535862;">Support: ${esc(doc.branchPhone || '+91 98765 43210')}</div>
            <div style="font-size:12px;color:#717680;margin-top:4px;">Date: ${esc(doc.date)}</div>
          </div>
        </div>

        <!-- Seat & Facility Breakdown Card -->
        <div style="background:#fafafa;border:1px solid #e9eaeb;border-radius:8px;padding:16px;margin:20px 0;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:10px;">Allocated Facility</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;text-align:center;">
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Seat</div>
              <div style="font-size:14px;font-weight:700;color:#181d27;">${esc(doc.seatNumber || 'N/A')}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Room</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(doc.roomName || 'General')}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Plan</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${esc(doc.planName || 'Monthly')}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Valid Until</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${esc(doc.endDate || 'N/A')}</div>
            </div>
          </div>
        </div>

        <!-- Line Item Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="border-bottom:1px solid #e9eaeb;background:#fafafa;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#535862;">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#535862;">Period</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#535862;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e9eaeb;">
              <td style="padding:12px;font-size:13px;font-weight:500;color:#181d27;">
                Library Study Space Access (${esc(doc.planName)})
                <div style="font-size:12px;color:#717680;">Seat ${esc(doc.seatNumber)}, ${esc(doc.roomName)}</div>
              </td>
              <td style="padding:12px;text-align:center;font-size:12px;color:#535862;">
                ${esc(doc.startDate || '')} to ${esc(doc.endDate || '')}
              </td>
              <td style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#181d27;">
                ₹${Number(doc.baseAmount || doc.amount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Totals & Payment Breakdown -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0 24px;border-bottom:1px solid #e9eaeb;">
          <div style="font-size:12px;color:#535862;max-width:280px;">
            <div style="font-weight:600;color:#181d27;margin-bottom:4px;">Payment Method: ${esc(doc.paymentMethod || 'UPI')}</div>
            <div>Reference / Txn: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:11px;">${esc(doc.paymentRef || 'Verified')}</code></div>
            <div style="margin-top:2px;">Paid On: ${esc(doc.paymentDate || doc.date)}</div>
          </div>
          <div style="min-width:220px;">
            ${Number(doc.discount) > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#535862;margin-bottom:6px;">
                <span>Discount</span>
                <span style="color:#079455;">- ₹${Number(doc.discount).toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#181d27;margin-bottom:8px;">
              <span>Total Fee</span>
              <span>₹${Number(doc.finalAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#079455;margin-bottom:6px;">
              <span>Amount Paid</span>
              <span>₹${Number(doc.paidAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            ${Number(doc.pendingAmount) > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#d92d20;padding-top:6px;border-top:1px dashed #e9eaeb;">
                <span>Balance Due</span>
                <span>₹${Number(doc.pendingAmount).toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${this.verificationBlockHTML(doc, esc)}

        <!-- Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:20px;font-size:12px;color:#717680;">
          <div>
            <div style="font-weight:600;color:#181d27;">Thank you for studying with StudyFlow!</div>
            <div>This is a computer generated document and requires no physical signature.</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600;color:#181d27;">StudyFlow Systems</div>
            <div style="font-size:11px;">studyflow.in</div>
          </div>
        </div>
      </div>
    `;
  },

  // ── 4. Document Modal & Actions ──────────────────────────────────
  previewDocument(docId) {
    const doc = store.getDocument(docId);
    if (!doc) {
      toast.show('Document not found', 'error');
      return;
    }

    const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const escAttr = typeof escapeAttr === 'function' ? escapeAttr : esc;
    const html = this.renderDocumentHTML(doc);

    modal.open(`${doc.documentType === 'receipt' ? 'Receipt' : 'Invoice'} — ${esc(doc.documentNumber)}`, `
      <div style="max-height:75vh;overflow-y:auto;padding:12px;">
        ${html}
      </div>
    `, `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
          Document ID: ${esc(doc.id)}
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-primary btn-sm" id="btn-download-doc-action" data-doc-id="${escAttr(doc.id)}">
            ${icons.download || ''} Download PDF
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-print-doc-action" data-doc-id="${escAttr(doc.id)}">
            ${icons.printer || ''} Print
          </button>
          <button class="btn btn-secondary btn-sm" onclick="modal.close()">
            Close
          </button>
        </div>
      </div>
    `, { size: 'lg' });

    setTimeout(() => {
      const printBtn = document.getElementById('btn-print-doc-action');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          invoiceGenerator.printDocument(printBtn.getAttribute('data-doc-id'));
        });
      }
      const dlBtn = document.getElementById('btn-download-doc-action');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          invoiceGenerator.downloadPdfById(dlBtn.getAttribute('data-doc-id'));
        });
      }
    }, 50);
  },

  printDocument(docId) {
    const doc = store.getDocument(docId);
    if (!doc) return;
    this.printDoc(doc);
  },

  // Opens the print dialog ("Save as PDF"). The window title becomes the PDF's Title metadata,
  // so the number, validity and verification code travel with the file.
  printDoc(doc) {
    const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const html = this.renderDocumentHTML(doc);
    const total = Number(doc.finalAmount != null ? doc.finalAmount : (doc.amount || 0));
    const titleParts = [
      doc.documentNumber,
      doc.branchName,
      doc.startDate && doc.endDate ? `${doc.startDate} to ${doc.endDate}` : null,
      `INR ${total.toLocaleString('en-IN')}`,
      doc.verificationCode ? `Verify ${doc.verificationCode}` : null,
    ].filter(Boolean).join(' · ');
    const win = window.open('', '_blank');
    if (!win) {
      toast.show('Popups blocked. Please allow popups to print.', 'warning');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${esc(titleParts)}</title>
        <meta name="author" content="StudyFlow for ${esc(doc.branchName || 'library')}">
        <meta name="description" content="${esc(doc.documentType === 'receipt' ? 'Payment receipt' : 'Tax invoice')} ${esc(doc.documentNumber)}${doc.verificationCode ? `, verification code ${esc(doc.verificationCode)}` : ''}${doc.verifyUrl ? `, verify at ${esc(doc.verifyUrl)}` : ''}">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { margin: 0; padding: 20px; background: #fff !important; }
            .sf-invoice-sheet { box-shadow: none !important; border: none !important; max-width: 100% !important; }
          }
        </style>
      </head>
      <body style="background:#f5f5f5;padding:40px 0;">
        ${html}
        <script>
          setTimeout(() => { window.print(); }, 400);
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  }
};

if (typeof window !== 'undefined') {
  window.invoiceGenerator = invoiceGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { invoiceGenerator };
}
