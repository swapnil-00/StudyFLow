// api/students.js — CRUD for students
const { cors, query } = require('./db');

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { method } = req;
  const id = req.query.id;

  try {
    if (method === 'GET') {
      const branchId = req.query.branchId;
      const sql = branchId
        ? 'SELECT * FROM students WHERE branch_id=$1 ORDER BY created_at DESC'
        : 'SELECT * FROM students ORDER BY created_at DESC';
      const result = branchId ? await query(sql, [branchId]) : await query(sql);
      return res.status(200).json({ ok: true, data: result.rows });
    }

    if (method === 'POST') {
      const d = req.body;
      const newId = d.id || uid('STU');
      await query(
        `INSERT INTO students (id, name, email, phone, emergency_contact, avatar_color, id_proof, address, notes, status, join_date, branch_id, country_code, normalized_phone, whatsapp_opt_in, communication_preferences)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone,
           emergency_contact=EXCLUDED.emergency_contact, avatar_color=EXCLUDED.avatar_color,
           id_proof=EXCLUDED.id_proof, address=EXCLUDED.address, notes=EXCLUDED.notes,
           status=EXCLUDED.status, join_date=EXCLUDED.join_date, branch_id=EXCLUDED.branch_id,
           country_code=EXCLUDED.country_code, normalized_phone=EXCLUDED.normalized_phone,
           whatsapp_opt_in=EXCLUDED.whatsapp_opt_in, communication_preferences=EXCLUDED.communication_preferences`,
        [
          newId, d.name, d.email || '', d.phone || '', d.emergencyContact || '',
          d.avatar || d.avatarColor || '#6172f3', d.idProof || '', d.address || '',
          d.notes || '', d.status || 'active', d.joinDate || new Date().toISOString().split('T')[0],
          d.branchId || null, d.country_code || '+91', d.normalized_phone || d.phone || '',
          d.whatsapp_opt_in !== false,
          JSON.stringify(d.communication_preferences || { whatsapp: true, payment_reminders: true, membership_reminders: true, booking_notifications: true, receipt_notifications: true, announcements: true })
        ]
      );
      return res.status(200).json({ ok: true, id: newId });
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
      const d = req.body;
      const fields = [];
      const vals = [];
      let i = 1;
      const allowed = ['name','email','phone','emergency_contact','avatar_color','id_proof','address','notes','status','join_date','branch_id','country_code','normalized_phone','whatsapp_opt_in'];
      const map = { name:'name',email:'email',phone:'phone',emergencyContact:'emergency_contact',avatar:'avatar_color',avatarColor:'avatar_color',idProof:'id_proof',address:'address',notes:'notes',status:'status',joinDate:'join_date',branchId:'branch_id',country_code:'country_code',normalized_phone:'normalized_phone',whatsapp_opt_in:'whatsapp_opt_in' };
      for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { fields.push(`${col}=$${i++}`); vals.push(d[k]); }
      }
      if (fields.length === 0) return res.status(200).json({ ok: true });
      vals.push(id);
      await query(`UPDATE students SET ${fields.join(',')} WHERE id=$${i}`, vals);
      return res.status(200).json({ ok: true });
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
      await query('DELETE FROM students WHERE id=$1', [id]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API /students error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
