-- ============================================
-- TABLE: System Configs
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.system_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        config_key NVARCHAR(100) NOT NULL UNIQUE,
        config_value NVARCHAR(500) NOT NULL,
        config_type NVARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Insert default configs
    INSERT INTO pms.system_configs (config_key, config_value, config_type, description) VALUES
    ('WORKING_HOURS_PER_DAY', '7', 'number', 'ชั่วโมงทำงานต่อวัน'),
    ('WORKING_DAYS_PER_WEEK', '5', 'number', 'วันทำงานต่อสัปดาห์'),
    ('WORKLOAD_WARNING_PERCENT', '70', 'number', 'เปอร์เซ็นต์เตือน Workload'),
    ('WORKLOAD_FULL_PERCENT', '100', 'number', 'เปอร์เซ็นต์ Workload เต็ม'),
    ('MANDAY_HOURS', '7', 'number', 'ชั่วโมงต่อ 1 Manday');
    
    PRINT 'Created: pms.system_configs'
END
GO

-- ============================================
-- VIEW: Employee Daily Workload
-- คำนวณ Workload รายวันจาก Tasks ที่ได้รับมอบหมาย
-- ============================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_employee_daily_workload' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_employee_daily_workload;
GO

CREATE VIEW pms.vw_employee_daily_workload AS
WITH DateRange AS (
    -- สร้าง date range 60 วัน (30 วันก่อน + 30 วันหลัง)
    SELECT CAST(DATEADD(DAY, -30, GETDATE()) AS DATE) AS work_date
    UNION ALL
    SELECT DATEADD(DAY, 1, work_date)
    FROM DateRange
    WHERE work_date < DATEADD(DAY, 30, GETDATE())
),
TaskHoursPerDay AS (
    -- คำนวณชั่วโมงต่อวันของแต่ละ Task
    -- สมมติว่า estimated_hours กระจายเท่าๆ กันในช่วง start_date - due_date
    SELECT 
        t.assignee_id,
        t.id AS task_id,
        t.task_code,
        t.title AS task_title,
        t.estimated_hours,
        t.start_date,
        t.due_date,
        DATEDIFF(DAY, t.start_date, t.due_date) + 1 AS total_days,
        CASE 
            WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
            THEN t.estimated_hours / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
            ELSE t.estimated_hours
        END AS hours_per_day
    FROM pms.tasks t
    WHERE t.is_active = 1 
      AND t.status NOT IN ('done', 'cancelled')
      AND t.assignee_id IS NOT NULL
      AND t.start_date IS NOT NULL
      AND t.due_date IS NOT NULL
      AND t.estimated_hours > 0
)
SELECT 
    e.id AS employee_id,
    e.employee_code,
    CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
    e.nickname,
    pos.code AS position_code,
    pos.name AS position_name,
    d.work_date,
    DATENAME(WEEKDAY, d.work_date) AS day_name,
    
    -- Total assigned hours for this day
    ISNULL(SUM(
        CASE 
            WHEN d.work_date BETWEEN th.start_date AND th.due_date 
            THEN th.hours_per_day 
            ELSE 0 
        END
    ), 0) AS assigned_hours,
    
    -- Config: hours per day (default 7)
    CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) AS capacity_hours,
    
    -- Workload percent
    CASE 
        WHEN CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) > 0
        THEN CAST(
            ISNULL(SUM(
                CASE 
                    WHEN d.work_date BETWEEN th.start_date AND th.due_date 
                    THEN th.hours_per_day 
                    ELSE 0 
                END
            ), 0) / CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) * 100
        AS INT)
        ELSE 0
    END AS workload_percent,
    
    -- Available hours
    CAST((SELECT TOP 1 config_value FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY') AS DECIMAL(10,2)) - 
    ISNULL(SUM(
        CASE 
            WHEN d.work_date BETWEEN th.start_date AND th.due_date 
            THEN th.hours_per_day 
            ELSE 0 
        END
    ), 0) AS available_hours

FROM pms.employees e
CROSS JOIN DateRange d
LEFT JOIN pms.positions pos ON e.position_id = pos.id
LEFT JOIN TaskHoursPerDay th ON th.assignee_id = e.id
WHERE e.is_active = 1
  AND DATEPART(WEEKDAY, d.work_date) NOT IN (1, 7) -- Exclude Sat, Sun (adjust for locale)
GROUP BY 
    e.id, e.employee_code, e.first_name_th, e.last_name_th, e.nickname,
    pos.code, pos.name, d.work_date
-- Remove OPTION (MAXRECURSION 100) because it's not valid in VIEW definition directly in some SQL Server versions or contexts, 
-- usually recursion option is for the query using the CTE, but here it's inside a view definition.
-- However, for the DateRange CTE to work beyond default recursion depth (if needed), it's usually fine for 60 days.
-- I'll keep it simple. Standard SQL Server default is 100 which is enough for 60 days.
GO

PRINT 'Created: pms.vw_employee_daily_workload'
GO

-- ============================================
-- VIEW: Employee Task Schedule
-- แสดง Tasks ที่ถูก Assign ให้แต่ละคนในแต่ละวัน
-- ============================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_employee_task_schedule' AND schema_id = SCHEMA_ID('pms'))
    DROP VIEW pms.vw_employee_task_schedule;
GO

CREATE VIEW pms.vw_employee_task_schedule AS
SELECT 
    t.assignee_id AS employee_id,
    t.id AS task_id,
    t.task_code,
    t.title AS task_title,
    t.task_type,
    ttc.name_th AS task_type_name,
    ttc.color AS task_type_color,
    ttc.icon AS task_type_icon,
    t.priority,
    t.status,
    t.start_date,
    t.due_date,
    t.estimated_hours,
    DATEDIFF(DAY, t.start_date, t.due_date) + 1 AS duration_days,
    CASE 
        WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
        THEN t.estimated_hours / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
        ELSE t.estimated_hours
    END AS hours_per_day,
    s.story_code,
    s.title AS story_title,
    p.project_code,
    p.name AS project_name
FROM pms.tasks t
INNER JOIN pms.stories s ON t.story_id = s.id
INNER JOIN pms.projects p ON s.project_id = p.id
LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
WHERE t.is_active = 1 
  AND t.status NOT IN ('done', 'cancelled')
  AND t.assignee_id IS NOT NULL
  AND t.start_date IS NOT NULL
  AND t.due_date IS NOT NULL;
GO

PRINT 'Created: pms.vw_employee_task_schedule'
GO
