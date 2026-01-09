-- ============================================
-- 1. DATA FIXES
-- ============================================

-- Fix Projects start_date
UPDATE pms.projects 
SET start_date = COALESCE(
    (SELECT MIN(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = pms.projects.id),
    created_at,
    GETDATE()
)
WHERE start_date IS NULL OR start_date < '2000-01-01';

-- Add columns if not exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.stories') AND name = 'start_date')
BEGIN
    ALTER TABLE pms.stories ADD start_date DATE NULL;
    ALTER TABLE pms.stories ADD due_date DATE NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'start_date')
BEGIN
    ALTER TABLE pms.tasks ADD start_date DATE NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'due_date')
BEGIN
    ALTER TABLE pms.tasks ADD due_date DATE NULL;
END
GO

-- ============================================
-- 2. SYSTEM CONFIGS
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.system_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        config_key NVARCHAR(100) NOT NULL UNIQUE,
        config_value NVARCHAR(500) NOT NULL,
        config_type NVARCHAR(50) NOT NULL DEFAULT 'string', 
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    INSERT INTO pms.system_configs (config_key, config_value, config_type, description) VALUES
    ('WORKING_HOURS_PER_DAY', '7', 'number', 'ชั่วโมงทำงานต่อวัน'),
    ('WORKING_DAYS_PER_WEEK', '5', 'number', 'วันทำงานต่อสัปดาห์'),
    ('WORKLOAD_WARNING_PERCENT', '70', 'number', 'เปอร์เซ็นต์เตือน Workload'),
    ('WORKLOAD_FULL_PERCENT', '100', 'number', 'เปอร์เซ็นต์ Workload เต็ม'),
    ('MANDAY_HOURS', '7', 'number', 'ชั่วโมงต่อ 1 Manday');
END
GO

-- ============================================
-- 3. GANTT STORED PROCEDURES
-- ============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_my_projects_gantt' AND schema_id = SCHEMA_ID('pms')) DROP PROCEDURE pms.sp_get_my_projects_gantt;
GO
CREATE PROCEDURE pms.sp_get_my_projects_gantt
    @employee_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. PROJECTS
    SELECT 
        'project_' + CAST(p.id AS NVARCHAR(50)) AS id,
        p.project_code + ': ' + p.name AS text,
        FORMAT(COALESCE((SELECT MIN(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.created_at, GETDATE()), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE((SELECT MAX(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.warranty_end_date, DATEADD(MONTH, 6, COALESCE(p.created_at, GETDATE()))), 'yyyy-MM-dd') AS end_date,
        DATEDIFF(DAY, COALESCE((SELECT MIN(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.created_at, GETDATE()), COALESCE((SELECT MAX(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.warranty_end_date, DATEADD(MONTH, 6, COALESCE(p.created_at, GETDATE())))) AS duration,
        COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) ELSE 0 END FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.is_active = 1), 0) AS progress,
        '0' AS parent, 'project' AS type, psc.color AS color, 1 AS [open], p.id AS project_id, p.project_code, c.name AS customer_name, psc.name AS status_name
    FROM pms.projects p
    LEFT JOIN pms.customers c ON p.customer_id = c.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    WHERE p.is_active = 1 AND (psc.code IS NULL OR psc.code NOT IN ('CLOSED', 'CANCELLED'))
      AND (p.project_manager_id = @employee_id OR EXISTS (SELECT 1 FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.assignee_id = @employee_id))
    
    UNION ALL
    
    -- 2. MILESTONES
    SELECT 
        'milestone_' + CAST(pm.id AS NVARCHAR(50)) AS id, '🚩 ' + mc.code + ': ' + mc.name AS text, FORMAT(pm.due_date, 'yyyy-MM-dd') AS start_date, FORMAT(pm.due_date, 'yyyy-MM-dd') AS end_date, 0 AS duration, CASE pm.status WHEN 'completed' THEN 1.0 WHEN 'in_progress' THEN 0.5 ELSE 0 END AS progress,
        'project_' + CAST(pm.project_id AS NVARCHAR(50)) AS parent, 'milestone' AS type, COALESCE(mc.color, '#6366f1') AS color, 1 AS [open], pm.project_id, NULL, NULL, pm.status
    FROM pms.project_milestones pm
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    INNER JOIN pms.projects p ON pm.project_id = p.id
    WHERE p.is_active = 1 AND (p.project_manager_id = @employee_id OR EXISTS (SELECT 1 FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.assignee_id = @employee_id))
    
    UNION ALL
    
    -- 3. STORIES
    SELECT 
        'story_' + CAST(s.id AS NVARCHAR(50)) AS id, '📋 ' + s.story_code + ': ' + s.title AS text,
        FORMAT(COALESCE(s.start_date, (SELECT MIN(t.start_date) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), DATEADD(DAY, -14, pm.due_date), GETDATE()), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE(s.due_date, (SELECT MAX(t.due_date) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), pm.due_date, DATEADD(DAY, 14, GETDATE())), 'yyyy-MM-dd') AS end_date,
        DATEDIFF(DAY, COALESCE(s.start_date, (SELECT MIN(t.start_date) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), GETDATE()), COALESCE(s.due_date, (SELECT MAX(t.due_date) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), DATEADD(DAY, 14, GETDATE()))) AS duration,
        COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) ELSE 0 END FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), 0) AS progress,
        CASE WHEN s.milestone_id IS NOT NULL THEN 'milestone_' + CAST(s.milestone_id AS NVARCHAR(50)) ELSE 'project_' + CAST(s.project_id AS NVARCHAR(50)) END AS parent, 'project' AS type,
        CASE s.status WHEN 'done' THEN '#22c55e' WHEN 'in_progress' THEN '#3b82f6' WHEN 'review' THEN '#8b5cf6' ELSE '#94a3b8' END AS color, 0 AS [open], s.project_id, NULL, NULL, s.status
    FROM pms.stories s
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
    WHERE s.is_active = 1 AND p.is_active = 1 AND (p.project_manager_id = @employee_id OR EXISTS (SELECT 1 FROM pms.tasks t WHERE t.story_id = s.id AND t.assignee_id = @employee_id))
    
    UNION ALL
    
    -- 4. TASKS
    SELECT 
        'task_' + CAST(t.id AS NVARCHAR(50)) AS id, COALESCE(ttc.icon, '🔧') + ' ' + t.task_code + ': ' + t.title AS text,
        FORMAT(COALESCE(t.start_date, DATEADD(DAY, -3, t.due_date), GETDATE()), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE(t.due_date, DATEADD(DAY, 3, GETDATE())), 'yyyy-MM-dd') AS end_date,
        DATEDIFF(DAY, COALESCE(t.start_date, DATEADD(DAY, -3, t.due_date), GETDATE()), COALESCE(t.due_date, DATEADD(DAY, 3, GETDATE()))) AS duration,
        CASE t.status WHEN 'done' THEN 1.0 WHEN 'review' THEN 0.8 WHEN 'in_progress' THEN 0.5 ELSE 0 END AS progress,
        'story_' + CAST(t.story_id AS NVARCHAR(50)) AS parent, 'task' AS type,
        CASE WHEN t.status = 'done' THEN '#22c55e' WHEN t.due_date < GETDATE() AND t.status != 'done' THEN '#ef4444' WHEN t.status = 'blocked' THEN '#ef4444' WHEN t.status = 'in_progress' THEN '#3b82f6' WHEN t.status = 'review' THEN '#8b5cf6' WHEN t.priority = 'critical' THEN '#ef4444' WHEN t.priority = 'high' THEN '#f97316' ELSE '#94a3b8' END AS color,
        0 AS [open], s.project_id, t.task_code, COALESCE(e.nickname, e.first_name_th), t.status
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
    LEFT JOIN pms.employees e ON t.assignee_id = e.id
    WHERE t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1 AND (p.project_manager_id = @employee_id OR t.assignee_id = @employee_id)
    
    ORDER BY start_date, id;
END;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_project_gantt' AND schema_id = SCHEMA_ID('pms')) DROP PROCEDURE pms.sp_get_project_gantt;
GO
CREATE PROCEDURE pms.sp_get_project_gantt
    @project_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 'project_' + CAST(p.id AS NVARCHAR(50)) AS id, p.project_code + ': ' + p.name AS text,
        FORMAT(COALESCE((SELECT MIN(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.created_at, GETDATE()), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE((SELECT MAX(pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id), p.warranty_end_date, DATEADD(MONTH, 6, GETDATE())), 'yyyy-MM-dd') AS end_date,
        0 AS duration, 0.0 AS progress, '0' AS parent, 'project' AS type, COALESCE(psc.color, '#3b82f6') AS color, 1 AS [open], p.id AS entity_id, 'project' AS entity_type
    FROM pms.projects p LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id WHERE p.id = @project_id
    UNION ALL
    SELECT 'milestone_' + CAST(pm.id AS NVARCHAR(50)) AS id, '🚩 ' + mc.code + ': ' + mc.name AS text, FORMAT(pm.due_date, 'yyyy-MM-dd') AS start_date, FORMAT(pm.due_date, 'yyyy-MM-dd') AS end_date, 0 AS duration, CASE pm.status WHEN 'completed' THEN 1.0 WHEN 'in_progress' THEN 0.5 ELSE 0 END AS progress, 'project_' + CAST(pm.project_id AS NVARCHAR(50)) AS parent, 'milestone' AS type, COALESCE(mc.color, '#6366f1') AS color, 1 AS [open], pm.id AS entity_id, 'milestone' AS entity_type
    FROM pms.project_milestones pm INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id WHERE pm.project_id = @project_id
    UNION ALL
    SELECT 'story_' + CAST(s.id AS NVARCHAR(50)) AS id, '📋 ' + s.story_code + ': ' + s.title AS text, FORMAT(COALESCE(s.start_date, DATEADD(DAY, -7, s.due_date), GETDATE()), 'yyyy-MM-dd') AS start_date, FORMAT(COALESCE(s.due_date, DATEADD(DAY, 7, GETDATE())), 'yyyy-MM-dd') AS end_date, DATEDIFF(DAY, COALESCE(s.start_date, GETDATE()), COALESCE(s.due_date, DATEADD(DAY, 7, GETDATE()))) AS duration, COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) ELSE 0 END FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1), 0) AS progress, CASE WHEN s.milestone_id IS NOT NULL THEN 'milestone_' + CAST(s.milestone_id AS NVARCHAR(50)) ELSE 'project_' + CAST(s.project_id AS NVARCHAR(50)) END AS parent, 'project' AS type, CASE s.status WHEN 'done' THEN '#22c55e' WHEN 'in_progress' THEN '#3b82f6' ELSE '#94a3b8' END AS color, 1 AS [open], s.id AS entity_id, 'story' AS entity_type
    FROM pms.stories s WHERE s.project_id = @project_id AND s.is_active = 1
    UNION ALL
    SELECT 'task_' + CAST(t.id AS NVARCHAR(50)) AS id, COALESCE(ttc.icon, '🔧') + ' ' + t.task_code + ': ' + t.title + CASE WHEN e.nickname IS NOT NULL THEN ' (' + e.nickname + ')' ELSE '' END AS text, FORMAT(COALESCE(t.start_date, DATEADD(DAY, -3, t.due_date), GETDATE()), 'yyyy-MM-dd') AS start_date, FORMAT(COALESCE(t.due_date, DATEADD(DAY, 3, GETDATE())), 'yyyy-MM-dd') AS end_date, DATEDIFF(DAY, COALESCE(t.start_date, GETDATE()), COALESCE(t.due_date, DATEADD(DAY, 3, GETDATE()))) AS duration, CASE t.status WHEN 'done' THEN 1.0 WHEN 'review' THEN 0.8 WHEN 'in_progress' THEN 0.5 ELSE 0 END AS progress, 'story_' + CAST(t.story_id AS NVARCHAR(50)) AS parent, 'task' AS type, CASE WHEN t.status = 'done' THEN '#22c55e' WHEN t.due_date < GETDATE() AND t.status != 'done' THEN '#ef4444' WHEN t.status = 'in_progress' THEN '#3b82f6' WHEN t.status = 'review' THEN '#8b5cf6' ELSE '#94a3b8' END AS color, 0 AS [open], t.id AS entity_id, 'task' AS entity_type
    FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code LEFT JOIN pms.employees e ON t.assignee_id = e.id WHERE s.project_id = @project_id AND t.is_active = 1 AND s.is_active = 1
    ORDER BY start_date, id;
END;
GO

-- ============================================
-- 4. WORKLOAD VIEWS
-- ============================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_employee_daily_workload' AND schema_id = SCHEMA_ID('pms')) DROP VIEW pms.vw_employee_daily_workload;
GO
CREATE VIEW pms.vw_employee_daily_workload AS
WITH DateRange AS (
    SELECT CAST(DATEADD(DAY, -30, GETDATE()) AS DATE) AS work_date
    UNION ALL
    SELECT DATEADD(DAY, 1, work_date) FROM DateRange WHERE work_date < DATEADD(DAY, 30, GETDATE())
),
TaskHoursPerDay AS (
    SELECT t.assignee_id, t.id AS task_id, t.estimated_hours, t.start_date, t.due_date,
        CASE WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 THEN t.estimated_hours / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0) ELSE t.estimated_hours END AS hours_per_day
    FROM pms.tasks t
    WHERE t.is_active = 1 AND t.status NOT IN ('done', 'cancelled') AND t.assignee_id IS NOT NULL AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL AND t.estimated_hours > 0
)
SELECT 
    e.id AS employee_id, e.employee_code, CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name, e.nickname,
    pos.code AS position_code, pos.name AS position_name, d.work_date, DATENAME(WEEKDAY, d.work_date) AS day_name,
    ISNULL(SUM(CASE WHEN d.work_date BETWEEN th.start_date AND th.due_date THEN th.hours_per_day ELSE 0 END), 0) AS assigned_hours,
    CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) AS capacity_hours,
    CASE WHEN CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) > 0
         THEN CAST(ISNULL(SUM(CASE WHEN d.work_date BETWEEN th.start_date AND th.due_date THEN th.hours_per_day ELSE 0 END), 0) / CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) * 100 AS INT)
         ELSE 0 END AS workload_percent,
    CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) - ISNULL(SUM(CASE WHEN d.work_date BETWEEN th.start_date AND th.due_date THEN th.hours_per_day ELSE 0 END), 0) AS available_hours
FROM pms.employees e
CROSS JOIN DateRange d
LEFT JOIN pms.positions pos ON e.position_id = pos.id
LEFT JOIN TaskHoursPerDay th ON th.assignee_id = e.id
WHERE e.is_active = 1 AND DATEPART(WEEKDAY, d.work_date) NOT IN (1, 7)
GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.nickname, pos.code, pos.name, d.work_date;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_employee_task_schedule' AND schema_id = SCHEMA_ID('pms')) DROP VIEW pms.vw_employee_task_schedule;
GO
CREATE VIEW pms.vw_employee_task_schedule AS
SELECT 
    t.assignee_id AS employee_id, t.id AS task_id, t.task_code, t.title AS task_title, t.task_type,
    ttc.name_th AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
    t.priority, t.status, t.start_date, t.due_date, t.estimated_hours,
    DATEDIFF(DAY, t.start_date, t.due_date) + 1 AS duration_days,
    CASE WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 THEN t.estimated_hours / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0) ELSE t.estimated_hours END AS hours_per_day,
    s.story_code, s.title AS story_title, p.project_code, p.name AS project_name
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
WHERE t.is_active = 1 AND t.status NOT IN ('done', 'cancelled') AND t.assignee_id IS NOT NULL AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL;
GO
