-- Milestone Approval & Lock System Migration
-- Add columns for approval workflow

-- Add approval columns to project_milestones
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'is_approved')
BEGIN
    ALTER TABLE pms.project_milestones ADD is_approved BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'is_locked')
BEGIN
    ALTER TABLE pms.project_milestones ADD is_locked BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'approved_at')
BEGIN
    ALTER TABLE pms.project_milestones ADD approved_at DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'approved_by')
BEGIN
    ALTER TABLE pms.project_milestones ADD approved_by UNIQUEIDENTIFIER NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'approval_notes')
BEGIN
    ALTER TABLE pms.project_milestones ADD approval_notes NVARCHAR(500) NULL;
END
GO

-- Create index for approval queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_milestone_approved' AND object_id = OBJECT_ID('pms.project_milestones'))
BEGIN
    CREATE INDEX IX_milestone_approved ON pms.project_milestones(is_approved, is_locked);
END
GO

PRINT 'Milestone approval columns added successfully';
