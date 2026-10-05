// lib/db-init.js — Schema bootstrapper & multi-tenant/auth auto-migration
// Ensures all required tables, columns, indexes, and constraints exist automatically
'use strict';
const crypto = require('crypto');
const { query } = require('./db');

let schemaEnsured = false;

/**
 * Ensures the schema is up to date without running DDL on every cold start.
 *
 * The DDL in applySchema() is fingerprinted; the fingerprint is stored in app_schema_version.
 * A cold start costs one SELECT when the stored fingerprint matches, and runs the full DDL only
 * when this file's DDL has changed (or on a fresh database).
 *
 * Note: On Cloudflare Workers we must NOT cache an in-flight promise across requests,
 * because each request has its own DB connection and a pending promise from one
 * request cannot perform I/O on behalf of another. We only cache the boolean result.
 */
async function ensureMultiTenantSchema() {
  if (schemaEnsured) return;
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_DATABASE_URL) {
    schemaEnsured = true;
    return;
  }
  await checkAndApplySchema();
}

const SCHEMA_FINGERPRINT = crypto.createHash('sha256').update(applySchema.toString()).digest('hex').slice(0, 16);

async function checkAndApplySchema() {
  try {
    const res = await query('SELECT version FROM app_schema_version WHERE id = 1');
    if (res.rows[0]?.version === SCHEMA_FINGERPRINT) {
      schemaEnsured = true;
      return;
    }
  } catch (_) {
    // Table missing on a fresh or pre-versioned database: fall through and apply the schema
  }

  await applySchema();
  if (!schemaEnsured) return; // applySchema failed; retry on the next request

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS app_schema_version (
        id INTEGER PRIMARY KEY,
        version VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(
      `INSERT INTO app_schema_version (id, version, applied_at) VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, applied_at = CURRENT_TIMESTAMP`,
      [SCHEMA_FINGERPRINT]
    );
  } catch (err) {
    console.warn('Schema version marker could not be written:', err.message);
  }
}

async function applySchema() {
  try {
    // 1. Organizations table
    await query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE,
        email VARCHAR(150),
        phone VARCHAR(50),
        plan VARCHAR(50) DEFAULT 'free',
        seat_limit INT DEFAULT 5,
        subscription_status VARCHAR(50) DEFAULT 'active',
        currency VARCHAR(10) DEFAULT 'INR',
        logo_url TEXT,
        address TEXT,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        is_demo BOOLEAN DEFAULT FALSE,
        plan_paid_at TIMESTAMPTZ,
        whatsapp_mode VARCHAR(20) DEFAULT 'manual',
        whatsapp_auto_status VARCHAR(30) DEFAULT 'not_subscribed',
        whatsapp_auto_until TIMESTAMPTZ,
        whatsapp_auto_ref VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(150) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'owner',
        phone VARCHAR(50),
        phone_e164 VARCHAR(20),
        firebase_uid VARCHAR(128),
        avatar_color VARCHAR(50) DEFAULT '#6172f3',
        status VARCHAR(50) DEFAULT 'active',
        token_version INTEGER DEFAULT 1,
        email_verified_at TIMESTAMPTZ,
        phone_verified_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        terms_accepted_at TIMESTAMPTZ,
        terms_version VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all columns exist on users
    const userCols = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 VARCHAR(20);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT '#6172f3';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);`,
    ];
    for (const colSql of userCols) {
      try { await query(colSql); } catch (_) {}
    }

    // Relax NOT NULL on users.password_hash and users.email for OAuth / Phone sign-ins
    try {
      await query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
    } catch (_) {}
    try {
      await query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
    } catch (_) {}

    // Indexes on users
    try {
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;`);
    } catch (_) {}

    // 3. User identities table
    await query(`
      CREATE TABLE IF NOT EXISTS user_identities (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL,
        provider_subject VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (provider, provider_subject)
      );
    `);
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);`);
    } catch (_) {}

    // 4. Org Members table
    await query(`
      CREATE TABLE IF NOT EXISTS org_members (
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, organization_id)
      );
    `);

    // 5. User Branches table
    await query(`
      CREATE TABLE IF NOT EXISTS user_branches (
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        branch_id VARCHAR(64),
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, branch_id)
      );
    `);

    // 6. Sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        session_token_hash VARCHAR(128),
        refresh_token_hash VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        absolute_expires_at TIMESTAMPTZ,
        last_seen_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const sessionCols = [
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(128);`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMPTZ;`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;`,
    ];
    for (const sCol of sessionCols) {
      try { await query(sCol); } catch (_) {}
    }

    try {
      await query(`ALTER TABLE sessions ALTER COLUMN refresh_token_hash DROP NOT NULL;`);
    } catch (_) {}
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash_v2 ON sessions(session_token_hash) WHERE session_token_hash IS NOT NULL;`);
    } catch (_) {}

    // 7. Invitations table
    await query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255),
        phone_e164 VARCHAR(20),
        role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'staff')),
        branch_ids TEXT[] NOT NULL DEFAULT '{}',
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        invited_by VARCHAR(64) REFERENCES users(id),
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);`);
    } catch (_) {}

    // 8. Auth Events table
    await query(`
      CREATE TABLE IF NOT EXISTS auth_events (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        organization_id VARCHAR(64),
        event VARCHAR(50) NOT NULL,
        method VARCHAR(20),
        ip VARCHAR(64),
        user_agent TEXT,
        success BOOLEAN,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id, created_at DESC);`);
      await query(`CREATE INDEX IF NOT EXISTS idx_auth_events_org ON auth_events(organization_id, created_at DESC);`);
    } catch (_) {}

    // 9. Rate Limits table
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key VARCHAR(255) PRIMARY KEY,
        hits INTEGER NOT NULL DEFAULT 1,
        reset_at TIMESTAMPTZ NOT NULL
      );
    `);

    // 10. (Removed ORG-DEFAULT auto-insert as per owner-provisioned model)

    // 11. Ensure required columns exist on organizations and settings
    try {
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seat_limit INT DEFAULT 100;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';`);
      await query(`ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'free';`);
      await query(`ALTER TABLE organizations ALTER COLUMN seat_limit SET DEFAULT 5;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;`);
      // Subscription & WhatsApp add-on state (see lib/subscription.js)
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_paid_at TIMESTAMPTZ;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_mode VARCHAR(20) DEFAULT 'manual';`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_auto_status VARCHAR(30) DEFAULT 'not_subscribed';`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_auto_until TIMESTAMPTZ;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_auto_ref VARCHAR(100);`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email VARCHAR(150);`);

      await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_name VARCHAR(255);`);
      await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
      await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
      await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';`);
      await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;`);
    } catch (e) {
      // Ignore if columns already present
    }

    // 11b. Billing (lib/billing.js), scheduled jobs (lib/jobs.js) and automatic reminders (lib/reminders.js)
    await query(`
      CREATE TABLE IF NOT EXISTS billing_orders (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_by VARCHAR(64),
        kind VARCHAR(30) NOT NULL,
        plan VARCHAR(50),
        seats INTEGER,
        months INTEGER,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        description TEXT,
        status VARCHAR(30) DEFAULT 'created',
        provider VARCHAR(30) NOT NULL,
        provider_order_id VARCHAR(100),
        provider_payment_id VARCHAR(100),
        payment_session_id TEXT,
        failure_reason TEXT,
        metadata JSONB DEFAULT '{}',
        paid_at TIMESTAMPTZ,
        applied_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_billing_orders_org ON billing_orders(organization_id, created_at DESC);`);
    await query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id VARCHAR(128) PRIMARY KEY,
        provider VARCHAR(30) NOT NULL,
        event_type VARCHAR(100),
        order_id VARCHAR(64),
        payload JSONB,
        received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS job_runs (
        id VARCHAR(64) PRIMARY KEY,
        job VARCHAR(50) NOT NULL,
        organization_id VARCHAR(64),
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'running',
        summary JSONB DEFAULT '{}'
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_job_runs_org ON job_runs(organization_id, started_at DESC);`);
    try {
      await query(`ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);`);
      await query(`ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);`);
      await query(`ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS error_message TEXT;`);
      await query(`ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;`);
      // One automatic reminder per (library, membership, event, day): the key is claimed before sending.
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_logs_idempotency ON communication_logs(idempotency_key);`);
    } catch (e) {
      console.warn('communication_logs idempotency setup skipped:', e.message);
    }

    // 12. Add organization_id column to existing application tables if missing
    const tables = [
      'branches', 'floors', 'rooms', 'seats', 'students',
      'membership_plans', 'memberships', 'seat_assignments',
      'seat_transfers', 'payments', 'expenses', 'staff',
      'documents', 'settings', 'communication_logs',
      'activity_logs', 'waitlist', 'notifications'
    ];

    for (const tbl of tables) {
      try {
        await query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_${tbl}_org_id ON ${tbl}(organization_id);`);
      } catch (e) {
        // Table might not exist yet or column already present
      }
    }

    // 13. Receipt sequences table and payments/expenses integrity columns
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS receipt_sequences (
          organization_id VARCHAR(64) PRIMARY KEY,
          current_number INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS void_reason TEXT;`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_of VARCHAR(64);`);
      await query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS due_date VARCHAR(50);`);
      await query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS notes TEXT;`);
      await query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);`);
      await query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
      await query(`ALTER TABLE seat_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
      await query(`ALTER TABLE seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS void_reason TEXT;`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(50);`);
      await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;`);

      // Unique partial index on idempotency_key (NEW-9)
      await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_org_idempotency 
        ON memberships(organization_id, idempotency_key) 
        WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
      `);
    } catch (_) {}

    schemaEnsured = true;
  } catch (err) {
    console.warn('Multi-tenant schema initialization notice:', err.message);
  }
}

module.exports = { ensureMultiTenantSchema };
