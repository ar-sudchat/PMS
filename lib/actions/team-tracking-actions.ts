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
    entry_date: string          // ISO yyyy-MM-dd
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
    created_by: string
    created_at: string
    updated_at: string
}

export interface CreateTrackingEntryInput {
    project_id: string
    entry_date: string
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
                        t.created_by,
                        CONVERT(varchar(19), t.created_at, 126) AS created_at,
                        CONVERT(varchar(19), t.updated_at, 126) AS updated_at
                    FROM pms.team_tracking_entries t
                    LEFT JOIN pms.employees e         ON t.assignee_id  = e.id
                    LEFT JOIN pms.project_milestones pm ON t.milestone_id = pm.id
                    LEFT JOIN pms.milestone_configs mc   ON pm.milestone_config_id = mc.id
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
        request.input('entry_date', sql.Date, input.entry_date)
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
