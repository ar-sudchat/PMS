-- Add new columns for MKT tracking
-- วันที่ประชุมครั้งสุดท้าย, วันที่ส่งราคา, และ Manday

-- Step 1: Add columns to pms.projects table (run this first)
ALTER TABLE pms.projects ADD mkt_last_meeting_date DATETIME NULL;
GO

ALTER TABLE pms.projects ADD mkt_quote_sent_date DATE NULL;
GO

ALTER TABLE pms.projects ADD mkt_mandays DECIMAL(10,2) NULL;
GO

PRINT 'Added mkt_last_meeting_date, mkt_quote_sent_date, and mkt_mandays columns successfully';
