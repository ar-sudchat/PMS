'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.customers ORDER BY code')
    return result.recordset
}

export async function createCustomer(data: { code: string; name: string; is_active: boolean }) {
    const pool = await getConnection()

    const result = await pool.request()
        .input('code', data.code.toUpperCase())
        .input('name', data.name)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      INSERT INTO pms.customers (code, name, is_active)
      OUTPUT INSERTED.id
      VALUES (@code, @name, @is_active)
    `)

    revalidatePath('/projects/customers')
    return { success: true, id: result.recordset[0].id }
}

export async function updateCustomer(id: string, data: { name: string; is_active: boolean }) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .input('name', data.name)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      UPDATE pms.customers SET
        name = @name,
        is_active = @is_active,
        updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `)

    revalidatePath('/projects/customers')
    return { success: true }
}

export async function deleteCustomer(id: string) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        // Hard delete as per standard CRUD, or Soft delete if preferred. 
        // User sample code used 'UPDATE pms.customers SET is_active = 0', implies Soft Delete logic or just deactivating.
        // However, the button says "Trash" / "Delete". 
        // If we follow the snippet exactly: "UPDATE pms.customers SET is_active = 0 WHERE id = @id"
        // I will use that logic.
        .query('DELETE FROM pms.customers WHERE id = @id')

    revalidatePath('/projects/customers')
    return { success: true }
}
