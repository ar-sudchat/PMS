-- =============================================
-- KPI Record Module Schema
-- =============================================
-- Version: 1.0
-- Date: 2026-01-11
-- Description: Tables for Deploy Success, Deploy Backup, Meeting Minutes
-- =============================================

-- =============================================
-- 1. Deploy Success Records (Simplified - by Customer + Week)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_records')
BEGIN
    CREATE TABLE pms.deploy_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        customer_id UNIQUEIDENTIFIER NOT NULL,     -- ลูกค้า
        week_start_date DATE NOT NULL,             -- วันจันทร์ของสัปดาห์นั้น
        year INT NOT NULL,                         -- ปี
        week_number INT NOT NULL,                  -- สัปดาห์ที่
        deploy_count INT NOT NULL DEFAULT 0,       -- จำนวน Deploy ทั้งหมด
        rollback_count INT NOT NULL DEFAULT 0,     -- จำนวน Rollback
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
ELSE
BEGIN
    PRINT 'Table pms.deploy_records already exists';
END
GO

-- =============================================
-- 2. Backup Sources Master Table
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'backup_sources')
BEGIN
    CREATE TABLE pms.backup_sources (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL,               -- รหัส เช่น 'DB-MES', 'SRC-SALES'
        name NVARCHAR(200) NOT NULL,              -- ชื่อ เช่น 'MES Production Database'
        description NVARCHAR(500) NULL,           -- รายละเอียด
        source_type NVARCHAR(50) NOT NULL,        -- 'Database', 'Source Code', 'Server', 'Application'
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
-- 3. Deploy Backup Records (Updated to use backup_source_id)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_backup_records')
BEGIN
    CREATE TABLE pms.deploy_backup_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        backup_source_id UNIQUEIDENTIFIER NOT NULL, -- เปลี่ยนจาก project_id
        backup_date DATE NOT NULL,
        deploy_record_id UNIQUEIDENTIFIER NULL,    -- เชื่อมกับ Deploy (ถ้ามี)
        backup_type NVARCHAR(50) NOT NULL,         -- 'Database', 'Source Code', 'Config', 'Full', 'Files'
        backup_location NVARCHAR(500) NULL,        -- ที่เก็บ Backup
        backup_size NVARCHAR(50) NULL,             -- ขนาดไฟล์
        version_number INT NOT NULL DEFAULT 1,     -- Version ที่เท่าไร (1-5)
        is_verified BIT NOT NULL DEFAULT 0,        -- ตรวจสอบแล้ว
        verified_by UNIQUEIDENTIFIER NULL,
        verified_at DATETIME2 NULL,
        is_passed BIT NOT NULL DEFAULT 1,           -- ผ่าน/ไม่ผ่าน KPI
        failed_reason NVARCHAR(500) NULL,            -- เหตุผลที่ไม่ผ่าน
        notes NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_deploy_backup_source FOREIGN KEY (backup_source_id) REFERENCES pms.backup_sources(id),
        CONSTRAINT FK_deploy_backup_deploy FOREIGN KEY (deploy_record_id) REFERENCES pms.deploy_records(id),
        CONSTRAINT FK_deploy_backup_verified_by FOREIGN KEY (verified_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_deploy_backup_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_deploy_backup_source ON pms.deploy_backup_records(backup_source_id);
    CREATE INDEX IX_deploy_backup_date ON pms.deploy_backup_records(backup_date);

    PRINT 'Created table: pms.deploy_backup_records';
END
ELSE
BEGIN
    PRINT 'Table pms.deploy_backup_records already exists';

    -- Add is_passed column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_backup_records'
                   AND COLUMN_NAME = 'is_passed')
    BEGIN
        ALTER TABLE pms.deploy_backup_records
        ADD is_passed BIT NOT NULL DEFAULT 1;
        PRINT 'Added column: is_passed';
    END

    -- Add failed_reason column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'deploy_backup_records'
                   AND COLUMN_NAME = 'failed_reason')
    BEGIN
        ALTER TABLE pms.deploy_backup_records
        ADD failed_reason NVARCHAR(500) NULL;
        PRINT 'Added column: failed_reason';
    END

    -- Migration: เปลี่ยนจาก project_id เป็น backup_source_id
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_backup_records' AND COLUMN_NAME = 'project_id')
    BEGIN
        -- Drop old FK if exists
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                   WHERE CONSTRAINT_NAME = 'FK_deploy_backup_project')
        BEGIN
            ALTER TABLE pms.deploy_backup_records DROP CONSTRAINT FK_deploy_backup_project;
            PRINT 'Dropped FK_deploy_backup_project';
        END

        -- Rename column
        EXEC sp_rename 'pms.deploy_backup_records.project_id', 'backup_source_id', 'COLUMN';
        PRINT 'Renamed project_id to backup_source_id';

        -- Add new FK
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                       WHERE CONSTRAINT_NAME = 'FK_deploy_backup_source')
        BEGIN
            ALTER TABLE pms.deploy_backup_records
            ADD CONSTRAINT FK_deploy_backup_source
            FOREIGN KEY (backup_source_id) REFERENCES pms.backup_sources(id);
            PRINT 'Added FK_deploy_backup_source';
        END
    END
END
GO

-- =============================================
-- 4. Meeting Minutes Records
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'meeting_minutes_records')
BEGIN
    CREATE TABLE pms.meeting_minutes_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NULL,          -- อาจไม่ผูกโครงการก็ได้
        meeting_date DATETIME2 NOT NULL,           -- วันเวลาประชุม
        meeting_end_time DATETIME2 NULL,           -- เวลาประชุมเสร็จ
        meeting_type NVARCHAR(100) NOT NULL,       -- 'Kickoff', 'Weekly', 'Review', 'UAT', 'GoLive', 'Internal', 'Customer', 'Other'
        meeting_title NVARCHAR(200) NOT NULL,      -- หัวข้อประชุม
        organized_by UNIQUEIDENTIFIER NOT NULL,    -- ผู้จัดประชุม (เจ้าของ KPI)
        attendees NVARCHAR(500) NULL,              -- ผู้เข้าร่วม
        mom_sent_at DATETIME2 NULL,                -- วันเวลาที่ส่ง MoM
        is_on_time BIT NULL,                       -- ส่งทันภายใน 24 ชม. หรือไม่ (auto calculate)
        hours_to_send DECIMAL(5,2) NULL,           -- จำนวนชั่วโมงที่ใช้ส่ง
        sent_by UNIQUEIDENTIFIER NULL,             -- ใครส่ง
        mom_file_path NVARCHAR(500) NULL,          -- ไฟล์ MoM
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
ELSE
BEGIN
    PRINT 'Table pms.meeting_minutes_records already exists';
END
GO

-- =============================================
-- VERIFICATION
-- =============================================
PRINT '';
PRINT '============================================';
PRINT 'KPI Record Schema Migration Complete!';
PRINT '============================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  - pms.deploy_records';
PRINT '  - pms.backup_sources';
PRINT '  - pms.deploy_backup_records';
PRINT '  - pms.meeting_minutes_records';
PRINT '';
GO
