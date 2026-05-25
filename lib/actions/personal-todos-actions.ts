'use server'

import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import sql from 'mssql'

// ============================================================
// Personal todos — private per-user items that show up in the
// Gantt Overview > ToDo tab alongside team_tracking entries.
// They are NOT tied to a project. Only the owner ever sees them.
// ============================================================

export interface PersonalTodo {
    id: string
    owner_id: string
    title: string
    due_date: string | null
    status: 'PLANNED' | 'DONE' | string
    completed_date: string | null
    color: string | null
    icon: string | null
    created_at: string
    updated_at: string
}

function todayISO(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================
// CREATE
// ============================================

export async function createPersonalTodo(input: {
    title: string
    due_date?: string | null
    color?: string | null
    icon?: string | null
}) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false as const, error: 'Unauthorized' }
        if (!input.title?.trim()) return { success: false as const, error: 'Title is required' }

        const pool = await getConnection()
        const r = await pool.request()
            .input('owner_id', sql.UniqueIdentifier, user.id)
            .input('title', sql.NVarChar(sql.MAX), input.title)
            .input('due_date', sql.Date, input.due_date || null)
            .input('color', sql.NVarChar(50), input.color || null)
            .input('icon', sql.NVarChar(50), input.icon || null)
            .query(`
                INSERT INTO pms.personal_todos (owner_id, title, due_date, color, icon)
                OUTPUT INSERTED.id
                VALUES (@owner_id, @title, @due_date, @color, @icon)
            `)
        return { success: true as const, id: r.recordset[0].id as string }
    } catch (e: any) {
        console.error('createPersonalTodo error:', e)
        return { success: false as const, error: e?.message || 'Failed to create personal todo' }
    }
}

// ============================================
// UPDATE
// ============================================

export async function updatePersonalTodo(id: string, patch: {
    title?: string
    due_date?: string | null
    color?: string | null
    icon?: string | null
}) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false as const, error: 'Unauthorized' }

        const pool = await getConnection()
        // Build SET clause from provided fields only — avoid wiping unset ones
        const sets: string[] = ['updated_at = GETDATE()']
        const req = pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('owner_id', sql.UniqueIdentifier, user.id)

        if (patch.title !== undefined) {
            sets.push('title = @title')
            req.input('title', sql.NVarChar(sql.MAX), patch.title)
        }
        if (patch.due_date !== undefined) {
            sets.push('due_date = @due_date')
            req.input('due_date', sql.Date, patch.due_date || null)
        }
        if (patch.color !== undefined) {
            sets.push('color = @color')
            req.input('color', sql.NVarChar(50), patch.color || null)
        }
        if (patch.icon !== undefined) {
            sets.push('icon = @icon')
            req.input('icon', sql.NVarChar(50), patch.icon || null)
        }

        await req.query(`
            UPDATE pms.personal_todos
            SET ${sets.join(', ')}
            WHERE id = @id AND owner_id = @owner_id AND is_active = 1
        `)
        return { success: true as const }
    } catch (e: any) {
        console.error('updatePersonalTodo error:', e)
        return { success: false as const, error: e?.message || 'Failed to update personal todo' }
    }
}

// ============================================
// MARK DONE
// ============================================

export async function markPersonalTodoDone(id: string, completedDate?: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false as const, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('owner_id', sql.UniqueIdentifier, user.id)
            .input('completed_date', sql.Date, completedDate || todayISO())
            .query(`
                UPDATE pms.personal_todos
                SET status = 'DONE', completed_date = @completed_date, updated_at = GETDATE()
                WHERE id = @id AND owner_id = @owner_id AND is_active = 1
            `)
        return { success: true as const }
    } catch (e: any) {
        console.error('markPersonalTodoDone error:', e)
        return { success: false as const, error: e?.message || 'Failed to mark personal todo as done' }
    }
}

// ============================================
// DELETE (soft)
// ============================================

export async function deletePersonalTodo(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false as const, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('owner_id', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.personal_todos
                SET is_active = 0, updated_at = GETDATE()
                WHERE id = @id AND owner_id = @owner_id
            `)
        return { success: true as const }
    } catch (e: any) {
        console.error('deletePersonalTodo error:', e)
        return { success: false as const, error: e?.message || 'Failed to delete personal todo' }
    }
}

// ============================================
// LIST (for current user — privacy is enforced at the WHERE clause)
// ============================================

export async function getMyPersonalTodos(filters?: {
    dateFilter?: string         // effective date filter
    includeDone?: boolean       // default false
}): Promise<{ success: true; data: PersonalTodo[] } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false as const, error: 'Unauthorized' }

        const pool = await getConnection()
        let where = `owner_id = @owner_id AND is_active = 1`
        if (!filters?.includeDone) where += ` AND status <> 'DONE'`

        const req = pool.request().input('owner_id', sql.UniqueIdentifier, user.id)
        if (filters?.dateFilter) {
            req.input('dateFilter', sql.Date, filters.dateFilter)
            where += ` AND (
                (status = 'DONE'    AND completed_date = @dateFilter) OR
                (status <> 'DONE'   AND due_date = @dateFilter)
            )`
        }

        const r = await req.query(`
            SELECT
                id, owner_id, title, status,
                CONVERT(varchar(10), due_date,       23) AS due_date,
                CONVERT(varchar(10), completed_date, 23) AS completed_date,
                color, icon,
                CONVERT(varchar(19), created_at, 126) AS created_at,
                CONVERT(varchar(19), updated_at, 126) AS updated_at
            FROM pms.personal_todos
            WHERE ${where}
            ORDER BY ISNULL(due_date, '9999-12-31') ASC, created_at DESC
        `)
        return { success: true as const, data: r.recordset as PersonalTodo[] }
    } catch (e: any) {
        console.error('getMyPersonalTodos error:', e)
        return { success: false as const, error: e?.message || 'Failed to load personal todos' }
    }
}

// ============================================
// Return the current user's identity (so the ToDo view can know
// whose bucket to inject personal todos into).
// ============================================
export async function getCurrentUserIdentity() {
    const user = await getCurrentUser()
    if (!user) return { success: false as const, error: 'Unauthorized' }
    return {
        success: true as const,
        data: { id: user.id, name: user.name },
    }
}
