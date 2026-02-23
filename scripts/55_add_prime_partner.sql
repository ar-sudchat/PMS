USE PMSoftware;
GO

-- =============================================
-- Add Prime & Partner fields
-- Created: 2026-02-19
-- =============================================

-- =============================================
-- 1. Add is_prime, is_partner to pms.customers
-- =============================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.customers') AND name = 'is_prime'
)
BEGIN
    ALTER TABLE pms.customers ADD is_prime BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_prime to customers';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.customers') AND name = 'is_partner'
)
BEGIN
    ALTER TABLE pms.customers ADD is_partner BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_partner to customers';
END
GO

-- =============================================
-- 2. Add prime_id, partner_id to pms.projects
-- =============================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'prime_id'
)
BEGIN
    ALTER TABLE pms.projects ADD prime_id UNIQUEIDENTIFIER NULL;

    ALTER TABLE pms.projects ADD CONSTRAINT FK_projects_prime
        FOREIGN KEY (prime_id) REFERENCES pms.customers(id);

    CREATE INDEX IX_projects_prime ON pms.projects(prime_id);

    PRINT 'Added prime_id to projects';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'partner_id'
)
BEGIN
    ALTER TABLE pms.projects ADD partner_id UNIQUEIDENTIFIER NULL;

    ALTER TABLE pms.projects ADD CONSTRAINT FK_projects_partner
        FOREIGN KEY (partner_id) REFERENCES pms.customers(id);

    CREATE INDEX IX_projects_partner ON pms.projects(partner_id);

    PRINT 'Added partner_id to projects';
END
GO

PRINT 'Prime & Partner migration complete.';
GO
