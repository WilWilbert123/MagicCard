-- ========================================================
-- 20260910000005_fix_rls_and_auth_trigger.sql
-- Fix Row Level Security policies and add automatic profile & role creation trigger
-- ========================================================

-- 1. Ensure Super Admin role exists
INSERT INTO roles (id, name, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Super Admin',
    'Full system administrator access across all branches and modules',
    true
) ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to Super Admin role if permissions exist
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- 2. Add Missing RLS Policies for Lookup & Master Data Tables
DROP POLICY IF EXISTS "Authenticated users can select companies" ON companies;
CREATE POLICY "Authenticated users can select companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select branches" ON branches;
CREATE POLICY "Authenticated users can select branches"
    ON branches FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select departments" ON departments;
CREATE POLICY "Authenticated users can select departments"
    ON departments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select positions" ON positions;
CREATE POLICY "Authenticated users can select positions"
    ON positions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select roles" ON roles;
CREATE POLICY "Authenticated users can select roles"
    ON roles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select permissions" ON permissions;
CREATE POLICY "Authenticated users can select permissions"
    ON permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select role_permissions" ON role_permissions;
CREATE POLICY "Authenticated users can select role_permissions"
    ON role_permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can select user_roles" ON user_roles;
CREATE POLICY "Authenticated users can select user_roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (true);

-- Fallback RLS Policy for Employees so all logged in users can view employees
DROP POLICY IF EXISTS "Authenticated users can select employees" ON employees;
CREATE POLICY "Authenticated users can select employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

-- Fallback RLS Policy for Kiosks
DROP POLICY IF EXISTS "Authenticated users can select kiosks" ON kiosks;
CREATE POLICY "Authenticated users can select kiosks"
    ON kiosks FOR SELECT
    TO authenticated
    USING (true);

-- Fallback RLS Policy for Print Jobs
DROP POLICY IF EXISTS "Authenticated users can select print_jobs" ON print_jobs;
CREATE POLICY "Authenticated users can select print_jobs"
    ON print_jobs FOR SELECT
    TO authenticated
    USING (true);

-- 3. Automatic Profile & Role Creation Trigger for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_role_id UUID;
    v_default_company_id UUID;
    v_default_branch_id UUID;
BEGIN
    BEGIN
        -- Get default company and branch if existing
        SELECT id INTO v_default_company_id FROM public.companies LIMIT 1;
        SELECT id INTO v_default_branch_id FROM public.branches LIMIT 1;
        SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;

        -- Create Profile
        INSERT INTO public.profiles (id, company_id, branch_id, email, full_name, is_active)
        VALUES (
            NEW.id,
            v_default_company_id,
            v_default_branch_id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
            TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();

        -- Assign Super Admin role if available
        IF v_admin_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (NEW.id, v_admin_role_id)
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Prevent any trigger error from failing auth.users insertion
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill profiles and user_roles for any users already created in auth.users
DO $$
DECLARE
    r RECORD;
    v_admin_role_id UUID;
    v_default_company_id UUID;
    v_default_branch_id UUID;
BEGIN
    SELECT id INTO v_default_company_id FROM companies LIMIT 1;
    SELECT id INTO v_default_branch_id FROM branches LIMIT 1;
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'Super Admin' LIMIT 1;

    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO public.profiles (id, company_id, branch_id, email, full_name, is_active)
        VALUES (
            r.id,
            v_default_company_id,
            v_default_branch_id,
            r.email,
            COALESCE(r.raw_user_meta_data->>'full_name', SPLIT_PART(r.email, '@', 1)),
            TRUE
        )
        ON CONFLICT (id) DO NOTHING;

        IF v_admin_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (r.id, v_admin_role_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
