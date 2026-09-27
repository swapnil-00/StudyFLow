// lib/ratelimit.js — PostgreSQL-backed Rate Limiter for serverless functions (SEC-014)
'use strict';
const { HttpError } = require('./errors');

/**
 * Check and record a rate limit hit.
 *
 * @param {Function} queryFn   - DB query function (from lib/db)
 * @param {string}   key       - Rate limit key (e.g. 'ip:1.2.3.4', 'login:user@example.com')
 * @param {number}   maxHits   - Max requests allowed in window
 * @param {number}   windowSec - Window size in seconds
 */
async function checkRateLimit(queryFn, key, maxHits = 10, windowSec = 60) {
  if (!queryFn || !key) return;

  try {
    // Ensure table exists
    await queryFn(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key VARCHAR(255) PRIMARY KEY,
        hits INTEGER NOT NULL DEFAULT 1,
        reset_at TIMESTAMPTZ NOT NULL
      )
    `);

    const now = new Date();
    const resetAt = new Date(now.getTime() + windowSec * 1000);

    const res = await queryFn(`
      INSERT INTO rate_limits (key, hits, reset_at)
      VALUES ($1, 1, $2)
      ON CONFLICT (key) DO UPDATE
        SET hits = CASE
          WHEN rate_limits.reset_at < CURRENT_TIMESTAMP THEN 1
          ELSE rate_limits.hits + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < CURRENT_TIMESTAMP THEN $2
          ELSE rate_limits.reset_at
        END
      RETURNING hits, reset_at
    `, [key, resetAt]);

    const record = res.rows[0];
    if (record && record.hits > maxHits) {
      const waitSeconds = Math.max(1, Math.ceil((new Date(record.reset_at) - Date.now()) / 1000));
      throw new HttpError(429, 'RATE_LIMIT_EXCEEDED', `Too many requests. Please wait ${waitSeconds} seconds.`);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // Don't completely fail user requests if rate-limiting table query experiences a transient error,
    // but log it.
    console.warn('Rate limit query warning:', err.message);
  }
}

module.exports = {
  checkRateLimit,
};
