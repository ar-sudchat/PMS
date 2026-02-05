-- =============================================
-- Script: Add MKT Discount column
-- Date: 2026-02-04
-- Description:
--   Add column for discount amount in MKT projects:
--   - mkt_discount: Discount amount in Baht
-- =============================================

-- Add discount column
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_discount')
BEGIN
    ALTER TABLE pms.projects ADD mkt_discount DECIMAL(18,2) NULL
    PRINT 'Added column: mkt_discount'
END
GO

PRINT 'MKT Discount column added successfully'
GO
