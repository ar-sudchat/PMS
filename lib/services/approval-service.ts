'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { sendApprovalNotification, sendApprovalResultNotification } from './notification-service'

// ============================================
// TYPES
// ============================================

export type ApprovalStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ROLLED_BACK'
export type ActionType = 'APPROVE' | 'REJECT' | 'DELEGATE' | 'ROLLBACK' | 'REQUEST_INFO' | 'CANCEL'
export type StepType = 'SEQUENTIAL' | 'PARALLEL' | 'CONDITIONAL'
export type ApprovalType = 'SINGLE' | 'ALL' | 'ANY' | 'MAJORITY'
export type ApproverType = 'USER' | 'ROLE' | 'POSITION' | 'DOA_RULE' | 'DYNAMIC'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface FlowTemplate {
    id: string
    flow_code: string
    flow_name: string
    module_code: string
    document_type?: string
    description?: string
    is_active: boolean
}

export interface FlowStep {
    id: string
    flow_template_id: string
    step_order: number
    step_name: string
    step_type: StepType
    approval_type: ApprovalType
    can_reject: boolean
    can_delegate: boolean
    can_rollback: boolean
    timeout_hours?: number
    is_mandatory: boolean
    skip_condition?: any
}

export interface ApprovalInstance {
    id: string
    flow_template_id: string
    module_code: string
    document_id: string
    document_type: string
    document_number?: string
    document_title?: string
    requester_id: string
    request_date: Date
    current_step_id?: string
    current_step_order: number
    status: ApprovalStatus
    completion_date?: Date
    document_data?: any
    metadata?: any
    priority: Priority
}

export interface StartApprovalInput {
    flow_code: string
    module_code: string
    document_id: string
    document_type: string
    document_number?: string
    document_title?: string
    document_data?: Record<string, any>
    metadata?: Record<string, any>
    priority?: Priority
}

export interface ApprovalActionInput {
    instance_id: string
    action: ActionType
    comments?: string
    delegated_to?: string
    delegation_reason?: string
    attachments?: any[]
}

export interface ApprovalResult {
    success: boolean
    instance_id?: string
    status?: ApprovalStatus
    current_step?: {
        step_id: string
        step_name: string
        step_order: number
        approvers: { user_id: string; user_name: string; email?: string }[]
    }
    error?: string
}

export interface PendingApproval {
    instance_id: string
    document_id: string
    document_type: string
    document_number?: string
    document_title?: string
    module_code: string
    status: ApprovalStatus
    priority: Priority
    request_date: Date
    current_step_order: number
    step_name: string
    timeout_hours?: number
    flow_name: string
    requester_name: string
    waiting_hours: number
    is_overdue: boolean
    document_data?: Record<string, any>
}

// ============================================
// FLOW TEMPLATE FUNCTIONS
// ============================================

/**
 * Get flow template by code
 */
export async function getFlowTemplate(flowCode: string): Promise<FlowTemplate | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('flowCode', sql.VarChar(50), flowCode)
            .query(`
                SELECT id, flow_code, flow_name, module_code, document_type, description, is_active
                FROM pms.approval_flow_templates
                WHERE flow_code = @flowCode AND is_active = 1
            `)

        if (result.recordset.length === 0) return null
        return result.recordset[0]
    } catch (error) {
        console.error('getFlowTemplate error:', error)
        return null
    }
}

/**
 * Get flow steps for a template
 */
export async function getFlowSteps(flowTemplateId: string): Promise<FlowStep[]> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('flowTemplateId', sql.UniqueIdentifier, flowTemplateId)
            .query(`
                SELECT id, flow_template_id, step_order, step_name, step_type, approval_type,
                       can_reject, can_delegate, can_rollback, timeout_hours, is_mandatory, skip_condition
                FROM pms.approval_flow_steps
                WHERE flow_template_id = @flowTemplateId
                ORDER BY step_order
            `)

        return result.recordset.map(row => ({
            ...row,
            skip_condition: row.skip_condition ? JSON.parse(row.skip_condition) : null
        }))
    } catch (error) {
        console.error('getFlowSteps error:', error)
        return []
    }
}

/**
 * Get step approvers
 */
export async function getStepApprovers(stepId: string): Promise<any[]> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('stepId', sql.UniqueIdentifier, stepId)
            .query(`
                SELECT id, step_id, approver_type, approver_value, approver_order, is_required
                FROM pms.approval_step_approvers
                WHERE step_id = @stepId
                ORDER BY approver_order
            `)

        return result.recordset
    } catch (error) {
        console.error('getStepApprovers error:', error)
        return []
    }
}

// ============================================
// MAIN APPROVAL FUNCTIONS
// ============================================

/**
 * Start a new approval flow
 */
export async function startApprovalFlow(input: StartApprovalInput): Promise<ApprovalResult> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get flow template
        const template = await getFlowTemplate(input.flow_code)
        if (!template) {
            return { success: false, error: `Flow template not found: ${input.flow_code}` }
        }

        // Get steps
        const steps = await getFlowSteps(template.id)
        if (steps.length === 0) {
            return { success: false, error: 'No steps defined for this flow' }
        }

        const pool = await getConnection()
        const instanceId = uuidv4()

        // Find first applicable step (skip conditional steps if condition not met)
        let firstStep = steps[0]
        for (const step of steps) {
            if (step.skip_condition && input.document_data) {
                const shouldSkip = evaluateCondition(step.skip_condition, input.document_data)
                if (shouldSkip) continue
            }
            firstStep = step
            break
        }

        // Create instance
        await pool.request()
            .input('id', sql.UniqueIdentifier, instanceId)
            .input('flowTemplateId', sql.UniqueIdentifier, template.id)
            .input('moduleCode', sql.VarChar(50), input.module_code)
            .input('documentId', sql.VarChar(100), input.document_id)
            .input('documentType', sql.VarChar(50), input.document_type)
            .input('documentNumber', sql.VarChar(100), input.document_number || null)
            .input('documentTitle', sql.NVarChar(500), input.document_title || null)
            .input('requesterId', sql.UniqueIdentifier, user.id)
            .input('currentStepId', sql.UniqueIdentifier, firstStep.id)
            .input('currentStepOrder', sql.Int, firstStep.step_order)
            .input('documentData', sql.NVarChar(sql.MAX), input.document_data ? JSON.stringify(input.document_data) : null)
            .input('metadata', sql.NVarChar(sql.MAX), input.metadata ? JSON.stringify(input.metadata) : null)
            .input('priority', sql.VarChar(20), input.priority || 'NORMAL')
            .query(`
                INSERT INTO pms.approval_instances
                (id, flow_template_id, module_code, document_id, document_type, document_number, document_title,
                 requester_id, current_step_id, current_step_order, status, document_data, metadata, priority)
                VALUES
                (@id, @flowTemplateId, @moduleCode, @documentId, @documentType, @documentNumber, @documentTitle,
                 @requesterId, @currentStepId, @currentStepOrder, 'IN_PROGRESS', @documentData, @metadata, @priority)
            `)

        // Resolve and create approvers for first step
        const approvers = await resolveApprovers(firstStep.id, input.document_data, user.id)

        for (const approver of approvers) {
            await pool.request()
                .input('id', sql.UniqueIdentifier, uuidv4())
                .input('instanceId', sql.UniqueIdentifier, instanceId)
                .input('stepId', sql.UniqueIdentifier, firstStep.id)
                .input('stepOrder', sql.Int, firstStep.step_order)
                .input('approverId', sql.UniqueIdentifier, approver.user_id)
                .query(`
                    INSERT INTO pms.approval_instance_approvers
                    (id, instance_id, step_id, step_order, approver_id, status)
                    VALUES (@id, @instanceId, @stepId, @stepOrder, @approverId, 'PENDING')
                `)

            // Send notification to approver
            if (approver.email) {
                await sendApprovalNotification({
                    approverEmail: approver.email,
                    approverName: approver.user_name,
                    approverUserId: approver.user_id,
                    documentType: input.document_type,
                    documentId: input.document_id,
                    documentTitle: input.document_title || input.document_id,
                    requesterName: user.name || user.nickname || 'Unknown'
                })
            }
        }

        // Record history
        await recordHistory(pool, instanceId, null, firstStep.id, null, 'IN_PROGRESS', user.id, 'Approval flow started')

        return {
            success: true,
            instance_id: instanceId,
            status: 'IN_PROGRESS',
            current_step: {
                step_id: firstStep.id,
                step_name: firstStep.step_name,
                step_order: firstStep.step_order,
                approvers: approvers.map(a => ({
                    user_id: a.user_id,
                    user_name: a.user_name,
                    email: a.email
                }))
            }
        }

    } catch (error: any) {
        console.error('startApprovalFlow error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Process approval action (approve, reject, delegate, etc.)
 */
export async function processApprovalAction(input: ApprovalActionInput): Promise<ApprovalResult> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get instance
        const instanceResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, input.instance_id)
            .query(`
                SELECT ai.*, aft.flow_code, aft.flow_name
                FROM pms.approval_instances ai
                JOIN pms.approval_flow_templates aft ON ai.flow_template_id = aft.id
                WHERE ai.id = @instanceId
            `)

        if (instanceResult.recordset.length === 0) {
            return { success: false, error: 'Approval instance not found' }
        }

        const instance = instanceResult.recordset[0]

        if (instance.status !== 'IN_PROGRESS' && instance.status !== 'PENDING') {
            return { success: false, error: `Cannot perform action on instance with status: ${instance.status}` }
        }

        // Check if user is authorized to approve
        const approverResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, input.instance_id)
            .input('stepOrder', sql.Int, instance.current_step_order)
            .input('approverId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT id, status FROM pms.approval_instance_approvers
                WHERE instance_id = @instanceId AND step_order = @stepOrder AND approver_id = @approverId
            `)

        if (approverResult.recordset.length === 0) {
            console.error('Authorization failed:', {
                instanceId: input.instance_id,
                stepOrder: instance.current_step_order,
                userId: user.id,
                userName: user.name
            })
            return { success: false, error: 'You are not authorized to approve this request' }
        }

        const approverRecord = approverResult.recordset[0]
        if (approverRecord.status !== 'PENDING') {
            return { success: false, error: 'You have already actioned this request' }
        }

        // Get current step info
        const stepResult = await pool.request()
            .input('stepId', sql.UniqueIdentifier, instance.current_step_id)
            .query(`
                SELECT * FROM pms.approval_flow_steps WHERE id = @stepId
            `)
        const currentStep = stepResult.recordset[0]

        // Record the action
        await pool.request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('instanceId', sql.UniqueIdentifier, input.instance_id)
            .input('stepId', sql.UniqueIdentifier, instance.current_step_id)
            .input('stepOrder', sql.Int, instance.current_step_order)
            .input('approverId', sql.UniqueIdentifier, user.id)
            .input('actionType', sql.VarChar(20), input.action)
            .input('comments', sql.NVarChar(sql.MAX), input.comments || null)
            .input('delegatedTo', sql.UniqueIdentifier, input.delegated_to || null)
            .input('delegationReason', sql.NVarChar(500), input.delegation_reason || null)
            .input('attachments', sql.NVarChar(sql.MAX), input.attachments ? JSON.stringify(input.attachments) : null)
            .query(`
                INSERT INTO pms.approval_actions
                (id, instance_id, step_id, step_order, approver_id, action_type, comments, delegated_to, delegation_reason, attachments)
                VALUES (@id, @instanceId, @stepId, @stepOrder, @approverId, @actionType, @comments, @delegatedTo, @delegationReason, @attachments)
            `)

        // Process based on action type
        let newStatus: ApprovalStatus = instance.status
        let result: ApprovalResult

        switch (input.action) {
            case 'APPROVE':
                result = await handleApprove(pool, instance, currentStep, user.id, input.comments)
                break

            case 'REJECT':
                result = await handleReject(pool, instance, currentStep, user.id, input.comments)
                break

            case 'DELEGATE':
                if (!input.delegated_to) {
                    return { success: false, error: 'delegated_to is required for delegation' }
                }
                result = await handleDelegate(pool, instance, currentStep, user.id, input.delegated_to, input.delegation_reason)
                break

            case 'ROLLBACK':
                if (!currentStep.can_rollback) {
                    return { success: false, error: 'Rollback is not allowed for this step' }
                }
                result = await handleRollback(pool, instance, currentStep, user.id, input.comments)
                break

            default:
                return { success: false, error: `Unknown action: ${input.action}` }
        }

        return result

    } catch (error: any) {
        console.error('processApprovalAction error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Handle approve action
 */
async function handleApprove(
    pool: sql.ConnectionPool,
    instance: any,
    currentStep: FlowStep,
    approverId: string,
    comments?: string
): Promise<ApprovalResult> {
    // Update approver status
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('stepOrder', sql.Int, instance.current_step_order)
        .input('approverId', sql.UniqueIdentifier, approverId)
        .input('comments', sql.NVarChar(sql.MAX), comments || null)
        .query(`
            UPDATE pms.approval_instance_approvers
            SET status = 'APPROVED', action_date = GETDATE(), comments = @comments
            WHERE instance_id = @instanceId AND step_order = @stepOrder AND approver_id = @approverId
        `)

    // Check if step is complete based on approval_type
    const stepComplete = await isStepComplete(pool, instance.id, instance.current_step_order, currentStep.approval_type)

    if (!stepComplete) {
        return {
            success: true,
            instance_id: instance.id,
            status: 'IN_PROGRESS'
        }
    }

    // Get next step
    const steps = await getFlowSteps(instance.flow_template_id)
    const documentData = instance.document_data ? JSON.parse(instance.document_data) : {}
    const nextStep = findNextStep(steps, instance.current_step_order, documentData)

    if (!nextStep) {
        // No more steps - approval complete!
        await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instance.id)
            .query(`
                UPDATE pms.approval_instances
                SET status = 'APPROVED', completion_date = GETDATE()
                WHERE id = @instanceId
            `)

        await recordHistory(pool, instance.id, currentStep.id, null, 'IN_PROGRESS', 'APPROVED', approverId, 'Approval completed')

        // Notify requester
        const requester = await getUser(pool, instance.requester_id)
        if (requester?.email) {
            await sendApprovalResultNotification({
                requesterEmail: requester.email,
                requesterName: requester.user_name || requester.nickname || 'User',
                requesterUserId: instance.requester_id,
                documentType: instance.document_type,
                documentId: instance.document_id,
                documentTitle: instance.document_title || instance.document_id,
                approverName: 'System',
                isApproved: true,
                comments
            })
        }

        return {
            success: true,
            instance_id: instance.id,
            status: 'APPROVED'
        }
    }

    // Move to next step
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('nextStepId', sql.UniqueIdentifier, nextStep.id)
        .input('nextStepOrder', sql.Int, nextStep.step_order)
        .query(`
            UPDATE pms.approval_instances
            SET current_step_id = @nextStepId, current_step_order = @nextStepOrder
            WHERE id = @instanceId
        `)

    // Resolve and create approvers for next step
    const approvers = await resolveApprovers(nextStep.id, documentData, instance.requester_id)

    for (const approver of approvers) {
        await pool.request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('instanceId', sql.UniqueIdentifier, instance.id)
            .input('stepId', sql.UniqueIdentifier, nextStep.id)
            .input('stepOrder', sql.Int, nextStep.step_order)
            .input('approverId', sql.UniqueIdentifier, approver.user_id)
            .query(`
                INSERT INTO pms.approval_instance_approvers
                (id, instance_id, step_id, step_order, approver_id, status)
                VALUES (@id, @instanceId, @stepId, @stepOrder, @approverId, 'PENDING')
            `)

        // Notify next approver
        if (approver.email) {
            await sendApprovalNotification({
                approverEmail: approver.email,
                approverName: approver.user_name,
                approverUserId: approver.user_id,
                documentType: instance.document_type,
                documentId: instance.document_id,
                documentTitle: instance.document_title || instance.document_id,
                requesterName: 'System'
            })
        }
    }

    await recordHistory(pool, instance.id, currentStep.id, nextStep.id, 'IN_PROGRESS', 'IN_PROGRESS', approverId, 'Moved to next step')

    return {
        success: true,
        instance_id: instance.id,
        status: 'IN_PROGRESS',
        current_step: {
            step_id: nextStep.id,
            step_name: nextStep.step_name,
            step_order: nextStep.step_order,
            approvers: approvers.map(a => ({
                user_id: a.user_id,
                user_name: a.user_name,
                email: a.email
            }))
        }
    }
}

/**
 * Handle reject action
 */
async function handleReject(
    pool: sql.ConnectionPool,
    instance: any,
    currentStep: FlowStep,
    approverId: string,
    comments?: string
): Promise<ApprovalResult> {
    // Update approver status
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('stepOrder', sql.Int, instance.current_step_order)
        .input('approverId', sql.UniqueIdentifier, approverId)
        .input('comments', sql.NVarChar(sql.MAX), comments || null)
        .query(`
            UPDATE pms.approval_instance_approvers
            SET status = 'REJECTED', action_date = GETDATE(), comments = @comments
            WHERE instance_id = @instanceId AND step_order = @stepOrder AND approver_id = @approverId
        `)

    // Reject the entire instance
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .query(`
            UPDATE pms.approval_instances
            SET status = 'REJECTED', completion_date = GETDATE()
            WHERE id = @instanceId
        `)

    await recordHistory(pool, instance.id, currentStep.id, null, 'IN_PROGRESS', 'REJECTED', approverId, comments || 'Rejected')

    // Notify requester
    const requester = await getUser(pool, instance.requester_id)
    const approver = await getUser(pool, approverId)

    if (requester?.email) {
        await sendApprovalResultNotification({
            requesterEmail: requester.email,
            requesterName: requester.user_name || requester.nickname || 'User',
            requesterUserId: instance.requester_id,
            documentType: instance.document_type,
            documentId: instance.document_id,
            documentTitle: instance.document_title || instance.document_id,
            approverName: approver?.user_name || approver?.nickname || 'Approver',
            isApproved: false,
            comments
        })
    }

    return {
        success: true,
        instance_id: instance.id,
        status: 'REJECTED'
    }
}

/**
 * Handle delegate action
 */
async function handleDelegate(
    pool: sql.ConnectionPool,
    instance: any,
    currentStep: FlowStep,
    approverId: string,
    delegatedTo: string,
    reason?: string
): Promise<ApprovalResult> {
    // Update current approver status
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('stepOrder', sql.Int, instance.current_step_order)
        .input('approverId', sql.UniqueIdentifier, approverId)
        .input('delegatedTo', sql.UniqueIdentifier, delegatedTo)
        .query(`
            UPDATE pms.approval_instance_approvers
            SET status = 'DELEGATED', action_date = GETDATE(), delegated_to = @delegatedTo
            WHERE instance_id = @instanceId AND step_order = @stepOrder AND approver_id = @approverId
        `)

    // Create new approver record for delegated user
    await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('stepId', sql.UniqueIdentifier, currentStep.id)
        .input('stepOrder', sql.Int, instance.current_step_order)
        .input('approverId', sql.UniqueIdentifier, delegatedTo)
        .query(`
            INSERT INTO pms.approval_instance_approvers
            (id, instance_id, step_id, step_order, approver_id, status)
            VALUES (@id, @instanceId, @stepId, @stepOrder, @approverId, 'PENDING')
        `)

    // Notify delegated user
    const delegatedUser = await getUser(pool, delegatedTo)
    if (delegatedUser?.email) {
        await sendApprovalNotification({
            approverEmail: delegatedUser.email,
            approverName: delegatedUser.user_name || delegatedUser.nickname || 'User',
            approverUserId: delegatedTo,
            documentType: instance.document_type,
            documentId: instance.document_id,
            documentTitle: instance.document_title || instance.document_id,
            requesterName: 'Delegated approval',
            description: reason
        })
    }

    return {
        success: true,
        instance_id: instance.id,
        status: 'IN_PROGRESS'
    }
}

/**
 * Handle rollback action
 */
async function handleRollback(
    pool: sql.ConnectionPool,
    instance: any,
    currentStep: FlowStep,
    approverId: string,
    reason?: string
): Promise<ApprovalResult> {
    const steps = await getFlowSteps(instance.flow_template_id)
    const previousStep = steps.find(s => s.step_order === instance.current_step_order - 1)

    if (!previousStep) {
        return { success: false, error: 'Cannot rollback - no previous step' }
    }

    // Update instance to previous step
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('prevStepId', sql.UniqueIdentifier, previousStep.id)
        .input('prevStepOrder', sql.Int, previousStep.step_order)
        .query(`
            UPDATE pms.approval_instances
            SET current_step_id = @prevStepId, current_step_order = @prevStepOrder, status = 'ROLLED_BACK'
            WHERE id = @instanceId
        `)

    // Reset previous step approvers
    await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instance.id)
        .input('stepOrder', sql.Int, previousStep.step_order)
        .query(`
            UPDATE pms.approval_instance_approvers
            SET status = 'PENDING', action_date = NULL, comments = NULL
            WHERE instance_id = @instanceId AND step_order = @stepOrder
        `)

    await recordHistory(pool, instance.id, currentStep.id, previousStep.id, 'IN_PROGRESS', 'ROLLED_BACK', approverId, reason || 'Rolled back')

    return {
        success: true,
        instance_id: instance.id,
        status: 'ROLLED_BACK'
    }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get pending approvals for current user
 */
export async function getMyPendingApprovals(moduleCode?: string): Promise<PendingApproval[]> {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        // Use LEFT JOIN for approval_flow_steps since current_step_id might be NULL
        // Join steps by flow_template_id and step_order instead
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
                ai.current_step_order,
                ai.document_data,
                COALESCE(afs.step_name, afs2.step_name, 'Pending Approval') AS step_name,
                COALESCE(afs.timeout_hours, afs2.timeout_hours) AS timeout_hours,
                aft.flow_name,
                CONCAT(e.first_name, ' ', e.last_name) AS requester_name,
                DATEDIFF(HOUR, ai.request_date, GETDATE()) AS waiting_hours
            FROM pms.approval_instances ai
            JOIN pms.approval_instance_approvers aia ON ai.id = aia.instance_id AND ai.current_step_order = aia.step_order
            JOIN pms.approval_flow_templates aft ON ai.flow_template_id = aft.id
            LEFT JOIN pms.approval_flow_steps afs ON ai.current_step_id = afs.id
            LEFT JOIN pms.approval_flow_steps afs2 ON aft.id = afs2.flow_template_id AND ai.current_step_order = afs2.step_order
            LEFT JOIN pms.employees e ON ai.requester_id = e.id
            WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
              AND aia.status = 'PENDING'
              AND aia.approver_id = @userId
        `

        if (moduleCode) {
            query += ` AND ai.module_code = @moduleCode`
        }

        query += ` ORDER BY ai.priority DESC, ai.request_date ASC`

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('moduleCode', sql.VarChar(50), moduleCode || null)
            .query(query)

        return result.recordset.map(row => ({
            ...row,
            document_data: row.document_data ? JSON.parse(row.document_data) : null,
            is_overdue: row.timeout_hours ? row.waiting_hours > row.timeout_hours : false
        }))

    } catch (error) {
        console.error('getMyPendingApprovals error:', error)
        return []
    }
}

/**
 * Get approval instance details
 */
export async function getApprovalInstance(instanceId: string): Promise<any> {
    try {
        const user = await getCurrentUser()
        if (!user) return null

        const pool = await getConnection()

        const result = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .query(`
                SELECT
                    ai.*,
                    aft.flow_code,
                    aft.flow_name,
                    afs.step_name AS current_step_name,
                    CONCAT(e.first_name, ' ', e.last_name) AS requester_name,
                    e.email AS requester_email
                FROM pms.approval_instances ai
                JOIN pms.approval_flow_templates aft ON ai.flow_template_id = aft.id
                LEFT JOIN pms.approval_flow_steps afs ON ai.current_step_id = afs.id
                LEFT JOIN pms.employees e ON ai.requester_id = e.id
                WHERE ai.id = @instanceId
            `)

        if (result.recordset.length === 0) return null

        const instance = result.recordset[0]

        // Get actions history
        const actionsResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .query(`
                SELECT
                    aa.*,
                    CONCAT(e.first_name, ' ', e.last_name) AS approver_name,
                    afs.step_name
                FROM pms.approval_actions aa
                LEFT JOIN pms.employees e ON aa.approver_id = e.id
                LEFT JOIN pms.approval_flow_steps afs ON aa.step_id = afs.id
                WHERE aa.instance_id = @instanceId
                ORDER BY aa.action_date DESC
            `)

        // Get current approvers
        const approversResult = await pool.request()
            .input('instanceId', sql.UniqueIdentifier, instanceId)
            .input('stepOrder', sql.Int, instance.current_step_order)
            .query(`
                SELECT
                    aia.*,
                    CONCAT(e.first_name, ' ', e.last_name) AS approver_name,
                    e.email AS approver_email
                FROM pms.approval_instance_approvers aia
                LEFT JOIN pms.employees e ON aia.approver_id = e.id
                WHERE aia.instance_id = @instanceId AND aia.step_order = @stepOrder
            `)

        return {
            ...instance,
            document_data: instance.document_data ? JSON.parse(instance.document_data) : null,
            metadata: instance.metadata ? JSON.parse(instance.metadata) : null,
            actions: actionsResult.recordset,
            current_approvers: approversResult.recordset
        }

    } catch (error) {
        console.error('getApprovalInstance error:', error)
        return null
    }
}

/**
 * Get approval status for a document
 */
export async function getDocumentApprovalStatus(documentId: string, moduleCode: string): Promise<any> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('documentId', sql.VarChar(100), documentId)
            .input('moduleCode', sql.VarChar(50), moduleCode)
            .query(`
                SELECT id, status, current_step_order, request_date, completion_date
                FROM pms.approval_instances
                WHERE document_id = @documentId AND module_code = @moduleCode
                ORDER BY request_date DESC
            `)

        if (result.recordset.length === 0) {
            return { hasApproval: false }
        }

        return {
            hasApproval: true,
            ...result.recordset[0]
        }

    } catch (error) {
        console.error('getDocumentApprovalStatus error:', error)
        return { hasApproval: false }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolve approvers for a step
 */
async function resolveApprovers(
    stepId: string,
    documentData: any,
    requesterId: string
): Promise<{ user_id: string; user_name: string; email?: string }[]> {
    const approvers: { user_id: string; user_name: string; email?: string }[] = []
    const pool = await getConnection()

    const stepApprovers = await getStepApprovers(stepId)

    for (const approverConfig of stepApprovers) {
        switch (approverConfig.approver_type) {
            case 'USER':
                // Fixed user
                const userResult = await pool.request()
                    .input('userId', sql.UniqueIdentifier, approverConfig.approver_value)
                    .query(`SELECT id, CONCAT(first_name, ' ', last_name) AS user_name, email FROM pms.employees WHERE id = @userId`)
                if (userResult.recordset[0]) {
                    approvers.push({
                        user_id: userResult.recordset[0].id,
                        user_name: userResult.recordset[0].user_name,
                        email: userResult.recordset[0].email
                    })
                }
                break

            case 'ROLE':
                // Get users by position code (role in position table)
                const roleResult = await pool.request()
                    .input('positionCode', sql.VarChar(50), approverConfig.approver_value)
                    .query(`
                        SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                        FROM pms.employees e
                        JOIN pms.positions p ON e.position_id = p.id
                        WHERE p.code = @positionCode AND e.is_active = 1
                    `)
                for (const u of roleResult.recordset) {
                    approvers.push({ user_id: u.id, user_name: u.user_name, email: u.email })
                }
                break

            case 'DYNAMIC':
                // Resolve dynamically
                const dynamicApprovers = await resolveDynamicApprover(approverConfig.approver_value, requesterId, documentData)
                approvers.push(...dynamicApprovers)
                break

            case 'DOA_RULE':
                // Resolve by DOA
                const doaApprovers = await resolveByDOA(approverConfig.approver_value, documentData)
                approvers.push(...doaApprovers)
                break
        }
    }

    // Remove duplicates
    const uniqueApprovers = approvers.filter((v, i, a) =>
        a.findIndex(t => t.user_id === v.user_id) === i
    )

    return uniqueApprovers
}

/**
 * Resolve dynamic approver
 */
async function resolveDynamicApprover(
    dynamicType: string,
    requesterId: string,
    documentData: any
): Promise<{ user_id: string; user_name: string; email?: string }[]> {
    const pool = await getConnection()

    switch (dynamicType) {
        case 'REQUESTER_MANAGER':
            // Get requester's manager - fallback to manager by position in same department
            try {
                // First, check if head_id column exists in departments
                const columnCheck = await pool.request().query(`
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'pms'
                    AND TABLE_NAME = 'departments'
                    AND COLUMN_NAME = 'head_id'
                `)

                let managerResult
                if (columnCheck.recordset.length > 0) {
                    // head_id column exists, try it first
                    managerResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT TOP 1 m.id, CONCAT(m.first_name, ' ', m.last_name) AS user_name, m.email
                            FROM pms.employees e
                            LEFT JOIN pms.departments d ON e.department_id = d.id
                            LEFT JOIN pms.employees m ON d.head_id = m.id
                            WHERE e.id = @userId AND m.id IS NOT NULL AND m.id != e.id AND m.is_active = 1
                        `)
                }

                // Fallback: Get any manager in same department by position
                if (!managerResult || managerResult.recordset.length === 0) {
                    managerResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT TOP 1 m.id, CONCAT(m.first_name, ' ', m.last_name) AS user_name, m.email
                            FROM pms.employees e
                            JOIN pms.employees m ON e.department_id = m.department_id
                            JOIN pms.positions p ON m.position_id = p.id
                            WHERE e.id = @userId
                              AND m.id != e.id
                              AND m.is_active = 1
                              AND (p.code LIKE '%MGR%' OR p.code LIKE '%MANAGER%'
                                   OR p.name LIKE '%Manager%' OR p.name LIKE '%หัวหน้า%')
                        `)
                }

                // Second fallback: Get any active employee with Manager in position (different department)
                if (!managerResult || managerResult.recordset.length === 0) {
                    managerResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT TOP 1 m.id, CONCAT(m.first_name, ' ', m.last_name) AS user_name, m.email
                            FROM pms.employees e
                            CROSS JOIN pms.employees m
                            JOIN pms.positions p ON m.position_id = p.id
                            WHERE e.id = @userId
                              AND m.id != e.id
                              AND m.is_active = 1
                              AND (p.code LIKE '%MGR%' OR p.code LIKE '%MANAGER%'
                                   OR p.name LIKE '%Manager%' OR p.name LIKE '%หัวหน้า%')
                        `)
                }

                // Third fallback: Get any admin user (role is stored in employees table)
                if (!managerResult || managerResult.recordset.length === 0) {
                    managerResult = await pool.request()
                        .query(`
                            SELECT TOP 1 e.id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                            FROM pms.employees e
                            WHERE e.role = 'admin' AND e.is_active = 1
                        `)
                }

                // Fourth fallback: Use requester themselves if no other approver found
                if (!managerResult || managerResult.recordset.length === 0) {
                    console.warn('No manager/admin found, using requester as self-approver:', requesterId)
                    managerResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                            FROM pms.employees e
                            WHERE e.id = @userId AND e.is_active = 1
                        `)
                }

                if (managerResult && managerResult.recordset[0]) {
                    return [{
                        user_id: managerResult.recordset[0].id,
                        user_name: managerResult.recordset[0].user_name,
                        email: managerResult.recordset[0].email
                    }]
                }
            } catch (err) {
                console.error('Error finding manager:', err)
            }
            // If still no manager found, log warning
            console.warn('No manager found for requester:', requesterId)
            break

        case 'DEPT_HEAD':
            // Get department head - try head_id first, then fallback
            try {
                const columnCheck2 = await pool.request().query(`
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'pms'
                    AND TABLE_NAME = 'departments'
                    AND COLUMN_NAME = 'head_id'
                `)

                let deptHeadResult
                if (columnCheck2.recordset.length > 0) {
                    deptHeadResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT TOP 1 m.id, CONCAT(m.first_name, ' ', m.last_name) AS user_name, m.email
                            FROM pms.employees e
                            LEFT JOIN pms.departments d ON e.department_id = d.id
                            LEFT JOIN pms.employees m ON d.head_id = m.id
                            WHERE e.id = @userId AND m.id IS NOT NULL AND m.is_active = 1
                        `)
                }

                if (!deptHeadResult || deptHeadResult.recordset.length === 0) {
                    deptHeadResult = await pool.request()
                        .input('userId', sql.UniqueIdentifier, requesterId)
                        .query(`
                            SELECT TOP 1 m.id, CONCAT(m.first_name, ' ', m.last_name) AS user_name, m.email
                            FROM pms.employees e
                            JOIN pms.employees m ON e.department_id = m.department_id
                            JOIN pms.positions p ON m.position_id = p.id
                            WHERE e.id = @userId
                              AND m.is_active = 1
                              AND (p.code LIKE '%MGR%' OR p.code LIKE '%HEAD%'
                                   OR p.name LIKE '%Manager%' OR p.name LIKE '%หัวหน้า%')
                        `)
                }

                if (deptHeadResult && deptHeadResult.recordset[0]) {
                    return [{
                        user_id: deptHeadResult.recordset[0].id,
                        user_name: deptHeadResult.recordset[0].user_name,
                        email: deptHeadResult.recordset[0].email
                    }]
                }
            } catch (err) {
                console.error('Error finding dept head:', err)
            }
            break

        case 'PROJECT_MANAGER':
            // Get project manager from document_data
            try {
                // Try project_manager_id first
                if (documentData?.project_manager_id) {
                    const pmResult = await pool.request()
                        .input('pmId', sql.UniqueIdentifier, documentData.project_manager_id)
                        .query(`SELECT id, CONCAT(first_name, ' ', last_name) AS user_name, email FROM pms.employees WHERE id = @pmId AND is_active = 1`)
                    if (pmResult.recordset[0]) {
                        return [{
                            user_id: pmResult.recordset[0].id,
                            user_name: pmResult.recordset[0].user_name,
                            email: pmResult.recordset[0].email
                        }]
                    }
                }

                // Fallback: Try to get PM from project_id
                if (documentData?.project_id) {
                    const pmFromProjectResult = await pool.request()
                        .input('projectId', sql.UniqueIdentifier, documentData.project_id)
                        .query(`
                            SELECT TOP 1 e.id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                            FROM pms.projects p
                            JOIN pms.employees e ON p.project_manager_id = e.id
                            WHERE p.id = @projectId AND e.is_active = 1
                        `)
                    if (pmFromProjectResult.recordset[0]) {
                        return [{
                            user_id: pmFromProjectResult.recordset[0].id,
                            user_name: pmFromProjectResult.recordset[0].user_name,
                            email: pmFromProjectResult.recordset[0].email
                        }]
                    }
                }

                // Second fallback: Use REQUESTER_MANAGER logic
                console.log('PROJECT_MANAGER not found, falling back to REQUESTER_MANAGER')
                return await resolveDynamicApprover('REQUESTER_MANAGER', requesterId, documentData)

            } catch (err) {
                console.error('Error finding project manager:', err)
            }
            break
    }

    return []
}

/**
 * Resolve approvers by DOA rule
 */
async function resolveByDOA(
    doaRuleCode: string,
    documentData: any
): Promise<{ user_id: string; user_name: string; email?: string }[]> {
    const pool = await getConnection()

    // Get DOA rule
    const ruleResult = await pool.request()
        .input('ruleCode', sql.VarChar(50), doaRuleCode)
        .query(`SELECT * FROM pms.doa_rules WHERE rule_code = @ruleCode AND is_active = 1`)

    if (ruleResult.recordset.length === 0) return []

    const rule = ruleResult.recordset[0]
    const conditions = JSON.parse(rule.conditions)

    // Find matching level based on amount
    const amount = documentData?.budget || documentData?.amount || 0
    let matchingLevel: any = null

    for (const r of conditions.rules) {
        const minAmount = r.min_amount || 0
        const maxAmount = r.max_amount

        if (amount >= minAmount && (maxAmount === null || amount <= maxAmount)) {
            matchingLevel = r
            break
        }
    }

    if (!matchingLevel) return []

    // Get user with matching position/role (using positions table)
    const approverResult = await pool.request()
        .input('positionCode', sql.VarChar(50), matchingLevel.position)
        .query(`
            SELECT TOP 1 e.id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
            FROM pms.employees e
            JOIN pms.positions p ON e.position_id = p.id
            WHERE p.code = @positionCode AND e.is_active = 1
            ORDER BY e.created_at
        `)

    if (approverResult.recordset[0]) {
        return [{
            user_id: approverResult.recordset[0].id,
            user_name: approverResult.recordset[0].user_name,
            email: approverResult.recordset[0].email
        }]
    }

    return []
}

/**
 * Check if step is complete based on approval type
 */
async function isStepComplete(
    pool: sql.ConnectionPool,
    instanceId: string,
    stepOrder: number,
    approvalType: ApprovalType
): Promise<boolean> {
    const result = await pool.request()
        .input('instanceId', sql.UniqueIdentifier, instanceId)
        .input('stepOrder', sql.Int, stepOrder)
        .query(`
            SELECT status FROM pms.approval_instance_approvers
            WHERE instance_id = @instanceId AND step_order = @stepOrder
        `)

    const approvers = result.recordset
    const pendingCount = approvers.filter(a => a.status === 'PENDING').length
    const approvedCount = approvers.filter(a => a.status === 'APPROVED').length
    const totalCount = approvers.length

    switch (approvalType) {
        case 'SINGLE':
            return approvedCount >= 1

        case 'ALL':
            return pendingCount === 0 && approvedCount === totalCount

        case 'ANY':
            return approvedCount >= 1

        case 'MAJORITY':
            return approvedCount > totalCount / 2

        default:
            return approvedCount >= 1
    }
}

/**
 * Find next applicable step
 */
function findNextStep(
    steps: FlowStep[],
    currentOrder: number,
    documentData: any
): FlowStep | null {
    for (const step of steps) {
        if (step.step_order <= currentOrder) continue

        // Check skip condition
        if (step.skip_condition) {
            const shouldSkip = evaluateCondition(step.skip_condition, documentData)
            if (shouldSkip) continue
        }

        return step
    }

    return null
}

/**
 * Evaluate condition for conditional steps
 */
function evaluateCondition(condition: any, data: any): boolean {
    if (!condition || !data) return false

    const field = condition.field
    const operator = condition.operator
    const value = condition.value
    const fieldValue = data[field]

    if (fieldValue === undefined || fieldValue === null) return false

    switch (operator) {
        case '<':
            return fieldValue < value
        case '<=':
            return fieldValue <= value
        case '>':
            return fieldValue > value
        case '>=':
            return fieldValue >= value
        case '==':
        case '=':
            return fieldValue == value
        case '!=':
            return fieldValue != value
        default:
            return false
    }
}

/**
 * Record history entry
 */
async function recordHistory(
    pool: sql.ConnectionPool,
    instanceId: string,
    fromStepId: string | null,
    toStepId: string | null,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string,
    reason?: string
): Promise<void> {
    await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('instanceId', sql.UniqueIdentifier, instanceId)
        .input('fromStepId', sql.UniqueIdentifier, fromStepId)
        .input('toStepId', sql.UniqueIdentifier, toStepId)
        .input('fromStatus', sql.VarChar(20), fromStatus)
        .input('toStatus', sql.VarChar(20), toStatus)
        .input('changedBy', sql.UniqueIdentifier, changedBy)
        .input('reason', sql.NVarChar(500), reason || null)
        .query(`
            INSERT INTO pms.approval_history
            (id, instance_id, from_step_id, to_step_id, from_status, to_status, changed_by, change_reason)
            VALUES (@id, @instanceId, @fromStepId, @toStepId, @fromStatus, @toStatus, @changedBy, @reason)
        `)
}

/**
 * Get user by ID
 */
async function getUser(pool: sql.ConnectionPool, userId: string): Promise<any> {
    const result = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`SELECT id, CONCAT(first_name, ' ', last_name) AS user_name, nickname, email FROM pms.employees WHERE id = @userId`)

    return result.recordset[0] || null
}
