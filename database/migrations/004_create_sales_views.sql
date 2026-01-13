-- 0. Add payment_amount to project_milestones if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'payment_amount')
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_amount DECIMAL(18,2) NULL;
END
GO

-- 1. Project Velocity View
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_project_velocity' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_project_velocity;
GO

CREATE VIEW pms.vw_project_velocity AS
SELECT 
    p.id AS project_id,
    p.created_at AS start_date,
    
    -- Task Counts
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status != 'done' AND t.status != 'cancelled' THEN 1 ELSE 0 END) AS remaining_tasks,
    
    -- Time Calculation
    DATEDIFF(DAY, p.created_at, GETDATE()) AS days_elapsed,
    
    -- Velocity (Tasks per Day)
    -- Avoid division by zero
    CASE 
        WHEN DATEDIFF(DAY, p.created_at, GETDATE()) > 0 
        THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / DATEDIFF(DAY, p.created_at, GETDATE())
        ELSE 0 
    END AS velocity_daily,
    
    -- Estimated Days to Complete Remaining
    CASE 
        -- If velocity is acceptable (> 0.1 tasks/day)
        WHEN (CASE 
                WHEN DATEDIFF(DAY, p.created_at, GETDATE()) > 0 
                THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / DATEDIFF(DAY, p.created_at, GETDATE())
                ELSE 0 
              END) > 0.1
        THEN CAST(
            (SUM(CASE WHEN t.status != 'done' AND t.status != 'cancelled' THEN 1 ELSE 0 END)) / 
            (CASE 
                WHEN DATEDIFF(DAY, p.created_at, GETDATE()) > 0 
                THEN CAST(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS FLOAT) / DATEDIFF(DAY, p.created_at, GETDATE())
                ELSE 0.1 -- Fallback to avoid div/0 in nested
             END) 
            AS INT)
        ELSE 999 -- High number if no velocity
    END AS estimated_days_remaining

FROM pms.projects p
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
LEFT JOIN pms.stories s ON s.project_id = p.id AND s.is_active = 1
LEFT JOIN pms.tasks t ON t.story_id = s.id AND t.is_active = 1
WHERE p.is_active = 1 AND psc.code = 'IN_PROGRESS'
GROUP BY p.id, p.project_code, p.created_at;
GO

-- 2. Sales Forecast Milestones View
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_sales_forecast_milestones' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_sales_forecast_milestones;
GO

CREATE VIEW pms.vw_sales_forecast_milestones AS
SELECT 
    pm.id AS milestone_id,
    pm.project_id,
    p.project_code,
    p.name AS project_name,
    p.project_owner_id AS pm_id, -- Assuming owner is PM
    pmc.name AS milestone_name,
    pm.status,
    pm.due_date,
    pm.payment_amount, -- Verify column exists or assume/add
    
    -- Forecast Logic
    -- If completed, use completed_date or today
    -- If not, use Today + Estimated Days from Velocity (for the specific project)
    CASE 
        WHEN pm.status = 'completed' THEN COALESCE(pm.completed_date, GETDATE())
        ELSE DATEADD(DAY, COALESCE(pv.estimated_days_remaining, 0), GETDATE())
    END AS forecast_date,
    
    -- Risk Calculation
    CASE 
        WHEN pm.status = 'completed' THEN 'completed'
        WHEN DATEADD(DAY, COALESCE(pv.estimated_days_remaining, 0), GETDATE()) > pm.due_date THEN 'delayed'
        ELSE 'on_track'
    END AS risk_status,
    
    -- Delay Days
    DATEDIFF(DAY, pm.due_date, 
        CASE 
            WHEN pm.status = 'completed' THEN COALESCE(pm.completed_date, GETDATE())
            ELSE DATEADD(DAY, COALESCE(pv.estimated_days_remaining, 0), GETDATE())
        END
    ) AS deviation_days

FROM pms.project_milestones pm
JOIN pms.projects p ON pm.project_id = p.id
JOIN pms.milestone_configs pmc ON pm.milestone_config_id = pmc.id
LEFT JOIN pms.vw_project_velocity pv ON p.id = pv.project_id
WHERE p.is_active = 1;
GO
