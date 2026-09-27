// scripts/set-plan.js — Server-only Admin CLI script to change tenant plans (SEC-011)
'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../lib/db');

const ALLOWED_PLANS = {
  starter: { name: 'Starter', seatLimit: 50 },
  growth: { name: 'Growth', seatLimit: 150 },
  enterprise: { name: 'Enterprise', seatLimit: 500 },
  trial: { name: 'Trial', seatLimit: 75 }
};

async function main() {
  const [,, orgIdentifier, newPlan] = process.argv;

  if (!orgIdentifier || !newPlan) {
    console.log('Usage: node scripts/set-plan.js <orgId_or_slug> <plan>');
    console.log('Available plans:', Object.keys(ALLOWED_PLANS).join(', '));
    process.exit(1);
  }

  const planKey = newPlan.toLowerCase();
  const planConfig = ALLOWED_PLANS[planKey];
  if (!planConfig) {
    console.error(`Invalid plan "${newPlan}". Allowed: ${Object.keys(ALLOWED_PLANS).join(', ')}`);
    process.exit(1);
  }

  const res = await query(
    'SELECT id, name, slug, plan, seat_limit FROM organizations WHERE id = $1 OR slug = $1',
    [orgIdentifier]
  );

  if (res.rows.length === 0) {
    console.error(`Organization "${orgIdentifier}" not found.`);
    process.exit(1);
  }

  const org = res.rows[0];
  console.log(`Current: ${org.name} (${org.id}) - Plan: ${org.plan}, Seat Limit: ${org.seat_limit}`);

  await query(
    `UPDATE organizations 
     SET plan = $1, seat_limit = $2, subscription_status = 'active', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [planKey, planConfig.seatLimit, org.id]
  );

  console.log(`✅ Successfully upgraded ${org.name} to ${planConfig.name} (${planConfig.seatLimit} seats).`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
