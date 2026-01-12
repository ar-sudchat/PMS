-- Fix Meeting Minutes - Add organized_by column
-- Run this script separately

-- Check if table exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'meeting_minutes_records')
BEGIN
    -- Add organized_by column if not exists
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'pms'
                   AND TABLE_NAME = 'meeting_minutes_records'
                   AND COLUMN_NAME = 'organized_by')
    BEGIN
        ALTER TABLE pms.meeting_minutes_records
        ADD organized_by UNIQUEIDENTIFIER NULL;

        PRINT 'Added column: organized_by';

        -- Copy created_by to organized_by for existing records
        UPDATE pms.meeting_minutes_records
        SET organized_by = created_by
        WHERE organized_by IS NULL;

        PRINT 'Updated existing records: set organized_by = created_by';
    END
    ELSE
    BEGIN
        PRINT 'Column organized_by already exists';
    END
END
ELSE
BEGIN
    PRINT 'Table meeting_minutes_records does not exist!';
END
GO

-- Verify
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'meeting_minutes_records'
ORDER BY ORDINAL_POSITION;
GO
