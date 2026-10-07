// js/pages/admin.js — Developer Lab (platform owner only)
// Every library on the platform, plan changes, coupons and orders. The server (api/admin.js)
// enforces access by the signed-in Google email; this page only shows what it returns.

export function renderAdminPage(container) {
  const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
  const inr = (n) => utils.formatINR ? utils.formatINR(n) : `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const fmtDate = (d) => (d ? utils.formatDate(d) : '—');

  let tab = 'overview';
  let overview = null;
  let libraries = [];
  let query = '';
  let busy = false;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Developer Lab</h1>
          <p class="page-subtitle">Platform console · ${esc(store.currentUser?.email || '')}</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" id="admin-refresh">Refresh</button>
        </div>
      </div>
    </div>
    <div class="tabs" id="admin-tabs" style="margin-bottom:var(--space-4);">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="libraries">Libraries</button>
      <button class="tab-btn" data-tab="coupons">Coupons</button>
      <button class="tab-btn" data-tab="orders">Orders</button>
    </div>
    <div id="admin-root"><div class="card"><div class="card-body" style="padding:var(--space-8);text-align:center;color:var(--color-text-secondary);">Loading…</div></div></div>
  `;
  const root = () => container.querySelector('#admin-root');

  container.querySelector('#admin-refresh').addEventListener('click', () => load(true));
  container.querySelectorAll('#admin-tabs .tab-btn').forEach(b => b.addEventListener('click', () => {
    tab = b.getAttribute('data-tab');
    container.querySelectorAll('#admin-tabs .tab-btn').forEach(x => x.classList.toggle('active', x === b));
    render();
  }));

  async function load(force = false) {
    try {
      if (force || !overview) overview = await store.adminCall('overview');
      if (force || libraries.length === 0) libraries = (await store.adminCall('libraries', { q: query })).libraries;
      render();
    } catch (err) {
      root().innerHTML = `<div class="card"><div class="card-body"><div class="auth-alert alert-error" style="display:block;">${esc(err.message)}</div></div></div>`;
    }
  }

  function stat(label, value, sub = '') {
    return `<div class="stat-card"><div class="stat-card-top"><div class="stat-card-label">${esc(label)}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-2xl);">${value}</div>${sub ? `<div class="stat-card-change neutral">${esc(sub)}</div>` : ''}</div>`;
  }

  function planBadge(lib) {
    const cls = lib.isDemo ? 'badge-warning' : lib.plan === 'free' ? 'badge-neutral' : 'badge-indigo';
    return `<span class="badge ${cls}">${esc(lib.planName.toUpperCase())}</span>`;
  }

  function renderOverview() {
    const t = overview.totals, r = overview.revenue;
    return `
      <div class="grid-4" style="margin-bottom:var(--space-5);">
        ${stat('Libraries', t.libraries, `${t.free} free · ${t.basic} basic · ${t.custom} custom · ${t.demo} demo`)}
        ${stat('Revenue', inr(r.total), `${inr(r.thisMonth)} this month · ${r.paidOrders} paid orders`)}
        ${stat('Seats / Students', `${t.seats} / ${t.students}`, `${t.users} user accounts`)}
        ${stat('Suspended', t.suspended, overview.features.autoNotify ? `${t.autoNotifyActive} on automatic WhatsApp` : 'WhatsApp add-on on hold')}
      </div>
      <div class="grid-2" style="gap:var(--space-5);">
        <div class="card"><div class="card-header"><div class="card-title">Pricing (lib/plans.js)</div></div>
          <div class="card-body" style="font-size:13px;line-height:1.8;">
            Free: ${overview.pricing.free.seats} seats · Basic: ${inr(overview.pricing.basic.price)} / ${overview.pricing.basic.seats} seats ·
            Custom: ${inr(overview.pricing.custom.pricePerBlock)} per ${overview.pricing.custom.blockSeats} seats (${overview.pricing.custom.minSeats}–${overview.pricing.custom.maxSeats})<br>
            Automatic WhatsApp add-on: ${inr(overview.pricing.autoNotify.perSeatMonthly)} / seat / month · <strong>${overview.features.autoNotify ? 'ENABLED' : 'ON HOLD'}</strong><br>
            Tax: ${overview.pricing.taxPercent}%
          </div></div>
        <div class="card"><div class="card-header"><div class="card-title">Active coupons</div></div>
          <div class="card-body" style="font-size:13px;">
            ${overview.coupons.filter(c => c.active).length === 0 ? '<span style="color:var(--color-text-tertiary);">None</span>' :
              overview.coupons.filter(c => c.active).map(c => `<div><code>${esc(c.code)}</code> — ${c.percentOff}% off ${esc(c.appliesTo)} · used ${c.uses}${c.maxUses != null ? `/${c.maxUses}` : ''}${c.expiresAt ? ` · until ${esc(fmtDate(c.expiresAt))}` : ''}</div>`).join('')}
          </div></div>
      </div>`;
  }

  function renderLibraries() {
    const rows = libraries.map(lib => `
      <tr>
        <td><div style="font-weight:600;">${esc(lib.name)}</div><div style="font-size:11px;color:var(--color-text-tertiary);">${esc(lib.id)} · ${esc(fmtDate(lib.createdAt))}${lib.onboardingCompleted ? '' : ' · setup pending'}</div></td>
        <td style="font-size:12px;">${esc(lib.ownerEmail || '—')}<div style="color:var(--color-text-tertiary);">${lib.ownerLastLogin ? 'last login ' + esc(fmtDate(lib.ownerLastLogin)) : ''}</div></td>
        <td>${planBadge(lib)}</td>
        <td style="color:${lib.seatsUsed >= lib.seatLimit ? 'var(--sf-error-600)' : 'inherit'};">${lib.seatsUsed} / ${lib.seatLimit}</td>
        <td>${lib.students}</td>
        <td>${inr(lib.revenue)}</td>
        <td><span class="badge ${lib.status === 'suspended' ? 'badge-danger' : 'badge-success'}">${esc(lib.status.toUpperCase())}</span></td>
        <td><button class="btn btn-secondary btn-sm" data-edit-lib="${esc(lib.id)}">Change</button></td>
      </tr>`).join('');
    return `
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="card-title">All libraries (${libraries.length})</div>
          <div class="input-group" style="width:280px;"><input class="input" id="admin-search" placeholder="Search name, id or owner email" value="${esc(query)}" /></div>
        </div>
        <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table">
          <thead><tr><th>Library</th><th>Owner</th><th>Plan</th><th>Seats</th><th>Students</th><th>Paid</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">No libraries</td></tr>'}</tbody>
        </table></div></div>
      </div>`;
  }

  function renderCoupons() {
    const p = overview.pricing;
    const rows = overview.coupons.map(c => `
      <tr>
        <td><code style="font-weight:700;">${esc(c.code)}</code>${c.note ? `<div style="font-size:11px;color:var(--color-text-tertiary);">${esc(c.note)}</div>` : ''}</td>
        <td>${c.percentOff}%</td><td>${esc(c.appliesTo)}</td>
        <td>${c.uses}${c.maxUses != null ? ` / ${c.maxUses}` : ' / ∞'}</td>
        <td>${c.expiresAt ? esc(fmtDate(c.expiresAt)) : '—'}</td>
        <td><span class="badge ${c.active ? 'badge-success' : 'badge-neutral'}">${c.active ? 'ACTIVE' : 'OFF'}</span></td>
        <td><button class="btn btn-secondary btn-sm" data-coupon-toggle="${esc(c.code)}" data-active="${c.active ? '1' : '0'}">${c.active ? 'Disable' : 'Enable'}</button></td>
      </tr>`).join('');
    return `
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><div class="card-title">Create a coupon</div><div class="card-subtitle">e.g. SWAP100 = 100% off: the plan is activated with no payment. Uses are counted when a purchase completes.</div></div>
        <div class="card-body">
          <form id="coupon-form" onsubmit="event.preventDefault();" style="display:grid;grid-template-columns:repeat(6, minmax(0,1fr));gap:10px;align-items:end;">
            <div class="form-group" style="margin:0;"><label class="form-label">Code</label><input class="input" id="cp-code" placeholder="SWAP100" required /></div>
            <div class="form-group" style="margin:0;"><label class="form-label">% off</label><input class="input" id="cp-pct" type="number" min="1" max="100" value="100" required /></div>
            <div class="form-group" style="margin:0;"><label class="form-label">Applies to</label>
              <select class="input" id="cp-applies"><option value="plan">Plans (Basic/Custom)</option><option value="any">Anything</option>${p && overview.features.autoNotify ? '<option value="auto_notify">WhatsApp add-on</option>' : ''}</select></div>
            <div class="form-group" style="margin:0;"><label class="form-label">Max uses</label><input class="input" id="cp-max" type="number" min="1" placeholder="unlimited" /></div>
            <div class="form-group" style="margin:0;"><label class="form-label">Expires</label><input class="input" id="cp-exp" type="date" /></div>
            <button type="submit" class="btn btn-primary" id="cp-submit">Create</button>
            <div class="form-group" style="margin:0;grid-column:1 / span 6;"><label class="form-label">Note (optional)</label><input class="input" id="cp-note" placeholder="Who this is for" maxlength="200" /></div>
          </form>
        </div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">Coupons</div></div>
        <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table">
          <thead><tr><th>Code</th><th>Off</th><th>Applies</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">No coupons yet</td></tr>'}</tbody>
        </table></div></div></div>`;
  }

  function renderOrders() {
    const rows = overview.recentOrders.map(o => `
      <tr>
        <td>${esc(fmtDate(o.paidAt || o.createdAt))}</td>
        <td><div style="font-weight:600;">${esc(o.orgName)}</div><div style="font-size:11px;color:var(--color-text-tertiary);">${esc(o.orgId)}</div></td>
        <td>${esc(o.kind === 'plan' ? `${o.plan} · ${o.seats} seats` : `WhatsApp add-on · ${o.months} mo`)}</td>
        <td>${inr(o.amount)}${o.discount > 0 ? `<div style="font-size:11px;color:var(--sf-success-600);">−${inr(o.discount)} ${esc(o.couponCode || '')}</div>` : ''}</td>
        <td><span class="badge ${o.status === 'paid' ? 'badge-success' : o.status === 'created' ? 'badge-neutral' : 'badge-danger'}">${esc(o.status.toUpperCase())}</span></td>
        <td>${esc(o.provider)}</td>
      </tr>`).join('');
    return `<div class="card"><div class="card-header"><div class="card-title">Recent orders</div></div>
      <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table">
        <thead><tr><th>Date</th><th>Library</th><th>Purchase</th><th>Amount</th><th>Status</th><th>Via</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">No orders yet</td></tr>'}</tbody>
      </table></div></div></div>`;
  }

  function render() {
    if (!overview) return;
    root().innerHTML = tab === 'overview' ? renderOverview() : tab === 'libraries' ? renderLibraries() : tab === 'coupons' ? renderCoupons() : renderOrders();
    attach();
  }

  function openPlanEditor(lib) {
    const p = overview.pricing;
    const perSeat = p.custom.pricePerSeat || (p.custom.pricePerBlock / p.custom.blockSeats);
    const id = `sf_admin_plan_${Date.now()}`;
    window[id] = async (save) => {
      if (!save) { delete window[id]; modal.close(); return; }
      const plan = document.getElementById('ap-plan').value;
      const seats = plan === 'custom' ? Number(document.getElementById('ap-seats').value) : (plan === 'demo' ? Number(document.getElementById('ap-demo-seats').value) : undefined);
      const status = document.getElementById('ap-status').value;
      const note = document.getElementById('ap-note').value;
      try {
        const res = await store.adminCall('set_plan', { orgId: lib.id, plan, seats, status, note });
        libraries = libraries.map(l => l.id === res.library.id ? res.library : l);
        overview = await store.adminCall('overview');
        delete window[id];
        modal.close();
        toast.show(`${res.library.name}: ${res.library.planName}, ${res.library.seatLimit} seats, ${res.library.status}.`, 'success', 6000);
        render();
      } catch (err) { toast.show(err.message, 'error', 7000); }
    };
    modal.open(`Change plan — ${esc(lib.name)}`, `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:13px;color:var(--color-text-secondary);">Now: <strong>${esc(lib.planName)}</strong>, ${lib.seatsUsed} / ${lib.seatLimit} seats, ${esc(lib.status)}. Owner: ${esc(lib.ownerEmail || '—')}</div>
        <div class="form-group" style="margin:0;"><label class="form-label">Plan</label>
          <select class="input" id="ap-plan" onchange="document.getElementById('ap-custom').style.display=this.value==='custom'?'block':'none';document.getElementById('ap-demo').style.display=this.value==='demo'?'block':'none';">
            ${['free', 'basic', 'custom', 'demo'].map(k => `<option value="${k}" ${lib.plan === k ? 'selected' : ''}>${k}</option>`).join('')}
          </select></div>
        <div class="form-group" id="ap-custom" style="margin:0;display:${lib.plan === 'custom' ? 'block' : 'none'};"><label class="form-label">Custom seats (${p.custom.minSeats}–${p.custom.maxSeats})</label>
          <input class="input" id="ap-seats" type="number" min="${p.custom.minSeats}" max="${p.custom.maxSeats}" value="${lib.plan === 'custom' ? lib.seatLimit : p.custom.minSeats}"
            oninput="const n=parseInt(this.value,10); document.getElementById('ap-seats-price').textContent = n>0 ? '₹' + Math.round(n*${perSeat}).toLocaleString('en-IN') : '';" />
          <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px;">List price: <strong id="ap-seats-price">${inr((lib.plan === 'custom' ? lib.seatLimit : p.custom.minSeats) * perSeat)}</strong></div></div>
        <div class="form-group" id="ap-demo" style="margin:0;display:${lib.plan === 'demo' ? 'block' : 'none'};"><label class="form-label">Demo seats</label>
          <input class="input" id="ap-demo-seats" type="number" min="1" max="5000" value="${lib.plan === 'demo' ? lib.seatLimit : p.basic.seats}" /></div>
        <div class="form-group" style="margin:0;"><label class="form-label">Status</label>
          <select class="input" id="ap-status"><option value="active" ${lib.status !== 'suspended' ? 'selected' : ''}>active</option><option value="suspended" ${lib.status === 'suspended' ? 'selected' : ''}>suspended (read-only for the library)</option></select></div>
        <div class="form-group" style="margin:0;"><label class="form-label">Note (e.g. "paid ₹5,000 by UPI on 6 Oct")</label><input class="input" id="ap-note" maxlength="200" /></div>
        <div style="font-size:12px;color:var(--color-text-tertiary);">A paid plan set here is recorded as a manual payment on the library's Billing page.</div>
      </div>`,
      `<button class="btn btn-secondary" onclick="window['${id}'](false)">Cancel</button><button class="btn btn-primary" onclick="window['${id}'](true)">Save</button>`,
      { size: 'sm' });
  }

  function attach() {
    const r = root();
    const search = r.querySelector('#admin-search');
    if (search) {
      let t = null;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(async () => {
          query = search.value.trim();
          try { libraries = (await store.adminCall('libraries', { q: query })).libraries; render(); r.querySelector('#admin-search')?.focus(); }
          catch (err) { toast.show(err.message, 'error'); }
        }, 300);
      });
    }
    r.querySelectorAll('[data-edit-lib]').forEach(b => b.addEventListener('click', () => {
      const lib = libraries.find(l => l.id === b.getAttribute('data-edit-lib'));
      if (lib) openPlanEditor(lib);
    }));
    r.querySelector('#coupon-form')?.addEventListener('submit', async () => {
      if (busy) return;
      busy = true;
      const btn = r.querySelector('#cp-submit'); btn.disabled = true;
      try {
        const body = {
          code: r.querySelector('#cp-code').value, percentOff: Number(r.querySelector('#cp-pct').value),
          appliesTo: r.querySelector('#cp-applies').value, maxUses: r.querySelector('#cp-max').value || null,
          expiresAt: r.querySelector('#cp-exp').value ? `${r.querySelector('#cp-exp').value}T23:59:59+05:30` : null,
          note: r.querySelector('#cp-note').value,
        };
        const res = await store.adminCall('coupon_create', body);
        toast.show(`Coupon ${res.coupon.code} created: ${res.coupon.percentOff}% off.`, 'success');
        overview = await store.adminCall('overview');
        render();
      } catch (err) { toast.show(err.message, 'error', 7000); btn.disabled = false; }
      busy = false;
    });
    r.querySelectorAll('[data-coupon-toggle]').forEach(b => b.addEventListener('click', async () => {
      try {
        await store.adminCall('coupon_set_active', { code: b.getAttribute('data-coupon-toggle'), active: b.getAttribute('data-active') !== '1' });
        overview = await store.adminCall('overview');
        render();
      } catch (err) { toast.show(err.message, 'error'); }
    }));
  }

  setTimeout(() => load(false), 0);
}
