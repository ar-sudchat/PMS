-- Post Go-Live Rework Ratio KPI View
-- Run this script in SQL Server Management Studio

-- Part 1: Update existing milestone data
UPDATE pms.milestone_configs SET is_go_live = 1 WHERE code = 'GOLIVE';
UPDATE pms.milestone_configs SET is_post_go_live = 1 WHERE code = 'CLOSEGOLIVE';
GO

-- Part 2: View for Post Go-Live Rework calculation
-- Uses sold_mandays from project as total_manday (budget)
-- Uses timesheet hours after Go-Live as rework_manday
-- Fixed: Uses TOP 1 subquery to avoid duplicate rows from multiple milestone matches
CREATE OR ALTER VIEW pms.vw_post_golive_rework AS
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
    -- Exclude MKT projects
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1
      AND (pt.code IS NULL OR pt.code <> 'MKT')
      -- Only projects that have a completed Go-Live milestone
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

    -- Total Manday = Budget (sold_mandays from project)
    pm.sold_mandays AS total_manday,

    -- Rework Manday (timesheet hours after Go-Live, converted to mandays)
    ISNULL((
        SELECT SUM(ts.hours) / 7.0
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
