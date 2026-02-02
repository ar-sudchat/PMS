-- ============================================
-- รัน Import จริง (หลังจาก dry-run ผ่านแล้ว)
-- ============================================

PRINT '=== รัน Import จริง ==='
EXEC pms.sp_batch_import_legacy_timesheet_daily @year = 2026, @dry_run = 0;
GO

-- ตรวจสอบผลลัพธ์
PRINT ''
PRINT '=== ผลลัพธ์การ Import ==='
SELECT
    'Tasks Created' AS [รายการ],
    COUNT(*) AS [จำนวน]
FROM pms.tasks
WHERE title LIKE 'Import %'
UNION ALL
SELECT
    'Timesheet Entries',
    COUNT(*)
FROM pms.timesheet_entries
WHERE description LIKE '%MoveonDB%'
UNION ALL
SELECT
    'Total Hours',
    CAST(SUM(hours) AS INT)
FROM pms.timesheet_entries
WHERE description LIKE '%MoveonDB%';
GO
