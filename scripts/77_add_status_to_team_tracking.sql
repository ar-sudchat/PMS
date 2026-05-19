-- =============================================
-- Script 77: Add status / completed_date / postponed_date
-- Used to track whether a tracking entry is done or postponed
-- =============================================

IF EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'team_tracking_entries')
BEGIN
    -- status: 'PLANNED' | 'DONE' | 'POSTPONED'
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('pms.team_tracking_entries') AND name = 'status'
    )
    BEGIN
        ALTER TABLE pms.team_tracking_entries
            ADD status NVARCHAR(20) NOT NULL CONSTRAINT DF_team_tracking_status DEFAULT 'PLANNED';
        PRINT 'Added column status'
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('pms.team_tracking_entries') AND name = 'completed_date'
    )
    BEGIN
        ALTER TABLE pms.team_tracking_entries ADD completed_date DATE NULL;
        PRINT 'Added column completed_date'
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('pms.team_tracking_entries') AND name = 'postponed_date'
    )
    BEGIN
        ALTER TABLE pms.team_tracking_entries ADD postponed_date DATE NULL;
        PRINT 'Added column postponed_date'
    END
END
ELSE
BEGIN
    PRINT 'Table pms.team_tracking_entries does not exist — run script 75 first'
END
GO
