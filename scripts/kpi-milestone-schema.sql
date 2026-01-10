-- ============================================
-- KPI System Schema: Time to Delivery & Man-day Control
-- ============================================
-- Version: 1.2
-- Date: 2026-01-10
-- Description: Add progress_percent to milestones and create KPI views
-- Fixed: View creation order to avoid dependency issues
-- Fixed: Column names (project_manager_id instead of owner_id)
-- Fixed: Removed is_active from project_milestones (column doesn't exist)
-- ============================================

-- ============================================
-- PART 1: ALTER project_milestones TABLE
-- ============================================

-- Check if progress_percent column exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.project_milestones') AND name = 'progress_percent')
BEGIN
    -- Add progress_percent column
    ALTER TABLE pms.project_milestones
    ADD progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0;

    PRINT 'Added progress_percent column to project_milestones';
END
ELSE
BEGIN
    PRINT 'progress_percent column already exists';
END
GO

-- Add constraint if not exists
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_milestone_progress')
BEGIN
    ALTER TABLE pms.project_milestones
    ADD CONSTRAINT CK_milestone_progress CHECK (progress_percent >= 0 AND progress_percent <= 100);

    PRINT 'Added CK_milestone_progress constraint';
END
GO

-- Update existing milestones based on status (only if progress is 0)
UPDATE pms.project_milestones
SET progress_percent = CASE
    WHEN status = 'completed' THEN 100
    WHEN status = 'in_progress' THEN 50
    ELSE 0
END
WHERE progress_percent = 0;
GO

PRINT 'Updated existing milestone progress values';
GO

-- ============================================
-- PART 2: ALTER milestone_configs TABLE
-- ============================================

-- Add kpi_category column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('pms.milestone_configs') AND name = 'kpi_category')
BEGIN
    ALTER TABLE pms.milestone_configs
    ADD kpi_category NVARCHAR(50) NULL;

    PRINT 'Added kpi_category column to milestone_configs';
END
GO

-- Update milestone configs with KPI categories
-- Note: Adjust these mappings based on actual codes in your database
UPDATE pms.milestone_configs SET kpi_category = 'MAPPING'
WHERE UPPER(code) IN ('REQ', 'DESIGN', 'REQUIREMENT', 'MAPPING', 'ANALYSIS', 'DESIGN_SPEC', 'SRS', 'BRD');

UPDATE pms.milestone_configs SET kpi_category = 'SYSTEMTEST'
WHERE UPPER(code) IN ('DEV', 'DEVELOP', 'DEVELOPMENT', 'ST', 'SYSTEMTEST', 'CODING', 'BUILD', 'SIT');

UPDATE pms.milestone_configs SET kpi_category = 'UAT'
WHERE UPPER(code) IN ('TEST', 'UAT', 'TESTING', 'ACCEPTANCE', 'USER_TEST');

UPDATE pms.milestone_configs SET kpi_category = 'GOLIVE'
WHERE UPPER(code) IN ('GOLIVE', 'GO-LIVE', 'DEPLOY', 'PRODUCTION', 'RELEASE', 'LAUNCH', 'DEPLOYMENT');

UPDATE pms.milestone_configs SET kpi_category = 'CLOSEGOLIVE'
WHERE UPPER(code) IN ('CLOSE', 'CLOSEGOLIVE', 'WARRANTY', 'SUPPORT', 'MAINTENANCE', 'HANDOVER');
GO

PRINT 'Updated milestone_configs with KPI categories';
GO

-- ============================================
-- PART 3: KPI CONFIGURATION IN system_configs
-- ============================================

-- Insert KPI targets if not exists
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_TIME_TO_DELIVERY_TARGET')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at)
    VALUES (NEWID(), 'KPI_TIME_TO_DELIVERY_TARGET', '80', 'number', 'Time to Delivery KPI target percentage', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MANDAY_CONTROL_TARGET')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at)
    VALUES (NEWID(), 'KPI_MANDAY_CONTROL_TARGET', '85', 'number', 'Man-day Control KPI target percentage', GETDATE(), GETDATE());
END

-- Insert KPI weight configs for Time to Delivery
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_TTD_WEIGHT_MAPPING')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_TTD_WEIGHT_MAPPING', '35', 'number', 'Weight for Mapping/Design phase (Time to Delivery)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_TTD_WEIGHT_SYSTEMTEST')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_TTD_WEIGHT_SYSTEMTEST', '20', 'number', 'Weight for System Test phase (Time to Delivery)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_TTD_WEIGHT_UAT')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_TTD_WEIGHT_UAT', '30', 'number', 'Weight for UAT phase (Time to Delivery)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_TTD_WEIGHT_GOLIVE')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_TTD_WEIGHT_GOLIVE', '15', 'number', 'Weight for Go-Live phase (Time to Delivery)', GETDATE(), GETDATE());
END

-- Insert KPI weight configs for Man-day Control
IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MDC_WEIGHT_MAPPING')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_MDC_WEIGHT_MAPPING', '30', 'number', 'Weight for Mapping/Design phase (Man-day Control)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MDC_WEIGHT_SYSTEMTEST')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_MDC_WEIGHT_SYSTEMTEST', '30', 'number', 'Weight for System Test phase (Man-day Control)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MDC_WEIGHT_UAT')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_MDC_WEIGHT_UAT', '20', 'number', 'Weight for UAT phase (Man-day Control)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MDC_WEIGHT_GOLIVE')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_MDC_WEIGHT_GOLIVE', '10', 'number', 'Weight for Go-Live phase (Man-day Control)', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = 'KPI_MDC_WEIGHT_CLOSEGOLIVE')
BEGIN
    INSERT INTO pms.system_configs (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES
    (NEWID(), 'KPI_MDC_WEIGHT_CLOSEGOLIVE', '10', 'number', 'Weight for Close Go-Live phase (Man-day Control)', GETDATE(), GETDATE());
END
GO

PRINT 'KPI configuration values inserted';
GO

-- ============================================
-- PART 4: DROP ALL KPI VIEWS FIRST (in reverse dependency order)
-- ============================================

-- Drop views that depend on other views first
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_kpi_yearly_summary' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_kpi_yearly_summary;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_kpi_dashboard_summary' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_kpi_dashboard_summary;
GO

-- Drop base views
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_kpi_milestone_detail' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_kpi_milestone_detail;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_kpi_manday_control' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_kpi_manday_control;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_kpi_time_to_delivery' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_kpi_time_to_delivery;
GO

PRINT 'Dropped existing KPI views';
GO

-- ============================================
-- PART 5: CREATE KPI VIEWS (in correct dependency order)
-- ============================================

-- View 1: Time to Delivery KPI Summary per Project (BASE VIEW)
CREATE VIEW pms.vw_kpi_time_to_delivery AS
WITH MilestoneScores AS (
    SELECT
        p.id AS project_id,
        p.project_code,
        p.[name] AS project_name,
        p.project_year,
        p.customer_id,
        p.project_manager_id,
        pm.id AS milestone_id,
        mc.code AS milestone_code,
        mc.[name] AS milestone_name,
        mc.kpi_category,
        pm.weight_percent,
        pm.progress_percent,
        pm.due_date,
        pm.completed_date,
        pm.[status],
        -- On-time factor calculation
        CASE
            WHEN pm.[status] = 'completed' AND pm.completed_date IS NOT NULL AND pm.due_date IS NOT NULL
                 AND pm.completed_date <= pm.due_date THEN 1.0
            WHEN pm.[status] = 'completed' AND pm.completed_date IS NOT NULL AND pm.due_date IS NOT NULL
                 AND pm.completed_date > pm.due_date THEN 0.0
            WHEN pm.[status] != 'completed' AND pm.due_date IS NOT NULL AND CAST(GETDATE() AS DATE) <= pm.due_date THEN 1.0
            WHEN pm.[status] != 'completed' AND pm.due_date IS NOT NULL AND CAST(GETDATE() AS DATE) > pm.due_date THEN 0.0
            WHEN pm.due_date IS NULL THEN 1.0 -- No due date = assume on time
            ELSE 0.0
        END AS on_time_factor
    FROM pms.projects p
    INNER JOIN pms.project_milestones pm ON p.id = pm.project_id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE p.is_active = 1
)
SELECT
    project_id,
    project_code,
    project_name,
    project_year,
    customer_id,
    project_manager_id,
    COUNT(milestone_id) AS total_milestones,
    SUM(CASE WHEN on_time_factor = 1.0 THEN 1 ELSE 0 END) AS on_time_milestones,
    SUM(CASE WHEN on_time_factor = 0.0 THEN 1 ELSE 0 END) AS late_milestones,
    SUM(weight_percent) AS total_weight,
    -- KPI Score calculation
    CASE
        WHEN SUM(weight_percent) > 0
        THEN ROUND(
            SUM(weight_percent * (progress_percent / 100.0) * on_time_factor)
            / SUM(weight_percent) * 100, 2)
        ELSE 0
    END AS kpi_score,
    80.0 AS kpi_target,
    CASE
        WHEN SUM(weight_percent) > 0
             AND (SUM(weight_percent * (progress_percent / 100.0) * on_time_factor) / SUM(weight_percent) * 100) >= 80
        THEN 'PASS'
        ELSE 'FAIL'
    END AS kpi_status
FROM MilestoneScores
GROUP BY project_id, project_code, project_name, project_year, customer_id, project_manager_id;
GO

PRINT 'Created view: vw_kpi_time_to_delivery';
GO

-- View 2: Man-day Control KPI Summary per Project (BASE VIEW)
CREATE VIEW pms.vw_kpi_manday_control AS
WITH MilestoneScores AS (
    SELECT
        p.id AS project_id,
        p.project_code,
        p.[name] AS project_name,
        p.project_year,
        p.customer_id,
        p.project_manager_id,
        pm.id AS milestone_id,
        mc.code AS milestone_code,
        mc.[name] AS milestone_name,
        mc.kpi_category,
        pm.weight_percent,
        pm.progress_percent,
        pm.planned_mandays,
        pm.actual_mandays,
        pm.[status],
        -- Budget factor calculation
        CASE
            WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 1.0 -- No budget = assume OK
            WHEN pm.actual_mandays IS NULL OR pm.actual_mandays = 0 THEN 1.0 -- Not started = assume OK
            WHEN pm.actual_mandays <= pm.planned_mandays THEN 1.0 -- Within budget
            ELSE 0.0 -- Over budget
        END AS budget_factor,
        -- Variance calculation
        CASE
            WHEN pm.planned_mandays IS NOT NULL AND pm.planned_mandays > 0
            THEN ISNULL(pm.actual_mandays, 0) - pm.planned_mandays
            ELSE 0
        END AS manday_variance,
        -- Variance percentage
        CASE
            WHEN pm.planned_mandays IS NOT NULL AND pm.planned_mandays > 0
            THEN ROUND(((ISNULL(pm.actual_mandays, 0) - pm.planned_mandays) / pm.planned_mandays) * 100, 2)
            ELSE 0
        END AS variance_percent
    FROM pms.projects p
    INNER JOIN pms.project_milestones pm ON p.id = pm.project_id
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    WHERE p.is_active = 1
)
SELECT
    project_id,
    project_code,
    project_name,
    project_year,
    customer_id,
    project_manager_id,
    COUNT(milestone_id) AS total_milestones,
    SUM(CASE WHEN budget_factor = 1.0 THEN 1 ELSE 0 END) AS within_budget_milestones,
    SUM(CASE WHEN budget_factor = 0.0 THEN 1 ELSE 0 END) AS over_budget_milestones,
    SUM(ISNULL(planned_mandays, 0)) AS total_planned_mandays,
    SUM(ISNULL(actual_mandays, 0)) AS total_actual_mandays,
    SUM(manday_variance) AS total_variance,
    SUM(weight_percent) AS total_weight,
    -- KPI Score calculation
    CASE
        WHEN SUM(weight_percent) > 0
        THEN ROUND(
            SUM(weight_percent * (progress_percent / 100.0) * budget_factor)
            / SUM(weight_percent) * 100, 2)
        ELSE 0
    END AS kpi_score,
    85.0 AS kpi_target,
    CASE
        WHEN SUM(weight_percent) > 0
             AND (SUM(weight_percent * (progress_percent / 100.0) * budget_factor) / SUM(weight_percent) * 100) >= 85
        THEN 'PASS'
        ELSE 'FAIL'
    END AS kpi_status
FROM MilestoneScores
GROUP BY project_id, project_code, project_name, project_year, customer_id, project_manager_id;
GO

PRINT 'Created view: vw_kpi_manday_control';
GO

-- View 3: Combined KPI Detail per Milestone (BASE VIEW - no dependencies)
CREATE VIEW pms.vw_kpi_milestone_detail AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.[name] AS project_name,
    p.project_year,
    pm.id AS milestone_id,
    mc.code AS milestone_code,
    mc.[name] AS milestone_name,
    mc.color AS milestone_color,
    mc.kpi_category,
    pm.weight_percent,
    pm.progress_percent,
    pm.[status],
    pm.sort_order,
    -- Time to Delivery fields
    pm.due_date,
    pm.completed_date,
    CASE
        WHEN pm.completed_date IS NOT NULL
        THEN DATEDIFF(day, pm.due_date, pm.completed_date)
        ELSE DATEDIFF(day, pm.due_date, CAST(GETDATE() AS DATE))
    END AS days_variance,
    CASE
        WHEN pm.[status] = 'completed' AND pm.completed_date IS NOT NULL AND pm.due_date IS NOT NULL AND pm.completed_date <= pm.due_date THEN 'on_time'
        WHEN pm.[status] = 'completed' AND pm.completed_date IS NOT NULL AND pm.due_date IS NOT NULL AND pm.completed_date > pm.due_date THEN 'late'
        WHEN pm.[status] != 'completed' AND pm.due_date IS NOT NULL AND CAST(GETDATE() AS DATE) <= pm.due_date THEN 'on_track'
        WHEN pm.[status] != 'completed' AND pm.due_date IS NOT NULL AND CAST(GETDATE() AS DATE) > pm.due_date THEN 'overdue'
        ELSE 'no_date'
    END AS time_status,
    -- Man-day Control fields
    pm.planned_mandays,
    pm.actual_mandays,
    ISNULL(pm.actual_mandays, 0) - ISNULL(pm.planned_mandays, 0) AS manday_variance,
    CASE
        WHEN pm.planned_mandays > 0
        THEN ROUND(((ISNULL(pm.actual_mandays, 0) - pm.planned_mandays) / pm.planned_mandays) * 100, 2)
        ELSE 0
    END AS manday_variance_percent,
    CASE
        WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 'no_budget'
        WHEN ISNULL(pm.actual_mandays, 0) <= pm.planned_mandays THEN 'within_budget'
        ELSE 'over_budget'
    END AS budget_status
FROM pms.projects p
INNER JOIN pms.project_milestones pm ON p.id = pm.project_id
INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
WHERE p.is_active = 1;
GO

PRINT 'Created view: vw_kpi_milestone_detail';
GO

-- View 4: Overall KPI Dashboard Summary (DEPENDS ON views 1 & 2)
CREATE VIEW pms.vw_kpi_dashboard_summary AS
SELECT
    'TIME_TO_DELIVERY' AS kpi_code,
    'Time to Delivery' AS kpi_name,
    COUNT(*) AS total_projects,
    SUM(CASE WHEN kpi_status = 'PASS' THEN 1 ELSE 0 END) AS passed_projects,
    SUM(CASE WHEN kpi_status = 'FAIL' THEN 1 ELSE 0 END) AS failed_projects,
    ROUND(AVG(kpi_score), 2) AS avg_score,
    80.0 AS target,
    CASE WHEN AVG(kpi_score) >= 80 THEN 'PASS' ELSE 'FAIL' END AS overall_status
FROM pms.vw_kpi_time_to_delivery

UNION ALL

SELECT
    'MANDAY_CONTROL' AS kpi_code,
    'Man-day Control' AS kpi_name,
    COUNT(*) AS total_projects,
    SUM(CASE WHEN kpi_status = 'PASS' THEN 1 ELSE 0 END) AS passed_projects,
    SUM(CASE WHEN kpi_status = 'FAIL' THEN 1 ELSE 0 END) AS failed_projects,
    ROUND(AVG(kpi_score), 2) AS avg_score,
    85.0 AS target,
    CASE WHEN AVG(kpi_score) >= 85 THEN 'PASS' ELSE 'FAIL' END AS overall_status
FROM pms.vw_kpi_manday_control;
GO

PRINT 'Created view: vw_kpi_dashboard_summary';
GO

-- View 5: KPI by Year Summary (DEPENDS ON views 1 & 2)
CREATE VIEW pms.vw_kpi_yearly_summary AS
SELECT
    project_year,
    'TIME_TO_DELIVERY' AS kpi_code,
    COUNT(*) AS total_projects,
    SUM(CASE WHEN kpi_status = 'PASS' THEN 1 ELSE 0 END) AS passed_projects,
    ROUND(AVG(kpi_score), 2) AS avg_score,
    80.0 AS target
FROM pms.vw_kpi_time_to_delivery
GROUP BY project_year

UNION ALL

SELECT
    project_year,
    'MANDAY_CONTROL' AS kpi_code,
    COUNT(*) AS total_projects,
    SUM(CASE WHEN kpi_status = 'PASS' THEN 1 ELSE 0 END) AS passed_projects,
    ROUND(AVG(kpi_score), 2) AS avg_score,
    85.0 AS target
FROM pms.vw_kpi_manday_control
GROUP BY project_year;
GO

PRINT 'Created view: vw_kpi_yearly_summary';
GO

-- ============================================
-- VERIFICATION
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'KPI Schema Migration Complete!';
PRINT '============================================';
PRINT '';
PRINT 'Tables modified:';
PRINT '  - pms.project_milestones (added progress_percent)';
PRINT '  - pms.milestone_configs (added kpi_category)';
PRINT '';
PRINT 'Configuration added to pms.system_configs:';
PRINT '  - KPI_TIME_TO_DELIVERY_TARGET = 80%';
PRINT '  - KPI_MANDAY_CONTROL_TARGET = 85%';
PRINT '  - KPI weights for TTD and MDC';
PRINT '';
PRINT 'Views created:';
PRINT '  - pms.vw_kpi_time_to_delivery';
PRINT '  - pms.vw_kpi_manday_control';
PRINT '  - pms.vw_kpi_milestone_detail';
PRINT '  - pms.vw_kpi_dashboard_summary';
PRINT '  - pms.vw_kpi_yearly_summary';
PRINT '';
GO

-- ============================================
-- TEST QUERIES (Run these to verify)
-- ============================================
/*
-- Check KPI Dashboard Summary
SELECT * FROM pms.vw_kpi_dashboard_summary;

-- Check Time to Delivery per Project
SELECT * FROM pms.vw_kpi_time_to_delivery ORDER BY project_code;

-- Check Man-day Control per Project
SELECT * FROM pms.vw_kpi_manday_control ORDER BY project_code;

-- Check Milestone Details
SELECT * FROM pms.vw_kpi_milestone_detail ORDER BY project_code, sort_order;

-- Check Yearly Summary
SELECT * FROM pms.vw_kpi_yearly_summary ORDER BY project_year DESC, kpi_code;

-- Check milestone configs with KPI categories
SELECT code, name, kpi_category FROM pms.milestone_configs WHERE kpi_category IS NOT NULL;

-- Check system configs for KPI
SELECT config_key, config_value, description FROM pms.system_configs WHERE config_key LIKE 'KPI_%';
*/
