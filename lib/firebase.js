// lib/firebase.js — Firebase Authentication & ID Token Verification
// Verifies Google/Firebase ID tokens server-side with strict security checks.
'use strict';
const crypto = require('crypto');
const https = require('https');
const { HttpError } = require('./errors');

let cachedCertificates = null;
let certsExpiry = 0;

/**
 * Fetch Google's public certificates for verifying Firebase ID tokens.
 */
async function fetchGooglePublicKeys() {
  const now = Date.now();
  if (cachedCertificates && now < certsExpiry) {
    return cachedCertificates;
  }

  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`Failed to fetch Google public keys: HTTP ${res.statusCode}`));
          }
          const certs = JSON.parse(data);
          const cacheControl = res.headers['cache-control'] || '';
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
          cachedCertificates = certs;
          certsExpiry = Date.now() + (maxAge * 1000);
          resolve(certs);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse and verify a Firebase ID token.
 * If firebase-admin is installed and configured, uses admin.auth().verifyIdToken.
 * Otherwise, falls back to Google public certificate verification using Node crypto.
 *
 * @param {string} idToken
 * @returns {Promise<{ uid: string, email?: string, email_verified?: boolean, phone_number?: string, name?: string, picture?: string }>}
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new HttpError(401, 'INVALID_TOKEN', 'Firebase ID token is required');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Try firebase-admin if initialized or configured
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length > 0 || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          }),
        });
      }
      const decoded = await admin.auth().verifyIdToken(idToken, true /* checkRevoked */);
      return {
        uid: decoded.uid,
        email: decoded.email,
        email_verified: decoded.email_verified,
        phone_number: decoded.phone_number,
        name: decoded.name,
        picture: decoded.picture,
        auth_time: decoded.auth_time,
      };
    }
  } catch (e) {
    // Continue to native RS256 verification
  }

  // Native RS256 JWT Verification against Google Public Certificates
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Malformed ID token');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header, payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'Unable to parse ID token');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Invalid ID token algorithm');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    throw new HttpError(401, 'TOKEN_EXPIRED', 'ID token has expired. Please sign in again.');
  }
  if (payload.iat && payload.iat > nowSec + 300) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token issued in the future');
  }

  if (projectId) {
    if (payload.aud !== projectId) {
      throw new HttpError(401, 'INVALID_TOKEN', `Token audience does not match configured Firebase project.`);
    }
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      throw new HttpError(401, 'INVALID_TOKEN', `Token issuer is invalid.`);
    }
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token subject missing');
  }

  // Fetch certificate for the key ID (kid)
  try {
    const certs = await fetchGooglePublicKeys();
    const cert = certs[header.kid];
    if (!cert) {
      throw new HttpError(401, 'INVALID_TOKEN', 'Unknown certificate key ID');
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const valid = verifier.verify(cert, Buffer.from(signatureB64, 'base64url'));

    if (!valid) {
      throw new HttpError(401, 'INVALID_TOKEN', 'Invalid ID token signature');
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error('Certificate verification failed:', err);
    throw new HttpError(401, 'INVALID_TOKEN', 'Token cryptographic verification failed');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    email_verified: Boolean(payload.email_verified),
    phone_number: payload.phone_number,
    name: payload.name,
    picture: payload.picture,
    auth_time: payload.auth_time,
  };
}

module.exports = {
  verifyFirebaseIdToken,
  fetchGooglePublicKeys,
};
