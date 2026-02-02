-- ============================================
-- Import Legacy Timesheet from MoveonDB
-- ============================================
-- วิธีใช้:
-- 1. รันสร้างตาราง mapping และ view
-- 2. ตรวจสอบ mapping ว่าถูกต้อง
-- 3. รัน procedure import

-- ============================================
-- STEP 1: สร้างตาราง Project Code Mapping
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_code_mapping' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.project_code_mapping (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        legacy_code NVARCHAR(50) NOT NULL,           -- รหัสโครงการเก่า (MoveonDB)
        project_id UNIQUEIDENTIFIER NOT NULL,        -- FK to pms.projects
        import_story_id UNIQUEIDENTIFIER NULL,       -- Story สำหรับ import timesheet
        notes NVARCHAR(500) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_pcm_project FOREIGN KEY (project_id) REFERENCES pms.projects(id),
        CONSTRAINT UQ_legacy_code UNIQUE (legacy_code)
    );
    PRINT 'Created table: project_code_mapping'
END
GO

-- ============================================
-- STEP 2: สร้าง View สำหรับดึง mapping อัตโนมัติ
-- ============================================

-- View: ดึงรหัสเก่าจากชื่อโครงการ [xxxx]
-- NOTE: ใช้ milestone แรก (sort_order ASC) ตามที่ user กำหนด
IF OBJECT_ID('pms.vw_project_legacy_codes', 'V') IS NOT NULL DROP VIEW pms.vw_project_legacy_codes;
GO

CREATE VIEW pms.vw_project_legacy_codes AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.name_th AS project_name,
    -- ดึงรหัสเก่าจาก [xxxx] ในชื่อโครงการ
    CASE
        WHEN CHARINDEX('[', p.name_th) > 0 AND CHARINDEX(']', p.name_th) > CHARINDEX('[', p.name_th)
        THEN SUBSTRING(p.name_th, CHARINDEX('[', p.name_th) + 1, CHARINDEX(']', p.name_th) - CHARINDEX('[', p.name_th) - 1)
        ELSE NULL
    END AS legacy_code_from_name,
    -- รหัสโครงการปัจจุบันก็อาจเป็นรหัสเก่าได้
    p.project_code AS project_code_as_legacy
FROM pms.projects p
WHERE p.is_active = 1;
GO

PRINT 'Created view: vw_project_legacy_codes'
GO

-- ============================================
-- STEP 3: Populate Mapping Table
-- ============================================

-- Insert mapping จากรหัสใน [xxxx]
INSERT INTO pms.project_code_mapping (legacy_code, project_id, notes)
SELECT DISTINCT
    v.legacy_code_from_name,
    v.project_id,
    'Auto-extracted from project name [xxx]'
FROM pms.vw_project_legacy_codes v
WHERE v.legacy_code_from_name IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM pms.project_code_mapping m
      WHERE m.legacy_code = v.legacy_code_from_name
  );

PRINT 'Inserted mapping from project names'
GO

-- Insert mapping จาก project_code (รหัสใหม่ = รหัสเก่า สำหรับโครงการใหม่)
INSERT INTO pms.project_code_mapping (legacy_code, project_id, notes)
SELECT DISTINCT
    v.project_code,
    v.project_id,
    'Project code is the same as legacy code'
FROM pms.vw_project_legacy_codes v
WHERE NOT EXISTS (
    SELECT 1 FROM pms.project_code_mapping m
    WHERE m.legacy_code = v.project_code
);

PRINT 'Inserted mapping from project codes'
GO

-- ============================================
-- STEP 4: View แสดง Mapping พร้อม Milestone แรก
-- ============================================

IF OBJECT_ID('pms.vw_import_timesheet_targets', 'V') IS NOT NULL DROP VIEW pms.vw_import_timesheet_targets;
GO

CREATE VIEW pms.vw_import_timesheet_targets AS
SELECT
    pcm.legacy_code,
    p.id AS project_id,
    p.project_code,
    ISNULL(p.name_th, p.project_code) AS project_name,
    fm.milestone_id AS first_milestone_id,
    fm.milestone_name AS first_milestone_name,
    pcm.import_story_id
FROM pms.project_code_mapping pcm
INNER JOIN pms.projects p ON p.id = pcm.project_id
OUTER APPLY (
    SELECT TOP 1
        pm.id AS milestone_id,
        ISNULL(mc.name, ISNULL(mc.code, N'Milestone-' + CAST(pm.sort_order AS NVARCHAR))) AS milestone_name
    FROM pms.project_milestones pm
    LEFT JOIN pms.milestone_configs mc ON mc.id = pm.milestone_config_id
    WHERE pm.project_id = p.id
    ORDER BY pm.sort_order ASC, pm.created_at ASC
) fm;
GO

PRINT 'Created view: vw_import_timesheet_targets'
GO

-- ============================================
-- STEP 5: Stored Procedure สำหรับ Import
-- ============================================

IF OBJECT_ID('pms.sp_import_legacy_timesheet', 'P') IS NOT NULL DROP PROCEDURE pms.sp_import_legacy_timesheet;
GO

CREATE PROCEDURE pms.sp_import_legacy_timesheet
    @legacy_prj_code NVARCHAR(50),
    @emp_code NVARCHAR(20),
    @entry_date DATE,
    @hours DECIMAL(4,2),
    @ot_hours DECIMAL(4,2) = 0,
    @description NVARCHAR(500),
    @moveon_runno INT = NULL,  -- Reference to MoveonDB.pm.TimeSheet.Runno
    @dry_run BIT = 0           -- 1 = test only, no insert
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @project_id UNIQUEIDENTIFIER;
    DECLARE @milestone_id UNIQUEIDENTIFIER;
    DECLARE @story_id UNIQUEIDENTIFIER;
    DECLARE @task_id UNIQUEIDENTIFIER;
    DECLARE @employee_id UNIQUEIDENTIFIER;
    DECLARE @total_hours DECIMAL(4,2) = @hours + @ot_hours;
    DECLARE @story_title NVARCHAR(255) = N'Upload timesheet จากระบบเดิม';
    DECLARE @task_title NVARCHAR(255);
    DECLARE @story_code NVARCHAR(20);
    DECLARE @task_code NVARCHAR(20);

    -- 1. หา project_id จาก legacy_code
    SELECT @project_id = project_id, @story_id = import_story_id
    FROM pms.project_code_mapping
    WHERE legacy_code = @legacy_prj_code;

    IF @project_id IS NULL
    BEGIN
        RAISERROR(N'ไม่พบโครงการที่ตรงกับรหัสเก่า: %s', 16, 1, @legacy_prj_code);
        RETURN;
    END

    -- 2. หา employee_id จาก employee_code
    SELECT @employee_id = id FROM pms.employees WHERE employee_code = @emp_code AND is_active = 1;

    IF @employee_id IS NULL
    BEGIN
        RAISERROR(N'ไม่พบพนักงานรหัส: %s', 16, 1, @emp_code);
        RETURN;
    END

    -- 3. หา milestone แรก
    SELECT TOP 1 @milestone_id = id
    FROM pms.project_milestones
    WHERE project_id = @project_id
    ORDER BY sort_order ASC, created_at ASC;

    IF @milestone_id IS NULL
    BEGIN
        RAISERROR(N'โครงการนี้ไม่มี Milestone', 16, 1);
        RETURN;
    END

    -- 4. สร้าง/หา Story "Upload timesheet จากระบบเดิม"
    IF @story_id IS NULL
    BEGIN
        -- สร้าง story code
        DECLARE @max_story_num INT;
        SELECT @max_story_num = ISNULL(MAX(CAST(SUBSTRING(story_code, 3, 10) AS INT)), 0)
        FROM pms.stories
        WHERE story_code LIKE 'ST%';

        SET @story_code = 'ST' + RIGHT('000000' + CAST(@max_story_num + 1 AS VARCHAR), 6);

        IF @dry_run = 0
        BEGIN
            INSERT INTO pms.stories (id, story_code, project_id, milestone_id, title, description, status, priority)
            VALUES (
                NEWID(),
                @story_code,
                @project_id,
                @milestone_id,
                @story_title,
                N'Story สำหรับ import timesheet จากระบบ MoveonDB',
                'done',
                'low'
            );

            SET @story_id = (SELECT id FROM pms.stories WHERE story_code = @story_code);

            -- อัปเดต mapping
            UPDATE pms.project_code_mapping
            SET import_story_id = @story_id
            WHERE legacy_code = @legacy_prj_code;
        END
        ELSE
            PRINT 'DRY RUN: Would create story ' + @story_code;
    END

    -- 5. หา/สร้าง Task สำหรับพนักงานนี้
    SET @task_title = N'Timesheet Import - ' + @emp_code;

    SELECT @task_id = id FROM pms.tasks
    WHERE story_id = @story_id
      AND assignee_id = @employee_id
      AND title = @task_title;

    IF @task_id IS NULL
    BEGIN
        -- สร้าง task code
        DECLARE @max_task_num INT;
        SELECT @max_task_num = ISNULL(MAX(CAST(SUBSTRING(task_code, 3, 10) AS INT)), 0)
        FROM pms.tasks
        WHERE task_code LIKE 'TK%';

        SET @task_code = 'TK' + RIGHT('000000' + CAST(@max_task_num + 1 AS VARCHAR), 6);

        IF @dry_run = 0
        BEGIN
            INSERT INTO pms.tasks (id, task_code, story_id, title, description, assignee_id, status, task_type, priority)
            VALUES (
                NEWID(),
                @task_code,
                @story_id,
                @task_title,
                N'Task สำหรับ import timesheet จากระบบ MoveonDB',
                @employee_id,
                'done',
                'DEVELOPMENT',
                'low'
            );

            SET @task_id = (SELECT id FROM pms.tasks WHERE task_code = @task_code);
        END
        ELSE
            PRINT 'DRY RUN: Would create task ' + @task_code;
    END

    -- 6. Insert Timesheet Entry
    IF @dry_run = 0
    BEGIN
        -- ตรวจสอบว่ามี entry ซ้ำหรือไม่ (based on Runno if provided)
        IF @moveon_runno IS NOT NULL
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pms.timesheet_entries
                WHERE description LIKE '%MoveonDB:' + CAST(@moveon_runno AS VARCHAR) + '%'
            )
            BEGIN
                PRINT 'SKIP: Entry already exists for Runno ' + CAST(@moveon_runno AS VARCHAR);
                RETURN;
            END
        END

        INSERT INTO pms.timesheet_entries (
            id, employee_id, task_id, entry_date, hours, description,
            is_billable, status, is_active, is_overtime
        )
        VALUES (
            NEWID(),
            @employee_id,
            @task_id,
            @entry_date,
            @total_hours,
            LEFT(@description + ' [MoveonDB:' + ISNULL(CAST(@moveon_runno AS VARCHAR), 'N/A') + ']', 500),
            1,  -- is_billable
            'approved',
            1,  -- is_active
            CASE WHEN @ot_hours > 0 THEN 1 ELSE 0 END
        );

        -- อัปเดต actual_hours ของ task
        UPDATE pms.tasks
        SET actual_hours = (
            SELECT ISNULL(SUM(hours), 0)
            FROM pms.timesheet_entries
            WHERE task_id = @task_id AND is_active = 1
        )
        WHERE id = @task_id;

        PRINT 'SUCCESS: Imported ' + CAST(@total_hours AS VARCHAR) + 'h for ' + @emp_code + ' on ' + CAST(@entry_date AS VARCHAR);
    END
    ELSE
    BEGIN
        PRINT 'DRY RUN: Would insert ' + CAST(@total_hours AS VARCHAR) + 'h for ' + @emp_code + ' on ' + CAST(@entry_date AS VARCHAR);
    END
END
GO

PRINT 'Created procedure: sp_import_legacy_timesheet'
GO

-- ============================================
-- STEP 6: Batch Import Procedure
-- ============================================

IF OBJECT_ID('pms.sp_batch_import_legacy_timesheet', 'P') IS NOT NULL DROP PROCEDURE pms.sp_batch_import_legacy_timesheet;
GO

CREATE PROCEDURE pms.sp_batch_import_legacy_timesheet
    @year INT = 2026,
    @dry_run BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @imported INT = 0;
    DECLARE @skipped INT = 0;
    DECLARE @errors INT = 0;

    -- Cursor เพื่อ loop ผ่านข้อมูล MoveonDB
    DECLARE @runno INT, @prj_code NVARCHAR(50), @emp_code NVARCHAR(20);
    DECLARE @rec_date DATE, @man_hour DECIMAL(10,2), @ot_hour DECIMAL(10,2), @remark NVARCHAR(500);

    DECLARE ts_cursor CURSOR FOR
    SELECT
        t.Runno,
        CAST(t.PrjCode AS NVARCHAR(50)),
        t.EmpCode,
        t.RecDate,  -- RecDate เก็บเป็น ค.ศ. อยู่แล้ว
        t.ManHour,
        ISNULL(t.OtHour, 0),
        ISNULL(t.Remark, N'')
    FROM [MoveonDB].[pm].[TimeSheet] t
    WHERE YEAR(t.RecDate) = @year  -- ค.ศ. (2026, 2025, etc.)
    ORDER BY t.RecDate, t.EmpCode;

    OPEN ts_cursor;
    FETCH NEXT FROM ts_cursor INTO @runno, @prj_code, @emp_code, @rec_date, @man_hour, @ot_hour, @remark;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            EXEC pms.sp_import_legacy_timesheet
                @legacy_prj_code = @prj_code,
                @emp_code = @emp_code,
                @entry_date = @rec_date,
                @hours = @man_hour,
                @ot_hours = @ot_hour,
                @description = @remark,
                @moveon_runno = @runno,
                @dry_run = @dry_run;

            SET @imported = @imported + 1;
        END TRY
        BEGIN CATCH
            PRINT 'ERROR Runno ' + CAST(@runno AS VARCHAR) + ': ' + ERROR_MESSAGE();
            SET @errors = @errors + 1;
        END CATCH

        FETCH NEXT FROM ts_cursor INTO @runno, @prj_code, @emp_code, @rec_date, @man_hour, @ot_hour, @remark;
    END

    CLOSE ts_cursor;
    DEALLOCATE ts_cursor;

    PRINT '========================================';
    PRINT 'Import Summary:';
    PRINT '  Imported: ' + CAST(@imported AS VARCHAR);
    PRINT '  Errors: ' + CAST(@errors AS VARCHAR);
    PRINT '  Dry Run: ' + CASE WHEN @dry_run = 1 THEN 'YES' ELSE 'NO' END;
    PRINT '========================================';
END
GO

PRINT 'Created procedure: sp_batch_import_legacy_timesheet'
GO

-- ============================================
-- STEP 7: View ตรวจสอบ Mapping
-- ============================================

-- Query ตรวจสอบ mapping กับข้อมูล MoveonDB
/*
SELECT DISTINCT
    t.PrjCode,
    t.PrjName,
    m.project_id,
    p.project_code AS new_project_code,
    p.name AS new_project_name,
    CASE WHEN m.project_id IS NOT NULL THEN 'MAPPED' ELSE 'NOT MAPPED' END AS status
FROM [MoveonDB].[pm].[TimeSheet] t
LEFT JOIN pms.project_code_mapping m ON m.legacy_code = CAST(t.PrjCode AS NVARCHAR(50))
LEFT JOIN pms.projects p ON p.id = m.project_id
WHERE YEAR(t.RecDate) = 2569  -- พ.ศ. 2569 = ค.ศ. 2026
ORDER BY status DESC, t.PrjCode;
*/

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- 1. ตรวจสอบ mapping ที่มี
SELECT * FROM pms.vw_import_timesheet_targets;

-- 2. เพิ่ม mapping ด้วยตนเอง (กรณีไม่ match อัตโนมัติ)
INSERT INTO pms.project_code_mapping (legacy_code, project_id, notes)
VALUES ('1080', 'your-project-uuid-here', 'Manual mapping');

-- 3. ทดสอบ import แบบ dry-run (ไม่บันทึกจริง)
EXEC pms.sp_import_legacy_timesheet
    @legacy_prj_code = '1302',
    @emp_code = '240020',
    @entry_date = '2026-01-06',
    @hours = 5.00,
    @ot_hours = 0,
    @description = 'mock up ยังไม่เสร็จ AI หมดก่อน',
    @moveon_runno = 20798,
    @dry_run = 1;

-- 4. Import จริง (single entry)
EXEC pms.sp_import_legacy_timesheet
    @legacy_prj_code = '1302',
    @emp_code = '240020',
    @entry_date = '2026-01-06',
    @hours = 5.00,
    @ot_hours = 0,
    @description = 'mock up ยังไม่เสร็จ AI หมดก่อน',
    @moveon_runno = 20798,
    @dry_run = 0;

-- 5. Batch Import ทั้งปี (dry-run ก่อน)
EXEC pms.sp_batch_import_legacy_timesheet @year = 2026, @dry_run = 1;

-- 6. Batch Import ทั้งปี (จริง)
EXEC pms.sp_batch_import_legacy_timesheet @year = 2026, @dry_run = 0;
*/

PRINT '============================================'
PRINT 'Legacy Timesheet Import Script Completed!'
PRINT '============================================'
PRINT ''
PRINT 'Next Steps:'
PRINT '1. Run: SELECT * FROM pms.vw_import_timesheet_targets to check mapping'
PRINT '2. Add missing mappings manually if needed'
PRINT '3. Run dry-run first: EXEC pms.sp_batch_import_legacy_timesheet @year=2026, @dry_run=1'
PRINT '4. If OK, run actual import: EXEC pms.sp_batch_import_legacy_timesheet @year=2026, @dry_run=0'
GO
