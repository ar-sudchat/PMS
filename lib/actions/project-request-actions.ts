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
    converted_project_name?: string
    // Workflow fields
    workflow_template_id?: string
    workflow_template_code?: string
    workflow_template_name?: string
    current_step?: number
    current_step_name?: string
    current_step_code?: string
    workflow_status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    total_steps?: number
    // Metadata
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

        const pool = await getConnection()

        // Get workflow template max step
        const stepResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT r.workflow_template_id,
                       (SELECT MIN(step_order) FROM pms.project_request_workflow_step_defs
                        WHERE template_id = r.workflow_template_id AND step_order > 1 AND is_active = 1) as next_step
                FROM pms.project_requests r
                WHERE r.id = @id
            `)

        const nextStep = stepResult.recordset[0]?.next_step || 2
        const templateId = stepResult.recordset[0]?.workflow_template_id

        // Update status to PENDING and advance to step 2
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('submitted_by', sql.UniqueIdentifier, submittedBy)
            .input('next_step', sql.Int, nextStep)
            .query(`
                UPDATE pms.project_requests SET
                    status = 'PENDING',
                    current_step = @next_step,
                    workflow_status = 'IN_PROGRESS',
                    submitted_at = GETDATE(),
                    submitted_by = @submitted_by,
                    updated_at = GETDATE()
                WHERE id = @id AND status IN('DRAFT', 'REVISION')
            `)

        // Record step 1 as completed
        const step1Def = await pool.request()
            .input('template_id', sql.UniqueIdentifier, templateId)
            .query(`
                SELECT * FROM pms.project_request_workflow_step_defs
                WHERE template_id = @template_id AND step_order = 1 AND is_active = 1
            `)

        if (step1Def.recordset.length > 0) {
            const step1 = step1Def.recordset[0]
            await pool.request()
                .input('request_id', sql.UniqueIdentifier, id)
                .input('step_order', sql.Int, 1)
                .input('step_code', sql.NVarChar, step1.step_code)
                .input('step_name', sql.NVarChar, step1.step_name)
                .input('completed_by', sql.UniqueIdentifier, submittedBy)
                .query(`
                    INSERT INTO pms.project_request_step_history
                    (request_id, step_order, step_code, step_name, action, completed_at, completed_by)
                    VALUES (@request_id, @step_order, @step_code, @step_name, 'COMPLETED', GETDATE(), @completed_by)
                `)
        }

        // Record step 2 as started
        const step2Def = await pool.request()
            .input('template_id', sql.UniqueIdentifier, templateId)
            .input('step_order', sql.Int, nextStep)
            .query(`
                SELECT * FROM pms.project_request_workflow_step_defs
                WHERE template_id = @template_id AND step_order = @step_order AND is_active = 1
            `)

        if (step2Def.recordset.length > 0) {
            const step2 = step2Def.recordset[0]
            await pool.request()
                .input('request_id', sql.UniqueIdentifier, id)
                .input('step_order', sql.Int, nextStep)
                .input('step_code', sql.NVarChar, step2.step_code)
                .input('step_name', sql.NVarChar, step2.step_name)
                .query(`
                    INSERT INTO pms.project_request_step_history
                    (request_id, step_order, step_code, step_name, action)
                    VALUES (@request_id, @step_order, @step_code, @step_name, 'STARTED')
                `)
        }

        // Add history
        await addRequestHistory(id, 'submit', submittedBy, 'DRAFT', 'PENDING', 'ส่งคำขอเพื่อดำเนินการ')

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${id}`)
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

// ============================================
// Workflow Step Actions
// ============================================

// Get workflow templates
export async function getWorkflowTemplates() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.vw_workflow_templates WHERE is_active = 1 ORDER BY is_default DESC, name`)
    return result.recordset
}

// Get workflow steps for a template
export async function getWorkflowSteps(templateId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('template_id', sql.UniqueIdentifier, templateId)
        .query(`
            SELECT * FROM pms.project_request_workflow_step_defs
            WHERE template_id = @template_id AND is_active = 1
            ORDER BY step_order
        `)
    return result.recordset
}

// Get workflow steps for a request (by request's workflow_template_id)
export async function getWorkflowStepsForRequest(requestId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .query(`
            SELECT s.*
            FROM pms.project_request_workflow_step_defs s
            INNER JOIN pms.project_requests r ON s.template_id = r.workflow_template_id
            WHERE r.id = @request_id AND s.is_active = 1
            ORDER BY s.step_order
        `)
    return result.recordset
}

// Get step history for a request
export async function getWorkflowStepHistory(requestId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .query(`
            SELECT
                h.*,
                COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS completed_by_name
            FROM pms.project_request_step_history h
            LEFT JOIN pms.employees e ON h.completed_by = e.id
            WHERE h.request_id = @request_id
            ORDER BY h.created_at DESC
        `)
    return result.recordset
}

// Advance to next step
export async function advanceWorkflowStep(
    requestId: string,
    userId: string,
    notes?: string
): Promise<{ success: boolean; error?: string; newStep?: number; workflowCompleted?: boolean }> {
    try {
        const pool = await getConnection()

        // Get current request info
        const requestResult = await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .query(`
                SELECT r.id, r.current_step, r.workflow_template_id, r.workflow_status,
                       (SELECT MAX(step_order) FROM pms.project_request_workflow_step_defs WHERE template_id = r.workflow_template_id AND is_active = 1) as max_step
                FROM pms.project_requests r
                WHERE r.id = @id
            `)

        if (requestResult.recordset.length === 0) {
            return { success: false, error: 'Request not found' }
        }

        const request = requestResult.recordset[0]
        if (request.workflow_status === 'COMPLETED' || request.workflow_status === 'CANCELLED') {
            return { success: false, error: 'Workflow already completed or cancelled' }
        }

        // Get current step definition
        const stepResult = await pool.request()
            .input('template_id', sql.UniqueIdentifier, request.workflow_template_id)
            .input('step_order', sql.Int, request.current_step)
            .query(`
                SELECT * FROM pms.project_request_workflow_step_defs
                WHERE template_id = @template_id AND step_order = @step_order AND is_active = 1
            `)

        const currentStepDef = stepResult.recordset[0]
        if (!currentStepDef) {
            return { success: false, error: 'Current step definition not found' }
        }

        const newStep = request.current_step + 1
        const isLastStep = newStep > request.max_step

        // Record history for completed step
        await pool.request()
            .input('request_id', sql.UniqueIdentifier, requestId)
            .input('step_order', sql.Int, request.current_step)
            .input('step_code', sql.NVarChar, currentStepDef.step_code)
            .input('step_name', sql.NVarChar, currentStepDef.step_name)
            .input('action', sql.NVarChar, 'COMPLETED')
            .input('notes', sql.NVarChar, notes || null)
            .input('completed_by', sql.UniqueIdentifier, userId)
            .query(`
                INSERT INTO pms.project_request_step_history
                (request_id, step_order, step_code, step_name, action, notes, completed_at, completed_by)
                VALUES (@request_id, @step_order, @step_code, @step_name, @action, @notes, GETDATE(), @completed_by)
            `)

        // Update request
        if (isLastStep) {
            // Mark as completed
            await pool.request()
                .input('id', sql.UniqueIdentifier, requestId)
                .input('step', sql.Int, request.max_step)
                .query(`
                    UPDATE pms.project_requests
                    SET current_step = @step,
                        workflow_status = 'COMPLETED',
                        updated_at = GETDATE()
                    WHERE id = @id
                `)
        } else {
            // Move to next step
            await pool.request()
                .input('id', sql.UniqueIdentifier, requestId)
                .input('step', sql.Int, newStep)
                .query(`
                    UPDATE pms.project_requests
                    SET current_step = @step,
                        workflow_status = 'IN_PROGRESS',
                        updated_at = GETDATE()
                    WHERE id = @id
                `)

            // Record history for started step
            const nextStepResult = await pool.request()
                .input('template_id', sql.UniqueIdentifier, request.workflow_template_id)
                .input('step_order', sql.Int, newStep)
                .query(`
                    SELECT * FROM pms.project_request_workflow_step_defs
                    WHERE template_id = @template_id AND step_order = @step_order AND is_active = 1
                `)

            if (nextStepResult.recordset.length > 0) {
                const nextStepDef = nextStepResult.recordset[0]
                await pool.request()
                    .input('request_id', sql.UniqueIdentifier, requestId)
                    .input('step_order', sql.Int, newStep)
                    .input('step_code', sql.NVarChar, nextStepDef.step_code)
                    .input('step_name', sql.NVarChar, nextStepDef.step_name)
                    .input('action', sql.NVarChar, 'STARTED')
                    .query(`
                        INSERT INTO pms.project_request_step_history
                        (request_id, step_order, step_code, step_name, action)
                        VALUES (@request_id, @step_order, @step_code, @step_name, @action)
                    `)
            }
        }

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${requestId}`)
        return { success: true, newStep: isLastStep ? request.max_step : newStep, workflowCompleted: isLastStep }
    } catch (error: any) {
        console.error('Advance workflow step error:', error)
        return { success: false, error: error.message }
    }
}

// Skip current step
export async function skipWorkflowStep(
    requestId: string,
    userId: string,
    notes?: string
): Promise<{ success: boolean; error?: string; newStep?: number }> {
    try {
        const pool = await getConnection()

        // Get current request and step info
        const requestResult = await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .query(`
                SELECT r.id, r.current_step, r.workflow_template_id, r.workflow_status,
                       (SELECT MAX(step_order) FROM pms.project_request_workflow_step_defs WHERE template_id = r.workflow_template_id AND is_active = 1) as max_step
                FROM pms.project_requests r
                WHERE r.id = @id
            `)

        if (requestResult.recordset.length === 0) {
            return { success: false, error: 'Request not found' }
        }

        const request = requestResult.recordset[0]

        // Get current step definition and check if skippable
        const stepResult = await pool.request()
            .input('template_id', sql.UniqueIdentifier, request.workflow_template_id)
            .input('step_order', sql.Int, request.current_step)
            .query(`
                SELECT * FROM pms.project_request_workflow_step_defs
                WHERE template_id = @template_id AND step_order = @step_order AND is_active = 1
            `)

        const currentStepDef = stepResult.recordset[0]
        if (!currentStepDef) {
            return { success: false, error: 'Current step definition not found' }
        }

        if (!currentStepDef.can_skip) {
            return { success: false, error: 'This step cannot be skipped' }
        }

        const newStep = request.current_step + 1
        const isLastStep = newStep > request.max_step

        // Record history for skipped step
        await pool.request()
            .input('request_id', sql.UniqueIdentifier, requestId)
            .input('step_order', sql.Int, request.current_step)
            .input('step_code', sql.NVarChar, currentStepDef.step_code)
            .input('step_name', sql.NVarChar, currentStepDef.step_name)
            .input('action', sql.NVarChar, 'SKIPPED')
            .input('notes', sql.NVarChar, notes || 'ข้าม step นี้')
            .input('completed_by', sql.UniqueIdentifier, userId)
            .query(`
                INSERT INTO pms.project_request_step_history
                (request_id, step_order, step_code, step_name, action, notes, completed_at, completed_by)
                VALUES (@request_id, @step_order, @step_code, @step_name, @action, @notes, GETDATE(), @completed_by)
            `)

        // Update request (same logic as advance)
        if (isLastStep) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, requestId)
                .input('step', sql.Int, request.max_step)
                .query(`
                    UPDATE pms.project_requests
                    SET current_step = @step,
                        workflow_status = 'COMPLETED',
                        updated_at = GETDATE()
                    WHERE id = @id
                `)
        } else {
            await pool.request()
                .input('id', sql.UniqueIdentifier, requestId)
                .input('step', sql.Int, newStep)
                .query(`
                    UPDATE pms.project_requests
                    SET current_step = @step,
                        workflow_status = 'IN_PROGRESS',
                        updated_at = GETDATE()
                    WHERE id = @id
                `)
        }

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${requestId}`)
        return { success: true, newStep: isLastStep ? request.max_step : newStep }
    } catch (error: any) {
        console.error('Skip workflow step error:', error)
        return { success: false, error: error.message }
    }
}

// Complete workflow early (open project from current step)
export async function completeWorkflowEarly(
    requestId: string,
    userId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Get current request and step info
        const requestResult = await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .query(`
                SELECT r.id, r.current_step, r.workflow_template_id, r.workflow_status
                FROM pms.project_requests r
                WHERE r.id = @id
            `)

        if (requestResult.recordset.length === 0) {
            return { success: false, error: 'Request not found' }
        }

        const request = requestResult.recordset[0]

        // Get current step definition and check if can complete early
        const stepResult = await pool.request()
            .input('template_id', sql.UniqueIdentifier, request.workflow_template_id)
            .input('step_order', sql.Int, request.current_step)
            .query(`
                SELECT * FROM pms.project_request_workflow_step_defs
                WHERE template_id = @template_id AND step_order = @step_order AND is_active = 1
            `)

        const currentStepDef = stepResult.recordset[0]
        if (!currentStepDef) {
            return { success: false, error: 'Current step definition not found' }
        }

        if (!currentStepDef.can_complete_early) {
            return { success: false, error: 'Cannot complete early from this step' }
        }

        // Record history
        await pool.request()
            .input('request_id', sql.UniqueIdentifier, requestId)
            .input('step_order', sql.Int, request.current_step)
            .input('step_code', sql.NVarChar, currentStepDef.step_code)
            .input('step_name', sql.NVarChar, currentStepDef.step_name)
            .input('action', sql.NVarChar, 'COMPLETED')
            .input('notes', sql.NVarChar, notes || 'จบ workflow ก่อนกำหนด - เปิดโครงการ')
            .input('completed_by', sql.UniqueIdentifier, userId)
            .query(`
                INSERT INTO pms.project_request_step_history
                (request_id, step_order, step_code, step_name, action, notes, completed_at, completed_by)
                VALUES (@request_id, @step_order, @step_code, @step_name, @action, @notes, GETDATE(), @completed_by)
            `)

        // Mark workflow as completed
        await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .query(`
                UPDATE pms.project_requests
                SET workflow_status = 'COMPLETED',
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${requestId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Complete workflow early error:', error)
        return { success: false, error: error.message }
    }
}

// Set workflow template for a request
export async function setWorkflowTemplate(
    requestId: string,
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, requestId)
            .input('template_id', sql.UniqueIdentifier, templateId)
            .query(`
                UPDATE pms.project_requests
                SET workflow_template_id = @template_id,
                    current_step = 1,
                    workflow_status = 'IN_PROGRESS',
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-requests')
        revalidatePath(`/project-requests/${requestId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Set workflow template error:', error)
        return { success: false, error: error.message }
    }
}

// Auto-assign workflow based on project type
export async function assignWorkflowByProjectType(requestId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Call stored procedure
        await pool.request()
            .input('request_id', sql.UniqueIdentifier, requestId)
            .execute('pms.sp_assign_workflow_by_type')

        revalidatePath('/project-requests')
        return { success: true }
    } catch (error: any) {
        console.error('Assign workflow by type error:', error)
        return { success: false, error: error.message }
    }
}

// Get step assignees for a step
export async function getStepAssignees(stepDefId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('step_def_id', sql.UniqueIdentifier, stepDefId)
        .query(`
            SELECT * FROM pms.vw_workflow_step_assignees
            WHERE step_def_id = @step_def_id AND is_active = 1
            ORDER BY is_primary DESC, assignee_type, assignee_value
        `)
    return result.recordset
}

// Get all step assignees for a template
export async function getTemplateStepAssignees(templateId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('template_id', sql.UniqueIdentifier, templateId)
        .query(`
            SELECT * FROM pms.vw_workflow_step_assignees
            WHERE template_id = @template_id AND is_active = 1
            ORDER BY step_order, is_primary DESC, assignee_type
        `)
    return result.recordset
}

// Add step assignee
export async function addStepAssignee(
    stepDefId: string,
    assigneeType: 'POSITION' | 'ROLE' | 'USER',
    assigneeValue: string,
    isPrimary: boolean = false
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('step_def_id', sql.UniqueIdentifier, stepDefId)
            .input('assignee_type', sql.NVarChar, assigneeType)
            .input('assignee_value', sql.NVarChar, assigneeValue)
            .input('is_primary', sql.Bit, isPrimary)
            .query(`
                INSERT INTO pms.project_request_workflow_step_assignees
                (step_def_id, assignee_type, assignee_value, is_primary)
                VALUES (@step_def_id, @assignee_type, @assignee_value, @is_primary)
            `)

        return { success: true }
    } catch (error: any) {
        console.error('Add step assignee error:', error)
        return { success: false, error: error.message }
    }
}

// Remove step assignee
export async function removeStepAssignee(assigneeId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, assigneeId)
            .query(`DELETE FROM pms.project_request_workflow_step_assignees WHERE id = @id`)

        return { success: true }
    } catch (error: any) {
        console.error('Remove step assignee error:', error)
        return { success: false, error: error.message }
    }
}

// Check if current user can complete a step
export async function canUserCompleteStep(
    requestId: string,
    userId: string
): Promise<{ canComplete: boolean; reason?: string }> {
    try {
        const pool = await getConnection()

        // Get current step and user's position
        const result = await pool.request()
            .input('request_id', sql.UniqueIdentifier, requestId)
            .input('user_id', sql.UniqueIdentifier, userId)
            .query(`
                SELECT
                    r.current_step,
                    r.workflow_template_id,
                    r.workflow_status,
                    e.position_code,
                    (
                        SELECT COUNT(*)
                        FROM pms.project_request_workflow_step_assignees a
                        INNER JOIN pms.project_request_workflow_step_defs s ON a.step_def_id = s.id
                        WHERE s.template_id = r.workflow_template_id
                          AND s.step_order = r.current_step
                          AND a.is_active = 1
                          AND a.can_complete = 1
                          AND (
                              (a.assignee_type = 'POSITION' AND a.assignee_value = e.position_code)
                              OR (a.assignee_type = 'USER' AND a.assignee_value = CAST(@user_id AS NVARCHAR(36)))
                          )
                    ) AS has_permission
                FROM pms.project_requests r
                LEFT JOIN pms.employees e ON e.id = @user_id
                WHERE r.id = @request_id
            `)

        if (result.recordset.length === 0) {
            return { canComplete: false, reason: 'Request not found' }
        }

        const data = result.recordset[0]

        if (data.workflow_status === 'COMPLETED') {
            return { canComplete: false, reason: 'Workflow already completed' }
        }

        if (data.workflow_status === 'CANCELLED') {
            return { canComplete: false, reason: 'Workflow was cancelled' }
        }

        // If no assignees configured, anyone can complete
        const assigneeCount = await pool.request()
            .input('template_id', sql.UniqueIdentifier, data.workflow_template_id)
            .input('step_order', sql.Int, data.current_step)
            .query(`
                SELECT COUNT(*) AS cnt
                FROM pms.project_request_workflow_step_assignees a
                INNER JOIN pms.project_request_workflow_step_defs s ON a.step_def_id = s.id
                WHERE s.template_id = @template_id AND s.step_order = @step_order AND a.is_active = 1
            `)

        if (assigneeCount.recordset[0].cnt === 0) {
            return { canComplete: true }
        }

        if (data.has_permission > 0) {
            return { canComplete: true }
        }

        return { canComplete: false, reason: 'You are not assigned to this step' }
    } catch (error: any) {
        console.error('Check step permission error:', error)
        return { canComplete: false, reason: error.message }
    }
}

// ============================================
// Workflow Template CRUD
// ============================================

export interface WorkflowTemplateInput {
    code: string
    name: string
    description?: string
    is_default?: boolean
}

// Get all workflow templates (including inactive)
export async function getAllWorkflowTemplates() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.vw_workflow_templates ORDER BY is_default DESC, name`)
    return result.recordset
}

// Get workflow template by ID with steps
export async function getWorkflowTemplateById(id: string) {
    const pool = await getConnection()

    const templateResult = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
            SELECT * FROM pms.project_request_workflow_templates
            WHERE id = @id
        `)

    if (templateResult.recordset.length === 0) return null

    const stepsResult = await pool.request()
        .input('template_id', sql.UniqueIdentifier, id)
        .query(`
            SELECT * FROM pms.project_request_workflow_step_defs
            WHERE template_id = @template_id AND is_active = 1
            ORDER BY step_order
        `)

    return {
        ...templateResult.recordset[0],
        steps: stepsResult.recordset
    }
}

// Create workflow template
export async function createWorkflowTemplate(
    data: WorkflowTemplateInput,
    createdBy?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
        const pool = await getConnection()

        // Check for duplicate code
        const existing = await pool.request()
            .input('code', sql.NVarChar, data.code)
            .query(`SELECT id FROM pms.project_request_workflow_templates WHERE code = @code`)

        if (existing.recordset.length > 0) {
            return { success: false, error: 'รหัส Template นี้มีอยู่แล้ว' }
        }

        // If setting as default, unset other defaults
        if (data.is_default) {
            await pool.request()
                .query(`UPDATE pms.project_request_workflow_templates SET is_default = 0`)
        }

        const result = await pool.request()
            .input('code', sql.NVarChar, data.code)
            .input('name', sql.NVarChar, data.name)
            .input('description', sql.NVarChar, data.description || null)
            .input('is_default', sql.Bit, data.is_default || false)
            .input('created_by', sql.UniqueIdentifier, createdBy || null)
            .query(`
                INSERT INTO pms.project_request_workflow_templates
                (code, name, description, is_default, created_by)
                OUTPUT INSERTED.id
                VALUES (@code, @name, @description, @is_default, @created_by)
            `)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create workflow template error:', error)
        return { success: false, error: error.message }
    }
}

// Update workflow template
export async function updateWorkflowTemplate(
    id: string,
    data: Partial<WorkflowTemplateInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // If setting as default, unset other defaults
        if (data.is_default) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, id)
                .query(`UPDATE pms.project_request_workflow_templates SET is_default = 0 WHERE id != @id`)
        }

        const setClauses: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

        if (data.code !== undefined) {
            setClauses.push('code = @code')
            request.input('code', sql.NVarChar, data.code)
        }
        if (data.name !== undefined) {
            setClauses.push('name = @name')
            request.input('name', sql.NVarChar, data.name)
        }
        if (data.description !== undefined) {
            setClauses.push('description = @description')
            request.input('description', sql.NVarChar, data.description)
        }
        if (data.is_default !== undefined) {
            setClauses.push('is_default = @is_default')
            request.input('is_default', sql.Bit, data.is_default)
        }

        if (setClauses.length === 0) {
            return { success: true }
        }

        await request.query(`
            UPDATE pms.project_request_workflow_templates
            SET ${setClauses.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Update workflow template error:', error)
        return { success: false, error: error.message }
    }
}

// Delete workflow template (soft delete by setting is_active = 0)
export async function deleteWorkflowTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Check if template is in use
        const usageCheck = await pool.request()
            .input('template_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT COUNT(*) AS cnt FROM pms.project_requests
                WHERE workflow_template_id = @template_id
            `)

        if (usageCheck.recordset[0].cnt > 0) {
            return { success: false, error: 'Template นี้กำลังถูกใช้งาน ไม่สามารถลบได้' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`UPDATE pms.project_request_workflow_templates SET is_active = 0 WHERE id = @id`)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Delete workflow template error:', error)
        return { success: false, error: error.message }
    }
}

// Toggle template active status
export async function toggleWorkflowTemplateActive(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.project_request_workflow_templates
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
                WHERE id = @id
            `)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Toggle workflow template error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Workflow Step Definition CRUD
// ============================================

export interface WorkflowStepInput {
    template_id: string
    step_order: number
    step_code: string
    step_name: string
    description?: string
    icon?: string
    color?: string
    is_required?: boolean
    can_skip?: boolean
    can_complete_early?: boolean
    required_fields?: string // JSON string
}

// Get workflow steps for a template
export async function getWorkflowStepDefs(templateId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('template_id', sql.UniqueIdentifier, templateId)
        .query(`
            SELECT * FROM pms.project_request_workflow_step_defs
            WHERE template_id = @template_id AND is_active = 1
            ORDER BY step_order
        `)
    return result.recordset
}

// Create workflow step
export async function createWorkflowStep(
    data: WorkflowStepInput
): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('template_id', sql.UniqueIdentifier, data.template_id)
            .input('step_order', sql.Int, data.step_order)
            .input('step_code', sql.NVarChar, data.step_code)
            .input('step_name', sql.NVarChar, data.step_name)
            .input('description', sql.NVarChar, data.description || null)
            .input('icon', sql.NVarChar, data.icon || null)
            .input('color', sql.NVarChar, data.color || null)
            .input('is_required', sql.Bit, data.is_required ?? true)
            .input('can_skip', sql.Bit, data.can_skip ?? false)
            .input('can_complete_early', sql.Bit, data.can_complete_early ?? false)
            .input('required_fields', sql.NVarChar, data.required_fields || null)
            .query(`
                INSERT INTO pms.project_request_workflow_step_defs
                (template_id, step_order, step_code, step_name, description, icon, color, is_required, can_skip, can_complete_early, required_fields)
                OUTPUT INSERTED.id
                VALUES (@template_id, @step_order, @step_code, @step_name, @description, @icon, @color, @is_required, @can_skip, @can_complete_early, @required_fields)
            `)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true, id: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create workflow step error:', error)
        return { success: false, error: error.message }
    }
}

// Update workflow step
export async function updateWorkflowStep(
    id: string,
    data: Partial<WorkflowStepInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        const setClauses: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

        if (data.step_order !== undefined) {
            setClauses.push('step_order = @step_order')
            request.input('step_order', sql.Int, data.step_order)
        }
        if (data.step_code !== undefined) {
            setClauses.push('step_code = @step_code')
            request.input('step_code', sql.NVarChar, data.step_code)
        }
        if (data.step_name !== undefined) {
            setClauses.push('step_name = @step_name')
            request.input('step_name', sql.NVarChar, data.step_name)
        }
        if (data.description !== undefined) {
            setClauses.push('description = @description')
            request.input('description', sql.NVarChar, data.description)
        }
        if (data.icon !== undefined) {
            setClauses.push('icon = @icon')
            request.input('icon', sql.NVarChar, data.icon)
        }
        if (data.color !== undefined) {
            setClauses.push('color = @color')
            request.input('color', sql.NVarChar, data.color)
        }
        if (data.is_required !== undefined) {
            setClauses.push('is_required = @is_required')
            request.input('is_required', sql.Bit, data.is_required)
        }
        if (data.can_skip !== undefined) {
            setClauses.push('can_skip = @can_skip')
            request.input('can_skip', sql.Bit, data.can_skip)
        }
        if (data.can_complete_early !== undefined) {
            setClauses.push('can_complete_early = @can_complete_early')
            request.input('can_complete_early', sql.Bit, data.can_complete_early)
        }
        if (data.required_fields !== undefined) {
            setClauses.push('required_fields = @required_fields')
            request.input('required_fields', sql.NVarChar, data.required_fields)
        }

        if (setClauses.length === 0) {
            return { success: true }
        }

        await request.query(`
            UPDATE pms.project_request_workflow_step_defs
            SET ${setClauses.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Update workflow step error:', error)
        return { success: false, error: error.message }
    }
}

// Delete workflow step (soft delete)
export async function deleteWorkflowStep(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`UPDATE pms.project_request_workflow_step_defs SET is_active = 0 WHERE id = @id`)

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Delete workflow step error:', error)
        return { success: false, error: error.message }
    }
}

// Reorder workflow steps
export async function reorderWorkflowSteps(
    templateId: string,
    stepOrders: { id: string; order: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        for (const item of stepOrders) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, item.id)
                .input('step_order', sql.Int, item.order)
                .query(`
                    UPDATE pms.project_request_workflow_step_defs
                    SET step_order = @step_order
                    WHERE id = @id
                `)
        }

        revalidatePath('/projects/settings/workflow-templates')
        return { success: true }
    } catch (error: any) {
        console.error('Reorder workflow steps error:', error)
        return { success: false, error: error.message }
    }
}

// Get step history for a request
export async function getStepHistory(requestId: string) {
    const pool = await getConnection()
    const result = await pool.request()
        .input('request_id', sql.UniqueIdentifier, requestId)
        .query(`
            SELECT
                h.*,
                COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS completed_by_name
            FROM pms.project_request_step_history h
            LEFT JOIN pms.employees e ON h.completed_by = e.id
            WHERE h.request_id = @request_id
            ORDER BY h.created_at ASC
        `)
    return result.recordset
}
