// lib/http.js — Centralized API handler wrapper (SEC-001, SEC-002, SEC-021, SEC-025)
// Every API handler is wrapped with this. It provides:
//  - CORS handling
//  - HTTP method allow-listing
//  - Content-Type validation for mutations
//  - Optional authentication enforcement
//  - Rejection of client-supplied orgId/organizationId
//  - Generic error responses with correlation ID (SEC-021)
//  - Cache-Control: no-store for API responses
'use strict';
const crypto = require('crypto');
const { HttpError } = require('./errors');
const { requireSession } = require('./auth');

/**
 * Wraps an API handler function with standard security controls.
 *
 * @param {Function} fn         - async (req, res) handler. `req.session` is set if auth passes.
 * @param {Object}   [options]
 * @param {string[]} [options.methods=['POST']] - Allowed HTTP methods
 * @param {boolean}  [options.auth=true]        - Require authentication
 * @param {boolean}  [options.rejectOrgId=true] - Reject request bodies containing orgId/organizationId
 */
function withHandler(fn, options = {}) {
  const {
    methods = ['POST'],
    auth = true,
    rejectOrgId = true,
  } = options;

  const allowedMethods = new Set([...methods, 'OPTIONS']);
  const allowHeader = [...methods, 'OPTIONS'].join(', ');

  return async function handler(req, res) {
    // ── Security headers ────────────────────────────────────────────
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // ── CORS (SEC-025) ──────────────────────────────────────────────
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
        : [];
      
      const isAllowed = allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
        (process.env.APP_URL && origin === process.env.APP_URL);

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    }
    res.setHeader('Access-Control-Allow-Methods', allowHeader);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // ── Method check ────────────────────────────────────────────────
    if (!allowedMethods.has(req.method)) {
      res.setHeader('Allow', allowHeader);
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    // ── Correlation ID for server-side log correlation ───────────────
    const correlationId = crypto.randomUUID();

    // ── Content-Type check for mutations ─────────────────────────────
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (!ct.includes('application/json')) {
        res.status(415).json({
          ok: false,
          error: 'Content-Type must be application/json',
          correlationId
        });
        return;
      }
    }

    // ── Reject client-supplied orgId/organizationId (SEC-002) ────────
    if (rejectOrgId && req.body) {
      if (req.body.orgId !== undefined || req.body.organizationId !== undefined) {
        res.status(400).json({
          ok: false,
          error: 'orgId and organizationId must not be sent in the request body',
          correlationId
        });
        return;
      }
    }

    // ── Authentication ──────────────────────────────────────────────
    let session = null;
    if (auth) {
      try {
        session = requireSession(req);
      } catch (err) {
        if (err instanceof HttpError) {
          res.status(err.status).json({ ok: false, error: err.message, code: err.code });
        } else {
          res.status(401).json({ ok: false, error: 'Authentication required' });
        }
        return;
      }
    }

    // Attach session and correlation ID to request
    req.session = session;
    req.correlationId = correlationId;

    // ── Execute handler ─────────────────────────────────────────────
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({
          ok: false,
          error: err.message,
          code: err.code,
          correlationId
        });
      } else {
        // SEC-021: Never return err.message to client
        console.error(`[${correlationId}] Unhandled error in ${req.method} ${req.url}:`, err);
        const isConflict = err.message && err.message.includes('unique constraint');
        res.status(isConflict ? 409 : 500).json({
          ok: false,
          error: isConflict
            ? 'A conflict occurred with an existing record.'
            : 'Internal server error',
          correlationId
        });
      }
    }
  };
}

module.exports = { withHandler };
