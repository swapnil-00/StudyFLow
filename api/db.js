// Shared Neon DB pool for all API routes
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl || rawUrl.trim() === '') {
      throw new Error('DATABASE_URL environment variable is not configured. Please set DATABASE_URL in Vercel Project Settings.');
    }

    const connStr = rawUrl
      .replace('&channel_binding=require', '')
      .replace('channel_binding=require', '');

    pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

module.exports = { getPool, cors, query, withTransaction };
