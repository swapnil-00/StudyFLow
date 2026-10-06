// js/pages/verify.js — Public invoice / receipt verification (#/verify?n=INV-2026-000012&c=XXXX-XXXX-XXXX)
// No login. Shows the library's original record for a document number + verification code and
// lets the holder print/save the bill from that record.

export function renderVerifyPage(container, params = {}) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const number = String(params.n || params.number || '').trim();
  const code = String(params.c || params.code || '').trim();

  const page = document.createElement('div');
  page.className = 'auth-page-container';
  page.innerHTML = `
    <div class="auth-card" style="max-width:760px;">
      <div class="auth-header">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">Verify an invoice or receipt</h1>
        <p class="auth-subtitle">Checks the document against the library's original record on StudyFlow.</p>
      </div>
      <form id="verify-form" class="auth-form" onsubmit="event.preventDefault();" style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="verify-number">Document number</label>
          <input class="input" id="verify-number" placeholder="INV-2026-000012" value="${esc(number)}" autocapitalize="characters" spellcheck="false" />
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="verify-code">Verification code</label>
          <input class="input" id="verify-code" placeholder="XXXX-XXXX-XXXX" value="${esc(code)}" autocapitalize="characters" spellcheck="false" />
        </div>
        <button type="submit" class="btn btn-primary" id="verify-btn">Verify</button>
      </form>
      <div id="verify-result" style="margin-top:18px;"></div>
      <div class="auth-footer" style="margin-top:18px;">
        <a href="#/login" class="auth-switch-link">StudyFlow sign in</a>
      </div>
    </div>
  `;
  if (container && container.appendChild) { container.innerHTML = ''; container.appendChild(page); }

  const result = () => page.querySelector('#verify-result');

  function toDocShape(v) {
    return {
      ...v,
      branchName: v.library?.name || v.library?.organization || '',
      branchAddress: v.library?.address || '',
      branchPhone: v.library?.phone || '',
      studentName: v.student?.name || '',
      studentPhone: v.student?.phoneMasked || '',
      studentId: v.student?.id || '',
      verifyUrl: `${location.origin}/#/verify?n=${encodeURIComponent(v.documentNumber)}&c=${encodeURIComponent(v.verificationCode)}`,
      amount: v.finalAmount,
      id: v.documentNumber,
    };
  }

  async function run() {
    const n = page.querySelector('#verify-number').value.trim();
    const c = page.querySelector('#verify-code').value.trim();
    if (!n || !c) { result().innerHTML = `<div class="auth-alert alert-error" style="display:block;">Enter both the document number and the verification code printed on the bill.</div>`; return; }
    const btn = page.querySelector('#verify-btn');
    btn.disabled = true;
    result().innerHTML = `<div style="text-align:center;color:var(--color-text-secondary);padding:12px;">Checking…</div>`;
    try {
      const res = await store.verifyDocument(n, c);
      if (!res.valid) {
        result().innerHTML = `
          <div class="auth-alert alert-error" style="display:block;">
            <strong>Not verified.</strong> No document with this number and code exists in the library's records, or the details were changed.
            Check the code for typos (0 and O, 1 and I are the same here) and ask the library if it still doesn't match.
          </div>`;
        return;
      }
      const d = toDocShape(res.document);
      const issued = d.issuedAt ? new Date(d.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : d.date || '';
      result().innerHTML = `
        <div class="auth-alert alert-success" style="display:block;margin-bottom:14px;">
          <strong>✓ Verified.</strong> ${esc(d.documentType === 'receipt' ? 'Receipt' : 'Invoice')} <strong>${esc(d.documentNumber)}</strong> was issued by <strong>${esc(d.branchName)}</strong> on ${esc(issued)}.
          ${d.startDate && d.endDate ? ` Valid ${esc(d.startDate)} to ${esc(d.endDate)}.` : ''} Amount ₹${Number(d.finalAmount || 0).toLocaleString('en-IN')} (${esc(d.status)}).
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px;">
          <button class="btn btn-primary btn-sm" id="verify-download">Download PDF</button>
          <button class="btn btn-secondary btn-sm" id="verify-print">Print</button>
        </div>
        <div style="max-height:70vh;overflow:auto;">${window.invoiceGenerator ? window.invoiceGenerator.renderDocumentHTML(d) : ''}</div>`;
      page.querySelector('#verify-print')?.addEventListener('click', () => window.invoiceGenerator && window.invoiceGenerator.printDoc(d));
      page.querySelector('#verify-download')?.addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        if (window.invoiceGenerator) await window.invoiceGenerator.downloadPdf(d);
        e.currentTarget.disabled = false;
      });
    } catch (err) {
      result().innerHTML = `<div class="auth-alert alert-error" style="display:block;">${esc(err.message || 'Verification is unavailable right now.')}</div>`;
    } finally {
      btn.disabled = false;
    }
  }

  page.querySelector('#verify-form').addEventListener('submit', run);
  if (number && code) setTimeout(run, 0);
  return page;
}
