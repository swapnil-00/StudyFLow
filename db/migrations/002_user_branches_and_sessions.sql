-- Migration 002: User Branches, Sessions, and Encrypted Credentials
-- Rollback: DROP TABLE IF EXISTS sessions, user_branches CASCADE; ALTER TABLE settings DROP COLUMN IF EXISTS encrypted_credentials;

-- Staff to branch mapping for branch-level access control (SEC-008)
CREATE TABLE IF NOT EXISTS user_branches (
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, branch_id)
);

-- Sessions table for rotating refresh tokens stored hashed (SEC-013)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(50),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(refresh_token_hash);

-- Dedicated column for AES-256-GCM encrypted WhatsApp/provider credentials (SEC-022)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;
