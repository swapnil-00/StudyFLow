-- Migration 003: Row-Level Security (RLS) for Defense in Depth (SEC-001, SEC-002)
-- Rollback: ALTER TABLE <tables> DISABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS tenant_isolation_policy ON <tables>;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'branches', 'floors', 'rooms', 'seats', 'students',
    'membership_plans', 'memberships', 'seat_assignments',
    'payments', 'expenses', 'documents', 'settings',
    'notifications', 'audit_logs', 'communication_logs',
    'staff', 'seat_transfers', 'waitlist', 'user_branches', 'sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Drop old policy if exists
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
    
    -- Create strict tenant isolation policy
    -- Bypassed when app.org_id is unset or null (e.g. initial superuser setup),
    -- but enforces exact tenant match when app.org_id is set.
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       AS PERMISSIVE
       FOR ALL
       TO PUBLIC
       USING (
         current_setting(''app.org_id'', true) IS NULL
         OR current_setting(''app.org_id'', true) = ''''
         OR organization_id = current_setting(''app.org_id'', true)
       )
       WITH CHECK (
         current_setting(''app.org_id'', true) IS NULL
         OR current_setting(''app.org_id'', true) = ''''
         OR organization_id = current_setting(''app.org_id'', true)
       );',
      t
    );
  END LOOP;
END $$;
