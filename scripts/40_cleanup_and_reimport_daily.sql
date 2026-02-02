-- ============================================
-- STEP 1: ลบข้อมูล Import เดิม (ลำดับถูกต้อง)
-- ============================================

PRINT '=== STEP 1: ลบข้อมูล Import เดิม ==='

-- 1.1 ลบ timesheet entries ที่ link กับ tasks ที่จะลบ
DELETE te
FROM pms.timesheet_entries te
INNER JOIN pms.tasks t ON t.id = te.task_id
WHERE t.title LIKE 'Timesheet Import - %' OR t.title LIKE 'Import %';
PRINT 'Deleted timesheet_entries: ' + CAST(@@ROWCOUNT AS VARCHAR);

-- 1.2 ลบ tasks ที่สร้างจาก import
DELETE FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %' OR title LIKE 'Import %';
PRINT 'Deleted tasks: ' + CAST(@@ROWCOUNT AS VARCHAR);

-- 1.3 ลบ stories ที่สร้างจาก import (เฉพาะที่ไม่มี tasks แล้ว)
DELETE s
FROM pms.stories s
WHERE s.title = N'Upload timesheet จากระบบเดิม'
  AND NOT EXISTS (SELECT 1 FROM pms.tasks t WHERE t.story_id = s.id);
PRINT 'Deleted stories: ' + CAST(@@ROWCOUNT AS VARCHAR);

PRINT ''
PRINT '=== ลบข้อมูลเดิมเสร็จสิ้น ==='
GO

-- ============================================
-- STEP 2: สร้าง Stored Procedure ใหม่ (1 task ต่อวัน)
-- ============================================

PRINT ''
PRINT '=== STEP 2: สร้าง Stored Procedure ใหม่ ==='

-- Drop existing procedure
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.sp_batch_import_legacy_timesheet_daily') AND type = 'P')
    DROP PROCEDURE pms.sp_batch_import_legacy_timesheet_daily;
GO

CREATE PROCEDURE pms.sp_batch_import_legacy_timesheet_daily
    @year INT = 2026,
    @dry_run BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    -- Counter variables
    DECLARE @total_records INT = 0;
    DECLARE @imported INT = 0;
    DECLARE @skipped INT = 0;
    DECLARE @errors INT = 0;

    -- Cursor variables
    DECLARE @runno INT, @prj_code NVARCHAR(50), @emp_code NVARCHAR(20);
    DECLARE @rec_date DATE, @man_hour DECIMAL(10,2), @ot_hour DECIMAL(10,2), @remark NVARCHAR(500);

    -- Working variables (DECLARE ONCE outside loop)
    DECLARE @project_id UNIQUEIDENTIFIER;
    DECLARE @milestone_id UNIQUEIDENTIFIER;
    DECLARE @employee_id UNIQUEIDENTIFIER;
    DECLARE @story_id UNIQUEIDENTIFIER;
    DECLARE @task_id UNIQUEIDENTIFIER;
    DECLARE @story_code NVARCHAR(20);
    DECLARE @task_code NVARCHAR(20);
    DECLARE @task_title NVARCHAR(200);
    DECLARE @total_hours DECIMAL(10,2);
    DECLARE @entry_desc NVARCHAR(500);

    PRINT 'Starting Daily Import from MoveonDB for year ' + CAST(@year AS VARCHAR);
    PRINT 'Dry run mode: ' + CASE WHEN @dry_run = 1 THEN 'YES' ELSE 'NO - ACTUAL IMPORT' END;
    PRINT '';

    -- Cursor for each timesheet entry (1 record = 1 task)
    DECLARE ts_cursor CURSOR LOCAL FOR
    SELECT
        t.Runno,
        CAST(t.PrjCode AS NVARCHAR(50)),
        t.EmpCode,
        t.RecDate,
        t.ManHour,
        ISNULL(t.OtHour, 0),
        ISNULL(t.Remark, N'')
    FROM [MoveonDB].[pm].[TimeSheet] t
    WHERE YEAR(t.RecDate) = @year
    ORDER BY t.RecDate, t.EmpCode;

    OPEN ts_cursor;
    FETCH NEXT FROM ts_cursor INTO @runno, @prj_code, @emp_code, @rec_date, @man_hour, @ot_hour, @remark;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @total_records = @total_records + 1;

        BEGIN TRY
            -- Reset variables each iteration
            SET @project_id = NULL;
            SET @milestone_id = NULL;
            SET @employee_id = NULL;
            SET @story_id = NULL;
            SET @task_id = NULL;

            -- Get project from mapping
            SELECT @project_id = m.project_id
            FROM pms.project_code_mapping m
            WHERE m.legacy_code = @prj_code;

            -- Get employee
            SELECT @employee_id = e.id
            FROM pms.employees e
            WHERE e.employee_code = @emp_code;

            IF @project_id IS NULL OR @employee_id IS NULL
            BEGIN
                SET @skipped = @skipped + 1;
                IF @total_records <= 10
                    PRINT 'SKIP: Runno=' + CAST(@runno AS VARCHAR) + ' - Missing mapping or employee';
            END
            ELSE
            BEGIN
                -- Get first milestone
                SELECT TOP 1 @milestone_id = id
                FROM pms.project_milestones
                WHERE project_id = @project_id
                ORDER BY sort_order, due_date;

                IF @milestone_id IS NULL
                BEGIN
                    SET @skipped = @skipped + 1;
                    IF @total_records <= 10
                        PRINT 'SKIP: Runno=' + CAST(@runno AS VARCHAR) + ' - No milestone in project';
                END
                ELSE IF @dry_run = 0
                BEGIN
                    -- === ACTUAL IMPORT ===

                    -- 1. Get or create story
                    SELECT @story_id = id
                    FROM pms.stories
                    WHERE milestone_id = @milestone_id
                      AND title = N'Upload timesheet จากระบบเดิม';

                    IF @story_id IS NULL
                    BEGIN
                        SELECT @story_code = 'ST' + RIGHT('000000' + CAST(ISNULL(MAX(CAST(SUBSTRING(story_code, 3, 6) AS INT)), 0) + 1 AS VARCHAR), 6)
                        FROM pms.stories;

                        INSERT INTO pms.stories (id, story_code, project_id, milestone_id, title, description, status, priority)
                        VALUES (
                            NEWID(),
                            @story_code,
                            @project_id,
                            @milestone_id,
                            N'Upload timesheet จากระบบเดิม',
                            N'Story สำหรับ import timesheet จากระบบ MoveonDB',
                            'done',
                            'low'
                        );
                        SELECT @story_id = id FROM pms.stories WHERE story_code = @story_code;
                    END

                    -- 2. Create task for this day (1 task per entry)
                    SET @total_hours = @man_hour + @ot_hour;

                    SELECT @task_code = 'TK' + RIGHT('000000' + CAST(ISNULL(MAX(CAST(SUBSTRING(task_code, 3, 6) AS INT)), 0) + 1 AS VARCHAR), 6)
                    FROM pms.tasks;

                    -- Task title = วันที่ + รหัสพนักงาน
                    SET @task_title = N'Import ' + FORMAT(@rec_date, 'dd/MM') + ' - ' + @emp_code;

                    INSERT INTO pms.tasks (id, task_code, story_id, title, description, assignee_id, status, task_type, priority, estimated_hours, actual_hours, due_date)
                    VALUES (
                        NEWID(),
                        @task_code,
                        @story_id,
                        @task_title,
                        LEFT(@remark, 500),
                        @employee_id,
                        'done',
                        'DEVELOPMENT',
                        'low',
                        @total_hours,
                        @total_hours,
                        @rec_date
                    );

                    SELECT @task_id = id FROM pms.tasks WHERE task_code = @task_code;

                    -- 3. Create timesheet entry
                    SET @entry_desc = LEFT(@remark, 450) + N' [MoveonDB:' + CAST(@runno AS NVARCHAR) + N']';

                    INSERT INTO pms.timesheet_entries (id, employee_id, task_id, entry_date, hours, description, created_at)
                    VALUES (
                        NEWID(),
                        @employee_id,
                        @task_id,
                        @rec_date,
                        @total_hours,
                        @entry_desc,
                        GETDATE()
                    );

                    SET @imported = @imported + 1;
                END
                ELSE
                BEGIN
                    -- DRY RUN
                    SET @imported = @imported + 1;
                    IF @total_records <= 5
                        PRINT 'DRY RUN: Would import Runno=' + CAST(@runno AS VARCHAR) +
                              ' Date=' + FORMAT(@rec_date, 'yyyy-MM-dd') +
                              ' Emp=' + @emp_code +
                              ' Hours=' + CAST(@man_hour + @ot_hour AS VARCHAR);
                END
            END
        END TRY
        BEGIN CATCH
            SET @errors = @errors + 1;
            PRINT 'ERROR: Runno=' + CAST(@runno AS VARCHAR) + ' - ' + ERROR_MESSAGE();
        END CATCH

        FETCH NEXT FROM ts_cursor INTO @runno, @prj_code, @emp_code, @rec_date, @man_hour, @ot_hour, @remark;
    END

    CLOSE ts_cursor;
    DEALLOCATE ts_cursor;

    PRINT '';
    PRINT '=== Summary ===';
    PRINT 'Total records: ' + CAST(@total_records AS VARCHAR);
    PRINT 'Imported: ' + CAST(@imported AS VARCHAR);
    PRINT 'Skipped: ' + CAST(@skipped AS VARCHAR);
    PRINT 'Errors: ' + CAST(@errors AS VARCHAR);
END
GO

PRINT 'Stored procedure created successfully';
GO

-- ============================================
-- STEP 3: Dry-run ทดสอบ
-- ============================================
PRINT ''
PRINT '=== STEP 3: Dry-run ทดสอบ ==='
EXEC pms.sp_batch_import_legacy_timesheet_daily @year = 2026, @dry_run = 1;
GO
