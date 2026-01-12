-- =============================================
-- Fix Deploy Success Records for KPI Module
-- =============================================
-- The existing deploy_records table has a different schema (individual deploys)
-- This script creates a new table for weekly aggregated KPI tracking
-- =============================================

-- Create the KPI-style deploy_success_records table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_success_records')
BEGIN
    CREATE TABLE pms.deploy_success_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        customer_id UNIQUEIDENTIFIER NOT NULL,
        week_start_date DATE NOT NULL,
        year INT NOT NULL,
        week_number INT NOT NULL,
        deploy_count INT NOT NULL DEFAULT 0,
        rollback_count INT NOT NULL DEFAULT 0,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_deploy_success_customer FOREIGN KEY (customer_id) REFERENCES pms.customers(id),
        CONSTRAINT FK_deploy_success_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT UQ_deploy_success_customer_week UNIQUE (customer_id, year, week_number)
    );

    CREATE INDEX IX_deploy_success_year_week ON pms.deploy_success_records(year, week_number);
    CREATE INDEX IX_deploy_success_customer ON pms.deploy_success_records(customer_id);

    PRINT 'Created table: pms.deploy_success_records';
END
ELSE
BEGIN
    PRINT 'Table pms.deploy_success_records already exists';
END
GO

-- Verify
SELECT 'deploy_success_records' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deploy_success_records'
ORDER BY ORDINAL_POSITION;
GO
