'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
    submitForApproval,
    approveRequest as approveApprovalRequest,
    rejectRequest as rejectApprovalRequest,
    rollbackApproval
} from './approval-actions'
import {
    getApprovalInstanceByDocumentId,
    getApprovalInstance,
    getFlowTemplate,
    getFlowSteps
} from '@/lib/services/approval-service'

// ... (Keep Interfaces and CRUD Actions same until Workflow Actions)

const MODULE_CODE = 'PROJECT'
const DOCUMENT_TYPE = 'PROJECT_REQUEST'
const FLOW_CODE = 'PROJECT_REQUEST_FLOW'


// ============================================
// Types
// ============================================

export interface ProjectRequest {
    id: string
    request_code: string
    title: string
    description?: string
    customer_id?: string
    customer_name?: string
    contact_person?: string
    contact_email?: string
    contact_phone?: string
    project_type: string
    project_type_name?: string
    priority: string
    priority_name?: string
    priority_color?: string
    estimated_budget?: number
    estimated_mandays?: number
    expected_start_date?: string
    expected_end_date?: string
    status: string
    status_name?: string
    status_color?: string

    // notes?: string // Notes removed
    customer_contact_date?: string
    last_meeting_date?: string
    quotation_date?: string
    approval_date?: string // Manual approval date from form
    submitted_at?: string
    submitted_by?: string
    submitted_by_name?: string
    approved_at?: string
    approved_by?: string
    approved_by_name?: string
    rejected_at?: string
    rejected_by?: string
    rejected_by_name?: string
    rejection_reason?: string
    revision_reason?: string
    converted_project_id?: string
    converted_project_code?: string
    created_by: string
    created_by_name?: string
    created_at: string
    updated_at?: string
    attachment_count?: number
}

export interface ProjectRequestFormData {
    title: string
    description?: string
    customer_id?: string
    contact_person?: string
    contact_email?: string
    contact_phone?: string
    project_type: string
    priority: string
    estimated_budget?: number
    estimated_mandays?: number
    expected_start_date?: string
    expected_end_date?: string

    // notes?: string
    customer_contact_date?: string
    last_meeting_date?: string
    quotation_date?: string
    approval_date?: string
}

// ============================================
// CRUD Operations
// ============================================

// Generate Request Code
async function generateRequestCode(): Promise<string> {
    const pool = await getConnection()
    // Get sequence value
    const result = await pool.request()
        .query(`SELECT NEXT VALUE FOR pms.seq_project_request_code AS seq`)

    const seq = result.recordset[0].seq

    // Format: REQ-YYYYMM-XXXX
    const date = new Date()
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const seqStr = seq.toString().padStart(4, '0')

    return `REQ-${year}${month}-${seqStr}`
}

// Get all requests
export async function getProjectRequests(filters?: {
    status?: string
    customer_id?: string
    created_by?: string
    search?: string
}): Promise<ProjectRequest[]> {
    const pool = await getConnection()

    let query = `SELECT * FROM pms.vw_project_requests WHERE 1=1`
    const request = pool.request()

    if (filters?.status && filters.status !== 'all') {
        query += ` AND status = @status`
        request.input('status', sql.NVarChar, filters.status)
    }

    if (filters?.customer_id) {
        query += ` AND customer_id = @customer_id`
        request.input('customer_id', sql.UniqueIdentifier, filters.customer_id)
    }

    if (filters?.created_by) {
        query += ` AND created_by = @created_by`
        request.input('created_by', sql.UniqueIdentifier, filters.created_by)
    }

    if (filters?.search) {
        query += ` AND (title LIKE @search OR request_code LIKE @search OR customer_name LIKE @search)`
        request.input('search', sql.NVarChar, `%${filters.search}%`)
    }

    query += ` ORDER BY created_at DESC`

    const result = await request.query(query)
    return result.recordset
}

// Get single request by ID
export async function getProjectRequestById(id: string): Promise<ProjectRequest | null> {
    // If id is 'new', return null immediately (should check in component, but safe to check here)
    if (id === 'new') return null;

    const pool = await getConnection()

    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`SELECT * FROM pms.vw_project_requests WHERE id = @id`)

    return result.recordset[0] || null
}

// Get pending requests for approval
export async function getPendingProjectRequests(): Promise<ProjectRequest[]> {
    const pool = await getConnection()

    const result = await pool.request()
        .query(`SELECT * FROM pms.vw_pending_project_requests ORDER BY submitted_at ASC`)

    return result.recordset
}

// Get request details for sheet
export async function getProjectRequestDetailForSheet(id: string) {
    if (id === 'new') return null;

    const [request, history, approvalInfoStatus] = await Promise.all([
        getProjectRequestById(id),
        getRequestHistory(id),
        getApprovalInstanceByDocumentId(id, 'PROJECT')
    ])

    let approvalInstance = null
    let flowSteps: any[] = []

    if (approvalInfoStatus.instanceId) {
        const [instance, steps] = await Promise.all([
            getApprovalInstance(approvalInfoStatus.instanceId),
            getFlowTemplate('PROJECT_REQUEST').then(t => t ? getFlowSteps(t.id) : [])
        ])
        approvalInstance = instance
        flowSteps = steps
    }

    return {
        request,
        history,
        approvalInfoStatus,
        approvalInstance,
        flowSteps
    }
}

// Create new request
export async function createProjectRequest(
    data: ProjectRequestFormData,
    createdBy: string
): Promise<{ success: boolean; request?: ProjectRequest; error?: string }> {
    try {
        const pool = await getConnection()
        const requestCode = await generateRequestCode()

        // Fix empty strings to null for optional fields
        const customerId = data.customer_id && data.customer_id.trim() !== '' ? data.customer_id : null;
        const estimatedBudget = data.estimated_budget ? data.estimated_budget : null;
        const estimatedMandays = data.estimated_mandays ? data.estimated_mandays : null;
        const expectedStartDate = data.expected_start_date && data.expected_start_date.trim() !== '' ? data.expected_start_date : null;
        const expectedEndDate = data.expected_end_date && data.expected_end_date.trim() !== '' ? data.expected_end_date : null;
        const customerContactDate = data.customer_contact_date && data.customer_contact_date.trim() !== '' ? data.customer_contact_date : null;
        const lastMeetingDate = data.last_meeting_date && data.last_meeting_date.trim() !== '' ? data.last_meeting_date : null;
        const quotationDate = data.quotation_date && data.quotation_date.trim() !== '' ? data.quotation_date : null;
        const approvalDate = data.approval_date && data.approval_date.trim() !== '' ? data.approval_date : null;

        const result = await pool.request()
            .input('request_code', sql.NVarChar, requestCode)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('customer_id', sql.UniqueIdentifier, customerId)
            .input('contact_person', sql.NVarChar, data.contact_person || null)
            .input('contact_email', sql.NVarChar, data.contact_email || null)
            .input('contact_phone', sql.NVarChar, data.contact_phone || null)
            .input('project_type', sql.NVarChar, data.project_type)
            .input('priority', sql.NVarChar, data.priority)
            .input('estimated_budget', sql.Decimal(18, 2), estimatedBudget)
            .input('estimated_mandays', sql.Int, estimatedMandays)
            .input('expected_start_date', sql.Date, expectedStartDate)
            .input('expected_end_date', sql.Date, expectedEndDate)
            .input('customer_contact_date', sql.Date, customerContactDate)
            .input('last_meeting_date', sql.Date, lastMeetingDate)
            .input('quotation_date', sql.Date, quotationDate)
            .input('approval_date', sql.Date, approvalDate)
            .input('created_by', sql.UniqueIdentifier, createdBy)
            .query(`
        INSERT INTO pms.project_requests (
          request_code, title, description, customer_id,
          contact_person, contact_email, contact_phone,
          project_type, priority, estimated_budget, estimated_mandays,
          expected_start_date, expected_end_date,
          customer_contact_date, last_meeting_date, quotation_date, approval_date,
          created_by, created_at, status
        )
        OUTPUT INSERTED.id, INSERTED.request_code
        VALUES (
          @request_code, @title, @description, @customer_id,
          @contact_person, @contact_email, @contact_phone,
          @project_type, @priority, @estimated_budget, @estimated_mandays,
          @expected_start_date, @expected_end_date,
          @customer_contact_date, @last_meeting_date, @quotation_date, @approval_date,
          @created_by, GETDATE(), 'DRAFT'
        )
      `)

        revalidatePath('/project-requests')
        return { success: true, request: { id: result.recordset[0].id, request_code: result.recordset[0].request_code } as any }
    } catch (error: any) {
        console.error('Create project request error:', error)
        return { success: false, error: error.message }
    }
}

// Update request
export async function updateProjectRequest(
    id: string,
    data: ProjectRequestFormData,
    updatedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Fix empty strings to null for optional fields
        const customerId = data.customer_id && data.customer_id.trim() !== '' ? data.customer_id : null;
        const estimatedBudget = data.estimated_budget ? data.estimated_budget : null;
        const estimatedMandays = data.estimated_mandays ? data.estimated_mandays : null;
        const expectedStartDate = data.expected_start_date && data.expected_start_date.trim() !== '' ? data.expected_start_date : null;
        const expectedEndDate = data.expected_end_date && data.expected_end_date.trim() !== '' ? data.expected_end_date : null;
        const customerContactDate = data.customer_contact_date && data.customer_contact_date.trim() !== '' ? data.customer_contact_date : null;


        const lastMeetingDate = data.last_meeting_date && data.last_meeting_date.trim() !== '' ? data.last_meeting_date : null;
        const quotationDate = data.quotation_date && data.quotation_date.trim() !== '' ? data.quotation_date : null;
        const approvalDate = data.approval_date && data.approval_date.trim() !== '' ? data.approval_date : null;

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('customer_id', sql.UniqueIdentifier, customerId)
            .input('contact_person', sql.NVarChar, data.contact_person || null)
            .input('contact_email', sql.NVarChar, data.contact_email || null)
            .input('contact_phone', sql.NVarChar, data.contact_phone || null)
            .input('project_type', sql.NVarChar, data.project_type)
            .input('priority', sql.NVarChar, data.priority)
            .input('estimated_budget', sql.Decimal(18, 2), estimatedBudget)
            .input('estimated_mandays', sql.Int, estimatedMandays)
            .input('expected_start_date', sql.Date, expectedStartDate)
            .input('expected_end_date', sql.Date, expectedEndDate)
            .input('customer_contact_date', sql.Date, customerContactDate)
            .input('last_meeting_date', sql.Date, lastMeetingDate)
            .input('quotation_date', sql.Date, quotationDate)
            .input('approval_date', sql.Date, approvalDate)
            .input('updated_by', sql.UniqueIdentifier, updatedBy)
            .query(`
        UPDATE pms.project_requests SET
          title = @title,
          description = @description,
          customer_id = @customer_id,
          contact_person = @contact_person,
          contact_email = @contact_email,
          contact_phone = @contact_phone,
          project_type = @project_type,
          priority = @priority,
          estimated_budget = @estimated_budget,
          estimated_mandays = @estimated_mandays,
          expected_start_date = @expected_start_date,
          expected_end_date = @expected_end_date,
          customer_contact_date = @customer_contact_date,
          last_meeting_date = @last_meeting_date,
          quotation_date = @quotation_date,
          approval_date = @approval_date,
          updated_at = GETDATE(),
          updated_by = @updated_by
        WHERE id = @id
      `)


        revalidatePath('/project-requests')
        revalidatePath(`/ project - requests / ${id} `)
        return { success: true }
    } catch (error: any) {
        console.error('Update project request error:', error)
        return { success: false, error: error.message }
    }
}

// Delete request
export async function deleteProjectRequest(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.project_requests WHERE id = @id AND status = 'DRAFT'`)

        revalidatePath('/project-requests')
        return { success: true }
    } catch (error: any) {
        console.error('Delete project request error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Workflow Actions (Integrated with Approval System)
// ============================================

// Submit for approval
export async function submitProjectRequest(
    id: string,
    submittedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const request = await getProjectRequestById(id)
        if (!request) return { success: false, error: 'Request not found' }

        // 1. Submit to Approval System
        const result = await submitForApproval({
            flow_code: FLOW_CODE,
            module_code: MODULE_CODE,
            document_id: id,
            document_type: DOCUMENT_TYPE,
            document_number: request.request_code,
            document_title: request.title,
            document_data: request as any,
            priority: 'NORMAL' // or map from request.priority if aligned
        })

        if (!result.success) {
            return { success: false, error: result.error }
        }

        const pool = await getConnection()

        // 2. Update status to PENDING
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('submitted_by', sql.UniqueIdentifier, submittedBy)
            .query(`
        UPDATE pms.project_requests SET
        status = 'PENDING',
            submitted_at = GETDATE(),
            submitted_by = @submitted_by,
            updated_at = GETDATE()
        WHERE id = @id AND status IN('DRAFT', 'REVISION')
            `)

        // Add history (local history helps with quick view, but Approval System has detailed history)
        await addRequestHistory(id, 'submit', submittedBy, 'DRAFT', 'PENDING', 'ส่งคำขอเพื่ออนุมัติ (Approval Flow Started)')

        revalidatePath('/project-requests')
        revalidatePath(`/ project - requests / ${id} `)
        return { success: true }
    } catch (error: any) {
        console.error('Submit project request error:', error)
        return { success: false, error: error.message }
    }
}

// Approve request
export async function approveProjectRequest(
    id: string,
    approvedBy: string,
    comments?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('[approveProjectRequest] Starting approval for:', id)

        // 1. Get Approval Instance
        const instanceInfo = await getApprovalInstanceByDocumentId(id, MODULE_CODE)
        console.log('[approveProjectRequest] Instance info:', instanceInfo)

        if (!instanceInfo.instanceId) {
            console.log('[approveProjectRequest] No approval instance found')
            return { success: false, error: 'Approval instance not found' }
        }

        // 2. Process Approval in System
        const result = await approveApprovalRequest(instanceInfo.instanceId, comments)
        console.log('[approveProjectRequest] Approval result:', result)

        if (!result.success) {
            return { success: false, error: result.error || 'Approval failed' }
        }

        // 3. Update Request Status based on Result
        if (result.status === 'APPROVED') {
            console.log('[approveProjectRequest] Fully approved, updating status')
            const pool = await getConnection()
            await pool.request()
                .input('id', sql.UniqueIdentifier, id)
                .input('approved_by', sql.UniqueIdentifier, approvedBy)
                .query(`
            UPDATE pms.project_requests SET
        status = 'APPROVED',
            approved_at = GETDATE(),
            approved_by = @approved_by,
            approval_date = GETDATE(),
            updated_at = GETDATE()
            WHERE id = @id
            `)
            await addRequestHistory(id, 'approve', approvedBy, 'PENDING', 'APPROVED', comments || 'อนุมัติเรียบร้อย')
        } else {
            // Still in progress (multi-step)
            console.log('[approveProjectRequest] Multi-step approval, still pending')
            await addRequestHistory(id, 'approve_step', approvedBy, 'PENDING', 'PENDING', `อนุมัติขั้นตอน(Next: ${result.current_step?.step_name})`)
        }

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${id}`)
        console.log('[approveProjectRequest] Success!')
        return { success: true }
    } catch (error: any) {
        console.error('Approve project request error:', error)
        return { success: false, error: error.message }
    }
}

// Reject request
export async function rejectProjectRequest(
    id: string,
    rejectedBy: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const instanceInfo = await getApprovalInstanceByDocumentId(id, MODULE_CODE)
        if (!instanceInfo.instanceId) {
            return { success: false, error: 'Approval instance not found' }
        }

        const result = await rejectApprovalRequest(instanceInfo.instanceId, reason)
        if (!result.success) {
            return { success: false, error: result.error || 'Rejection failed' }
        }

        // Update status to REJECTED (Approval System sets instance to REJECTED)
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('rejected_by', sql.UniqueIdentifier, rejectedBy)
            .input('reason', sql.NVarChar, reason)
            .query(`
        UPDATE pms.project_requests SET
        status = 'REJECTED',
            rejected_at = GETDATE(),
            rejected_by = @rejected_by,
            rejection_reason = @reason,
            updated_at = GETDATE()
        WHERE id = @id
            `)

        await addRequestHistory(id, 'reject', rejectedBy, 'PENDING', 'REJECTED', reason)

        revalidatePath('/project-requests')
        revalidatePath(`/ project - requests / ${id} `)
        return { success: true }
    } catch (error: any) {
        console.error('Reject project request error:', error)
        return { success: false, error: error.message }
    }
}

// Request revision
export async function requestRevision(
    id: string,
    requestedBy: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const instanceInfo = await getApprovalInstanceByDocumentId(id, MODULE_CODE)
        if (!instanceInfo.instanceId) {
            return { success: false, error: 'Approval instance not found' }
        }

        // Use Rollback for Revision
        const result = await rollbackApproval(instanceInfo.instanceId, reason)
        if (!result.success) {
            return { success: false, error: result.error || 'Revision request failed' }
        }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('requested_by', sql.UniqueIdentifier, requestedBy)
            .input('reason', sql.NVarChar, reason)
            .query(`
        UPDATE pms.project_requests SET
        status = 'REVISION',
            revision_requested_at = GETDATE(),
            revision_requested_by = @requested_by,
            revision_reason = @reason,
            updated_at = GETDATE()
        WHERE id = @id
            `)

        await addRequestHistory(id, 'revision', requestedBy, 'PENDING', 'REVISION', reason)

        revalidatePath('/project-requests')
        revalidatePath(`/ project - requests / ${id} `)
        return { success: true }
    } catch (error: any) {
        console.error('Request revision error:', error)
        return { success: false, error: error.message }
    }
}

// Convert to Project
export async function convertToProject(
    requestId: string,
    convertedBy: string
): Promise<{ success: boolean; projectId?: string; projectCode?: string; projectName?: string; error?: string }> {
    try {
        const pool = await getConnection()

        // Get request data
        const request = await getProjectRequestById(requestId)
        if (!request) {
            return { success: false, error: 'Request not found' }
        }

        if (request.status !== 'APPROVED') {
            return { success: false, error: 'Request must be approved before converting' }
        }

        // Generate project code (4-digit number starting from 2000)
        const date = new Date();
        const year = date.getFullYear();
        const countResult = await pool.request().query('SELECT COUNT(*) as count FROM pms.projects WHERE project_year = ' + year);
        const count = countResult.recordset[0].count + 2000; // Start from 2000

        const projectCode = count.toString(); // Just 4-digit number like "2000"

        // Find project_type_id based on request.project_type code
        let projectTypeId = null;
        if (request.project_type) {
            const typeResult = await pool.request()
                .input('code', sql.NVarChar, request.project_type)
                .query(`SELECT id FROM pms.project_types WHERE code = @code`);
            if (typeResult.recordset.length > 0) {
                projectTypeId = typeResult.recordset[0].id;
            }
        }

        // Create project from request
        const projectResult = await pool.request()
            .input('project_code', sql.NVarChar, projectCode)
            .input('project_year', sql.Int, year)
            .input('name', sql.NVarChar, request.title)
            .input('description', sql.NVarChar, request.description || '')
            .input('customer_id', sql.UniqueIdentifier, request.customer_id)
            .input('project_manager_id', sql.UniqueIdentifier, convertedBy) // Assign converter as PM initially
            .input('planned_mandays', sql.Decimal(10, 2), request.estimated_mandays)
            // .input('planned_budget', sql.Decimal(18, 2), request.estimated_budget) // Project table might not have planned_budget in core, or names differ.
            // Checking schema: projects table has valid columns? 
            // Schema says: sold_mandays, manday_rate, etc.
            // We will match usage in implementation plan.
            // Based on schema `00_full_schema.sql`:
            // columns: project_code, project_year, name, description, customer_id, project_manager_id, status_id...
            // `planned_mandays` is NOT in `projects` table in schema provided! It is in `project_milestones`?
            // Wait, let's re-read schema.
            // `projects` table: `sold_mandays`, `manday_rate`, `progress_percent`... start_date, end_date.
            // The snippet in the prompt used `planned_mandays` and `planned_budget`, which might be incorrect against the schema `00_full_schema.sql`.
            // I need to map correctly.
            .input('sold_mandays', sql.Decimal(10, 2), request.estimated_mandays || 0)
            .input('start_date', sql.Date, request.created_at || null)
            .input('end_date', sql.Date, null) // Will be set later when project actually ends
            .input('created_by', sql.UniqueIdentifier, convertedBy)
            .input('project_type_id', sql.UniqueIdentifier, projectTypeId)
            .query(`
        INSERT INTO pms.projects(
                project_code, project_year, name, description, customer_id,
                project_manager_id, sold_mandays, start_date, end_date,
                is_active, created_at, project_type_id
            )
        OUTPUT INSERTED.id
        VALUES(
            @project_code, @project_year, @name, @description, @customer_id,
            @project_manager_id, @sold_mandays, @start_date, @end_date,
            1, GETDATE(), @project_type_id
        )
            `)

        const projectId = projectResult.recordset[0].id

        // Update request status
        await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .input('converted_by', sql.UniqueIdentifier, convertedBy)
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
        UPDATE pms.project_requests SET
        status = 'CONVERTED',
            converted_at = GETDATE(),
            converted_by = @converted_by,
            converted_project_id = @project_id,
            updated_at = GETDATE()
        WHERE id = @id
            `)

        await addRequestHistory(requestId, 'convert', convertedBy, 'APPROVED', 'CONVERTED', `สร้าง Project: ${projectCode}`)

        revalidatePath('/project-requests')
        revalidatePath('/projects')
        revalidatePath(`/project-requests/${requestId}`)
        return { success: true, projectId, projectCode, projectName: request.title }
    } catch (error: any) {
        console.error('Convert to project error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// History
// ============================================

async function addRequestHistory(
    requestId: string,
    action: string,
    actionBy: string,
    fromStatus: string,
    toStatus: string,
    comments?: string
) {
    const pool = await getConnection()

    await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .input('action', sql.NVarChar, action)
        .input('action_by', sql.UniqueIdentifier, actionBy)
        .input('from_status', sql.NVarChar, fromStatus)
        .input('to_status', sql.NVarChar, toStatus)
        .input('comments', sql.NVarChar, comments)
        .query(`
      INSERT INTO pms.project_request_history
            (request_id, action, action_by, from_status, to_status, comments)
        VALUES
            (@request_id, @action, @action_by, @from_status, @to_status, @comments)
            `)
}

export async function getRequestHistory(requestId: string) {
    const pool = await getConnection()

    const result = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .query(`
        SELECT
        h.*,
            e.first_name + ' ' + e.last_name AS action_by_name
      FROM pms.project_request_history h
      LEFT JOIN pms.employees e ON h.action_by = e.id
      WHERE h.request_id = @request_id
      ORDER BY h.action_at DESC
            `)

    return result.recordset
}

// ============================================
// Attachments
// ============================================

export async function getRequestAttachments(requestId: string) {
    const pool = await getConnection()

    const result = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .query(`
        SELECT
        a.*,
            e.first_name + ' ' + e.last_name AS uploaded_by_name
      FROM pms.project_request_attachments a
      LEFT JOIN pms.employees e ON a.uploaded_by = e.id
      WHERE a.request_id = @request_id
      ORDER BY a.created_at DESC
            `)

    return result.recordset
}

export async function addRequestAttachment(data: {
    requestId: string
    fileName: string
    filePath: string
    fileSize: number
    fileType?: string
    uploadedBy: string
}) {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('request_id', sql.UniqueIdentifier, data.requestId)
            .input('file_name', sql.NVarChar, data.fileName)
            .input('file_path', sql.NVarChar, data.filePath)
            .input('file_size', sql.BigInt, data.fileSize)
            .input('file_type', sql.NVarChar, data.fileType)
            .input('uploaded_by', sql.UniqueIdentifier, data.uploadedBy)
            .query(`
        INSERT INTO pms.project_request_attachments
            (request_id, file_name, file_path, file_size, file_type, uploaded_by)
        VALUES
            (@request_id, @file_name, @file_path, @file_size, @file_type, @uploaded_by)
            `)

        revalidatePath('/project-requests')
        revalidatePath(`/ project - requests / ${data.requestId} `)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteRequestAttachment(id: string) {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.project_request_attachments WHERE id = @id`)

        revalidatePath('/project-requests')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ============================================
// Statistics
// ============================================

export async function getRequestStatistics() {
    const pool = await getConnection()

    const result = await pool.request()
        .query(`SELECT * FROM pms.vw_project_request_stats`)

    return result.recordset[0]
}

export async function getMonthlyRequestStatistics(year: number) {
    const pool = await getConnection()

    const result = await pool.request()
        .input('year', sql.Int, year)
        .query(`
        SELECT * FROM pms.vw_project_request_monthly_stats 
      WHERE year = @year 
      ORDER BY month
    `)

    return result.recordset
}

// ============================================
// Lookup Data
// ============================================

export async function getProjectRequestTypes() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.project_request_types WHERE is_active = 1 ORDER BY sort_order`)
    return result.recordset
}

export async function getProjectRequestPriorities() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.project_request_priorities WHERE is_active = 1 ORDER BY sort_order`)
    return result.recordset
}

export async function getProjectRequestStatuses() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.project_request_statuses WHERE is_active = 1 ORDER BY sort_order`)
    return result.recordset
}
