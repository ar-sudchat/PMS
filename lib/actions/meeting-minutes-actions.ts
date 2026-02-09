'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { submitForApproval } from '@/lib/actions/approval-actions'
import { getCurrentUser } from '@/lib/auth'

// Types
export interface MeetingMinutesRecord {
    id: string
    project_id: string | null
    project_code?: string
    project_name?: string
    meeting_date: string
    meeting_end_time: string | null
    meeting_type: string
    meeting_title: string
    organized_by: string
    organized_by_name?: string
    attendees: string | null
    mom_sent_at: string | null
    is_on_time: boolean | null
    hours_to_send: number | null
    sent_by: string | null
    sent_by_name?: string
    mom_file_path: string | null
    notes: string | null
    created_at: string
    created_by: string
}

export interface MeetingMinutesFilters {
    projectId?: string
    organizerId?: string
    year?: number
    onTime?: boolean | 'all'
    meetingType?: string
    search?: string
    page?: number
    pageSize?: number
}

// Get Meeting Minutes Records with filters
export async function getMeetingMinutesRecords(filters: MeetingMinutesFilters = {}) {
    try {
        const pool = await getConnection()
        const { projectId, organizerId, year, onTime, meetingType, search, page = 1, pageSize = 20 } = filters

        let whereClause = '1=1'
        const request = pool.request()

        if (projectId) {
            whereClause += ' AND mm.project_id = @projectId'
            request.input('projectId', projectId)
        }

        if (organizerId) {
            whereClause += ' AND mm.organized_by = @organizerId'
            request.input('organizerId', organizerId)
        }

        if (year) {
            whereClause += ' AND YEAR(mm.meeting_date) = @year'
            request.input('year', year)
        }

        if (onTime !== undefined && onTime !== 'all') {
            whereClause += onTime ? ' AND mm.is_on_time = 1' : ' AND mm.is_on_time = 0'
        }

        if (meetingType) {
            whereClause += ' AND mm.meeting_type = @meetingType'
            request.input('meetingType', meetingType)
        }

        if (search) {
            whereClause += ' AND (p.project_code LIKE @search OR p.name LIKE @search OR mm.meeting_title LIKE @search)'
            request.input('search', `%${search}%`)
        }

        // Get total count
        const countResult = await request.query(`
            SELECT COUNT(*) as total
            FROM pms.meeting_minutes_records mm
            LEFT JOIN pms.projects p ON mm.project_id = p.id
            WHERE ${whereClause}
        `)

        const total = countResult.recordset[0].total
        const offset = (page - 1) * pageSize

        // Get records
        const result = await pool.request()
            .input('projectId', projectId || null)
            .input('organizerId', organizerId || null)
            .input('year', year || null)
            .input('meetingType', meetingType || null)
            .input('search', search ? `%${search}%` : null)
            .input('offset', offset)
            .input('pageSize', pageSize)
            .query(`
                SELECT
                    mm.id,
                    mm.project_id,
                    p.project_code,
                    p.name as project_name,
                    mm.meeting_date,
                    mm.meeting_end_time,
                    mm.meeting_type,
                    mm.meeting_title,
                    mm.organized_by,
                    COALESCE(CONCAT(eo.first_name_th, ' ', eo.last_name_th), CONCAT(eo.first_name, ' ', eo.last_name)) as organized_by_name,
                    mm.attendees,
                    mm.mom_sent_at,
                    mm.is_on_time,
                    mm.hours_to_send,
                    mm.sent_by,
                    COALESCE(CONCAT(es.first_name_th, ' ', es.last_name_th), CONCAT(es.first_name, ' ', es.last_name)) as sent_by_name,
                    mm.mom_file_path,
                    mm.notes,
                    mm.created_at,
                    mm.created_by,
                    mm.approval_status,
                    mm.approval_instance_id
                FROM pms.meeting_minutes_records mm
                LEFT JOIN pms.projects p ON mm.project_id = p.id
                LEFT JOIN pms.employees eo ON mm.organized_by = eo.id
                LEFT JOIN pms.employees es ON mm.sent_by = es.id
                WHERE ${whereClause}
                ORDER BY mm.meeting_date DESC, mm.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `)

        return {
            success: true,
            data: result.recordset,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }
    } catch (error) {
        console.error('Error fetching meeting minutes records:', error)
        return { success: false, error: 'Failed to fetch meeting minutes', data: [], total: 0 }
    }
}

// Get single meeting minutes record
export async function getMeetingMinutesRecord(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT
                    mm.*,
                    p.project_code,
                    p.name as project_name,
                    COALESCE(CONCAT(eo.first_name_th, ' ', eo.last_name_th), CONCAT(eo.first_name, ' ', eo.last_name)) as organized_by_name,
                    COALESCE(CONCAT(es.first_name_th, ' ', es.last_name_th), CONCAT(es.first_name, ' ', es.last_name)) as sent_by_name
                FROM pms.meeting_minutes_records mm
                LEFT JOIN pms.projects p ON mm.project_id = p.id
                LEFT JOIN pms.employees eo ON mm.organized_by = eo.id
                LEFT JOIN pms.employees es ON mm.sent_by = es.id
                WHERE mm.id = @id
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Record not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching meeting minutes record:', error)
        return { success: false, error: 'Failed to fetch meeting minutes record' }
    }
}

// Helper function to convert datetime-local format to SQL Server format
function formatDateTimeForSQL(dateTimeStr: string | undefined): Date | null {
    if (!dateTimeStr) return null
    // Input: "2026-01-11T10:51" -> Output: Date object
    const date = new Date(dateTimeStr)
    return isNaN(date.getTime()) ? null : date
}

// Create meeting minutes record
export async function createMeetingMinutesRecord(data: {
    project_id?: string
    meeting_date: string
    meeting_end_time?: string
    meeting_type: string
    meeting_title: string
    organized_by: string
    attendees?: string
    mom_sent_at?: string
    sent_by?: string
    mom_file_path?: string
    notes?: string
    attachments?: string
    created_by: string
}) {
    try {
        // Convert datetime strings to Date objects for SQL Server
        const meetingDate = formatDateTimeForSQL(data.meeting_date)
        const meetingEndTime = formatDateTimeForSQL(data.meeting_end_time)
        const momSentAt = formatDateTimeForSQL(data.mom_sent_at)

        if (!meetingDate) {
            return { success: false, error: 'Invalid meeting date format' }
        }

        // Calculate hours_to_send and is_on_time
        let hours_to_send: number | null = null
        let is_on_time: boolean | null = null

        if (momSentAt) {
            const meetingEnd = meetingEndTime
                ? meetingEndTime
                : new Date(meetingDate.getTime() + 60 * 60 * 1000) // +1 hour if no end time
            hours_to_send = Math.round((momSentAt.getTime() - meetingEnd.getTime()) / (1000 * 60 * 60) * 100) / 100
            is_on_time = hours_to_send <= 24
        }

        const pool = await getConnection()
        const result = await pool.request()
            .input('project_id', data.project_id || null)
            .input('meeting_date', meetingDate)
            .input('meeting_end_time', meetingEndTime)
            .input('meeting_type', data.meeting_type)
            .input('meeting_title', data.meeting_title)
            .input('organized_by', data.organized_by)
            .input('attendees', data.attendees || null)
            .input('mom_sent_at', momSentAt)
            .input('is_on_time', is_on_time)
            .input('hours_to_send', hours_to_send)
            .input('sent_by', data.sent_by || null)
            .input('mom_file_path', data.mom_file_path || null)
            .input('notes', data.notes || null)
            .input('attachments', data.attachments || null)
            .input('created_by', data.created_by)
            .input('created_at', new Date())
            .query(`
                INSERT INTO pms.meeting_minutes_records
                (id, project_id, meeting_date, meeting_end_time, meeting_type, meeting_title, organized_by, attendees, mom_sent_at, is_on_time, hours_to_send, sent_by, mom_file_path, notes, attachments, created_by, created_at, approval_status)
                OUTPUT INSERTED.id
                VALUES (NEWID(), @project_id, @meeting_date, @meeting_end_time, @meeting_type, @meeting_title, @organized_by, @attendees, @mom_sent_at, @is_on_time, @hours_to_send, @sent_by, @mom_file_path, @notes, @attachments, @created_by, @created_at, 'APPROVED')
            `)

        revalidatePath('/kpi-record/meeting-minutes')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('Error creating meeting minutes record:', error)
        return { success: false, error: error?.message || 'Failed to create meeting minutes record' }
    }
}

// Update meeting minutes record
export async function updateMeetingMinutesRecord(id: string, data: Partial<MeetingMinutesRecord> & { attachments?: string }) {
    try {
        // Convert datetime strings to Date objects for SQL Server
        const meetingDate = formatDateTimeForSQL(data.meeting_date)
        const meetingEndTime = formatDateTimeForSQL(data.meeting_end_time as string | undefined)
        const momSentAt = formatDateTimeForSQL(data.mom_sent_at as string | undefined)

        // Calculate hours_to_send and is_on_time
        let hours_to_send: number | null = null
        let is_on_time: boolean | null = null

        if (momSentAt && meetingDate) {
            const meetingEnd = meetingEndTime
                ? meetingEndTime
                : new Date(meetingDate.getTime() + 60 * 60 * 1000)
            hours_to_send = Math.round((momSentAt.getTime() - meetingEnd.getTime()) / (1000 * 60 * 60) * 100) / 100
            is_on_time = hours_to_send <= 24
        }

        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .input('project_id', data.project_id || null)
            .input('meeting_date', meetingDate)
            .input('meeting_end_time', meetingEndTime)
            .input('meeting_type', data.meeting_type)
            .input('meeting_title', data.meeting_title)
            .input('organized_by', data.organized_by)
            .input('attendees', data.attendees || null)
            .input('mom_sent_at', momSentAt)
            .input('is_on_time', is_on_time)
            .input('hours_to_send', hours_to_send)
            .input('sent_by', data.sent_by || null)
            .input('mom_file_path', data.mom_file_path || null)
            .input('notes', data.notes || null)
            .input('attachments', data.attachments || null)
            .query(`
                UPDATE pms.meeting_minutes_records
                SET project_id = @project_id,
                    meeting_date = @meeting_date,
                    meeting_end_time = @meeting_end_time,
                    meeting_type = @meeting_type,
                    meeting_title = @meeting_title,
                    organized_by = @organized_by,
                    attendees = @attendees,
                    mom_sent_at = @mom_sent_at,
                    is_on_time = @is_on_time,
                    hours_to_send = @hours_to_send,
                    sent_by = @sent_by,
                    mom_file_path = @mom_file_path,
                    notes = @notes,
                    attachments = @attachments,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/meeting-minutes')
        return { success: true }
    } catch (error) {
        console.error('Error updating meeting minutes record:', error)
        return { success: false, error: 'Failed to update meeting minutes record' }
    }
}

// Delete meeting minutes record
export async function deleteMeetingMinutesRecord(id: string) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.meeting_minutes_records WHERE id = @id')

        revalidatePath('/kpi-record/meeting-minutes')
        return { success: true }
    } catch (error) {
        console.error('Error deleting meeting minutes record:', error)
        return { success: false, error: 'Failed to delete meeting minutes record' }
    }
}

// Get meeting minutes KPI summary
export async function getMeetingMinutesKPI(year?: number, employeeId?: string) {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = '1=1'
        if (year) {
            whereClause += ' AND YEAR(meeting_date) = @year'
            request.input('year', year)
        }
        if (employeeId) {
            whereClause += ' AND organized_by = @employeeId'
            request.input('employeeId', employeeId)
        }

        const result = await request.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_on_time = 1 THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN is_on_time = 0 THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN mom_sent_at IS NULL THEN 1 ELSE 0 END) as pending
            FROM pms.meeting_minutes_records
            WHERE ${whereClause}
        `)

        const stats = result.recordset[0]
        const totalWithMom = (stats.on_time || 0) + (stats.late || 0)
        return {
            success: true,
            data: {
                total: stats.total || 0,
                on_time: stats.on_time || 0,
                late: stats.late || 0,
                pending: stats.pending || 0,
                late_count: stats.late || 0,  // Target: ≤ 3
                on_time_rate: totalWithMom > 0 ? Math.round((stats.on_time / totalWithMom) * 100 * 10) / 10 : 0
            }
        }
    } catch (error) {
        console.error('Error fetching meeting minutes KPI:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

// KPI Summary by Organizer (เจ้าของ KPI)
export interface OrganizerKPI {
    organizer_id: string
    organizer_name: string
    total_meetings: number
    on_time_count: number
    late_count: number
    on_time_rate: number
    is_pass: boolean
}

export async function getMeetingMinutesKPIByOrganizer(year: number, organizerId?: string): Promise<{ success: boolean, data?: OrganizerKPI[], error?: string }> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('year', year)

        let whereClause = 'YEAR(m.meeting_date) = @year'
        if (organizerId) {
            whereClause += ' AND m.organized_by = @organizerId'
            request.input('organizerId', organizerId)
        }

        const result = await request.query(`
            SELECT
                m.organized_by AS organizer_id,
                COALESCE(NULLIF(e.first_name_th, '') + ' ' + NULLIF(e.last_name_th, ''), NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''), e.nickname, e.employee_code) AS organizer_name,
                COUNT(*) AS total_meetings,
                SUM(CASE WHEN m.is_on_time = 1 THEN 1 ELSE 0 END) AS on_time_count,
                SUM(CASE WHEN m.is_on_time = 0 THEN 1 ELSE 0 END) AS late_count,
                CASE
                    WHEN COUNT(CASE WHEN m.mom_sent_at IS NOT NULL THEN 1 END) > 0
                    THEN CAST(SUM(CASE WHEN m.is_on_time = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(CASE WHEN m.mom_sent_at IS NOT NULL THEN 1 END) * 100
                    ELSE 0
                END AS on_time_rate
            FROM pms.meeting_minutes_records m
            INNER JOIN pms.employees e ON m.organized_by = e.id
            WHERE ${whereClause}
            GROUP BY m.organized_by, e.first_name_th, e.last_name_th, e.first_name, e.last_name, e.nickname, e.employee_code
            ORDER BY SUM(CASE WHEN m.is_on_time = 0 THEN 1 ELSE 0 END) DESC, e.first_name_th, e.first_name
        `)

        const data = result.recordset.map((r: any) => ({
            organizer_id: r.organizer_id,
            organizer_name: r.organizer_name,
            total_meetings: r.total_meetings,
            on_time_count: r.on_time_count,
            late_count: r.late_count,
            on_time_rate: Math.round(r.on_time_rate * 10) / 10,
            is_pass: r.late_count <= 3  // Target: ส่งช้าไม่เกิน 3 ครั้งต่อปี
        }))

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching meeting minutes KPI by organizer:', error)
        return { success: false, error: 'Failed to fetch organizer KPI' }
    }
}

// Get Monthly Trend for Meeting Minutes
export async function getMeetingMinutesMonthlyTrend(year: number, organizerId?: string) {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('year', year)

        let whereClause = 'YEAR(meeting_date) = @year'
        if (organizerId) {
            whereClause += ' AND organized_by = @organizerId'
            request.input('organizerId', organizerId)
        }

        const result = await request.query(`
            SELECT
                MONTH(meeting_date) as month,
                COUNT(*) as total,
                SUM(CASE WHEN is_on_time = 1 THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN is_on_time = 0 THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN mom_sent_at IS NULL THEN 1 ELSE 0 END) as pending
            FROM pms.meeting_minutes_records
            WHERE ${whereClause}
            GROUP BY MONTH(meeting_date)
            ORDER BY MONTH(meeting_date)
        `)

        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

        const data = result.recordset.map((r: any) => {
            const total = r.total || 0
            const onTime = r.on_time || 0
            const late = r.late || 0
            const pending = r.pending || 0
            const completed = onTime + late
            const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100 * 10) / 10 : 0

            return {
                month: r.month,
                month_name: monthNames[r.month - 1],
                total,
                on_time: onTime,
                late,
                pending,
                on_time_rate: onTimeRate,
                is_pass: late <= 3
            }
        })

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching meeting minutes monthly trend:', error)
        return { success: false, error: 'Failed to fetch monthly trend', data: [] }
    }
}

// Submit meeting minutes record for approval
export async function submitMeetingMinutesForApproval(recordId: string, documentTitle: string) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get record details for approval data
        const recordResult = await pool.request()
            .input('id', recordId)
            .query(`
                SELECT mm.*, p.name as project_name, p.project_code
                FROM pms.meeting_minutes_records mm
                LEFT JOIN pms.projects p ON mm.project_id = p.id
                WHERE mm.id = @id
            `)

        if (recordResult.recordset.length === 0) {
            return { success: false, error: 'Record not found' }
        }

        const record = recordResult.recordset[0]

        // Submit for approval
        const result = await submitForApproval({
            flow_code: 'MEETING_MINUTES',
            module_code: 'KPI',
            document_id: recordId,
            document_type: 'MEETING_MINUTES',
            document_title: documentTitle,
            document_data: {
                project_id: record.project_id,
                project_name: record.project_name,
                meeting_date: record.meeting_date,
                meeting_type: record.meeting_type,
                meeting_title: record.meeting_title,
                organized_by: record.organized_by
            }
        })

        if (result.success && result.instance_id) {
            // Update record with approval status and instance_id
            await pool.request()
                .input('id', recordId)
                .input('instanceId', result.instance_id)
                .query(`
                    UPDATE pms.meeting_minutes_records
                    SET approval_status = 'PENDING',
                        approval_instance_id = @instanceId
                    WHERE id = @id
                `)
        }

        revalidatePath('/kpi-record/meeting-minutes')
        return result

    } catch (error: any) {
        console.error('Error submitting for approval:', error)
        return { success: false, error: error.message }
    }
}

// Update approval status (called by approval service callbacks)
export async function updateMeetingMinutesApprovalStatus(
    recordId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED'
) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', recordId)
            .input('status', status)
            .query(`
                UPDATE pms.meeting_minutes_records
                SET approval_status = @status
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/meeting-minutes')
        return { success: true }

    } catch (error: any) {
        console.error('Error updating approval status:', error)
        return { success: false, error: error.message }
    }
}

// Batch approve all pending Meeting Minutes records
export async function approveAllPendingMeetingMinutes() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Update all PENDING records to APPROVED
        const result = await pool.request()
            .query(`
                UPDATE pms.meeting_minutes_records
                SET approval_status = 'APPROVED'
                WHERE approval_status = 'PENDING'
            `)

        // Also complete any related approval instances
        await pool.request()
            .input('userId', user.id)
            .query(`
                UPDATE ai
                SET ai.status = 'COMPLETED', ai.completion_date = GETDATE()
                FROM pms.approval_instances ai
                INNER JOIN pms.meeting_minutes_records mm ON ai.document_id = mm.id
                WHERE ai.module_code = 'KPI'
                AND ai.document_type = 'MEETING_MINUTES'
                AND ai.status IN ('PENDING', 'IN_PROGRESS')
            `)

        revalidatePath('/kpi-record/meeting-minutes')
        return { success: true, count: result.rowsAffected[0] }

    } catch (error: any) {
        console.error('Error approving pending meeting minutes:', error)
        return { success: false, error: error.message }
    }
}
