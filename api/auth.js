// api/auth.js — Multi-Tenant Authentication & SaaS Onboarding Endpoint
const { cors, query, withTransaction } = require('./db');
const { ensureMultiTenantSchema } = require('./db-init');
const { hashPassword, verifyPassword, signToken, getAuthSession } = require('./auth-util');

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Ensure database schema is ready
  await ensureMultiTenantSchema();

  const action = req.body?.action || req.query?.action || (req.method === 'GET' ? 'me' : null);

  try {
    // ── 1. REGISTER (New SaaS Tenant / Library Owner) ─────────────────────────
    if (action === 'register') {
      const { orgName, name, email, password, phone } = req.body || {};

      if (!orgName || !name || !email || !password) {
        return res.status(400).json({ ok: false, error: 'Library name, full name, email, and password are required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ ok: false, error: 'An account with this email already exists. Please log in.' });
      }

      const orgId = uid('ORG');
      const userId = uid('USR');
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `org-${Date.now()}`;
      const passwordHash = hashPassword(password);
      const avatarColors = ['#6172f3', '#16b364', '#f79009', '#ee46bc', '#7a5af8', '#0ba5ec'];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      await withTransaction(async (client) => {
        // Create Organization
        await client.query(
          `INSERT INTO organizations (id, name, slug, email, phone, plan, seat_limit, subscription_status, currency, onboarding_completed)
           VALUES ($1, $2, $3, $4, $5, 'trial', 75, 'active', 'INR', FALSE)`,
          [orgId, orgName.trim(), slug, cleanEmail, phone || '']
        );

        // Create Owner User
        await client.query(
          `INSERT INTO users (id, organization_id, name, email, password_hash, role, phone, avatar_color, status)
           VALUES ($1, $2, $3, $4, $5, 'owner', $6, $7, 'active')`,
          [userId, orgId, name.trim(), cleanEmail, passwordHash, phone || '', avatarColor]
        );

        // Create default settings for tenant
        const defaultSettings = {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          orgName: orgName.trim(),
          phone: phone || '',
          email: cleanEmail,
          theme: 'light'
        };
        await client.query(
          `INSERT INTO settings (id, organization_id, currency, timezone, org_name, email, phone, data)
           VALUES ($1, $2, 'INR', 'Asia/Kolkata', $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [orgId, orgId, orgName.trim(), cleanEmail, phone || '', JSON.stringify(defaultSettings)]
        );
      });

      const token = signToken({
        userId,
        orgId,
        role: 'owner',
        email: cleanEmail,
        name: name.trim()
      });

      const user = { id: userId, organizationId: orgId, name: name.trim(), email: cleanEmail, role: 'owner', phone: phone || '', avatarColor };
      const organization = { id: orgId, name: orgName.trim(), slug, plan: 'trial', seatLimit: 75, subscriptionStatus: 'active', onboardingCompleted: false };

      return res.json({ ok: true, token, user, organization, message: 'Account created successfully!' });
    }

    // ── 2. LOGIN ─────────────────────────────────────────────────────────────
    if (action === 'login') {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: 'Email and password are required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

      if (userRes.rows.length === 0) {
        return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
      }

      const u = userRes.rows[0];
      const valid = verifyPassword(password, u.password_hash);
      if (!valid) {
        return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
      }

      const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [u.organization_id]);
      const org = orgRes.rows[0] || { id: u.organization_id, name: 'Study Library', plan: 'trial', seat_limit: 75, onboarding_completed: true };

      const token = signToken({
        userId: u.id,
        orgId: u.organization_id,
        role: u.role,
        email: u.email,
        name: u.name
      });

      const user = { id: u.id, organizationId: u.organization_id, name: u.name, email: u.email, role: u.role, phone: u.phone, avatarColor: u.avatar_color };
      const organization = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || 'trial',
        seatLimit: org.seat_limit || 75,
        subscriptionStatus: org.subscription_status || 'active',
        currency: org.currency || 'INR',
        logoUrl: org.logo_url,
        onboardingCompleted: org.onboarding_completed !== false
      };

      return res.json({ ok: true, token, user, organization, message: 'Logged in successfully!' });
    }

    // ── 3. ME (Session / Profile Status) ──────────────────────────────────────
    if (action === 'me') {
      const session = getAuthSession(req);
      if (!session) {
        return res.status(401).json({ ok: false, error: 'Not authenticated or session expired.' });
      }

      const userRes = await query('SELECT * FROM users WHERE id = $1', [session.userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'User not found.' });
      }

      const u = userRes.rows[0];
      const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [u.organization_id]);
      const org = orgRes.rows[0] || { id: u.organization_id, name: 'Study Library', plan: 'trial', seat_limit: 75, onboarding_completed: true };

      // Calculate current seat count for this org
      const seatsCountRes = await query('SELECT COUNT(*) as count FROM seats WHERE organization_id = $1', [u.organization_id]);
      const currentSeatCount = parseInt(seatsCountRes.rows[0]?.count || 0);

      const user = { id: u.id, organizationId: u.organization_id, name: u.name, email: u.email, role: u.role, phone: u.phone, avatarColor: u.avatar_color };
      const organization = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || 'trial',
        seatLimit: org.seat_limit || 75,
        currentSeatCount,
        subscriptionStatus: org.subscription_status || 'active',
        currency: org.currency || 'INR',
        logoUrl: org.logo_url,
        onboardingCompleted: org.onboarding_completed !== false
      };

      return res.json({ ok: true, user, organization });
    }

    // ── 4. COMPLETE ONBOARDING WIZARD ─────────────────────────────────────────
    if (action === 'onboarding') {
      const session = getAuthSession(req);
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });

      const { branchName, city, floorName, roomName, seatCount = 40, plans = [] } = req.body || {};
      const orgId = session.orgId;

      await withTransaction(async (client) => {
        // 1. Create Initial Branch
        const branchId = uid('BR');
        await client.query(
          `INSERT INTO branches (id, organization_id, name, city, address, status, open_time, close_time)
           VALUES ($1, $2, $3, $4, '', 'active', '06:00', '23:00')`,
          [branchId, orgId, branchName || 'Main Branch', city || '']
        );

        // 2. Create Initial Floor
        const floorId = uid('FLR');
        await client.query(
          `INSERT INTO floors (id, organization_id, branch_id, name, floor_number)
           VALUES ($1, $2, $3, $4, 1)`,
          [floorId, orgId, branchId, floorName || 'Ground Floor']
        );

        // 3. Create Initial Room
        const roomId = uid('RM');
        const numSeats = Math.min(Math.max(parseInt(seatCount) || 30, 10), 150);
        await client.query(
          `INSERT INTO rooms (id, organization_id, floor_id, branch_id, name, room_type, capacity)
           VALUES ($1, $2, $3, $4, $5, 'general', $6)`,
          [roomId, orgId, floorId, branchId, roomName || 'Study Hall', numSeats]
        );

        // 4. Generate Initial Grid Seats
        const colsPerRow = 6;
        for (let i = 1; i <= numSeats; i++) {
          const seatId = uid('SEAT');
          const rowIndex = Math.floor((i - 1) / colsPerRow);
          const colIndex = (i - 1) % colsPerRow;
          const rowLabel = String.fromCharCode(65 + (rowIndex % 26));
          const posX = 40 + (colIndex * 70) + (colIndex >= 3 ? 30 : 0);
          const posY = 40 + (rowIndex * 70);

          await client.query(
            `INSERT INTO seats (id, organization_id, room_id, branch_id, seat_number, row_label, seat_type, amenities, status, position_x, position_y)
             VALUES ($1, $2, $3, $4, $5, $6, 'standard', '["wifi","charging"]'::jsonb, 'available', $7, $8)`,
            [seatId, orgId, roomId, branchId, `${i}`, rowLabel, posX, posY]
          );
        }

        // 5. Create Default Membership Plans if none exist
        const defaultPlans = plans.length > 0 ? plans : [
          { name: 'Monthly Full Day', duration: 30, price: 1500, accessHours: '06:00 – 23:00', desc: 'Full day reserved study seat' },
          { name: 'Monthly Half Day (Morning)', duration: 30, price: 900, accessHours: '06:00 – 14:00', desc: 'Morning slot access' },
          { name: 'Monthly Half Day (Evening)', duration: 30, price: 900, accessHours: '14:00 – 23:00', desc: 'Evening slot access' },
          { name: 'Quarterly (3 Months)', duration: 90, price: 4000, accessHours: '06:00 – 23:00', desc: 'Discounted 3-month pass' }
        ];

        for (const p of defaultPlans) {
          await client.query(
            `INSERT INTO membership_plans (id, organization_id, name, duration, duration_unit, price, description, active, access_hours)
             VALUES ($1, $2, $3, $4, 'days', $5, $6, TRUE, $7)`,
            [uid('PLAN'), orgId, p.name, p.duration, p.price, p.desc || '', p.accessHours || '']
          );
        }

        // 6. Mark Organization Onboarding Completed
        await client.query(
          `UPDATE organizations SET onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orgId]
        );
      });

      return res.json({ ok: true, message: 'Onboarding completed successfully! Library is ready.' });
    }

    // ── 5. UPGRADE PLAN / SAAS SUBSCRIPTION ──────────────────────────────────
    if (action === 'upgrade_plan') {
      const session = getAuthSession(req);
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });

      const { plan } = req.body || {};
      const seatLimits = { starter: 75, pro: 250, enterprise: 1000 };
      const limit = seatLimits[plan] || 75;

      await query(
        `UPDATE organizations SET plan = $1, seat_limit = $2, subscription_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [plan, limit, session.orgId]
      );

      return res.json({ ok: true, plan, seatLimit: limit, message: `Successfully upgraded to ${plan.toUpperCase()} plan!` });
    }

    // ── 6. UPDATE PROFILE ─────────────────────────────────────────────────────
    if (action === 'update_profile') {
      const session = getAuthSession(req);
      if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });

      const { name, phone, currentPassword, newPassword } = req.body || {};
      if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password is required to set a new password' });
        const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
        const valid = verifyPassword(currentPassword, userRes.rows[0]?.password_hash);
        if (!valid) return res.status(400).json({ ok: false, error: 'Current password is incorrect' });

        const newHash = hashPassword(newPassword);
        await query('UPDATE users SET name=$1, phone=$2, password_hash=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4', [name.trim(), phone || '', newHash, session.userId]);
      } else {
        await query('UPDATE users SET name=$1, phone=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3', [name.trim(), phone || '', session.userId]);
      }

      return res.json({ ok: true, message: 'Profile updated successfully!' });
    }

    return res.status(400).json({ ok: false, error: `Unknown auth action: ${action}` });

  } catch (err) {
    console.error('API /auth error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal authentication error' });
  }
};
