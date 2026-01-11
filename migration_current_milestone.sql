IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'current_milestone_id')
BEGIN
    ALTER TABLE pms.projects ADD current_milestone_id UNIQUEIDENTIFIER NULL;
    
    ALTER TABLE pms.projects 
    ADD CONSTRAINT FK_projects_current_milestone 
    FOREIGN KEY (current_milestone_id) REFERENCES pms.project_milestones(id);
    
    PRINT 'Added current_milestone_id to pms.projects';
END
ELSE
BEGIN
    PRINT 'current_milestone_id already exists';
END
