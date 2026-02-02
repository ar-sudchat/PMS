-- ============================================
-- แก้ไข due_date ของ task import ให้อยู่ในสัปดาห์ W2
-- เพื่อให้แสดงทั้งหมดใน My Tasks
-- ============================================

-- 1. ตรวจสอบก่อน UPDATE
PRINT '=== ก่อน UPDATE: due_date กระจายตามสัปดาห์ ==='
SELECT
    CASE
        WHEN due_date BETWEEN '2026-01-05' AND '2026-01-11' THEN 'W2: 5-11 ม.ค.'
        WHEN due_date BETWEEN '2025-12-29' AND '2026-01-04' THEN 'W1: 29 ธ.ค.-4 ม.ค.'
        WHEN due_date BETWEEN '2026-01-12' AND '2026-01-18' THEN 'W3: 12-18 ม.ค.'
        ELSE FORMAT(due_date, 'yyyy-MM-dd')
    END AS [สัปดาห์],
    COUNT(*) AS [จำนวน tasks]
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY CASE
    WHEN due_date BETWEEN '2026-01-05' AND '2026-01-11' THEN 'W2: 5-11 ม.ค.'
    WHEN due_date BETWEEN '2025-12-29' AND '2026-01-04' THEN 'W1: 29 ธ.ค.-4 ม.ค.'
    WHEN due_date BETWEEN '2026-01-12' AND '2026-01-18' THEN 'W3: 12-18 ม.ค.'
    ELSE FORMAT(due_date, 'yyyy-MM-dd')
END
ORDER BY [สัปดาห์];
GO

-- 2. UPDATE due_date ให้เป็น 6 ม.ค. 2026 (อยู่ใน W2 ทั้งหมด)
PRINT ''
PRINT '=== UPDATE due_date เป็น 6 ม.ค. 2026 ==='
UPDATE pms.tasks
SET due_date = '2026-01-06'
WHERE title LIKE 'Timesheet Import - %';

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR) + ' tasks';
GO

-- 3. ตรวจสอบหลัง UPDATE
PRINT ''
PRINT '=== หลัง UPDATE: ทุก task อยู่ใน W2 ==='
SELECT
    COUNT(*) AS [จำนวน tasks ทั้งหมด],
    due_date
FROM pms.tasks
WHERE title LIKE 'Timesheet Import - %'
GROUP BY due_date;
GO

PRINT ''
PRINT '=== สำเร็จ! กลับไป refresh หน้า My Tasks W2 ==='
