-- ============================================
-- แก้ไข due_date ที่เป็น พ.ศ. 2569 ให้เป็น ค.ศ. 2026
-- ============================================

-- 1. ตรวจสอบ due_date ปัจจุบัน
PRINT '=== ก่อนแก้ไข ==='
SELECT
    due_date,
    YEAR(due_date) AS [ปี],
    COUNT(*) AS [จำนวน tasks]
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY due_date;
GO

-- 2. แก้ไข: ลบ 543 ปี (แปลง พ.ศ. เป็น ค.ศ.)
PRINT ''
PRINT '=== แก้ไข: ลบ 543 ปี ==='
UPDATE pms.tasks
SET due_date = DATEADD(YEAR, -543, due_date)
WHERE title LIKE 'Timesheet Import - %'
  AND YEAR(due_date) > 2500;  -- เฉพาะที่เป็น พ.ศ.

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tasks';
GO

-- 3. ตรวจสอบหลังแก้ไข
PRINT ''
PRINT '=== หลังแก้ไข ==='
SELECT
    due_date,
    YEAR(due_date) AS [ปี],
    COUNT(*) AS [จำนวน tasks]
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY due_date;
GO

PRINT ''
PRINT '=== สำเร็จ! กลับไป refresh My Tasks W2 ==='
