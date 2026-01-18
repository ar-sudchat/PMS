'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface Attachment {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    type?: string       // Alias for mimeType (for compatibility)
    uploadedAt?: string // Upload timestamp
}

// ============================================
// PROJECT ATTACHMENTS
// ============================================

export async function getProjectAttachments(projectId: string): Promise<{
    success: boolean
    data: Attachment[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if attachments column exists
        const columnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'attachments'
        `)

        if (columnCheck.recordset.length === 0) {
            return { success: true, data: [] }
        }

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`SELECT attachments FROM pms.projects WHERE id = @projectId`)

        if (result.recordset.length === 0) {
            return { success: false, data: [], error: 'Project not found' }
        }

        const attachmentsJson = result.recordset[0].attachments
        const attachments: Attachment[] = attachmentsJson ? JSON.parse(attachmentsJson) : []

        return { success: true, data: attachments }
    } catch (error: any) {
        console.error('getProjectAttachments error:', error)
        return { success: false, data: [], error: error.message }
    }
}

export async function updateProjectAttachments(projectId: string, attachments: Attachment[]): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if attachments column exists
        const columnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'attachments'
        `)

        if (columnCheck.recordset.length === 0) {
            return { success: false, error: 'Attachments column not found. Please run migration script.' }
        }

        await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(attachments))
            .query(`UPDATE pms.projects SET attachments = @attachments, updated_at = GETDATE() WHERE id = @projectId`)

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error: any) {
        console.error('updateProjectAttachments error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// TASK ATTACHMENTS
// ============================================

export async function getTaskAttachments(taskId: string): Promise<{
    success: boolean
    data: Attachment[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if attachments column exists
        const columnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
            AND COLUMN_NAME = 'attachments'
        `)

        if (columnCheck.recordset.length === 0) {
            return { success: true, data: [] }
        }

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`SELECT attachments FROM pms.tasks WHERE id = @taskId`)

        if (result.recordset.length === 0) {
            return { success: false, data: [], error: 'Task not found' }
        }

        const attachmentsJson = result.recordset[0].attachments
        const attachments: Attachment[] = attachmentsJson ? JSON.parse(attachmentsJson) : []

        return { success: true, data: attachments }
    } catch (error: any) {
        console.error('getTaskAttachments error:', error)
        return { success: false, data: [], error: error.message }
    }
}

export async function updateTaskAttachments(taskId: string, attachments: Attachment[]): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if attachments column exists
        const columnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
            AND COLUMN_NAME = 'attachments'
        `)

        if (columnCheck.recordset.length === 0) {
            return { success: false, error: 'Attachments column not found. Please run migration script.' }
        }

        // Get project_id for revalidation
        const taskResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT s.project_id
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.id = @taskId
            `)

        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(attachments))
            .query(`UPDATE pms.tasks SET attachments = @attachments, updated_at = GETDATE() WHERE id = @taskId`)

        if (taskResult.recordset[0]?.project_id) {
            revalidatePath(`/projects/${taskResult.recordset[0].project_id}`)
        }

        return { success: true }
    } catch (error: any) {
        console.error('updateTaskAttachments error:', error)
        return { success: false, error: error.message }
    }
}
