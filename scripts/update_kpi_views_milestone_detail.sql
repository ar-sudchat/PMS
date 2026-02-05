-- =============================================
-- Script: Update KPI Views to Show Milestone Detail
-- Date: 2026-02-03
-- Description:
--   1. Show data per milestone (not aggregated by project)
--   2. Include milestone_name in output
--   3. Filter: current_milestone_id IS NOT NULL, exclude cancelled
--   4. Read weights from database (not hardcoded)
-- =============================================

-- 1. Update Time to Delivery View (Milestone Detail)
-- TTD includes: Mapping Data, System Test, UAT, Go-Live (NOT Close Go-Live)
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
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
    mc.sort_order AS milestone_order,
    pm.planned_mandays,
    pm.actual_mandays,
    pm.due_date AS planned_date,
    pm.completed_date AS actual_date,
    pm.status AS milestone_status,
    -- Weight for Time to Delivery (from database, not hardcoded)
    COALESCE(pm.weight_ttd, mc.default_weight_ttd, 0) AS milestone_weight,
    -- Achievement percent calculation (use completed_date IS NOT NULL instead of status)
    CASE
        WHEN pm.completed_date IS NOT NULL AND pm.completed_date <= pm.due_date THEN 100
        WHEN pm.completed_date IS NOT NULL AND pm.completed_date > pm.due_date THEN
            CASE
                WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
                WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
                ELSE 40
            END
        WHEN pm.status = 'in_progress' THEN 50
        ELSE 0
    END AS time_to_delivery_percent,
    80 AS target_percent,
    -- Pass/Fail based on achievement (use completed_date IS NOT NULL)
    CASE
        WHEN pm.completed_date IS NOT NULL AND pm.completed_date <= pm.due_date THEN 1
        WHEN pm.completed_date IS NOT NULL AND DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.project_milestones pm
INNER JOIN pms.projects p ON pm.project_id = p.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
WHERE COALESCE(pm.weight_ttd, mc.default_weight_ttd, 0) > 0  -- Only milestones with TTD weight
  AND mc.code NOT IN ('CLOSE_GOLIVE', 'CLOSE-GOLIVE', 'CLG')  -- Exclude Close Go-Live from TTD
  AND p.is_active = 1
  AND p.current_milestone_id IS NOT NULL
  AND ISNULL(psc.code, '') <> 'CANCELLED';
GO

-- 2. Update Man-day Control View (Milestone Detail)
IF OBJECT_ID('pms.vw_kpi_manday_control', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_manday_control;
GO

CREATE VIEW pms.vw_kpi_manday_control AS
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
    mc.sort_order AS milestone_order,
    pm.planned_mandays,
    pm.actual_mandays,
    pm.status AS milestone_status,
    -- Weight for Man-day Control (from database, not hardcoded)
    COALESCE(pm.weight_mdc, mc.default_weight_mdc, 0) AS milestone_weight,
    -- Achievement percent
    CASE
        WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 0
        WHEN pm.actual_mandays IS NULL THEN 100
        WHEN pm.actual_mandays <= pm.planned_mandays THEN 100
        WHEN pm.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
        WHEN pm.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
        ELSE 50
    END AS manday_control_percent,
    85 AS target_percent,
    -- Pass/Fail
    CASE
        WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 1
        WHEN pm.actual_mandays IS NULL THEN 1
        WHEN pm.actual_mandays <= pm.planned_mandays * 1.15 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.project_milestones pm
INNER JOIN pms.projects p ON pm.project_id = p.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
WHERE COALESCE(pm.weight_mdc, mc.default_weight_mdc, 0) > 0  -- Only milestones with MDC weight
  AND p.is_active = 1
  AND p.current_milestone_id IS NOT NULL
  AND ISNULL(psc.code, '') <> 'CANCELLED';
GO

PRINT 'KPI Views updated with milestone detail (weights from database)'
GO
