-- =============================================
-- Exclude MKT Project Type from KPI Views
-- Created: 2026-02-08
-- Purpose: Filter out MKT type projects from KPI record views
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

PRINT 'Updated view: pms.vw_kpi_time_to_delivery (excludes MKT projects)';
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

PRINT 'Updated view: pms.vw_kpi_manday_control (excludes MKT projects)';
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
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
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

PRINT 'Updated view: pms.vw_kpi_defect_ratio (excludes MKT projects)';
GO

-- 4. Post Go-Live Rework View
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

        -- Go-Live milestone info
        pm_golive.completed_date AS golive_completed_date,

        -- Close Go-Live milestone info
        pm_close.completed_date AS close_golive_completed_date

    FROM pms.projects p
    -- Join Go-Live milestone
    INNER JOIN pms.project_milestones pm_golive ON pm_golive.project_id = p.id
    INNER JOIN pms.milestone_configs mc_golive ON pm_golive.milestone_config_id = mc_golive.id
        AND mc_golive.is_go_live = 1
    -- Join Close Go-Live milestone (optional - might not be completed yet)
    LEFT JOIN pms.project_milestones pm_close ON pm_close.project_id = p.id
    LEFT JOIN pms.milestone_configs mc_close ON pm_close.milestone_config_id = mc_close.id
        AND mc_close.is_post_go_live = 1
    -- Exclude cancelled projects
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    -- Exclude MKT projects
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE pm_golive.completed_date IS NOT NULL
      AND p.is_active = 1
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
)
SELECT
    pm.project_id,
    pm.project_code,
    pm.project_name,
    pm.project_owner_id,
    e.first_name + ' ' + e.last_name AS owner_name,
    YEAR(pm.golive_completed_date) AS project_year,
    pm.golive_completed_date,
    pm.close_golive_completed_date,

    -- Total Manday (work from Go-Live onwards)
    ISNULL((
        SELECT SUM(ts.hours) / 8.0
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = pm.project_id
        AND ts.entry_date >= pm.golive_completed_date
    ), 0) AS total_manday,

    -- Rework Manday (work after Go-Live until Close Go-Live)
    ISNULL((
        SELECT SUM(ts.hours) / 8.0
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = pm.project_id
        AND ts.entry_date > pm.golive_completed_date
        AND (pm.close_golive_completed_date IS NULL
             OR ts.entry_date <= pm.close_golive_completed_date)
    ), 0) AS rework_manday,

    -- Project Status
    CASE
        WHEN pm.close_golive_completed_date IS NOT NULL THEN 'Closed'
        ELSE 'Post Go-Live'
    END AS project_status

FROM ProjectMilestones pm
LEFT JOIN pms.employees e ON pm.project_owner_id = e.id;
GO

PRINT 'Updated view: pms.vw_post_golive_rework (excludes MKT projects)';
GO

-- 5. Issue Clearing Daily View
IF OBJECT_ID('pms.vw_issue_clearing_daily', 'V') IS NOT NULL
    DROP VIEW pms.vw_issue_clearing_daily;
GO

CREATE VIEW pms.vw_issue_clearing_daily AS
SELECT
    ts.employee_id,
    e.first_name + ' ' + e.last_name AS employee_name,
    e.employee_code,
    ts.entry_date AS work_date,
    YEAR(ts.entry_date) AS work_year,
    MONTH(ts.entry_date) AS work_month,
    DATEPART(WEEK, ts.entry_date) AS work_week,
    DATENAME(WEEKDAY, ts.entry_date) AS day_name,

    -- Count unique tasks worked that day
    COUNT(DISTINCT ts.task_id) AS tasks_worked,

    -- Count tasks with status = done
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN ts.task_id END) AS tasks_completed,

    -- Rate
    CASE
        WHEN COUNT(DISTINCT ts.task_id) = 0 THEN 100.00
        ELSE CAST(COUNT(DISTINCT CASE WHEN t.status = 'done' THEN ts.task_id END) AS FLOAT)
             / COUNT(DISTINCT ts.task_id) * 100
    END AS clearing_rate,

    -- Total hours worked
    SUM(ts.hours) AS total_hours

FROM pms.timesheet_entries ts
INNER JOIN pms.employees e ON ts.employee_id = e.id
INNER JOIN pms.tasks t ON ts.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
WHERE ts.task_id IS NOT NULL
  AND p.is_active = 1
  AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
  AND (pt.code IS NULL OR pt.code <> 'MKT')
GROUP BY
    ts.employee_id,
    e.first_name,
    e.last_name,
    e.employee_code,
    ts.entry_date;
GO

PRINT 'Updated view: pms.vw_issue_clearing_daily (excludes MKT projects)';
GO

-- 6. Issue Clearing Monthly View (depends on daily view)
IF OBJECT_ID('pms.vw_issue_clearing_monthly', 'V') IS NOT NULL
    DROP VIEW pms.vw_issue_clearing_monthly;
GO

CREATE VIEW pms.vw_issue_clearing_monthly AS
SELECT
    employee_id,
    employee_name,
    employee_code,
    work_year,
    work_month,

    COUNT(DISTINCT work_date) AS working_days,
    SUM(tasks_worked) AS total_tasks_worked,
    SUM(tasks_completed) AS total_tasks_completed,
    SUM(total_hours) AS total_hours,

    CASE
        WHEN SUM(tasks_worked) = 0 THEN 100.00
        ELSE CAST(SUM(tasks_completed) AS FLOAT) / SUM(tasks_worked) * 100
    END AS clearing_rate,

    CASE
        WHEN SUM(tasks_worked) = 0 THEN 1
        WHEN CAST(SUM(tasks_completed) AS FLOAT) / SUM(tasks_worked) * 100 >= 85
        THEN 1 ELSE 0
    END AS is_pass

FROM pms.vw_issue_clearing_daily
GROUP BY employee_id, employee_name, employee_code, work_year, work_month;
GO

PRINT 'Updated view: pms.vw_issue_clearing_monthly (excludes MKT projects)';
GO

-- 7. Issue Clearing Yearly View (depends on monthly view)
IF OBJECT_ID('pms.vw_issue_clearing_yearly', 'V') IS NOT NULL
    DROP VIEW pms.vw_issue_clearing_yearly;
GO

CREATE VIEW pms.vw_issue_clearing_yearly AS
SELECT
    employee_id,
    employee_name,
    employee_code,
    work_year,

    COUNT(DISTINCT CONCAT(work_year, '-', work_month)) AS active_months,
    SUM(working_days) AS total_working_days,
    SUM(total_tasks_worked) AS total_tasks_worked,
    SUM(total_tasks_completed) AS total_tasks_completed,
    SUM(total_hours) AS total_hours,

    CASE
        WHEN SUM(total_tasks_worked) = 0 THEN 100.00
        ELSE CAST(SUM(total_tasks_completed) AS FLOAT) / SUM(total_tasks_worked) * 100
    END AS clearing_rate,

    CASE
        WHEN SUM(total_tasks_worked) = 0 THEN 1
        WHEN CAST(SUM(total_tasks_completed) AS FLOAT) / SUM(total_tasks_worked) * 100 >= 85
        THEN 1 ELSE 0
    END AS is_pass

FROM pms.vw_issue_clearing_monthly
GROUP BY employee_id, employee_name, employee_code, work_year;
GO

PRINT 'Updated view: pms.vw_issue_clearing_yearly (excludes MKT projects)';
GO

-- 8. Deliverables by Owner View (for Docs On-time)
IF OBJECT_ID('pms.vw_deliverables_by_owner', 'V') IS NOT NULL
    DROP VIEW pms.vw_deliverables_by_owner;
GO

CREATE VIEW pms.vw_deliverables_by_owner AS
SELECT
    pd.id AS deliverable_id,
    dc.name AS document_name,
    pd.is_required,
    pd.submitted_date,
    CASE
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date > pm.due_date THEN 0
        ELSE NULL
    END AS is_on_time,
    pm.id AS milestone_id,
    mc.name AS milestone_name,
    pm.due_date AS milestone_due_date,
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    p.project_owner_id,
    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS owner_name,
    e.employee_code AS owner_code,
    CASE
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date > pm.due_date THEN 0
        ELSE NULL
    END AS calculated_on_time,
    CASE
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 'On-time'
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date > pm.due_date THEN 'Late'
        WHEN pd.submitted_date IS NULL AND pm.due_date >= CAST(GETDATE() AS DATE) THEN 'Pending'
        WHEN pd.submitted_date IS NULL AND pm.due_date < CAST(GETDATE() AS DATE) THEN 'Overdue'
        ELSE 'Unknown'
    END AS status,
    CASE
        WHEN pd.submitted_date IS NULL AND pm.due_date < CAST(GETDATE() AS DATE)
        THEN DATEDIFF(DAY, pm.due_date, GETDATE())
        ELSE NULL
    END AS days_overdue,
    CASE
        WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date > pm.due_date
        THEN DATEDIFF(DAY, pm.due_date, pd.submitted_date)
        ELSE NULL
    END AS days_late,
    YEAR(pm.due_date) AS due_year
FROM pms.project_deliverables pd
INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.deliverable_configs dc ON pd.deliverable_config_id = dc.id
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.employees e ON p.project_owner_id = e.id
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
WHERE pd.is_required = 1
  AND pm.due_date IS NOT NULL
  AND p.is_active = 1
  AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
  AND (pt.code IS NULL OR pt.code <> 'MKT');
GO

PRINT 'Updated view: pms.vw_deliverables_by_owner (excludes MKT projects)';
GO

-- 9. KPI Post Go-Live Rework View (used by Department Summary)
IF OBJECT_ID('pms.vw_kpi_post_golive_rework', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_post_golive_rework;
GO

CREATE VIEW pms.vw_kpi_post_golive_rework AS
WITH ProjectGoLive AS (
    -- Get go-live date for each project
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
        -- Rework mandays: tasks done after go-live that are defects/bugs
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
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    LEFT JOIN ProjectGoLive gl ON s.project_id = gl.project_id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
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

PRINT 'Updated view: pms.vw_kpi_post_golive_rework (excludes MKT projects)';
GO

-- 10. Post Go-Live Rework Individual Page View (used by /kpi-record/post-golive-rework)
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
        -- Go-Live milestone info
        pm_golive.completed_date AS golive_completed_date,
        -- Close Go-Live milestone info
        pm_close.completed_date AS close_golive_completed_date
    FROM pms.projects p
    -- Join Go-Live milestone
    INNER JOIN pms.project_milestones pm_golive ON pm_golive.project_id = p.id
    INNER JOIN pms.milestone_configs mc_golive ON pm_golive.milestone_config_id = mc_golive.id
        AND mc_golive.is_go_live = 1
    -- Join Close Go-Live milestone (optional)
    LEFT JOIN pms.project_milestones pm_close ON pm_close.project_id = p.id
    LEFT JOIN pms.milestone_configs mc_close ON pm_close.milestone_config_id = mc_close.id
        AND mc_close.is_post_go_live = 1
    -- Exclude MKT projects
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE pm_golive.completed_date IS NOT NULL
      AND p.is_active = 1
      AND (pt.code IS NULL OR pt.code <> 'MKT')
)
SELECT
    pm.project_id,
    pm.project_code,
    pm.project_name,
    pm.project_owner_id,
    e.first_name + ' ' + e.last_name AS owner_name,
    YEAR(pm.golive_completed_date) AS project_year,
    pm.golive_completed_date,
    pm.close_golive_completed_date,
    -- Total Manday (work from Go-Live onwards)
    ISNULL((
        SELECT SUM(ts.hours) / 8.0
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = pm.project_id
        AND ts.entry_date >= pm.golive_completed_date
    ), 0) AS total_manday,
    -- Rework Manday (work after Go-Live until Close Go-Live)
    ISNULL((
        SELECT SUM(ts.hours) / 8.0
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = pm.project_id
        AND ts.entry_date > pm.golive_completed_date
        AND (pm.close_golive_completed_date IS NULL
             OR ts.entry_date <= pm.close_golive_completed_date)
    ), 0) AS rework_manday,
    -- Project Status
    CASE
        WHEN pm.close_golive_completed_date IS NOT NULL THEN 'Closed'
        ELSE 'Post Go-Live'
    END AS project_status
FROM ProjectMilestones pm
LEFT JOIN pms.employees e ON pm.project_owner_id = e.id;
GO

PRINT 'Updated view: pms.vw_post_golive_rework (excludes MKT projects)';
GO

PRINT 'All KPI views updated to exclude MKT projects!';
GO
