-- =============================================
-- KPI Record Module - Migration Script
-- =============================================
-- Run this script to add missing columns to existing tables
-- Date: 2026-01-11
-- =============================================

-- =============================================
-- 1. Deploy Records - Add rollback_count if missing
-- =============================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_records')
BEGIN
    -- Add rollback_count column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_records'
                   AND COLUMN_NAME = 'rollback_count')
    BEGIN
        ALTER TABLE pms.deploy_records
        ADD rollback_count INT NOT NULL DEFAULT 0;
        PRINT 'Added column: deploy_records.rollback_count';
    END
    ELSE
    BEGIN
        PRINT 'Column deploy_records.rollback_count already exists';
    END
END
ELSE
BEGIN
    -- Create table if not exists
    CREATE TABLE pms.deploy_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        customer_id UNIQUEIDENTIFIER NOT NULL,
        week_start_date DATE NOT NULL,
        year INT NOT NULL,
        week_number INT NOT NULL,
        deploy_count INT NOT NULL DEFAULT 0,
        rollback_count INT NOT NULL DEFAULT 0,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_deploy_records_customer FOREIGN KEY (customer_id) REFERENCES pms.customers(id),
        CONSTRAINT FK_deploy_records_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT UQ_deploy_records_customer_week UNIQUE (customer_id, year, week_number)
    );

    CREATE INDEX IX_deploy_records_year_week ON pms.deploy_records(year, week_number);
    CREATE INDEX IX_deploy_records_customer ON pms.deploy_records(customer_id);

    PRINT 'Created table: pms.deploy_records';
END
GO

-- =============================================
-- 2. Backup Sources - Create if not exists
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'backup_sources')
BEGIN
    CREATE TABLE pms.backup_sources (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(500) NULL,
        source_type NVARCHAR(50) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT UQ_backup_sources_code UNIQUE (code)
    );

    -- Insert default data
    INSERT INTO pms.backup_sources (code, name, source_type, sort_order) VALUES
    ('DB-PROD', 'Production Database', 'Database', 1),
    ('DB-UAT', 'UAT Database', 'Database', 2),
    ('SRC-MAIN', 'Main Source Code', 'Source Code', 3),
    ('SRV-WEB', 'Web Server', 'Server', 4),
    ('SRV-API', 'API Server', 'Server', 5),
    ('APP-CONFIG', 'Application Config', 'Application', 6);

    PRINT 'Created table: pms.backup_sources with default data';
END
ELSE
BEGIN
    PRINT 'Table pms.backup_sources already exists';
END
GO

-- =============================================
-- 3. Deploy Backup Records - Add is_passed and failed_reason
-- =============================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_backup_records')
BEGIN
    -- Add is_passed column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_backup_records'
                   AND COLUMN_NAME = 'is_passed')
    BEGIN
        ALTER TABLE pms.deploy_backup_records
        ADD is_passed BIT NOT NULL DEFAULT 1;
        PRINT 'Added column: deploy_backup_records.is_passed';
    END
    ELSE
    BEGIN
        PRINT 'Column deploy_backup_records.is_passed already exists';
    END

    -- Add failed_reason column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_backup_records'
                   AND COLUMN_NAME = 'failed_reason')
    BEGIN
        ALTER TABLE pms.deploy_backup_records
        ADD failed_reason NVARCHAR(500) NULL;
        PRINT 'Added column: deploy_backup_records.failed_reason';
    END
    ELSE
    BEGIN
        PRINT 'Column deploy_backup_records.failed_reason already exists';
    END

    -- Check if backup_source_id exists, if not might need migration from project_id
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_backup_records'
                   AND COLUMN_NAME = 'backup_source_id')
    BEGIN
        -- Add backup_source_id column
        ALTER TABLE pms.deploy_backup_records
        ADD backup_source_id UNIQUEIDENTIFIER NULL;
        PRINT 'Added column: deploy_backup_records.backup_source_id';
    END
END
ELSE
BEGIN
    -- Create table if not exists
    CREATE TABLE pms.deploy_backup_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        backup_source_id UNIQUEIDENTIFIER NOT NULL,
        backup_date DATE NOT NULL,
        deploy_record_id UNIQUEIDENTIFIER NULL,
        backup_type NVARCHAR(50) NOT NULL,
        backup_location NVARCHAR(500) NULL,
        backup_size NVARCHAR(50) NULL,
        version_number INT NOT NULL DEFAULT 1,
        is_verified BIT NOT NULL DEFAULT 0,
        verified_by UNIQUEIDENTIFIER NULL,
        verified_at DATETIME2 NULL,
        is_passed BIT NOT NULL DEFAULT 1,
        failed_reason NVARCHAR(500) NULL,
        notes NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_deploy_backup_source FOREIGN KEY (backup_source_id) REFERENCES pms.backup_sources(id),
        CONSTRAINT FK_deploy_backup_verified_by FOREIGN KEY (verified_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_deploy_backup_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_deploy_backup_source ON pms.deploy_backup_records(backup_source_id);
    CREATE INDEX IX_deploy_backup_date ON pms.deploy_backup_records(backup_date);

    PRINT 'Created table: pms.deploy_backup_records';
END
GO

-- =============================================
-- 4. Meeting Minutes Records - Add organized_by
-- =============================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'meeting_minutes_records')
BEGIN
    -- Add organized_by column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'meeting_minutes_records'
                   AND COLUMN_NAME = 'organized_by')
    BEGIN
        ALTER TABLE pms.meeting_minutes_records
        ADD organized_by UNIQUEIDENTIFIER NULL;
        PRINT 'Added column: meeting_minutes_records.organized_by';

        -- Copy created_by to organized_by for existing records
        UPDATE pms.meeting_minutes_records
        SET organized_by = created_by
        WHERE organized_by IS NULL;
        PRINT 'Updated existing records: set organized_by = created_by';
    END
    ELSE
    BEGIN
        PRINT 'Column meeting_minutes_records.organized_by already exists';
    END
END
ELSE
BEGIN
    -- Create table if not exists
    CREATE TABLE pms.meeting_minutes_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NULL,
        meeting_date DATETIME2 NOT NULL,
        meeting_end_time DATETIME2 NULL,
        meeting_type NVARCHAR(100) NOT NULL,
        meeting_title NVARCHAR(200) NOT NULL,
        organized_by UNIQUEIDENTIFIER NULL,
        attendees NVARCHAR(500) NULL,
        mom_sent_at DATETIME2 NULL,
        is_on_time BIT NULL,
        hours_to_send DECIMAL(5,2) NULL,
        sent_by UNIQUEIDENTIFIER NULL,
        mom_file_path NVARCHAR(500) NULL,
        notes NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_meeting_minutes_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_meeting_minutes_organized_by FOREIGN KEY (organized_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_meeting_minutes_sent_by FOREIGN KEY (sent_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_meeting_minutes_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_meeting_minutes_project ON pms.meeting_minutes_records(project_id);
    CREATE INDEX IX_meeting_minutes_date ON pms.meeting_minutes_records(meeting_date);

    PRINT 'Created table: pms.meeting_minutes_records';
END
GO

-- =============================================
-- VERIFICATION
-- =============================================
PRINT '';
PRINT '============================================';
PRINT 'KPI Record Migration Complete!';
PRINT '============================================';
PRINT '';

-- Check columns
SELECT 'deploy_records' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_records'
ORDER BY ORDINAL_POSITION;

SELECT 'deploy_backup_records' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_backup_records'
ORDER BY ORDINAL_POSITION;

SELECT 'meeting_minutes_records' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'meeting_minutes_records'
ORDER BY ORDINAL_POSITION;

SELECT 'backup_sources' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'backup_sources'
ORDER BY ORDINAL_POSITION;
GO
