-- ============================================
-- FIX MISSING APPROVERS FOR EXISTING APPROVAL INSTANCES
-- Run this script to add approvers to instances that have no approvers
-- ============================================

-- First, check instances without approvers
SELECT
    ai.id as instance_id,
    ai.document_id,
    ai.document_type,
    ai.document_title,
    ai.status,
    ai.current_step_order,
    ai.requester_id,
    CONCAT(e.first_name, ' ', e.last_name) as requester_name,
    (SELECT COUNT(*) FROM pms.approval_instance_approvers aia WHERE aia.instance_id = ai.id) as approver_count
FROM pms.approval_instances ai
LEFT JOIN pms.employees e ON ai.requester_id = e.id
WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
ORDER BY ai.request_date DESC

-- Check current step for each instance
SELECT
    ai.id as instance_id,
    ai.current_step_id,
    ai.current_step_order,
    ai.flow_template_id,
    afs.id as step_id,
    afs.step_name
FROM pms.approval_instances ai
LEFT JOIN pms.approval_flow_steps afs ON ai.current_step_id = afs.id
WHERE ai.status IN ('PENDING', 'IN_PROGRESS')

-- Find admin users who can be added as approvers
SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as name, e.role, e.email
FROM pms.employees e
WHERE e.role = 'admin' AND e.is_active = 1

-- Add approvers to instances that have none
-- Replace @adminId with actual admin user ID from query above
DECLARE @adminId UNIQUEIDENTIFIER = NULL

-- Get first admin (role is stored in employees table directly)
SELECT TOP 1 @adminId = e.id
FROM pms.employees e
WHERE e.role = 'admin' AND e.is_active = 1

IF @adminId IS NOT NULL
BEGIN
    PRINT 'Adding approvers using admin: ' + CAST(@adminId AS VARCHAR(100))

    -- Add approvers for instances that have none
    INSERT INTO pms.approval_instance_approvers (id, instance_id, step_id, step_order, approver_id, status)
    SELECT
        NEWID(),
        ai.id,
        ai.current_step_id,
        ai.current_step_order,
        @adminId,
        'PENDING'
    FROM pms.approval_instances ai
    WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
    AND NOT EXISTS (
        SELECT 1 FROM pms.approval_instance_approvers aia
        WHERE aia.instance_id = ai.id
    )

    PRINT 'Done! Added approvers for instances without any.'
END
ELSE
BEGIN
    PRINT 'No admin user found!'
END

-- Verify: Check all instances now have approvers
SELECT
    ai.id as instance_id,
    ai.document_title,
    ai.status,
    (SELECT COUNT(*) FROM pms.approval_instance_approvers aia WHERE aia.instance_id = ai.id) as approver_count,
    (SELECT STRING_AGG(CONCAT(e.first_name, ' ', e.last_name), ', ')
     FROM pms.approval_instance_approvers aia
     JOIN pms.employees e ON aia.approver_id = e.id
     WHERE aia.instance_id = ai.id) as approvers
FROM pms.approval_instances ai
WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
ORDER BY ai.request_date DESC
