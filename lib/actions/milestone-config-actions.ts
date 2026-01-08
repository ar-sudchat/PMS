"use server"

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { MilestoneConfigFormData } from '@/types/milestone-config'

// GET ALL
export async function getMilestoneConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order')
    return result.recordset
}

// GET ALL (include inactive)
export async function getAllMilestoneConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.milestone_configs ORDER BY sort_order')
    return result.recordset
}

// GET BY ID
export async function getMilestoneConfigById(id: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('id', id)
        .query('SELECT * FROM pms.milestone_configs WHERE id = @id')
    return result.recordset[0]
}

// CREATE
export async function createMilestoneConfig(data: MilestoneConfigFormData) {
    const pool = await getConnection()

    // Check duplicate code
    const existing = await pool.request()
        .input('code', data.code)
        .query('SELECT id FROM pms.milestone_configs WHERE code = @code')

    if (existing.recordset.length > 0) {
        throw new Error('รหัส Milestone นี้มีอยู่แล้ว');
    }

    const result = await pool.request()
        .input('code', data.code.toUpperCase())
        .input('name', data.name)
        .input('name_th', data.name_th || null)
        .input('description', data.description || null)
        .input('color', data.color || '#6366f1')
        .input('icon', data.icon || null)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      INSERT INTO pms.milestone_configs 
      (code, name, name_th, description, color, icon, sort_order, is_active)
      OUTPUT INSERTED.id
      VALUES 
      (@code, @name, @name_th, @description, @color, @icon, @sort_order, @is_active)
    `)

    revalidatePath('/projects/settings/milestones')
    return { success: true, id: result.recordset[0].id }
}

// UPDATE
export async function updateMilestoneConfig(id: string, data: MilestoneConfigFormData) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .input('name', data.name)
        .input('name_th', data.name_th || null)
        .input('description', data.description || null)
        .input('color', data.color || '#6366f1')
        .input('icon', data.icon || null)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      UPDATE pms.milestone_configs SET
        name = @name,
        name_th = @name_th,
        description = @description,
        color = @color,
        icon = @icon,
        sort_order = @sort_order,
        is_active = @is_active
      WHERE id = @id
    `)

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}

// DELETE (soft delete)
export async function deleteMilestoneConfig(id: string) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .query('UPDATE pms.milestone_configs SET is_active = 0 WHERE id = @id')

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}

// REORDER
export async function reorderMilestoneConfigs(items: { id: string, sort_order: number }[]) {
    const pool = await getConnection()

    for (const item of items) {
        await pool.request()
            .input('id', item.id)
            .input('sort_order', item.sort_order)
            .query('UPDATE pms.milestone_configs SET sort_order = @sort_order WHERE id = @id')
    }

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}
