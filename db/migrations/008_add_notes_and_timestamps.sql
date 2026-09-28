-- Migration 008: Add missing notes and updated_at columns for atomic bookings and renewals (NEW-1, NEW-9)

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE seat_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Unique partial index on idempotency_key to guarantee replay safety (NEW-9)
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_org_idempotency 
ON memberships(organization_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
