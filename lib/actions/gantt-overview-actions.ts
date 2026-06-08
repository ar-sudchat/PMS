'use server'

import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import sql from 'mssql'

// ============================================================
// Tracking history (per-project assignment log)
// ============================================================

export interface ProjectTrackingEntry {
    id: string
    entry_date: string                            // yyyy-MM-dd (planned date)
    completed_date: string | null
    postponed_date: string | null
    status: 'PLANNED' | 'DONE' | 'POSTPONED' | string | null
    icon: string | null
    color: string | null
    note: string | null
    milestone_id: string | null
    milestone_name: string | null
    milestone_color: string | null
    assignee_id: string | null
    assignee_name: string | null
    assignee_code: string | null
    creator_name: string | null
    created_at: string                            // ISO
}

export async function getProjectTrackingHistory(projectId: string): Promise<{
    success: true; data: ProjectTrackingEntry[]
} | { success: false; error: string }> {
    try {
        const pool = await getConnection()
        const r = await pool.request()
            .input('pid', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    t.id,
                    t.entry_date,
                    t.completed_date,
                    t.postponed_date,
                    t.status,
                    t.icon,
                    t.color,
                    t.note,
                    t.milestone_id,
                    mc.name AS milestone_name,
                    mc.color AS milestone_color,
                    t.assignee_id,
                    LTRIM(RTRIM(ISNULL(e.first_name_th, '') + ' ' + ISNULL(e.last_name_th, ''))) AS assignee_name,
                    e.employee_code AS assignee_code,
                    LTRIM(RTRIM(ISNULL(cb.first_name_th, '') + ' ' + ISNULL(cb.last_name_th, ''))) AS creator_name,
                    t.created_at
                FROM pms.team_tracking_entries t
                LEFT JOIN pms.project_milestones pm ON pm.id = t.milestone_id
                LEFT JOIN pms.milestone_configs mc ON mc.id = pm.milestone_config_id
                LEFT JOIN pms.employees e  ON e.id  = t.assignee_id
                LEFT JOIN pms.employees cb ON cb.id = t.created_by
                WHERE t.project_id = @pid
                  AND t.is_active = 1
                ORDER BY t.entry_date DESC, t.created_at DESC
            `)
        return {
            success: true,
            data: r.recordset.map((row: any) => ({
                id: row.id,
                entry_date: toISODate(row.entry_date) || '',
                completed_date: toISODate(row.completed_date),
                postponed_date: toISODate(row.postponed_date),
                status: row.status,
                icon: row.icon,
                color: row.color,
                note: row.note,
                milestone_id: row.milestone_id,
                milestone_name: row.milestone_name,
                milestone_color: row.milestone_color,
                assignee_id: row.assignee_id,
                assignee_name: row.assignee_name?.trim() || null,
                assignee_code: row.assignee_code,
                creator_name: row.creator_name?.trim() || null,
                created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
            })),
        }
    } catch (e: any) {
        console.error('[gantt-overview] getProjectTrackingHistory error:', e)
        return { success: false, error: e?.message || 'failed to load tracking history' }
    }
}

// ============================================================
// Types
// ============================================================

export interface GanttProjectRow {
    id: string
    project_code: string
    name: string
    name_th: string | null
    customer_name: string | null
    project_manager_name: string | null
    project_type_name: string | null
    project_type_color: string | null
    status_code: string | null
    status_name: string | null
    status_color: string | null
    start_date: string | null   // YYYY-MM-DD (derived from earliest milestone due, or project.created_at)
    end_date: string | null     // YYYY-MM-DD (latest milestone due, or project.end_date)
    progress: number            // 0-100, average of milestone progress
    milestone_count: number
    current_milestone_id: string | null
    current_milestone_name: string | null
    current_milestone_color: string | null
    /** sort_order from milestone_configs — drives logical (lifecycle) sort,
     *  not the alphabetical sort that comparing names would give. */
    current_milestone_sort_order: number | null
    /** Key milestone dates / progress — UAT, Go-Live, Close Go-Live.
     *  Joined from project_milestones via milestone_configs.code matching.
     *  *_milestone_id is needed for inline progress edits. */
    uat_milestone_id: string | null
    uat_due_date: string | null
    uat_progress: number | null
    golive_milestone_id: string | null
    golive_due_date: string | null
    golive_progress: number | null
    close_milestone_id: string | null
    close_due_date: string | null
    close_progress: number | null
}

export interface GanttMilestoneNode {
    id: string
    milestone_code: string | null
    milestone_name: string
    color: string | null
    sort_order: number
    due_date: string | null
    status: string | null
    progress: number
    story_count: number
    /** Actual fields used by the planned-vs-actual table (migration 83) */
    actual_start_date: string | null
    actual_duration_days: number | null
    /** Planned start override (migration 84). Null = derive from prev milestone's due_date. */
    planned_start_date: string | null
}

export interface GanttStoryNode {
    id: string
    milestone_id: string | null
    story_code: string | null
    title: string
    status: string | null
    priority: string | null
    start_date: string | null
    end_date: string | null
    progress: number
    task_count: number
}

export interface GanttTaskNode {
    id: string
    story_id: string | null
    milestone_id: string | null
    task_code: string | null
    title: string
    status: string | null
    priority: string | null
    start_date: string | null
    end_date: string | null
    duration_days: number | null
    progress: number
    assignee_name: string | null
    is_overdue: boolean
}

export interface GanttProjectDetail {
    project: GanttProjectRow
    milestones: GanttMilestoneNode[]
    stories: GanttStoryNode[]
    tasks: GanttTaskNode[]
}

// Filters supported by the list view
export interface GanttListFilters {
    search?: string                // free text on name / code / customer
    statusIds?: string[]           // pms.project_status_configs.id
    typeIds?: string[]             // pms.project_types.id
    projectManagerIds?: string[]   // pms.employees.id
    milestoneConfigIds?: string[]  // pms.milestone_configs.id — filter projects by their CURRENT milestone
}

// ============================================================
// List view: projects with date range + aggregate progress
// Pass empty range strings to return all active projects (auto-fit caller decides window).
// ============================================================

export async function getProjectsForGantt(
    rangeStart: string,
    rangeEnd: string,
    filters: GanttListFilters = {},
): Promise<{
    success: true; data: GanttProjectRow[]; meta: { earliest: string | null; latest: string | null }
} | { success: false; error: string }> {
    try {
        const pool = await getConnection()

        // Build dynamic WHERE clauses for filters
        const where: string[] = ['p.is_active = 1']
        const reqBuilder = pool.request()

        // Optional range overlap (only apply if both bounds given)
        if (rangeStart && rangeEnd) {
            reqBuilder.input('rangeStart', sql.Date, rangeStart)
            reqBuilder.input('rangeEnd', sql.Date, rangeEnd)
            where.push(`(ma.earliest_ms_due <= @rangeEnd AND ISNULL(ma.latest_ms_due, p.end_date) >= @rangeStart)`)
        }

        // Free-text search
        if (filters.search && filters.search.trim()) {
            reqBuilder.input('search', sql.NVarChar, `%${filters.search.trim()}%`)
            where.push(`(p.name LIKE @search OR p.name_th LIKE @search OR p.project_code LIKE @search OR c.name LIKE @search)`)
        }

        // Status filter
        if (filters.statusIds && filters.statusIds.length > 0) {
            const placeholders = filters.statusIds.map((id, i) => {
                reqBuilder.input(`status${i}`, sql.UniqueIdentifier, id)
                return `@status${i}`
            }).join(',')
            where.push(`p.status_id IN (${placeholders})`)
        }

        // Type filter
        if (filters.typeIds && filters.typeIds.length > 0) {
            const placeholders = filters.typeIds.map((id, i) => {
                reqBuilder.input(`type${i}`, sql.UniqueIdentifier, id)
                return `@type${i}`
            }).join(',')
            where.push(`p.project_type_id IN (${placeholders})`)
        }

        // Project manager filter
        if (filters.projectManagerIds && filters.projectManagerIds.length > 0) {
            const placeholders = filters.projectManagerIds.map((id, i) => {
                reqBuilder.input(`pm${i}`, sql.UniqueIdentifier, id)
                return `@pm${i}`
            }).join(',')
            where.push(`p.project_manager_id IN (${placeholders})`)
        }

        // Milestone filter (multi) — matches the project's CURRENT milestone
        if (filters.milestoneConfigIds && filters.milestoneConfigIds.length > 0) {
            const placeholders = filters.milestoneConfigIds.map((id, i) => {
                reqBuilder.input(`mcg${i}`, sql.UniqueIdentifier, id)
                return `@mcg${i}`
            }).join(',')
            where.push(`cpm.milestone_config_id IN (${placeholders})`)
        }

        // Single aggregate scan of project_milestones (vs 4 correlated subqueries per row).
        const r = await reqBuilder.query(`
            WITH ms_agg AS (
                SELECT
                    project_id,
                    MIN(due_date) AS earliest_ms_due,
                    MAX(due_date) AS latest_ms_due,
                    AVG(CAST(ISNULL(progress_percent, 0) AS FLOAT)) AS avg_progress,
                    COUNT(*) AS milestone_count
                FROM pms.project_milestones
                GROUP BY project_id
            )
            SELECT
                p.id,
                p.project_code,
                p.name,
                p.name_th,
                c.name AS customer_name,
                pm.first_name_th + ' ' + ISNULL(pm.last_name_th, '') AS project_manager_name,
                pt.name AS project_type_name,
                pt.color AS project_type_color,
                sc.code AS status_code,
                sc.name AS status_name,
                sc.color AS status_color,
                cpm.id  AS current_milestone_id,
                cm.name AS current_milestone_name,
                cm.color AS current_milestone_color,
                cm.sort_order AS current_milestone_sort_order,
                pm_uat.id          AS uat_milestone_id,
                pm_uat.due_date    AS uat_due_date,
                pm_uat.progress_percent AS uat_progress,
                pm_gl.id           AS golive_milestone_id,
                pm_gl.due_date     AS golive_due_date,
                pm_gl.progress_percent  AS golive_progress,
                pm_cl.id           AS close_milestone_id,
                pm_cl.due_date     AS close_due_date,
                pm_cl.progress_percent  AS close_progress,
                ma.earliest_ms_due,
                ma.latest_ms_due,
                ma.avg_progress,
                ma.milestone_count,
                p.end_date AS project_end_date,
                p.created_at AS project_created_at
            FROM pms.projects p
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
            LEFT JOIN pms.project_types pt ON pt.id = p.project_type_id
            LEFT JOIN pms.project_status_configs sc ON sc.id = p.status_id
            LEFT JOIN pms.project_milestones cpm ON cpm.id = p.current_milestone_id
            LEFT JOIN pms.milestone_configs cm ON cm.id = cpm.milestone_config_id
            -- Per-project key milestones (UAT / Go-Live / Close Go-Live).
            -- Joined via milestone_configs.code so it works regardless of which milestone_id
            -- a project picked. NULL when the project doesn't have that milestone.
            LEFT JOIN pms.milestone_configs   mc_uat ON mc_uat.code = 'UAT'
            LEFT JOIN pms.project_milestones  pm_uat ON pm_uat.project_id = p.id AND pm_uat.milestone_config_id = mc_uat.id
            LEFT JOIN pms.milestone_configs   mc_gl  ON mc_gl.code  = 'GOLIVE'
            LEFT JOIN pms.project_milestones  pm_gl  ON pm_gl.project_id  = p.id AND pm_gl.milestone_config_id  = mc_gl.id
            LEFT JOIN pms.milestone_configs   mc_cl  ON mc_cl.code  = 'CLOSEGOLIVE'
            LEFT JOIN pms.project_milestones  pm_cl  ON pm_cl.project_id  = p.id AND pm_cl.milestone_config_id  = mc_cl.id
            LEFT JOIN ms_agg ma ON ma.project_id = p.id
            WHERE ${where.join(' AND ')}
            ORDER BY ma.earliest_ms_due ASC, p.project_code ASC
        `)

        const data: GanttProjectRow[] = r.recordset.map((row: any) => {
            const start = row.earliest_ms_due
                ? toISODate(row.earliest_ms_due)
                : toISODate(row.project_created_at)
            const end = row.latest_ms_due
                ? toISODate(row.latest_ms_due)
                : toISODate(row.project_end_date)
            return {
                id: row.id,
                project_code: row.project_code,
                name: row.name,
                name_th: row.name_th,
                customer_name: row.customer_name,
                project_manager_name: row.project_manager_name?.trim() || null,
                project_type_name: row.project_type_name,
                project_type_color: row.project_type_color,
                status_code: row.status_code,
                status_name: row.status_name,
                status_color: row.status_color,
                start_date: start,
                end_date: end,
                progress: Math.round(row.avg_progress || 0),
                milestone_count: row.milestone_count || 0,
                current_milestone_id: row.current_milestone_id,
                current_milestone_name: row.current_milestone_name,
                current_milestone_color: row.current_milestone_color,
                current_milestone_sort_order: row.current_milestone_sort_order ?? null,
                uat_milestone_id:    row.uat_milestone_id || null,
                uat_due_date:        toISODate(row.uat_due_date),
                uat_progress:        row.uat_progress == null ? null : Math.round(Number(row.uat_progress)),
                golive_milestone_id: row.golive_milestone_id || null,
                golive_due_date:     toISODate(row.golive_due_date),
                golive_progress:     row.golive_progress == null ? null : Math.round(Number(row.golive_progress)),
                close_milestone_id:  row.close_milestone_id || null,
                close_due_date:      toISODate(row.close_due_date),
                close_progress:      row.close_progress == null ? null : Math.round(Number(row.close_progress)),
            }
        })
        // Compute overall span from returned rows (auto-fit window)
        let earliest: string | null = null
        let latest: string | null = null
        data.forEach(d => {
            if (d.start_date && (!earliest || d.start_date < earliest)) earliest = d.start_date
            if (d.end_date && (!latest || d.end_date > latest)) latest = d.end_date
        })
        return { success: true, data, meta: { earliest, latest } }
    } catch (e: any) {
        console.error('[gantt-overview] getProjectsForGantt error:', e)
        return { success: false, error: e?.message || 'failed to load projects' }
    }
}

// ============================================================
// Project detail: milestones + stories + tasks (3-level tree)
// ============================================================

export async function getProjectDetailForGantt(projectId: string): Promise<{
    success: true; data: GanttProjectDetail
} | { success: false; error: string }> {
    try {
        const pool = await getConnection()

        const [pRes, mRes, sRes, tRes] = await Promise.all([
            pool.request().input('id', sql.UniqueIdentifier, projectId).query(`
                SELECT p.id, p.project_code, p.name, p.name_th, p.end_date, p.created_at,
                       c.name AS customer_name,
                       pm.first_name_th + ' ' + ISNULL(pm.last_name_th, '') AS project_manager_name,
                       pt.name AS project_type_name, pt.color AS project_type_color,
                       sc.code AS status_code, sc.name AS status_name, sc.color AS status_color,
                       cpm.id AS current_milestone_id,
                       cm.name AS current_milestone_name,
                       cm.color AS current_milestone_color,
                       cm.sort_order AS current_milestone_sort_order,
                       (SELECT MIN(due_date) FROM pms.project_milestones WHERE project_id = p.id) AS earliest_ms_due,
                       (SELECT MAX(due_date) FROM pms.project_milestones WHERE project_id = p.id) AS latest_ms_due,
                       (SELECT AVG(CAST(ISNULL(progress_percent,0) AS FLOAT))
                          FROM pms.project_milestones WHERE project_id = p.id) AS avg_progress,
                       (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id) AS milestone_count
                FROM pms.projects p
                LEFT JOIN pms.customers c ON c.id = p.customer_id
                LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
                LEFT JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.project_status_configs sc ON sc.id = p.status_id
                LEFT JOIN pms.project_milestones cpm ON cpm.id = p.current_milestone_id
                LEFT JOIN pms.milestone_configs cm ON cm.id = cpm.milestone_config_id
                WHERE p.id = @id
            `),
            pool.request().input('id', sql.UniqueIdentifier, projectId).query(`
                -- Read progress directly from project_milestones.progress_percent (the field
                -- updateMilestoneProgress writes to). The shared vw_gantt_milestones VIEW
                -- derives progress from story completion counts and would ignore our save.
                SELECT vm.id, vm.milestone_code, vm.milestone_name, vm.color, vm.sort_order,
                       vm.due_date, vm.status, vm.story_count,
                       CAST(ISNULL(pm.progress_percent, 0) AS INT) AS progress,
                       pm.planned_start_date,
                       pm.actual_start_date,
                       pm.actual_duration_days
                FROM pms.vw_gantt_milestones vm
                LEFT JOIN pms.project_milestones pm ON pm.id = vm.id
                WHERE vm.project_id = @id
                ORDER BY vm.sort_order ASC, vm.due_date ASC
            `),
            pool.request().input('id', sql.UniqueIdentifier, projectId).query(`
                SELECT id, milestone_id, story_code, title, status, priority,
                       start_date, end_date, progress, task_count
                FROM pms.vw_gantt_stories
                WHERE project_id = @id
                ORDER BY milestone_id ASC, end_date ASC, story_code ASC
            `),
            pool.request().input('id', sql.UniqueIdentifier, projectId).query(`
                SELECT id, story_id, milestone_id, task_code, title, status, priority,
                       start_date, end_date, duration_days, progress, assignee_name, is_overdue
                FROM pms.vw_gantt_tasks
                WHERE project_id = @id
                ORDER BY story_id ASC, end_date ASC, task_code ASC
            `),
        ])

        if (pRes.recordset.length === 0) {
            return { success: false, error: 'project not found' }
        }
        const p = pRes.recordset[0]
        const project: GanttProjectRow = {
            id: p.id,
            project_code: p.project_code,
            name: p.name,
            name_th: p.name_th,
            customer_name: p.customer_name,
            project_manager_name: p.project_manager_name?.trim() || null,
            project_type_name: p.project_type_name,
            project_type_color: p.project_type_color,
            status_code: p.status_code,
            status_name: p.status_name,
            status_color: p.status_color,
            start_date: p.earliest_ms_due ? toISODate(p.earliest_ms_due) : toISODate(p.created_at),
            end_date: p.latest_ms_due ? toISODate(p.latest_ms_due) : toISODate(p.end_date),
            progress: Math.round(p.avg_progress || 0),
            milestone_count: p.milestone_count || 0,
            current_milestone_id: p.current_milestone_id || null,
            current_milestone_name: p.current_milestone_name || null,
            current_milestone_color: p.current_milestone_color || null,
            current_milestone_sort_order: p.current_milestone_sort_order ?? null,
            // ProjectDetailPopup doesn't render the per-milestone columns; default to null
            uat_milestone_id: null, uat_due_date: null, uat_progress: null,
            golive_milestone_id: null, golive_due_date: null, golive_progress: null,
            close_milestone_id: null, close_due_date: null, close_progress: null,
        }

        const milestones: GanttMilestoneNode[] = mRes.recordset.map((m: any) => ({
            id: m.id, milestone_code: m.milestone_code, milestone_name: m.milestone_name,
            color: m.color, sort_order: m.sort_order, due_date: toISODate(m.due_date),
            status: m.status, progress: Math.round(m.progress || 0), story_count: m.story_count || 0,
            actual_start_date: toISODate(m.actual_start_date),
            actual_duration_days: m.actual_duration_days != null ? Number(m.actual_duration_days) : null,
            planned_start_date: toISODate(m.planned_start_date),
        }))
        const stories: GanttStoryNode[] = sRes.recordset.map((s: any) => ({
            id: s.id, milestone_id: s.milestone_id, story_code: s.story_code, title: s.title,
            status: s.status, priority: s.priority,
            start_date: toISODate(s.start_date), end_date: toISODate(s.end_date),
            progress: Math.round(s.progress || 0), task_count: s.task_count || 0,
        }))
        const tasks: GanttTaskNode[] = tRes.recordset.map((t: any) => ({
            id: t.id, story_id: t.story_id, milestone_id: t.milestone_id,
            task_code: t.task_code, title: t.title, status: t.status, priority: t.priority,
            start_date: toISODate(t.start_date), end_date: toISODate(t.end_date),
            duration_days: t.duration_days, progress: Math.round(t.progress || 0),
            assignee_name: t.assignee_name, is_overdue: !!t.is_overdue,
        }))

        return { success: true, data: { project, milestones, stories, tasks } }
    } catch (e: any) {
        console.error('[gantt-overview] getProjectDetailForGantt error:', e)
        return { success: false, error: e?.message || 'failed to load project detail' }
    }
}

// ============================================================
// Open tracking entries grouped by assignee (powers the "ToDo" tab)
// Data source: pms.team_tracking_entries — the daily plan entries
// that the user records on the "รายวัน" tab. Anything not DONE counts as a todo.
// ============================================================

export interface TodoTask {
    id: string
    title: string                 // entry.note OR personal_todo.title (rich HTML)
    status: 'PLANNED' | 'POSTPONED' | 'DONE' | string
    /** Effective due date: completed_date (DONE) / postponed_date (POSTPONED) / entry_date | due_date */
    due_date: string | null
    /** The originally-planned date — useful when something has been postponed */
    planned_date: string | null
    is_overdue: boolean
    color: string | null          // entry color (icon tint)
    icon: string | null
    // Project fields are NULL for personal todos
    project_id: string | null
    project_code: string | null
    project_name: string | null
    project_type_code: string | null
    project_type_color: string | null
    milestone_id: string | null
    milestone_code: string | null
    milestone_name: string | null
    milestone_color: string | null
    /** True when this row came from pms.personal_todos (owner-only, no project) */
    is_personal: boolean
}

export interface AssigneeBucket {
    assignee_id: string | null
    assignee_name: string
    assignee_nickname: string | null
    task_count: number
    overdue_count: number
    tasks: TodoTask[]
}

export async function getOpenTasksByAssignee(filters?: {
    search?: string
    statusIds?: string[]          // project status filter
    typeIds?: string[]            // project type filter
    projectManagerIds?: string[]  // project PM filter
    assigneeIds?: string[]        // tracking-entry assignee filter
    milestoneConfigIds?: string[] // pms.milestone_configs.id — filter ENTRIES by their milestone
    includeUnassigned?: boolean   // default false
    /** ISO yyyy-MM-dd. When set, only entries whose *effective date* matches.
     *  Effective date = completed_date (DONE) / postponed_date (POSTPONED) / entry_date (PLANNED) */
    dateFilter?: string
    /** Include DONE entries (filtered by completed_date when dateFilter is set). */
    includeDone?: boolean
}): Promise<{ success: true; data: AssigneeBucket[] } | { success: false; error: string }> {
    try {
        const pool = await getConnection()
        const req = pool.request()

        // Status filter — toggle DONE based on includeDone
        let where = `t.is_active = 1`
        if (!filters?.includeDone) {
            where += ` AND t.status <> 'DONE'`
        }

        // Effective-date filter
        if (filters?.dateFilter) {
            req.input('dateFilter', sql.Date, filters.dateFilter)
            where += ` AND (
                (t.status = 'DONE'      AND t.completed_date = @dateFilter) OR
                (t.status = 'POSTPONED' AND t.postponed_date = @dateFilter) OR
                (t.status NOT IN ('DONE', 'POSTPONED') AND t.entry_date = @dateFilter)
            )`
        }

        if (filters?.search) {
            where += ` AND (t.note LIKE @search OR p.project_code LIKE @search OR p.name LIKE @search)`
            req.input('search', sql.NVarChar, `%${filters.search}%`)
        }
        if (filters?.statusIds?.length) {
            where += ` AND p.status_id IN (${filters.statusIds.map((_, i) => `@ps${i}`).join(',')})`
            filters.statusIds.forEach((id, i) => req.input(`ps${i}`, sql.UniqueIdentifier, id))
        }
        if (filters?.typeIds?.length) {
            where += ` AND p.project_type_id IN (${filters.typeIds.map((_, i) => `@pt${i}`).join(',')})`
            filters.typeIds.forEach((id, i) => req.input(`pt${i}`, sql.UniqueIdentifier, id))
        }
        if (filters?.projectManagerIds?.length) {
            where += ` AND p.project_manager_id IN (${filters.projectManagerIds.map((_, i) => `@pm${i}`).join(',')})`
            filters.projectManagerIds.forEach((id, i) => req.input(`pm${i}`, sql.UniqueIdentifier, id))
        }
        if (filters?.assigneeIds?.length) {
            where += ` AND t.assignee_id IN (${filters.assigneeIds.map((_, i) => `@as${i}`).join(',')})`
            filters.assigneeIds.forEach((id, i) => req.input(`as${i}`, sql.UniqueIdentifier, id))
        }
        if (filters?.milestoneConfigIds?.length) {
            // Join via project_milestones → milestone_configs to match the entry's milestone
            where += ` AND pmm.milestone_config_id IN (${filters.milestoneConfigIds.map((_, i) => `@mcg${i}`).join(',')})`
            filters.milestoneConfigIds.forEach((id, i) => req.input(`mcg${i}`, sql.UniqueIdentifier, id))
        }
        if (!filters?.includeUnassigned) {
            where += ` AND t.assignee_id IS NOT NULL`
        }

        const result = await req.query(`
            SELECT
                t.id,
                t.note,
                t.status,
                t.color,
                t.icon,
                CONVERT(varchar(10), t.entry_date, 23)     AS entry_date,
                CONVERT(varchar(10), t.postponed_date, 23) AS postponed_date,
                CONVERT(varchar(10), t.completed_date, 23) AS completed_date,
                t.assignee_id,
                LTRIM(RTRIM(ISNULL(emp.first_name_th, '') + ' ' + ISNULL(emp.last_name_th, ''))) AS assignee_name,
                emp.nickname AS assignee_nickname,
                p.id AS project_id, p.project_code, p.name AS project_name,
                ptc.code AS project_type_code, ptc.color AS project_type_color,
                t.milestone_id, mc.code AS milestone_code, mc.name AS milestone_name, mc.color AS milestone_color
            FROM pms.team_tracking_entries t
            INNER JOIN pms.projects p ON t.project_id = p.id
            LEFT JOIN pms.employees emp ON t.assignee_id = emp.id
            LEFT JOIN pms.project_types ptc ON p.project_type_id = ptc.id
            LEFT JOIN pms.project_milestones pmm ON t.milestone_id = pmm.id
            LEFT JOIN pms.milestone_configs mc ON pmm.milestone_config_id = mc.id
            WHERE ${where}
            ORDER BY emp.first_name_th, emp.last_name_th, t.entry_date ASC
        `)

        // Group by assignee
        const buckets = new Map<string, AssigneeBucket>()
        const today = new Date(); today.setHours(0, 0, 0, 0)

        for (const r of result.recordset) {
            const key = r.assignee_id || '__unassigned__'
            if (!buckets.has(key)) {
                buckets.set(key, {
                    assignee_id: r.assignee_id,
                    assignee_name: r.assignee_name?.trim() || 'ไม่ระบุผู้รับผิดชอบ',
                    assignee_nickname: r.assignee_nickname,
                    task_count: 0,
                    overdue_count: 0,
                    tasks: [],
                })
            }
            const bucket = buckets.get(key)!
            // Effective date:
            //   DONE      → completed_date (when it was actually done)
            //   POSTPONED → postponed_date (the day it was moved to)
            //   PLANNED   → entry_date
            let due: string | null
            if (r.status === 'DONE' && r.completed_date) due = r.completed_date
            else if (r.status === 'POSTPONED' && r.postponed_date) due = r.postponed_date
            else due = r.entry_date
            // Done items are never "overdue" (they're done)
            const isOverdue = r.status !== 'DONE' && due
                ? new Date(due).getTime() < today.getTime()
                : false
            bucket.tasks.push({
                id: r.id,
                title: r.note || '(ไม่มีรายละเอียด)',
                status: r.status,
                due_date: due,
                planned_date: r.entry_date,
                is_overdue: isOverdue,
                color: r.color,
                icon: r.icon,
                project_id: r.project_id,
                project_code: r.project_code,
                project_name: r.project_name,
                project_type_code: r.project_type_code,
                project_type_color: r.project_type_color,
                milestone_id: r.milestone_id,
                milestone_code: r.milestone_code,
                milestone_name: r.milestone_name,
                milestone_color: r.milestone_color,
                is_personal: false,
            })
            bucket.task_count++
            if (isOverdue) bucket.overdue_count++
        }

        // Merge in the current user's personal_todos. They live in a separate table
        // (no project FK) and only the owner sees them.
        const me = await getCurrentUser()
        if (me) {
            // Apply the same date / done filters so personal todos respect the UI filters.
            let pWhere = `owner_id = @me AND is_active = 1`
            if (!filters?.includeDone) pWhere += ` AND status <> 'DONE'`
            const pReq = pool.request().input('me', sql.UniqueIdentifier, me.id)
            if (filters?.dateFilter) {
                pReq.input('pDate', sql.Date, filters.dateFilter)
                pWhere += ` AND (
                    (status = 'DONE'  AND completed_date = @pDate) OR
                    (status <> 'DONE' AND due_date = @pDate)
                )`
            }
            // Optional assignee filter: if user filtered to someone else, skip personal todos
            const showPersonal = !filters?.assigneeIds?.length || filters.assigneeIds.includes(me.id)
            if (showPersonal) {
                const pr = await pReq.query(`
                    SELECT id, title, status,
                        CONVERT(varchar(10), due_date,       23) AS due_date,
                        CONVERT(varchar(10), completed_date, 23) AS completed_date,
                        color, icon
                    FROM pms.personal_todos
                    WHERE ${pWhere}
                `)
                if (pr.recordset.length > 0) {
                    // Find or create the current user's bucket
                    let myBucket = buckets.get(me.id)
                    if (!myBucket) {
                        myBucket = {
                            assignee_id: me.id,
                            assignee_name: me.name,
                            assignee_nickname: null,
                            task_count: 0,
                            overdue_count: 0,
                            tasks: [],
                        }
                        buckets.set(me.id, myBucket)
                    }
                    for (const r of pr.recordset) {
                        const due = r.status === 'DONE' && r.completed_date ? r.completed_date : r.due_date
                        const isOverdue = r.status !== 'DONE' && due
                            ? new Date(due).getTime() < today.getTime()
                            : false
                        myBucket.tasks.push({
                            id: r.id,
                            title: r.title || '(ไม่มีรายละเอียด)',
                            status: r.status,
                            due_date: due,
                            planned_date: r.due_date,
                            is_overdue: isOverdue,
                            color: r.color,
                            icon: r.icon,
                            project_id: null,
                            project_code: null,
                            project_name: null,
                            project_type_code: null,
                            project_type_color: null,
                            milestone_id: null,
                            milestone_code: null,
                            milestone_name: null,
                            milestone_color: null,
                            is_personal: true,
                        })
                        myBucket.task_count++
                        if (isOverdue) myBucket.overdue_count++
                    }
                }
            }
        }

        // Sort tasks within each bucket: overdue first (oldest first), then by due_date asc
        for (const b of buckets.values()) {
            b.tasks.sort((a, c) => {
                if (a.is_overdue !== c.is_overdue) return a.is_overdue ? -1 : 1
                const ad = a.due_date || '9999-12-31'
                const cd = c.due_date || '9999-12-31'
                return ad < cd ? -1 : ad > cd ? 1 : 0
            })
        }

        // Sort buckets: most overdue first, then most tasks first
        const sorted = Array.from(buckets.values()).sort((a, b) => {
            if (b.overdue_count !== a.overdue_count) return b.overdue_count - a.overdue_count
            return b.task_count - a.task_count
        })

        return { success: true, data: sorted }
    } catch (e: any) {
        console.error('[gantt-overview] getOpenTasksByAssignee error:', e)
        return { success: false, error: e?.message || 'failed to load open tracking entries' }
    }
}

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------

function toISODate(v: any): string | null {
    if (!v) return null
    const d = v instanceof Date ? v : new Date(v)
    if (isNaN(d.getTime())) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}
