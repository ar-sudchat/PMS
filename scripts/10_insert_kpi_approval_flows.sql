-- ============================================
-- INSERT APPROVAL FLOW TEMPLATES FOR KPI RECORDS
-- ============================================

-- 1. Deploy Success Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'DEPLOY_SUCCESS')
BEGIN
    DECLARE @deploySuccessFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @deploySuccessStepId UNIQUEIDENTIFIER = NEWID()

    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES
    (@deploySuccessFlowId, 'DEPLOY_SUCCESS', N'Deploy Success Record Approval', 'KPI', 'DEPLOY_SUCCESS', N'อนุมัติบันทึก Deploy Success', 1)

    -- Add Step: PM Approval
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES
    (@deploySuccessStepId, @deploySuccessFlowId, 1, N'PM Approval', 'SEQUENTIAL', 'SINGLE', 1, 1, 0, 48, 1)

    -- Add Approver: Dynamic (PROJECT_MANAGER)
    INSERT INTO pms.approval_step_approvers
    (id, step_id, approver_type, approver_value, approver_order, is_required)
    VALUES
    (NEWID(), @deploySuccessStepId, 'DYNAMIC', 'PROJECT_MANAGER', 1, 1)

    PRINT 'Created DEPLOY_SUCCESS flow'
END
ELSE
    PRINT 'DEPLOY_SUCCESS flow already exists'
GO

-- 2. Deploy Backup Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'DEPLOY_BACKUP')
BEGIN
    DECLARE @deployBackupFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @deployBackupStepId UNIQUEIDENTIFIER = NEWID()

    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES
    (@deployBackupFlowId, 'DEPLOY_BACKUP', N'Deploy Backup Record Approval', 'KPI', 'DEPLOY_BACKUP', N'อนุมัติบันทึก Deploy Backup', 1)

    -- Add Step: PM Approval
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES
    (@deployBackupStepId, @deployBackupFlowId, 1, N'PM Approval', 'SEQUENTIAL', 'SINGLE', 1, 1, 0, 48, 1)

    -- Add Approver: Dynamic (PROJECT_MANAGER)
    INSERT INTO pms.approval_step_approvers
    (id, step_id, approver_type, approver_value, approver_order, is_required)
    VALUES
    (NEWID(), @deployBackupStepId, 'DYNAMIC', 'PROJECT_MANAGER', 1, 1)

    PRINT 'Created DEPLOY_BACKUP flow'
END
ELSE
    PRINT 'DEPLOY_BACKUP flow already exists'
GO

-- 3. Meeting Minutes Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'MEETING_MINUTES')
BEGIN
    DECLARE @meetingMinutesFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @meetingMinutesStepId UNIQUEIDENTIFIER = NEWID()

    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES
    (@meetingMinutesFlowId, 'MEETING_MINUTES', N'Meeting Minutes Approval', 'KPI', 'MEETING_MINUTES', N'อนุมัติรายงานการประชุม', 1)

    -- Add Step: PM Approval
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES
    (@meetingMinutesStepId, @meetingMinutesFlowId, 1, N'PM Approval', 'SEQUENTIAL', 'SINGLE', 1, 1, 0, 24, 1)

    -- Add Approver: Dynamic (PROJECT_MANAGER)
    INSERT INTO pms.approval_step_approvers
    (id, step_id, approver_type, approver_value, approver_order, is_required)
    VALUES
    (NEWID(), @meetingMinutesStepId, 'DYNAMIC', 'PROJECT_MANAGER', 1, 1)

    PRINT 'Created MEETING_MINUTES flow'
END
ELSE
    PRINT 'MEETING_MINUTES flow already exists'
GO

-- Verify
SELECT * FROM pms.approval_flow_templates WHERE module_code = 'KPI'
SELECT * FROM pms.approval_flow_steps WHERE flow_template_id IN (SELECT id FROM pms.approval_flow_templates WHERE module_code = 'KPI')
SELECT * FROM pms.approval_step_approvers WHERE step_id IN (SELECT id FROM pms.approval_flow_steps WHERE flow_template_id IN (SELECT id FROM pms.approval_flow_templates WHERE module_code = 'KPI'))
