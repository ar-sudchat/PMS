-- =============================================
-- Script 71: Add KPI Docs Manual Fail Flag
-- Description: Allow marking milestones as manually failed for Docs On-time KPI
--              Used when docs submission timing can't be tracked in real-time
-- =============================================

-- Add column to project_milestones
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.project_milestones')
    AND name = 'kpi_docs_manual_fail'
)
BEGIN
    ALTER TABLE pms.project_milestones ADD kpi_docs_manual_fail BIT NULL DEFAULT 0;
    PRINT 'Added column kpi_docs_manual_fail to pms.project_milestones'
END
GO
