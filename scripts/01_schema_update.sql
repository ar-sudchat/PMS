
-- 1. Ensure pms.task_type_configs has is_defect column
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_type_configs' AND COLUMN_NAME = 'is_defect')
BEGIN
    ALTER TABLE pms.task_type_configs ADD is_defect BIT DEFAULT 0;
END

-- 2. Create pms.milestone_configs if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs')
BEGIN
    CREATE TABLE pms.milestone_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100),
        kpi_weight_ttd DECIMAL(5,2) DEFAULT 0,
        kpi_weight_mdc DECIMAL(5,2) DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'kpi_weight_ttd')
    BEGIN
        ALTER TABLE pms.milestone_configs ADD kpi_weight_ttd DECIMAL(5,2) DEFAULT 0;
    END

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'kpi_weight_mdc')
    BEGIN
        ALTER TABLE pms.milestone_configs ADD kpi_weight_mdc DECIMAL(5,2) DEFAULT 0;
    END
END

-- 3. Ensure project_milestones has milestone_config_id
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'milestone_config_id')
BEGIN
    ALTER TABLE pms.project_milestones ADD milestone_config_id UNIQUEIDENTIFIER;
END

-- 4. Drop restrictive task type constraint to allow config-driven types
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'pms' AND CONSTRAINT_NAME = 'chk_tasks_type')
BEGIN
    ALTER TABLE pms.tasks DROP CONSTRAINT chk_tasks_type;
END
