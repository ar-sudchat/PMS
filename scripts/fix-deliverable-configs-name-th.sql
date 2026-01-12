-- ============================================
-- Fix: Add name_th column to deliverable_configs if missing
-- Run this script to fix "Invalid column name 'name_th'" error
-- ============================================

USE PMSoftware;
GO

-- Add name_th column if it doesn't exist
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
    PRINT 'Column already exists: name_th';
GO

-- Optionally update name_th with Thai translations for existing records
UPDATE pms.deliverable_configs SET name_th = N'เอกสาร Mapping ข้อมูล' WHERE name = 'Data Mapping Document' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสารลงนามอนุมัติ' WHERE name = 'Sign-off Sheet' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสาร Test Cases' WHERE name = 'Test Cases Document' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'รายงานผลการทดสอบ' WHERE name = 'Test Results Report' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'รายงาน Bug' WHERE name = 'Bug Report' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสาร UAT Test Cases' WHERE name = 'UAT Test Cases' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสารลงนาม UAT' WHERE name = 'UAT Sign-off' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'คู่มือการใช้งาน' WHERE name = 'User Manual' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'Checklist Go-Live' WHERE name = 'Go-Live Checklist' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสารการ Deploy' WHERE name = 'Deployment Document' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสารลงนาม Go-Live' WHERE name = 'Go-Live Sign-off' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'รายงานปิดโครงการ' WHERE name = 'Project Closure Report' AND name_th IS NULL;
UPDATE pms.deliverable_configs SET name_th = N'เอกสารรับประกัน' WHERE name = 'Warranty Document' AND name_th IS NULL;

PRINT 'Updated Thai translations for deliverable configs';
GO

-- Verify
SELECT id, name, name_th, is_required, sort_order FROM pms.deliverable_configs ORDER BY sort_order;
GO
