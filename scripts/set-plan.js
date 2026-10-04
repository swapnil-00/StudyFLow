// scripts/set-plan.js — Server-only Admin CLI script to change tenant plans & subscription status (Part D2)
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../lib/db');

const ALLOWED_PLANS = {
  starter: { name: 'Starter', seatLimit: 100 },
  growth: { name: 'Growth', seatLimit: 250 },
  enterprise: { name: 'Enterprise', seatLimit: 1000 },
  demo: { name: 'Demo', seatLimit: 100 }
};

const ALLOWED_STATUSES = ['active', 'suspended'];

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function parseArgs(argv) {
  const args = {
    orgIdentifier: '',
    plan: null,
    status: null,
    seats: null,
    apply: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--org' && argv[i + 1]) {
      args.orgIdentifier = argv[++i].trim();
    } else if (arg === '--plan' && argv[i + 1]) {
      args.plan = argv[++i].trim().toLowerCase();
    } else if (arg === '--status' && argv[i + 1]) {
      args.status = argv[++i].trim().toLowerCase();
    } else if (arg === '--seats' && argv[i + 1]) {
      args.seats = parseInt(argv[++i], 10);
    } else if (!arg.startsWith('--') && !args.orgIdentifier) {
      args.orgIdentifier = arg.trim();
    } else if (!arg.startsWith('--') && !args.plan) {
      args.plan = arg.trim().toLowerCase();
    }
  }
  return args;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in environment / .env file.');
    process.exit(1);
  }

  const args = parseArgs(process.argv);

  if (!args.orgIdentifier || (!args.plan && !args.status && args.seats == null)) {
    console.log(`
Usage: node scripts/set-plan.js <orgId_or_slug> [options]

Options:
  --plan <string>     starter | growth | enterprise | demo
  --status <string>   active | suspended
  --seats <number>    Override seat capacity limit
  --apply             Execute changes (default is dry-run)

Examples:
  node scripts/set-plan.js ORG-12345678 --plan growth --apply
  node scripts/set-plan.js ORG-12345678 --status suspended --apply
  node scripts/set-plan.js ORG-12345678 --plan enterprise --seats 1500 --apply
`);
    process.exit(1);
  }

  if (args.plan && !ALLOWED_PLANS[args.plan]) {
    console.error(`❌ Invalid plan "${args.plan}". Allowed plans: ${Object.keys(ALLOWED_PLANS).join(', ')}`);
    process.exit(1);
  }

  if (args.status && !ALLOWED_STATUSES.includes(args.status)) {
    console.error(`❌ Invalid status "${args.status}". Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const res = await query(
    `SELECT id, name, slug, email, plan, seat_limit, subscription_status, is_demo 
     FROM organizations 
     WHERE id = $1 OR slug = $1`,
    [args.orgIdentifier]
  );

  if (res.rows.length === 0) {
    console.error(`❌ Organization "${args.orgIdentifier}" not found.`);
    process.exit(1);
  }

  const org = res.rows[0];

  const targetPlan = args.plan || org.plan;
  const planConfig = ALLOWED_PLANS[targetPlan] || { name: targetPlan, seatLimit: org.seat_limit };
  const targetSeats = args.seats && !isNaN(args.seats) && args.seats > 0
    ? args.seats
    : (args.plan ? planConfig.seatLimit : org.seat_limit);
  const targetStatus = args.status || org.subscription_status || 'active';
  const targetIsDemo = targetPlan === 'demo' ? true : org.is_demo;

  console.log(`\n======================================================`);
  console.log(` StudyFlow Plan/Status Update: ${args.apply ? 'APPLYING CHANGES' : 'DRY RUN (Preview)'}`);
  console.log(`======================================================`);
  console.log(`\n🏢 Organization: ${org.name} (${org.id}) [Slug: ${org.slug}]`);
  console.log(`  - Contact Email: ${maskEmail(org.email)}`);
  console.log(`\n📊 Changes:`);
  console.log(`  - Plan:                ${org.plan} -> ${targetPlan.toUpperCase()}`);
  console.log(`  - Seat Limit:          ${org.seat_limit} -> ${targetSeats}`);
  console.log(`  - Subscription Status: ${org.subscription_status} -> ${targetStatus.toUpperCase()}`);
  console.log(`  - Is Demo:             ${org.is_demo} -> ${targetIsDemo}`);

  if (!args.apply) {
    console.log(`\n💡 This was a DRY RUN. No changes were written to the database.`);
    console.log(`👉 To apply these changes, re-run with --apply:`);
    console.log(`   node scripts/set-plan.js ${org.id} ${args.plan ? `--plan ${args.plan} ` : ''}${args.status ? `--status ${args.status} ` : ''}${args.seats ? `--seats ${args.seats} ` : ''}--apply\n`);
    process.exit(0);
  }

  await query(
    `UPDATE organizations 
     SET plan = $1, seat_limit = $2, subscription_status = $3, is_demo = $4, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $5`,
    [targetPlan, targetSeats, targetStatus, targetIsDemo, org.id]
  );

  console.log(`\n✅ Successfully updated ${org.name} (${org.id})!`);
  console.log(`   Plan: ${targetPlan.toUpperCase()}, Seats: ${targetSeats}, Status: ${targetStatus.toUpperCase()}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
