'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'

// Print job status
export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed'

export interface PrintJob {
    id: string
    job_type: string // 'sticker', 'label', 'report'
    printer_name: string
    status: PrintJobStatus
    payload: any // JSON data to print
    created_at: string
    printed_at: string | null
    error_message: string | null
    created_by: string
}

export interface StickerData {
    code: string
    name: string
    barcode?: string
    quantity: number
}

// Create a print job (to be picked up by print agent)
export async function createPrintJob(
    jobType: string,
    printerName: string,
    payload: any
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const jobId = crypto.randomUUID()

        await pool.request()
            .input('id', sql.UniqueIdentifier, jobId)
            .input('job_type', sql.NVarChar, jobType)
            .input('printer_name', sql.NVarChar, printerName)
            .input('status', sql.NVarChar, 'pending')
            .input('payload', sql.NVarChar, JSON.stringify(payload))
            .input('created_by', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.print_jobs (id, job_type, printer_name, status, payload, created_by, created_at)
                VALUES (@id, @job_type, @printer_name, @status, @payload, @created_by, GETDATE())
            `)

        return { success: true, jobId }
    } catch (error) {
        console.error('Error creating print job:', error)
        return { success: false, error: 'Database error' }
    }
}

// Get pending print jobs (called by print agent)
export async function getPendingPrintJobs(printerName?: string): Promise<PrintJob[]> {
    try {
        const pool = await getConnection()
        let query = `
            SELECT
                id, job_type, printer_name, status, payload,
                created_at, printed_at, error_message, created_by
            FROM pms.print_jobs
            WHERE status = 'pending'
        `

        const request = pool.request()
        if (printerName) {
            query += ' AND printer_name = @printerName'
            request.input('printerName', sql.NVarChar, printerName)
        }

        query += ' ORDER BY created_at ASC'

        const result = await request.query(query)
        return result.recordset.map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }))
    } catch (error) {
        console.error('Error fetching pending print jobs:', error)
        return []
    }
}

// Update print job status (called by print agent)
export async function updatePrintJobStatus(
    jobId: string,
    status: PrintJobStatus,
    errorMessage?: string
): Promise<{ success: boolean }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, jobId)
            .input('status', sql.NVarChar, status)
            .input('error_message', sql.NVarChar, errorMessage || null)
            .input('printed_at', sql.DateTime, status === 'completed' ? new Date() : null)
            .query(`
                UPDATE pms.print_jobs
                SET status = @status,
                    error_message = @error_message,
                    printed_at = CASE WHEN @status = 'completed' THEN GETDATE() ELSE printed_at END
                WHERE id = @id
            `)
        return { success: true }
    } catch (error) {
        console.error('Error updating print job:', error)
        return { success: false }
    }
}

// Get configured printers
export async function getConfiguredPrinters(): Promise<{ name: string; type: string; isDefault: boolean }[]> {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT name, printer_type, is_default
            FROM pms.printers
            WHERE is_active = 1
            ORDER BY is_default DESC, name ASC
        `)
        return result.recordset.map(row => ({
            name: row.name,
            type: row.printer_type,
            isDefault: row.is_default
        }))
    } catch (error) {
        // Return empty array if table doesn't exist
        console.error('Error fetching printers:', error)
        return []
    }
}

// Get my print job history
export async function getMyPrintJobs(limit: number = 50): Promise<PrintJob[]> {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    id, job_type, printer_name, status, payload,
                    created_at, printed_at, error_message, created_by
                FROM pms.print_jobs
                WHERE created_by = @userId
                ORDER BY created_at DESC
            `)
        return result.recordset.map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }))
    } catch (error) {
        console.error('Error fetching print jobs:', error)
        return []
    }
}
