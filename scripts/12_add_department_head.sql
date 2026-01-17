-- ============================================
-- ADD HEAD_ID TO DEPARTMENTS TABLE
-- For Approval System: REQUESTER_MANAGER
-- ============================================

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'pms'
    AND TABLE_NAME = 'departments'
    AND COLUMN_NAME = 'head_id'
)
BEGIN
    ALTER TABLE pms.departments
    ADD head_id UNIQUEIDENTIFIER NULL

    PRINT 'Added head_id column to departments table'
END
ELSE
BEGIN
    PRINT 'head_id column already exists'
END
GO

-- Add foreign key constraint
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_departments_head_id'
)
BEGIN
    ALTER TABLE pms.departments
    ADD CONSTRAINT FK_departments_head_id
    FOREIGN KEY (head_id) REFERENCES pms.employees(id)

    PRINT 'Added foreign key constraint'
END
GO

-- Show current departments
SELECT id, name, code, head_id
FROM pms.departments
ORDER BY name

PRINT 'Done! Now you need to set head_id for each department.'
PRINT 'Example: UPDATE pms.departments SET head_id = (employee_id) WHERE department_code = ''DEV'''
