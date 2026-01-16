-- ============================================
-- Task KPI Flag Migration
-- ============================================
-- Purpose: Add is_count_for_kpi column to tasks table
-- This allows individual tasks to be excluded from KPI calculations
-- Default: 1 (true) - tasks count for KPI by default
-- ============================================

-- Add is_count_for_kpi column
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'is_count_for_kpi'
)
BEGIN
    ALTER TABLE pms.tasks
    ADD is_count_for_kpi BIT DEFAULT 1 NOT NULL;

    PRINT 'Added is_count_for_kpi column to pms.tasks';
END
GO

-- Update existing tasks to have is_count_for_kpi = 1 (default behavior)
UPDATE pms.tasks
SET is_count_for_kpi = 1
WHERE is_count_for_kpi IS NULL;

PRINT 'Updated existing tasks with default is_count_for_kpi = 1';
GO

-- Create index for KPI queries
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_tasks_kpi'
    AND object_id = OBJECT_ID('pms.tasks')
)
BEGIN
    CREATE INDEX IX_tasks_kpi
    ON pms.tasks(is_count_for_kpi, status, assignee_id)
    WHERE is_active = 1;

    PRINT 'Created index for KPI queries';
END
GO

-- Verification
SELECT
    is_count_for_kpi,
    COUNT(*) as count
FROM pms.tasks
WHERE is_active = 1
GROUP BY is_count_for_kpi;
GO

-- ============================================
-- USAGE NOTES:
-- ============================================
-- When calculating KPI statistics, add this filter:
--   AND is_count_for_kpi = 1
--
-- Example:
--   SELECT COUNT(*) as kpi_task_count
--   FROM pms.tasks
--   WHERE is_active = 1
--   AND is_count_for_kpi = 1  -- Only count tasks marked for KPI
--
-- For dashboard views that need to exclude non-KPI tasks,
-- update the WHERE clauses to include:
--   AND t.is_count_for_kpi = 1
-- ============================================
