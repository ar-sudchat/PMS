-- ============================================
-- ตรวจสอบ Column Names ของ MoveonDB.pm.TimeSheet
-- ============================================

-- 1. ดู columns ทั้งหมด
SELECT
    COLUMN_NAME AS [ชื่อ Column],
    DATA_TYPE AS [ประเภท],
    CHARACTER_MAXIMUM_LENGTH AS [ความยาว],
    IS_NULLABLE AS [Null ได้]
FROM [MoveonDB].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'pm'
  AND TABLE_NAME = 'TimeSheet'
ORDER BY ORDINAL_POSITION;
GO

-- 2. ดูตัวอย่างข้อมูล 5 rows แรก
SELECT TOP 5 * FROM [MoveonDB].[pm].[TimeSheet];
GO
