import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/db'
import sql from 'mssql'

// API Key สำหรับ Print Agent
const PRINT_AGENT_KEY = 'pms-print-agent-key-2024'

function validateAgentKey(request: NextRequest): boolean {
    const key = request.headers.get('X-Print-Agent-Key')
    return key === PRINT_AGENT_KEY
}

/**
 * GET /api/print/jobs
 * ดึงงานพิมพ์ที่รอดำเนินการ (สำหรับ Print Agent)
 */
export async function GET(request: NextRequest) {
    // Validate agent key
    if (!validateAgentKey(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(request.url)
    const printerName = searchParams.get('printer')
    const status = searchParams.get('status') || 'pending'

    try {
        const pool = await getConnection()
        let query = `
            SELECT
                id, job_type, printer_name, status, payload, copies, priority,
                created_at, started_at, printed_at, error_message, retry_count
            FROM pms.print_jobs
            WHERE status = @status
        `

        const sqlRequest = pool.request()
            .input('status', sql.NVarChar, status)

        if (printerName) {
            query += ' AND printer_name = @printerName'
            sqlRequest.input('printerName', sql.NVarChar, printerName)
        }

        query += ' ORDER BY priority ASC, created_at ASC'

        const result = await sqlRequest.query(query)

        const jobs = result.recordset.map(row => ({
            ...row,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
        }))

        return NextResponse.json({ jobs })

    } catch (error) {
        console.error('Error fetching print jobs:', error)
        return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/print/jobs
 * สร้างงานพิมพ์ใหม่
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { job_type, printer_name, payload, copies = 1, priority = 5, created_by } = body

        if (!job_type || !printer_name || !payload) {
            return NextResponse.json(
                { error: 'Missing required fields: job_type, printer_name, payload' },
                { status: 400 }
            )
        }

        const pool = await getConnection()
        const jobId = crypto.randomUUID()

        await pool.request()
            .input('id', sql.UniqueIdentifier, jobId)
            .input('job_type', sql.NVarChar, job_type)
            .input('printer_name', sql.NVarChar, printer_name)
            .input('status', sql.NVarChar, 'pending')
            .input('payload', sql.NVarChar, JSON.stringify(payload))
            .input('copies', sql.Int, copies)
            .input('priority', sql.Int, priority)
            .input('created_by', sql.UniqueIdentifier, created_by)
            .query(`
                INSERT INTO pms.print_jobs (id, job_type, printer_name, status, payload, copies, priority, created_by, created_at)
                VALUES (@id, @job_type, @printer_name, @status, @payload, @copies, @priority, @created_by, GETDATE())
            `)

        return NextResponse.json({
            success: true,
            jobId,
            message: 'Print job created'
        })

    } catch (error) {
        console.error('Error creating print job:', error)
        return NextResponse.json(
            { error: 'Failed to create print job' },
            { status: 500 }
        )
    }
}
