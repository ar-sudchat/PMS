-- =============================================
-- Add Date Columns to Project Requests Table
-- Database: PMSoftware
-- Schema: pms
-- =============================================
USE [PMSoftware]
GO

-- Add missing date columns
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'customer_contact_date')
BEGIN
    ALTER TABLE pms.project_requests ADD customer_contact_date DATE NULL;
    PRINT 'Added column: customer_contact_date';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'last_meeting_date')
BEGIN
    ALTER TABLE pms.project_requests ADD last_meeting_date DATE NULL;
    PRINT 'Added column: last_meeting_date';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'quotation_date')
BEGIN
    ALTER TABLE pms.project_requests ADD quotation_date DATE NULL;
    PRINT 'Added column: quotation_date';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_requests') AND name = 'approval_date')
BEGIN
    ALTER TABLE pms.project_requests ADD approval_date DATE NULL;
    PRINT 'Added column: approval_date';
END

GO

-- Update View to include new columns
ALTER VIEW pms.vw_project_requests AS
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
LEFT JOIN pms.employees sub ON r.submitted_by = sub.id
LEFT JOIN pms.employees apr ON r.approved_by = apr.id
LEFT JOIN pms.employees rej ON r.rejected_by = rej.id
LEFT JOIN pms.employees cb ON r.created_by = cb.id
LEFT JOIN pms.projects p ON r.converted_project_id = p.id;
GO

PRINT 'Migration completed successfully!';
GO
