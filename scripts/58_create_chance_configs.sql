-- =============================================
-- 58: Create Chance Configs Table + Seed Data
-- Description: Chance/Probability levels for projects
-- =============================================

-- 1. Create chance_configs table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'chance_configs')
BEGIN
    CREATE TABLE pms.chance_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        description NVARCHAR(500) NULL,
        percentage INT NOT NULL DEFAULT 0,
        color NVARCHAR(20) NOT NULL DEFAULT '#6B7280',
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL
    );

    PRINT 'Created table pms.chance_configs';
END
GO

-- 2. Seed default data
IF NOT EXISTS (SELECT 1 FROM pms.chance_configs WHERE code = 'HOT')
BEGIN
    INSERT INTO pms.chance_configs (code, name, name_th, description, percentage, color, sort_order) VALUES
    ('HOT',  'Hot',  'Hot 50%',  N'ส่งใบเสนอราคาแล้ว พบผู้ตัดสินใจได้แล้ว, รู้ดิวในการตัดสินใจแล้ว', 50, '#EF4444', 1),
    ('WARM', 'Warm', 'Warm 30%', N'ส่งใบเสนอราคาแล้ว, พบผู้มีอำนาจ', 30, '#F97316', 2),
    ('COLD', 'Cold', 'Cold 10%', N'เสนอราคารอย่างเดียว', 10, '#3B82F6', 3),
    ('NEW',  'New',  'New 0%',   N'ยังไม่เสนอราคา', 0, '#8B5CF6', 4),
    ('HOLD', 'Hold', 'Hold 0%',  N'พักโครงการไว้ก่อน', 0, '#6B7280', 5);

    PRINT 'Seeded default chance configs';
END
GO

-- 3. Add chance_id column to projects table
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'chance_id'
)
BEGIN
    ALTER TABLE pms.projects ADD chance_id UNIQUEIDENTIFIER NULL;

    -- Add FK constraint
    ALTER TABLE pms.projects
    ADD CONSTRAINT FK_projects_chance_configs
    FOREIGN KEY (chance_id) REFERENCES pms.chance_configs(id);

    PRINT 'Added chance_id column to pms.projects';
END
GO
