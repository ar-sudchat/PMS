-- =============================================
-- Project Type to Workflow Mapping
-- Database: MoveonDB
-- Schema: pms
-- =============================================
USE [MoveonDB]
GO

-- =============================================
-- 1. Add default_workflow_template_id to project_request_types
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_request_types') AND name = 'default_workflow_template_id')
BEGIN
    ALTER TABLE pms.project_request_types ADD default_workflow_template_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added column: default_workflow_template_id to project_request_types';
END
GO

-- =============================================
-- 2. Update existing project types with default workflow
-- =============================================
DECLARE @FullWorkflowId UNIQUEIDENTIFIER
DECLARE @QuickWorkflowId UNIQUEIDENTIFIER

SELECT @FullWorkflowId = id FROM pms.project_request_workflow_templates WHERE code = 'FULL_WORKFLOW'
SELECT @QuickWorkflowId = id FROM pms.project_request_workflow_templates WHERE code = 'QUICK_WORKFLOW'

-- Map project types to workflows
-- NEW_PROJECT, ENHANCEMENT -> Full Workflow
UPDATE pms.project_request_types
SET default_workflow_template_id = @FullWorkflowId
WHERE code IN ('NEW_PROJECT', 'ENHANCEMENT', 'MIGRATION')
  AND default_workflow_template_id IS NULL;

-- DEMO, SUPPORT, MAINTENANCE -> Quick Workflow
UPDATE pms.project_request_types
SET default_workflow_template_id = @QuickWorkflowId
WHERE code IN ('DEMO', 'SUPPORT', 'MAINTENANCE', 'BUG_FIX')
  AND default_workflow_template_id IS NULL;

PRINT 'Updated project types with default workflow templates';
GO

-- =============================================
-- 3. Update vw_project_request_types to include workflow info
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_project_request_types' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_project_request_types;
GO

CREATE VIEW pms.vw_project_request_types AS
SELECT
    t.id,
    t.code,
    t.name,
    t.description,
    t.color,
    t.icon,
    t.is_active,
    t.sort_order,
    t.default_workflow_template_id,
    wt.code AS default_workflow_code,
    wt.name AS default_workflow_name
FROM pms.project_request_types t
LEFT JOIN pms.project_request_workflow_templates wt ON t.default_workflow_template_id = wt.id;
GO

PRINT 'Created view: pms.vw_project_request_types';
GO

-- =============================================
-- 4. Create stored procedure to auto-assign workflow on request creation
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_assign_workflow_by_type' AND schema_id = SCHEMA_ID('pms'))
    DROP PROCEDURE pms.sp_assign_workflow_by_type;
GO

CREATE PROCEDURE pms.sp_assign_workflow_by_type
    @request_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @project_type NVARCHAR(50)
    DECLARE @workflow_template_id UNIQUEIDENTIFIER

    -- Get project type from request
    SELECT @project_type = project_type
    FROM pms.project_requests
    WHERE id = @request_id;

    -- Get default workflow for this type
    SELECT @workflow_template_id = default_workflow_template_id
    FROM pms.project_request_types
    WHERE code = @project_type;

    -- If no specific workflow, use default
    IF @workflow_template_id IS NULL
    BEGIN
        SELECT @workflow_template_id = id
        FROM pms.project_request_workflow_templates
        WHERE is_default = 1;
    END

    -- Update request with workflow
    IF @workflow_template_id IS NOT NULL
    BEGIN
        UPDATE pms.project_requests
        SET workflow_template_id = @workflow_template_id,
            current_step = 1,
            workflow_status = 'IN_PROGRESS'
        WHERE id = @request_id
          AND workflow_template_id IS NULL;
    END
END
GO

PRINT 'Created procedure: pms.sp_assign_workflow_by_type';
GO

-- =============================================
-- 5. Step Assignees - กำหนดว่า step ไหน position ไหนรับผิดชอบ
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_workflow_step_assignees' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_request_workflow_step_assignees (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        step_def_id UNIQUEIDENTIFIER NOT NULL,          -- FK to step_defs
        assignee_type NVARCHAR(20) NOT NULL,            -- POSITION, ROLE, USER
        assignee_value NVARCHAR(100) NOT NULL,          -- position_code, role_code, or user_id
        is_primary BIT NOT NULL DEFAULT 0,              -- ผู้รับผิดชอบหลัก
        can_complete BIT NOT NULL DEFAULT 1,            -- สามารถยืนยัน step นี้ได้
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_step_assignees_step_def FOREIGN KEY (step_def_id)
            REFERENCES pms.project_request_workflow_step_defs(id) ON DELETE CASCADE
    );
    PRINT 'Created table: pms.project_request_workflow_step_assignees';
END
GO

-- =============================================
-- 6. Insert default step assignees for Full Workflow
-- =============================================
DECLARE @FullTemplateId UNIQUEIDENTIFIER
SELECT @FullTemplateId = id FROM pms.project_request_workflow_templates WHERE code = 'FULL_WORKFLOW'

-- Get step IDs
DECLARE @Step1Id UNIQUEIDENTIFIER, @Step2Id UNIQUEIDENTIFIER, @Step3Id UNIQUEIDENTIFIER
DECLARE @Step4Id UNIQUEIDENTIFIER, @Step5Id UNIQUEIDENTIFIER, @Step6Id UNIQUEIDENTIFIER

SELECT @Step1Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'CREATED'
SELECT @Step2Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'ACCEPTED'
SELECT @Step3Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'CONTACTED'
SELECT @Step4Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'MEETING'
SELECT @Step5Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'QUOTED'
SELECT @Step6Id = id FROM pms.project_request_workflow_step_defs WHERE template_id = @FullTemplateId AND step_code = 'COMPLETED'

-- Insert assignees (if not exists)
IF NOT EXISTS (SELECT 1 FROM pms.project_request_workflow_step_assignees WHERE step_def_id = @Step2Id)
BEGIN
    -- Step 2: รับงาน -> PM, Sales
    INSERT INTO pms.project_request_workflow_step_assignees (step_def_id, assignee_type, assignee_value, is_primary, can_complete)
    VALUES
    (@Step2Id, 'POSITION', 'PM', 1, 1),
    (@Step2Id, 'POSITION', 'SALES', 0, 1);

    -- Step 3: ติดต่อลูกค้า -> PM, Sales
    INSERT INTO pms.project_request_workflow_step_assignees (step_def_id, assignee_type, assignee_value, is_primary, can_complete)
    VALUES
    (@Step3Id, 'POSITION', 'PM', 1, 1),
    (@Step3Id, 'POSITION', 'SALES', 0, 1);

    -- Step 4: ประชุมลูกค้า -> PM, BA
    INSERT INTO pms.project_request_workflow_step_assignees (step_def_id, assignee_type, assignee_value, is_primary, can_complete)
    VALUES
    (@Step4Id, 'POSITION', 'PM', 1, 1),
    (@Step4Id, 'POSITION', 'BA', 0, 1);

    -- Step 5: ประเมินราคา -> PM, SA
    INSERT INTO pms.project_request_workflow_step_assignees (step_def_id, assignee_type, assignee_value, is_primary, can_complete)
    VALUES
    (@Step5Id, 'POSITION', 'PM', 1, 1),
    (@Step5Id, 'POSITION', 'SA', 0, 1);

    -- Step 6: เสร็จสิ้น -> PM
    INSERT INTO pms.project_request_workflow_step_assignees (step_def_id, assignee_type, assignee_value, is_primary, can_complete)
    VALUES
    (@Step6Id, 'POSITION', 'PM', 1, 1);

    PRINT 'Inserted default step assignees for Full Workflow';
END
GO

-- =============================================
-- 7. View for Step Assignees with names
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_workflow_step_assignees' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_workflow_step_assignees;
GO

CREATE VIEW pms.vw_workflow_step_assignees AS
SELECT
    a.id,
    a.step_def_id,
    s.step_order,
    s.step_code,
    s.step_name,
    s.template_id,
    t.code AS template_code,
    t.name AS template_name,
    a.assignee_type,
    a.assignee_value,
    CASE
        WHEN a.assignee_type = 'POSITION' THEN (SELECT name FROM pms.positions WHERE code = a.assignee_value)
        WHEN a.assignee_type = 'ROLE' THEN a.assignee_value
        WHEN a.assignee_type = 'USER' THEN (SELECT COALESCE(first_name_th + ' ' + last_name_th, first_name + ' ' + last_name) FROM pms.employees WHERE CAST(id AS NVARCHAR(36)) = a.assignee_value)
        ELSE a.assignee_value
    END AS assignee_name,
    a.is_primary,
    a.can_complete,
    a.is_active
FROM pms.project_request_workflow_step_assignees a
INNER JOIN pms.project_request_workflow_step_defs s ON a.step_def_id = s.id
INNER JOIN pms.project_request_workflow_templates t ON s.template_id = t.id;
GO

PRINT 'Created view: pms.vw_workflow_step_assignees';
PRINT 'Migration completed successfully!';
GO
