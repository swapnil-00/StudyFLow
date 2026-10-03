// lib/db.js — Database connection layer
// Works on both Cloudflare Workers (Hyperdrive) and local Node.js (DATABASE_URL).
//
// Cloudflare Workers cannot share connections across requests. Each request must
// create its own Client from env.HYPERDRIVE.connectionString and close it when done.
// Hyperdrive handles connection pooling at the edge, so this stays fast.
//
// For local Node.js scripts (migrate, seed-demo, tests), we keep the old Pool path
// so those tools work unchanged.
'use strict';
const { Client, Pool, types } = require('pg');

// Parse PostgreSQL DATE columns (OID 1082) directly as 'YYYY-MM-DD' strings (SEC / D3 fix)
types.setTypeParser(1082, v => v);

// ── Cloudflare Workers: per-request connection ───────────────────────────────

/**
 * Create a per-request database context from a Cloudflare Worker env binding.
 * Returns { query, withTransaction, cleanup }.
 * Call cleanup() (via ctx.waitUntil) when the request is done.
 *
 * @param {Object} env - Cloudflare Worker env (must have env.HYPERDRIVE or env.DATABASE_URL)
 * @returns {{ query: Function, withTransaction: Function, cleanup: Function }}
 */
function createRequestDb(env) {
  const connStr = env.HYPERDRIVE
    ? env.HYPERDRIVE.connectionString
    : env.DATABASE_URL;

  if (!connStr) {
    throw new Error('DATABASE_URL / HYPERDRIVE is not configured.');
  }

  const client = new Client({ connectionString: connStr });
  const connectPromise = client.connect();
  let ended = false;

  async function ensureConnected() {
    try {
      await connectPromise;
    } catch (err) {
      console.error('Hyperdrive/DB connection error:', err);
      throw new Error(`Hyperdrive DB connection failed: ${err.message || err}`);
    }
  }

  async function requestQuery(sql, params) {
    await ensureConnected();
    return client.query(sql, params);
  }

  async function requestWithTransaction(callback) {
    await ensureConnected();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  async function cleanup() {
    if (!ended) {
      ended = true;
      try { await client.end(); } catch (_) {}
    }
  }

  return { query: requestQuery, withTransaction: requestWithTransaction, cleanup };
}

// ── Local Node.js: shared Pool (for scripts, migrate, tests) ─────────────────

let pool;

function getPool() {
  if (!pool) {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl || rawUrl.trim() === '') {
      throw new Error('DATABASE_URL environment variable is not configured.');
    }

    const isLocal = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
    const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED !== 'false';

    pool = new Pool({
      connectionString: rawUrl,
      ssl: isLocal ? false : { rejectUnauthorized },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// The Worker handles many requests concurrently in one isolate, so the per-request DB
// context must not live in a module-level variable (one request would overwrite another's
// and then clear it mid-flight). AsyncLocalStorage scopes it to the request's async chain.
const { AsyncLocalStorage } = require('node:async_hooks');
const dbContextStore = new AsyncLocalStorage();

/** Run fn with ctx as the DB context for every query()/withTransaction() it makes. */
function runWithDb(ctx, fn) {
  return dbContextStore.run(ctx, fn);
}

function getActiveDbContext() {
  return dbContextStore.getStore() || null;
}

async function query(sql, params) {
  const ctx = getActiveDbContext();
  if (ctx) return ctx.query(sql, params);
  return getPool().query(sql, params);
}

async function withTransaction(callback) {
  const ctx = getActiveDbContext();
  if (ctx) return ctx.withTransaction(callback);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createRequestDb, runWithDb, getActiveDbContext, getPool, query, withTransaction };
