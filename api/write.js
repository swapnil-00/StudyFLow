// api/write.js — Universal write endpoint for all mutations with PostgreSQL transactions & Multi-Tenant Scoping
// POST /api/write with { table, action, data, id }
const { cors, query, withTransaction } = require('./db');
const { ensureMultiTenantSchema } = require('./db-init');
const { getAuthSession } = require('./auth-util');

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  await ensureMultiTenantSchema();

  const session = getAuthSession(req);
  const orgId = session?.orgId || req.body?.orgId || req.body?.organizationId || 'ORG-DEFAULT';
  const { table, action, data, id } = req.body || {};

  try {
    // ── Branches ──────────────────────────────────────────────────
    if (table === 'branches') {
      if (action === 'insert') {
        const b = data;
        const newId = b.id || uid('BR');
        await query(
          `INSERT INTO branches (id,organization_id,name,city,address,phone,email,status,open_time,close_time)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, b.name, b.city || '', b.address || '', b.phone || '', b.email || '', b.status || 'active', b.openTime || '06:00', b.closeTime || '23:00']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const b = data;
        await query(
          `UPDATE branches SET name=$1,city=$2,address=$3,phone=$4,email=$5,status=$6,open_time=$7,close_time=$8 WHERE id=$9 AND organization_id=$10`,
          [b.name, b.city || '', b.address || '', b.phone || '', b.email || '', b.status || 'active', b.openTime || '06:00', b.closeTime || '23:00', id, orgId]
        );
        return res.json({ ok: true });
      }
    }

    // ── Floors ────────────────────────────────────────────────────
    if (table === 'floors') {
      if (action === 'insert') {
        const f = data;
        const newId = f.id || uid('FLR');
        await query(
          `INSERT INTO floors (id,organization_id,branch_id,name,floor_number,description) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, f.branchId, f.name, f.floorNumber || f.level || 1, f.description || '']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const f = data;
        await query(`UPDATE floors SET name=$1,floor_number=$2 WHERE id=$3 AND organization_id=$4`, [f.name, f.floorNumber || f.level || 1, id, orgId]);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await withTransaction(async (client) => {
          const roomRes = await client.query('SELECT id FROM rooms WHERE floor_id=$1 AND organization_id=$2', [id, orgId]);
          const roomIds = roomRes.rows.map(r => r.id);

          if (roomIds.length > 0) {
            const seatRes = await client.query('SELECT id FROM seats WHERE room_id = ANY($1) AND organization_id=$2', [roomIds, orgId]);
            const seatIds = seatRes.rows.map(s => s.id);

            if (seatIds.length > 0) {
              await client.query('UPDATE memberships SET seat_id=NULL WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
              await client.query('DELETE FROM seat_assignments WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
              await client.query('DELETE FROM seats WHERE id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
            }

            await client.query('DELETE FROM rooms WHERE id = ANY($1) AND organization_id=$2', [roomIds, orgId]);
          }

          await client.query('DELETE FROM floors WHERE id=$1 AND organization_id=$2', [id, orgId]);
        });
        return res.json({ ok: true });
      }
    }

    // ── Rooms ─────────────────────────────────────────────────────
    if (table === 'rooms') {
      if (action === 'insert') {
        const r = data;
        const newId = r.id || uid('RM');
        await query(
          `INSERT INTO rooms (id,organization_id,floor_id,branch_id,name,room_type,capacity) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, r.floorId, r.branchId || null, r.name, r.type || 'general', r.capacity || 0]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const r = data;
        await query(`UPDATE rooms SET name=$1,room_type=$2,capacity=$3 WHERE id=$4 AND organization_id=$5`, [r.name, r.type || 'general', r.capacity || 0, id, orgId]);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await withTransaction(async (client) => {
          const seatRes = await client.query('SELECT id FROM seats WHERE room_id=$1 AND organization_id=$2', [id, orgId]);
          const seatIds = seatRes.rows.map(s => s.id);

          if (seatIds.length > 0) {
            await client.query('UPDATE memberships SET seat_id=NULL WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
            await client.query('DELETE FROM seat_assignments WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
            await client.query('DELETE FROM seats WHERE id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
          }

          await client.query('DELETE FROM rooms WHERE id=$1 AND organization_id=$2', [id, orgId]);
        });
        return res.json({ ok: true });
      }
    }

    // ── Seats ─────────────────────────────────────────────────────
    if (table === 'seats') {
      if (action === 'batch_update_positions') {
        const updates = Array.isArray(data) ? data : [];
        if (updates.length > 0) {
          await withTransaction(async (client) => {
            for (const item of updates) {
              await client.query(
                `UPDATE seats SET position_x=$1, position_y=$2 WHERE id=$3 AND organization_id=$4`,
                [parseFloat(item.x) || 0, parseFloat(item.y) || 0, item.id, orgId]
              );
            }
          });
        }
        return res.json({ ok: true, count: updates.length });
      }

      if (action === 'batch_insert') {
        const seatsList = Array.isArray(data) ? data : [];
        if (seatsList.length > 0) {
          // Check seat limit
          const orgRes = await query('SELECT seat_limit, plan FROM organizations WHERE id = $1', [orgId]);
          const seatLimit = orgRes.rows[0]?.seat_limit || 75;
          const currSeats = await query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [orgId]);
          const totalSeatsNow = parseInt(currSeats.rows[0]?.count || 0);

          if (totalSeatsNow + seatsList.length > seatLimit) {
            return res.status(403).json({
              ok: false,
              error: `Adding ${seatsList.length} seats would exceed your plan limit of ${seatLimit} seats. Please upgrade your subscription.`
            });
          }

          await withTransaction(async (client) => {
            for (const s of seatsList) {
              const newId = s.id || uid('SEAT');
              await client.query(
                `INSERT INTO seats (id,organization_id,room_id,branch_id,seat_number,row_label,seat_type,amenities,status,position_x,position_y)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
                [newId, orgId, s.roomId, s.branchId || null, s.label || s.number || newId, s.row || '', s.type || 'standard',
                 JSON.stringify(s.amenities || []), s.status || 'available', s.position?.x || s.position_x || 0, s.position?.y || s.position_y || 0]
              );
            }
          });
        }
        return res.json({ ok: true, count: seatsList.length });
      }

      if (action === 'insert') {
        const s = data;
        const newId = s.id || uid('SEAT');

        // Check seat limit
        const orgRes = await query('SELECT seat_limit, plan FROM organizations WHERE id = $1', [orgId]);
        const seatLimit = orgRes.rows[0]?.seat_limit || 75;
        const currSeats = await query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [orgId]);
        if (parseInt(currSeats.rows[0]?.count || 0) >= seatLimit) {
          return res.status(403).json({
            ok: false,
            error: `Seat limit of ${seatLimit} reached for your current plan. Please upgrade your subscription.`
          });
        }

        await query(
          `INSERT INTO seats (id,organization_id,room_id,branch_id,seat_number,row_label,seat_type,amenities,status,position_x,position_y)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, s.roomId, s.branchId || null, s.label || s.number || newId, s.row || '', s.type || 'standard',
           JSON.stringify(s.amenities || []), s.status || 'available', s.position?.x || s.position_x || 0, s.position?.y || s.position_y || 0]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const s = data;
        const fields = [], vals = [];
        if (s.status !== undefined) { fields.push(`status=$${fields.length + 1}`); vals.push(s.status); }
        if (s.label !== undefined) { fields.push(`seat_number=$${fields.length + 1}`); vals.push(s.label); }
        if (s.type !== undefined) { fields.push(`seat_type=$${fields.length + 1}`); vals.push(s.type); }
        if (s.amenities !== undefined) { fields.push(`amenities=$${fields.length + 1}`); vals.push(JSON.stringify(s.amenities)); }
        if (s.row !== undefined) { fields.push(`row_label=$${fields.length + 1}`); vals.push(s.row); }
        if (s.currentStudentId !== undefined) { fields.push(`current_student_id=$${fields.length + 1}`); vals.push(s.currentStudentId || null); }
        if (s.position !== undefined) {
          if (s.position.x !== undefined) { fields.push(`position_x=$${fields.length + 1}`); vals.push(parseFloat(s.position.x) || 0); }
          if (s.position.y !== undefined) { fields.push(`position_y=$${fields.length + 1}`); vals.push(parseFloat(s.position.y) || 0); }
        }
        if (s.position_x !== undefined) { fields.push(`position_x=$${fields.length + 1}`); vals.push(parseFloat(s.position_x) || 0); }
        if (s.position_y !== undefined) { fields.push(`position_y=$${fields.length + 1}`); vals.push(parseFloat(s.position_y) || 0); }
        if (fields.length === 0) return res.json({ ok: true });
        vals.push(id);
        vals.push(orgId);
        await query(`UPDATE seats SET ${fields.join(',')} WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await withTransaction(async (client) => {
          await client.query('UPDATE memberships SET seat_id=NULL WHERE seat_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('DELETE FROM seat_assignments WHERE seat_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('UPDATE seat_transfers SET from_seat_id=NULL WHERE from_seat_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('UPDATE seat_transfers SET to_seat_id=NULL WHERE to_seat_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('DELETE FROM seats WHERE id=$1 AND organization_id=$2', [id, orgId]);
        });
        return res.json({ ok: true });
      }
    }

    // ── Students ──────────────────────────────────────────────────
    if (table === 'students') {
      if (action === 'insert') {
        const s = data;
        const newId = s.id || uid('STU');
        await query(
          `INSERT INTO students (id,organization_id,name,email,phone,emergency_contact,avatar_color,id_proof,address,notes,status,join_date,branch_id,country_code,normalized_phone,whatsapp_opt_in,communication_preferences)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, s.name, s.email || '', s.phone || '', s.emergencyContact || '',
           s.avatar || s.avatarColor || '#6172f3', s.idProof || '', s.address || '',
           s.notes || '', s.status || 'active', s.joinDate || now().split('T')[0],
           s.branchId || null, s.country_code || '+91', s.normalized_phone || s.phone || '',
           s.whatsapp_opt_in !== false,
           JSON.stringify(s.communication_preferences || { whatsapp: true, payment_reminders: true, membership_reminders: true, booking_notifications: true, receipt_notifications: true, announcements: true })]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const s = data;
        const map = { name: 'name', email: 'email', phone: 'phone', emergencyContact: 'emergency_contact', avatar: 'avatar_color', avatarColor: 'avatar_color', idProof: 'id_proof', address: 'address', notes: 'notes', status: 'status', joinDate: 'join_date', branchId: 'branch_id', country_code: 'country_code', normalized_phone: 'normalized_phone', whatsapp_opt_in: 'whatsapp_opt_in' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (s[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(s[k]); }
        }
        if (fields.length === 0) return res.json({ ok: true });
        vals.push(id);
        vals.push(orgId);
        await query(`UPDATE students SET ${fields.join(',')} WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await query('DELETE FROM students WHERE id=$1 AND organization_id=$2', [id, orgId]);
        return res.json({ ok: true });
      }
    }

    // ── Membership Plans ──────────────────────────────────────────
    if (table === 'membership_plans') {
      if (action === 'insert') {
        const p = data;
        const newId = p.id || uid('PLAN');
        await query(
          `INSERT INTO membership_plans (id,organization_id,name,duration,duration_unit,price,description,active,access_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, p.name, p.duration, p.durationUnit || 'days', p.price, p.description || '', p.active !== false, p.accessHours || '']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const p = data;
        await query(
          `UPDATE membership_plans SET name=$1,duration=$2,duration_unit=$3,price=$4,description=$5,active=$6,access_hours=$7 WHERE id=$8 AND organization_id=$9`,
          [p.name, p.duration, p.durationUnit || 'days', p.price, p.description || '', p.active !== false, p.accessHours || '', id, orgId]
        );
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await withTransaction(async (client) => {
          await client.query('UPDATE memberships SET plan_id=NULL WHERE plan_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('DELETE FROM membership_plans WHERE id=$1 AND organization_id=$2', [id, orgId]);
        });
        return res.json({ ok: true });
      }
    }

    // ── Memberships ───────────────────────────────────────────────
    if (table === 'memberships') {
      if (action === 'insert') {
        const m = data;
        const newId = m.id || uid('MEM');
        await query(
          `INSERT INTO memberships (id,organization_id,student_id,plan_id,branch_id,seat_id,start_date,end_date,price,discount,final_amount,status,payment_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, m.studentId, m.planId || null, m.branchId || null, m.seatId || null,
           m.startDate, m.endDate, m.price, m.discount || 0, m.finalAmount || m.price,
           m.status || 'active', m.paymentStatus || 'paid']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const m = data;
        const map = { studentId: 'student_id', planId: 'plan_id', branchId: 'branch_id', seatId: 'seat_id', startDate: 'start_date', endDate: 'end_date', price: 'price', discount: 'discount', finalAmount: 'final_amount', status: 'status', paymentStatus: 'payment_status' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (m[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(m[k] || null); }
        }
        if (fields.length === 0) return res.json({ ok: true });
        vals.push(id);
        vals.push(orgId);
        await query(`UPDATE memberships SET ${fields.join(',')} WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await withTransaction(async (client) => {
          const seatRes = await client.query('SELECT seat_id FROM seat_assignments WHERE membership_id=$1 AND status=$2 AND organization_id=$3', [id, 'active', orgId]);
          for (const row of seatRes.rows) {
            if (row.seat_id) {
              await client.query("UPDATE seats SET status='available', current_student_id=NULL WHERE id=$1 AND organization_id=$2", [row.seat_id, orgId]);
            }
          }
          await client.query('UPDATE payments SET membership_id=NULL WHERE membership_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('UPDATE documents SET membership_id=NULL WHERE membership_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('DELETE FROM seat_assignments WHERE membership_id=$1 AND organization_id=$2', [id, orgId]);
          await client.query('DELETE FROM memberships WHERE id=$1 AND organization_id=$2', [id, orgId]);
        });
        return res.json({ ok: true });
      }
    }

    // ── Seat Assignments (Concurrency Protected with PostgreSQL Transactions) ──
    if (table === 'seat_assignments') {
      if (action === 'insert') {
        const a = data;
        const newId = a.id || uid('ASN');

        return await withTransaction(async client => {
          const check = await client.query(
            'SELECT id, student_id FROM seat_assignments WHERE seat_id = $1 AND status = $2 AND organization_id = $3 FOR UPDATE',
            [a.seatId, 'active', orgId]
          );
          if (check.rows.length > 0) {
            return res.status(409).json({ ok: false, error: 'Seat is already occupied by an active student.' });
          }

          await client.query(
            `INSERT INTO seat_assignments (id,organization_id,seat_id,student_id,membership_id,branch_id,start_date,end_date,slot_type,status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [newId, orgId, a.seatId, a.studentId, a.membershipId || null, a.branchId || null,
             a.startDate || now(), a.endDate, a.slotType || 'full-day', a.status || 'active']
          );

          await client.query(
            `UPDATE seats SET status = 'occupied', current_student_id = $1 WHERE id = $2 AND organization_id = $3`,
            [a.studentId, a.seatId, orgId]
          );

          return res.json({ ok: true, id: newId });
        });
      }

      if (action === 'release') {
        const { seatId } = data || {};
        return await withTransaction(async client => {
          await client.query(
            `UPDATE seat_assignments SET status = 'released'
             WHERE seat_id = $1 AND status = 'active' AND organization_id = $2`,
            [seatId, orgId]
          );
          await client.query(
            `UPDATE seats SET status = 'available', current_student_id = NULL WHERE id = $1 AND organization_id = $2`,
            [seatId, orgId]
          );
          return res.json({ ok: true });
        });
      }

      if (action === 'transfer') {
        const { fromSeatId, toSeatId, studentId, reason } = data || {};
        const newAssignmentId = uid('ASN');
        const transferId = uid('TRF');

        return await withTransaction(async client => {
          const destCheck = await client.query(
            'SELECT id FROM seat_assignments WHERE seat_id = $1 AND status = $2 AND organization_id = $3 FOR UPDATE',
            [toSeatId, 'active', orgId]
          );
          if (destCheck.rows.length > 0) {
            return res.status(409).json({ ok: false, error: 'Destination seat is already occupied.' });
          }

          let curr = await client.query(
            'SELECT * FROM seat_assignments WHERE seat_id = $1 AND status = $2 AND organization_id = $3 FOR UPDATE',
            [fromSeatId, 'active', orgId]
          );
          if (curr.rows.length === 0 && studentId) {
            curr = await client.query(
              'SELECT * FROM seat_assignments WHERE student_id = $1 AND status = $2 AND organization_id = $3 FOR UPDATE',
              [studentId, 'active', orgId]
            );
          }
          if (curr.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Source seat has no active assignment.' });
          }
          const old = curr.rows[0];
          const actualFromSeatId = old.seat_id || fromSeatId;

          await client.query(`UPDATE seat_assignments SET status = 'transferred' WHERE id = $1 AND organization_id = $2`, [old.id, orgId]);
          await client.query(`UPDATE seats SET status = 'available', current_student_id = NULL WHERE id = $1 AND organization_id = $2`, [actualFromSeatId, orgId]);
          await client.query(
            `INSERT INTO seat_assignments (id,organization_id,seat_id,student_id,membership_id,branch_id,start_date,end_date,slot_type,status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [newAssignmentId, orgId, toSeatId, old.student_id, old.membership_id, old.branch_id, now(), old.end_date, old.slot_type, 'active']
          );
          await client.query(`UPDATE seats SET status = 'occupied', current_student_id = $1 WHERE id = $2 AND organization_id = $3`, [old.student_id, toSeatId, orgId]);
          await client.query(
            `INSERT INTO seat_transfers (id,organization_id,student_id,from_seat_id,to_seat_id,date,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [transferId, orgId, studentId || old.student_id, actualFromSeatId, toSeatId, now(), reason || '']
          );

          return res.json({ ok: true, id: newAssignmentId, transferId });
        });
      }
    }

    // ── Payments ──────────────────────────────────────────────────
    if (table === 'payments') {
      if (action === 'insert') {
        const p = data;
        const newId = p.id || uid('PAY');
        await query(
          `INSERT INTO payments (id,organization_id,student_id,membership_id,branch_id,amount,mode,reference_number,date,notes,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, p.studentId, p.membershipId || null, p.branchId || null,
           p.amount, p.method || p.mode || 'upi', p.receiptNumber || p.referenceNumber || '',
           p.date || now().split('T')[0], p.notes || '', p.status || 'recorded']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Expenses ──────────────────────────────────────────────────
    if (table === 'expenses') {
      if (action === 'insert') {
        const e = data;
        const newId = e.id || uid('EXP');
        await query(
          `INSERT INTO expenses (id,organization_id,branch_id,category,title,amount,date,payment_mode,vendor,receipt_ref,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, e.branchId || null, e.category || 'General', e.title || e.description || 'Expense',
           e.amount, e.date || now().split('T')[0], e.method || e.paymentMode || 'cash',
           e.vendor || '', e.receiptRef || '', e.recordedBy || '']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Notifications (In-App) ────────────────────────────────────
    if (table === 'notifications') {
      if (action === 'insert') {
        const n = data;
        const newId = n.id || uid('NOTIF');
        await query(
          `INSERT INTO notifications (id,organization_id,title,message,type,date,read,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, n.title || 'Notification', n.message || '', n.type || 'info', n.date || now().split('T')[0], n.read || false, n.link || '']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'markRead') {
        if (id) await query('UPDATE notifications SET read=true WHERE id=$1 AND organization_id=$2', [id, orgId]);
        else await query('UPDATE notifications SET read=true WHERE organization_id=$1', [orgId]);
        return res.json({ ok: true });
      }
    }

    // ── Activity Log ──────────────────────────────────────────────
    if (table === 'activity_logs') {
      if (action === 'insert') {
        const a = data;
        const newId = a.id || uid('ACT');
        await query(
          `INSERT INTO activity_logs (id,organization_id,user_id,action,details,timestamp,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, a.userId || session?.name || 'admin', a.action, a.description || a.details || '', a.timestamp || now(), a.entity || a.entityType || '', a.entityId || '']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Staff ─────────────────────────────────────────────────────
    if (table === 'staff') {
      if (action === 'insert') {
        const s = data;
        const newId = s.id || uid('STF');
        await query(
          `INSERT INTO staff (id,organization_id,name,role,email,phone,branch_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [newId, orgId, s.name, s.role || 'Staff', s.email || '', s.phone || '', s.branchId || null, s.status || 'active']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'delete') {
        await query('DELETE FROM staff WHERE id=$1 AND organization_id=$2', [id, orgId]);
        return res.json({ ok: true });
      }
    }

    // ── Settings ──────────────────────────────────────────────────
    if (table === 'settings') {
      if (action === 'update') {
        const s = data;
        await query(
          `INSERT INTO settings (id,organization_id,currency,timezone,org_name,address,phone,email,theme,data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             currency=EXCLUDED.currency, timezone=EXCLUDED.timezone, org_name=EXCLUDED.org_name,
             address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email,
             theme=EXCLUDED.theme, data=EXCLUDED.data, updated_at=CURRENT_TIMESTAMP`,
          [orgId, orgId, s.currency || 'INR', s.timezone || 'Asia/Kolkata', s.orgName || 'StudyFlow Library',
           s.address || '', s.phone || '', s.email || '', s.theme || 'light', JSON.stringify(s)]
        );
        return res.json({ ok: true });
      }
    }

    // ── Documents (Invoices & Receipts) ───────────────────────────
    if (table === 'documents') {
      if (action === 'insert' || action === 'save') {
        const d = data;
        const newId = d.id || uid('DOC');
        await query(
          `INSERT INTO documents (id, organization_id, document_type, document_number, student_id, branch_id, membership_id, document_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET document_data = EXCLUDED.document_data`,
          [newId, orgId, d.documentType || 'invoice', d.documentNumber || newId, d.studentId || null, d.branchId || null, d.membershipId || null, JSON.stringify(d)]
        );
        return res.json({ ok: true, id: newId });
      }
    }

    return res.status(400).json({ ok: false, error: `Unknown table/action: ${table}/${action}` });

  } catch (err) {
    console.error('API /write error:', err);
    const isConflict = err.message && err.message.includes('unique constraint');
    res.status(isConflict ? 409 : 500).json({
      ok: false,
      error: isConflict ? 'A conflict occurred with an existing active record.' : err.message
    });
  }
};
