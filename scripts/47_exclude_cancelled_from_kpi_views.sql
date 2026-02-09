-- =============================================
-- Exclude Cancelled Projects from KPI Views
-- Created: 2026-02-08
-- Purpose: Filter out cancelled projects from KPI record views
-- =============================================

-- 1. Time to Delivery View
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneDelivery AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.due_date,
        pm.completed_date,
        -- Weight for Time to Delivery
        COALESCE(pm.weight_ttd, mc.default_weight_ttd,
            CASE mc.name
                WHEN 'Mapping Data' THEN 30
                WHEN 'System Test' THEN 30
                WHEN 'User Acceptance Test' THEN 20
                WHEN 'Go-Live' THEN 10
                WHEN 'Close Go-Live' THEN 10
                ELSE 0
            END) AS milestone_weight,
        -- Achievement percent (on-time delivery)
        CASE
            WHEN pm.completed_date IS NULL THEN 0
            WHEN pm.completed_date <= pm.due_date THEN 100
            WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
            WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
            ELSE 40
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    WHERE p.is_active = 1
      AND pm.due_date IS NOT NULL
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CASE
        WHEN SUM(milestone_weight) > 0
        THEN CAST(ROUND(SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE
        WHEN SUM(milestone_weight) > 0 AND
             (SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight)) >= 80
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneDelivery
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

PRINT 'Updated view: pms.vw_kpi_time_to_delivery (excludes cancelled projects)';
GO

-- 2. Man-day Control View
IF OBJECT_ID('pms.vw_kpi_manday_control', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_manday_control;
GO

CREATE VIEW pms.vw_kpi_manday_control AS
WITH MilestoneManday AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.planned_mandays,
        pm.actual_mandays,
        -- Weight for Man-day Control
        COALESCE(pm.weight_mdc, mc.default_weight_mdc,
            CASE mc.name
                WHEN 'Mapping Data' THEN 30
                WHEN 'System Test' THEN 30
                WHEN 'User Acceptance Test' THEN 20
                WHEN 'Go-Live' THEN 10
                WHEN 'Close Go-Live' THEN 10
                ELSE 0
            END) AS milestone_weight,
        -- Achievement percent (manday control)
        CASE
            WHEN pm.actual_mandays IS NULL THEN 0
            WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 0
            WHEN pm.actual_mandays <= pm.planned_mandays THEN 100
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    WHERE p.is_active = 1
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    SUM(ISNULL(planned_mandays, 0)) AS total_planned_mandays,
    SUM(ISNULL(actual_mandays, 0)) AS total_actual_mandays,
    CASE
        WHEN SUM(ISNULL(milestone_weight, 0)) > 0
        THEN CAST(ROUND(
            SUM(achievement_percent * ISNULL(milestone_weight, 0)) * 1.0 /
            NULLIF(SUM(ISNULL(milestone_weight, 0)), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS manday_control_percent,
    85 AS target_percent,
    CASE
        WHEN SUM(ISNULL(milestone_weight, 0)) > 0 AND
             (SUM(achievement_percent * ISNULL(milestone_weight, 0)) * 1.0 /
              NULLIF(SUM(ISNULL(milestone_weight, 0)), 0)) >= 85
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneManday
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

PRINT 'Updated view: pms.vw_kpi_manday_control (excludes cancelled projects)';
GO

-- 3. Defect Ratio View
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
        -- Check if task type is defect-related
        CASE WHEN LOWER(t.task_type) IN ('bug', 'defect', 'hotfix', 'bug_fix', 'rework') THEN 1 ELSE 0 END AS is_defect,
        SUM(te.hours) / 7.0 AS mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
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

PRINT 'Updated view: pms.vw_kpi_defect_ratio (excludes cancelled projects)';
GO

PRINT 'All KPI views updated to exclude cancelled projects!';
GO
