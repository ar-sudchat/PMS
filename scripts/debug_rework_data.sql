-- Debug: Check why Rework MD = 0
-- Run each section separately in SSMS

-- 1. Check if the VIEW exists and has data
SELECT TOP 5 * FROM pms.vw_post_golive_rework ORDER BY project_code;
GO

-- 2. Check Go-Live projects and their dates
SELECT
    p.project_code,
    p.name,
    mc.code AS milestone_code,
    pm.completed_date AS golive_date
FROM pms.projects p
INNER JOIN pms.project_milestones pm ON pm.project_id = p.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE mc.is_go_live = 1 AND pm.completed_date IS NOT NULL
ORDER BY p.project_code;
GO

-- 3. Check timesheet entries for those projects (via stories)
SELECT TOP 20
    p.project_code,
    s.story_code,
    t.task_code,
    te.entry_date,
    te.hours
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE p.project_code IN ('1286','1297','1291','1285','1292')
ORDER BY te.entry_date DESC;
GO

-- 4. Check if stories link to project directly or via milestone
SELECT TOP 10
    s.id, s.story_code, s.project_id, s.milestone_id,
    p.project_code
FROM pms.stories s
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE p.project_code IN ('1286','1297','1291','1285','1292');
GO

-- 5. Check timesheet chain: te -> tasks -> stories (check NULLs)
SELECT
    'timesheet_entries' AS tbl, COUNT(*) AS total_rows FROM pms.timesheet_entries
UNION ALL
SELECT 'tasks', COUNT(*) FROM pms.tasks
UNION ALL
SELECT 'stories', COUNT(*) FROM pms.stories;
GO

-- 6. Check if tasks have story_id NULL
SELECT COUNT(*) AS tasks_without_story
FROM pms.tasks WHERE story_id IS NULL;
GO

-- 7. Direct check: any timesheet hours after Go-Live for project 1286?
SELECT
    te.entry_date, te.hours, t.task_code, s.story_code, s.project_id
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.project_id = (SELECT id FROM pms.projects WHERE project_code = '1286')
AND te.entry_date > '2026-02-04'
ORDER BY te.entry_date;
GO
