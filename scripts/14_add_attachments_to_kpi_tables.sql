-- ============================================
-- ADD ATTACHMENTS COLUMN TO KPI TABLES
-- ============================================

-- Add attachments column to deploy_success_records
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.deploy_success_records') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.deploy_success_records ADD attachments NVARCHAR(MAX) NULL
    PRINT 'Added attachments column to deploy_success_records'
END

-- Add attachments column to deploy_backup_records
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.deploy_backup_records') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.deploy_backup_records ADD attachments NVARCHAR(MAX) NULL
    PRINT 'Added attachments column to deploy_backup_records'
END

-- Add attachments column to meeting_minutes_records
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.meeting_minutes_records') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.meeting_minutes_records ADD attachments NVARCHAR(MAX) NULL
    PRINT 'Added attachments column to meeting_minutes_records'
END

PRINT 'Done!'
