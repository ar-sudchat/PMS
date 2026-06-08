-- =============================================
-- Script 76: Add icon column to team_tracking_entries
-- Description: Allow each tracking entry to carry an icon name
--              (mapped to a Lucide icon on the client).
-- =============================================

IF EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('pms') AND name = 'team_tracking_entries')
   AND NOT EXISTS (
       SELECT 1 FROM sys.columns
       WHERE object_id = OBJECT_ID('pms.team_tracking_entries')
         AND name = 'icon'
   )
BEGIN
    ALTER TABLE pms.team_tracking_entries
        ADD icon NVARCHAR(50) NULL;
    PRINT 'Added column icon to pms.team_tracking_entries'
END
ELSE
BEGIN
    PRINT 'Column icon already exists or table missing'
END
GO
