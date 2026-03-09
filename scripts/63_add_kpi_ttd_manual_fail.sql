-- =============================================
-- Script 63: Add KPI TTD Manual Fail Flag
-- Description: Allow marking milestones as manually failed for Time to Delivery KPI
--              Used when project is still ongoing but milestone already failed
-- =============================================

-- Add column to project_milestones
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'kpi_ttd_manual_fail'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_ttd_manual_fail BIT NULL DEFAULT 0;
    PRINT 'Added column kpi_ttd_manual_fail to pms.project_milestones'
END
GO

-- Update KPI Time to Delivery View to include manually failed milestones
IF OBJECT_ID('pms.vw_kpi_time_to_delivery', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneDelivery AS (
    SELECT
        pm.project_id,
        p.project_code,
        p.name AS project_name,
        YEAR(ISNULL(pm.completed_date, pm.due_date)) AS year,
        MONTH(ISNULL(pm.completed_date, pm.due_date)) AS month,
        DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) AS quarter,
        mc.name AS milestone_name,
        pm.due_date,
        pm.completed_date,
        pm.kpi_ttd_manual_fail,
        -- Weight for Time to Delivery
        CASE
            -- Manual fail: count the weight so it affects the score
            WHEN ISNULL(pm.kpi_ttd_manual_fail, 0) = 1
            THEN COALESCE(pm.weight_ttd, mc.default_weight_ttd,
                CASE mc.name
                    WHEN 'Mapping Data' THEN 30
                    WHEN 'System Test' THEN 30
                    WHEN 'User Acceptance Test' THEN 20
                    WHEN 'Go-Live' THEN 10
                    WHEN 'Close Go-Live' THEN 10
                    ELSE 0
                END)
            -- Normal: only count if completed
            WHEN pm.completed_date IS NOT NULL
            THEN COALESCE(pm.weight_ttd, mc.default_weight_ttd,
                CASE mc.name
                    WHEN 'Mapping Data' THEN 30
                    WHEN 'System Test' THEN 30
                    WHEN 'User Acceptance Test' THEN 20
                    WHEN 'Go-Live' THEN 10
                    WHEN 'Close Go-Live' THEN 10
                    ELSE 0
                END)
            ELSE 0
        END AS milestone_weight,
        -- Achievement percent
        CASE
            -- Manual fail: score 0%
            WHEN ISNULL(pm.kpi_ttd_manual_fail, 0) = 1 THEN 0
            -- Normal calculation
            WHEN pm.completed_date IS NULL THEN 0
            WHEN pm.completed_date <= pm.due_date THEN 100
            WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
            WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
            ELSE 40
        END AS achievement_percent
    FROM pms.project_milestones pm
    INNER JOIN pms.projects p ON pm.project_id = p.id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE p.is_active = 1
      AND pm.due_date IS NOT NULL
      AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
      AND (pt.code IS NULL OR pt.code <> 'MKT')
)
SELECT
    year,
    month,
    quarter,
    project_id,
    project_code,
    project_name,
    CASE
        WHEN SUM(milestone_weight) > 0
        THEN CAST(ROUND(SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight), 2) AS DECIMAL(5,2))
        ELSE 0
    END AS time_to_delivery_percent,
    80 AS target_percent,
    CASE
        WHEN SUM(milestone_weight) > 0 AND
             (SUM(achievement_percent * milestone_weight) * 1.0 / SUM(milestone_weight)) >= 80
        THEN 1 ELSE 0
    END AS is_pass
FROM MilestoneDelivery
WHERE year IS NOT NULL
GROUP BY year, month, quarter, project_id, project_code, project_name
HAVING SUM(milestone_weight) > 0;
GO

PRINT 'Updated view: pms.vw_kpi_time_to_delivery (includes manual fail flag)';
GO
