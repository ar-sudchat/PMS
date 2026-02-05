-- =============================================
-- Script: Update KPI Views for Current Milestone Filter
-- Date: 2026-02-03
-- Description:
--   1. Add filter for projects with current_milestone_id IS NOT NULL
--   2. This ensures only projects that have reached a milestone are included
--   3. Exclude cancelled projects (status_id -> project_status_configs.code = 'CANCELLED')
--   4. Affects: Time to Delivery, Man-day Control KPI calculations
-- =============================================

-- 1. Update Time to Delivery View
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneProgress AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        p.customer_id,
        p.project_manager_id,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.planned_mandays,
        pm.status,
        pm.due_date AS planned_date,
        pm.completed_date AS actual_date,
        -- Weight for Time to Delivery
        CASE mc.name
            WHEN 'Mapping Data' THEN 35
            WHEN 'System Test' THEN 20
            WHEN 'User Acceptance Test' THEN 30
            WHEN 'Go-Live' THEN 15
            ELSE 0
        END AS milestone_weight,
        -- Achievement percent calculation
        CASE
            WHEN pm.status = 'completed' AND pm.completed_date <= pm.due_date THEN 100
            WHEN pm.status = 'completed' AND pm.completed_date > pm.due_date THEN
                CASE
                    WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
                    WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
                    ELSE 40
                END
            WHEN pm.status = 'in_progress' THEN 50
            ELSE 0
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    WHERE mc.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live')
      AND p.is_active = 1
      AND p.current_milestone_id IS NOT NULL  -- Only projects with current milestone
      AND ISNULL(psc.code, '') <> 'CANCELLED' -- Exclude cancelled projects
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    customer_id,
    project_manager_id,
    CASE
        WHEN SUM(planned_mandays * 100) > 0
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
            NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0 AND
             (SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
              NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0)) >= 80
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneProgress
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name, customer_id, project_manager_id;
GO

-- 2. Update Man-day Control View
IF OBJECT_ID('pms.vw_kpi_manday_control', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_manday_control;
GO

CREATE VIEW pms.vw_kpi_manday_control AS
WITH MilestoneManday AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        p.customer_id,
        p.project_manager_id,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.planned_mandays,
        pm.actual_mandays,
        -- Weight for Man-day Control
        CASE mc.name
            WHEN 'Mapping Data' THEN 30
            WHEN 'System Test' THEN 30
            WHEN 'User Acceptance Test' THEN 20
            WHEN 'Go-Live' THEN 10
            WHEN 'Close Go-Live' THEN 10
            ELSE 0
        END AS milestone_weight,
        -- Achievement percent
        CASE
            WHEN pm.actual_mandays IS NULL THEN 0
            WHEN pm.actual_mandays <= pm.planned_mandays THEN 100
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    WHERE mc.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live', 'Close Go-Live')
      AND p.is_active = 1
      AND p.current_milestone_id IS NOT NULL  -- Only projects with current milestone
      AND ISNULL(psc.code, '') <> 'CANCELLED' -- Exclude cancelled projects
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    customer_id,
    project_manager_id,
    SUM(planned_mandays) AS total_planned_mandays,
    SUM(actual_mandays) AS total_actual_mandays,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
            NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS manday_control_percent,
    85 AS target_percent,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0 AND
             (SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
              NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0)) >= 85
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneManday
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name, customer_id, project_manager_id;
GO

PRINT 'KPI Views updated with current_milestone_id filter and cancelled project exclusion'
GO
