
-- 4. Mock Data: Milestone Configs
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

-- 5. Mock Data: Task Type Configs
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

-- 6. Mock Data for Project 1303
DECLARE @ProjectCode NVARCHAR(50) = '1303';
DECLARE @ProjectId UNIQUEIDENTIFIER;

-- Find or Create Project 1303
SELECT @ProjectId = id FROM pms.projects WHERE project_code = '1303';

IF @ProjectId IS NOT NULL
BEGIN
    -- Insert/Update Milestones for Project
    -- Mapping: 'completed', 'in_progress', 'pending'
    DECLARE @PMilestones TABLE (code NVARCHAR(50), status NVARCHAR(20), progress INT);
    INSERT INTO @PMilestones VALUES 
    ('MAPPING', 'completed', 100),
    ('SYSTEMTEST', 'in_progress', 75),
    ('UAT', 'in_progress', 20),
    ('GOLIVE', 'pending', 0),
    ('CLOSEGOLIVE', 'pending', 0);

    DECLARE @MCode NVARCHAR(50), @MStatus NVARCHAR(20), @MProgress INT;
    DECLARE @MConfigId UNIQUEIDENTIFIER;

    DECLARE cur CURSOR FOR SELECT code, status, progress FROM @PMilestones;
    OPEN cur;
    FETCH NEXT FROM cur INTO @MCode, @MStatus, @MProgress;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @MConfigId = id FROM pms.milestone_configs WHERE code = @MCode;
        
        IF @MConfigId IS NOT NULL
        BEGIN
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
        END

        FETCH NEXT FROM cur INTO @MCode, @MStatus, @MProgress;
    END
    CLOSE cur;
    DEALLOCATE cur;

    -- Stories and Tasks
    DECLARE @MId_Mapping UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.project_milestones WHERE project_id = @ProjectId AND milestone_config_id = (SELECT id FROM pms.milestone_configs WHERE code = 'MAPPING'));
    DECLARE @MId_ST UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.project_milestones WHERE project_id = @ProjectId AND milestone_config_id = (SELECT id FROM pms.milestone_configs WHERE code = 'SYSTEMTEST'));

    -- Mapping Stories: 'done', 'in_progress', 'backlog' ('todo' not allowed for stories?)
    -- Valid Story Status: cancelled, done, review, in_progress, ready, backlog
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
        (NEWID(), @ProjectId, @MId_ST, 'S-004', 'Performance Test', 'backlog');
    END

    -- Tasks
    DECLARE @StoryId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM pms.stories WHERE project_id = @ProjectId AND story_code = 'S-003');

    -- Valid Task Status: cancelled, blocked, done, review, in_progress, todo
    IF @StoryId IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pms.tasks WHERE story_id = @StoryId AND task_type = 'BUG_FIX')
        BEGIN
            INSERT INTO pms.tasks (id, story_id, task_code, title, task_type, status, estimated_hours)
            VALUES (NEWID(), @StoryId, 'T-BUG-01', 'Fix login crash', 'BUG_FIX', 'done', 2.0);
        END
        
        IF NOT EXISTS (SELECT 1 FROM pms.tasks WHERE story_id = @StoryId AND task_type = 'DEVELOPMENT')
        BEGIN
            INSERT INTO pms.tasks (id, story_id, task_code, title, task_type, status, estimated_hours)
            VALUES (NEWID(), @StoryId, 'T-DEV-01', 'Implement login API', 'DEVELOPMENT', 'done', 8.0);
        END
    END
END
ELSE
BEGIN
    PRINT 'Project 1303 not found in DB. Please create it manually or add insert logic.';
END

PRINT 'Mock Data Inserted.';
