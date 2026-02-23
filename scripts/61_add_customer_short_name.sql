-- =============================================
-- 61: Add short_name to customers
-- Description: Add abbreviation/short name for display in reports and forecast
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'short_name'
)
BEGIN
    ALTER TABLE pms.customers ADD short_name NVARCHAR(50) NULL;
    PRINT 'Added short_name column to pms.customers';
END
GO
