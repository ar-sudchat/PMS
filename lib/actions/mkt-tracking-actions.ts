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
    mkt_expected_close_date?: string
    mkt_contact_person?: string
    mkt_contact_phone?: string
    mkt_contact_email?: string
    mkt_meeting_date?: string
    mkt_last_meeting_date?: string
    mkt_quote_sent_date?: string
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
}

// Fetch MKT Projects with filters
export async function fetchMktProjects(filters?: MktProjectFilters): Promise<{
    success: boolean
    data?: MktProject[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        let query = `
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
                p.mkt_expected_close_date,
                p.mkt_contact_person,
                p.mkt_contact_phone,
                p.mkt_contact_email,
                p.mkt_meeting_date,
                p.mkt_last_meeting_date,
                p.mkt_quote_sent_date,
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
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
            WHERE pt.code = 'MKT'
            AND (psc.code IS NULL OR psc.code != 'CANCELLED')
        `

        const request = pool.request()

        // Apply filters
        if (filters?.stage && filters.stage !== 'ALL') {
            query += ` AND ISNULL(p.mkt_stage, 'NEW') = @stage`
            request.input('stage', filters.stage)
        }

        if (filters?.search) {
            query += ` AND (p.project_code LIKE @search OR p.name LIKE @search OR c.name LIKE @search)`
            request.input('search', `%${filters.search}%`)
        }

        if (filters?.projectManagerId) {
            query += ` AND p.project_manager_id = @pmId`
            request.input('pmId', filters.projectManagerId)
        }

        if (filters?.customerId) {
            query += ` AND p.customer_id = @customerId`
            request.input('customerId', filters.customerId)
        }

        if (filters?.year && filters.year !== 'ALL') {
            query += ` AND YEAR(p.created_at) = @year`
            request.input('year', filters.year)
        }

        if (filters?.projectId) {
            query += ` AND p.id = @filterProjectId`
            request.input('filterProjectId', filters.projectId)
        }

        if (filters?.ownerId) {
            query += ` AND p.project_owner_id = @ownerId`
            request.input('ownerId', filters.ownerId)
        }

        query += ` ORDER BY
            CASE ISNULL(p.mkt_stage, 'NEW')
                WHEN 'NEW' THEN 1
                WHEN 'CONTACT' THEN 2
                WHEN 'ESTIMATING' THEN 3
                WHEN 'QUOTED' THEN 4
                ELSE 5
            END,
            p.created_at DESC`

        const result = await request.query(query)

        return { success: true, data: result.recordset }
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
                    p.mkt_expected_close_date,
                    p.mkt_contact_person,
                    p.mkt_contact_phone,
                    p.mkt_contact_email,
                    p.mkt_meeting_date,
                    p.mkt_last_meeting_date,
                    p.mkt_quote_sent_date,
                    p.mkt_notes,
                    p.project_manager_id,
                    COALESCE(pm.first_name_th + ' ' + pm.last_name_th, pm.first_name + ' ' + pm.last_name) AS project_manager_name,
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
        mkt_expected_close_date?: string | null
        mkt_contact_person?: string | null
        mkt_contact_phone?: string | null
        mkt_contact_email?: string | null
        mkt_meeting_date?: string | null
        mkt_last_meeting_date?: string | null
        mkt_quote_sent_date?: string | null
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

        if (data.mkt_expected_close_date !== undefined) {
            setClauses.push('mkt_expected_close_date = @closeDate')
            request.input('closeDate', data.mkt_expected_close_date || null)
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
            .input('created_by', user.id)
            .query(`
                INSERT INTO pms.projects
                (project_code, project_year, name, name_th, description, customer_id,
                 project_manager_id, project_owner_id, project_type_id, mkt_stage,
                 mkt_stage_changed_at, mkt_stage_changed_by, created_by, created_at)
                OUTPUT INSERTED.id
                VALUES
                (@project_code, @project_year, @name, @name_th, @description, @customer_id,
                 @project_manager_id, @project_owner_id, @project_type_id, @mkt_stage,
                 GETDATE(), @created_by, @created_by, GETDATE())
            `)

        const projectId = result.recordset[0].id

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
