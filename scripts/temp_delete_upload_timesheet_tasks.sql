-- =====================================================
-- Script: Delete Tasks from "Upload timesheet จากระบบเดิม" Story
-- =====================================================

-- Step 1: ตรวจสอบ Story ที่ชื่อ "Upload timesheet จากระบบเดิม"
SELECT
    s.id AS story_id,
    s.title AS story_title,
    p.project_code,
    p.name AS project_name,
    COUNT(t.id) AS task_count
FROM pms.stories s
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.tasks t ON t.story_id = s.id
WHERE s.title LIKE N'%Upload timesheet%'
GROUP BY s.id, s.title, p.project_code, p.name;

-- Step 2: ดู Tasks ทั้งหมดที่จะถูกลบ
SELECT
    t.id AS task_id,
    t.title AS task_title,
    t.assignee_id,
    e.first_name_th + ' ' + e.last_name_th AS assignee_name,
    s.title AS story_title,
    p.project_code
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.employees e ON t.assignee_id = e.id
WHERE s.title LIKE N'%Upload timesheet%'
ORDER BY p.project_code, t.title;

-- Step 3: ดู Timesheet Entries ที่จะได้รับผลกระทบ (ถ้ามี)
SELECT
    te.id AS entry_id,
    te.entry_date,
    te.hours,
    t.title AS task_title,
    s.title AS story_title
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.title LIKE N'%Upload timesheet%';

-- =====================================================
-- ⚠️ คำสั่งลบ (รันหลังจากตรวจสอบแล้ว)
-- =====================================================

/*
-- ลบ Timesheet Entries ก่อน (ถ้ามี)
DELETE te
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.title LIKE N'%Upload timesheet%';

-- ลบ Tasks
DELETE t
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.title LIKE N'%Upload timesheet%';

-- ตรวจสอบหลังลบ
SELECT COUNT(*) AS remaining_tasks
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.title LIKE N'%Upload timesheet%';
*/
