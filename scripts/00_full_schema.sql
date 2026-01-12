-- ============================================
-- PMS Full Database Schema
-- Run this script to create a fresh database
-- ============================================

-- Create Schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'pms')
BEGIN
    EXEC('CREATE SCHEMA pms')
    PRINT 'Created schema: pms'
END
GO

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Departments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.departments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        description NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: departments'
END
GO

-- Positions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'positions' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.positions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        department_id UNIQUEIDENTIFIER NULL,
        level INT DEFAULT 1,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_positions_department FOREIGN KEY (department_id) REFERENCES pms.departments(id)
    );
    PRINT 'Created table: positions'
END
GO

-- Employees
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employees' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.employees (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_code NVARCHAR(20) NOT NULL UNIQUE,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        first_name_th NVARCHAR(100) NULL,
        last_name_th NVARCHAR(100) NULL,
        nickname NVARCHAR(50) NULL,
        email NVARCHAR(255) NULL,
        phone NVARCHAR(20) NULL,
        position_id UNIQUEIDENTIFIER NULL,
        department_id UNIQUEIDENTIFIER NULL,
        hire_date DATE NULL,
        status NVARCHAR(20) DEFAULT 'Active',
        password_hash NVARCHAR(255) NULL,
        must_change_password BIT DEFAULT 1,
        last_login DATETIME NULL,
        login_attempts INT DEFAULT 0,
        locked_until DATETIME NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_employees_position FOREIGN KEY (position_id) REFERENCES pms.positions(id),
        CONSTRAINT FK_employees_department FOREIGN KEY (department_id) REFERENCES pms.departments(id)
    );
    CREATE INDEX ix_employees_login ON pms.employees(employee_code, is_active);
    PRINT 'Created table: employees'
END
GO

-- Customers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.customers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        name_th NVARCHAR(255) NULL,
        contact_person NVARCHAR(100) NULL,
        email NVARCHAR(255) NULL,
        phone NVARCHAR(50) NULL,
        address NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: customers'
END
GO

-- ============================================
-- 2. CONFIG TABLES
-- ============================================

-- Project Status Configs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_status_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_status_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        color NVARCHAR(7) DEFAULT '#6B7280',
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: project_status_configs'
END
GO

-- Milestone Configs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'milestone_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.milestone_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        color NVARCHAR(7) DEFAULT '#6B7280',
        ttd_weight DECIMAL(5,2) DEFAULT 0,
        mdc_weight DECIMAL(5,2) DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: milestone_configs'
END
GO

-- Deliverable Configs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'deliverable_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.deliverable_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        name_th NVARCHAR(255) NULL,
        description NVARCHAR(500) NULL,
        milestone_config_id UNIQUEIDENTIFIER NULL,
        is_required BIT DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_deliverable_configs_milestone FOREIGN KEY (milestone_config_id) REFERENCES pms.milestone_configs(id)
    );
    PRINT 'Created table: deliverable_configs'
END
GO

-- Task Type Configs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'task_type_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.task_type_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        color NVARCHAR(7) DEFAULT '#6B7280',
        icon NVARCHAR(50) DEFAULT 'file-text',
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: task_type_configs'
END
GO

-- Project Types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_types' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_types (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(20) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        name_th NVARCHAR(100) NULL,
        description NVARCHAR(500) NULL,
        color NVARCHAR(7) DEFAULT '#3B82F6',
        has_milestones BIT DEFAULT 1,
        has_deliverables BIT DEFAULT 1,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: project_types'
END
GO

-- System Configs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.system_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        config_key NVARCHAR(100) NOT NULL UNIQUE,
        config_value NVARCHAR(MAX) NOT NULL,
        description NVARCHAR(500) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: system_configs'
END
GO

-- ============================================
-- 3. PROJECT TABLES
-- ============================================

-- Projects
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.projects (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_code NVARCHAR(20) NOT NULL UNIQUE,
        project_year INT NOT NULL,
        name NVARCHAR(255) NOT NULL,
        name_th NVARCHAR(255) NULL,
        description NVARCHAR(MAX) NULL,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        project_manager_id UNIQUEIDENTIFIER NOT NULL,
        project_owner_id UNIQUEIDENTIFIER NULL,
        project_type_id UNIQUEIDENTIFIER NULL,
        status_id UNIQUEIDENTIFIER NULL,
        current_milestone_id UNIQUEIDENTIFIER NULL,
        sold_mandays DECIMAL(10,2) DEFAULT 0,
        manday_rate DECIMAL(10,2) DEFAULT 15000,
        start_date DATE NULL,
        end_date DATE NULL,
        warranty_end_date DATE NULL,
        progress_percent DECIMAL(5,2) DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_projects_customer FOREIGN KEY (customer_id) REFERENCES pms.customers(id),
        CONSTRAINT FK_projects_pm FOREIGN KEY (project_manager_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_projects_owner FOREIGN KEY (project_owner_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_projects_type FOREIGN KEY (project_type_id) REFERENCES pms.project_types(id),
        CONSTRAINT FK_projects_status FOREIGN KEY (status_id) REFERENCES pms.project_status_configs(id)
    );
    PRINT 'Created table: projects'
END
GO

-- Project Milestones
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_milestones' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_milestones (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        milestone_config_id UNIQUEIDENTIFIER NULL,
        name NVARCHAR(100) NULL,
        weight_percent DECIMAL(5,2) DEFAULT 0,
        weight_ttd DECIMAL(5,2) DEFAULT 0,
        weight_mdc DECIMAL(5,2) DEFAULT 0,
        due_date DATE NULL,
        completed_date DATE NULL,
        planned_mandays DECIMAL(10,2) DEFAULT 0,
        actual_mandays DECIMAL(10,2) DEFAULT 0,
        progress_percent DECIMAL(5,2) DEFAULT 0,
        status NVARCHAR(20) DEFAULT 'pending',
        is_locked BIT DEFAULT 0,
        is_approved BIT DEFAULT 0,
        kpi_ttd_pass BIT NULL,
        kpi_mdc_pass BIT NULL,
        sort_order INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_project_milestones_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_project_milestones_config FOREIGN KEY (milestone_config_id) REFERENCES pms.milestone_configs(id)
    );
    PRINT 'Created table: project_milestones'
END
GO

-- Project Deliverables
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_deliverables' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_deliverables (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_milestone_id UNIQUEIDENTIFIER NOT NULL,
        deliverable_config_id UNIQUEIDENTIFIER NULL,
        name NVARCHAR(255) NOT NULL,
        name_th NVARCHAR(255) NULL,
        description NVARCHAR(500) NULL,
        is_required BIT DEFAULT 0,
        submitted_date DATE NULL,
        is_verified BIT DEFAULT 0,
        verified_by UNIQUEIDENTIFIER NULL,
        verified_date DATETIME2 NULL,
        file_path NVARCHAR(500) NULL,
        is_locked BIT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_project_deliverables_milestone FOREIGN KEY (project_milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_project_deliverables_config FOREIGN KEY (deliverable_config_id) REFERENCES pms.deliverable_configs(id),
        CONSTRAINT FK_project_deliverables_verified_by FOREIGN KEY (verified_by) REFERENCES pms.employees(id)
    );
    PRINT 'Created table: project_deliverables'
END
GO

-- ============================================
-- 4. WORK ITEMS (Stories, Tasks)
-- ============================================

-- Stories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stories' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.stories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        story_code NVARCHAR(20) NOT NULL UNIQUE,
        project_id UNIQUEIDENTIFIER NOT NULL,
        milestone_id UNIQUEIDENTIFIER NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        priority NVARCHAR(20) DEFAULT 'medium',
        status NVARCHAR(20) DEFAULT 'todo',
        estimated_hours DECIMAL(10,2) DEFAULT 0,
        actual_hours DECIMAL(10,2) DEFAULT 0,
        start_date DATE NULL,
        due_date DATE NULL,
        completed_date DATE NULL,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_stories_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_stories_milestone FOREIGN KEY (milestone_id) REFERENCES pms.project_milestones(id),
        CONSTRAINT FK_stories_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );
    PRINT 'Created table: stories'
END
GO

-- Sprints
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sprints' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.sprints (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        sprint_code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        goal NVARCHAR(MAX) NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'planned',
        project_id UNIQUEIDENTIFIER NULL,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        CONSTRAINT FK_sprints_projects FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_sprints_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT CK_sprints_status CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
        CONSTRAINT CK_sprints_dates CHECK (end_date >= start_date)
    );
    PRINT 'Created table: sprints'
END
GO

-- Tasks
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.tasks (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_code NVARCHAR(20) NOT NULL UNIQUE,
        story_id UNIQUEIDENTIFIER NOT NULL,
        sprint_id UNIQUEIDENTIFIER NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        task_type NVARCHAR(50) DEFAULT 'development',
        assignee_id UNIQUEIDENTIFIER NULL,
        reviewer_id UNIQUEIDENTIFIER NULL,
        priority NVARCHAR(20) DEFAULT 'medium',
        status NVARCHAR(30) DEFAULT 'todo',
        estimated_hours DECIMAL(10,2) DEFAULT 0,
        actual_hours DECIMAL(10,2) DEFAULT 0,
        start_date DATE NULL,
        due_date DATE NULL,
        completed_date DATE NULL,
        not_as_planned_reason NVARCHAR(500) NULL,
        sort_order INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_tasks_story FOREIGN KEY (story_id) REFERENCES pms.stories(id),
        CONSTRAINT FK_tasks_sprint FOREIGN KEY (sprint_id) REFERENCES pms.sprints(id),
        CONSTRAINT FK_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_tasks_reviewer FOREIGN KEY (reviewer_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_tasks_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id),
        CONSTRAINT CK_tasks_status CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'done_not_planned', 'blocked', 'cancelled'))
    );
    PRINT 'Created table: tasks'
END
GO

-- ============================================
-- 5. TIMESHEET
-- ============================================

-- Timesheet Entries
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'timesheet_entries' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.timesheet_entries (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        employee_id UNIQUEIDENTIFIER NOT NULL,
        task_id UNIQUEIDENTIFIER NULL,
        entry_date DATE NOT NULL,
        hours DECIMAL(4,2) NOT NULL,
        description NVARCHAR(500) NULL,
        is_billable BIT DEFAULT 1,
        status NVARCHAR(20) DEFAULT 'draft',
        approved_by UNIQUEIDENTIFIER NULL,
        approved_at DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_timesheet_employee FOREIGN KEY (employee_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_timesheet_task FOREIGN KEY (task_id) REFERENCES pms.tasks(id),
        CONSTRAINT FK_timesheet_approved_by FOREIGN KEY (approved_by) REFERENCES pms.employees(id)
    );
    CREATE INDEX IX_timesheet_employee_date ON pms.timesheet_entries(employee_id, entry_date);
    PRINT 'Created table: timesheet_entries'
END
GO

-- ============================================
-- 6. KPI TABLES
-- ============================================

-- Deploy Records
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'deploy_records' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.deploy_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        deploy_date DATE NOT NULL,
        deploy_type NVARCHAR(50) NOT NULL,
        version NVARCHAR(50) NULL,
        is_success BIT DEFAULT 1,
        description NVARCHAR(500) NULL,
        deployed_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_deploy_records_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_deploy_records_employee FOREIGN KEY (deployed_by) REFERENCES pms.employees(id)
    );
    PRINT 'Created table: deploy_records'
END
GO

-- Backup Sources
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'backup_sources' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.backup_sources (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        source_name NVARCHAR(100) NOT NULL,
        source_type NVARCHAR(50) NOT NULL,
        description NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_backup_sources_project FOREIGN KEY (project_id) REFERENCES pms.projects(id)
    );
    PRINT 'Created table: backup_sources'
END
GO

-- Deploy Backup Records
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'deploy_backup_records' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.deploy_backup_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        backup_source_id UNIQUEIDENTIFIER NOT NULL,
        backup_date DATE NOT NULL,
        is_success BIT DEFAULT 1,
        file_path NVARCHAR(500) NULL,
        file_size_mb DECIMAL(10,2) NULL,
        notes NVARCHAR(500) NULL,
        backed_up_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_deploy_backup_source FOREIGN KEY (backup_source_id) REFERENCES pms.backup_sources(id),
        CONSTRAINT FK_deploy_backup_employee FOREIGN KEY (backed_up_by) REFERENCES pms.employees(id)
    );
    PRINT 'Created table: deploy_backup_records'
END
GO

-- Meeting Minutes Records
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'meeting_minutes_records' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.meeting_minutes_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        meeting_date DATE NOT NULL,
        meeting_type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        attendees NVARCHAR(MAX) NULL,
        summary NVARCHAR(MAX) NULL,
        submitted_date DATE NULL,
        is_on_time BIT NULL,
        file_path NVARCHAR(500) NULL,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_meeting_minutes_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_meeting_minutes_created_by FOREIGN KEY (created_by) REFERENCES pms.employees(id)
    );
    PRINT 'Created table: meeting_minutes_records'
END
GO

-- ============================================
-- 7. VIEWS
-- ============================================

-- View: Sprints with Tasks
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_sprints_with_tasks' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_sprints_with_tasks;
GO

CREATE VIEW pms.vw_sprints_with_tasks AS
SELECT
    s.id,
    s.sprint_code,
    s.name,
    s.goal,
    s.start_date,
    s.end_date,
    s.status,
    s.project_id,
    p.project_code,
    p.name AS project_name,
    COUNT(t.id) AS tasks_count,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
    SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours,
    DATEDIFF(DAY, s.start_date, s.end_date) + 1 AS duration_days,
    CASE
        WHEN CAST(GETDATE() AS DATE) < s.start_date THEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.start_date)
        WHEN CAST(GETDATE() AS DATE) > s.end_date THEN 0
        ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.end_date)
    END AS days_remaining,
    s.created_at,
    s.updated_at
FROM pms.sprints s
LEFT JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.tasks t ON t.sprint_id = s.id AND t.is_active = 1
WHERE s.is_active = 1
GROUP BY
    s.id, s.sprint_code, s.name, s.goal, s.start_date, s.end_date,
    s.status, s.project_id, p.project_code, p.name, s.created_at, s.updated_at;
GO

PRINT 'Created view: vw_sprints_with_tasks';

-- View: Issue Clearing KPI
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_issue_clearing_kpi' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_issue_clearing_kpi;
GO

CREATE VIEW pms.vw_issue_clearing_kpi AS
SELECT
    t.assignee_id AS employee_id,
    e.first_name_th + ' ' + e.last_name_th AS employee_name,
    YEAR(t.completed_date) AS year,
    MONTH(t.completed_date) AS month,
    COUNT(*) AS total_completed,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_as_planned,
    SUM(CASE WHEN t.status = 'done_not_planned' THEN 1 ELSE 0 END) AS done_not_as_planned,
    CAST(
        CASE
            WHEN COUNT(*) > 0
            THEN (SUM(CASE WHEN t.status = 'done' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100
            ELSE 100
        END
    AS DECIMAL(5,2)) AS clearing_rate,
    CASE
        WHEN COUNT(*) = 0 THEN 1
        WHEN (SUM(CASE WHEN t.status = 'done' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100 >= 85 THEN 1
        ELSE 0
    END AS is_pass
FROM pms.tasks t
INNER JOIN pms.employees e ON t.assignee_id = e.id
WHERE t.status IN ('done', 'done_not_planned')
AND t.completed_date IS NOT NULL
AND t.is_active = 1
GROUP BY
    t.assignee_id,
    e.first_name_th + ' ' + e.last_name_th,
    YEAR(t.completed_date),
    MONTH(t.completed_date);
GO

PRINT 'Created view: vw_issue_clearing_kpi';

-- ============================================
-- 8. DEFAULT DATA
-- ============================================

-- Insert Default Project Statuses
IF NOT EXISTS (SELECT 1 FROM pms.project_status_configs)
BEGIN
    INSERT INTO pms.project_status_configs (code, name, name_th, color, sort_order) VALUES
    ('PLANNING', 'Planning', 'วางแผน', '#6B7280', 1),
    ('IN_PROGRESS', 'In Progress', 'กำลังดำเนินการ', '#3B82F6', 2),
    ('ON_HOLD', 'On Hold', 'หยุดชั่วคราว', '#F59E0B', 3),
    ('COMPLETED', 'Completed', 'เสร็จสมบูรณ์', '#10B981', 4),
    ('CANCELLED', 'Cancelled', 'ยกเลิก', '#EF4444', 5);
    PRINT 'Inserted default project statuses'
END
GO

-- Insert Default Milestone Configs
IF NOT EXISTS (SELECT 1 FROM pms.milestone_configs)
BEGIN
    INSERT INTO pms.milestone_configs (code, name, name_th, color, ttd_weight, mdc_weight, sort_order) VALUES
    ('REQ', 'Requirement', 'รวบรวมความต้องการ', '#8B5CF6', 10, 10, 1),
    ('DESIGN', 'Design', 'ออกแบบระบบ', '#3B82F6', 15, 15, 2),
    ('DEV', 'Development', 'พัฒนาระบบ', '#10B981', 40, 40, 3),
    ('UAT', 'UAT', 'ทดสอบระบบ', '#F59E0B', 20, 20, 4),
    ('GOLIVE', 'Go-Live', 'ติดตั้งระบบ', '#EF4444', 15, 15, 5);
    PRINT 'Inserted default milestone configs'
END
GO

-- Insert Default Project Types
IF NOT EXISTS (SELECT 1 FROM pms.project_types)
BEGIN
    INSERT INTO pms.project_types (code, name, name_th, color, has_milestones, has_deliverables, sort_order) VALUES
    ('DEV', 'Development', 'พัฒนาระบบ', '#3B82F6', 1, 1, 1),
    ('SUPPORT', 'Support', 'สนับสนุน', '#10B981', 0, 0, 2),
    ('CONSULT', 'Consulting', 'ที่ปรึกษา', '#8B5CF6', 1, 1, 3);
    PRINT 'Inserted default project types'
END
GO

-- Insert Default Task Types
IF NOT EXISTS (SELECT 1 FROM pms.task_type_configs)
BEGIN
    INSERT INTO pms.task_type_configs (code, name, name_th, color, icon, sort_order) VALUES
    ('DEV', 'Development', 'พัฒนา', '#3B82F6', 'code', 1),
    ('BUG', 'Bug Fix', 'แก้ไขบัก', '#EF4444', 'bug', 2),
    ('TEST', 'Testing', 'ทดสอบ', '#F59E0B', 'flask-conical', 3),
    ('DESIGN', 'Design', 'ออกแบบ', '#8B5CF6', 'palette', 4),
    ('DOC', 'Documentation', 'เอกสาร', '#6B7280', 'file-text', 5),
    ('MEETING', 'Meeting', 'ประชุม', '#10B981', 'users', 6);
    PRINT 'Inserted default task types'
END
GO

PRINT '============================================'
PRINT 'Database schema created successfully!'
PRINT '============================================'
