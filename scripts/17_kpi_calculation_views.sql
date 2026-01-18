-- =============================================
-- KPI Calculation Views
-- Created: 2026-01-17
-- Updated: 2026-01-18 - Fixed schema alignment
-- สำหรับ KPI Dashboard และ My KPI Dashboard
-- =============================================

-- 1. Time to Delivery Calculation
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneProgress AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.planned_mandays,
        pm.status,
        pm.due_date AS planned_date,
        pm.completed_date AS actual_date,
        -- Weight for Time to Delivery
        CASE mc.name
            WHEN 'Mapping Data' THEN 35
            WHEN 'System Test' THEN 20
            WHEN 'User Acceptance Test' THEN 30
            WHEN 'Go-Live' THEN 15
            ELSE 0
        END AS milestone_weight,
        -- Achievement percent calculation
        CASE
            WHEN pm.status = 'completed' AND pm.completed_date <= pm.due_date THEN 100
            WHEN pm.status = 'completed' AND pm.completed_date > pm.due_date THEN
                CASE
                    WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
                    WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
                    ELSE 40
                END
            WHEN pm.status = 'in_progress' THEN 50
            ELSE 0
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE mc.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live')
      AND p.is_active = 1
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CASE
        WHEN SUM(planned_mandays * 100) > 0
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
            NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0 AND
             (SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
              NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0)) >= 80
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneProgress
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 2. Man-day Control Calculation
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
        CASE mc.name
            WHEN 'Mapping Data' THEN 30
            WHEN 'System Test' THEN 30
            WHEN 'User Acceptance Test' THEN 20
            WHEN 'Go-Live' THEN 10
            WHEN 'Close Go-Live' THEN 10
            ELSE 0
        END AS milestone_weight,
        -- Achievement percent
        CASE
            WHEN pm.actual_mandays IS NULL THEN 0
            WHEN pm.actual_mandays <= pm.planned_mandays THEN 100
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
            WHEN pm.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
            ELSE 50
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE mc.name IN ('Mapping Data', 'System Test', 'User Acceptance Test', 'Go-Live', 'Close Go-Live')
      AND p.is_active = 1
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    SUM(planned_mandays) AS total_planned_mandays,
    SUM(actual_mandays) AS total_actual_mandays,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0
        THEN CAST(ROUND(
            SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
            NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0), 2
        ) AS DECIMAL(5,2))
        ELSE 0
    END AS manday_control_percent,
    85 AS target_percent,
    CASE
        WHEN SUM(ISNULL(planned_mandays, 1) * 100) > 0 AND
             (SUM(achievement_percent * milestone_weight * ISNULL(planned_mandays, 1) / 100.0) * 100.0 /
              NULLIF(SUM(ISNULL(planned_mandays, 1) * milestone_weight), 0)) >= 85
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneManday
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name;
GO

-- 3. Defect Ratio Calculation
-- Note: Uses task_type directly (bug, defect, hotfix)
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
        -- Check if task type is defect-related (Bug, Defect, etc)
        CASE WHEN LOWER(t.task_type) IN ('bug', 'defect', 'hotfix') THEN 1 ELSE 0 END AS is_defect,
        SUM(te.hours) / 7.0 AS mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
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

-- 4. Post Go-live Rework Ratio (calculated from tasks with specific types after go-live)
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
    LEFT JOIN ProjectGoLive gl ON s.project_id = gl.project_id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
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

-- 5. Deploy Success Rate
-- Schema: deploy_success_records has customer_id, week_start_date, year, week_number, deploy_count, rollback_count
IF OBJECT_ID('pms.vw_kpi_deploy_success', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_deploy_success;
GO

CREATE VIEW pms.vw_kpi_deploy_success AS
SELECT
    d.year,
    MONTH(d.week_start_date) AS month,
    DATEPART(QUARTER, d.week_start_date) AS quarter,
    d.customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    SUM(d.deploy_count) AS total_deploys,
    SUM(d.deploy_count - d.rollback_count) AS successful_deploys,
    SUM(d.rollback_count) AS rollback_count,
    CASE
        WHEN SUM(d.deploy_count) > 0
        THEN CAST(ROUND((SUM(d.deploy_count) - SUM(d.rollback_count)) * 100.0 / SUM(d.deploy_count), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS success_rate_percent,
    95 AS target_percent,
    CASE
        WHEN SUM(d.deploy_count) = 0 OR
             ((SUM(d.deploy_count) - SUM(d.rollback_count)) * 100.0 / SUM(d.deploy_count)) >= 95
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.deploy_success_records d
INNER JOIN pms.customers c ON d.customer_id = c.id
GROUP BY d.year, MONTH(d.week_start_date), DATEPART(QUARTER, d.week_start_date),
         d.customer_id, c.code, c.name;
GO

-- 6. Pre-deploy Backup Compliance
-- Schema: deploy_backup_records has backup_source_id (not project_id)
IF OBJECT_ID('pms.vw_kpi_predeploy_backup', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_predeploy_backup;
GO

CREATE VIEW pms.vw_kpi_predeploy_backup AS
SELECT
    YEAR(b.backup_date) AS year,
    MONTH(b.backup_date) AS month,
    DATEPART(QUARTER, b.backup_date) AS quarter,
    b.backup_source_id,
    bs.code AS source_code,
    bs.name AS source_name,
    COUNT(DISTINCT b.id) AS total_backups,
    COUNT(DISTINCT CASE WHEN b.is_verified = 1 THEN b.id END) AS verified_backups,
    CASE
        WHEN COUNT(DISTINCT b.id) > 0
        THEN CAST(ROUND(COUNT(DISTINCT CASE WHEN b.is_verified = 1 THEN b.id END) * 100.0 /
             COUNT(DISTINCT b.id), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS backup_compliance_percent,
    100 AS target_percent,
    CASE
        WHEN COUNT(DISTINCT b.id) = 0 OR
             COUNT(DISTINCT CASE WHEN b.is_verified = 1 THEN b.id END) = COUNT(DISTINCT b.id)
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.deploy_backup_records b
INNER JOIN pms.backup_sources bs ON b.backup_source_id = bs.id
GROUP BY YEAR(b.backup_date), MONTH(b.backup_date), DATEPART(QUARTER, b.backup_date),
         b.backup_source_id, bs.code, bs.name;
GO

-- 7. On-time Meeting Minutes (Personal KPI)
-- Schema: meeting_minutes_records has mom_sent_at (not submitted_at)
IF OBJECT_ID('pms.vw_kpi_meeting_minutes', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_meeting_minutes;
GO

CREATE VIEW pms.vw_kpi_meeting_minutes AS
SELECT
    YEAR(m.meeting_date) AS year,
    MONTH(m.meeting_date) AS month,
    DATEPART(QUARTER, m.meeting_date) AS quarter,
    m.organized_by AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    ISNULL(pos.name, 'Unknown') AS position,
    COUNT(*) AS total_meetings,
    SUM(CASE WHEN m.mom_sent_at IS NOT NULL AND
        DATEDIFF(HOUR, ISNULL(m.meeting_end_time, DATEADD(HOUR, 2, m.meeting_date)), m.mom_sent_at) <= 24
        THEN 1 ELSE 0 END) AS ontime_count,
    SUM(CASE WHEN m.mom_sent_at IS NULL OR
        DATEDIFF(HOUR, ISNULL(m.meeting_end_time, DATEADD(HOUR, 2, m.meeting_date)), m.mom_sent_at) > 24
        THEN 1 ELSE 0 END) AS late_count,
    3 AS max_late_allowed,
    CASE
        WHEN SUM(CASE WHEN m.mom_sent_at IS NULL OR
            DATEDIFF(HOUR, ISNULL(m.meeting_end_time, DATEADD(HOUR, 2, m.meeting_date)), m.mom_sent_at) > 24
            THEN 1 ELSE 0 END) <= 3
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.meeting_minutes_records m
INNER JOIN pms.employees e ON m.organized_by = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
WHERE e.is_active = 1
GROUP BY YEAR(m.meeting_date), MONTH(m.meeting_date), DATEPART(QUARTER, m.meeting_date),
         m.organized_by, e.employee_code, e.first_name, e.last_name, pos.name;
GO

-- 8. Required Docs On-time (Personal KPI)
-- Calculate from project deliverables - due date comes from project_milestones
IF OBJECT_ID('pms.vw_kpi_docs_ontime', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_docs_ontime;
GO

CREATE VIEW pms.vw_kpi_docs_ontime AS
SELECT
    YEAR(pm.due_date) AS year,
    MONTH(pm.due_date) AS month,
    DATEPART(QUARTER, pm.due_date) AS quarter,
    p.project_owner_id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    ISNULL(pos.name, 'Unknown') AS position,
    COUNT(*) AS total_docs,
    SUM(CASE WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1 ELSE 0 END) AS ontime_count,
    SUM(CASE WHEN pd.submitted_date IS NULL OR pd.submitted_date > pm.due_date THEN 1 ELSE 0 END) AS late_count,
    CASE
        WHEN COUNT(*) > 0
        THEN CAST(ROUND(SUM(CASE WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS ontime_percent,
    95 AS target_percent,
    CASE
        WHEN COUNT(*) = 0 OR
             (SUM(CASE WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 95
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.project_deliverables pd
INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
INNER JOIN pms.projects p ON pm.project_id = p.id
INNER JOIN pms.employees e ON p.project_owner_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
WHERE e.is_active = 1
  AND p.is_active = 1
  AND pm.due_date IS NOT NULL
  AND pd.is_required = 1
GROUP BY YEAR(pm.due_date), MONTH(pm.due_date), DATEPART(QUARTER, pm.due_date),
         p.project_owner_id, e.employee_code, e.first_name, e.last_name, pos.name;
GO

-- 9. Issue Clearing (Personal KPI)
IF OBJECT_ID('pms.vw_kpi_issue_clearing', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_issue_clearing;
GO

CREATE VIEW pms.vw_kpi_issue_clearing AS
SELECT
    YEAR(t.due_date) AS year,
    MONTH(t.due_date) AS month,
    DATEPART(QUARTER, t.due_date) AS quarter,
    t.assignee_id AS employee_id,
    e.employee_code,
    e.first_name + ' ' + ISNULL(e.last_name, '') AS employee_name,
    ISNULL(pos.name, 'Unknown') AS position,
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS cleared_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count,
    SUM(CASE WHEN t.status = 'done_not_planned' THEN 1 ELSE 0 END) AS done_not_planned_count,
    SUM(CASE WHEN t.status NOT IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS pending_count,
    CASE
        WHEN COUNT(*) > 0
        THEN CAST(ROUND(SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS clearing_percent,
    85 AS target_percent,
    CASE
        WHEN COUNT(*) = 0 OR
             (SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 85
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id
WHERE t.assignee_id IS NOT NULL
  AND t.due_date IS NOT NULL
  AND e.is_active = 1
  AND t.is_active = 1
GROUP BY YEAR(t.due_date), MONTH(t.due_date), DATEPART(QUARTER, t.due_date),
         t.assignee_id, e.employee_code, e.first_name, e.last_name, pos.name;
GO

-- 10. Department KPI Summary View
IF OBJECT_ID('pms.vw_kpi_department_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_department_summary;
GO

CREATE VIEW pms.vw_kpi_department_summary AS
SELECT
    year,
    month,
    quarter,
    'Time to Delivery' AS kpi_name,
    'Performance' AS category,
    '>= 80%' AS target,
    AVG(time_to_delivery_percent) AS actual_value,
    80 AS target_value,
    CASE WHEN AVG(time_to_delivery_percent) >= 80 THEN 1 ELSE 0 END AS is_pass,
    'PM,PG,SA' AS affected_positions
FROM pms.vw_kpi_time_to_delivery
GROUP BY year, month, quarter

UNION ALL

SELECT
    year, month, quarter,
    'Man-day Control', 'Performance', '>= 85%',
    AVG(manday_control_percent), 85,
    CASE WHEN AVG(manday_control_percent) >= 85 THEN 1 ELSE 0 END,
    'PM,PG,SA'
FROM pms.vw_kpi_manday_control
GROUP BY year, month, quarter

UNION ALL

SELECT
    year, month, quarter,
    'Defect Ratio', 'Quality', '<= 15%',
    AVG(defect_ratio_percent), 15,
    CASE WHEN AVG(defect_ratio_percent) <= 15 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_defect_ratio
GROUP BY year, month, quarter

UNION ALL

SELECT
    year, month, quarter,
    'Post Go-live Rework', 'Quality', '<= 8%',
    AVG(rework_ratio_percent), 8,
    CASE WHEN AVG(rework_ratio_percent) <= 8 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_post_golive_rework
GROUP BY year, month, quarter

UNION ALL

SELECT
    year, month, quarter,
    'Deploy Success Rate', 'Quality', '>= 95%',
    AVG(success_rate_percent), 95,
    CASE WHEN AVG(success_rate_percent) >= 95 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_deploy_success
GROUP BY year, month, quarter

UNION ALL

SELECT
    year, month, quarter,
    'Pre-deploy Backup', 'Availability', '100%',
    AVG(backup_compliance_percent), 100,
    CASE WHEN AVG(backup_compliance_percent) = 100 THEN 1 ELSE 0 END,
    'PG'
FROM pms.vw_kpi_predeploy_backup
GROUP BY year, month, quarter;
GO

-- 11. Employee KPI Summary View
IF OBJECT_ID('pms.vw_kpi_employee_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_employee_summary;
GO

CREATE VIEW pms.vw_kpi_employee_summary AS
-- Issue Clearing
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'Issue Clearing' AS kpi_name,
    clearing_percent AS actual_value,
    85 AS target_value,
    is_pass,
    'PG,SA' AS affected_positions
FROM pms.vw_kpi_issue_clearing

UNION ALL

-- Meeting Minutes
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'On-time Meeting Minutes',
    CAST(late_count AS DECIMAL(5,2)),
    3,
    is_pass,
    'PM,SA'
FROM pms.vw_kpi_meeting_minutes

UNION ALL

-- Docs On-time
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'Required Docs On-time',
    ontime_percent,
    95,
    is_pass,
    'SA'
FROM pms.vw_kpi_docs_ontime;
GO

PRINT 'KPI Calculation Views created successfully!';
