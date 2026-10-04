// scripts/set-demo.js — Server-only Admin CLI script to lock and configure the demo library (Part D3)
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, withTransaction } = require('../lib/db');

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function parseArgs(argv) {
  const args = {
    ownerEmail: '',
    removeOtherMembers: false,
    apply: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--remove-other-members') {
      args.removeOtherMembers = true;
    } else if (arg === '--owner-email' && argv[i + 1]) {
      args.ownerEmail = argv[++i].trim().toLowerCase();
    } else if (!arg.startsWith('--') && !args.ownerEmail) {
      args.ownerEmail = arg.trim().toLowerCase();
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
  const ownerEmail = args.ownerEmail || 'srchaudhari324@gmail.com';

  console.log(`\n======================================================`);
  console.log(` StudyFlow Demo Library Configuration: ${args.apply ? 'APPLYING CHANGES' : 'DRY RUN (Preview)'}`);
  console.log(`======================================================`);

  // Find organization owned by ownerEmail
  const orgRes = await query(
    `SELECT o.id, o.name, o.slug, o.plan, o.seat_limit, o.subscription_status, o.is_demo, u.id AS owner_user_id, u.email AS owner_email
     FROM organizations o
     JOIN org_members om ON om.organization_id = o.id
     JOIN users u ON u.id = om.user_id
     WHERE LOWER(u.email) = $1 AND om.role = 'owner' AND om.status = 'active'
     ORDER BY o.created_at ASC`,
    [ownerEmail]
  );

  if (orgRes.rows.length === 0) {
    console.error(`❌ No active library found owned by ${maskEmail(ownerEmail)}.`);
    console.error(`   Run create-library.js first to create the demo library.`);
    process.exit(1);
  }

  const org = orgRes.rows[0];

  // Check other members
  const membersRes = await query(
    `SELECT u.id, u.email, u.name, om.role, om.status
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1 AND u.id != $2 AND om.status = 'active'`,
    [org.id, org.owner_user_id]
  );

  // Check pending invitations
  const invitesRes = await query(
    `SELECT id, email, role, created_at, expires_at
     FROM invitations
     WHERE organization_id = $1 AND revoked_at IS NULL AND accepted_at IS NULL`,
    [org.id]
  );

  console.log(`\n🏢 Demo Organization Found:`);
  console.log(`  - Organization ID:   ${org.id}`);
  console.log(`  - Name:              ${org.name}`);
  console.log(`  - Slug:              ${org.slug}`);
  console.log(`  - Owner:             ${maskEmail(org.owner_email)} (User ID: ${org.owner_user_id})`);
  console.log(`  - Current Plan:      ${org.plan} -> DEMO`);
  console.log(`  - Current is_demo:   ${org.is_demo} -> TRUE`);
  console.log(`  - Pending Invites:   ${invitesRes.rows.length} (will be revoked)`);
  console.log(`  - Other Active Members: ${membersRes.rows.length}`);

  if (membersRes.rows.length > 0) {
    console.log(`\n⚠️ Other active members in this demo library:`);
    membersRes.rows.forEach(m => {
      console.log(`   - ${maskEmail(m.email)} (${m.name}) · Role: ${m.role}`);
    });
    if (!args.removeOtherMembers) {
      console.log(`   ℹ️ Note: These members will remain unless you pass --remove-other-members to deactivate them.`);
    } else {
      console.log(`   🚨 --remove-other-members is set: these memberships will be set to 'inactive'.`);
    }
  }

  if (!args.apply) {
    console.log(`\n💡 This was a DRY RUN. No changes were made.`);
    console.log(`👉 To apply these changes, re-run with --apply:`);
    console.log(`   node scripts/set-demo.js --owner-email ${ownerEmail} --apply\n`);
    if (membersRes.rows.length > 0) {
      console.log(`   (Add --remove-other-members only if you also want to deactivate the members listed above.)\n`);
    }
    process.exit(0);
  }

  await withTransaction(async (client) => {
    // 1. Mark demo library
    await client.query(
      `UPDATE organizations 
       SET is_demo = TRUE, plan = 'demo', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [org.id]
    );

    // 2. Revoke any pending invites
    if (invitesRes.rows.length > 0) {
      await client.query(
        `UPDATE invitations 
         SET revoked_at = CURRENT_TIMESTAMP 
         WHERE organization_id = $1 AND revoked_at IS NULL AND accepted_at IS NULL`,
        [org.id]
      );
    }

    // 3. Deactivate other members if requested
    if (args.removeOtherMembers && membersRes.rows.length > 0) {
      await client.query(
        `UPDATE org_members 
         SET status = 'inactive' 
         WHERE organization_id = $1 AND user_id != $2`,
        [org.id, org.owner_user_id]
      );
    }
  });

  console.log(`\n✅ Successfully configured demo library "${org.name}" (${org.id})!`);
  console.log(`   - is_demo: TRUE`);
  console.log(`   - plan: demo`);
  console.log(`   - Revoked ${invitesRes.rows.length} pending invitations.`);
  if (args.removeOtherMembers && membersRes.rows.length > 0) {
    console.log(`   - Deactivated ${membersRes.rows.length} non-owner members.`);
  }
  console.log(`   - Invitations and stranger access are now strictly DEMO_LOCKED.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
