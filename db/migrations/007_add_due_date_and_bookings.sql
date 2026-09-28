-- Migration 007: Add due_date and idempotency_key to memberships
-- Safe additive migration for production database

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS due_date VARCHAR(50);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

-- Populate due_date for existing rows
UPDATE memberships SET due_date = start_date WHERE due_date IS NULL OR due_date = '';

-- Indices for performance and idempotency
CREATE INDEX IF NOT EXISTS idx_memberships_org_due_date ON memberships (organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_memberships_org_idempotency ON memberships (organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != '';
