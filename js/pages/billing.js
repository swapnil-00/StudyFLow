// js/pages/billing.js — Billing & Plan
// Current plan and seat usage, upgrades (Basic / Custom seats), the automatic WhatsApp
// notifications add-on, and payment history. Every number shown here comes from
// /api/billing (lib/plans.js on the server); this page never computes a price itself.

export function renderBillingPage(container, params = {}) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const user = store.currentUser || {};
  const isOwner = (user.role || 'owner') === 'owner';
  const orderParam = params && typeof params.get === 'function' ? params.get('order') : (params && params.order) || null;

  let state = null;   // last /api/billing status payload
  let busy = false;

  const fmtINR = (n) => {
    const v = Math.round(Number(n) || 0);
    const s = String(Math.abs(v));
    const grouped = s.length > 3 ? s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3) : s;
    return `${v < 0 ? '-' : ''}₹${grouped}`;
  };
  const fmtDate = (d) => (d ? utils.formatDate(d) : '—');

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Billing & Plan</h1>
          <p class="page-subtitle">Your plan, seat capacity and WhatsApp notification mode</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" id="billing-contact-btn">Contact StudyFlow</button>
        </div>
      </div>
    </div>
    <div id="billing-root">
      <div class="card"><div class="card-body" style="padding:var(--space-8);text-align:center;color:var(--color-text-secondary);">Loading your plan…</div></div>
    </div>
  `;
  const root = () => container.querySelector('#billing-root');
  container.querySelector('#billing-contact-btn')?.addEventListener('click', () => window.app?.openContactModal?.());

  // ── Data ───────────────────────────────────────────────────────────────────
  async function load() {
    try {
      state = await store.billingStatus();
      render();
    } catch (err) {
      root().innerHTML = `<div class="card"><div class="card-body"><div class="auth-alert alert-error" style="display:block;">${esc(err.message || 'Could not load billing.')}</div></div></div>`;
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function statusBadge(sub) {
    if (sub.suspended) return `<span class="badge badge-danger">SUSPENDED</span>`;
    if (sub.isDemo) return `<span class="badge badge-warning">DEMO</span>`;
    return `<span class="badge badge-success">ACTIVE</span>`;
  }

  function autoBadge(sub) {
    const cls = sub.whatsappMode === 'automatic' ? 'badge-success'
      : (sub.autoStatus === 'payment_failed' || sub.autoStatus === 'expired') ? 'badge-danger'
      : sub.autoStatus === 'cancelled' ? 'badge-warning' : 'badge-neutral';
    return `<span class="badge ${cls}">${esc(sub.autoLabel)}</span>`;
  }

  function currentPlanCard() {
    const sub = state.subscription;
    const used = state.seatsUsed;
    const limit = sub.seatLimit;
    const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
    const over = used > limit;
    const barColor = over || pct >= 100 ? 'var(--sf-error-500)' : pct > 80 ? 'var(--sf-warning-500)' : 'var(--color-primary)';
    return `
      <div class="card" style="border:1.5px solid rgba(97,114,243,0.3);">
        <div class="card-header" style="background:rgba(97,114,243,0.04);">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <span>Current Plan</span>
            <div style="display:flex;gap:6px;">${statusBadge(sub)}<span class="badge badge-indigo">${esc(sub.planName.toUpperCase())}</span></div>
          </div>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="grid-3" style="gap:var(--space-4);">
            <div>
              <div style="font-size:12px;color:var(--color-text-secondary);">Plan</div>
              <div style="font-size:18px;font-weight:700;">${esc(sub.planName)}</div>
              ${sub.planPaidAt ? `<div style="font-size:12px;color:var(--color-text-tertiary);">Paid on ${esc(fmtDate(sub.planPaidAt))}</div>` : (sub.plan === 'free' ? `<div style="font-size:12px;color:var(--color-text-tertiary);">No charge</div>` : '')}
            </div>
            <div>
              <div style="font-size:12px;color:var(--color-text-secondary);">Seats used</div>
              <div style="font-size:18px;font-weight:700;color:${over ? 'var(--sf-error-600)' : 'inherit'};">${esc(used)} / ${esc(limit)}</div>
              ${over ? `<div style="font-size:12px;color:var(--sf-error-600);">Over the plan limit: no new seats until you upgrade.</div>` : ''}
            </div>
            <div>
              <div style="font-size:12px;color:var(--color-text-secondary);">WhatsApp notifications</div>
              <div style="margin-top:4px;">${autoBadge(sub)}</div>
              ${sub.autoUntilText && sub.autoStatus === 'active' ? `<div style="font-size:12px;color:var(--color-text-tertiary);">Next payment by ${esc(sub.autoUntilText)}</div>` : ''}
            </div>
          </div>
          <div>
            <div style="width:100%;height:8px;background:var(--color-bg-secondary);border-radius:4px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;"></div>
            </div>
            <div style="font-size:12px;color:var(--color-text-secondary);margin-top:6px;">${esc(used)} of ${esc(limit)} seats used (${pct}%)</div>
          </div>
          ${sub.suspended ? `<div class="auth-alert alert-error" style="display:block;">This library's subscription is inactive. Contact StudyFlow to reactivate.</div>` : ''}
          ${!isOwner ? `<div style="font-size:13px;color:var(--color-text-secondary);">Only the library owner can change the plan.</div>` : ''}
        </div>
      </div>`;
  }

  function plansCard() {
    const sub = state.subscription;
    const p = state.pricing;
    if (sub.isDemo) return '';
    const customOptions = [];
    for (let s = p.custom.minSeats; s <= p.custom.maxSeats; s += p.custom.step) customOptions.push(s);
    const defaultCustom = customOptions.find(s => s > sub.seatLimit) || customOptions[0];
    const customPrice = (seats) => (seats / p.custom.blockSeats) * p.custom.pricePerBlock;
    const isFree = sub.plan === 'free';
    const isBasic = sub.plan === 'basic';
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">Plans</div><div class="card-subtitle">One-time payment. Seats are the chairs on your seat map.</div></div>
        <div class="card-body">
          <div class="grid-3" style="gap:var(--space-4);align-items:stretch;">
            <div style="border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:8px;${isFree ? 'background:var(--color-bg-secondary);' : ''}">
              <div style="font-weight:700;">Free ${isFree ? '<span class="badge badge-neutral" style="margin-left:6px;">Current</span>' : ''}</div>
              <div style="font-size:22px;font-weight:800;">₹0</div>
              <div style="font-size:13px;color:var(--color-text-secondary);">${esc(p.free.seats)} seats · Manual WhatsApp reminders</div>
            </div>
            <div style="border:2px solid var(--color-primary);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:8px;${isBasic ? 'background:var(--color-bg-secondary);' : ''}">
              <div style="font-weight:700;">Basic ${isBasic ? '<span class="badge badge-neutral" style="margin-left:6px;">Current</span>' : ''}</div>
              <div style="font-size:22px;font-weight:800;">${fmtINR(p.basic.price)} <span style="font-size:12px;font-weight:500;color:var(--color-text-tertiary);">one-time</span></div>
              <div style="font-size:13px;color:var(--color-text-secondary);">${esc(p.basic.seats)} seats · Manual WhatsApp · Automatic add-on available</div>
              <div style="flex:1;"></div>
              ${isOwner && isFree ? `<button class="btn btn-primary w-full" data-buy-plan="basic">Upgrade to Basic — ${fmtINR(p.basic.price)}</button>` : (sub.paid ? `<div style="font-size:12px;color:var(--color-text-tertiary);">Included in your plan</div>` : '')}
            </div>
            <div style="border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:8px;${sub.plan === 'custom' ? 'background:var(--color-bg-secondary);' : ''}">
              <div style="font-weight:700;">Custom ${sub.plan === 'custom' ? '<span class="badge badge-neutral" style="margin-left:6px;">Current</span>' : ''}</div>
              <div style="font-size:13px;color:var(--color-text-secondary);">${fmtINR(p.custom.pricePerBlock)} per ${esc(p.custom.blockSeats)} seats, one-time. Blocks of ${esc(p.custom.step)}.</div>
              <label class="form-label" for="custom-seats" style="margin-top:4px;">Seats</label>
              <select class="input" id="custom-seats" ${isOwner ? '' : 'disabled'}>
                ${customOptions.map(s => `<option value="${s}" ${s === defaultCustom ? 'selected' : ''}>${s} seats — ${fmtINR(customPrice(s))}</option>`).join('')}
              </select>
              <div style="flex:1;"></div>
              ${isOwner ? `<button class="btn btn-secondary w-full" data-buy-plan="custom">Buy <span id="custom-seats-label">${esc(defaultCustom)}</span> seats — <span id="custom-price-label">${fmtINR(customPrice(defaultCustom))}</span></button>` : ''}
              ${sub.plan === 'custom' ? `<div style="font-size:12px;color:var(--color-text-tertiary);">You have ${esc(sub.seatLimit)} seats. Buying more replaces your limit with the new total.</div>` : ''}
            </div>
          </div>
          ${!state.payments.configured && isOwner ? `<div style="margin-top:var(--space-4);font-size:13px;color:var(--color-text-secondary);">Online payment is being set up. You can pay by UPI or bank transfer: contact StudyFlow and the plan is activated as soon as the payment is confirmed.</div>` : ''}
        </div>
      </div>`;
  }

  function autoNotifyCard() {
    const sub = state.subscription;
    const p = state.pricing;
    const months = p.autoNotify.prepayMonths;
    const monthly = sub.autoMonthlyFee;
    const wa = state.whatsapp || {};
    const lastRun = wa.lastRun;
    let cta = '';
    if (!sub.autoEligible) {
      cta = `<div style="font-size:13px;color:var(--color-text-secondary);">Available on paid plans. Upgrade to Basic or Custom first.</div>`;
    } else if (isOwner && !sub.isDemo) {
      const verb = sub.autoStatus === 'active' ? 'Extend' : (sub.autoStatus === 'not_subscribed' ? 'Enable' : 'Renew');
      cta = `
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          ${months.map((m, i) => `
            <label style="display:flex;align-items:center;gap:6px;border:1px solid var(--color-border-secondary);border-radius:var(--radius-md);padding:6px 10px;cursor:pointer;font-size:13px;">
              <input type="radio" name="auto-months" value="${m}" ${i === 0 ? 'checked' : ''}> ${m} month${m === 1 ? '' : 's'} · <strong>${fmtINR(monthly * m)}</strong>
            </label>`).join('')}
        </div>
        <button class="btn btn-primary" id="auto-pay-btn" style="margin-top:10px;">${verb} automatic notifications — <span id="auto-pay-amount">${fmtINR(monthly * months[0])}</span></button>`;
    }
    const modeToggle = isOwner && sub.autoEligible && sub.autoStatus === 'active' ? `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:var(--space-3);">
        <span style="font-size:13px;color:var(--color-text-secondary);">Notification mode:</span>
        <div class="filter-tabs">
          <button class="filter-tab ${sub.whatsappSelectedMode === 'manual' ? 'active' : ''}" data-set-mode="manual">Manual</button>
          <button class="filter-tab ${sub.whatsappSelectedMode === 'automatic' ? 'active' : ''}" data-set-mode="automatic">Automatic</button>
        </div>
        <a href="javascript:void(0)" id="auto-cancel-link" style="font-size:12px;color:var(--color-text-tertiary);margin-left:auto;">Cancel automatic notifications</a>
      </div>` : '';
    const tools = isOwner && sub.whatsappMode === 'automatic' ? `
      <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-border-secondary);display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:12px;color:var(--color-text-secondary);">
          Sender: ${wa.configured ? '<span class="badge badge-success">WhatsApp connected</span>' : '<span class="badge badge-warning">Being set up by StudyFlow</span>'}
          ${lastRun ? ` · Last automatic run ${esc(utils.formatDateTime ? utils.formatDateTime(lastRun.startedAt) : fmtDate(lastRun.startedAt))}: sent ${esc(lastRun.summary?.sent ?? 0)}, failed ${esc(lastRun.summary?.failed ?? 0)}, skipped ${esc(lastRun.summary?.skipped ?? 0)}` : ' · Runs every morning at 9:00 AM IST'}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-secondary btn-sm" id="auto-run-now" ${wa.configured ? '' : 'disabled'}>Run today's reminders now</button>
          <input class="input" id="auto-test-phone" placeholder="Your mobile number" value="${esc(state.phone || user.phone || '')}" style="width:170px;" />
          <button class="btn btn-secondary btn-sm" id="auto-test-btn" ${wa.configured ? '' : 'disabled'}>Send me a test message</button>
        </div>
      </div>` : '';
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Automatic WhatsApp Notifications</div>
            <div class="card-subtitle">Fee reminders and expiry notices sent for you every morning. ${fmtINR(p.autoNotify.perSeatMonthly)} per seat per month${sub.autoEligible ? ` → <strong>${fmtINR(monthly)}/month</strong> for your ${esc(sub.seatLimit)} seats` : ''}.</div>
          </div>
          ${autoBadge(sub)}
        </div>
        <div class="card-body">
          <div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:var(--space-3);">${esc(sub.autoReason)}</div>
          ${cta}
          ${modeToggle}
          ${tools}
        </div>
      </div>`;
  }

  function historyCard() {
    if (!isOwner) return '';
    const orders = state.orders || [];
    const badge = (s) => s === 'paid' ? 'badge-success' : s === 'created' ? 'badge-neutral' : 'badge-danger';
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">Payment history</div></div>
        <div class="card-body" style="padding:0;">
          ${orders.length === 0 ? `<div class="empty-state" style="padding:var(--space-6);"><div class="empty-title" style="font-size:var(--text-sm);">No payments yet</div></div>` : `
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>
              ${orders.map(o => `<tr>
                <td>${esc(fmtDate(o.paidAt || o.createdAt))}</td>
                <td>${esc(o.description || o.kind)}</td>
                <td>${fmtINR(o.amount)}</td>
                <td><span class="badge ${badge(o.status)}">${esc(o.status.toUpperCase())}</span>${o.failureReason ? `<div style="font-size:11px;color:var(--color-text-tertiary);">${esc(o.failureReason)}</div>` : ''}</td>
                <td style="font-size:12px;color:var(--color-text-tertiary);">${esc(o.providerPaymentId || o.id)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
        </div>
      </div>`;
  }

  function render() {
    root().innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        ${currentPlanCard()}
        ${plansCard()}
        ${autoNotifyCard()}
        ${historyCard()}
      </div>`;
    attach();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function setBusy(on) {
    busy = on;
    root().querySelectorAll('button').forEach(b => { b.disabled = on || b.hasAttribute('data-keep-disabled'); });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.Cashfree) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the payment page. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }

  function promptPhone() {
    return new Promise((resolve) => {
      const id = `sf_phone_${Date.now()}`;
      window[id] = (ok) => {
        const v = ok ? (document.getElementById('billing-phone-input')?.value || '') : '';
        delete window[id];
        modal.close();
        resolve(v.replace(/\D/g, ''));
      };
      modal.open('Mobile number for the payment receipt',
        `<div class="form-group"><label class="form-label" for="billing-phone-input">10-digit mobile number</label>
         <input class="input" id="billing-phone-input" inputmode="numeric" maxlength="10" placeholder="98765 43210" value="${esc(user.phone || '')}" /></div>`,
        `<button class="btn btn-secondary" onclick="window['${id}'](false)">Cancel</button><button class="btn btn-primary" onclick="window['${id}'](true)">Continue</button>`,
        { size: 'sm' });
      setTimeout(() => document.getElementById('billing-phone-input')?.focus(), 50);
    });
  }

  function showManualPaymentInfo(quoteText) {
    modal.open('Pay by UPI or bank transfer',
      `<div style="display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.5;">
        <p style="margin:0;">Online payment is being set up. ${quoteText ? `<br><strong>${esc(quoteText)}</strong>` : ''}</p>
        <p style="margin:0;color:var(--color-text-secondary);">Contact StudyFlow for the UPI ID or bank details. Your plan is activated as soon as the payment is confirmed.</p>
      </div>`,
      `<button class="btn btn-secondary" onclick="modal.close()">Close</button><button class="btn btn-primary" onclick="modal.close(); app.openContactModal()">Contact StudyFlow</button>`,
      { size: 'sm' });
  }

  async function startCheckout(body, quoteText) {
    if (busy) return;
    if (!state.payments.configured) { showManualPaymentInfo(quoteText); return; }
    let phone = (state.phone || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(phone.slice(-10))) {
      phone = await promptPhone();
      if (!/^\d{10}$/.test(phone)) { if (phone) toast.show('Enter a valid 10-digit mobile number.', 'warning'); return; }
    }
    setBusy(true);
    try {
      const r = await store.billingCheckout({ ...body, phone });
      await loadScript(r.sdkUrl);
      const cashfree = window.Cashfree({ mode: r.mode });
      toast.show(`Opening secure payment for ${fmtINR(r.amount)}…`, 'info');
      await cashfree.checkout({ paymentSessionId: r.paymentSessionId, redirectTarget: '_self' });
    } catch (err) {
      setBusy(false);
      if (err.code === 'PAYMENTS_NOT_CONFIGURED') showManualPaymentInfo(quoteText);
      else toast.show(err.message || 'Could not start the payment.', 'error', 7000);
    }
  }

  async function syncOrder(orderId) {
    try {
      const r = await store.billingSync(orderId);
      if (r.orderStatus === 'PAID') {
        toast.show('Payment received. Your plan has been updated.', 'success', 6000);
        await store.refreshOrganization();
        if (window.app) { window.app._render(); window.app._navigate(); return; }
      } else if (r.orderStatus === 'EXPIRED' || r.orderStatus === 'TERMINATED') {
        toast.show('That payment link expired before it was paid. You can start again below.', 'warning', 7000);
      } else {
        toast.show('The payment was not completed. Nothing has been charged.', 'info', 6000);
      }
    } catch (err) {
      toast.show(err.message || 'Could not confirm the payment. If money was deducted it will reflect shortly.', 'error', 8000);
    }
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#/billing');
    await load();
  }

  function attach() {
    const r = root();
    const sub = state.subscription;
    const p = state.pricing;

    r.querySelector('[data-buy-plan="basic"]')?.addEventListener('click', () =>
      startCheckout({ kind: 'plan', plan: 'basic' }, `Basic plan — ${p.basic.seats} seats — ${fmtINR(p.basic.price)}`));

    const customSel = r.querySelector('#custom-seats');
    const customBtn = r.querySelector('[data-buy-plan="custom"]');
    const updateCustom = () => {
      const seats = Number(customSel.value);
      const price = (seats / p.custom.blockSeats) * p.custom.pricePerBlock;
      const l = r.querySelector('#custom-seats-label'); if (l) l.textContent = String(seats);
      const pl = r.querySelector('#custom-price-label'); if (pl) pl.textContent = fmtINR(price);
    };
    customSel?.addEventListener('change', updateCustom);
    customBtn?.addEventListener('click', () => {
      const seats = Number(customSel.value);
      if (seats <= sub.seatLimit) { toast.show(`Choose more than your current ${sub.seatLimit} seats.`, 'warning'); return; }
      startCheckout({ kind: 'plan', plan: 'custom', seats }, `Custom plan — ${seats} seats — ${fmtINR((seats / p.custom.blockSeats) * p.custom.pricePerBlock)}`);
    });

    const monthsRadios = r.querySelectorAll('input[name="auto-months"]');
    const payBtn = r.querySelector('#auto-pay-btn');
    const selectedMonths = () => Number([...monthsRadios].find(x => x.checked)?.value || p.autoNotify.prepayMonths[0]);
    monthsRadios.forEach(x => x.addEventListener('change', () => {
      const a = r.querySelector('#auto-pay-amount'); if (a) a.textContent = fmtINR(sub.autoMonthlyFee * selectedMonths());
    }));
    payBtn?.addEventListener('click', () => {
      const m = selectedMonths();
      startCheckout({ kind: 'auto_notify', months: m }, `Automatic WhatsApp notifications — ${sub.seatLimit} seats × ${m} month${m === 1 ? '' : 's'} — ${fmtINR(sub.autoMonthlyFee * m)}`);
    });

    r.querySelectorAll('[data-set-mode]').forEach(btn => btn.addEventListener('click', async () => {
      if (busy) return;
      const mode = btn.getAttribute('data-set-mode');
      setBusy(true);
      try {
        const res = await store.billingSetWhatsappMode(mode);
        state.subscription = res.subscription;
        if (store.organization) { store.organization.subscription = res.subscription; store.organization.whatsappMode = res.subscription.whatsappMode; }
        toast.show(mode === 'automatic' ? 'Automatic notifications are on.' : 'Switched to manual reminders.', 'success');
        render();
      } catch (err) { setBusy(false); toast.show(err.message, 'error', 6000); }
    }));

    r.querySelector('#auto-cancel-link')?.addEventListener('click', async () => {
      const ok = await modal.confirm({
        title: 'Cancel automatic notifications?',
        message: 'Reminders switch to manual immediately. You can renew any time; nothing is deleted.',
        confirmText: 'Cancel automatic', cancelText: 'Keep', type: 'warning',
      });
      if (!ok) return;
      try {
        const res = await store.billingCancelAutoNotify();
        state.subscription = res.subscription;
        if (store.organization) { store.organization.subscription = res.subscription; store.organization.whatsappMode = res.subscription.whatsappMode; }
        toast.show('Automatic notifications cancelled.', 'info');
        render();
      } catch (err) { toast.show(err.message, 'error', 6000); }
    });

    r.querySelector('#auto-run-now')?.addEventListener('click', async () => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await store.billingRunRemindersNow();
        const s = res.summary || {};
        toast.show(`Reminders run: ${s.sent || 0} sent, ${s.failed || 0} failed, ${s.skipped || 0} already sent today.`, s.failed ? 'warning' : 'success', 7000);
        await load();
      } catch (err) { setBusy(false); toast.show(err.message, 'error', 7000); }
    });

    r.querySelector('#auto-test-btn')?.addEventListener('click', async () => {
      if (busy) return;
      const phone = r.querySelector('#auto-test-phone')?.value || '';
      setBusy(true);
      try {
        const res = await store.billingWhatsappTest(phone);
        toast.show(`Test message sent to +${res.to}. Check WhatsApp.`, 'success', 6000);
      } catch (err) { toast.show(err.message, 'error', 8000); }
      setBusy(false);
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  setTimeout(async () => {
    if (orderParam) { await syncOrder(orderParam); return; }
    await load();
  }, 0);
}
