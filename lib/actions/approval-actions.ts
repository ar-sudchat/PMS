'use server'

import {
    startApprovalFlow,
    processApprovalAction,
    getMyPendingApprovals,
    getApprovalInstance,
    getDocumentApprovalStatus,
    getFlowTemplate,
    getFlowSteps,
    getStepApprovers
} from '@/lib/services/approval-service'
import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from 'next/cache'

// ============================================
// APPROVAL FLOW ACTIONS
// ============================================

/**
 * Submit document for approval
 */
export async function submitForApproval(input: {
    flow_code: string
    module_code: string
    document_id: string
    document_type: string
    document_number?: string
    document_title?: string
    document_data?: Record<string, any>
    metadata?: Record<string, any>
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}) {
    return await startApprovalFlow(input)
}

/**
 * Approve a pending approval
 */
export async function approveRequest(instanceId: string, comments?: string) {
    return await processApprovalAction({
        instance_id: instanceId,
        action: 'APPROVE',
        comments
    })
}

/**
 * Reject a pending approval
 */
export async function rejectRequest(instanceId: string, comments?: string) {
    return await processApprovalAction({
        instance_id: instanceId,
        action: 'REJECT',
        comments
    })
}

/**
 * Delegate approval to another user
 */
export async function delegateApproval(
    instanceId: string,
    delegatedTo: string,
    reason?: string
) {
    return await processApprovalAction({
        instance_id: instanceId,
        action: 'DELEGATE',
        delegated_to: delegatedTo,
        delegation_reason: reason
    })
}

/**
 * Rollback approval to previous step
 */
export async function rollbackApproval(instanceId: string, reason?: string) {
    return await processApprovalAction({
        instance_id: instanceId,
        action: 'ROLLBACK',
        comments: reason
    })
}

/**
 * Cancel an approval request (requester only)
 */
export async function cancelApproval(
    instanceId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Check if user is the requester
        const instanceResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .query(`
                SELECT requester_id, status FROM pms.approval_instances
                WHERE id = @instanceId
            `)

        if (instanceResult.recordset.length === 0) {
            return { success: false, error: 'Approval instance not found' }
        }

        const instance = instanceResult.recordset[0]
        if (instance.requester_id !== user.id && user.role !== 'admin') {
            return { success: false, error: 'Only the requester or admin can cancel' }
        }

        if (instance.status !== 'PENDING' && instance.status !== 'IN_PROGRESS') {
            return { success: false, error: `Cannot cancel approval with status: ${instance.status}` }
        }

        // Cancel the instance
        await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .query(`
                UPDATE pms.approval_instances
                SET status = 'CANCELLED', completion_date = GETDATE()
                WHERE id = @instanceId
            `)

        // Record action
        await pool.request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .input('stepId', sql.UniqueIdentifier, null)
            .input('stepOrder', sql.Int, 0)
            .input('approverId', sql.UniqueIdentifier, user.id)
            .input('comments', sql.NVarChar(sql.MAX), reason || null)
            .query(`
                INSERT INTO pms.approval_actions
                (id, instance_id, step_id, step_order, approver_id, action_type, comments)
                VALUES (@id, @instanceId, @stepId, @stepOrder, @approverId, 'CANCEL', @comments)
            `)

        return { success: true }

    } catch (error: any) {
        console.error('cancelApproval error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// QUERY ACTIONS
// ============================================

/**
 * Get my pending approvals
 */
export async function fetchMyPendingApprovals(moduleCode?: string) {
    return await getMyPendingApprovals(moduleCode)
}

/**
 * Get approval instance details
 */
export async function fetchApprovalInstance(instanceId: string) {
    return await getApprovalInstance(instanceId)
}

/**
 * Get approval status for a document
 */
export async function fetchDocumentApprovalStatus(documentId: string, moduleCode: string) {
    return await getDocumentApprovalStatus(documentId, moduleCode)
}

/**
 * Get my submitted approval requests
 */
export async function fetchMySubmittedApprovals(
    moduleCode?: string,
    status?: string
): Promise<any[]> {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        let query = `
            SELECT
                ai.id AS instance_id,
                ai.document_id,
                ai.document_type,
                ai.document_number,
                ai.document_title,
                ai.module_code,
                ai.status,
                ai.priority,
                ai.request_date,
                ai.completion_date,
                ai.current_step_order,
                aft.flow_name,
                afs.step_name AS current_step_name
            FROM pms.approval_instances ai
            JOIN pms.approval_flow_templates aft ON ai.flow_template_id = aft.id
            LEFT JOIN pms.approval_flow_steps afs ON ai.current_step_id = afs.id
            WHERE ai.requester_id = @userId
        `

        if (moduleCode) {
            query += ` AND ai.module_code = @moduleCode`
        }
        if (status) {
            query += ` AND ai.status = @status`
        }

        query += ` ORDER BY ai.request_date DESC`

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('moduleCode', sql.VarChar(50), moduleCode || null)
            .input('status', sql.VarChar(20), status || null)
            .query(query)

        return result.recordset

    } catch (error) {
        console.error('fetchMySubmittedApprovals error:', error)
        return []
    }
}

/**
 * Get approval history for a document
 */
export async function fetchApprovalHistory(documentId: string, moduleCode: string): Promise<any[]> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('documentId', sql.VarChar(100), documentId)
            .input('moduleCode', sql.VarChar(50), moduleCode)
            .query(`
                SELECT
                    aa.action_date,
                    aa.action_type,
                    aa.comments,
                    CONCAT(e.first_name, ' ', e.last_name) AS approver_name,
                    afs.step_name,
                    afs.step_order
                FROM pms.approval_actions aa
                JOIN pms.approval_instances ai ON aa.instance_id = ai.id
                LEFT JOIN pms.employees e ON aa.approver_id = e.id
                LEFT JOIN pms.approval_flow_steps afs ON aa.step_id = afs.id
                WHERE ai.document_id = @documentId AND ai.module_code = @moduleCode
                ORDER BY aa.action_date DESC
            `)

        return result.recordset

    } catch (error) {
        console.error('fetchApprovalHistory error:', error)
        return []
    }
}

// ============================================
// FLOW TEMPLATE MANAGEMENT
// ============================================

/**
 * Get all flow templates
 */
export async function fetchFlowTemplates(moduleCode?: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        let query = `
            SELECT id, flow_code, flow_name, module_code, document_type, description, is_active
            FROM pms.approval_flow_templates
            WHERE 1=1
        `

        if (moduleCode) {
            query += ` AND module_code = @moduleCode`
        }

        query += ` ORDER BY module_code, flow_code`

        const result = await pool.request()
            .input('moduleCode', sql.VarChar(50), moduleCode || null)
            .query(query)

        return result.recordset

    } catch (error) {
        console.error('fetchFlowTemplates error:', error)
        return []
    }
}

/**
 * Get flow template with steps and approvers
 */
export async function fetchFlowTemplateWithSteps(flowCode: string) {
    const template = await getFlowTemplate(flowCode)
    if (!template) {
        return { template: null, steps: [], approvers: {} }
    }

    const steps = await getFlowSteps(template.id)

    // Get approvers for each step
    const approvers: Record<string, any[]> = {}
    for (const step of steps) {
        approvers[step.id] = await getStepApprovers(step.id)
    }

    return { template, steps, approvers }
}

/**
 * Get step approvers
 */
export async function fetchStepApprovers(stepId: string) {
    return await getStepApprovers(stepId)
}

/**
 * Create a new flow template
 */
export async function createFlowTemplate(data: {
    flow_code: string
    flow_name: string
    module_code: string
    document_type?: string
    description?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        // Allow admin or manager roles to manage approval flows
        const allowedRoles = ['admin', 'manager', 'pm', 'department_head']
        if (!allowedRoles.includes(user.role || '')) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ในการสร้าง Flow Template กรุณาติดต่อ Admin' }
        }

        const pool = await getConnection()
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('flowCode', sql.VarChar(50), data.flow_code)
            .input('flowName', sql.NVarChar(200), data.flow_name)
            .input('moduleCode', sql.VarChar(50), data.module_code)
            .input('documentType', sql.VarChar(50), data.document_type || null)
            .input('description', sql.NVarChar(500), data.description || null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.approval_flow_templates
                (id, flow_code, flow_name, module_code, document_type, description, is_active, created_by)
                VALUES (@id, @flowCode, @flowName, @moduleCode, @documentType, @description, 1, @createdBy)
            `)

        revalidatePath('/settings/approvals')
        return { success: true, id }

    } catch (error: any) {
        console.error('createFlowTemplate error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Update a flow template
 */
export async function updateFlowTemplate(
    id: string,
    data: {
        flow_name?: string
        description?: string
        is_active?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        // Allow admin or manager roles to manage approval flows
        const allowedRoles = ['admin', 'manager', 'pm', 'department_head']
        if (!allowedRoles.includes(user.role || '')) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ในการแก้ไข Flow Template กรุณาติดต่อ Admin' }
        }

        const pool = await getConnection()

        const updates: string[] = []
        const request = pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('updatedBy', sql.UniqueIdentifier, user.id)

        if (data.flow_name !== undefined) {
            updates.push('flow_name = @flowName')
            request.input('flowName', sql.NVarChar(200), data.flow_name)
        }
        if (data.description !== undefined) {
            updates.push('description = @description')
            request.input('description', sql.NVarChar(500), data.description)
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = @isActive')
            request.input('isActive', sql.Bit, data.is_active ? 1 : 0)
        }

        if (updates.length === 0) {
            return { success: false, error: 'No updates provided' }
        }

        updates.push('updated_by = @updatedBy', 'updated_at = GETDATE()')

        await request.query(`
            UPDATE pms.approval_flow_templates
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/settings/approvals')
        return { success: true }

    } catch (error: any) {
        console.error('updateFlowTemplate error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Add a step to flow template
 */
export async function addFlowStep(data: {
    flow_template_id: string
    step_order: number
    step_name: string
    step_type?: 'SEQUENTIAL' | 'PARALLEL' | 'CONDITIONAL'
    approval_type?: 'SINGLE' | 'ALL' | 'ANY' | 'MAJORITY'
    can_reject?: boolean
    can_delegate?: boolean
    can_rollback?: boolean
    timeout_hours?: number
    is_mandatory?: boolean
    skip_condition?: any
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        // Allow admin or manager roles to manage approval flows
        const allowedRoles = ['admin', 'manager', 'pm', 'department_head']
        if (!allowedRoles.includes(user.role || '')) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ในการเพิ่ม Step กรุณาติดต่อ Admin' }
        }

        const pool = await getConnection()
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('flowTemplateId', sql.UniqueIdentifier, data.flow_template_id)
            .input('stepOrder', sql.Int, data.step_order)
            .input('stepName', sql.NVarChar(200), data.step_name)
            .input('stepType', sql.VarChar(20), data.step_type || 'SEQUENTIAL')
            .input('approvalType', sql.VarChar(20), data.approval_type || 'SINGLE')
            .input('canReject', sql.Bit, data.can_reject !== false ? 1 : 0)
            .input('canDelegate', sql.Bit, data.can_delegate !== false ? 1 : 0)
            .input('canRollback', sql.Bit, data.can_rollback ? 1 : 0)
            .input('timeoutHours', sql.Int, data.timeout_hours || null)
            .input('isMandatory', sql.Bit, data.is_mandatory !== false ? 1 : 0)
            .input('skipCondition', sql.NVarChar(sql.MAX), data.skip_condition ? JSON.stringify(data.skip_condition) : null)
            .query(`
                INSERT INTO pms.approval_flow_steps
                (id, flow_template_id, step_order, step_name, step_type, approval_type,
                 can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory, skip_condition)
                VALUES (@id, @flowTemplateId, @stepOrder, @stepName, @stepType, @approvalType,
                        @canReject, @canDelegate, @canRollback, @timeoutHours, @isMandatory, @skipCondition)
            `)

        revalidatePath('/settings/approvals')
        return { success: true, id }

    } catch (error: any) {
        console.error('addFlowStep error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Add approver to step
 */
export async function addStepApprover(data: {
    step_id: string
    approver_type: 'USER' | 'ROLE' | 'POSITION' | 'DOA_RULE' | 'DYNAMIC'
    approver_value: string
    approver_order?: number
    is_required?: boolean
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        // Allow admin or manager roles to manage approval flows
        const allowedRoles = ['admin', 'manager', 'pm', 'department_head']
        if (!allowedRoles.includes(user.role || '')) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ในการเพิ่ม Approver กรุณาติดต่อ Admin' }
        }

        const pool = await getConnection()
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('stepId', sql.UniqueIdentifier, data.step_id)
            .input('approverType', sql.VarChar(20), data.approver_type)
            .input('approverValue', sql.VarChar(200), data.approver_value)
            .input('approverOrder', sql.Int, data.approver_order || 1)
            .input('isRequired', sql.Bit, data.is_required !== false ? 1 : 0)
            .query(`
                INSERT INTO pms.approval_step_approvers
                (id, step_id, approver_type, approver_value, approver_order, is_required)
                VALUES (@id, @stepId, @approverType, @approverValue, @approverOrder, @isRequired)
            `)

        revalidatePath('/settings/approvals')
        return { success: true, id }

    } catch (error: any) {
        console.error('addStepApprover error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// APPROVER CHECK
// ============================================

/**
 * Check if current user can approve a document by its instance_id
 */
export async function checkCanApproveDocument(
    instanceId: string
): Promise<{ canApprove: boolean; instanceId?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { canApprove: false }

        const pool = await getConnection()

        const result = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT ai.id AS instance_id, aia.status AS approver_status
                FROM pms.approval_instances ai
                JOIN pms.approval_instance_approvers aia
                    ON ai.id = aia.instance_id
                    AND ai.current_step_order = aia.step_order
                WHERE ai.id = @instanceId
                  AND ai.status IN ('PENDING', 'IN_PROGRESS')
                  AND aia.status = 'PENDING'
                  AND aia.approver_id = @userId
            `)

        if (result.recordset.length > 0) {
            return { canApprove: true, instanceId: result.recordset[0].instance_id }
        }

        return { canApprove: false }

    } catch (error) {
        console.error('checkCanApproveDocument error:', error)
        return { canApprove: false }
    }
}

/**
 * Get approval instance by document_id
 */
export async function getApprovalInstanceByDocumentId(
    documentId: string,
    moduleCode: string
): Promise<{ instanceId?: string; status?: string; canApprove?: boolean }> {
    try {
        const user = await getCurrentUser()
        if (!user) return {}

        const pool = await getConnection()

        // Get latest approval instance for this document
        const instanceResult = await pool.request()
            .input('documentId', sql.VarChar(100), documentId)
            .input('moduleCode', sql.VarChar(50), moduleCode)
            .query(`
                SELECT TOP 1 id, status, current_step_order
                FROM pms.approval_instances
                WHERE document_id = @documentId AND module_code = @moduleCode
                ORDER BY request_date DESC
            `)

        if (instanceResult.recordset.length === 0) {
            return {}
        }

        const instance = instanceResult.recordset[0]

        // Check if user can approve
        const approverResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instance.id)
            .input('stepOrder', sql.Int, instance.current_step_order)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT id FROM pms.approval_instance_approvers
                WHERE instance_id = @instanceId
                  AND step_order = @stepOrder
                  AND approver_id = @userId
                  AND status = 'PENDING'
            `)

        return {
            instanceId: instance.id,
            status: instance.status,
            canApprove: approverResult.recordset.length > 0 &&
                       (instance.status === 'PENDING' || instance.status === 'IN_PROGRESS')
        }

    } catch (error) {
        console.error('getApprovalInstanceByDocumentId error:', error)
        return {}
    }
}

// ============================================
// DOCUMENT ATTACHMENTS
// ============================================

/**
 * Get document attachments by document_id and document_type
 */
export async function fetchDocumentAttachments(
    documentId: string,
    documentType: string
): Promise<{ success: boolean; attachments: any[]; error?: string }> {
    try {
        const pool = await getConnection()
        let tableName = ''

        // Determine table name based on document type
        switch (documentType) {
            case 'DEPLOY_SUCCESS':
                tableName = 'pms.deploy_success_records'
                break
            case 'DEPLOY_BACKUP':
                tableName = 'pms.deploy_backup_records'
                break
            case 'MEETING_MINUTES':
                tableName = 'pms.meeting_minutes_records'
                break
            default:
                return { success: false, attachments: [], error: 'Unknown document type' }
        }

        const result = await pool.request()
            .input('documentId', sql.UniqueIdentifier, documentId)
            .query(`SELECT attachments FROM ${tableName} WHERE id = @documentId`)

        if (result.recordset.length === 0) {
            return { success: false, attachments: [], error: 'Document not found' }
        }

        const attachmentsJson = result.recordset[0].attachments
        const attachments = attachmentsJson ? JSON.parse(attachmentsJson) : []

        return { success: true, attachments }

    } catch (error: any) {
        console.error('fetchDocumentAttachments error:', error)
        return { success: false, attachments: [], error: error.message }
    }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get approval statistics for dashboard
 */
export async function fetchApprovalStats(): Promise<{
    pendingCount: number
    overdueCount: number
    todayApproved: number
    todayRejected: number
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { pendingCount: 0, overdueCount: 0, todayApproved: 0, todayRejected: 0 }
        }

        const pool = await getConnection()

        // Get pending count for current user
        const pendingResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT COUNT(*) AS count
                FROM pms.approval_instances ai
                JOIN pms.approval_instance_approvers aia ON ai.id = aia.instance_id AND ai.current_step_order = aia.step_order
                WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
                  AND aia.status = 'PENDING'
                  AND aia.approver_id = @userId
            `)

        // Get overdue count
        const overdueResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT COUNT(*) AS count
                FROM pms.approval_instances ai
                JOIN pms.approval_instance_approvers aia ON ai.id = aia.instance_id AND ai.current_step_order = aia.step_order
                JOIN pms.approval_flow_steps afs ON ai.current_step_id = afs.id
                WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
                  AND aia.status = 'PENDING'
                  AND aia.approver_id = @userId
                  AND afs.timeout_hours IS NOT NULL
                  AND DATEDIFF(HOUR, ai.request_date, GETDATE()) > afs.timeout_hours
            `)

        // Get today's actions
        const todayResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT
                    SUM(CASE WHEN action_type = 'APPROVE' THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN action_type = 'REJECT' THEN 1 ELSE 0 END) AS rejected
                FROM pms.approval_actions
                WHERE approver_id = @userId
                  AND CAST(action_date AS DATE) = CAST(GETDATE() AS DATE)
            `)

        return {
            pendingCount: pendingResult.recordset[0]?.count || 0,
            overdueCount: overdueResult.recordset[0]?.count || 0,
            todayApproved: todayResult.recordset[0]?.approved || 0,
            todayRejected: todayResult.recordset[0]?.rejected || 0
        }

    } catch (error) {
        console.error('fetchApprovalStats error:', error)
        return { pendingCount: 0, overdueCount: 0, todayApproved: 0, todayRejected: 0 }
    }
}
