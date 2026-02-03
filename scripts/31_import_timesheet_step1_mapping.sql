-- ============================================
-- STEP 1: สร้าง Mapping โครงการ
-- รันไฟล์นี้ก่อนเพื่อเพิ่ม mapping
-- ============================================

-- เพิ่ม mapping ทุกโครงการที่ project_code = legacy_code
INSERT INTO pms.project_code_mapping (legacy_code, project_id, notes)
SELECT project_code, id, 'Auto: project_code = legacy_code'
FROM pms.projects
WHERE is_active = 1
  AND NOT EXISTS (SELECT 1 FROM pms.project_code_mapping WHERE legacy_code = project_code);

PRINT 'Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' project mappings';
GO

-- แสดงผลลัพธ์
SELECT
    legacy_code,
    project_code,
    project_name,
    first_milestone_name
FROM pms.vw_import_timesheet_targets
ORDER BY legacy_code;
GO
