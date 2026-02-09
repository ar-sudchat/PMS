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
 * PATCH /api/print/jobs/[id]/status
 * อัพเดทสถานะงานพิมพ์ (สำหรับ Print Agent)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Validate agent key
    if (!validateAgentKey(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { id } = await params

    try {
        const body = await request.json()
        const { status, error_message } = body

        if (!status) {
            return NextResponse.json(
                { error: 'Missing status' },
                { status: 400 }
            )
        }

        const validStatuses = ['pending', 'printing', 'completed', 'failed']
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: ' + validStatuses.join(', ') },
                { status: 400 }
            )
        }

        const pool = await getConnection()

        // Build update query based on status
        let updateFields = 'status = @status'
        const sqlRequest = pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('status', sql.NVarChar, status)

        if (status === 'printing') {
            updateFields += ', started_at = GETDATE()'
        } else if (status === 'completed') {
            updateFields += ', printed_at = GETDATE()'
        } else if (status === 'failed') {
            updateFields += ', error_message = @error_message, retry_count = retry_count + 1'
            sqlRequest.input('error_message', sql.NVarChar, error_message || null)
        }

        const result = await sqlRequest.query(`
            UPDATE pms.print_jobs
            SET ${updateFields}
            WHERE id = @id
        `)

        if (result.rowsAffected[0] === 0) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `Job status updated to ${status}`
        })

    } catch (error) {
        console.error('Error updating print job status:', error)
        return NextResponse.json(
            { error: 'Failed to update job status' },
            { status: 500 }
        )
    }
}
