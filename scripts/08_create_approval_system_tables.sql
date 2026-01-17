-- ============================================
-- Central Approval Management System Tables
-- For MSSQL / PMS Project
-- ============================================

-- 1. approval_flow_templates - Template การอนุมัติ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_flow_templates' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_flow_templates (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        flow_code VARCHAR(50) NOT NULL UNIQUE,
        flow_name NVARCHAR(200) NOT NULL,
        module_code VARCHAR(50) NOT NULL, -- 'PROJECT', 'PURCHASE', 'EXPENSE', 'HR', etc.
        document_type VARCHAR(50), -- 'PROJECT_CHARTER', 'PO', 'EXPENSE_CLAIM', etc.
        description NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_by UNIQUEIDENTIFIER,
        created_at DATETIME DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER,
        updated_at DATETIME,

        INDEX idx_module (module_code, is_active),
        INDEX idx_flow_code (flow_code)
    );
    PRINT 'Created table pms.approval_flow_templates';
END
GO

-- 2. approval_flow_steps - ขั้นตอนการอนุมัติ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_flow_steps' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_flow_steps (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        flow_template_id UNIQUEIDENTIFIER NOT NULL,
        step_order INT NOT NULL, -- ลำดับขั้นตอน 1, 2, 3...
        step_name NVARCHAR(200) NOT NULL,
        step_type VARCHAR(20) NOT NULL DEFAULT 'SEQUENTIAL', -- 'SEQUENTIAL', 'PARALLEL', 'CONDITIONAL'
        approval_type VARCHAR(20) DEFAULT 'SINGLE', -- 'SINGLE', 'ALL', 'ANY', 'MAJORITY'
        can_reject BIT DEFAULT 1,
        can_delegate BIT DEFAULT 1,
        can_rollback BIT DEFAULT 0,
        timeout_hours INT, -- ระยะเวลาที่ต้องอนุมัติ (ชั่วโมง)
        is_mandatory BIT DEFAULT 1,
        skip_condition NVARCHAR(MAX), -- JSON เงื่อนไขการข้าม step
        created_at DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (flow_template_id) REFERENCES pms.approval_flow_templates(id),
        INDEX idx_flow_order (flow_template_id, step_order)
    );
    PRINT 'Created table pms.approval_flow_steps';
END
GO

-- 3. approval_step_approvers - ผู้อนุมัติในแต่ละ Step
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_step_approvers' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_step_approvers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        step_id UNIQUEIDENTIFIER NOT NULL,
        approver_type VARCHAR(20) NOT NULL, -- 'USER', 'ROLE', 'POSITION', 'DOA_RULE', 'DYNAMIC'
        approver_value VARCHAR(200), -- User ID, Role Code, Position Code, DOA Rule ID
        approver_order INT DEFAULT 1, -- ลำดับใน parallel approval
        is_required BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (step_id) REFERENCES pms.approval_flow_steps(id),
        INDEX idx_step (step_id)
    );
    PRINT 'Created table pms.approval_step_approvers';
END
GO

-- 4. doa_rules - กฎ DOA (Delegation of Authority)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'doa_rules' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.doa_rules (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        rule_code VARCHAR(50) NOT NULL UNIQUE,
        rule_name NVARCHAR(200) NOT NULL,
        module_code VARCHAR(50) NOT NULL,
        document_type VARCHAR(50), -- 'PO', 'EXPENSE', 'LEAVE', etc.
        conditions NVARCHAR(MAX) NOT NULL, -- JSON เงื่อนไขการใช้งาน
        description NVARCHAR(500),
        priority INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        effective_date DATE,
        expiry_date DATE,
        created_by UNIQUEIDENTIFIER,
        created_at DATETIME DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER,
        updated_at DATETIME,

        INDEX idx_module_type (module_code, document_type, is_active)
    );
    PRINT 'Created table pms.doa_rules';
END
GO

-- 5. doa_assignments - การมอบอำนาจ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'doa_assignments' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.doa_assignments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        doa_rule_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL, -- ผู้ที่ได้รับอำนาจ
        position_code VARCHAR(50),
        department_id UNIQUEIDENTIFIER,
        min_amount DECIMAL(15,2),
        max_amount DECIMAL(15,2),
        conditions NVARCHAR(MAX), -- JSON เงื่อนไขเพิ่มเติม
        is_active BIT DEFAULT 1,
        effective_date DATE NOT NULL,
        expiry_date DATE,
        delegated_from UNIQUEIDENTIFIER, -- มอบอำนาจจากใคร (ถ้ามี)
        delegation_reason NVARCHAR(500),
        created_by UNIQUEIDENTIFIER,
        created_at DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (doa_rule_id) REFERENCES pms.doa_rules(id),
        INDEX idx_user (user_id, is_active),
        INDEX idx_doa_rule (doa_rule_id)
    );
    PRINT 'Created table pms.doa_assignments';
END
GO

-- 6. approval_instances - Instance การอนุมัติจริง
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_instances' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_instances (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        flow_template_id UNIQUEIDENTIFIER NOT NULL,
        module_code VARCHAR(50) NOT NULL,
        document_id VARCHAR(100) NOT NULL, -- เอกสารที่ขออนุมัติ (Project ID, PO ID, etc.)
        document_type VARCHAR(50) NOT NULL,
        document_number VARCHAR(100), -- เลขที่เอกสาร
        document_title NVARCHAR(500), -- ชื่อเอกสาร
        requester_id UNIQUEIDENTIFIER NOT NULL,
        request_date DATETIME DEFAULT GETDATE(),
        current_step_id UNIQUEIDENTIFIER,
        current_step_order INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, APPROVED, REJECTED, CANCELLED, ROLLED_BACK
        completion_date DATETIME,
        document_data NVARCHAR(MAX), -- JSON ข้อมูลเอกสารสำหรับตัดสินใจ
        metadata NVARCHAR(MAX), -- JSON ข้อมูลเพิ่มเติม
        priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT

        FOREIGN KEY (flow_template_id) REFERENCES pms.approval_flow_templates(id),
        INDEX idx_document (module_code, document_id),
        INDEX idx_requester (requester_id, status),
        INDEX idx_status (status, request_date),
        INDEX idx_current_step (current_step_id)
    );
    PRINT 'Created table pms.approval_instances';
END
GO

-- 7. approval_instance_approvers - ผู้อนุมัติของแต่ละ instance (resolved)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_instance_approvers' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_instance_approvers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        instance_id UNIQUEIDENTIFIER NOT NULL,
        step_id UNIQUEIDENTIFIER NOT NULL,
        step_order INT NOT NULL,
        approver_id UNIQUEIDENTIFIER NOT NULL, -- resolved user id
        status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, DELEGATED, SKIPPED
        action_date DATETIME,
        comments NVARCHAR(MAX),
        delegated_to UNIQUEIDENTIFIER,
        created_at DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (instance_id) REFERENCES pms.approval_instances(id),
        INDEX idx_instance_step (instance_id, step_order),
        INDEX idx_approver (approver_id, status)
    );
    PRINT 'Created table pms.approval_instance_approvers';
END
GO

-- 8. approval_actions - การดำเนินการอนุมัติ (History)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_actions' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_actions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        instance_id UNIQUEIDENTIFIER NOT NULL,
        step_id UNIQUEIDENTIFIER NOT NULL,
        step_order INT NOT NULL,
        approver_id UNIQUEIDENTIFIER NOT NULL,
        action_type VARCHAR(20) NOT NULL, -- APPROVE, REJECT, DELEGATE, ROLLBACK, REQUEST_INFO, CANCEL
        action_date DATETIME DEFAULT GETDATE(),
        comments NVARCHAR(MAX),
        delegated_to UNIQUEIDENTIFIER,
        delegation_reason NVARCHAR(500),
        attachments NVARCHAR(MAX), -- JSON
        response_time_hours INT, -- เวลาที่ใช้ในการตอบกลับ
        ip_address VARCHAR(50),
        user_agent NVARCHAR(500),

        FOREIGN KEY (instance_id) REFERENCES pms.approval_instances(id),
        INDEX idx_instance (instance_id, step_order),
        INDEX idx_approver (approver_id, action_date)
    );
    PRINT 'Created table pms.approval_actions';
END
GO

-- 9. approval_history - ประวัติการเปลี่ยนแปลงสถานะ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'approval_history' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.approval_history (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        instance_id UNIQUEIDENTIFIER NOT NULL,
        from_step_id UNIQUEIDENTIFIER,
        to_step_id UNIQUEIDENTIFIER,
        from_status VARCHAR(20),
        to_status VARCHAR(20),
        changed_by UNIQUEIDENTIFIER NOT NULL,
        change_reason NVARCHAR(500),
        change_date DATETIME DEFAULT GETDATE(),
        metadata NVARCHAR(MAX), -- JSON

        FOREIGN KEY (instance_id) REFERENCES pms.approval_instances(id),
        INDEX idx_instance (instance_id, change_date)
    );
    PRINT 'Created table pms.approval_history';
END
GO

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample flow template for Project Charter
IF NOT EXISTS (SELECT 1 FROM pms.approval_flow_templates WHERE flow_code = 'PROJECT_CHARTER')
BEGIN
    DECLARE @flowId UNIQUEIDENTIFIER = NEWID()
    DECLARE @step1Id UNIQUEIDENTIFIER = NEWID()
    DECLARE @step2Id UNIQUEIDENTIFIER = NEWID()
    DECLARE @step3Id UNIQUEIDENTIFIER = NEWID()

    -- Flow Template
    INSERT INTO pms.approval_flow_templates (id, flow_code, flow_name, module_code, document_type, description, is_active)
    VALUES (@flowId, 'PROJECT_CHARTER', N'Project Charter Approval', 'PROJECT', 'PROJECT_CHARTER', N'Flow สำหรับอนุมัติเอกสารเปิดโครงการ', 1)

    -- Steps
    INSERT INTO pms.approval_flow_steps (id, flow_template_id, step_order, step_name, step_type, approval_type, can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory)
    VALUES
        (@step1Id, @flowId, 1, N'Project Manager Review', 'SEQUENTIAL', 'SINGLE', 1, 1, 0, 24, 1),
        (@step2Id, @flowId, 2, N'Department Head Approval', 'SEQUENTIAL', 'SINGLE', 1, 1, 1, 48, 1),
        (@step3Id, @flowId, 3, N'Executive Approval', 'CONDITIONAL', 'SINGLE', 1, 0, 0, 72, 0)

    -- Step 3 skip condition (budget < 1000000)
    UPDATE pms.approval_flow_steps SET skip_condition = '{"field": "budget", "operator": "<", "value": 1000000}' WHERE id = @step3Id

    -- Approvers
    INSERT INTO pms.approval_step_approvers (step_id, approver_type, approver_value, approver_order, is_required)
    VALUES
        (@step1Id, 'DYNAMIC', 'PROJECT_MANAGER', 1, 1),
        (@step2Id, 'DYNAMIC', 'DEPT_HEAD', 1, 1),
        (@step3Id, 'DOA_RULE', 'DOA_PROJECT', 1, 1)

    PRINT 'Inserted PROJECT_CHARTER flow template with steps';
END
GO

-- Insert sample DOA rule for Project
IF NOT EXISTS (SELECT 1 FROM pms.doa_rules WHERE rule_code = 'DOA_PROJECT')
BEGIN
    INSERT INTO pms.doa_rules (rule_code, rule_name, module_code, document_type, conditions, description, priority, is_active, effective_date)
    VALUES (
        'DOA_PROJECT',
        N'Project Budget Authority',
        'PROJECT',
        'PROJECT_CHARTER',
        N'{
            "type": "AMOUNT_BASED",
            "field": "budget",
            "rules": [
                {"level": "MANAGER", "position": "manager", "min_amount": 0, "max_amount": 500000},
                {"level": "DIRECTOR", "position": "director", "min_amount": 500001, "max_amount": 2000000},
                {"level": "EXECUTIVE", "position": "admin", "min_amount": 2000001, "max_amount": null}
            ]
        }',
        N'DOA สำหรับ Project ตามงบประมาณ',
        1,
        1,
        GETDATE()
    )
    PRINT 'Inserted DOA_PROJECT rule';
END
GO

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View: Pending approvals for a user
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_pending_approvals' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.v_pending_approvals
GO

CREATE VIEW pms.v_pending_approvals AS
SELECT
    ai.id AS instance_id,
    ai.document_id,
    ai.document_type,
    ai.document_number,
    ai.document_title,
    ai.module_code,
    ai.status,
    ai.priority,
    ai.request_date,
    ai.current_step_order,
    aia.approver_id,
    aia.status AS approver_status,
    afs.step_name,
    afs.timeout_hours,
    aft.flow_name,
    CONCAT(u.first_name, ' ', u.last_name) AS requester_name,
    DATEDIFF(HOUR, ai.request_date, GETDATE()) AS waiting_hours
FROM pms.approval_instances ai
JOIN pms.approval_instance_approvers aia ON ai.id = aia.instance_id AND ai.current_step_order = aia.step_order
JOIN pms.approval_flow_steps afs ON aia.step_id = afs.id
JOIN pms.approval_flow_templates aft ON ai.flow_template_id = aft.id
LEFT JOIN pms.employees u ON ai.requester_id = u.id
WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
  AND aia.status = 'PENDING'
GO

PRINT 'Created view pms.v_pending_approvals';
GO

-- ============================================
-- VERIFY TABLES
-- ============================================
SELECT
    t.name AS table_name,
    (SELECT COUNT(*) FROM sys.columns WHERE object_id = t.object_id) AS column_count
FROM sys.tables t
WHERE t.schema_id = SCHEMA_ID('pms')
  AND t.name LIKE 'approval%' OR t.name LIKE 'doa%'
ORDER BY t.name;
