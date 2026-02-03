-- =============================================
-- Man-day Monitor Dashboard Views
-- Database: PMSoftware
-- Schema: pms
-- Created: 2026-02-02
-- =============================================

-- =============================================
-- 1. View: Man-day Summary by Project (with Period Filter support)
-- =============================================
IF OBJECT_ID('pms.vw_manday_by_project', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_by_project;
GO

CREATE VIEW pms.vw_manday_by_project AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    pt.code AS project_type_code,
    pt.name AS project_type_name,
    ps.code AS status_code,
    ps.name AS status_name,

    -- Owner & PM
    COALESCE(p.project_owner_id, p.project_manager_id) AS owner_id,
    COALESCE(
        CONCAT(po.first_name_th, ' ', po.last_name_th),
        CONCAT(pm.first_name_th, ' ', pm.last_name_th)
    ) AS owner_name,
    p.project_manager_id,
    CONCAT(pm.first_name_th, ' ', pm.last_name_th) AS pm_name,

    -- Budget (Planned)
    ISNULL(p.sold_mandays, 0) AS budget_mandays,

    -- Actual from Timesheet
    ISNULL(md.actual_mandays, 0) AS actual_mandays,
    ISNULL(md.total_hours, 0) AS total_hours,

    -- Remaining
    ISNULL(p.sold_mandays, 0) - ISNULL(md.actual_mandays, 0) AS remaining_mandays,

    -- Percent Used
    CASE
        WHEN ISNULL(p.sold_mandays, 0) > 0
        THEN CAST(ROUND(ISNULL(md.actual_mandays, 0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
        ELSE 0
    END AS percent_used,

    -- Budget Status
    CASE
        WHEN ISNULL(p.sold_mandays, 0) = 0 THEN 'NO_BUDGET'
        WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) THEN 'OVER'
        WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) * 0.9 THEN 'WARNING'
        ELSE 'NORMAL'
    END AS budget_status,

    -- Employee count on project
    ISNULL(md.employee_count, 0) AS employee_count,

    -- Task count
    ISNULL(md.task_count, 0) AS task_count,

    -- Budget value
    ISNULL(p.total_value, p.sold_mandays * p.manday_rate) AS planned_budget,
    ISNULL(md.actual_mandays, 0) * ISNULL(p.manday_rate, 10000) AS actual_budget

FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
LEFT JOIN pms.employees po ON p.project_owner_id = po.id
LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
LEFT JOIN (
    SELECT
        s.project_id,
        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
        SUM(te.hours) AS total_hours,
        COUNT(DISTINCT t.assignee_id) AS employee_count,
        COUNT(DISTINCT te.task_id) AS task_count
    FROM pms.timesheet_entries te
    INNER JOIN pms.tasks t ON te.task_id = t.id
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
    GROUP BY s.project_id
) md ON p.id = md.project_id
WHERE p.is_active = 1;
GO

-- =============================================
-- 2. View: Man-day by Employee
-- =============================================
IF OBJECT_ID('pms.vw_manday_by_employee', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_by_employee;
GO

CREATE VIEW pms.vw_manday_by_employee AS
SELECT
    e.id AS employee_id,
    e.employee_code,
    COALESCE(
        CONCAT(e.first_name_th, ' ', e.last_name_th),
        CONCAT(e.first_name, ' ', e.last_name)
    ) AS employee_name,
    pos.name AS position_name,
    pos.code AS position_code,
    d.id AS department_id,
    d.name AS department_name,

    -- Man-day
    ISNULL(md.total_mandays, 0) AS total_mandays,
    ISNULL(md.total_hours, 0) AS total_hours,

    -- Average per day
    CASE
        WHEN md.working_days > 0
        THEN CAST(ROUND(md.total_mandays / md.working_days, 2) AS DECIMAL(5,2))
        ELSE 0
    END AS avg_manday_per_day,

    -- Project count
    ISNULL(md.project_count, 0) AS project_count,

    -- Task count
    ISNULL(md.task_count, 0) AS task_count,

    -- Working days
    ISNULL(md.working_days, 0) AS working_days,

    -- Workload (based on expected 1 MD per day)
    CASE
        WHEN md.working_days > 0
        THEN CAST(ROUND(md.total_mandays * 100.0 / md.working_days, 1) AS DECIMAL(5,1))
        ELSE 0
    END AS workload_percent

FROM pms.employees e
LEFT JOIN pms.departments d ON e.department_id = d.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
LEFT JOIN (
    SELECT
        t.assignee_id AS employee_id,
        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS total_mandays,
        SUM(te.hours) AS total_hours,
        COUNT(DISTINCT s.project_id) AS project_count,
        COUNT(DISTINCT te.task_id) AS task_count,
        COUNT(DISTINCT te.entry_date) AS working_days
    FROM pms.timesheet_entries te
    INNER JOIN pms.tasks t ON te.task_id = t.id
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
    GROUP BY t.assignee_id
) md ON e.id = md.employee_id
WHERE e.is_active = 1;
GO

-- =============================================
-- 3. View: Man-day by Category (Task Type)
-- =============================================
IF OBJECT_ID('pms.vw_manday_by_category', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_by_category;
GO

CREATE VIEW pms.vw_manday_by_category AS
SELECT
    ISNULL(t.task_type, 'Other') AS category,
    ISNULL(ttc.name, ISNULL(t.task_type, 'Other')) AS category_name,
    ISNULL(ttc.color, '#6B7280') AS category_color,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
    SUM(te.hours) AS total_hours,
    COUNT(DISTINCT t.assignee_id) AS employee_count,
    COUNT(DISTINCT s.project_id) AS project_count

FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
GROUP BY
    t.task_type, ttc.name, ttc.color,
    YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- =============================================
-- 4. View: Man-day Monthly Trend
-- =============================================
IF OBJECT_ID('pms.vw_manday_monthly_trend', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_monthly_trend;
GO

CREATE VIEW pms.vw_manday_monthly_trend AS
SELECT
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
    SUM(te.hours) AS total_hours,
    COUNT(DISTINCT t.assignee_id) AS employee_count,
    COUNT(DISTINCT s.project_id) AS project_count,
    COUNT(DISTINCT te.entry_date) AS working_days

FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
GROUP BY YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- =============================================
-- 5. View: Employee-Project Matrix
-- =============================================
IF OBJECT_ID('pms.vw_employee_project_manday', 'V') IS NOT NULL
    DROP VIEW pms.vw_employee_project_manday;
GO

CREATE VIEW pms.vw_employee_project_manday AS
SELECT
    t.assignee_id AS employee_id,
    e.employee_code,
    COALESCE(
        CONCAT(e.first_name_th, ' ', e.last_name_th),
        CONCAT(e.first_name, ' ', e.last_name)
    ) AS employee_name,
    pos.code AS position_code,
    s.project_id,
    p.project_code,
    p.name AS project_name,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
    SUM(te.hours) AS total_hours

FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1
GROUP BY
    t.assignee_id,
    e.employee_code,
    e.first_name_th,
    e.last_name_th,
    e.first_name,
    e.last_name,
    pos.code,
    s.project_id,
    p.project_code,
    p.name,
    YEAR(te.entry_date),
    MONTH(te.entry_date);
GO

-- =============================================
-- 6. View: Man-day by Project with Period
-- =============================================
IF OBJECT_ID('pms.vw_manday_project_period', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_project_period;
GO

CREATE VIEW pms.vw_manday_project_period AS
SELECT
    s.project_id,
    p.project_code,
    p.name AS project_name,
    ISNULL(p.sold_mandays, 0) AS budget_mandays,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    DATEPART(QUARTER, te.entry_date) AS quarter,
    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
    SUM(te.hours) AS total_hours,
    COUNT(DISTINCT t.assignee_id) AS employee_count

FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1
GROUP BY
    s.project_id,
    p.project_code,
    p.name,
    p.sold_mandays,
    YEAR(te.entry_date),
    MONTH(te.entry_date),
    DATEPART(QUARTER, te.entry_date);
GO

-- =============================================
-- 7. View: Man-day by Employee with Period
-- =============================================
IF OBJECT_ID('pms.vw_manday_employee_period', 'V') IS NOT NULL
    DROP VIEW pms.vw_manday_employee_period;
GO

CREATE VIEW pms.vw_manday_employee_period AS
SELECT
    t.assignee_id AS employee_id,
    e.employee_code,
    COALESCE(
        CONCAT(e.first_name_th, ' ', e.last_name_th),
        CONCAT(e.first_name, ' ', e.last_name)
    ) AS employee_name,
    pos.code AS position_code,
    d.id AS department_id,
    d.name AS department_name,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    DATEPART(QUARTER, te.entry_date) AS quarter,
    DATEPART(WEEK, te.entry_date) AS week_of_year,
    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
    SUM(te.hours) AS total_hours,
    COUNT(DISTINCT s.project_id) AS project_count,
    COUNT(DISTINCT te.entry_date) AS working_days

FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON te.task_id = t.id
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
LEFT JOIN pms.departments d ON e.department_id = d.id
INNER JOIN pms.stories s ON t.story_id = s.id
WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1 AND e.is_active = 1
GROUP BY
    t.assignee_id,
    e.employee_code,
    e.first_name_th,
    e.last_name_th,
    e.first_name,
    e.last_name,
    pos.code,
    d.id,
    d.name,
    YEAR(te.entry_date),
    MONTH(te.entry_date),
    DATEPART(QUARTER, te.entry_date),
    DATEPART(WEEK, te.entry_date);
GO

PRINT ''
PRINT '=========================================='
PRINT 'MAN-DAY MONITOR VIEWS CREATED!'
PRINT '=========================================='
GO
