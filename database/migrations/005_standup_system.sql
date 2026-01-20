-- Create Standup Groups Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.standup_groups') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_groups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(255),
        created_at DATETIME DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER
    );
END

-- Create Standup Group Members Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.standup_group_members') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_group_members (
        id INT IDENTITY(1,1) PRIMARY KEY,
        group_id INT NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        joined_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_StandupMembers_Group FOREIGN KEY (group_id) REFERENCES pms.standup_groups(id),
        CONSTRAINT FK_StandupMembers_User FOREIGN KEY (user_id) REFERENCES pms.employees(id),
        CONSTRAINT UQ_StandupMembers_UserGroup UNIQUE (group_id, user_id)
    );
END

-- Create Daily Standups Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.daily_standups') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.daily_standups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id UNIQUEIDENTIFIER NOT NULL,
        group_id INT NOT NULL,
        date DATE NOT NULL,
        morning_note NVARCHAR(MAX),
        evening_note NVARCHAR(MAX),
        mood NVARCHAR(50), -- Optional: 'Happy', 'Neutral', 'Stressed'
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_DailyStandups_User FOREIGN KEY (user_id) REFERENCES pms.employees(id),
        CONSTRAINT FK_DailyStandups_Group FOREIGN KEY (group_id) REFERENCES pms.standup_groups(id),
        CONSTRAINT UQ_DailyStandups_UserDate UNIQUE (user_id, date)
    );
END

-- Create Standup Tasks Table (Linking PMS Tasks to Standup)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pms.standup_tasks') AND type in (N'U'))
BEGIN
    CREATE TABLE pms.standup_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        standup_id INT NOT NULL,
        task_id UNIQUEIDENTIFIER NULL, -- Can be NULL if it's an ad-hoc task not in PMS yet
        custom_task_name NVARCHAR(255), -- Used if task_id is NULL
        is_planned BIT DEFAULT 1, -- 1 = Planned in morning, 0 = Added during day
        status NVARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'BLOCKED', 'DEFERRED'
        remark NVARCHAR(MAX), -- For evening explanation
        CONSTRAINT FK_StandupTasks_Standup FOREIGN KEY (standup_id) REFERENCES pms.daily_standups(id),
        CONSTRAINT FK_StandupTasks_Task FOREIGN KEY (task_id) REFERENCES pms.tasks(id)
    );
END
