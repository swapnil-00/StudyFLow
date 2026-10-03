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
      'Server configuration error: JWT_SECRET environment variable is not configured. Please set JWT_SECRET in your Cloudflare Workers settings.'
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

  // Secondary: Authorization Bearer header (for API clients, tests, or mobile)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  // Strictly validate as DB session token
  return await validateSession(token);
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
  if (password.length > 256) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Password must be at most 256 characters long.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'This password is too common. Please choose a stronger password.');
  }
}

// ── Password Hashing (SEC-015) ───────────────────────────────────────────────
// Passwords are never encrypted (anything encrypted can be decrypted); they are hashed with
// scrypt, a memory-hard, salted, one-way function. Parameters follow OWASP's scrypt guidance
// (N=2^15, r=8, p=3 ≈ 32 MiB per hash, equal in cost to the recommended N=2^17,r=8,p=1 but
// safe for serverless memory). They are stored inside each hash in PHC string format:
//   $scrypt$ln=15,r=8,p=3$<salt base64>$<hash base64>
// so they can be raised later; older hashes are transparently upgraded on the next login.
const SCRYPT_PARAMS = { ln: 15, r: 8, p: 3 };
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const MAX_PASSWORD_LENGTH = 256;

function scryptAsync(password, salt, { ln, r, p }) {
  const N = 2 ** ln;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N, r, p, maxmem: 256 * N * r }, (err, key) => {
      if (err) reject(err); else resolve(key);
    });
  });
}

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Password is missing or too long.');
  }
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const key = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT_PARAMS);
  const { ln, r, p } = SCRYPT_PARAMS;
  return `$scrypt$ln=${ln},r=${r},p=${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function safeEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a password against any stored hash format this app has ever produced.
 * @returns {Promise<{ valid: boolean, needsRehash: boolean }>} needsRehash is true when the
 *   password is correct but the stored hash uses an older/weaker scheme than SCRYPT_PARAMS.
 */
async function verifyPassword(password, storedHash) {
  const fail = { valid: false, needsRehash: false };
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) return fail;
  if (!storedHash || typeof storedHash !== 'string') return fail;

  // Current format: $scrypt$ln=15,r=8,p=3$salt$hash
  if (storedHash.startsWith('$scrypt$')) {
    const [, , paramStr, saltB64, hashB64] = storedHash.split('$');
    const params = Object.fromEntries((paramStr || '').split(',').map(kv => kv.split('=')).map(([k, v]) => [k, Number(v)]));
    if (!params.ln || !params.r || !params.p || params.ln > 20 || !saltB64 || !hashB64) return fail;
    const expected = Buffer.from(hashB64, 'base64');
    const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), params);
    const valid = safeEqual(key, expected);
    const weaker = params.ln < SCRYPT_PARAMS.ln || params.r < SCRYPT_PARAMS.r || params.p < SCRYPT_PARAMS.p;
    return { valid, needsRehash: valid && weaker };
  }

  // Previous format: scrypt:<hex salt>:<hex hash> (N=2^14, r=8, p=1) — upgrade on login
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return fail;
    const key = await scryptAsync(password, parts[1], { ln: 14, r: 8, p: 1 });
    const valid = safeEqual(key, Buffer.from(parts[2], 'hex'));
    return { valid, needsRehash: valid };
  }

  // Legacy PBKDF2 format: <salt>:<hex hash> — upgrade on login
  if (storedHash.includes(':')) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = await new Promise((resolve, reject) =>
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, k) => (err ? reject(err) : resolve(k))));
    const valid = safeEqual(hash, Buffer.from(originalHash, 'hex'));
    return { valid, needsRehash: valid };
  }

  return fail;
}

// Burns the same CPU/memory as a real verification, so "no such account" and "account has no
// password" take as long as "wrong password" and response timing can't reveal which emails exist.
let dummyHashPromise = null;
async function verifyAgainstDummy(password) {
  // Random per process: this hash only needs to cost the same as a real one, never to match.
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomBytes(24).toString('base64'));
  await verifyPassword(typeof password === 'string' ? password : '', await dummyHashPromise);
  return { valid: false, needsRehash: false };
}

module.exports = {
  signToken,
  verifyToken,
  requireSession,
  getAuthSession,
  hashPassword,
  verifyPassword,
  verifyAgainstDummy,
  validatePasswordStrength
};
