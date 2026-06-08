-- =============================================
-- Script 84: Planned start date on project_milestones
-- Description: Adds editable "เริ่ม" field so each milestone can store its own
--              planned start (otherwise we derive from prev milestone's due_date).
--              Idempotent — checks before adding.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'planned_start_date')
BEGIN
    ALTER TABLE pms.project_milestones ADD planned_start_date DATE NULL;
    PRINT 'Added planned_start_date';
END
ELSE
BEGIN
    PRINT 'planned_start_date already exists';
END
