'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Types
export interface ChecklistItem {
    id: string
    task_id: string
    title: string
    is_completed: boolean
    completed_at: string | null
    completed_by: string | null
    completed_by_name?: string
    sort_order: number
    created_at: string
}

export interface CreateChecklistItemInput {
    title: string
    sort_order: number
}

// ============================================
// GET CHECKLIST ITEMS FOR TASK
// ============================================
export async function getChecklistItems(taskId: string): Promise<ChecklistItem[]> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT
                    c.id,
                    c.task_id,
                    c.title,
                    c.is_completed,
                    c.completed_at,
                    c.completed_by,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS completed_by_name,
                    c.sort_order,
                    c.created_at
                FROM pms.task_checklist_items c
                LEFT JOIN pms.employees e ON c.completed_by = e.id
                WHERE c.task_id = @taskId
                ORDER BY c.sort_order ASC
            `)

        return result.recordset
    } catch (error) {
        console.error('Error fetching checklist items:', error)
        return []
    }
}

// ============================================
// CREATE CHECKLIST ITEM
// ============================================
export async function createChecklistItem(
    taskId: string,
    title: string,
    sortOrder?: number
): Promise<{ success: boolean; item?: ChecklistItem; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // Get max sort_order if not provided
        let order = sortOrder
        if (order === undefined) {
            const maxResult = await pool.request()
                .input('taskId', sql.UniqueIdentifier, taskId)
                .query(`
                    SELECT ISNULL(MAX(sort_order), -1) + 1 AS next_order
                    FROM pms.task_checklist_items
                    WHERE task_id = @taskId
                `)
            order = maxResult.recordset[0].next_order
        }

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .input('title', sql.NVarChar, title)
            .input('sortOrder', sql.Int, order)
            .query(`
                INSERT INTO pms.task_checklist_items (task_id, title, sort_order)
                OUTPUT INSERTED.*
                VALUES (@taskId, @title, @sortOrder)
            `)

        revalidatePath('/my-tasks')

        return { success: true, item: result.recordset[0] }
    } catch (error) {
        console.error('Error creating checklist item:', error)
        return { success: false, error: 'Failed to create checklist item' }
    }
}

// ============================================
// CREATE MULTIPLE CHECKLIST ITEMS (for task creation)
// ============================================
export async function createChecklistItems(
    taskId: string,
    items: CreateChecklistItemInput[]
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!items || items.length === 0) return { success: true }

    try {
        const pool = await getConnection()

        for (const item of items) {
            await pool.request()
                .input('taskId', sql.UniqueIdentifier, taskId)
                .input('title', sql.NVarChar, item.title)
                .input('sortOrder', sql.Int, item.sort_order)
                .query(`
                    INSERT INTO pms.task_checklist_items (task_id, title, sort_order)
                    VALUES (@taskId, @title, @sortOrder)
                `)
        }

        return { success: true }
    } catch (error) {
        console.error('Error creating checklist items:', error)
        return { success: false, error: 'Failed to create checklist items' }
    }
}

// ============================================
// TOGGLE CHECKLIST ITEM (mark complete/incomplete)
// ============================================
export async function toggleChecklistItem(
    itemId: string,
    isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        if (isCompleted) {
            // Mark as completed
            await pool.request()
                .input('itemId', sql.UniqueIdentifier, itemId)
                .input('completedBy', sql.UniqueIdentifier, user.id)
                .query(`
                    UPDATE pms.task_checklist_items
                    SET is_completed = 1,
                        completed_at = GETDATE(),
                        completed_by = @completedBy,
                        updated_at = GETDATE()
                    WHERE id = @itemId
                `)
        } else {
            // Mark as incomplete
            await pool.request()
                .input('itemId', sql.UniqueIdentifier, itemId)
                .query(`
                    UPDATE pms.task_checklist_items
                    SET is_completed = 0,
                        completed_at = NULL,
                        completed_by = NULL,
                        updated_at = GETDATE()
                    WHERE id = @itemId
                `)
        }

        revalidatePath('/my-tasks')

        return { success: true }
    } catch (error) {
        console.error('Error toggling checklist item:', error)
        return { success: false, error: 'Failed to update checklist item' }
    }
}

// ============================================
// UPDATE CHECKLIST ITEM TITLE
// ============================================
export async function updateChecklistItem(
    itemId: string,
    title: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        await pool.request()
            .input('itemId', sql.UniqueIdentifier, itemId)
            .input('title', sql.NVarChar, title)
            .query(`
                UPDATE pms.task_checklist_items
                SET title = @title, updated_at = GETDATE()
                WHERE id = @itemId
            `)

        revalidatePath('/my-tasks')

        return { success: true }
    } catch (error) {
        console.error('Error updating checklist item:', error)
        return { success: false, error: 'Failed to update checklist item' }
    }
}

// ============================================
// DELETE CHECKLIST ITEM
// ============================================
export async function deleteChecklistItem(
    itemId: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        await pool.request()
            .input('itemId', sql.UniqueIdentifier, itemId)
            .query(`DELETE FROM pms.task_checklist_items WHERE id = @itemId`)

        revalidatePath('/my-tasks')

        return { success: true }
    } catch (error) {
        console.error('Error deleting checklist item:', error)
        return { success: false, error: 'Failed to delete checklist item' }
    }
}

// ============================================
// REORDER CHECKLIST ITEMS
// ============================================
export async function reorderChecklistItems(
    taskId: string,
    itemIds: string[]
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        for (let i = 0; i < itemIds.length; i++) {
            await pool.request()
                .input('itemId', sql.UniqueIdentifier, itemIds[i])
                .input('sortOrder', sql.Int, i)
                .query(`
                    UPDATE pms.task_checklist_items
                    SET sort_order = @sortOrder, updated_at = GETDATE()
                    WHERE id = @itemId
                `)
        }

        return { success: true }
    } catch (error) {
        console.error('Error reordering checklist items:', error)
        return { success: false, error: 'Failed to reorder checklist items' }
    }
}

// ============================================
// GET CHECKLIST SUMMARY FOR TASK
// ============================================
export async function getChecklistSummary(taskId: string): Promise<{
    total: number
    completed: number
    progress: number
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed
                FROM pms.task_checklist_items
                WHERE task_id = @taskId
            `)

        const { total, completed } = result.recordset[0]
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0

        return { total, completed, progress }
    } catch (error) {
        console.error('Error fetching checklist summary:', error)
        return { total: 0, completed: 0, progress: 0 }
    }
}
