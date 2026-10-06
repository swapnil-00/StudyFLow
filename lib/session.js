// lib/session.js — Server-side session management & Multi-tenant roles
// Roles and branch permissions are strictly scoped per organization via org_members & user_branches.
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { HttpError } = require('./errors');
const { deriveSubscription } = require('./subscription');
const { isPlatformAdmin } = require('./platform-admin');

const COOKIE_NAME_HOST = '__Host-sf_session';
const COOKIE_NAME_PLAIN = 'sf_session';

const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;    // 7 days sliding
const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days absolute
const SESSION_TOUCH_INTERVAL_MS = 10 * 60 * 1000;     // refresh last_seen/expiry at most every 10 min

/**
 * Generate a cryptographically random session token (hex-encoded).
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token with SHA-256 for storage.
 */
function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a unique session ID.
 */
function sessionId() {
  return `SES-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
}

/**
 * Create a new server-side session in the database.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.organizationId]
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ token: string, sessionId: string }>}
 */
async function createSession({ userId, organizationId, ip, userAgent }) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const id = sessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

  // If organizationId is not specified, check if user has a default/primary membership
  let targetOrgId = organizationId || null;
  if (!targetOrgId) {
    const memRes = await query(
      `SELECT organization_id FROM org_members 
       WHERE user_id = $1 AND status = 'active' 
       ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    if (memRes.rows.length > 0) {
      targetOrgId = memRes.rows[0].organization_id;
    }
  }

  await query(
    `INSERT INTO sessions (id, user_id, organization_id, session_token_hash, refresh_token_hash, ip_address, user_agent, expires_at, absolute_expires_at, last_seen_at, created_at)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $9)`,
    [id, userId, targetOrgId, tokenHash, ip || '', (userAgent || '').substring(0, 512), expiresAt, absoluteExpiresAt, now]
  );

  return { token, sessionId: id };
}

/**
 * Validate a session token and return the session + user + organization data.
 * Role is strictly loaded from org_members for the active organization (AUTH-02).
 *
 * @param {string} token - The raw session token from the cookie
 * @returns {Promise<Object>} Session data with user, role, branchIds, state, organization
 */
async function validateSession(token) {
  if (!token || typeof token !== 'string') {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  // Hot path: session + user + active-org membership + branch scope in ONE round trip.
  // Role still comes exclusively from org_members for the session's active organization (AUTH-02).
  const sessRes = await query(
    `SELECT s.id, s.user_id, s.organization_id, s.expires_at, s.absolute_expires_at, s.last_seen_at,
            u.id AS u_id, u.name, u.email, u.phone, u.avatar_color, u.status AS user_status,
            u.token_version, u.phone_e164, (u.password_hash IS NOT NULL) AS has_password, (u.firebase_uid IS NOT NULL) AS has_google,
            om.role, om.organization_id AS mem_org_id,
            o.name AS org_name, o.slug, o.plan, o.seat_limit, o.onboarding_completed, o.subscription_status, o.is_demo,
            o.whatsapp_mode, o.whatsapp_auto_status, o.whatsapp_auto_until,
            CASE WHEN om.role IS NOT NULL AND om.role <> 'owner' THEN
              COALESCE((SELECT array_agg(ub.branch_id) FROM user_branches ub
                        WHERE ub.user_id = s.user_id AND ub.organization_id = s.organization_id), '{}')
            END AS branch_ids
     FROM sessions s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN org_members om ON om.user_id = s.user_id AND om.organization_id = s.organization_id AND om.status = 'active'
     LEFT JOIN organizations o ON o.id = om.organization_id
     WHERE s.session_token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > $2`,
    [tokenHash, now]
  );

  if (sessRes.rows.length === 0) {
    throw new HttpError(401, 'INVALID_SESSION', 'Session expired or invalid. Please sign in again.');
  }

  const sess = sessRes.rows[0];

  // Check absolute expiry
  if (sess.absolute_expires_at && now > new Date(sess.absolute_expires_at)) {
    await query('UPDATE sessions SET revoked_at = $1 WHERE id = $2', [now, sess.id]);
    throw new HttpError(401, 'SESSION_EXPIRED', 'Session has expired. Please sign in again.');
  }

  if (!sess.u_id) {
    throw new HttpError(401, 'USER_NOT_FOUND', 'User account not found.');
  }

  const user = {
    id: sess.u_id,
    name: sess.name,
    email: sess.email,
    phone: sess.phone,
    avatar_color: sess.avatar_color,
    status: sess.user_status,
    token_version: sess.token_version,
    phone_e164: sess.phone_e164,
  };

  if (user.status !== 'active') {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled.');
  }

  // Active organization from the joined membership row; null if membership was revoked or deleted
  // If org is demo and user is not owner, refuse membership
  const isDemoOrg = Boolean(sess.is_demo);
  const isValidMember = sess.mem_org_id && (!isDemoOrg || sess.role === 'owner');

  let activeOrgId = isValidMember ? sess.organization_id : null;
  let activeMembership = isValidMember ? {
    role: sess.role,
    organization_id: sess.mem_org_id,
    org_name: sess.org_name,
    slug: sess.slug,
    plan: sess.plan,
    seat_limit: sess.seat_limit,
    onboarding_completed: sess.onboarding_completed,
    subscription_status: sess.subscription_status,
    is_demo: isDemoOrg,
    whatsapp_mode: sess.whatsapp_mode,
    whatsapp_auto_status: sess.whatsapp_auto_status,
    whatsapp_auto_until: sess.whatsapp_auto_until,
  } : null;
  let branchIds = Array.isArray(sess.branch_ids) ? sess.branch_ids : [];

  // If no active org on session, check if user has other valid memberships
  if (!activeMembership) {
    const allMems = await query(
      `SELECT om.role, om.status, om.organization_id,
              o.name as org_name, o.slug, o.plan, o.seat_limit, o.onboarding_completed, o.subscription_status, o.is_demo,
              o.whatsapp_mode, o.whatsapp_auto_status, o.whatsapp_auto_until
       FROM org_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active'
         AND (o.is_demo IS NOT TRUE OR om.role = 'owner')
       ORDER BY om.created_at ASC`,
      [user.id]
    );
    if (allMems.rows.length > 0) {
      activeMembership = allMems.rows[0];
      activeOrgId = activeMembership.organization_id;
      // Update session with this org
      await query('UPDATE sessions SET organization_id = $1 WHERE id = $2', [activeOrgId, sess.id]);
    }
  }

  let role = activeMembership ? activeMembership.role : null;
  let organization = null;

  if (activeMembership) {
    // Plan/seat/WhatsApp facts are normalised once here (lib/subscription.js) so every
    // caller sees the same plan key and seat limit as api/write.js enforces.
    const subscription = deriveSubscription(activeMembership);
    organization = {
      id: activeMembership.organization_id,
      name: activeMembership.org_name,
      slug: activeMembership.slug,
      plan: subscription.plan,
      seat_limit: subscription.seatLimit,
      onboarding_completed: Boolean(activeMembership.onboarding_completed),
      subscription_status: activeMembership.subscription_status,
      is_demo: Boolean(activeMembership.is_demo),
      role: activeMembership.role,
      whatsapp_mode: subscription.whatsappMode,
      subscription,
    };

    // Branch scoping for non-owners (already loaded by the hot-path query unless the org changed above)
    if (role === 'owner') {
      branchIds = [];
    } else if (activeOrgId !== sess.organization_id) {
      const branchRes = await query(
        'SELECT branch_id FROM user_branches WHERE user_id = $1 AND organization_id = $2',
        [user.id, activeOrgId]
      );
      branchIds = branchRes.rows.map(r => r.branch_id);
    }
  }

  // Compute Server Auth State (AUTH-05, Plan §3.1)
  let state = 'anonymous';
  if (!activeOrgId || !activeMembership) {
    state = 'no_library';
  } else if (role === 'owner' && !organization.onboarding_completed) {
    state = 'needs_onboarding';
  } else {
    state = 'ready';
  }

  // Slide session expiry, but write at most once per SESSION_TOUCH_INTERVAL_MS to keep reads write-free
  const lastSeenMs = sess.last_seen_at ? new Date(sess.last_seen_at).getTime() : 0;
  if (now.getTime() - lastSeenMs >= SESSION_TOUCH_INTERVAL_MS) {
    const newExpiry = new Date(Math.min(
      now.getTime() + SESSION_IDLE_MS,
      sess.absolute_expires_at ? new Date(sess.absolute_expires_at).getTime() : now.getTime() + SESSION_ABSOLUTE_MS
    ));

    await query(
      'UPDATE sessions SET last_seen_at = $1, expires_at = $2 WHERE id = $3',
      [now, newExpiry, sess.id]
    );
  }

  return {
    sessionId: sess.id,
    userId: user.id,
    orgId: activeOrgId,
    role,
    branchIds,
    email: user.email,
    name: user.name,
    phone: user.phone || user.phone_e164,
    avatarColor: user.avatar_color,
    tokenVersion: user.token_version,
    hasPassword: Boolean(sess.has_password),
    hasGoogle: Boolean(sess.has_google),
    isPlatformAdmin: isPlatformAdmin(user.email),
    state,
    organization,
  };
}

/**
 * Switch active library on a session with session rotation (AUTH-02, AUTH-13).
 *
 * @param {string} sessionId
 * @param {string} organizationId
 * @param {string} userId
 * @returns {Promise<{ token: string, sessionId: string, role: string }>}
 */
async function switchOrganization(sessionId, organizationId, userId) {
  // 1. Verify user is an active member of the target organization
  const memRes = await query(
    `SELECT om.role, o.is_demo 
     FROM org_members om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1 AND om.organization_id = $2 AND om.status = 'active'`,
    [userId, organizationId]
  );

  if (memRes.rows.length === 0) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have active membership in this library.');
  }

  const { role, is_demo } = memRes.rows[0];
  if (is_demo && role !== 'owner') {
    throw new HttpError(403, 'DEMO_LOCKED', "The demo library can't have other members.");
  }

  // 2. Rotate session token on library switch
  const newToken = generateSessionToken();
  const newTokenHash = hashSessionToken(newToken);
  const now = new Date();

  await query(
    `UPDATE sessions 
     SET organization_id = $1, session_token_hash = $2, refresh_token_hash = $2, last_seen_at = $3
     WHERE id = $4 AND user_id = $5`,
    [organizationId, newTokenHash, now, sessionId, userId]
  );

  return {
    token: newToken,
    sessionId,
    role,
    organizationId,
  };
}

/**
 * Rotate an existing session ID / token (e.g. upon login or privilege change).
 */
async function rotateSession(sessionId, userId, organizationId = null) {
  const newToken = generateSessionToken();
  const newTokenHash = hashSessionToken(newToken);
  const now = new Date();

  await query(
    `UPDATE sessions 
     SET session_token_hash = $1, refresh_token_hash = $1, organization_id = COALESCE($2, organization_id), last_seen_at = $3
     WHERE id = $4 AND user_id = $5`,
    [newTokenHash, organizationId, now, sessionId, userId]
  );

  return newToken;
}

/**
 * Revoke a single session.
 */
async function revokeSession(sessionId) {
  await query(
    'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND revoked_at IS NULL',
    [sessionId]
  );
}

/**
 * Revoke all sessions for a user (optionally except one).
 */
async function revokeAllSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await query(
      'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL',
      [userId, exceptSessionId]
    );
  } else {
    await query(
      'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  }
}

/**
 * List active sessions for a user.
 */
async function listSessions(userId) {
  const res = await query(
    `SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at
     FROM sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY last_seen_at DESC`,
    [userId]
  );
  return res.rows;
}

/**
 * Set the session cookie on the response with __Host- prefix when secure.
 */
function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_IDLE_MS / 1000);
  const isProd = process.env.NODE_ENV === 'production';
  
  // Set the primary __Host- cookie in production, and standard cookie in dev/fallback
  const cookieName = isProd ? COOKIE_NAME_HOST : COOKIE_NAME_PLAIN;
  const cookieVal = `${cookieName}=${token}; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  
  res.setHeader('Set-Cookie', cookieVal);
}

/**
 * Clear the session cookie.
 */
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookies = [
    `${COOKIE_NAME_HOST}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    `${COOKIE_NAME_PLAIN}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  ];
  res.setHeader('Set-Cookie', cookies);
}

/**
 * Parse the session token from request cookies (supports both __Host- and plain prefix).
 */
function getSessionTokenFromCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const hostMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME_HOST}=([^;]+)`));
  if (hostMatch) return hostMatch[1];

  const plainMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME_PLAIN}=([^;]+)`));
  return plainMatch ? plainMatch[1] : null;
}

module.exports = {
  COOKIE_NAME: COOKIE_NAME_HOST,
  createSession,
  validateSession,
  switchOrganization,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookie,
  hashSessionToken,
  generateSessionToken,
};
