-- =============================================
-- Update Defect Ratio View to use task_type_configs.is_defect
-- Created: 2026-01-23
-- Purpose: Use is_defect flag from task_type_configs instead of hardcoded task_type strings
-- =============================================

-- 1. First ensure is_defect column exists in task_type_configs
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.task_type_configs')
    AND name = 'is_defect'
)
BEGIN
    ALTER TABLE pms.task_type_configs ADD is_defect BIT DEFAULT 0;
    PRINT 'Added is_defect column to task_type_configs';
END
GO

-- 2. Update existing task types to mark defects
UPDATE pms.task_type_configs
SET is_defect = 1
WHERE LOWER(code) IN ('bug', 'defect', 'hotfix', 'bug_fix', 'rework')
   OR LOWER(name) LIKE '%bug%'
   OR LOWER(name) LIKE '%defect%';
PRINT 'Updated is_defect flag for existing task types';
GO

-- 3. Drop and recreate the Defect Ratio view to use task_type_configs.is_defect
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
        -- Check if task type is defect-related using task_type_configs.is_defect
        -- Fallback to hardcoded check if task_type not found in configs
        CASE
            WHEN ttc.is_defect = 1 THEN 1
            WHEN ttc.id IS NULL AND LOWER(t.task_type) IN ('bug', 'defect', 'hotfix', 'bug_fix', 'rework') THEN 1
            ELSE 0
        END AS is_defect,
        SUM(te.hours) / 7.0 AS mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    LEFT JOIN pms.task_type_configs ttc ON UPPER(t.task_type) = UPPER(ttc.code) AND ttc.is_active = 1
    WHERE te.entry_date IS NOT NULL
      AND p.is_active = 1
      AND t.is_active = 1
    GROUP BY t.id, s.project_id, p.project_code, p.name,
             YEAR(te.entry_date), MONTH(te.entry_date), DATEPART(QUARTER, te.entry_date),
             t.task_type, ttc.is_defect, ttc.id
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

-- 4. Also update Post Go-live Rework view to use task_type_configs.is_defect
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
                AND (ttc.is_defect = 1 OR (ttc.id IS NULL AND LOWER(t.task_type) IN ('bug', 'defect', 'hotfix', 'rework', 'bug_fix')))
            THEN te.hours / 7.0
            ELSE 0
        END) AS rework_mandays,
        SUM(te.hours / 7.0) AS total_mandays
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.projects p ON s.project_id = p.id
    LEFT JOIN ProjectGoLive gl ON s.project_id = gl.project_id
    LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
    LEFT JOIN pms.task_type_configs ttc ON UPPER(t.task_type) = UPPER(ttc.code) AND ttc.is_active = 1
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

PRINT 'Defect Ratio and Post Go-live Rework views updated to use task_type_configs.is_defect';
GO

-- 5. Update Department Summary View to calculate Defect Ratio from TOTALS (not AVG of percentages)
IF OBJECT_ID('pms.vw_kpi_department_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_department_summary;
GO

CREATE VIEW pms.vw_kpi_department_summary AS
-- Time to Delivery (unchanged - uses AVG which is correct for weighted calculation)
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

-- Man-day Control (unchanged)
SELECT
    year, month, quarter,
    'Man-day Control', 'Performance', '>= 85%',
    AVG(manday_control_percent), 85,
    CASE WHEN AVG(manday_control_percent) >= 85 THEN 1 ELSE 0 END,
    'PM,PG,SA'
FROM pms.vw_kpi_manday_control
GROUP BY year, month, quarter

UNION ALL

-- Defect Ratio - FIXED: Calculate from TOTALS instead of AVG
SELECT
    year, month, quarter,
    'Defect Ratio', 'Quality', '<= 15%',
    CASE
        WHEN SUM(total_mandays) > 0
        THEN CAST(ROUND(SUM(defect_mandays) * 100.0 / SUM(total_mandays), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS actual_value,
    15,
    CASE
        WHEN SUM(total_mandays) > 0 AND (SUM(defect_mandays) * 100.0 / SUM(total_mandays)) <= 15
        THEN 1 ELSE 0
    END,
    'PG,SA'
FROM pms.vw_kpi_defect_ratio
GROUP BY year, month, quarter

UNION ALL

-- Post Go-live Rework - FIXED: Calculate from TOTALS instead of AVG
SELECT
    year, month, quarter,
    'Post Go-live Rework', 'Quality', '<= 8%',
    CASE
        WHEN SUM(total_mandays) > 0
        THEN CAST(ROUND(SUM(rework_mandays) * 100.0 / SUM(total_mandays), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS actual_value,
    8,
    CASE
        WHEN SUM(total_mandays) > 0 AND (SUM(rework_mandays) * 100.0 / SUM(total_mandays)) <= 8
        THEN 1 ELSE 0
    END,
    'PG,SA'
FROM pms.vw_kpi_post_golive_rework
GROUP BY year, month, quarter

UNION ALL

-- Deploy Success Rate (unchanged)
SELECT
    year, month, quarter,
    'Deploy Success Rate', 'Quality', '>= 95%',
    AVG(success_rate_percent), 95,
    CASE WHEN AVG(success_rate_percent) >= 95 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_deploy_success
GROUP BY year, month, quarter

UNION ALL

-- Pre-deploy Backup (unchanged)
SELECT
    year, month, quarter,
    'Pre-deploy Backup', 'Availability', '100%',
    AVG(backup_compliance_percent), 100,
    CASE WHEN AVG(backup_compliance_percent) = 100 THEN 1 ELSE 0 END,
    'PG'
FROM pms.vw_kpi_predeploy_backup
GROUP BY year, month, quarter;
GO

PRINT 'Department Summary View updated - Defect Ratio now calculates from totals';
GO
