-- =====================================================
-- Script: Recalculate Milestone actual_mandays
-- Excludes cancelled/inactive tasks from calculation
-- =====================================================

-- Step 1: ดูค่าปัจจุบัน vs ค่าใหม่ (ก่อน update)
SELECT
    p.project_code,
    mc.name AS milestone_name,
    pm.actual_mandays AS current_value,
    ISNULL(calc.total_mandays, 0) AS new_value,
    pm.actual_mandays - ISNULL(calc.total_mandays, 0) AS difference
FROM pms.project_milestones pm
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN (
    SELECT
        s.milestone_id,
        ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS total_mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    LEFT JOIN pms.timesheet_entries te ON te.task_id = t.id AND te.is_active = 1
    WHERE t.is_active = 1
        AND t.status != 'cancelled'
        AND s.is_active = 1
        AND s.milestone_id IS NOT NULL
    GROUP BY s.milestone_id
) calc ON pm.id = calc.milestone_id
WHERE pm.actual_mandays != ISNULL(calc.total_mandays, 0)
ORDER BY p.project_code, mc.sort_order;

-- =====================================================
-- Step 2: ดู Tasks ที่ถูกยกเลิกแต่มี timesheet
-- =====================================================
SELECT
    p.project_code,
    t.task_code,
    t.title AS task_title,
    t.status AS task_status,
    t.is_active AS task_is_active,
    SUM(te.hours) AS total_hours,
    ROUND(SUM(te.hours) / 7.0, 2) AS total_mandays
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
INNER JOIN pms.timesheet_entries te ON te.task_id = t.id AND te.is_active = 1
WHERE t.status = 'cancelled' OR t.is_active = 0
GROUP BY p.project_code, t.task_code, t.title, t.status, t.is_active
ORDER BY p.project_code, t.task_code;

-- =====================================================
-- Step 3: UPDATE - Recalculate all milestones
-- =====================================================
/*
UPDATE pm
SET pm.actual_mandays = ISNULL(calc.total_mandays, 0),
    pm.updated_at = GETDATE()
FROM pms.project_milestones pm
LEFT JOIN (
    SELECT
        s.milestone_id,
        ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS total_mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    LEFT JOIN pms.timesheet_entries te ON te.task_id = t.id AND te.is_active = 1
    WHERE t.is_active = 1
        AND t.status != 'cancelled'
        AND s.is_active = 1
        AND s.milestone_id IS NOT NULL
    GROUP BY s.milestone_id
) calc ON pm.id = calc.milestone_id;

-- Verify after update
SELECT COUNT(*) AS total_milestones_updated FROM pms.project_milestones;
*/
