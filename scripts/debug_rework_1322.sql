-- Debug Rework MD for Project 1322 (Issue Payment Voucher [995])
-- Run each section in SSMS

DECLARE @proj_id UNIQUEIDENTIFIER = (SELECT id FROM pms.projects WHERE project_code = '1322')
DECLARE @golive_date DATE = (
    SELECT TOP 1 pm.completed_date
    FROM pms.project_milestones pm
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE mc.is_go_live = 1 AND pm.project_id = @proj_id AND pm.completed_date IS NOT NULL
)

-- 1. Milestones for project 1322
SELECT 'MILESTONES' AS section, pm.id AS pm_id, mc.code, mc.name, pm.planned_mandays, pm.actual_mandays AS stored_actual
FROM pms.project_milestones pm
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE pm.project_id = @proj_id

-- 2. Timesheet total by milestone (same as Man-day Monitor)
SELECT 'TIMESHEET_BY_MILESTONE' AS section, mc.name AS milestone_name,
    CAST(ROUND(SUM(ts.hours) / 7.0, 2) AS DECIMAL(10,2)) AS act_md,
    SUM(ts.hours) AS total_hours, COUNT(*) AS entries
FROM pms.timesheet_entries ts
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.project_milestones pm2 ON s.milestone_id = pm2.id
INNER JOIN pms.milestone_configs mc ON pm2.milestone_config_id = mc.id
WHERE pm2.project_id = @proj_id
GROUP BY mc.name

-- 3. Timesheet AFTER Go-Live by milestone (= rework breakdown)
SELECT 'REWORK_BY_MILESTONE' AS section, mc.name AS milestone_name,
    CAST(ROUND(SUM(ts.hours) / 7.0, 2) AS DECIMAL(10,2)) AS rework_md,
    SUM(ts.hours) AS total_hours, COUNT(*) AS entries,
    @golive_date AS golive_date
FROM pms.timesheet_entries ts
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.project_milestones pm2 ON s.milestone_id = pm2.id
INNER JOIN pms.milestone_configs mc ON pm2.milestone_config_id = mc.id
WHERE pm2.project_id = @proj_id
AND ts.entry_date > @golive_date
GROUP BY mc.name

-- 4. Compare: using s.project_id vs pm2.project_id
SELECT 'VIA_STORY_PROJECT_ID' AS method,
    CAST(ROUND(SUM(ts.hours) / 7.0, 2) AS DECIMAL(10,2)) AS rework_md
FROM pms.timesheet_entries ts
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE s.project_id = @proj_id
AND ts.entry_date > @golive_date
UNION ALL
SELECT 'VIA_MILESTONE_PROJECT_ID',
    CAST(ROUND(SUM(ts.hours) / 7.0, 2) AS DECIMAL(10,2))
FROM pms.timesheet_entries ts
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.project_milestones pm2 ON s.milestone_id = pm2.id
WHERE pm2.project_id = @proj_id
AND ts.entry_date > @golive_date

-- 5. Stories with MISMATCHED project_id vs milestone project_id
SELECT 'MISMATCHED_STORIES' AS section,
    s.story_code, s.project_id AS story_project_id,
    pm2.project_id AS milestone_project_id,
    p1.project_code AS story_project_code,
    p2.project_code AS milestone_project_code
FROM pms.stories s
INNER JOIN pms.project_milestones pm2 ON s.milestone_id = pm2.id
LEFT JOIN pms.projects p1 ON s.project_id = p1.id
LEFT JOIN pms.projects p2 ON pm2.project_id = p2.id
WHERE s.project_id = @proj_id
AND s.project_id <> pm2.project_id
