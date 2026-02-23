'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface ChanceConfig {
    id: string
    code: string
    name: string
    name_th: string | null
    description: string | null
    percentage: number
    color: string
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string | null
    // Computed
    project_count?: number
}

// ============================================
// Read Operations
// ============================================

export async function getChanceConfigs(includeInactive: boolean = false): Promise<{
    success: boolean
    data?: ChanceConfig[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                c.id, c.code, c.name, c.name_th, c.description,
                c.percentage, c.color, c.sort_order, c.is_active,
                c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM pms.projects p WHERE p.chance_id = c.id) as project_count
            FROM pms.chance_configs c
            ${includeInactive ? '' : 'WHERE c.is_active = 1'}
            ORDER BY c.sort_order, c.name
        `)

        return { success: true, data: result.recordset as ChanceConfig[] }
    } catch (error: any) {
        console.error('getChanceConfigs error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Create
// ============================================

export async function createChanceConfig(data: {
    code: string
    name: string
    name_th?: string
    description?: string
    percentage: number
    color?: string
    is_active?: boolean
    sort_order?: number
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()

        // Check duplicate code
        const existing = await pool.request()
            .input('code', sql.NVarChar, data.code.toUpperCase())
            .query('SELECT id FROM pms.chance_configs WHERE code = @code')

        if (existing.recordset.length > 0) {
            return { success: false, error: `รหัส "${data.code}" มีอยู่แล้ว` }
        }

        // Auto sort_order
        let sortOrder = data.sort_order
        if (sortOrder === undefined) {
            const maxResult = await pool.request()
                .query('SELECT ISNULL(MAX(sort_order), 0) as max_order FROM pms.chance_configs')
            sortOrder = maxResult.recordset[0].max_order + 1
        }

        const result = await pool.request()
            .input('code', sql.NVarChar, data.code.toUpperCase())
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('description', sql.NVarChar, data.description || null)
            .input('percentage', sql.Int, data.percentage)
            .input('color', sql.NVarChar, data.color || '#6B7280')
            .input('is_active', sql.Bit, data.is_active !== false)
            .input('sort_order', sql.Int, sortOrder)
            .query(`
                INSERT INTO pms.chance_configs (code, name, name_th, description, percentage, color, is_active, sort_order)
                OUTPUT INSERTED.id
                VALUES (@code, @name, @name_th, @description, @percentage, @color, @is_active, @sort_order)
            `)

        revalidatePath('/projects/settings/chances')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('createChanceConfig error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Update
// ============================================

export async function updateChanceConfig(id: string, data: {
    code?: string
    name?: string
    name_th?: string
    description?: string
    percentage?: number
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
                .query('SELECT id FROM pms.chance_configs WHERE code = @code AND id != @id')

            if (existing.recordset.length > 0) {
                return { success: false, error: `รหัส "${data.code}" มีอยู่แล้ว` }
            }
        }

        // Build dynamic update
        const updates: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

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
        if (data.percentage !== undefined) {
            updates.push('percentage = @percentage')
            request.input('percentage', sql.Int, data.percentage)
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
            UPDATE pms.chance_configs
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/projects/settings/chances')
        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        console.error('updateChanceConfig error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Delete
// ============================================

export async function deleteChanceConfig(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Check if used in projects
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM pms.projects WHERE chance_id = @id')

        if (usageCheck.recordset[0].count > 0) {
            return {
                success: false,
                error: `ไม่สามารถลบได้: ใช้ในโครงการ ${usageCheck.recordset[0].count} โครงการ กรุณาปิดใช้งานแทน`
            }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.chance_configs WHERE id = @id')

        revalidatePath('/projects/settings/chances')
        return { success: true }
    } catch (error: any) {
        console.error('deleteChanceConfig error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Toggle Active
// ============================================

export async function toggleChanceConfigActive(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.chance_configs
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/chances')
        return { success: true }
    } catch (error: any) {
        console.error('toggleChanceConfigActive error:', error)
        return { success: false, error: error.message }
    }
}
