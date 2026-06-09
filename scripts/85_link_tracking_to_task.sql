-- =============================================
-- Script 85: Link team_tracking_entries to tasks
-- Description: Adds an optional FK so a tracking entry can be promoted into a
--              full Task (pms.tasks). Prevents duplicates and lets the UI show a
--              "linked task" badge instead of the convert button.
--              Idempotent — checks before adding.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.team_tracking_entries') AND name = 'task_id')
BEGIN
    ALTER TABLE pms.team_tracking_entries ADD task_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added task_id';
END
ELSE
BEGIN
    PRINT 'task_id already exists';
END

-- Optional FK — only if not already present and the referenced table exists.
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_tracking_task'
)
BEGIN
    ALTER TABLE pms.team_tracking_entries
        ADD CONSTRAINT FK_tracking_task FOREIGN KEY (task_id) REFERENCES pms.tasks(id);
    PRINT 'Added FK_tracking_task';
END
