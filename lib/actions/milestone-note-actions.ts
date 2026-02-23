'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { MilestoneNote, MilestoneChangeLog } from '@/types/project'

// ==============================
// MILESTONE NOTES
// ==============================

/** Fetch notes for a project, optionally filtered by milestone */
export async function getMilestoneNotes(
    projectId: string,
    milestoneId?: string
): Promise<{ success: boolean; data: MilestoneNote[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()
        const request = pool.request().input('projectId', sql.UniqueIdentifier, projectId)

        let whereClause = 'mn.project_id = @projectId AND mn.is_active = 1'
        if (milestoneId) {
            request.input('milestoneId', sql.UniqueIdentifier, milestoneId)
            whereClause += ' AND mn.milestone_id = @milestoneId'
        }

        const result = await request.query(`
            SELECT
                mn.id, mn.project_id, mn.milestone_id, mn.note_type, mn.priority,
                mn.content, mn.resolved_at, mn.resolved_by, mn.is_active,
                mn.created_by, mn.created_at, mn.updated_at,
                e_created.first_name + ' ' + e_created.last_name AS created_by_name,
                e_resolved.first_name + ' ' + e_resolved.last_name AS resolved_by_name,
                ISNULL(pm.name, mc.name) AS milestone_name
            FROM pms.milestone_notes mn
            LEFT JOIN pms.employees e_created ON mn.created_by = e_created.id
            LEFT JOIN pms.employees e_resolved ON mn.resolved_by = e_resolved.id
            LEFT JOIN pms.project_milestones pm ON mn.milestone_id = pm.id
            LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            WHERE ${whereClause}
            ORDER BY mn.created_at DESC
        `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMilestoneNotes error:', error)
        return { success: false, data: [], error: error.message }
    }
}

/** Create a new milestone note */
export async function createMilestoneNote(data: {
    project_id: string
    milestone_id?: string | null
    note_type: 'NOTE' | 'ISSUE' | 'RESOLUTION'
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
    content: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.project_id)
            .input('milestone_id', sql.UniqueIdentifier, data.milestone_id || null)
            .input('note_type', sql.NVarChar(20), data.note_type || 'NOTE')
            .input('priority', sql.NVarChar(10), data.priority || 'NORMAL')
            .input('content', sql.NVarChar(sql.MAX), data.content)
            .input('created_by', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.milestone_notes
                    (project_id, milestone_id, note_type, priority, content, created_by)
                OUTPUT INSERTED.id
                VALUES (@project_id, @milestone_id, @note_type, @priority, @content, @created_by)
            `)

        revalidatePath('/projects')
        revalidatePath('/project-onhand')

        return { success: true, id: result.recordset[0]?.id }
    } catch (error: any) {
        console.error('createMilestoneNote error:', error)
        return { success: false, error: error.message }
    }
}

/** Update a milestone note */
export async function updateMilestoneNote(
    noteId: string,
    data: { content?: string; priority?: string; note_type?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const setClauses: string[] = ['updated_at = GETDATE()']
        const request = pool.request().input('noteId', sql.UniqueIdentifier, noteId)

        if (data.content !== undefined) {
            request.input('content', sql.NVarChar(sql.MAX), data.content)
            setClauses.push('content = @content')
        }
        if (data.priority !== undefined) {
            request.input('priority', sql.NVarChar(10), data.priority)
            setClauses.push('priority = @priority')
        }
        if (data.note_type !== undefined) {
            request.input('note_type', sql.NVarChar(20), data.note_type)
            setClauses.push('note_type = @note_type')
        }

        await request.query(`
            UPDATE pms.milestone_notes SET ${setClauses.join(', ')} WHERE id = @noteId
        `)

        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        console.error('updateMilestoneNote error:', error)
        return { success: false, error: error.message }
    }
}

/** Soft delete a milestone note */
export async function deleteMilestoneNote(noteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('noteId', sql.UniqueIdentifier, noteId)
            .query(`UPDATE pms.milestone_notes SET is_active = 0, updated_at = GETDATE() WHERE id = @noteId`)

        revalidatePath('/projects')
        revalidatePath('/project-onhand')
        return { success: true }
    } catch (error: any) {
        console.error('deleteMilestoneNote error:', error)
        return { success: false, error: error.message }
    }
}

/** Resolve an issue-type note */
export async function resolveMilestoneIssue(noteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('noteId', sql.UniqueIdentifier, noteId)
            .input('resolved_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.milestone_notes
                SET resolved_at = GETDATE(), resolved_by = @resolved_by, updated_at = GETDATE()
                WHERE id = @noteId AND note_type = 'ISSUE'
            `)

        revalidatePath('/projects')
        revalidatePath('/project-onhand')
        return { success: true }
    } catch (error: any) {
        console.error('resolveMilestoneIssue error:', error)
        return { success: false, error: error.message }
    }
}

// ==============================
// MILESTONE CHANGE LOGS
// ==============================

/** Fetch change logs for a specific milestone */
export async function getMilestoneChangeLogs(
    milestoneId: string
): Promise<{ success: boolean; data: MilestoneChangeLog[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT
                    cl.id, cl.project_id, cl.milestone_id, cl.change_type,
                    cl.old_value, cl.new_value, cl.reason,
                    cl.changed_by, cl.changed_at,
                    e.first_name + ' ' + e.last_name AS changed_by_name,
                    ISNULL(pm.name, mc.name) AS milestone_name
                FROM pms.milestone_change_logs cl
                LEFT JOIN pms.employees e ON cl.changed_by = e.id
                LEFT JOIN pms.project_milestones pm ON cl.milestone_id = pm.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE cl.milestone_id = @milestoneId
                ORDER BY cl.changed_at DESC
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMilestoneChangeLogs error:', error)
        return { success: false, data: [], error: error.message }
    }
}

/** Fetch all change logs for a project */
export async function getProjectChangeLogs(
    projectId: string
): Promise<{ success: boolean; data: MilestoneChangeLog[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    cl.id, cl.project_id, cl.milestone_id, cl.change_type,
                    cl.old_value, cl.new_value, cl.reason,
                    cl.changed_by, cl.changed_at,
                    e.first_name + ' ' + e.last_name AS changed_by_name,
                    ISNULL(pm.name, mc.name) AS milestone_name
                FROM pms.milestone_change_logs cl
                LEFT JOIN pms.employees e ON cl.changed_by = e.id
                LEFT JOIN pms.project_milestones pm ON cl.milestone_id = pm.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE cl.project_id = @projectId
                ORDER BY cl.changed_at DESC
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getProjectChangeLogs error:', error)
        return { success: false, data: [], error: error.message }
    }
}
