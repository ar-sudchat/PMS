-- ============================================
-- ตรวจสอบผลลัพธ์การ Import
-- ============================================

-- 1. ดู mapping ทั้งหมด
SELECT
    legacy_code AS [รหัสเก่า],
    project_code AS [รหัสใหม่],
    project_name AS [ชื่อโครงการ],
    first_milestone_name AS [Milestone แรก],
    import_story_id AS [Story ID]
FROM pms.vw_import_timesheet_targets
ORDER BY legacy_code;
GO

-- 2. ดู Story ที่สร้างสำหรับ import
SELECT
    s.story_code,
    s.title,
    p.project_code,
    COUNT(t.id) AS task_count
FROM pms.stories s
INNER JOIN pms.projects p ON p.id = s.project_id
LEFT JOIN pms.tasks t ON t.story_id = s.id
WHERE s.title = N'Upload timesheet จากระบบเดิม'
GROUP BY s.story_code, s.title, p.project_code
ORDER BY p.project_code;
GO

-- 3. ดู Timesheet entries ที่ import มา
SELECT TOP 100
    e.employee_code,
    te.entry_date,
    te.hours,
    te.description
FROM pms.timesheet_entries te
INNER JOIN pms.employees e ON e.id = te.employee_id
WHERE te.description LIKE '%MoveonDB%'
ORDER BY te.entry_date DESC;
GO

-- 4. สรุปยอดรวม
SELECT
    'Projects Mapped' AS [Item],
    CAST(COUNT(*) AS VARCHAR) AS [Count]
FROM pms.project_code_mapping
UNION ALL
SELECT
    'Stories Created',
    CAST(COUNT(*) AS VARCHAR)
FROM pms.stories
WHERE title = N'Upload timesheet จากระบบเดิม'
UNION ALL
SELECT
    'Timesheet Entries Imported',
    CAST(COUNT(*) AS VARCHAR)
FROM pms.timesheet_entries
WHERE description LIKE '%MoveonDB%'
UNION ALL
SELECT
    'Total Hours Imported',
    CAST(CAST(SUM(hours) AS DECIMAL(10,2)) AS VARCHAR)
FROM pms.timesheet_entries
WHERE description LIKE '%MoveonDB%';
GO
