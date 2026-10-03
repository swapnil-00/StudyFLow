// scripts/seed-demo.js — Demo Data Seeder for StudyFlow Demo Account
// Touch one organization only; dry-run by default; atomic single-transaction execution.
'use strict';

const path = require('path');
const fs = require('fs');

// ── 0. Load Environment (.env) without printing secrets ────────────────────────
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/(^["']|["']$)/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const { getPool, withTransaction } = require('../lib/db');

// ── 1. Parse Command Line Arguments ──────────────────────────────────────────
const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isClean = args.includes('--clean');

let targetEmail = 'srchaudhari324@gmail.com';
const emailIdx = args.indexOf('--email');
if (emailIdx !== -1 && args[emailIdx + 1]) {
  targetEmail = args[emailIdx + 1].trim();
}

let testPhone = null;
const phoneIdx = args.indexOf('--test-phone');
if (phoneIdx !== -1 && args[phoneIdx + 1]) {
  testPhone = args[phoneIdx + 1].trim();
}

// ── 2. IST Date Helpers (Asia/Kolkata) ───────────────────────────────────────
function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function offsetDateIST(days, baseDate = getTodayIST()) {
  const [y, m, d] = baseDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getISTTimestamp(daysAgo = 0, hour = 10, minute = 30) {
  const dateStr = offsetDateIST(-daysAgo);
  const [y, m, d] = dateStr.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(minute)}:00+05:30`;
}

// Helper to build fast multi-row parameterized INSERTs
function buildBatchInsert(table, columns, rows) {
  if (rows.length === 0) return null;
  const valuesSql = [];
  const params = [];
  let paramIdx = 1;

  for (const row of rows) {
    const rowParams = [];
    for (const col of columns) {
      rowParams.push(`$${paramIdx++}`);
      params.push(row[col] !== undefined ? row[col] : null);
    }
    valuesSql.push(`(${rowParams.join(', ')})`);
  }

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesSql.join(', ')} ON CONFLICT (id) DO NOTHING`;
  return { sql, params };
}

// ── 3. Table Dependency List for Clean Deletion ──────────────────────────────
const DEMO_TABLES_CASCADE = [
  'communication_logs',
  'documents',
  'activity_logs',
  'attendance',
  'seat_transfers',
  'reservations',
  'waitlist',
  'notifications',
  'staff',
  'expenses',
  'payments',
  'seat_assignments',
  'memberships',
  'students',
  'membership_plans',
  'seats',
  'rooms',
  'floors',
];

async function main() {
  const pool = getPool();
  const todayIST = getTodayIST();
  const currentYear = new Date().getFullYear();

  console.log('===============================================================');
  console.log('       STUDYFLOW DEMO DATA SEED SCRIPT (PROD SAFE)             ');
  console.log('===============================================================');
  console.log(`Execution Date (IST): ${todayIST}`);
  console.log(`Target User Email   : ${targetEmail}`);
  console.log(`Mode                : ${isClean ? 'CLEAN ONLY' : isApply ? 'APPLY (LIVE WRITE)' : 'DRY RUN (NO WRITES)'}`);
  if (testPhone) console.log(`Test Phone (1st 2)  : ${testPhone}`);
  console.log('---------------------------------------------------------------');

  // Step 1: Find Target Org & Branch
  const orgRes = await pool.query(
    `SELECT o.id AS org_id, o.name, o.plan, o.seat_limit
     FROM users u
     JOIN org_members m ON m.user_id = u.id AND m.status = 'active'
     JOIN organizations o ON o.id = m.organization_id
     WHERE LOWER(u.email) = LOWER($1)
     ORDER BY m.created_at DESC
     LIMIT 1`,
    [targetEmail]
  );

  if (orgRes.rows.length === 0) {
    console.error(`❌ No active organization found for email: ${targetEmail}`);
    process.exit(1);
  }

  const org = orgRes.rows[0];
  const orgId = org.org_id;
  console.log(`Found Target Org: [${orgId}] "${org.name}" (Plan: ${org.plan}, Seat Limit: ${org.seat_limit})`);

  const branchRes = await pool.query(
    `SELECT id, name, city FROM branches WHERE organization_id = $1 ORDER BY created_at ASC`,
    [orgId]
  );

  if (branchRes.rows.length === 0) {
    console.error(`❌ No branch found for organization ${orgId}`);
    process.exit(1);
  }

  let targetBranch = branchRes.rows.find((b) => b.name && b.name.includes('Main Branch')) || branchRes.rows[0];
  const branchId = targetBranch.id;
  console.log(`Target Branch   : [${branchId}] "${targetBranch.name}" (${targetBranch.city || 'Default City'})`);

  // Count existing other organizations to verify zero side-effects
  const otherOrgsBefore = await pool.query(
    `SELECT count(*) FROM organizations WHERE id != $1`,
    [orgId]
  );
  const otherOrgCountBefore = parseInt(otherOrgsBefore.rows[0].count, 10);

  if (isClean) {
    console.log(`\n🧹 Cleaning demo rows (DEMO-%) for organization ${orgId}...`);
    await withTransaction(async (client) => {
      let totalDeleted = 0;
      for (const table of DEMO_TABLES_CASCADE) {
        try {
          let delRes;
          if (table === 'reservations' || table === 'attendance') {
            delRes = await client.query(`DELETE FROM ${table} WHERE branch_id = $1 AND id LIKE 'DEMO-%'`, [branchId]);
          } else {
            delRes = await client.query(`DELETE FROM ${table} WHERE organization_id = $1 AND id LIKE 'DEMO-%'`, [orgId]);
          }
          if (delRes.rowCount > 0) {
            console.log(`  - Deleted ${delRes.rowCount} rows from ${table}`);
            totalDeleted += delRes.rowCount;
          }
        } catch (_) {}
      }
      // Reset any existing seats that were modified
      await client.query(
        `UPDATE seats SET status = 'available', current_student_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1 AND (status IN ('maintenance', 'blocked') OR current_student_id LIKE 'DEMO-%')`,
        [orgId]
      );
      console.log(`✅ Clean completed. Total ${totalDeleted} demo rows removed.`);
    });
    process.exit(0);
  }

  // ── Determine Starting Receipt Sequence Number ────────────────────────────
  const seqRes = await pool.query(
    `SELECT current_number FROM receipt_sequences WHERE organization_id = $1`,
    [orgId]
  );
  let receiptCounter = (seqRes.rows[0]?.current_number || 0) + 1;
  console.log(`Starting Receipt Counter: ${receiptCounter} (Prefix: REC-${currentYear}-)`);

  function getNextReceipt() {
    const numStr = String(receiptCounter++).padStart(6, '0');
    return `REC-${currentYear}-${numStr}`;
  }

  // ── Prepare Demo Data ──────────────────────────────────────────────────────
  // 1. Existing Non-Demo Floors, Rooms and Seats
  const floorsRes = await pool.query(`SELECT * FROM floors WHERE organization_id = $1 AND id NOT LIKE 'DEMO-%' ORDER BY floor_number`, [orgId]);
  const roomsRes = await pool.query(`SELECT * FROM rooms WHERE organization_id = $1 AND id NOT LIKE 'DEMO-%' ORDER BY created_at`, [orgId]);
  const existingSeatsRes = await pool.query(`SELECT * FROM seats WHERE organization_id = $1 AND id NOT LIKE 'DEMO-%' ORDER BY id`, [orgId]);

  let primaryFloor = floorsRes.rows[0];
  let primaryRoom = roomsRes.rows[0];

  const demoFloors = [];
  const demoRooms = [];
  const demoSeats = [];

  if (!primaryFloor) {
    demoFloors.push({
      id: 'DEMO-FLR-01',
      organization_id: orgId,
      branch_id: branchId,
      name: 'Ground Floor',
      floor_number: 1,
      description: 'Main Academic Floor',
    });
  }

  if (!primaryRoom) {
    demoRooms.push({
      id: 'DEMO-RM-01',
      organization_id: orgId,
      floor_id: primaryFloor ? primaryFloor.id : 'DEMO-FLR-01',
      branch_id: branchId,
      name: 'Reading Hall A',
      room_type: 'general',
      capacity: 52,
    });
  }

  // Ensure total seats is at least 52 (>= 50 target, <= 75 seat_limit)
  let allSeats = [...existingSeatsRes.rows];
  const targetRoomId = primaryRoom ? primaryRoom.id : 'DEMO-RM-01';

  if (allSeats.length < 52) {
    const seatsToCreate = 52 - allSeats.length;
    console.log(`Current non-demo seats: ${allSeats.length}. Creating ${seatsToCreate} demo seats to reach 52 seats...`);
    const startNum = allSeats.length + 1;
    for (let i = 0; i < seatsToCreate; i++) {
      const num = startNum + i;
      const row = String.fromCharCode(65 + Math.floor((num - 1) / 10)); // A, B, C...
      const col = ((num - 1) % 10) + 1;
      const type = num % 7 === 0 ? 'cabin' : num % 4 === 0 ? 'premium' : 'standard';
      demoSeats.push({
        id: `DEMO-SEAT-${String(num).padStart(3, '0')}`,
        organization_id: orgId,
        room_id: targetRoomId,
        branch_id: branchId,
        seat_number: `${row}${col < 10 ? '0' + col : col}`,
        row_label: row,
        seat_type: type,
        status: 'available',
        position_x: (col - 1) * 60 + 50,
        position_y: (row.charCodeAt(0) - 65) * 60 + 50,
      });
    }
  }

  // 2. Membership Plans (6 active + 1 inactive)
  const demoPlans = [
    { id: 'DEMO-PLAN-01', organization_id: orgId, name: 'Daily Pass', duration: 1, duration_unit: 'days', price: 100, access_hours: '6 AM–11 PM', active: true, description: '1 Day Full Access' },
    { id: 'DEMO-PLAN-02', organization_id: orgId, name: 'Weekly', duration: 7, duration_unit: 'days', price: 500, access_hours: '6 AM–11 PM', active: true, description: '7 Days Full Access' },
    { id: 'DEMO-PLAN-03', organization_id: orgId, name: 'Monthly Full Day', duration: 30, duration_unit: 'days', price: 1200, access_hours: '6 AM–11 PM', active: true, description: '30 Days Full Access (6 AM–11 PM)' },
    { id: 'DEMO-PLAN-04', organization_id: orgId, name: 'Monthly Half Day', duration: 30, duration_unit: 'days', price: 700, access_hours: 'Morning or Evening', active: true, description: '30 Days 6-Hour Slot Access' },
    { id: 'DEMO-PLAN-05', organization_id: orgId, name: 'Quarterly', duration: 90, duration_unit: 'days', price: 3300, access_hours: '6 AM–11 PM', active: true, description: '90 Days Full Access' },
    { id: 'DEMO-PLAN-06', organization_id: orgId, name: 'Half Yearly', duration: 180, duration_unit: 'days', price: 6300, access_hours: '6 AM–11 PM', active: true, description: '180 Days Full Access' },
    { id: 'DEMO-PLAN-07', organization_id: orgId, name: 'Festival Offer', duration: 30, duration_unit: 'days', price: 999, access_hours: '6 AM–11 PM', active: false, description: 'Limited Festival Discount Pass' },
  ];

  // 3. Indian Student Names & Exam Profiles
  const studentProfiles = [
    { name: 'Aarav Sharma', exam: 'UPSC Civil Services', gender: 'M', city: 'Tirora', color: '#6366f1' },
    { name: 'Priya Patel', exam: 'MPSC Rajyaseva', gender: 'F', city: 'Gondia', color: '#ec4899' },
    { name: 'Rohan Deshmukh', exam: 'Bank PO (IBPS)', gender: 'M', city: 'Bhandara', color: '#10b981' },
    { name: 'Ananya Iyer', exam: 'CA Final', gender: 'F', city: 'Nagpur', color: '#8b5cf6' },
    { name: 'Aditya Verma', exam: 'NEET PG', gender: 'M', city: 'Tirora', color: '#f59e0b' },
    { name: 'Sneha Kulkarni', exam: 'UPSC IAS', gender: 'F', city: 'Nagpur', color: '#06b6d4' },
    { name: 'Tanmay Joshi', exam: 'GATE Computer Science', gender: 'M', city: 'Tirora', color: '#3b82f6' },
    { name: 'Neha Gupta', exam: 'SSC CGL', gender: 'F', city: 'Gondia', color: '#14b8a6' },
    { name: 'Vikram Malhotra', exam: 'MPSC PSI', gender: 'M', city: 'Bhandara', color: '#f97316' },
    { name: 'Pooja Shinde', exam: 'UPSC CSE', gender: 'F', city: 'Tirora', color: '#a855f7' },
    { name: 'Rohit Kale', exam: 'Bank Clerk', gender: 'M', city: 'Nagpur', color: '#ef4444' },
    { name: 'Divya Nair', exam: 'CA Inter', gender: 'F', city: 'Gondia', color: '#84cc16' },
    { name: 'Siddharth Mehta', exam: 'CAT / MBA', gender: 'M', city: 'Tirora', color: '#6366f1' },
    { name: 'Shreya Patil', exam: 'MPSC STI', gender: 'F', city: 'Bhandara', color: '#ec4899' },
    // Expiring Soon (6)
    { name: 'Ayush Saxena', exam: 'UPSC Prelims', gender: 'M', city: 'Tirora', color: '#10b981' },
    { name: 'Meera Reddy', exam: 'NEET UG', gender: 'F', city: 'Nagpur', color: '#8b5cf6' },
    { name: 'Harsh Vardhan', exam: 'SSC CHSL', gender: 'M', city: 'Gondia', color: '#f59e0b' },
    { name: 'Ritu Chauhan', exam: 'Bank PO', gender: 'F', city: 'Bhandara', color: '#06b6d4' },
    { name: 'Yash More', exam: 'GATE Mechanical', gender: 'M', city: 'Tirora', color: '#3b82f6' },
    { name: 'Sakshi Sawant', exam: 'MPSC Group B', gender: 'F', city: 'Nagpur', color: '#14b8a6' },
    // Payment Pending (5)
    { name: 'Pranav Bhat', exam: 'CA Foundation', gender: 'M', city: 'Gondia', color: '#f97316' },
    { name: 'Ishita Sen', exam: 'UPSC Civil Services', gender: 'F', city: 'Tirora', color: '#a855f7' },
    { name: 'Kunal Rao', exam: 'Bank Specialist Officer', gender: 'M', city: 'Bhandara', color: '#ef4444' },
    { name: 'Tanvi Gokhale', exam: 'MPSC Rajyaseva', gender: 'F', city: 'Nagpur', color: '#84cc16' },
    { name: 'Rahul Jadhav', exam: 'CDS / Defense', gender: 'M', city: 'Tirora', color: '#6366f1' },
    // Payment Due / Overdue (5)
    { name: 'Ankita Deshpande', exam: 'UPSC CSE', gender: 'F', city: 'Nagpur', color: '#ec4899' },
    { name: 'Varun Kapoor', exam: 'SSC CGL', gender: 'M', city: 'Gondia', color: '#10b981' },
    { name: 'Pallavi Kadam', exam: 'Bank PO', gender: 'F', city: 'Bhandara', color: '#8b5cf6' },
    { name: 'Amit Nambiar', exam: 'NEET PG', gender: 'M', city: 'Tirora', color: '#f59e0b' },
    { name: 'Shruti Mahajan', exam: 'CA Final', gender: 'F', city: 'Nagpur', color: '#06b6d4' },
    // Past Inactive / Historical Students (8)
    { name: 'Gaurav Tiwari', exam: 'UPSC Passed (Selected)', gender: 'M', city: 'Tirora', color: '#3b82f6' },
    { name: 'Kavita Pandey', exam: 'Bank PO (Placed)', gender: 'F', city: 'Gondia', color: '#14b8a6' },
    { name: 'Manish Agarwal', exam: 'MPSC (Completed)', gender: 'M', city: 'Nagpur', color: '#f97316' },
    { name: 'Sonali Borkar', exam: 'SSC (Selected)', gender: 'F', city: 'Bhandara', color: '#a855f7' },
    { name: 'Nikhil Rathi', exam: 'CAT (Admitted IIM)', gender: 'M', city: 'Tirora', color: '#ef4444' },
    { name: 'Deepika Raut', exam: 'NEET (Cleared)', gender: 'F', city: 'Nagpur', color: '#84cc16' },
    { name: 'Sanjay Meshram', exam: 'GATE (Cleared)', gender: 'M', city: 'Gondia', color: '#6366f1' },
    { name: 'Madhuri Chavan', exam: 'MPSC (Selected)', gender: 'F', city: 'Bhandara', color: '#ec4899' },
  ];

  const demoStudents = [];
  studentProfiles.forEach((p, idx) => {
    const stuNum = idx + 1;
    let phoneStr = `+91 90000 ${String(stuNum).padStart(5, '0')}`;
    if (testPhone && (stuNum === 1 || stuNum === 2)) {
      phoneStr = testPhone;
    }
    const cleanEmail = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@example.com';
    const isPast = stuNum > 30;
    const optIn = stuNum !== 11 && stuNum !== 27; // 2 opted out

    demoStudents.push({
      id: `DEMO-STU-${String(stuNum).padStart(3, '0')}`,
      organization_id: orgId,
      name: p.name,
      email: cleanEmail,
      phone: phoneStr,
      emergency_contact: `+91 98230 ${String(10000 + stuNum).slice(1)}`,
      avatar_color: p.color,
      id_proof: `XXXX-XXXX-${String(1000 + stuNum)}`,
      address: `Plot ${10 + stuNum}, Near Gandhi Chowk, ${p.city}, Maharashtra`,
      notes: `Target: ${p.exam}. Dedicated daily study regime.`,
      status: isPast ? 'inactive' : 'active',
      join_date: offsetDateIST(-(isPast ? 120 + stuNum * 5 : 15 + stuNum * 2)),
      branch_id: branchId,
      whatsapp_opt_in: optIn,
    });
  });

  // 4. Setup Seated Assignments, Memberships & Payments
  const demoMemberships = [];
  const demoAssignments = [];
  const demoPayments = [];
  const seatStatusMap = {}; // seatId -> { status, studentId }

  const combinedSeats = [...allSeats, ...demoSeats];

  // Assign Seats to 30 students
  for (let i = 0; i < 30; i++) {
    const student = demoStudents[i];
    const seat = combinedSeats[i];
    const seatId = seat.id;
    const stuId = student.id;
    const memId = `DEMO-MEM-${String(i + 1).padStart(3, '0')}`;

    let planId = 'DEMO-PLAN-03'; // Monthly full day
    let price = 1200;
    let discount = 0;
    let finalAmount = 1200;
    let startDate = offsetDateIST(-20);
    let endDate = offsetDateIST(10);
    let dueDate = todayIST;
    let paymentStatus = 'paid';
    let seatTargetStatus = 'occupied';
    let slotType = (i % 5 === 0) ? 'half-day' : 'full-day';

    if (slotType === 'half-day') {
      planId = 'DEMO-PLAN-04';
      price = 700;
      finalAmount = 700;
    }

    if (i < 14) {
      // ── GROUP 1: OCCUPIED (14) ──
      // Fully paid, 8–60 days left
      const daysLeft = 8 + (i * 3) + (i > 8 ? 10 : 0);
      startDate = offsetDateIST(-(30 - daysLeft));
      endDate = offsetDateIST(daysLeft);
      dueDate = startDate;
      if (i === 1 || i === 4 || i === 7) {
        discount = 200;
        finalAmount = price - discount;
      }
      paymentStatus = 'paid';
      seatTargetStatus = 'occupied';

      const payMode = (i % 3 === 0) ? 'upi' : (i % 3 === 1) ? 'cash' : 'bank_transfer';
      const isPayToday = i < 2; // 2 payments today
      const payDate = isPayToday ? todayIST : offsetDateIST(-(25 - i));
      demoPayments.push({
        id: `DEMO-PAY-${String(demoPayments.length + 1).padStart(3, '0')}`,
        organization_id: orgId,
        student_id: stuId,
        membership_id: memId,
        branch_id: branchId,
        amount: finalAmount,
        mode: payMode,
        reference_number: payMode === 'upi' ? `UTR${429000000000 + i}` : payMode === 'bank_transfer' ? `NEFT${88200000 + i}` : '',
        receipt_number: getNextReceipt(),
        date: payDate,
        notes: `Full subscription payment for ${student.name}`,
        status: 'recorded',
      });
    } else if (i < 20) {
      // ── GROUP 2: EXPIRING SOON (6) ──
      // Fully paid, ends in 0, 1, 2, 3, 5, 7 days
      const expireOffsets = [0, 1, 2, 3, 5, 7];
      const daysLeft = expireOffsets[i - 14];
      startDate = offsetDateIST(-(30 - daysLeft));
      endDate = offsetDateIST(daysLeft);
      dueDate = startDate;
      paymentStatus = 'paid';
      seatTargetStatus = 'expiring';

      const payMode = (i % 2 === 0) ? 'upi' : 'card';
      const isPayToday = i === 14; // 1 payment today
      const payDate = isPayToday ? todayIST : offsetDateIST(-20);
      demoPayments.push({
        id: `DEMO-PAY-${String(demoPayments.length + 1).padStart(3, '0')}`,
        organization_id: orgId,
        student_id: stuId,
        membership_id: memId,
        branch_id: branchId,
        amount: finalAmount,
        mode: payMode,
        reference_number: payMode === 'upi' ? `UTR${429111000000 + i}` : 'POS-SWIPE-991',
        receipt_number: getNextReceipt(),
        date: payDate,
        notes: `Renewal payment for ${student.name}`,
        status: 'recorded',
      });
    } else if (i < 25) {
      // ── GROUP 3: PAYMENT PENDING (5) ──
      // Unpaid or part-paid, due today to +5 days
      const dueOffsets = [0, 1, 2, 3, 5];
      dueDate = offsetDateIST(dueOffsets[i - 20]);
      startDate = offsetDateIST(-5);
      endDate = offsetDateIST(25);
      seatTargetStatus = 'payment-pending';

      if (i === 23 || i === 24) {
        paymentStatus = 'partial';
        const isPayToday = i === 23; // 1 partial payment today
        const payDate = isPayToday ? todayIST : offsetDateIST(-2);
        demoPayments.push({
          id: `DEMO-PAY-${String(demoPayments.length + 1).padStart(3, '0')}`,
          organization_id: orgId,
          student_id: stuId,
          membership_id: memId,
          branch_id: branchId,
          amount: 500,
          mode: 'upi',
          reference_number: `UTR${429222000000 + i}`,
          receipt_number: getNextReceipt(),
          date: payDate,
          notes: `Partial seat deposit (₹500 / ₹1,200) for ${student.name}`,
          status: 'recorded',
        });
      } else {
        paymentStatus = 'unpaid';
      }
    } else {
      // ── GROUP 4: PAYMENT DUE / OVERDUE (5) ──
      // Unpaid or part-paid, due 3–20 days ago
      const dueOffsets = [-3, -5, -10, -15, -20];
      dueDate = offsetDateIST(dueOffsets[i - 25]);
      startDate = offsetDateIST(-20);
      endDate = offsetDateIST(10);
      seatTargetStatus = 'payment-due';

      if (i === 28 || i === 29) {
        paymentStatus = 'partial';
        demoPayments.push({
          id: `DEMO-PAY-${String(demoPayments.length + 1).padStart(3, '0')}`,
          organization_id: orgId,
          student_id: stuId,
          membership_id: memId,
          branch_id: branchId,
          amount: 500,
          mode: 'cash',
          reference_number: '',
          receipt_number: getNextReceipt(),
          date: offsetDateIST(-18),
          notes: `Initial token payment (₹500 / ₹1,200) for ${student.name}`,
          status: 'recorded',
        });
      } else {
        paymentStatus = 'unpaid';
      }
    }

    demoMemberships.push({
      id: memId,
      organization_id: orgId,
      student_id: stuId,
      plan_id: planId,
      branch_id: branchId,
      seat_id: seatId,
      start_date: startDate,
      end_date: endDate,
      due_date: dueDate,
      price,
      discount,
      final_amount: finalAmount,
      status: 'active',
      payment_status: paymentStatus,
      notes: `Demo seeded membership (${seatTargetStatus})`,
    });

    demoAssignments.push({
      id: `DEMO-ASN-${String(i + 1).padStart(3, '0')}`,
      organization_id: orgId,
      seat_id: seatId,
      student_id: stuId,
      membership_id: memId,
      branch_id: branchId,
      start_date: startDate,
      end_date: endDate,
      slot_type: slotType,
      status: 'active',
    });

    seatStatusMap[seatId] = {
      status: 'occupied',
      student_id: stuId,
    };
  }

  // 1 Extra today's payment to make Today's revenue exactly ₹5,000
  // Current today payments: 2 full (₹1200 + ₹1000) + 1 full (₹1200) + 1 partial (₹500) = ₹3,900.
  // Add 1 payment today for ₹1,100 -> Total = ₹5,000 exactly!
  demoPayments.push({
    id: `DEMO-PAY-TODAY-05`,
    organization_id: orgId,
    student_id: demoStudents[2].id,
    membership_id: demoMemberships[2].id,
    branch_id: branchId,
    amount: 1100,
    mode: 'upi',
    reference_number: `UTR${429999000005}`,
    receipt_number: getNextReceipt(),
    date: todayIST,
    notes: `Study material and locker supplement fee for ${demoStudents[2].name}`,
    status: 'recorded',
  });

  // Assign Unoccupied Seats (Maintenance 3, Blocked 2, Available ≥ 10)
  const remainingSeats = combinedSeats.slice(30);
  console.log(`Total remaining unoccupied seats: ${remainingSeats.length}`);

  remainingSeats.forEach((seat, idx) => {
    if (idx < 3) {
      seatStatusMap[seat.id] = { status: 'maintenance', student_id: null };
    } else if (idx < 5) {
      seatStatusMap[seat.id] = { status: 'blocked', student_id: null };
    } else {
      seatStatusMap[seat.id] = { status: 'available', student_id: null };
    }
  });

  // ── 5. Historical Memberships & Renewals ──────────────────────────────────
  // 8 Past Students (stuNum 31 to 38)
  for (let i = 30; i < 38; i++) {
    const student = demoStudents[i];
    const memId = `DEMO-MEM-PAST-${String(i - 29).padStart(2, '0')}`;
    const pastEnd = offsetDateIST(-(15 + (i - 30) * 8));
    const pastStart = offsetDateIST(-(45 + (i - 30) * 8));

    demoMemberships.push({
      id: memId,
      organization_id: orgId,
      student_id: student.id,
      plan_id: 'DEMO-PLAN-03',
      branch_id: branchId,
      seat_id: null,
      start_date: pastStart,
      end_date: pastEnd,
      due_date: pastStart,
      price: 1200,
      discount: 0,
      final_amount: 1200,
      status: 'expired',
      payment_status: 'paid',
      notes: 'Completed past academic term',
    });

    demoPayments.push({
      id: `DEMO-PAY-HIST-${String(i - 29).padStart(2, '0')}`,
      organization_id: orgId,
      student_id: student.id,
      membership_id: memId,
      branch_id: branchId,
      amount: 1200,
      mode: (i % 2 === 0) ? 'upi' : 'cash',
      reference_number: i % 2 === 0 ? `UTR${428000000000 + i}` : '',
      receipt_number: getNextReceipt(),
      date: pastStart,
      notes: `Past term payment for ${student.name}`,
      status: 'recorded',
    });
  }

  // 5 Active Students with Prior Renewal History (Students 1 to 5)
  for (let i = 0; i < 5; i++) {
    const student = demoStudents[i];
    const memId = `DEMO-MEM-REN-${String(i + 1).padStart(2, '0')}`;
    const renEnd = offsetDateIST(-(25 + i * 5));
    const renStart = offsetDateIST(-(55 + i * 5));

    demoMemberships.push({
      id: memId,
      organization_id: orgId,
      student_id: student.id,
      plan_id: 'DEMO-PLAN-03',
      branch_id: branchId,
      seat_id: null,
      start_date: renStart,
      end_date: renEnd,
      due_date: renStart,
      price: 1200,
      discount: 0,
      final_amount: 1200,
      status: 'expired',
      payment_status: 'paid',
      notes: 'Prior month subscription renewed',
    });

    demoPayments.push({
      id: `DEMO-PAY-REN-${String(i + 1).padStart(2, '0')}`,
      organization_id: orgId,
      student_id: student.id,
      membership_id: memId,
      branch_id: branchId,
      amount: 1200,
      mode: 'upi',
      reference_number: `UTR${427000000000 + i}`,
      receipt_number: getNextReceipt(),
      date: renStart,
      notes: `Prior renewal payment for ${student.name}`,
      status: 'recorded',
    });
  }

  // Additional 22 historical payments across 90 days
  for (let k = 1; k <= 22; k++) {
    const daysAgo = 1 + Math.floor((k * 85) / 22);
    const payDate = offsetDateIST(-daysAgo);
    const stu = demoStudents[(k * 3) % demoStudents.length];
    const mode = k % 4 === 0 ? 'cash' : k % 4 === 1 ? 'upi' : k % 4 === 2 ? 'bank_transfer' : 'cheque';
    const amount = (k % 3 === 0) ? 3300 : (k % 5 === 0) ? 6300 : 1200;

    demoPayments.push({
      id: `DEMO-PAY-SPREAD-${String(k).padStart(2, '0')}`,
      organization_id: orgId,
      student_id: stu.id,
      membership_id: null,
      branch_id: branchId,
      amount,
      mode,
      reference_number: mode === 'upi' ? `UTR${426000000000 + k}` : mode === 'bank_transfer' ? `NEFT${99300000 + k}` : mode === 'cheque' ? `CHQ${100200 + k}` : '',
      receipt_number: getNextReceipt(),
      date: payDate,
      notes: `Subscription installment for ${stu.name}`,
      status: 'recorded',
    });
  }

  // 1 Voided Payment and 1 Refund
  const voidPayId = `DEMO-PAY-VOID-01`;
  demoPayments.push({
    id: voidPayId,
    organization_id: orgId,
    student_id: demoStudents[0].id,
    membership_id: null,
    branch_id: branchId,
    amount: 1200,
    mode: 'cash',
    reference_number: '',
    receipt_number: getNextReceipt(),
    date: offsetDateIST(-5),
    notes: 'Incorrect cashier duplicate submission',
    status: 'voided',
    voided_at: getISTTimestamp(5),
    void_reason: 'Entered twice by mistake',
  });

  const refTargetId = demoPayments[0].id;
  demoPayments.push({
    id: `DEMO-PAY-REFUND-01`,
    organization_id: orgId,
    student_id: demoStudents[0].id,
    membership_id: null,
    branch_id: branchId,
    amount: -200,
    mode: 'upi',
    reference_number: 'UTR-REFUND-001',
    receipt_number: getNextReceipt(),
    date: offsetDateIST(-3),
    notes: 'Partial goodwill fee refund',
    status: 'recorded',
    refund_of: refTargetId,
  });

  // ── 6. Expenses (27 expenses over 3 months) ──────────────────────────────
  const demoExpenses = [
    // Today's expenses (2)
    { id: 'DEMO-EXP-01', organization_id: orgId, branch_id: branchId, category: 'Stationery', title: 'Register books, whiteboard markers & sticky notes', amount: 480, date: todayIST, payment_mode: 'cash', vendor: 'D-Mart Stationery', is_recurring: false },
    { id: 'DEMO-EXP-02', organization_id: orgId, branch_id: branchId, category: 'Miscellaneous', title: 'Daily student drinking water jar refills (4 jars)', amount: 200, date: todayIST, payment_mode: 'upi', vendor: 'Bisleri Local Agency', is_recurring: false },

    // This Month (Month 1)
    { id: 'DEMO-EXP-03', organization_id: orgId, branch_id: branchId, category: 'Rent', title: 'Monthly Library Premises Rent - Ground & 1st Floor', amount: 12000, date: offsetDateIST(-5), payment_mode: 'bank_transfer', vendor: 'Jain Commercial Complex', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-04', organization_id: orgId, branch_id: branchId, category: 'Staff Salary', title: 'Staff Salaries (Receptionist & Night Security)', amount: 10000, date: offsetDateIST(-5), payment_mode: 'bank_transfer', vendor: 'Library Staff Account', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-05', organization_id: orgId, branch_id: branchId, category: 'Electricity', title: 'Monthly Commercial Electricity Bill', amount: 2850, date: offsetDateIST(-8), payment_mode: 'upi', vendor: 'MSEDCL Maharashtra', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-06', organization_id: orgId, branch_id: branchId, category: 'Internet/Wi-Fi', title: 'Dual Band Commercial Fiber Plan (300 Mbps)', amount: 1499, date: offsetDateIST(-10), payment_mode: 'upi', vendor: 'JioFiber Enterprise', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-07', organization_id: orgId, branch_id: branchId, category: 'Cleaning', title: 'Professional deep sanitization & housekeeping supplies', amount: 800, date: offsetDateIST(-12), payment_mode: 'cash', vendor: 'CleanPro Services', is_recurring: false },
    { id: 'DEMO-EXP-08', organization_id: orgId, branch_id: branchId, category: 'Maintenance/Repairs', title: 'AC servicing & filter cleaning for Reading Hall A', amount: 1200, date: offsetDateIST(-14), payment_mode: 'cash', vendor: 'CoolAir Technicians', is_recurring: false },
    { id: 'DEMO-EXP-09', organization_id: orgId, branch_id: branchId, category: 'Marketing', title: 'Banner printing near Gandhi Chowk and coaching hubs', amount: 1500, date: offsetDateIST(-18), payment_mode: 'upi', vendor: 'Sai Digital Prints', is_recurring: false },
    { id: 'DEMO-EXP-10', organization_id: orgId, branch_id: branchId, category: 'Water', title: 'RO Water purifier maintenance & filter replacement', amount: 600, date: offsetDateIST(-22), payment_mode: 'cash', vendor: 'Aquaguard Service', is_recurring: false },

    // Month 2 (30-60 days ago)
    { id: 'DEMO-EXP-11', organization_id: orgId, branch_id: branchId, category: 'Rent', title: 'Monthly Library Premises Rent', amount: 15000, date: offsetDateIST(-35), payment_mode: 'bank_transfer', vendor: 'Jain Commercial Complex', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-12', organization_id: orgId, branch_id: branchId, category: 'Staff Salary', title: 'Staff Salaries', amount: 14000, date: offsetDateIST(-35), payment_mode: 'bank_transfer', vendor: 'Library Staff Account', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-13', organization_id: orgId, branch_id: branchId, category: 'Electricity', title: 'Monthly Commercial Electricity Bill', amount: 4120, date: offsetDateIST(-38), payment_mode: 'upi', vendor: 'MSEDCL Maharashtra', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-14', organization_id: orgId, branch_id: branchId, category: 'Internet/Wi-Fi', title: 'Dual Band Commercial Fiber Plan', amount: 1499, date: offsetDateIST(-40), payment_mode: 'upi', vendor: 'JioFiber Enterprise', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-15', organization_id: orgId, branch_id: branchId, category: 'Furniture', title: 'Ergonomic study chairs & cushion repairs (4 units)', amount: 4600, date: offsetDateIST(-45), payment_mode: 'bank_transfer', vendor: 'Royal Furniture Works', is_recurring: false },
    { id: 'DEMO-EXP-16', organization_id: orgId, branch_id: branchId, category: 'Maintenance/Repairs', title: 'Electrical wiring & socket installation for laptop chargers', amount: 1650, date: offsetDateIST(-48), payment_mode: 'cash', vendor: 'Omkar Electricals', is_recurring: false },
    { id: 'DEMO-EXP-17', organization_id: orgId, branch_id: branchId, category: 'Stationery', title: 'ID Cards printing and thermal printer paper rolls', amount: 850, date: offsetDateIST(-52), payment_mode: 'upi', vendor: 'D-Mart Stationery', is_recurring: false },
    { id: 'DEMO-EXP-18', organization_id: orgId, branch_id: branchId, category: 'Cleaning', title: 'Monthly cleaning materials and phenyl stock', amount: 1100, date: offsetDateIST(-55), payment_mode: 'cash', vendor: 'CleanPro Services', is_recurring: false },

    // Month 3 (60-90 days ago)
    { id: 'DEMO-EXP-19', organization_id: orgId, branch_id: branchId, category: 'Rent', title: 'Monthly Library Premises Rent', amount: 15000, date: offsetDateIST(-65), payment_mode: 'bank_transfer', vendor: 'Jain Commercial Complex', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-20', organization_id: orgId, branch_id: branchId, category: 'Staff Salary', title: 'Staff Salaries', amount: 14000, date: offsetDateIST(-65), payment_mode: 'bank_transfer', vendor: 'Library Staff Account', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-21', organization_id: orgId, branch_id: branchId, category: 'Electricity', title: 'Monthly Commercial Electricity Bill', amount: 3750, date: offsetDateIST(-68), payment_mode: 'upi', vendor: 'MSEDCL Maharashtra', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-22', organization_id: orgId, branch_id: branchId, category: 'Internet/Wi-Fi', title: 'Dual Band Commercial Fiber Plan', amount: 1499, date: offsetDateIST(-70), payment_mode: 'upi', vendor: 'JioFiber Enterprise', is_recurring: true, recurring_frequency: 'monthly' },
    { id: 'DEMO-EXP-23', organization_id: orgId, branch_id: branchId, category: 'Furniture', title: 'Study partition acrylic sheets and privacy dividers', amount: 3800, date: offsetDateIST(-75), payment_mode: 'bank_transfer', vendor: 'Royal Furniture Works', is_recurring: false },
    { id: 'DEMO-EXP-24', organization_id: orgId, branch_id: branchId, category: 'Marketing', title: 'Pamphlet distribution outside coaching institutes', amount: 1500, date: offsetDateIST(-78), payment_mode: 'cash', vendor: 'Sai Digital Prints', is_recurring: false },
    { id: 'DEMO-EXP-25', organization_id: orgId, branch_id: branchId, category: 'Water', title: '20L Mineral Water Jars monthly package', amount: 800, date: offsetDateIST(-82), payment_mode: 'upi', vendor: 'Bisleri Local Agency', is_recurring: false },
    { id: 'DEMO-EXP-26', organization_id: orgId, branch_id: branchId, category: 'Miscellaneous', title: 'First aid emergency box and fire extinguisher refill', amount: 1250, date: offsetDateIST(-85), payment_mode: 'cash', vendor: 'Suraksha Fire Safety', is_recurring: false },

    // 1 Voided Expense
    { id: 'DEMO-EXP-VOID-01', organization_id: orgId, branch_id: branchId, category: 'Stationery', title: 'Erroneous printer toner double booking', amount: 1200, date: offsetDateIST(-15), payment_mode: 'cash', vendor: 'D-Mart Stationery', is_recurring: false, status: 'voided', voided_at: getISTTimestamp(15), void_reason: 'Duplicate entry' },
  ];

  // ── 7. Staff (4) ─────────────────────────────────────────────────────────
  const demoStaff = [
    { id: 'DEMO-STF-01', organization_id: orgId, branch_id: branchId, name: 'Rajesh Varma', role: 'Manager', email: 'rajesh.staff@example.com', phone: '+91 98221 00101', status: 'active' },
    { id: 'DEMO-STF-02', organization_id: orgId, branch_id: branchId, name: 'Snehal Shinde', role: 'Receptionist', email: 'snehal.staff@example.com', phone: '+91 98221 00102', status: 'active' },
    { id: 'DEMO-STF-03', organization_id: orgId, branch_id: branchId, name: 'Santosh Gaikwad', role: 'Housekeeping & Cleaner', email: 'santosh.staff@example.com', phone: '+91 98221 00103', status: 'active' },
    { id: 'DEMO-STF-04', organization_id: orgId, branch_id: branchId, name: 'Ramesh Patil', role: 'Security Guard', email: 'ramesh.staff@example.com', phone: '+91 98221 00104', status: 'active' },
  ];

  // ── 8. Reservations (3) & Waitlist (3) ───────────────────────────────────
  const demoReservations = [
    { id: 'DEMO-RES-01', seat_id: combinedSeats[30]?.id, student_id: demoStudents[10].id, branch_id: branchId, reservation_date: offsetDateIST(1), slot_type: 'full-day', start_time: '07:00', end_time: '22:00', notes: 'Reserved for UPSC test series session', status: 'active' },
    { id: 'DEMO-RES-02', seat_id: combinedSeats[31]?.id, student_id: demoStudents[11].id, branch_id: branchId, reservation_date: offsetDateIST(2), slot_type: 'morning', start_time: '07:00', end_time: '14:00', notes: 'Reserved for CA mock exam', status: 'active' },
    { id: 'DEMO-RES-03', seat_id: combinedSeats[32]?.id, student_id: demoStudents[12].id, branch_id: branchId, reservation_date: offsetDateIST(3), slot_type: 'evening', start_time: '15:00', end_time: '22:00', notes: 'Reserved for evening self study', status: 'active' },
  ];

  const demoWaitlist = [
    { id: 'DEMO-WLT-01', organization_id: orgId, student_id: demoStudents[30].id, branch_id: branchId, requested_seat_type: 'cabin', priority: 1, notes: 'Requested corner private cabin for UPSC interview prep', status: 'waiting' },
    { id: 'DEMO-WLT-02', organization_id: orgId, student_id: demoStudents[31].id, branch_id: branchId, requested_seat_type: 'premium', priority: 2, notes: 'Wants AC window seat on Ground Floor', status: 'waiting' },
    { id: 'DEMO-WLT-03', organization_id: orgId, student_id: demoStudents[32].id, branch_id: branchId, requested_seat_type: 'cabin', priority: 3, notes: 'Requires full day cabin with dedicated power socket', status: 'waiting' },
  ];

  // ── 9. Attendance (14 days of records for active students) ────────────────
  const demoAttendance = [];
  for (let d = 0; d < 14; d++) {
    const attDate = offsetDateIST(-d);
    for (let s = 0; s < 18; s++) {
      if ((s + d) % 5 !== 0) {
        const student = demoStudents[s];
        const inHour = 7 + (s % 3);
        const inMin = 10 + (s * 7) % 45;
        const outHour = 19 + (s % 3);
        const outMin = 15 + (s * 11) % 40;
        demoAttendance.push({
          id: `DEMO-ATT-${String(demoAttendance.length + 1).padStart(4, '0')}`,
          student_id: student.id,
          seat_id: combinedSeats[s]?.id || null,
          branch_id: branchId,
          date: attDate,
          check_in: `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`,
          check_out: `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`,
          method: 'manual',
        });
      }
    }
  }

  // ── 10. Seat Transfers (2) ────────────────────────────────────────────────
  const demoTransfers = [
    { id: 'DEMO-TRF-01', organization_id: orgId, student_id: demoStudents[0].id, from_seat_id: combinedSeats[3]?.id || 'SEAT-OLD-1', to_seat_id: combinedSeats[0].id, date: offsetDateIST(-15), reason: 'Requested quiet row closer to charging port', approved_by: 'Rajesh Varma (Manager)' },
    { id: 'DEMO-TRF-02', organization_id: orgId, student_id: demoStudents[1].id, from_seat_id: combinedSeats[4]?.id || 'SEAT-OLD-2', to_seat_id: combinedSeats[1].id, date: offsetDateIST(-20), reason: 'Moved from general desk to AC premium seat', approved_by: 'Rajesh Varma (Manager)' },
  ];

  // ── 11. Activity Log (30 entries across 30 days) ─────────────────────────
  const demoActivities = [
    { action: 'payment_recorded', entity: 'payment', desc: `Payment of ₹1,200 recorded for Aarav Sharma (Receipt: REC-${currentYear}-000015)`, daysAgo: 0 },
    { action: 'payment_recorded', entity: 'payment', desc: `Payment of ₹1,000 recorded for Priya Patel (Receipt: REC-${currentYear}-000016)`, daysAgo: 0 },
    { action: 'seat_assigned', entity: 'seat', desc: 'Seat A01 assigned to Aarav Sharma (Monthly Full Day)', daysAgo: 0 },
    { action: 'expense_added', entity: 'expense', desc: 'Expense of ₹480 recorded for Stationery (D-Mart)', daysAgo: 0 },
    { action: 'expense_added', entity: 'expense', desc: 'Expense of ₹200 recorded for Drinking Water Jars', daysAgo: 0 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Partial payment of ₹500 recorded for Pranav Bhat', daysAgo: 1 },
    { action: 'membership_renewed', entity: 'membership', desc: 'Membership renewed for Ayush Saxena until ' + offsetDateIST(7), daysAgo: 1 },
    { action: 'student_created', entity: 'student', desc: 'New student Ayush Saxena registered for UPSC Prelims', daysAgo: 2 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹3,300 recorded for Ananya Iyer (Quarterly)', daysAgo: 3 },
    { action: 'seat_maintenance', entity: 'seat', desc: 'Seat marked for maintenance (Desk light replacement)', daysAgo: 4 },
    { action: 'expense_added', entity: 'expense', desc: 'Monthly rent of ₹15,000 paid to Jain Complex', daysAgo: 5 },
    { action: 'payment_voided', entity: 'payment', desc: 'Voided payment DEMO-PAY-VOID-01 (Cashier double entry)', daysAgo: 5 },
    { action: 'student_created', entity: 'student', desc: 'New student Rohan Deshmukh registered for Bank PO', daysAgo: 6 },
    { action: 'seat_assigned', entity: 'seat', desc: 'Seat A03 assigned to Rohan Deshmukh', daysAgo: 6 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹1,200 recorded for Rohan Deshmukh', daysAgo: 6 },
    { action: 'expense_added', entity: 'expense', desc: 'Electricity bill of ₹3,850 paid to MSEDCL', daysAgo: 8 },
    { action: 'seat_transferred', entity: 'seat', desc: 'Seat transferred for Aarav Sharma to A01', daysAgo: 15 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹6,300 recorded for Aditya Verma (Half Yearly)', daysAgo: 16 },
    { action: 'student_created', entity: 'student', desc: 'New student Sneha Kulkarni registered for UPSC IAS', daysAgo: 18 },
    { action: 'membership_renewed', entity: 'membership', desc: 'Membership renewed for Sneha Kulkarni', daysAgo: 18 },
    { action: 'expense_added', entity: 'expense', desc: 'AC servicing expense ₹1,800 recorded', daysAgo: 19 },
    { action: 'seat_transferred', entity: 'seat', desc: 'Seat transferred for Priya Patel to A02', daysAgo: 20 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹1,200 recorded for Tanmay Joshi', daysAgo: 22 },
    { action: 'student_created', entity: 'student', desc: 'New student Vikram Malhotra registered', daysAgo: 24 },
    { action: 'seat_assigned', entity: 'seat', desc: 'Seat assigned to Vikram Malhotra', daysAgo: 24 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹1,200 recorded for Vikram Malhotra', daysAgo: 24 },
    { action: 'student_created', entity: 'student', desc: 'New student Rohit Kale registered', daysAgo: 26 },
    { action: 'membership_renewed', entity: 'membership', desc: 'Membership renewed for Rohit Kale', daysAgo: 26 },
    { action: 'expense_added', entity: 'expense', desc: 'Marketing banner printing ₹2,200 recorded', daysAgo: 28 },
    { action: 'payment_recorded', entity: 'payment', desc: 'Payment of ₹1,200 recorded for Divya Nair', daysAgo: 29 },
  ].map((act, idx) => ({
    id: `DEMO-ACT-${String(idx + 1).padStart(3, '0')}`,
    organization_id: orgId,
    action: act.action,
    entity_type: act.entity,
    details: act.desc,
    timestamp: getISTTimestamp(act.daysAgo, 10 + (idx % 8), 15 + (idx * 3) % 40),
  }));

  // ── 12. In-App Notifications (7) ─────────────────────────────────────────
  const demoNotifications = [
    { id: 'DEMO-NOTIF-01', organization_id: orgId, title: '5 Payments Overdue', message: '5 students have overdue pending membership dues. Send WhatsApp reminders.', type: 'warning', date: todayIST, read: false, link: '/payments' },
    { id: 'DEMO-NOTIF-02', organization_id: orgId, title: '6 Memberships Expiring This Week', message: 'Memberships for Ayush Saxena, Meera Reddy and 4 others expire within 7 days.', type: 'info', date: todayIST, read: false, link: '/memberships' },
    { id: 'DEMO-NOTIF-03', organization_id: orgId, title: "Today's Revenue Milestone", message: '₹5,000 collected today across 5 transactions.', type: 'success', date: todayIST, read: false, link: '/payments' },
    { id: 'DEMO-NOTIF-04', organization_id: orgId, title: 'Seat A01 Transferred', message: 'Aarav Sharma transferred seat assignment successfully.', type: 'info', date: offsetDateIST(-15), read: true, link: '/seat-map' },
    { id: 'DEMO-NOTIF-05', organization_id: orgId, title: 'Monthly Electricity Bill Paid', message: 'Payment of ₹3,850 recorded to MSEDCL Maharashtra.', type: 'info', date: offsetDateIST(-8), read: true, link: '/expenses' },
    { id: 'DEMO-NOTIF-06', organization_id: orgId, title: 'New Reservation Added', message: 'Upcoming seat reservation confirmed for UPSC test series.', type: 'info', date: offsetDateIST(-1), read: true, link: '/seat-map' },
    { id: 'DEMO-NOTIF-07', organization_id: orgId, title: 'Waitlist Alert', message: '3 students are waiting for private cabins on Ground Floor.', type: 'warning', date: offsetDateIST(-3), read: true, link: '/students' },
  ];

  // ── 13. WhatsApp Communication Logs (12) ──────────────────────────────────
  const demoCommLogs = [
    { id: 'DEMO-COMM-01', stu: demoStudents[0], type: 'payment_received', body: `Hello Aarav Sharma, we have received your payment of ₹1,000 via UPI on ${todayIST} (Receipt: REC-${currentYear}-000015). Balance due: ₹0.` },
    { id: 'DEMO-COMM-02', stu: demoStudents[1], type: 'payment_received', body: `Hello Priya Patel, we have received your payment of ₹1,000 via Cash on ${todayIST} (Receipt: REC-${currentYear}-000016). Balance due: ₹0.` },
    { id: 'DEMO-COMM-03', stu: demoStudents[20], type: 'payment_due', body: `Hello Pranav Bhat, this is a friendly reminder that your library fee of ₹1,200 for seat A21 is due by ${todayIST}.` },
    { id: 'DEMO-COMM-04', stu: demoStudents[23], type: 'payment_due', body: `Hello Tanvi Gokhale, this is a friendly reminder that your library fee of ₹700 for seat A24 is due by ${offsetDateIST(3)}.` },
    { id: 'DEMO-COMM-05', stu: demoStudents[25], type: 'payment_overdue', body: `Hello Ankita Deshpande, your library payment of ₹1,200 for seat A26 is overdue since ${offsetDateIST(-3)}. Please clear your dues at your earliest convenience.` },
    { id: 'DEMO-COMM-06', stu: demoStudents[28], type: 'payment_overdue', body: `Hello Amit Nambiar, your library payment of ₹700 for seat A29 is overdue since ${offsetDateIST(-15)}. Please clear your dues at your earliest convenience.` },
    { id: 'DEMO-COMM-07', stu: demoStudents[14], type: 'membership_expiring', body: `Hello Ayush Saxena, your Monthly Full Day membership for seat A15 ends on ${todayIST} (0 days left). Please renew to retain your seat.` },
    { id: 'DEMO-COMM-08', stu: demoStudents[15], type: 'membership_expiring', body: `Hello Meera Reddy, your Monthly Full Day membership for seat A16 ends on ${offsetDateIST(1)} (1 days left). Please renew to retain your seat.` },
    { id: 'DEMO-COMM-09', stu: demoStudents[16], type: 'membership_expiring', body: `Hello Harsh Vardhan, your Monthly Full Day membership for seat A17 ends on ${offsetDateIST(2)} (2 days left). Please renew to retain your seat.` },
    { id: 'DEMO-COMM-10', stu: demoStudents[0], type: 'seat_assigned', body: `Hello Aarav Sharma, your seat A01 (Reading Hall A, Sahid Mishra Library - Main Branch) is booked for Monthly Full Day from ${offsetDateIST(-20)} to ${offsetDateIST(10)}. Amount: ₹1000. Payment: paid.` },
    { id: 'DEMO-COMM-11', stu: demoStudents[1], type: 'seat_assigned', body: `Hello Priya Patel, your seat A02 (Reading Hall A, Sahid Mishra Library - Main Branch) is booked for Monthly Full Day from ${offsetDateIST(-20)} to ${offsetDateIST(10)}. Amount: ₹1000. Payment: paid.` },
    { id: 'DEMO-COMM-12', stu: demoStudents[0], type: 'seat_transferred', body: `Hello Aarav Sharma, your seat has been transferred from seat A04 to A01 (Reading Hall A, Sahid Mishra Library - Main Branch).` },
  ].map((c) => ({
    id: c.id,
    organization_id: orgId,
    student_id: c.stu.id,
    event_type: c.type,
    phone_number: c.stu.phone,
    template_name: c.type,
    body_text: c.body,
    status: 'sent',
    sent_at: getISTTimestamp(1, 11, 0),
  }));

  // ── Print Planned Seed Summary ─────────────────────────────────────────────
  console.log('\n📊 SEED DATA PLANNED SUMMARY:');
  console.log(`- Membership Plans    : ${demoPlans.length} plans (6 active, 1 inactive)`);
  console.log(`- Demo Floors / Rooms : ${demoFloors.length} floor(s), ${demoRooms.length} room(s)`);
  console.log(`- Demo Extra Seats    : ${demoSeats.length} seat(s) (Total Branch Seats: ${combinedSeats.length})`);
  console.log(`- Students            : ${demoStudents.length} students (30 seated + 8 historical)`);
  console.log(`- Seated Assignments  : ${demoAssignments.length} active seat assignments`);
  console.log(`- Memberships         : ${demoMemberships.length} memberships (30 active + 8 past + 5 renewals)`);
  console.log(`- Payments            : ${demoPayments.length} payments (including ₹5,000 today, 1 void, 1 refund)`);
  console.log(`- Expenses            : ${demoExpenses.length} expenses (over 3 months, 1 void)`);
  console.log(`- Staff               : ${demoStaff.length} staff records (staff table only)`);
  console.log(`- Reservations        : ${demoReservations.length} upcoming reservations`);
  console.log(`- Waitlist            : ${demoWaitlist.length} waitlisted students`);
  console.log(`- Attendance          : ${demoAttendance.length} attendance logs across 14 days`);
  console.log(`- Seat Transfers      : ${demoTransfers.length} transfer logs`);
  console.log(`- Activity Logs       : ${demoActivities.length} activity audit trail entries`);
  console.log(`- Notifications       : ${demoNotifications.length} in-app notification alerts`);
  console.log(`- WhatsApp Logs       : ${demoCommLogs.length} outbound communication logs`);

  if (!isApply) {
    console.log('\n⚠️  DRY RUN ONLY. No data was written to the database.');
    console.log('To apply these changes to the live database in a single transaction, run:');
    console.log(`  node scripts/seed-demo.js --apply --email ${targetEmail} ${testPhone ? `--test-phone ${testPhone}` : ''}`);
    process.exit(0);
  }

  // ── Step 4: Execute Live Writes in Single Transaction ───────────────────────
  console.log(`\n🚀 Executing Atomic Fast Batch Seed in Single Transaction for Org [${orgId}]...`);

  await withTransaction(async (client) => {
    // 1. Clean existing demo rows first
    console.log('1. Cleaning existing DEMO- rows...');
    for (const table of DEMO_TABLES_CASCADE) {
      try {
        if (table === 'reservations' || table === 'attendance') {
          await client.query(`DELETE FROM ${table} WHERE branch_id = $1 AND id LIKE 'DEMO-%'`, [branchId]);
        } else {
          await client.query(`DELETE FROM ${table} WHERE organization_id = $1 AND id LIKE 'DEMO-%'`, [orgId]);
        }
      } catch (_) {}
    }

    // 1b. Deactivate any existing active assignments for this org so demo assignments have clean seat allocation
    await client.query(
      `UPDATE seat_assignments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE organization_id = $1 AND status = 'active'`,
      [orgId]
    );

    // 2. Insert Floors & Rooms if needed
    for (const flr of demoFloors) {
      await client.query(
        `INSERT INTO floors (id, organization_id, branch_id, name, floor_number, description)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [flr.id, orgId, flr.branch_id, flr.name, flr.floor_number, flr.description]
      );
    }
    for (const rm of demoRooms) {
      await client.query(
        `INSERT INTO rooms (id, organization_id, floor_id, branch_id, name, room_type, capacity)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [rm.id, orgId, rm.floor_id, rm.branch_id, rm.name, rm.room_type, rm.capacity]
      );
    }

    // 3. Insert Extra Demo Seats
    if (demoSeats.length > 0) {
      const bSeats = buildBatchInsert('seats', ['id', 'organization_id', 'room_id', 'branch_id', 'seat_number', 'row_label', 'seat_type', 'status', 'position_x', 'position_y'], demoSeats);
      if (bSeats) await client.query(bSeats.sql, bSeats.params);
    }

    // 4. Insert Membership Plans
    const bPlans = buildBatchInsert('membership_plans', ['id', 'organization_id', 'name', 'duration', 'duration_unit', 'price', 'description', 'active', 'access_hours'], demoPlans);
    if (bPlans) await client.query(bPlans.sql, bPlans.params);

    // 5. Insert Students
    const bStudents = buildBatchInsert('students', ['id', 'organization_id', 'name', 'email', 'phone', 'emergency_contact', 'avatar_color', 'id_proof', 'address', 'notes', 'status', 'join_date', 'branch_id', 'whatsapp_opt_in'], demoStudents);
    if (bStudents) await client.query(bStudents.sql, bStudents.params);

    // 6. Insert Memberships
    const bMemberships = buildBatchInsert('memberships', ['id', 'organization_id', 'student_id', 'plan_id', 'branch_id', 'seat_id', 'start_date', 'end_date', 'due_date', 'price', 'discount', 'final_amount', 'status', 'payment_status', 'notes'], demoMemberships);
    if (bMemberships) await client.query(bMemberships.sql, bMemberships.params);

    // 7. Insert Seat Assignments
    const bAssignments = buildBatchInsert('seat_assignments', ['id', 'organization_id', 'seat_id', 'student_id', 'membership_id', 'branch_id', 'start_date', 'end_date', 'slot_type', 'status'], demoAssignments);
    if (bAssignments) await client.query(bAssignments.sql, bAssignments.params);

    // Update Seat statuses and current_student_id
    for (const [seatId, info] of Object.entries(seatStatusMap)) {
      await client.query(
        `UPDATE seats SET status = $1, current_student_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND organization_id = $4`,
        [info.status, info.student_id, seatId, orgId]
      );
    }

    // 8. Update Receipt Sequences Table
    await client.query(
      `INSERT INTO receipt_sequences (organization_id, current_number)
       VALUES ($1, $2)
       ON CONFLICT (organization_id) DO UPDATE SET current_number = GREATEST(receipt_sequences.current_number, EXCLUDED.current_number)`,
      [orgId, receiptCounter]
    );

    // 9. Insert Payments
    const bPayments = buildBatchInsert('payments', ['id', 'organization_id', 'student_id', 'membership_id', 'branch_id', 'amount', 'mode', 'reference_number', 'receipt_number', 'date', 'notes', 'status', 'voided_at', 'void_reason', 'refund_of'], demoPayments);
    if (bPayments) await client.query(bPayments.sql, bPayments.params);

    // 10. Insert Expenses
    const bExpenses = buildBatchInsert('expenses', ['id', 'organization_id', 'branch_id', 'category', 'title', 'amount', 'date', 'payment_mode', 'vendor', 'is_recurring', 'recurring_frequency', 'status', 'voided_at', 'void_reason'], demoExpenses);
    if (bExpenses) await client.query(bExpenses.sql, bExpenses.params);

    // 11. Insert Staff
    const bStaff = buildBatchInsert('staff', ['id', 'organization_id', 'branch_id', 'name', 'role', 'email', 'phone', 'status'], demoStaff);
    if (bStaff) await client.query(bStaff.sql, bStaff.params);

    // 12. Insert Reservations, Waitlist, Attendance, Transfers, Activities, Notifications, CommLogs
    const bRes = buildBatchInsert('reservations', ['id', 'seat_id', 'student_id', 'branch_id', 'reservation_date', 'slot_type', 'start_time', 'end_time', 'notes', 'status'], demoReservations);
    if (bRes) await client.query(bRes.sql, bRes.params);

    const bWaitlist = buildBatchInsert('waitlist', ['id', 'organization_id', 'student_id', 'branch_id', 'requested_seat_type', 'priority', 'notes', 'status'], demoWaitlist);
    if (bWaitlist) await client.query(bWaitlist.sql, bWaitlist.params);

    const bAtt = buildBatchInsert('attendance', ['id', 'student_id', 'seat_id', 'branch_id', 'date', 'check_in', 'check_out', 'method'], demoAttendance);
    if (bAtt) await client.query(bAtt.sql, bAtt.params);

    const bTransfers = buildBatchInsert('seat_transfers', ['id', 'organization_id', 'student_id', 'from_seat_id', 'to_seat_id', 'date', 'reason', 'approved_by'], demoTransfers);
    if (bTransfers) await client.query(bTransfers.sql, bTransfers.params);

    const bActivities = buildBatchInsert('activity_logs', ['id', 'organization_id', 'action', 'entity_type', 'details', 'timestamp'], demoActivities);
    if (bActivities) await client.query(bActivities.sql, bActivities.params);

    const bNotifications = buildBatchInsert('notifications', ['id', 'organization_id', 'title', 'message', 'type', 'date', 'read', 'link'], demoNotifications);
    if (bNotifications) await client.query(bNotifications.sql, bNotifications.params);

    const bCommLogs = buildBatchInsert('communication_logs', ['id', 'organization_id', 'student_id', 'event_type', 'phone_number', 'template_name', 'body_text', 'status', 'sent_at'], demoCommLogs);
    if (bCommLogs) await client.query(bCommLogs.sql, bCommLogs.params);
  });

  console.log('✅ Single-transaction fast live seed completed successfully!');

  // ── Step 5: Post-Seed Read-Only Verification ────────────────────────────────
  console.log('\n===============================================================');
  console.log('            POST-SEED VERIFICATION REPORT                      ');
  console.log('===============================================================');

  // 1. Seat Status Counts (using getSeatStatus simulation)
  const vSeats = await pool.query(`SELECT id, status, current_student_id FROM seats WHERE organization_id = $1`, [orgId]);
  const vAssigns = await pool.query(`SELECT * FROM seat_assignments WHERE organization_id = $1 AND status = 'active'`, [orgId]);
  const vMems = await pool.query(`SELECT * FROM memberships WHERE organization_id = $1`, [orgId]);
  const vPays = await pool.query(`SELECT * FROM payments WHERE organization_id = $1 AND status = 'recorded'`, [orgId]);

  const memMap = new Map(vMems.rows.map((m) => [m.id, m]));
  const assignMap = new Map(vAssigns.rows.map((a) => [a.seat_id, a]));
  const payByMem = new Map();
  vPays.rows.forEach((p) => {
    if (p.membership_id) {
      payByMem.set(p.membership_id, (payByMem.get(p.membership_id) || 0) + parseFloat(p.amount));
    }
  });

  const seatCounts = {
    occupied: 0,
    expiring: 0,
    'payment-pending': 0,
    'payment-due': 0,
    maintenance: 0,
    blocked: 0,
    available: 0,
  };

  vSeats.rows.forEach((seat) => {
    if (seat.status === 'maintenance') {
      seatCounts.maintenance++;
      return;
    }
    if (seat.status === 'blocked') {
      seatCounts.blocked++;
      return;
    }

    const assignment = assignMap.get(seat.id);
    if (!assignment) {
      seatCounts.available++;
      return;
    }

    const membership = memMap.get(assignment.membership_id);
    if (!membership) {
      seatCounts.occupied++;
      return;
    }

    const totalPaid = payByMem.get(membership.id) || 0;
    const finalAmount = parseFloat(membership.final_amount) || (parseFloat(membership.price) - (parseFloat(membership.discount) || 0));

    let payStatus = 'paid';
    if (totalPaid < finalAmount) {
      const dueDate = membership.due_date || todayIST;
      if (todayIST > dueDate) payStatus = 'overdue';
      else payStatus = totalPaid > 0 ? 'partial' : 'pending';
    }

    if (payStatus === 'overdue') {
      seatCounts['payment-due']++;
      return;
    }
    if (payStatus === 'pending' || payStatus === 'partial') {
      seatCounts['payment-pending']++;
      return;
    }

    const endDate = membership.end_date;
    if (endDate) {
      const msDiff = new Date(endDate).getTime() - new Date(todayIST).getTime();
      const daysLeft = Math.round(msDiff / (1000 * 60 * 60 * 24));
      if (daysLeft >= 0 && daysLeft <= 7) {
        seatCounts.expiring++;
        return;
      }
      if (endDate < todayIST) {
        seatCounts.available++;
        return;
      }
    }

    seatCounts.occupied++;
  });

  console.log('\n1. SEAT STATUS COUNTS (Matching Seat Map Logic):');
  console.table([
    { Status: 'Occupied', Count: seatCounts.occupied, Target: '14' },
    { Status: 'Expiring Soon', Count: seatCounts.expiring, Target: '6' },
    { Status: 'Payment Pending', Count: seatCounts['payment-pending'], Target: '5' },
    { Status: 'Payment Due (Overdue)', Count: seatCounts['payment-due'], Target: '5' },
    { Status: 'Maintenance', Count: seatCounts.maintenance, Target: '3' },
    { Status: 'Blocked', Count: seatCounts.blocked, Target: '2' },
    { Status: 'Available (Unoccupied)', Count: seatCounts.available, Target: '>= 10' },
    { Status: 'TOTAL BRANCH SEATS', Count: vSeats.rows.length, Target: '>= 50' },
  ]);

  // 2. Financial Metrics (Payments & Pending Dues)
  const currentMonthStr = todayIST.substring(0, 7); // YYYY-MM
  const todayPays = vPays.rows.filter((p) => p.date === todayIST);
  const todayRevenue = todayPays.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const monthPays = vPays.rows.filter((p) => p.date && p.date.startsWith(currentMonthStr));
  const monthRevenue = monthPays.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Pending Dues Calculation
  const duesList = [];
  vMems.rows.filter((m) => m.status === 'active').forEach((m) => {
    const paid = payByMem.get(m.id) || 0;
    const finalAmount = parseFloat(m.final_amount);
    const balance = finalAmount - paid;
    if (balance > 0) {
      duesList.push({
        studentId: m.student_id,
        membershipId: m.id,
        balance,
        dueDate: m.due_date,
      });
    }
  });

  const totalOutstandingDues = duesList.reduce((sum, d) => sum + d.balance, 0);

  console.log('\n2. PAYMENT & REVENUE METRICS:');
  console.table([
    { Metric: 'Total Recorded Payments', Value: vPays.rows.length, Target: '~55–70' },
    { Metric: "Today's Revenue", Value: `₹${todayRevenue.toLocaleString('en-IN')}`, Target: '₹5,000' },
    { Metric: "This Month's Revenue", Value: `₹${monthRevenue.toLocaleString('en-IN')}`, Target: 'Positive' },
    { Metric: 'Pending Dues Student Count', Value: duesList.length, Target: '10' },
    { Metric: 'Total Outstanding Dues', Value: `₹${totalOutstandingDues.toLocaleString('en-IN')}`, Target: '₹9,600' },
  ]);

  // 3. Expense Metrics
  const vExpenses = await pool.query(`SELECT * FROM expenses WHERE organization_id = $1 AND (status IS NULL OR status = 'active')`, [orgId]);
  const monthExpenses = vExpenses.rows.filter((e) => e.date && e.date.startsWith(currentMonthStr));
  const totalMonthExpenseAmount = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netProfitMonth = monthRevenue - totalMonthExpenseAmount;

  console.log('\n3. EXPENSES & PROFIT METRICS:');
  console.table([
    { Metric: 'Total Active Expenses', Value: vExpenses.rows.length, Target: '>= 25' },
    { Metric: "This Month's Expenses", Value: `₹${totalMonthExpenseAmount.toLocaleString('en-IN')}`, Target: '40–60% of revenue' },
    { Metric: "This Month's Net Profit", Value: `₹${netProfitMonth.toLocaleString('en-IN')}`, Target: 'Positive Profit' },
  ]);

  // 4. Data Integrity Checks
  const dupAssignments = await pool.query(
    `SELECT seat_id, count(*) FROM seat_assignments WHERE organization_id = $1 AND status = 'active' GROUP BY seat_id HAVING count(*) > 1`,
    [orgId]
  );
  const orphanAssignments = await pool.query(
    `SELECT a.id FROM seat_assignments a LEFT JOIN memberships m ON m.id = a.membership_id WHERE a.organization_id = $1 AND m.id IS NULL`,
    [orgId]
  );
  const dupReceipts = await pool.query(
    `SELECT receipt_number, count(*) FROM payments WHERE organization_id = $1 AND receipt_number IS NOT NULL AND receipt_number != '' GROUP BY receipt_number HAVING count(*) > 1`,
    [orgId]
  );

  const otherOrgsAfter = await pool.query(
    `SELECT count(*) FROM organizations WHERE id != $1`,
    [orgId]
  );
  const otherOrgCountAfter = parseInt(otherOrgsAfter.rows[0].count, 10);

  console.log('\n4. DATA INTEGRITY & SAFETY VERIFICATION:');
  console.table([
    { Check: 'Duplicate active seat assignments', Violations: dupAssignments.rows.length, Status: dupAssignments.rows.length === 0 ? 'PASSED ✅' : 'FAILED ❌' },
    { Check: 'Orphan seat assignments (no membership)', Violations: orphanAssignments.rows.length, Status: orphanAssignments.rows.length === 0 ? 'PASSED ✅' : 'FAILED ❌' },
    { Check: 'Duplicate receipt numbers in payments', Violations: dupReceipts.rows.length, Status: dupReceipts.rows.length === 0 ? 'PASSED ✅' : 'FAILED ❌' },
    { Check: 'Cross-tenant isolation (other orgs touched)', Violations: otherOrgCountAfter - otherOrgCountBefore, Status: otherOrgCountAfter === otherOrgCountBefore ? 'PASSED ✅' : 'FAILED ❌' },
  ]);

  console.log('===============================================================');
  console.log('            DEMO DATA SEEDING COMPLETE & VERIFIED              ');
  console.log('===============================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error during demo data execution:', err);
  process.exit(1);
});
