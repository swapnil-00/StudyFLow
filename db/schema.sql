-- StudyFlow PostgreSQL Database Schema for Neon DB
-- ==============================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  open_time VARCHAR(20) DEFAULT '06:00',
  close_time VARCHAR(20) DEFAULT '23:00',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Floors Table
CREATE TABLE IF NOT EXISTS floors (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  floor_number INT DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  floor_id VARCHAR(64) NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  room_type VARCHAR(50) DEFAULT 'general',
  capacity INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seats Table
CREATE TABLE IF NOT EXISTS seats (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  seat_number VARCHAR(50) NOT NULL,
  row_label VARCHAR(50),
  seat_type VARCHAR(50) DEFAULT 'standard',
  amenities JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'available',
  current_student_id VARCHAR(64),
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Students Table
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  emergency_contact VARCHAR(50),
  avatar_color VARCHAR(50),
  id_proof VARCHAR(100),
  address TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  join_date VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration INT NOT NULL,
  duration_unit VARCHAR(20) DEFAULT 'days',
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  access_hours VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) REFERENCES membership_plans(id) ON DELETE SET NULL,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
  seat_id VARCHAR(64) REFERENCES seats(id) ON DELETE SET NULL,
  start_date VARCHAR(50) NOT NULL,
  end_date VARCHAR(50) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  final_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  payment_status VARCHAR(50) DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Seat Assignments Table
CREATE TABLE IF NOT EXISTS seat_assignments (
  id VARCHAR(64) PRIMARY KEY,
  seat_id VARCHAR(64) NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  slot_type VARCHAR(50) DEFAULT 'full-day',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(64) PRIMARY KEY,
  seat_id VARCHAR(64) NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reservation_date VARCHAR(50),
  slot_type VARCHAR(50),
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  membership_id VARCHAR(64),
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  mode VARCHAR(50) DEFAULT 'upi',
  reference_number VARCHAR(100),
  date VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number VARCHAR(100) NOT NULL,
  date VARCHAR(50),
  amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  seat_id VARCHAR(64),
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  check_in VARCHAR(50),
  check_out VARCHAR(50),
  date VARCHAR(50),
  method VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date VARCHAR(50),
  payment_mode VARCHAR(50),
  vendor VARCHAR(150),
  receipt_ref VARCHAR(100),
  recorded_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  date VARCHAR(50),
  read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  action VARCHAR(150) NOT NULL,
  details TEXT,
  timestamp VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  requested_seat_type VARCHAR(50),
  priority INT DEFAULT 1,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'Staff',
  email VARCHAR(150),
  phone VARCHAR(50),
  branch_id VARCHAR(64),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Seat Transfers Table
CREATE TABLE IF NOT EXISTS seat_transfers (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_seat_id VARCHAR(64),
  to_seat_id VARCHAR(64),
  date VARCHAR(50),
  reason TEXT,
  approved_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  org_name VARCHAR(255) DEFAULT 'StudyFlow Library',
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  theme VARCHAR(20) DEFAULT 'light',
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 20. Documents Table (Tax Invoices and Payment Receipts)
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  membership_id VARCHAR(64) REFERENCES memberships(id) ON DELETE SET NULL,
  document_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 21. Communication Logs Table (WhatsApp Outbound Notifications)
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
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_seats_branch ON seats(branch_id);
CREATE INDEX IF NOT EXISTS idx_seats_room ON seats(room_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
CREATE INDEX IF NOT EXISTS idx_memberships_student ON memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_communication_student ON communication_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_communication_idempotency ON communication_logs(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat ON seat_assignments (seat_id) WHERE status = 'active';
