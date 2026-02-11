-- Add mkt_dev_accepted_date column to projects table
-- วันที่แผนก DEV รับงาน

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_dev_accepted_date')
BEGIN
    ALTER TABLE pms.projects ADD mkt_dev_accepted_date DATETIME NULL;
    PRINT 'Added column: mkt_dev_accepted_date';
END
ELSE
BEGIN
    PRINT 'Column mkt_dev_accepted_date already exists';
END
GO
