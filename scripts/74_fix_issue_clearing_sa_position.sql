-- =============================================
-- Fix: Remove SA from Issue Clearing affected_positions
-- Issue Clearing is for PG only, not SA
-- =============================================

IF OBJECT_ID('pms.vw_kpi_employee_summary', 'V') IS NOT NULL
    DROP VIEW pms.vw_kpi_employee_summary;
GO

CREATE VIEW pms.vw_kpi_employee_summary AS
-- Issue Clearing (PG only)
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'Issue Clearing' AS kpi_name,
    clearing_percent AS actual_value,
    85 AS target_value,
    is_pass,
    'PG' AS affected_positions
FROM pms.vw_kpi_issue_clearing

UNION ALL

-- Meeting Minutes (PM, SA)
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'On-time Meeting Minutes',
    CAST(late_count AS DECIMAL(5,2)),
    3,
    is_pass,
    'PM,SA'
FROM pms.vw_kpi_meeting_minutes

UNION ALL

-- Docs On-time (SA only)
SELECT
    year, month, quarter, employee_id, employee_code, employee_name, position,
    'Required Docs On-time',
    ontime_percent,
    95,
    is_pass,
    'SA'
FROM pms.vw_kpi_docs_ontime;
GO

PRINT 'Fixed: Issue Clearing affected_positions changed from PG,SA to PG only';
GO
