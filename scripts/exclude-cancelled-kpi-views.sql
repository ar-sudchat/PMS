-- Update KPI Views to exclude 'cancelled' tasks and projects
-- Created: 2026-01-23

-- 1. Update Defect Ratio View
IF OBJECT_ID('pms.vw_kpi_defect_ratio', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_defect_ratio;
GO

CREATE VIEW pms.vw_kpi_defect_ratio AS
WITH TaskMandays AS (
    SELECT
        t.id AS task_id,
        s.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(te.entry_date) AS year,
        MONTH(te.entry_date) AS month,
        DATEPART(QUARTER, te.entry_date) AS quarter,
        t.task_type,
        CASE WHEN LOWER(t.task_type) IN ('bug', 'defect', 'hotfix') THEN 1 ELSE 0 END AS is_defect,
        SUM(te.hours) / 7.0 AS mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
      AND t.status <> 'cancelled' -- Exclude cancelled tasks
    GROUP BY t.id, s.project_id, p.project_code, p.name,
             YEAR(te.entry_date), MONTH(te.entry_date), DATEPART(QUARTER, te.entry_date),
             t.task_type
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CAST(ROUND(SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END), 2) AS DECIMAL(10,2)) AS defect_mandays,
    CAST(ROUND(SUM(mandays), 2) AS DECIMAL(10,2)) AS total_mandays,
    CASE
        WHEN SUM(mandays) > 0
        THEN CAST(ROUND(SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END) * 100.0 / SUM(mandays), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS defect_ratio_percent,
    15 AS target_percent,
    CASE
        WHEN SUM(mandays) > 0 AND
             (SUM(CASE WHEN is_defect = 1 THEN mandays ELSE 0 END) * 100.0 / SUM(mandays)) <= 15
        THEN 1 ELSE 0
    END AS is_pass
FROM TaskMandays
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 2. Update Post Go-live Rework View
IF OBJECT_ID('pms.vw_kpi_post_golive_rework', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_post_golive_rework;
GO

CREATE VIEW pms.vw_kpi_post_golive_rework AS
WITH ProjectGoLive AS (
    SELECT
        pm.project_id,
        pm.completed_date AS golive_date
    FROM pms.project_milestones pm
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE mc.name = 'Go-Live' AND pm.completed_date IS NOT NULL
),
ReworkData AS (
    SELECT
        s.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(te.entry_date) AS year,
        MONTH(te.entry_date) AS month,
        DATEPART(QUARTER, te.entry_date) AS quarter,
        SUM(CASE
            WHEN gl.golive_date IS NOT NULL
                AND te.entry_date > gl.golive_date
                AND LOWER(t.task_type) IN ('bug', 'defect', 'hotfix', 'rework')
            THEN te.hours / 7.0
            ELSE 0
        END) AS rework_mandays,
        SUM(te.hours / 7.0) AS total_mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN ProjectGoLive gl ON s.project_id = gl.project_id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
      AND t.status <> 'cancelled' -- Exclude cancelled tasks
    GROUP BY s.project_id, p.project_code, p.name,
             YEAR(te.entry_date), MONTH(te.entry_date), DATEPART(QUARTER, te.entry_date)
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CAST(ROUND(SUM(rework_mandays), 2) AS DECIMAL(10,2)) AS rework_mandays,
    CAST(ROUND(SUM(total_mandays), 2) AS DECIMAL(10,2)) AS total_mandays,
    CASE
        WHEN SUM(total_mandays) > 0
        THEN CAST(ROUND(SUM(rework_mandays) * 100.0 / SUM(total_mandays), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS rework_ratio_percent,
    8 AS target_percent,
    CASE
        WHEN SUM(total_mandays) > 0 AND
             (SUM(rework_mandays) * 100.0 / SUM(total_mandays)) <= 8
        THEN 1 ELSE 0
    END AS is_pass
FROM ReworkData
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 3. Update Issue Clearing View
IF OBJECT_ID('pms.vw_kpi_issue_clearing', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_issue_clearing;
GO

CREATE VIEW pms.vw_kpi_issue_clearing AS
SELECT
    YEAR(t.due_date) AS year,
    MONTH(t.due_date) AS month,
    DATEPART(QUARTER, t.due_date) AS quarter,
    t.assignee_id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    ISNULL(pos.name, 'Unknown') AS position,
    -- Total = only tasks that are done OR past due date (Exclude Cancelled)
    SUM(CASE
        WHEN t.status IN ('done', 'done_not_planned') THEN 1
        WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1 -- Exclude cancelled if overdue
        ELSE 0
    END) AS total_tasks,
    -- Cleared
    SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS cleared_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count,
    SUM(CASE WHEN t.status = 'done_not_planned' THEN 1 ELSE 0 END) AS done_not_planned_count,
    -- Pending (Exclude Cancelled)
    SUM(CASE
        WHEN t.status NOT IN ('done', 'done_not_planned', 'cancelled') AND t.due_date < GETDATE() THEN 1
        ELSE 0
    END) AS pending_count,
    -- Clearing percent
    CASE
        WHEN SUM(CASE
            WHEN t.status IN ('done', 'done_not_planned') THEN 1
            WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1
            ELSE 0
        END) > 0
        THEN CAST(ROUND(
            SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) * 100.0 /
            SUM(CASE
                WHEN t.status IN ('done', 'done_not_planned') THEN 1
                WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1
                ELSE 0
            END), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS clearing_percent,
    85 AS target_percent,
    -- Pass Check
    CASE
        WHEN SUM(CASE
            WHEN t.status IN ('done', 'done_not_planned') THEN 1
            WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1
            ELSE 0
        END) = 0 THEN 1
        WHEN (SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) * 100.0 /
              SUM(CASE
                  WHEN t.status IN ('done', 'done_not_planned') THEN 1
                  WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1
                  ELSE 0
              END)) >= 85 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
WHERE t.assignee_id IS NOT NULL
  AND t.due_date IS NOT NULL
  AND e.is_active = 1
  AND t.is_active = 1
  AND t.status <> 'cancelled' -- Filter at component level too
GROUP BY YEAR(t.due_date), MONTH(t.due_date), DATEPART(QUARTER, t.due_date),
         t.assignee_id, e.employee_code, e.first_name, e.last_name, pos.name
HAVING SUM(CASE
    WHEN t.status IN ('done', 'done_not_planned') THEN 1
    WHEN t.due_date < GETDATE() AND t.status <> 'cancelled' THEN 1
    ELSE 0
END) > 0;
GO
