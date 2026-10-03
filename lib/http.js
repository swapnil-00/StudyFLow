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
const { HttpError, isHttpError } = require('./errors');
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
    // ── Timing: Server-Timing header + slow-request log ─────────────
    const startedAt = performance.now();
    let authMs = 0;
    const elapsedMs = () => performance.now() - startedAt;
    const addTimingHeader = () => {
      if (res.headersSent) return;
      try {
        res.setHeader('Server-Timing', `auth;dur=${authMs.toFixed(1)}, total;dur=${elapsedMs().toFixed(1)}`);
      } catch (_) {}
    };
    if (typeof res.json === 'function') {
      const originalJson = res.json.bind(res);
      res.json = (body) => { addTimingHeader(); return originalJson(body); };
    }

    // ── Security headers ────────────────────────────────────────────
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // ── CORS & CSRF (SEC-025, Plan §4.4) ───────────────────────────
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    let requestOrigin = origin;
    if (!requestOrigin && referer) {
      try {
        const parsed = new URL(referer);
        requestOrigin = parsed.origin;
      } catch (_) {}
    }

    const allowedOrigins = [
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
      process.env.APP_URL,
      process.env.APP_ORIGIN,
    ].filter(Boolean);

    const isOriginAllowed = (o) => {
      if (!o) return true;
      if (allowedOrigins.includes(o)) return true;
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return true;
      try {
        const originUrl = new URL(o);
        const hostHeader = req.headers.host || req.headers['x-forwarded-host'];
        if (hostHeader && originUrl.host === hostHeader) return true;
      } catch (_) {}
      return false;
    };

    if (origin) {
      if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
    }
    res.setHeader('Access-Control-Allow-Methods', allowHeader);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // CSRF check on mutation requests: reject disallowed external origins
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && requestOrigin) {
      if (!isOriginAllowed(requestOrigin)) {
        res.status(403).json({ ok: false, error: 'Cross-origin request forbidden (CSRF protection)', code: 'CSRF_FORBIDDEN' });
        return;
      }
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
      const authStartedAt = elapsedMs();
      try {
        session = await requireSession(req);
        authMs = elapsedMs() - authStartedAt;
      } catch (err) {
        authMs = elapsedMs() - authStartedAt;
        if (isHttpError(err)) {
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
      if (isHttpError(err)) {
        res.status(err.status).json({
          ok: false,
          error: err.message,
          code: err.code,
          correlationId
        });
      } else {
        console.error(`[${correlationId}] Unhandled error in ${req.method} ${req.url}:`, err);
        const isConflict = err.message && err.message.toLowerCase().includes('unique constraint');
        res.status(isConflict ? 409 : 500).json({
          ok: false,
          error: isConflict
            ? 'A conflict occurred with an existing record.'
            : (err.message || 'Internal server error'),
          correlationId,
          details: String(err?.message || err)
        });
      }
    } finally {
      const totalMs = elapsedMs();
      if (totalMs > SLOW_REQUEST_MS) {
        const target = req.body?.table ? `${req.body.table}/${req.body.action}` : (req.body?.action || req.query?.action || '');
        console.warn(`[${correlationId}] Slow request ${req.method} ${(req.url || '').split('?')[0]} ${target} total=${totalMs.toFixed(0)}ms auth=${authMs.toFixed(0)}ms`);
      }
    }
  };
}

const SLOW_REQUEST_MS = 500;

module.exports = { withHandler };
