UPDATE pms.system_configs
SET config_value = '\\\\10.8.8.88\\ftp\\pms', updated_at = GETDATE()
WHERE config_key = 'FILE_STORAGE_PATH_PROD';

UPDATE pms.system_configs
SET config_value = '\\\\10.8.8.88\\ftp\\pms-non', updated_at = GETDATE()
WHERE config_key = 'FILE_STORAGE_PATH_DEV';
