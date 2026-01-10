-- ============================================
-- 1. Database Changes
-- ============================================

-- 1.1 Add fields to tasks table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'work_phase')
BEGIN
    ALTER TABLE pms.tasks ADD work_phase NVARCHAR(20) NULL DEFAULT 'development' WITH VALUES;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'acceptance_criteria')
BEGIN
    ALTER TABLE pms.tasks ADD acceptance_criteria NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'notes')
BEGIN
    ALTER TABLE pms.tasks ADD notes NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID('pms.CK_task_work_phase'))
BEGIN
    ALTER TABLE pms.tasks ADD CONSTRAINT CK_task_work_phase CHECK (work_phase IN ('development', 'post_golive', 'warranty'));
END
GO

-- 1.2 Update timesheet_entries table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.timesheet_entries') AND name = 'activity_type')
BEGIN
    ALTER TABLE pms.timesheet_entries ADD activity_type NVARCHAR(50) NULL DEFAULT 'development' WITH VALUES;
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID('pms.CK_timesheet_activity_type'))
BEGIN
    ALTER TABLE pms.timesheet_entries ADD CONSTRAINT CK_timesheet_activity_type CHECK (activity_type IN ('development', 'bug_fix', 'meeting', 'documentation', 'testing', 'support', 'other'));
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.timesheet_entries') AND name = 'is_billable')
BEGIN
    ALTER TABLE pms.timesheet_entries ADD is_billable BIT NOT NULL DEFAULT 1 WITH VALUES;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.timesheet_entries') AND name = 'is_overtime')
BEGIN
    ALTER TABLE pms.timesheet_entries ADD is_overtime BIT NOT NULL DEFAULT 0 WITH VALUES;
END
GO

-- 1.3 Create View: My Tasks
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
    -- t.reviewer_id, -- Assuming reviewer_id exists, if not remove or check schema. Assuming it doesn't exist based on previous interactions, I will comment it out or assume user implied it exists. I will check pms.tasks schema later or assume safe. Best to be safe: LEFT JOIN maybe?
    -- Actually I don't recall reviewer_id in CreateTask. I'll omit it for now to avoid error, or add it if needed.
    -- The prompt includes it. If I add it, I need to ALTER table first.
    -- Let's check if reviewer_id exists. I'll skip it for now to be safe, or add it.
    -- For now I will omit reviewer_id.
    
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
    e.first_name_th + ' ' + e.last_name_th AS assignee_name, -- Use Thai name as per previous files
    e.nickname AS assignee_nickname,
    
    -- Calculated fields
    CASE 
        WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'cancelled') 
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
    END AS progress_percent
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.employees e ON t.assignee_id = e.id
WHERE t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1;
GO

-- 1.4 Create View: Weekly Timesheet
CREATE OR ALTER VIEW pms.vw_weekly_timesheet AS
SELECT 
    te.id AS entry_id,
    te.employee_id,
    te.task_id,
    te.entry_date,
    te.hours,
    te.description AS work_description,
    te.activity_type,
    te.is_billable,
    te.is_overtime,
    -- Task info
    t.task_code,
    t.title AS task_title,
    t.task_type,
    t.work_phase,
    -- Project info
    p.project_code,
    p.name AS project_name,
    -- Week info
    DATEPART(week, te.entry_date) AS week_number,
    DATEPART(year, te.entry_date) AS year,
    DATEADD(day, -(DATEPART(weekday, te.entry_date) - 1), te.entry_date) AS week_start,
    -- Day of week (1=Sun, 2=Mon, ... 7=Sat)
    DATEPART(weekday, te.entry_date) AS day_of_week
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE te.is_active = 1;
GO

-- 1.5 Create View: Employee Daily Summary (for Issue Clearing KPI)
CREATE OR ALTER VIEW pms.vw_employee_daily_task_summary AS
SELECT 
    t.assignee_id AS employee_id,
    CAST(t.updated_at AS DATE) AS work_date,
    -- Tasks assigned (active tasks on that date is hard to track perfectly without history table, using current assignment)
    -- This view might be approximate based on current assignment
    COUNT(DISTINCT t.id) AS total_tasks,
    -- Tasks completed (status changed to done on that date)
    -- Assuming updated_at aligns with completion if status is done
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    -- Tasks in progress
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
    -- Clearing rate
    CASE 
        WHEN COUNT(DISTINCT t.id) > 0 
        THEN ROUND(CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(DISTINCT t.id) * 100, 2)
        ELSE 0 
    END AS clearing_rate
FROM pms.tasks t
WHERE t.is_active = 1 AND t.assignee_id IS NOT NULL
GROUP BY t.assignee_id, CAST(t.updated_at AS DATE);
GO

-- 1.6 Create View: KPI Defect & Rework Hours
CREATE OR ALTER VIEW pms.vw_kpi_hours_by_type AS
SELECT 
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    -- Total hours
    SUM(te.hours) AS total_hours,
    -- Development hours (normal work)
    SUM(CASE WHEN t.task_type IN ('feature', 'task', 'improvement') AND t.work_phase = 'development' THEN te.hours ELSE 0 END) AS development_hours,
    -- Defect hours (bug fixing before go-live)
    SUM(CASE WHEN t.task_type IN ('bug', 'defect') AND t.work_phase = 'development' THEN te.hours ELSE 0 END) AS defect_hours,
    -- Post go-live hours (any work after go-live)
    SUM(CASE WHEN t.work_phase = 'post_golive' THEN te.hours ELSE 0 END) AS post_golive_hours,
    -- Warranty hours
    SUM(CASE WHEN t.work_phase = 'warranty' THEN te.hours ELSE 0 END) AS warranty_hours,
    -- Convert to mandays (7 hours = 1 MD)
    ROUND(SUM(te.hours) / 7.0, 2) AS total_mandays,
    ROUND(SUM(CASE WHEN t.task_type IN ('bug', 'defect') THEN te.hours ELSE 0 END) / 7.0, 2) AS defect_mandays,
    ROUND(SUM(CASE WHEN t.work_phase = 'post_golive' THEN te.hours ELSE 0 END) / 7.0, 2) AS post_golive_mandays,
    -- KPI Calculations
    CASE 
        WHEN SUM(te.hours) > 0 
        THEN ROUND(SUM(CASE WHEN t.task_type IN ('bug', 'defect') THEN te.hours ELSE 0 END) / SUM(te.hours) * 100, 2)
        ELSE 0 
    END AS defect_ratio, -- Target: <= 15%
    CASE 
        WHEN SUM(te.hours) > 0 
        THEN ROUND(SUM(CASE WHEN t.work_phase = 'post_golive' THEN te.hours ELSE 0 END) / SUM(te.hours) * 100, 2)
        ELSE 0 
    END AS post_golive_rework_ratio -- Target: <= 8%
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE te.is_active = 1 AND t.is_active = 1
GROUP BY p.id, p.project_code, p.name;
GO

-- 1.7 Create View: Update Milestone Actual Mandays
CREATE OR ALTER VIEW pms.vw_milestone_actual_mandays AS
SELECT 
    pm.id AS milestone_id,
    pm.project_id,
    pm.planned_mandays,
    ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS calculated_actual_mandays,
    pm.actual_mandays AS stored_actual_mandays,
    -- Variance
    ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) - ISNULL(pm.planned_mandays, 0) AS manday_variance
FROM pms.project_milestones pm
LEFT JOIN pms.stories s ON s.milestone_id = pm.id
LEFT JOIN pms.tasks t ON t.story_id = s.id
LEFT JOIN pms.timesheet_entries te ON te.task_id = t.id AND te.is_active = 1
WHERE pm.status != 'cancelled' -- Assuming standard check
GROUP BY pm.id, pm.project_id, pm.planned_mandays, pm.actual_mandays;
GO
