-- Create backup_types table
-- This table stores backup type definitions with KPI counting flag

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='backup_types' AND xtype='U')
BEGIN
    CREATE TABLE pms.backup_types (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        is_kpi_counted BIT NOT NULL DEFAULT 1,  -- Whether this type counts toward KPI
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME NULL
    );

    PRINT 'Table pms.backup_types created successfully';
END
ELSE
BEGIN
    PRINT 'Table pms.backup_types already exists';
END
GO

-- Insert default backup types (from existing BACKUP_TYPES constant)
IF NOT EXISTS (SELECT 1 FROM pms.backup_types WHERE code = 'DATABASE')
BEGIN
    INSERT INTO pms.backup_types (id, code, name, description, is_kpi_counted, sort_order)
    VALUES
        (NEWID(), 'DATABASE', 'Database', 'Database backup', 1, 1),
        (NEWID(), 'SOURCE_CODE', 'Source Code', 'Source code backup', 1, 2),
        (NEWID(), 'SERVER', 'Server', 'Server configuration backup', 1, 3),
        (NEWID(), 'APPLICATION', 'Application', 'Application backup', 1, 4),
        (NEWID(), 'CONFIG', 'Config', 'Configuration files backup', 1, 5),
        (NEWID(), 'FILES', 'Files', 'General files backup', 1, 6);

    PRINT 'Default backup types inserted successfully';
END
ELSE
BEGIN
    PRINT 'Default backup types already exist';
END
GO
