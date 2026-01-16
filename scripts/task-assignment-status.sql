-- ============================================
-- Task Assignment Status Migration
-- ============================================
-- Purpose: Add assignment_status column to track task assignment workflow
-- Values:
--   'requested' - SA created/requested the task (default)
--   'assigned'  - PM assigned/approved the task
-- ============================================

-- Add assignment_status column
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'assignment_status'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD assignment_status NVARCHAR(20) DEFAULT 'requested' NOT NULL;

    PRINT 'Added assignment_status column to pms.tasks';
END
GO

-- Add constraint for valid values
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_tasks_assignment_status'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD CONSTRAINT CK_tasks_assignment_status
    CHECK (assignment_status IN ('requested', 'assigned'));

    PRINT 'Added check constraint for assignment_status';
END
GO

-- Add assigned_by column to track who assigned the task
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'assigned_by'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD assigned_by UNIQUEIDENTIFIER NULL;

    PRINT 'Added assigned_by column to pms.tasks';
END
GO

-- Add assigned_at column to track when task was assigned
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'assigned_at'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD assigned_at DATETIME2 NULL;

    PRINT 'Added assigned_at column to pms.tasks';
END
GO

-- Update existing tasks: if they have an assignee, mark as 'assigned'
UPDATE pms.tasks
SET assignment_status = 'assigned',
    assigned_at = ISNULL(updated_at, created_at)
WHERE assignee_id IS NOT NULL
AND assignment_status = 'requested';

PRINT 'Updated existing assigned tasks to assignment_status = assigned';
GO

-- Create index for filtering by assignment_status
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_tasks_assignment_status'
    AND object_id = OBJECT_ID('pms.tasks')
)
BEGIN
    CREATE INDEX IX_tasks_assignment_status
    ON pms.tasks(assignment_status)
    WHERE is_active = 1;

    PRINT 'Created index on assignment_status';
END
GO

-- Verification
SELECT
    assignment_status,
    COUNT(*) as count
FROM pms.tasks
WHERE is_active = 1
GROUP BY assignment_status;
GO
