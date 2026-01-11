-- PM Dashboard: Simplified Health View (Fixed for actual schema)
-- Run this in Azure Data Studio

-- Drop if exists
IF OBJECT_ID('pms.vw_project_health', 'V') IS NOT NULL
    DROP VIEW pms.vw_project_health;
GO

CREATE VIEW pms.vw_project_health AS
SELECT 
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    ISNULL(c.name, '-') AS customer_name,
    ps.name AS status_name,
    p.project_year,
    
    -- Current Milestone
    cm.id AS current_milestone_id,
    cmc.name AS current_milestone_name,
    cm.due_date AS current_milestone_due_date,
    
    -- Milestone counts
    (SELECT COUNT(*) FROM pms.project_milestones pm WHERE pm.project_id = p.id) AS total_milestones,
    (SELECT COUNT(*) FROM pms.project_milestones pm WHERE pm.project_id = p.id AND pm.is_verified = 1) AS verified_milestones,
    (SELECT COUNT(*) FROM pms.project_milestones pm WHERE pm.project_id = p.id AND pm.completed_date IS NOT NULL) AS completed_milestones,
    
    -- Time Score (TTD) - based on verified milestones
    (SELECT 
        CASE WHEN COUNT(CASE WHEN pm.is_verified = 1 THEN 1 END) = 0 THEN NULL
        ELSE ROUND(CAST(SUM(CASE WHEN pm.kpi_ttd_pass = 1 AND pm.is_verified = 1 THEN pm.weight_ttd ELSE 0 END) AS FLOAT) / 
             NULLIF(SUM(CASE WHEN pm.is_verified = 1 THEN pm.weight_ttd ELSE 0 END), 0) * 100, 0)
        END
     FROM pms.project_milestones pm WHERE pm.project_id = p.id
    ) AS time_score,
    
    -- Resource Score (MDC)
    (SELECT 
        CASE WHEN COUNT(CASE WHEN pm.is_verified = 1 THEN 1 END) = 0 THEN NULL
        ELSE ROUND(CAST(SUM(CASE WHEN pm.kpi_mdc_pass = 1 AND pm.is_verified = 1 THEN pm.weight_mdc ELSE 0 END) AS FLOAT) / 
             NULLIF(SUM(CASE WHEN pm.is_verified = 1 THEN pm.weight_mdc ELSE 0 END), 0) * 100, 0)
        END
     FROM pms.project_milestones pm WHERE pm.project_id = p.id
    ) AS resource_score,
    
    -- Docs Score
    (SELECT 
        CASE WHEN COUNT(CASE WHEN pd.is_required = 1 THEN 1 END) = 0 THEN NULL
        ELSE ROUND(CAST(COUNT(CASE WHEN pd.is_required = 1 AND pd.submitted_date IS NOT NULL THEN 1 END) AS FLOAT) / 
             NULLIF(COUNT(CASE WHEN pd.is_required = 1 THEN 1 END), 0) * 100, 0)
        END
     FROM pms.project_deliverables pd 
     INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
     WHERE pm.project_id = p.id
    ) AS docs_score,
    
    -- Manday summary
    (SELECT ISNULL(SUM(planned_mandays), 0) FROM pms.project_milestones WHERE project_id = p.id) AS total_planned_md,
    (SELECT ISNULL(SUM(actual_mandays), 0) FROM pms.project_milestones WHERE project_id = p.id) AS total_actual_md

FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
LEFT JOIN pms.project_milestones cm ON p.current_milestone_id = cm.id
LEFT JOIN pms.milestone_configs cmc ON cm.milestone_config_id = cmc.id
WHERE p.is_active = 1;
GO

-- Test query
SELECT TOP 5 project_code, project_name, time_score, resource_score, docs_score FROM pms.vw_project_health;
