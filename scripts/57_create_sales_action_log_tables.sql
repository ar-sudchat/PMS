USE PMSoftware;
GO

-- =============================================
-- Sales Action Log & To-do System
-- Created: 2026-02-19
-- =============================================

-- =============================================
-- 1. Project Action Logs (Timeline)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_action_logs')
BEGIN
    CREATE TABLE pms.project_action_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        action_type NVARCHAR(50) NOT NULL,
        action_date DATETIME2 NOT NULL DEFAULT GETDATE(),
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        contact_person NVARCHAR(200) NULL,
        contact_role NVARCHAR(100) NULL,
        participants NVARCHAR(MAX) NULL,
        old_status NVARCHAR(50) NULL,
        new_status NVARCHAR(50) NULL,
        has_attachment BIT NOT NULL DEFAULT 0,
        is_auto_generated BIT NOT NULL DEFAULT 0,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NULL,
        CONSTRAINT FK_action_logs_project FOREIGN KEY (project_id)
            REFERENCES pms.projects(id) ON DELETE CASCADE,
        CONSTRAINT FK_action_logs_created_by FOREIGN KEY (created_by)
            REFERENCES pms.employees(id)
    );
    CREATE INDEX IX_action_logs_project ON pms.project_action_logs(project_id);
    CREATE INDEX IX_action_logs_date ON pms.project_action_logs(action_date DESC);
    CREATE INDEX IX_action_logs_type ON pms.project_action_logs(action_type);
    PRINT 'Table pms.project_action_logs created.';
END
GO

-- =============================================
-- 2. Action Log Attachments
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'action_log_attachments')
BEGIN
    CREATE TABLE pms.action_log_attachments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        action_log_id UNIQUEIDENTIFIER NOT NULL,
        file_name NVARCHAR(255) NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        file_size INT NULL,
        file_type NVARCHAR(100) NULL,
        uploaded_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        uploaded_by UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT FK_log_attachments_log FOREIGN KEY (action_log_id)
            REFERENCES pms.project_action_logs(id) ON DELETE CASCADE,
        CONSTRAINT FK_log_attachments_uploaded_by FOREIGN KEY (uploaded_by)
            REFERENCES pms.employees(id)
    );
    CREATE INDEX IX_log_attachments_log ON pms.action_log_attachments(action_log_id);
    PRINT 'Table pms.action_log_attachments created.';
END
GO

-- =============================================
-- 3. Project Tasks (Next Steps / To-do)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_tasks_sales')
BEGIN
    CREATE TABLE pms.project_tasks_sales (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        task_type NVARCHAR(50) NOT NULL DEFAULT 'FOLLOW_UP',
        due_date DATE NOT NULL,
        due_time TIME NULL,
        contact_person NVARCHAR(200) NULL,
        contact_role NVARCHAR(100) NULL,
        contact_phone NVARCHAR(50) NULL,
        contact_email NVARCHAR(200) NULL,
        location NVARCHAR(500) NULL,
        priority NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        assigned_to UNIQUEIDENTIFIER NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
        completed_at DATETIME2 NULL,
        completed_by UNIQUEIDENTIFIER NULL,
        completion_notes NVARCHAR(MAX) NULL,
        is_synced_to_calendar BIT NOT NULL DEFAULT 0,
        calendar_event_id NVARCHAR(200) NULL,
        calendar_type NVARCHAR(50) NULL,
        reminder_enabled BIT NOT NULL DEFAULT 0,
        reminder_minutes_before INT NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NULL,
        CONSTRAINT FK_tasks_sales_project FOREIGN KEY (project_id)
            REFERENCES pms.projects(id) ON DELETE CASCADE,
        CONSTRAINT FK_tasks_sales_assigned_to FOREIGN KEY (assigned_to)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_tasks_sales_created_by FOREIGN KEY (created_by)
            REFERENCES pms.employees(id),
        CONSTRAINT CHK_tasks_sales_priority CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
        CONSTRAINT CHK_tasks_sales_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
    );
    CREATE INDEX IX_tasks_sales_project ON pms.project_tasks_sales(project_id);
    CREATE INDEX IX_tasks_sales_assigned ON pms.project_tasks_sales(assigned_to);
    CREATE INDEX IX_tasks_sales_due_date ON pms.project_tasks_sales(due_date);
    CREATE INDEX IX_tasks_sales_status ON pms.project_tasks_sales(status);
    PRINT 'Table pms.project_tasks_sales created.';
END
GO

-- =============================================
-- 4. Action Type Config
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'action_type_configs')
BEGIN
    CREATE TABLE pms.action_type_configs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        type_code NVARCHAR(50) NOT NULL UNIQUE,
        type_name NVARCHAR(100) NOT NULL,
        icon NVARCHAR(50) NULL,
        color NVARCHAR(50) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1
    );
    INSERT INTO pms.action_type_configs (type_code, type_name, icon, color, sort_order) VALUES
    ('CALL', N'โทรหา', N'Phone', '#3B82F6', 1),
    ('MEETING', N'เข้าพบ', N'Handshake', '#10B981', 2),
    ('SEND_QUOTATION', N'ส่ง Quotation', N'FileText', '#F59E0B', 3),
    ('SEND_DOCUMENT', N'ส่งเอกสาร', N'Paperclip', '#8B5CF6', 4),
    ('EMAIL', N'ส่ง Email', N'Mail', '#EC4899', 5),
    ('PRESENTATION', N'Present งาน', N'Presentation', '#EF4444', 6),
    ('DEMO', N'Demo ระบบ', N'Monitor', '#06B6D4', 7),
    ('NOTE', N'บันทึกหมายเหตุ', N'StickyNote', '#6B7280', 8),
    ('STATUS_CHANGE', N'เปลี่ยนสถานะ', N'RefreshCw', '#9CA3AF', 9),
    ('OTHER', N'อื่นๆ', N'MoreHorizontal', '#6B7280', 10);
    PRINT 'Table pms.action_type_configs created with default data.';
END
GO

-- =============================================
-- 5. View: Action Logs with Details
-- =============================================
CREATE OR ALTER VIEW pms.vw_project_action_logs AS
SELECT
    al.id AS log_id,
    al.project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    al.action_type,
    atc.type_name AS action_type_name,
    atc.icon AS action_icon,
    atc.color AS action_color,
    al.action_date,
    al.title,
    al.description,
    al.contact_person,
    al.contact_role,
    al.participants,
    al.old_status,
    al.new_status,
    al.has_attachment,
    al.is_auto_generated,
    (SELECT COUNT(*) FROM pms.action_log_attachments WHERE action_log_id = al.id) AS attachment_count,
    al.created_by,
    e.first_name + ' ' + e.last_name AS created_by_name,
    al.created_at
FROM pms.project_action_logs al
INNER JOIN pms.projects p ON al.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.action_type_configs atc ON al.action_type = atc.type_code
LEFT JOIN pms.employees e ON al.created_by = e.id;
GO

-- =============================================
-- 6. View: Sales Tasks with Details
-- =============================================
CREATE OR ALTER VIEW pms.vw_project_tasks_sales AS
SELECT
    t.id AS task_id,
    t.project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    p.project_manager_id,
    t.title,
    t.description,
    t.task_type,
    atc.type_name AS task_type_name,
    atc.icon AS task_icon,
    atc.color AS task_color,
    t.due_date,
    t.due_time,
    t.contact_person,
    t.contact_role,
    t.contact_phone,
    t.location,
    t.priority,
    t.status,
    t.is_synced_to_calendar,
    t.calendar_type,
    t.completed_at,
    t.completed_by,
    comp.first_name + ' ' + comp.last_name AS completed_by_name,
    t.completion_notes,
    t.assigned_to,
    asgn.first_name + ' ' + asgn.last_name AS assigned_to_name,
    CASE
        WHEN t.status = 'COMPLETED' THEN 'DONE'
        WHEN t.status = 'CANCELLED' THEN 'CANCELLED'
        WHEN t.due_date < CAST(GETDATE() AS DATE) THEN 'OVERDUE'
        WHEN t.due_date = CAST(GETDATE() AS DATE) THEN 'TODAY'
        WHEN t.due_date <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN 'THIS_WEEK'
        ELSE 'UPCOMING'
    END AS due_status,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), t.due_date) AS days_until_due,
    t.created_by,
    cre.first_name + ' ' + cre.last_name AS created_by_name,
    t.created_at
FROM pms.project_tasks_sales t
INNER JOIN pms.projects p ON t.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.action_type_configs atc ON t.task_type = atc.type_code
LEFT JOIN pms.employees asgn ON t.assigned_to = asgn.id
LEFT JOIN pms.employees comp ON t.completed_by = comp.id
LEFT JOIN pms.employees cre ON t.created_by = cre.id;
GO

-- =============================================
-- 7. View: Project Health (Last Activity)
-- =============================================
CREATE OR ALTER VIEW pms.vw_project_health AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    ps.name AS project_status,
    ps.code AS project_status_code,
    c.name AS customer_name,
    p.project_manager_id,
    pm.first_name + ' ' + pm.last_name AS project_manager_name,
    last_log.last_activity_date,
    last_log.last_activity_type,
    last_log.last_activity_title,
    DATEDIFF(DAY, ISNULL(last_log.last_activity_date, p.created_at), GETDATE()) AS days_since_activity,
    CASE
        WHEN DATEDIFF(DAY, ISNULL(last_log.last_activity_date, p.created_at), GETDATE()) > 14 THEN 'CRITICAL'
        WHEN DATEDIFF(DAY, ISNULL(last_log.last_activity_date, p.created_at), GETDATE()) > 7 THEN 'WARNING'
        ELSE 'HEALTHY'
    END AS health_status,
    (SELECT COUNT(*) FROM pms.project_tasks_sales
     WHERE project_id = p.id AND status = 'PENDING') AS pending_tasks_count
FROM pms.projects p
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
LEFT JOIN (
    SELECT
        project_id,
        action_date AS last_activity_date,
        action_type AS last_activity_type,
        title AS last_activity_title,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY action_date DESC) AS rn
    FROM pms.project_action_logs
) last_log ON p.id = last_log.project_id AND last_log.rn = 1
WHERE p.is_active = 1;
GO

PRINT '';
PRINT '==========================================';
PRINT 'SALES ACTION LOG TABLES CREATED!';
PRINT '==========================================';
GO
