-- ============================================
-- กระจาย due_date ตามวันที่ลง timesheet จริง
-- ไม่ให้รวมกันหมดในวันอังคาร
-- ============================================

-- 1. ก่อนแก้ไข
PRINT '=== ก่อนแก้ไข: tasks รวมกันในวันเดียว ==='
SELECT
    due_date,
    COUNT(*) AS [จำนวน tasks]
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY due_date
ORDER BY due_date;
GO

-- 2. แก้ due_date = วันที่ลง timesheet ล่าสุดของแต่ละ task
PRINT ''
PRINT '=== แก้ไข: กระจาย due_date ตามวันที่ทำงานจริง ==='
UPDATE t
SET t.due_date = sub.max_entry_date
FROM pms.tasks t
CROSS APPLY (
    SELECT MAX(te.entry_date) AS max_entry_date
    FROM pms.timesheet_entries te
    WHERE te.task_id = t.id
) sub
WHERE t.title LIKE 'Timesheet Import - %'
  AND sub.max_entry_date IS NOT NULL;

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tasks';
GO

-- 3. หลังแก้ไข
PRINT ''
PRINT '=== หลังแก้ไข: tasks กระจายตามวันจริง ==='
SELECT
    due_date,
    DATENAME(WEEKDAY, due_date) AS [วัน],
    COUNT(*) AS [จำนวน tasks]
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY due_date, DATENAME(WEEKDAY, due_date)
ORDER BY due_date;
GO

PRINT ''
PRINT '=== สำเร็จ! กลับไป refresh หน้า My Tasks ==='
