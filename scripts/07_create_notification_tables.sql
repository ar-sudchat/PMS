-- ============================================
-- Notification System Tables
-- ============================================

-- 1. Notification Logs Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notification_logs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.notification_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        channel VARCHAR(20) NOT NULL, -- EMAIL, MS_TEAMS, IN_APP
        subject NVARCHAR(500),
        recipients NVARCHAR(MAX),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED, CANCELLED
        error_message NVARCHAR(MAX),
        metadata NVARCHAR(MAX), -- JSON
        retry_count INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        sent_at DATETIME,

        INDEX idx_channel (channel),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
    );
    PRINT 'Created table pms.notification_logs';
END
ELSE
BEGIN
    PRINT 'Table pms.notification_logs already exists';
END
GO

-- 2. Add message column to user_notifications if not exists
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.user_notifications')
    AND name = 'message'
)
BEGIN
    ALTER TABLE pms.user_notifications ADD message NVARCHAR(500) NULL;
    PRINT 'Added message column to pms.user_notifications';
END
GO

-- 3. Insert Email Configuration (Defaults - Update with your SMTP settings)
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'EMAIL_SMTP_HOST')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES
        (NEWID(), 'EMAIL_SMTP_HOST', '', 'string', 'SMTP server hostname (e.g., smtp.gmail.com, smtp.office365.com)'),
        (NEWID(), 'EMAIL_SMTP_PORT', '587', 'number', 'SMTP server port (587 for TLS, 465 for SSL, 25 for non-secure)'),
        (NEWID(), 'EMAIL_SMTP_SECURE', 'false', 'boolean', 'Use SSL/TLS (true for port 465)'),
        (NEWID(), 'EMAIL_SMTP_USER', '', 'string', 'SMTP username/email'),
        (NEWID(), 'EMAIL_SMTP_PASSWORD', '', 'password', 'SMTP password or app password'),
        (NEWID(), 'EMAIL_FROM_ADDRESS', '', 'string', 'From email address'),
        (NEWID(), 'EMAIL_FROM_NAME', 'PMS System', 'string', 'From display name');
    PRINT 'Inserted EMAIL configuration defaults';
END
GO

-- 4. Insert MS Teams Configuration
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'MS_TEAMS_WEBHOOK_URL')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES
        (NEWID(), 'MS_TEAMS_WEBHOOK_URL', '', 'string', 'MS Teams Incoming Webhook URL for notifications');
    PRINT 'Inserted MS_TEAMS_WEBHOOK_URL configuration';
END
GO

-- 5. Insert Notification Settings
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'NOTIFICATION_EMAIL_ENABLED')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES
        (NEWID(), 'NOTIFICATION_EMAIL_ENABLED', 'false', 'boolean', 'Enable email notifications'),
        (NEWID(), 'NOTIFICATION_TEAMS_ENABLED', 'false', 'boolean', 'Enable MS Teams notifications'),
        (NEWID(), 'NOTIFICATION_INAPP_ENABLED', 'true', 'boolean', 'Enable in-app notifications');
    PRINT 'Inserted notification settings';
END
GO

-- Verify
SELECT config_key,
       CASE
           WHEN config_key LIKE '%PASSWORD%' THEN '********'
           ELSE config_value
       END as config_value,
       description
FROM pms.system_configs
WHERE config_key LIKE 'EMAIL_%' OR config_key LIKE 'MS_TEAMS_%' OR config_key LIKE 'NOTIFICATION_%'
ORDER BY config_key;
