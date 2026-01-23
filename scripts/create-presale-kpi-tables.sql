-- Create tables for Presale KPI Records

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customer_contact_records' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.customer_contact_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_name NVARCHAR(255) NOT NULL,
        sales_handover_date DATE NOT NULL,
        customer_contact_date DATE NOT NULL,
        created_by UNIQUEIDENTIFIER NOT NULL, -- Link to pms.employees
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        remark NVARCHAR(MAX)
    );
    PRINT 'Created table pms.customer_contact_records';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'manday_assessment_records' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.manday_assessment_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_name NVARCHAR(255) NOT NULL,
        final_meeting_date DATE NOT NULL,
        manday_submit_date DATE NOT NULL,
        created_by UNIQUEIDENTIFIER NOT NULL, -- Link to pms.employees
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        remark NVARCHAR(MAX)
    );
    PRINT 'Created table pms.manday_assessment_records';
END
GO
