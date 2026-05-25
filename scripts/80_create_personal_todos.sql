-- =============================================
-- Script 80: Personal ToDos
-- Description: Private per-user todo items shown on the Gantt Overview > ToDo tab.
--              Unlike team_tracking_entries these are NOT tied to a project.
--              Only the owner ever sees them.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'personal_todos')
BEGIN
    CREATE TABLE pms.personal_todos (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        owner_id        UNIQUEIDENTIFIER NOT NULL,        -- FK pms.employees, the creator/viewer
        title           NVARCHAR(MAX)    NOT NULL,        -- plain or HTML (sanitized client-side)
        due_date        DATE             NULL,
        status          NVARCHAR(20)     NOT NULL DEFAULT 'PLANNED',  -- 'PLANNED' | 'DONE'
        completed_date  DATE             NULL,
        color           NVARCHAR(50)     NULL,
        icon            NVARCHAR(50)     NULL,
        is_active       BIT              NOT NULL DEFAULT 1,
        created_at      DATETIME         NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME         NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_personal_todos_owner FOREIGN KEY (owner_id) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_personal_todos_owner_status
        ON pms.personal_todos(owner_id, status) WHERE is_active = 1;
    CREATE INDEX IX_personal_todos_owner_due
        ON pms.personal_todos(owner_id, due_date) WHERE is_active = 1;

    PRINT 'Created table pms.personal_todos';
END
ELSE
BEGIN
    PRINT 'Table pms.personal_todos already exists';
END

