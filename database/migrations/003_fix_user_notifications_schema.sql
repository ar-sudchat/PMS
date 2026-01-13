IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[pms].[user_notifications]') AND type in (N'U'))
BEGIN
    DROP TABLE pms.user_notifications;
END
GO

CREATE TABLE pms.user_notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_id VARCHAR(50) NOT NULL,
    is_read BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    read_at DATETIME NULL
);
GO
