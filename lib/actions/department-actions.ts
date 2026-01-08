'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface DepartmentFormData {
    name: string;
    name_th?: string;
    code: string;
    description?: string;
    head_id?: string;
    parent_id?: string;
    color?: string;
}

export async function getDepartments() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.v_departments WHERE is_active = 1 ORDER BY name ASC')
    return result.recordset
}

export async function createDepartment(data: DepartmentFormData) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('name', data.name)
            .input('name_th', data.name_th)
            .input('code', data.code)
            .input('description', data.description)
            .input('head_id', data.head_id || null)
            .input('parent_id', data.parent_id || null)
            .input('color', data.color)
            .query(`
          INSERT INTO pms.departments (name, name_th, code, description, head_id, parent_id, color)
          OUTPUT INSERTED.id
          VALUES (@name, @name_th, @code, @description, @head_id, @parent_id, @color)
        `)

        revalidatePath('/team/departments')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create Department Error:', error)
        throw error
    }
}

export async function updateDepartment(id: string, data: DepartmentFormData) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .input('name', data.name)
            .input('name_th', data.name_th)
            .input('code', data.code)
            .input('description', data.description)
            .input('head_id', data.head_id || null)
            .input('parent_id', data.parent_id || null)
            .input('color', data.color)
            .query(`
          UPDATE pms.departments 
          SET 
            name = @name,
            name_th = @name_th,
            code = @code,
            description = @description,
            head_id = @head_id,
            parent_id = @parent_id,
            color = @color,
            updated_at = GETDATE()
          WHERE id = @id
        `)

        revalidatePath('/team/departments')
        return { success: true }
    } catch (error: any) {
        console.error('Update Department Error:', error)
        throw error
    }
}

export async function deleteDepartment(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query('UPDATE pms.departments SET is_active = 0 WHERE id = @id')

        revalidatePath('/team/departments')

        if (result.rowsAffected[0] === 0) {
            return { success: false, message: 'No department found with the given ID.' }
        }

        return { success: true, message: 'Department deleted successfully.' }
    } catch (error: any) {
        console.error('Database Error:', error);
        return { success: false, message: error.message || 'Failed to delete department.' }
    }
}
