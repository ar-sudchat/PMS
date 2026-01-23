-- =============================================
-- Project Requests System (Revised)
-- Database: PMSoftware
-- Schema: pms
-- =============================================
USE [PMSoftware]
GO

-- CLEANUP
DROP VIEW IF EXISTS pms.vw_project_request_monthly_stats;
DROP VIEW IF EXISTS pms.vw_project_request_stats;
DROP VIEW IF EXISTS pms.vw_pending_project_requests;
DROP VIEW IF EXISTS pms.vw_project_requests;
DROP FUNCTION IF EXISTS pms.fn_generate_request_code;
-- Tables are dropped in reverse order of dependencies
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_history' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_request_history;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_attachments' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_request_attachments;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_requests' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_requests;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_statuses' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_request_statuses;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_priorities' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_request_priorities;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'project_request_types' AND schema_id = SCHEMA_ID('pms')) DROP TABLE pms.project_request_types;

-- =============================================
-- 1. Project Request Types (Lookup Table)
-- =============================================
CREATE TABLE pms.project_request_types (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Insert default types
INSERT INTO pms.project_request_types (code, name, description, sort_order) VALUES
('NEW', 'New Project', 'โครงการใหม่', 1),
('ENHANCEMENT', 'Enhancement', 'พัฒนาเพิ่มเติมจากระบบเดิม', 2),
('SUPPORT', 'Support/MA', 'งานดูแลระบบ/แก้ไขปัญหา', 3),
('CONSULTING', 'Consulting', 'งานที่ปรึกษา', 4),
('OTHER', 'Other', 'อื่นๆ', 99);

PRINT 'Table pms.project_request_types created.';
GO

-- =============================================
-- 2. Project Request Priorities (Lookup Table)
-- =============================================
CREATE TABLE pms.project_request_priorities (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    color NVARCHAR(50) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Insert default priorities
INSERT INTO pms.project_request_priorities (code, name, color, sort_order) VALUES
('LOW', 'Low', 'gray', 1),
('MEDIUM', 'Medium', 'blue', 2),
('HIGH', 'High', 'orange', 3),
('URGENT', 'Urgent', 'red', 4);

PRINT 'Table pms.project_request_priorities created.';
GO

-- =============================================
-- 3. Project Request Statuses (Lookup Table)
-- =============================================
CREATE TABLE pms.project_request_statuses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    color NVARCHAR(50) NULL,
    description NVARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Insert default statuses
INSERT INTO pms.project_request_statuses (code, name, color, description, sort_order) VALUES
('DRAFT', 'Draft', 'gray', 'บันทึกแบบร่าง ยังไม่ส่งอนุมัติ', 1),
('PENDING', 'Pending Approval', 'yellow', 'ส่งแล้ว รอการอนุมัติ', 2),
('APPROVED', 'Approved', 'green', 'อนุมัติแล้ว พร้อมสร้าง Project', 3),
('REJECTED', 'Rejected', 'red', 'ปฏิเสธ ไม่ดำเนินการต่อ', 4),
('REVISION', 'Revision Required', 'orange', 'ส่งกลับแก้ไข', 5),
('CONVERTED', 'Converted to Project', 'blue', 'สร้างเป็น Project แล้ว', 6);

PRINT 'Table pms.project_request_statuses created.';
GO

-- =============================================
-- 4. Project Requests (Main Table)
-- =============================================
CREATE TABLE pms.project_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    
    -- Request Code (Auto-generate)
    request_code NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Basic Info
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    
    -- Customer Info
    customer_id UNIQUEIDENTIFIER NULL,
    contact_person NVARCHAR(100) NULL,
    contact_email NVARCHAR(100) NULL,
    contact_phone NVARCHAR(50) NULL,
    
    -- Project Details
    project_type NVARCHAR(50) NOT NULL DEFAULT 'NEW',
    priority NVARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    
    -- Estimates
    estimated_budget DECIMAL(18,2) NULL,
    estimated_mandays INT NULL,
    expected_start_date DATE NULL,
    expected_end_date DATE NULL,
    
    -- Status
    status NVARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    
    -- Additional Info
    notes NVARCHAR(MAX) NULL,
    
    -- Submission
    submitted_at DATETIME2 NULL,
    submitted_by UNIQUEIDENTIFIER NULL,
    
    -- Approval
    approved_at DATETIME2 NULL,
    approved_by UNIQUEIDENTIFIER NULL,
    
    -- Rejection
    rejected_at DATETIME2 NULL,
    rejected_by UNIQUEIDENTIFIER NULL,
    rejection_reason NVARCHAR(MAX) NULL,
    
    -- Revision
    revision_requested_at DATETIME2 NULL,
    revision_requested_by UNIQUEIDENTIFIER NULL,
    revision_reason NVARCHAR(MAX) NULL,
    
    -- Conversion to Project
    converted_at DATETIME2 NULL,
    converted_by UNIQUEIDENTIFIER NULL,
    converted_project_id UNIQUEIDENTIFIER NULL,
    
    -- Audit
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_by UNIQUEIDENTIFIER NULL,
    updated_at DATETIME2 NULL,
    
    -- Constraints
    CONSTRAINT FK_project_requests_customer FOREIGN KEY (customer_id) 
        REFERENCES pms.customers(id),
    CONSTRAINT FK_project_requests_created_by FOREIGN KEY (created_by) 
        REFERENCES pms.employees(id),
    CONSTRAINT FK_project_requests_submitted_by FOREIGN KEY (submitted_by) 
        REFERENCES pms.employees(id),
    CONSTRAINT FK_project_requests_approved_by FOREIGN KEY (approved_by) 
        REFERENCES pms.employees(id),
    CONSTRAINT FK_project_requests_rejected_by FOREIGN KEY (rejected_by) 
        REFERENCES pms.employees(id),
    CONSTRAINT FK_project_requests_converted_project FOREIGN KEY (converted_project_id) 
        REFERENCES pms.projects(id)
);

-- Indexes
CREATE INDEX IX_project_requests_status ON pms.project_requests(status);
CREATE INDEX IX_project_requests_customer ON pms.project_requests(customer_id);
CREATE INDEX IX_project_requests_created_by ON pms.project_requests(created_by);
CREATE INDEX IX_project_requests_created_at ON pms.project_requests(created_at DESC);
CREATE INDEX IX_project_requests_request_code ON pms.project_requests(request_code);

PRINT 'Table pms.project_requests created.';
GO

-- =============================================
-- 5. Project Request Attachments
-- =============================================
CREATE TABLE pms.project_request_attachments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    file_name NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    file_type NVARCHAR(100) NULL,
    description NVARCHAR(500) NULL,
    uploaded_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_project_request_attachments_request FOREIGN KEY (request_id) 
        REFERENCES pms.project_requests(id) ON DELETE CASCADE,
    CONSTRAINT FK_project_request_attachments_uploaded_by FOREIGN KEY (uploaded_by) 
        REFERENCES pms.employees(id)
);

CREATE INDEX IX_project_request_attachments_request ON pms.project_request_attachments(request_id);

PRINT 'Table pms.project_request_attachments created.';
GO

-- =============================================
-- 6. Project Request Approval History
-- =============================================
CREATE TABLE pms.project_request_history (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    request_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(50) NOT NULL,  -- submit, approve, reject, revision, convert
    action_by UNIQUEIDENTIFIER NOT NULL,
    action_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    from_status NVARCHAR(50) NULL,
    to_status NVARCHAR(50) NOT NULL,
    comments NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_project_request_history_request FOREIGN KEY (request_id) 
        REFERENCES pms.project_requests(id) ON DELETE CASCADE,
    CONSTRAINT FK_project_request_history_action_by FOREIGN KEY (action_by) 
        REFERENCES pms.employees(id)
);

CREATE INDEX IX_project_request_history_request ON pms.project_request_history(request_id);
CREATE INDEX IX_project_request_history_action_at ON pms.project_request_history(action_at DESC);

PRINT 'Table pms.project_request_history created.';
GO

-- =============================================
-- 7. Sequence for Request Code Generation
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'seq_project_request_code')
BEGIN
    CREATE SEQUENCE pms.seq_project_request_code
        START WITH 1
        INCREMENT BY 1;
    
    PRINT 'Sequence pms.seq_project_request_code created.';
END
GO

-- =============================================
-- 9. View: Project Requests with Details
-- =============================================
CREATE VIEW pms.vw_project_requests AS
SELECT 
    pr.id,
    pr.request_code,
    pr.title,
    pr.description,
    pr.customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    pr.contact_person,
    pr.contact_email,
    pr.contact_phone,
    pr.project_type,
    prt.name AS project_type_name,
    pr.priority,
    prp.name AS priority_name,
    prp.color AS priority_color,
    pr.estimated_budget,
    pr.estimated_mandays,
    pr.expected_start_date,
    pr.expected_end_date,
    pr.status,
    prs.name AS status_name,
    prs.color AS status_color,
    pr.notes,
    pr.submitted_at,
    pr.submitted_by,
    sub.first_name + ' ' + sub.last_name AS submitted_by_name,
    pr.approved_at,
    pr.approved_by,
    app.first_name + ' ' + app.last_name AS approved_by_name,
    pr.rejected_at,
    pr.rejected_by,
    rej.first_name + ' ' + rej.last_name AS rejected_by_name,
    pr.rejection_reason,
    pr.revision_requested_at,
    pr.revision_requested_by,
    pr.revision_reason,
    pr.converted_at,
    pr.converted_by,
    pr.converted_project_id,
    p.project_code AS converted_project_code,
    p.name AS converted_project_name,
    pr.created_by,
    cre.first_name + ' ' + cre.last_name AS created_by_name,
    pr.created_at,
    pr.updated_by,
    pr.updated_at,
    -- Attachment count
    (SELECT COUNT(*) FROM pms.project_request_attachments WHERE request_id = pr.id) AS attachment_count
FROM pms.project_requests pr
LEFT JOIN pms.customers c ON pr.customer_id = c.id
LEFT JOIN pms.project_request_types prt ON pr.project_type = prt.code
LEFT JOIN pms.project_request_priorities prp ON pr.priority = prp.code
LEFT JOIN pms.project_request_statuses prs ON pr.status = prs.code
LEFT JOIN pms.employees sub ON pr.submitted_by = sub.id
LEFT JOIN pms.employees app ON pr.approved_by = app.id
LEFT JOIN pms.employees rej ON pr.rejected_by = rej.id
LEFT JOIN pms.employees cre ON pr.created_by = cre.id
LEFT JOIN pms.projects p ON pr.converted_project_id = p.id;
GO

-- =============================================
-- 10. View: Pending Requests for Approval
-- =============================================
CREATE VIEW pms.vw_pending_project_requests AS
SELECT 
    pr.*,
    c.name AS customer_name,
    cre.first_name + ' ' + cre.last_name AS created_by_name,
    DATEDIFF(DAY, pr.submitted_at, GETDATE()) AS days_pending
FROM pms.project_requests pr
LEFT JOIN pms.customers c ON pr.customer_id = c.id
LEFT JOIN pms.employees cre ON pr.created_by = cre.id
WHERE pr.status = 'PENDING';
GO

-- =============================================
-- 11. View: Request Statistics
-- =============================================
CREATE VIEW pms.vw_project_request_stats AS
SELECT 
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_count,
    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
    SUM(CASE WHEN status = 'REVISION' THEN 1 ELSE 0 END) AS revision_count,
    SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_count,
    SUM(estimated_budget) AS total_estimated_budget,
    SUM(estimated_mandays) AS total_estimated_mandays
FROM pms.project_requests;
GO

-- =============================================
-- 12. View: Monthly Request Statistics
-- =============================================
CREATE VIEW pms.vw_project_request_monthly_stats AS
SELECT 
    YEAR(created_at) AS year,
    MONTH(created_at) AS month,
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
    SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_count,
    SUM(estimated_budget) AS total_estimated_budget,
    SUM(estimated_mandays) AS total_estimated_mandays
FROM pms.project_requests
GROUP BY YEAR(created_at), MONTH(created_at);
GO

PRINT ''
PRINT '=========================================='
PRINT 'PROJECT REQUESTS SYSTEM SETUP COMPLETE!'
PRINT '=========================================='
GO
