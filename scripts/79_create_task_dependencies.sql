-- Create task_dependencies table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.task_dependencies') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.task_dependencies (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        predecessor_task_id UNIQUEIDENTIFIER NOT NULL,
        successor_task_id UNIQUEIDENTIFIER NOT NULL,
        dependency_type VARCHAR(10) DEFAULT 'FS', -- FS = Finish-to-Start, SS = Start-to-Start, FF = Finish-to-Finish, SF = Start-to-Finish
        lag_days INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER,
        FOREIGN KEY (predecessor_task_id) REFERENCES pms.tasks(id),
        FOREIGN KEY (successor_task_id) REFERENCES pms.tasks(id),
        CONSTRAINT UQ_predecessor_successor UNIQUE (predecessor_task_id, successor_task_id),
        CONSTRAINT CHK_no_self_dependency CHECK (predecessor_task_id <> successor_task_id)
    );

    PRINT 'Table pms.task_dependencies created successfully.';
END
ELSE
BEGIN
    PRINT 'Table pms.task_dependencies already exists.';
END
