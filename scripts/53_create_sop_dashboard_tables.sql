USE PMSoftware;
GO

-- =============================================
-- S&OP Dashboard: project_issues table + milestone payment fields
-- Created: 2026-02-19
-- =============================================

-- =============================================
-- 1A. Create pms.project_issues table
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_issues')
BEGIN
    CREATE TABLE pms.project_issues (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        milestone_id UNIQUEIDENTIFIER NULL,

        -- Issue info
        title NVARCHAR(300) NOT NULL,
        description NVARCHAR(MAX) NULL,

        -- Classification
        issue_type NVARCHAR(30) NOT NULL DEFAULT 'ISSUE',
        severity NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM',

        -- Lifecycle
        status NVARCHAR(30) NOT NULL DEFAULT 'OPEN',

        -- People
        reported_by UNIQUEIDENTIFIER NOT NULL,
        reported_date DATETIME2 NOT NULL DEFAULT GETDATE(),
        assigned_to UNIQUEIDENTIFIER NULL,

        -- Resolution
        resolved_date DATETIME2 NULL,
        resolution_notes NVARCHAR(MAX) NULL,

        -- Escalation
        escalated_to UNIQUEIDENTIFIER NULL,
        escalation_date DATETIME2 NULL,

        -- SLA / Impact
        target_resolve_date DATE NULL,
        impact_description NVARCHAR(MAX) NULL,

        -- Audit
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_project_issues_project FOREIGN KEY (project_id)
            REFERENCES pms.projects(id),
        CONSTRAINT FK_project_issues_milestone FOREIGN KEY (milestone_id)
            REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_project_issues_reported_by FOREIGN KEY (reported_by)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_project_issues_assigned_to FOREIGN KEY (assigned_to)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_project_issues_escalated_to FOREIGN KEY (escalated_to)
            REFERENCES pms.employees(id),

        CONSTRAINT CHK_project_issues_type
            CHECK (issue_type IN ('BLOCKER','RISK','ISSUE','ESCALATION')),
        CONSTRAINT CHK_project_issues_severity
            CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
        CONSTRAINT CHK_project_issues_status
            CHECK (status IN ('OPEN','IN_PROGRESS','ESCALATED','RESOLVED','CLOSED'))
    );

    CREATE INDEX IX_project_issues_project ON pms.project_issues(project_id);
    CREATE INDEX IX_project_issues_milestone ON pms.project_issues(milestone_id);
    CREATE INDEX IX_project_issues_status ON pms.project_issues(status);
    CREATE INDEX IX_project_issues_type ON pms.project_issues(issue_type);
    CREATE INDEX IX_project_issues_assigned ON pms.project_issues(assigned_to);

    PRINT 'Table pms.project_issues created.';
END
GO

-- =============================================
-- 1B. Add payment fields to pms.project_milestones
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'invoice_no'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD invoice_no NVARCHAR(100) NULL;
    PRINT 'Added invoice_no to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'invoice_date'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD invoice_date DATE NULL;
    PRINT 'Added invoice_date to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'invoice_amount'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD invoice_amount DECIMAL(18,2) NULL;
    PRINT 'Added invoice_amount to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_status'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_status NVARCHAR(30) NULL DEFAULT 'NOT_INVOICED';
    PRINT 'Added payment_status to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_due_date'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_due_date DATE NULL;
    PRINT 'Added payment_due_date to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_received_date'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_received_date DATE NULL;
    PRINT 'Added payment_received_date to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_amount'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_amount DECIMAL(18,2) NULL;
    PRINT 'Added payment_amount to project_milestones';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'payment_notes'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD payment_notes NVARCHAR(500) NULL;
    PRINT 'Added payment_notes to project_milestones';
END
GO

-- =============================================
-- 1C. Create S&OP Views
-- =============================================

-- View: S&OP Issue Summary per Project
CREATE OR ALTER VIEW pms.vw_sop_issue_summary AS
SELECT
    pi.project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    COUNT(*) AS total_issues,
    SUM(CASE WHEN pi.status IN ('OPEN','IN_PROGRESS') THEN 1 ELSE 0 END) AS open_issues,
    SUM(CASE WHEN pi.status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated_issues,
    SUM(CASE WHEN pi.severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_issues,
    SUM(CASE WHEN pi.target_resolve_date < GETDATE()
             AND pi.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS overdue_issues
FROM pms.project_issues pi
INNER JOIN pms.projects p ON pi.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
GROUP BY pi.project_id, p.project_code, p.name, c.name;
GO

-- View: Payment Pipeline
CREATE OR ALTER VIEW pms.vw_sop_payment_pipeline AS
SELECT
    pm.id AS milestone_id,
    pm.project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    mc.name AS milestone_name,
    pm.due_date AS milestone_due_date,
    pm.completed_date AS milestone_completed_date,
    pm.status AS milestone_status,
    pm.invoice_no,
    pm.invoice_date,
    pm.invoice_amount,
    pm.payment_status,
    pm.payment_due_date,
    pm.payment_received_date,
    pm.payment_amount,
    pm.payment_notes,
    CASE
        WHEN pm.payment_status = 'PAID' THEN 0
        WHEN pm.payment_due_date < CAST(GETDATE() AS DATE)
             AND ISNULL(pm.payment_status, 'NOT_INVOICED') NOT IN ('PAID') THEN 1
        ELSE 0
    END AS is_overdue,
    CASE
        WHEN pm.payment_due_date IS NOT NULL THEN DATEDIFF(day, pm.payment_due_date, GETDATE())
        ELSE 0
    END AS days_overdue
FROM pms.project_milestones pm
INNER JOIN pms.projects p ON pm.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE p.is_active = 1;
GO

-- =============================================
-- 1D. Add billing_status to pms.projects
-- =============================================
-- BILLING = ยังเก็บเงินอยู่ (default)
-- COMPLETED = เก็บเงินครบแล้ว
-- NOT_APPLICABLE = ไม่ต้องเก็บเงิน

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'billing_status'
)
BEGIN
    ALTER TABLE pms.projects ADD billing_status NVARCHAR(30) NULL DEFAULT 'BILLING';
    PRINT 'Added billing_status to projects';
END
GO

PRINT 'S&OP Dashboard migration complete.';
GO
