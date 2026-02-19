'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.customers ORDER BY code')
    return result.recordset
}

export async function createCustomer(data: {
    code: string; name: string; short_name?: string;
    is_customer: boolean; is_prime: boolean; is_partner: boolean; is_vendor: boolean;
    address: string; tax_id: string; contact_name: string; contact_email: string; contact_phone: string;
    is_active: boolean
}) {
    const pool = await getConnection()

    const result = await pool.request()
        .input('code', data.code.toUpperCase())
        .input('name', data.name)
        .input('short_name', data.short_name || null)
        .input('is_customer', data.is_customer ? 1 : 0)
        .input('is_prime', data.is_prime ? 1 : 0)
        .input('is_partner', data.is_partner ? 1 : 0)
        .input('is_vendor', data.is_vendor ? 1 : 0)
        .input('address', data.address || null)
        .input('tax_id', data.tax_id || null)
        .input('contact_name', data.contact_name || null)
        .input('contact_email', data.contact_email || null)
        .input('contact_phone', data.contact_phone || null)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      INSERT INTO pms.customers (code, name, short_name, is_customer, is_prime, is_partner, is_vendor, address, tax_id, contact_name, contact_email, contact_phone, is_active)
      OUTPUT INSERTED.id
      VALUES (@code, @name, @short_name, @is_customer, @is_prime, @is_partner, @is_vendor, @address, @tax_id, @contact_name, @contact_email, @contact_phone, @is_active)
    `)

    revalidatePath('/projects/customers')
    revalidatePath('/projects/settings/customers')
    return { success: true, id: result.recordset[0].id }
}

export async function updateCustomer(id: string, data: {
    name: string; short_name?: string;
    is_customer: boolean; is_prime: boolean; is_partner: boolean; is_vendor: boolean;
    address: string; tax_id: string; contact_name: string; contact_email: string; contact_phone: string;
    is_active: boolean
}) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .input('name', data.name)
        .input('short_name', data.short_name || null)
        .input('is_customer', data.is_customer ? 1 : 0)
        .input('is_prime', data.is_prime ? 1 : 0)
        .input('is_partner', data.is_partner ? 1 : 0)
        .input('is_vendor', data.is_vendor ? 1 : 0)
        .input('address', data.address || null)
        .input('tax_id', data.tax_id || null)
        .input('contact_name', data.contact_name || null)
        .input('contact_email', data.contact_email || null)
        .input('contact_phone', data.contact_phone || null)
        .input('is_active', data.is_active ? 1 : 0)
        .query(`
      UPDATE pms.customers SET
        name = @name,
        short_name = @short_name,
        is_customer = @is_customer,
        is_prime = @is_prime,
        is_partner = @is_partner,
        is_vendor = @is_vendor,
        address = @address,
        tax_id = @tax_id,
        contact_name = @contact_name,
        contact_email = @contact_email,
        contact_phone = @contact_phone,
        is_active = @is_active,
        updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `)

    revalidatePath('/projects/customers')
    revalidatePath('/projects/settings/customers')
    return { success: true }
}

export async function deleteCustomer(id: string) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .query('DELETE FROM pms.customers WHERE id = @id')

    revalidatePath('/projects/customers')
    return { success: true }
}
