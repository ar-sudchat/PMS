'use server'

import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getProjects, ProjectFilters } from '@/lib/actions/project-actions'
import sql from 'mssql'

// Cached column-existence flags so the page works even if a migration
// has not yet been applied.
let _colFlags: { icon: boolean; status: boolean } | null = null
async function checkOptionalCols(pool: sql.ConnectionPool) {
    if (_colFlags) return _colFlags
    const res = await pool.request().query(`
        SELECT name FROM sys.columns
        WHERE object_id = OBJECT_ID('pms.team_tracking_entries')
          AND name IN ('icon', 'status', 'completed_date', 'postponed_date')
    `)
    const names = new Set(res.recordset.map((r: { name: string }) => r.name))
    _colFlags = {
        icon: names.has('icon'),
        status: names.has('status') && names.has('completed_date') && names.has('postponed_date'),
    }
    return _colFlags
}

// ============================================
// Types
// ============================================

export type TrackingStatus = 'PLANNED' | 'DONE' | 'POSTPONED'

export interface TrackingEntry {
    id: string
    project_id: string
    entry_date: string | null   // ISO yyyy-MM-dd; null = unscheduled (action-plan template)
    assignee_id: string | null
    assignee_name: string | null
    assignee_role: string | null
    note: string | null
    color: string | null
    color_source: 'MANUAL' | 'MILESTONE'
    icon: string | null
    status: TrackingStatus
    completed_date: string | null
    postponed_date: string | null
    milestone_id: string | null
    milestone_name: string | null
    milestone_color: string | null
    /** When set, this tracking entry has been promoted to a full Task in pms.tasks. */
    task_id?: string | null
    /** task_code of the linked task — surfaced so the daily grid can show it inline. */
    task_code?: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface CreateTrackingEntryInput {
    project_id: string
    entry_date: string | null   // null = create as "unscheduled"
    assignee_id?: string | null
    assignee_role?: string | null
    note?: string | null
    color?: string | null
    color_source?: 'MANUAL' | 'MILESTONE'
    icon?: string | null
    status?: TrackingStatus
    completed_date?: string | null
    postponed_date?: string | null
    milestone_id?: string | null
}

export interface UpdateTrackingEntryInput {
    assignee_id?: string | null
    assignee_role?: string | null
    note?: string | null
    color?: string | null
    color_source?: 'MANUAL' | 'MILESTONE'
    icon?: string | null
    status?: TrackingStatus
    completed_date?: string | null
    postponed_date?: string | null
    milestone_id?: string | null
}

export interface AssignableEmployee {
    id: string
    code: string
    name: string
    name_th: string
    role: string
    position_code: string | null
}

export interface TrackingProject {
    id: string
    project_code: string
    name: string
    customer_name: string | null
    project_type_code: string | null
    project_type_color: string | null
    owner_name: string | null
    pm_name: string | null
}

// ============================================
// GET TEAM TRACKING DATA
// (projects matched by filter + entries within month range)
// ============================================

export async function getTeamTrackingData(
    filters: ProjectFilters,
    monthStart: string,   // 'yyyy-MM-dd'
    monthEnd: string      // 'yyyy-MM-dd'
) {
    try {
        let matchedProjectIds: string[] | null = null
        const projectsFilters = { ...filters }

        if (filters.ownerId) {
            try {
                const pool = await getConnection()
                const request = pool.request()
                request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
                request.input('monthStart', sql.Date, monthStart)
                request.input('monthEnd', sql.Date, monthEnd)
                const result = await request.query(`
                    SELECT DISTINCT p.id
                    FROM pms.projects p
                    LEFT JOIN pms.team_tracking_entries t ON p.id = t.project_id AND t.is_active = 1
                    WHERE p.is_active = 1
                      AND (
                        p.project_owner_id = @ownerId 
                        OR (t.assignee_id = @ownerId AND t.entry_date BETWEEN @monthStart AND @monthEnd)
                        OR EXISTS (
                            SELECT 1 
                            FROM pms.tasks tk 
                            JOIN pms.stories s ON tk.story_id = s.id 
                            WHERE s.project_id = p.id 
                              AND tk.assignee_id = @ownerId 
                              AND tk.is_active = 1 
                              AND s.is_active = 1
                        )
                      )
                `)
                matchedProjectIds = result.recordset.map((r: { id: string }) => r.id)
            } catch (err) {
                console.error('Error fetching matched project IDs for employee filter:', err)
            }
            // Remove ownerId from filter payload passed to getProjects so we can filter in JS
            delete projectsFilters.ownerId
        }

        const projectsResult = await getProjects(projectsFilters)
        if (!projectsResult.success || !projectsResult.data) {
            return { success: false, error: projectsResult.error || 'Failed to load projects', data: null }
        }

        let projects = projectsResult.data as TrackingProject[]
        if (matchedProjectIds !== null) {
            projects = projects.filter((p) => matchedProjectIds!.includes(p.id))
        }

        if (projects.length === 0) {
            return { success: true, data: { projects: [], entries: [] as TrackingEntry[] } }
        }

        const projectIds = projects.map((p) => p.id)

        // Query entries — wrapped in its own try/catch so a missing table
        // (e.g. script 75 not yet run) still returns the projects list.
        let entries: TrackingEntry[] = []
        try {
            const pool = await getConnection()

            // Check table existence first to avoid noisy errors during initial setup
            const tableCheck = await pool.request().query(`
                SELECT 1 AS ok
                FROM sys.tables
                WHERE schema_id = SCHEMA_ID('pms') AND name = 'team_tracking_entries'
            `)

            if (tableCheck.recordset.length > 0) {
                const flags = await checkOptionalCols(pool)
                const iconCol = flags.icon ? 't.icon' : 'NULL AS icon'
                const statusCols = flags.status
                    ? `t.status,
                       CONVERT(varchar(10), t.completed_date, 23) AS completed_date,
                       CONVERT(varchar(10), t.postponed_date, 23) AS postponed_date`
                    : `'PLANNED' AS status, NULL AS completed_date, NULL AS postponed_date`

                const request = pool.request()
                request.input('monthStart', sql.Date, monthStart)
                request.input('monthEnd', sql.Date, monthEnd)

                const idParams = projectIds.map((_, i) => `@pid${i}`).join(',')
                projectIds.forEach((id, i) => request.input(`pid${i}`, sql.UniqueIdentifier, id))

                const result = await request.query(`
                    SELECT
                        t.id,
                        t.project_id,
                        CONVERT(varchar(10), t.entry_date, 23) AS entry_date,
                        t.assignee_id,
                        CONCAT(e.first_name_th, ' ', e.last_name_th) AS assignee_name,
                        t.assignee_role,
                        t.note,
                        t.color,
                        t.color_source,
                        ${iconCol},
                        ${statusCols},
                        t.milestone_id,
                        mc.name AS milestone_name,
                        mc.color AS milestone_color,
                        t.task_id,
                        tk.task_code,
                        t.created_by,
                        CONVERT(varchar(19), t.created_at, 126) AS created_at,
                        CONVERT(varchar(19), t.updated_at, 126) AS updated_at
                    FROM pms.team_tracking_entries t
                    LEFT JOIN pms.employees e         ON t.assignee_id  = e.id
                    LEFT JOIN pms.project_milestones pm ON t.milestone_id = pm.id
                    LEFT JOIN pms.milestone_configs mc   ON pm.milestone_config_id = mc.id
                    LEFT JOIN pms.tasks tk              ON tk.id = t.task_id
                    WHERE t.is_active = 1
                      AND t.project_id IN (${idParams})
                      AND t.entry_date BETWEEN @monthStart AND @monthEnd
                    ORDER BY t.entry_date, t.created_at
                `)
                entries = result.recordset as TrackingEntry[]
            }
        } catch (entriesError) {
            console.error('getTeamTrackingData entries query failed:', entriesError)
        }

        return {
            success: true,
            data: { projects, entries },
        }
    } catch (error) {
        console.error('getTeamTrackingData error:', error)
        return { success: false, error: 'Failed to load team tracking data', data: null }
    }
}

// ============================================
// GET PROJECT MILESTONES
// (project_milestones with config color/name, for Dialog picker)
// ============================================

export async function getProjectMilestones(projectId: string) {
    try {
        const pool = await getConnection()
        const result = await pool
            .request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    pm.id,
                    mc.name AS name,
                    mc.color,
                    mc.code,
                    pm.sort_order
                FROM pms.project_milestones pm
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id = @project_id
                ORDER BY pm.sort_order
            `)
        return {
            success: true,
            data: result.recordset.map((m: { id: string; name: string | null; color: string | null; code: string | null }) => ({
                id: m.id,
                name: m.name || m.code || 'Milestone',
                color: m.color || null,
            })),
        }
    } catch (error) {
        console.error('getProjectMilestones error:', error)
        return { success: false, error: 'Failed to load milestones', data: [] as { id: string; name: string; color: string | null }[] }
    }
}

// ============================================
// GET ASSIGNABLE EMPLOYEES
// ============================================

export async function getAssignableEmployees() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT
                e.id,
                e.employee_code AS code,
                CONCAT(e.first_name, ' ', e.last_name) AS name,
                CONCAT(e.first_name_th, ' ', e.last_name_th) AS name_th,
                e.role,
                p.code AS position_code
            FROM pms.employees e
            LEFT JOIN pms.positions p ON e.position_id = p.id
            WHERE e.is_active = 1
            ORDER BY name_th
        `)

        return { success: true, data: result.recordset as AssignableEmployee[] }
    } catch (error) {
        console.error('getAssignableEmployees error:', error)
        return { success: false, error: 'Failed to load employees', data: [] as AssignableEmployee[] }
    }
}

// ============================================
// CREATE
// ============================================

export async function createTrackingEntry(input: CreateTrackingEntryInput) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const flags = await checkOptionalCols(pool)

        const request = pool.request()
        request.input('project_id', sql.UniqueIdentifier, input.project_id)
        request.input('entry_date', sql.Date, input.entry_date || null)
        request.input('assignee_id', sql.UniqueIdentifier, input.assignee_id || null)
        request.input('assignee_role', sql.NVarChar(20), input.assignee_role || null)
        request.input('note', sql.NVarChar(sql.MAX), input.note || null)
        request.input('color', sql.NVarChar(50), input.color || null)
        request.input('color_source', sql.NVarChar(20), input.color_source || 'MANUAL')
        request.input('milestone_id', sql.UniqueIdentifier, input.milestone_id || null)
        request.input('created_by', sql.UniqueIdentifier, user.id)
        if (flags.icon) request.input('icon', sql.NVarChar(50), input.icon || null)
        if (flags.status) {
            request.input('status', sql.NVarChar(20), input.status || 'PLANNED')
            request.input('completed_date', sql.Date, input.completed_date || null)
            request.input('postponed_date', sql.Date, input.postponed_date || null)
        }

        const cols = ['project_id', 'entry_date', 'assignee_id', 'assignee_role', 'note', 'color', 'color_source', 'milestone_id', 'created_by']
        const vals = ['@project_id', '@entry_date', '@assignee_id', '@assignee_role', '@note', '@color', '@color_source', '@milestone_id', '@created_by']
        if (flags.icon) {
            cols.push('icon'); vals.push('@icon')
        }
        if (flags.status) {
            cols.push('status', 'completed_date', 'postponed_date')
            vals.push('@status', '@completed_date', '@postponed_date')
        }

        const result = await request.query(`
            INSERT INTO pms.team_tracking_entries (${cols.join(', ')})
            OUTPUT INSERTED.id
            VALUES (${vals.join(', ')})
        `)

        return { success: true, data: { id: result.recordset[0].id } }
    } catch (error) {
        console.error('createTrackingEntry error:', error)
        return { success: false, error: 'Failed to create entry' }
    }
}

// ============================================
// UPDATE
// ============================================

export async function updateTrackingEntry(id: string, patch: UpdateTrackingEntryInput) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const flags = await checkOptionalCols(pool)

        const request = pool.request()
        request.input('id', sql.UniqueIdentifier, id)
        request.input('assignee_id', sql.UniqueIdentifier, patch.assignee_id ?? null)
        request.input('assignee_role', sql.NVarChar(20), patch.assignee_role ?? null)
        request.input('note', sql.NVarChar(sql.MAX), patch.note ?? null)
        request.input('color', sql.NVarChar(50), patch.color ?? null)
        request.input('color_source', sql.NVarChar(20), patch.color_source ?? 'MANUAL')
        request.input('milestone_id', sql.UniqueIdentifier, patch.milestone_id ?? null)
        request.input('updated_by', sql.UniqueIdentifier, user.id)
        if (flags.icon) request.input('icon', sql.NVarChar(50), patch.icon ?? null)
        if (flags.status) {
            request.input('status', sql.NVarChar(20), patch.status ?? 'PLANNED')
            request.input('completed_date', sql.Date, patch.completed_date ?? null)
            request.input('postponed_date', sql.Date, patch.postponed_date ?? null)
        }

        const setParts = [
            'assignee_id = @assignee_id',
            'assignee_role = @assignee_role',
            'note = @note',
            'color = @color',
            'color_source = @color_source',
            'milestone_id = @milestone_id',
            'updated_by = @updated_by',
            'updated_at = GETDATE()',
        ]
        if (flags.icon) setParts.push('icon = @icon')
        if (flags.status) {
            setParts.push('status = @status', 'completed_date = @completed_date', 'postponed_date = @postponed_date')
        }

        await request.query(`
            UPDATE pms.team_tracking_entries
            SET ${setParts.join(', ')}
            WHERE id = @id AND is_active = 1
        `)

        return { success: true }
    } catch (error) {
        console.error('updateTrackingEntry error:', error)
        return { success: false, error: 'Failed to update entry' }
    }
}

// ============================================
// MARK DONE — minimal status flip from the ToDo tab
// (avoids overwriting note/assignee/etc that updateTrackingEntry would do)
// ============================================

export async function markTrackingEntryDone(id: string, completedDate?: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        // Default to today (yyyy-mm-dd) in the server's local clock
        const today = completedDate || (() => {
            const d = new Date()
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${dd}`
        })()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('completed_date', sql.Date, today)
            .input('updated_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.team_tracking_entries
                SET status = 'DONE',
                    completed_date = @completed_date,
                    updated_by = @updated_by,
                    updated_at = GETDATE()
                WHERE id = @id AND is_active = 1
            `)

        return { success: true }
    } catch (error) {
        console.error('markTrackingEntryDone error:', error)
        return { success: false, error: 'Failed to mark entry as done' }
    }
}

// ============================================
// UNSCHEDULED ENTRIES — list tracking entries with entry_date IS NULL.
// These are action-plan templates the user hasn't pinned to a date yet.
// ============================================
export interface UnscheduledEntry {
    id: string
    project_id: string
    project_code: string
    project_name: string
    assignee_id: string | null
    assignee_name: string | null
    note: string
    color: string | null
    icon: string | null
    milestone_id: string | null
    milestone_name: string | null
    milestone_color: string | null
    task_id: string | null
}

export async function getUnscheduledTrackingEntries(projectId?: string): Promise<{ success: true; data: UnscheduledEntry[] } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId || null)
            .query(`
                SELECT
                    t.id, t.project_id,
                    p.project_code, ISNULL(p.name_th, p.name) AS project_name,
                    t.assignee_id,
                    CONCAT(e.first_name_th, ' ', e.last_name_th) AS assignee_name,
                    t.note, t.color, t.icon,
                    t.milestone_id,
                    mc.name AS milestone_name,
                    mc.color AS milestone_color,
                    t.task_id
                FROM pms.team_tracking_entries t
                INNER JOIN pms.projects p ON p.id = t.project_id
                LEFT JOIN pms.employees e ON e.id = t.assignee_id
                LEFT JOIN pms.project_milestones pm ON pm.id = t.milestone_id
                LEFT JOIN pms.milestone_configs mc ON mc.id = pm.milestone_config_id
                WHERE t.is_active = 1
                  AND t.entry_date IS NULL
                  AND (@projectId IS NULL OR t.project_id = @projectId)
                ORDER BY p.project_code, t.created_at
            `)

        const data: UnscheduledEntry[] = result.recordset.map((r: any) => ({
            id: r.id,
            project_id: r.project_id,
            project_code: r.project_code,
            project_name: r.project_name,
            assignee_id: r.assignee_id,
            assignee_name: r.assignee_name || null,
            note: r.note || '',
            color: r.color,
            icon: r.icon,
            milestone_id: r.milestone_id,
            milestone_name: r.milestone_name,
            milestone_color: r.milestone_color,
            task_id: r.task_id,
        }))
        return { success: true, data }
    } catch (error) {
        console.error('getUnscheduledTrackingEntries error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to load' }
    }
}

// Set an entry's date (used by the unscheduled pane to assign a date).
export async function setTrackingEntryDate(id: string, entryDate: string | null) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('d', sql.Date, entryDate || null)
            .input('uid', sql.UniqueIdentifier, user.id)
            .query(`UPDATE pms.team_tracking_entries SET entry_date = @d, updated_by = @uid, updated_at = GETDATE() WHERE id = @id`)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// ============================================
// BULK COPY — duplicate a tracking entry across N target dates.
// Each new copy carries over note/color/icon/milestone/assignee from the source,
// resets status to PLANNED, and clears completed/postponed dates.
// ============================================
export async function copyTrackingEntryToDates(
    sourceId: string,
    targetDates: string[],          // ISO yyyy-MM-dd
): Promise<{ success: true; created: number } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!targetDates.length) return { success: false, error: 'ไม่มีวันที่ปลายทาง' }
        const pool = await getConnection()

        // 1) Load the source entry
        const src = await pool.request()
            .input('id', sql.UniqueIdentifier, sourceId)
            .query(`
                SELECT project_id, assignee_id, assignee_role, note, color, color_source,
                       icon, milestone_id
                FROM pms.team_tracking_entries
                WHERE id = @id AND is_active = 1
            `)
        if (src.recordset.length === 0) return { success: false, error: 'ไม่พบรายการต้นทาง' }
        const s = src.recordset[0]

        // 2) Insert one row per target date — INSERT...SELECT loop in one round-trip
        let created = 0
        for (const d of targetDates) {
            const newId = require('crypto').randomUUID()
            await pool.request()
                .input('id', sql.UniqueIdentifier, newId)
                .input('project_id', sql.UniqueIdentifier, s.project_id)
                .input('entry_date', sql.Date, d)
                .input('assignee_id', sql.UniqueIdentifier, s.assignee_id || null)
                .input('assignee_role', sql.NVarChar(20), s.assignee_role || null)
                .input('note', sql.NVarChar(sql.MAX), s.note || null)
                .input('color', sql.NVarChar(20), s.color || '#6366f1')
                .input('color_source', sql.NVarChar(20), s.color_source || 'MANUAL')
                .input('icon', sql.NVarChar(50), s.icon || null)
                .input('milestone_id', sql.UniqueIdentifier, s.milestone_id || null)
                .input('created_by', sql.UniqueIdentifier, user.id)
                .query(`
                    INSERT INTO pms.team_tracking_entries (
                        id, project_id, entry_date, assignee_id, assignee_role,
                        note, color, color_source, icon, status, milestone_id,
                        is_active, created_by, created_at, updated_at
                    ) VALUES (
                        @id, @project_id, @entry_date, @assignee_id, @assignee_role,
                        @note, @color, @color_source, @icon, 'PLANNED', @milestone_id,
                        1, @created_by, GETDATE(), GETDATE()
                    )
                `)
            created++
        }
        return { success: true, created }
    } catch (error) {
        console.error('copyTrackingEntryToDates error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to copy' }
    }
}

// ============================================
// BULK CONVERT helpers — surface tracking entries that haven't been promoted to
// tasks yet, plus link several tasks back to their source entries in one call.
// Used by the "⚡ Bulk Convert" flow that reuses the BulkTaskModal UI.
// ============================================
export interface ConvertibleTrackingEntry {
    id: string
    project_id: string
    entry_date: string | null
    assignee_id: string | null
    note: string             // raw HTML — caller cleans for display
    title_clean: string      // HTML-stripped, single-line; ready to use as task title
}

export async function getConvertibleEntriesForProject(projectId: string): Promise<{ success: true; data: ConvertibleTrackingEntry[] } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()
        const r = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT id, project_id,
                       CONVERT(varchar(10), entry_date, 23) AS entry_date,
                       assignee_id, note
                FROM pms.team_tracking_entries
                WHERE project_id = @projectId
                  AND is_active = 1
                  AND task_id IS NULL
                ORDER BY entry_date, created_at
            `)
        const data: ConvertibleTrackingEntry[] = r.recordset.map((row: any) => {
            const titleClean = ((row.note as string) || '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 250)
            return {
                id: row.id,
                project_id: row.project_id,
                entry_date: row.entry_date || null,
                assignee_id: row.assignee_id,
                note: row.note || '',
                title_clean: titleClean,
            }
        })
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// For each task id, create a tracking entry mirroring the task (title → note,
// due_date → entry_date, assignee_id → assignee_id) and link via task_id.
// Used when the user creates Tasks via Bulk modal WITHOUT a tracking-entry source
// (so the new tasks still surface on the daily grid).
export async function createTrackingEntriesForTasks(taskIds: string[]) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!taskIds.length) return { success: true, created: 0 }
        const pool = await getConnection()
        let created = 0
        for (const tid of taskIds) {
            // Fetch task + story to get project_id
            const tk = await pool.request()
                .input('id', sql.UniqueIdentifier, tid)
                .query(`
                    SELECT t.id, t.title, t.due_date, t.assignee_id, s.project_id
                    FROM pms.tasks t
                    INNER JOIN pms.stories s ON s.id = t.story_id
                    WHERE t.id = @id
                `)
            if (tk.recordset.length === 0) continue
            const row = tk.recordset[0]
            const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const note = `<p><b>${esc(row.title || '')}</b></p>`
            await pool.request()
                .input('id', sql.UniqueIdentifier, require('crypto').randomUUID())
                .input('projectId', sql.UniqueIdentifier, row.project_id)
                .input('entryDate', sql.Date, row.due_date || null)
                .input('assigneeId', sql.UniqueIdentifier, row.assignee_id || null)
                .input('note', sql.NVarChar(sql.MAX), note)
                .input('taskId', sql.UniqueIdentifier, tid)
                .input('createdBy', sql.UniqueIdentifier, user.id)
                .query(`
                    INSERT INTO pms.team_tracking_entries (
                        id, project_id, entry_date, assignee_id, assignee_role,
                        note, color, color_source, status, is_active,
                        task_id, created_by, created_at, updated_at
                    ) VALUES (
                        @id, @projectId, @entryDate, @assigneeId, 'EMPLOYEE',
                        @note, '#dc2626', 'MANUAL', 'PLANNED', 1,
                        @taskId, @createdBy, GETDATE(), GETDATE()
                    )
                `)
            created++
        }
        return { success: true, created }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// Remove tracking entries that were auto-mirrored by createTasksBulk when we already
// have source entries (e.g. the bulk-convert flow). Identifies them by `task_id IN
// taskIds AND id NOT IN preserveIds`. Soft-deletes only.
export async function deleteAutoMirroredEntries(taskIds: string[], preserveIds: string[]) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!taskIds.length) return { success: true, removed: 0 }
        const pool = await getConnection()
        const taskPlaceholders = taskIds.map((_, i) => `@tk${i}`).join(',')
        const preservePlaceholders = preserveIds.length
            ? preserveIds.map((_, i) => `@p${i}`).join(',')
            : null
        const req = pool.request()
        taskIds.forEach((id, i) => req.input(`tk${i}`, sql.UniqueIdentifier, id))
        preserveIds.forEach((id, i) => req.input(`p${i}`, sql.UniqueIdentifier, id))
        const where = preservePlaceholders
            ? `task_id IN (${taskPlaceholders}) AND id NOT IN (${preservePlaceholders}) AND is_active = 1`
            : `task_id IN (${taskPlaceholders}) AND is_active = 1`
        const r = await req.query(`UPDATE pms.team_tracking_entries SET is_active = 0, updated_at = GETDATE() WHERE ${where}`)
        return { success: true, removed: r.rowsAffected[0] }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// Link a list of new task ids back to a parallel list of tracking entry ids
// (positionally matched — caller is responsible for keeping arrays aligned).
export async function linkTrackingEntriesToTasks(pairs: { trackingId: string; taskId: string }[]) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!pairs.length) return { success: true, linked: 0 }
        const pool = await getConnection()
        let linked = 0
        for (const p of pairs) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, p.trackingId)
                .input('taskId', sql.UniqueIdentifier, p.taskId)
                .query(`UPDATE pms.team_tracking_entries SET task_id = @taskId, updated_at = GETDATE() WHERE id = @id AND task_id IS NULL`)
            linked++
        }
        return { success: true, linked }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// Ensure a "General" story exists for the project (auto-create if missing).
// Returns the story id. Used as the destination for bulk-converted tasks.
export async function getOrCreateGeneralStory(projectId: string): Promise<{ success: true; storyId: string; storyCode: string } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()
        const found = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT TOP 1 id, story_code FROM pms.stories
                WHERE project_id = @projectId AND is_active = 1 AND title = N'General'
                ORDER BY sort_order
            `)
        if (found.recordset.length) {
            return { success: true, storyId: found.recordset[0].id, storyCode: found.recordset[0].story_code }
        }
        const projRes = await pool.request()
            .input('id', sql.UniqueIdentifier, projectId)
            .query(`SELECT project_code FROM pms.projects WHERE id = @id`)
        const projectCode = projRes.recordset[0]?.project_code || 'GEN'
        const prefix = `${projectCode}-S-`
        const codeRes = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('prefix', sql.NVarChar, `${prefix}%`)
            .input('prefixLen', sql.Int, prefix.length)
            .query(`
                SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(story_code, @prefixLen + 1, LEN(story_code)) AS INT)), 0) + 1 AS n
                FROM pms.stories
                WHERE project_id = @projectId AND story_code LIKE @prefix
            `)
        const storyCode = `${prefix}${String(codeRes.recordset[0].n).padStart(3, '0')}`
        const newId = require('crypto').randomUUID()
        await pool.request()
            .input('id', sql.UniqueIdentifier, newId)
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('storyCode', sql.NVarChar, storyCode)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.stories (
                    id, project_id, story_code, title, priority, status,
                    sort_order, created_by, is_active, created_at, updated_at
                ) VALUES (
                    @id, @projectId, @storyCode, N'General', 'medium', 'backlog',
                    9999, @createdBy, 1, GETDATE(), GETDATE()
                )
            `)
        return { success: true, storyId: newId, storyCode }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
}

// ============================================
// CONVERT TRACKING ENTRY → TASK
// Promotes a daily tracking entry into a proper Task in pms.tasks so it can be
// time-tracked in the timesheet system. Links back via team_tracking_entries.task_id.
// ============================================
export interface ConvertToTaskInput {
    trackingEntryId: string
    /** Optional — when omitted, we auto-pick (or auto-create) a "General" story per project.
     *  This keeps the UI form Story-less while the DB still has the FK populated. */
    story_id?: string
    task_type: string            // task_type_configs.code (DEVELOPMENT, BUG_FIX, ...)
    priority: 'critical' | 'high' | 'medium' | 'low'
    estimated_hours?: number | null
    is_count_for_kpi?: boolean
}

export async function createTaskFromTrackingEntry(input: ConvertToTaskInput) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()

        // 1) Fetch the tracking entry — need its note, assignee, date, project for the new task
        const trk = await pool.request()
            .input('id', sql.UniqueIdentifier, input.trackingEntryId)
            .query(`
                SELECT id, project_id, entry_date, assignee_id, note, task_id
                FROM pms.team_tracking_entries
                WHERE id = @id AND is_active = 1
            `)
        if (trk.recordset.length === 0) return { success: false, error: 'ไม่พบรายการ tracking' }
        const t = trk.recordset[0]
        if (t.task_id) return { success: false, error: 'รายการนี้ผูกกับ task อยู่แล้ว' }

        // 2) Resolve story_id — auto-find/create "General" story when caller didn't pick one.
        // Per user policy (Option A): tasks are story-less from the user's POV; we still need
        // a story_id in DB so all existing queries/KPI/Manday logic continues to work.
        let storyId = input.story_id
        if (!storyId) {
            const found = await pool.request()
                .input('projectId', sql.UniqueIdentifier, t.project_id)
                .query(`
                    SELECT TOP 1 id FROM pms.stories
                    WHERE project_id = @projectId AND is_active = 1 AND title = N'General'
                    ORDER BY sort_order
                `)
            if (found.recordset.length) {
                storyId = found.recordset[0].id
            } else {
                // Create a General story for this project. Code format follows other stories:
                // {project_code}-S-{n}. We just pick a high sort_order so it sinks to the bottom.
                const projRes = await pool.request()
                    .input('id', sql.UniqueIdentifier, t.project_id)
                    .query(`SELECT project_code FROM pms.projects WHERE id = @id`)
                const projectCode = projRes.recordset[0]?.project_code || 'GEN'
                const prefix = `${projectCode}-S-`
                const codeRes = await pool.request()
                    .input('projectId', sql.UniqueIdentifier, t.project_id)
                    .input('prefix', sql.NVarChar, `${prefix}%`)
                    .input('prefixLen', sql.Int, prefix.length)
                    .query(`
                        SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(story_code, @prefixLen + 1, LEN(story_code)) AS INT)), 0) + 1 AS n
                        FROM pms.stories
                        WHERE project_id = @projectId AND story_code LIKE @prefix
                    `)
                const storyCode = `${prefix}${String(codeRes.recordset[0].n).padStart(3, '0')}`
                const newStoryId = require('crypto').randomUUID()
                await pool.request()
                    .input('id', sql.UniqueIdentifier, newStoryId)
                    .input('projectId', sql.UniqueIdentifier, t.project_id)
                    .input('storyCode', sql.NVarChar, storyCode)
                    .input('createdBy', sql.UniqueIdentifier, user.id)
                    .query(`
                        INSERT INTO pms.stories (
                            id, project_id, story_code, title, priority, status,
                            sort_order, created_by, is_active, created_at, updated_at
                        ) VALUES (
                            @id, @projectId, @storyCode, N'General', 'medium', 'backlog',
                            9999, @createdBy, 1, GETDATE(), GETDATE()
                        )
                    `)
                storyId = newStoryId
            }
        }

        // 3) Strip HTML from the note → use as task title (default to "งานจาก tracking" if empty)
        const titleRaw = (t.note || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
        const title = titleRaw.slice(0, 250) || 'งานจาก tracking'

        // 3) Generate a unique task_code
        const { generateTaskCode } = await import('@/lib/utils/task-code-generator')
        const taskCode = await generateTaskCode(pool.request())

        // 4) Insert task — minimal fields. status = 'todo' so it appears in the assignee's backlog.
        const newId = require('crypto').randomUUID()
        const dueDate = t.entry_date instanceof Date
            ? `${t.entry_date.getFullYear()}-${String(t.entry_date.getMonth() + 1).padStart(2, '0')}-${String(t.entry_date.getDate()).padStart(2, '0')}`
            : t.entry_date

        await pool.request()
            .input('id', sql.UniqueIdentifier, newId)
            .input('taskCode', sql.NVarChar, taskCode)
            .input('storyId', sql.UniqueIdentifier, storyId)
            .input('title', sql.NVarChar, title)
            .input('taskType', sql.NVarChar, input.task_type)
            .input('assigneeId', sql.UniqueIdentifier, t.assignee_id || null)
            .input('reviewerId', sql.UniqueIdentifier, user.id)
            .input('priority', sql.NVarChar, input.priority)
            .input('estimatedHours', sql.Decimal(10, 2), input.estimated_hours ?? null)
            .input('dueDate', sql.Date, dueDate ? new Date(dueDate) : null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .input('isCountForKpi', sql.Bit, input.is_count_for_kpi !== false ? 1 : 0)
            .query(`
                INSERT INTO pms.tasks (
                    id, task_code, story_id, title, description, task_type,
                    assignee_id, reviewer_id, priority, estimated_hours, due_date,
                    created_by, status, is_active, is_count_for_kpi, created_at, updated_at
                )
                VALUES (
                    @id, @taskCode, @storyId, @title, NULL, @taskType,
                    @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate,
                    @createdBy, 'todo', 1, @isCountForKpi, GETDATE(), GETDATE()
                )
            `)

        // 5) Link back: set tracking_entry.task_id so the UI shows a "linked" badge
        await pool.request()
            .input('id', sql.UniqueIdentifier, input.trackingEntryId)
            .input('taskId', sql.UniqueIdentifier, newId)
            .query(`
                UPDATE pms.team_tracking_entries
                SET task_id = @taskId, updated_at = GETDATE()
                WHERE id = @id
            `)

        return { success: true, data: { task_id: newId, task_code: taskCode } }
    } catch (error) {
        console.error('createTaskFromTrackingEntry error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to convert' }
    }
}

// ============================================
// OVERDUE WORK — entries from earlier days that aren't marked DONE.
// Surfaces "งานค้าง" so PMs can chase up assignees before today's plan begins.
// ============================================
export interface OverdueEntry {
    id: string
    project_id: string
    project_code: string
    project_name: string
    entry_date: string
    assignee_id: string | null
    assignee_name: string
    /** Name of the user who created the entry — used in the popup so the PM can
     *  ask the original recorder for context. */
    created_by_name: string
    note: string
    status: TrackingStatus
    milestone_name: string | null
    milestone_color: string | null
    days_overdue: number
}

export async function getOverdueTrackingEntries(): Promise<{ success: true; data: OverdueEntry[] } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        const pool = await getConnection()
        // Today's local date as ISO yyyy-MM-dd (server time).
        const today = new Date()
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        const result = await pool.request()
            .input('today', sql.Date, todayIso)
            .query(`
                SELECT
                    t.id, t.project_id,
                    p.project_code, ISNULL(p.name_th, p.name) AS project_name,
                    t.entry_date,
                    t.assignee_id,
                    ISNULL(CONCAT(e.first_name_th, ' ', e.last_name_th), 'ไม่ระบุ') AS assignee_name,
                    ISNULL(CONCAT(cu.first_name_th, ' ', cu.last_name_th), 'ไม่ระบุ') AS created_by_name,
                    t.note,
                    t.status,
                    mc.name AS milestone_name,
                    mc.color AS milestone_color,
                    DATEDIFF(day, t.entry_date, @today) AS days_overdue
                FROM pms.team_tracking_entries t
                INNER JOIN pms.projects p ON p.id = t.project_id
                LEFT JOIN pms.employees e ON e.id = t.assignee_id
                LEFT JOIN pms.employees cu ON cu.id = t.created_by
                LEFT JOIN pms.project_milestones pm ON pm.id = t.milestone_id
                LEFT JOIN pms.milestone_configs mc ON mc.id = pm.milestone_config_id
                WHERE t.is_active = 1
                  AND t.entry_date < @today
                  AND t.status <> 'DONE'
                  AND NOT (t.status = 'POSTPONED' AND t.postponed_date >= @today)
                ORDER BY t.entry_date ASC, p.project_code, t.created_at
            `)

        const data: OverdueEntry[] = result.recordset.map((r: any) => ({
            id: r.id,
            project_id: r.project_id,
            project_code: r.project_code,
            project_name: r.project_name,
            entry_date: r.entry_date instanceof Date
                ? `${r.entry_date.getFullYear()}-${String(r.entry_date.getMonth() + 1).padStart(2, '0')}-${String(r.entry_date.getDate()).padStart(2, '0')}`
                : String(r.entry_date),
            assignee_id: r.assignee_id,
            assignee_name: r.assignee_name,
            created_by_name: r.created_by_name || 'ไม่ระบุ',
            note: r.note || '',
            status: r.status,
            milestone_name: r.milestone_name,
            milestone_color: r.milestone_color,
            days_overdue: r.days_overdue,
        }))
        return { success: true, data }
    } catch (error) {
        console.error('getOverdueTrackingEntries error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to load overdue entries' }
    }
}

// ============================================
// DELETE (soft)
// ============================================

export async function deleteTrackingEntry(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const request = pool.request()
        request.input('id', sql.UniqueIdentifier, id)
        request.input('updated_by', sql.UniqueIdentifier, user.id)

        await request.query(`
            UPDATE pms.team_tracking_entries
            SET is_active  = 0,
                updated_by = @updated_by,
                updated_at = GETDATE()
            WHERE id = @id
        `)

        return { success: true }
    } catch (error) {
        console.error('deleteTrackingEntry error:', error)
        return { success: false, error: 'Failed to delete entry' }
    }
}
