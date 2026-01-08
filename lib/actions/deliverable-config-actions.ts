'use server'

import { getConnection } from '@/lib/db'
import { DeliverableConfig } from '@/types/project'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'

export async function getDeliverableConfigs() {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
        SELECT * FROM pms.deliverable_configs 
        ORDER BY sort_order ASC, code ASC
      `)
        return { success: true, data: result.recordset as DeliverableConfig[] }
    } catch (error) {
        console.error('Error fetching deliverable configs:', error)
        return { success: false, error: 'Failed to fetch deliverable configurations' }
    }
}

export async function createDeliverableConfig(data: Omit<DeliverableConfig, 'id'>) {
    try {
        const pool = await getConnection()

        // Get max sort order
        const maxSortResult = await pool.request()
            .query('SELECT MAX(sort_order) as max_sort FROM pms.deliverable_configs')
        const nextSortOrder = (maxSortResult.recordset[0].max_sort || 0) + 10

        await pool.request()
            .input('code', sql.NVarChar, data.code)
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('sort_order', sql.Int, data.sort_order || nextSortOrder)
            .query(`
        INSERT INTO pms.deliverable_configs (code, name, name_th, sort_order)
        VALUES (@code, @name, @name_th, @sort_order)
      `)

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error) {
        console.error('Error creating deliverable config:', error)
        return { success: false, error: 'Failed to create deliverable configuration' }
    }
}

export async function updateDeliverableConfig(id: string, data: Partial<DeliverableConfig>) {
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
        if (data.sort_order !== undefined) {
            request.input('sort_order', sql.Int, data.sort_order)
            updateFields.push('sort_order = @sort_order')
        }

        if (updateFields.length === 0) return { success: true }

        await request.query(`
      UPDATE pms.deliverable_configs
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `)

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error) {
        console.error('Error updating deliverable config:', error)
        return { success: false, error: 'Failed to update deliverable configuration' }
    }
}

export async function deleteDeliverableConfig(id: string) {
    try {
        const pool = await getConnection()
        // Check usage
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
            SELECT COUNT(*) as count 
            FROM pms.project_milestone_deliverables 
            WHERE deliverable_config_id = @id
        `)

        if (usageCheck.recordset[0].count > 0) {
            return { success: false, error: 'Cannot delete: This deliverable is being used in existing projects' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.deliverable_configs WHERE id = @id')

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error) {
        console.error('Error deleting deliverable config:', error)
        return { success: false, error: 'Failed to delete deliverable configuration' }
    }
}
