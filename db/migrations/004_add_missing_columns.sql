-- Migration 004: Add missing columns and indexes to existing production tables (NEW-04)
-- Safe for existing production data: uses ADD COLUMN IF NOT EXISTS without breaking existing rows.

-- 1. Students table: add soft-delete, tracking, and profile columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT '#6172f3';
ALTER TABLE students ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '+91';
ALTER TABLE students ADD COLUMN IF NOT EXISTS normalized_phone VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS communication_preferences JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS id_proof_type VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS id_proof_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_students_org_deleted ON students(organization_id, deleted_at);

-- 2. Branches table: add capacity, hours, status, and tracking
ALTER TABLE branches ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS open_time VARCHAR(10) DEFAULT '06:00';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS close_time VARCHAR(10) DEFAULT '23:00';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Users table: token versioning for session revocation (SEC-013)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- 4. Rooms table: room capacity
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;

-- 5. Seats table: row label and timestamp
ALTER TABLE seats ADD COLUMN IF NOT EXISTS row_label VARCHAR(20) DEFAULT '';
ALTER TABLE seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 6. Settings table: encrypted provider credentials
ALTER TABLE settings ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 7. Audit logs table (if not created by migration 001)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);

-- 8. Communication logs: ensure delivered_at is present
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 9. Waitlist table (if not created by migration 001)
CREATE TABLE IF NOT EXISTS waitlist (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  requested_seat_type VARCHAR(50),
  priority INTEGER DEFAULT 1,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_waitlist_org ON waitlist(organization_id, branch_id);
