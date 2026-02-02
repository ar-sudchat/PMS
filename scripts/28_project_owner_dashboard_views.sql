-- =============================================
-- Project Owner Dashboard Views
-- Database: PMSoftware
-- Schema: pms
-- =============================================

-- =============================================
-- 1. View: Project Summary for Owner
-- =============================================
IF OBJECT_ID('pms.vw_project_owner_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_project_owner_summary;
GO

CREATE VIEW pms.vw_project_owner_summary AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    p.description,
    p.status_id,
    ps.code AS status_code,
    ps.name AS status_name,
    c.name AS customer_name,

    -- Owner Info (Project Owner or PM)
    COALESCE(p.project_owner_id, p.project_manager_id) AS owner_id,
    COALESCE(po.employee_code, pm.employee_code) AS owner_code,
    COALESCE(
        CONCAT(po.first_name_th, ' ', po.last_name_th),
        CONCAT(pm.first_name_th, ' ', pm.last_name_th)
    ) AS owner_name,

    -- PM Info
    p.project_manager_id,
    CONCAT(pm.first_name_th, ' ', pm.last_name_th) AS pm_name,

    -- Timeline
    p.created_at AS start_date,
    p.warranty_end_date AS planned_end_date,
    DATEDIFF(DAY, p.created_at, COALESCE(p.warranty_end_date, DATEADD(MONTH, 6, p.created_at))) AS planned_duration_days,
    DATEDIFF(DAY, p.created_at, GETDATE()) AS elapsed_days,
    CASE
        WHEN p.warranty_end_date < GETDATE() AND ps.code NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        THEN DATEDIFF(DAY, p.warranty_end_date, GETDATE())
        ELSE 0
    END AS overdue_days,

    -- Man-day
    ISNULL(p.sold_mandays, 0) AS planned_mandays,
    ISNULL(md.actual_mandays, 0) AS actual_mandays,
    ISNULL(p.sold_mandays, 0) - ISNULL(md.actual_mandays, 0) AS remaining_mandays,
    CASE
        WHEN ISNULL(p.sold_mandays, 0) > 0
        THEN CAST(ROUND(ISNULL(md.actual_mandays, 0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
        ELSE 0
    END AS manday_percent,

    -- Budget
    ISNULL(p.total_value, p.sold_mandays * p.manday_rate) AS planned_budget,
    ISNULL(md.actual_mandays, 0) * ISNULL(p.manday_rate, 10000) AS actual_budget,
    ISNULL(p.total_value, p.sold_mandays * p.manday_rate) - (ISNULL(md.actual_mandays, 0) * ISNULL(p.manday_rate, 10000)) AS remaining_budget,
    CASE
        WHEN ISNULL(p.total_value, p.sold_mandays * p.manday_rate) > 0
        THEN CAST(ROUND(ISNULL(md.actual_mandays, 0) * ISNULL(p.manday_rate, 10000) * 100.0 / NULLIF(ISNULL(p.total_value, p.sold_mandays * p.manday_rate), 0), 1) AS DECIMAL(5,1))
        ELSE 0
    END AS budget_percent,

    -- Progress
    ISNULL(prog.overall_progress, 0) AS overall_progress,

    -- Milestone counts
    ISNULL(ms.total_milestones, 0) AS total_milestones,
    ISNULL(ms.completed_milestones, 0) AS completed_milestones,
    ISNULL(ms.in_progress_milestones, 0) AS in_progress_milestones,
    ISNULL(ms.pending_milestones, 0) AS pending_milestones,
    ISNULL(ms.delayed_milestones, 0) AS delayed_milestones,

    -- Current Milestone
    cm.milestone_name AS current_milestone,
    cm.milestone_status AS current_milestone_status,
    cm.planned_date AS current_milestone_date,
    cm.days_until_due AS current_milestone_days_until,

    -- Health Status
    CASE
        WHEN ps.code IN ('COMPLETED', 'CLOSED') THEN 'COMPLETED'
        WHEN ps.code = 'CANCELLED' THEN 'CANCELLED'
        WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) THEN 'OVER_BUDGET'
        WHEN ms.delayed_milestones > 0 THEN 'DELAYED'
        WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) * 0.9 THEN 'AT_RISK'
        WHEN cm.days_until_due < 0 THEN 'AT_RISK'
        ELSE 'ON_TRACK'
    END AS health_status,

    -- Project Type
    pt.code AS project_type_code,
    pt.name AS project_type_name,

    -- Dates
    p.created_at,
    p.updated_at

FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
LEFT JOIN pms.employees po ON p.project_owner_id = po.id
LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id

-- Actual Man-days from Timesheet
LEFT JOIN (
    SELECT
        s.project_id,
        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
    FROM pms.timesheet_entries te
    INNER JOIN pms.tasks t ON te.task_id = t.id
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE t.is_active = 1 AND s.is_active = 1
    GROUP BY s.project_id
) md ON p.id = md.project_id

-- Overall Progress (based on task completion)
LEFT JOIN (
    SELECT
        s.project_id,
        CASE
            WHEN COUNT(*) > 0
            THEN CAST(ROUND(SUM(CASE WHEN t.status IN ('Done', 'Done (Not as Planned)') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS INT)
            ELSE 0
        END AS overall_progress
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    WHERE t.is_active = 1 AND s.is_active = 1
    GROUP BY s.project_id
) prog ON p.id = prog.project_id

-- Milestone Stats
LEFT JOIN (
    SELECT
        project_id,
        COUNT(*) AS total_milestones,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_milestones,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_milestones,
        SUM(CASE WHEN status = 'pending' OR status IS NULL THEN 1 ELSE 0 END) AS pending_milestones,
        SUM(CASE WHEN due_date < GETDATE() AND status != 'completed' THEN 1 ELSE 0 END) AS delayed_milestones
    FROM pms.project_milestones
    GROUP BY project_id
) ms ON p.id = ms.project_id

-- Current Milestone (next upcoming or in-progress)
OUTER APPLY (
    SELECT TOP 1
        mc.name AS milestone_name,
        pm.status AS milestone_status,
        pm.due_date AS planned_date,
        DATEDIFF(DAY, GETDATE(), pm.due_date) AS days_until_due
    FROM pms.project_milestones pm
    LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE pm.project_id = p.id
    AND pm.status IN ('pending', 'in_progress')
    ORDER BY pm.due_date ASC, pm.sort_order ASC
) cm

WHERE p.is_active = 1;
GO

-- =============================================
-- 2. View: Project Milestones Detail
-- =============================================
IF OBJECT_ID('pms.vw_project_milestones_detail', 'V') IS NOT NULL
    DROP VIEW pms.vw_project_milestones_detail;
GO

CREATE VIEW pms.vw_project_milestones_detail AS
SELECT
    pm.id AS milestone_id,
    pm.project_id,
    p.project_code,
    p.name AS project_name,
    mc.name AS milestone_name,
    mc.code AS milestone_code,
    pm.status,
    pm.due_date AS planned_date,
    pm.completed_date AS actual_date,
    pm.planned_mandays,
    pm.actual_mandays,
    pm.weight_percent,
    pm.sort_order,

    -- Status calculation
    CASE
        WHEN pm.status = 'completed' THEN 'COMPLETED'
        WHEN pm.due_date < GETDATE() AND pm.status != 'completed' THEN 'DELAYED'
        WHEN pm.status = 'in_progress' THEN 'IN_PROGRESS'
        ELSE 'PENDING'
    END AS milestone_status_code,

    -- Days
    DATEDIFF(DAY, GETDATE(), pm.due_date) AS days_until_due,
    CASE
        WHEN pm.due_date < GETDATE() AND pm.status != 'completed'
        THEN DATEDIFF(DAY, pm.due_date, GETDATE())
        ELSE 0
    END AS days_overdue,

    -- Completion
    ISNULL(pm.progress_percent,
        CASE
            WHEN pm.status = 'completed' THEN 100
            WHEN pm.status = 'in_progress' THEN 50
            ELSE 0
        END
    ) AS completion_percent,

    pm.created_at,
    pm.updated_at

FROM pms.project_milestones pm
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE p.is_active = 1;
GO

-- =============================================
-- 3. View: Owner Dashboard Summary Stats
-- =============================================
IF OBJECT_ID('pms.vw_owner_dashboard_stats', 'V') IS NOT NULL
    DROP VIEW pms.vw_owner_dashboard_stats;
GO

CREATE VIEW pms.vw_owner_dashboard_stats AS
SELECT
    owner_id,
    owner_name,
    COUNT(*) AS total_projects,
    SUM(CASE WHEN health_status = 'ON_TRACK' THEN 1 ELSE 0 END) AS on_track_count,
    SUM(CASE WHEN health_status = 'AT_RISK' THEN 1 ELSE 0 END) AS at_risk_count,
    SUM(CASE WHEN health_status IN ('DELAYED', 'OVER_BUDGET') THEN 1 ELSE 0 END) AS delayed_count,
    SUM(CASE WHEN health_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN health_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
    SUM(planned_mandays) AS total_planned_mandays,
    SUM(actual_mandays) AS total_actual_mandays,
    SUM(remaining_mandays) AS total_remaining_mandays,
    CASE
        WHEN SUM(planned_mandays) > 0
        THEN CAST(ROUND(SUM(actual_mandays) * 100.0 / SUM(planned_mandays), 1) AS DECIMAL(5,1))
        ELSE 0
    END AS overall_manday_percent,
    SUM(planned_budget) AS total_planned_budget,
    SUM(actual_budget) AS total_actual_budget
FROM pms.vw_project_owner_summary
WHERE health_status != 'CANCELLED'
GROUP BY owner_id, owner_name;
GO

-- =============================================
-- 4. View: Attention Required (Issues)
-- =============================================
IF OBJECT_ID('pms.vw_project_attention_required', 'V') IS NOT NULL
    DROP VIEW pms.vw_project_attention_required;
GO

CREATE VIEW pms.vw_project_attention_required AS
SELECT
    project_id,
    project_code,
    project_name,
    owner_id,
    owner_name,
    issue_type,
    issue_description,
    severity,
    created_at
FROM (
    -- Man-day Over Budget
    SELECT
        project_id,
        project_code,
        project_name,
        owner_id,
        owner_name,
        'MANDAY_OVER' AS issue_type,
        N'Man-day เกิน Budget ' + CAST(CAST(manday_percent - 100 AS INT) AS NVARCHAR) + N'% (' +
        CAST(CAST(actual_mandays AS INT) AS NVARCHAR) + '/' + CAST(CAST(planned_mandays AS INT) AS NVARCHAR) + ' MD)' AS issue_description,
        CASE
            WHEN manday_percent > 120 THEN 'HIGH'
            WHEN manday_percent > 100 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity,
        updated_at AS created_at
    FROM pms.vw_project_owner_summary
    WHERE manday_percent > 100
    AND health_status NOT IN ('COMPLETED', 'CANCELLED')

    UNION ALL

    -- Milestone Delayed
    SELECT
        p.project_id,
        p.project_code,
        p.project_name,
        p.owner_id,
        p.owner_name,
        'MILESTONE_DELAYED' AS issue_type,
        N'Milestone "' + m.milestone_name + N'" ล่าช้า ' + CAST(m.days_overdue AS NVARCHAR) + N' วัน' AS issue_description,
        CASE
            WHEN m.days_overdue > 14 THEN 'HIGH'
            WHEN m.days_overdue > 7 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity,
        m.updated_at AS created_at
    FROM pms.vw_project_owner_summary p
    INNER JOIN pms.vw_project_milestones_detail m ON p.project_id = m.project_id
    WHERE m.milestone_status_code = 'DELAYED'
    AND p.health_status NOT IN ('COMPLETED', 'CANCELLED')

    UNION ALL

    -- Project Overdue
    SELECT
        project_id,
        project_code,
        project_name,
        owner_id,
        owner_name,
        'PROJECT_OVERDUE' AS issue_type,
        N'โครงการเกินกำหนด ' + CAST(overdue_days AS NVARCHAR) + N' วัน' AS issue_description,
        CASE
            WHEN overdue_days > 30 THEN 'HIGH'
            WHEN overdue_days > 14 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity,
        updated_at AS created_at
    FROM pms.vw_project_owner_summary
    WHERE overdue_days > 0
    AND health_status NOT IN ('COMPLETED', 'CANCELLED')
) issues;
GO

-- =============================================
-- 5. View: Upcoming Milestones
-- =============================================
IF OBJECT_ID('pms.vw_upcoming_milestones', 'V') IS NOT NULL
    DROP VIEW pms.vw_upcoming_milestones;
GO

CREATE VIEW pms.vw_upcoming_milestones AS
SELECT
    m.milestone_id,
    m.project_id,
    m.project_code,
    m.project_name,
    m.milestone_name,
    m.planned_date,
    m.days_until_due,
    m.status,
    p.owner_id,
    p.owner_name,
    CASE
        WHEN m.days_until_due < 0 THEN 'OVERDUE'
        WHEN m.days_until_due <= 7 THEN 'THIS_WEEK'
        WHEN m.days_until_due <= 14 THEN 'NEXT_WEEK'
        WHEN m.days_until_due <= 30 THEN 'THIS_MONTH'
        ELSE 'FUTURE'
    END AS urgency
FROM pms.vw_project_milestones_detail m
INNER JOIN pms.vw_project_owner_summary p ON m.project_id = p.project_id
WHERE m.status != 'completed'
AND m.days_until_due <= 30
AND p.health_status NOT IN ('COMPLETED', 'CANCELLED');
GO

PRINT ''
PRINT '=========================================='
PRINT 'PROJECT OWNER DASHBOARD VIEWS CREATED!'
PRINT '=========================================='
GO
