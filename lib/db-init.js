// lib/db-init.js — Schema bootstrapper & multi-tenant/auth auto-migration
// Ensures all required tables, columns, indexes, and constraints exist automatically
'use strict';
const { query } = require('./db');

let schemaEnsured = false;

async function ensureMultiTenantSchema() {
  if (schemaEnsured) return;
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_DATABASE_URL) {
    schemaEnsured = true;
    return;
  }

  try {
    // 1. Organizations table
    await query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE,
        email VARCHAR(150),
        phone VARCHAR(50),
        plan VARCHAR(50) DEFAULT 'trial',
        seat_limit INT DEFAULT 100,
        subscription_status VARCHAR(50) DEFAULT 'active',
        currency VARCHAR(10) DEFAULT 'INR',
        logo_url TEXT,
        address TEXT,
        onboarding_completed BOOLEAN DEFAULT FALSE,
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

    // 10. Ensure Default Organization exists (for backward compatibility)
    await query(`
      INSERT INTO organizations (id, name, slug, email, plan, seat_limit, subscription_status, currency, onboarding_completed)
      VALUES ('ORG-DEFAULT', 'StudyFlow Library', 'studyflow-default', 'admin@studyflow.in', 'pro', 250, 'active', 'INR', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Ensure required columns exist on organizations and settings
    try {
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seat_limit INT DEFAULT 100;`);
      await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'trial';`);
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
        await query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) DEFAULT 'ORG-DEFAULT';`);
        await query(`CREATE INDEX IF NOT EXISTS idx_${tbl}_org_id ON ${tbl}(organization_id);`);
      } catch (e) {
        // Table might not exist yet or column already present
      }
    }

    schemaEnsured = true;
  } catch (err) {
    console.warn('Multi-tenant schema initialization notice:', err.message);
  }
}

module.exports = { ensureMultiTenantSchema };
