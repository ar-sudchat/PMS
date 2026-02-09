-- =============================================
-- Add verification columns to project_milestones table
-- Created: 2026-02-08
-- Purpose: Allow milestone verification status tracking
-- =============================================

-- Add is_verified column
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'is_verified'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD is_verified BIT DEFAULT 0;
    PRINT 'Added is_verified column to project_milestones';
END
GO

-- Add verified_at column
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'verified_at'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD verified_at DATETIME2 NULL;
    PRINT 'Added verified_at column to project_milestones';
END
GO

-- Add verified_by column
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'verified_by'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD verified_by UNIQUEIDENTIFIER NULL;
    PRINT 'Added verified_by column to project_milestones';
END
GO

-- Add support_end_date column
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'support_end_date'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD support_end_date DATE NULL;
    PRINT 'Added support_end_date column to project_milestones';
END
GO

-- Add approved_at column (if missing)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'approved_at'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD approved_at DATETIME2 NULL;
    PRINT 'Added approved_at column to project_milestones';
END
GO

-- Add kpi_docs_pass column (if missing)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'kpi_docs_pass'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_docs_pass BIT NULL;
    PRINT 'Added kpi_docs_pass column to project_milestones';
END
GO

PRINT 'Migration complete: Milestone verification columns added';
GO
