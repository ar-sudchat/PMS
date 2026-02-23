'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface ProjectGroup {
    id: string
    parent_id: string | null
    code: string
    name: string
    name_th: string | null
    description: string | null
    color: string | null
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string | null
    // Computed fields
    children?: ProjectGroup[]
    project_count?: number
}

export interface ProjectGroupTree extends ProjectGroup {
    children: ProjectGroupTree[]
}

// ============================================
// Read Operations
// ============================================

export async function getProjectGroups(includeInactive: boolean = false): Promise<{
    success: boolean
    data?: ProjectGroup[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                g.id, g.parent_id, g.code, g.name, g.name_th,
                g.description, g.color, g.sort_order, g.is_active,
                g.created_at, g.updated_at,
                (SELECT COUNT(*) FROM pms.projects p WHERE p.project_group_id = g.id) as project_count
            FROM pms.project_groups g
            ${includeInactive ? '' : 'WHERE g.is_active = 1'}
            ORDER BY g.sort_order, g.name
        `)

        return { success: true, data: result.recordset as ProjectGroup[] }
    } catch (error: any) {
        console.error('getProjectGroups error:', error)
        return { success: false, error: error.message }
    }
}

export async function getProjectGroupTree(includeInactive: boolean = false): Promise<{
    success: boolean
    data?: ProjectGroupTree[]
    error?: string
}> {
    try {
        const result = await getProjectGroups(includeInactive)
        if (!result.success || !result.data) return result as any

        // Build tree: top-level groups with children
        const groups = result.data
        const topLevel = groups.filter(g => g.parent_id === null)
        const tree: ProjectGroupTree[] = topLevel.map(group => ({
            ...group,
            children: groups
                .filter(g => g.parent_id === group.id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(child => ({ ...child, children: [] }))
        }))

        return { success: true, data: tree }
    } catch (error: any) {
        console.error('getProjectGroupTree error:', error)
        return { success: false, error: error.message }
    }
}

export async function getProjectGroup(id: string): Promise<{
    success: boolean
    data?: ProjectGroup
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT
                    g.id, g.parent_id, g.code, g.name, g.name_th,
                    g.description, g.color, g.sort_order, g.is_active,
                    g.created_at, g.updated_at,
                    (SELECT COUNT(*) FROM pms.projects p WHERE p.project_group_id = g.id) as project_count
                FROM pms.project_groups g
                WHERE g.id = @id
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Project group not found' }
        }

        return { success: true, data: result.recordset[0] as ProjectGroup }
    } catch (error: any) {
        console.error('getProjectGroup error:', error)
        return { success: false, error: error.message }
    }
}

// Get only top-level groups (for parent_id selection dropdown)
export async function getTopLevelGroups(): Promise<{
    success: boolean
    data?: ProjectGroup[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT id, parent_id, code, name, name_th, description, color,
                   sort_order, is_active, created_at, updated_at
            FROM pms.project_groups
            WHERE parent_id IS NULL AND is_active = 1
            ORDER BY sort_order, name
        `)

        return { success: true, data: result.recordset as ProjectGroup[] }
    } catch (error: any) {
        console.error('getTopLevelGroups error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Create
// ============================================

export async function createProjectGroup(data: {
    parent_id?: string | null
    code: string
    name: string
    name_th?: string
    description?: string
    color?: string
    is_active?: boolean
    sort_order?: number
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()

        // Check duplicate code
        const existing = await pool.request()
            .input('code', sql.NVarChar, data.code.toUpperCase())
            .query('SELECT id FROM pms.project_groups WHERE code = @code')

        if (existing.recordset.length > 0) {
            return { success: false, error: `รหัส "${data.code}" มีอยู่แล้ว` }
        }

        // Auto sort_order
        let sortOrder = data.sort_order
        if (sortOrder === undefined) {
            const parentFilter = data.parent_id
                ? `WHERE parent_id = '${data.parent_id}'`
                : 'WHERE parent_id IS NULL'
            const maxResult = await pool.request()
                .query(`SELECT ISNULL(MAX(sort_order), 0) as max_order FROM pms.project_groups ${parentFilter}`)
            sortOrder = maxResult.recordset[0].max_order + 1
        }

        const result = await pool.request()
            .input('parent_id', sql.UniqueIdentifier, data.parent_id || null)
            .input('code', sql.NVarChar, data.code.toUpperCase())
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('description', sql.NVarChar, data.description || null)
            .input('color', sql.NVarChar, data.color || '#3B82F6')
            .input('is_active', sql.Bit, data.is_active !== false)
            .input('sort_order', sql.Int, sortOrder)
            .query(`
                INSERT INTO pms.project_groups (parent_id, code, name, name_th, description, color, is_active, sort_order)
                OUTPUT INSERTED.id
                VALUES (@parent_id, @code, @name, @name_th, @description, @color, @is_active, @sort_order)
            `)

        revalidatePath('/projects/settings/project-groups')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('createProjectGroup error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Update
// ============================================

export async function updateProjectGroup(id: string, data: {
    parent_id?: string | null
    code?: string
    name?: string
    name_th?: string
    description?: string
    color?: string
    is_active?: boolean
    sort_order?: number
}): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Check duplicate code (excluding self)
        if (data.code) {
            const existing = await pool.request()
                .input('code', sql.NVarChar, data.code.toUpperCase())
                .input('id', sql.UniqueIdentifier, id)
                .query('SELECT id FROM pms.project_groups WHERE code = @code AND id != @id')

            if (existing.recordset.length > 0) {
                return { success: false, error: `รหัส "${data.code}" มีอยู่แล้ว` }
            }
        }

        // Build dynamic update
        const updates: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

        if (data.parent_id !== undefined) {
            updates.push('parent_id = @parent_id')
            request.input('parent_id', sql.UniqueIdentifier, data.parent_id || null)
        }
        if (data.code !== undefined) {
            updates.push('code = @code')
            request.input('code', sql.NVarChar, data.code.toUpperCase())
        }
        if (data.name !== undefined) {
            updates.push('name = @name')
            request.input('name', sql.NVarChar, data.name)
        }
        if (data.name_th !== undefined) {
            updates.push('name_th = @name_th')
            request.input('name_th', sql.NVarChar, data.name_th || null)
        }
        if (data.description !== undefined) {
            updates.push('description = @description')
            request.input('description', sql.NVarChar, data.description || null)
        }
        if (data.color !== undefined) {
            updates.push('color = @color')
            request.input('color', sql.NVarChar, data.color)
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = @is_active')
            request.input('is_active', sql.Bit, data.is_active)
        }
        if (data.sort_order !== undefined) {
            updates.push('sort_order = @sort_order')
            request.input('sort_order', sql.Int, data.sort_order)
        }

        updates.push('updated_at = GETDATE()')

        if (updates.length === 1) {
            return { success: true }
        }

        await request.query(`
            UPDATE pms.project_groups
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/projects/settings/project-groups')
        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        console.error('updateProjectGroup error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Delete
// ============================================

export async function deleteProjectGroup(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Check if used in projects
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM pms.projects WHERE project_group_id = @id')

        if (usageCheck.recordset[0].count > 0) {
            return {
                success: false,
                error: `ไม่สามารถลบได้: ใช้ในโครงการ ${usageCheck.recordset[0].count} โครงการ กรุณาปิดใช้งานแทน`
            }
        }

        // Check if has children
        const childCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM pms.project_groups WHERE parent_id = @id')

        if (childCheck.recordset[0].count > 0) {
            return {
                success: false,
                error: `ไม่สามารถลบได้: มี Sub Group ${childCheck.recordset[0].count} รายการ กรุณาลบ Sub Group ก่อน`
            }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.project_groups WHERE id = @id')

        revalidatePath('/projects/settings/project-groups')
        return { success: true }
    } catch (error: any) {
        console.error('deleteProjectGroup error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Toggle Active
// ============================================

export async function toggleProjectGroupActive(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.project_groups
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/project-groups')
        return { success: true }
    } catch (error: any) {
        console.error('toggleProjectGroupActive error:', error)
        return { success: false, error: error.message }
    }
}
