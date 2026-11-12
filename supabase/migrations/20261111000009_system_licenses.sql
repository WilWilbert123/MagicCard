-- ============================================================================
-- Migration: 20261111000009_system_licenses.sql
-- Description: System Product License & Workstation Hardware Activation Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL DEFAULT '25',
    program_id VARCHAR(50) NOT NULL DEFAULT '2267918298',
    product_number VARCHAR(100) NOT NULL,
    serial_fl VARCHAR(10) NOT NULL,
    main_product_key VARCHAR(100),
    product_key1 VARCHAR(100) NOT NULL,
    product_key2 VARCHAR(100) NOT NULL,
    validity_type VARCHAR(100) NOT NULL, -- 'Lifetime', '15 days', '30 days', '45 days', '60 days'
    status VARCHAR(100) NOT NULL,        -- 'Lifetime', 'Trial Version - 15 days', 'License with validity - 30 days', etc.
    edition VARCHAR(100) NOT NULL,       -- 'Standalone', 'Consolidator'
    installation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date VARCHAR(50) NOT NULL,       -- ISO Date string or 'Lifetime'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on product_number for fast lookup
CREATE INDEX IF NOT EXISTS idx_system_licenses_product_number ON system_licenses(product_number);
CREATE INDEX IF NOT EXISTS idx_system_licenses_created_at ON system_licenses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE system_licenses ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Allow service role full access on system_licenses"
    ON system_licenses
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users (Admin portal) can view license status
CREATE POLICY "Allow authenticated read on system_licenses"
    ON system_licenses
    FOR SELECT
    TO authenticated
    USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_licenses_timestamp ON system_licenses;
CREATE TRIGGER trigger_update_system_licenses_timestamp
    BEFORE UPDATE ON system_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_system_licenses_updated_at();

