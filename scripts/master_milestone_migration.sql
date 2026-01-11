-- PMS Master Milestone & KPI System Migration
-- Created: 2026-01-11
-- Description: Updates DB for TTD/MDC weights, Deliverables, Approval & Locking

-- 1.1 Update milestone_configs (Default Weights)
-- Rename/Add columns for separate TTD/MDC weights
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'default_weight_ttd')
BEGIN
    ALTER TABLE pms.milestone_configs ADD default_weight_ttd DECIMAL(5,2) NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs' AND COLUMN_NAME = 'default_weight_mdc')
BEGIN
    ALTER TABLE pms.milestone_configs ADD default_weight_mdc DECIMAL(5,2) NOT NULL DEFAULT 0;
END
GO

-- Update default weights
UPDATE pms.milestone_configs SET default_weight_ttd = 35, default_weight_mdc = 30 WHERE code = 'MAPPING';
UPDATE pms.milestone_configs SET default_weight_ttd = 20, default_weight_mdc = 30 WHERE code = 'SYSTEMTEST';
UPDATE pms.milestone_configs SET default_weight_ttd = 30, default_weight_mdc = 20 WHERE code = 'UAT';
UPDATE pms.milestone_configs SET default_weight_ttd = 15, default_weight_mdc = 10 WHERE code = 'GOLIVE';
UPDATE pms.milestone_configs SET default_weight_ttd = 0, default_weight_mdc = 10 WHERE code = 'CLOSEGOLIVE';
GO

-- 1.2 Update project_milestones (Override Weights + Lock)
-- Weight columns (Override)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'weight_ttd')
BEGIN
    ALTER TABLE pms.project_milestones ADD weight_ttd DECIMAL(5,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'weight_mdc')
BEGIN
    ALTER TABLE pms.project_milestones ADD weight_mdc DECIMAL(5,2) NULL;
END
GO

-- Manday columns
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'planned_mandays')
BEGIN
    ALTER TABLE pms.project_milestones ADD planned_mandays DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'actual_mandays')
BEGIN
    ALTER TABLE pms.project_milestones ADD actual_mandays DECIMAL(10,2) NULL;
END
GO

-- Date columns
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'completed_date')
BEGIN
    ALTER TABLE pms.project_milestones ADD completed_date DATE NULL;
END
GO

-- Approve & Lock columns (Some might already exist from previous step, keeping for completeness check)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'is_approved')
BEGIN
    ALTER TABLE pms.project_milestones ADD is_approved BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'is_locked')
BEGIN
    ALTER TABLE pms.project_milestones ADD is_locked BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'approved_at')
BEGIN
    ALTER TABLE pms.project_milestones ADD approved_at DATETIME2 NULL;
END
GO

-- KPI Result columns
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'kpi_ttd_pass')
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_ttd_pass BIT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'kpi_mdc_pass')
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_mdc_pass BIT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'kpi_docs_pass')
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_docs_pass BIT NULL;
END
GO

-- 1.3 Create deliverable_configs (Default Documents)

-- 1.3 Create deliverable_configs (Default Documents)
-- To ensure schema consistency, we will drop and recreate these tables.
-- First, drop dependent table if exists
IF OBJECT_ID('pms.project_deliverables', 'U') IS NOT NULL
BEGIN
    DROP TABLE pms.project_deliverables;
END
GO

-- Then drop config table
IF OBJECT_ID('pms.deliverable_configs', 'U') IS NOT NULL
BEGIN
    DROP TABLE pms.deliverable_configs;
END
GO

-- Now Create deliverable_configs
CREATE TABLE pms.deliverable_configs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    milestone_config_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(200) NOT NULL,
    name_th NVARCHAR(200) NULL,
    description NVARCHAR(500) NULL,
    is_required BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (milestone_config_id) REFERENCES pms.milestone_configs(id)
);
GO

-- Insert default deliverables
INSERT INTO pms.deliverable_configs (milestone_config_id, name, name_th, is_required, sort_order) VALUES
-- Mapping
((SELECT id FROM pms.milestone_configs WHERE code = 'MAPPING'), 'Data Mapping Document', 'เอกสาร Mapping ข้อมูล', 1, 1),
((SELECT id FROM pms.milestone_configs WHERE code = 'MAPPING'), 'Sign-off Sheet', 'เอกสารลงนามอนุมัติ', 1, 2),
-- System Test
((SELECT id FROM pms.milestone_configs WHERE code = 'SYSTEMTEST'), 'Test Cases Document', 'เอกสาร Test Cases', 1, 1),
((SELECT id FROM pms.milestone_configs WHERE code = 'SYSTEMTEST'), 'Test Results Report', 'รายงานผลการทดสอบ', 1, 2),
((SELECT id FROM pms.milestone_configs WHERE code = 'SYSTEMTEST'), 'Bug Report', 'รายงาน Bug', 0, 3),
-- UAT
((SELECT id FROM pms.milestone_configs WHERE code = 'UAT'), 'UAT Test Cases', 'เอกสาร UAT Test Cases', 1, 1),
((SELECT id FROM pms.milestone_configs WHERE code = 'UAT'), 'UAT Sign-off', 'เอกสารลงนาม UAT', 1, 2),
((SELECT id FROM pms.milestone_configs WHERE code = 'UAT'), 'User Manual', 'คู่มือการใช้งาน', 1, 3),
-- Go-Live
((SELECT id FROM pms.milestone_configs WHERE code = 'GOLIVE'), 'Go-Live Checklist', 'Checklist Go-Live', 1, 1),
((SELECT id FROM pms.milestone_configs WHERE code = 'GOLIVE'), 'Deployment Document', 'เอกสารการ Deploy', 1, 2),
((SELECT id FROM pms.milestone_configs WHERE code = 'GOLIVE'), 'Go-Live Sign-off', 'เอกสารลงนาม Go-Live', 1, 3),
-- Close Go-Live
((SELECT id FROM pms.milestone_configs WHERE code = 'CLOSEGOLIVE'), 'Project Closure Report', 'รายงานปิดโครงการ', 1, 1),
((SELECT id FROM pms.milestone_configs WHERE code = 'CLOSEGOLIVE'), 'Warranty Document', 'เอกสารรับประกัน', 1, 2);
GO
GO

-- 1.4 Create project_deliverables
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_deliverables')
BEGIN
    CREATE TABLE pms.project_deliverables (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_milestone_id UNIQUEIDENTIFIER NOT NULL,
        deliverable_config_id UNIQUEIDENTIFIER NULL,
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(500) NULL,
        is_required BIT NOT NULL DEFAULT 1,
        submitted_date DATE NULL,
        submitted_by UNIQUEIDENTIFIER NULL,
        file_name NVARCHAR(255) NULL,
        file_path NVARCHAR(500) NULL,
        file_size INT NULL,
        is_on_time BIT NULL,
        is_locked BIT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (project_milestone_id) REFERENCES pms.project_milestones(id),
        FOREIGN KEY (deliverable_config_id) REFERENCES pms.deliverable_configs(id),
        FOREIGN KEY (submitted_by) REFERENCES pms.employees(id)
    );
END
GO

-- 1.5 Create View for Effective Weights and Data Aggregation
CREATE OR ALTER VIEW pms.vw_project_milestones_with_weight AS
SELECT 
    pm.id,
    pm.project_id,
    pm.milestone_config_id,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    COALESCE(pm.weight_ttd, mc.default_weight_ttd) AS weight_ttd,
    COALESCE(pm.weight_mdc, mc.default_weight_mdc) AS weight_mdc,
    CASE WHEN pm.weight_ttd IS NOT NULL THEN 1 ELSE 0 END AS is_ttd_override,
    CASE WHEN pm.weight_mdc IS NOT NULL THEN 1 ELSE 0 END AS is_mdc_override,
    pm.planned_mandays,
    pm.actual_mandays,
    pm.due_date,
    pm.completed_date,
    pm.is_approved,
    pm.is_locked,
    pm.kpi_ttd_pass,
    pm.kpi_mdc_pass,
    pm.kpi_docs_pass,
    pm.approved_at,
    pm.progress_percent,
    pm.status,
    pm.sort_order,
    -- Count deliverables
    (SELECT COUNT(*) FROM pms.project_deliverables pd WHERE pd.project_milestone_id = pm.id AND pd.is_active = 1 AND pd.is_required = 1) AS total_required_docs,
    (SELECT COUNT(*) FROM pms.project_deliverables pd WHERE pd.project_milestone_id = pm.id AND pd.is_active = 1 AND pd.is_required = 1 AND pd.submitted_date IS NOT NULL) AS submitted_required_docs
FROM pms.project_milestones pm
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id;
GO
