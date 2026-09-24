// api/write.js — Universal write endpoint for all mutations
// POST /api/write with { table, action, data }
const { cors, query, getPool } = require('./db');

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const { table, action, data, id } = req.body || {};

  try {
    // ── Branches ──────────────────────────────────────────────────
    if (table === 'branches') {
      if (action === 'insert') {
        const b = data;
        await query(
          `INSERT INTO branches (id,name,city,address,phone,email,status,open_time,close_time)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [b.id||uid('BR'), b.name, b.city||'', b.address||'', b.phone||'', b.email||'', b.status||'active', b.openTime||'06:00', b.closeTime||'23:00']
        );
        return res.json({ ok: true });
      }
      if (action === 'update') {
        const b = data;
        await query(
          `UPDATE branches SET name=$1,city=$2,address=$3,phone=$4,email=$5,status=$6,open_time=$7,close_time=$8 WHERE id=$9`,
          [b.name, b.city||'', b.address||'', b.phone||'', b.email||'', b.status||'active', b.openTime||'06:00', b.closeTime||'23:00', id]
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
          `INSERT INTO floors (id,branch_id,name,floor_number,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [newId, f.branchId, f.name, f.floorNumber||f.level||1, f.description||'']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Rooms ─────────────────────────────────────────────────────
    if (table === 'rooms') {
      if (action === 'insert') {
        const r = data;
        const newId = r.id || uid('RM');
        await query(
          `INSERT INTO rooms (id,floor_id,branch_id,name,room_type,capacity) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [newId, r.floorId, r.branchId||null, r.name, r.type||'general', r.capacity||0]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const r = data;
        await query(`UPDATE rooms SET name=$1,room_type=$2,capacity=$3 WHERE id=$4`, [r.name, r.type||'general', r.capacity||0, id]);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await query('DELETE FROM rooms WHERE id=$1', [id]);
        return res.json({ ok: true });
      }
    }

    // ── Seats ─────────────────────────────────────────────────────
    if (table === 'seats') {
      if (action === 'insert') {
        const s = data;
        const newId = s.id || uid('SEAT');
        await query(
          `INSERT INTO seats (id,room_id,branch_id,seat_number,row_label,seat_type,amenities,status,position_x,position_y)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [newId, s.roomId, s.branchId||null, s.label||s.number||newId, s.row||'', s.type||'standard',
           JSON.stringify(s.amenities||[]), s.status||'available', s.position?.x||0, s.position?.y||0]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const s = data;
        const fields = [], vals = [];
        if (s.status !== undefined) { fields.push(`status=$${fields.length+1}`); vals.push(s.status); }
        if (s.label !== undefined) { fields.push(`seat_number=$${fields.length+1}`); vals.push(s.label); }
        if (s.type !== undefined) { fields.push(`seat_type=$${fields.length+1}`); vals.push(s.type); }
        if (s.amenities !== undefined) { fields.push(`amenities=$${fields.length+1}`); vals.push(JSON.stringify(s.amenities)); }
        if (s.row !== undefined) { fields.push(`row_label=$${fields.length+1}`); vals.push(s.row); }
        if (s.currentStudentId !== undefined) { fields.push(`current_student_id=$${fields.length+1}`); vals.push(s.currentStudentId||null); }
        if (fields.length === 0) return res.json({ ok: true });
        vals.push(id);
        await query(`UPDATE seats SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await query('DELETE FROM seats WHERE id=$1', [id]);
        return res.json({ ok: true });
      }
    }

    // ── Students ──────────────────────────────────────────────────
    if (table === 'students') {
      if (action === 'insert') {
        const s = data;
        const newId = s.id || uid('STU');
        await query(
          `INSERT INTO students (id,name,email,phone,emergency_contact,avatar_color,id_proof,address,notes,status,join_date,branch_id,country_code,normalized_phone,whatsapp_opt_in,communication_preferences)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [newId, s.name, s.email||'', s.phone||'', s.emergencyContact||'',
           s.avatar||s.avatarColor||'#6172f3', s.idProof||'', s.address||'',
           s.notes||'', s.status||'active', s.joinDate||now().split('T')[0],
           s.branchId||null, s.country_code||'+91', s.normalized_phone||s.phone||'',
           s.whatsapp_opt_in!==false,
           JSON.stringify(s.communication_preferences||{whatsapp:true,payment_reminders:true,membership_reminders:true,booking_notifications:true,receipt_notifications:true,announcements:true})]
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const s = data;
        const map = {name:'name',email:'email',phone:'phone',emergencyContact:'emergency_contact',avatar:'avatar_color',avatarColor:'avatar_color',idProof:'id_proof',address:'address',notes:'notes',status:'status',joinDate:'join_date',branchId:'branch_id',country_code:'country_code',normalized_phone:'normalized_phone',whatsapp_opt_in:'whatsapp_opt_in'};
        const fields=[], vals=[];
        for (const [k,col] of Object.entries(map)) {
          if (s[k]!==undefined) { fields.push(`${col}=$${fields.length+1}`); vals.push(s[k]); }
        }
        if (fields.length===0) return res.json({ok:true});
        vals.push(id);
        await query(`UPDATE students SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await query('DELETE FROM students WHERE id=$1', [id]);
        return res.json({ ok: true });
      }
    }

    // ── Membership Plans ──────────────────────────────────────────
    if (table === 'membership_plans') {
      if (action === 'insert') {
        const p = data;
        const newId = p.id || uid('PLAN');
        await query(
          `INSERT INTO membership_plans (id,name,duration,duration_unit,price,description,active,access_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [newId, p.name, p.duration, p.durationUnit||'days', p.price, p.description||'', p.active!==false, p.accessHours||'']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const p = data;
        await query(
          `UPDATE membership_plans SET name=$1,duration=$2,duration_unit=$3,price=$4,description=$5,active=$6,access_hours=$7 WHERE id=$8`,
          [p.name, p.duration, p.durationUnit||'days', p.price, p.description||'', p.active!==false, p.accessHours||'', id]
        );
        return res.json({ ok: true });
      }
    }

    // ── Memberships ───────────────────────────────────────────────
    if (table === 'memberships') {
      if (action === 'insert') {
        const m = data;
        const newId = m.id || uid('MEM');
        await query(
          `INSERT INTO memberships (id,student_id,plan_id,branch_id,seat_id,start_date,end_date,price,discount,final_amount,status,payment_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
          [newId, m.studentId, m.planId||null, m.branchId||null, m.seatId||null,
           m.startDate, m.endDate, m.price, m.discount||0, m.finalAmount||m.price,
           m.status||'active', m.paymentStatus||'paid']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const m = data;
        const map = {studentId:'student_id',planId:'plan_id',branchId:'branch_id',seatId:'seat_id',startDate:'start_date',endDate:'end_date',price:'price',discount:'discount',finalAmount:'final_amount',status:'status',paymentStatus:'payment_status'};
        const fields=[], vals=[];
        for (const [k,col] of Object.entries(map)) {
          if (m[k]!==undefined) { fields.push(`${col}=$${fields.length+1}`); vals.push(m[k]||null); }
        }
        if (fields.length===0) return res.json({ok:true});
        vals.push(id);
        await query(`UPDATE memberships SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
    }

    // ── Seat Assignments ──────────────────────────────────────────
    if (table === 'seat_assignments') {
      if (action === 'insert') {
        const a = data;
        const newId = a.id || uid('ASN');
        await query(
          `INSERT INTO seat_assignments (id,seat_id,student_id,membership_id,branch_id,start_date,end_date,slot_type,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [newId, a.seatId, a.studentId, a.membershipId||null, a.branchId||null,
           a.startDate||now(), a.endDate, a.slotType||'full-day', a.status||'active']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const a = data;
        const map = {seatId:'seat_id',studentId:'student_id',membershipId:'membership_id',branchId:'branch_id',startDate:'start_date',endDate:'end_date',slotType:'slot_type',status:'status',releasedAt:'released_at',releaseReason:'release_reason',releasedBy:'released_by',transferredAt:'transferred_at',transferReason:'transfer_reason'};
        const fields=[], vals=[];
        for (const [k,col] of Object.entries(map)) {
          if (a[k]!==undefined) { fields.push(`${col}=$${fields.length+1}`); vals.push(a[k]||null); }
        }
        if (fields.length===0) return res.json({ok:true});
        vals.push(id);
        await query(`UPDATE seat_assignments SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
    }

    // ── Seat Transfers ────────────────────────────────────────────
    if (table === 'seat_transfers') {
      if (action === 'insert') {
        const t = data;
        const newId = t.id || uid('TRF');
        await query(
          `INSERT INTO seat_transfers (id,student_id,from_seat_id,to_seat_id,date,reason)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [newId, t.studentId, t.fromSeatId||null, t.toSeatId||null, t.date||now(), t.reason||'']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Reservations ──────────────────────────────────────────────
    if (table === 'reservations') {
      if (action === 'insert') {
        const r = data;
        const newId = r.id || uid('RES');
        await query(
          `INSERT INTO reservations (id,seat_id,student_id,branch_id,reservation_date,end_date,slot_type,start_time,end_time,notes,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [newId, r.seatId, r.studentId, r.branchId||null, r.startDate||r.reservationDate||null,
           r.endDate||null, r.slotType||null, r.startTime||null, r.endTime||null, r.notes||'', r.status||'upcoming']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const r = data;
        await query(
          `UPDATE reservations SET status=$1,notes=$2 WHERE id=$3`,
          [r.status||'upcoming', r.notes||'', id]
        );
        return res.json({ ok: true });
      }
      if (action === 'delete') {
        await query('DELETE FROM reservations WHERE id=$1', [id]);
        return res.json({ ok: true });
      }
    }

    // ── Payments ──────────────────────────────────────────────────
    if (table === 'payments') {
      if (action === 'insert') {
        const p = data;
        const newId = p.id || uid('PAY');
        await query(
          `INSERT INTO payments (id,student_id,membership_id,branch_id,amount,mode,reference_number,date,notes,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [newId, p.studentId, p.membershipId||null, p.branchId||null,
           p.amount, p.method||p.mode||'upi', p.receiptNumber||p.referenceNumber||'',
           p.date||now().split('T')[0], p.notes||'', p.status||'recorded']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Attendance ────────────────────────────────────────────────
    if (table === 'attendance') {
      if (action === 'insert') {
        const a = data;
        const newId = a.id || uid('ATT');
        await query(
          `INSERT INTO attendance (id,student_id,seat_id,branch_id,check_in,check_out,date,method)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [newId, a.studentId, a.seatId||null, a.branchId||null, a.checkIn||now(), a.checkOut||null, a.date||now().split('T')[0], a.method||'manual']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'update') {
        const a = data;
        const fields=[], vals=[];
        if (a.checkIn!==undefined) { fields.push(`check_in=$${fields.length+1}`); vals.push(a.checkIn); }
        if (a.checkOut!==undefined) { fields.push(`check_out=$${fields.length+1}`); vals.push(a.checkOut||null); }
        if (a.status!==undefined) { /* ignore, derived */ }
        if (fields.length===0) return res.json({ok:true});
        vals.push(id);
        await query(`UPDATE attendance SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
        return res.json({ ok: true });
      }
    }

    // ── Expenses ──────────────────────────────────────────────────
    if (table === 'expenses') {
      if (action === 'insert') {
        const e = data;
        const newId = e.id || uid('EXP');
        await query(
          `INSERT INTO expenses (id,branch_id,category,title,amount,date,payment_mode,vendor,receipt_ref,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [newId, e.branchId||null, e.category||'General', e.title||e.description||'Expense',
           e.amount, e.date||now().split('T')[0], e.method||e.paymentMode||'cash',
           e.vendor||'', e.receiptRef||'', e.recordedBy||'']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Notifications ─────────────────────────────────────────────
    if (table === 'notifications') {
      if (action === 'insert') {
        const n = data;
        const newId = n.id || uid('NOTIF');
        await query(
          `INSERT INTO notifications (id,title,message,type,date,read,link) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [newId, n.title||'Notification', n.message||'', n.type||'info', n.date||now().split('T')[0], n.read||false, n.link||'']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'markRead') {
        if (id) await query('UPDATE notifications SET read=true WHERE id=$1', [id]);
        else await query('UPDATE notifications SET read=true', []);
        return res.json({ ok: true });
      }
    }

    // ── Activity Log ──────────────────────────────────────────────
    if (table === 'activity_logs') {
      if (action === 'insert') {
        const a = data;
        const newId = a.id || uid('ACT');
        await query(
          `INSERT INTO activity_logs (id,user_id,action,details,timestamp,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [newId, a.userId||'admin', a.action, a.description||a.details||'', a.timestamp||now(), a.entity||a.entityType||'', a.entityId||'']
        );
        return res.json({ ok: true, id: newId });
      }
    }

    // ── Waitlist ──────────────────────────────────────────────────
    if (table === 'waitlist') {
      if (action === 'insert') {
        const w = data;
        const newId = w.id || uid('WL');
        await query(
          `INSERT INTO waitlist (id,student_id,branch_id,requested_seat_type,priority,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [newId, w.studentId, w.branchId||null, w.requestedSeatType||null, w.priority||1, w.notes||'', w.status||'waiting']
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
          `INSERT INTO staff (id,name,role,email,phone,branch_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [newId, s.name, s.role||'Staff', s.email||'', s.phone||'', s.branchId||null, s.status||'active']
        );
        return res.json({ ok: true, id: newId });
      }
      if (action === 'delete') {
        await query('DELETE FROM staff WHERE id=$1', [id]);
        return res.json({ ok: true });
      }
    }

    // ── Settings ──────────────────────────────────────────────────
    if (table === 'settings') {
      if (action === 'update') {
        const s = data;
        await query(
          `INSERT INTO settings (id,currency,timezone,org_name,address,phone,email,theme,data)
           VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             currency=EXCLUDED.currency, timezone=EXCLUDED.timezone, org_name=EXCLUDED.org_name,
             address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email,
             theme=EXCLUDED.theme, data=EXCLUDED.data, updated_at=CURRENT_TIMESTAMP`,
          [s.currency||'INR', s.timezone||'Asia/Kolkata', s.orgName||'StudyFlow Library',
           s.address||'', s.phone||'', s.email||'', s.theme||'light', JSON.stringify(s)]
        );
        return res.json({ ok: true });
      }
    }

    // ── Documents (stored in settings JSONB data for simplicity) ──
    if (table === 'documents') {
      // Not stored in DB, return ok (handled in-memory or via settings)
      return res.json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: `Unknown table/action: ${table}/${action}` });

  } catch (err) {
    console.error('API /write error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
