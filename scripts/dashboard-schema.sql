-- Dashboard Views Schema
-- ============================================

-- View: My Tasks Summary
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_my_tasks_summary' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_my_tasks_summary;
GO

CREATE VIEW pms.vw_dashboard_my_tasks_summary AS
SELECT 
    t.assignee_id,
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
    SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) AS review_tasks,
    SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
    SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks,
    SUM(CASE WHEN t.due_date = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS due_today_tasks,
    SUM(CASE WHEN t.due_date BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS due_this_week_tasks,
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours
FROM pms.tasks t
WHERE t.is_active = 1 AND t.status NOT IN ('done', 'cancelled')
GROUP BY t.assignee_id;
GO

-- View: Overdue Tasks
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_overdue_tasks' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_overdue_tasks;
GO

CREATE VIEW pms.vw_dashboard_overdue_tasks AS
SELECT 
    t.id,
    t.assignee_id,
    t.task_code,
    t.title AS task_title,
    t.task_type,
    ttc.name_th AS task_type_name,
    ttc.color AS task_type_color,
    ttc.icon AS task_type_icon,
    t.priority,
    t.due_date,
    DATEDIFF(DAY, t.due_date, CAST(GETDATE() AS DATE)) AS days_overdue,
    s.story_code,
    s.title AS story_title,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    p.project_code,
    p.name AS project_name
FROM pms.tasks t
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
INNER JOIN pms.stories s ON t.story_id = s.id
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE t.is_active = 1 
  AND t.due_date < CAST(GETDATE() AS DATE)
  AND t.status NOT IN ('done', 'cancelled');
GO

-- View: Today's Tasks
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_today_tasks' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_today_tasks;
GO

CREATE VIEW pms.vw_dashboard_today_tasks AS
SELECT 
    t.id,
    t.assignee_id,
    t.task_code,
    t.title AS task_title,
    t.task_type,
    ttc.name_th AS task_type_name,
    ttc.color AS task_type_color,
    ttc.icon AS task_type_icon,
    t.priority,
    t.status,
    t.estimated_hours,
    s.story_code,
    p.project_code,
    p.name AS project_name
FROM pms.tasks t
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE t.is_active = 1 
  AND t.due_date = CAST(GETDATE() AS DATE);
GO

-- View: My Timesheet Today (Summary)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_my_timesheet_today' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_my_timesheet_today;
GO

CREATE VIEW pms.vw_dashboard_my_timesheet_today AS
SELECT 
    te.employee_id,
    SUM(te.hours) AS total_hours_today,
    COUNT(*) AS entry_count,
    8 AS target_hours,
    CAST(ROUND((SUM(te.hours) / 8.0) * 100, 0) AS INT) AS completion_percent
FROM pms.timesheet_entries te
WHERE te.is_active = 1 
  AND te.entry_date = CAST(GETDATE() AS DATE)
GROUP BY te.employee_id;
GO

-- View: My Timesheet Today (Detail)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_my_timesheet_today_detail' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_my_timesheet_today_detail;
GO

CREATE VIEW pms.vw_dashboard_my_timesheet_today_detail AS
SELECT 
    te.id,
    te.employee_id,
    te.hours,
    te.description,
    t.task_code,
    t.title AS task_title,
    t.task_type,
    ttc.color AS task_type_color,
    p.project_code,
    p.name AS project_name
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE te.is_active = 1 
  AND te.entry_date = CAST(GETDATE() AS DATE);
GO

-- View: My Projects
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_my_projects' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_my_projects;
GO

CREATE VIEW pms.vw_dashboard_my_projects AS
SELECT DISTINCT
    p.id AS project_id,
    p.project_code,
    p.[name] AS project_name,
    c.[name] AS customer_name,
    psc.[name] AS status_name,
    psc.color AS status_color,
    p.[end_date],
    p.[owner_id],
    
    -- Stories
    (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.[is_active] = 1) AS total_stories,
    (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.[is_active] = 1 AND s.[status] = 'done') AS completed_stories,
    
    -- Tasks  
    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.[is_active] = 1) AS total_tasks,
    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.[is_active] = 1 AND t.[status] = 'done') AS completed_tasks,
    
    -- Mandays
    p.sold_mandays,
    p.[actual_mandays] AS used_mandays,
    
    -- Health status
    CASE 
        WHEN p.[end_date] < CAST(GETDATE() AS DATE) THEN 'overdue'
        WHEN p.[end_date] < DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN 'at_risk'
        ELSE 'on_track'
    END AS health_status,
    
    -- Team member (for filtering)
    t.assignee_id AS team_member_id
    
FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.project_status_configs psc ON p.[status] = psc.code
LEFT JOIN pms.stories s ON s.project_id = p.id AND s.[is_active] = 1
LEFT JOIN pms.tasks t ON t.story_id = s.id AND t.[is_active] = 1
WHERE p.[is_active] = 1;
GO

-- View: Upcoming Milestones
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_upcoming_milestones' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_upcoming_milestones;
GO

CREATE VIEW pms.vw_dashboard_upcoming_milestones AS
SELECT 
    pm.id,
    mc.code AS milestone_code,
    mc.[name] AS milestone_name,
    mc.color AS milestone_color,
    pm.due_date,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), pm.due_date) AS days_until_due,
    pm.[status] AS milestone_status,
    p.id AS project_id,
    p.project_code,
    p.[name] AS project_name,
    p.[owner_id],
    c.[name] AS customer_name,
    
    -- Stories in milestone
    (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.[is_active] = 1) AS total_stories,
    (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.[is_active] = 1 AND s.[status] = 'done') AS completed_stories
    
FROM pms.project_milestones pm
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
WHERE pm.[is_active] = 1
  AND pm.due_date >= CAST(GETDATE() AS DATE)
  AND pm.[status] != 'completed';
GO

-- View: Team Overview (Manager/Admin only)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_team_overview' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_team_overview;
GO

CREATE VIEW pms.vw_dashboard_team_overview AS
SELECT 
    (SELECT COUNT(*) FROM pms.employees WHERE [is_active] = 1) AS total_employees,
    (SELECT COUNT(*) FROM pms.projects WHERE [is_active] = 1 AND [status] NOT IN ('closed', 'cancelled')) AS active_projects,
    (SELECT COUNT(*) FROM pms.projects WHERE [is_active] = 1 AND [end_date] < DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) AND [status] NOT IN ('closed', 'cancelled')) AS at_risk_projects,
    (SELECT COUNT(*) FROM pms.timesheet_entries WHERE [status] = 'submitted') AS pending_timesheet_approvals,
    (SELECT COUNT(*) FROM pms.tasks WHERE [is_active] = 1 AND [status] NOT IN ('done', 'cancelled')) AS total_active_tasks,
    (SELECT COUNT(*) FROM pms.tasks WHERE [is_active] = 1 AND [status] = 'done') AS completed_tasks_total,
    (SELECT COUNT(*) FROM pms.tasks WHERE [is_active] = 1 AND due_date < CAST(GETDATE() AS DATE) AND [status] NOT IN ('done', 'cancelled')) AS overdue_tasks_total;
GO

-- View: Team Workload (Manager/Admin only)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_team_workload' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_team_workload;
GO

CREATE VIEW pms.vw_dashboard_team_workload AS
SELECT 
    e.id AS employee_id,
    e.employee_code,
    CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
    e.nickname,
    pos.code AS position_code,
    pos.name AS position_name,
    d.name AS department_name,
    
    -- Task counts
    (SELECT COUNT(*) FROM pms.tasks t WHERE t.assignee_id = e.id AND t.is_active = 1 AND t.status NOT IN ('done', 'cancelled')) AS assigned_tasks,
    
    -- Hours this week
    (SELECT ISNULL(SUM(t.estimated_hours), 0) 
     FROM pms.tasks t 
     WHERE t.assignee_id = e.id 
       AND t.is_active = 1 
       AND t.due_date BETWEEN DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) 
       AND DATEADD(DAY, 7 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
    ) AS estimated_hours_this_week,
    
    (SELECT ISNULL(SUM(te.hours), 0)
     FROM pms.timesheet_entries te
     WHERE te.employee_id = e.id
       AND te.is_active = 1
       AND te.entry_date BETWEEN DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
       AND DATEADD(DAY, 7 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
    ) AS logged_hours_this_week,
    
    40 AS weekly_capacity_hours,
    
    -- Workload percentage
    CAST(
        (SELECT ISNULL(SUM(t.estimated_hours), 0) 
         FROM pms.tasks t 
         WHERE t.assignee_id = e.id 
           AND t.is_active = 1 
           AND t.due_date BETWEEN DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) 
           AND DATEADD(DAY, 7 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
        ) / 40.0 * 100
    AS INT) AS workload_percent,
    
    -- Overdue tasks
    (SELECT COUNT(*) 
     FROM pms.tasks t 
     WHERE t.assignee_id = e.id 
       AND t.is_active = 1 
       AND t.due_date < CAST(GETDATE() AS DATE) 
       AND t.status NOT IN ('done', 'cancelled')
    ) AS overdue_tasks
    
FROM pms.employees e
LEFT JOIN pms.positions pos ON e.position_id = pos.id
LEFT JOIN pms.departments d ON e.department_id = d.id
WHERE e.is_active = 1;
GO

-- View: KPI Summary (Manager/Admin only)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_kpi_summary' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_kpi_summary;
GO

CREATE VIEW pms.vw_dashboard_kpi_summary AS
SELECT 
    -- Defect Ratio (Bug hours / Total hours) - last 3 months
    CAST(
        CASE 
            WHEN (SELECT SUM(CASE WHEN ttc.code IN ('dev', 'bug', 'rework', 'test', 'doc') THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE())) > 0
            THEN (SELECT SUM(CASE WHEN ttc.code = 'bug' THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE())) * 100.0 /
                 (SELECT SUM(CASE WHEN ttc.code IN ('dev', 'bug', 'rework', 'test', 'doc') THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE()))
            ELSE 0
        END AS DECIMAL(5, 2)
    ) AS avg_defect_ratio,
    10.0 AS defect_ratio_target,
    
    -- Rework Ratio (Rework hours / Total hours) - last 3 months
    CAST(
        CASE 
            WHEN (SELECT SUM(CASE WHEN ttc.code IN ('dev', 'bug', 'rework', 'test', 'doc') THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE())) > 0
            THEN (SELECT SUM(CASE WHEN ttc.code = 'rework' THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE())) * 100.0 /
                 (SELECT SUM(CASE WHEN ttc.code IN ('dev', 'bug', 'rework', 'test', 'doc') THEN te.hours ELSE 0 END)
                  FROM pms.timesheet_entries te
                  LEFT JOIN pms.tasks t ON te.task_id = t.id
                  LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                  WHERE te.is_active = 1 AND te.entry_date >= DATEADD(MONTH, -3, GETDATE()))
            ELSE 0
        END AS DECIMAL(5, 2)
    ) AS avg_rework_ratio,
    8.0 AS rework_ratio_target,
    
    -- On-Time Delivery (based on closed projects)
    CAST(
        CASE 
            WHEN (SELECT COUNT(*) FROM pms.projects WHERE [is_active] = 1 AND [status] = 'closed') > 0
            THEN (SELECT COUNT(*) 
                  FROM pms.projects 
                  WHERE [is_active] = 1 
                    AND [status] = 'closed' 
                    AND [end_date] <= [contract_end_date]) * 100.0 /
                 (SELECT COUNT(*) FROM pms.projects WHERE [is_active] = 1 AND [status] = 'closed')
            ELSE 100
        END AS DECIMAL(5, 2)
    ) AS on_time_delivery_percent,
    90.0 AS on_time_delivery_target,
    
    -- Milestones On-Track
    CAST(
        CASE 
            WHEN (SELECT COUNT(*) FROM pms.project_milestones WHERE [is_active] = 1) > 0
            THEN (SELECT COUNT(*) 
                  FROM pms.project_milestones 
                  WHERE [is_active] = 1 
                    AND [status] IN ('on_track', 'completed')) * 100.0 /
                 (SELECT COUNT(*) FROM pms.project_milestones WHERE [is_active] = 1)
            ELSE 100
        END AS DECIMAL(5, 2)
    ) AS milestones_on_track_percent,
    80.0 AS milestones_on_track_target;
GO

PRINT 'Dashboard views created successfully';
