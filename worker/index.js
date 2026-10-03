// worker/index.js — Cloudflare Worker entry point for StudyFlow
//
// This Worker:
//   1. Intercepts /api/* requests and routes them to the existing API handlers
//   2. Delegates everything else to the Static Assets binding (public/)
//   3. Sets security headers on every response
//   4. Creates a per-request database connection via Hyperdrive and cleans it up
//
// The adapter transforms Cloudflare's Request/Response into the req/res shim that
// the Vercel-style handlers expect. This keeps api/*.js nearly unchanged.
'use strict';

const { createRequestDb, runWithDb } = require('../lib/db');

// Import API handlers. Each exports a function(req, res) wrapped by withHandler.
const authHandler = require('../api/auth');
const dataHandler = require('../api/data');
const writeHandler = require('../api/write');
const reportsHandler = require('../api/reports');

// ── Security headers (shared module with build.js) ─────────────────────────
const { SECURITY_HEADERS, CSP_REPORT_ONLY } = require('../lib/security-headers');

// ── Adapter: Cloudflare Request → Vercel-style req/res ───────────────────────

/**
 * Parse the request body as JSON, with a 1 MB size limit.
 */
async function parseBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return {};
  }
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return {};
  }
  try {
    const text = await request.text();
    if (text.length > 1 * 1024 * 1024) {
      throw new Error('Request body too large');
    }
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Build the req shim that api/*.js handlers expect.
 */
function makeReq(request, body, url) {
  // Flatten headers into a plain object (lowercase keys, like Node HTTP)
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }
  if (!headers.host) {
    headers.host = url.host;
  }

  return {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    body,
    query: Object.fromEntries(url.searchParams),
  };
}

/**
 * Build the res shim that api/*.js handlers expect.
 * Collects the status, headers and body, then produces a Response.
 */
function makeRes() {
  const state = {
    statusCode: 200,
    headers: new Headers(),
    body: null,
    finished: false,
  };

  // Promise that resolves when the handler calls res.json() or res.end()
  let resolveResponse;
  const responsePromise = new Promise((resolve) => { resolveResponse = resolve; });

  const res = {
    setHeader(key, value) {
      if (Array.isArray(value)) {
        // Set-Cookie can have multiple values
        for (const v of value) {
          state.headers.append(key, v);
        }
      } else {
        state.headers.set(key, value);
      }
      return res;
    },
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(data) {
      if (state.finished) return;
      state.finished = true;
      state.headers.set('Content-Type', 'application/json');
      state.body = JSON.stringify(data);
      resolveResponse();
    },
    end(data) {
      if (state.finished) return;
      state.finished = true;
      state.body = data || '';
      resolveResponse();
    },
    get headersSent() {
      return state.finished;
    },
  };

  return {
    res,
    toResponse() {
      if (!state.finished) {
        state.finished = true;
        state.statusCode = 500;
        state.headers.set('Content-Type', 'application/json');
        state.body = JSON.stringify({ ok: false, error: 'Internal server error' });
        resolveResponse();
      }
      return responsePromise.then(() => {
        return new Response(state.body, {
          status: state.statusCode,
          headers: state.headers,
        });
      });
    },
  };
}

// ── API routing ──────────────────────────────────────────────────────────────

const API_HANDLERS = {
  auth: authHandler,
  data: dataHandler,
  write: writeHandler,
  reports: reportsHandler,
};

/**
 * Handle an API request: create a per-request DB, route to the handler,
 * then clean up the connection.
 */
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const segment = url.pathname.replace('/api/', '').split('/')[0];

  const handler = API_HANDLERS[segment];
  if (!handler) {
    return new Response(
      JSON.stringify({ ok: false, error: `API route /api/${segment} not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }

  // Make FIREBASE_PROJECT_ID available to lib/firebase.js without process.env (for jose)
  if (env.FIREBASE_PROJECT_ID) {
    globalThis.__FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
  }

  // Expose env vars as process.env for lib/ modules that read them. DATABASE_URL is
  // deliberately never set here: every query must go through this request's Hyperdrive
  // client, never a module-level Pool shared across requests.
  for (const key of Object.keys(env)) {
    if (typeof env[key] === 'string' && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  let db;
  try {
    // Per-request database connection via Hyperdrive, scoped to this request only
    db = createRequestDb(env);
    const body = await parseBody(request);
    const req = makeReq(request, body, url);
    const { res, toResponse } = makeRes();

    await runWithDb(db, () => handler(req, res));
    return await toResponse();
  } catch (err) {
    console.error(`API /api/${segment} unhandled error:`, err?.stack || err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  } finally {
    // Clean up the per-request connection in the background
    if (db) ctx.waitUntil(db.cleanup());
  }
}

// ── Worker export ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── API routes ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const response = await handleApiRequest(request, env, ctx);

      // Add security headers and Cache-Control: no-store to all API responses
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(key, value);
      }
      response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
      if (!response.headers.has('Cache-Control')) {
        response.headers.set('Cache-Control', 'no-store');
      }

      return response;
    }

    // ── Static assets (served by the assets binding) ───────────────
    // The assets binding is configured in wrangler.toml with
    // not_found_handling = "single-page-application", which returns
    // index.html for unknown paths (SPA fallback).
    const assetResponse = await env.ASSETS.fetch(request);

    // Clone to make headers mutable
    const response = new Response(assetResponse.body, assetResponse);

    // Add security headers to static responses
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);

    // Cache hashed assets immutably
    if (/\.(bundle\.[a-f0-9]{10}\.js|app\.[a-f0-9]{10}\.css)$/.test(url.pathname)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return response;
  },
};
