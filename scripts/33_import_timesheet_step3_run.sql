-- ============================================
-- STEP 3: Import จริง
-- รันไฟล์นี้เมื่อ dry-run ผ่านแล้ว
-- ============================================

-- Import จริง
EXEC pms.sp_batch_import_legacy_timesheet @year = 2026, @dry_run = 0;
GO

-- แสดงผลลัพธ์
SELECT
    'Timesheet Entries' AS [Table],
    COUNT(*) AS [Count]
FROM pms.timesheet_entries
WHERE description LIKE '%MoveonDB%';
GO
