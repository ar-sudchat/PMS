-- =============================================
-- Resource Planning Board
-- Database: PMSoftware
-- Schema: pms
-- =============================================

USE PMSoftware;
GO

-- =============================================
-- 1. Milestone Resources (Assignment table)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_resources')
BEGIN
    CREATE TABLE pms.milestone_resources (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_milestone_id UNIQUEIDENTIFIER NOT NULL,
        employee_id UNIQUEIDENTIFIER NOT NULL,

        -- Role: SA, BA, PG
        role NVARCHAR(20) NOT NULL,

        -- Working period
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        working_days INT NOT NULL DEFAULT 0,

        -- Notes
        notes NVARCHAR(500) NULL,

        -- Audit
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_milestone_resources_milestone FOREIGN KEY (project_milestone_id)
            REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_milestone_resources_employee FOREIGN KEY (employee_id)
            REFERENCES pms.employees(id),
        CONSTRAINT FK_milestone_resources_created_by FOREIGN KEY (created_by)
            REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_milestone_resources_milestone ON pms.milestone_resources(project_milestone_id);
    CREATE INDEX IX_milestone_resources_employee ON pms.milestone_resources(employee_id);
    CREATE INDEX IX_milestone_resources_dates ON pms.milestone_resources(start_date, end_date);

    PRINT 'Table pms.milestone_resources created.';
END
GO

-- =============================================
-- 2. View: Milestone Resource Detail
-- =============================================
CREATE OR ALTER VIEW pms.vw_milestone_resource_detail AS
SELECT
    mr.id,
    mr.project_milestone_id,
    mr.employee_id,
    mr.role,
    mr.start_date,
    mr.end_date,
    mr.working_days,
    mr.notes,
    mr.created_at,

    -- Milestone info (via milestone_configs)
    pm.project_id,
    mc.code AS milestone_code,
    mc.name AS milestone_name,
    mc.color AS milestone_color,
    pm.due_date AS milestone_due_date,

    -- Project info (via project_types)
    p.project_code,
    p.name AS project_name,

    -- Employee info (via positions)
    e.employee_code,
    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
           CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
    e.nickname AS employee_nickname,
    pos.code AS position_code,
    pos.name AS position_name

FROM pms.milestone_resources mr
INNER JOIN pms.project_milestones pm ON mr.project_milestone_id = pm.id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
INNER JOIN pms.projects p ON pm.project_id = p.id
INNER JOIN pms.employees e ON mr.employee_id = e.id
LEFT JOIN pms.positions pos ON e.position_id = pos.id;
GO

-- =============================================
-- 3. View: Employee Resource Conflicts
-- =============================================
CREATE OR ALTER VIEW pms.vw_employee_resource_conflicts AS
SELECT
    a.employee_id,
    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
           CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
    e.nickname AS employee_nickname,

    a.id AS resource_a_id,
    a.project_milestone_id AS milestone_a_id,
    mc_a.name AS milestone_a_name,
    p_a.project_code AS project_a_code,
    p_a.name AS project_a_name,
    a.start_date AS a_start_date,
    a.end_date AS a_end_date,
    a.role AS a_role,

    b.id AS resource_b_id,
    b.project_milestone_id AS milestone_b_id,
    mc_b.name AS milestone_b_name,
    p_b.project_code AS project_b_code,
    p_b.name AS project_b_name,
    b.start_date AS b_start_date,
    b.end_date AS b_end_date,
    b.role AS b_role,

    -- Overlap days
    DATEDIFF(DAY,
        CASE WHEN a.start_date > b.start_date THEN a.start_date ELSE b.start_date END,
        CASE WHEN a.end_date < b.end_date THEN a.end_date ELSE b.end_date END
    ) + 1 AS overlap_days

FROM pms.milestone_resources a
INNER JOIN pms.milestone_resources b
    ON a.employee_id = b.employee_id
    AND a.id < b.id
    AND a.start_date <= b.end_date
    AND a.end_date >= b.start_date
INNER JOIN pms.employees e ON a.employee_id = e.id
INNER JOIN pms.project_milestones pm_a ON a.project_milestone_id = pm_a.id
INNER JOIN pms.milestone_configs mc_a ON pm_a.milestone_config_id = mc_a.id
INNER JOIN pms.projects p_a ON pm_a.project_id = p_a.id
INNER JOIN pms.project_milestones pm_b ON b.project_milestone_id = pm_b.id
INNER JOIN pms.milestone_configs mc_b ON pm_b.milestone_config_id = mc_b.id
INNER JOIN pms.projects p_b ON pm_b.project_id = p_b.id;
GO

PRINT ''
PRINT '=========================================='
PRINT 'RESOURCE PLANNING TABLES CREATED!'
PRINT '=========================================='
GO
