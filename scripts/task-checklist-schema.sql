-- =============================================
-- Task Checklist Schema
-- =============================================
-- สร้างตาราง task_checklist_items สำหรับเก็บ checklist ของแต่ละ task
-- =============================================

-- 1. สร้างตาราง task_checklist_items
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_checklist_items')
BEGIN
    CREATE TABLE pms.task_checklist_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(500) NOT NULL,
        is_completed BIT NOT NULL DEFAULT 0,
        completed_at DATETIME2 NULL,
        completed_by UNIQUEIDENTIFIER NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        CONSTRAINT FK_task_checklist_task FOREIGN KEY (task_id)
            REFERENCES pms.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_task_checklist_completed_by FOREIGN KEY (completed_by)
            REFERENCES pms.employees(id)
    );

    CREATE INDEX IX_task_checklist_task ON pms.task_checklist_items(task_id);
    PRINT 'Table pms.task_checklist_items created successfully.'
END
ELSE
BEGIN
    PRINT 'Table pms.task_checklist_items already exists.'
END
GO

-- =============================================
-- Summary
-- =============================================
PRINT '============================================';
PRINT 'Task Checklist Schema Completed!';
PRINT '============================================';
PRINT 'Table created: pms.task_checklist_items';
PRINT '';
PRINT 'Columns:';
PRINT '  - id: Primary key';
PRINT '  - task_id: FK to pms.tasks';
PRINT '  - title: Checklist item text';
PRINT '  - is_completed: Completion status';
PRINT '  - completed_at: When marked complete';
PRINT '  - completed_by: Who marked complete';
PRINT '  - sort_order: Display order';
PRINT '  - created_at, updated_at: Timestamps';
