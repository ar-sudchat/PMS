'use server'

import { getConnection } from '@/lib/db'
import { ProjectStatusConfig } from '@/types/project'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'

export async function getProjectStatusConfigs() {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
        SELECT * FROM pms.project_status_configs 
        ORDER BY sort_order ASC, code ASC
      `)
        return { success: true, data: result.recordset as ProjectStatusConfig[] }
    } catch (error) {
        console.error('Error fetching project status configs:', error)
        return { success: false, error: 'Failed to fetch project status configurations' }
    }
}

export async function createProjectStatusConfig(data: Omit<ProjectStatusConfig, 'id'>) {
    try {
        const pool = await getConnection()

        // Get max sort order
        const maxSortResult = await pool.request()
            .query('SELECT MAX(sort_order) as max_sort FROM pms.project_status_configs')
        const nextSortOrder = (maxSortResult.recordset[0].max_sort || 0) + 10

        await pool.request()
            .input('code', sql.NVarChar, data.code)
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('color', sql.NVarChar, data.color || '#64748b')
            .input('is_final', sql.Bit, data.is_final ? 1 : 0)
            .input('sort_order', sql.Int, data.sort_order || nextSortOrder)
            .query(`
        INSERT INTO pms.project_status_configs (code, name, name_th, color, is_final, sort_order)
        VALUES (@code, @name, @name_th, @color, @is_final, @sort_order)
      `)

        revalidatePath('/projects/settings/statuses')
        return { success: true }
    } catch (error) {
        console.error('Error creating project status config:', error)
        return { success: false, error: 'Failed to create project status configuration' }
    }
}

export async function updateProjectStatusConfig(id: string, data: Partial<ProjectStatusConfig>) {
    try {
        const pool = await getConnection()
        const request = pool.request()
            .input('id', sql.UniqueIdentifier, id)

        let updateFields = []
        if (data.code !== undefined) {
            request.input('code', sql.NVarChar, data.code)
            updateFields.push('code = @code')
        }
        if (data.name !== undefined) {
            request.input('name', sql.NVarChar, data.name)
            updateFields.push('name = @name')
        }
        if (data.name_th !== undefined) {
            request.input('name_th', sql.NVarChar, data.name_th)
            updateFields.push('name_th = @name_th')
        }
        if (data.color !== undefined) {
            request.input('color', sql.NVarChar, data.color)
            updateFields.push('color = @color')
        }
        if (data.is_final !== undefined) {
            request.input('is_final', sql.Bit, data.is_final ? 1 : 0)
            updateFields.push('is_final = @is_final')
        }
        if (data.sort_order !== undefined) {
            request.input('sort_order', sql.Int, data.sort_order)
            updateFields.push('sort_order = @sort_order')
        }

        if (updateFields.length === 0) return { success: true }

        await request.query(`
      UPDATE pms.project_status_configs
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `)

        revalidatePath('/projects/settings/statuses')
        return { success: true }
    } catch (error) {
        console.error('Error updating project status config:', error)
        return { success: false, error: 'Failed to update project status configuration' }
    }
}

export async function deleteProjectStatusConfig(id: string) {
    try {
        const pool = await getConnection()
        // Check usage - project status is used in Projects table
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
            SELECT COUNT(*) as count 
            FROM pms.projects 
            WHERE status_id = @id
        `)

        if (usageCheck.recordset[0].count > 0) {
            return { success: false, error: 'Cannot delete: This status is being used by existing projects' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.project_status_configs WHERE id = @id')

        revalidatePath('/projects/settings/statuses')
        return { success: true }
    } catch (error) {
        console.error('Error deleting project status config:', error)
        return { success: false, error: 'Failed to delete project status configuration' }
    }
}
