-- Fix KPI views to use actual_mandays from timesheet_entries
-- instead of the stored pm.actual_mandays column in project_milestones
-- This ensures views match the Man-day Monitor calculation (SUM(hours)/7.0)

-- ============================================
-- 1. Fix vw_kpi_manday_control
-- ============================================
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
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
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
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN TimesheetActual ta ON ta.milestone_id = pm.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1
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

PRINT 'Updated view: pms.vw_kpi_manday_control (now uses timesheet actual_mandays)';
GO

-- ============================================
-- 2. Fix vw_post_golive_rework
-- ============================================
IF OBJECT_ID('pms.vw_post_golive_rework', 'V') IS NOT NULL
    DROP VIEW pms.vw_post_golive_rework;
GO

CREATE VIEW pms.vw_post_golive_rework AS
WITH ProjectMilestones AS (
    SELECT
        p.id AS project_id,
        p.project_code,
        p.name AS project_name,
        p.project_owner_id,
        ISNULL(p.sold_mandays, 0) AS sold_mandays,

        -- Go-Live milestone info (pick earliest completed one if multiple)
        (SELECT TOP 1 pm_gl.completed_date
         FROM pms.project_milestones pm_gl
         INNER JOIN pms.milestone_configs mc_gl ON pm_gl.milestone_config_id = mc_gl.id
         WHERE mc_gl.is_go_live = 1
           AND pm_gl.project_id = p.id
           AND pm_gl.completed_date IS NOT NULL
         ORDER BY pm_gl.completed_date
        ) AS golive_completed_date,

        -- Close Go-Live milestone info (pick latest completed one if multiple)
        (SELECT TOP 1 pm_cl.completed_date
         FROM pms.project_milestones pm_cl
         INNER JOIN pms.milestone_configs mc_cl ON pm_cl.milestone_config_id = mc_cl.id
         WHERE mc_cl.is_post_go_live = 1
           AND pm_cl.project_id = p.id
           AND pm_cl.completed_date IS NOT NULL
         ORDER BY pm_cl.completed_date DESC
        ) AS close_golive_completed_date

    FROM pms.projects p
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1
      AND (pt.code IS NULL OR pt.code <> 'MKT')
      AND EXISTS (
          SELECT 1 FROM pms.project_milestones pm_check
          INNER JOIN pms.milestone_configs mc_check ON pm_check.milestone_config_id = mc_check.id
          WHERE mc_check.is_go_live = 1
            AND pm_check.project_id = p.id
            AND pm_check.completed_date IS NOT NULL
      )
)
SELECT
    pm.project_id,
    pm.project_code,
    pm.project_name,
    pm.project_owner_id,
    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS owner_name,
    YEAR(pm.golive_completed_date) AS project_year,
    pm.golive_completed_date,
    pm.close_golive_completed_date,

    -- Budget
    pm.sold_mandays,

    -- Total Manday = Budget (sold_mandays from project)
    pm.sold_mandays AS total_manday,

    -- Rework Manday (timesheet hours AFTER Go-Live date)
    -- Uses same chain as Man-day Monitor: timesheet → tasks → stories → project_milestones
    ISNULL((
        SELECT CAST(ROUND(SUM(ts.hours) / 7.0, 2) AS DECIMAL(10,2))
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.project_milestones pm2 ON s.milestone_id = pm2.id
        WHERE pm2.project_id = pm.project_id
        AND ts.is_active = 1
        AND ts.entry_date > pm.golive_completed_date
    ), 0) AS rework_manday,

    -- Project Status
    CASE
        WHEN pm.close_golive_completed_date IS NOT NULL THEN 'Closed'
        ELSE 'Post Go-Live'
    END AS project_status

FROM ProjectMilestones pm
LEFT JOIN pms.employees e ON pm.project_owner_id = e.id
GO

PRINT 'Updated view: pms.vw_post_golive_rework (added is_active filters + sold_mandays column)';
GO
