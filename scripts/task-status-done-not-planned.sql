-- Task Status Enhancement: Add "Done (Not as Planned)" for Issue Clearing KPI
-- ============================================

-- 1. Add column for tracking "not as planned" reason
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'not_as_planned_reason'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD not_as_planned_reason NVARCHAR(500) NULL;
    PRINT 'Added column: not_as_planned_reason to tasks';
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

-- 3. Create view for Issue Clearing KPI calculation
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_issue_clearing_kpi' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_issue_clearing_kpi;
GO

CREATE VIEW pms.vw_issue_clearing_kpi AS
SELECT
    t.assignee_id AS employee_id,
    e.first_name_th + ' ' + e.last_name_th AS employee_name,
    YEAR(t.completed_date) AS year,
    MONTH(t.completed_date) AS month,

    -- Counts
    COUNT(*) AS total_completed,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_as_planned,
    SUM(CASE WHEN t.status = 'done_not_planned' THEN 1 ELSE 0 END) AS done_not_as_planned,

    -- KPI Calculation
    CAST(
        CASE
            WHEN COUNT(*) > 0
            THEN (SUM(CASE WHEN t.status = 'done' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100
            ELSE 100
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
GROUP BY
    t.assignee_id,
    e.first_name_th + ' ' + e.last_name_th,
    YEAR(t.completed_date),
    MONTH(t.completed_date);
GO

PRINT 'Created view: vw_issue_clearing_kpi';

-- 4. Create view for tasks completed not as planned (detail)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_tasks_not_as_planned' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_tasks_not_as_planned;
GO

CREATE VIEW pms.vw_tasks_not_as_planned AS
SELECT
    t.id,
    t.task_code,
    t.title,
    t.assignee_id,
    e.first_name_th + ' ' + e.last_name_th AS assignee_name,
    t.completed_date,
    t.not_as_planned_reason,
    s.story_code,
    s.title AS story_title,
    p.project_code,
    p.name AS project_name,
    YEAR(t.completed_date) AS year,
    MONTH(t.completed_date) AS month
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.stories s ON t.story_id = s.id
LEFT JOIN pms.projects p ON s.project_id = p.id
WHERE t.status = 'done_not_planned'
AND t.is_active = 1;
GO

PRINT 'Created view: vw_tasks_not_as_planned';
PRINT 'Task status enhancement completed!';
