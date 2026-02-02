-- ============================================
-- วินิจฉัยปัญหา: ทำไม Dry-run ได้ 0 records
-- (แก้ไข column names: PrjCode, ManHour, Remark)
-- ============================================

-- 1. ตรวจสอบการเชื่อมต่อ MoveonDB
PRINT '=== 1. ตรวจสอบการเชื่อมต่อ MoveonDB ==='
SELECT COUNT(*) AS [Total records in MoveonDB] FROM [MoveonDB].[pm].[TimeSheet];
GO

-- 2. ตรวจสอบข้อมูล TimeSheet แยกตามปี (พ.ศ.)
PRINT ''
PRINT '=== 2. ข้อมูล TimeSheet แยกตามปี (พ.ศ.) ==='
SELECT
    YEAR(RecDate) AS [ปี พ.ศ.],
    COUNT(*) AS [จำนวน records]
FROM [MoveonDB].[pm].[TimeSheet]
GROUP BY YEAR(RecDate)
ORDER BY YEAR(RecDate) DESC;
GO

-- 3. ตรวจสอบว่า PrjCode ใน MoveonDB match กับ mapping
PRINT ''
PRINT '=== 3. PrjCode ที่มีใน MoveonDB vs Mapping (ปี 2026) ==='
SELECT
    t.PrjCode AS [รหัสโครงการใน MoveonDB],
    COUNT(*) AS [จำนวน records],
    CASE WHEN m.legacy_code IS NOT NULL THEN 'MAPPED' ELSE 'NOT MAPPED' END AS [สถานะ]
FROM [MoveonDB].[pm].[TimeSheet] t
LEFT JOIN pms.project_code_mapping m ON m.legacy_code = CAST(t.PrjCode AS NVARCHAR(50))
WHERE YEAR(t.RecDate) = 2026  -- ค.ศ. (RecDate เก็บเป็น ค.ศ. อยู่แล้ว)
GROUP BY t.PrjCode, CASE WHEN m.legacy_code IS NOT NULL THEN 'MAPPED' ELSE 'NOT MAPPED' END
ORDER BY [สถานะ], t.PrjCode;
GO

-- 4. ตรวจสอบว่า EmpCode ใน MoveonDB match กับ employee
PRINT ''
PRINT '=== 4. EmpCode ที่มีใน MoveonDB vs Employees (ปี 2026) ==='
SELECT
    t.EmpCode AS [รหัสพนักงานใน MoveonDB],
    e.employee_code AS [รหัสพนักงานใน PMS],
    CASE WHEN e.id IS NOT NULL THEN 'FOUND' ELSE 'NOT FOUND' END AS [สถานะ]
FROM (
    SELECT DISTINCT EmpCode
    FROM [MoveonDB].[pm].[TimeSheet]
    WHERE YEAR(RecDate) = 2026
) t
LEFT JOIN pms.employees e ON e.employee_code = t.EmpCode
ORDER BY [สถานะ], t.EmpCode;
GO

-- 5. ตรวจสอบ records ที่ควรจะ import ได้ (มี mapping และ employee ครบ)
PRINT ''
PRINT '=== 5. Records ที่พร้อม import (ปี 2026) ==='
SELECT COUNT(*) AS [จำนวน records ที่พร้อม import]
FROM [MoveonDB].[pm].[TimeSheet] t
INNER JOIN pms.project_code_mapping m ON m.legacy_code = CAST(t.PrjCode AS NVARCHAR(50))
INNER JOIN pms.employees e ON e.employee_code = t.EmpCode
WHERE YEAR(t.RecDate) = 2026;
GO

-- 6. ดูตัวอย่าง 10 records แรก
PRINT ''
PRINT '=== 6. ตัวอย่าง 10 records ที่พร้อม import ==='
SELECT TOP 10
    t.Runno,
    t.PrjCode,
    t.EmpCode,
    t.RecDate,
    t.ManHour,
    t.Remark,
    m.legacy_code AS [Mapped Legacy],
    e.employee_code AS [Employee Code in PMS]
FROM [MoveonDB].[pm].[TimeSheet] t
INNER JOIN pms.project_code_mapping m ON m.legacy_code = CAST(t.PrjCode AS NVARCHAR(50))
INNER JOIN pms.employees e ON e.employee_code = t.EmpCode
WHERE YEAR(t.RecDate) = 2026
ORDER BY t.RecDate;
GO

-- 7. ตรวจสอบ mapping ปัจจุบัน (แสดงเฉพาะ 20 rows แรก)
PRINT ''
PRINT '=== 7. Mapping ที่มีอยู่ในระบบ (20 rows แรก) ==='
SELECT TOP 20
    legacy_code AS [รหัสเก่า],
    p.project_code AS [รหัสใหม่],
    notes
FROM pms.project_code_mapping m
INNER JOIN pms.projects p ON p.id = m.project_id
ORDER BY legacy_code;
GO

PRINT ''
PRINT '=== สรุปการวินิจฉัย ==='
PRINT 'ถ้า Section 3 มี NOT MAPPED = PrjCode ใน MoveonDB ไม่ตรงกับ legacy_code ใน mapping'
PRINT 'ถ้า Section 4 มี NOT FOUND = EmpCode ใน MoveonDB ไม่มีในตาราง employees'
PRINT 'ถ้า Section 5 = 0 = ไม่มี records ที่ครบทั้ง mapping และ employee'
