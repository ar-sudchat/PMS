-- ============================================
-- MKT Project Tracking System
-- ระบบติดตามโครงการ Marketing/Sales Pipeline
-- ============================================

PRINT '=== เริ่มสร้าง MKT Tracking System ==='
GO

-- ============================================
-- STEP 1: เพิ่ม columns ใน pms.projects
-- ============================================

PRINT ''
PRINT '=== STEP 1: เพิ่ม columns ใน pms.projects ==='

-- ตรวจสอบและเพิ่ม columns ทีละตัว
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_stage')
BEGIN
    ALTER TABLE pms.projects ADD mkt_stage NVARCHAR(20) NULL;
    PRINT 'Added column: mkt_stage';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_stage_changed_at')
BEGIN
    ALTER TABLE pms.projects ADD mkt_stage_changed_at DATETIME NULL;
    PRINT 'Added column: mkt_stage_changed_at';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_stage_changed_by')
BEGIN
    ALTER TABLE pms.projects ADD mkt_stage_changed_by UNIQUEIDENTIFIER NULL;
    PRINT 'Added column: mkt_stage_changed_by';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_expected_value')
BEGIN
    ALTER TABLE pms.projects ADD mkt_expected_value DECIMAL(18,2) NULL;
    PRINT 'Added column: mkt_expected_value';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_expected_close_date')
BEGIN
    ALTER TABLE pms.projects ADD mkt_expected_close_date DATE NULL;
    PRINT 'Added column: mkt_expected_close_date';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_contact_person')
BEGIN
    ALTER TABLE pms.projects ADD mkt_contact_person NVARCHAR(200) NULL;
    PRINT 'Added column: mkt_contact_person';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_contact_phone')
BEGIN
    ALTER TABLE pms.projects ADD mkt_contact_phone NVARCHAR(50) NULL;
    PRINT 'Added column: mkt_contact_phone';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_contact_email')
BEGIN
    ALTER TABLE pms.projects ADD mkt_contact_email NVARCHAR(200) NULL;
    PRINT 'Added column: mkt_contact_email';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_meeting_date')
BEGIN
    ALTER TABLE pms.projects ADD mkt_meeting_date DATETIME NULL;
    PRINT 'Added column: mkt_meeting_date';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_notes')
BEGIN
    ALTER TABLE pms.projects ADD mkt_notes NVARCHAR(MAX) NULL;
    PRINT 'Added column: mkt_notes';
END

GO

-- ============================================
-- STEP 2: สร้างตาราง mkt_tracking_logs
-- ============================================

PRINT ''
PRINT '=== STEP 2: สร้างตาราง mkt_tracking_logs ==='

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'mkt_tracking_logs')
BEGIN
    CREATE TABLE pms.mkt_tracking_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        action_type NVARCHAR(50) NOT NULL,  -- STAGE_CHANGE, NOTE_ADDED, MEETING_SCHEDULED, DETAILS_UPDATED, CONVERTED_TO_DEV
        from_stage NVARCHAR(20) NULL,
        to_stage NVARCHAR(20) NULL,
        notes NVARCHAR(MAX) NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_mkt_tracking_logs_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_mkt_tracking_logs_employee FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );

    -- Create indexes
    CREATE INDEX IX_mkt_tracking_logs_project_id ON pms.mkt_tracking_logs(project_id);
    CREATE INDEX IX_mkt_tracking_logs_created_at ON pms.mkt_tracking_logs(created_at DESC);

    PRINT 'Created table: pms.mkt_tracking_logs';
END
ELSE
BEGIN
    PRINT 'Table pms.mkt_tracking_logs already exists';
END
GO

-- ============================================
-- STEP 3: สร้าง View สำหรับ MKT Projects
-- ============================================

PRINT ''
PRINT '=== STEP 3: สร้าง View vw_mkt_project_tracking ==='

IF EXISTS (SELECT 1 FROM sys.views WHERE schema_id = SCHEMA_ID('pms') AND name = 'vw_mkt_project_tracking')
    DROP VIEW pms.vw_mkt_project_tracking;
GO

CREATE VIEW pms.vw_mkt_project_tracking AS
SELECT
    p.id,
    p.project_code,
    p.name AS title,
    p.description,
    p.customer_id,
    c.name AS customer_name,
    p.mkt_stage,
    p.mkt_stage_changed_at,
    p.mkt_stage_changed_by,
    changed_by.first_name + ' ' + changed_by.last_name AS stage_changed_by_name,
    p.mkt_expected_value,
    p.mkt_expected_close_date,
    p.mkt_contact_person,
    p.mkt_contact_phone,
    p.mkt_contact_email,
    p.mkt_meeting_date,
    p.mkt_notes,
    p.project_manager_id,
    pm.first_name + ' ' + pm.last_name AS project_manager_name,
    p.status_id,
    p.created_at,
    p.created_by,
    creator.first_name + ' ' + creator.last_name AS created_by_name,
    DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) AS days_in_stage
FROM pms.projects p
INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
LEFT JOIN pms.customers c ON c.id = p.customer_id
LEFT JOIN pms.employees changed_by ON changed_by.id = p.mkt_stage_changed_by
LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
LEFT JOIN pms.employees creator ON creator.id = p.created_by
WHERE pt.code = 'MKT';
GO

PRINT 'Created view: pms.vw_mkt_project_tracking';
GO

-- ============================================
-- STEP 4: สร้าง View สรุปตาม Stage
-- ============================================

PRINT ''
PRINT '=== STEP 4: สร้าง View vw_mkt_stage_summary ==='

IF EXISTS (SELECT 1 FROM sys.views WHERE schema_id = SCHEMA_ID('pms') AND name = 'vw_mkt_stage_summary')
    DROP VIEW pms.vw_mkt_stage_summary;
GO

CREATE VIEW pms.vw_mkt_stage_summary AS
SELECT
    ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
    COUNT(*) AS project_count,
    ISNULL(SUM(p.mkt_expected_value), 0) AS total_value
FROM pms.projects p
INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
WHERE pt.code = 'MKT'
GROUP BY p.mkt_stage;
GO

PRINT 'Created view: pms.vw_mkt_stage_summary';
GO

-- ============================================
-- STEP 5: อัพเดท MKT projects ที่มีอยู่ให้มี stage = 'NEW'
-- ============================================

PRINT ''
PRINT '=== STEP 5: อัพเดท existing MKT projects ==='

UPDATE p
SET
    p.mkt_stage = 'NEW',
    p.mkt_stage_changed_at = p.created_at
FROM pms.projects p
INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
WHERE pt.code = 'MKT'
  AND p.mkt_stage IS NULL;

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR) + ' existing MKT projects to stage NEW';
GO

-- ============================================
-- STEP 6: ตรวจสอบผลลัพธ์
-- ============================================

PRINT ''
PRINT '=== STEP 6: ตรวจสอบผลลัพธ์ ==='

PRINT ''
PRINT '-- Columns in pms.projects (mkt_*) --'
SELECT name, TYPE_NAME(user_type_id) AS data_type
FROM sys.columns
WHERE object_id = OBJECT_ID('pms.projects')
  AND name LIKE 'mkt_%'
ORDER BY name;

PRINT ''
PRINT '-- MKT Projects Summary --'
SELECT * FROM pms.vw_mkt_stage_summary;

PRINT ''
PRINT '=== MKT Tracking System สร้างเสร็จสมบูรณ์ ==='
GO
