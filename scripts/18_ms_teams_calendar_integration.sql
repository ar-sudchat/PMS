-- =============================================
-- MS Teams Calendar Integration Tables
-- =============================================

-- Table to store user's MS Teams OAuth tokens
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_ms_tokens' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.user_ms_tokens (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id UNIQUEIDENTIFIER NOT NULL,
        access_token NVARCHAR(MAX) NOT NULL,
        refresh_token NVARCHAR(MAX) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        ms_email NVARCHAR(255) NULL,
        ms_user_id NVARCHAR(255) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_user_ms_tokens_employee
            FOREIGN KEY (employee_id) REFERENCES pms.employees(id)
    )

    CREATE UNIQUE INDEX IX_user_ms_tokens_employee
        ON pms.user_ms_tokens(employee_id)

    PRINT 'Created table: pms.user_ms_tokens'
END
GO

-- Add MS Teams configuration to system_configs
-- Note: system_configs has config_type NOT NULL column
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'MS_TEAMS_CLIENT_ID')
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'MS_TEAMS_CLIENT_ID', '', 'string', N'Microsoft Azure App Client ID')

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'MS_TEAMS_TENANT_ID')
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'MS_TEAMS_TENANT_ID', '', 'string', N'Microsoft Azure Tenant ID')

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'MS_TEAMS_CLIENT_SECRET')
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'MS_TEAMS_CLIENT_SECRET', '', 'string', N'Microsoft Azure App Client Secret')

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'MS_TEAMS_REDIRECT_URI')
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description)
    VALUES (NEWID(), 'MS_TEAMS_REDIRECT_URI', '', 'string', N'OAuth Redirect URI')

PRINT 'Added MS Teams configuration to system_configs'
GO

-- Table to cache synced calendar events (optional - for performance)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ms_calendar_cache' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.ms_calendar_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id UNIQUEIDENTIFIER NOT NULL,
        ms_event_id NVARCHAR(255) NOT NULL,
        subject NVARCHAR(500) NULL,
        start_datetime DATETIME2 NOT NULL,
        end_datetime DATETIME2 NOT NULL,
        location NVARCHAR(500) NULL,
        is_online_meeting BIT DEFAULT 0,
        online_meeting_url NVARCHAR(1000) NULL,
        body_preview NVARCHAR(MAX) NULL,
        last_synced DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_ms_calendar_cache_employee
            FOREIGN KEY (employee_id) REFERENCES pms.employees(id)
    )

    CREATE INDEX IX_ms_calendar_cache_employee_date
        ON pms.ms_calendar_cache(employee_id, start_datetime)

    CREATE UNIQUE INDEX IX_ms_calendar_cache_event
        ON pms.ms_calendar_cache(employee_id, ms_event_id)

    PRINT 'Created table: pms.ms_calendar_cache'
END
GO

-- Add meeting_attendees table if not exists (for tracking meeting participants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'meeting_attendees' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.meeting_attendees (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        meeting_id UNIQUEIDENTIFIER NOT NULL,
        employee_id UNIQUEIDENTIFIER NOT NULL,
        attendance_status NVARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED, TENTATIVE
        created_at DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_meeting_attendees_meeting
            FOREIGN KEY (meeting_id) REFERENCES pms.meeting_minutes_records(id)
            ON DELETE CASCADE,
        CONSTRAINT FK_meeting_attendees_employee
            FOREIGN KEY (employee_id) REFERENCES pms.employees(id)
    )

    CREATE UNIQUE INDEX IX_meeting_attendees_unique
        ON pms.meeting_attendees(meeting_id, employee_id)

    PRINT 'Created table: pms.meeting_attendees'
END
GO

PRINT 'MS Teams Calendar Integration setup completed!'
