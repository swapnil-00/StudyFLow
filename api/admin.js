// api/admin.js — Developer Lab: platform-wide console for the platform owner only
//
// Every action requires a signed-in session whose email is on the platform-admin list
// (lib/platform-admin.js). Plan changes go through lib/subscription.js like every other
// change and are recorded as manual billing orders, so the customer's Billing page shows them.
'use strict';
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');
const { checkRateLimit } = require('../lib/ratelimit');
const { audit } = require('../lib/audit');
const { requirePlatformAdmin } = require('../lib/platform-admin');
const plans = require('../lib/plans');
const subscription = require('../lib/subscription');
const billing = require('../lib/billing');
const coupons = require('../lib/coupons');

const ALLOWED_STATUSES = ['active', 'suspended'];
const clientExec = (client) => (sql, params) => client.query(sql, params);

function mapLibrary(r) {
  const sub = subscription.deriveSubscription(r);
  return {
    id: r.id, name: r.name, slug: r.slug, createdAt: r.created_at, onboardingCompleted: r.onboarding_completed !== false,
    plan: sub.plan, planName: sub.planName, paid: sub.paid, isDemo: sub.isDemo, seatLimit: sub.seatLimit,
    seatsUsed: Number(r.seats_used || 0), students: Number(r.students || 0),
    status: r.subscription_status || 'active', planPaidAt: r.plan_paid_at,
    whatsapp: sub.autoLabel, whatsappMode: sub.whatsappMode, autoUntil: sub.autoUntil,
    ownerEmail: r.owner_email || null, ownerName: r.owner_name || null, ownerLastLogin: r.owner_last_login || null,
    revenue: Number(r.revenue || 0),
  };
}

const LIBRARY_SELECT = `
  SELECT o.id, o.name, o.slug, o.plan, o.seat_limit, o.subscription_status, o.is_demo, o.created_at, o.plan_paid_at,
         o.onboarding_completed, o.whatsapp_mode, o.whatsapp_auto_status, o.whatsapp_auto_until,
         (SELECT COUNT(*)::int FROM seats s WHERE s.organization_id = o.id) AS seats_used,
         (SELECT COUNT(*)::int FROM students st WHERE st.organization_id = o.id AND st.deleted_at IS NULL) AS students,
         (SELECT u.email FROM org_members om JOIN users u ON u.id = om.user_id
            WHERE om.organization_id = o.id AND om.role = 'owner' AND om.status = 'active' ORDER BY om.created_at ASC LIMIT 1) AS owner_email,
         (SELECT u.name FROM org_members om JOIN users u ON u.id = om.user_id
            WHERE om.organization_id = o.id AND om.role = 'owner' AND om.status = 'active' ORDER BY om.created_at ASC LIMIT 1) AS owner_name,
         (SELECT u.last_login_at FROM org_members om JOIN users u ON u.id = om.user_id
            WHERE om.organization_id = o.id AND om.role = 'owner' AND om.status = 'active' ORDER BY om.created_at ASC LIMIT 1) AS owner_last_login,
         (SELECT COALESCE(SUM(b.amount), 0) FROM billing_orders b WHERE b.organization_id = o.id AND b.status = 'paid') AS revenue
  FROM organizations o`;

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();
  const session = req.session;
  requirePlatformAdmin(session);
  await checkRateLimit(query, `admin:${session.userId}`, 120, 60, { failClosed: true });

  const action = req.body?.action || req.query?.action || 'overview';
  // Audit entries are platform-level, not tied to the admin's own library
  const auditSession = { userId: session.userId, orgId: 'PLATFORM', role: 'platform_admin' };

  if (action === 'overview') {
    const [byPlan, totals, revenue, recentOrders, couponList] = await Promise.all([
      query(`SELECT plan, COUNT(*)::int AS n FROM organizations GROUP BY plan`, []),
      query(`SELECT (SELECT COUNT(*)::int FROM organizations) AS libraries,
                    (SELECT COUNT(*)::int FROM organizations WHERE COALESCE(subscription_status,'active') = 'suspended') AS suspended,
                    (SELECT COUNT(*)::int FROM seats) AS seats,
                    (SELECT COUNT(*)::int FROM students WHERE deleted_at IS NULL) AS students,
                    (SELECT COUNT(*)::int FROM users) AS users,
                    (SELECT COUNT(*)::int FROM organizations WHERE whatsapp_auto_status = 'active' AND whatsapp_auto_until > CURRENT_TIMESTAMP) AS auto_active`, []),
      query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS orders,
                    COALESCE(SUM(CASE WHEN paid_at >= date_trunc('month', CURRENT_TIMESTAMP) THEN amount ELSE 0 END), 0) AS this_month
             FROM billing_orders WHERE status = 'paid'`, []),
      query(`SELECT b.id, b.organization_id, o.name AS org_name, b.kind, b.plan, b.seats, b.months, b.amount, b.discount, b.coupon_code,
                    b.status, b.provider, b.paid_at, b.created_at
             FROM billing_orders b JOIN organizations o ON o.id = b.organization_id
             ORDER BY b.created_at DESC LIMIT 25`, []),
      coupons.listCoupons(),
    ]);
    const planCounts = {};
    for (const r of byPlan.rows) planCounts[plans.normalizePlanKey(r.plan)] = (planCounts[plans.normalizePlanKey(r.plan)] || 0) + Number(r.n);
    const t = totals.rows[0] || {};
    const rv = revenue.rows[0] || {};
    return res.json({
      ok: true,
      totals: {
        libraries: Number(t.libraries || 0), suspended: Number(t.suspended || 0), seats: Number(t.seats || 0),
        students: Number(t.students || 0), users: Number(t.users || 0), autoNotifyActive: Number(t.auto_active || 0),
        free: planCounts.free || 0, basic: planCounts.basic || 0, custom: planCounts.custom || 0, demo: planCounts.demo || 0,
      },
      revenue: { total: Number(rv.total || 0), thisMonth: Number(rv.this_month || 0), paidOrders: Number(rv.orders || 0) },
      recentOrders: recentOrders.rows.map(r => ({
        id: r.id, orgId: r.organization_id, orgName: r.org_name, kind: r.kind, plan: r.plan, seats: r.seats, months: r.months,
        amount: Number(r.amount), discount: Number(r.discount || 0), couponCode: r.coupon_code, status: r.status, provider: r.provider,
        paidAt: r.paid_at, createdAt: r.created_at,
      })),
      coupons: couponList,
      pricing: plans.publicPricing(),
      features: plans.featureFlags(),
    });
  }

  if (action === 'libraries') {
    const q = String(req.body?.q || '').trim().toLowerCase().slice(0, 80);
    const rows = q
      ? await query(`${LIBRARY_SELECT} WHERE LOWER(o.name) LIKE $1 OR LOWER(o.id) LIKE $1 OR LOWER(o.slug) LIKE $1
                     OR o.id IN (SELECT om.organization_id FROM org_members om JOIN users u ON u.id = om.user_id WHERE LOWER(u.email) LIKE $1)
                     ORDER BY o.created_at DESC LIMIT 200`, [`%${q}%`])
      : await query(`${LIBRARY_SELECT} ORDER BY o.created_at DESC LIMIT 200`, []);
    return res.json({ ok: true, libraries: rows.rows.map(mapLibrary) });
  }

  if (action === 'library') {
    const orgId = String(req.body?.orgId || '');
    const rows = await query(`${LIBRARY_SELECT} WHERE o.id = $1`, [orgId]);
    if (rows.rows.length === 0) throw new HttpError(404, 'ORG_NOT_FOUND', 'Library not found.');
    const orders = await billing.listOrders(orgId, { limit: 50 });
    return res.json({ ok: true, library: mapLibrary(rows.rows[0]), orders });
  }

  // ── Change plan / seats / status (same rules as scripts/set-plan.js) ────────
  if (action === 'set_plan') {
    const { orgId, plan, seats, status, note } = req.body || {};
    if (!orgId) throw new HttpError(400, 'MISSING_FIELDS', 'orgId is required.');
    const org = await subscription.loadOrg(String(orgId));
    const before = subscription.deriveSubscription(org);

    let targetPlan = plan ? plans.normalizePlanKey(plan) : before.plan;
    if (plan && !plans.PLANS[String(plan).toLowerCase()]) throw new HttpError(400, 'INVALID_PLAN', `Plan must be one of ${Object.keys(plans.PLANS).join(', ')}.`);
    let targetSeats = before.seatLimit;
    if (targetPlan === 'free') targetSeats = plans.PRICING.FREE_SEAT_LIMIT;
    else if (targetPlan === 'basic') targetSeats = plans.PRICING.BASE_SEATS;
    else if (targetPlan === 'custom') {
      const v = plans.validateCustomSeats(seats != null && seats !== '' ? seats : before.seatLimit);
      if (!v.ok) throw new HttpError(400, 'INVALID_SEATS', v.error);
      targetSeats = v.seats;
    } else if (targetPlan === 'demo') {
      targetSeats = seats != null && Number(seats) > 0 ? Number(seats) : before.seatLimit || plans.PRICING.BASE_SEATS;
    }
    const targetStatus = status ? String(status).toLowerCase() : (org.subscription_status || 'active');
    if (!ALLOWED_STATUSES.includes(targetStatus)) throw new HttpError(400, 'INVALID_STATUS', 'status must be active or suspended.');
    const targetIsDemo = targetPlan === 'demo';
    const planQuote = ['basic', 'custom'].includes(targetPlan) && (targetPlan !== before.plan || targetSeats !== before.seatLimit)
      ? plans.quotePlan({ plan: targetPlan, seats: targetSeats }) : null;

    await withTransaction(async (client) => {
      const exec = clientExec(client);
      await exec(
        `UPDATE organizations
         SET plan = $1, seat_limit = $2, subscription_status = $3, is_demo = $4,
             plan_paid_at = CASE WHEN $1 IN ('basic', 'custom') AND plan_paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE plan_paid_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [targetPlan, targetSeats, targetStatus, targetIsDemo, org.id]
      );
      if (planQuote && planQuote.ok) {
        const order = await billing.createOrderRecord({
          orgId: org.id, userId: session.userId, kind: billing.ORDER_KIND.PLAN, plan: targetPlan, seats: targetSeats,
          quote: planQuote, provider: 'manual', metadata: { recordedBy: 'developer-lab', note: String(note || '').slice(0, 200) },
        }, exec);
        await exec(`UPDATE billing_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, applied_at = CURRENT_TIMESTAMP WHERE id = $1`, [order.id]);
      }
      await audit(client, auditSession, 'platform.set_plan', 'organizations', org.id, {
        from: { plan: before.plan, seats: before.seatLimit, status: org.subscription_status }, to: { plan: targetPlan, seats: targetSeats, status: targetStatus }, note: String(note || '').slice(0, 200),
      });
    });
    const rows = await query(`${LIBRARY_SELECT} WHERE o.id = $1`, [org.id]);
    return res.json({ ok: true, library: mapLibrary(rows.rows[0]) });
  }

  // ── Coupons ────────────────────────────────────────────────────────────────
  if (action === 'coupons') {
    return res.json({ ok: true, coupons: await coupons.listCoupons() });
  }
  if (action === 'coupon_create') {
    const { code, percentOff, appliesTo, maxUses, expiresAt, note } = req.body || {};
    const coupon = await withTransaction(async (client) => {
      const created = await coupons.createCoupon({ code, percentOff, appliesTo: appliesTo || 'any', maxUses, expiresAt, note, createdBy: session.userId }, clientExec(client));
      await audit(client, auditSession, 'platform.coupon_create', 'coupons', created.code, { percentOff: created.percentOff, appliesTo: created.appliesTo, maxUses: created.maxUses, expiresAt: created.expiresAt });
      return created;
    });
    return res.json({ ok: true, coupon });
  }
  if (action === 'coupon_set_active') {
    const { code, active } = req.body || {};
    const coupon = await withTransaction(async (client) => {
      const updated = await coupons.setCouponActive(code, active, clientExec(client));
      await audit(client, auditSession, active ? 'platform.coupon_enable' : 'platform.coupon_disable', 'coupons', updated.code, {});
      return updated;
    });
    return res.json({ ok: true, coupon });
  }

  throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown admin action');
}, { methods: ['GET', 'POST'], auth: true, rejectOrgId: false });
