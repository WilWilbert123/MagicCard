-- ========================================================
-- 20260918000008_seed_rbac_roles.sql
-- Seed standard RBAC roles (Super Admin, HR Admin, Kiosk Operator)
-- ========================================================

-- 1. Ensure Super Admin role exists
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Super Admin',
    'Full system administrator access across all branches, accounts, and system configuration.',
    true
) ON CONFLICT (name) DO NOTHING;

-- 2. Ensure HR Admin role exists
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'HR Admin',
    'Standard HR corporate administrator access for employee badges, card templates, and branch management.',
    true
) ON CONFLICT (name) DO NOTHING;

-- 3. Ensure Kiosk Operator role exists
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Kiosk Operator',
    'Hardware agent & kiosk terminal print monitoring access.',
    true
) ON CONFLICT (name) DO NOTHING;
