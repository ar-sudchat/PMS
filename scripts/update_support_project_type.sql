-- =============================================
-- Script: Enable Milestones for Support Project Type
-- Date: 2026-02-03
-- Description:
--   When a project changes from DEV to SUP (Support),
--   milestones should still be visible and accessible.
-- =============================================

-- Enable milestones and deliverables for SUPPORT project type
UPDATE pms.project_types
SET has_milestones = 1,
    has_deliverables = 1
WHERE code IN ('SUPPORT', 'SUP')

-- Verify the update
SELECT code, name, has_milestones, has_deliverables
FROM pms.project_types
ORDER BY sort_order

PRINT 'Support project type now shows Milestones and Deliverables tabs'
GO
