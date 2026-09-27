-- db/least-privilege.sql — Least-Privilege Database Role Setup (SEC-019)
-- Run this in the Neon Console SQL Editor or psql connected with neondb_owner.
--
-- Documentation:
-- 1. `neondb_owner`: Used ONLY for running migrations (DDL: CREATE/ALTER/DROP TABLE, INDEX, RLS).
-- 2. `studyflow_app`: Used by the web application and serverless functions for runtime queries (DML only: SELECT, INSERT, UPDATE, DELETE).
--
-- Instructions:
-- Replace 'GENERATE_A_STRONG_PASSWORD_HERE' with a secure random password (e.g. openssl rand -base64 32).
-- Then update the application connection string to use user 'studyflow_app'.

-- 1. Create the application user role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'studyflow_app') THEN
    CREATE ROLE studyflow_app WITH LOGIN PASSWORD 'GENERATE_A_STRONG_PASSWORD_HERE';
  END IF;
END $$;

-- 2. Revoke dangerous permissions
REVOKE ALL ON SCHEMA public FROM studyflow_app;
REVOKE CREATE ON SCHEMA public FROM studyflow_app;

-- 3. Grant schema usage
GRANT USAGE ON SCHEMA public TO studyflow_app;

-- 4. Grant DML only (SELECT, INSERT, UPDATE, DELETE) on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO studyflow_app;

-- 5. Make audit_logs append-only for studyflow_app (SELECT and INSERT only, NO UPDATE or DELETE)
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_logs FROM studyflow_app;

-- 6. Ensure studyflow_app cannot run DDL on future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO studyflow_app;

-- 7. Grant sequence usage (if any serial/sequence IDs are used)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO studyflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO studyflow_app;
