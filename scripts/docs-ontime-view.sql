-- View สำหรับดึงข้อมูล Deliverables + Owner สำหรับ KPI Required Docs On-time
-- Run this script in SQL Server Management Studio

CREATE OR ALTER VIEW pms.vw_deliverables_by_owner AS
SELECT
    pd.id AS deliverable_id,
    pd.name AS document_name,
    pd.is_required,
    pd.submitted_date,
    pd.is_on_time,

    pm.id AS milestone_id,
    mc.name AS milestone_name,
    pm.due_date AS milestone_due_date,

    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    p.project_owner_id,

    e.first_name + ' ' + e.last_name AS owner_name,
    e.employee_code AS owner_code,

    -- Calculate on-time status
    CASE
        WHEN pd.submitted_date IS NULL THEN NULL
        WHEN pd.submitted_date <= pm.due_date THEN 1
        ELSE 0
    END AS calculated_on_time,

    -- Status
    CASE
        WHEN pd.submitted_date IS NULL AND pm.due_date < CAST(GETDATE() AS DATE) THEN 'Overdue'
        WHEN pd.submitted_date IS NULL THEN 'Pending'
        WHEN pd.submitted_date <= pm.due_date THEN 'On-time'
        ELSE 'Late'
    END AS status,

    -- Days info
    DATEDIFF(DAY, pm.due_date, GETDATE()) AS days_overdue,
    DATEDIFF(DAY, pm.due_date, pd.submitted_date) AS days_late,

    YEAR(pm.due_date) AS due_year

FROM pms.project_deliverables pd
INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.employees e ON p.project_owner_id = e.id
WHERE pd.is_required = 1;
GO
