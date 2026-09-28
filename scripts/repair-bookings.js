// scripts/repair-bookings.js — Safe Data Repair & Audit Script (SEC-018)
// Dry-run by default. Backfills missing branch_ids and reports duplicate memberships for owner review.
// Usage:
//   node scripts/repair-bookings.js                 (DRY RUN - Read-only inspection & report)
//   node scripts/repair-bookings.js --apply         (APPLY - Backfills missing branch_ids)

'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function main() {
  const isApply = process.argv.includes('--apply');
  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL / TEST_DATABASE_URL is not set.');
    process.exit(1);
  }

  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED !== 'false';

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();

  try {
    console.log('===============================================================');
    console.log(`🔎 StudyFlow Booking & Branch Data Repair Script`);
    console.log(`Mode: ${isApply ? '⚠️  APPLY (Write changes)' : '🛡️  DRY RUN (Read-only analysis)'}`);
    console.log(`Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
    console.log('===============================================================\n');

    // ── 1. Memberships missing branch_id ──────────────────────────
    console.log('1️⃣  Analyzing Memberships missing branch_id...');
    const memMissingRes = await client.query(`
      SELECT 
        m.id, 
        m.organization_id, 
        m.student_id, 
        m.plan_id, 
        m.seat_id,
        COALESCE(a.branch_id, s.branch_id) AS resolved_branch_id
      FROM memberships m
      LEFT JOIN seat_assignments a ON a.membership_id = m.id
      LEFT JOIN seats s ON s.id = m.seat_id
      WHERE m.branch_id IS NULL
    `);

    const resolvableMems = memMissingRes.rows.filter(r => r.resolved_branch_id);
    const unresolvableMems = memMissingRes.rows.filter(r => !r.resolved_branch_id);

    console.log(`   Total memberships with NULL branch_id: ${memMissingRes.rows.length}`);
    console.log(`   -> Resolvable from seat/assignment:    ${resolvableMems.length}`);
    if (unresolvableMems.length > 0) {
      console.log(`   -> Unresolvable (no seat/assignment):  ${unresolvableMems.length}`);
    }

    if (resolvableMems.length > 0) {
      console.table(resolvableMems.map(r => ({
        MembershipID: r.id,
        StudentID: r.student_id,
        SeatID: r.seat_id || 'N/A',
        NewBranchID: r.resolved_branch_id
      })));

      if (isApply) {
        const updateMemRes = await client.query(`
          UPDATE memberships m
          SET branch_id = COALESCE(a.branch_id, s.branch_id), updated_at = CURRENT_TIMESTAMP
          FROM memberships m2
          LEFT JOIN seat_assignments a ON a.membership_id = m2.id
          LEFT JOIN seats s ON s.id = m2.seat_id
          WHERE m.id = m2.id AND m.branch_id IS NULL AND COALESCE(a.branch_id, s.branch_id) IS NOT NULL
        `);
        console.log(`   ✅ Successfully updated ${updateMemRes.rowCount} memberships with resolved branch_id.`);
      }
    } else {
      console.log('   ✅ All memberships have valid branch_id.');
    }
    console.log('');

    // ── 2. Payments missing branch_id ─────────────────────────────
    console.log('2️⃣  Analyzing Payments missing branch_id...');
    const payMissingRes = await client.query(`
      SELECT 
        p.id, 
        p.organization_id, 
        p.student_id, 
        p.membership_id, 
        p.amount,
        COALESCE(m.branch_id, st.branch_id) AS resolved_branch_id
      FROM payments p
      LEFT JOIN memberships m ON m.id = p.membership_id
      LEFT JOIN students st ON st.id = p.student_id
      WHERE p.branch_id IS NULL
    `);

    const resolvablePays = payMissingRes.rows.filter(r => r.resolved_branch_id);
    const unresolvablePays = payMissingRes.rows.filter(r => !r.resolved_branch_id);

    console.log(`   Total payments with NULL branch_id: ${payMissingRes.rows.length}`);
    console.log(`   -> Resolvable from membership/student: ${resolvablePays.length}`);
    if (unresolvablePays.length > 0) {
      console.log(`   -> Unresolvable:                      ${unresolvablePays.length}`);
    }

    if (resolvablePays.length > 0) {
      console.table(resolvablePays.map(r => ({
        PaymentID: r.id,
        StudentID: r.student_id,
        MembershipID: r.membership_id || 'N/A',
        Amount: r.amount,
        NewBranchID: r.resolved_branch_id
      })));

      if (isApply) {
        const updatePayRes = await client.query(`
          UPDATE payments p
          SET branch_id = COALESCE(m.branch_id, st.branch_id)
          FROM payments p2
          LEFT JOIN memberships m ON m.id = p2.membership_id
          LEFT JOIN students st ON st.id = p2.student_id
          WHERE p.id = p2.id AND p.branch_id IS NULL AND COALESCE(m.branch_id, st.branch_id) IS NOT NULL
        `);
        console.log(`   ✅ Successfully updated ${updatePayRes.rowCount} payments with resolved branch_id.`);
      }
    } else {
      console.log('   ✅ All payments have valid branch_id.');
    }
    console.log('');

    // ── 3. Duplicate Memberships Inspection ────────────────────────
    console.log('3️⃣  Scanning for Duplicate Memberships (Same student, plan & start date)...');
    const dupRes = await client.query(`
      SELECT 
        m.id,
        m.organization_id,
        m.student_id,
        m.plan_id,
        m.start_date,
        m.final_amount,
        m.status,
        m.payment_status,
        (SELECT COUNT(*) FROM seat_assignments a WHERE a.membership_id = m.id) AS assignments_count,
        (SELECT COUNT(*) FROM payments p WHERE p.membership_id = m.id) AS payments_count
      FROM memberships m
      WHERE (m.organization_id, m.student_id, m.plan_id, m.start_date) IN (
        SELECT organization_id, student_id, plan_id, start_date
        FROM memberships
        GROUP BY organization_id, student_id, plan_id, start_date
        HAVING COUNT(*) > 1
      )
      ORDER BY m.student_id, m.start_date, m.created_at ASC
    `);

    if (dupRes.rows.length > 0) {
      console.log(`   ⚠️  Found ${dupRes.rows.length} potential duplicate membership rows across duplicate groups:`);
      console.table(dupRes.rows.map(r => ({
        MembershipID: r.id,
        StudentID: r.student_id,
        PlanID: r.plan_id,
        StartDate: r.start_date,
        Status: r.status,
        PayStatus: r.payment_status,
        Assignments: r.assignments_count,
        Payments: r.payments_count
      })));
      console.log('   ℹ️  Note: As per safety policy, duplicate memberships are NOT automatically deleted.');
      console.log('   Review memberships with 0 assignments and 0 payments for manual reconciliation.\n');
    } else {
      console.log('   ✅ No duplicate memberships detected.');
    }

    console.log('===============================================================');
    if (!isApply) {
      console.log('✨ Dry run complete. To apply branch_id repairs, run with --apply');
    } else {
      console.log('✨ Repairs applied successfully.');
    }
    console.log('===============================================================');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
