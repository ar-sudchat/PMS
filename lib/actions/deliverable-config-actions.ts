'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

export interface DeliverableConfig {
    id: string
    milestone_config_id: string
    milestone_name: string
    milestone_sort_order: number
    name: string
    name_th: string | null
    is_required: boolean
    is_active: boolean
    sort_order: number
}

export async function getDeliverableConfigsByMilestone() {
    try {
        const pool = await getConnection()

        // Check if name_th column exists
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deliverable_configs'
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameThColumn = columnCheck.recordset.length > 0

        // Build query with explicit columns (avoid dc.* to prevent missing column errors)
        const selectColumns = hasNameThColumn
            ? `dc.id, dc.milestone_config_id, dc.name, dc.name_th, dc.is_required, dc.is_active, dc.sort_order`
            : `dc.id, dc.milestone_config_id, dc.name, NULL as name_th, dc.is_required, dc.is_active, dc.sort_order`

        const result = await pool.request().query(`
            SELECT
                ${selectColumns},
                mc.name as milestone_name,
                mc.sort_order as milestone_sort_order
            FROM pms.deliverable_configs dc
            JOIN pms.milestone_configs mc ON dc.milestone_config_id = mc.id
            ORDER BY mc.sort_order, dc.sort_order
        `)

        return { success: true, data: result.recordset as DeliverableConfig[] }
    } catch (error: any) {
        console.error('getDeliverableConfigsByMilestone error:', error)
        return { success: false, error: error.message }
    }
}

export async function createDeliverableConfig(data: {
    milestone_config_id: string
    name: string
    name_th?: string
    is_required: boolean
}) {
    try {
        const pool = await getConnection()

        // Check if name_th column exists
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deliverable_configs'
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameThColumn = columnCheck.recordset.length > 0

        // Get max sort order for this milestone to append
        const maxOrderResult = await pool.request()
            .input('milestone_config_id', sql.UniqueIdentifier, data.milestone_config_id)
            .query('SELECT MAX(sort_order) as max_order FROM pms.deliverable_configs WHERE milestone_config_id = @milestone_config_id')

        const nextOrder = (maxOrderResult.recordset[0].max_order || 0) + 1

        const request = pool.request()
            .input('milestone_config_id', sql.UniqueIdentifier, data.milestone_config_id)
            .input('name', sql.NVarChar, data.name)
            .input('is_required', sql.Bit, data.is_required)
            .input('sort_order', sql.Int, nextOrder)

        if (hasNameThColumn) {
            request.input('name_th', sql.NVarChar, data.name_th || null)
            await request.query(`
                INSERT INTO pms.deliverable_configs (milestone_config_id, name, name_th, is_required, sort_order, is_active)
                VALUES (@milestone_config_id, @name, @name_th, @is_required, @sort_order, 1)
            `)
        } else {
            await request.query(`
                INSERT INTO pms.deliverable_configs (milestone_config_id, name, is_required, sort_order, is_active)
                VALUES (@milestone_config_id, @name, @is_required, @sort_order, 1)
            `)
        }

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('createDeliverableConfig error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateDeliverableConfig(id: string, data: {
    name: string
    name_th?: string
    is_required: boolean
}) {
    try {
        const pool = await getConnection()

        // Check if name_th column exists
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deliverable_configs'
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameThColumn = columnCheck.recordset.length > 0

        const request = pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('name', sql.NVarChar, data.name)
            .input('is_required', sql.Bit, data.is_required)

        if (hasNameThColumn) {
            request.input('name_th', sql.NVarChar, data.name_th || null)
            await request.query(`
                UPDATE pms.deliverable_configs
                SET name = @name, name_th = @name_th, is_required = @is_required
                WHERE id = @id
            `)
        } else {
            await request.query(`
                UPDATE pms.deliverable_configs
                SET name = @name, is_required = @is_required
                WHERE id = @id
            `)
        }

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('updateDeliverableConfig error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteDeliverableConfig(id: string) {
    try {
        const pool = await getConnection()

        // Check if this config is being used in any project deliverables
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT COUNT(*) as usage_count
                FROM pms.project_deliverables
                WHERE deliverable_config_id = @id
            `)

        const usageCount = usageCheck.recordset[0].usage_count

        if (usageCount > 0) {
            return {
                success: false,
                error: `Cannot delete: This document template is being used in ${usageCount} project(s). Please deactivate it instead.`,
                usageCount
            }
        }

        // Safe to delete - no usage
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.deliverable_configs WHERE id = @id')

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('deleteDeliverableConfig error:', error)
        if (error.number === 547) { // FK violation (backup check)
            return { success: false, error: 'Cannot delete: This configuration is currently in use by active projects. Please deactivate it instead.' }
        }
        return { success: false, error: error.message }
    }
}

export async function deactivateDeliverableConfig(id: string) {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.deliverable_configs
                SET is_active = 0
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('deactivateDeliverableConfig error:', error)
        return { success: false, error: error.message }
    }
}

export async function activateDeliverableConfig(id: string) {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.deliverable_configs
                SET is_active = 1
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('activateDeliverableConfig error:', error)
        return { success: false, error: error.message }
    }
}

export async function getMilestoneConfigs() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query('SELECT * FROM pms.milestone_configs ORDER BY sort_order')
        return { success: true, data: result.recordset }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
