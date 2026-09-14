-- ========================================================
-- 20260914000007_add_kiosk_max_card_capacity.sql
-- Add max_card_capacity column to kiosks table for feed tray capacity
-- ========================================================

ALTER TABLE kiosks
    ADD COLUMN IF NOT EXISTS max_card_capacity INT DEFAULT 50;
