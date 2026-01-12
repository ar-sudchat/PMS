-- View สำหรับ Issue Clearing KPI
-- Run this script in SQL Server Management Studio

-- Issue Clearing = นับ Task ที่ทำวันนั้นว่ากี่ตัว Clear (status = done) ได้
-- ใช้ task.status = 'done' เป็นเกณฑ์ว่า Clear แล้ว

CREATE OR ALTER VIEW pms.vw_issue_clearing_daily AS
SELECT
    ts.employee_id,
    e.first_name + ' ' + e.last_name AS employee_name,
    e.employee_code,
    ts.entry_date AS work_date,
    YEAR(ts.entry_date) AS work_year,
    MONTH(ts.entry_date) AS work_month,
    DATEPART(WEEK, ts.entry_date) AS work_week,
    DATENAME(WEEKDAY, ts.entry_date) AS day_name,

    -- นับ Task ที่ทำในวันนั้น (unique tasks)
    COUNT(DISTINCT ts.task_id) AS tasks_worked,

    -- นับ Task ที่ status = done (Completed/Cleared)
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
WHERE ts.task_id IS NOT NULL
GROUP BY
    ts.employee_id,
    e.first_name,
    e.last_name,
    e.employee_code,
    ts.entry_date;
GO

-- View สรุปรายเดือน
CREATE OR ALTER VIEW pms.vw_issue_clearing_monthly AS
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

-- View สรุปรายปี
CREATE OR ALTER VIEW pms.vw_issue_clearing_yearly AS
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
