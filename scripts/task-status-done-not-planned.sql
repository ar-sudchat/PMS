-- Task Status Enhancement: Add "Done (Not as Planned)" for Issue Clearing KPI
-- ============================================
-- KPI Formula: Issue Clearing Rate = (Done / Total Completed) x 100
-- Target: >= 85%
-- ============================================

-- 1. Add columns for tracking "not as planned" reason
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'not_as_planned_reason'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD not_as_planned_reason NVARCHAR(100) NULL,
        not_as_planned_notes NVARCHAR(500) NULL;
    PRINT 'Added columns: not_as_planned_reason, not_as_planned_notes to tasks';
END
GO

-- 2. Update CHECK constraint to include new status (if exists)
-- First, find and drop existing constraint
DECLARE @constraintName NVARCHAR(128)
SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('pms.tasks')
AND definition LIKE '%status%'

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE pms.tasks DROP CONSTRAINT ' + @constraintName)
    PRINT 'Dropped old status constraint: ' + @constraintName
END

-- Add new constraint with additional status
ALTER TABLE pms.tasks
ADD CONSTRAINT CK_tasks_status
CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'done_not_planned', 'blocked', 'cancelled'))
PRINT 'Added new status constraint with done_not_planned';
GO

-- =============================================
-- 3. Create View for Issue Clearing KPI (Weekly)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_issue_clearing_weekly' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_issue_clearing_weekly;
GO

CREATE VIEW pms.vw_issue_clearing_weekly AS
SELECT
    t.assignee_id AS employee_id,
    e.employee_code,
    COALESCE(e.first_name_th, e.first_name) AS first_name,
    COALESCE(e.last_name_th, e.last_name) AS last_name,
    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS full_name,
    YEAR(t.completed_date) AS year,
    MONTH(t.completed_date) AS month,
    DATEPART(WEEK, t.completed_date) AS week,

    -- Task Counts
    COUNT(*) AS total_completed,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_as_planned,
    SUM(CASE WHEN t.status = 'done_not_planned' THEN 1 ELSE 0 END) AS done_not_as_planned,

    -- KPI Calculation
    CAST(
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND((SUM(CASE WHEN t.status = 'done' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 2)
            ELSE 100.00
        END
    AS DECIMAL(5,2)) AS clearing_rate,

    -- Pass/Fail (Target: >= 85%)
    CASE
        WHEN COUNT(*) = 0 THEN 1
        WHEN (SUM(CASE WHEN t.status = 'done' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100 >= 85 THEN 1
        ELSE 0
    END AS is_pass

FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
WHERE t.status IN ('done', 'done_not_planned')
AND t.completed_date IS NOT NULL
AND t.is_active = 1
AND e.is_active = 1
GROUP BY
    t.assignee_id,
    e.employee_code,
    COALESCE(e.first_name_th, e.first_name),
    COALESCE(e.last_name_th, e.last_name),
    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name),
    YEAR(t.completed_date),
    MONTH(t.completed_date),
    DATEPART(WEEK, t.completed_date);
GO

PRINT 'Created view: vw_issue_clearing_weekly';

-- =============================================
-- 4. Create View for Issue Clearing KPI (Monthly)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_issue_clearing_kpi_monthly' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_issue_clearing_kpi_monthly;
GO

CREATE VIEW pms.vw_issue_clearing_kpi_monthly AS
SELECT
    employee_id,
    employee_code,
    first_name,
    last_name,
    full_name,
    year,
    month,
    SUM(total_completed) AS total_completed,
    SUM(done_as_planned) AS done_as_planned,
    SUM(done_not_as_planned) AS done_not_as_planned,
    CAST(
        CASE
            WHEN SUM(total_completed) > 0
            THEN ROUND((SUM(done_as_planned) * 100.0 / SUM(total_completed)), 2)
            ELSE 100.00
        END
    AS DECIMAL(5,2)) AS clearing_rate,
    CASE
        WHEN SUM(total_completed) = 0 THEN 1
        WHEN (SUM(done_as_planned) * 100.0 / SUM(total_completed)) >= 85 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.vw_issue_clearing_weekly
GROUP BY
    employee_id, employee_code, first_name, last_name, full_name, year, month;
GO

PRINT 'Created view: vw_issue_clearing_kpi_monthly';

-- =============================================
-- 5. Create View for Issue Clearing KPI (Yearly)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_issue_clearing_kpi_yearly' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_issue_clearing_kpi_yearly;
GO

CREATE VIEW pms.vw_issue_clearing_kpi_yearly AS
SELECT
    employee_id,
    employee_code,
    first_name,
    last_name,
    full_name,
    year,
    SUM(total_completed) AS total_completed,
    SUM(done_as_planned) AS done_as_planned,
    SUM(done_not_as_planned) AS done_not_as_planned,
    CAST(
        CASE
            WHEN SUM(total_completed) > 0
            THEN ROUND((SUM(done_as_planned) * 100.0 / SUM(total_completed)), 2)
            ELSE 100.00
        END
    AS DECIMAL(5,2)) AS clearing_rate,
    CASE
        WHEN SUM(total_completed) = 0 THEN 1
        WHEN (SUM(done_as_planned) * 100.0 / SUM(total_completed)) >= 85 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.vw_issue_clearing_weekly
GROUP BY
    employee_id, employee_code, first_name, last_name, full_name, year;
GO

PRINT 'Created view: vw_issue_clearing_kpi_yearly';

-- =============================================
-- 6. Create View for Tasks Not as Planned (Detail)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_tasks_not_as_planned' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_tasks_not_as_planned;
GO

CREATE VIEW pms.vw_tasks_not_as_planned AS
SELECT
    t.id AS task_id,
    t.task_code,
    t.title AS task_name,
    t.status,
    t.completed_date,
    t.not_as_planned_reason,
    t.not_as_planned_notes,
    t.assignee_id AS employee_id,
    e.employee_code,
    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS employee_name,
    s.story_code,
    s.title AS story_name,
    p.project_code,
    p.name AS project_name,
    YEAR(t.completed_date) AS year,
    MONTH(t.completed_date) AS month
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.stories s ON t.story_id = s.id
LEFT JOIN pms.projects p ON s.project_id = p.id
WHERE t.status = 'done_not_planned'
AND t.completed_date IS NOT NULL
AND t.is_active = 1;
GO

PRINT 'Created view: vw_tasks_not_as_planned';

-- =============================================
-- Summary
-- =============================================
PRINT '============================================';
PRINT 'Task Status Enhancement Completed!';
PRINT '============================================';
PRINT 'Views created:';
PRINT '  - pms.vw_issue_clearing_weekly (by week)';
PRINT '  - pms.vw_issue_clearing_kpi_monthly (by month)';
PRINT '  - pms.vw_issue_clearing_kpi_yearly (by year)';
PRINT '  - pms.vw_tasks_not_as_planned (detail)';
PRINT '';
PRINT 'KPI Formula: (Done Tasks / Total Completed) x 100';
PRINT 'Target: >= 85%';
