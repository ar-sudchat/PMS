import sql from 'mssql'

/**
 * Resolve the milestone a new Story / tracking-entry (and therefore its man-day)
 * should be attributed to.
 *
 * Man-day reporting attributes timesheet hours through
 *   timesheet_entries → tasks → stories.milestone_id → project_milestones,
 * and every per-milestone breakdown / KPI INNER JOINs on that milestone. A row
 * with milestone_id = NULL is counted in project-level totals but silently dropped
 * from milestone breakdowns, so the numbers stop reconciling.
 *
 * Policy (per product decision): a Story / man-day entry must always carry a
 * milestone. When the caller doesn't specify one, fall back to the project's
 * CURRENT milestone, and if that isn't set, the first milestone by sort order.
 * Returns null only when the project has no milestones at all.
 *
 * @param pool        an open mssql connection pool (reuse the caller's)
 * @param projectId   the project the story/entry belongs to
 * @param providedId  the milestone the caller asked for (may be undefined/null/'')
 */
export async function resolveProjectMilestoneId(
    pool: sql.ConnectionPool,
    projectId: string,
    providedId?: string | null,
): Promise<string | null> {
    if (providedId) return providedId
    if (!projectId) return null
    const r = await pool.request()
        .input('pid', sql.UniqueIdentifier, projectId)
        .query(`
            SELECT COALESCE(
                p.current_milestone_id,
                (SELECT TOP 1 pm.id
                   FROM pms.project_milestones pm
                  WHERE pm.project_id = p.id
                  ORDER BY pm.sort_order ASC, pm.due_date ASC)
            ) AS milestone_id
            FROM pms.projects p
            WHERE p.id = @pid
        `)
    return r.recordset[0]?.milestone_id ?? null
}
