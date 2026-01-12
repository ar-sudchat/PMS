-- =============================================
-- Project Types Master Table
-- Run this script to create project types system
-- =============================================

-- Create project_types table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_types')
BEGIN
    CREATE TABLE pms.project_types (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        description NVARCHAR(500) NULL,
        color NVARCHAR(20) NULL DEFAULT '#3B82F6',
        has_milestones BIT NOT NULL DEFAULT 1,
        has_deliverables BIT NOT NULL DEFAULT 1,
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT UQ_project_types_code UNIQUE (code)
    );

    PRINT 'Created pms.project_types table';
END
ELSE
BEGIN
    PRINT 'Table pms.project_types already exists';
END
GO

-- Insert default project types
IF NOT EXISTS (SELECT 1 FROM pms.project_types WHERE code = 'DEV')
BEGIN
    INSERT INTO pms.project_types (code, name, name_th, description, color, has_milestones, has_deliverables, sort_order) VALUES
    ('DEV', 'Development', N'พัฒนาระบบ', N'พัฒนาระบบใหม่ตั้งแต่ต้น', '#3B82F6', 1, 1, 1);
    PRINT 'Inserted DEV type';
END

IF NOT EXISTS (SELECT 1 FROM pms.project_types WHERE code = 'MA')
BEGIN
    INSERT INTO pms.project_types (code, name, name_th, description, color, has_milestones, has_deliverables, sort_order) VALUES
    ('MA', 'Maintenance', N'ดูแลระบบ', N'สัญญาดูแลระบบรายปี (MA Contract)', '#F59E0B', 0, 0, 2);
    PRINT 'Inserted MA type';
END

IF NOT EXISTS (SELECT 1 FROM pms.project_types WHERE code = 'CON')
BEGIN
    INSERT INTO pms.project_types (code, name, name_th, description, color, has_milestones, has_deliverables, sort_order) VALUES
    ('CON', 'Consulting', N'ที่ปรึกษา', N'ให้คำปรึกษาและออกแบบระบบ', '#8B5CF6', 0, 1, 3);
    PRINT 'Inserted CON type';
END

IF NOT EXISTS (SELECT 1 FROM pms.project_types WHERE code = 'INT')
BEGIN
    INSERT INTO pms.project_types (code, name, name_th, description, color, has_milestones, has_deliverables, sort_order) VALUES
    ('INT', 'Internal', N'ภายใน', N'โครงการภายในบริษัท', '#6B7280', 1, 1, 4);
    PRINT 'Inserted INT type';
END
GO

-- Add project_type_id to projects table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = 'pms'
               AND TABLE_NAME = 'projects'
               AND COLUMN_NAME = 'project_type_id')
BEGIN
    ALTER TABLE pms.projects
    ADD project_type_id UNIQUEIDENTIFIER NULL;

    PRINT 'Added project_type_id column to pms.projects';
END
GO

-- Add foreign key constraint
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_projects_project_type')
BEGIN
    ALTER TABLE pms.projects
    ADD CONSTRAINT FK_projects_project_type
    FOREIGN KEY (project_type_id) REFERENCES pms.project_types(id);

    PRINT 'Added FK_projects_project_type constraint';
END
GO

-- Set default type (Development) for existing projects without a type
UPDATE pms.projects
SET project_type_id = (SELECT id FROM pms.project_types WHERE code = 'DEV')
WHERE project_type_id IS NULL;

PRINT 'Updated existing projects with default type (Development)';
GO

-- Create index for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_projects_project_type_id')
BEGIN
    CREATE INDEX IX_projects_project_type_id ON pms.projects(project_type_id);
    PRINT 'Created index IX_projects_project_type_id';
END
GO

PRINT 'Project Types schema migration completed successfully';
