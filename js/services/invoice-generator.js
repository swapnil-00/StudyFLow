// StudyFlow — Professional Invoice & Receipt Document Generator

const invoiceGenerator = {
  // ── 1. Generate Invoice ──────────────────────────────────────────
  generateInvoice({ membershipId, studentId, seatId, paymentId = null }) {
    const student = store.getStudent(studentId);
    const membership = store.getMembership(membershipId);
    const seat = seatId ? store.getSeat(seatId) : (membership?.seatId ? store.getSeat(membership.seatId) : null);
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const floor = room?.floorId ? store.getFloor(room.floorId) : null;
    const branchId = membership?.branchId || seat?.branchId || store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const settings = store.getSettings();

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
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

    // Store in documents table
    store.saveDocument(documentData);

    return documentData;
  },

  // ── 2. Generate Payment Receipt ──────────────────────────────────
  generateReceipt({ paymentId, studentId = null, membershipId = null }) {
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

    const receiptNumber = payment?.receiptNumber || `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
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

    store.saveDocument(documentData);
    return documentData;
  },

  // ── 3. Render Branded Document HTML ──────────────────────────────
  renderDocumentHTML(doc) {
    const isReceipt = doc.documentType === 'receipt';
    const statusColor = doc.status === 'PAID' || doc.status === 'SUCCESS' ? '#079455' : (doc.status === 'PARTIAL' ? '#dc6803' : '#d92d20');

    return `
      <div class="sf-invoice-sheet" id="invoice-sheet-${doc.id}" style="
        background: #ffffff;
        color: #181d27;
        font-family: 'Inter', -apple-system, sans-serif;
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
              <div style="font-size:12px;color:#535862;">${doc.branchName || 'Main Study Library'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:700;color:#181d27;text-transform:uppercase;letter-spacing:0.5px;">
              ${isReceipt ? 'Payment Receipt' : 'Tax Invoice'}
            </div>
            <div style="font-size:13px;font-weight:600;color:#535862;margin-top:2px;">
              # ${doc.documentNumber}
            </div>
            <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;">
              ● ${doc.status}
            </div>
          </div>
        </div>

        <!-- Meta Details: Two Columns -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px 0;border-bottom:1px solid #e9eaeb;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Billed To</div>
            <div style="font-size:15px;font-weight:600;color:#181d27;">${doc.studentName || 'Student'}</div>
            <div style="font-size:13px;color:#535862;margin-top:2px;">Phone: ${doc.studentPhone || 'N/A'}</div>
            ${doc.studentId ? `<div style="font-size:12px;color:#717680;">Student ID: ${doc.studentId}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Library Details</div>
            <div style="font-size:13px;font-weight:500;color:#181d27;">${doc.branchAddress || 'Mumbai, Maharashtra'}</div>
            <div style="font-size:13px;color:#535862;">Support: ${doc.branchPhone || '+91 98765 43210'}</div>
            <div style="font-size:12px;color:#717680;margin-top:4px;">Date: ${doc.date}</div>
          </div>
        </div>

        <!-- Seat & Facility Breakdown Card -->
        <div style="background:#fafafa;border:1px solid #e9eaeb;border-radius:8px;padding:16px;margin:20px 0;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:10px;">Allocated Facility</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;text-align:center;">
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Seat</div>
              <div style="font-size:14px;font-weight:700;color:#181d27;">${doc.seatNumber || 'N/A'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Room</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.roomName || 'General'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Plan</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${doc.planName || 'Monthly'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Valid Until</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${doc.endDate || 'N/A'}</div>
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
                Library Study Space Access (${doc.planName})
                <div style="font-size:12px;color:#717680;">Seat ${doc.seatNumber}, ${doc.roomName}</div>
              </td>
              <td style="padding:12px;text-align:center;font-size:12px;color:#535862;">
                ${doc.startDate || ''} to ${doc.endDate || ''}
              </td>
              <td style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#181d27;">
                ₹${(doc.baseAmount || doc.amount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Totals & Payment Breakdown -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0 24px;border-bottom:1px solid #e9eaeb;">
          <div style="font-size:12px;color:#535862;max-width:280px;">
            <div style="font-weight:600;color:#181d27;margin-bottom:4px;">Payment Method: ${doc.paymentMethod || 'UPI'}</div>
            <div>Reference / Txn: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:11px;">${doc.paymentRef || 'Verified'}</code></div>
            <div style="margin-top:2px;">Paid On: ${doc.paymentDate || doc.date}</div>
          </div>
          <div style="min-width:220px;">
            ${doc.discount > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#535862;margin-bottom:6px;">
                <span>Discount</span>
                <span style="color:#079455;">- ₹${doc.discount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#181d27;margin-bottom:8px;">
              <span>Total Fee</span>
              <span>₹${(doc.finalAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#079455;margin-bottom:6px;">
              <span>Amount Paid</span>
              <span>₹${(doc.paidAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            ${doc.pendingAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#d92d20;padding-top:6px;border-top:1px dashed #e9eaeb;">
                <span>Balance Due</span>
                <span>₹${doc.pendingAmount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
          </div>
        </div>

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

    const html = this.renderDocumentHTML(doc);
    modal.open(`${doc.documentType === 'receipt' ? 'Receipt' : 'Invoice'} — ${doc.documentNumber}`, `
      <div style="max-height:75vh;overflow-y:auto;padding:12px;">
        ${html}
      </div>
    `, `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
          Document ID: ${doc.id}
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="invoiceGenerator.printDocument('${doc.id}')">
            ${icons.printer || ''} Print / PDF
          </button>
          <button class="btn btn-secondary btn-sm" onclick="modal.close()">
            Close
          </button>
        </div>
      </div>
    `, { size: 'lg' });
  },

  printDocument(docId) {
    const doc = store.getDocument(docId);
    if (!doc) return;
    const html = this.renderDocumentHTML(doc);
    const win = window.open('', '_blank');
    if (!win) {
      toast.show('Popups blocked. Please allow popups to print.', 'warning');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.documentNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
