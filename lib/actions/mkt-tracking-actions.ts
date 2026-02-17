'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { MKT_STAGES, MktStageCode } from '@/lib/constants/mkt-stages'

// Re-export for convenience (but as a function to satisfy 'use server')
export async function getMktStages() {
    return MKT_STAGES
}

export interface MktProject {
    id: string
    project_code: string
    title: string
    description?: string
    customer_id?: string
    client_name?: string  // alias for customer_name in UI
    mkt_stage: MktStageCode
    mkt_stage_changed_at?: string
    mkt_stage_changed_by?: string
    stage_changed_by_name?: string
    mkt_expected_value?: number
    mkt_mandays?: number
    mkt_mandays_sa?: number
    mkt_mandays_pg?: number
    mkt_mandays_pm?: number
    mkt_discount?: number
    mkt_contact_person?: string
    mkt_contact_phone?: string
    mkt_contact_email?: string
    mkt_meeting_date?: string
    mkt_last_meeting_date?: string
    mkt_quote_sent_date?: string
    mkt_dev_accepted_date?: string
    mkt_notes?: string
    project_manager_id?: string
    project_manager_name?: string
    project_owner_id?: string
    project_owner_name?: string
    status: string
    created_at: string
    created_by?: string
    created_by_name?: string
    days_in_stage: number
}

export interface MktTrackingLog {
    id: string
    project_id: string
    action_type: string
    from_stage?: string
    to_stage?: string
    notes?: string
    created_by: string
    created_by_name?: string
    created_at: string
}

export interface MktStageSummary {
    mkt_stage: MktStageCode
    project_count: number
    total_value: number
}

export interface MktProjectFilters {
    stage?: MktStageCode | 'ALL'
    search?: string
    projectManagerId?: string
    customerId?: string
    year?: number | 'ALL'
    projectId?: string
    ownerId?: string
    page?: number
    limit?: number
}

// Fetch MKT Projects with filters
export async function fetchMktProjects(filters?: MktProjectFilters): Promise<{
    success: boolean
    data?: MktProject[]
    total?: number
    page?: number
    limit?: number
    error?: string
}> {
    try {
        const pool = await getConnection()

        let baseQuery = `
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            LEFT JOIN pms.employees changed_by ON changed_by.id = p.mkt_stage_changed_by
            LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
            LEFT JOIN pms.employees owner ON owner.id = p.project_owner_id
            LEFT JOIN pms.employees creator ON creator.id = p.created_by
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
            WHERE pt.code = 'MKT'
            AND (psc.code IS NULL OR psc.code != 'CANCELLED')
        `

        const request = pool.request()

        // Apply filters
        if (filters?.stage && filters.stage !== 'ALL') {
            baseQuery += ` AND ISNULL(p.mkt_stage, 'NEW') = @stage`
            request.input('stage', filters.stage)
        }

        if (filters?.search) {
            baseQuery += ` AND (p.project_code LIKE @search OR p.name LIKE @search OR c.name LIKE @search)`
            request.input('search', `%${filters.search}%`)
        }

        if (filters?.projectManagerId) {
            baseQuery += ` AND p.project_manager_id = @pmId`
            request.input('pmId', filters.projectManagerId)
        }

        if (filters?.customerId) {
            baseQuery += ` AND p.customer_id = @customerId`
            request.input('customerId', filters.customerId)
        }

        if (filters?.year && filters.year !== 'ALL') {
            baseQuery += ` AND YEAR(p.created_at) = @year`
            request.input('year', filters.year)
        }

        if (filters?.projectId) {
            baseQuery += ` AND p.id = @filterProjectId`
            request.input('filterProjectId', filters.projectId)
        }

        if (filters?.ownerId) {
            baseQuery += ` AND p.project_owner_id = @ownerId`
            request.input('ownerId', filters.ownerId)
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`
        const countResult = await request.query(countQuery)
        const total = countResult.recordset[0].total

        // Pagination
        const page = filters?.page || 1
        const limit = filters?.limit || 10
        const offset = (page - 1) * limit

        request.input('offset', offset)
        request.input('limit', limit)

        const selectQuery = `
            SELECT
                p.id,
                p.project_code,
                p.name AS title,
                p.description,
                p.customer_id,
                c.name AS client_name,
                ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                p.mkt_stage_changed_at,
                p.mkt_stage_changed_by,
                COALESCE(changed_by.first_name_th + ' ' + changed_by.last_name_th, changed_by.first_name + ' ' + changed_by.last_name) AS stage_changed_by_name,
                p.mkt_expected_value,
                p.mkt_mandays,
                p.mkt_mandays_sa,
                p.mkt_mandays_pg,
                p.mkt_mandays_pm,
                p.mkt_discount,
                p.mkt_contact_person,
                p.mkt_contact_phone,
                p.mkt_contact_email,
                p.mkt_meeting_date,
                p.mkt_last_meeting_date,
                p.mkt_quote_sent_date,
                p.mkt_dev_accepted_date,
                p.mkt_notes,
                p.project_manager_id,
                COALESCE(pm.first_name_th + ' ' + pm.last_name_th, pm.first_name + ' ' + pm.last_name) AS project_manager_name,
                p.project_owner_id,
                COALESCE(owner.first_name_th + ' ' + owner.last_name_th, owner.first_name + ' ' + owner.last_name) AS project_owner_name,
                p.status_id AS status,
                p.created_at,
                p.created_by,
                COALESCE(creator.first_name_th + ' ' + creator.last_name_th, creator.first_name + ' ' + creator.last_name) AS created_by_name,
                DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) AS days_in_stage
            ${baseQuery}
            ORDER BY
                CASE ISNULL(p.mkt_stage, 'NEW')
                    WHEN 'NEW' THEN 1
                    WHEN 'CONTACT' THEN 2
                    WHEN 'ESTIMATING' THEN 3
                    WHEN 'QUOTED' THEN 4
                    WHEN 'PRICE_SENT' THEN 5
                    ELSE 6
                END,
                p.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `

        const result = await request.query(selectQuery)

        return {
            success: true,
            data: result.recordset,
            total,
            page,
            limit
        }
    } catch (error) {
        console.error('Error fetching MKT projects:', error)
        return { success: false, error: 'Failed to fetch MKT projects' }
    }
}

// Fetch single MKT Project by ID
export async function fetchMktProjectById(projectId: string): Promise<{
    success: boolean
    data?: MktProject
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT
                    p.id,
                    p.project_code,
                    p.name AS title,
                    p.description,
                    p.customer_id,
                    c.name AS client_name,
                    ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                    p.mkt_stage_changed_at,
                    p.mkt_stage_changed_by,
                    COALESCE(changed_by.first_name_th + ' ' + changed_by.last_name_th, changed_by.first_name + ' ' + changed_by.last_name) AS stage_changed_by_name,
                    p.mkt_expected_value,
                    p.mkt_mandays,
                    p.mkt_mandays_sa,
                    p.mkt_mandays_pg,
                    p.mkt_mandays_pm,
                    p.mkt_discount,
                    p.mkt_contact_person,
                    p.mkt_contact_phone,
                    p.mkt_contact_email,
                    p.mkt_meeting_date,
                    p.mkt_last_meeting_date,
                    p.mkt_quote_sent_date,
                    p.mkt_dev_accepted_date,
                    p.mkt_notes,
                    p.project_manager_id,
                    COALESCE(pm.first_name_th + ' ' + pm.last_name_th, pm.first_name + ' ' + pm.last_name) AS project_manager_name,
                    p.project_owner_id,
                    COALESCE(owner.first_name_th + ' ' + owner.last_name_th, owner.first_name + ' ' + owner.last_name) AS project_owner_name,
                    p.status_id AS status,
                    p.created_at,
                    p.created_by,
                    COALESCE(creator.first_name_th + ' ' + creator.last_name_th, creator.first_name + ' ' + creator.last_name) AS created_by_name,
                    DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) AS days_in_stage
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.customers c ON c.id = p.customer_id
                LEFT JOIN pms.employees changed_by ON changed_by.id = p.mkt_stage_changed_by
                LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
                LEFT JOIN pms.employees owner ON owner.id = p.project_owner_id
                LEFT JOIN pms.employees creator ON creator.id = p.created_by
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching MKT project:', error)
        return { success: false, error: 'Failed to fetch MKT project' }
    }
}

// Update MKT Stage
export async function updateMktStage(
    projectId: string,
    newStage: MktStageCode,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get current stage
        const currentResult = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT p.mkt_stage
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        if (currentResult.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        const fromStage = currentResult.recordset[0].mkt_stage || 'NEW'

        // Update stage
        await pool.request()
            .input('projectId', projectId)
            .input('newStage', newStage)
            .input('userId', user.id)
            .query(`
                UPDATE pms.projects
                SET mkt_stage = @newStage,
                    mkt_stage_changed_at = GETDATE(),
                    mkt_stage_changed_by = @userId
                WHERE id = @projectId
            `)

        // Log the change
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'STAGE_CHANGE')
            .input('fromStage', fromStage)
            .input('toStage', newStage)
            .input('notes', notes || null)
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, from_stage, to_stage, notes, created_by)
                VALUES (@projectId, @actionType, @fromStage, @toStage, @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true }
    } catch (error) {
        console.error('Error updating MKT stage:', error)
        return { success: false, error: 'Failed to update stage' }
    }
}

// Update MKT Details (contact info, expected value, meeting date, notes)
export async function updateMktDetails(
    projectId: string,
    data: {
        mkt_expected_value?: number | null
        mkt_mandays?: number | null
        mkt_mandays_sa?: number | null
        mkt_mandays_pg?: number | null
        mkt_mandays_pm?: number | null
        mkt_discount?: number | null
        mkt_contact_person?: string | null
        mkt_contact_phone?: string | null
        mkt_contact_email?: string | null
        mkt_meeting_date?: string | null
        mkt_last_meeting_date?: string | null
        mkt_quote_sent_date?: string | null
        mkt_dev_accepted_date?: string | null
        mkt_notes?: string | null
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const request = pool.request()
            .input('projectId', projectId)
            .input('userId', user.id)

        const setClauses: string[] = []

        if (data.mkt_expected_value !== undefined) {
            setClauses.push('mkt_expected_value = @expectedValue')
            request.input('expectedValue', data.mkt_expected_value)
        }

        if (data.mkt_mandays !== undefined) {
            setClauses.push('mkt_mandays = @mandays')
            request.input('mandays', data.mkt_mandays)
        }

        if (data.mkt_mandays_sa !== undefined) {
            setClauses.push('mkt_mandays_sa = @mandaysSa')
            request.input('mandaysSa', data.mkt_mandays_sa)
        }

        if (data.mkt_mandays_pg !== undefined) {
            setClauses.push('mkt_mandays_pg = @mandaysPg')
            request.input('mandaysPg', data.mkt_mandays_pg)
        }

        if (data.mkt_mandays_pm !== undefined) {
            setClauses.push('mkt_mandays_pm = @mandaysPm')
            request.input('mandaysPm', data.mkt_mandays_pm)
        }

        if (data.mkt_discount !== undefined) {
            setClauses.push('mkt_discount = @discount')
            request.input('discount', data.mkt_discount)
        }

        if (data.mkt_contact_person !== undefined) {
            setClauses.push('mkt_contact_person = @contactPerson')
            request.input('contactPerson', data.mkt_contact_person)
        }

        if (data.mkt_contact_phone !== undefined) {
            setClauses.push('mkt_contact_phone = @contactPhone')
            request.input('contactPhone', data.mkt_contact_phone)
        }

        if (data.mkt_contact_email !== undefined) {
            setClauses.push('mkt_contact_email = @contactEmail')
            request.input('contactEmail', data.mkt_contact_email)
        }

        if (data.mkt_meeting_date !== undefined) {
            setClauses.push('mkt_meeting_date = @meetingDate')
            request.input('meetingDate', data.mkt_meeting_date || null)
        }

        if (data.mkt_last_meeting_date !== undefined) {
            setClauses.push('mkt_last_meeting_date = @lastMeetingDate')
            request.input('lastMeetingDate', data.mkt_last_meeting_date || null)
        }

        if (data.mkt_quote_sent_date !== undefined) {
            setClauses.push('mkt_quote_sent_date = @quoteSentDate')
            request.input('quoteSentDate', data.mkt_quote_sent_date || null)
        }

        if (data.mkt_dev_accepted_date !== undefined) {
            setClauses.push('mkt_dev_accepted_date = @devAcceptedDate')
            request.input('devAcceptedDate', data.mkt_dev_accepted_date || null)
        }

        if (data.mkt_notes !== undefined) {
            setClauses.push('mkt_notes = @notes')
            request.input('notes', data.mkt_notes)
        }

        if (setClauses.length === 0) {
            return { success: true } // Nothing to update
        }

        await request.query(`
            UPDATE p
            SET ${setClauses.join(', ')}
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
            WHERE p.id = @projectId AND pt.code = 'MKT'
        `)

        // Log the update
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'DETAILS_UPDATED')
            .input('notes', 'Updated project details')
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, notes, created_by)
                VALUES (@projectId, @actionType, @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true }
    } catch (error) {
        console.error('Error updating MKT details:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to update details'
        return { success: false, error: errorMessage }
    }
}

// Schedule meeting
export async function scheduleMktMeeting(
    projectId: string,
    meetingDate: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('projectId', projectId)
            .input('meetingDate', meetingDate)
            .query(`
                UPDATE p
                SET p.mkt_meeting_date = @meetingDate
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        // Log the meeting schedule
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'MEETING_SCHEDULED')
            .input('notes', notes || `Meeting scheduled: ${meetingDate}`)
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, notes, created_by)
                VALUES (@projectId, @actionType, @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true }
    } catch (error) {
        console.error('Error scheduling meeting:', error)
        return { success: false, error: 'Failed to schedule meeting' }
    }
}

// Fetch tracking logs for a project
export async function fetchMktTrackingLogs(projectId: string): Promise<{
    success: boolean
    data?: MktTrackingLog[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT
                    l.id,
                    l.project_id,
                    l.action_type,
                    l.from_stage,
                    l.to_stage,
                    l.notes,
                    l.created_by,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS created_by_name,
                    l.created_at
                FROM pms.mkt_tracking_logs l
                LEFT JOIN pms.employees e ON e.id = l.created_by
                WHERE l.project_id = @projectId
                ORDER BY l.created_at DESC
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching tracking logs:', error)
        return { success: false, error: 'Failed to fetch tracking logs' }
    }
}

// Fetch stage summary
export async function fetchMktStageSummary(): Promise<{
    success: boolean
    data?: MktStageSummary[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .query(`
                SELECT
                    ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                    COUNT(*) AS project_count,
                    ISNULL(SUM(p.mkt_expected_value), 0) AS total_value
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
                WHERE pt.code = 'MKT'
                AND (psc.code IS NULL OR psc.code != 'CANCELLED')
                GROUP BY p.mkt_stage
            `)

        // Ensure all stages are represented
        const stageMap = new Map(result.recordset.map((r: MktStageSummary) => [r.mkt_stage, r]))
        const allStages: MktStageSummary[] = MKT_STAGES.map(stage => ({
            mkt_stage: stage.code,
            project_count: stageMap.get(stage.code)?.project_count || 0,
            total_value: stageMap.get(stage.code)?.total_value || 0
        }))

        return { success: true, data: allStages }
    } catch (error) {
        console.error('Error fetching stage summary:', error)
        return { success: false, error: 'Failed to fetch stage summary' }
    }
}

// Convert MKT project to DEV (Won)
export async function convertMktToDev(
    projectId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Log before conversion
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'CONVERTED_TO_DEV')
            .input('notes', notes || 'Project won - converted to DEV')
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, notes, created_by)
                VALUES (@projectId, @actionType, @notes, @userId)
            `)

        // Update project type to DEV
        // First get DEV type id
        const devTypeResult = await pool.request()
            .query(`SELECT id FROM pms.project_types WHERE code = 'DEV'`)

        if (devTypeResult.recordset.length === 0) {
            return { success: false, error: 'DEV project type not found' }
        }

        const devTypeId = devTypeResult.recordset[0].id

        await pool.request()
            .input('projectId', projectId)
            .input('devTypeId', devTypeId)
            .query(`
                UPDATE p
                SET p.project_type_id = @devTypeId
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        revalidatePath('/mkt-tracking')
        revalidatePath('/projects')
        return { success: true }
    } catch (error) {
        console.error('Error converting to DEV:', error)
        return { success: false, error: 'Failed to convert project' }
    }
}

// Cancel MKT project (set status to CANCELLED)
export async function cancelMktProject(projectId: string, reason?: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get CANCELLED status id
        const statusResult = await pool.request()
            .query(`SELECT id FROM pms.project_status_configs WHERE code = 'CANCELLED'`)

        if (statusResult.recordset.length === 0) {
            return { success: false, error: 'CANCELLED status not found' }
        }

        const cancelledStatusId = statusResult.recordset[0].id

        // Update project status to CANCELLED (only if MKT type)
        await pool.request()
            .input('projectId', projectId)
            .input('statusId', cancelledStatusId)
            .query(`
                UPDATE p
                SET p.status_id = @statusId
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        // Log the cancellation
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'CANCELLED')
            .input('notes', reason || 'โครงการถูกยกเลิก')
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, notes, created_by)
                VALUES (@projectId, @actionType, @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true }
    } catch (error) {
        console.error('Error cancelling MKT project:', error)
        return { success: false, error: 'Failed to cancel project' }
    }
}

// Add note to MKT project
export async function addMktNote(
    projectId: string,
    note: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Append note to existing notes
        await pool.request()
            .input('projectId', projectId)
            .input('note', note)
            .query(`
                UPDATE p
                SET p.mkt_notes = CASE
                    WHEN p.mkt_notes IS NULL OR p.mkt_notes = '' THEN @note
                    ELSE p.mkt_notes + CHAR(13) + CHAR(10) + @note
                END
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE p.id = @projectId AND pt.code = 'MKT'
            `)

        // Log the note
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'NOTE_ADDED')
            .input('notes', note)
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, notes, created_by)
                VALUES (@projectId, @actionType, @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true }
    } catch (error) {
        console.error('Error adding note:', error)
        return { success: false, error: 'Failed to add note' }
    }
}

// Get customers for dropdown
export async function fetchCustomersForMkt(): Promise<{
    success: boolean
    data?: { id: string; name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`SELECT id, name FROM pms.customers WHERE is_active = 1 ORDER BY name`)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching customers:', error)
        return { success: false, error: 'Failed to fetch customers' }
    }
}

// Get employees for dropdown (project managers)
export async function fetchEmployeesForMkt(): Promise<{
    success: boolean
    data?: { id: string; full_name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT
                    e.id,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as full_name
                FROM pms.employees e
                WHERE e.is_active = 1
                ORDER BY e.first_name_th, e.first_name
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching employees:', error)
        return { success: false, error: 'Failed to fetch employees' }
    }
}

// Create new MKT Project
export interface CreateMktProjectData {
    project_code: string
    name: string
    name_th?: string
    customer_id?: string
    project_manager_id?: string
    project_owner_id?: string
    description?: string
}

export async function createMktProject(data: CreateMktProjectData): Promise<{
    success: boolean
    data?: { id: string }
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get MKT project type id
        const typeResult = await pool.request()
            .query(`SELECT id FROM pms.project_types WHERE code = 'MKT'`)

        if (typeResult.recordset.length === 0) {
            return { success: false, error: 'MKT project type not found' }
        }

        const mktTypeId = typeResult.recordset[0].id
        const currentYear = new Date().getFullYear()

        // Get default status (PLANNING)
        const statusResult = await pool.request()
            .query(`SELECT TOP 1 id FROM pms.project_status_configs WHERE code = 'PLANNING'`)
        const statusId = statusResult.recordset.length > 0 ? statusResult.recordset[0].id : null

        // Create the project
        const result = await pool.request()
            .input('project_code', data.project_code)
            .input('project_year', currentYear)
            .input('name', data.name)
            .input('name_th', data.name_th || null)
            .input('description', data.description || null)
            .input('customer_id', data.customer_id || null)
            .input('project_manager_id', data.project_manager_id || null)
            .input('project_owner_id', data.project_owner_id || null)
            .input('project_type_id', mktTypeId)
            .input('mkt_stage', 'NEW')
            .input('status_id', statusId)
            .input('created_by', user.id)
            .query(`
                INSERT INTO pms.projects
                (project_code, project_year, name, name_th, description, customer_id,
                 project_manager_id, project_owner_id, project_type_id, mkt_stage,
                 mkt_stage_changed_at, mkt_stage_changed_by, status_id, created_by, created_at)
                OUTPUT INSERTED.id
                VALUES
                (@project_code, @project_year, @name, @name_th, @description, @customer_id,
                 @project_manager_id, @project_owner_id, @project_type_id, @mkt_stage,
                 GETDATE(), @created_by, @status_id, @created_by, GETDATE())
            `)

        const projectId = result.recordset[0].id

        // Auto-create MKT milestone for the project
        const mktMilestoneConfig = await pool.request()
            .query(`SELECT id FROM pms.milestone_configs WHERE code = 'MKT'`)

        if (mktMilestoneConfig.recordset.length > 0) {
            await pool.request()
                .input('project_id', projectId)
                .input('milestone_config_id', mktMilestoneConfig.recordset[0].id)
                .query(`
                    INSERT INTO pms.project_milestones
                    (project_id, milestone_config_id, planned_mandays, weight_percent, sort_order, progress_percent)
                    VALUES
                    (@project_id, @milestone_config_id, 0, 100, 0, 0)
                `)
        }

        // Log the creation
        await pool.request()
            .input('projectId', projectId)
            .input('actionType', 'CREATED')
            .input('notes', 'โครงการ MKT ถูกสร้างขึ้น')
            .input('userId', user.id)
            .query(`
                INSERT INTO pms.mkt_tracking_logs (project_id, action_type, to_stage, notes, created_by)
                VALUES (@projectId, @actionType, 'NEW', @notes, @userId)
            `)

        revalidatePath('/mkt-tracking')
        return { success: true, data: { id: projectId } }
    } catch (error) {
        console.error('Error creating MKT project:', error)
        return { success: false, error: 'Failed to create MKT project' }
    }
}

// Backfill MKT milestone for existing MKT projects that don't have one
export async function backfillMktMilestones(): Promise<{
    success: boolean
    count?: number
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // 1. Backfill MKT milestones
        const result = await pool.request()
            .query(`
                INSERT INTO pms.project_milestones (project_id, milestone_config_id, planned_mandays, weight_percent, sort_order, progress_percent)
                SELECT p.id, mc.id, 0, 100, 0, 0
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON p.project_type_id = pt.id
                CROSS JOIN pms.milestone_configs mc
                WHERE pt.code = 'MKT'
                  AND mc.code = 'MKT'
                  AND p.is_active = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM pms.project_milestones pm
                      WHERE pm.project_id = p.id AND pm.milestone_config_id = mc.id
                  )
            `)

        // 2. Set status_id = PLANNING for MKT projects that have NULL status_id
        await pool.request()
            .query(`
                UPDATE p
                SET p.status_id = psc.id
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON p.project_type_id = pt.id
                CROSS JOIN pms.project_status_configs psc
                WHERE pt.code = 'MKT'
                  AND psc.code = 'PLANNING'
                  AND p.is_active = 1
                  AND p.status_id IS NULL
            `)

        return { success: true, count: result.rowsAffected[0] }
    } catch (error) {
        console.error('Error backfilling MKT milestones:', error)
        return { success: false, error: 'Failed to backfill milestones' }
    }
}

// Fetch filter options for MKT Tracking page
export interface MktFilterOptions {
    years: number[]
    customers: { id: string; name: string }[]
    projects: { id: string; project_code: string; name: string }[]
    owners: { id: string; full_name: string }[]
    pms: { id: string; full_name: string }[]
}

export async function fetchMktFilterOptions(): Promise<{
    success: boolean
    data?: MktFilterOptions
    error?: string
}> {
    try {
        const pool = await getConnection()

        // Fetch years from MKT projects
        const yearsResult = await pool.request()
            .query(`
                SELECT DISTINCT YEAR(p.created_at) AS year
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE pt.code = 'MKT'
                ORDER BY year DESC
            `)

        // Fetch customers that have MKT projects
        const customersResult = await pool.request()
            .query(`
                SELECT DISTINCT c.id, c.name
                FROM pms.customers c
                INNER JOIN pms.projects p ON p.customer_id = c.id
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE pt.code = 'MKT'
                ORDER BY c.name
            `)

        // Fetch MKT projects for filter (exclude cancelled)
        const projectsResult = await pool.request()
            .query(`
                SELECT p.id, p.project_code, p.name
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
                WHERE pt.code = 'MKT'
                AND (psc.code IS NULL OR psc.code != 'CANCELLED')
                ORDER BY p.project_code DESC
            `)

        // Fetch owners that are assigned to MKT projects
        const ownersResult = await pool.request()
            .query(`
                SELECT DISTINCT e.id,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as full_name
                FROM pms.employees e
                INNER JOIN pms.projects p ON p.project_owner_id = e.id
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE pt.code = 'MKT' AND e.is_active = 1
                ORDER BY full_name
            `)

        // Fetch PMs that are assigned to MKT projects
        const pmsResult = await pool.request()
            .query(`
                SELECT DISTINCT e.id,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as full_name
                FROM pms.employees e
                INNER JOIN pms.projects p ON p.project_manager_id = e.id
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                WHERE pt.code = 'MKT' AND e.is_active = 1
                ORDER BY full_name
            `)

        return {
            success: true,
            data: {
                years: yearsResult.recordset.map((r: { year: number }) => r.year),
                customers: customersResult.recordset,
                projects: projectsResult.recordset,
                owners: ownersResult.recordset,
                pms: pmsResult.recordset
            }
        }
    } catch (error) {
        console.error('Error fetching filter options:', error)
        return { success: false, error: 'Failed to fetch filter options' }
    }
}

// ============================================================
// Dashboard Data
// ============================================================

export interface MktDashboardKpi {
    totalProjects: number
    totalMandays: number
    meetingScheduled: number
    waitingQuote: number
    quoted: number
    quotedPercent: number
    avgDaysToQuote: number
    devAccepted: number
    devPending: number
}

export interface MktDashboardPipeline {
    stage: MktStageCode
    label: string
    count: number
    value: number
    mandays: number
    color: string
}

export interface MktDashboardInsight {
    type: 'warning' | 'success' | 'info'
    message: string
}

export interface MktDashboardAging {
    label: string
    count: number
    color: string
}

export interface MktDashboardCustomer {
    customerName: string
    projectCount: number
    totalMandays: number
    color: string
}

export interface MktDashboardTeamWorkload {
    name: string
    totalProjects: number
    pendingProjects: number
    avgDays: number
}

export interface MktDashboardPendingProject {
    id: string
    project_code: string
    title: string
    client_name: string
    mkt_stage: MktStageCode
    created_at: string
    mkt_meeting_date: string | null
    days_in_stage: number
    project_owner_name: string | null
}

export interface MktDashboardData {
    kpi: MktDashboardKpi
    pipeline: MktDashboardPipeline[]
    insights: MktDashboardInsight[]
    agingDistribution: MktDashboardAging[]
    customerDistribution: MktDashboardCustomer[]
    teamWorkload: MktDashboardTeamWorkload[]
    pendingProjects: MktDashboardPendingProject[]
}

export interface MktDashboardFilters {
    year?: number
    customerId?: string
    projectManagerId?: string
    ownerId?: string
}

const STAGE_COLORS: Record<string, string> = {
    NEW: '#3B82F6',
    CONTACT: '#A855F7',
    ESTIMATING: '#EAB308',
    QUOTED: '#22C55E',
    PRICE_SENT: '#14B8A6',
}

export async function fetchMktDashboardData(filters?: MktDashboardFilters): Promise<{
    success: boolean
    data?: MktDashboardData
    error?: string
}> {
    try {
        const pool = await getConnection()

        // Build shared WHERE clause
        let filterClause = `
            WHERE pt.code = 'MKT'
            AND (psc.code IS NULL OR psc.code != 'CANCELLED')
        `
        const filterParams: { name: string; value: any }[] = []

        if (filters?.year) {
            filterClause += ` AND YEAR(p.created_at) = @filterYear`
            filterParams.push({ name: 'filterYear', value: filters.year })
        }
        if (filters?.customerId) {
            filterClause += ` AND p.customer_id = @filterCustomerId`
            filterParams.push({ name: 'filterCustomerId', value: filters.customerId })
        }
        if (filters?.projectManagerId) {
            filterClause += ` AND p.project_manager_id = @filterPmId`
            filterParams.push({ name: 'filterPmId', value: filters.projectManagerId })
        }
        if (filters?.ownerId) {
            filterClause += ` AND p.project_owner_id = @filterOwnerId`
            filterParams.push({ name: 'filterOwnerId', value: filters.ownerId })
        }

        const applyParams = (req: any) => {
            filterParams.forEach(p => req.input(p.name, p.value))
            return req
        }

        const baseFrom = `
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
        `

        // 1. Pipeline summary (count + value per stage)
        const pipelineReq = applyParams(pool.request())
        const pipelineResult = await pipelineReq.query(`
            SELECT
                ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                COUNT(*) AS project_count,
                ISNULL(SUM(p.mkt_expected_value), 0) AS total_value,
                ISNULL(SUM(p.mkt_mandays), 0) AS total_mandays
            ${baseFrom}
            ${filterClause}
            GROUP BY p.mkt_stage
        `)

        // 2. Avg days to quote + DEV acceptance counts
        const avgReq = applyParams(pool.request())
        const avgResult = await avgReq.query(`
            SELECT
                AVG(DATEDIFF(day, p.created_at, p.mkt_quote_sent_date)) AS avg_days,
                SUM(CASE WHEN p.mkt_dev_accepted_date IS NOT NULL THEN 1 ELSE 0 END) AS dev_accepted,
                SUM(CASE WHEN p.mkt_dev_accepted_date IS NULL THEN 1 ELSE 0 END) AS dev_pending
            ${baseFrom}
            ${filterClause}
        `)

        // 3. Aging distribution
        const agingReq = applyParams(pool.request())
        const agingResult = await agingReq.query(`
            SELECT
                aging_group,
                COUNT(*) AS cnt
            FROM (
                SELECT
                    CASE
                        WHEN DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) < 3 THEN 'FRESH'
                        WHEN DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) <= 7 THEN 'MODERATE'
                        ELSE 'OVERDUE'
                    END AS aging_group
                ${baseFrom}
                ${filterClause}
                AND ISNULL(p.mkt_stage, 'NEW') NOT IN ('QUOTED', 'PRICE_SENT')
            ) sub
            GROUP BY aging_group
        `)

        // 4. Customer distribution (top customers by project count + mandays)
        const customerReq = applyParams(pool.request())
        const customerResult = await customerReq.query(`
            SELECT TOP 10
                ISNULL(c.name, 'ไม่ระบุลูกค้า') AS customer_name,
                COUNT(*) AS project_count,
                ISNULL(SUM(p.mkt_mandays), 0) AS total_mandays
            ${baseFrom}
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            ${filterClause}
            GROUP BY c.name
            ORDER BY project_count DESC, total_mandays DESC
        `)

        // 5. Team workload
        const teamReq = applyParams(pool.request())
        const teamResult = await teamReq.query(`
            SELECT
                COALESCE(owner.first_name_th + ' ' + owner.last_name_th, owner.first_name + ' ' + owner.last_name) AS owner_name,
                COUNT(*) AS total_projects,
                SUM(CASE WHEN ISNULL(p.mkt_stage, 'NEW') NOT IN ('QUOTED', 'PRICE_SENT') THEN 1 ELSE 0 END) AS pending_projects,
                AVG(DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE())) AS avg_days
            ${baseFrom}
            LEFT JOIN pms.employees owner ON owner.id = p.project_owner_id
            ${filterClause}
            AND p.project_owner_id IS NOT NULL
            GROUP BY owner.first_name_th, owner.last_name_th, owner.first_name, owner.last_name
            ORDER BY pending_projects DESC
        `)

        // 5. Pending projects (not yet quoted)
        const pendingReq = applyParams(pool.request())
        const pendingResult = await pendingReq.query(`
            SELECT
                p.id,
                p.project_code,
                p.name AS title,
                c.name AS client_name,
                ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                p.created_at,
                p.mkt_meeting_date,
                DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) AS days_in_stage,
                COALESCE(owner.first_name_th + ' ' + owner.last_name_th, owner.first_name + ' ' + owner.last_name) AS project_owner_name
            ${baseFrom}
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            LEFT JOIN pms.employees owner ON owner.id = p.project_owner_id
            ${filterClause}
            AND ISNULL(p.mkt_stage, 'NEW') NOT IN ('QUOTED', 'PRICE_SENT')
            ORDER BY DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) DESC
        `)

        // Process pipeline data
        const stageMap = new Map<string, { project_count: number; total_value: number; total_mandays: number }>(
            pipelineResult.recordset.map((r: any) => [r.mkt_stage || 'NEW', r])
        )
        const pipeline: MktDashboardPipeline[] = MKT_STAGES.map(s => ({
            stage: s.code,
            label: s.label,
            count: stageMap.get(s.code)?.project_count || 0,
            value: stageMap.get(s.code)?.total_value || 0,
            mandays: stageMap.get(s.code)?.total_mandays || 0,
            color: STAGE_COLORS[s.code] || '#6B7280',
        }))

        const totalProjects = pipeline.reduce((sum, p) => sum + p.count, 0)
        const contactCount = stageMap.get('CONTACT')?.project_count || 0
        const quotedCount = (stageMap.get('QUOTED')?.project_count || 0) + (stageMap.get('PRICE_SENT')?.project_count || 0)
        const waitingCount = totalProjects - quotedCount
        const avgDaysToQuote = avgResult.recordset[0]?.avg_days || 0

        // Build KPI
        const totalMandays = pipeline.reduce((sum, p) => sum + p.mandays, 0)

        const devAccepted = avgResult.recordset[0]?.dev_accepted || 0
        const devPending = avgResult.recordset[0]?.dev_pending || 0

        const kpi: MktDashboardKpi = {
            totalProjects,
            totalMandays,
            meetingScheduled: contactCount,
            waitingQuote: waitingCount,
            quoted: quotedCount,
            quotedPercent: totalProjects > 0 ? Math.round((quotedCount / totalProjects) * 100) : 0,
            avgDaysToQuote: Math.round(avgDaysToQuote * 10) / 10,
            devAccepted,
            devPending,
        }

        // Build aging distribution
        const agingMap = new Map<string, number>(agingResult.recordset.map((r: any) => [r.aging_group, r.cnt]))
        const agingDistribution: MktDashboardAging[] = [
            { label: '< 3 วัน', count: agingMap.get('FRESH') || 0, color: '#22C55E' },
            { label: '3-7 วัน', count: agingMap.get('MODERATE') || 0, color: '#EAB308' },
            { label: '> 7 วัน', count: agingMap.get('OVERDUE') || 0, color: '#EF4444' },
        ]

        // Build insights
        const insights: MktDashboardInsight[] = []

        // Bottleneck insight
        const preSalesStages = pipeline.filter(p => !['QUOTED', 'PRICE_SENT'].includes(p.stage))
        if (preSalesStages.length > 0 && waitingCount > 0) {
            const bottleneck = preSalesStages.reduce((max, s) => s.count > max.count ? s : max, preSalesStages[0])
            if (bottleneck.count > 0) {
                const pct = Math.round((bottleneck.count / waitingCount) * 100)
                insights.push({
                    type: 'warning',
                    message: `${pct}% ของงานรอดำเนินการค้างอยู่ที่ขั้น "${bottleneck.label}" (${bottleneck.count} โครงการ)`
                })
            }
        }

        // Avg days insight
        if (avgDaysToQuote > 0) {
            insights.push({
                type: avgDaysToQuote <= 5 ? 'success' : 'info',
                message: `เวลาเฉลี่ยจากรับงานถึงเสนอราคา ${kpi.avgDaysToQuote} วัน`
            })
        }

        // Quoted rate insight
        if (totalProjects > 0) {
            insights.push({
                type: kpi.quotedPercent >= 50 ? 'success' : 'info',
                message: `อัตราเสนอราคาสำเร็จ ${kpi.quotedPercent}% (${quotedCount} จาก ${totalProjects} โครงการ)`
            })
        }


        // Build team workload
        const teamWorkload: MktDashboardTeamWorkload[] = teamResult.recordset.map((r: any) => ({
            name: r.owner_name || 'ไม่ระบุ',
            totalProjects: r.total_projects,
            pendingProjects: r.pending_projects,
            avgDays: Math.round(r.avg_days * 10) / 10,
        }))

        // Build customer distribution
        const CUSTOMER_COLORS = ['#3B82F6', '#A855F7', '#EAB308', '#22C55E', '#14B8A6', '#EF4444', '#F97316', '#EC4899', '#6366F1', '#84CC16']
        const customerDistribution: MktDashboardCustomer[] = customerResult.recordset.map((r: any, i: number) => ({
            customerName: r.customer_name,
            projectCount: r.project_count,
            totalMandays: r.total_mandays,
            color: CUSTOMER_COLORS[i % CUSTOMER_COLORS.length],
        }))

        return {
            success: true,
            data: {
                kpi,
                pipeline,
                insights,
                agingDistribution,
                customerDistribution,
                teamWorkload,
                pendingProjects: pendingResult.recordset,
            }
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error)
        return { success: false, error: 'Failed to fetch dashboard data' }
    }
}

// ============================================================
// Dashboard Drilldown (fetch projects for popup)
// ============================================================

export interface MktDrilldownProject {
    id: string
    project_code: string
    title: string
    client_name: string
    mkt_stage: string
    mkt_mandays: number
    mkt_dev_accepted_date: string | null
    project_owner_name: string | null
    days_in_stage: number
    created_at: string
}

export type MktDrilldownType =
    | { type: 'all' }
    | { type: 'stage'; stage: string }
    | { type: 'stages'; stages: string[] }
    | { type: 'devAccepted' }
    | { type: 'devPending' }
    | { type: 'customer'; customerName: string }

export async function fetchMktDrilldownProjects(
    filters: MktDashboardFilters,
    drilldown: MktDrilldownType
): Promise<{ success: boolean; data?: MktDrilldownProject[]; error?: string }> {
    try {
        const pool = await getConnection()

        let filterClause = `
            WHERE pt.code = 'MKT'
            AND (psc.code IS NULL OR psc.code != 'CANCELLED')
        `
        const request = pool.request()

        if (filters.year) {
            filterClause += ` AND YEAR(p.created_at) = @filterYear`
            request.input('filterYear', filters.year)
        }
        if (filters.customerId) {
            filterClause += ` AND p.customer_id = @filterCustomerId`
            request.input('filterCustomerId', filters.customerId)
        }
        if (filters.projectManagerId) {
            filterClause += ` AND p.project_manager_id = @filterPmId`
            request.input('filterPmId', filters.projectManagerId)
        }
        if (filters.ownerId) {
            filterClause += ` AND p.project_owner_id = @filterOwnerId`
            request.input('filterOwnerId', filters.ownerId)
        }

        // Drilldown-specific filters
        if (drilldown.type === 'stage') {
            filterClause += ` AND ISNULL(p.mkt_stage, 'NEW') = @drillStage`
            request.input('drillStage', drilldown.stage)
        } else if (drilldown.type === 'stages') {
            filterClause += ` AND ISNULL(p.mkt_stage, 'NEW') IN (${drilldown.stages.map((_, i) => `@ds${i}`).join(',')})`
            drilldown.stages.forEach((s, i) => request.input(`ds${i}`, s))
        } else if (drilldown.type === 'devAccepted') {
            filterClause += ` AND p.mkt_dev_accepted_date IS NOT NULL`
        } else if (drilldown.type === 'devPending') {
            filterClause += ` AND p.mkt_dev_accepted_date IS NULL`
        } else if (drilldown.type === 'customer') {
            if (drilldown.customerName === 'ไม่ระบุลูกค้า') {
                filterClause += ` AND p.customer_id IS NULL`
            } else {
                filterClause += ` AND c.name = @drillCustomer`
                request.input('drillCustomer', drilldown.customerName)
            }
        }

        const result = await request.query(`
            SELECT
                p.id,
                p.project_code,
                p.name AS title,
                ISNULL(c.name, 'ไม่ระบุ') AS client_name,
                ISNULL(p.mkt_stage, 'NEW') AS mkt_stage,
                ISNULL(p.mkt_mandays, 0) AS mkt_mandays,
                p.mkt_dev_accepted_date,
                COALESCE(owner.first_name_th + ' ' + owner.last_name_th, owner.first_name + ' ' + owner.last_name) AS project_owner_name,
                DATEDIFF(day, ISNULL(p.mkt_stage_changed_at, p.created_at), GETDATE()) AS days_in_stage,
                p.created_at
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            LEFT JOIN pms.employees owner ON owner.id = p.project_owner_id
            ${filterClause}
            ORDER BY p.created_at DESC
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching drilldown projects:', error)
        return { success: false, error: 'Failed to fetch drilldown data' }
    }
}
