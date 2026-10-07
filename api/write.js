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
const { getTodayIST, addDaysIST, daysBetweenIST } = require('../lib/dates');
const { seatLimitFor, normalizePlanKey, seatLimitMessage } = require('../lib/plans');
const { nextDocumentNumber, verificationCode, verifyUrl } = require('../lib/invoices');

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

/**
 * Sweeps expired assignments (status='active' AND end_date < todayIST) and frees their seats.
 */
async function expireOutdatedAssignments(client, orgId) {
  const todayIST = getTodayIST();
  const expRes = await client.query(
    `UPDATE seat_assignments 
     SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
     WHERE organization_id = $1 AND status = 'active' AND end_date < $2
     RETURNING seat_id`,
    [orgId, todayIST]
  );
  if (expRes.rows.length > 0) {
    const expiredSeatIds = [...new Set(expRes.rows.map(r => r.seat_id))];
    await client.query(
      `UPDATE seats 
       SET status = 'available', current_student_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE organization_id = $1 AND id = ANY($2) AND status = 'occupied'
       AND id NOT IN (SELECT seat_id FROM seat_assignments WHERE status = 'active' AND organization_id = $1)`,
      [orgId, expiredSeatIds]
    );
  }
}

async function findBookingByIdempotency(client, orgId, idempotencyKey, studentId) {
  if (!idempotencyKey) return null;
  const dupMem = await client.query(
    `SELECT m.id, m.branch_id, m.plan_id, m.price, m.discount, m.final_amount, m.start_date, m.end_date, m.due_date, m.status, m.payment_status,
            a.id as assignment_id, a.seat_id,
            p.id as payment_id, p.amount as payment_amount, p.receipt_number, p.mode as payment_mode
     FROM memberships m
     LEFT JOIN seat_assignments a ON a.membership_id = m.id AND a.status = 'active'
     LEFT JOIN payments p ON p.membership_id = m.id
     WHERE m.organization_id = $1 AND m.idempotency_key = $2`,
    [orgId, idempotencyKey]
  );
  if (dupMem.rows.length > 0) {
    const row = dupMem.rows[0];
    return {
      ok: true,
      duplicate: true,
      membership: {
        id: row.id,
        studentId: studentId,
        planId: row.plan_id,
        branchId: row.branch_id,
        seatId: row.seat_id,
        startDate: row.start_date,
        endDate: row.end_date,
        dueDate: row.due_date,
        price: parseFloat(row.price),
        discount: parseFloat(row.discount) || 0,
        finalAmount: parseFloat(row.final_amount),
        status: row.status,
        paymentStatus: row.payment_status
      },
      assignment: row.assignment_id ? {
        id: row.assignment_id,
        seatId: row.seat_id,
        studentId: studentId,
        membershipId: row.id,
        branchId: row.branch_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status: 'active'
      } : null,
      payment: row.payment_id ? {
        id: row.payment_id,
        amount: parseFloat(row.payment_amount),
        receiptNumber: row.receipt_number,
        mode: row.payment_mode
      } : null,
      receiptNumber: row.receipt_number || null
    };
  }
  return null;
}

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

/**
 * The plan's seat limit and the current seat count, read under FOR UPDATE on the
 * organization row. Limits come from lib/plans.js, never from the request.
 */
async function lockedSeatCapacity(client, orgId) {
  const orgRes = await client.query('SELECT plan, seat_limit, is_demo FROM organizations WHERE id = $1 FOR UPDATE', [orgId]);
  const orgRow = orgRes.rows[0] || {};
  const seatLimit = seatLimitFor(orgRow);
  const countRes = await client.query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [orgId]);
  const currentCount = parseInt(countRes.rows[0]?.count || 0, 10);
  return { seatLimit, currentCount, planKey: normalizePlanKey(orgRow.plan) };
}

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const session = req.session;
  const orgId = session.orgId;
  const { table, action, id } = req.body || {};

  if (!table || !action) {
    throw new HttpError(400, 'INVALID_MUTATION', 'table and action are required.');
  }

  // ── B6: Subscription Suspension Check ──────────────────────────
  if (session.organization?.subscription_status === 'suspended') {
    throw new HttpError(403, 'SUBSCRIPTION_SUSPENDED', "This library's subscription is inactive. Contact StudyFlow to reactivate.");
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
        // Plan seat limit, checked under a row lock so two concurrent inserts cannot both pass
        const { seatLimit, currentCount, planKey } = await lockedSeatCapacity(client, orgId);
        if (currentCount + list.length > seatLimit) {
          throw new HttpError(403, 'SEAT_LIMIT_REACHED',
            `${seatLimitMessage(planKey, seatLimit)} (${currentCount} of ${seatLimit} used; adding ${list.length} would exceed it.)`,
            { seatLimit, seatsUsed: currentCount, plan: planKey, requested: list.length });
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
        const { seatLimit, currentCount, planKey } = await lockedSeatCapacity(client, orgId);
        if (currentCount >= seatLimit) {
          throw new HttpError(403, 'SEAT_LIMIT_REACHED', seatLimitMessage(planKey, seatLimit),
            { seatLimit, seatsUsed: currentCount, plan: planKey, requested: 1 });
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

    // Maintenance / blocked / available. The only way to change a seat's status by hand;
    // an occupied seat cannot be taken out of service or marked free here (SEC-016).
    if (action === 'set_status') {
      const status = String(data?.status || '').toLowerCase();
      if (!['available', 'maintenance', 'blocked'].includes(status)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Status must be available, maintenance or blocked.');
      }
      const result = await withTransaction(async client => {
        const seatRes = await client.query('SELECT id, status, seat_number FROM seats WHERE id = $1 AND organization_id = $2 FOR UPDATE', [id, orgId]);
        if (seatRes.rows.length === 0) throw new HttpError(404, 'SEAT_NOT_FOUND', 'Seat not found.');
        const occupied = await client.query(
          `SELECT 1 FROM seat_assignments WHERE seat_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1`,
          [id, orgId]
        );
        if (occupied.rows.length > 0) {
          throw new HttpError(409, 'SEAT_OCCUPIED', `Seat ${seatRes.rows[0].seat_number} has a student. Release or move the student first.`);
        }
        await client.query(
          `UPDATE seats SET status = $1, current_student_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3`,
          [status, id, orgId]
        );
        await audit(client, session, `seat.${status}`, 'seats', id, { from: seatRes.rows[0].status, to: status });
        return { ok: true, id, status };
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
          `INSERT INTO students (id,organization_id,name,email,phone,emergency_contact,avatar_color,id_proof,address,notes,status,join_date,branch_id,country_code,normalized_phone,whatsapp_opt_in,course)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,$12,$13,$14,$15,$16)`,
          [newId, orgId, s.name, s.email || '', s.phone || '', s.emergencyContact || '',
           avatarColor, s.idProofNumber || s.idProof || s.aadhaar || s.aadhar || '', s.address || '', s.notes || '',
           s.status || 'active', s.branchId || null, '+91', s.phone || '', s.whatsappOptIn !== false, s.course || null]
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

        // Several request keys can name the same column (idProof / idProofNumber / aadhaar → id_proof);
        // each column is assigned once, or Postgres rejects the UPDATE.
        const map = {
          name: 'name', email: 'email', phone: 'phone', emergencyContact: 'emergency_contact',
          idProofNumber: 'id_proof', idProof: 'id_proof', aadhaar: 'id_proof', aadhar: 'id_proof', idProofType: 'id_proof_type',
          address: 'address', notes: 'notes', status: 'status', branchId: 'branch_id',
          country_code: 'country_code', avatarColor: 'avatar_color', avatar: 'avatar_color',
          whatsappOptIn: 'whatsapp_opt_in', course: 'course', preferredLanguage: 'preferred_language',
          normalizedPhone: 'normalized_phone'
        };
        // A masked ID ("***1234", what staff see) must never overwrite the real number
        const maskedId = (v) => typeof v === 'string' && v.startsWith('***');
        const fields = [], vals = [], assigned = new Set();
        for (const [k, col] of Object.entries(map)) {
          if (s[k] === undefined || assigned.has(col)) continue;
          if (col === 'id_proof' && maskedId(s[k])) continue;
          assigned.add(col);
          fields.push(`${col}=$${fields.length + 1}`);
          vals.push(s[k]);
        }
        if (fields.length === 0) return { ok: true };
        vals.push(id);
        vals.push(orgId);
        await client.query(`UPDATE students SET ${fields.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${vals.length - 1} AND organization_id=$${vals.length}`, vals);

        if (s.status === 'inactive') {
          const actRes = await client.query(
            `UPDATE seat_assignments SET status = 'released', updated_at = CURRENT_TIMESTAMP
             WHERE student_id = $1 AND status = 'active' AND organization_id = $2
             RETURNING seat_id`,
            [id, orgId]
          );
          if (actRes.rows.length > 0) {
            const seatIds = [...new Set(actRes.rows.map(r => r.seat_id).filter(Boolean))];
            if (seatIds.length > 0) {
              await client.query(
                `UPDATE seats SET status = 'available', current_student_id = NULL, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ANY($1) AND organization_id = $2`,
                [seatIds, orgId]
              );
            }
          }
        }

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
        // Reconcile any expired assignments first
        await expireOutdatedAssignments(client, orgId);

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
           a.startDate || getTodayIST(), a.endDate || null, a.slotType || 'full-day']
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
          [newAssignmentId, orgId, toSeatId, old.student_id, old.membership_id, toSeatRes.rows[0].branch_id || old.branch_id, getTodayIST(), old.end_date, old.slot_type]
        );

        await client.query(`UPDATE seats SET status = 'occupied', current_student_id = $1 WHERE id = $2 AND organization_id = $3`, [old.student_id, toSeatId, orgId]);

        await client.query(
          `INSERT INTO seat_transfers (id,organization_id,student_id,from_seat_id,to_seat_id,date,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [transferId, orgId, old.student_id, fromSeatId, toSeatId, getTodayIST(), reason || '']
        );

        await audit(client, session, 'seat.transfer', 'seats', toSeatId, { fromSeatId, toSeatId, studentId: old.student_id });
        return { ok: true, id: newAssignmentId, transferId };
      });

      return res.json(result);
    }
  }

  // ── Bookings: Atomic One-Transaction Seat Booking & Renewal (SEC-008, SEC-010, S1-S6) ──
  if (table === 'bookings') {
    if (action === 'create' || action === 'insert') {
      const b = data;
      const idempotencyKey = req.headers['idempotency-key'] || b.idempotencyKey || null;

      const result = await withTransaction(async client => {
        // 1. Idempotency check: if key supplied and booking exists, replay response
        const replay = await findBookingByIdempotency(client, orgId, idempotencyKey, b.studentId);
        if (replay) return replay;

        // Reconcile expired assignments first
        await expireOutdatedAssignments(client, orgId);

        // 2. Lock Seat & verify
        const seatRes = await client.query(
          `SELECT s.id, s.branch_id, s.room_id, s.seat_number, s.status, s.current_student_id
           FROM seats s WHERE s.id = $1 AND s.organization_id = $2 FOR UPDATE`,
          [b.seatId, orgId]
        );
        if (seatRes.rows.length === 0) {
          throw new HttpError(404, 'SEAT_NOT_FOUND', 'Selected seat does not exist.');
        }
        const seat = seatRes.rows[0];
        if (seat.status === 'maintenance') {
          throw new HttpError(400, 'SEAT_UNAVAILABLE', 'Seat is under maintenance.');
        }
        assertBranchAccess(session, seat.branch_id);

        // 3. Verify student exists and has no other active seat
        await assertForeignEntity(client, 'students', b.studentId, orgId);
        const stuAssign = await client.query(
          `SELECT id, seat_id FROM seat_assignments WHERE student_id = $1 AND status = 'active' AND organization_id = $2`,
          [b.studentId, orgId]
        );
        if (stuAssign.rows.length > 0) {
          throw new HttpError(400, 'STUDENT_ALREADY_ASSIGNED', 'Student already has an active seat assignment.');
        }

        // 4. Verify seat has no active assignment
        const seatAssign = await client.query(
          `SELECT id, student_id FROM seat_assignments WHERE seat_id = $1 AND status = 'active' AND organization_id = $2`,
          [b.seatId, orgId]
        );
        if (seatAssign.rows.length > 0) {
          throw new HttpError(400, 'SEAT_ALREADY_ASSIGNED', 'Seat is already occupied. Please choose a different seat.');
        }

        // 5. Load Plan & calculate financial amounts
        const planRes = await client.query(
          `SELECT id, name, price, duration, duration_unit FROM membership_plans WHERE id = $1 AND organization_id = $2`,
          [b.planId, orgId]
        );
        if (planRes.rows.length === 0) {
          throw new HttpError(404, 'PLAN_NOT_FOUND', 'Membership plan not found.');
        }
        const plan = planRes.rows[0];
        const planPrice = parseFloat(plan.price);
        const discount = b.discount !== undefined ? Math.max(0, parseFloat(b.discount)) : 0;

        if (discount > 0 && session.role !== 'owner' && session.role !== 'manager') {
          throw new HttpError(403, 'DISCOUNT_NOT_ALLOWED', 'Only owners and managers are authorized to apply discounts.');
        }
        if (discount > planPrice) {
          throw new HttpError(400, 'INVALID_DISCOUNT', 'Discount amount cannot exceed the plan price.');
        }
        const finalAmount = planPrice - discount;

        // 6. Dates calculation & validation
        const startDate = b.startDate ? String(b.startDate).split('T')[0] : getTodayIST();
        if (session.role !== 'owner') {
          const diff = daysBetweenIST(getTodayIST(), startDate);
          if (diff < -7 || diff > 60) {
            throw new HttpError(400, 'INVALID_START_DATE', 'Start date must be within 7 days in the past and 60 days in the future.');
          }
        }
        const durationDays = parseInt(plan.duration, 10) || 30;
        let endDate = addDaysIST(startDate, durationDays);
        if (session.role === 'owner' && b.endDate) {
          endDate = String(b.endDate).split('T')[0];
        }
        const dueDate = addDaysIST(startDate, 3); // 3 days grace period

        // 7. Insert Membership (guaranteed branch_id = seat.branch_id)
        const memId = uid('MEM');
        const initialPaymentStatus = finalAmount === 0 ? 'paid' : 'pending';
        try {
          await client.query(
            `INSERT INTO memberships (id, organization_id, student_id, plan_id, branch_id, seat_id, start_date, end_date, due_date, price, discount, final_amount, status, payment_status, notes, idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [memId, orgId, b.studentId, plan.id, seat.branch_id, seat.id, startDate, endDate, dueDate, planPrice, discount, finalAmount, 'active', initialPaymentStatus, b.notes || '', idempotencyKey]
          );
        } catch (insertErr) {
          if (insertErr.code === '23505' && idempotencyKey) {
            const conflictReplay = await findBookingByIdempotency(client, orgId, idempotencyKey, b.studentId);
            if (conflictReplay) return conflictReplay;
          }
          throw insertErr;
        }

        // 8. Insert Seat Assignment
        const assignId = uid('ASN');
        await client.query(
          `INSERT INTO seat_assignments (id, organization_id, seat_id, student_id, membership_id, branch_id, start_date, end_date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')`,
          [assignId, orgId, seat.id, b.studentId, memId, seat.branch_id, startDate, endDate]
        );

        // 9. Update Seat status
        await client.query(
          `UPDATE seats SET status = 'occupied', current_student_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3`,
          [b.studentId, seat.id, orgId]
        );

        // 10. Process Payment if requested
        let paymentRecord = null;
        let generatedReceipt = null;
        let computedPaymentStatus = initialPaymentStatus;

        let payAmount = 0;
        if (b.payStatus === 'paid') {
          payAmount = finalAmount;
        } else if (b.payStatus === 'partial' || b.payAmount > 0) {
          payAmount = Math.max(0, parseFloat(b.payAmount || 0));
        }

        if (payAmount > 0) {
          if (payAmount > finalAmount) {
            throw new HttpError(400, 'INVALID_PAYMENT_AMOUNT', 'Payment amount cannot exceed the total amount due.');
          }

          const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
          let mode = b.mode || b.method || 'cash';
          mode = String(mode).toLowerCase().replace(/\s+/g, '_');
          if (!allowedModes.includes(mode)) {
            throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
          }

          // Atomic sequential receipt allocation
          const seqRes = await client.query(
            `INSERT INTO receipt_sequences (organization_id, current_number)
             VALUES ($1, 1)
             ON CONFLICT (organization_id)
             DO UPDATE SET current_number = receipt_sequences.current_number + 1, updated_at = CURRENT_TIMESTAMP
             RETURNING current_number`,
            [orgId]
          );
          const currentSeq = seqRes.rows[0].current_number;
          const year = new Date().getFullYear();
          generatedReceipt = `REC-${year}-${String(currentSeq).padStart(6, '0')}`;

          const payId = uid('PAY');
          const paymentDate = getTodayIST();
          const payIdempKey = idempotencyKey ? `${idempotencyKey}-PAY` : null;

          await client.query(
            `INSERT INTO payments (id,organization_id,student_id,membership_id,branch_id,amount,mode,reference_number,receipt_number,date,notes,status,idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [payId, orgId, b.studentId, memId, seat.branch_id, payAmount, mode, b.referenceNumber || '', generatedReceipt, paymentDate, b.notes || '', 'recorded', payIdempKey]
          );

          computedPaymentStatus = payAmount >= finalAmount ? 'paid' : 'partial';
          await client.query(
            `UPDATE memberships SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3`,
            [computedPaymentStatus, memId, orgId]
          );

          paymentRecord = {
            id: payId,
            studentId: b.studentId,
            membershipId: memId,
            branchId: seat.branch_id,
            amount: payAmount,
            mode,
            receiptNumber: generatedReceipt,
            date: paymentDate,
            status: 'recorded'
          };
        }

        // 11. Audit log
        await audit(client, session, 'booking.create', 'memberships', memId, {
          studentId: b.studentId,
          seatId: seat.id,
          branchId: seat.branch_id,
          planId: plan.id,
          finalAmount,
          payAmount,
          paymentStatus: computedPaymentStatus
        });

        return {
          ok: true,
          membership: {
            id: memId,
            studentId: b.studentId,
            planId: plan.id,
            planName: plan.name,
            branchId: seat.branch_id,
            seatId: seat.id,
            startDate,
            endDate,
            dueDate,
            price: planPrice,
            discount,
            finalAmount,
            status: 'active',
            paymentStatus: computedPaymentStatus,
            notes: b.notes || ''
          },
          assignment: {
            id: assignId,
            seatId: seat.id,
            studentId: b.studentId,
            membershipId: memId,
            branchId: seat.branch_id,
            startDate,
            endDate,
            status: 'active'
          },
          payment: paymentRecord,
          receiptNumber: generatedReceipt
        };
      });

      return res.json(result);
    }

    if (action === 'renew') {
      const b = data;
      const idempotencyKey = req.headers['idempotency-key'] || b.idempotencyKey || null;

      const result = await withTransaction(async client => {
        // 1. Idempotency check: if key supplied and booking exists, replay response
        const replay = await findBookingByIdempotency(client, orgId, idempotencyKey, b.studentId);
        if (replay) return replay;

        // Reconcile expired assignments first
        await expireOutdatedAssignments(client, orgId);

        await assertForeignEntity(client, 'students', b.studentId, orgId);

        // Load plan
        const planRes = await client.query(
          `SELECT id, name, price, duration, duration_unit FROM membership_plans WHERE id = $1 AND organization_id = $2`,
          [b.planId, orgId]
        );
        if (planRes.rows.length === 0) throw new HttpError(404, 'PLAN_NOT_FOUND', 'Membership plan not found.');
        const plan = planRes.rows[0];
        const planPrice = parseFloat(plan.price);
        const discount = b.discount !== undefined ? Math.max(0, parseFloat(b.discount)) : 0;

        if (discount > 0 && session.role !== 'owner' && session.role !== 'manager') {
          throw new HttpError(403, 'DISCOUNT_NOT_ALLOWED', 'Only owners and managers are authorized to apply discounts.');
        }
        if (discount > planPrice) {
          throw new HttpError(400, 'INVALID_DISCOUNT', 'Discount amount cannot exceed the plan price.');
        }
        const finalAmount = planPrice - discount;

        // Get active assignment with FOR UPDATE lock
        const assignRes = await client.query(
          `SELECT id, seat_id, branch_id, membership_id, end_date FROM seat_assignments WHERE student_id = $1 AND status = 'active' AND organization_id = $2 FOR UPDATE`,
          [b.studentId, orgId]
        );
        const activeAssign = assignRes.rows[0] || null;
        const branchId = activeAssign?.branch_id || b.branchId || null;
        if (branchId) assertBranchAccess(session, branchId);
        const seatId = activeAssign?.seat_id || b.seatId || null;

        // Start & End dates calculation (continuous renewal: start after current end date if active and not expired)
        let startDate;
        if (b.startDate) {
          startDate = String(b.startDate).split('T')[0];
        } else if (activeAssign && activeAssign.end_date && activeAssign.end_date >= getTodayIST()) {
          startDate = addDaysIST(activeAssign.end_date, 1);
        } else {
          startDate = getTodayIST();
        }

        if (session.role !== 'owner') {
          const diff = daysBetweenIST(getTodayIST(), startDate);
          if (diff < -7 || diff > 60) {
            throw new HttpError(400, 'INVALID_START_DATE', 'Start date must be within 7 days in the past and 60 days in the future.');
          }
        }

        const durationDays = parseInt(plan.duration, 10) || 30;
        let endDate = addDaysIST(startDate, durationDays);
        if (session.role === 'owner' && b.endDate) {
          endDate = String(b.endDate).split('T')[0];
        }
        const dueDate = addDaysIST(startDate, 3);

        // Mark previous active membership as renewed
        if (activeAssign?.membership_id) {
          await client.query(
            `UPDATE memberships SET status = 'renewed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND organization_id = $2`,
            [activeAssign.membership_id, orgId]
          );
        }

        // Insert new membership
        const newMemId = uid('MEM');
        const initialPaymentStatus = finalAmount === 0 ? 'paid' : 'pending';
        try {
          await client.query(
            `INSERT INTO memberships (id, organization_id, student_id, plan_id, branch_id, seat_id, start_date, end_date, due_date, price, discount, final_amount, status, payment_status, notes, idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [newMemId, orgId, b.studentId, plan.id, branchId, seatId, startDate, endDate, dueDate, planPrice, discount, finalAmount, 'active', initialPaymentStatus, b.notes || '', idempotencyKey]
          );
        } catch (insertErr) {
          if (insertErr.code === '23505' && idempotencyKey) {
            const conflictReplay = await findBookingByIdempotency(client, orgId, idempotencyKey, b.studentId);
            if (conflictReplay) return conflictReplay;
          }
          throw insertErr;
        }

        // Update active assignment
        if (activeAssign) {
          await client.query(
            `UPDATE seat_assignments SET membership_id = $1, end_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND organization_id = $4`,
            [newMemId, endDate, activeAssign.id, orgId]
          );
        }

        // Process Payment if requested
        let renewPayment = null;
        let generatedReceipt = null;
        let computedPaymentStatus = initialPaymentStatus;

        let payAmount = 0;
        if (b.payStatus === 'paid') {
          payAmount = finalAmount;
        } else if (b.payStatus === 'partial' || b.payAmount !== undefined) {
          payAmount = Math.max(0, parseFloat(b.payAmount || 0));
        }

        if (payAmount > 0) {
          if (payAmount > finalAmount) {
            throw new HttpError(400, 'INVALID_PAYMENT_AMOUNT', 'Payment amount cannot exceed the total amount due.');
          }

          const allowedModes = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
          let mode = b.mode || b.method || 'cash';
          mode = String(mode).toLowerCase().replace(/\s+/g, '_');
          if (!allowedModes.includes(mode)) {
            throw new HttpError(400, 'VALIDATION_ERROR', `Payment mode must be one of: ${allowedModes.join(', ')}`);
          }

          const seqRes = await client.query(
            `INSERT INTO receipt_sequences (organization_id, current_number)
             VALUES ($1, 1)
             ON CONFLICT (organization_id)
             DO UPDATE SET current_number = receipt_sequences.current_number + 1, updated_at = CURRENT_TIMESTAMP
             RETURNING current_number`,
            [orgId]
          );
          const currentSeq = seqRes.rows[0].current_number;
          const year = new Date().getFullYear();
          generatedReceipt = `REC-${year}-${String(currentSeq).padStart(6, '0')}`;

          const payId = uid('PAY');
          const paymentDate = getTodayIST();
          const payIdempKey = idempotencyKey ? `${idempotencyKey}-PAY` : null;

          await client.query(
            `INSERT INTO payments (id,organization_id,student_id,membership_id,branch_id,amount,mode,reference_number,receipt_number,date,notes,status,idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [payId, orgId, b.studentId, newMemId, branchId, payAmount, mode, b.referenceNumber || '', generatedReceipt, paymentDate, b.notes || '', 'recorded', payIdempKey]
          );

          computedPaymentStatus = payAmount >= finalAmount ? 'paid' : 'partial';
          await client.query(
            `UPDATE memberships SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3`,
            [computedPaymentStatus, newMemId, orgId]
          );

          renewPayment = {
            id: payId,
            studentId: b.studentId,
            membershipId: newMemId,
            branchId,
            amount: payAmount,
            mode,
            receiptNumber: generatedReceipt,
            date: paymentDate,
            status: 'recorded'
          };
        }

        await audit(client, session, 'booking.renew', 'memberships', newMemId, { studentId: b.studentId, planId: plan.id, payAmount, paymentStatus: computedPaymentStatus });

        return {
          ok: true,
          membership: {
            id: newMemId,
            studentId: b.studentId,
            planId: plan.id,
            planName: plan.name,
            branchId,
            seatId,
            startDate,
            endDate,
            dueDate,
            price: planPrice,
            discount,
            finalAmount,
            status: 'active',
            paymentStatus: computedPaymentStatus,
            notes: b.notes || ''
          },
          assignment: activeAssign ? {
            id: activeAssign.id,
            seatId,
            studentId: b.studentId,
            membershipId: newMemId,
            branchId,
            startDate: activeAssign.start_date || startDate,
            endDate,
            status: 'active'
          } : null,
          payment: renewPayment,
          receiptNumber: generatedReceipt
        };
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
        const paymentDate = p.date || getTodayIST();
        await client.query(
          `INSERT INTO payments (id,organization_id,student_id,membership_id,branch_id,amount,mode,reference_number,receipt_number,date,notes,status,idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [newId, orgId, p.studentId, p.membershipId || null, resolvedBranchId || null,
           p.amount, p.mode || 'upi', p.referenceNumber || '', generatedReceiptNumber,
           paymentDate, p.notes || '', 'recorded', idempotencyKey]
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
          date: paymentDate,
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
           e.amount, e.date || getTodayIST(), e.paymentMode || 'cash',
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

  // ── Settings (SEC-022: Whitelisted Keys) ───────────────────────────────────
  if (table === 'settings') {
    if (action === 'update') {
      const s = data;

      // Allow-list keys to avoid storing arbitrary untrusted JSON (SEC-024)
      const allowedKeys = ['currency', 'timezone', 'orgName', 'address', 'phone', 'email', 'theme', 'whatsappOpenIn', 'whatsappSignature', 'whatsappTemplates'];
      const safeData = {};
      for (const k of allowedKeys) {
        if (s[k] !== undefined) safeData[k] = s[k];
      }

      const result = await withTransaction(async client => {
        await client.query(
          `INSERT INTO settings (id, organization_id, currency, timezone, org_name, address, phone, email, theme, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             currency=EXCLUDED.currency, timezone=EXCLUDED.timezone, org_name=EXCLUDED.org_name,
             address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email,
             theme=EXCLUDED.theme, data=EXCLUDED.data,
             updated_at=CURRENT_TIMESTAMP`,
          [orgId, orgId, s.currency || 'INR', s.timezone || 'Asia/Kolkata', s.orgName || 'StudyFlow Library',
           s.address || '', s.phone || '', s.email || '', s.theme || 'light', JSON.stringify(safeData)]
        );
        await audit(client, session, 'settings.update', 'settings', orgId, { updatedKeys: Object.keys(safeData) });
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Communication Logs (Manual WhatsApp Dispatches & Statuses) ─────────────
  if (table === 'communication_logs') {
    if (action === 'insert' || action === 'log') {
      const c = data;
      const newId = uid('COMM');
      const result = await withTransaction(async client => {
        if (c.studentId) await assertForeignEntity(client, 'students', c.studentId, orgId);
        await client.query(
          `INSERT INTO communication_logs (id, organization_id, student_id, event_type, phone_number, template_name, body_text, status, provider, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'whatsapp_manual', CURRENT_TIMESTAMP)`,
          [newId, orgId, c.studentId || null, c.eventType || c.templateKey || 'custom', c.phoneNumber || '', c.templateName || c.templateKey || '', c.bodyText || '', c.status || 'opened']
        );
        await audit(client, session, 'communication.log', 'communication_logs', newId, { studentId: c.studentId, template: c.templateName });
        return { ok: true, id: newId };
      });
      return res.json(result);
    }
    if (action === 'update' || action === 'update_status') {
      const c = data;
      const result = await withTransaction(async client => {
        await assertForeignEntity(client, 'communication_logs', id, orgId);
        await client.query(
          `UPDATE communication_logs SET status = $1 WHERE id = $2 AND organization_id = $3`,
          [c.status || 'marked_sent', id, orgId]
        );
        await audit(client, session, 'communication.update_status', 'communication_logs', id, { status: c.status });
        return { ok: true };
      });
      return res.json(result);
    }
  }

  // ── Documents (Invoices & Receipts, SEC-009 Tenant Scoped) ────────────────
  // The server issues the number (sequential per library), the issue time and a signed
  // verification code (lib/invoices.js). Only the ~1 KB record is stored, never a PDF; the
  // PDF is rendered from this record on demand, including on the public verify page.
  if (table === 'documents') {
    if (action === 'insert' || action === 'save') {
      const d = data;
      const newId = uid('DOC');
      const documentType = d.documentType === 'receipt' ? 'receipt' : 'invoice';

      const result = await withTransaction(async client => {
        if (d.studentId) await assertForeignEntity(client, 'students', d.studentId, orgId);
        if (d.branchId) await assertForeignEntity(client, 'branches', d.branchId, orgId);
        if (d.membershipId) await assertForeignEntity(client, 'memberships', d.membershipId, orgId);

        const exec = (sql, params) => client.query(sql, params);
        // A receipt keeps the payment's own server-issued REC- number; everything else is sequenced here.
        let documentNumber = null;
        if (documentType === 'receipt' && /^REC-\d{4}-\d{6}$/.test(String(d.documentNumber || ''))) {
          const owned = await client.query('SELECT 1 FROM payments WHERE receipt_number = $1 AND organization_id = $2', [d.documentNumber, orgId]);
          if (owned.rows.length > 0) documentNumber = d.documentNumber;
        }
        if (!documentNumber) documentNumber = await nextDocumentNumber(exec, orgId, documentType);

        const issuedAt = new Date().toISOString();
        const record = { ...d, id: newId, documentType, documentNumber, issuedAt, organizationId: orgId };
        delete record.verificationCode;
        delete record.verifyUrl;
        const code = verificationCode(record);
        const origin = process.env.APP_URL || process.env.APP_ORIGIN || `https://${req.headers.host}`;
        const url = verifyUrl(origin, documentNumber, code);
        const stored = { ...record, verificationCode: code, verifyUrl: url };
        delete stored.organizationId;

        await client.query(
          `INSERT INTO documents (id, organization_id, document_type, document_number, student_id, branch_id, membership_id, document_data, verification_code, issued_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [newId, orgId, documentType, documentNumber, d.studentId || null, d.branchId || null, d.membershipId || null, JSON.stringify(stored), code, issuedAt]
        );
        await audit(client, session, 'document.create', 'documents', newId, { documentNumber, documentType });
        return { ok: true, id: newId, documentNumber, documentType, verificationCode: code, verifyUrl: url, issuedAt };
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
