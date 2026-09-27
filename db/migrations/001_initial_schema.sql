-- Migration 001: Initial Multi-Tenant Schema
-- Rollback: DROP TABLE IF EXISTS audit_logs, communication_logs, rate_limits, documents, seat_transfers, waitlist, activity_logs, notifications, expenses, payments, seat_assignments, memberships, membership_plans, students, seats, rooms, floors, branches, settings, users, organizations CASCADE;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  plan VARCHAR(50) DEFAULT 'trial',
  seat_limit INTEGER DEFAULT 75,
  subscription_status VARCHAR(50) DEFAULT 'active',
  currency VARCHAR(10) DEFAULT 'INR',
  logo_url TEXT,
  onboarding_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  phone VARCHAR(50),
  avatar_color VARCHAR(20) DEFAULT '#6172f3',
  token_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  open_time VARCHAR(20) DEFAULT '06:00',
  close_time VARCHAR(20) DEFAULT '23:00',
  capacity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS floors (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor_number INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  floor_id VARCHAR(64) REFERENCES floors(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50) DEFAULT 'general',
  capacity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  room_id VARCHAR(64) REFERENCES rooms(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  seat_number VARCHAR(50) NOT NULL,
  row_label VARCHAR(20),
  seat_type VARCHAR(50) DEFAULT 'standard',
  amenities TEXT[],
  status VARCHAR(50) DEFAULT 'available',
  current_student_id VARCHAR(64),
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  emergency_contact VARCHAR(255),
  id_proof_type VARCHAR(50),
  id_proof TEXT,
  address TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  join_date DATE DEFAULT CURRENT_DATE,
  avatar_color VARCHAR(20) DEFAULT '#6172f3',
  country_code VARCHAR(10) DEFAULT '+91',
  normalized_phone VARCHAR(50),
  whatsapp_opt_in BOOLEAN DEFAULT true,
  communication_preferences JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  duration_unit VARCHAR(20) DEFAULT 'days',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  description TEXT,
  active BOOLEAN DEFAULT true,
  access_hours VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) REFERENCES membership_plans(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  seat_id VARCHAR(64) REFERENCES seats(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  discount NUMERIC(12, 2) DEFAULT 0 CHECK (discount >= 0),
  final_amount NUMERIC(12, 2) NOT NULL CHECK (final_amount >= 0),
  status VARCHAR(50) DEFAULT 'active',
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seat_assignments (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  seat_id VARCHAR(64) REFERENCES seats(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  slot_type VARCHAR(50) DEFAULT 'full-day',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Unique index to prevent duplicate active assignments on the same seat
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat
  ON seat_assignments (seat_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE RESTRICT,
  membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  mode VARCHAR(50) DEFAULT 'upi',
  reference_number VARCHAR(100),
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'recorded',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  category VARCHAR(100) DEFAULT 'General',
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE DEFAULT CURRENT_DATE,
  payment_mode VARCHAR(50) DEFAULT 'cash',
  vendor VARCHAR(255),
  receipt_ref VARCHAR(100),
  recorded_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE RESTRICT,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE SET NULL,
  document_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_document_number
  ON documents (organization_id, document_number);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
  org_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  theme VARCHAR(20) DEFAULT 'light',
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT false,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS communication_logs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  phone_number VARCHAR(50),
  template_name VARCHAR(100),
  language VARCHAR(20) DEFAULT 'en',
  body_text TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  document_id VARCHAR(64),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  idempotency_key VARCHAR(255),
  sent_at TIMESTAMPTZ,
  deliveredAt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Staff',
  email VARCHAR(255),
  phone VARCHAR(50),
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seat_transfers (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  from_seat_id VARCHAR(64),
  to_seat_id VARCHAR(64),
  date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  approved_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
