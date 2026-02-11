-- =============================================
-- Project Planning System
-- Database: PMSoftware
-- Schema: pms
-- =============================================

USE PMSoftware;
GO

-- =============================================
-- 1. Project Plans (Main Table)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_plans')
BEGIN
    CREATE TABLE pms.project_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,

        -- Plan Version
        version INT NOT NULL DEFAULT 1,
        version_name NVARCHAR(100) NULL,

        -- Plan Info
        plan_name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        objectives NVARCHAR(MAX) NULL,
        scope_summary NVARCHAR(MAX) NULL,

        -- Timeline
        planned_start_date DATE NOT NULL,
        planned_end_date DATE NOT NULL,
        duration_days INT NULL,

        -- Budget
        total_mandays INT NOT NULL DEFAULT 0,
        total_budget DECIMAL(18,2) NULL,
        manday_rate DECIMAL(18,2) NULL,

        -- Status
        status NVARCHAR(50) NOT NULL DEFAULT 'DRAFT',

        -- Approval
        submitted_at DATETIME2 NULL,
        submitted_by UNIQUEIDENTIFIER NULL,
        approved_at DATETIME2 NULL,
        approved_by UNIQUEIDENTIFIER NULL,
        approval_comments NVARCHAR(MAX) NULL,

        -- Flags
        is_active BIT NOT NULL DEFAULT 1,
        is_baseline BIT NOT NULL DEFAULT 0,

        -- Audit
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_project_plans_project FOREIGN KEY (project_id)
            REFERENCES pms.projects(id),
        CONSTRAINT FK_project_plans_created_by FOREIGN KEY (created_by)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_project_plans_submitted_by FOREIGN KEY (submitted_by)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_project_plans_approved_by FOREIGN KEY (approved_by)
            REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_project_plans_project ON pms.project_plans(project_id);
    CREATE INDEX IX_project_plans_status ON pms.project_plans(status);

    PRINT 'Table pms.project_plans created.';
END
GO

-- =============================================
-- 2. Milestone Plans
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_plans')
BEGIN
    CREATE TABLE pms.milestone_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,

        planned_start_date DATE NOT NULL,
        planned_end_date DATE NOT NULL,
        duration_days INT NULL,

        planned_mandays INT NOT NULL DEFAULT 0,

        sort_order INT NOT NULL DEFAULT 0,
        dependency_milestone_id UNIQUEIDENTIFIER NULL,

        color NVARCHAR(50) NULL DEFAULT '#3B82F6',

        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_milestone_plans_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE,
        CONSTRAINT FK_milestone_plans_dependency FOREIGN KEY (dependency_milestone_id)
            REFERENCES pms.milestone_plans(id)
    );

    CREATE INDEX IX_milestone_plans_plan ON pms.milestone_plans(plan_id);

    PRINT 'Table pms.milestone_plans created.';
END
GO

-- =============================================
-- 3. Resource Plans
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'resource_plans')
BEGIN
    CREATE TABLE pms.resource_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        position NVARCHAR(50) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,

        employee_id UNIQUEIDENTIFIER NULL,
        employee_name_placeholder NVARCHAR(100) NULL,

        allocation_percent INT NOT NULL DEFAULT 100,

        start_date DATE NOT NULL,
        end_date DATE NOT NULL,

        milestone_plan_id UNIQUEIDENTIFIER NULL,

        planned_mandays DECIMAL(10,2) NULL,

        notes NVARCHAR(500) NULL,

        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_resource_plans_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE,
        CONSTRAINT FK_resource_plans_employee FOREIGN KEY (employee_id)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_resource_plans_milestone FOREIGN KEY (milestone_plan_id)
            REFERENCES pms.milestone_plans(id)
    );

    CREATE INDEX IX_resource_plans_plan ON pms.resource_plans(plan_id);

    PRINT 'Table pms.resource_plans created.';
END
GO

-- =============================================
-- 4. Deliverables Plan
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deliverable_plans')
BEGIN
    CREATE TABLE pms.deliverable_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,

        milestone_plan_id UNIQUEIDENTIFIER NULL,

        due_date DATE NOT NULL,

        deliverable_type NVARCHAR(50) NULL,

        status NVARCHAR(50) NOT NULL DEFAULT 'PLANNED',

        actual_date DATE NULL,
        file_path NVARCHAR(500) NULL,

        sort_order INT NOT NULL DEFAULT 0,

        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_deliverable_plans_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE,
        CONSTRAINT FK_deliverable_plans_milestone FOREIGN KEY (milestone_plan_id)
            REFERENCES pms.milestone_plans(id)
    );

    CREATE INDEX IX_deliverable_plans_plan ON pms.deliverable_plans(plan_id);

    PRINT 'Table pms.deliverable_plans created.';
END
GO

-- =============================================
-- 5. Risk Register
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'risk_plans')
BEGIN
    CREATE TABLE pms.risk_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        risk_name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,

        impact NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        probability NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        risk_level NVARCHAR(20) NULL,

        mitigation_plan NVARCHAR(MAX) NULL,
        contingency_plan NVARCHAR(MAX) NULL,

        risk_owner_id UNIQUEIDENTIFIER NULL,

        status NVARCHAR(50) NOT NULL DEFAULT 'OPEN',

        sort_order INT NOT NULL DEFAULT 0,

        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_risk_plans_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE,
        CONSTRAINT FK_risk_plans_owner FOREIGN KEY (risk_owner_id)
            REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_risk_plans_plan ON pms.risk_plans(plan_id);

    PRINT 'Table pms.risk_plans created.';
END
GO

-- =============================================
-- 6. Assumptions & Constraints
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'assumption_plans')
BEGIN
    CREATE TABLE pms.assumption_plans (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        type NVARCHAR(20) NOT NULL,

        description NVARCHAR(MAX) NOT NULL,

        category NVARCHAR(100) NULL,

        sort_order INT NOT NULL DEFAULT 0,

        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_assumption_plans_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_assumption_plans_plan ON pms.assumption_plans(plan_id);

    PRINT 'Table pms.assumption_plans created.';
END
GO

-- =============================================
-- 7. Plan Approval History
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'plan_approval_history')
BEGIN
    CREATE TABLE pms.plan_approval_history (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        plan_id UNIQUEIDENTIFIER NOT NULL,

        action NVARCHAR(50) NOT NULL,
        action_by UNIQUEIDENTIFIER NOT NULL,
        action_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        from_status NVARCHAR(50) NULL,
        to_status NVARCHAR(50) NOT NULL,

        comments NVARCHAR(MAX) NULL,

        CONSTRAINT FK_plan_approval_history_plan FOREIGN KEY (plan_id)
            REFERENCES pms.project_plans(id) ON DELETE CASCADE,
        CONSTRAINT FK_plan_approval_history_action_by FOREIGN KEY (action_by)
            REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_plan_approval_history_plan ON pms.plan_approval_history(plan_id);

    PRINT 'Table pms.plan_approval_history created.';
END
GO

-- =============================================
-- 8. View: Project Plan Summary
-- =============================================
CREATE OR ALTER VIEW pms.vw_project_plan_summary AS
SELECT
    pp.id AS plan_id,
    pp.project_id,
    p.project_code,
    p.name AS project_name,
    c.name AS customer_name,
    pp.version,
    pp.version_name,
    pp.plan_name,
    pp.description,
    pp.objectives,
    pp.scope_summary,
    pp.status,
    pp.is_baseline,
    pp.planned_start_date,
    pp.planned_end_date,
    pp.duration_days,
    DATEDIFF(DAY, pp.planned_start_date, pp.planned_end_date) + 1 AS calculated_duration,
    pp.total_mandays,
    pp.total_budget,
    pp.manday_rate,
    (SELECT COUNT(*) FROM pms.milestone_plans WHERE plan_id = pp.id) AS milestone_count,
    (SELECT ISNULL(SUM(planned_mandays), 0) FROM pms.milestone_plans WHERE plan_id = pp.id) AS milestone_total_mandays,
    (SELECT COUNT(*) FROM pms.resource_plans WHERE plan_id = pp.id) AS resource_count,
    (SELECT ISNULL(SUM(quantity), 0) FROM pms.resource_plans WHERE plan_id = pp.id) AS total_team_size,
    (SELECT COUNT(*) FROM pms.deliverable_plans WHERE plan_id = pp.id) AS deliverable_count,
    (SELECT COUNT(*) FROM pms.risk_plans WHERE plan_id = pp.id) AS risk_count,
    (SELECT COUNT(*) FROM pms.risk_plans WHERE plan_id = pp.id AND risk_level IN ('HIGH', 'CRITICAL')) AS high_risk_count,
    (SELECT COUNT(*) FROM pms.assumption_plans WHERE plan_id = pp.id AND type = 'ASSUMPTION') AS assumption_count,
    (SELECT COUNT(*) FROM pms.assumption_plans WHERE plan_id = pp.id AND type = 'CONSTRAINT') AS constraint_count,
    pp.submitted_at,
    pp.submitted_by,
    COALESCE(sub.first_name_th + ' ' + sub.last_name_th, sub.first_name + ' ' + sub.last_name) AS submitted_by_name,
    pp.approved_at,
    pp.approved_by,
    COALESCE(app.first_name_th + ' ' + app.last_name_th, app.first_name + ' ' + app.last_name) AS approved_by_name,
    pp.approval_comments,
    pp.created_by,
    COALESCE(cre.first_name_th + ' ' + cre.last_name_th, cre.first_name + ' ' + cre.last_name) AS created_by_name,
    pp.created_at,
    pp.updated_at
FROM pms.project_plans pp
INNER JOIN pms.projects p ON pp.project_id = p.id
LEFT JOIN pms.customers c ON p.customer_id = c.id
LEFT JOIN pms.employees sub ON pp.submitted_by = sub.id
LEFT JOIN pms.employees app ON pp.approved_by = app.id
LEFT JOIN pms.employees cre ON pp.created_by = cre.id
WHERE pp.is_active = 1;
GO

-- =============================================
-- 9. View: Milestone Plan Detail
-- =============================================
CREATE OR ALTER VIEW pms.vw_milestone_plan_detail AS
SELECT
    mp.id AS milestone_plan_id,
    mp.plan_id,
    pp.project_id,
    p.project_code,
    mp.name AS milestone_name,
    mp.description AS milestone_description,
    mp.planned_start_date,
    mp.planned_end_date,
    mp.duration_days,
    mp.planned_mandays,
    mp.sort_order,
    mp.color,
    mp.dependency_milestone_id,
    dep.name AS dependency_name,
    (SELECT COUNT(*) FROM pms.deliverable_plans WHERE milestone_plan_id = mp.id) AS deliverable_count,
    (SELECT COUNT(*) FROM pms.resource_plans WHERE milestone_plan_id = mp.id) AS resource_count,
    (SELECT ISNULL(SUM(quantity), 0) FROM pms.resource_plans WHERE milestone_plan_id = mp.id) AS team_size
FROM pms.milestone_plans mp
INNER JOIN pms.project_plans pp ON mp.plan_id = pp.id
INNER JOIN pms.projects p ON pp.project_id = p.id
LEFT JOIN pms.milestone_plans dep ON mp.dependency_milestone_id = dep.id;
GO

-- =============================================
-- 10. View: Resource Plan Detail
-- =============================================
CREATE OR ALTER VIEW pms.vw_resource_plan_detail AS
SELECT
    rp.id AS resource_plan_id,
    rp.plan_id,
    pp.project_id,
    p.project_code,
    rp.position,
    rp.quantity,
    rp.allocation_percent,
    rp.start_date,
    rp.end_date,
    DATEDIFF(DAY, rp.start_date, rp.end_date) + 1 AS duration_days,
    rp.planned_mandays,
    rp.notes,
    rp.employee_id,
    CASE
        WHEN rp.employee_id IS NOT NULL
        THEN COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name)
        ELSE ISNULL(rp.employee_name_placeholder, 'TBD')
    END AS employee_name,
    rp.milestone_plan_id,
    mp.name AS milestone_name
FROM pms.resource_plans rp
INNER JOIN pms.project_plans pp ON rp.plan_id = pp.id
INNER JOIN pms.projects p ON pp.project_id = p.id
LEFT JOIN pms.employees e ON rp.employee_id = e.id
LEFT JOIN pms.milestone_plans mp ON rp.milestone_plan_id = mp.id;
GO

-- =============================================
-- 11. Trigger: Calculate Risk Level
-- =============================================
CREATE OR ALTER TRIGGER pms.tr_risk_plans_calculate_level
ON pms.risk_plans
AFTER INSERT, UPDATE
AS
BEGIN
    UPDATE rp
    SET risk_level =
        CASE
            WHEN (i.impact = 'HIGH' AND i.probability = 'HIGH') THEN 'CRITICAL'
            WHEN (i.impact = 'HIGH' AND i.probability = 'MEDIUM') THEN 'HIGH'
            WHEN (i.impact = 'MEDIUM' AND i.probability = 'HIGH') THEN 'HIGH'
            WHEN (i.impact = 'HIGH' AND i.probability = 'LOW') THEN 'MEDIUM'
            WHEN (i.impact = 'LOW' AND i.probability = 'HIGH') THEN 'MEDIUM'
            WHEN (i.impact = 'MEDIUM' AND i.probability = 'MEDIUM') THEN 'MEDIUM'
            ELSE 'LOW'
        END
    FROM pms.risk_plans rp
    INNER JOIN inserted i ON rp.id = i.id;
END
GO

-- =============================================
-- 12. Trigger: Calculate Resource Man-days
-- =============================================
CREATE OR ALTER TRIGGER pms.tr_resource_plans_calculate_mandays
ON pms.resource_plans
AFTER INSERT, UPDATE
AS
BEGIN
    UPDATE rp
    SET planned_mandays =
        CAST(
            (DATEDIFF(DAY, i.start_date, i.end_date) + 1) *
            (i.allocation_percent / 100.0) *
            i.quantity
        AS DECIMAL(10,2))
    FROM pms.resource_plans rp
    INNER JOIN inserted i ON rp.id = i.id;
END
GO

PRINT ''
PRINT '=========================================='
PRINT 'PROJECT PLANNING TABLES CREATED!'
PRINT '=========================================='
GO
