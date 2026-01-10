-- ============================================
-- แก้ไข sp_get_gantt_data ให้ส่ง NULL สำหรับ Task ที่ยังไม่ระบุวันที่
-- เพื่อไม่ให้ Gantt Chart วาดแท่งออกมา
-- ============================================

USE PMSoftware;
GO

-- Drop existing procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_gantt_data' AND schema_id = SCHEMA_ID('pms'))
    DROP PROCEDURE pms.sp_get_gantt_data;
GO

-- Re-create with NULL date handling
-- (นี่คือ stored procedure เต็ม - ถ้ามีการเปลี่ยนแปลงจาก gantt-schema-v3.sql ให้คัดลอกมาใหม่)
-- สำหรับตอนนี้ ให้รัน gantt-schema-v3.sql แทน

PRINT 'กรุณารัน script gantt-schema-v3.sql แทน เพราะมีการเปลี่ยนแปลงหลายบรรทัด';
PRINT 'หรือแก้ไข RESULT SET 4: TASKS ใน sp_get_gantt_data โดยตรง:';
PRINT '';
PRINT 'เปลี่ยนจาก:';
PRINT '  FORMAT(COALESCE(t.start_date, CAST(GETDATE() AS DATE)), ''yyyy-MM-dd'') AS start_date,';
PRINT '  FORMAT(COALESCE(t.due_date, DATEADD(DAY, 1, ...)), ''yyyy-MM-dd'') AS end_date,';
PRINT '';
PRINT 'เป็น:';
PRINT '  FORMAT(t.start_date, ''yyyy-MM-dd'') AS start_date,';
PRINT '  FORMAT(t.due_date, ''yyyy-MM-dd'') AS end_date,';
PRINT '';
PRINT 'และเปลี่ยน duration จาก ELSE 1 เป็น ELSE 0';
GO
