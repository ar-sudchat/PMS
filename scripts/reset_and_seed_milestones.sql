-- ============================================
-- RESET & SEED SCRIPT (FINAL VERSION)
-- 1. Clear all project related data
-- 2. Seed default milestones with ALL required columns
-- ============================================

BEGIN TRANSACTION;

BEGIN TRY
    PRINT 'Starting Data Reset...';

    -- 1. Unlink Current Milestone from Projects
    UPDATE pms.projects SET current_milestone_id = NULL;
    PRINT 'Cleared current_milestone_id from projects';

    -- 2. DELETE Timesheet Entries
    DELETE FROM pms.timesheet_entries;
    PRINT 'Deleted all timesheet entries';

    -- 3. Delete Data
    DELETE FROM pms.tasks;
    PRINT 'Deleted all tasks';

    DELETE FROM pms.stories;
    PRINT 'Deleted all stories';

    DELETE FROM pms.project_deliverables;
    PRINT 'Deleted all project deliverables';

    DELETE FROM pms.project_milestones;
    PRINT 'Deleted all project milestones';
    
    -- 4. Seed Default Milestones
    PRINT 'Seeding Default Milestones...';

    INSERT INTO pms.project_milestones 
    (
        id,  
        project_id, 
        milestone_config_id, 
        sort_order, 
        status, 
        
        -- STATS
        progress_percent, -- NOT NULL
        weight_percent,   -- NULLable but setting to 0 for safety
        planned_mandays,  -- NULLable
        actual_mandays,   -- NULLable

        -- FLAGS
        is_approved,      -- NOT NULL
        is_locked,        -- NOT NULL
        is_verified,      -- NOT NULL (Added based on DDL)

        created_at, 
        updated_at
    )
    SELECT 
        NEWID(), 
        p.id AS project_id,
        mc.id AS milestone_config_id,
        mc.sort_order,
        'pending' AS status,
        
        -- STATS
        0, -- progress_percent
        0, -- weight_percent
        0, -- planned_mandays
        0, -- actual_mandays

        -- FLAGS
        0, -- is_approved
        0, -- is_locked
        0, -- is_verified

        GETDATE(),
        GETDATE()
    FROM pms.projects p
    CROSS JOIN pms.milestone_configs mc
    WHERE p.is_active = 1 AND mc.is_active = 1;

    -- 5. Update Project Current Milestone (Set to first one: Requirement)
    UPDATE p 
    SET current_milestone_id = pm.id
    FROM pms.projects p
    JOIN pms.project_milestones pm ON p.id = pm.project_id
    JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE mc.code = 'REQ';
    
    PRINT 'Set initial current_milestone_id to Requirement';

    COMMIT TRANSACTION;
    PRINT '============================================';
    PRINT 'SUCCESS: Project data cleared and milestones re-seeded.';
    PRINT '============================================';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '============================================';
    PRINT 'ERROR: ' + ERROR_MESSAGE();
    PRINT '============================================';
END CATCH;
