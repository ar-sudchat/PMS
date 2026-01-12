'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

export interface ProjectType {
    id: string
    code: string
    name: string
    name_th: string | null
    description: string | null
    color: string
    has_milestones: boolean
    has_deliverables: boolean
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string | null
}

// Helper to check if name_th column exists in project_types table
async function checkProjectTypeNameThColumn(pool: any): Promise<boolean> {
    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'project_types'
        AND COLUMN_NAME = 'name_th'
    `)
    return columnCheck.recordset.length > 0
}

export async function getProjectTypes(includeInactive: boolean = false): Promise<{
    success: boolean
    data?: ProjectType[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const hasNameTh = await checkProjectTypeNameThColumn(pool)

        const selectCols = hasNameTh
            ? `id, code, name, name_th, description, color, has_milestones, has_deliverables, is_active, sort_order, created_at, updated_at`
            : `id, code, name, NULL as name_th, description, color, has_milestones, has_deliverables, is_active, sort_order, created_at, updated_at`

        const result = await pool.request().query(`
            SELECT ${selectCols}
            FROM pms.project_types
            ${includeInactive ? '' : 'WHERE is_active = 1'}
            ORDER BY sort_order, name
        `)

        return { success: true, data: result.recordset as ProjectType[] }
    } catch (error: any) {
        console.error('getProjectTypes error:', error)
        return { success: false, error: error.message }
    }
}

export async function getProjectType(id: string): Promise<{
    success: boolean
    data?: ProjectType
    error?: string
}> {
    try {
        const pool = await getConnection()
        const hasNameTh = await checkProjectTypeNameThColumn(pool)

        const selectCols = hasNameTh
            ? `id, code, name, name_th, description, color, has_milestones, has_deliverables, is_active, sort_order, created_at, updated_at`
            : `id, code, name, NULL as name_th, description, color, has_milestones, has_deliverables, is_active, sort_order, created_at, updated_at`

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT ${selectCols} FROM pms.project_types WHERE id = @id`)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Project type not found' }
        }

        return { success: true, data: result.recordset[0] as ProjectType }
    } catch (error: any) {
        console.error('getProjectType error:', error)
        return { success: false, error: error.message }
    }
}

export async function createProjectType(data: {
    code: string
    name: string
    name_th?: string
    description?: string
    color?: string
    has_milestones: boolean
    has_deliverables: boolean
    is_active?: boolean
    sort_order?: number
}): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const hasNameTh = await checkProjectTypeNameThColumn(pool)

        // Check if code already exists
        const existingCheck = await pool.request()
            .input('code', sql.NVarChar, data.code)
            .query('SELECT id FROM pms.project_types WHERE code = @code')

        if (existingCheck.recordset.length > 0) {
            return { success: false, error: `Project type code "${data.code}" already exists` }
        }

        // Get max sort order if not provided
        let sortOrder = data.sort_order
        if (sortOrder === undefined) {
            const maxOrderResult = await pool.request()
                .query('SELECT MAX(sort_order) as max_order FROM pms.project_types')
            sortOrder = (maxOrderResult.recordset[0].max_order || 0) + 1
        }

        const request = pool.request()
            .input('code', sql.NVarChar, data.code.toUpperCase())
            .input('name', sql.NVarChar, data.name)
            .input('description', sql.NVarChar, data.description || null)
            .input('color', sql.NVarChar, data.color || '#3B82F6')
            .input('has_milestones', sql.Bit, data.has_milestones)
            .input('has_deliverables', sql.Bit, data.has_deliverables)
            .input('is_active', sql.Bit, data.is_active !== false)
            .input('sort_order', sql.Int, sortOrder)

        if (hasNameTh) {
            request.input('name_th', sql.NVarChar, data.name_th || null)
            await request.query(`
                INSERT INTO pms.project_types (code, name, name_th, description, color, has_milestones, has_deliverables, is_active, sort_order)
                VALUES (@code, @name, @name_th, @description, @color, @has_milestones, @has_deliverables, @is_active, @sort_order)
            `)
        } else {
            await request.query(`
                INSERT INTO pms.project_types (code, name, description, color, has_milestones, has_deliverables, is_active, sort_order)
                VALUES (@code, @name, @description, @color, @has_milestones, @has_deliverables, @is_active, @sort_order)
            `)
        }

        revalidatePath('/projects/settings/project-types')
        return { success: true }
    } catch (error: any) {
        console.error('createProjectType error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateProjectType(id: string, data: {
    code?: string
    name?: string
    name_th?: string
    description?: string
    color?: string
    has_milestones?: boolean
    has_deliverables?: boolean
    is_active?: boolean
    sort_order?: number
}): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const hasNameTh = await checkProjectTypeNameThColumn(pool)

        // Check if code already exists (excluding current record)
        if (data.code) {
            const existingCheck = await pool.request()
                .input('code', sql.NVarChar, data.code)
                .input('id', sql.UniqueIdentifier, id)
                .query('SELECT id FROM pms.project_types WHERE code = @code AND id != @id')

            if (existingCheck.recordset.length > 0) {
                return { success: false, error: `Project type code "${data.code}" already exists` }
            }
        }

        // Build dynamic update query
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
        if (data.name_th !== undefined && hasNameTh) {
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
        if (data.has_milestones !== undefined) {
            updates.push('has_milestones = @has_milestones')
            request.input('has_milestones', sql.Bit, data.has_milestones)
        }
        if (data.has_deliverables !== undefined) {
            updates.push('has_deliverables = @has_deliverables')
            request.input('has_deliverables', sql.Bit, data.has_deliverables)
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
            return { success: true } // Nothing to update except timestamp
        }

        await request.query(`
            UPDATE pms.project_types
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/projects/settings/project-types')
        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        console.error('updateProjectType error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteProjectType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Check if used in projects
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM pms.projects WHERE project_type_id = @id')

        const usageCount = usageCheck.recordset[0].count

        if (usageCount > 0) {
            return {
                success: false,
                error: `Cannot delete: This type is used in ${usageCount} project(s). Please deactivate it instead.`
            }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.project_types WHERE id = @id')

        revalidatePath('/projects/settings/project-types')
        return { success: true }
    } catch (error: any) {
        console.error('deleteProjectType error:', error)
        return { success: false, error: error.message }
    }
}

export async function toggleProjectTypeActive(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.project_types
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/project-types')
        return { success: true }
    } catch (error: any) {
        console.error('toggleProjectTypeActive error:', error)
        return { success: false, error: error.message }
    }
}
