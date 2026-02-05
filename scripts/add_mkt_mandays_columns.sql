-- =============================================
-- Script: Add Manday SA, PG, PM columns for MKT projects
-- Date: 2026-02-04
-- Description:
--   Add columns for detailed manday estimation:
--   - mkt_mandays_sa: System Analyst mandays
--   - mkt_mandays_pg: Programmer mandays
--   - mkt_mandays_pm: Project Manager mandays
-- =============================================

-- Add SA mandays
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_mandays_sa')
BEGIN
    ALTER TABLE pms.projects ADD mkt_mandays_sa DECIMAL(10,2) NULL
    PRINT 'Added column: mkt_mandays_sa'
END
GO

-- Add PG mandays
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_mandays_pg')
BEGIN
    ALTER TABLE pms.projects ADD mkt_mandays_pg DECIMAL(10,2) NULL
    PRINT 'Added column: mkt_mandays_pg'
END
GO

-- Add PM mandays
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'mkt_mandays_pm')
BEGIN
    ALTER TABLE pms.projects ADD mkt_mandays_pm DECIMAL(10,2) NULL
    PRINT 'Added column: mkt_mandays_pm'
END
GO

PRINT 'MKT Mandays columns added successfully'
GO
