-- ============================================
-- FIX APPROVERS - Change to Artit (240012)
-- ============================================

-- Get Artit's employee ID
DECLARE @artitId UNIQUEIDENTIFIER

SELECT @artitId = id FROM pms.employees WHERE employee_code = '240012'

PRINT 'Artit ID: ' + CAST(@artitId AS VARCHAR(100))

-- Update all pending approvers to Artit
UPDATE pms.approval_instance_approvers
SET approver_id = @artitId
WHERE status = 'PENDING'

PRINT 'Updated approvers to Artit'

-- Verify
SELECT
    aia.id,
    aia.instance_id,
    aia.approver_id,
    aia.status,
    CONCAT(e.first_name, ' ', e.last_name) as approver_name,
    e.employee_code
FROM pms.approval_instance_approvers aia
JOIN pms.employees e ON aia.approver_id = e.id
WHERE aia.status = 'PENDING'
