-- =============================================
-- Script 72: Add KPI Exclude Flags to Projects
-- Description: Allow excluding projects from specific KPI calculations
--              (TTD, MDC, Docs On-time)
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'kpi_exclude_ttd'
)
BEGIN
    ALTER TABLE pms.projects ADD kpi_exclude_ttd BIT NOT NULL DEFAULT 0;
    PRINT 'Added column kpi_exclude_ttd to pms.projects'
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'kpi_exclude_mdc'
)
BEGIN
    ALTER TABLE pms.projects ADD kpi_exclude_mdc BIT NOT NULL DEFAULT 0;
    PRINT 'Added column kpi_exclude_mdc to pms.projects'
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'kpi_exclude_docs'
)
BEGIN
    ALTER TABLE pms.projects ADD kpi_exclude_docs BIT NOT NULL DEFAULT 0;
    PRINT 'Added column kpi_exclude_docs to pms.projects'
END
GO

-- Update TTD view to exclude flagged projects
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneDelivery AS (
    SELECT
        pm.project_id, p.project_code, p.name AS project_name,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name, pm.due_date, pm.completed_date, pm.kpi_ttd_manual_fail,
        CASE
            WHEN ISNULL(pm.kpi_ttd_manual_fail, 0) = 1
            THEN COALESCE(pm.weight_ttd, mc.default_weight_ttd, CASE mc.name WHEN 'Mapping Data' THEN 30 WHEN 'System Test' THEN 30 WHEN 'User Acceptance Test' THEN 20 WHEN 'Go-Live' THEN 10 WHEN 'Close Go-Live' THEN 10 ELSE 0 END)
            WHEN pm.completed_date IS NOT NULL
            THEN COALESCE(pm.weight_ttd, mc.default_weight_ttd, CASE mc.name WHEN 'Mapping Data' THEN 30 WHEN 'System Test' THEN 30 WHEN 'User Acceptance Test' THEN 20 WHEN 'Go-Live' THEN 10 WHEN 'Close Go-Live' THEN 10 ELSE 0 END)
            ELSE 0
        END AS milestone_weight,
        CASE
            WHEN ISNULL(pm.kpi_ttd_manual_fail, 0) = 1 THEN 0
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
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1 AND pm.due_date IS NOT NULL
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
      AND ISNULL(p.kpi_exclude_ttd, 0) = 0
)
SELECT year, month, quarter, project_id, project_code, project_name,
    CASE WHEN SUM(milestone_weight) > 0
        THEN CAST(ROUND(SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight), 2) AS DECIMAL(5,2))
        ELSE 0 END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE WHEN SUM(milestone_weight) > 0 AND (SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight)) >= 80 THEN 1 ELSE 0 END AS is_pass
FROM MilestoneDelivery WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name
HAVING SUM(milestone_weight) > 0;
GO

-- Update MDC view to exclude flagged projects
IF OBJECT_ID('pms.vw_kpi_manday_control', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_manday_control;
GO

CREATE VIEW pms.vw_kpi_manday_control AS
WITH TimesheetActual AS (
    SELECT s.milestone_id, CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
    FROM pms.timesheet_entries te
    INNER JOIN pms.tasks t ON te.task_id = t.id
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE te.is_active = 1 GROUP BY s.milestone_id
),
MilestoneManday AS (
    SELECT pm.project_id, p.project_code, p.name AS project_name,
        YEAR(pm.due_date) AS year, MONTH(pm.due_date) AS month, DATEPART(QUARTER, pm.due_date) AS quarter,
        mc.name AS milestone_name, pm.planned_mandays, ISNULL(ta.actual_mandays, 0) AS actual_mandays,
        COALESCE(pm.weight_mdc, mc.default_weight_mdc,
            CASE mc.name WHEN 'Mapping Data' THEN 30 WHEN 'System Test' THEN 30 WHEN 'User Acceptance Test' THEN 20 WHEN 'Go-Live' THEN 10 WHEN 'Close Go-Live' THEN 10 ELSE 0 END) AS milestone_weight,
        CASE
            WHEN ta.actual_mandays IS NULL OR ta.actual_mandays = 0 THEN 0
            WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 0
            WHEN ta.actual_mandays <= pm.planned_mandays THEN 100
            WHEN ta.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN ta.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent,
        CASE WHEN ISNULL(ta.actual_mandays, 0) > 0 THEN 1 ELSE 0 END AS has_actual
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN TimesheetActual ta ON ta.milestone_id = pm.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1 AND pm.due_date IS NOT NULL
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
      AND ISNULL(p.kpi_exclude_mdc, 0) = 0
)
SELECT year, month, quarter, project_id, project_code, project_name,
    SUM(ISNULL(planned_mandays, 0)) AS total_planned_mandays,
    SUM(ISNULL(actual_mandays, 0)) AS total_actual_mandays,
    CASE WHEN SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END) > 0
        THEN CAST(ROUND(SUM(CASE WHEN has_actual = 1 THEN achievement_percent * ISNULL(milestone_weight, 0) ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END), 0), 2) AS DECIMAL(5,2))
        ELSE 0 END AS manday_control_percent,
    85 AS target_percent,
    CASE WHEN SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END) > 0 AND
         (SUM(CASE WHEN has_actual = 1 THEN achievement_percent * ISNULL(milestone_weight, 0) ELSE 0 END) * 1.0 /
          NULLIF(SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END), 0)) >= 85
        THEN 1 ELSE 0 END AS is_pass
FROM MilestoneManday WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name
HAVING SUM(milestone_weight) > 0;
GO

PRINT 'Added KPI exclude flags and updated views';
GO
