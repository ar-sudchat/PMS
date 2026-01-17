-- ============================================
-- FIX KPI APPROVAL FLOW APPROVERS
-- Change from PROJECT_MANAGER to REQUESTER_MANAGER
-- ============================================

-- Update DEPLOY_SUCCESS approvers
UPDATE pms.approval_step_approvers
SET approver_value = 'REQUESTER_MANAGER'
WHERE step_id IN (
    SELECT afs.id
    FROM pms.approval_flow_steps afs
    JOIN pms.approval_flow_templates aft ON afs.flow_template_id = aft.id
    WHERE aft.flow_code = 'DEPLOY_SUCCESS'
)
AND approver_type = 'DYNAMIC'
AND approver_value = 'PROJECT_MANAGER'

PRINT 'Updated DEPLOY_SUCCESS approvers'
GO

-- Update DEPLOY_BACKUP approvers
UPDATE pms.approval_step_approvers
SET approver_value = 'REQUESTER_MANAGER'
WHERE step_id IN (
    SELECT afs.id
    FROM pms.approval_flow_steps afs
    JOIN pms.approval_flow_templates aft ON afs.flow_template_id = aft.id
    WHERE aft.flow_code = 'DEPLOY_BACKUP'
)
AND approver_type = 'DYNAMIC'
AND approver_value = 'PROJECT_MANAGER'

PRINT 'Updated DEPLOY_BACKUP approvers'
GO

-- Update MEETING_MINUTES approvers
UPDATE pms.approval_step_approvers
SET approver_value = 'REQUESTER_MANAGER'
WHERE step_id IN (
    SELECT afs.id
    FROM pms.approval_flow_steps afs
    JOIN pms.approval_flow_templates aft ON afs.flow_template_id = aft.id
    WHERE aft.flow_code = 'MEETING_MINUTES'
)
AND approver_type = 'DYNAMIC'
AND approver_value = 'PROJECT_MANAGER'

PRINT 'Updated MEETING_MINUTES approvers'
GO

-- Verify the changes
SELECT
    aft.flow_code,
    aft.flow_name,
    afs.step_name,
    asa.approver_type,
    asa.approver_value
FROM pms.approval_step_approvers asa
JOIN pms.approval_flow_steps afs ON asa.step_id = afs.id
JOIN pms.approval_flow_templates aft ON afs.flow_template_id = aft.id
WHERE aft.module_code = 'KPI'
ORDER BY aft.flow_code, afs.step_order

PRINT 'Done! KPI Flow approvers updated to use REQUESTER_MANAGER'
