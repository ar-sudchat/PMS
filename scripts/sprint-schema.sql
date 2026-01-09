-- Sprint Management Schema
-- ============================================

-- Create Sprints Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sprints' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.sprints (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        sprint_code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        goal NVARCHAR(MAX) NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'planned',
        project_id UNIQUEIDENTIFIER NULL,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        
        CONSTRAINT FK_sprints_projects FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_sprints_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_sprints_updated_by FOREIGN KEY (updated_by) REFERENCES pms.employees(id),
        CONSTRAINT CK_sprints_status CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
        CONSTRAINT CK_sprints_dates CHECK (end_date >= start_date)
    );
    
    CREATE INDEX IX_sprints_project_id ON pms.sprints(project_id);
    CREATE INDEX IX_sprints_status ON pms.sprints(status);
    CREATE INDEX IX_sprints_dates ON pms.sprints(start_date, end_date);
    
    PRINT 'Table pms.sprints created successfully';
END
GO

-- Add sprint_id to tasks table if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'sprint_id')
BEGIN
    ALTER TABLE pms.tasks ADD sprint_id UNIQUEIDENTIFIER NULL;
    ALTER TABLE pms.tasks ADD CONSTRAINT FK_tasks_sprints FOREIGN KEY (sprint_id) REFERENCES pms.sprints(id);
    CREATE INDEX IX_tasks_sprint_id ON pms.tasks(sprint_id);
    
    PRINT 'Added sprint_id column to pms.tasks';
END
GO

-- View: Sprints with Task Stats
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_sprints_with_tasks' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_sprints_with_tasks;
GO

CREATE VIEW pms.vw_sprints_with_tasks AS
SELECT 
    s.id,
    s.sprint_code,
    s.name,
    s.goal,
    s.start_date,
    s.end_date,
    s.status,
    s.project_id,
    p.project_code,
    p.name AS project_name,
    
    -- Task counts
    COUNT(t.id) AS tasks_count,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
    SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
    
    -- Hours
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours,
    
    -- Dates
    DATEDIFF(DAY, s.start_date, s.end_date) + 1 AS duration_days,
    CASE 
        WHEN CAST(GETDATE() AS DATE) < s.start_date THEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.start_date)
        WHEN CAST(GETDATE() AS DATE) > s.end_date THEN 0
        ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.end_date)
    END AS days_remaining,
    
    s.created_at,
    s.updated_at
    
FROM pms.sprints s
LEFT JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.tasks t ON t.sprint_id = s.id AND t.is_active = 1
WHERE s.is_active = 1
GROUP BY 
    s.id, s.sprint_code, s.name, s.goal, s.start_date, s.end_date, 
    s.status, s.project_id, p.project_code, p.name, s.created_at, s.updated_at;
GO

PRINT 'Sprint schema created successfully';
