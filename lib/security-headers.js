// lib/security-headers.js — Single source of truth for HTTP security headers
// Shared between worker/index.js (Worker responses) and build.js (public/_headers for static assets)
'use strict';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

const CSP_REPORT_ONLY =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://www.recaptcha.net https://recaptcha.net https://embed.diagrams.net; " +
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; " +
  "object-src 'none'; base-uri 'self'";

/**
 * Generates the content for Cloudflare Pages / Static Assets public/_headers file.
 */
function generateHeadersFile() {
  return `/*
  X-Content-Type-Options: ${SECURITY_HEADERS['X-Content-Type-Options']}
  X-Frame-Options: ${SECURITY_HEADERS['X-Frame-Options']}
  Referrer-Policy: ${SECURITY_HEADERS['Referrer-Policy']}
  Permissions-Policy: ${SECURITY_HEADERS['Permissions-Policy']}
  Strict-Transport-Security: ${SECURITY_HEADERS['Strict-Transport-Security']}
  Content-Security-Policy-Report-Only: ${CSP_REPORT_ONLY}

/js/bundle.*
  Cache-Control: public, max-age=31536000, immutable

/css/app.*
  Cache-Control: public, max-age=31536000, immutable
`;
}

module.exports = {
  SECURITY_HEADERS,
  CSP_REPORT_ONLY,
  generateHeadersFile,
};
