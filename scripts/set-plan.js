// scripts/set-plan.js — Admin CLI: change a library's plan, seats, status, or record a
// manual payment for the automatic WhatsApp add-on (UPI / bank transfer).
//
// Every change goes through lib/subscription.js, the same code the Cashfree webhook uses,
// so a payment recorded here behaves exactly like one made online. Dry run by default.
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, withTransaction } = require('../lib/db');
const { PRICING, PLANS, validateCustomSeats, quoteAutoNotify, quotePlan, formatINR } = require('../lib/plans');
const subscription = require('../lib/subscription');
const billing = require('../lib/billing');

const ALLOWED_STATUSES = ['active', 'suspended'];

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function usage() {
  console.log(`
Usage: node scripts/set-plan.js <orgId_or_slug> [options]

Plan & seats
  --plan <free|basic|custom|demo>   Set the plan (custom needs --seats; blocks of ${PRICING.CUSTOM_SEAT_STEP}, ${PRICING.CUSTOM_MIN_SEATS}-${PRICING.CUSTOM_MAX_SEATS})
  --seats <number>                  Seat capacity for custom / demo plans
  --status <active|suspended>       Suspended libraries can read but not change data

Automatic WhatsApp notifications add-on (manual payment)
  --auto-months <1|3|6|12>          Record a paid period: extends the paid-through date, switches to automatic
  --auto-cancel                     Cancel the add-on (reminders become manual immediately)
  --whatsapp <manual|automatic>     Change the mode without a payment (automatic needs an active add-on)

  --apply                           Execute (default is a dry run)

Examples
  node scripts/set-plan.js ORG-ABC123 --plan basic --apply
  node scripts/set-plan.js ORG-ABC123 --plan custom --seats 300 --apply
  node scripts/set-plan.js ORG-ABC123 --auto-months 3 --apply        # customer paid ${formatINR(PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY * PRICING.BASE_SEATS * 3)} for 100 seats × 3 months by UPI
  node scripts/set-plan.js ORG-ABC123 --status suspended --apply
`);
}

function parseArgs(argv) {
  const args = { orgIdentifier: '', plan: null, status: null, seats: null, autoMonths: null, autoCancel: false, whatsapp: null, apply: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--auto-cancel') args.autoCancel = true;
    else if (arg === '--org' && argv[i + 1]) args.orgIdentifier = argv[++i].trim();
    else if (arg === '--plan' && argv[i + 1]) args.plan = argv[++i].trim().toLowerCase();
    else if (arg === '--status' && argv[i + 1]) args.status = argv[++i].trim().toLowerCase();
    else if (arg === '--seats' && argv[i + 1]) args.seats = parseInt(argv[++i], 10);
    else if (arg === '--auto-months' && argv[i + 1]) args.autoMonths = parseInt(argv[++i], 10);
    else if (arg === '--whatsapp' && argv[i + 1]) args.whatsapp = argv[++i].trim().toLowerCase();
    else if (!arg.startsWith('--') && !args.orgIdentifier) args.orgIdentifier = arg.trim();
  }
  return args;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in environment / .env file.');
    process.exit(1);
  }
  const args = parseArgs(process.argv);
  const hasChange = args.plan || args.status || args.seats != null || args.autoMonths != null || args.autoCancel || args.whatsapp;
  if (!args.orgIdentifier || !hasChange) { usage(); process.exit(1); }

  if (args.plan && !PLANS[args.plan]) {
    console.error(`❌ Invalid plan "${args.plan}". Allowed: ${Object.keys(PLANS).join(', ')}`);
    process.exit(1);
  }
  if (args.status && !ALLOWED_STATUSES.includes(args.status)) {
    console.error(`❌ Invalid status "${args.status}". Allowed: ${ALLOWED_STATUSES.join(', ')}`);
    process.exit(1);
  }
  if (args.autoMonths != null && !PRICING.AUTO_NOTIFY_PREPAY_MONTHS.includes(args.autoMonths)) {
    console.error(`❌ --auto-months must be one of ${PRICING.AUTO_NOTIFY_PREPAY_MONTHS.join(', ')}`);
    process.exit(1);
  }
  if (args.whatsapp && !['manual', 'automatic'].includes(args.whatsapp)) {
    console.error('❌ --whatsapp must be manual or automatic');
    process.exit(1);
  }

  const res = await query(
    `SELECT ${subscription.ORG_SUBSCRIPTION_COLUMNS}, slug FROM organizations WHERE id = $1 OR slug = $1`,
    [args.orgIdentifier]
  );
  if (res.rows.length === 0) {
    console.error(`❌ Organization "${args.orgIdentifier}" not found.`);
    process.exit(1);
  }
  const org = res.rows[0];
  const before = subscription.deriveSubscription(org);

  // Work out the target plan / seats
  let targetPlan = args.plan || before.plan;
  let targetSeats = before.seatLimit;
  if (args.plan === 'free') targetSeats = PRICING.FREE_SEAT_LIMIT;
  else if (args.plan === 'basic') targetSeats = PRICING.BASE_SEATS;
  else if (args.plan === 'custom' || (args.seats != null && before.plan === 'custom')) {
    const v = validateCustomSeats(args.seats != null ? args.seats : before.seatLimit);
    if (!v.ok) { console.error(`❌ ${v.error}`); process.exit(1); }
    targetSeats = v.seats;
    targetPlan = 'custom';
  } else if (args.plan === 'demo' || (args.seats != null && before.plan === 'demo')) {
    targetSeats = args.seats != null && args.seats > 0 ? args.seats : PRICING.BASE_SEATS;
    targetPlan = 'demo';
  } else if (args.seats != null) {
    console.error('❌ --seats only applies to custom or demo plans. Use --plan custom --seats N.');
    process.exit(1);
  }
  const targetStatus = args.status || org.subscription_status || 'active';
  const targetIsDemo = targetPlan === 'demo' ? true : (args.plan && args.plan !== 'demo' ? false : Boolean(org.is_demo));

  const autoQuote = args.autoMonths != null ? quoteAutoNotify({ seatLimit: targetSeats, months: args.autoMonths }) : null;
  const planQuote = args.plan && ['basic', 'custom'].includes(args.plan) ? quotePlan({ plan: args.plan, seats: targetSeats }) : null;

  console.log(`\n======================================================`);
  console.log(` StudyFlow Plan Update: ${args.apply ? 'APPLYING CHANGES' : 'DRY RUN (Preview)'}`);
  console.log(`======================================================`);
  console.log(`\n🏢 ${org.name} (${org.id}) [${org.slug}]  owner contact: ${maskEmail(org.email)}`);
  console.log(`\n📊 Changes:`);
  console.log(`  - Plan:         ${before.planName} (${before.seatLimit} seats) -> ${targetPlan.toUpperCase()} (${targetSeats} seats)${planQuote && planQuote.ok ? `   [list price ${formatINR(planQuote.total)}]` : ''}`);
  console.log(`  - Status:       ${org.subscription_status || 'active'} -> ${targetStatus}`);
  console.log(`  - Demo library: ${Boolean(org.is_demo)} -> ${targetIsDemo}`);
  console.log(`  - WhatsApp now: ${before.autoLabel}${before.autoUntilText ? ` (until ${before.autoUntilText})` : ''}`);
  if (autoQuote) {
    if (!autoQuote.ok) { console.error(`❌ ${autoQuote.error}`); process.exit(1); }
    console.log(`  - Add-on:       record ${args.autoMonths} month(s) paid = ${formatINR(autoQuote.total)} (${targetSeats} seats × ${formatINR(PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY)})  -> ACTIVE, automatic`);
  }
  if (args.autoCancel) console.log(`  - Add-on:       CANCEL (reminders become manual now)`);
  if (args.whatsapp) console.log(`  - WhatsApp mode: -> ${args.whatsapp}`);

  if (!args.apply) {
    console.log(`\n💡 Dry run: nothing was written. Re-run with --apply to execute.\n`);
    process.exit(0);
  }

  await withTransaction(async (client) => {
    const exec = (sql, params) => client.query(sql, params);
    await exec(
      `UPDATE organizations
       SET plan = $1, seat_limit = $2, subscription_status = $3, is_demo = $4,
           plan_paid_at = CASE WHEN $1 IN ('basic', 'custom') AND plan_paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE plan_paid_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [targetPlan, targetSeats, targetStatus, targetIsDemo, org.id]
    );
    if (planQuote && planQuote.ok) {
      const order = await billing.createOrderRecord({ orgId: org.id, userId: null, kind: billing.ORDER_KIND.PLAN, plan: targetPlan, seats: targetSeats, quote: planQuote, provider: 'manual', metadata: { recordedBy: 'scripts/set-plan.js' } }, exec);
      await exec(`UPDATE billing_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, applied_at = CURRENT_TIMESTAMP WHERE id = $1`, [order.id]);
    }
    if (autoQuote) {
      const order = await billing.createOrderRecord({ orgId: org.id, userId: null, kind: billing.ORDER_KIND.AUTO_NOTIFY, seats: targetSeats, months: args.autoMonths, quote: autoQuote, provider: 'manual', metadata: { recordedBy: 'scripts/set-plan.js' } }, exec);
      await billing.finalizeOrder(order.id, { source: 'manual' }, exec);
    }
    if (args.autoCancel) await subscription.cancelAutoNotify(org.id, exec);
    if (args.whatsapp) await subscription.setWhatsappMode(org.id, args.whatsapp, exec);
  });

  const after = await subscription.loadSubscription(org.id);
  console.log(`\n✅ Updated ${org.name} (${org.id})`);
  console.log(`   Plan: ${after.planName}, Seats: ${after.seatLimit}, Status: ${after.suspended ? 'suspended' : 'active'}`);
  console.log(`   WhatsApp: ${after.autoLabel}${after.autoUntilText ? ` (until ${after.autoUntilText})` : ''}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
