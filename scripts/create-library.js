// scripts/create-library.js — Server-only Admin CLI script to provision a customer or demo library (Part D1)
'use strict';

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, withTransaction } = require('../lib/db');

const { PRICING, validateCustomSeats } = require('../lib/plans');

// Seat capacity per plan (lib/plans.js). Custom needs --seats (any whole number in the allowed range).
const PLAN_SEAT_DEFAULTS = {
  free: PRICING.FREE_SEAT_LIMIT,
  basic: PRICING.BASE_SEATS,
  custom: null,
  demo: PRICING.BASE_SEATS
};

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function parseArgs(argv) {
  const args = {
    name: '',
    ownerEmail: '',
    ownerName: '',
    plan: 'free',
    seats: null,
    city: '',
    apply: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--name' && argv[i + 1]) {
      args.name = argv[++i].trim();
    } else if (arg === '--owner-email' && argv[i + 1]) {
      args.ownerEmail = argv[++i].trim().toLowerCase();
    } else if (arg === '--owner-name' && argv[i + 1]) {
      args.ownerName = argv[++i].trim();
    } else if (arg === '--plan' && argv[i + 1]) {
      args.plan = argv[++i].trim().toLowerCase();
    } else if (arg === '--seats' && argv[i + 1]) {
      args.seats = parseInt(argv[++i], 10);
    } else if (arg === '--city' && argv[i + 1]) {
      args.city = argv[++i].trim();
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

  // The is_demo column is added by the app itself (lib/db-init.js) the first time the new
  // version runs. Check for it read-only, so running this before deploying fails clearly.
  const col = await query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_demo'"
  );
  if (col.rows.length === 0) {
    console.error("❌ The database schema is not up to date yet (organizations.is_demo is missing).");
    console.error("   Deploy the latest version and open the site once, then run this script again.");
    process.exit(1);
  }

  if (!args.name || !args.ownerEmail) {
    console.log(`
Usage: node scripts/create-library.js --name "<Library Name>" --owner-email <email> [options]

Options:
  --name <string>         Library / reading hall name (required)
  --owner-email <string>  Owner's Google email (required)
  --owner-name <string>   Owner's display name (optional)
  --plan <string>         free | basic | custom | demo (default: free). custom needs --seats
  --seats <number>        Seat capacity limit (default: based on plan)
  --city <string>         City / Location (optional)
  --apply                 Execute changes (default is dry-run)
`);
    process.exit(1);
  }

  if (!PLAN_SEAT_DEFAULTS.hasOwnProperty(args.plan)) {
    console.error(`❌ Invalid plan "${args.plan}". Allowed plans: ${Object.keys(PLAN_SEAT_DEFAULTS).join(', ')}`);
    process.exit(1);
  }

  let seatLimit;
  if (args.plan === 'custom') {
    const v = validateCustomSeats(args.seats);
    if (!v.ok) { console.error(`❌ ${v.error}`); process.exit(1); }
    seatLimit = v.seats;
  } else if (args.plan === 'demo' && args.seats && !isNaN(args.seats) && args.seats > 0) {
    seatLimit = args.seats;
  } else {
    // Free and Basic are fixed by lib/plans.js; --seats is ignored for them
    seatLimit = PLAN_SEAT_DEFAULTS[args.plan];
  }

  const isDemo = args.plan === 'demo';
  const ownerName = args.ownerName || args.name + ' Owner';

  console.log(`\n======================================================`);
  console.log(` StudyFlow Library Provisioning: ${args.apply ? 'APPLYING CHANGES' : 'DRY RUN (Preview)'}`);
  console.log(`======================================================`);

  // Check 1-email-1-library rule
  const existingOwnership = await query(
    `SELECT om.organization_id, o.name, o.subscription_status
     FROM org_members om
     JOIN organizations o ON o.id = om.organization_id
     JOIN users u ON u.id = om.user_id
     WHERE LOWER(u.email) = $1 AND om.role = 'owner' AND om.status = 'active'`,
    [args.ownerEmail]
  );

  if (existingOwnership.rows.length > 0) {
    const owned = existingOwnership.rows[0];
    console.error(`❌ Refused: Owner ${maskEmail(args.ownerEmail)} already owns active library "${owned.name}" (${owned.organization_id}).`);
    process.exit(1);
  }

  // Check existing user
  const userCheck = await query('SELECT id, name, status, firebase_uid FROM users WHERE LOWER(email) = $1', [args.ownerEmail]);
  const userExists = userCheck.rows.length > 0;
  const existingUser = userExists ? userCheck.rows[0] : null;

  const orgId = `ORG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const userId = existingUser ? existingUser.id : `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const baseSlug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug || 'library'}-${orgId.slice(-4).toLowerCase()}`;

  console.log(`\n📋 Provisioning Summary:`);
  console.log(`  - Organization ID:   ${orgId}`);
  console.log(`  - Organization Name: ${args.name}`);
  console.log(`  - Slug:              ${slug}`);
  console.log(`  - Plan:              ${args.plan.toUpperCase()}`);
  console.log(`  - Seat Limit:        ${seatLimit}`);
  console.log(`  - Is Demo Library:   ${isDemo}`);
  console.log(`  - City / Location:   ${args.city || '(None specified)'}`);
  console.log(`  - Owner Email:       ${maskEmail(args.ownerEmail)}`);
  console.log(`  - Owner Name:        ${ownerName}`);
  console.log(`  - Owner User ID:     ${userId} (${userExists ? 'Existing user account' : 'New user account to be created'})`);

  if (!args.apply) {
    console.log(`\n💡 This was a DRY RUN. No data was written to the database.`);
    console.log(`👉 To apply these changes, re-run with --apply:`);
    console.log(`   node scripts/create-library.js --name "${args.name}" --owner-email ${args.ownerEmail} --owner-name "${ownerName}" --plan ${args.plan} --seats ${seatLimit} ${args.city ? `--city "${args.city}" ` : ''}--apply\n`);
    process.exit(0);
  }

  await withTransaction(async (client) => {
    // 1. Create or ensure user
    if (!userExists) {
      await client.query(
        `INSERT INTO users (id, organization_id, name, email, role, status, avatar_color, token_version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'owner', 'active', '#6172f3', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, orgId, ownerName, args.ownerEmail]
      );
    } else {
      // Link primary org if empty
      await client.query(
        `UPDATE users SET organization_id = COALESCE(organization_id, $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [orgId, userId]
      );
    }

    // 2. Create organization
    await client.query(
      `INSERT INTO organizations (
         id, name, slug, email, address, plan, seat_limit,
         subscription_status, onboarding_completed, is_demo, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         'active', FALSE, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      [orgId, args.name, slug, args.ownerEmail, args.city || null, args.plan, seatLimit, isDemo]
    );

    // 3. Create org_members row
    await client.query(
      `INSERT INTO org_members (user_id, organization_id, role, status, created_at)
       VALUES ($1, $2, 'owner', 'active', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active'`,
      [userId, orgId]
    );

    // 4. Create settings row. Same columns and id convention (id = orgId) as the former
    // create_library action, so it works on every schema version in use.
    const defaultSettings = {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      orgName: args.name,
      city: args.city || '',
      theme: 'light',
    };
    await client.query(
      `INSERT INTO settings (id, organization_id, currency, timezone, org_name, email, phone, data)
       VALUES ($1, $2, 'INR', 'Asia/Kolkata', $3, $4, '', $5)
       ON CONFLICT (id) DO NOTHING`,
      [orgId, orgId, args.name, args.ownerEmail, JSON.stringify(defaultSettings)]
    );
  });

  console.log(`\n✅ Successfully created library "${args.name}" (${orgId}) for ${maskEmail(args.ownerEmail)}.`);
  console.log(`\n👉 Next steps:`);
  console.log(`   Ask the owner to open the StudyFlow site, click "Continue with Google" with ${maskEmail(args.ownerEmail)}, and complete the setup wizard (branch, hall, seats).\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
