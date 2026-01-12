-- ============================================
-- Update vw_my_tasks to include checklist summary
-- Date: 2026-01-12
-- Description: Add checklist_total, checklist_completed columns
-- ============================================

-- Update View: My Tasks (with checklist info)
CREATE OR ALTER VIEW pms.vw_my_tasks AS
SELECT
    t.id AS task_id,
    t.task_code,
    t.title AS task_title,
    t.description AS task_description,
    t.acceptance_criteria,
    t.notes,
    t.task_type,
    t.work_phase,
    t.priority,
    t.status,
    t.estimated_hours,
    t.actual_hours,
    t.start_date,
    t.due_date,
    t.assignee_id,
    t.created_at,
    -- Story info
    s.id AS story_id,
    s.story_code,
    s.title AS story_title,
    -- Project info
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    -- Milestone info
    pm.id AS milestone_id,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    mc.color AS milestone_color,
    pm.due_date AS milestone_due_date,

    -- Assignee info
    e.employee_code AS assignee_code,
    e.first_name_th + ' ' + e.last_name_th AS assignee_name,
    e.nickname AS assignee_nickname,

    -- Calculated fields
    CASE
        WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled')
        THEN 1 ELSE 0
    END AS is_overdue,
    DATEDIFF(day, CAST(GETDATE() AS DATE), t.due_date) AS days_until_due,
    -- Hours remaining
    ISNULL(t.estimated_hours, 0) - ISNULL(t.actual_hours, 0) AS remaining_hours,
    -- Progress percentage
    CASE
        WHEN ISNULL(t.estimated_hours, 0) > 0
        THEN ROUND((ISNULL(t.actual_hours, 0) / t.estimated_hours) * 100, 0)
        ELSE 0
    END AS progress_percent,

    -- Checklist summary (subquery for aggregation)
    ISNULL(cl.checklist_total, 0) AS checklist_total,
    ISNULL(cl.checklist_completed, 0) AS checklist_completed

FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.employees e ON t.assignee_id = e.id
-- Checklist aggregation
LEFT JOIN (
    SELECT
        task_id,
        COUNT(*) AS checklist_total,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS checklist_completed
    FROM pms.task_checklist_items
    GROUP BY task_id
) cl ON t.id = cl.task_id
WHERE t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1;
GO

-- Verify the view
SELECT TOP 5 task_code, task_title, checklist_total, checklist_completed
FROM pms.vw_my_tasks
WHERE checklist_total > 0;
GO
