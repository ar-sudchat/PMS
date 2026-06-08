-- =============================================
-- Script 83: Actual start / duration on project_milestones
-- Description: Adds editable "เริ่มจริง / เวลาจริง" fields used by the
--              project Gantt popup's planned-vs-actual table.
--              Idempotent — checks before adding each column.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'actual_start_date')
BEGIN
    ALTER TABLE pms.project_milestones ADD actual_start_date DATE NULL;
    PRINT 'Added actual_start_date';
END
ELSE
BEGIN
    PRINT 'actual_start_date already exists';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'actual_duration_days')
BEGIN
    ALTER TABLE pms.project_milestones ADD actual_duration_days INT NULL;
    PRINT 'Added actual_duration_days';
END
ELSE
BEGIN
    PRINT 'actual_duration_days already exists';
END
