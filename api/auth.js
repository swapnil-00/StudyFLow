// api/auth.js — Multi-Tenant Authentication, State Machine & Identity Management Endpoint
// Upgraded for strict Firebase Auth, HttpOnly __Host- cookie sessions, Role-per-library scoping,
// Pre-account takeover mitigation, Atomic invitations, and Router state management.
'use strict';
const crypto = require('crypto');
const { query, withTransaction } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { hashPassword, verifyPassword, validatePasswordStrength, requireSession } = require('../lib/auth');
const {
  createSession,
  validateSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
  switchOrganization,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookie,
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

async function logAuthEvent({ userId, organizationId, event, method, ip, userAgent, success, metadata }) {
  try {
    const id = uid('EVT');
    await query(
      `INSERT INTO auth_events (id, user_id, organization_id, event, method, ip, user_agent, success, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        id,
        userId || null,
        organizationId || null,
        event,
        method || '',
        ip || '',
        (userAgent || '').substring(0, 512),
        Boolean(success),
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (e) {
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
    const { idToken, intent = 'login', inviteToken, termsAccepted } = req.body || {};
    if (!idToken) {
      throw new HttpError(400, 'MISSING_TOKEN', 'Firebase ID token is required');
    }

    // Rate limit per IP (AUTH-14)
    await checkRateLimit(query, `auth:session:ip:${ip}`, 30, 60);

    const verified = await verifyFirebaseIdToken(idToken);
    const { uid: firebaseUid, email, email_verified, phone_number, name } = verified;
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanPhone = phone_number ? phone_number.trim() : null;
    const authMethod = cleanPhone ? 'phone' : 'google';

    // Rate limit per Email / Phone and per Firebase UID (AUTH-14)
    if (cleanEmail) await checkRateLimit(query, `auth:session:acc:${cleanEmail}`, 15, 60);
    if (cleanPhone) await checkRateLimit(query, `auth:session:acc:${cleanPhone}`, 15, 60);
    await checkRateLimit(query, `auth:session:uid:${firebaseUid}`, 15, 60);

    let user = null;

    // 1. Look up by firebase_uid
    const byFirebase = await query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
    if (byFirebase.rows.length > 0) {
      user = byFirebase.rows[0];
    }

    // 2. Link by email (AUTH-03: Pre-account takeover mitigation)
    if (!user && cleanEmail && email_verified) {
      const byEmail = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (byEmail.rows.length > 0) {
        user = byEmail.rows[0];
        if (user.email_verified_at) {
          // Safe link: existing account had verified email
          await query(
            `UPDATE users 
             SET firebase_uid = COALESCE(firebase_uid, $1), updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [firebaseUid, user.id]
          );
        } else {
          // Existing account email was unverified (possible attacker pre-registration).
          // Google verified identity claims the account, wipes unverified password, and revokes all old sessions!
          await query(
            `UPDATE users 
             SET firebase_uid = $1, password_hash = NULL, email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [firebaseUid, user.id]
          );
          await revokeAllSessions(user.id);
        }
      }
    }

    // 3. Link by phone (AUTH-04: Only against verified phone_e164)
    if (!user && cleanPhone) {
      const byPhone = await query('SELECT * FROM users WHERE phone_e164 = $1 AND phone_verified_at IS NOT NULL', [cleanPhone]);
      if (byPhone.rows.length > 0) {
        user = byPhone.rows[0];
        await query(
          `UPDATE users 
           SET firebase_uid = COALESCE(firebase_uid, $1), updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [firebaseUid, user.id]
        );
      }
    }

    // Intent Handling (AUTH-07): Separate login from sign-up
    if (!user) {
      if (intent === 'login') {
        // AUTH-07: Never silently create accounts on login page
        await logAuthEvent({ event: 'login_no_account', method: authMethod, ip, userAgent, success: false });
        throw new HttpError(
          404,
          'NO_ACCOUNT',
          `No StudyFlow account found for ${cleanEmail || cleanPhone || 'this account'}. Please create a library or ask your library owner for an invite.`
        );
      }

      // Signup or Invite Intent: Create new user
      const newUserId = uid('USR');
      const avatarColor = randomAvatarColor();
      const userName = (name || cleanEmail?.split('@')[0] || (cleanPhone ? `User ${cleanPhone.slice(-4)}` : 'Library User')).trim();

      const userInsert = await query(
        `INSERT INTO users (id, firebase_uid, email, phone_e164, phone, name, avatar_color, status, email_verified_at, phone_verified_at, terms_accepted_at, terms_version, token_version, created_at)
         VALUES ($1, $2, $3, $4, $4, $5, $6, 'active', $7, $8, $9, '1.0', 1, CURRENT_TIMESTAMP)
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
          termsAccepted ? new Date() : new Date(),
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
      await logAuthEvent({ userId: user.id, event: 'login_blocked', method: authMethod, ip, userAgent, success: false });
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled. Please contact support.');
    }

    // Handle Invite Token if supplied during session creation
    let inviteOrgId = null;
    if (inviteToken) {
      const inviteHash = hashSessionToken(inviteToken);
      const invRes = await query(
        `UPDATE invitations 
         SET accepted_at = CURRENT_TIMESTAMP 
         WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP 
         RETURNING *`,
        [inviteHash]
      );
      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        inviteOrgId = inv.organization_id;

        await query(
          `INSERT INTO org_members (user_id, organization_id, role, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (user_id, organization_id) DO UPDATE SET role = $3, status = 'active'`,
          [user.id, inv.organization_id, inv.role]
        );

        if (Array.isArray(inv.branch_ids)) {
          for (const bId of inv.branch_ids) {
            await query(
              `INSERT INTO user_branches (user_id, branch_id, organization_id)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [user.id, bId, inv.organization_id]
            );
          }
        }
      }
    }

    // Update last login
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Create server-side session
    const { token: sessionToken } = await createSession({
      userId: user.id,
      organizationId: inviteOrgId || null,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    // Validate and load full state with organization & role from org_members (AUTH-02)
    const sessionData = await validateSession(sessionToken);

    await logAuthEvent({
      userId: user.id,
      organizationId: sessionData.orgId,
      event: 'login_success',
      method: authMethod,
      ip,
      userAgent,
      success: true,
    });

    // Fetch all memberships
    const memberships = await query(
      `SELECT om.organization_id, om.role, o.name, o.slug, o.plan, o.onboarding_completed
       FROM org_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active'`,
      [user.id]
    );

    return res.json({
      ok: true,
      state: sessionData.state,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || user.phone_e164,
        role: sessionData.role,
        avatarColor: user.avatar_color,
      },
      activeLibrary: sessionData.organization,
      libraries: memberships.rows,
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
      await logAuthEvent({ userId: u.id, event: 'login_failed_no_password', method: 'password', ip, userAgent, success: false });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Please use "Continue with Google" to sign in to this account.');
    }

    const check = verifyPassword(password, u.password_hash);
    if (!check.valid) {
      await logAuthEvent({ userId: u.id, event: 'login_failed_password', method: 'password', ip, userAgent, success: false });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (u.status !== 'active') {
      await logAuthEvent({ userId: u.id, event: 'login_blocked', method: 'password', ip, userAgent, success: false });
      throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled. Please contact support.');
    }

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [u.id]);

    const { token: sessionToken } = await createSession({
      userId: u.id,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    const sessionData = await validateSession(sessionToken);

    await logAuthEvent({
      userId: u.id,
      organizationId: sessionData.orgId,
      event: 'login_success',
      method: 'password',
      ip,
      userAgent,
      success: true,
    });

    const memberships = await query(
      `SELECT om.organization_id, om.role, o.name, o.slug, o.plan, o.onboarding_completed
       FROM org_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active'`,
      [u.id]
    );

    return res.json({
      ok: true,
      state: sessionData.state,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || u.phone_e164,
        role: sessionData.role,
        avatarColor: u.avatar_color,
      },
      activeLibrary: sessionData.organization,
      libraries: memberships.rows,
      message: 'Signed in successfully!',
    });
  }

  // ── 3. REGISTER (Email + Password Sign-Up) ────────────────────────────────
  if (action === 'register') {
    const { name, email, password, phone, termsAccepted } = req.body || {};

    if (!name || !email || !password) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Name, email, and password are required.');
    }

    if (!termsAccepted) {
      throw new HttpError(400, 'TERMS_REQUIRED', 'You must agree to the Terms of Service and Privacy Policy.');
    }

    const cleanEmail = email.toLowerCase().trim();
    validatePasswordStrength(password);

    await checkRateLimit(query, `register:ip:${ip}`, 10, 3600);

    const existing = await query('SELECT id, email_verified_at FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'EMAIL_EXISTS', 'An account with this email already exists. Please sign in.');
    }

    const userId = uid('USR');
    const passwordHash = hashPassword(password);
    const avatarColor = randomAvatarColor();

    await query(
      `INSERT INTO users (id, name, email, password_hash, phone, avatar_color, status, terms_accepted_at, terms_version, token_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, '1.0', 1, CURRENT_TIMESTAMP)`,
      [userId, name.trim(), cleanEmail, passwordHash, phone ? phone.trim() : '', avatarColor]
    );

    await query(
      `INSERT INTO user_identities (id, user_id, provider, provider_subject, created_at)
       VALUES ($1, $2, 'password', $3, CURRENT_TIMESTAMP)`,
      [uid('IDN'), userId, cleanEmail]
    );

    const { token: sessionToken } = await createSession({
      userId,
      ip,
      userAgent,
    });

    setSessionCookie(res, sessionToken);

    await logAuthEvent({
      userId,
      event: 'register_success',
      method: 'password',
      ip,
      userAgent,
      success: true,
    });

    return res.json({
      ok: true,
      state: 'needs_library',
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone || '',
        avatarColor,
        role: null,
      },
      activeLibrary: null,
      libraries: [],
      message: 'Account created successfully! Please set up your library.',
    });
  }

  // ── 4. CREATE LIBRARY (AUTH-02 & AUTH-09) ─────────────────────────────────
  if (action === 'create_library' || action === 'create-library') {
    const session = await requireSession(req);
    const { orgName, city } = req.body || {};

    if (!orgName || typeof orgName !== 'string' || !orgName.trim()) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Library name is required.');
    }

    // Rate limit library creation per user (AUTH-09)
    await checkRateLimit(query, `create_library:user:${session.userId}`, 5, 86400);

    const orgId = uid('ORG');
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'library';
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug.substring(0, 80)}-${slugSuffix}`;

    await withTransaction(async (client) => {
      // 1. Create Organization
      await client.query(
        `INSERT INTO organizations (id, name, slug, email, phone, plan, seat_limit, subscription_status, currency, onboarding_completed)
         VALUES ($1, $2, $3, $4, '', 'trial', 75, 'active', 'INR', FALSE)`,
        [orgId, orgName.trim(), slug, session.email || '']
      );

      // 2. Insert Membership as 'owner' for THIS library only (AUTH-02)
      await client.query(
        `INSERT INTO org_members (user_id, organization_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active'`,
        [session.userId, orgId]
      );

      // 3. Settings entry
      const defaultSettings = {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        orgName: orgName.trim(),
        city: city ? city.trim() : '',
        theme: 'light',
      };
      await client.query(
        `INSERT INTO settings (id, organization_id, currency, timezone, org_name, email, phone, data)
         VALUES ($1, $2, 'INR', 'Asia/Kolkata', $3, $4, '', $5)
         ON CONFLICT (id) DO NOTHING`,
        [orgId, orgId, orgName.trim(), session.email || '', JSON.stringify(defaultSettings)]
      );
    });

    // 4. Switch and rotate session
    const switchRes = await switchOrganization(session.sessionId, orgId, session.userId);
    setSessionCookie(res, switchRes.token);

    const activeLibrary = {
      id: orgId,
      name: orgName.trim(),
      slug,
      plan: 'trial',
      onboarding_completed: false,
      subscription_status: 'active',
      role: 'owner',
    };

    return res.json({
      ok: true,
      state: 'needs_onboarding',
      activeLibrary,
      message: 'Library created successfully! Please complete setup.',
    });
  }

  // ── 5. SWITCH LIBRARY (AUTH-02) ───────────────────────────────────────────
  if (action === 'switch_library' || action === 'switch-library') {
    const session = await requireSession(req);
    const { organizationId } = req.body || {};

    if (!organizationId) {
      throw new HttpError(400, 'MISSING_FIELDS', 'organizationId is required.');
    }

    const switchRes = await switchOrganization(session.sessionId, organizationId, session.userId);
    setSessionCookie(res, switchRes.token);

    const sessionData = await validateSession(switchRes.token);

    return res.json({
      ok: true,
      state: sessionData.state,
      activeLibrary: sessionData.organization,
      message: 'Switched library successfully.',
    });
  }

  // ── 6. ME (AUTH-05: Server Decided State) ─────────────────────────────────
  if (action === 'me') {
    const cookieToken = getSessionTokenFromCookie(req);
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return res.json({
        ok: true,
        state: 'anonymous',
        user: null,
        activeLibrary: null,
        libraries: [],
      });
    }

    let sessionData;
    try {
      sessionData = await validateSession(token);
    } catch {
      return res.json({
        ok: true,
        state: 'anonymous',
        user: null,
        activeLibrary: null,
        libraries: [],
      });
    }

    const memberships = await query(
      `SELECT om.organization_id, om.role, o.name, o.slug, o.plan, o.onboarding_completed
       FROM org_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active'`,
      [sessionData.userId]
    );

    return res.json({
      ok: true,
      state: sessionData.state,
      user: {
        id: sessionData.userId,
        name: sessionData.name,
        email: sessionData.email,
        phone: sessionData.phone,
        role: sessionData.role,
        avatarColor: sessionData.avatarColor,
      },
      activeLibrary: sessionData.organization,
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
    return res.json({ ok: true, state: 'anonymous', message: 'Logged out successfully.' });
  }

  // ── 8. LOGOUT ALL DEVICES ─────────────────────────────────────────────────
  if (action === 'logout_all' || action === 'logout-all') {
    const session = await requireSession(req);
    await revokeAllSessions(session.userId);
    clearSessionCookie(res);
    await logAuthEvent({ userId: session.userId, organizationId: session.orgId, event: 'logout_all', ip, userAgent, success: true });
    return res.json({ ok: true, state: 'anonymous', message: 'Signed out of all devices successfully.' });
  }

  // ── 9. SESSIONS (List & Revoke) ───────────────────────────────────────────
  if (action === 'sessions') {
    const session = await requireSession(req);
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

  if (action === 'revoke_session') {
    const session = await requireSession(req);
    const { sessionId } = req.body || {};
    if (!sessionId) throw new HttpError(400, 'MISSING_FIELDS', 'sessionId is required');

    await query('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2', [sessionId, session.userId]);
    return res.json({ ok: true, message: 'Session revoked successfully.' });
  }

  // ── 10. CREATE INVITATION (AUTH-11: Hardened) ──────────────────────────────
  if (action === 'invitations') {
    const session = await requireSession(req);
    if (session.role !== 'owner' && session.role !== 'manager') {
      throw new HttpError(403, 'FORBIDDEN', 'Only library owners or managers can send staff invitations.');
    }

    const { email, phone, role = 'staff', branchIds = [] } = req.body || {};
    if (!email && !phone) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Either email or phone number is required.');
    }

    // AUTH-11: Strict role allowlist (cannot invite owners)
    if (!['manager', 'staff'].includes(role)) {
      throw new HttpError(400, 'INVALID_ROLE', 'Invitations can only be created for manager or staff roles.');
    }

    // AUTH-11: Validate all branchIds belong to current organization
    if (Array.isArray(branchIds) && branchIds.length > 0) {
      const validBranches = await query(
        `SELECT id FROM branches WHERE organization_id = $1 AND id = ANY($2::text[])`,
        [session.orgId, branchIds]
      );
      if (validBranches.rows.length !== branchIds.length) {
        throw new HttpError(400, 'INVALID_BRANCHES', 'One or more assigned branches do not belong to this library.');
      }
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

  // ── 12. ACCEPT INVITATION (AUTH-11: Atomic) ───────────────────────────────
  if (action === 'accept_invitation' || action === 'accept-invitation') {
    const session = await requireSession(req);
    const { token } = req.body || {};
    if (!token) throw new HttpError(400, 'MISSING_TOKEN', 'Invitation token is required.');

    const tokenHash = hashSessionToken(token);

    // Atomic accept check (AUTH-11)
    const invRes = await query(
      `UPDATE invitations 
       SET accepted_at = CURRENT_TIMESTAMP 
       WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP 
       RETURNING *`,
      [tokenHash]
    );

    if (invRes.rows.length === 0) {
      throw new HttpError(400, 'INVITE_INVALID', 'Invitation is either invalid, already accepted, revoked, or expired.');
    }

    const inv = invRes.rows[0];

    // Add to org_members
    await query(
      `INSERT INTO org_members (user_id, organization_id, role, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = $3, status = 'active'`,
      [session.userId, inv.organization_id, inv.role]
    );

    // Link branch access
    if (Array.isArray(inv.branch_ids)) {
      for (const bId of inv.branch_ids) {
        await query(
          `INSERT INTO user_branches (user_id, branch_id, organization_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [session.userId, bId, inv.organization_id]
        );
      }
    }

    // Switch session to newly accepted organization
    const switchRes = await switchOrganization(session.sessionId, inv.organization_id, session.userId);
    setSessionCookie(res, switchRes.token);

    await logAuthEvent({
      userId: session.userId,
      organizationId: inv.organization_id,
      event: 'invite_accepted',
      ip,
      userAgent,
      success: true,
    });

    return res.json({
      ok: true,
      state: 'ready',
      organizationId: inv.organization_id,
      message: 'Invitation accepted successfully!',
    });
  }

  // ── 13. ONBOARDING (AUTH-08: Owner-only & Idempotent) ─────────────────────
  if (action === 'onboarding') {
    const session = await requireSession(req);
    const orgId = session.orgId;

    if (!orgId) {
      throw new HttpError(409, 'NEEDS_LIBRARY', 'No library selected.');
    }

    if (session.role !== 'owner') {
      throw new HttpError(403, 'FORBIDDEN', 'Only library owners can complete onboarding.');
    }

    const { branchName, city, floorName, roomName, seatCount = 40, plans = [] } = req.body || {};

    await withTransaction(async (client) => {
      // Check if branches already exist
      const branchCheck = await client.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgId]);
      let branchId;

      if (branchCheck.rows.length === 0) {
        branchId = uid('BR');
        await client.query(
          `INSERT INTO branches (id, organization_id, name, city, address, status, open_time, close_time)
           VALUES ($1, $2, $3, $4, '', 'active', '06:00', '23:00')`,
          [branchId, orgId, branchName ? branchName.trim() : 'Main Branch', city ? city.trim() : '']
        );

        const floorId = uid('FLR');
        await client.query(
          `INSERT INTO floors (id, organization_id, branch_id, name, floor_number)
           VALUES ($1, $2, $3, $4, 1)`,
          [floorId, orgId, branchId, floorName ? floorName.trim() : 'Ground Floor']
        );

        const roomId = uid('RM');
        const numSeats = Math.min(Math.max(parseInt(seatCount, 10) || 30, 10), 150);
        await client.query(
          `INSERT INTO rooms (id, organization_id, floor_id, branch_id, name, room_type, capacity)
           VALUES ($1, $2, $3, $4, $5, 'general', $6)`,
          [roomId, orgId, floorId, branchId, roomName ? roomName.trim() : 'Study Hall', numSeats]
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
          { name: 'Monthly Membership', duration: 30, price: 500, accessHours: '06:00 – 23:00', desc: 'Full day study seat access' },
        ];

        for (const p of defaultPlans) {
          await client.query(
            `INSERT INTO membership_plans (id, organization_id, name, duration, duration_unit, price, description, active, access_hours)
             VALUES ($1, $2, $3, $4, 'days', $5, $6, TRUE, $7)`,
            [uid('PLAN'), orgId, p.name, p.duration, p.price, p.desc || '', p.accessHours || '']
          );
        }
      }

      await client.query(
        `UPDATE organizations SET onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orgId]
      );
    });

    return res.json({ ok: true, state: 'ready', message: 'Onboarding completed successfully! Library is ready.' });
  }

  // ── 14. PASSWORD RESET REQUEST & CONFIRM (AUTH-10) ────────────────────────
  if (action === 'password_reset_request') {
    const { email } = req.body || {};
    if (!email) throw new HttpError(400, 'MISSING_EMAIL', 'Email address is required.');

    const cleanEmail = email.toLowerCase().trim();
    await checkRateLimit(query, `pwreset:ip:${ip}`, 10, 3600);
    await checkRateLimit(query, `pwreset:acc:${cleanEmail}`, 3, 3600);

    const userRes = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length > 0) {
      const uId = userRes.rows[0].id;
      const rawCode = crypto.randomInt(100000, 999999).toString();
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await query(
        `INSERT INTO auth_events (id, user_id, event, method, ip, metadata, created_at)
         VALUES ($1, $2, 'password_reset_requested', 'code', $3, $4, CURRENT_TIMESTAMP)`,
        [uid('EVT'), uId, ip, JSON.stringify({ codeHash, expiresAt: expiresAt.toISOString(), attempts: 0 })]
      );
    }

    return res.json({
      ok: true,
      message: 'If an account exists with this email address, a password reset code has been sent.',
    });
  }

  if (action === 'password_reset_confirm') {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      throw new HttpError(400, 'MISSING_FIELDS', 'Email, reset code, and new password are required.');
    }

    validatePasswordStrength(newPassword);
    const cleanEmail = email.toLowerCase().trim();

    const userRes = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      throw new HttpError(400, 'INVALID_CODE', 'Invalid or expired password reset code.');
    }

    const userId = userRes.rows[0].id;
    const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

    const evtRes = await query(
      `SELECT id, metadata FROM auth_events 
       WHERE user_id = $1 AND event = 'password_reset_requested' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (evtRes.rows.length === 0) {
      throw new HttpError(400, 'INVALID_CODE', 'No active reset request found.');
    }

    const meta = evtRes.rows[0].metadata || {};
    if (new Date() > new Date(meta.expiresAt)) {
      throw new HttpError(400, 'CODE_EXPIRED', 'Password reset code has expired. Please request a new one.');
    }

    if (meta.codeHash !== codeHash) {
      throw new HttpError(400, 'INVALID_CODE', 'Incorrect reset code.');
    }

    const newHash = hashPassword(newPassword);
    await query(
      `UPDATE users 
       SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), token_version = COALESCE(token_version, 1) + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newHash, userId]
    );

    // Revoke all sessions upon password reset (AUTH-10)
    await revokeAllSessions(userId);

    await logAuthEvent({ userId, event: 'password_reset_completed', method: 'code', ip, userAgent, success: true });

    return res.json({ ok: true, message: 'Password has been reset successfully! Please sign in with your new password.' });
  }

  // ── 15. UPDATE PROFILE & PASSWORD (AUTH-12) ───────────────────────────────
  if (action === 'update_profile') {
    const session = await requireSession(req);
    const { name, phone, currentPassword, newPassword, idToken } = req.body || {};
    if (!name) throw new HttpError(400, 'MISSING_NAME', 'Name is required');

    if (newPassword) {
      validatePasswordStrength(newPassword);
      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
      const currentHash = userRes.rows[0]?.password_hash;

      if (currentHash) {
        if (!currentPassword) throw new HttpError(400, 'MISSING_CURRENT_PASSWORD', 'Current password is required');
        const check = verifyPassword(currentPassword, currentHash);
        if (!check.valid) throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
      } else {
        // Setting password on Google/Phone account: require recent authentication within 5 min (AUTH-12)
        if (idToken) {
          await verifyFirebaseIdToken(idToken, { maxAgeSeconds: 300 });
        }
      }

      const newHash = hashPassword(newPassword);
      await revokeAllSessions(session.userId, session.sessionId);

      await query(
        `UPDATE users 
         SET name = $1, phone = $2, password_hash = $3, token_version = COALESCE(token_version, 1) + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [name.trim(), phone ? phone.trim() : '', newHash, session.userId]
      );

      await logAuthEvent({ userId: session.userId, organizationId: session.orgId, event: 'password_changed', ip, userAgent, success: true });
      return res.json({ ok: true, message: 'Password updated successfully! Other sessions signed out.' });
    } else {
      await query('UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [name.trim(), phone ? phone.trim() : '', session.userId]);
      return res.json({ ok: true, message: 'Profile updated successfully!' });
    }
  }

  throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown auth action');
}, {
  methods: ['GET', 'POST'],
  auth: false, // Per-action authentication handling
  rejectOrgId: false,
});
