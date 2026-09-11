-- ========================================================
-- 20260911000006_kiosk_agent_pairing.sql
-- Extension for Physical Kiosk Agent Pairing & Hardware Devices
-- ========================================================

-- 1. Extend kiosks table with pairing columns
ALTER TABLE kiosks
    ADD COLUMN IF NOT EXISTS pairing_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pairing_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paired_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS device_token_hash VARCHAR(255);

-- Index for rapid pairing lookup
CREATE INDEX IF NOT EXISTS idx_kiosks_pairing_code ON kiosks(pairing_code) WHERE pairing_code IS NOT NULL;

-- 2. Create kiosk_devices table if not exists
CREATE TABLE IF NOT EXISTS kiosk_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    device_identifier VARCHAR(255) NOT NULL, -- e.g. Hardware Machine Name / MAC Address / Serial
    credential_hash VARCHAR(255) NOT NULL,
    agent_version VARCHAR(50) DEFAULT 'v1.0.0',
    os_description VARCHAR(255),
    printer_model VARCHAR(255),
    ip_address VARCHAR(45),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_kiosk_device UNIQUE (kiosk_id, device_identifier)
);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_kiosk_id ON kiosk_devices(kiosk_id);

-- 3. RLS Policies for kiosk_devices and kiosks pairing
ALTER TABLE kiosk_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select kiosk_devices" ON kiosk_devices;
CREATE POLICY "Authenticated users can select kiosk_devices"
    ON kiosk_devices FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role & authenticated can insert/update kiosk_devices" ON kiosk_devices;
CREATE POLICY "Service role & authenticated can insert/update kiosk_devices"
    ON kiosk_devices FOR ALL
    USING (true);

-- 4. Function to generate a one-time pairing code for a Kiosk (valid for 15 mins)
CREATE OR REPLACE FUNCTION generate_kiosk_pairing_code(p_kiosk_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
    v_code VARCHAR(10);
BEGIN
    -- Generate random 6-character alphanumeric code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    UPDATE kiosks
    SET 
        pairing_code = v_code,
        pairing_expires_at = NOW() + INTERVAL '15 minutes',
        updated_at = NOW()
    WHERE id = p_kiosk_id;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
