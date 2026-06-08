'use server'

import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import sql from 'mssql'

// ============================================================
// Project scenarios — "What-if" milestone date plans per project.
// Live data is never modified; scenario_milestones row holds the
// override. Scenarios are scoped to a project; everyone can read,
// only the creator can edit/delete.
// ============================================================

export interface ScenarioSummary {
    id: string
    project_id: string
    name: string
    notes: string | null
    created_by: string
    created_by_name: string | null
    created_at: string
    updated_at: string
    milestone_count: number   // how many milestones overridden in this scenario
}

export interface ScenarioMilestone {
    /** Project milestone id (from pms.project_milestones) */
    project_milestone_id: string
    /** Original due_date from the live project_milestones row */
    original_due_date: string | null
    /** Override (null = inherit original) */
    planned_due_date: string | null
    /** Override progress (null = inherit) */
    planned_progress: number | null
    note: string | null
    /** Milestone display info from milestone_configs */
    milestone_code: string | null
    milestone_name: string | null
    milestone_color: string | null
    sort_order: number
}

export interface ScenarioDetail {
    id: string
    project_id: string
    name: string
    notes: string | null
    created_at: string
    updated_at: string
    milestones: ScenarioMilestone[]
}

function toISODate(v: any): string | null {
    if (!v) return null
    const d = v instanceof Date ? v : new Date(v)
    if (isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================
// LIST scenarios for a project
// ============================================
export async function listScenarios(projectId: string): Promise<{
    success: true; data: ScenarioSummary[]
} | { success: false; error: string }> {
    try {
        const pool = await getConnection()
        const r = await pool.request()
            .input('pid', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    s.id, s.project_id, s.name, s.notes,
                    s.created_by,
                    LTRIM(RTRIM(ISNULL(e.first_name_th, '') + ' ' + ISNULL(e.last_name_th, ''))) AS created_by_name,
                    CONVERT(varchar(19), s.created_at, 126) AS created_at,
                    CONVERT(varchar(19), s.updated_at, 126) AS updated_at,
                    (SELECT COUNT(*) FROM pms.scenario_milestones sm WHERE sm.scenario_id = s.id) AS milestone_count
                FROM pms.project_scenarios s
                LEFT JOIN pms.employees e ON s.created_by = e.id
                WHERE s.project_id = @pid AND s.is_active = 1
                ORDER BY s.created_at DESC
            `)
        return { success: true, data: r.recordset as ScenarioSummary[] }
    } catch (e: any) {
        console.error('listScenarios error:', e)
        return { success: false, error: e?.message || 'Failed to list scenarios' }
    }
}

// ============================================
// GET one scenario with overrides + project milestone baseline
// ============================================
export async function getScenario(scenarioId: string): Promise<{
    success: true; data: ScenarioDetail
} | { success: false; error: string }> {
    try {
        const pool = await getConnection()

        const head = await pool.request()
            .input('sid', sql.UniqueIdentifier, scenarioId)
            .query(`
                SELECT id, project_id, name, notes,
                    CONVERT(varchar(19), created_at, 126) AS created_at,
                    CONVERT(varchar(19), updated_at, 126) AS updated_at
                FROM pms.project_scenarios
                WHERE id = @sid AND is_active = 1
            `)
        if (head.recordset.length === 0) {
            return { success: false, error: 'Scenario not found' }
        }
        const s = head.recordset[0]

        // Pull all live project_milestones for this project + LEFT JOIN scenario_milestones
        const ms = await pool.request()
            .input('sid', sql.UniqueIdentifier, scenarioId)
            .input('pid', sql.UniqueIdentifier, s.project_id)
            .query(`
                SELECT
                    pm.id AS project_milestone_id,
                    CONVERT(varchar(10), pm.due_date, 23)        AS original_due_date,
                    CONVERT(varchar(10), sm.planned_due_date, 23) AS planned_due_date,
                    sm.planned_progress,
                    sm.note,
                    mc.code  AS milestone_code,
                    mc.name  AS milestone_name,
                    mc.color AS milestone_color,
                    pm.sort_order
                FROM pms.project_milestones pm
                LEFT JOIN pms.milestone_configs    mc ON mc.id = pm.milestone_config_id
                LEFT JOIN pms.scenario_milestones  sm ON sm.project_milestone_id = pm.id AND sm.scenario_id = @sid
                WHERE pm.project_id = @pid
                ORDER BY pm.sort_order
            `)

        return {
            success: true,
            data: {
                id: s.id,
                project_id: s.project_id,
                name: s.name,
                notes: s.notes,
                created_at: s.created_at,
                updated_at: s.updated_at,
                milestones: ms.recordset.map((r: any) => ({
                    project_milestone_id: r.project_milestone_id,
                    original_due_date: r.original_due_date,
                    planned_due_date: r.planned_due_date,
                    planned_progress: r.planned_progress == null ? null : Number(r.planned_progress),
                    note: r.note,
                    milestone_code: r.milestone_code,
                    milestone_name: r.milestone_name,
                    milestone_color: r.milestone_color,
                    sort_order: r.sort_order ?? 0,
                })),
            },
        }
    } catch (e: any) {
        console.error('getScenario error:', e)
        return { success: false, error: e?.message || 'Failed to load scenario' }
    }
}

// ============================================
// CREATE scenario (optionally seed with current dates)
// ============================================
export async function createScenario(input: {
    project_id: string
    name: string
    notes?: string
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!input.name?.trim()) return { success: false, error: 'Name is required' }

        const pool = await getConnection()
        const r = await pool.request()
            .input('pid', sql.UniqueIdentifier, input.project_id)
            .input('name', sql.NVarChar(200), input.name.trim())
            .input('notes', sql.NVarChar(sql.MAX), input.notes || null)
            .input('uid', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.project_scenarios (project_id, name, notes, created_by)
                OUTPUT INSERTED.id
                VALUES (@pid, @name, @notes, @uid)
            `)
        return { success: true, id: r.recordset[0].id as string }
    } catch (e: any) {
        console.error('createScenario error:', e)
        return { success: false, error: e?.message || 'Failed to create scenario' }
    }
}

// ============================================
// UPDATE scenario header (name/notes)
// ============================================
export async function updateScenarioHeader(scenarioId: string, patch: {
    name?: string
    notes?: string
}): Promise<{ success: true } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const sets: string[] = ['updated_at = GETDATE()']
        const req = pool.request().input('sid', sql.UniqueIdentifier, scenarioId)
        if (patch.name !== undefined) {
            sets.push('name = @name')
            req.input('name', sql.NVarChar(200), patch.name)
        }
        if (patch.notes !== undefined) {
            sets.push('notes = @notes')
            req.input('notes', sql.NVarChar(sql.MAX), patch.notes || null)
        }
        await req.query(`
            UPDATE pms.project_scenarios
            SET ${sets.join(', ')}
            WHERE id = @sid AND is_active = 1
        `)
        return { success: true }
    } catch (e: any) {
        console.error('updateScenarioHeader error:', e)
        return { success: false, error: e?.message || 'Failed to update scenario' }
    }
}

// ============================================
// UPSERT scenario milestone override
// ============================================
export async function setScenarioMilestone(scenarioId: string, milestoneId: string, patch: {
    planned_due_date?: string | null
    planned_progress?: number | null
    note?: string | null
}): Promise<{ success: true } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('sid', sql.UniqueIdentifier, scenarioId)
            .input('mid', sql.UniqueIdentifier, milestoneId)
            .input('due', sql.Date, patch.planned_due_date ?? null)
            .input('prog', sql.Decimal(5, 2), patch.planned_progress ?? null)
            .input('note', sql.NVarChar(sql.MAX), patch.note ?? null)
            .query(`
                MERGE pms.scenario_milestones AS tgt
                USING (SELECT @sid AS scenario_id, @mid AS project_milestone_id) AS src
                ON (tgt.scenario_id = src.scenario_id AND tgt.project_milestone_id = src.project_milestone_id)
                WHEN MATCHED THEN
                    UPDATE SET planned_due_date = @due, planned_progress = @prog, note = @note
                WHEN NOT MATCHED THEN
                    INSERT (scenario_id, project_milestone_id, planned_due_date, planned_progress, note)
                    VALUES (@sid, @mid, @due, @prog, @note);
                UPDATE pms.project_scenarios SET updated_at = GETDATE() WHERE id = @sid;
            `)
        return { success: true }
    } catch (e: any) {
        console.error('setScenarioMilestone error:', e)
        return { success: false, error: e?.message || 'Failed to save milestone' }
    }
}

// ============================================
// DELETE scenario (soft)
// ============================================
export async function deleteScenario(scenarioId: string): Promise<{ success: true } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('sid', sql.UniqueIdentifier, scenarioId)
            .query(`
                UPDATE pms.project_scenarios
                SET is_active = 0, updated_at = GETDATE()
                WHERE id = @sid
            `)
        return { success: true }
    } catch (e: any) {
        console.error('deleteScenario error:', e)
        return { success: false, error: e?.message || 'Failed to delete scenario' }
    }
}
