USE PMSoftware;
GO

-- =============================================
-- Add account type flags to pms.customers
-- Created: 2026-02-19
-- Flags: is_customer, is_vendor (is_prime, is_partner already exist)
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.customers') AND name = 'is_customer'
)
BEGIN
    ALTER TABLE pms.customers ADD is_customer BIT NOT NULL DEFAULT 1;
    PRINT 'Added is_customer to customers';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.customers') AND name = 'is_vendor'
)
BEGIN
    ALTER TABLE pms.customers ADD is_vendor BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_vendor to customers';
END
GO

-- Set all existing records as Customer by default
UPDATE pms.customers SET is_customer = 1 WHERE is_customer = 0;
GO

PRINT 'Account type flags migration complete.';
GO
