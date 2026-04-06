-- =============================================
-- Script 70: Fix Manday Control View - exclude milestones with actual=0 from scoring
-- Description: Milestones with actual_mandays = 0 should not contribute
--              to the weighted KPI score (not yet worked on)
-- =============================================

IF OBJECT_ID('pms.vw_kpi_manday_control', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_manday_control;
GO

CREATE VIEW pms.vw_kpi_manday_control AS
WITH TimesheetActual AS (
    SELECT
        s.milestone_id,
        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
    FROM pms.timesheet_entries te
    INNER JOIN pms.tasks t ON te.task_id = t.id
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE te.is_active = 1
    GROUP BY s.milestone_id
),
MilestoneManday AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(pm.due_date) AS year,
        MONTH(pm.due_date) AS month,
        DATEPART(QUARTER, pm.due_date) AS quarter,
        mc.name AS milestone_name,
        pm.planned_mandays,
        ISNULL(ta.actual_mandays, 0) AS actual_mandays,
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
            WHEN ta.actual_mandays IS NULL OR ta.actual_mandays = 0 THEN 0
            WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 0
            WHEN ta.actual_mandays <= pm.planned_mandays THEN 100
            WHEN ta.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN ta.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent,
        -- Flag: has actual work (used to determine if milestone contributes to score)
        CASE WHEN ISNULL(ta.actual_mandays, 0) > 0 THEN 1 ELSE 0 END AS has_actual
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN TimesheetActual ta ON ta.milestone_id = pm.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1
      AND pm.due_date IS NOT NULL
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
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
    -- Only include milestones with actual > 0 in weighted score
    CASE
        WHEN SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END) > 0
        THEN CAST(ROUND(
            SUM(CASE WHEN has_actual = 1 THEN achievement_percent * ISNULL(milestone_weight, 0) ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS manday_control_percent,
    85 AS target_percent,
    CASE
        WHEN SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END) > 0 AND
             (SUM(CASE WHEN has_actual = 1 THEN achievement_percent * ISNULL(milestone_weight, 0) ELSE 0 END) * 1.0 /
              NULLIF(SUM(CASE WHEN has_actual = 1 THEN ISNULL(milestone_weight, 0) ELSE 0 END), 0)) >= 85
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneManday
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name
HAVING SUM(milestone_weight) > 0;
GO

PRINT 'Updated view: pms.vw_kpi_manday_control (exclude actual=0 milestones from weighted score)';
GO
