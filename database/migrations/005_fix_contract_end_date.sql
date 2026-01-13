-- 1. Add contract_end_date to projects table if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'contract_end_date')
BEGIN
    ALTER TABLE pms.projects ADD contract_end_date DATE NULL;
END
GO

-- 2. Add end_date (Project End Date) if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'end_date')
BEGIN
    ALTER TABLE pms.projects ADD end_date DATE NULL;
END
GO

-- 3. Add actual_mandays if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'actual_mandays')
BEGIN
    ALTER TABLE pms.projects ADD actual_mandays DECIMAL(10,2) DEFAULT 0 WITH VALUES;
END
GO

-- 4. Create or Update vw_dashboard_my_projects_by_member
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_dashboard_my_projects_by_member' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_dashboard_my_projects_by_member;
GO

CREATE VIEW pms.vw_dashboard_my_projects_by_member AS
SELECT DISTINCT
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    psc.name AS status_name,
    psc.color AS status_color,
    
    -- Stories
    (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.is_active = 1) AS total_stories,
    (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.is_active = 1 AND s.status = 'done') AS completed_stories,
    
    -- Tasks  
    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.is_active = 1) AS total_tasks,
    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.is_active = 1 AND t.status = 'done') AS completed_tasks,
    
    -- Mandays
    p.sold_mandays,
    p.actual_mandays AS used_mandays,
    
    -- Dates
    p.contract_end_date,
    p.end_date,
    
    -- Health status
    CASE 
        WHEN p.end_date < CAST(GETDATE() AS DATE) THEN 'overdue'
        WHEN p.end_date < DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN 'at_risk'
        ELSE 'on_track'
    END AS health_status,
    
    -- Owners and Members
    p.project_manager_id AS owner_id, 
    t.assignee_id AS team_member_id
    
FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
LEFT JOIN pms.stories s ON s.project_id = p.id AND s.is_active = 1
LEFT JOIN pms.tasks t ON t.story_id = s.id AND t.is_active = 1
WHERE p.is_active = 1;
GO
