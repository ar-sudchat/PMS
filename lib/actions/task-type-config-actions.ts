"use server"

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TaskTypeConfigFormData } from '@/types/task-type-config'

// GET ALL
export async function getTaskTypeConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.task_type_configs WHERE is_active = 1 ORDER BY sort_order')
    return result.recordset
}

// GET ALL (include inactive)
export async function getAllTaskTypeConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.task_type_configs ORDER BY sort_order')
    return result.recordset
}

// CREATE
export async function createTaskTypeConfig(data: TaskTypeConfigFormData) {
    const pool = await getConnection()

    // Check duplicate code
    const existing = await pool.request()
        .input('code', data.code)
        .query('SELECT id FROM pms.task_type_configs WHERE code = @code')

    if (existing.recordset.length > 0) {
        throw new Error('รหัสประเภทงานนี้มีอยู่แล้ว');
    }

    const result = await pool.request()
        .input('code', data.code.toUpperCase())
        .input('name', data.name)
        .input('is_countable_for_kpi', data.is_countable_for_kpi ? 1 : 0)
        .input('kpi_category', data.kpi_category || null)
        .input('is_defect', data.is_defect ? 1 : 0)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      INSERT INTO pms.task_type_configs 
      (code, name, is_countable_for_kpi, kpi_category, is_defect, sort_order, is_active)
      OUTPUT INSERTED.id
      VALUES 
      (@code, @name, @is_countable_for_kpi, @kpi_category, @is_defect, @sort_order, @is_active)
    `)

    revalidatePath('/projects/settings/task-types')
    return { success: true, id: result.recordset[0].id }
}

// UPDATE
export async function updateTaskTypeConfig(id: string, data: TaskTypeConfigFormData) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .input('name', data.name)
        .input('is_countable_for_kpi', data.is_countable_for_kpi ? 1 : 0)
        .input('kpi_category', data.kpi_category || null)
        .input('is_defect', data.is_defect ? 1 : 0)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      UPDATE pms.task_type_configs SET
        name = @name,
        is_countable_for_kpi = @is_countable_for_kpi,
        kpi_category = @kpi_category,
        is_defect = @is_defect,
        sort_order = @sort_order,
        is_active = @is_active
      WHERE id = @id
    `)

    revalidatePath('/projects/settings/task-types')
    return { success: true }
}

// DELETE (hard delete, fallback to soft delete)
export async function deleteTaskTypeConfig(id: string) {
    const pool = await getConnection()

    try {
        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.task_type_configs WHERE id = @id')
    } catch (error: any) {
        if (error.number === 547) {
            console.warn("Hard delete failed, falling back to soft delete:", error.message)
            await pool.request()
                .input('id', id)
                .query('UPDATE pms.task_type_configs SET is_active = 0 WHERE id = @id')
        } else {
            throw error;
        }
    }

    revalidatePath('/projects/settings/task-types')
    return { success: true }
}
