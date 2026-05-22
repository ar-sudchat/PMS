'use server'

import { getConnection } from '@/lib/db'
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
    current_milestone_name: string | null
    current_milestone_color: string | null
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
                cm.name AS current_milestone_name,
                cm.color AS current_milestone_color,
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
                current_milestone_name: row.current_milestone_name,
                current_milestone_color: row.current_milestone_color,
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
                       cm.name AS current_milestone_name,
                       cm.color AS current_milestone_color,
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
                SELECT id, milestone_code, milestone_name, color, sort_order,
                       due_date, status, progress, story_count
                FROM pms.vw_gantt_milestones
                WHERE project_id = @id
                ORDER BY sort_order ASC, due_date ASC
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
            current_milestone_name: p.current_milestone_name || null,
            current_milestone_color: p.current_milestone_color || null,
        }

        const milestones: GanttMilestoneNode[] = mRes.recordset.map((m: any) => ({
            id: m.id, milestone_code: m.milestone_code, milestone_name: m.milestone_name,
            color: m.color, sort_order: m.sort_order, due_date: toISODate(m.due_date),
            status: m.status, progress: Math.round(m.progress || 0), story_count: m.story_count || 0,
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
