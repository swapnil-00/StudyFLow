// scripts/claim-default-org.js — Migrate ORG-DEFAULT data to a real owner account (SEC-001, SEC-002)
'use strict';
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, withTransaction } = require('../lib/db');
const { hashPassword } = require('../lib/auth');

async function main() {
  const [,, ownerEmail, ownerPassword, ownerName] = process.argv;

  if (!ownerEmail || !ownerPassword) {
    console.log('Usage: node scripts/claim-default-org.js <owner_email> <password> [owner_name]');
    process.exit(1);
  }

  const cleanEmail = ownerEmail.toLowerCase().trim();
  const name = ownerName || 'Library Owner';

  console.log(`Checking for ORG-DEFAULT data...`);

  const orgCheck = await query("SELECT id, name FROM organizations WHERE id = 'ORG-DEFAULT'");
  if (orgCheck.rows.length === 0) {
    console.log('No ORG-DEFAULT organization found in database.');
    process.exit(0);
  }

  await withTransaction(async (client) => {
    // 1. Create or update user
    const existingUser = await client.query('SELECT id, organization_id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    let userId;
    const pwdHash = await hashPassword(ownerPassword);

    if (existingUser.rows.length > 0) {
      if (existingUser.rows[0].organization_id && existingUser.rows[0].organization_id !== 'ORG-DEFAULT') {
        throw new Error(`User with email ${cleanEmail} already belongs to organization ${existingUser.rows[0].organization_id}. Aborting to prevent account takeover.`);
      }
      userId = existingUser.rows[0].id;
      await client.query(
        "UPDATE users SET organization_id = 'ORG-DEFAULT', role = 'owner', password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [pwdHash, userId]
      );
      console.log(`Updated existing user ${cleanEmail} as owner of ORG-DEFAULT.`);
    } else {
      userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      await client.query(
        `INSERT INTO users (id, organization_id, email, password_hash, name, role, avatar_color, token_version)
         VALUES ($1, 'ORG-DEFAULT', $2, $3, $4, 'owner', '#6172f3', 1)`,
        [userId, cleanEmail, pwdHash, name]
      );
      console.log(`Created new owner user ${cleanEmail} for ORG-DEFAULT.`);
    }

    // 2. Mark organization onboarding completed
    await client.query(
      "UPDATE organizations SET onboarding_completed = true, email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 'ORG-DEFAULT'",
      [cleanEmail]
    );

    console.log(`✅ ORG-DEFAULT successfully claimed by ${cleanEmail}!`);
    console.log('You can now log in using these credentials.');
  });

  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
