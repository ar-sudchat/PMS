-- =============================================
-- Seed Approval Flow for Project Requests
-- Database: MoveonDB
-- Schema: pms
-- =============================================
USE [MoveonDB]
GO

DECLARE @ModuleCode NVARCHAR(50) = 'PROJECT'
DECLARE @DocumentType NVARCHAR(50) = 'PROJECT_REQUEST'
DECLARE @FlowCode NVARCHAR(50) = 'PROJECT_REQUEST_FLOW'
DECLARE @AdminId UNIQUEIDENTIFIER

-- Get an admin user ID for creation (optional, can be NULL)
SELECT TOP 1 @AdminId = id FROM pms.employees WHERE role = 'admin'

-- 1. Create Flow Template
DECLARE @TemplateId UNIQUEIDENTIFIER = NEWID()

IF NOT EXISTS (SELECT * FROM pms.approval_flow_templates WHERE flow_code = @FlowCode)
BEGIN
    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active, created_by)
    VALUES
    (@TemplateId, @FlowCode, 'Project Request Approval Flow', @ModuleCode, @DocumentType, 'ขั้นตอนการอนุมัติคำขอเปิดโปรเจค', 1, @AdminId)

    PRINT 'Created Flow Template: ' + @FlowCode
END
ELSE
BEGIN
    SELECT @TemplateId = id FROM pms.approval_flow_templates WHERE flow_code = @FlowCode
    PRINT 'Flow Template exists: ' + @FlowCode
END

-- 2. Create Steps
-- Delete existing steps/approvers to reset (for development)
DELETE FROM pms.approval_step_approvers WHERE step_id IN (SELECT id FROM pms.approval_flow_steps WHERE flow_template_id = @TemplateId)
DELETE FROM pms.approval_flow_steps WHERE flow_template_id = @TemplateId

-- Step 1: Manager Review
DECLARE @Step1Id UNIQUEIDENTIFIER = NEWID()
INSERT INTO pms.approval_flow_steps
(id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
VALUES
(@Step1Id, @TemplateId, 1, 'ผู้จัดการตรวจสอบ', 'SEQUENTIAL', 'SINGLE', 1, 1, 1, 48, 1)

-- Approvers for Step 1: 'manager' ROLE
INSERT INTO pms.approval_step_approvers
(id, step_id, approver_type, approver_value, approver_order, is_required)
VALUES
(NEWID(), @Step1Id, 'ROLE', 'manager', 1, 1)

-- Step 2: Final Approval (Admin)
DECLARE @Step2Id UNIQUEIDENTIFIER = NEWID()
INSERT INTO pms.approval_flow_steps
(id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
VALUES
(@Step2Id, @TemplateId, 2, 'อนุมัติขั้นสุดท้าย', 'SEQUENTIAL', 'SINGLE', 1, 1, 1, 48, 1)

-- Approvers for Step 2: 'admin' ROLE
INSERT INTO pms.approval_step_approvers
(id, step_id, approver_type, approver_value, approver_order, is_required)
VALUES
(NEWID(), @Step2Id, 'ROLE', 'admin', 1, 1)

-- Add 'admin' as fallback approver for Step 1 too
INSERT INTO pms.approval_step_approvers (id, step_id, approver_type, approver_value, approver_order, is_required)
VALUES (NEWID(), @Step1Id, 'ROLE', 'admin', 2, 0)

PRINT 'Created Flow Steps and Approvers for PROJECT_REQUEST_FLOW'
GO

-- Verify the flow was created
SELECT
    ft.flow_code,
    ft.flow_name,
    ft.module_code,
    ft.document_type,
    fs.step_order,
    fs.step_name,
    sa.approver_type,
    sa.approver_value
FROM pms.approval_flow_templates ft
JOIN pms.approval_flow_steps fs ON ft.id = fs.flow_template_id
JOIN pms.approval_step_approvers sa ON fs.id = sa.step_id
WHERE ft.flow_code = 'PROJECT_REQUEST_FLOW'
ORDER BY fs.step_order, sa.approver_order
GO
