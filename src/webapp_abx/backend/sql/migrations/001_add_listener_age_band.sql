-- =============================================================================
-- 001_add_listener_age_band.sql — migração para bases de dados já existentes
--
-- Idempotente: pode correr-se mais do que uma vez sem erro. As sessões
-- anteriores ficam com listener_age_band = NULL (intencional).
-- =============================================================================

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS listener_age_band VARCHAR(8) NULL
    AFTER listener_experience;

ALTER TABLE sessions
    ADD CONSTRAINT chk_listener_age_band
        CHECK (listener_age_band IN ('<18','18-24','25-34','35-44','45-54','55+'));
