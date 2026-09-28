// lib/session.js — Server-side session management (cookie-based, DB-backed)
// Replaces localStorage JWT tokens with HttpOnly cookie sessions.
// Session ID: 32 random bytes, stored only as SHA-256 in the sessions table.
'use strict';
const crypto = require('crypto');
const { query } = require('./db');
const { HttpError } = require('./errors');

const COOKIE_NAME = 'sf_session';
const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;    // 7 days sliding
const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days absolute

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
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.organizationId
 * @param {string} params.ip
 * @param {string} params.userAgent
 * @returns {{ token: string, sessionRow: Object }}
 */
async function createSession({ userId, organizationId, ip, userAgent }) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const id = sessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

  await query(
    `INSERT INTO sessions (id, user_id, organization_id, session_token_hash, ip_address, user_agent, expires_at, absolute_expires_at, last_seen_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
    [id, userId, organizationId || null, tokenHash, ip || '', (userAgent || '').substring(0, 512), expiresAt, absoluteExpiresAt, now]
  );

  // Also set refresh_token_hash to the same value for backward compatibility with existing sessions table
  await query(
    `UPDATE sessions SET refresh_token_hash = $1 WHERE id = $2 AND refresh_token_hash IS NULL`,
    [tokenHash, id]
  ).catch(() => {});

  return { token, sessionId: id };
}

/**
 * Validate a session token and return the session + user data.
 * Loads user status, role, and branch IDs FROM THE DB on every request.
 * Slides the expiry if still within the absolute limit.
 * @param {string} token - The raw session token from the cookie
 * @returns {Object} Session data with user, role, branches
 */
async function validateSession(token) {
  if (!token || typeof token !== 'string') {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  // Look up session (not revoked, not expired)
  const sessRes = await query(
    `SELECT s.id, s.user_id, s.organization_id, s.expires_at, s.absolute_expires_at, s.last_seen_at, s.created_at
     FROM sessions s
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
    // Revoke the session
    await query('UPDATE sessions SET revoked_at = $1 WHERE id = $2', [now, sess.id]);
    throw new HttpError(401, 'SESSION_EXPIRED', 'Session has expired. Please sign in again.');
  }

  // Load user from DB (never trust cached role/branches)
  const userRes = await query(
    `SELECT id, organization_id, name, email, phone, role, avatar_color, status, token_version, firebase_uid, phone_e164
     FROM users WHERE id = $1`,
    [sess.user_id]
  );

  if (userRes.rows.length === 0) {
    throw new HttpError(401, 'USER_NOT_FOUND', 'User account not found.');
  }

  const user = userRes.rows[0];

  if (user.status !== 'active') {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled.');
  }

  // Load branch IDs for non-owner roles
  let branchIds = [];
  if (user.role !== 'owner') {
    const branchRes = await query(
      'SELECT branch_id FROM user_branches WHERE user_id = $1',
      [sess.user_id]
    ).catch(() => ({ rows: [] }));
    branchIds = branchRes.rows.map(r => r.branch_id);
  }

  // Slide the session expiry (but not beyond absolute)
  const newExpiry = new Date(Math.min(
    now.getTime() + SESSION_IDLE_MS,
    sess.absolute_expires_at ? new Date(sess.absolute_expires_at).getTime() : now.getTime() + SESSION_ABSOLUTE_MS
  ));

  await query(
    'UPDATE sessions SET last_seen_at = $1, expires_at = $2 WHERE id = $3',
    [now, newExpiry, sess.id]
  );

  // Use the session's active organization (may differ from user.organization_id for multi-library)
  const activeOrgId = sess.organization_id || user.organization_id;

  return {
    sessionId: sess.id,
    userId: user.id,
    orgId: activeOrgId,
    role: user.role,
    branchIds,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarColor: user.avatar_color,
    tokenVersion: user.token_version,
  };
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
 * Revoke all sessions for a user in a specific organization.
 */
async function revokeOrgSessions(userId, organizationId) {
  await query(
    'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND organization_id = $2 AND revoked_at IS NULL',
    [userId, organizationId]
  );
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
 * Switch the active organization on a session.
 */
async function switchOrganization(sessionId, organizationId) {
  await query(
    'UPDATE sessions SET organization_id = $1 WHERE id = $2',
    [organizationId, sessionId]
  );
}

/**
 * Set the session cookie on the response.
 */
function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_IDLE_MS / 1000);
  const secure = process.env.NODE_ENV === 'production';
  const cookie = `${COOKIE_NAME}=${token}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  res.setHeader('Set-Cookie', cookie);
}

/**
 * Clear the session cookie.
 */
function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = `${COOKIE_NAME}=; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`;
  res.setHeader('Set-Cookie', cookie);
}

/**
 * Parse the session token from the request cookie.
 */
function getSessionTokenFromCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

module.exports = {
  COOKIE_NAME,
  createSession,
  validateSession,
  revokeSession,
  revokeAllSessions,
  revokeOrgSessions,
  listSessions,
  switchOrganization,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookie,
  hashSessionToken,
  generateSessionToken,
};
