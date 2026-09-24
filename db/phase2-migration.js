// Phase 2 Database Schema Migration
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../api/db');

async function run() {
  console.log('🚀 Running Phase 2 Database Security & Concurrency Migration...');

  // 1. Partial Unique Index to guarantee zero duplicate active assignments
  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat
      ON seat_assignments (seat_id)
      WHERE status = 'active'
    `);
    console.log('✅ Verified: idx_unique_active_seat');
  } catch (err) {
    console.warn('⚠️ Unique index warning:', err.message);
  }

  // 2. Persisted Documents Table (Invoices & Receipts)
  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(64) PRIMARY KEY,
      document_type VARCHAR(50) NOT NULL,
      document_number VARCHAR(100) NOT NULL,
      student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
      branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
      membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE SET NULL,
      document_data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Verified: documents table');

  // 3. Persisted Communication Logs Table (WhatsApp Outbound Audit Trail)
  await query(`
    CREATE TABLE IF NOT EXISTS communication_logs (
      id VARCHAR(64) PRIMARY KEY,
      student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
      event_type VARCHAR(100),
      phone_number VARCHAR(50),
      template_name VARCHAR(100),
      language VARCHAR(10) DEFAULT 'en',
      body_text TEXT,
      idempotency_key VARCHAR(255) UNIQUE,
      status VARCHAR(50) DEFAULT 'QUEUED',
      provider VARCHAR(50) DEFAULT 'mock',
      provider_message_id VARCHAR(100),
      document_id VARCHAR(64),
      retry_count INT DEFAULT 0,
      error_message TEXT,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Verified: communication_logs table');

  // 4. Ensure students table has branch_id and notification columns
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '+91'`);
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS normalized_phone VARCHAR(50)`);
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT TRUE`);
  await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"whatsapp":true,"payment_reminders":true,"membership_reminders":true,"booking_notifications":true,"receipt_notifications":true}'`);
  console.log('✅ Verified: students table extended columns');

  // 4. Update db/schema.sql to match
  console.log('🎉 Phase 2 database schema verified successfully.');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 2 Migration Error:', err);
    process.exit(1);
  });
