-- View for Stories List (with calculated fields)
CREATE OR ALTER VIEW pms.vw_project_stories_list AS
SELECT 
    s.id,
    s.story_code,
    s.title,
    s.description,
    s.project_id,
    s.milestone_id,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    mc.color AS milestone_color,
    s.status,
    s.priority,
    s.estimated_md,
    s.actual_md,
    s.due_date,
    s.sort_order,
    -- Task counts
    (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) AS task_count,
    (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1 AND t.status = 'done') AS completed_task_count,
    -- Progress
    CASE 
        WHEN (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) > 0
        THEN ROUND(
            CAST((SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1 AND t.status = 'done') AS FLOAT) 
            / (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) * 100, 0)
        ELSE 0
    END AS progress_percent,
    s.created_at,
    s.updated_at
FROM pms.stories s
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE s.is_active = 1;
GO

-- View for Tasks List (with details)
CREATE OR ALTER VIEW pms.vw_project_tasks_list AS
SELECT 
    t.id,
    t.task_code,
    t.title,
    t.description,
    t.story_id,
    s.story_code,
    s.title AS story_title,
    s.project_id,
    pm.id AS milestone_id,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    mc.color AS milestone_color,
    t.task_type,
    t.status,
    t.priority,
    t.assignee_id,
    e.first_name_th + ' ' + e.last_name_th AS assignee_name, -- Adjusted to use available columns if simple concatenation, assuming name structure
    e.nickname AS assignee_nickname,
    NULL as assignee_avatar, -- Added avatar if exists
    t.estimated_hours,
    t.actual_hours,
    t.start_date,
    t.due_date,
    t.sort_order,
    -- Overdue check
    CASE 
        WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'cancelled') 
        THEN 1 ELSE 0 
    END AS is_overdue,
    t.created_at,
    t.updated_at
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.employees e ON t.assignee_id = e.id
WHERE t.is_active = 1 AND s.is_active = 1;
GO
