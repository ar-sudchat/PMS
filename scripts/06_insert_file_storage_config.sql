-- Insert file storage configuration
-- These configs control where uploaded files are stored

-- Production path
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_PATH_PROD')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'FILE_STORAGE_PATH_PROD', '\\10.8.8.88\ftp\pms', 'string', 'Production file storage path (UNC path)');
    PRINT 'Inserted FILE_STORAGE_PATH_PROD';
END

-- Development/Test path
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_PATH_DEV')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'FILE_STORAGE_PATH_DEV', '\\10.8.8.88\ftp\pms-non', 'string', 'Development/Test file storage path (UNC path)');
    PRINT 'Inserted FILE_STORAGE_PATH_DEV';
END

-- Active storage selector (PROD or DEV)
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'FILE_STORAGE_ACTIVE')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'FILE_STORAGE_ACTIVE', 'PROD', 'string', 'Active file storage: PROD or DEV');
    PRINT 'Inserted FILE_STORAGE_ACTIVE';
END

-- Verify
SELECT config_key, config_value, description
FROM pms.system_configs
WHERE config_key LIKE 'FILE_STORAGE%'
ORDER BY config_key;
