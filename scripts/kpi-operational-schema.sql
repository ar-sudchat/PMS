-- Weekly records for Deploy + Backup (บันทึกรวมกันต่อสัปดาห์)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.kpi_weekly_records') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.kpi_weekly_records (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        year INT NOT NULL,
        week_number INT NOT NULL, -- 1-52
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        
        -- Deploy tracking
        total_deploys INT NOT NULL DEFAULT 0,
        total_rollbacks INT NOT NULL DEFAULT 0,
        deploy_success_rate AS (
            CASE 
                WHEN total_deploys > 0 
                THEN CAST((total_deploys - total_rollbacks) AS DECIMAL(5,2)) / total_deploys * 100
                ELSE 100.0 
            END
        ) PERSISTED,
        rollback_notes NVARCHAR(MAX) NULL,
        
        -- Backup tracking
        backup_completed BIT NOT NULL DEFAULT 0,
        backup_date DATE NULL,
        backup_versions INT NULL DEFAULT 5,
        backup_location NVARCHAR(500) NULL,
        
        -- Metadata
        recorded_by UNIQUEIDENTIFIER NULL,
        recorded_at DATETIME2 DEFAULT GETDATE(),
        notes NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Constraints
        CONSTRAINT UQ_kpi_weekly_year_week UNIQUE (year, week_number),
        CONSTRAINT FK_kpi_weekly_recorded_by FOREIGN KEY (recorded_by) REFERENCES pms.employees(id),
        CONSTRAINT CK_kpi_weekly_week CHECK (week_number >= 1 AND week_number <= 53),
        CONSTRAINT CK_kpi_weekly_deploys CHECK (total_rollbacks <= total_deploys)
    );

    -- Index
    CREATE INDEX IX_kpi_weekly_year ON pms.kpi_weekly_records(year);
    CREATE INDEX IX_kpi_weekly_dates ON pms.kpi_weekly_records(week_start_date, week_end_date);
END
GO

-- Records for late meeting minutes (บันทึกเฉพาะที่ช้า)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.kpi_late_meeting_minutes') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.kpi_late_meeting_minutes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        project_id UNIQUEIDENTIFIER NULL,
        
        -- Meeting info
        meeting_date DATE NOT NULL,
        meeting_end_time TIME NOT NULL,
        meeting_type NVARCHAR(50) NOT NULL DEFAULT 'project', -- project, internal, customer
        
        -- Submission info
        submitted_date DATE NOT NULL,
        submitted_time TIME NOT NULL,
        
        -- Calculated: hours late (auto-calculated)
        hours_late AS (
            DATEDIFF(HOUR, 
                CAST(meeting_date AS DATETIME) + CAST(meeting_end_time AS DATETIME),
                CAST(submitted_date AS DATETIME) + CAST(submitted_time AS DATETIME)
            ) - 24
        ), -- Calculated column (removed PERSISTED if not deterministic enough, but DATEDIFF is usually ok. Let's keep virtual for simplicity or persisted if deterministic. DATEDIFF is deterministic. )
        -- Actually DATEDIFF with DATE + TIME cast might vary with settings? No, usually fine.
        -- BUT keeping it simple virtual column (no PERSISTED keyword) is safer for compatibility often unless index needed.
        
        -- Reason
        late_reason NVARCHAR(500) NULL,
        
        -- Metadata
        recorded_by UNIQUEIDENTIFIER NULL,
        year INT NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Constraints
        CONSTRAINT FK_late_mom_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT FK_late_mom_recorded_by FOREIGN KEY (recorded_by) REFERENCES pms.employees(id)
    );

    -- Index
    CREATE INDEX IX_late_mom_year ON pms.kpi_late_meeting_minutes(year);
    CREATE INDEX IX_late_mom_project ON pms.kpi_late_meeting_minutes(project_id);
END
GO

-- KPI Summary View
CREATE OR ALTER VIEW pms.vw_kpi_operational_summary AS
WITH DeploySummary AS (
    SELECT 
        year,
        COUNT(*) AS total_weeks_recorded,
        SUM(total_deploys) AS total_deploys,
        SUM(total_rollbacks) AS total_rollbacks,
        CASE 
            WHEN SUM(total_deploys) > 0 
            THEN ROUND(CAST(SUM(total_deploys) - SUM(total_rollbacks) AS DECIMAL(10,2)) / SUM(total_deploys) * 100, 2)
            ELSE 100.0 
        END AS deploy_success_rate,
        SUM(CASE WHEN backup_completed = 1 THEN 1 ELSE 0 END) AS weeks_backup_done,
        CASE 
            WHEN COUNT(*) > 0 THEN
            ROUND(CAST(SUM(CASE WHEN backup_completed = 1 THEN 1 ELSE 0 END) AS DECIMAL(10,2)) / COUNT(*) * 100, 2)
            ELSE 0 
        END AS backup_rate
    FROM pms.kpi_weekly_records
    WHERE is_active = 1
    GROUP BY year
),
MeetingSummary AS (
    SELECT 
        year,
        COUNT(*) AS late_count
    FROM pms.kpi_late_meeting_minutes
    WHERE is_active = 1
    GROUP BY year
)
SELECT 
    ISNULL(d.year, m.year) AS year,
    -- Deploy Success Rate
    ISNULL(d.total_deploys, 0) AS total_deploys,
    ISNULL(d.total_rollbacks, 0) AS total_rollbacks,
    ISNULL(d.deploy_success_rate, 100.0) AS deploy_success_rate,
    95.0 AS deploy_target,
    CASE WHEN ISNULL(d.deploy_success_rate, 100.0) >= 95.0 THEN 'PASS' ELSE 'FAIL' END AS deploy_status,
    -- Backup Rate
    ISNULL(d.total_weeks_recorded, 0) AS total_weeks,
    ISNULL(d.weeks_backup_done, 0) AS weeks_backup_done,
    ISNULL(d.backup_rate, 0) AS backup_rate,
    100.0 AS backup_target,
    CASE WHEN ISNULL(d.backup_rate, 0) >= 100.0 THEN 'PASS' ELSE 'FAIL' END AS backup_status,
    -- Late Meeting Minutes
    ISNULL(m.late_count, 0) AS late_meeting_count,
    3 AS late_meeting_target,
    CASE WHEN ISNULL(m.late_count, 0) <= 3 THEN 'PASS' ELSE 'FAIL' END AS late_meeting_status
FROM DeploySummary d
FULL OUTER JOIN MeetingSummary m ON d.year = m.year;
GO

-- Weekly Records View (with week list)
CREATE OR ALTER VIEW pms.vw_kpi_weekly_list AS
WITH Weeks AS (
    SELECT 
        YEAR(GETDATE()) AS year,
        n AS week_number,
        DATEADD(WEEK, n - 1, DATEFROMPARTS(YEAR(GETDATE()), 1, 1)) AS week_start,
        DATEADD(DAY, 6, DATEADD(WEEK, n - 1, DATEFROMPARTS(YEAR(GETDATE()), 1, 1))) AS week_end
    FROM (
        SELECT TOP 53 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n 
        FROM sys.objects
    ) nums
    WHERE DATEADD(WEEK, n - 1, DATEFROMPARTS(YEAR(GETDATE()), 1, 1)) <= DATEADD(YEAR, 1, DATEFROMPARTS(YEAR(GETDATE()), 1, 1))
)
-- Using the Prompt's view logic directly as it seems pre-validated by user intent
SELECT 
    w.year,
    w.week_number,
    w.week_start,
    w.week_end,
    r.id AS record_id,
    ISNULL(r.total_deploys, 0) AS total_deploys,
    ISNULL(r.total_rollbacks, 0) AS total_rollbacks,
    r.deploy_success_rate,
    ISNULL(r.backup_completed, 0) AS backup_completed,
    r.backup_date,
    r.notes,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS is_recorded
FROM Weeks w
LEFT JOIN pms.kpi_weekly_records r 
    ON w.year = r.year AND w.week_number = r.week_number AND r.is_active = 1
GO
