-- =============================================
-- Script 62: Milestone Notes & Change Logs
-- Description: Add tables for milestone notes/issues and due date change tracking
-- =============================================

-- Table 1: milestone_notes - Notes/issues attached to milestones or project-level
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'milestone_notes')
BEGIN
    CREATE TABLE pms.milestone_notes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        milestone_id UNIQUEIDENTIFIER NULL,              -- NULL = project-level note
        note_type NVARCHAR(20) NOT NULL DEFAULT 'NOTE',  -- NOTE, ISSUE, RESOLUTION
        priority NVARCHAR(10) NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, CRITICAL
        content NVARCHAR(MAX) NOT NULL,
        resolved_at DATETIME NULL,
        resolved_by UNIQUEIDENTIFIER NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_milestone_notes_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_milestone_notes_milestone FOREIGN KEY (milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_milestone_notes_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT FK_milestone_notes_resolved_by FOREIGN KEY (resolved_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_milestone_notes_project_id ON pms.milestone_notes(project_id);
    CREATE INDEX IX_milestone_notes_milestone_id ON pms.milestone_notes(milestone_id) WHERE milestone_id IS NOT NULL;
    CREATE INDEX IX_milestone_notes_created_at ON pms.milestone_notes(created_at DESC);

    PRINT 'Created table pms.milestone_notes'
END
GO

-- Table 2: milestone_change_logs - Track due date changes with reasons
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'milestone_change_logs')
BEGIN
    CREATE TABLE pms.milestone_change_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        milestone_id UNIQUEIDENTIFIER NOT NULL,
        change_type NVARCHAR(30) NOT NULL DEFAULT 'DUE_DATE_CHANGE',
        old_value NVARCHAR(200) NULL,
        new_value NVARCHAR(200) NULL,
        reason NVARCHAR(MAX) NOT NULL,
        changed_by UNIQUEIDENTIFIER NOT NULL,
        changed_at DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_ms_change_logs_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_ms_change_logs_milestone FOREIGN KEY (milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_ms_change_logs_changed_by FOREIGN KEY (changed_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_ms_change_logs_milestone_id ON pms.milestone_change_logs(milestone_id);
    CREATE INDEX IX_ms_change_logs_project_id ON pms.milestone_change_logs(project_id);
    CREATE INDEX IX_ms_change_logs_changed_at ON pms.milestone_change_logs(changed_at DESC);

    PRINT 'Created table pms.milestone_change_logs'
END
GO
