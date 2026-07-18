-- ============================================================
-- 89_default_milestone_weight_plan_md.sql
--
-- Effective "Plan MD" (planned man-days per milestone):
--   * An explicitly-entered planned_mandays wins.
--   * Otherwise (project without a complete Plan MD) Plan MD =
--       project budget (sold_mandays) x MDC weight%,
--     where MDC weight% = the milestone's weight_mdc when set, else the config
--     default (default_weight_mdc), else the standard fallback by milestone name:
--       Mapping 30 / System Test 30 / UAT 20 / Go-Live 10 / Close Go-Live 10 /
--       everything else incl. Marketing 0. (Same weight the MDC KPI scores against.)
--
-- Read-derived (never overwrites a manual plan; auto-updates with budget/weights).
-- Mirrors lib/actions/milestone-plan.ts — keep the two in sync.
-- ============================================================

-- 1) Single source of truth for effective Plan MD -----------
CREATE OR ALTER VIEW pms.vw_milestone_plan_md AS
SELECT
    pm.id         AS project_milestone_id,
    pm.project_id,
    CAST(
        CASE WHEN ISNULL(pm.planned_mandays, 0) > 0 THEN pm.planned_mandays
             ELSE ISNULL(p.sold_mandays, 0) *
                  COALESCE(NULLIF(pm.weight_mdc, 0), mc.default_weight_mdc,
                      CASE mc.name
                          WHEN 'Mapping Data'         THEN 30
                          WHEN 'System Test'          THEN 30
                          WHEN 'User Acceptance Test' THEN 20
                          WHEN 'Go-Live'              THEN 10
                          WHEN 'Close Go-Live'        THEN 10
                          ELSE 0
                      END) / 100.0
        END
    AS DECIMAL(10,2)) AS effective_planned_mandays
FROM pms.project_milestones pm
INNER JOIN pms.projects p ON p.id = pm.project_id
LEFT JOIN pms.milestone_configs mc ON mc.id = pm.milestone_config_id;
GO

-- 2) Man-day-control KPI score — use effective Plan MD -------
-- (based on scripts/72_add_kpi_exclude_flags.sql, planned_mandays -> effective)
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
        mc.name AS milestone_name,
        ISNULL(vp.effective_planned_mandays, 0) AS planned_mandays,
        ISNULL(ta.actual_mandays, 0) AS actual_mandays,
        COALESCE(pm.weight_mdc, mc.default_weight_mdc,
            CASE mc.name WHEN 'Mapping Data' THEN 30 WHEN 'System Test' THEN 30 WHEN 'User Acceptance Test' THEN 20 WHEN 'Go-Live' THEN 10 WHEN 'Close Go-Live' THEN 10 ELSE 0 END) AS milestone_weight,
        CASE
            WHEN ta.actual_mandays IS NULL OR ta.actual_mandays = 0 THEN 0
            WHEN ISNULL(vp.effective_planned_mandays, 0) = 0 THEN 0
            WHEN ta.actual_mandays <= vp.effective_planned_mandays THEN 100
            WHEN ta.actual_mandays <= vp.effective_planned_mandays * 1.1 THEN 90
            WHEN ta.actual_mandays <= vp.effective_planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent,
        CASE WHEN ISNULL(ta.actual_mandays, 0) > 0 THEN 1 ELSE 0 END AS has_actual
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN TimesheetActual ta ON ta.milestone_id = pm.id
    LEFT JOIN pms.vw_milestone_plan_md vp ON vp.project_milestone_id = pm.id
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

PRINT 'Effective Plan MD view + man-day-control KPI updated.';
GO
