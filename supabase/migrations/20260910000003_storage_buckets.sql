-- ========================================================
-- 20260910000003_storage_buckets.sql
-- Storage configuration for ID Photos and Template Assets
-- ========================================================

-- Insert storage buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
    ('card-assets', 'card-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Public read for verified photos and assets
CREATE POLICY "Public read for employee photos"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('employee-photos', 'company-logos', 'card-assets'));

-- Storage RLS: Authenticated HR write access
CREATE POLICY "HR write for employee photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('employee-photos', 'company-logos', 'card-assets'));

CREATE POLICY "HR update for employee photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id IN ('employee-photos', 'company-logos', 'card-assets'));

CREATE POLICY "HR delete for employee photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('employee-photos', 'company-logos', 'card-assets'));
