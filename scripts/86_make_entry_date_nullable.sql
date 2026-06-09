-- =============================================
-- Script 86: Make team_tracking_entries.entry_date nullable
-- Description: Lets a tracking entry exist as "unscheduled" — created as part
--              of an action plan template before the team commits to a specific
--              date. The UI surfaces these in a separate "งานยังไม่ระบุวัน" pane.
-- =============================================

IF EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    WHERE SCHEMA_NAME(t.schema_id) = 'pms'
      AND t.name = 'team_tracking_entries'
      AND c.name = 'entry_date'
      AND c.is_nullable = 0
)
BEGIN
    ALTER TABLE pms.team_tracking_entries ALTER COLUMN entry_date DATE NULL;
    PRINT 'entry_date is now nullable';
END
ELSE
BEGIN
    PRINT 'entry_date already nullable';
END
