'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface PositionFormData {
    code: string;
    name: string;
    name_th?: string;
    description?: string;
    level: number;
    hourly_rate?: number;
    daily_rate?: number;
    department_id?: string;
    color?: string;
    is_active: boolean;
}

export async function getPositions() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.v_positions WHERE is_active = 1 ORDER BY level DESC, name ASC')
    return result.recordset
}

export async function createPosition(data: PositionFormData) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('code', data.code)
            .input('name', data.name)
            .input('name_th', data.name_th)
            .input('description', data.description)
            .input('level', data.level)
            .input('hourly_rate', data.hourly_rate)
            .input('daily_rate', data.daily_rate)
            .input('department_id', data.department_id || null)
            .input('color', data.color)
            .input('is_active', data.is_active)
            .query(`
          INSERT INTO pms.positions (code, name, name_th, description, level, hourly_rate, daily_rate, department_id, color, is_active)
          OUTPUT INSERTED.id
          VALUES (@code, @name, @name_th, @description, @level, @hourly_rate, @daily_rate, @department_id, @color, @is_active)
        `)

        revalidatePath('/team/positions')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create Position Error:', error)
        throw error
    }
}

export async function updatePosition(id: string, data: PositionFormData) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .input('code', data.code)
            .input('name', data.name)
            .input('name_th', data.name_th)
            .input('description', data.description)
            .input('level', data.level)
            .input('hourly_rate', data.hourly_rate)
            .input('daily_rate', data.daily_rate)
            .input('department_id', data.department_id || null)
            .input('color', data.color)
            .input('is_active', data.is_active)
            .query(`
          UPDATE pms.positions 
          SET 
            code = @code,
            name = @name,
            name_th = @name_th,
            description = @description,
            level = @level,
            hourly_rate = @hourly_rate,
            daily_rate = @daily_rate,
            department_id = @department_id,
            color = @color,
            is_active = @is_active,
            updated_at = GETDATE()
          WHERE id = @id
        `)

        revalidatePath('/team/positions')
        return { success: true }
    } catch (error: any) {
        console.error('Update Position Error:', error)
        throw error
    }
}

export async function deletePosition(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query('UPDATE pms.positions SET is_active = 0 WHERE id = @id')

        revalidatePath('/team/positions')

        if (result.rowsAffected[0] === 0) {
            return { success: false, message: 'No position found with the given ID.' }
        }

        return { success: true, message: 'Position deleted successfully.' }
    } catch (error: any) {
        console.error('Database Error:', error);
        return { success: false, message: error.message || 'Failed to delete position.' }
    }
}
