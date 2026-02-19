USE PMSoftware;
GO

-- =============================================
-- 59: Add Payment Condition fields
-- Description: Add contract_value to projects and payment_percent to milestones
-- =============================================

-- 1. Add contract_value to pms.projects
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'contract_value'
)
BEGIN
    ALTER TABLE pms.projects ADD contract_value DECIMAL(18,2) NULL;
    PRINT 'Added contract_value to pms.projects';
END
GO

-- 2. Add payment_percent to pms.project_milestones
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_percent'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_percent DECIMAL(5,2) NULL DEFAULT 0;
    PRINT 'Added payment_percent to pms.project_milestones';
END
GO

-- 3. Backfill: MKT projects -> contract_value = mkt_expected_value - mkt_discount
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_expected_value'
)
BEGIN
    UPDATE p
    SET p.contract_value = ISNULL(p.mkt_expected_value, 0) - ISNULL(p.mkt_discount, 0)
    FROM pms.projects p
    INNER JOIN pms.project_types pt ON p.project_type_id = pt.id
    WHERE pt.code = 'MKT'
      AND p.contract_value IS NULL
      AND p.mkt_expected_value IS NOT NULL;

    PRINT 'Backfilled contract_value for MKT projects';
END
GO

-- 4. Backfill: Non-MKT projects -> contract_value = sold_mandays * manday_rate
UPDATE pms.projects
SET contract_value = ISNULL(sold_mandays, 0) * ISNULL(manday_rate, 0)
WHERE contract_value IS NULL
  AND ISNULL(sold_mandays, 0) * ISNULL(manday_rate, 0) > 0;

PRINT 'Backfilled contract_value for non-MKT projects';
GO

PRINT 'Payment Condition migration complete.';
GO
