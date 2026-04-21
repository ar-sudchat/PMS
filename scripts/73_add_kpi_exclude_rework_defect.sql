-- =============================================
-- Script 73: Add KPI Exclude Flags for Rework and Defect Ratio
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'kpi_exclude_rework'
)
BEGIN
    ALTER TABLE pms.projects ADD kpi_exclude_rework BIT NOT NULL DEFAULT 0;
    PRINT 'Added column kpi_exclude_rework to pms.projects'
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('pms.projects') AND name = 'kpi_exclude_defect'
)
BEGIN
    ALTER TABLE pms.projects ADD kpi_exclude_defect BIT NOT NULL DEFAULT 0;
    PRINT 'Added column kpi_exclude_defect to pms.projects'
END
GO
