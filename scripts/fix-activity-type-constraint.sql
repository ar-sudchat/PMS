-- ============================================
-- Fix Activity Type Constraint in Timesheet Entries
-- Purpose: Remove strict CHECK constraint and allow any valid task_type from task_type_configs
-- ============================================

-- Step 1: Drop existing CHECK constraint
IF EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID('pms.CK_timesheet_activity_type'))
BEGIN
    ALTER TABLE pms.timesheet_entries DROP CONSTRAINT CK_timesheet_activity_type;
    PRINT 'Dropped existing CK_timesheet_activity_type constraint';
END
GO

-- Step 2: Add new flexible CHECK constraint
-- Instead of hardcoding values, we'll make it more flexible
-- Allow any non-empty string up to 50 characters
-- The application will validate against task_type_configs table
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID('pms.CK_timesheet_activity_type'))
BEGIN
    ALTER TABLE pms.timesheet_entries 
    ADD CONSTRAINT CK_timesheet_activity_type 
    CHECK (activity_type IS NOT NULL AND LEN(activity_type) > 0 AND LEN(activity_type) <= 50);
    
    PRINT 'Added new flexible CK_timesheet_activity_type constraint';
END
GO

-- Step 3: Update any NULL values to 'development' as default
UPDATE pms.timesheet_entries 
SET activity_type = 'development' 
WHERE activity_type IS NULL OR activity_type = '';
GO

PRINT 'Activity type constraint fix completed successfully!';
GO
