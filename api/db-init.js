// api/db-init.js — Ensures multi-tenant tables and organization_id columns exist in PostgreSQL
const { query } = require('./db');

let schemaEnsured = false;

async function ensureMultiTenantSchema() {
  if (schemaEnsured) return;

  try {
    // 1. Create Organizations table
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

    // 2. Create Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        phone VARCHAR(50),
        avatar_color VARCHAR(50) DEFAULT '#6172f3',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Ensure Default Organization exists (for backward compatibility)
    await query(`
      INSERT INTO organizations (id, name, slug, email, plan, seat_limit, subscription_status, currency, onboarding_completed)
      VALUES ('ORG-DEFAULT', 'StudyFlow Library', 'studyflow-default', 'admin@studyflow.in', 'pro', 250, 'active', 'INR', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Add organization_id column to existing tables if missing
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
