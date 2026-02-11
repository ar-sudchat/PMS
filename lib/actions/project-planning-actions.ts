'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// Types
// ============================================

export interface ProjectPlan {
    plan_id: string
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    version: number
    version_name: string
    plan_name: string
    description: string
    objectives: string
    scope_summary: string
    status: string
    is_baseline: boolean
    planned_start_date: string
    planned_end_date: string
    duration_days: number
    calculated_duration: number
    total_mandays: number
    total_budget: number
    manday_rate: number
    milestone_count: number
    milestone_total_mandays: number
    resource_count: number
    total_team_size: number
    deliverable_count: number
    risk_count: number
    high_risk_count: number
    assumption_count: number
    constraint_count: number
    submitted_at: string
    submitted_by: string
    submitted_by_name: string
    approved_at: string
    approved_by: string
    approved_by_name: string
    approval_comments: string
    created_by: string
    created_by_name: string
    created_at: string
    updated_at: string
}

export interface MilestonePlan {
    milestone_plan_id: string
    plan_id: string
    project_id: string
    project_code: string
    milestone_name: string
    milestone_description: string
    planned_start_date: string
    planned_end_date: string
    duration_days: number
    planned_mandays: number
    sort_order: number
    color: string
    dependency_milestone_id: string
    dependency_name: string
    deliverable_count: number
    resource_count: number
    team_size: number
}

export interface ResourcePlan {
    resource_plan_id: string
    plan_id: string
    project_id: string
    project_code: string
    position: string
    quantity: number
    employee_id: string
    employee_name: string
    allocation_percent: number
    start_date: string
    end_date: string
    duration_days: number
    planned_mandays: number
    milestone_plan_id: string
    milestone_name: string
    notes: string
}

export interface DeliverablePlan {
    id: string
    plan_id: string
    name: string
    description: string
    milestone_plan_id: string
    milestone_name: string
    due_date: string
    deliverable_type: string
    status: string
    actual_date: string
    sort_order: number
}

export interface RiskPlan {
    id: string
    plan_id: string
    risk_name: string
    description: string
    impact: string
    probability: string
    risk_level: string
    mitigation_plan: string
    contingency_plan: string
    risk_owner_id: string
    risk_owner_name: string
    status: string
    sort_order: number
}

export interface AssumptionPlan {
    id: string
    plan_id: string
    type: 'ASSUMPTION' | 'CONSTRAINT'
    description: string
    category: string
    sort_order: number
}

export interface PlanApprovalHistory {
    id: string
    plan_id: string
    action: string
    action_by: string
    action_by_name: string
    action_at: string
    from_status: string
    to_status: string
    comments: string
}

// ============================================
// Project Plan CRUD
// ============================================

export async function getProjectPlans(projectId: string): Promise<{
    success: boolean
    data?: ProjectPlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT * FROM pms.vw_project_plan_summary
                WHERE project_id = @project_id
                ORDER BY version DESC
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching project plans:', error)
        return { success: false, error: 'Failed to fetch project plans' }
    }
}

export async function getAllPlans(filters?: {
    status?: string
    search?: string
    projectId?: string
}): Promise<{
    success: boolean
    data?: ProjectPlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        let query = `SELECT * FROM pms.vw_project_plan_summary WHERE 1=1`
        const request = pool.request()

        if (filters?.status && filters.status !== 'ALL') {
            query += ` AND status = @status`
            request.input('status', sql.NVarChar, filters.status)
        }

        if (filters?.search) {
            query += ` AND (project_code LIKE @search OR project_name LIKE @search OR plan_name LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        if (filters?.projectId) {
            query += ` AND project_id = @projectId`
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }

        query += ` ORDER BY created_at DESC`

        const result = await request.query(query)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching all plans:', error)
        return { success: false, error: 'Failed to fetch plans' }
    }
}

export async function getProjectPlanById(planId: string): Promise<{
    success: boolean
    data?: ProjectPlan
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`SELECT * FROM pms.vw_project_plan_summary WHERE plan_id = @plan_id`)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Plan not found' }
        }
        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching plan:', error)
        return { success: false, error: 'Failed to fetch plan' }
    }
}

export async function createProjectPlan(data: {
    projectId: string
    planName: string
    description?: string
    objectives?: string
    scopeSummary?: string
    plannedStartDate: string
    plannedEndDate: string
    totalMandays: number
    totalBudget?: number
    mandayRate?: number
}): Promise<{ success: boolean; planId?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Get next version
        const versionResult = await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.projectId)
            .query(`
                SELECT ISNULL(MAX(version), 0) + 1 AS next_version
                FROM pms.project_plans WHERE project_id = @project_id
            `)
        const nextVersion = versionResult.recordset[0].next_version

        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.projectId)
            .input('version', sql.Int, nextVersion)
            .input('plan_name', sql.NVarChar, data.planName)
            .input('description', sql.NVarChar, data.description || null)
            .input('objectives', sql.NVarChar, data.objectives || null)
            .input('scope_summary', sql.NVarChar, data.scopeSummary || null)
            .input('planned_start_date', sql.Date, data.plannedStartDate)
            .input('planned_end_date', sql.Date, data.plannedEndDate)
            .input('total_mandays', sql.Int, data.totalMandays)
            .input('total_budget', sql.Decimal(18, 2), data.totalBudget || null)
            .input('manday_rate', sql.Decimal(18, 2), data.mandayRate || null)
            .input('created_by', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.project_plans (
                    project_id, version, plan_name, description, objectives, scope_summary,
                    planned_start_date, planned_end_date, total_mandays, total_budget, manday_rate,
                    created_by
                )
                OUTPUT INSERTED.id
                VALUES (
                    @project_id, @version, @plan_name, @description, @objectives, @scope_summary,
                    @planned_start_date, @planned_end_date, @total_mandays, @total_budget, @manday_rate,
                    @created_by
                )
            `)

        revalidatePath('/project-planning')
        return { success: true, planId: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating plan:', error)
        const msg = error instanceof Error ? error.message : 'Failed to create plan'
        return { success: false, error: msg }
    }
}

export async function updateProjectPlan(
    planId: string,
    data: {
        planName?: string
        description?: string
        objectives?: string
        scopeSummary?: string
        plannedStartDate?: string
        plannedEndDate?: string
        totalMandays?: number
        totalBudget?: number
        mandayRate?: number
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .input('plan_name', sql.NVarChar, data.planName || null)
            .input('description', sql.NVarChar, data.description !== undefined ? data.description : null)
            .input('objectives', sql.NVarChar, data.objectives !== undefined ? data.objectives : null)
            .input('scope_summary', sql.NVarChar, data.scopeSummary !== undefined ? data.scopeSummary : null)
            .input('planned_start_date', sql.Date, data.plannedStartDate || null)
            .input('planned_end_date', sql.Date, data.plannedEndDate || null)
            .input('total_mandays', sql.Int, data.totalMandays !== undefined ? data.totalMandays : null)
            .input('total_budget', sql.Decimal(18, 2), data.totalBudget !== undefined ? data.totalBudget : null)
            .input('manday_rate', sql.Decimal(18, 2), data.mandayRate !== undefined ? data.mandayRate : null)
            .input('updated_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.project_plans SET
                    plan_name = ISNULL(@plan_name, plan_name),
                    description = @description,
                    objectives = @objectives,
                    scope_summary = @scope_summary,
                    planned_start_date = ISNULL(@planned_start_date, planned_start_date),
                    planned_end_date = ISNULL(@planned_end_date, planned_end_date),
                    total_mandays = ISNULL(@total_mandays, total_mandays),
                    total_budget = @total_budget,
                    manday_rate = @manday_rate,
                    updated_by = @updated_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating plan:', error)
        return { success: false, error: 'Failed to update plan' }
    }
}

export async function deleteProjectPlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .query(`UPDATE pms.project_plans SET is_active = 0 WHERE id = @id`)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting plan:', error)
        return { success: false, error: 'Failed to delete plan' }
    }
}

// ============================================
// Approval Workflow
// ============================================

async function addPlanHistory(
    planId: string,
    action: string,
    actionBy: string,
    fromStatus: string,
    toStatus: string,
    comments?: string
) {
    const pool = await getConnection()
    await pool.request()
        .input('plan_id', sql.UniqueIdentifier, planId)
        .input('action', sql.NVarChar, action)
        .input('action_by', sql.UniqueIdentifier, actionBy)
        .input('from_status', sql.NVarChar, fromStatus)
        .input('to_status', sql.NVarChar, toStatus)
        .input('comments', sql.NVarChar, comments || null)
        .query(`
            INSERT INTO pms.plan_approval_history
                (plan_id, action, action_by, from_status, to_status, comments)
            VALUES
                (@plan_id, @action, @action_by, @from_status, @to_status, @comments)
        `)
}

export async function submitPlanForApproval(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const planResult = await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .query(`SELECT status FROM pms.project_plans WHERE id = @id`)

        if (planResult.recordset.length === 0) return { success: false, error: 'Plan not found' }
        const currentStatus = planResult.recordset[0].status

        if (currentStatus !== 'DRAFT' && currentStatus !== 'REVISION') {
            return { success: false, error: 'สามารถส่งขออนุมัติได้เฉพาะแผนที่เป็น Draft หรือ Revision เท่านั้น' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .input('submitted_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.project_plans SET
                    status = 'SUBMITTED',
                    submitted_at = GETDATE(),
                    submitted_by = @submitted_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        await addPlanHistory(planId, 'SUBMIT', user.id, currentStatus, 'SUBMITTED', 'ส่งแผนขออนุมัติ')

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error submitting plan:', error)
        return { success: false, error: 'Failed to submit plan' }
    }
}

export async function approvePlan(
    planId: string,
    comments?: string,
    setAsBaseline: boolean = true
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const planResult = await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .query(`SELECT project_id, status FROM pms.project_plans WHERE id = @id`)

        if (planResult.recordset.length === 0) return { success: false, error: 'Plan not found' }
        if (planResult.recordset[0].status !== 'SUBMITTED') {
            return { success: false, error: 'สามารถอนุมัติได้เฉพาะแผนที่ส่งขออนุมัติแล้วเท่านั้น' }
        }

        const projectId = planResult.recordset[0].project_id

        if (setAsBaseline && projectId) {
            await pool.request()
                .input('project_id', sql.UniqueIdentifier, projectId)
                .input('plan_id', sql.UniqueIdentifier, planId)
                .query(`
                    UPDATE pms.project_plans SET is_baseline = 0
                    WHERE project_id = @project_id AND id != @plan_id
                `)
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .input('approved_by', sql.UniqueIdentifier, user.id)
            .input('comments', sql.NVarChar, comments || null)
            .input('is_baseline', sql.Bit, setAsBaseline)
            .query(`
                UPDATE pms.project_plans SET
                    status = 'APPROVED',
                    approved_at = GETDATE(),
                    approved_by = @approved_by,
                    approval_comments = @comments,
                    is_baseline = @is_baseline,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        await addPlanHistory(planId, 'APPROVE', user.id, 'SUBMITTED', 'APPROVED', comments || 'อนุมัติแผน')

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error approving plan:', error)
        return { success: false, error: 'Failed to approve plan' }
    }
}

export async function requestPlanRevision(
    planId: string,
    comments: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .input('comments', sql.NVarChar, comments)
            .query(`
                UPDATE pms.project_plans SET
                    status = 'REVISION',
                    approval_comments = @comments,
                    updated_at = GETDATE()
                WHERE id = @id AND status = 'SUBMITTED'
            `)

        await addPlanHistory(planId, 'REVISION', user.id, 'SUBMITTED', 'REVISION', comments)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error requesting revision:', error)
        return { success: false, error: 'Failed to request revision' }
    }
}

export async function revertPlanToDraft(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const planResult = await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .query(`SELECT status FROM pms.project_plans WHERE id = @id`)

        if (planResult.recordset.length === 0) return { success: false, error: 'Plan not found' }
        const currentStatus = planResult.recordset[0].status

        await pool.request()
            .input('id', sql.UniqueIdentifier, planId)
            .query(`
                UPDATE pms.project_plans SET
                    status = 'DRAFT',
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        await addPlanHistory(planId, 'REVERT', user.id, currentStatus, 'DRAFT', 'เปลี่ยนสถานะกลับเป็น Draft')

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error reverting plan:', error)
        return { success: false, error: 'Failed to revert plan' }
    }
}

export async function getPlanApprovalHistory(planId: string): Promise<{
    success: boolean
    data?: PlanApprovalHistory[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT
                    h.id, h.plan_id, h.action, h.action_by, h.action_at,
                    h.from_status, h.to_status, h.comments,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS action_by_name
                FROM pms.plan_approval_history h
                LEFT JOIN pms.employees e ON h.action_by = e.id
                WHERE h.plan_id = @plan_id
                ORDER BY h.action_at DESC
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching history:', error)
        return { success: false, error: 'Failed to fetch history' }
    }
}

// ============================================
// Milestone Plans
// ============================================

export async function getMilestonePlans(planId: string): Promise<{
    success: boolean
    data?: MilestonePlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT * FROM pms.vw_milestone_plan_detail
                WHERE plan_id = @plan_id
                ORDER BY sort_order, planned_start_date
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching milestones:', error)
        return { success: false, error: 'Failed to fetch milestones' }
    }
}

export async function createMilestonePlan(data: {
    planId: string
    name: string
    description?: string
    plannedStartDate: string
    plannedEndDate: string
    plannedMandays: number
    sortOrder?: number
    dependencyMilestoneId?: string
    color?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, data.planId)
            .input('name', sql.NVarChar, data.name)
            .input('description', sql.NVarChar, data.description || null)
            .input('planned_start_date', sql.Date, data.plannedStartDate)
            .input('planned_end_date', sql.Date, data.plannedEndDate)
            .input('planned_mandays', sql.Int, data.plannedMandays)
            .input('sort_order', sql.Int, data.sortOrder || 0)
            .input('dependency_milestone_id', sql.UniqueIdentifier, data.dependencyMilestoneId || null)
            .input('color', sql.NVarChar, data.color || '#3B82F6')
            .query(`
                INSERT INTO pms.milestone_plans
                    (plan_id, name, description, planned_start_date, planned_end_date,
                     planned_mandays, sort_order, dependency_milestone_id, color)
                OUTPUT INSERTED.id
                VALUES
                    (@plan_id, @name, @description, @planned_start_date, @planned_end_date,
                     @planned_mandays, @sort_order, @dependency_milestone_id, @color)
            `)

        await recalculatePlanTotals(data.planId)
        revalidatePath('/project-planning')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating milestone:', error)
        return { success: false, error: 'Failed to create milestone' }
    }
}

export async function updateMilestonePlan(
    id: string,
    data: {
        name?: string
        description?: string
        plannedStartDate?: string
        plannedEndDate?: string
        plannedMandays?: number
        sortOrder?: number
        dependencyMilestoneId?: string | null
        color?: string
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        const msResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT plan_id FROM pms.milestone_plans WHERE id = @id`)
        const planId = msResult.recordset[0]?.plan_id

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('name', sql.NVarChar, data.name || null)
            .input('description', sql.NVarChar, data.description !== undefined ? data.description : null)
            .input('planned_start_date', sql.Date, data.plannedStartDate || null)
            .input('planned_end_date', sql.Date, data.plannedEndDate || null)
            .input('planned_mandays', sql.Int, data.plannedMandays !== undefined ? data.plannedMandays : null)
            .input('sort_order', sql.Int, data.sortOrder !== undefined ? data.sortOrder : null)
            .input('dependency_milestone_id', sql.UniqueIdentifier, data.dependencyMilestoneId || null)
            .input('color', sql.NVarChar, data.color || null)
            .query(`
                UPDATE pms.milestone_plans SET
                    name = ISNULL(@name, name),
                    description = @description,
                    planned_start_date = ISNULL(@planned_start_date, planned_start_date),
                    planned_end_date = ISNULL(@planned_end_date, planned_end_date),
                    planned_mandays = ISNULL(@planned_mandays, planned_mandays),
                    sort_order = ISNULL(@sort_order, sort_order),
                    dependency_milestone_id = @dependency_milestone_id,
                    color = ISNULL(@color, color),
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        if (planId) await recalculatePlanTotals(planId)
        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating milestone:', error)
        return { success: false, error: 'Failed to update milestone' }
    }
}

export async function deleteMilestonePlan(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const msResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT plan_id FROM pms.milestone_plans WHERE id = @id`)
        const planId = msResult.recordset[0]?.plan_id

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.milestone_plans WHERE id = @id`)

        if (planId) await recalculatePlanTotals(planId)
        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting milestone:', error)
        return { success: false, error: 'Failed to delete milestone' }
    }
}

// ============================================
// Resource Plans
// ============================================

export async function getResourcePlans(planId: string): Promise<{
    success: boolean
    data?: ResourcePlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT * FROM pms.vw_resource_plan_detail
                WHERE plan_id = @plan_id
                ORDER BY position, start_date
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching resources:', error)
        return { success: false, error: 'Failed to fetch resources' }
    }
}

export async function createResourcePlan(data: {
    planId: string
    position: string
    quantity: number
    employeeId?: string
    employeeNamePlaceholder?: string
    allocationPercent: number
    startDate: string
    endDate: string
    milestonePlanId?: string
    notes?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, data.planId)
            .input('position', sql.NVarChar, data.position)
            .input('quantity', sql.Int, data.quantity)
            .input('employee_id', sql.UniqueIdentifier, data.employeeId || null)
            .input('employee_name_placeholder', sql.NVarChar, data.employeeNamePlaceholder || null)
            .input('allocation_percent', sql.Int, data.allocationPercent)
            .input('start_date', sql.Date, data.startDate)
            .input('end_date', sql.Date, data.endDate)
            .input('milestone_plan_id', sql.UniqueIdentifier, data.milestonePlanId || null)
            .input('notes', sql.NVarChar, data.notes || null)
            .query(`
                INSERT INTO pms.resource_plans
                    (plan_id, position, quantity, employee_id, employee_name_placeholder,
                     allocation_percent, start_date, end_date, milestone_plan_id, notes)
                OUTPUT INSERTED.id
                VALUES
                    (@plan_id, @position, @quantity, @employee_id, @employee_name_placeholder,
                     @allocation_percent, @start_date, @end_date, @milestone_plan_id, @notes)
            `)

        revalidatePath('/project-planning')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating resource:', error)
        return { success: false, error: 'Failed to create resource' }
    }
}

export async function updateResourcePlan(
    id: string,
    data: {
        position?: string
        quantity?: number
        employeeId?: string | null
        employeeNamePlaceholder?: string | null
        allocationPercent?: number
        startDate?: string
        endDate?: string
        milestonePlanId?: string | null
        notes?: string | null
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('position', sql.NVarChar, data.position || null)
            .input('quantity', sql.Int, data.quantity !== undefined ? data.quantity : null)
            .input('employee_id', sql.UniqueIdentifier, data.employeeId || null)
            .input('employee_name_placeholder', sql.NVarChar, data.employeeNamePlaceholder || null)
            .input('allocation_percent', sql.Int, data.allocationPercent !== undefined ? data.allocationPercent : null)
            .input('start_date', sql.Date, data.startDate || null)
            .input('end_date', sql.Date, data.endDate || null)
            .input('milestone_plan_id', sql.UniqueIdentifier, data.milestonePlanId || null)
            .input('notes', sql.NVarChar, data.notes !== undefined ? data.notes : null)
            .query(`
                UPDATE pms.resource_plans SET
                    position = ISNULL(@position, position),
                    quantity = ISNULL(@quantity, quantity),
                    employee_id = @employee_id,
                    employee_name_placeholder = @employee_name_placeholder,
                    allocation_percent = ISNULL(@allocation_percent, allocation_percent),
                    start_date = ISNULL(@start_date, start_date),
                    end_date = ISNULL(@end_date, end_date),
                    milestone_plan_id = @milestone_plan_id,
                    notes = @notes,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating resource:', error)
        return { success: false, error: 'Failed to update resource' }
    }
}

export async function deleteResourcePlan(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.resource_plans WHERE id = @id`)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting resource:', error)
        return { success: false, error: 'Failed to delete resource' }
    }
}

// ============================================
// Deliverable Plans
// ============================================

export async function getDeliverablePlans(planId: string): Promise<{
    success: boolean
    data?: DeliverablePlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT
                    dp.*,
                    mp.name AS milestone_name
                FROM pms.deliverable_plans dp
                LEFT JOIN pms.milestone_plans mp ON dp.milestone_plan_id = mp.id
                WHERE dp.plan_id = @plan_id
                ORDER BY dp.due_date, dp.sort_order
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching deliverables:', error)
        return { success: false, error: 'Failed to fetch deliverables' }
    }
}

export async function createDeliverablePlan(data: {
    planId: string
    name: string
    description?: string
    milestonePlanId?: string
    dueDate: string
    deliverableType?: string
    sortOrder?: number
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, data.planId)
            .input('name', sql.NVarChar, data.name)
            .input('description', sql.NVarChar, data.description || null)
            .input('milestone_plan_id', sql.UniqueIdentifier, data.milestonePlanId || null)
            .input('due_date', sql.Date, data.dueDate)
            .input('deliverable_type', sql.NVarChar, data.deliverableType || null)
            .input('sort_order', sql.Int, data.sortOrder || 0)
            .query(`
                INSERT INTO pms.deliverable_plans
                    (plan_id, name, description, milestone_plan_id, due_date, deliverable_type, sort_order)
                OUTPUT INSERTED.id
                VALUES
                    (@plan_id, @name, @description, @milestone_plan_id, @due_date, @deliverable_type, @sort_order)
            `)

        revalidatePath('/project-planning')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating deliverable:', error)
        return { success: false, error: 'Failed to create deliverable' }
    }
}

export async function updateDeliverablePlan(
    id: string,
    data: {
        name?: string
        description?: string | null
        milestonePlanId?: string | null
        dueDate?: string
        deliverableType?: string | null
        status?: string
        actualDate?: string | null
        sortOrder?: number
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('name', sql.NVarChar, data.name || null)
            .input('description', sql.NVarChar, data.description !== undefined ? data.description : null)
            .input('milestone_plan_id', sql.UniqueIdentifier, data.milestonePlanId || null)
            .input('due_date', sql.Date, data.dueDate || null)
            .input('deliverable_type', sql.NVarChar, data.deliverableType !== undefined ? data.deliverableType : null)
            .input('status', sql.NVarChar, data.status || null)
            .input('actual_date', sql.Date, data.actualDate || null)
            .input('sort_order', sql.Int, data.sortOrder !== undefined ? data.sortOrder : null)
            .query(`
                UPDATE pms.deliverable_plans SET
                    name = ISNULL(@name, name),
                    description = @description,
                    milestone_plan_id = @milestone_plan_id,
                    due_date = ISNULL(@due_date, due_date),
                    deliverable_type = @deliverable_type,
                    status = ISNULL(@status, status),
                    actual_date = @actual_date,
                    sort_order = ISNULL(@sort_order, sort_order),
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating deliverable:', error)
        return { success: false, error: 'Failed to update deliverable' }
    }
}

export async function deleteDeliverablePlan(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.deliverable_plans WHERE id = @id`)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting deliverable:', error)
        return { success: false, error: 'Failed to delete deliverable' }
    }
}

// ============================================
// Risk Plans
// ============================================

export async function getRiskPlans(planId: string): Promise<{
    success: boolean
    data?: RiskPlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT
                    rp.*,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS risk_owner_name
                FROM pms.risk_plans rp
                LEFT JOIN pms.employees e ON rp.risk_owner_id = e.id
                WHERE rp.plan_id = @plan_id
                ORDER BY
                    CASE rp.risk_level
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        ELSE 4
                    END,
                    rp.sort_order
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching risks:', error)
        return { success: false, error: 'Failed to fetch risks' }
    }
}

export async function createRiskPlan(data: {
    planId: string
    riskName: string
    description?: string
    impact: string
    probability: string
    mitigationPlan?: string
    contingencyPlan?: string
    riskOwnerId?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, data.planId)
            .input('risk_name', sql.NVarChar, data.riskName)
            .input('description', sql.NVarChar, data.description || null)
            .input('impact', sql.NVarChar, data.impact)
            .input('probability', sql.NVarChar, data.probability)
            .input('mitigation_plan', sql.NVarChar, data.mitigationPlan || null)
            .input('contingency_plan', sql.NVarChar, data.contingencyPlan || null)
            .input('risk_owner_id', sql.UniqueIdentifier, data.riskOwnerId || null)
            .query(`
                INSERT INTO pms.risk_plans
                    (plan_id, risk_name, description, impact, probability,
                     mitigation_plan, contingency_plan, risk_owner_id)
                OUTPUT INSERTED.id
                VALUES
                    (@plan_id, @risk_name, @description, @impact, @probability,
                     @mitigation_plan, @contingency_plan, @risk_owner_id)
            `)

        revalidatePath('/project-planning')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating risk:', error)
        return { success: false, error: 'Failed to create risk' }
    }
}

export async function updateRiskPlan(
    id: string,
    data: {
        riskName?: string
        description?: string | null
        impact?: string
        probability?: string
        mitigationPlan?: string | null
        contingencyPlan?: string | null
        riskOwnerId?: string | null
        status?: string
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('risk_name', sql.NVarChar, data.riskName || null)
            .input('description', sql.NVarChar, data.description !== undefined ? data.description : null)
            .input('impact', sql.NVarChar, data.impact || null)
            .input('probability', sql.NVarChar, data.probability || null)
            .input('mitigation_plan', sql.NVarChar, data.mitigationPlan !== undefined ? data.mitigationPlan : null)
            .input('contingency_plan', sql.NVarChar, data.contingencyPlan !== undefined ? data.contingencyPlan : null)
            .input('risk_owner_id', sql.UniqueIdentifier, data.riskOwnerId || null)
            .input('status', sql.NVarChar, data.status || null)
            .query(`
                UPDATE pms.risk_plans SET
                    risk_name = ISNULL(@risk_name, risk_name),
                    description = @description,
                    impact = ISNULL(@impact, impact),
                    probability = ISNULL(@probability, probability),
                    mitigation_plan = @mitigation_plan,
                    contingency_plan = @contingency_plan,
                    risk_owner_id = @risk_owner_id,
                    status = ISNULL(@status, status),
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating risk:', error)
        return { success: false, error: 'Failed to update risk' }
    }
}

export async function deleteRiskPlan(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.risk_plans WHERE id = @id`)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting risk:', error)
        return { success: false, error: 'Failed to delete risk' }
    }
}

// ============================================
// Assumption Plans
// ============================================

export async function getAssumptionPlans(planId: string): Promise<{
    success: boolean
    data?: AssumptionPlan[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, planId)
            .query(`
                SELECT * FROM pms.assumption_plans
                WHERE plan_id = @plan_id
                ORDER BY type, sort_order
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching assumptions:', error)
        return { success: false, error: 'Failed to fetch assumptions' }
    }
}

export async function createAssumptionPlan(data: {
    planId: string
    type: 'ASSUMPTION' | 'CONSTRAINT'
    description: string
    category?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('plan_id', sql.UniqueIdentifier, data.planId)
            .input('type', sql.NVarChar, data.type)
            .input('description', sql.NVarChar, data.description)
            .input('category', sql.NVarChar, data.category || null)
            .query(`
                INSERT INTO pms.assumption_plans (plan_id, type, description, category)
                OUTPUT INSERTED.id
                VALUES (@plan_id, @type, @description, @category)
            `)

        revalidatePath('/project-planning')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating assumption:', error)
        return { success: false, error: 'Failed to create assumption' }
    }
}

export async function deleteAssumptionPlan(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.assumption_plans WHERE id = @id`)

        revalidatePath('/project-planning')
        return { success: true }
    } catch (error) {
        console.error('Error deleting assumption:', error)
        return { success: false, error: 'Failed to delete assumption' }
    }
}

// ============================================
// Utility Functions
// ============================================

async function recalculatePlanTotals(planId: string) {
    const pool = await getConnection()
    await pool.request()
        .input('plan_id', sql.UniqueIdentifier, planId)
        .query(`
            UPDATE pms.project_plans
            SET total_mandays = ISNULL((
                SELECT SUM(planned_mandays) FROM pms.milestone_plans WHERE plan_id = @plan_id
            ), 0),
            duration_days = DATEDIFF(DAY, planned_start_date, planned_end_date) + 1,
            updated_at = GETDATE()
            WHERE id = @plan_id
        `)
}

// Get projects available for planning (DEV projects)
export async function getProjectsForPlanning(): Promise<{
    success: boolean
    data?: { id: string; project_code: string; name: string; customer_name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT
                    p.id,
                    p.project_code,
                    p.name,
                    c.name AS customer_name
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.customers c ON c.id = p.customer_id
                LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
                WHERE pt.code = 'DEV'
                AND (psc.code IS NULL OR psc.code NOT IN ('CANCELLED', 'COMPLETED'))
                AND p.is_active = 1
                ORDER BY p.project_code DESC
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching projects for planning:', error)
        return { success: false, error: 'Failed to fetch projects' }
    }
}

// Get employees for resource assignment
export async function getEmployeesForPlanning(): Promise<{
    success: boolean
    data?: { id: string; full_name: string; position_name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT
                    e.id,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS full_name,
                    ISNULL(pos.name, '-') AS position_name
                FROM pms.employees e
                LEFT JOIN pms.positions pos ON pos.id = e.position_id
                WHERE e.is_active = 1
                ORDER BY full_name
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching employees:', error)
        return { success: false, error: 'Failed to fetch employees' }
    }
}
