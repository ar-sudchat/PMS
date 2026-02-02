-- =============================================
-- Fix Pre-deploy Backup KPI View
-- Created: 2026-01-23
-- Issue: View was using is_verified but should use is_passed (Result Pass/Fail)
-- =============================================

-- Update Pre-deploy Backup View to use is_passed instead of is_verified
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
    -- Use is_passed (Result Pass/Fail) instead of is_verified
    COUNT(DISTINCT CASE WHEN b.is_passed = 1 THEN b.id END) AS passed_backups,
    CASE
        WHEN COUNT(DISTINCT b.id) > 0
        THEN CAST(ROUND(COUNT(DISTINCT CASE WHEN b.is_passed = 1 THEN b.id END) * 100.0 /
             COUNT(DISTINCT b.id), 2) AS DECIMAL(5,2))
        ELSE 100
    END AS backup_compliance_percent,
    100 AS target_percent,
    CASE
        WHEN COUNT(DISTINCT b.id) = 0 OR
             COUNT(DISTINCT CASE WHEN b.is_passed = 1 THEN b.id END) = COUNT(DISTINCT b.id)
        THEN 1 ELSE 0
    END AS is_pass
FROM pms.deploy_backup_records b
INNER JOIN pms.backup_sources bs ON b.backup_source_id = bs.id
GROUP BY YEAR(b.backup_date), MONTH(b.backup_date), DATEPART(QUARTER, b.backup_date),
         b.backup_source_id, bs.code, bs.name;
GO

PRINT 'Pre-deploy Backup view updated - now uses is_passed (Result Pass/Fail) instead of is_verified';
GO

-- Update Department Summary View
IF OBJECT_ID('pms.vw_kpi_department_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_department_summary;
GO

CREATE VIEW pms.vw_kpi_department_summary AS
-- Time to Delivery
SELECT
    year, month, quarter,
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

-- Man-day Control
SELECT
    year, month, quarter,
    'Man-day Control', 'Performance', '>= 85%',
    AVG(manday_control_percent), 85,
    CASE WHEN AVG(manday_control_percent) >= 85 THEN 1 ELSE 0 END,
    'PM,PG,SA'
FROM pms.vw_kpi_manday_control
GROUP BY year, month, quarter

UNION ALL

-- Defect Ratio - Calculate from TOTALS
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

-- Post Go-live Rework - Calculate from TOTALS
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

-- Deploy Success Rate
SELECT
    year, month, quarter,
    'Deploy Success Rate', 'Quality', '>= 95%',
    AVG(success_rate_percent), 95,
    CASE WHEN AVG(success_rate_percent) >= 95 THEN 1 ELSE 0 END,
    'PG,SA'
FROM pms.vw_kpi_deploy_success
GROUP BY year, month, quarter

UNION ALL

-- Pre-deploy Backup
SELECT
    year, month, quarter,
    'Pre-deploy Backup', 'Availability', '100%',
    AVG(backup_compliance_percent), 100,
    CASE WHEN AVG(backup_compliance_percent) = 100 THEN 1 ELSE 0 END,
    'PG'
FROM pms.vw_kpi_predeploy_backup
GROUP BY year, month, quarter;
GO

PRINT 'Department Summary View updated';
GO
