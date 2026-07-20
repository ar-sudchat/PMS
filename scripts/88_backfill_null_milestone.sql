-- ============================================================
-- 88_backfill_null_milestone.sql
--
-- DATA REPAIR for man-day mis-attribution.
--
-- Root cause: man-day is attributed through
--   timesheet_entries -> tasks -> stories.milestone_id -> project_milestones,
-- and every per-milestone breakdown / the manday-control KPI INNER JOINs on that
-- milestone. Rows with milestone_id = NULL (e.g. the auto "General" story that
-- backs the gantt-overview "+ Task" / bulk-convert flow) are still counted in the
-- PROJECT total (grouped by project_id) but SILENTLY DROPPED from every milestone
-- breakdown -> the numbers stop reconciling and the KPI under-counts.
--
-- Policy: attribute NULL rows to the project's CURRENT milestone
-- (fallback: first milestone by sort_order). Task-linked tracking entries inherit
-- their task's story milestone. Pairs with the write-time enforcement in
-- lib/actions/milestone-resolve.ts so this can't regress.
--
-- Idempotent: only touches milestone_id IS NULL rows, so re-running is a no-op.
-- ============================================================

SET NOCOUNT ON;

-- ------------------------------------------------------------
-- (Optional) BEFORE diagnostic — projects whose milestone-attributed man-day
-- does NOT reconcile with the project total because of NULL-milestone stories.
-- Uncomment to inspect before applying.
-- ------------------------------------------------------------
-- SELECT p.project_code,
--        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS project_total_md,
--        CAST(ROUND(SUM(CASE WHEN s.milestone_id IS NULL THEN te.hours ELSE 0 END) / 7.0, 2) AS DECIMAL(10,2)) AS unattributed_md
-- FROM pms.timesheet_entries te
-- JOIN pms.tasks t   ON t.id = te.task_id AND t.is_active = 1
-- JOIN pms.stories s ON s.id = t.story_id AND s.is_active = 1
-- JOIN pms.projects p ON p.id = s.project_id
-- WHERE te.is_active = 1
-- GROUP BY p.project_code
-- HAVING SUM(CASE WHEN s.milestone_id IS NULL THEN te.hours ELSE 0 END) > 0
-- ORDER BY unattributed_md DESC;

-- Effective milestone per project = current milestone, else first by sort_order.
IF OBJECT_ID('tempdb..#proj_ms') IS NOT NULL DROP TABLE #proj_ms;
SELECT
    p.id AS project_id,
    COALESCE(
        p.current_milestone_id,
        (SELECT TOP 1 pm.id
           FROM pms.project_milestones pm
          WHERE pm.project_id = p.id
          ORDER BY pm.sort_order ASC, pm.due_date ASC)
    ) AS effective_milestone_id
INTO #proj_ms
FROM pms.projects p;

-- 1) Stories -------------------------------------------------
UPDATE s
SET s.milestone_id = pm.effective_milestone_id,
    s.updated_at   = GETDATE()
FROM pms.stories s
JOIN #proj_ms pm ON pm.project_id = s.project_id
WHERE s.milestone_id IS NULL
  AND s.is_active = 1
  AND pm.effective_milestone_id IS NOT NULL;
PRINT CONCAT('Stories backfilled: ', @@ROWCOUNT);

-- 2) Task-linked tracking entries -> inherit the (now backfilled) story milestone
UPDATE te
SET te.milestone_id = s.milestone_id,
    te.updated_at   = GETDATE()
FROM pms.team_tracking_entries te
JOIN pms.tasks   t ON t.id = te.task_id
JOIN pms.stories s ON s.id = t.story_id
WHERE te.milestone_id IS NULL
  AND te.is_active = 1
  AND s.milestone_id IS NOT NULL;
PRINT CONCAT('Task-linked tracking entries backfilled: ', @@ROWCOUNT);

-- 3) Remaining tracking entries (no task) -> project effective milestone
UPDATE te
SET te.milestone_id = pm.effective_milestone_id,
    te.updated_at   = GETDATE()
FROM pms.team_tracking_entries te
JOIN #proj_ms pm ON pm.project_id = te.project_id
WHERE te.milestone_id IS NULL
  AND te.is_active = 1
  AND pm.effective_milestone_id IS NOT NULL;
PRINT CONCAT('Other tracking entries backfilled: ', @@ROWCOUNT);

DROP TABLE #proj_ms;

-- ------------------------------------------------------------
-- AFTER verification — should be 0 (rows that still can't be attributed only
-- when the project has no milestones at all).
-- ------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM pms.stories WHERE milestone_id IS NULL AND is_active = 1)               AS stories_still_null,
    (SELECT COUNT(*) FROM pms.team_tracking_entries WHERE milestone_id IS NULL AND is_active = 1) AS tracking_still_null;
