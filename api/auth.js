// api/auth.js — Multi-Tenant Authentication & Identity Management Endpoint
// Upgraded for Firebase Auth (Phone OTP + Google Sign-In), HttpOnly DB sessions,
// Staff invitations, Multi-library switching, and Device management.
'use strict';
const crypto = require('crypto');
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { hashPassword, verifyPassword, validatePasswordStrength, requireSession } = require('../lib/auth');
const {
  createSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
  switchOrganization,
  setSessionCookie,
  clearSessionCookie,
  hashSessionToken,
} = require('../lib/session');
const { verifyFirebaseIdToken } = require('../lib/firebase');
const { checkRateLimit } = require('../lib/ratelimit');
const { withHandler } = require('../lib/http');
const { HttpError } = require('../lib/errors');

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 9).toUpperCase()}`;
}

const AVATAR_COLORS = ['#6172f3', '#16b364', '#f79009', '#ee46bc', '#7a5af8', '#0ba5ec'];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

async function logAuthEvent({ userId, organizationId, event, method, ip, userAgent, success }) {
  try {
    const id = uid('EVT');
    await query(
      `INSERT INTO auth_events (id, user_id, organization_id, event, method, ip, user_agent, success, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [id, userId || null, organizationId || null, event, method || '', ip || '', (userAgent || '').substring(0, 512), Boolean(success)]
    );
  } catch (e) {
    // Non-blocking
    console.error('Failed to log auth event:', e);
  }
}

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const action = req.body?.action || req.query?.action || (req.method === 'GET' ? 'me' : null);
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'ip';
  const userAgent = req.headers['user-agent'] || '';

  // ── 0. CLIENT CONFIG (Public Firebase client parameters) ───────────────────
  if (action === 'client_config' || action === 'config') {
    const projectId = process.env.FIREBASE_PROJECT_ID || '';
    return res.json({
      ok: true,
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
        projectId,
        appId: process.env.FIREBASE_APP_ID || '',
      },
    });
  }

  // ── 1. SESSION (Firebase ID Token → Server Session) ────────────────────────
  if (action === 'session') {
    const { idToken } = req.body || {};
    if (!idToken) {
      throw new HttpError(400, 'MISSING_TOKEN', 'Firebase ID token is required');
    }

    await checkRateLimit(query, `auth:session:${ip}`, 20, 60);

    const verified = await verifyFirebaseIdToken(idToken);
    const { uid: firebaseUid, email, email_verified, phone_number, name } = verified;
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanPhone = phone_number || null;
    const authMethod = cleanPhone ? 'phone' : 'google';

    let user = null;

    // 1. Look up by firebase_uid
    const byFirebase = await query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
    if (byFirebase.rows.length > 0) {
      user = byFirebase.rows[0];
    }

    // 2. Link by email if not linked yet
    if (!user && cleanEmail) {
      const byEmail = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (byEmail.rows.length > 0) {
        user = byEmail.rows[0];
        await query(
          `UPDATE users 
           SET firebase_uid = COALESCE(firebase_uid, $1), email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [firebaseUid, user.id]
        );
      }
    }

    // 3. Link by verified phone if not linked yet
    if (!user && cleanPhone) {
      const byPhone = await query('SELECT * FROM users WHERE phone_e164 = $1 OR phone = $1', [cleanPhone]);
      if (byPhone.rows.length > 0) {
        user = byPhone.rows[0];
        await query(
          `UPDATE users 
           SET firebase_uid = $1, phone_e164 = $2, phone_verified_at = COALESCE(phone_verified_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [firebaseUid, cleanPhone, user.id]
        );
      }
    }

    // 4. If still not found, create new user
    if (!user) {
      const newUserId = uid('USR');
      const avatarColor = randomAvatarColor();
      const userName = (name || cleanEmail?.split('@')[0] || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : 'Library User')).trim();

      const userInsert = await query(
        `INSERT INTO users (id, firebase_uid, email, phone_e164, phone, name, role, avatar_color, status, email_verified_at, phone_verified_at, token_version, created_at)
         VALUES ($1, $2, $3, $4, $4, $5, 'owner', $6, 'active', $7, $8, 1, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          newUserId,
          firebaseUid,
          cleanEmail || null,
          cleanPhone || null,
          userName,
          avatarColor,
          (cleanEmail && email_verified) ? new Date() : null,
          cleanPhone ? new Date() : null,
        ]
      );
      user = userInsert.rows[0];

      // Record identity
      await query(
        `INSERT INTO user_identities (id, user_id, provider, provider_subject, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [uid('IDN'), user.id, authMethod, cleanEmail || cleanPhone || firebaseUid]
      );
    }

    if (user.status !== 'active') {
      await logAuthEvent({ userId: user.id, organizationId: user.organization_id, event: 'login_blocked', method: authMethod, ip, userAgent, success: false });
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled. Please contact support.');
    }

    // Update last login
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Create server-side session
    const { token: sessionToken } = await createSession({
      userId: user.id,
      organizationId: user.organization_id || null,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    await logAuthEvent({
      userId: user.id,
      organizationId: user.organization_id,
      event: 'login_success',
      method: authMethod,
      ip,
      userAgent,
      success: true,
    });

    let organization = null;
    if (user.organization_id) {
      const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [user.organization_id]);
      organization = orgRes.rows[0] || null;
    }

    const userData = {
      id: user.id,
      organizationId: user.organization_id || null,
      name: user.name,
      email: user.email,
      phone: user.phone || user.phone_e164,
      role: user.role || 'owner',
      avatarColor: user.avatar_color,
    };

    return res.json({
      ok: true,
      user: userData,
      organization,
      needsLibrary: !user.organization_id,
      message: 'Signed in successfully',
    });
  }

  // ── 2. LOGIN (Email + Password) ───────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Email and password are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    await checkRateLimit(query, `login:ip:${ip}`, 20, 60);
    await checkRateLimit(query, `login:acc:${cleanEmail}`, 5, 300);

    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      await logAuthEvent({ event: 'login_failed', method: 'password', ip, userAgent, success: false });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const u = userRes.rows[0];
    if (!u.password_hash) {
      // User registered with Google/Phone and has no password set
      await logAuthEvent({ userId: u.id, event: 'login_failed_no_password', method: 'password', ip, userAgent, success: false });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password. If you signed up with Google or Phone, please use that button to sign in.');
    }

    const check = verifyPassword(password, u.password_hash);
    if (!check.valid) {
      await logAuthEvent({ userId: u.id, organizationId: u.organization_id, event: 'login_failed', method: 'password', ip, userAgent, success: false });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (u.status !== 'active') {
      await logAuthEvent({ userId: u.id, organizationId: u.organization_id, event: 'login_blocked', method: 'password', ip, userAgent, success: false });
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled.');
    }

    // Transparent rehash of legacy PBKDF2 to scrypt
    if (check.needsRehash) {
      const newHash = hashPassword(password);
      await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, u.id]);
    }

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [u.id]);

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [u.organization_id]);
    const org = orgRes.rows[0] || null;

    const branchRes = await query('SELECT branch_id FROM user_branches WHERE user_id = $1', [u.id]).catch(() => ({ rows: [] }));
    const branchIds = branchRes.rows.map(r => r.branch_id);

    // Create server-side session
    const { token: sessionToken } = await createSession({
      userId: u.id,
      organizationId: u.organization_id || null,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    await logAuthEvent({
      userId: u.id,
      organizationId: u.organization_id,
      event: 'login_success',
      method: 'password',
      ip,
      userAgent,
      success: true,
    });

    const user = {
      id: u.id,
      organizationId: u.organization_id,
      name: u.name,
      email: u.email,
      role: u.role,
      branchIds,
      phone: u.phone,
      avatarColor: u.avatar_color,
    };

    return res.json({ ok: true, user, organization: org, message: 'Logged in successfully!' });
  }

  // ── 3. REGISTER (New SaaS Tenant / Owner via Email+Password) ──────────────
  if (action === 'register') {
    const { orgName, name, email, password, phone } = req.body || {};

    if (!orgName || !name || !email || !password) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Library name, full name, email, and password are required.');
    }

    validatePasswordStrength(password);

    const cleanEmail = email.toLowerCase().trim();
    await checkRateLimit(query, `register:ip:${ip}`, 10, 3600);
    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (existingUser.rows.length > 0) {
      throw new HttpError(409, 'ACCOUNT_EXISTS', 'An account with this email already exists. Please log in.');
    }

    const orgId = uid('ORG');
    const userId = uid('USR');
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug.substring(0, 80)}-${slugSuffix}`;
    const passwordHash = hashPassword(password);
    const avatarColor = randomAvatarColor();

    await withTransaction(async (client) => {
      // Create Organization
      await client.query(
        `INSERT INTO organizations (id, name, slug, email, phone, plan, seat_limit, subscription_status, currency, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, 'trial', 75, 'active', 'INR', FALSE)`,
        [orgId, orgName.trim(), slug, cleanEmail, phone || '']
      );

      // Create Owner User
      await client.query(
        `INSERT INTO users (id, organization_id, name, email, password_hash, role, phone, avatar_color, status, token_version, last_login_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 'owner', $6, $7, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, orgId, name.trim(), cleanEmail, passwordHash, phone || '', avatarColor]
      );

      // Create membership record
      await client.query(
        `INSERT INTO memberships_org (user_id, organization_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT DO NOTHING`,
        [userId, orgId]
      ).catch(() => {});

      // Create identity record
      await client.query(
        `INSERT INTO user_identities (id, user_id, provider, provider_subject, created_at)
         VALUES ($1, $2, 'password', $3, CURRENT_TIMESTAMP)
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [uid('IDN'), userId, cleanEmail]
      ).catch(() => {});

      // Default settings
      const defaultSettings = {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        orgName: orgName.trim(),
        phone: phone || '',
        email: cleanEmail,
        theme: 'light',
      };
      await client.query(
        `INSERT INTO settings (id, organization_id, currency, timezone, org_name, email, phone, data)
         VALUES ($1, $2, 'INR', 'Asia/Kolkata', $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [orgId, orgId, orgName.trim(), cleanEmail, phone || '', JSON.stringify(defaultSettings)]
      );
    });

    const { token: sessionToken } = await createSession({
      userId,
      organizationId: orgId,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    await logAuthEvent({
      userId,
      organizationId: orgId,
      event: 'register_success',
      method: 'password',
      ip,
      userAgent,
      success: true,
    });

    const user = { id: userId, organizationId: orgId, name: name.trim(), email: cleanEmail, role: 'owner', phone: phone || '', avatarColor };
    const organization = { id: orgId, name: orgName.trim(), slug, plan: 'trial', seatLimit: 75, subscriptionStatus: 'active', onboardingCompleted: false };

    return res.json({ ok: true, user, organization, message: 'Account created successfully!' });
  }

  // ── 4. CREATE LIBRARY (For users signed in via Google/Phone without org) ───
  if (action === 'create_library' || action === 'create-library') {
    const session = await requireSession(req);
    const { orgName, city, name } = req.body || {};

    if (!orgName) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Library name is required.');
    }

    const orgId = uid('ORG');
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug.substring(0, 80)}-${slugSuffix}`;

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO organizations (id, name, slug, email, phone, plan, seat_limit, subscription_status, currency, onboarding_completed)
         VALUES ($1, $2, $3, $4, '', 'trial', 75, 'active', 'INR', FALSE)`,
        [orgId, orgName.trim(), slug, session.email || '']
      );

      await client.query(
        `UPDATE users SET organization_id = $1, role = 'owner', name = COALESCE($2, name), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [orgId, name ? name.trim() : null, session.userId]
      );

      await client.query(
        `INSERT INTO memberships_org (user_id, organization_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active'`,
        [session.userId, orgId]
      ).catch(() => {});

      const defaultSettings = {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        orgName: orgName.trim(),
        city: city || '',
        theme: 'light',
      };
      await client.query(
        `INSERT INTO settings (id, organization_id, currency, timezone, org_name, email, phone, data)
         VALUES ($1, $2, 'INR', 'Asia/Kolkata', $3, $4, '', $5)
         ON CONFLICT (id) DO NOTHING`,
        [orgId, orgId, orgName.trim(), session.email || '', JSON.stringify(defaultSettings)]
      );
    });

    if (session.sessionId) {
      await switchOrganization(session.sessionId, orgId);
    }

    const organization = { id: orgId, name: orgName.trim(), slug, plan: 'trial', seatLimit: 75, subscriptionStatus: 'active', onboardingCompleted: false };
    return res.json({ ok: true, organization, message: 'Library created successfully!' });
  }

  // ── 5. SWITCH LIBRARY ────────────────────────────────────────────────────
  if (action === 'switch_library' || action === 'switch-library') {
    const session = await requireSession(req);
    const { organizationId } = req.body || {};

    if (!organizationId) {
      throw new HttpError(400, 'MISSING_FIELDS', 'organizationId is required.');
    }

    // Verify membership
    const memRes = await query(
      `SELECT * FROM memberships_org WHERE user_id = $1 AND organization_id = $2 AND status = 'active'`,
      [session.userId, organizationId]
    ).catch(() => ({ rows: [] }));

    const userCheck = await query('SELECT organization_id, role FROM users WHERE id = $1', [session.userId]);
    const isPrimary = userCheck.rows[0]?.organization_id === organizationId;

    if (memRes.rows.length === 0 && !isPrimary) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this library.');
    }

    if (session.sessionId) {
      await switchOrganization(session.sessionId, organizationId);
    }

    return res.json({ ok: true, organizationId, message: 'Switched library successfully.' });
  }

  // ── 6. ME (Current User Profile & Sessions) ──────────────────────────────
  if (action === 'me') {
    const session = await requireSession(req);

    const userRes = await query('SELECT * FROM users WHERE id = $1', [session.userId]);
    if (userRes.rows.length === 0) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const u = userRes.rows[0];
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [session.orgId || u.organization_id]);
    const org = orgRes.rows[0] || null;

    // Fetch accessible organizations for this user
    const memberships = await query(
      `SELECT m.organization_id, m.role, o.name, o.slug, o.plan
       FROM memberships_org m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.status = 'active'`,
      [session.userId]
    ).catch(() => ({ rows: [] }));

    const user = {
      id: u.id,
      organizationId: session.orgId || u.organization_id,
      name: u.name,
      email: u.email,
      phone: u.phone || u.phone_e164,
      role: session.role || u.role,
      avatarColor: u.avatar_color,
      firebaseUid: u.firebase_uid,
      hasPassword: Boolean(u.password_hash),
    };

    return res.json({
      ok: true,
      user,
      organization: org,
      libraries: memberships.rows,
    });
  }

  // ── 7. LOGOUT ─────────────────────────────────────────────────────────────
  if (action === 'logout') {
    try {
      const session = await requireSession(req);
      if (session?.sessionId) {
        await revokeSession(session.sessionId);
        await logAuthEvent({ userId: session.userId, organizationId: session.orgId, event: 'logout', ip, userAgent, success: true });
      }
    } catch (_) {}

    clearSessionCookie(res);
    return res.json({ ok: true, message: 'Logged out successfully.' });
  }

  // ── 8. LOGOUT ALL DEVICES ─────────────────────────────────────────────────
  if (action === 'logout_all' || action === 'logout-all') {
    const session = await requireSession(req);
    await revokeAllSessions(session.userId);
    clearSessionCookie(res);
    await logAuthEvent({ userId: session.userId, organizationId: session.orgId, event: 'logout_all', ip, userAgent, success: true });
    return res.json({ ok: true, message: 'Signed out of all devices successfully.' });
  }

  // ── 9. SESSIONS (List & Revoke Specific) ──────────────────────────────────
  if (action === 'sessions') {
    const session = await requireSession(req);
    if (req.method === 'GET') {
      const sessions = await listSessions(session.userId);
      const mapped = sessions.map(s => ({
        id: s.id,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        createdAt: s.created_at,
        lastSeenAt: s.last_seen_at,
        isCurrent: s.id === session.sessionId,
      }));
      return res.json({ ok: true, sessions: mapped });
    }
  }

  if (action === 'revoke_session') {
    const session = await requireSession(req);
    const { sessionId } = req.body || {};
    if (!sessionId) throw new HttpError(400, 'MISSING_FIELDS', 'sessionId is required');

    // Ensure session belongs to this user
    await query('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2', [sessionId, session.userId]);
    return res.json({ ok: true, message: 'Session revoked successfully.' });
  }

  // ── 10. CREATE STAFF INVITATION ───────────────────────────────────────────
  if (action === 'invitations') {
    const session = await requireSession(req);
    if (session.role !== 'owner') {
      throw new HttpError(403, 'FORBIDDEN', 'Only library owners can send staff invitations.');
    }

    const { email, phone, role = 'staff', branchIds = [] } = req.body || {};
    if (!email && !phone) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Either email or phone number is required.');
    }

    await checkRateLimit(query, `invite:org:${session.orgId}`, 20, 3600);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const inviteId = uid('INV');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await query(
      `INSERT INTO invitations (id, organization_id, email, phone_e164, role, branch_ids, token_hash, invited_by, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        inviteId,
        session.orgId,
        email ? email.toLowerCase().trim() : null,
        phone ? phone.trim() : null,
        role,
        branchIds,
        tokenHash,
        session.userId,
        expiresAt,
      ]
    );

    await logAuthEvent({
      userId: session.userId,
      organizationId: session.orgId,
      event: 'invite_created',
      ip,
      userAgent,
      success: true,
    });

    const inviteLink = `/#/invite/${rawToken}`;
    return res.json({ ok: true, inviteId, inviteToken: rawToken, inviteLink, expiresAt });
  }

  // ── 11. INVITATION INFO (Public) ──────────────────────────────────────────
  if (action === 'invitation_info') {
    const token = req.query?.token || req.body?.token;
    if (!token) throw new HttpError(400, 'MISSING_TOKEN', 'Invitation token is required.');

    const tokenHash = hashSessionToken(token);
    const inviteRes = await query(
      `SELECT i.id, i.organization_id, i.email, i.phone_e164, i.role, i.expires_at, i.accepted_at, i.revoked_at, o.name as org_name
       FROM invitations i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.token_hash = $1`,
      [tokenHash]
    );

    if (inviteRes.rows.length === 0) {
      throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invitation not found or link is invalid.');
    }

    const inv = inviteRes.rows[0];
    if (inv.accepted_at) {
      throw new HttpError(410, 'INVITE_ACCEPTED', 'This invitation has already been accepted.');
    }
    if (inv.revoked_at) {
      throw new HttpError(410, 'INVITE_REVOKED', 'This invitation has been revoked.');
    }
    if (new Date() > new Date(inv.expires_at)) {
      throw new HttpError(410, 'INVITE_EXPIRED', 'This invitation has expired.');
    }

    // Mask email or phone for privacy
    const maskedEmail = inv.email ? inv.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}•••${c}`) : null;
    const maskedPhone = inv.phone_e164 ? inv.phone_e164.replace(/^(\+\d{2})(\d+)(\d{4})$/, (_, a, b, c) => `${a}••••••${c}`) : null;

    return res.json({
      ok: true,
      organizationName: inv.org_name,
      role: inv.role,
      email: maskedEmail,
      phone: maskedPhone,
    });
  }

  // ── 12. ACCEPT INVITATION ─────────────────────────────────────────────────
  if (action === 'accept_invitation' || action === 'accept-invitation') {
    const session = await requireSession(req);
    const { token } = req.body || {};
    if (!token) throw new HttpError(400, 'MISSING_TOKEN', 'Invitation token is required.');

    const tokenHash = hashSessionToken(token);
    const inviteRes = await query(
      `SELECT * FROM invitations WHERE token_hash = $1`,
      [tokenHash]
    );

    if (inviteRes.rows.length === 0) {
      throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invitation not found.');
    }

    const inv = inviteRes.rows[0];
    if (inv.accepted_at) throw new HttpError(410, 'INVITE_ACCEPTED', 'Invitation has already been accepted.');
    if (inv.revoked_at) throw new HttpError(410, 'INVITE_REVOKED', 'Invitation has been revoked.');
    if (new Date() > new Date(inv.expires_at)) throw new HttpError(410, 'INVITE_EXPIRED', 'Invitation has expired.');

    // Security: Verify user identity matches invitation recipient
    const userEmail = session.email?.toLowerCase().trim();
    const userPhone = session.phone?.trim();
    const matchesEmail = inv.email && userEmail && inv.email.toLowerCase() === userEmail;
    const matchesPhone = inv.phone_e164 && userPhone && (inv.phone_e164 === userPhone || inv.phone_e164.endsWith(userPhone.slice(-10)));

    if (inv.email && inv.phone_e164) {
      if (!matchesEmail && !matchesPhone) {
        throw new HttpError(403, 'IDENTITY_MISMATCH', 'Your current signed-in account does not match the invitation email or phone.');
      }
    } else if (inv.email && !matchesEmail) {
      throw new HttpError(403, 'IDENTITY_MISMATCH', `This invitation was sent to ${inv.email}. Please sign in with that account.`);
    } else if (inv.phone_e164 && !matchesPhone) {
      throw new HttpError(403, 'IDENTITY_MISMATCH', `This invitation was sent to ${inv.phone_e164}. Please sign in with that phone number.`);
    }

    await withTransaction(async (client) => {
      // Mark accepted
      await client.query('UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1', [inv.id]);

      // Add to memberships_org
      await client.query(
        `INSERT INTO memberships_org (user_id, organization_id, role, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = $3, status = 'active'`,
        [session.userId, inv.organization_id, inv.role]
      );

      // Link branch access
      if (Array.isArray(inv.branch_ids)) {
        for (const bId of inv.branch_ids) {
          await client.query(
            `INSERT INTO user_branches (user_id, branch_id, organization_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [session.userId, bId, inv.organization_id]
          );
        }
      }

      // If user has no active organization, set this one
      await client.query(
        `UPDATE users SET organization_id = COALESCE(organization_id, $1), role = COALESCE(role, $2) WHERE id = $3`,
        [inv.organization_id, inv.role, session.userId]
      );
    });

    if (session.sessionId) {
      await switchOrganization(session.sessionId, inv.organization_id);
    }

    await logAuthEvent({
      userId: session.userId,
      organizationId: inv.organization_id,
      event: 'invite_accepted',
      ip,
      userAgent,
      success: true,
    });

    return res.json({ ok: true, organizationId: inv.organization_id, message: 'Invitation accepted successfully!' });
  }

  // ── 13. PASSWORD RESET (Generic response to prevent enumeration) ───────────
  if (action === 'password_reset' || action === 'password-reset') {
    const { email } = req.body || {};
    await checkRateLimit(query, `pwreset:ip:${ip}`, 10, 3600);
    if (email) {
      await checkRateLimit(query, `pwreset:acc:${email.toLowerCase().trim()}`, 3, 3600);
    }
    // Always returns identical response regardless of whether email exists
    return res.json({
      ok: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    });
  }

  // ── 14. ONBOARDING ────────────────────────────────────────────────────────
  if (action === 'onboarding') {
    const session = await requireSession(req);
    const orgId = session.orgId;

    const orgCheck = await query('SELECT onboarding_completed FROM organizations WHERE id = $1', [orgId]);
    if (orgCheck.rows[0]?.onboarding_completed) {
      throw new HttpError(409, 'ALREADY_COMPLETED', 'Onboarding has already been completed for this organization.');
    }

    const { branchName, city, floorName, roomName, seatCount = 40, plans = [] } = req.body || {};

    await withTransaction(async (client) => {
      const branchId = uid('BR');
      await client.query(
        `INSERT INTO branches (id, organization_id, name, city, address, status, open_time, close_time)
         VALUES ($1, $2, $3, $4, '', 'active', '06:00', '23:00')`,
        [branchId, orgId, branchName || 'Main Branch', city || '']
      );

      const floorId = uid('FLR');
      await client.query(
        `INSERT INTO floors (id, organization_id, branch_id, name, floor_number)
         VALUES ($1, $2, $3, $4, 1)`,
        [floorId, orgId, branchId, floorName || 'Ground Floor']
      );

      const roomId = uid('RM');
      const numSeats = Math.min(Math.max(parseInt(seatCount, 10) || 30, 10), 150);
      await client.query(
        `INSERT INTO rooms (id, organization_id, floor_id, branch_id, name, room_type, capacity)
         VALUES ($1, $2, $3, $4, $5, 'general', $6)`,
        [roomId, orgId, floorId, branchId, roomName || 'Study Hall', numSeats]
      );

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

      const defaultPlans = plans.length > 0 ? plans : [
        { name: 'Monthly Full Day', duration: 30, price: 1500, accessHours: '06:00 – 23:00', desc: 'Full day reserved study seat' },
        { name: 'Monthly Half Day (Morning)', duration: 30, price: 900, accessHours: '06:00 – 14:00', desc: 'Morning slot access' },
        { name: 'Monthly Half Day (Evening)', duration: 30, price: 900, accessHours: '14:00 – 23:00', desc: 'Evening slot access' },
        { name: 'Quarterly (3 Months)', duration: 90, price: 4000, accessHours: '06:00 – 23:00', desc: 'Discounted 3-month pass' },
      ];

      for (const p of defaultPlans) {
        await client.query(
          `INSERT INTO membership_plans (id, organization_id, name, duration, duration_unit, price, description, active, access_hours)
           VALUES ($1, $2, $3, $4, 'days', $5, $6, TRUE, $7)`,
          [uid('PLAN'), orgId, p.name, p.duration, p.price, p.desc || '', p.accessHours || '']
        );
      }

      await client.query(
        `UPDATE organizations SET onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orgId]
      );
    });

    return res.json({ ok: true, message: 'Onboarding completed successfully! Library is ready.' });
  }

  // ── 15. UPDATE PROFILE & PASSWORD ─────────────────────────────────────────
  if (action === 'update_profile') {
    const session = await requireSession(req);
    const { name, phone, currentPassword, newPassword } = req.body || {};
    if (!name) throw new HttpError(400, 'MISSING_NAME', 'Name is required');

    if (newPassword) {
      validatePasswordStrength(newPassword);
      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
      const currentHash = userRes.rows[0]?.password_hash;

      if (currentHash) {
        if (!currentPassword) throw new HttpError(400, 'MISSING_CURRENT_PASSWORD', 'Current password is required');
        const check = verifyPassword(currentPassword, currentHash);
        if (!check.valid) throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
      }

      const newHash = hashPassword(newPassword);
      // Revoke other sessions on password change
      await revokeAllSessions(session.userId, session.sessionId);

      await query(
        `UPDATE users 
         SET name = $1, phone = $2, password_hash = $3, token_version = COALESCE(token_version, 1) + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [name.trim(), phone || '', newHash, session.userId]
      );

      await logAuthEvent({ userId: session.userId, organizationId: session.orgId, event: 'password_changed', ip, userAgent, success: true });
      return res.json({ ok: true, message: 'Password updated successfully! Other sessions signed out.' });
    } else {
      await query('UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [name.trim(), phone || '', session.userId]);
      return res.json({ ok: true, message: 'Profile updated successfully!' });
    }
  }

  // ── 16. UPGRADE PLAN (Disabled) ───────────────────────────────────────────
  if (action === 'upgrade_plan') {
    throw new HttpError(403, 'UPGRADE_DISABLED', 'Self-service plan upgrades are not available. Please contact support to change your plan.');
  }

  throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown auth action');
}, {
  methods: ['GET', 'POST'],
  auth: false, // Per-action authentication handling
  rejectOrgId: false,
});
