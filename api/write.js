// api/write.js — Universal write endpoint with PostgreSQL transactions, Multi-Tenant Scoping, RBAC & Concurrency Protection
// SEC-002, SEC-008, SEC-009, SEC-010, SEC-016, SEC-022, SEC-023
'use strict';
const crypto = require('crypto');
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { assertCan, assertBranchAccess } = require('../lib/authorize');
const { validate } = require('../lib/validate');
const { audit } = require('../lib/audit');
const { encrypt } = require('../lib/crypto');
const { HttpError } = require('../lib/errors');

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

/**
 * Asserts that a referenced foreign entity belongs to the caller's organization (and branch).
 * Throws 404 HttpError if entity not found in caller's tenant.
 */
async function assertForeignEntity(client, foreignTable, entityId, orgId, branchId = null) {
  if (!entityId) return;
  const res = await client.query(
    `SELECT id, organization_id ${branchId ? ', branch_id' : ''} FROM ${foreignTable} WHERE id = $1 AND organization_id = $2`,
    [entityId, orgId]
  );
  if (res.rows.length === 0) {
    throw new HttpError(404, 'FOREIGN_NOT_FOUND', `Referenced ${foreignTable} record '${entityId}' does not exist in your organization.`);
  }
}

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const session = req.session;
  const orgId = session.orgId;
  const { table, action, id } = req.body || {};

  if (!table || !action) {
    throw new HttpError(400, 'INVALID_MUTATION', 'table and action are required.');
  }

  // ── SEC-008: RBAC Permission Check ────────────────────────────
  assertCan(session, table, action);

  // ── SEC-010: Input Validation & Sanitization ───────────────────
  const data = validate(table, action, req.body.data || {});

  // ── SEC-008: Branch Scoping Check ──────────────────────────────
  if (data?.branchId) {
    assertBranchAccess(session, data.branchId);
  }

  // ── Branches ──────────────────────────────────────────────────
  if (table === 'branches') {
    if (action === 'insert') {
      const b = data;
      const newId = uid('BR');
      const result = await withTransaction(async client => {
        await client.query(
          `INSERT INTO branches (id,organization_id,name,city,address,phone,email,status,open_time,close_time,capacity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [newId, orgId, b.name, b.city || '', b.address || '', b.phone || '', b.email || '', b.status || 'active', b.openTime || '06:00', b.closeTime || '23:00', b.capacity || 0]
        );
        await audit(client, session, 'branch.create', 'branches', newId, { name: b.name });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update') {
      const b = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'branches', id, orgId);
        const map = {
          name: 'name', city: 'city', address: 'address', phone: 'phone', email: 'email',
          status: 'status', openTime: 'open_time', closeTime: 'close_time', capacity: 'capacity'
        };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (b[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(b[k]); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(
          `UPDATE branches SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`,
          vals
        );
        await audit(client, session, 'branch.update', 'branches', id, { name: b.name });
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Floors ────────────────────────────────────────────────────
  if (table === 'floors') {
    if (action === 'insert') {
      const f = data;
      const newId = uid('FLR');
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'branches', f.branchId, orgId);
        await client.query(
          `INSERT INTO floors (id,organization_id,branch_id,name,floor_number,description) VALUES ($1,$2,$3,$4,$5,$6)`,
          [newId, orgId, f.branchId, f.name, f.floorNumber || 1, f.description || '']
        );
        await audit(client, session, 'floor.create', 'floors', newId, { name: f.name });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update') {
      const f = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'floors', id, orgId);
        await client.query(`UPDATE floors SET name=$1,floor_number=$2 WHERE id=$3 AND organization_id=$4`, [f.name, f.floorNumber || 1, id, orgId]);
        await audit(client, session, 'floor.update', 'floors', id, { name: f.name });
        return { ok: true };
      });
      return res.json(result);
    }
    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'floors', id, orgId);
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
        await audit(client, session, 'floor.delete', 'floors', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Rooms ─────────────────────────────────────────────────────
  if (table === 'rooms') {
    if (action === 'insert') {
      const r = data;
      const newId = uid('RM');
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'branches', r.branchId, orgId);
        if (r.floorId) await assertForeignEntity(client, 'floors', r.floorId, orgId);

        await client.query(
          `INSERT INTO rooms (id,organization_id,floor_id,branch_id,name,room_type,capacity) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [newId, orgId, r.floorId || null, r.branchId, r.name, r.roomType || 'general', r.capacity || 0]
        );
        await audit(client, session, 'room.create', 'rooms', newId, { name: r.name });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update') {
      const r = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'rooms', id, orgId);
        const map = { name: 'name', roomType: 'room_type', capacity: 'capacity' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (r[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(r[k]); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE rooms SET ${fields.join(',')} WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        await audit(client, session, 'room.update', 'rooms', id, { name: r.name });
        return { ok: true };
      });
      return res.json(result);
    }
    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'rooms', id, orgId);
        const seatRes = await client.query('SELECT id FROM seats WHERE room_id=$1 AND organization_id=$2', [id, orgId]);
        const seatIds = seatRes.rows.map(s => s.id);

        if (seatIds.length > 0) {
          await client.query('UPDATE memberships SET seat_id=NULL WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
          await client.query('DELETE FROM seat_assignments WHERE seat_id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
          await client.query('DELETE FROM seats WHERE id = ANY($1) AND organization_id=$2', [seatIds, orgId]);
        }

        await client.query('DELETE FROM rooms WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'room.delete', 'rooms', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Seats ─────────────────────────────────────────────────────
  if (table === 'seats') {
    if (action === 'batch_update_positions') {
      const updates = Array.isArray(data) ? data : (Array.isArray(data?.seats) ? data.seats : []);
      if (!Array.isArray(updates) || updates.length === 0) return res.json({ ok: true, updated: 0 });

      const result = await withTransaction(async client => {
        for (const item of updates) {
          if (!item.id) continue;
          await client.query(
            `UPDATE seats SET position_x=$1, position_y=$2 WHERE id=$3 AND organization_id=$4`,
            [Number(item.x) || 0, Number(item.y) || 0, item.id, orgId]
          );
        }
        await audit(client, session, 'seats.batch_position', 'seats', 'batch', { count: updates.length });
        return { ok: true, updated: updates.length };
      });
      return res.json(result);
    }

    if (action === 'batch_insert') {
      const list = Array.isArray(data) ? data : (Array.isArray(data?.seats) ? data.seats : []);
      if (!Array.isArray(list) || list.length === 0) return res.json({ ok: true, ids: [] });

      const result = await withTransaction(async client => {
        const orgRes = await client.query('SELECT seat_limit FROM organizations WHERE id = $1 FOR UPDATE', [orgId]);
        const seatLimit = orgRes.rows[0]?.seat_limit || 75;

        const countRes = await client.query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [orgId]);
        const currentCount = parseInt(countRes.rows[0]?.count || 0);

        if (currentCount + list.length > seatLimit) {
          throw new HttpError(403, 'SEAT_LIMIT_REACHED', `Adding ${list.length} seats would exceed your seat limit of ${seatLimit}.`);
        }

        const insertedIds = [];
        for (const s of list) {
          const newId = uid('ST');
          const seatNum = s.seatNumber || s.number || s.label;
          const posX = s.x !== undefined ? s.x : (s.position?.x !== undefined ? s.position.x : 0);
          const posY = s.y !== undefined ? s.y : (s.position?.y !== undefined ? s.position.y : 0);

          await assertForeignEntity(client, 'branches', s.branchId, orgId);
          await assertForeignEntity(client, 'rooms', s.roomId, orgId);

          await client.query(
            `INSERT INTO seats (id,organization_id,room_id,branch_id,seat_number,row_label,seat_type,status,position_x,position_y)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'available',$8,$9)`,
            [newId, orgId, s.roomId, s.branchId, String(seatNum), s.rowLabel || s.label || '', s.type || s.seatType || 'standard', Number(posX) || 0, Number(posY) || 0]
          );
          insertedIds.push(newId);
        }
        await audit(client, session, 'seats.batch_create', 'seats', 'batch', { count: list.length });
        return { ok: true, ids: insertedIds };
      });
      return res.json(result);
    }

    if (action === 'insert') {
      const s = data;
      const newId = uid('ST');

      const result = await withTransaction(async client => {
        // SEC-016: Atomic seat limit check with row lock on organization
        const orgRes = await client.query('SELECT seat_limit FROM organizations WHERE id = $1 FOR UPDATE', [orgId]);
        const seatLimit = orgRes.rows[0]?.seat_limit || 75;

        const countRes = await client.query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [orgId]);
        const currentCount = parseInt(countRes.rows[0]?.count || 0);

        if (currentCount >= seatLimit) {
          throw new HttpError(403, 'SEAT_LIMIT_REACHED', `Your plan seat limit (${seatLimit}) has been reached. Please contact support to upgrade.`);
        }

        await assertForeignEntity(client, 'branches', s.branchId, orgId);
        await assertForeignEntity(client, 'rooms', s.roomId, orgId);

        await client.query(
          `INSERT INTO seats (id,organization_id,room_id,branch_id,seat_number,row_label,seat_type,status,position_x,position_y)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'available',$8,$9)`,
          [newId, orgId, s.roomId, s.branchId, s.seatNumber, s.rowLabel || '', s.type || 'standard', s.x || 0, s.y || 0]
        );

        await audit(client, session, 'seat.create', 'seats', newId, { seatNumber: s.seatNumber });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }

    if (action === 'update') {
      const s = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'seats', id, orgId);
        // SEC-016: status and currentStudentId are never writable here!
        const map = { seatNumber: 'seat_number', type: 'seat_type', x: 'position_x', y: 'position_y', rowLabel: 'row_label' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (s[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(s[k]); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(
          `UPDATE seats SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`,
          vals
        );
        await audit(client, session, 'seat.update', 'seats', id, { updatedFields: fields });
        return { ok: true };
      });
      return res.json(result);
    }

    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'seats', id, orgId);
        await client.query('UPDATE memberships SET seat_id=NULL WHERE seat_id=$1 AND organization_id=$2', [id, orgId]);
        await client.query('DELETE FROM seat_assignments WHERE seat_id=$1 AND organization_id=$2', [id, orgId]);
        await client.query('DELETE FROM seats WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'seat.delete', 'seats', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Students ──────────────────────────────────────────────────
  if (table === 'students') {
    if (action === 'insert') {
      const s = data;
      const newId = uid('STU');

      const result = await withTransaction(async client => {
        if (s.branchId) await assertForeignEntity(client, 'branches', s.branchId, orgId);

        const avatarColors = ['#6172f3', '#16b364', '#f79009', '#ee46bc', '#7a5af8', '#0ba5ec'];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        await client.query(
          `INSERT INTO students (id,organization_id,name,email,phone,emergency_contact,avatar_color,id_proof,address,notes,status,join_date,branch_id,country_code,normalized_phone,whatsapp_opt_in)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,$12,$13,$14,$15)`,
          [newId, orgId, s.name, s.email || '', s.phone || '', s.emergencyContact || '',
           avatarColor, s.idProofNumber || s.idProof || s.aadhaar || s.aadhar || '', s.address || '', s.notes || '',
           s.status || 'active', s.branchId || null, '+91', s.phone || '', s.whatsappOptIn !== false]
        );

        await audit(client, session, 'student.create', 'students', newId, { name: s.name });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }

    if (action === 'update') {
      const s = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'students', id, orgId);
        if (s.branchId) await assertForeignEntity(client, 'branches', s.branchId, orgId);

        const map = {
          name: 'name', email: 'email', phone: 'phone', emergencyContact: 'emergency_contact',
          idProofNumber: 'id_proof', idProof: 'id_proof', aadhaar: 'id_proof', aadhar: 'id_proof', idProofType: 'id_proof_type',
          address: 'address', notes: 'notes', status: 'status', branchId: 'branch_id',
          country_code: 'country_code', avatarColor: 'avatar_color', avatar: 'avatar_color',
          whatsappOptIn: 'whatsapp_opt_in'
        };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (s[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(s[k]); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE students SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        await audit(client, session, 'student.update', 'students', id, { updatedFields: fields });
        return { ok: true };
      });
      return res.json(result);
    }

    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'students', id, orgId);
        // SEC-019: Soft delete student
        await client.query('UPDATE students SET deleted_at=CURRENT_TIMESTAMP, status=\'deleted\' WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'student.delete', 'students', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Membership Plans ──────────────────────────────────────────
  if (table === 'membership_plans') {
    if (action === 'insert') {
      const p = data;
      const newId = uid('PLAN');
      const result = await withTransaction(async client => {
        await client.query(
          `INSERT INTO membership_plans (id,organization_id,name,duration,duration_unit,price,description,active,access_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [newId, orgId, p.name, p.duration, p.durationUnit || 'days', p.price, p.description || '', p.active !== false, p.accessHours || '']
        );
        await audit(client, session, 'plan.create', 'membership_plans', newId, { name: p.name, price: p.price });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update') {
      const p = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'membership_plans', id, orgId);
        await client.query(
          `UPDATE membership_plans SET name=$1,duration=$2,duration_unit=$3,price=$4,description=$5,active=$6,access_hours=$7 WHERE id=$8 AND organization_id=$9`,
          [p.name, p.duration, p.durationUnit || 'days', p.price, p.description || '', p.active !== false, p.accessHours || '', id, orgId]
        );
        await audit(client, session, 'plan.update', 'membership_plans', id, { name: p.name });
        return { ok: true };
      });
      return res.json(result);
    }
    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'membership_plans', id, orgId);
        await client.query('UPDATE memberships SET plan_id=NULL WHERE plan_id=$1 AND organization_id=$2', [id, orgId]);
        await client.query('DELETE FROM membership_plans WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'plan.delete', 'membership_plans', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Memberships ───────────────────────────────────────────────
  if (table === 'memberships') {
    if (action === 'insert') {
      const m = data;
      const newId = uid('MEM');

      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'students', m.studentId, orgId);
        if (m.branchId) await assertForeignEntity(client, 'branches', m.branchId, orgId);
        if (m.planId) await assertForeignEntity(client, 'membership_plans', m.planId, orgId);
        if (m.seatId) await assertForeignEntity(client, 'seats', m.seatId, orgId);

        // SEC-010: Server-computed final_amount
        const price = Number(m.price) || 0;
        const discount = Number(m.discount) || 0;
        const finalAmount = Math.max(0, price - discount);

        await client.query(
          `INSERT INTO memberships (id,organization_id,student_id,plan_id,branch_id,seat_id,start_date,end_date,price,discount,final_amount,status,payment_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [newId, orgId, m.studentId, m.planId || null, m.branchId || null, m.seatId || null,
           m.startDate, m.endDate, price, discount, finalAmount,
           m.status || 'active', m.paymentStatus || 'pending']
        );

        await audit(client, session, 'membership.create', 'memberships', newId, { studentId: m.studentId, finalAmount });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }

    if (action === 'update') {
      const m = data;
      const result = await withTransaction(async client => {
        const memRes = await client.query('SELECT * FROM memberships WHERE id=$1 AND organization_id=$2 FOR UPDATE', [id, orgId]);
        if (memRes.rows.length === 0) throw new HttpError(404, 'MEMBERSHIP_NOT_FOUND', 'Membership not found');
        const existing = memRes.rows[0];

        // SEC-010: Price and amounts are immutable once paid!
        if (existing.payment_status === 'paid' && (m.price !== undefined || m.discount !== undefined || m.finalAmount !== undefined)) {
          throw new HttpError(409, 'PRICE_IMMUTABLE', 'Membership amounts cannot be modified after payment is completed.');
        }

        const map = { status: 'status', endDate: 'end_date', seatId: 'seat_id' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (m[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(m[k] || null); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE memberships SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        await audit(client, session, 'membership.update', 'memberships', id, { fields });
        return { ok: true };
      });
      return res.json(result);
    }

    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'memberships', id, orgId);
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
        await audit(client, session, 'membership.delete', 'memberships', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Seat Assignments (SEC-016: Strict Concurrency & Multi-Tenant Locks) ───
  if (table === 'seat_assignments') {
    if (action === 'insert') {
      const a = data;
      const newId = uid('ASN');

      const result = await withTransaction(async client => {
        // 1. Lock the seat row FOR UPDATE
        const seatRes = await client.query(
          'SELECT id, branch_id, status FROM seats WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [a.seatId, orgId]
        );
        if (seatRes.rows.length === 0) throw new HttpError(404, 'SEAT_NOT_FOUND', 'Seat not found in organization.');
        const seat = seatRes.rows[0];

        // Assert branch access for non-owner
        if (seat.branch_id) assertBranchAccess(session, seat.branch_id);

        if (seat.status !== 'available') {
          throw new HttpError(409, 'SEAT_OCCUPIED', 'Seat is already occupied or inactive.');
        }

        // 2. Lock the student row FOR UPDATE
        const stuRes = await client.query(
          'SELECT id, status, branch_id FROM students WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [a.studentId, orgId]
        );
        if (stuRes.rows.length === 0) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student not found in organization.');
        if (stuRes.rows[0].status === 'inactive') {
          throw new HttpError(400, 'STUDENT_INACTIVE', 'Cannot assign seats to an inactive student.');
        }

        // 3. Enforce one active seat assignment per student
        const existingActive = await client.query(
          'SELECT id, seat_id FROM seat_assignments WHERE student_id = $1 AND status = $2 AND organization_id = $3',
          [a.studentId, 'active', orgId]
        );
        if (existingActive.rows.length > 0) {
          throw new HttpError(409, 'STUDENT_ALREADY_ASSIGNED', 'Student already has an active seat assigned.');
        }

        if (a.membershipId) await assertForeignEntity(client, 'memberships', a.membershipId, orgId);

        // 4. Insert assignment with fixed 'active' status
        await client.query(
          `INSERT INTO seat_assignments (id,organization_id,seat_id,student_id,membership_id,branch_id,start_date,end_date,slot_type,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')`,
          [newId, orgId, a.seatId, a.studentId, a.membershipId || null, seat.branch_id || a.branchId || null,
           a.startDate || now().split('T')[0], a.endDate || null, a.slotType || 'full-day']
        );

        // 5. Update seat status
        await client.query(
          `UPDATE seats SET status = 'occupied', current_student_id = $1 WHERE id = $2 AND organization_id = $3`,
          [a.studentId, a.seatId, orgId]
        );

        await audit(client, session, 'seat.assign', 'seat_assignments', newId, { seatId: a.seatId, studentId: a.studentId });
        return { ok: true, id: newId };
      });

      return res.json(result);
    }

    if (action === 'release') {
      const { seatId } = data || {};
      const result = await withTransaction(async client => {
        const seatRes = await client.query(
          'SELECT id, branch_id, status FROM seats WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [seatId, orgId]
        );
        if (seatRes.rows.length === 0) throw new HttpError(404, 'SEAT_NOT_FOUND', 'Seat not found.');
        if (seatRes.rows[0].branch_id) assertBranchAccess(session, seatRes.rows[0].branch_id);

        await client.query(
          `UPDATE seat_assignments SET status = 'released'
           WHERE seat_id = $1 AND status = 'active' AND organization_id = $2`,
          [seatId, orgId]
        );

        await client.query(
          `UPDATE seats SET status = 'available', current_student_id = NULL WHERE id = $1 AND organization_id = $2`,
          [seatId, orgId]
        );

        await audit(client, session, 'seat.release', 'seats', seatId, {});
        return { ok: true };
      });
      return res.json(result);
    }

    if (action === 'transfer') {
      const { fromSeatId, toSeatId, studentId, reason } = data || {};
      const newAssignmentId = uid('ASN');
      const transferId = uid('TRF');

      const result = await withTransaction(async client => {
        // Lock both seats
        const toSeatRes = await client.query(
          'SELECT id, branch_id, status FROM seats WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [toSeatId, orgId]
        );
        if (toSeatRes.rows.length === 0) throw new HttpError(404, 'SEAT_NOT_FOUND', 'Destination seat not found.');
        if (toSeatRes.rows[0].status !== 'available') throw new HttpError(409, 'SEAT_OCCUPIED', 'Destination seat is not available.');

        const fromSeatRes = await client.query(
          'SELECT id, branch_id, status FROM seats WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [fromSeatId, orgId]
        );
        if (fromSeatRes.rows.length === 0) throw new HttpError(404, 'SEAT_NOT_FOUND', 'Source seat not found.');

        // Find active assignment strictly on source seat (SEC-016: no silent fallback to any student assignment)
        const curr = await client.query(
          'SELECT * FROM seat_assignments WHERE seat_id = $1 AND status = $2 AND organization_id = $3 FOR UPDATE',
          [fromSeatId, 'active', orgId]
        );
        if (curr.rows.length === 0) {
          throw new HttpError(404, 'NO_ACTIVE_ASSIGNMENT', 'Source seat has no active assignment to transfer.');
        }

        const old = curr.rows[0];

        await client.query(`UPDATE seat_assignments SET status = 'transferred' WHERE id = $1 AND organization_id = $2`, [old.id, orgId]);
        await client.query(`UPDATE seats SET status = 'available', current_student_id = NULL WHERE id = $1 AND organization_id = $2`, [fromSeatId, orgId]);

        await client.query(
          `INSERT INTO seat_assignments (id,organization_id,seat_id,student_id,membership_id,branch_id,start_date,end_date,slot_type,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')`,
          [newAssignmentId, orgId, toSeatId, old.student_id, old.membership_id, toSeatRes.rows[0].branch_id || old.branch_id, now().split('T')[0], old.end_date, old.slot_type]
        );

        await client.query(`UPDATE seats SET status = 'occupied', current_student_id = $1 WHERE id = $2 AND organization_id = $3`, [old.student_id, toSeatId, orgId]);

        await client.query(
          `INSERT INTO seat_transfers (id,organization_id,student_id,from_seat_id,to_seat_id,date,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [transferId, orgId, old.student_id, fromSeatId, toSeatId, now(), reason || '']
        );

        await audit(client, session, 'seat.transfer', 'seats', toSeatId, { fromSeatId, toSeatId, studentId: old.student_id });
        return { ok: true, id: newAssignmentId, transferId };
      });

      return res.json(result);
    }
  }

  // ── Payments (SEC-010: Append-Only, Sequential Receipts, Idempotent, Accurate Membership Status) ──
  if (table === 'payments') {
    if (action === 'insert') {
      const p = data;
      const idempotencyKey = req.headers['idempotency-key'] || p.idempotencyKey || null;
      const newId = uid('PAY');

      const result = await withTransaction(async client => {
        // 1. Idempotency check: if key supplied and payment exists, return it immediately
        if (idempotencyKey) {
          const dup = await client.query(
            'SELECT id, amount, status, receipt_number, reference_number FROM payments WHERE organization_id = $1 AND (idempotency_key = $2 OR (reference_number = $2 AND reference_number != \'\'))',
            [orgId, idempotencyKey]
          );
          if (dup.rows.length > 0) {
            return {
              ok: true,
              id: dup.rows[0].id,
              receiptNumber: dup.rows[0].receipt_number || dup.rows[0].reference_number,
              amount: parseFloat(dup.rows[0].amount),
              duplicate: true
            };
          }
        }

        await assertForeignEntity(client, 'students', p.studentId, orgId);

        // Auto-resolve branchId from membership or student if missing
        let resolvedBranchId = p.branchId;
        if (!resolvedBranchId && p.membershipId) {
          const memBranchRes = await client.query('SELECT branch_id FROM memberships WHERE id = $1 AND organization_id = $2', [p.membershipId, orgId]);
          if (memBranchRes.rows.length > 0 && memBranchRes.rows[0].branch_id) {
            resolvedBranchId = memBranchRes.rows[0].branch_id;
          }
        }
        if (!resolvedBranchId && p.studentId) {
          const stuBranchRes = await client.query('SELECT branch_id FROM students WHERE id = $1 AND organization_id = $2', [p.studentId, orgId]);
          if (stuBranchRes.rows.length > 0 && stuBranchRes.rows[0].branch_id) {
            resolvedBranchId = stuBranchRes.rows[0].branch_id;
          }
        }
        if (resolvedBranchId) {
          assertBranchAccess(session, resolvedBranchId);
          await assertForeignEntity(client, 'branches', resolvedBranchId, orgId);
        }
        if (p.membershipId) {
          await assertForeignEntity(client, 'memberships', p.membershipId, orgId);
        }

        // 2. Atomic per-organization sequential receipt number generation
        const seqRes = await client.query(
          `INSERT INTO receipt_sequences (organization_id, current_number)
           VALUES ($1, 1)
           ON CONFLICT (organization_id)
           DO UPDATE SET current_number = receipt_sequences.current_number + 1, updated_at = CURRENT_TIMESTAMP
           RETURNING current_number`,
          [orgId]
        );
        const currentSeq = seqRes.rows[0].current_number;
        const year = (p.date ? new Date(p.date) : new Date()).getFullYear() || new Date().getFullYear();
        const generatedReceiptNumber = p.receiptNumber || `REC-${year}-${String(currentSeq).padStart(6, '0')}`;

        // 3. Insert payment record
        await client.query(
          `INSERT INTO payments (id,organization_id,student_id,membership_id,branch_id,amount,mode,reference_number,receipt_number,date,notes,status,idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [newId, orgId, p.studentId, p.membershipId || null, resolvedBranchId || null,
           p.amount, p.mode || 'upi', p.referenceNumber || '', generatedReceiptNumber,
           p.date || now().split('T')[0], p.notes || '', 'recorded', idempotencyKey]
        );

        // 4. Server computes membership payment_status (paid / partial / pending) from SUM(payments)
        let computedPaymentStatus = 'recorded';
        if (p.membershipId) {
          const memRes = await client.query(
            'SELECT id, price, discount, final_amount FROM memberships WHERE id = $1 AND organization_id = $2 FOR UPDATE',
            [p.membershipId, orgId]
          );
          if (memRes.rows.length > 0) {
            const mem = memRes.rows[0];
            const finalAmount = parseFloat(mem.final_amount ?? (Number(mem.price) - (Number(mem.discount) || 0)));
            const paidRes = await client.query(
              "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE membership_id = $1 AND organization_id = $2 AND status = 'recorded' AND voided_at IS NULL",
              [p.membershipId, orgId]
            );
            const totalPaid = parseFloat(paidRes.rows[0].total_paid);
            computedPaymentStatus = totalPaid >= finalAmount ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');
            await client.query(
              'UPDATE memberships SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3',
              [computedPaymentStatus, p.membershipId, orgId]
            );
          }
        }

        await audit(client, session, 'payment.create', 'payments', newId, {
          amount: p.amount,
          mode: p.mode,
          receiptNumber: generatedReceiptNumber,
          branchId: resolvedBranchId
        });

        return {
          ok: true,
          id: newId,
          receiptNumber: generatedReceiptNumber,
          amount: p.amount,
          date: p.date || now().split('T')[0],
          paymentStatus: computedPaymentStatus
        };
      });

      return res.json(result);
    }

    if (action === 'void' || action === 'refund') {
      if (session.role !== 'owner' && session.role !== 'manager') {
        throw new HttpError(403, 'FORBIDDEN', 'Only owners and managers can void or refund payments.');
      }
      const { reason } = data || {};
      const statusValue = action === 'refund' ? 'refunded' : 'voided';

      const result = await withTransaction(async client => {
        const payRes = await client.query(
          'SELECT * FROM payments WHERE id = $1 AND organization_id = $2 FOR UPDATE',
          [id, orgId]
        );
        if (payRes.rows.length === 0) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
        const payment = payRes.rows[0];

        if (payment.status === 'voided' || payment.status === 'refunded') {
          throw new HttpError(400, 'ALREADY_PROCESSED', `Payment is already ${payment.status}.`);
        }

        await client.query(
          'UPDATE payments SET status = $1, voided_at = CURRENT_TIMESTAMP, void_reason = $2 WHERE id = $3 AND organization_id = $4',
          [statusValue, reason || 'Payment cancelled', id, orgId]
        );

        // Recalculate membership payment status if linked
        if (payment.membership_id) {
          const memRes = await client.query(
            'SELECT id, price, discount, final_amount FROM memberships WHERE id = $1 AND organization_id = $2 FOR UPDATE',
            [payment.membership_id, orgId]
          );
          if (memRes.rows.length > 0) {
            const mem = memRes.rows[0];
            const finalAmount = parseFloat(mem.final_amount ?? (Number(mem.price) - (Number(mem.discount) || 0)));
            const paidRes = await client.query(
              "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE membership_id = $1 AND organization_id = $2 AND status = 'recorded' AND voided_at IS NULL",
              [payment.membership_id, orgId]
            );
            const totalPaid = parseFloat(paidRes.rows[0].total_paid);
            const newPaymentStatus = totalPaid >= finalAmount ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');
            await client.query(
              'UPDATE memberships SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3',
              [newPaymentStatus, payment.membership_id, orgId]
            );
          }
        }

        await audit(client, session, `payment.${action}`, 'payments', id, {
          amount: payment.amount,
          receiptNumber: payment.receipt_number,
          reason
        });

        return { ok: true, id, status: statusValue };
      });

      return res.json(result);
    }
  }

  // ── Expenses (SEC-010: Input Validation, Auditing & Void Support) ────────────
  if (table === 'expenses') {
    if (action === 'insert') {
      const e = data;
      const newId = uid('EXP');
      const result = await withTransaction(async client => {
        if (e.branchId) await assertForeignEntity(client, 'branches', e.branchId, orgId);

        await client.query(
          `INSERT INTO expenses (id,organization_id,branch_id,category,title,amount,date,payment_mode,vendor,receipt_ref,notes,status,is_recurring,recurring_frequency,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [newId, orgId, e.branchId || null, e.category || 'General', e.title,
           e.amount, e.date || now().split('T')[0], e.paymentMode || 'cash',
           e.vendor || '', e.receiptRef || '', e.notes || '', 'active',
           Boolean(e.isRecurring), e.recurringFrequency || '', session.userId]
        );
        await audit(client, session, 'expense.create', 'expenses', newId, { amount: e.amount, title: e.title, branchId: e.branchId });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }

    if (action === 'update') {
      const e = data;
      const result = await withTransaction(async client => {
        const expRes = await client.query('SELECT * FROM expenses WHERE id = $1 AND organization_id = $2 FOR UPDATE', [id, orgId]);
        if (expRes.rows.length === 0) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');

        const map = {
          title: 'title', category: 'category', branchId: 'branch_id', amount: 'amount',
          date: 'date', paymentMode: 'payment_mode', vendor: 'vendor', receiptRef: 'receipt_ref',
          notes: 'notes', status: 'status'
        };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (e[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(e[k] || null); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE expenses SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        await audit(client, session, 'expense.update', 'expenses', id, { fields });
        return { ok: true };
      });
      return res.json(result);
    }

    if (action === 'void') {
      if (session.role !== 'owner' && session.role !== 'manager') {
        throw new HttpError(403, 'FORBIDDEN', 'Only owners and managers can void expenses.');
      }
      const { reason } = data || {};
      const result = await withTransaction(async client => {
        const expRes = await client.query('SELECT * FROM expenses WHERE id = $1 AND organization_id = $2 FOR UPDATE', [id, orgId]);
        if (expRes.rows.length === 0) throw new HttpError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');

        await client.query(
          'UPDATE expenses SET status = \'voided\', voided_at = CURRENT_TIMESTAMP, void_reason = $1 WHERE id = $2 AND organization_id = $3',
          [reason || 'Expense cancelled', id, orgId]
        );
        await audit(client, session, 'expense.void', 'expenses', id, { reason });
        return { ok: true, id, status: 'voided' };
      });
      return res.json(result);
    }
  }

  // ── Notifications (In-App) ────────────────────────────────────
  if (table === 'notifications') {
    if (action === 'insert') {
      const n = data;
      const newId = uid('NOTIF');
      await query(
        `INSERT INTO notifications (id,organization_id,title,message,type,date,read,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newId, orgId, n.title || 'Notification', n.message || '', n.type || 'info', now(), false, n.link || null]
      );
      return res.json({ ok: true, id: newId });
    }
    if (action === 'markRead') {
      await query(`UPDATE notifications SET read=TRUE WHERE id=$1 AND organization_id=$2`, [id, orgId]);
      return res.json({ ok: true });
    }
  }

  // ── Staff ─────────────────────────────────────────────────────
  if (table === 'staff') {
    if (action === 'insert') {
      const s = data;
      const newId = uid('STF');
      const result = await withTransaction(async client => {
        if (s.branchId) await assertForeignEntity(client, 'branches', s.branchId, orgId);
        await client.query(
          `INSERT INTO staff (id,organization_id,name,role,email,phone,branch_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [newId, orgId, s.name, s.role || 'Staff', s.email || '', s.phone || '', s.branchId || null, s.status || 'active']
        );
        await audit(client, session, 'staff.create', 'staff', newId, { name: s.name });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'staff', id, orgId);
        await client.query('DELETE FROM staff WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'staff.delete', 'staff', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Settings (SEC-022: Encrypted Credentials & Whitelisted Keys) ───────────
  if (table === 'settings') {
    if (action === 'update') {
      const s = data;

      // Allow-list keys to avoid storing arbitrary untrusted JSON (SEC-024)
      const allowedKeys = ['currency', 'timezone', 'orgName', 'address', 'phone', 'email', 'theme', 'whatsappProvider'];
      const safeData = {};
      for (const k of allowedKeys) {
        if (s[k] !== undefined) safeData[k] = s[k];
      }

      let encryptedCreds = null;
      if (s.waToken) {
        encryptedCreds = encrypt(s.waToken);
      }

      const result = await withTransaction(async client => {
        await client.query(
          `INSERT INTO settings (id, organization_id, currency, timezone, org_name, address, phone, email, theme, data, encrypted_credentials)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             currency=EXCLUDED.currency, timezone=EXCLUDED.timezone, org_name=EXCLUDED.org_name,
             address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email,
             theme=EXCLUDED.theme, data=EXCLUDED.data,
             encrypted_credentials=COALESCE(EXCLUDED.encrypted_credentials, settings.encrypted_credentials),
             updated_at=CURRENT_TIMESTAMP`,
          [orgId, orgId, s.currency || 'INR', s.timezone || 'Asia/Kolkata', s.orgName || 'StudyFlow Library',
           s.address || '', s.phone || '', s.email || '', s.theme || 'light', JSON.stringify(safeData), encryptedCreds]
        );
        await audit(client, session, 'settings.update', 'settings', orgId, { updatedKeys: Object.keys(safeData) });
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Documents (Invoices & Receipts, SEC-009 Tenant Scoped) ────────────────
  if (table === 'documents') {
    if (action === 'insert' || action === 'save') {
      const d = data;
      const newId = uid('DOC');

      const result = await withTransaction(async client => {
        if (d.studentId) await assertForeignEntity(client, 'students', d.studentId, orgId);
        if (d.branchId) await assertForeignEntity(client, 'branches', d.branchId, orgId);
        if (d.membershipId) await assertForeignEntity(client, 'memberships', d.membershipId, orgId);

        await client.query(
          `INSERT INTO documents (id, organization_id, document_type, document_number, student_id, branch_id, membership_id, document_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET document_data = EXCLUDED.document_data
             WHERE documents.organization_id = $2`,
          [newId, orgId, d.documentType || 'invoice', d.documentNumber || newId, d.studentId || null, d.branchId || null, d.membershipId || null, JSON.stringify(d)]
        );
        await audit(client, session, 'document.create', 'documents', newId, { documentNumber: d.documentNumber });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
  }

  // ── Waitlist (NEW-03, NEW-07) ─────────────────────────────────
  if (table === 'waitlist') {
    if (action === 'insert') {
      const w = data;
      const newId = uid('WL');
      const result = await withTransaction(async client => {
        if (w.studentId) await assertForeignEntity(client, 'students', w.studentId, orgId);
        if (w.branchId) await assertForeignEntity(client, 'branches', w.branchId, orgId);

        await client.query(
          `INSERT INTO waitlist (id, organization_id, student_id, branch_id, requested_seat_type, priority, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, orgId, w.studentId || null, w.branchId || null, w.requestedSeatType || 'standard', w.priority || 1, w.notes || '', w.status || 'waiting']
        );
        await audit(client, session, 'waitlist.create', 'waitlist', newId, { studentId: w.studentId });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update') {
      const w = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'waitlist', id, orgId);
        const map = { status: 'status', notes: 'notes', priority: 'priority', requestedSeatType: 'requested_seat_type' };
        const fields = [], vals = [];
        for (const [k, col] of Object.entries(map)) {
          if (w[k] !== undefined) { fields.push(`${col}=$${fields.length + 1}`); vals.push(w[k]); }
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE waitlist SET ${fields.join(',')} WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);
        await audit(client, session, 'waitlist.update', 'waitlist', id, { updatedFields: fields });
        return { ok: true };
      });
      return res.json(result);
    }
    if (action === 'delete') {
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'waitlist', id, orgId);
        await client.query('DELETE FROM waitlist WHERE id=$1 AND organization_id=$2', [id, orgId]);
        await audit(client, session, 'waitlist.delete', 'waitlist', id, {});
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Activity Logs (NEW-07 compatibility) ──────────────────────
  if (table === 'activity_logs') {
    return res.json({ ok: true });
  }

  // ── Communication Logs (NEW-07) ───────────────────────────────
  if (table === 'communication_logs') {
    if (action === 'insert' || action === 'save') {
      const c = data;
      const newId = uid('COMM');
      const result = await withTransaction(async client => {
        await client.query(
          `INSERT INTO communication_logs (id, organization_id, student_id, event_type, phone_number, template_name, language, body_text, status, provider, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [newId, orgId, c.studentId || null, c.eventType || 'notification', c.phoneNumber || '', c.templateName || '', c.language || 'en', c.bodyText || '', c.status || 'SENT', c.provider || 'meta', c.idempotencyKey || null]
        );
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
  }

  throw new HttpError(400, 'UNKNOWN_OPERATION', `Unknown mutation table '${table}' or action '${action}'.`);
}, { methods: ['POST'], auth: true });
