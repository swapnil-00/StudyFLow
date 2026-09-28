// lib/db.js — Shared Neon DB pool (moved from api/db.js to avoid deploying as endpoint, SEC-031)
'use strict';
const { Pool, types } = require('pg');

// Parse PostgreSQL DATE columns (OID 1082) directly as 'YYYY-MM-DD' strings (SEC / D3 fix)
types.setTypeParser(1082, v => v);

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

async function query(sql, params) {
  return getPool().query(sql, params);
}

async function withTransaction(callback) {
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

module.exports = { getPool, query, withTransaction };
