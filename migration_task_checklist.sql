IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'task_checklist_items' AND schema_id = SCHEMA_ID('pms'))
BEGIN
    CREATE TABLE pms.task_checklist_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(255) NOT NULL,
        is_completed BIT DEFAULT 0,
        completed_at DATETIME,
        completed_by UNIQUEIDENTIFIER,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Checklist_Task FOREIGN KEY (task_id) REFERENCES pms.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_Checklist_CompletedBy FOREIGN KEY (completed_by) REFERENCES pms.employees(id)
    );
    
    CREATE INDEX IX_Checklist_Task ON pms.task_checklist_items(task_id);
    
    PRINT 'Table pms.task_checklist_items created successfully.';
END
ELSE
BEGIN
    PRINT 'Table pms.task_checklist_items already exists.';
END
