-- ========================================================
-- 20260910000002_rls_policies.sql
-- Enterprise Row Level Security (RLS) Policies
-- ========================================================

-- Enable RLS on all enterprise tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user has permission
CREATE OR REPLACE FUNCTION public.has_permission(required_perm TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_perm_count INT;
BEGIN
    SELECT COUNT(*)
    INTO user_perm_count
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND p.code = required_perm;

    RETURN user_perm_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID AS $$
DECLARE
    u_branch_id UUID;
BEGIN
    SELECT branch_id INTO u_branch_id FROM profiles WHERE id = auth.uid();
    RETURN u_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (public.has_permission('user.read') OR auth.uid() = id);

CREATE POLICY "Admins can manage profiles"
    ON profiles FOR ALL
    USING (public.has_permission('user.manage'));

-- 2. EMPLOYEES POLICIES
CREATE POLICY "HR users can read employees in their branch or all if superadmin"
    ON employees FOR SELECT
    USING (
        public.has_permission('employee.read_all') OR
        (public.has_permission('employee.read') AND (branch_id = public.get_user_branch_id() OR branch_id IS NULL))
    );

CREATE POLICY "HR users can insert employees"
    ON employees FOR INSERT
    WITH CHECK (
        public.has_permission('employee.create')
    );

CREATE POLICY "HR users can update employees"
    ON employees FOR UPDATE
    USING (
        public.has_permission('employee.update')
    );

CREATE POLICY "HR users can deactivate employees"
    ON employees FOR DELETE
    USING (
        public.has_permission('employee.deactivate')
    );

-- 3. CARD TEMPLATES & VERSIONS POLICIES
CREATE POLICY "View published templates"
    ON card_templates FOR SELECT
    USING (TRUE);

CREATE POLICY "HR can manage templates"
    ON card_templates FOR ALL
    USING (public.has_permission('template.manage') OR public.has_permission('template.create'));

CREATE POLICY "View published versions"
    ON card_template_versions FOR SELECT
    USING (status = 'PUBLISHED' OR public.has_permission('template.read_all'));

CREATE POLICY "HR can create or update versions"
    ON card_template_versions FOR ALL
    USING (public.has_permission('template.update') OR public.has_permission('template.publish'));

-- 4. KIOSKS POLICIES
CREATE POLICY "Admins can manage kiosks"
    ON kiosks FOR ALL
    USING (public.has_permission('kiosk.manage') OR public.has_permission('kiosk.read'));

-- 5. PRINT JOBS POLICIES
CREATE POLICY "HR can view print jobs"
    ON print_jobs FOR SELECT
    USING (
        public.has_permission('print.read_all') OR
        (public.has_permission('print.read') AND branch_id = public.get_user_branch_id())
    );

-- 6. AUDIT LOGS POLICIES
CREATE POLICY "Super Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (public.has_permission('audit.read'));

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (TRUE);
