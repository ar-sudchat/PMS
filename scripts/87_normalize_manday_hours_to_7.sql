-- ============================================================
-- 87_normalize_manday_hours_to_7.sql
--
-- Company standard: 1 man-day = 7 working hours.
--
-- All runtime server actions were updated to divide timesheet hours by 7
-- (manday-monitor, project-status-overview, project-planning, project-detail,
--  tracking-dashboard, resource-planning, story). This migration brings the one
-- remaining live DB view in line: vw_dashboard_my_timesheet_today still measured
-- "today's completion %" against an 8-hour target.
--
-- The post-go-live rework / man-day-control KPI views already use /7.0 in their
-- latest definitions:
--   * pms.vw_kpi_manday_control        -> scripts/52_fix_kpi_manday_control_view_use_timesheet.sql
--   * pms.vw_post_golive_rework         -> scripts/52_* and scripts/post-golive-rework-view.sql
--   * pms.vw_kpi_post_golive_rework     -> scripts/exclude-cancelled-kpi-views.sql
-- If your DB still shows /8 for any of them, re-run the script listed next to it.
-- (Run the verification query at the bottom to check.)
-- ============================================================

CREATE OR ALTER VIEW pms.vw_dashboard_my_timesheet_today AS
SELECT
    te.employee_id,
    SUM(te.hours) AS total_hours_today,
    COUNT(*) AS entry_count,
    7 AS target_hours,
    CAST(ROUND((SUM(te.hours) / 7.0) * 100, 0) AS INT) AS completion_percent
FROM pms.timesheet_entries te
WHERE te.is_active = 1
  AND te.entry_date = CAST(GETDATE() AS DATE)
GROUP BY te.employee_id;
GO

-- ------------------------------------------------------------
-- Verification — should return ZERO rows once everything is on /7.
-- Lists any view/proc whose body still divides by 8 (manual review).
-- ------------------------------------------------------------
-- SELECT o.name AS object_name, o.type_desc
-- FROM sys.sql_modules m
-- JOIN sys.objects o ON o.object_id = m.object_id
-- WHERE (m.definition LIKE '%/ 8.0%' OR m.definition LIKE '%/8.0%'
--        OR m.definition LIKE '%hours) / 8%')
--   AND o.name LIKE 'vw_%'
-- ORDER BY o.name;
