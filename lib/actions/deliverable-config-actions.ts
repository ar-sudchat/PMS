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
    sort_order: number
}

export async function getDeliverableConfigsByMilestone() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT 
                dc.*,
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

        // Get max sort order for this milestone to append
        const maxOrderResult = await pool.request()
            .input('milestone_config_id', sql.UniqueIdentifier, data.milestone_config_id)
            .query('SELECT MAX(sort_order) as max_order FROM pms.deliverable_configs WHERE milestone_config_id = @milestone_config_id')

        const nextOrder = (maxOrderResult.recordset[0].max_order || 0) + 1

        await pool.request()
            .input('milestone_config_id', sql.UniqueIdentifier, data.milestone_config_id)
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('is_required', sql.Bit, data.is_required)
            .input('sort_order', sql.Int, nextOrder)
            .query(`
                INSERT INTO pms.deliverable_configs (milestone_config_id, name, name_th, is_required, sort_order)
                VALUES (@milestone_config_id, @name, @name_th, @is_required, @sort_order)
            `)

        revalidatePath('/settings/deliverables')
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
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('name', sql.NVarChar, data.name)
            .input('name_th', sql.NVarChar, data.name_th || null)
            .input('is_required', sql.Bit, data.is_required)
            .query(`
                UPDATE pms.deliverable_configs
                SET name = @name, name_th = @name_th, is_required = @is_required
                WHERE id = @id
            `)

        revalidatePath('/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('updateDeliverableConfig error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteDeliverableConfig(id: string) {
    try {
        const pool = await getConnection()

        // Check usage? Maybe allow soft delete or check if used in inactive projects?
        // User requirements say "Admin จัดการ Default Documents", implying CRUD.
        // For strict integrity, we might want to check constraints, but pms.project_deliverables 
        // likely refers to this ID. If so, strict FK would block delete if used.
        // Given existing usage, better to catch FK error.

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.deliverable_configs WHERE id = @id')

        revalidatePath('/settings/deliverables')
        return { success: true }
    } catch (error: any) {
        console.error('deleteDeliverableConfig error:', error)
        if (error.number === 547) { // FK violation
            return { success: false, error: 'Cannot delete: This configuration is currently in use by active projects.' }
        }
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
