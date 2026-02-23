USE PMSoftware;
GO

-- =============================================
-- Project Groups & Sub Groups
-- Created: 2026-02-19
-- =============================================

-- =============================================
-- 1. Create pms.project_groups table (self-referencing)
-- parent_id = NULL → top-level group (e.g. Software, Trading, Service)
-- parent_id = <id> → sub-group (e.g. Shelf Product, Beside B1, ...)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_groups')
BEGIN
    CREATE TABLE pms.project_groups (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        parent_id UNIQUEIDENTIFIER NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        description NVARCHAR(500) NULL,
        color NVARCHAR(20) NULL DEFAULT '#3B82F6',
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_project_groups_parent FOREIGN KEY (parent_id)
            REFERENCES pms.project_groups(id),
        CONSTRAINT UQ_project_groups_code UNIQUE (code)
    );

    CREATE INDEX IX_project_groups_parent ON pms.project_groups(parent_id);
    CREATE INDEX IX_project_groups_active ON pms.project_groups(is_active);

    PRINT 'Table pms.project_groups created.';
END
GO

-- =============================================
-- 2. Add project_group_id to pms.projects
-- =============================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'project_group_id'
)
BEGIN
    ALTER TABLE pms.projects ADD project_group_id UNIQUEIDENTIFIER NULL;

    ALTER TABLE pms.projects ADD CONSTRAINT FK_projects_group
        FOREIGN KEY (project_group_id) REFERENCES pms.project_groups(id);

    CREATE INDEX IX_projects_group ON pms.projects(project_group_id);

    PRINT 'Added project_group_id to projects';
END
GO

-- =============================================
-- 3. Insert default groups & sub-groups
-- =============================================

-- Software group
IF NOT EXISTS (SELECT 1 FROM pms.project_groups WHERE code = 'SOFTWARE')
BEGIN
    DECLARE @softwareId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO pms.project_groups (id, parent_id, code, name, name_th, color, sort_order)
    VALUES (@softwareId, NULL, 'SOFTWARE', 'Software', 'ซอฟต์แวร์', '#3B82F6', 1);

    INSERT INTO pms.project_groups (parent_id, code, name, name_th, color, sort_order) VALUES
        (@softwareId, 'SW_SHELF', 'Shelf Product', 'Shelf Product', '#60A5FA', 1),
        (@softwareId, 'SW_BESIDE_B1', 'Beside B1', 'Beside B1', '#818CF8', 2),
        (@softwareId, 'SW_LANDED_COST', 'Landed Cost', 'Landed Cost', '#34D399', 3),
        (@softwareId, 'SW_BESIDE_WINSPEED', 'Beside Winspeed', 'Beside Winspeed', '#F59E0B', 4),
        (@softwareId, 'SW_BESIDE_STANDALONE', 'Beside Stand alone', 'Beside Stand alone', '#F97316', 5),
        (@softwareId, 'SW_PRPO_ONLINE', 'PR PO Online', 'PR PO Online', '#EC4899', 6),
        (@softwareId, 'SW_CUSTOMIZE', 'Customize', 'Customize', '#8B5CF6', 7);

    PRINT 'Inserted Software group with sub-groups';
END
GO

-- Trading group
IF NOT EXISTS (SELECT 1 FROM pms.project_groups WHERE code = 'TRADING')
BEGIN
    INSERT INTO pms.project_groups (parent_id, code, name, name_th, color, sort_order)
    VALUES (NULL, 'TRADING', 'Trading', 'Trading', '#10B981', 2);

    PRINT 'Inserted Trading group';
END
GO

-- Service group
IF NOT EXISTS (SELECT 1 FROM pms.project_groups WHERE code = 'SERVICE')
BEGIN
    DECLARE @serviceId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO pms.project_groups (id, parent_id, code, name, name_th, color, sort_order)
    VALUES (@serviceId, NULL, 'SERVICE', 'Service', 'บริการ', '#F59E0B', 3);

    INSERT INTO pms.project_groups (parent_id, code, name, name_th, color, sort_order) VALUES
        (@serviceId, 'SVC_MA', 'MA', 'MA', '#FBBF24', 1),
        (@serviceId, 'SVC_OTHER', 'Other', 'อื่นๆ', '#6B7280', 2);

    PRINT 'Inserted Service group with sub-groups';
END
GO

PRINT 'Project Groups migration complete.';
GO
