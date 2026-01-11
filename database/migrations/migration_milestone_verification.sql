-- Migration: Add Verification Fields to Project Milestones
-- Run this in SQL Server Management Studio or Azure Data Studio

-- Step 1: Add is_verified column
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'pms' 
    AND TABLE_NAME = 'project_milestones' 
    AND COLUMN_NAME = 'is_verified'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD is_verified BIT NOT NULL DEFAULT 0;
END

-- Step 2: Add verified_at column
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'pms' 
    AND TABLE_NAME = 'project_milestones' 
    AND COLUMN_NAME = 'verified_at'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD verified_at DATETIME2 NULL;
END

-- Step 3: Add verified_by column
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'pms' 
    AND TABLE_NAME = 'project_milestones' 
    AND COLUMN_NAME = 'verified_by'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD verified_by UNIQUEIDENTIFIER NULL;
END

-- Step 4: Add support_end_date column
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'pms' 
    AND TABLE_NAME = 'project_milestones' 
    AND COLUMN_NAME = 'support_end_date'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD support_end_date DATE NULL;
END

-- Step 5: Sync lock status
UPDATE pms.project_milestones SET is_locked = 1 WHERE is_verified = 1 AND is_locked = 0;

-- Verify columns were added
SELECT 
    COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'pms' 
AND TABLE_NAME = 'project_milestones' 
AND COLUMN_NAME IN ('is_verified', 'verified_at', 'verified_by', 'support_end_date');
