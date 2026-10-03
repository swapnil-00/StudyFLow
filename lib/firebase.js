// lib/firebase.js — Firebase ID Token Verification (AUTH-01)
// Replaces firebase-admin with `jose` (JWKS-based RS256 verification).
// firebase-admin is too large (~5 MB, Node-only) for Cloudflare Workers.
//
// Verification checks (same as firebase-admin):
//   - alg = RS256
//   - aud = FIREBASE_PROJECT_ID
//   - iss = https://securetoken.google.com/<FIREBASE_PROJECT_ID>
//   - exp and iat (with small clock skew)
//   - sub is non-empty
//   - auth_time is in the past
//
// checkRevoked decision:
//   firebase-admin's checkRevoked calls the Admin API, which requires a service-account
//   OAuth token and Node.js. We drop it because:
//   1. Our own server-side sessions (HttpOnly cookies, revocable in the DB) are the real
//      session; Firebase tokens are only used once at login/signup to prove Google identity.
//   2. Firebase ID tokens are short-lived (1 hour max).
//   3. Session revocation is fully handled by lib/session.js → revokeSession / revokeAllSessions.
//   If stronger revocation is needed later, call the Identity Toolkit accounts:lookup REST API.
'use strict';
const { createRemoteJWKSet, jwtVerify } = require('jose');
const { HttpError } = require('./errors');

let mockVerifier = null;

// Google's JWKS endpoint for Firebase tokens. The jose library caches keys
// automatically based on Cache-Control headers.
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
  }
  return jwks;
}

/**
 * Set a mock verifier function for tests.
 */
function setMockVerifier(fn) {
  mockVerifier = fn;
}

/**
 * Verify a Firebase ID token using Google's public JWKS keys.
 *
 * @param {string} idToken
 * @param {Object} [options]
 * @param {boolean} [options.checkRevoked=true] - Ignored (see comment above); kept for API compat
 * @param {number} [options.maxAgeSeconds] - Max acceptable age of auth_time (e.g. 300s / 5m for sensitive actions)
 * @returns {Promise<{ uid: string, email?: string, email_verified?: boolean, phone_number?: string, name?: string, picture?: string, auth_time?: number }>}
 */
async function verifyFirebaseIdToken(idToken, options = {}) {
  if (!idToken || typeof idToken !== 'string') {
    throw new HttpError(401, 'INVALID_TOKEN', 'Firebase ID token is required');
  }

  // Handle test mocking if configured
  if (mockVerifier) {
    return await mockVerifier(idToken, options);
  }

  const projectId = globalThis.__FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new HttpError(500, 'AUTH_CONFIG_ERROR', 'FIREBASE_PROJECT_ID is not configured');
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  let payload;
  try {
    const { payload: decoded } = await jwtVerify(idToken, getJWKS(), {
      issuer: expectedIssuer,
      audience: projectId,
      algorithms: ['RS256'],
      // jose handles exp/iat clock skew automatically (default 60s)
    });
    payload = decoded;
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    if (err.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' || err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new HttpError(401, 'INVALID_TOKEN', 'Invalid authentication token');
    }
    console.error('Firebase token verification error:', err.message);
    throw new HttpError(401, 'INVALID_TOKEN', `Authentication failed: ${err.message}`);
  }

  // sub must be non-empty (Firebase UID)
  if (!payload.sub) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token subject (sub) is missing.');
  }

  // auth_time must be in the past
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.auth_time && payload.auth_time > nowSec + 60) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token auth_time is in the future.');
  }

  // Verify auth_time age if maxAgeSeconds is set (e.g. 5 minutes for sensitive operations)
  if (options.maxAgeSeconds && typeof options.maxAgeSeconds === 'number') {
    const authTime = payload.auth_time || 0;
    if (nowSec - authTime > options.maxAgeSeconds) {
      throw new HttpError(401, 'REAUTH_REQUIRED', 'This action requires recent authentication. Please sign in again.');
    }
  }

  return {
    uid: payload.sub,
    email: payload.email ? payload.email.toLowerCase().trim() : undefined,
    email_verified: Boolean(payload.email_verified),
    phone_number: payload.phone_number || undefined,
    name: payload.name || undefined,
    picture: payload.picture || undefined,
    auth_time: payload.auth_time,
  };
}

// getFirebaseAdmin is no longer needed. Exported as a stub for backward compat in case
// any code path references it (none currently do outside this file).
function getFirebaseAdmin() {
  return null;
}

module.exports = {
  getFirebaseAdmin,
  verifyFirebaseIdToken,
  setMockVerifier,
};
