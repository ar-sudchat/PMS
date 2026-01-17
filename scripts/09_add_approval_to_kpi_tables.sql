-- ============================================
-- Add Approval System to KPI Record Tables
-- For MSSQL / PMS Project
-- ============================================

-- ============================================
-- PART 1: ADD APPROVAL COLUMNS TO KPI TABLES
-- ============================================

-- 1. Deploy Success Records
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.deploy_success_records')
    AND name = 'approval_status'
)
BEGIN
    ALTER TABLE pms.deploy_success_records ADD
        approval_status VARCHAR(20) DEFAULT 'DRAFT',
        approval_instance_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added approval columns to pms.deploy_success_records';
END
GO

-- 2. Deploy Backup Records
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.deploy_backup_records')
    AND name = 'approval_status'
)
BEGIN
    ALTER TABLE pms.deploy_backup_records ADD
        approval_status VARCHAR(20) DEFAULT 'DRAFT',
        approval_instance_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added approval columns to pms.deploy_backup_records';
END
GO

-- 3. Meeting Minutes Records
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.meeting_minutes_records')
    AND name = 'approval_status'
)
BEGIN
    ALTER TABLE pms.meeting_minutes_records ADD
        approval_status VARCHAR(20) DEFAULT 'DRAFT',
        approval_instance_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added approval columns to pms.meeting_minutes_records';
END
GO

-- ============================================
-- PART 2: CREATE APPROVAL FLOW TEMPLATES FOR KPI
-- ============================================

-- 1. Deploy Success Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'DEPLOY_SUCCESS')
BEGIN
    DECLARE @deploySuccessFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @deploySuccessStepId UNIQUEIDENTIFIER = NEWID()

    -- Create Flow Template
    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES (
        @deploySuccessFlowId,
        'DEPLOY_SUCCESS',
        N'Deploy Success Record Approval',
        'KPI',
        'DEPLOY_SUCCESS',
        N'อนุมัติบันทึก Deploy Success โดย PM',
        1
    )

    -- Create Step (PM Approval)
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES (
        @deploySuccessStepId,
        @deploySuccessFlowId,
        1,
        N'PM Approval',
        'SEQUENTIAL',
        'SINGLE',
        1,  -- can_reject
        1,  -- can_delegate
        0,  -- can_rollback
        48, -- timeout_hours
        1   -- is_mandatory
    )

    -- Add Approver (Dynamic - Project Manager)
    INSERT INTO pms.approval_step_approvers
    (step_id, approver_type, approver_value, approver_order, is_required)
    VALUES (
        @deploySuccessStepId,
        'DYNAMIC',
        'PROJECT_MANAGER',
        1,
        1
    )

    PRINT 'Created DEPLOY_SUCCESS approval flow template';
END
GO

-- 2. Deploy Backup Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'DEPLOY_BACKUP')
BEGIN
    DECLARE @deployBackupFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @deployBackupStepId UNIQUEIDENTIFIER = NEWID()

    -- Create Flow Template
    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES (
        @deployBackupFlowId,
        'DEPLOY_BACKUP',
        N'Deploy Backup Record Approval',
        'KPI',
        'DEPLOY_BACKUP',
        N'อนุมัติบันทึก Deploy Backup โดย PM',
        1
    )

    -- Create Step (PM Approval)
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES (
        @deployBackupStepId,
        @deployBackupFlowId,
        1,
        N'PM Approval',
        'SEQUENTIAL',
        'SINGLE',
        1,  -- can_reject
        1,  -- can_delegate
        0,  -- can_rollback
        48, -- timeout_hours
        1   -- is_mandatory
    )

    -- Add Approver (Dynamic - Project Manager)
    INSERT INTO pms.approval_step_approvers
    (step_id, approver_type, approver_value, approver_order, is_required)
    VALUES (
        @deployBackupStepId,
        'DYNAMIC',
        'PROJECT_MANAGER',
        1,
        1
    )

    PRINT 'Created DEPLOY_BACKUP approval flow template';
END
GO

-- 3. Meeting Minutes Approval Flow
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'MEETING_MINUTES')
BEGIN
    DECLARE @meetingFlowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @meetingStepId UNIQUEIDENTIFIER = NEWID()

    -- Create Flow Template
    INSERT INTO pms.approval_flow_templates
    (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES (
        @meetingFlowId,
        'MEETING_MINUTES',
        N'Meeting Minutes Approval',
        'KPI',
        'MEETING_MINUTES',
        N'อนุมัติรายงานการประชุม (MoM) โดย PM',
        1
    )

    -- Create Step (PM Approval)
    INSERT INTO pms.approval_flow_steps
    (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES (
        @meetingStepId,
        @meetingFlowId,
        1,
        N'PM Approval',
        'SEQUENTIAL',
        'SINGLE',
        1,  -- can_reject
        1,  -- can_delegate
        0,  -- can_rollback
        24, -- timeout_hours (MoM should be approved faster)
        1   -- is_mandatory
    )

    -- Add Approver (Dynamic - Project Manager)
    INSERT INTO pms.approval_step_approvers
    (step_id, approver_type, approver_value, approver_order, is_required)
    VALUES (
        @meetingStepId,
        'DYNAMIC',
        'PROJECT_MANAGER',
        1,
        1
    )

    PRINT 'Created MEETING_MINUTES approval flow template';
END
GO

-- ============================================
-- PART 3: CREATE INDEXES FOR APPROVAL STATUS
-- ============================================

-- Index for deploy_success_records
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_deploy_success_approval' AND object_id = OBJECT_ID('pms.deploy_success_records'))
BEGIN
    CREATE INDEX idx_deploy_success_approval ON pms.deploy_success_records(approval_status, approval_instance_id);
    PRINT 'Created index idx_deploy_success_approval';
END
GO

-- Index for deploy_backup_records
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_deploy_backup_approval' AND object_id = OBJECT_ID('pms.deploy_backup_records'))
BEGIN
    CREATE INDEX idx_deploy_backup_approval ON pms.deploy_backup_records(approval_status, approval_instance_id);
    PRINT 'Created index idx_deploy_backup_approval';
END
GO

-- Index for meeting_minutes_records
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_meeting_minutes_approval' AND object_id = OBJECT_ID('pms.meeting_minutes_records'))
BEGIN
    CREATE INDEX idx_meeting_minutes_approval ON pms.meeting_minutes_records(approval_status, approval_instance_id);
    PRINT 'Created index idx_meeting_minutes_approval';
END
GO

-- ============================================
-- VERIFY
-- ============================================

-- Check approval flow templates
SELECT
    flow_code,
    flow_name,
    module_code,
    document_type,
    is_active
FROM pms.approval_flow_templates
WHERE module_code = 'KPI'
ORDER BY flow_code;

-- Check flow steps
SELECT
    ft.flow_code,
    fs.step_order,
    fs.step_name,
    fs.step_type,
    fs.approval_type,
    fs.timeout_hours
FROM pms.approval_flow_templates ft
JOIN pms.approval_flow_steps fs ON ft.id = fs.flow_template_id
WHERE ft.module_code = 'KPI'
ORDER BY ft.flow_code, fs.step_order;

-- Check approvers
SELECT
    ft.flow_code,
    fs.step_name,
    sa.approver_type,
    sa.approver_value,
    sa.is_required
FROM pms.approval_flow_templates ft
JOIN pms.approval_flow_steps fs ON ft.id = fs.flow_template_id
JOIN pms.approval_step_approvers sa ON fs.id = sa.step_id
WHERE ft.module_code = 'KPI'
ORDER BY ft.flow_code, fs.step_order;
