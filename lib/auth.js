// lib/auth.js — Authentication, token signing/verification, password hashing
// Replaces api/auth-util.js with security hardening (SEC-004, SEC-013, SEC-015)
'use strict';
const crypto = require('crypto');
const { HttpError } = require('./errors');

// ── JWT_SECRET enforcement (SEC-004) ──────────────────────────────────────────
function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(
      500,
      'MISSING_JWT_SECRET',
      'Server configuration error: JWT_SECRET environment variable is not configured. Please set JWT_SECRET in your Vercel Project Settings.'
    );
  }
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new HttpError(
      500,
      'INVALID_JWT_SECRET',
      'Server configuration error: JWT_SECRET must be at least 32 bytes long.'
    );
  }
  return Buffer.from(secret, 'utf8');
}

// ── Base64 URL encoding ──────────────────────────────────────────────────────
function base64UrlEncode(data) {
  return Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function signToken(payload, expiresInDays = 7) {
  // SEC-013: Shortened token lifespan
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, exp: nowSec + (expiresInDays * 24 * 60 * 60), iat: nowSec };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const secretKey = getSecretKey();
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// ── Token Verification (timing-safe compare, SEC-015) ─────────────────────────
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify algorithm is HS256 (pin algorithm, prevent confusion attacks)
  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== 'HS256') return null;
  } catch { return null; }

  // Compute expected signature
  const secretKey = getSecretKey();
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Timing-safe comparison (SEC-015)
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// ── Require authenticated session (throws HttpError) ──────────────────────────
async function requireSession(req) {
  const { getSessionTokenFromCookie, validateSession } = require('./session');

  // 1. Primary: HttpOnly session cookie
  const cookieToken = getSessionTokenFromCookie(req);
  if (cookieToken) {
    return await validateSession(cookieToken);
  }

  // 2. Secondary: Authorization Bearer header (for testing, API clients, or legacy tokens)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  // Check if it's a DB session token (64 hex chars = 32 random bytes)
  if (/^[a-f0-9]{64}$/i.test(token)) {
    return await validateSession(token);
  }

  // Otherwise try legacy JWT verification
  const session = verifyToken(token);
  if (!session) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }

  if (!session.orgId || !session.userId) {
    throw new HttpError(401, 'INVALID_SESSION', 'Invalid session data');
  }

  return session;
}

// ── Get auth session (non-throwing, for optional auth) ────────────────────────
async function getAuthSession(req) {
  try {
    return await requireSession(req);
  } catch {
    return null;
  }
}

// ── Common Passwords List (SEC-034) ─────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  '1234567890', 'password123', 'admin12345', 'studyflow12',
  'library123', 'welcome123', 'pass@12345', 'qwertyuiop',
  'letmein123', 'changeme12', 'secret1234', 'iloveyou12'
]);

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Password is required.');
  }
  if (password.length < 10) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Password must be at least 10 characters long.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'This password is too common. Please choose a stronger password.');
  }
}

// ── Password Hashing (scrypt with PBKDF2 backward compatibility, SEC-015) ────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored hash (scrypt or legacy PBKDF2).
 * Uses crypto.timingSafeEqual for timing attack defense (SEC-015).
 * @returns {{ valid: boolean, needsRehash: boolean }}
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return { valid: false, needsRehash: false };
  }

  // Modern scrypt format: scrypt:salt:hash
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const salt = parts[1];
    const originalHash = parts[2];

    const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const computedBuf = Buffer.from(derivedKey.toString('hex'), 'hex');
    const origBuf = Buffer.from(originalHash, 'hex');

    if (computedBuf.length !== origBuf.length) return { valid: false, needsRehash: false };
    const valid = crypto.timingSafeEqual(computedBuf, origBuf);
    return { valid, needsRehash: false };
  }

  // Legacy PBKDF2 format: salt:hash
  if (storedHash.includes(':')) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

    const hashBuf = Buffer.from(hash, 'hex');
    const origBuf = Buffer.from(originalHash, 'hex');

    if (hashBuf.length !== origBuf.length) return { valid: false, needsRehash: false };
    const valid = crypto.timingSafeEqual(hashBuf, origBuf);
    return { valid, needsRehash: valid }; // Needs transparent rehash to scrypt
  }

  return { valid: false, needsRehash: false };
}

module.exports = {
  signToken,
  verifyToken,
  requireSession,
  getAuthSession,
  hashPassword,
  verifyPassword,
  validatePasswordStrength
};
