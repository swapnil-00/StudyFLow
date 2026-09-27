// scripts/migrate-runner.js — Versioned SQL Migration Runner (SEC-018)
'use strict';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function runMigrations(dbUrl, specificFile = null) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
  }

  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED !== 'false';

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    if (specificFile) {
      const filePath = path.isAbsolute(specificFile) ? specificFile : path.join(process.cwd(), specificFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }
      console.log(`🚀 Executing single migration file: ${path.basename(filePath)}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Successfully executed: ${path.basename(filePath)}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
      return;
    }

    console.log('📦 Initializing schema_migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRes = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(appliedRes.rows.map(r => r.version));

    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        console.log(`⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`🚀 Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [version, file]
        );
        await client.query('COMMIT');
        console.log(`✅ Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed in ${file}:`, err.message);
        throw err;
      }
    }
    console.log('✨ All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const targetUrl = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

  const sqlFileArg = args.find(a => a.endsWith('.sql'));

  if (isTest && (!targetUrl || targetUrl === process.env.DATABASE_URL)) {
    console.error('Refusing to run test migration: TEST_DATABASE_URL is not set or equals production DATABASE_URL.');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('DATABASE_URL is not defined in environment or .env file.');
    process.exit(1);
  }

  runMigrations(targetUrl, sqlFileArg).catch(err => {
    console.error('Migration error:', err.message);
    process.exit(1);
  });
}

module.exports = { runMigrations };
