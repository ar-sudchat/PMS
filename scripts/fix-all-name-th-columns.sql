-- ============================================
-- Fix: Add name_th column to all config tables if missing
-- Run this script to fix "Invalid column name 'name_th'" errors
-- ============================================

USE PMSoftware;
GO

-- 1. Add name_th to task_type_configs if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'task_type_configs'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.task_type_configs ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to task_type_configs';
END
ELSE
    PRINT 'Column already exists: name_th in task_type_configs';
GO

-- 2. Add name_th to deliverable_configs if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'deliverable_configs'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.deliverable_configs ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to deliverable_configs';
END
ELSE
    PRINT 'Column already exists: name_th in deliverable_configs';
GO

-- 3. Add name_th to project_status_configs if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'project_status_configs'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.project_status_configs ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to project_status_configs';
END
ELSE
    PRINT 'Column already exists: name_th in project_status_configs';
GO

-- 4. Add name_th to milestone_configs if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'milestone_configs'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.milestone_configs ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to milestone_configs';
END
ELSE
    PRINT 'Column already exists: name_th in milestone_configs';
GO

-- 5. Add name_th to positions if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'positions'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.positions ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to positions';
END
ELSE
    PRINT 'Column already exists: name_th in positions';
GO

-- 6. Add name_th to departments if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'departments'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.departments ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to departments';
END
ELSE
    PRINT 'Column already exists: name_th in departments';
GO

-- 7. Add name_th to project_types if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'project_types'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.project_types ADD name_th NVARCHAR(200) NULL;
    PRINT 'Added column: name_th to project_types';
END
ELSE
    PRINT 'Column already exists: name_th in project_types';
GO

-- 8. Add name_th to projects if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.projects ADD name_th NVARCHAR(500) NULL;
    PRINT 'Added column: name_th to projects';
END
ELSE
    PRINT 'Column already exists: name_th in projects';
GO

-- 9. Add name_th to project_deliverables if missing
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'project_deliverables'
    AND COLUMN_NAME = 'name_th'
)
BEGIN
    ALTER TABLE pms.project_deliverables ADD name_th NVARCHAR(500) NULL;
    PRINT 'Added column: name_th to project_deliverables';
END
ELSE
    PRINT 'Column already exists: name_th in project_deliverables';
GO

-- Update Thai translations for task types
UPDATE pms.task_type_configs SET name_th = N'พัฒนา' WHERE code = 'DEVELOPMENT' AND name_th IS NULL;
UPDATE pms.task_type_configs SET name_th = N'แก้ไขบั๊ก' WHERE code = 'BUG_FIX' AND name_th IS NULL;
UPDATE pms.task_type_configs SET name_th = N'ทดสอบ' WHERE code = 'TESTING' AND name_th IS NULL;
UPDATE pms.task_type_configs SET name_th = N'ออกแบบ' WHERE code = 'DESIGN' AND name_th IS NULL;
UPDATE pms.task_type_configs SET name_th = N'ติดตั้งระบบ' WHERE code = 'DEPLOYMENT' AND name_th IS NULL;
UPDATE pms.task_type_configs SET name_th = N'จัดทำเอกสาร' WHERE code = 'DOCUMENTATION' AND name_th IS NULL;

PRINT 'All name_th columns have been checked/added';
GO

-- Verify all tables
SELECT 'task_type_configs' as table_name, COUNT(*) as total, SUM(CASE WHEN name_th IS NOT NULL THEN 1 ELSE 0 END) as with_name_th FROM pms.task_type_configs
UNION ALL
SELECT 'deliverable_configs', COUNT(*), SUM(CASE WHEN name_th IS NOT NULL THEN 1 ELSE 0 END) FROM pms.deliverable_configs
UNION ALL
SELECT 'project_status_configs', COUNT(*), SUM(CASE WHEN name_th IS NOT NULL THEN 1 ELSE 0 END) FROM pms.project_status_configs
UNION ALL
SELECT 'milestone_configs', COUNT(*), SUM(CASE WHEN name_th IS NOT NULL THEN 1 ELSE 0 END) FROM pms.milestone_configs;
GO
