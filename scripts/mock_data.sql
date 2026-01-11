
-- 1. Ensure pms.task_type_configs has is_defect column
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_type_configs' AND COLUMN_NAME = 'is_defect')
BEGIN
    ALTER TABLE pms.task_type_configs ADD is_defect BIT DEFAULT 0;
END

-- 2. Create pms.milestone_configs if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs')
BEGIN
    CREATE TABLE pms.milestone_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100),
        kpi_weight_ttd DECIMAL(5,2) DEFAULT 0,
        kpi_weight_mdc DECIMAL(5,2) DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'kpi_weight_ttd')
    BEGIN
        ALTER TABLE pms.milestone_configs ADD kpi_weight_ttd DECIMAL(5,2) DEFAULT 0;
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'kpi_weight_mdc')
    BEGIN
        ALTER TABLE pms.milestone_configs ADD kpi_weight_mdc DECIMAL(5,2) DEFAULT 0;
    END
END

-- 3. Mock Data: Milestone Configs
DECLARE @Milestones TABLE (code NVARCHAR(50), name NVARCHAR(100), weight_ttd DECIMAL(5,2), weight_mdc DECIMAL(5,2), sort_order INT);
INSERT INTO @Milestones VALUES 
('MAPPING', 'Mapping Data', 35, 30, 10),
('SYSTEMTEST', 'System Test', 20, 30, 20),
('UAT', 'UAT', 30, 20, 30),
('GOLIVE', 'Go-Live', 15, 10, 40),
('CLOSEGOLIVE', 'Close Go-Live', 0, 10, 50);

MERGE pms.milestone_configs AS Target
USING @Milestones AS Source
ON (Target.code = Source.code)
WHEN MATCHED THEN
    UPDATE SET 
        name = Source.name,
        kpi_weight_ttd = Source.weight_ttd,
        kpi_weight_mdc = Source.weight_mdc,
        sort_order = Source.sort_order
WHEN NOT MATCHED THEN
    INSERT (id, code, name, kpi_weight_ttd, kpi_weight_mdc, sort_order)
    VALUES (NEWID(), Source.code, Source.name, Source.weight_ttd, Source.weight_mdc, Source.sort_order);

-- 4. Mock Data: Task Type Configs
DECLARE @TaskTypes TABLE (code NVARCHAR(50), name NVARCHAR(100), is_defect BIT);
INSERT INTO @TaskTypes VALUES 
('DEVELOPMENT', 'Development', 0),
('BUG_FIX', 'Bug Fix', 1),
('DESIGN', 'Design', 0),
('TESTING', 'Testing', 0),
('DOCUMENTATION', 'Documentation', 0),
('MEETING', 'Meeting', 0),
('SUPPORT', 'Support', 0),
('DEPLOYMENT', 'Deployment', 0);

MERGE pms.task_type_configs AS Target
USING @TaskTypes AS Source
ON (Target.code = Source.code)
WHEN MATCHED THEN
    UPDATE SET 
        name = Source.name,
        is_defect = Source.is_defect
WHEN NOT MATCHED THEN
    INSERT (id, code, name, is_defect)
    VALUES (NEWID(), Source.code, Source.name, Source.is_defect);

-- 5. Mock Data for Project 1303
DECLARE @ProjectCode NVARCHAR(50) = '1303';
DECLARE @ProjectId UNIQUEIDENTIFIER;

-- Find or Create Project 1303
SELECT @ProjectId = id FROM pms.projects WHERE project_code = '1303';

IF @ProjectId IS NULL
BEGIN
    SET @ProjectId = NEWID();
    INSERT INTO pms.projects (id, project_code, name, status_id) -- Assuming minimal columns
    VALUES (@ProjectId, '1303', 'Mock Project 1303', (SELECT TOP 1 id FROM pms.project_statuses));
END

-- 5.1 Project Milestones (Linked to Configs)
-- We need to ensure pms.project_milestones has milestone_config_id or we map by code/name
-- Inspect schema showed no milestone_config_id. We might need to add it or use name.
-- Let's check if we can add it.
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'milestone_config_id')
BEGIN
    ALTER TABLE pms.project_milestones ADD milestone_config_id UNIQUEIDENTIFIER;
END

-- Insert/Update Milestones for Project
DECLARE @PMilestones TABLE (code NVARCHAR(50), status NVARCHAR(20), progress INT);
INSERT INTO @PMilestones VALUES 
('MAPPING', 'done', 100),
('SYSTEMTEST', 'in_progress', 75),
('UAT', 'in_progress', 20),
('GOLIVE', 'todo', 0),
('CLOSEGOLIVE', 'todo', 0);

-- Loop/Cursor to insert project milestones
DECLARE @MCode NVARCHAR(50), @MStatus NVARCHAR(20), @MProgress INT;
DECLARE @MConfigId UNIQUEIDENTIFIER;

DECLARE cur CURSOR FOR SELECT code, status, progress FROM @PMilestones;
OPEN cur;
FETCH NEXT FROM cur INTO @MCode, @MStatus, @MProgress;

WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @MConfigId = id FROM pms.milestone_configs WHERE code = @MCode;
    
    -- Check if exists
    IF NOT EXISTS (SELECT 1 FROM pms.project_milestones WHERE project_id = @ProjectId AND milestone_config_id = @MConfigId)
    BEGIN
        INSERT INTO pms.project_milestones (id, project_id, milestone_config_id, status, progress_percent, created_at, updated_at)
        VALUES (NEWID(), @ProjectId, @MConfigId, @MStatus, @MProgress, GETDATE(), GETDATE());
    END
    ELSE
    BEGIN
        UPDATE pms.project_milestones 
        SET status = @MStatus, progress_percent = @MProgress 
        WHERE project_id = @ProjectId AND milestone_config_id = @MConfigId;
    END

    FETCH NEXT FROM cur INTO @MCode, @MStatus, @MProgress;
END
CLOSE cur;
DEALLOCATE cur;

-- 5.2 Stories and Tasks
-- We will create some dummy stories linked to these milestones
-- Retrieve Milestone IDs
DECLARE @MId_Mapping UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.project_milestones WHERE project_id = @ProjectId AND milestone_config_id = (SELECT id FROM pms.milestone_configs WHERE code = 'MAPPING'));
DECLARE @MId_ST UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.project_milestones WHERE project_id = @ProjectId AND milestone_config_id = (SELECT id FROM pms.milestone_configs WHERE code = 'SYSTEMTEST'));

-- Create Stories
IF @MId_Mapping IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pms.stories WHERE project_id = @ProjectId AND milestone_id = @MId_Mapping)
BEGIN
    INSERT INTO pms.stories (id, project_id, milestone_id, story_code, title, status)
    VALUES 
    (NEWID(), @ProjectId, @MId_Mapping, 'S-001', 'Map Customer Table', 'done'),
    (NEWID(), @ProjectId, @MId_Mapping, 'S-002', 'Map Order Table', 'done');
END

IF @MId_ST IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pms.stories WHERE project_id = @ProjectId AND milestone_id = @MId_ST)
BEGIN
    INSERT INTO pms.stories (id, project_id, milestone_id, story_code, title, status)
    VALUES 
    (NEWID(), @ProjectId, @MId_ST, 'S-003', 'End-to-End Flow Test', 'in_progress'),
    (NEWID(), @ProjectId, @MId_ST, 'S-004', 'Performance Test', 'todo');
END

-- 5.3 Tasks (Bug Fixes for Defect Ratio)
-- Find a story
DECLARE @StoryId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.stories WHERE project_id = @ProjectId AND story_code = 'S-003');

IF @StoryId IS NOT NULL
BEGIN
    -- Add Bug Fix Task
    IF NOT EXISTS (SELECT 1 FROM pms.tasks WHERE story_id = @StoryId AND task_type = 'BUG_FIX')
    BEGIN
        INSERT INTO pms.tasks (id, story_id, task_code, title, task_type, status, estimated_hours)
        VALUES (NEWID(), @StoryId, 'T-BUG-01', 'Fix login crash', 'BUG_FIX', 'done', 2.0);
    END
    
    -- Add Dev Task
    IF NOT EXISTS (SELECT 1 FROM pms.tasks WHERE story_id = @StoryId AND task_type = 'DEVELOPMENT')
    BEGIN
        INSERT INTO pms.tasks (id, story_id, task_code, title, task_type, status, estimated_hours)
        VALUES (NEWID(), @StoryId, 'T-DEV-01', 'Implement login API', 'DEVELOPMENT', 'done', 8.0);
    END
END

PRINT 'Mock Data Setup Complete';
