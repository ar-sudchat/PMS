IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[pms].[standup_groups]') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_groups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[pms].[standup_group_members]') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_group_members (
        id INT IDENTITY(1,1) PRIMARY KEY,
        group_id INT NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        joined_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (group_id) REFERENCES pms.standup_groups(id),
        FOREIGN KEY (user_id) REFERENCES pms.employees(id)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[pms].[daily_standups]') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.daily_standups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id UNIQUEIDENTIFIER NOT NULL,
        group_id INT NOT NULL,
        date DATE NOT NULL,
        morning_note NVARCHAR(MAX),
        evening_note NVARCHAR(MAX),
        mood NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (group_id) REFERENCES pms.standup_groups(id),
        FOREIGN KEY (user_id) REFERENCES pms.employees(id)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[pms].[standup_tasks]') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        standup_id INT NOT NULL,
        task_id UNIQUEIDENTIFIER NULL,
        custom_task_name NVARCHAR(255),
        is_planned BIT DEFAULT 1,
        status NVARCHAR(50) DEFAULT 'PENDING',
        remark NVARCHAR(MAX),
        FOREIGN KEY (standup_id) REFERENCES pms.daily_standups(id)
    );
END
GO
