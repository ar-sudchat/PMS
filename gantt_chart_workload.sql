-- ============================================
-- ตาราง System Config
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_configs' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.system_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        config_key NVARCHAR(100) NOT NULL UNIQUE,
        config_value NVARCHAR(500) NOT NULL,
        description NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );

    INSERT INTO pms.system_configs (config_key, config_value, description) VALUES
    ('WORKING_HOURS_PER_DAY', '7', 'จำนวนชั่วโมงทำงานต่อวัน'),
    ('WORKLOAD_WARNING_THRESHOLD', '80', 'เปอร์เซ็นต์ที่เริ่มแจ้งเตือน'),
    ('WORKLOAD_FULL_THRESHOLD', '100', 'เปอร์เซ็นต์ที่ถือว่าเต็ม');

    PRINT 'Created: pms.system_configs'
END
GO

-- ============================================
-- Stored Procedure: Get Team Workload
-- ============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_team_workload' AND schema_id = SCHEMA_ID('pms'))
    DROP PROCEDURE pms.sp_get_team_workload;
GO

CREATE PROCEDURE pms.sp_get_team_workload
    @start_date DATE,
    @end_date DATE,
    @new_task_hours DECIMAL(10,2) = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @working_hours DECIMAL(10,2) = 7;
    SELECT @working_hours = CAST(config_value AS DECIMAL(10,2))
    FROM pms.system_configs WHERE config_key = 'WORKING_HOURS_PER_DAY';

    -- Count working days (exclude weekends)
    DECLARE @working_days INT = 0;
    DECLARE @current_date DATE = @start_date;
    
    WHILE @current_date <= @end_date
    BEGIN
        IF DATEPART(WEEKDAY, @current_date) NOT IN (1, 7)
            SET @working_days = @working_days + 1;
        SET @current_date = DATEADD(DAY, 1, @current_date);
    END

    IF @working_days = 0 SET @working_days = 1;

    SELECT 
        e.id AS employee_id,
        COALESCE(e.nickname, e.first_name_th, e.first_name_en) AS employee_name,
        COALESCE(p.name, '') AS position_name,
        e.email,
        @working_days AS working_days,
        @working_hours AS hours_per_day,
        @working_days * @working_hours AS total_capacity_hours,
        
        -- Current assigned hours in date range
        COALESCE((
            SELECT SUM(
                CASE 
                    WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                    THEN t.estimated_hours * 
                         (DATEDIFF(DAY, 
                             CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                             CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END
                         ) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                    ELSE t.estimated_hours
                END
            )
            FROM pms.tasks t
            WHERE t.assignee_id = e.id
              AND t.is_active = 1
              AND t.status NOT IN ('done', 'cancelled')
              AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL
              AND t.start_date <= @end_date AND t.due_date >= @start_date
        ), 0) AS current_assigned_hours,
        
        -- Avg workload %
        CASE 
            WHEN @working_days * @working_hours > 0 
            THEN CAST(COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                        THEN t.estimated_hours * 
                             (DATEDIFF(DAY, 
                                 CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                                 CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END
                             ) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                        ELSE t.estimated_hours
                    END
                )
                FROM pms.tasks t
                WHERE t.assignee_id = e.id
                  AND t.is_active = 1
                  AND t.status NOT IN ('done', 'cancelled')
                  AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL
                  AND t.start_date <= @end_date AND t.due_date >= @start_date
            ), 0) * 100.0 / (@working_days * @working_hours) AS DECIMAL(10,2))
            ELSE 0 
        END AS avg_workload_percent,
        
        -- Impact %
        CASE 
            WHEN @working_days * @working_hours > 0 
            THEN CAST(@new_task_hours * 100.0 / (@working_days * @working_hours) AS DECIMAL(10,2))
            ELSE 0 
        END AS impact_percent,
        
        -- New workload after assign
        CASE 
            WHEN @working_days * @working_hours > 0 
            THEN CAST((COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                        THEN t.estimated_hours * 
                             (DATEDIFF(DAY, 
                                 CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                                 CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END
                             ) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                        ELSE t.estimated_hours
                    END
                )
                FROM pms.tasks t
                WHERE t.assignee_id = e.id
                  AND t.is_active = 1
                  AND t.status NOT IN ('done', 'cancelled')
                  AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL
                  AND t.start_date <= @end_date AND t.due_date >= @start_date
            ), 0) + @new_task_hours) * 100.0 / (@working_days * @working_hours) AS DECIMAL(10,2))
            ELSE 0 
        END AS new_workload_percent,
        
        -- Status
        CASE 
            WHEN COALESCE((SELECT SUM(CASE WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                THEN t.estimated_hours * (DATEDIFF(DAY, CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                    CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                ELSE t.estimated_hours END)
                FROM pms.tasks t WHERE t.assignee_id = e.id AND t.is_active = 1 AND t.status NOT IN ('done', 'cancelled')
                AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL AND t.start_date <= @end_date AND t.due_date >= @start_date
            ), 0) * 100.0 / NULLIF(@working_days * @working_hours, 0) >= 100 THEN 'overload'
            WHEN COALESCE((SELECT SUM(CASE WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                THEN t.estimated_hours * (DATEDIFF(DAY, CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                    CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                ELSE t.estimated_hours END)
                FROM pms.tasks t WHERE t.assignee_id = e.id AND t.is_active = 1 AND t.status NOT IN ('done', 'cancelled')
                AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL AND t.start_date <= @end_date AND t.due_date >= @start_date
            ), 0) * 100.0 / NULLIF(@working_days * @working_hours, 0) >= 80 THEN 'warning'
            WHEN COALESCE((SELECT SUM(CASE WHEN DATEDIFF(DAY, t.start_date, t.due_date) + 1 > 0 
                THEN t.estimated_hours * (DATEDIFF(DAY, CASE WHEN t.start_date > @start_date THEN t.start_date ELSE @start_date END,
                    CASE WHEN t.due_date < @end_date THEN t.due_date ELSE @end_date END) + 1.0) / (DATEDIFF(DAY, t.start_date, t.due_date) + 1.0)
                ELSE t.estimated_hours END)
                FROM pms.tasks t WHERE t.assignee_id = e.id AND t.is_active = 1 AND t.status NOT IN ('done', 'cancelled')
                AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL AND t.start_date <= @end_date AND t.due_date >= @start_date
            ), 0) * 100.0 / NULLIF(@working_days * @working_hours, 0) >= 50 THEN 'moderate'
            ELSE 'available'
        END AS status,
        
        -- Task count
        (SELECT COUNT(*) FROM pms.tasks t WHERE t.assignee_id = e.id AND t.is_active = 1 
         AND t.status NOT IN ('done', 'cancelled') AND t.start_date <= @end_date AND t.due_date >= @start_date
        ) AS current_task_count

    FROM pms.employees e
    LEFT JOIN pms.positions p ON e.position_id = p.id
    WHERE e.is_active = 1
    ORDER BY avg_workload_percent ASC, employee_name;
END
GO

PRINT 'Created: pms.sp_get_team_workload'
GO
