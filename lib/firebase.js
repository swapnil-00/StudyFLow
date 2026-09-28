// lib/firebase.js — Firebase Authentication & ID Token Verification (AUTH-01)
// Uses official firebase-admin SDK with strict audience, signature, and revocation checks.
'use strict';
const { HttpError } = require('./errors');

let adminInstance = null;
let mockVerifier = null; // Used for unit/integration testing

/**
 * Initialize the Firebase Admin SDK.
 * Fails fast if required environment credentials are missing.
 */
function getFirebaseAdmin() {
  if (adminInstance) return adminInstance;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (process.env.NODE_ENV === 'test' && !projectId) {
    // In test environment without credentials, return a stub if mockVerifier is set
    return null;
  }

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      'Firebase Admin initialization failed: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must all be configured.'
    );
  }

  const admin = require('firebase-admin');
  if (admin.apps && admin.apps.length > 0) {
    adminInstance = admin.apps[0];
  } else {
    adminInstance = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
      }),
    });
  }

  return adminInstance;
}

/**
 * Set a mock verifier function for tests.
 */
function setMockVerifier(fn) {
  mockVerifier = fn;
}

/**
 * Verify a Firebase ID token.
 *
 * @param {string} idToken
 * @param {Object} [options]
 * @param {boolean} [options.checkRevoked=true] - Check if token was revoked
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

  let adminApp;
  try {
    adminApp = getFirebaseAdmin();
  } catch (initErr) {
    console.error('Firebase Admin init error:', initErr.message);
    throw new HttpError(500, 'AUTH_CONFIG_ERROR', 'Authentication service configuration error');
  }

  if (!adminApp) {
    throw new HttpError(500, 'AUTH_CONFIG_ERROR', 'Firebase Admin is not configured');
  }

  const checkRevoked = options.checkRevoked !== false;
  let decoded;

  try {
    const admin = require('firebase-admin');
    decoded = await admin.auth().verifyIdToken(idToken, checkRevoked);
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    if (err.code === 'auth/id-token-revoked') {
      throw new HttpError(401, 'TOKEN_REVOKED', 'Your session has been revoked. Please sign in again.');
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-id-token') {
      throw new HttpError(401, 'INVALID_TOKEN', 'Invalid authentication token');
    }
    console.error('Firebase token verification error:', err.message);
    throw new HttpError(401, 'INVALID_TOKEN', `Authentication failed: ${err.message}`);
  }

  // Verify project ID matches (AUTH-01)
  const expectedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (expectedProjectId && decoded.aud !== expectedProjectId) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token audience does not match configured Firebase project.');
  }

  // Verify auth_time age if maxAgeSeconds is set (e.g. 5 minutes for sensitive operations)
  if (options.maxAgeSeconds && typeof options.maxAgeSeconds === 'number') {
    const nowSec = Math.floor(Date.now() / 1000);
    const authTime = decoded.auth_time || 0;
    if (nowSec - authTime > options.maxAgeSeconds) {
      throw new HttpError(401, 'REAUTH_REQUIRED', 'This action requires recent authentication. Please sign in again.');
    }
  }

  return {
    uid: decoded.uid,
    email: decoded.email ? decoded.email.toLowerCase().trim() : undefined,
    email_verified: Boolean(decoded.email_verified),
    phone_number: decoded.phone_number || undefined,
    name: decoded.name || undefined,
    picture: decoded.picture || undefined,
    auth_time: decoded.auth_time,
  };
}

module.exports = {
  getFirebaseAdmin,
  verifyFirebaseIdToken,
  setMockVerifier,
};
