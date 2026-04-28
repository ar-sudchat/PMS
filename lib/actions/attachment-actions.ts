'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { moveFile, deleteFile } from '@/lib/services/file-service'

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
// COLUMN EXISTENCE CACHE
// ============================================
// Once a migration has added the `attachments` column, the answer never changes
// during a process lifetime. Cache the lookup so we don't run a metadata query
// on every read/write.

const columnExistsCache = new Map<string, boolean>()

async function attachmentsColumnExists(table: 'projects' | 'tasks'): Promise<boolean> {
    const cached = columnExistsCache.get(table)
    if (cached !== undefined) return cached

    const pool = await getConnection()
    const result = await pool.request()
        .input('table', sql.NVarChar, table)
        .query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = @table
            AND COLUMN_NAME = 'attachments'
        `)
    const exists = result.recordset.length > 0
    columnExistsCache.set(table, exists)
    return exists
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

        if (!(await attachmentsColumnExists('projects'))) {
            return { success: true, data: [] }
        }

        const pool = await getConnection()
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

        if (!(await attachmentsColumnExists('projects'))) {
            return { success: false, error: 'Attachments column not found. Please run migration script.' }
        }

        const pool = await getConnection()

        // If any attachments still live in a `projects/temp-*` folder, relocate
        // them under the permanent `projects/{project_code}/` folder before persisting.
        const codeResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`SELECT project_code FROM pms.projects WHERE id = @projectId`)
        const projectCode = codeResult.recordset[0]?.project_code as string | undefined
        const finalAttachments = projectCode
            ? await relocateAttachmentsToFolder(attachments, `projects/${projectCode}`, 'projects/temp-')
            : attachments

        await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(finalAttachments))
            .query(`UPDATE pms.projects SET attachments = @attachments, updated_at = GETDATE() WHERE id = @projectId`)

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error: any) {
        console.error('updateProjectAttachments error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// RELOCATE / DISCARD HELPERS
// ============================================

async function relocateAttachmentsToFolder(
    attachments: Attachment[],
    targetFolder: string,
    tempPrefix: string
): Promise<Attachment[]> {
    const result: Attachment[] = []
    for (const att of attachments) {
        if (!att.path?.startsWith(tempPrefix)) {
            result.push(att)
            continue
        }
        const filename = att.path.split('/').pop() || ''
        const destPath = `${targetFolder}/${filename}`
        const moveResult = await moveFile(att.path, destPath)
        if (moveResult.success) {
            result.push({ ...att, path: destPath })
        } else {
            console.error('relocateAttachmentsToFolder: move failed', att.path, moveResult.error)
            result.push(att)
        }
    }
    return result
}

/**
 * Delete files left behind in `projects/temp-*` when the user cancels create-project.
 */
export async function discardTempProjectAttachments(paths: string[]) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    for (const p of paths) {
        if (typeof p === 'string' && p.startsWith('projects/temp-')) {
            try {
                await deleteFile(p)
            } catch (error) {
                console.error('discardTempProjectAttachments: delete failed', p, error)
            }
        }
    }
    return { success: true }
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

        if (!(await attachmentsColumnExists('tasks'))) {
            return { success: true, data: [] }
        }

        const pool = await getConnection()
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

        if (!(await attachmentsColumnExists('tasks'))) {
            return { success: false, error: 'Attachments column not found. Please run migration script.' }
        }

        const pool = await getConnection()
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
