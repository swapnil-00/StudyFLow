// StudyFlow — Neon DB PostgreSQL Migration & Seeder Script
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// Ensure reliable DNS resolution for Neon endpoints
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const origLookup = dns.lookup;
  dns.lookup = function(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) {
          callback(null, addresses.map(a => ({ address: a, family: 4 })));
        } else {
          callback(null, addresses[0], 4);
        }
      } else {
        origLookup(hostname, options, callback);
      }
    });
  };
} catch (e) {}

let DATABASE_URL = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('channel_binding=require', '');

async function batchInsert(client, table, columns, rows) {
  if (!rows || rows.length === 0) return;
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const values = [];
    let paramIdx = 1;
    for (const row of chunk) {
      const placeholders = [];
      for (const col of columns) {
        placeholders.push(`$${paramIdx++}`);
        values.push(row[col] !== undefined ? row[col] : null);
      }
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
    }
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT (id) DO NOTHING`;
    await client.query(query, values);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🚀 StudyFlow — Neon DB Migration Tool');
  console.log('======================================================\n');

  if (!DATABASE_URL || DATABASE_URL.includes('YOUR_NEON_PASSWORD_HERE') || DATABASE_URL.includes('sample')) {
    console.error('⚠️  DATABASE_URL is not configured with your real Neon connection string!\n');
    console.log('👉 To connect to Neon DB:');
    console.log('   1. Open: https://console.neon.tech');
    console.log('   2. Select your Project -> Dashboard');
    console.log('   3. Under "Connection Details", copy the connection string');
    console.log('   4. Paste into c:\\Working Directory\\SangarshLibrary\\studyflow\\.env');
    console.log('   5. Run: npm run migrate\n');
    process.exit(1);
  }

  console.log('📡 Connecting to Neon DB...');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  let client;
  try {
    client = await pool.connect();
    const testRes = await client.query('SELECT current_database() as db, version() as version, NOW() as server_time');
    console.log(`✅ Connected successfully!`);
    console.log(`   Database:    ${testRes.rows[0].db}`);
    console.log(`   Server Time: ${testRes.rows[0].server_time}`);
    console.log(`   Version:     ${testRes.rows[0].version.split(' ')[0]} ${testRes.rows[0].version.split(' ')[1]}\n`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  }

  try {
    // 1. Run Schema
    console.log('📦 Executing schema (db/schema.sql)...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    
    // Ensure all optional columns don't block inserts
    await client.query(`ALTER TABLE rooms ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE seats ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE memberships ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE payments ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE attendance ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE seat_assignments ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE expenses ALTER COLUMN title DROP NOT NULL`).catch(() => {});
    await client.query(`ALTER TABLE expenses ALTER COLUMN branch_id DROP NOT NULL`).catch(() => {});
    console.log('✅ Schema and indexes applied successfully.\n');

    // 2. Check if branches exist
    const branchCheck = await client.query('SELECT COUNT(*) as count FROM branches');
    const existingCount = parseInt(branchCheck.rows[0].count, 10);

    if (existingCount > 0) {
      console.log(`ℹ️  Database already contains ${existingCount} branch records. Skipping seed.`);
    } else {
      console.log('🌱 Generating and inserting seed data into Neon DB...');

      // Generate seed data from store.js and seed.js
      const storeCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
      const seedCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'seed.js'), 'utf8');
      const sandbox = {
        window: {},
        localStorage: { getItem: () => null, setItem: () => null },
        console: console,
      };
      vm.createContext(sandbox);
      vm.runInContext(storeCode, sandbox);
      sandbox.utils = sandbox.window.utils;
      vm.runInContext(seedCode, sandbox);
      const db = sandbox.seedDatabase();

      await client.query('BEGIN');

      // 1. Branches
      console.log(`   Inserting ${db.branches.length} branches...`);
      await batchInsert(client, 'branches', ['id', 'name', 'city', 'address', 'phone', 'email', 'status', 'open_time', 'close_time'], db.branches.map(b => ({
        id: b.id, name: b.name, city: b.city, address: b.address, phone: b.phone, email: b.email,
        status: b.status || 'active', open_time: b.openTime || '06:00', close_time: b.closeTime || '23:00'
      })));

      // 2. Floors
      console.log(`   Inserting ${db.floors.length} floors...`);
      await batchInsert(client, 'floors', ['id', 'branch_id', 'name', 'floor_number', 'description'], db.floors.map(f => ({
        id: f.id, branch_id: f.branchId, name: f.name, floor_number: f.floorNumber || f.level || 1, description: f.description || ''
      })));

      // 3. Rooms
      console.log(`   Inserting ${db.rooms.length} rooms...`);
      await batchInsert(client, 'rooms', ['id', 'floor_id', 'branch_id', 'name', 'room_type', 'capacity'], db.rooms.map(r => {
        const floor = db.floors.find(f => f.id === r.floorId);
        return {
          id: r.id, floor_id: r.floorId, branch_id: r.branchId || floor?.branchId || db.branches[0].id,
          name: r.name, room_type: r.type || 'general', capacity: r.capacity || 0
        };
      }));

      // 4. Seats
      console.log(`   Inserting ${db.seats.length} seats...`);
      await batchInsert(client, 'seats', ['id', 'room_id', 'branch_id', 'seat_number', 'row_label', 'seat_type', 'amenities', 'status', 'current_student_id', 'position_x', 'position_y'], db.seats.map(s => {
        const room = db.rooms.find(rm => rm.id === s.roomId);
        const floor = db.floors.find(fl => fl.id === room?.floorId);
        const branchId = s.branchId || floor?.branchId || db.branches[0].id;
        const seatNumber = s.number || s.label || s.id.split('-').pop();
        return {
          id: s.id, room_id: s.roomId, branch_id: branchId, seat_number: seatNumber, row_label: s.row || '',
          seat_type: s.type || 'standard', amenities: JSON.stringify(s.amenities || []),
          status: s.status || 'available', current_student_id: s.currentStudentId || null,
          position_x: s.position?.x || 0, position_y: s.position?.y || 0
        };
      }));

      // 5. Students
      console.log(`   Inserting ${db.students.length} students...`);
      await batchInsert(client, 'students', ['id', 'name', 'email', 'phone', 'emergency_contact', 'avatar_color', 'id_proof', 'address', 'notes', 'status', 'join_date'], db.students.map(st => ({
        id: st.id, name: st.name, email: st.email || '', phone: st.phone || '', emergency_contact: st.emergencyContact || '',
        avatar_color: st.avatarColor || '#6172f3', id_proof: st.idProof || '', address: st.address || '',
        notes: st.notes || '', status: st.status || 'active', join_date: st.joinDate || ''
      })));

      // 6. Plans
      console.log(`   Inserting ${db.membershipPlans.length} plans...`);
      await batchInsert(client, 'membership_plans', ['id', 'name', 'duration', 'duration_unit', 'price', 'description', 'active', 'access_hours'], db.membershipPlans.map(p => ({
        id: p.id, name: p.name, duration: p.duration, duration_unit: p.durationUnit || 'days', price: p.price,
        description: p.description || '', active: p.active !== false, access_hours: p.accessHours || ''
      })));

      // 7. Memberships
      console.log(`   Inserting ${db.memberships.length} memberships...`);
      await batchInsert(client, 'memberships', ['id', 'student_id', 'plan_id', 'branch_id', 'seat_id', 'start_date', 'end_date', 'price', 'discount', 'final_amount', 'status', 'payment_status'], db.memberships.map(m => {
        const student = db.students.find(s => s.id === m.studentId);
        const branchId = m.branchId || student?.branchId || db.branches[0].id;
        return {
          id: m.id, student_id: m.studentId, plan_id: m.planId, branch_id: branchId, seat_id: m.seatId || null,
          start_date: m.startDate, end_date: m.endDate, price: m.price, discount: m.discount || 0,
          final_amount: m.finalAmount || m.price, status: m.status || 'active', payment_status: m.paymentStatus || 'paid'
        };
      }));

      // 8. Seat Assignments
      if (db.seatAssignments && db.seatAssignments.length > 0) {
        console.log(`   Inserting ${db.seatAssignments.length} seat assignments...`);
        await batchInsert(client, 'seat_assignments', ['id', 'seat_id', 'student_id', 'membership_id', 'branch_id', 'start_date', 'end_date', 'slot_type', 'status'], db.seatAssignments.map(a => {
          const student = db.students.find(s => s.id === a.studentId);
          return {
            id: a.id, seat_id: a.seatId, student_id: a.studentId, membership_id: a.membershipId,
            branch_id: a.branchId || student?.branchId || db.branches[0].id,
            start_date: a.startDate, end_date: a.endDate, slot_type: a.slotType || 'full-day', status: a.status || 'active'
          };
        }));
      }

      // 9. Payments
      console.log(`   Inserting ${db.payments.length} payments...`);
      await batchInsert(client, 'payments', ['id', 'student_id', 'membership_id', 'branch_id', 'amount', 'mode', 'reference_number', 'date', 'notes', 'status'], db.payments.map(pay => {
        const student = db.students.find(s => s.id === pay.studentId);
        return {
          id: pay.id, student_id: pay.studentId, membership_id: pay.membershipId || null,
          branch_id: pay.branchId || student?.branchId || db.branches[0].id,
          amount: pay.amount, mode: pay.method || pay.mode || 'upi', reference_number: pay.receiptNumber || pay.referenceNumber || '',
          date: pay.date || pay.recordedAt || '', notes: pay.notes || '', status: pay.status || 'success'
        };
      }));

      // 10. Attendance
      if (db.attendance && db.attendance.length > 0) {
        console.log(`   Inserting ${db.attendance.length} attendance records...`);
        await batchInsert(client, 'attendance', ['id', 'student_id', 'seat_id', 'branch_id', 'check_in', 'check_out', 'date', 'method'], db.attendance.map(att => {
          const student = db.students.find(s => s.id === att.studentId);
          return {
            id: att.id, student_id: att.studentId, seat_id: att.seatId || null,
            branch_id: att.branchId || student?.branchId || db.branches[0].id,
            check_in: att.checkIn, check_out: att.checkOut || null, date: att.date, method: att.method || 'manual'
          };
        }));
      }

      // 11. Expenses
      if (db.expenses && db.expenses.length > 0) {
        console.log(`   Inserting ${db.expenses.length} expenses...`);
        await batchInsert(client, 'expenses', ['id', 'branch_id', 'category', 'title', 'amount', 'date', 'payment_mode', 'vendor', 'receipt_ref', 'recorded_by'], db.expenses.map(exp => ({
          id: exp.id, branch_id: exp.branchId || db.branches[0].id, category: exp.category || 'General',
          title: exp.title || exp.description || exp.category || 'Expense', amount: exp.amount, date: exp.date,
          payment_mode: exp.method || exp.paymentMode || 'cash', vendor: exp.vendor || '', receipt_ref: exp.receiptRef || '', recorded_by: exp.recordedBy || ''
        })));
      }

      // 12. Staff
      if (db.staff && db.staff.length > 0) {
        console.log(`   Inserting ${db.staff.length} staff records...`);
        await batchInsert(client, 'staff', ['id', 'name', 'role', 'email', 'phone', 'branch_id', 'status'], db.staff.map(stf => ({
          id: stf.id, name: stf.name, role: stf.role || 'Staff', email: stf.email || '', phone: stf.phone || '',
          branch_id: stf.branchId || null, status: stf.status || 'active'
        })));
      }

      // 13. Notifications
      if (db.notifications && db.notifications.length > 0) {
        console.log(`   Inserting ${db.notifications.length} notifications...`);
        await batchInsert(client, 'notifications', ['id', 'title', 'message', 'type', 'date', 'read', 'link'], db.notifications.map(n => ({
          id: n.id, title: n.title || (n.type ? n.type.toUpperCase() : 'Notification'), message: n.message || '',
          type: n.type || 'info', date: n.date || n.createdAt || '', read: n.read || false, link: n.link || ''
        })));
      }

      // 14. Activity Log
      if (db.activityLog && db.activityLog.length > 0) {
        console.log(`   Inserting ${db.activityLog.length} activity records...`);
        await batchInsert(client, 'activity_logs', ['id', 'user_id', 'action', 'details', 'timestamp', 'entity_type', 'entity_id'], db.activityLog.map(act => ({
          id: act.id, user_id: act.userId || 'system', action: act.action, details: act.details || act.description || '',
          timestamp: act.timestamp, entity_type: act.entityType || act.entity || '', entity_id: act.entityId || ''
        })));
      }

      // 15. Settings
      await client.query(
        `INSERT INTO settings (id, currency, timezone, org_name, address, phone, email, theme, data)
         VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           currency = EXCLUDED.currency,
           timezone = EXCLUDED.timezone,
           org_name = EXCLUDED.org_name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           theme = EXCLUDED.theme,
           data = EXCLUDED.data`,
        [
          db.settings.currency || 'INR',
          db.settings.timezone || 'Asia/Kolkata',
          db.settings.orgName || 'StudyFlow Library',
          db.settings.address || '',
          db.settings.phone || '',
          db.settings.email || '',
          db.settings.theme || 'light',
          JSON.stringify(db.settings)
        ]
      );

      await client.query('COMMIT');
      console.log('✅ Seed data successfully inserted into Neon DB!\n');
    }

    // 3. Print verification table
    console.log('📊 Current Neon Database Record Counts:');
    console.log('-------------------------------------------');
    const tables = ['branches', 'floors', 'rooms', 'seats', 'students', 'membership_plans', 'memberships', 'payments', 'attendance', 'expenses', 'staff', 'activity_logs', 'settings'];
    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*) as c FROM ${t}`);
      console.log(`   ${t.padEnd(20)} : ${r.rows[0].c} records`);
    }
    console.log('-------------------------------------------\n');
    console.log('🎉 Migration completed successfully! StudyFlow is ready on Neon DB.\n');

  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main();
