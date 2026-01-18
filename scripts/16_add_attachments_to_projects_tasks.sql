-- ============================================
-- ADD ATTACHMENTS COLUMN TO PROJECTS AND TASKS
-- สำหรับเก็บไฟล์แนบใน Project และ Task
-- ============================================

-- Add attachments column to projects
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.projects') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.projects ADD attachments NVARCHAR(MAX) NULL
    PRINT 'Added attachments column to projects'
END

-- Add attachments column to tasks
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pms.tasks') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.tasks ADD attachments NVARCHAR(MAX) NULL
    PRINT 'Added attachments column to tasks'
END

PRINT 'Done - attachments columns added to projects and tasks!'

-- Note: attachments column stores JSON array of file objects:
-- [
--   {
--     "id": "uuid",
--     "name": "filename.pdf",
--     "path": "projects/123456_abc.pdf",
--     "size": 12345,
--     "mimeType": "application/pdf"
--   }
-- ]
