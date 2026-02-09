'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'

export interface Printer {
    id: string
    name: string
    printer_type: string
    connection_type: string
    connection_string: string | null
    printer_model: string | null
    print_language: string | null
    is_default: boolean
    is_active: boolean
    settings: any
    created_at: string
    updated_at: string
}

// Get all printers
export async function getPrinters(): Promise<Printer[]> {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT *
            FROM pms.printers
            ORDER BY is_default DESC, name ASC
        `)
        return result.recordset.map(row => ({
            ...row,
            settings: row.settings ? JSON.parse(row.settings) : null
        }))
    } catch (error: any) {
        // Table might not exist yet
        if (error.message?.includes('Invalid object name')) {
            return []
        }
        console.error('Error fetching printers:', error)
        return []
    }
}

// Create printer
export async function createPrinter(data: {
    name: string
    printer_type: string
    connection_type: string
    connection_string?: string
    printer_model?: string
    print_language?: string
    is_default?: boolean
    settings?: any
}): Promise<{ success: boolean; id?: string; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const id = crypto.randomUUID()

        // If this is set as default, unset other defaults first
        if (data.is_default) {
            await pool.request().query(`
                UPDATE pms.printers SET is_default = 0 WHERE is_default = 1
            `)
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('name', sql.NVarChar, data.name)
            .input('printer_type', sql.NVarChar, data.printer_type)
            .input('connection_type', sql.NVarChar, data.connection_type)
            .input('connection_string', sql.NVarChar, data.connection_string || null)
            .input('printer_model', sql.NVarChar, data.printer_model || null)
            .input('print_language', sql.NVarChar, data.print_language || null)
            .input('is_default', sql.Bit, data.is_default ? 1 : 0)
            .input('settings', sql.NVarChar, data.settings ? JSON.stringify(data.settings) : null)
            .query(`
                INSERT INTO pms.printers (
                    id, name, printer_type, connection_type, connection_string,
                    printer_model, print_language, is_default, is_active, settings, created_at, updated_at
                )
                VALUES (
                    @id, @name, @printer_type, @connection_type, @connection_string,
                    @printer_model, @print_language, @is_default, 1, @settings, GETDATE(), GETDATE()
                )
            `)

        return { success: true, id }
    } catch (error: any) {
        console.error('Error creating printer:', error)
        return { success: false, error: error.message }
    }
}

// Update printer
export async function updatePrinter(
    id: string,
    data: Partial<{
        name: string
        printer_type: string
        connection_type: string
        connection_string: string
        printer_model: string
        print_language: string
        is_default: boolean
        is_active: boolean
        settings: any
    }>
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // If setting as default, unset others
        if (data.is_default) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, id)
                .query(`UPDATE pms.printers SET is_default = 0 WHERE id != @id`)
        }

        const updates: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

        if (data.name !== undefined) {
            updates.push('name = @name')
            request.input('name', sql.NVarChar, data.name)
        }
        if (data.printer_type !== undefined) {
            updates.push('printer_type = @printer_type')
            request.input('printer_type', sql.NVarChar, data.printer_type)
        }
        if (data.connection_type !== undefined) {
            updates.push('connection_type = @connection_type')
            request.input('connection_type', sql.NVarChar, data.connection_type)
        }
        if (data.connection_string !== undefined) {
            updates.push('connection_string = @connection_string')
            request.input('connection_string', sql.NVarChar, data.connection_string)
        }
        if (data.printer_model !== undefined) {
            updates.push('printer_model = @printer_model')
            request.input('printer_model', sql.NVarChar, data.printer_model)
        }
        if (data.print_language !== undefined) {
            updates.push('print_language = @print_language')
            request.input('print_language', sql.NVarChar, data.print_language)
        }
        if (data.is_default !== undefined) {
            updates.push('is_default = @is_default')
            request.input('is_default', sql.Bit, data.is_default ? 1 : 0)
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = @is_active')
            request.input('is_active', sql.Bit, data.is_active ? 1 : 0)
        }
        if (data.settings !== undefined) {
            updates.push('settings = @settings')
            request.input('settings', sql.NVarChar, JSON.stringify(data.settings))
        }

        updates.push('updated_at = GETDATE()')

        await request.query(`
            UPDATE pms.printers
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        return { success: true }
    } catch (error: any) {
        console.error('Error updating printer:', error)
        return { success: false, error: error.message }
    }
}

// Delete printer
export async function deletePrinter(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.printers WHERE id = @id`)

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting printer:', error)
        return { success: false, error: error.message }
    }
}

// Test printer connection
export async function testPrinterConnection(
    ip: string,
    port: number = 9100
): Promise<{ success: boolean; message: string }> {
    // This is a server-side test - for real testing, the Print Agent should do it
    // Here we just validate the format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) {
        return { success: false, message: 'รูปแบบ IP Address ไม่ถูกต้อง' }
    }

    return {
        success: true,
        message: `IP ${ip}:${port} พร้อมใช้งาน (ต้องทดสอบจริงผ่าน Print Agent)`
    }
}
