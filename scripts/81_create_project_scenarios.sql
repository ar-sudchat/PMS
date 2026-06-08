-- =============================================
-- Script 81: Project Scenarios (What-if planning)
-- Description: Per-project "what-if" plans where a user can override
--              milestone due dates without touching live data.
--              Multiple named scenarios per project. Owner-scoped (any
--              project viewer can read; only the creator can edit/delete).
-- =============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'project_scenarios')
BEGIN
    CREATE TABLE pms.project_scenarios (
        id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id      UNIQUEIDENTIFIER NOT NULL,
        name            NVARCHAR(200)    NOT NULL,
        notes           NVARCHAR(MAX)    NULL,
        created_by      UNIQUEIDENTIFIER NOT NULL,
        created_at      DATETIME         NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME         NOT NULL DEFAULT GETDATE(),
        is_active       BIT              NOT NULL DEFAULT 1,

        CONSTRAINT FK_scenarios_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_scenarios_creator FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_project_scenarios_project ON pms.project_scenarios(project_id) WHERE is_active = 1;

    PRINT 'Created table pms.project_scenarios';
END
ELSE
BEGIN
    PRINT 'Table pms.project_scenarios already exists';
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'scenario_milestones')
BEGIN
    CREATE TABLE pms.scenario_milestones (
        id                   UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        scenario_id          UNIQUEIDENTIFIER NOT NULL,
        project_milestone_id UNIQUEIDENTIFIER NOT NULL,
        planned_due_date     DATE             NULL,   -- override of project_milestones.due_date
        planned_progress     DECIMAL(5,2)     NULL,   -- override of progress_percent
        note                 NVARCHAR(MAX)    NULL,

        CONSTRAINT FK_smile_scenario  FOREIGN KEY (scenario_id)          REFERENCES pms.project_scenarios(id) ON DELETE CASCADE,
        CONSTRAINT FK_smile_milestone FOREIGN KEY (project_milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT UQ_smile_scenario_milestone UNIQUE (scenario_id, project_milestone_id)
    );

    CREATE INDEX IX_scenario_milestones_scenario ON pms.scenario_milestones(scenario_id);

    PRINT 'Created table pms.scenario_milestones';
END
ELSE
BEGIN
    PRINT 'Table pms.scenario_milestones already exists';
END
