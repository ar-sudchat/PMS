-- =============================================
-- Timesheet Dashboard Views
-- Created: 2026-01-17
-- Updated: 2026-01-17 - ใช้ task.assignee_id แทน timesheet_entries.employee_id
-- =============================================

-- 1. สรุปชั่วโมงรายพนักงานรายเดือน (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_employee_monthly', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_employee_monthly;
GO

CREATE VIEW pms.vw_timesheet_employee_monthly AS
SELECT
    e.id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    d.name AS department_name,
    d.id AS department_id,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    COUNT(DISTINCT te.entry_date) AS days_worked,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    -- สมมติ 7 ชม./วัน, 20 วัน/เดือน = 140 ชม./เดือน
    CAST(ROUND(ISNULL(SUM(te.hours), 0) * 100.0 / 140, 1) AS DECIMAL(5,1)) AS utilization_percent
FROM pms.employees e
LEFT JOIN pms.departments d ON e.department_id = d.id
LEFT JOIN pms.tasks t ON e.id = t.assignee_id
LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
WHERE e.is_active = 1
GROUP BY
    e.id, e.employee_code, e.first_name, e.last_name,
    d.name, d.id, YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- 2. สรุปชั่วโมงรายพนักงานรายสัปดาห์ (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_employee_weekly', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_employee_weekly;
GO

CREATE VIEW pms.vw_timesheet_employee_weekly AS
SELECT
    e.id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    d.name AS department_name,
    d.id AS department_id,
    YEAR(te.entry_date) AS year,
    DATEPART(WEEK, te.entry_date) AS week_number,
    MIN(te.entry_date) AS week_start,
    MAX(te.entry_date) AS week_end,
    COUNT(DISTINCT te.entry_date) AS days_worked,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    -- สมมติ 7 ชม./วัน, 5 วัน/สัปดาห์ = 35 ชม./สัปดาห์
    CAST(ROUND(ISNULL(SUM(te.hours), 0) * 100.0 / 35, 1) AS DECIMAL(5,1)) AS utilization_percent
FROM pms.employees e
LEFT JOIN pms.departments d ON e.department_id = d.id
LEFT JOIN pms.tasks t ON e.id = t.assignee_id
LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
WHERE e.is_active = 1
GROUP BY
    e.id, e.employee_code, e.first_name, e.last_name,
    d.name, d.id, YEAR(te.entry_date), DATEPART(WEEK, te.entry_date);
GO

-- 3. สรุปชั่วโมงรายแผนก (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_by_department', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_by_department;
GO

CREATE VIEW pms.vw_timesheet_by_department AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    COUNT(DISTINCT t.assignee_id) AS employee_count,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    CAST(ROUND(AVG(te.hours), 2) AS DECIMAL(10,2)) AS avg_hours_per_entry
FROM pms.departments d
LEFT JOIN pms.employees e ON d.id = e.department_id AND e.is_active = 1
LEFT JOIN pms.tasks t ON e.id = t.assignee_id
LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
WHERE d.is_active = 1
GROUP BY d.id, d.name, YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- 4. สรุปชั่วโมงรายโครงการ (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_by_project', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_by_project;
GO

CREATE VIEW pms.vw_timesheet_by_project AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    ISNULL(p.sold_mandays, 0) AS planned_mandays,
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    COUNT(DISTINCT t.assignee_id) AS employee_count,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    CAST(ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
    CASE
        WHEN ISNULL(p.sold_mandays, 0) > 0
        THEN CAST(ROUND((ISNULL(SUM(te.hours), 0) / 7.0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
        ELSE 0
    END AS budget_used_percent
FROM pms.projects p
LEFT JOIN pms.stories s ON p.id = s.project_id
LEFT JOIN pms.tasks t ON s.id = t.story_id
LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
WHERE p.is_active = 1
GROUP BY
    p.id, p.project_code, p.name, p.sold_mandays,
    YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- 5. สรุปรวมสำหรับ Dashboard (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_dashboard_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_dashboard_summary;
GO

CREATE VIEW pms.vw_timesheet_dashboard_summary AS
SELECT
    YEAR(te.entry_date) AS year,
    MONTH(te.entry_date) AS month,
    COUNT(DISTINCT t.assignee_id) AS active_employees,
    COUNT(DISTINCT t.story_id) AS active_stories,
    COUNT(DISTINCT CASE WHEN s.project_id IS NOT NULL THEN s.project_id END) AS active_projects,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    COUNT(DISTINCT te.entry_date) AS total_work_days,
    CAST(ROUND(ISNULL(SUM(te.hours), 0) / NULLIF(COUNT(DISTINCT t.assignee_id), 0), 2) AS DECIMAL(10,2)) AS avg_hours_per_employee,
    CAST(ROUND(ISNULL(SUM(te.hours), 0) / NULLIF(COUNT(DISTINCT te.entry_date), 0), 2) AS DECIMAL(10,2)) AS avg_hours_per_day
FROM pms.timesheet_entries te
LEFT JOIN pms.tasks t ON te.task_id = t.id
LEFT JOIN pms.stories s ON t.story_id = s.id
WHERE te.is_active = 1
GROUP BY YEAR(te.entry_date), MONTH(te.entry_date);
GO

-- 6. พนักงานที่ยังไม่บันทึก Timesheet (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_missing', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_missing;
GO

CREATE VIEW pms.vw_timesheet_missing AS
WITH WeekDates AS (
    SELECT
        DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()), 0) AS current_week_start,
        DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()) - 1, 0) AS last_week_start
),
EmployeeTimesheet AS (
    SELECT
        e.id AS employee_id,
        e.employee_code,
        e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
        d.name AS department_name,
        MAX(te.entry_date) AS last_entry_date
    FROM pms.employees e
    LEFT JOIN pms.departments d ON e.department_id = d.id
    LEFT JOIN pms.tasks t ON e.id = t.assignee_id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE e.is_active = 1
    GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name
)
SELECT
    et.*,
    DATEDIFF(DAY, et.last_entry_date, GETDATE()) AS days_since_last_entry,
    CASE
        WHEN et.last_entry_date IS NULL THEN 'Never submitted'
        WHEN et.last_entry_date < wd.last_week_start THEN 'Missing > 1 week'
        WHEN et.last_entry_date < wd.current_week_start THEN 'Missing this week'
        ELSE 'Up to date'
    END AS status
FROM EmployeeTimesheet et
CROSS JOIN WeekDates wd
WHERE et.last_entry_date IS NULL
   OR et.last_entry_date < wd.current_week_start;
GO

-- 7. Hours Trend รายสัปดาห์ (ตาม assignee ของ task)
IF OBJECT_ID('pms.vw_timesheet_weekly_trend', 'V') IS NOT NULL
    DROP VIEW pms.vw_timesheet_weekly_trend;
GO

CREATE VIEW pms.vw_timesheet_weekly_trend AS
SELECT
    YEAR(te.entry_date) AS year,
    DATEPART(WEEK, te.entry_date) AS week_number,
    DATEADD(DAY, -(DATEPART(WEEKDAY, MIN(te.entry_date)) - 1), MIN(te.entry_date)) AS week_start,
    COUNT(DISTINCT t.assignee_id) AS employee_count,
    ISNULL(SUM(te.hours), 0) AS total_hours,
    -- Target = จำนวนพนักงาน × 35 ชม.
    COUNT(DISTINCT t.assignee_id) * 35 AS target_hours
FROM pms.timesheet_entries te
LEFT JOIN pms.tasks t ON te.task_id = t.id
WHERE te.is_active = 1
GROUP BY YEAR(te.entry_date), DATEPART(WEEK, te.entry_date);
GO

PRINT 'Timesheet Dashboard Views created successfully (using task.assignee_id)';
