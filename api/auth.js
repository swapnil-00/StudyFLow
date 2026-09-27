// api/auth.js — Multi-Tenant Authentication & SaaS Onboarding Endpoint
// SEC-004: JWT_SECRET required (enforced by lib/auth.js).
// SEC-011: upgrade_plan disabled.
// SEC-021: Generic error messages.
'use strict';
const crypto = require('crypto');
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { hashPassword, verifyPassword, validatePasswordStrength, signToken, requireSession } = require('../lib/auth');
const { checkRateLimit } = require('../lib/ratelimit');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
}
function now() { return new Date().toISOString(); }

module.exports = withHandler(async function handler(req, res) {
  // Ensure database schema is ready
  await ensureMultiTenantSchema();

  const action = req.body?.action || req.query?.action || (req.method === 'GET' ? 'me' : null);

  // ── 1. REGISTER (New SaaS Tenant / Library Owner) ─────────────────────────
  if (action === 'register') {
    const { orgName, name, email, password, phone } = req.body || {};

    if (!orgName || !name || !email || !password) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Library name, full name, email, and password are required.');
    }

    validatePasswordStrength(password);

    const cleanEmail = email.toLowerCase().trim();
    await checkRateLimit(query, `register:${req.headers['x-forwarded-for'] || 'ip'}`, 10, 3600);
    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    // SEC-014: Generic response to prevent account enumeration (Phase 5 will add full protection)
    if (existingUser.rows.length > 0) {
      throw new HttpError(409, 'ACCOUNT_EXISTS', 'An account with this email already exists. Please log in.');
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
      name: name.trim(),
      tokenVersion: 1
    });

    const user = { id: userId, organizationId: orgId, name: name.trim(), email: cleanEmail, role: 'owner', phone: phone || '', avatarColor };
    const organization = { id: orgId, name: orgName.trim(), slug, plan: 'trial', seatLimit: 75, subscriptionStatus: 'active', onboardingCompleted: false };

    return res.json({ ok: true, token, user, organization, message: 'Account created successfully!' });
  }

  // ── 2. LOGIN ─────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Email and password are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    await checkRateLimit(query, `login:${cleanEmail}`, 5, 300);

    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const u = userRes.rows[0];
    const check = verifyPassword(password, u.password_hash);
    if (!check.valid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Transparent rehash of legacy PBKDF2 to scrypt
    if (check.needsRehash) {
      const newHash = hashPassword(password);
      await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, u.id]);
    }

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [u.organization_id]);
    const org = orgRes.rows[0] || { id: u.organization_id, name: 'Study Library', plan: 'trial', seat_limit: 75, onboarding_completed: true };

    // Fetch user branch IDs for staff / managers
    const branchRes = await query('SELECT branch_id FROM user_branches WHERE user_id = $1', [u.id]).catch(() => ({ rows: [] }));
    const branchIds = branchRes.rows.map(r => r.branch_id);

    const token = signToken({
      userId: u.id,
      orgId: u.organization_id,
      role: u.role,
      branchIds,
      email: u.email,
      name: u.name,
      tokenVersion: u.token_version || 1
    });

    const user = { id: u.id, organizationId: u.organization_id, name: u.name, email: u.email, role: u.role, branchIds, phone: u.phone, avatarColor: u.avatar_color };
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
  // All actions below require authentication
  if (action === 'me') {
    const session = requireSession(req);

    const userRes = await query('SELECT * FROM users WHERE id = $1', [session.userId]);
    if (userRes.rows.length === 0) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const u = userRes.rows[0];
    if (u.token_version && session.tokenVersion && u.token_version > session.tokenVersion) {
      throw new HttpError(401, 'SESSION_REVOKED', 'Session has expired or password was changed. Please log in again.');
    }
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
    const session = requireSession(req);
    const orgId = session.orgId;

    // SEC-008: Idempotent onboarding — reject if already completed
    const orgCheck = await query('SELECT onboarding_completed FROM organizations WHERE id = $1', [orgId]);
    if (orgCheck.rows[0]?.onboarding_completed) {
      throw new HttpError(409, 'ALREADY_COMPLETED', 'Onboarding has already been completed for this organization.');
    }

    const { branchName, city, floorName, roomName, seatCount = 40, plans = [] } = req.body || {};

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

  // ── 5. UPGRADE PLAN — DISABLED (SEC-011) ──────────────────────────────────
  if (action === 'upgrade_plan') {
    // SEC-011: Free plan upgrades are disabled. Plan changes require admin/webhook.
    throw new HttpError(403, 'UPGRADE_DISABLED',
      'Self-service plan upgrades are not available. Please contact support to change your plan.');
  }

  // ── 6. UPDATE PROFILE ─────────────────────────────────────────────────────
  if (action === 'update_profile') {
    const session = requireSession(req);

    const { name, phone, currentPassword, newPassword } = req.body || {};
    if (!name) throw new HttpError(400, 'MISSING_NAME', 'Name is required');

    if (newPassword) {
      if (!currentPassword) throw new HttpError(400, 'MISSING_CURRENT_PASSWORD', 'Current password is required to set a new password');
      validatePasswordStrength(newPassword);

      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
      const check = verifyPassword(currentPassword, userRes.rows[0]?.password_hash);
      if (!check.valid) throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect');

      const newHash = hashPassword(newPassword);
      // Increment token_version to revoke all active sessions on password change (SEC-013)
      const updateRes = await query(
        `UPDATE users 
         SET name=$1, phone=$2, password_hash=$3, token_version = COALESCE(token_version, 1) + 1, updated_at=CURRENT_TIMESTAMP 
         WHERE id=$4
         RETURNING token_version`,
        [name.trim(), phone || '', newHash, session.userId]
      );
      const newTokenVersion = updateRes.rows[0]?.token_version || ((session.tokenVersion || 1) + 1);
      const newToken = signToken({
        ...session,
        name: name.trim(),
        tokenVersion: newTokenVersion
      });
      return res.json({ ok: true, token: newToken, message: 'Password updated successfully! Other sessions signed out.' });
    } else {
      await query('UPDATE users SET name=$1, phone=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3', [name.trim(), phone || '', session.userId]);
      return res.json({ ok: true, message: 'Profile updated successfully!' });
    }
  }

  // ── 7. CREATE STAFF LOGIN (SEC-008) ───────────────────────────────────────
  if (action === 'create_staff_user') {
    const session = requireSession(req);
    if (session.role !== 'owner') {
      throw new HttpError(403, 'FORBIDDEN', 'Only library owners can create staff logins.');
    }

    const { staffId, email, password, name, role = 'staff', branchIds = [] } = req.body || {};
    if (!email || !password || !name) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Name, email, and temporary password are required.');
    }

    validatePasswordStrength(password);
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      throw new HttpError(409, 'ACCOUNT_EXISTS', 'A user with this email already exists.');
    }

    const userId = uid('USR');
    const pwdHash = hashPassword(password);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, organization_id, email, password_hash, name, role, token_version)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [userId, session.orgId, cleanEmail, pwdHash, name.trim(), role]
      );

      // Link user to branches for branch-level access control
      for (const branchId of branchIds) {
        await client.query(
          `INSERT INTO user_branches (user_id, branch_id, organization_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [userId, branchId, session.orgId]
        );
      }
    });

    return res.json({ ok: true, userId, message: 'Staff login created successfully!' });
  }

  throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown auth action');
}, {
  methods: ['GET', 'POST'],
  auth: false,       // Register/login don't need auth; me/onboarding/profile call requireSession manually
  rejectOrgId: false  // Auth endpoint needs to return organizationId in responses
});
