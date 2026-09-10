-- ========================================================
-- 20260910000004_seed_data.sql
-- Enterprise Seed Data (Acme Corp, Branches, Employees, Templates)
-- ========================================================

DO $$
DECLARE
    v_company_id UUID := '11111111-1111-1111-1111-111111111111';
    v_branch_hq UUID := '22222222-2222-2222-2222-222222222221';
    v_branch_sf UUID := '22222222-2222-2222-2222-222222222222';
    v_dept_eng UUID := '33333333-3333-3333-3333-333333333331';
    v_dept_hr UUID := '33333333-3333-3333-3333-333333333332';
    v_dept_ops UUID := '33333333-3333-3333-3333-333333333333';
    v_pos_eng UUID := '44444444-4444-4444-4444-444444444441';
    v_pos_hr UUID := '44444444-4444-4444-4444-444444444442';
    v_pos_ops UUID := '44444444-4444-4444-4444-444444444443';
    v_emp_1 UUID := '55555555-5555-5555-5555-555555555551';
    v_emp_2 UUID := '55555555-5555-5555-5555-555555555552';
    v_emp_3 UUID := '55555555-5555-5555-5555-555555555553';
    v_tmpl_id UUID := '66666666-6666-6666-6666-666666666661';
    v_version_1 UUID := '77777777-7777-7777-7777-777777777771';
    v_version_2 UUID := '77777777-7777-7777-7777-777777777772';
    v_kiosk_1 UUID := '88888888-8888-8888-8888-888888888881';
    v_kiosk_2 UUID := '88888888-8888-8888-8888-888888888882';
BEGIN
    -- 1. COMPANY
    INSERT INTO companies (id, name, code, logo_url, settings)
    VALUES (
        v_company_id,
        'Acme Corporation',
        'ACME',
        '/assets/acme-logo.svg',
        '{"theme": "enterprise", "allow_self_service_reprint": true}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. BRANCHES
    INSERT INTO branches (id, company_id, name, code, address, contact_number, is_active)
    VALUES
        (v_branch_hq, v_company_id, 'Global Headquarters', 'HQ-NYC', '350 5th Ave, New York, NY 10118', '+1 (212) 555-0100', true),
        (v_branch_sf, v_company_id, 'West Coast Tech Campus', 'WC-SF', '500 Howard St, San Francisco, CA 94105', '+1 (415) 555-0199', true)
    ON CONFLICT (id) DO NOTHING;

    -- 3. DEPARTMENTS
    INSERT INTO departments (id, company_id, name, code)
    VALUES
        (v_dept_eng, v_company_id, 'Engineering & Technology', 'ENG'),
        (v_dept_hr, v_company_id, 'Human Resources', 'HR'),
        (v_dept_ops, v_company_id, 'Global Operations', 'OPS')
    ON CONFLICT (id) DO NOTHING;

    -- 4. POSITIONS
    INSERT INTO positions (id, department_id, title, level)
    VALUES
        (v_pos_eng, v_dept_eng, 'Senior Software Engineer', 'SENIOR'),
        (v_pos_hr, v_dept_hr, 'People Operations Specialist', 'STANDARD'),
        (v_pos_ops, v_dept_ops, 'Director of Logistics', 'DIRECTOR')
    ON CONFLICT (id) DO NOTHING;

    -- 5. EMPLOYEES
    INSERT INTO employees (id, company_id, branch_id, department_id, position_id, employee_number, first_name, last_name, email, contact_number, photo_url, employment_status, card_status, date_hired)
    VALUES
        (v_emp_1, v_company_id, v_branch_hq, v_dept_eng, v_pos_eng, 'EMP-000123', 'John', 'Doe', 'john.doe@acmecorp.com', '+1 (555) 234-5678', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', 'ACTIVE', 'PRINTED', '2023-01-15'),
        (v_emp_2, v_company_id, v_branch_hq, v_dept_hr, v_pos_hr, 'EMP-000124', 'Jane', 'Smith', 'jane.smith@acmecorp.com', '+1 (555) 345-6789', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80', 'ACTIVE', 'NOT_ISSUED', '2023-05-20'),
        (v_emp_3, v_company_id, v_branch_sf, v_dept_ops, v_pos_ops, 'EMP-000125', 'Michael', 'Brown', 'michael.brown@acmecorp.com', '+1 (555) 456-7890', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', 'ACTIVE', 'PRINTED', '2022-11-01')
    ON CONFLICT (id) DO NOTHING;

    -- 6. CARD TEMPLATE & PUBLISHED VERSION (CR80)
    INSERT INTO card_templates (id, company_id, name, description, is_default, current_version_number)
    VALUES (
        v_tmpl_id,
        v_company_id,
        'Acme Corporate Executive ID',
        'Standard CR80 dual-sided identification card with high-security QR and Code128 barcode.',
        true,
        2
    ) ON CONFLICT (id) DO NOTHING;

    -- Version 1 (Archived)
    INSERT INTO card_template_versions (id, template_id, version_number, status, checksum, changelog, published_at, layout_json)
    VALUES (
        v_version_1,
        v_tmpl_id,
        1,
        'ARCHIVED',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'Initial template release',
        NOW() - INTERVAL '30 days',
        '{"version": 1, "card": {"width": 856, "height": 540, "unit": "px", "physicalWidth": 85.6, "physicalHeight": 53.98, "physicalUnit": "mm", "thickness": 0.76}, "front": {"background": {"color": "#ffffff"}, "elements": []}, "back": {"background": {"color": "#f8fafc"}, "elements": []}}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Version 2 (Published & Active)
    INSERT INTO card_template_versions (id, template_id, version_number, status, checksum, changelog, published_at, layout_json)
    VALUES (
        v_version_2,
        v_tmpl_id,
        2,
        'PUBLISHED',
        'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        'Added dynamic QR code verification token, updated Maroon aesthetic accents',
        NOW() - INTERVAL '2 hours',
        json_build_object(
            'version', 1,
            'card', json_build_object(
                'width', 856,
                'height', 540,
                'unit', 'px',
                'physicalWidth', 85.60,
                'physicalHeight', 53.98,
                'physicalUnit', 'mm',
                'thickness', 0.76,
                'cornerRound', 3.18,
                'bleedMm', 1.5,
                'safeMarginMm', 3.0
            ),
            'front', json_build_object(
                'background', json_build_object('color', '#ffffff'),
                'elements', json_build_array(
                    json_build_object('id', 'el-logo', 'type', 'IMAGE', 'x', 50, 'y', 40, 'width', 180, 'height', 45, 'src', '/assets/acme-logo.svg', 'draggable', true),
                    json_build_object('id', 'el-photo', 'type', 'EMPLOYEE_PHOTO', 'x', 50, 'y', 130, 'width', 160, 'height', 200, 'borderRadius', 12, 'borderWidth', 2, 'borderColor', '#e2e8f0', 'draggable', true),
                    json_build_object('id', 'el-name', 'type', 'TEXT', 'x', 240, 'y', 150, 'width', 400, 'height', 40, 'text', '{{employee.fullName}}', 'fontSize', 32, 'fontFamily', 'Inter', 'fontWeight', 'bold', 'color', '#0f172a', 'draggable', true),
                    json_build_object('id', 'el-title', 'type', 'TEXT', 'x', 240, 'y', 195, 'width', 400, 'height', 30, 'text', '{{employee.position}}', 'fontSize', 20, 'fontFamily', 'Inter', 'fontWeight', '600', 'color', '#dc2626', 'draggable', true),
                    json_build_object('id', 'el-id', 'type', 'TEXT', 'x', 240, 'y', 235, 'width', 400, 'height', 25, 'text', 'ID: {{employee.employeeNumber}}', 'fontSize', 16, 'fontFamily', 'Inter', 'fontWeight', 'normal', 'color', '#64748b', 'draggable', true),
                    json_build_object('id', 'el-dept', 'type', 'TEXT', 'x', 240, 'y', 265, 'width', 400, 'height', 25, 'text', 'Dept: {{employee.department}}', 'fontSize', 16, 'fontFamily', 'Inter', 'fontWeight', 'normal', 'color', '#64748b', 'draggable', true),
                    json_build_object('id', 'el-qr', 'type', 'QR_CODE', 'x', 670, 'y', 330, 'width', 135, 'height', 135, 'data', 'https://verify.acmecorp.com/id/{{employee.employeeNumber}}', 'draggable', true),
                    json_build_object('id', 'el-accent', 'type', 'SHAPE', 'shapeType', 'RECTANGLE', 'x', 0, 'y', 510, 'width', 856, 'height', 30, 'fill', '#dc2626', 'draggable', false)
                )
            ),
            'back', json_build_object(
                'background', json_build_object('color', '#f8fafc'),
                'elements', json_build_array(
                    json_build_object('id', 'el-back-logo', 'type', 'IMAGE', 'x', 338, 'y', 60, 'width', 180, 'height', 45, 'src', '/assets/acme-logo.svg', 'draggable', true),
                    json_build_object('id', 'el-back-terms', 'type', 'TEXT', 'x', 100, 'y', 140, 'width', 656, 'height', 120, 'text', 'This card is the property of Acme Corporation. If found, please return to any Acme Corporate Security desk or mail to 350 5th Ave, New York, NY 10118. Unauthorized possession or reproduction is strictly prohibited.', 'fontSize', 14, 'fontFamily', 'Inter', 'fontWeight', 'normal', 'color', '#475569', 'textAlign', 'center', 'lineHeight', 1.5, 'draggable', true),
                    json_build_object('id', 'el-barcode', 'type', 'BARCODE', 'x', 248, 'y', 300, 'width', 360, 'height', 90, 'data', '{{employee.employeeNumber}}', 'format', 'CODE128', 'draggable', true),
                    json_build_object('id', 'el-back-sub', 'type', 'TEXT', 'x', 100, 'y', 410, 'width', 656, 'height', 30, 'text', 'FOR INTERNAL SECURITY & ACCESS CONTROL ONLY', 'fontSize', 12, 'fontFamily', 'Inter', 'fontWeight', 'bold', 'color', '#94a3b8', 'textAlign', 'center', 'draggable', false)
                )
            )
        )
    ) ON CONFLICT (id) DO NOTHING;

    -- Point active template to Version 2
    UPDATE card_templates SET current_published_version_id = v_version_2 WHERE id = v_tmpl_id;

    -- 7. KIOSKS
    INSERT INTO kiosks (id, company_id, branch_id, kiosk_code, name, status, agent_version, app_version, ip_address, active_template_version_id, printer_status_summary, last_heartbeat_at)
    VALUES
        (v_kiosk_1, v_company_id, v_branch_hq, 'KIOSK-NYC-01', 'HQ Main Reception Kiosk', 'ONLINE', 'v1.4.0', 'v2.1.0', '192.168.10.45', v_version_2, 'READY - Magicard 300 Duo (Ribbon 94%)', NOW()),
        (v_kiosk_2, v_company_id, v_branch_sf, 'KIOSK-SF-01', 'West Coast Lobby Kiosk', 'ONLINE', 'v1.4.0', 'v2.1.0', '192.168.20.12', v_version_2, 'READY - Magicard 300 Duo (Ribbon 88%)', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 8. SAMPLE PRINT JOBS (AUDIT HISTORY)
    INSERT INTO print_jobs (job_number, idempotency_key, company_id, branch_id, kiosk_id, employee_id, template_version_id, status, started_at, completed_at)
    VALUES
        ('PRINT-2026-000101', 'idem-101', v_company_id, v_branch_hq, v_kiosk_1, v_emp_1, v_version_2, 'COMPLETED', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '59 minutes'),
        ('PRINT-2026-000102', 'idem-102', v_company_id, v_branch_sf, v_kiosk_2, v_emp_3, v_version_2, 'COMPLETED', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 58 minutes')
    ON CONFLICT (job_number) DO NOTHING;

    -- 9. INITIAL AUDIT LOG
    INSERT INTO audit_logs (company_id, branch_id, actor_type, action, entity_type, entity_id, metadata, ip_address)
    VALUES (
        v_company_id,
        v_branch_hq,
        'SYSTEM',
        'SYSTEM_INITIALIZATION',
        'SYSTEM',
        v_company_id,
        '{"note": "Enterprise multi-branch ID Card & Kiosk system initialized successfully"}'::jsonb,
        '127.0.0.1'
    );
END $$;
