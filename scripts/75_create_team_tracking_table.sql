-- =============================================
-- Script 75: Team Tracking Entries
-- Description: Calendar-grid tracking entries (project x date x assignee)
-- Used by /team-tracking page
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'team_tracking_entries')
BEGIN
    CREATE TABLE pms.team_tracking_entries (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id      UNIQUEIDENTIFIER NOT NULL,
        entry_date      DATE             NOT NULL,
        assignee_id     UNIQUEIDENTIFIER NULL,       -- FK pms.employees (NULL = unassigned)
        assignee_role   NVARCHAR(20)     NULL,       -- 'SA' | 'EMPLOYEE' | 'PM' | etc.
        note            NVARCHAR(MAX)    NULL,
        color           NVARCHAR(50)     NULL,       -- hex or tailwind class
        color_source    NVARCHAR(20)     NOT NULL DEFAULT 'MANUAL',  -- 'MANUAL' | 'MILESTONE'
        milestone_id    UNIQUEIDENTIFIER NULL,       -- FK pms.project_milestones (optional)
        is_active       BIT              NOT NULL DEFAULT 1,
        created_by      UNIQUEIDENTIFIER NOT NULL,
        created_at      DATETIME         NOT NULL DEFAULT GETDATE(),
        updated_by      UNIQUEIDENTIFIER NULL,
        updated_at      DATETIME         NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_team_tracking_project   FOREIGN KEY (project_id)   REFERENCES pms.projects(id),
        CONSTRAINT FK_team_tracking_assignee  FOREIGN KEY (assignee_id)  REFERENCES pms.employees(id),
        CONSTRAINT FK_team_tracking_milestone FOREIGN KEY (milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_team_tracking_creator   FOREIGN KEY (created_by)   REFERENCES pms.employees(id),
        CONSTRAINT FK_team_tracking_updater   FOREIGN KEY (updated_by)   REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_team_tracking_project_date ON pms.team_tracking_entries(project_id, entry_date);
    CREATE INDEX IX_team_tracking_assignee     ON pms.team_tracking_entries(assignee_id)   WHERE assignee_id IS NOT NULL;
    CREATE INDEX IX_team_tracking_date         ON pms.team_tracking_entries(entry_date);

    PRINT 'Created table pms.team_tracking_entries'
END
ELSE
BEGIN
    PRINT 'Table pms.team_tracking_entries already exists'
END
GO
