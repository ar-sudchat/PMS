-- =============================================
-- Script 78: Update file storage paths for the Linux VPS
-- Run this ONCE on the restored MoveonDB on the VPS, after the
-- application volume /data/pms-files has been mounted.
--
-- Effect:
--   FILE_STORAGE_PATH_PROD = /data/pms-files
--   FILE_STORAGE_PATH_DEV  = /data/pms-files-dev
--   FILE_STORAGE_ACTIVE    = PROD
-- =============================================

IF EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'system_configs')
BEGIN
    -- PROD path
    IF EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_PATH_PROD')
        UPDATE pms.system_configs
        SET config_value = N'/data/pms-files', updated_at = GETDATE()
        WHERE config_key = 'FILE_STORAGE_PATH_PROD';
    ELSE
        INSERT INTO pms.system_configs (config_key, config_value)
        VALUES ('FILE_STORAGE_PATH_PROD', N'/data/pms-files');

    -- DEV path
    IF EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_PATH_DEV')
        UPDATE pms.system_configs
        SET config_value = N'/data/pms-files-dev', updated_at = GETDATE()
        WHERE config_key = 'FILE_STORAGE_PATH_DEV';
    ELSE
        INSERT INTO pms.system_configs (config_key, config_value)
        VALUES ('FILE_STORAGE_PATH_DEV', N'/data/pms-files-dev');

    -- Active flag (PROD)
    IF EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_ACTIVE')
        UPDATE pms.system_configs
        SET config_value = N'PROD', updated_at = GETDATE()
        WHERE config_key = 'FILE_STORAGE_ACTIVE';
    ELSE
        INSERT INTO pms.system_configs (config_key, config_value)
        VALUES ('FILE_STORAGE_ACTIVE', N'PROD');

    PRINT 'File storage paths updated for Linux VPS';

    SELECT config_key, config_value
    FROM pms.system_configs
    WHERE config_key IN ('FILE_STORAGE_PATH_PROD', 'FILE_STORAGE_PATH_DEV', 'FILE_STORAGE_ACTIVE');
END
ELSE
BEGIN
    PRINT 'pms.system_configs not found — verify the database was restored correctly';
END
GO
