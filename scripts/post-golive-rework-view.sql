-- Post Go-Live Rework Ratio KPI View
-- Run this script in SQL Server Management Studio

-- Part 1: Update existing milestone data
UPDATE pms.milestone_configs SET is_go_live = 1 WHERE code = 'GOLIVE';
UPDATE pms.milestone_configs SET is_post_go_live = 1 WHERE code = 'CLOSEGOLIVE';
GO

-- Part 2: View for Post Go-Live Rework calculation
CREATE OR ALTER VIEW pms.vw_post_golive_rework AS
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
    WHERE pm_golive.completed_date IS NOT NULL
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

    -- Total Manday (all work on project)
    ISNULL((
        SELECT SUM(ts.hours) / 8.0
        FROM pms.timesheet_entries ts
        INNER JOIN pms.tasks t ON ts.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = pm.project_id
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
LEFT JOIN pms.employees e ON pm.project_owner_id = e.id
GO

-- Verify view
SELECT * FROM pms.vw_post_golive_rework ORDER BY project_year DESC, project_code;
GO
