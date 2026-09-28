-- Migration 006: Payments & Expenses Integrity & Features Upgrade
-- Safe for existing production data: uses ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS

-- 1. Receipt sequences table for atomic, per-organization sequential receipt numbers
CREATE TABLE IF NOT EXISTS receipt_sequences (
  organization_id VARCHAR(64) PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Payments table upgrades: receipt_number, void/refund tracking, and idempotency
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_of VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

-- Populate receipt_number from reference_number for legacy rows if missing
UPDATE payments SET receipt_number = reference_number WHERE (receipt_number IS NULL OR receipt_number = '') AND reference_number IS NOT NULL;

-- Unique index for idempotency per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_org_idempotency
  ON payments (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key != '';

-- Unique index for receipt numbers per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_org_receipt_number
  ON payments (organization_id, receipt_number)
  WHERE receipt_number IS NOT NULL AND receipt_number != '';

-- Index for payment queries by branch and payment date
CREATE INDEX IF NOT EXISTS idx_payments_org_branch_date
  ON payments (organization_id, branch_id, date);

-- 3. Expenses table upgrades: void tracking and recurring metadata
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for expenses queries by branch and date
CREATE INDEX IF NOT EXISTS idx_expenses_org_branch_date
  ON expenses (organization_id, branch_id, date);
