-- Migration 005: Auth upgrade — Firebase identity, server-side sessions, org memberships, invitations, auth events
-- Additive only: ALTER TABLE ... ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS
-- Rollback: see comments on each section

-- ═══════════════════════════════════════════════════════════════════════
-- 1. users: identity and verification columns
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

-- Make password_hash nullable (phone/Google-only users have no password)
-- ALTER COLUMN ... DROP NOT NULL is idempotent if already nullable
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Make email nullable (phone-only users)
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Unique indexes for firebase_uid and phone_e164 (safe: IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. user_identities: which sign-in methods a user has linked
-- Rollback: DROP TABLE IF EXISTS user_identities CASCADE;
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_identities (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,          -- 'google' | 'phone' | 'password'
  provider_subject VARCHAR(255) NOT NULL, -- Google sub / E.164 phone / email
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. org_members: a user can belong to several libraries
-- Rollback: DROP TABLE IF EXISTS org_members CASCADE;
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS org_members (
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, organization_id)
);

-- Backfill org_members from existing users.organization_id + users.role
INSERT INTO org_members (user_id, organization_id, role, status)
SELECT id, organization_id, COALESCE(role, 'owner'), COALESCE(status, 'active')
FROM users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. sessions: server-side sessions (extends/replaces the sessions table from migration 002)
-- The migration 002 sessions table stores refresh_token_hash for JWT rotation.
-- We now add columns for cookie-based server-side sessions.
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(128);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMPTZ;

-- Index for session lookup by token hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash_v2 ON sessions(session_token_hash) WHERE session_token_hash IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. invitations: staff/manager invitations with hashed tokens
-- Rollback: DROP TABLE IF EXISTS invitations CASCADE;
-- ═══════════════════════════════════════════════════════════════════════
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
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. auth_events: audit trail for authentication events
-- Rollback: DROP TABLE IF EXISTS auth_events CASCADE;
-- ═══════════════════════════════════════════════════════════════════════
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
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_org ON auth_events(organization_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. rate_limits: created here, not at runtime (removes CREATE TABLE from lib/ratelimit.js)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);
