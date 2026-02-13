-- Enable Milestones for MKT Projects
-- MKT projects previously had milestones disabled. This script enables them.

PRINT '=== Enabling Milestones for MKT Projects ==='

IF EXISTS (SELECT 1 FROM pms.project_types WHERE code = 'MKT')
BEGIN
    UPDATE pms.project_types
    SET has_milestones = 1
    WHERE code = 'MKT';
    PRINT 'Updated MKT project type: has_milestones = 1';
END
ELSE
BEGIN
    PRINT 'Warning: Project Type MKT not found. Inserting default MKT type...';
    INSERT INTO pms.project_types (id, code, name, name_th, description, color, has_milestones, has_deliverables, sort_order, is_active, created_at)
    VALUES (NEWID(), 'MKT', 'Marketing', 'การตลาด', 'Marketing Projects', '#F59E0B', 1, 1, 99, 1, GETDATE());
    PRINT 'Inserted MKT project type';
END

GO

PRINT '=== Completed ==='
