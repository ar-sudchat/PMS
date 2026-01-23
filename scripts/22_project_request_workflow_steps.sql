-- =============================================
-- Project Request Workflow Steps System
-- Database: MoveonDB
-- Schema: pms
-- =============================================
USE [MoveonDB]
GO

-- =============================================
-- 1. Workflow Templates (กำหนดรูปแบบ workflow)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_workflow_templates' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_request_workflow_templates (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        is_default BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table: pms.project_request_workflow_templates';
END
GO

-- =============================================
-- 2. Workflow Step Definitions (กำหนด steps ในแต่ละ template)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_workflow_step_defs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_request_workflow_step_defs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        template_id UNIQUEIDENTIFIER NOT NULL,
        step_order INT NOT NULL,
        step_code NVARCHAR(50) NOT NULL,
        step_name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        icon NVARCHAR(50) NULL,
        color NVARCHAR(50) NULL,
        is_required BIT NOT NULL DEFAULT 1,        -- จำเป็นต้องผ่าน step นี้ไหม
        can_skip BIT NOT NULL DEFAULT 0,           -- ข้ามได้ไหม
        can_complete_early BIT NOT NULL DEFAULT 0, -- จบก่อนได้ไหม (เปิด Project จาก step นี้)
        required_fields NVARCHAR(MAX) NULL,        -- JSON array ของ fields ที่ต้องกรอก
        is_active BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_workflow_step_defs_template FOREIGN KEY (template_id)
            REFERENCES pms.project_request_workflow_templates(id)
    );
    PRINT 'Created table: pms.project_request_workflow_step_defs';
END
GO

-- =============================================
-- 3. Add workflow columns to project_requests
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'workflow_template_id')
BEGIN
    ALTER TABLE pms.project_requests ADD workflow_template_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added column: workflow_template_id';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'current_step')
BEGIN
    ALTER TABLE pms.project_requests ADD current_step INT NOT NULL DEFAULT 1;
    PRINT 'Added column: current_step';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'workflow_status')
BEGIN
    -- DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
    ALTER TABLE pms.project_requests ADD workflow_status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT';
    PRINT 'Added column: workflow_status';
END
GO

-- =============================================
-- 4. Step History (บันทึกประวัติการทำแต่ละ step)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_step_history' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_request_step_history (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        step_order INT NOT NULL,
        step_code NVARCHAR(50) NOT NULL,
        step_name NVARCHAR(100) NOT NULL,
        action NVARCHAR(20) NOT NULL,              -- STARTED, COMPLETED, SKIPPED, REVERTED
        notes NVARCHAR(MAX) NULL,
        completed_at DATETIME2 NULL,
        completed_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_step_history_request FOREIGN KEY (request_id)
            REFERENCES pms.project_requests(id)
    );
    PRINT 'Created table: pms.project_request_step_history';
END
GO

-- =============================================
-- 5. Insert Default Workflow Templates
-- =============================================
DECLARE @FullTemplateId UNIQUEIDENTIFIER = NEWID()
DECLARE @QuickTemplateId UNIQUEIDENTIFIER = NEWID()

-- Full Workflow Template (ครบทุก step)
IF NOT EXISTS (SELECT * FROM pms.project_request_workflow_templates WHERE code = 'FULL_WORKFLOW')
BEGIN
    INSERT INTO pms.project_request_workflow_templates (id, code, name, description, is_default, is_active)
    VALUES (@FullTemplateId, 'FULL_WORKFLOW', 'Full Workflow', 'ขั้นตอนครบถ้วน: สร้าง → รับงาน → ติดต่อลูกค้า → ประชุม → ประเมินราคา → เสร็จสิ้น', 1, 1);

    -- Steps for Full Workflow
    INSERT INTO pms.project_request_workflow_step_defs
    (template_id, step_order, step_code, step_name, description, icon, color, is_required, can_skip, can_complete_early, required_fields)
    VALUES
    (@FullTemplateId, 1, 'CREATED', 'สร้างคำขอ', 'สร้างคำขอโครงการใหม่', 'FileText', 'slate', 1, 0, 0, '["title","project_type","priority"]'),
    (@FullTemplateId, 2, 'ACCEPTED', 'รับงาน', 'รับงานและมอบหมายผู้รับผิดชอบ', 'UserCheck', 'blue', 1, 0, 1, NULL),
    (@FullTemplateId, 3, 'CONTACTED', 'ติดต่อลูกค้า', 'ติดต่อลูกค้าเพื่อสอบถามรายละเอียด', 'Phone', 'cyan', 0, 1, 1, '["customer_contact_date"]'),
    (@FullTemplateId, 4, 'MEETING', 'ประชุมลูกค้า', 'ประชุมกับลูกค้าเพื่อรับ requirement', 'Users', 'violet', 0, 1, 1, '["last_meeting_date"]'),
    (@FullTemplateId, 5, 'QUOTED', 'ประเมินราคา', 'ประเมินราคาและ Man-day', 'Calculator', 'amber', 0, 1, 1, '["estimated_budget","estimated_mandays","quotation_date"]'),
    (@FullTemplateId, 6, 'COMPLETED', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้น พร้อมเปิด Project', 'CheckCircle', 'green', 1, 0, 0, NULL);

    PRINT 'Created Full Workflow Template with 6 steps';
END
ELSE
BEGIN
    SELECT @FullTemplateId = id FROM pms.project_request_workflow_templates WHERE code = 'FULL_WORKFLOW';
END

-- Quick Workflow Template (จบเร็ว)
IF NOT EXISTS (SELECT * FROM pms.project_request_workflow_templates WHERE code = 'QUICK_WORKFLOW')
BEGIN
    INSERT INTO pms.project_request_workflow_templates (id, code, name, description, is_default, is_active)
    VALUES (@QuickTemplateId, 'QUICK_WORKFLOW', 'Quick Workflow', 'ขั้นตอนสั้น: สร้าง → รับงาน → เสร็จสิ้น (สำหรับงานเร่งด่วน)', 0, 1);

    -- Steps for Quick Workflow
    INSERT INTO pms.project_request_workflow_step_defs
    (template_id, step_order, step_code, step_name, description, icon, color, is_required, can_skip, can_complete_early, required_fields)
    VALUES
    (@QuickTemplateId, 1, 'CREATED', 'สร้างคำขอ', 'สร้างคำขอโครงการใหม่', 'FileText', 'slate', 1, 0, 0, '["title","project_type","priority"]'),
    (@QuickTemplateId, 2, 'ACCEPTED', 'รับงาน', 'รับงานและตอบรับลูกค้า', 'UserCheck', 'blue', 1, 0, 1, NULL),
    (@QuickTemplateId, 3, 'COMPLETED', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้น', 'CheckCircle', 'green', 1, 0, 0, NULL);

    PRINT 'Created Quick Workflow Template with 3 steps';
END

-- Set default template for existing requests
UPDATE pms.project_requests
SET workflow_template_id = @FullTemplateId,
    current_step = CASE
        WHEN status = 'DRAFT' THEN 1
        WHEN status = 'PENDING' THEN 2
        WHEN status = 'APPROVED' THEN 5
        WHEN status = 'CONVERTED' THEN 6
        ELSE 1
    END,
    workflow_status = CASE
        WHEN status = 'CONVERTED' THEN 'COMPLETED'
        WHEN status = 'REJECTED' THEN 'CANCELLED'
        ELSE 'IN_PROGRESS'
    END
WHERE workflow_template_id IS NULL;

PRINT 'Updated existing requests with default workflow';
GO

-- =============================================
-- 6. View for Workflow Templates with Steps
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_workflow_templates' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_workflow_templates;
GO

CREATE VIEW pms.vw_workflow_templates AS
SELECT
    t.id,
    t.code,
    t.name,
    t.description,
    t.is_default,
    t.is_active,
    (SELECT COUNT(*) FROM pms.project_request_workflow_step_defs WHERE template_id = t.id AND is_active = 1) AS step_count
FROM pms.project_request_workflow_templates t;
GO

PRINT 'Created view: pms.vw_workflow_templates';
GO

-- =============================================
-- 7. Update vw_project_requests to include workflow info
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_project_requests' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_project_requests;
GO

CREATE VIEW pms.vw_project_requests AS
SELECT
    r.id,
    r.request_code,
    r.title,
    r.description,
    r.customer_id,
    c.name AS customer_name,
    r.contact_person,
    r.contact_email,
    r.contact_phone,
    r.project_type,
    pt.name AS project_type_name,
    r.priority,
    pp.name AS priority_name,
    pp.color AS priority_color,
    r.estimated_budget,
    r.estimated_mandays,
    r.expected_start_date,
    r.expected_end_date,
    r.status,
    ps.name AS status_name,
    ps.color AS status_color,
    -- Workflow fields
    r.workflow_template_id,
    wt.code AS workflow_template_code,
    wt.name AS workflow_template_name,
    r.current_step,
    sd.step_name AS current_step_name,
    sd.step_code AS current_step_code,
    r.workflow_status,
    (SELECT COUNT(*) FROM pms.project_request_workflow_step_defs WHERE template_id = r.workflow_template_id AND is_active = 1) AS total_steps,
    -- Date fields
    r.customer_contact_date,
    r.last_meeting_date,
    r.quotation_date,
    r.approval_date,
    r.submitted_at,
    r.submitted_by,
    COALESCE(sub.first_name_th + ' ' + sub.last_name_th, sub.first_name + ' ' + sub.last_name) AS submitted_by_name,
    r.approved_at,
    r.approved_by,
    COALESCE(apr.first_name_th + ' ' + apr.last_name_th, apr.first_name + ' ' + apr.last_name) AS approved_by_name,
    r.rejected_at,
    r.rejected_by,
    COALESCE(rej.first_name_th + ' ' + rej.last_name_th, rej.first_name + ' ' + rej.last_name) AS rejected_by_name,
    r.rejection_reason,
    r.revision_reason,
    r.converted_project_id,
    p.project_code AS converted_project_code,
    r.created_by,
    COALESCE(cb.first_name_th + ' ' + cb.last_name_th, cb.first_name + ' ' + cb.last_name) AS created_by_name,
    r.created_at,
    r.updated_at,
    (SELECT COUNT(*) FROM pms.project_request_attachments WHERE request_id = r.id) AS attachment_count
FROM pms.project_requests r
LEFT JOIN pms.customers c ON r.customer_id = c.id
LEFT JOIN pms.project_request_types pt ON r.project_type = pt.code
LEFT JOIN pms.project_request_priorities pp ON r.priority = pp.code
LEFT JOIN pms.project_request_statuses ps ON r.status = ps.code
LEFT JOIN pms.project_request_workflow_templates wt ON r.workflow_template_id = wt.id
LEFT JOIN pms.project_request_workflow_step_defs sd ON r.workflow_template_id = sd.template_id AND r.current_step = sd.step_order AND sd.is_active = 1
LEFT JOIN pms.employees sub ON r.submitted_by = sub.id
LEFT JOIN pms.employees apr ON r.approved_by = apr.id
LEFT JOIN pms.employees rej ON r.rejected_by = rej.id
LEFT JOIN pms.employees cb ON r.created_by = cb.id
LEFT JOIN pms.projects p ON r.converted_project_id = p.id;
GO

PRINT 'Updated view: pms.vw_project_requests with workflow fields';
PRINT 'Migration completed successfully!';
GO
