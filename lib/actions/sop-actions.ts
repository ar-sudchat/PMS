'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import type { IssueTypeCode, IssueStatusCode, IssueSeverityCode, PaymentStatusCode } from '@/lib/constants/sop-constants'
import { DEFAULT_YEARLY_TARGET } from '@/lib/constants/sop-constants'

// ============================================
// Types
// ============================================

export interface ProjectIssue {
    id: string
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    milestone_id: string | null
    milestone_name: string | null
    title: string
    description: string | null
    issue_type: IssueTypeCode
    severity: IssueSeverityCode
    status: IssueStatusCode
    reported_by: string
    reported_by_name: string
    reported_date: string
    assigned_to: string | null
    assigned_to_name: string | null
    resolved_date: string | null
    resolution_notes: string | null
    escalated_to: string | null
    escalated_to_name: string | null
    escalation_date: string | null
    target_resolve_date: string | null
    impact_description: string | null
    created_at: string
    updated_at: string | null
    days_open: number
    is_overdue: boolean
}

export interface PaymentMilestone {
    milestone_id: string
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    milestone_name: string
    milestone_due_date: string | null
    milestone_status: string | null
    billing_status: string
    invoice_no: string | null
    invoice_date: string | null
    invoice_amount: number | null
    payment_status: string | null
    payment_due_date: string | null
    payment_received_date: string | null
    payment_amount: number | null
    payment_notes: string | null
    is_overdue: boolean
    days_overdue: number
}

export interface SopDashboardSummary {
    open_issues: number
    escalated_issues: number
    critical_blockers: number
    overdue_issues: number
    upcoming_payments: number
    overdue_payments: number
    total_invoiced: number
    total_received: number
}

export interface SopFilterOptions {
    projects: { id: string; project_code: string; name: string }[]
    customers: { id: string; name: string }[]
    managers: { id: string; full_name: string }[]
    employees: { id: string; full_name: string }[]
}

export interface SopFilters {
    projectId?: string
    customerId?: string
    managerId?: string
    issueType?: IssueTypeCode | 'ALL'
    severity?: IssueSeverityCode | 'ALL'
    status?: IssueStatusCode | 'ALL'
    paymentStatus?: PaymentStatusCode | 'ALL'
    billingStatus?: 'BILLING' | 'COMPLETED' | 'NOT_APPLICABLE' | 'ALL'
    search?: string
    page?: number
    limit?: number
}

export interface CreateIssueInput {
    project_id: string
    milestone_id?: string | null
    title: string
    description?: string
    issue_type: IssueTypeCode
    severity: IssueSeverityCode
    assigned_to?: string | null
    target_resolve_date?: string | null
    impact_description?: string | null
}

export interface UpdateIssueInput {
    title?: string
    description?: string | null
    issue_type?: IssueTypeCode
    severity?: IssueSeverityCode
    status?: IssueStatusCode
    assigned_to?: string | null
    target_resolve_date?: string | null
    impact_description?: string | null
    milestone_id?: string | null
}

export interface UpdatePaymentInput {
    invoice_no?: string | null
    invoice_date?: string | null
    invoice_amount?: number | null
    payment_status?: PaymentStatusCode
    payment_due_date?: string | null
    payment_received_date?: string | null
    payment_amount?: number | null
    payment_notes?: string | null
}

// ============================================
// Filter Options
// ============================================

export async function fetchSopFilterOptions(): Promise<{
    success: boolean
    data?: SopFilterOptions
    error?: string
}> {
    try {
        const pool = await getConnection()

        const [projectsResult, customersResult, managersResult, employeesResult] = await Promise.all([
            pool.request().query(`
                SELECT id, project_code, name
                FROM pms.projects
                WHERE is_active = 1
                ORDER BY project_code
            `),
            pool.request().query(`
                SELECT id, name
                FROM pms.customers
                WHERE is_active = 1
                ORDER BY name
            `),
            pool.request().query(`
                SELECT DISTINCT e.id,
                    COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS full_name
                FROM pms.employees e
                INNER JOIN pms.projects p ON p.project_manager_id = e.id
                WHERE e.is_active = 1
                ORDER BY full_name
            `),
            pool.request().query(`
                SELECT id,
                    COALESCE(first_name_th + ' ' + last_name_th, first_name + ' ' + last_name) AS full_name
                FROM pms.employees
                WHERE is_active = 1
                ORDER BY full_name
            `)
        ])

        return {
            success: true,
            data: {
                projects: projectsResult.recordset,
                customers: customersResult.recordset,
                managers: managersResult.recordset,
                employees: employeesResult.recordset
            }
        }
    } catch (error) {
        console.error('Error fetching SOP filter options:', error)
        return { success: false, error: 'Failed to fetch filter options' }
    }
}

// ============================================
// Dashboard Summary
// ============================================

export async function fetchSopDashboardSummary(filters?: SopFilters): Promise<{
    success: boolean
    data?: SopDashboardSummary
    error?: string
}> {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let issueWhere = 'WHERE 1=1'
        let paymentWhere = 'WHERE p.is_active = 1'

        if (filters?.projectId) {
            issueWhere += ' AND pi.project_id = @projectId'
            paymentWhere += ' AND pm.project_id = @projectId'
            request.input('projectId', filters.projectId)
        }

        if (filters?.customerId) {
            issueWhere += ' AND p.customer_id = @customerId'
            paymentWhere += ' AND p.customer_id = @customerId'
            request.input('customerId', filters.customerId)
        }

        const result = await request.query(`
            -- Issue summary
            SELECT
                SUM(CASE WHEN pi.status IN ('OPEN','IN_PROGRESS') THEN 1 ELSE 0 END) AS open_issues,
                SUM(CASE WHEN pi.status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated_issues,
                SUM(CASE WHEN pi.severity = 'CRITICAL' AND pi.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS critical_blockers,
                SUM(CASE WHEN pi.target_resolve_date < CAST(GETDATE() AS DATE) AND pi.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS overdue_issues
            FROM pms.project_issues pi
            INNER JOIN pms.projects p ON pi.project_id = p.id
            ${issueWhere};

            -- Payment summary (only BILLING projects)
            SELECT
                SUM(CASE WHEN pm.payment_status = 'INVOICED' AND (pm.payment_due_date IS NULL OR pm.payment_due_date >= CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS upcoming_payments,
                SUM(CASE WHEN pm.payment_due_date < CAST(GETDATE() AS DATE) AND ISNULL(pm.payment_status, 'NOT_INVOICED') NOT IN ('PAID') THEN 1 ELSE 0 END) AS overdue_payments,
                ISNULL(SUM(pm.invoice_amount), 0) AS total_invoiced,
                ISNULL(SUM(pm.payment_amount), 0) AS total_received
            FROM pms.project_milestones pm
            INNER JOIN pms.projects p ON pm.project_id = p.id
            ${paymentWhere}
            AND ISNULL(p.billing_status, 'BILLING') = 'BILLING'
            AND (pm.invoice_no IS NOT NULL OR ISNULL(pm.payment_status, 'NOT_INVOICED') != 'NOT_INVOICED');
        `)

        const recordsets = result.recordsets as any[]
        const issueSummary = recordsets[0]?.[0] || {}
        const paymentSummary = recordsets[1]?.[0] || {}

        return {
            success: true,
            data: {
                open_issues: issueSummary.open_issues || 0,
                escalated_issues: issueSummary.escalated_issues || 0,
                critical_blockers: issueSummary.critical_blockers || 0,
                overdue_issues: issueSummary.overdue_issues || 0,
                upcoming_payments: paymentSummary.upcoming_payments || 0,
                overdue_payments: paymentSummary.overdue_payments || 0,
                total_invoiced: paymentSummary.total_invoiced || 0,
                total_received: paymentSummary.total_received || 0,
            }
        }
    } catch (error) {
        console.error('Error fetching SOP dashboard summary:', error)
        return { success: false, error: 'Failed to fetch dashboard summary' }
    }
}

// ============================================
// Project Issues CRUD
// ============================================

export async function fetchProjectIssues(filters?: SopFilters): Promise<{
    success: boolean
    data?: ProjectIssue[]
    total?: number
    page?: number
    limit?: number
    error?: string
}> {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = 'WHERE 1=1'

        if (filters?.projectId) {
            whereClause += ' AND pi.project_id = @projectId'
            request.input('projectId', filters.projectId)
        }
        if (filters?.customerId) {
            whereClause += ' AND p.customer_id = @customerId'
            request.input('customerId', filters.customerId)
        }
        if (filters?.managerId) {
            whereClause += ' AND p.project_manager_id = @managerId'
            request.input('managerId', filters.managerId)
        }
        if (filters?.issueType && filters.issueType !== 'ALL') {
            whereClause += ' AND pi.issue_type = @issueType'
            request.input('issueType', filters.issueType)
        }
        if (filters?.severity && filters.severity !== 'ALL') {
            whereClause += ' AND pi.severity = @severity'
            request.input('severity', filters.severity)
        }
        if (filters?.status && filters.status !== 'ALL') {
            whereClause += ' AND pi.status = @status'
            request.input('status', filters.status)
        }
        if (filters?.search) {
            whereClause += ' AND (pi.title LIKE @search OR p.project_code LIKE @search OR p.name LIKE @search)'
            request.input('search', `%${filters.search}%`)
        }

        // Count
        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM pms.project_issues pi
            INNER JOIN pms.projects p ON pi.project_id = p.id
            ${whereClause}
        `)
        const total = countResult.recordset[0].total

        // Pagination
        const page = filters?.page || 1
        const limit = filters?.limit || 20
        const offset = (page - 1) * limit
        request.input('offset', offset)
        request.input('limit', limit)

        const result = await request.query(`
            SELECT
                pi.id,
                pi.project_id,
                p.project_code,
                p.name AS project_name,
                c.name AS customer_name,
                pi.milestone_id,
                mc.name AS milestone_name,
                pi.title,
                pi.description,
                pi.issue_type,
                pi.severity,
                pi.status,
                pi.reported_by,
                COALESCE(rb.first_name_th + ' ' + rb.last_name_th, rb.first_name + ' ' + rb.last_name) AS reported_by_name,
                pi.reported_date,
                pi.assigned_to,
                COALESCE(at.first_name_th + ' ' + at.last_name_th, at.first_name + ' ' + at.last_name) AS assigned_to_name,
                pi.resolved_date,
                pi.resolution_notes,
                pi.escalated_to,
                COALESCE(et.first_name_th + ' ' + et.last_name_th, et.first_name + ' ' + et.last_name) AS escalated_to_name,
                pi.escalation_date,
                pi.target_resolve_date,
                pi.impact_description,
                pi.created_at,
                pi.updated_at,
                DATEDIFF(day, pi.reported_date, ISNULL(pi.resolved_date, GETDATE())) AS days_open,
                CASE WHEN pi.target_resolve_date < CAST(GETDATE() AS DATE) AND pi.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END AS is_overdue
            FROM pms.project_issues pi
            INNER JOIN pms.projects p ON pi.project_id = p.id
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.project_milestones pm ON pi.milestone_id = pm.id
            LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            LEFT JOIN pms.employees rb ON pi.reported_by = rb.id
            LEFT JOIN pms.employees at ON pi.assigned_to = at.id
            LEFT JOIN pms.employees et ON pi.escalated_to = et.id
            ${whereClause}
            ORDER BY
                CASE pi.severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                CASE pi.status
                    WHEN 'ESCALATED' THEN 1
                    WHEN 'OPEN' THEN 2
                    WHEN 'IN_PROGRESS' THEN 3
                    WHEN 'RESOLVED' THEN 4
                    WHEN 'CLOSED' THEN 5
                END,
                pi.reported_date DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `)

        return {
            success: true,
            data: result.recordset.map(r => ({ ...r, is_overdue: !!r.is_overdue })),
            total,
            page,
            limit
        }
    } catch (error) {
        console.error('Error fetching project issues:', error)
        return { success: false, error: 'Failed to fetch issues' }
    }
}

export async function createProjectIssue(data: CreateIssueInput): Promise<{
    success: boolean
    data?: ProjectIssue
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const request = pool.request()
            .input('project_id', data.project_id)
            .input('title', data.title)
            .input('description', data.description || null)
            .input('issue_type', data.issue_type)
            .input('severity', data.severity)
            .input('reported_by', user.id)
            .input('assigned_to', data.assigned_to || null)
            .input('target_resolve_date', data.target_resolve_date || null)
            .input('impact_description', data.impact_description || null)
            .input('milestone_id', data.milestone_id || null)

        const result = await request.query(`
            INSERT INTO pms.project_issues (
                project_id, milestone_id, title, description,
                issue_type, severity, reported_by, assigned_to,
                target_resolve_date, impact_description
            )
            OUTPUT INSERTED.*
            VALUES (
                @project_id, @milestone_id, @title, @description,
                @issue_type, @severity, @reported_by, @assigned_to,
                @target_resolve_date, @impact_description
            )
        `)

        revalidatePath('/s-and-op')
        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error creating project issue:', error)
        return { success: false, error: 'Failed to create issue' }
    }
}

export async function updateProjectIssue(issueId: string, data: UpdateIssueInput): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const request = pool.request()
        request.input('issueId', issueId)

        const setClauses: string[] = ['updated_at = GETDATE()']

        if (data.title !== undefined) {
            setClauses.push('title = @title')
            request.input('title', data.title)
        }
        if (data.description !== undefined) {
            setClauses.push('description = @description')
            request.input('description', data.description)
        }
        if (data.issue_type !== undefined) {
            setClauses.push('issue_type = @issue_type')
            request.input('issue_type', data.issue_type)
        }
        if (data.severity !== undefined) {
            setClauses.push('severity = @severity')
            request.input('severity', data.severity)
        }
        if (data.status !== undefined) {
            setClauses.push('status = @status')
            request.input('status', data.status)
        }
        if (data.assigned_to !== undefined) {
            setClauses.push('assigned_to = @assigned_to')
            request.input('assigned_to', data.assigned_to)
        }
        if (data.target_resolve_date !== undefined) {
            setClauses.push('target_resolve_date = @target_resolve_date')
            request.input('target_resolve_date', data.target_resolve_date)
        }
        if (data.impact_description !== undefined) {
            setClauses.push('impact_description = @impact_description')
            request.input('impact_description', data.impact_description)
        }
        if (data.milestone_id !== undefined) {
            setClauses.push('milestone_id = @milestone_id')
            request.input('milestone_id', data.milestone_id)
        }

        await request.query(`
            UPDATE pms.project_issues
            SET ${setClauses.join(', ')}
            WHERE id = @issueId
        `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error updating project issue:', error)
        return { success: false, error: 'Failed to update issue' }
    }
}

export async function escalateIssue(issueId: string, escalatedTo: string, notes?: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('issueId', issueId)
            .input('escalatedTo', escalatedTo)
            .input('notes', notes || null)
            .query(`
                UPDATE pms.project_issues
                SET status = 'ESCALATED',
                    escalated_to = @escalatedTo,
                    escalation_date = GETDATE(),
                    impact_description = CASE WHEN @notes IS NOT NULL THEN @notes ELSE impact_description END,
                    updated_at = GETDATE()
                WHERE id = @issueId
            `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error escalating issue:', error)
        return { success: false, error: 'Failed to escalate issue' }
    }
}

export async function resolveIssue(issueId: string, resolutionNotes: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('issueId', issueId)
            .input('notes', resolutionNotes)
            .query(`
                UPDATE pms.project_issues
                SET status = 'RESOLVED',
                    resolved_date = GETDATE(),
                    resolution_notes = @notes,
                    updated_at = GETDATE()
                WHERE id = @issueId
            `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error resolving issue:', error)
        return { success: false, error: 'Failed to resolve issue' }
    }
}

export async function closeIssue(issueId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('issueId', issueId)
            .query(`
                UPDATE pms.project_issues
                SET status = 'CLOSED',
                    updated_at = GETDATE()
                WHERE id = @issueId
            `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error closing issue:', error)
        return { success: false, error: 'Failed to close issue' }
    }
}

// ============================================
// Payment Pipeline
// ============================================

export async function fetchPaymentPipeline(filters?: SopFilters): Promise<{
    success: boolean
    data?: PaymentMilestone[]
    total?: number
    error?: string
}> {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = 'WHERE p.is_active = 1'

        // Default: only show projects with billing_status = BILLING (or NULL for backward compat)
        if (filters?.billingStatus && filters.billingStatus !== 'ALL') {
            whereClause += ' AND ISNULL(p.billing_status, \'BILLING\') = @billingStatus'
            request.input('billingStatus', filters.billingStatus)
        } else {
            whereClause += ' AND ISNULL(p.billing_status, \'BILLING\') = \'BILLING\''
        }

        if (filters?.projectId) {
            whereClause += ' AND pm.project_id = @projectId'
            request.input('projectId', filters.projectId)
        }
        if (filters?.customerId) {
            whereClause += ' AND p.customer_id = @customerId'
            request.input('customerId', filters.customerId)
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
            whereClause += ' AND ISNULL(pm.payment_status, \'NOT_INVOICED\') = @paymentStatus'
            request.input('paymentStatus', filters.paymentStatus)
        }
        if (filters?.search) {
            whereClause += ' AND (p.project_code LIKE @search OR p.name LIKE @search OR pm.invoice_no LIKE @search OR mc.name LIKE @search)'
            request.input('search', `%${filters.search}%`)
        }

        const result = await request.query(`
            SELECT
                pm.id AS milestone_id,
                pm.project_id,
                p.project_code,
                p.name AS project_name,
                c.name AS customer_name,
                mc.name AS milestone_name,
                pm.due_date AS milestone_due_date,
                pm.status AS milestone_status,
                ISNULL(p.billing_status, 'BILLING') AS billing_status,
                pm.invoice_no,
                pm.invoice_date,
                pm.invoice_amount,
                ISNULL(pm.payment_status, 'NOT_INVOICED') AS payment_status,
                pm.payment_due_date,
                pm.payment_received_date,
                pm.payment_amount,
                pm.payment_notes,
                CASE
                    WHEN pm.payment_status = 'PAID' THEN 0
                    WHEN pm.payment_due_date < CAST(GETDATE() AS DATE)
                         AND ISNULL(pm.payment_status, 'NOT_INVOICED') NOT IN ('PAID') THEN 1
                    ELSE 0
                END AS is_overdue,
                CASE
                    WHEN pm.payment_due_date IS NOT NULL THEN DATEDIFF(day, pm.payment_due_date, GETDATE())
                    ELSE 0
                END AS days_overdue
            FROM pms.project_milestones pm
            INNER JOIN pms.projects p ON pm.project_id = p.id
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            ${whereClause}
            ORDER BY
                p.project_code,
                pm.sort_order,
                CASE ISNULL(pm.payment_status, 'NOT_INVOICED')
                    WHEN 'OVERDUE' THEN 1
                    WHEN 'INVOICED' THEN 2
                    WHEN 'PARTIAL_PAID' THEN 3
                    WHEN 'NOT_INVOICED' THEN 4
                    WHEN 'PAID' THEN 5
                END,
                pm.payment_due_date ASC
        `)

        return {
            success: true,
            data: result.recordset.map(r => ({ ...r, is_overdue: !!r.is_overdue })),
            total: result.recordset.length
        }
    } catch (error) {
        console.error('Error fetching payment pipeline:', error)
        return { success: false, error: 'Failed to fetch payment pipeline' }
    }
}

export async function updateMilestonePayment(milestoneId: string, data: UpdatePaymentInput): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const request = pool.request()
        request.input('milestoneId', milestoneId)

        const setClauses: string[] = ['updated_at = GETDATE()']

        if (data.invoice_no !== undefined) {
            setClauses.push('invoice_no = @invoice_no')
            request.input('invoice_no', data.invoice_no)
        }
        if (data.invoice_date !== undefined) {
            setClauses.push('invoice_date = @invoice_date')
            request.input('invoice_date', data.invoice_date)
        }
        if (data.invoice_amount !== undefined) {
            setClauses.push('invoice_amount = @invoice_amount')
            request.input('invoice_amount', data.invoice_amount)
        }
        if (data.payment_status !== undefined) {
            setClauses.push('payment_status = @payment_status')
            request.input('payment_status', data.payment_status)
        }
        if (data.payment_due_date !== undefined) {
            setClauses.push('payment_due_date = @payment_due_date')
            request.input('payment_due_date', data.payment_due_date)
        }
        if (data.payment_received_date !== undefined) {
            setClauses.push('payment_received_date = @payment_received_date')
            request.input('payment_received_date', data.payment_received_date)
        }
        if (data.payment_amount !== undefined) {
            setClauses.push('payment_amount = @payment_amount')
            request.input('payment_amount', data.payment_amount)
        }
        if (data.payment_notes !== undefined) {
            setClauses.push('payment_notes = @payment_notes')
            request.input('payment_notes', data.payment_notes)
        }

        await request.query(`
            UPDATE pms.project_milestones
            SET ${setClauses.join(', ')}
            WHERE id = @milestoneId
        `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error updating milestone payment:', error)
        return { success: false, error: 'Failed to update payment' }
    }
}

// ============================================
// Fetch milestones for project (for issue form dropdown)
// ============================================

export async function fetchMilestonesForProject(projectId: string): Promise<{
    success: boolean
    data?: { id: string; name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT pm.id, mc.name AS name
                FROM pms.project_milestones pm
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id = @projectId
                ORDER BY pm.sort_order, pm.due_date
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching milestones for project:', error)
        return { success: false, error: 'Failed to fetch milestones' }
    }
}

// ============================================
// Project Billing Status
// ============================================

export async function updateProjectBillingStatus(
    projectId: string,
    billingStatus: 'BILLING' | 'COMPLETED' | 'NOT_APPLICABLE'
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('projectId', projectId)
            .input('billingStatus', billingStatus)
            .query(`
                UPDATE pms.projects
                SET billing_status = @billingStatus,
                    updated_at = GETDATE()
                WHERE id = @projectId
            `)

        revalidatePath('/s-and-op')
        return { success: true }
    } catch (error) {
        console.error('Error updating project billing status:', error)
        return { success: false, error: 'Failed to update billing status' }
    }
}

// ============================================
// Sales x Cash In Plan
// ============================================

export interface SalesCashInMilestone {
    milestone_id: string
    milestone_name: string
    milestone_code: string
    milestone_color: string
    sales_month: number | null
    cashin_month: number | null
    invoice_actual_month: number | null
    cashin_forecast_month: number | null
    cashin_actual_month: number | null
    invoice_amount: number | null
    payment_amount: number | null
    payment_status: string | null
    invoice_no: string | null
    invoice_date: string | null
    payment_due_date: string | null
    payment_received_date: string | null
    payment_notes: string | null
    milestone_due_date: string | null
    milestone_status: string | null
}

export interface SalesCashInProject {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    customer_short_name: string | null
    project_type_name: string | null
    project_group_name: string | null
    project_group_parent_name: string | null
    billing_status: string
    total_contract_value: number
    milestones: SalesCashInMilestone[]
    issue_count: number
    remark: string | null
}

export interface SalesCashInPlanData {
    year: number
    target_amount: number
    projects: SalesCashInProject[]
    monthly_totals: {
        month: number
        total_sales: number
        total_cashin: number
        invoice_forecast: number
        invoice_actual: number
        cashin_forecast: number
        cashin_actual: number
    }[]
    grand_total_sales: number
    grand_total_cashin: number
    grand_invoice_forecast: number
    grand_invoice_actual: number
    grand_cashin_forecast: number
    grand_cashin_actual: number
}

export async function fetchSalesCashInPlan(
    year: number,
    filters?: SopFilters
): Promise<{
    success: boolean
    data?: SalesCashInPlanData
    error?: string
}> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('year', sql.Int, year)

        // Check which optional columns/tables exist (added by migration scripts)
        const schemaCheck = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms'
            AND (
                (TABLE_NAME = 'projects' AND COLUMN_NAME IN ('billing_status','project_group_id','chance_id','name'))
                OR (TABLE_NAME = 'project_milestones' AND COLUMN_NAME IN ('name','invoice_date','invoice_amount','payment_amount','payment_status','invoice_no','payment_due_date','payment_received_date','payment_notes'))
                OR (TABLE_NAME = 'project_types' AND COLUMN_NAME = 'name')
                OR (TABLE_NAME = 'milestone_configs' AND COLUMN_NAME IN ('name','code','color'))
                OR (TABLE_NAME = 'customers' AND COLUMN_NAME = 'name')
            )
            UNION ALL
            SELECT TABLE_NAME, 'EXISTS' AS COLUMN_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME IN ('project_issues','project_groups','project_types','milestone_configs')
        `)
        const colMap = new Map<string, Set<string>>()
        for (const r of schemaCheck.recordset) {
            if (!colMap.has(r.TABLE_NAME)) colMap.set(r.TABLE_NAME, new Set())
            colMap.get(r.TABLE_NAME)!.add(r.COLUMN_NAME)
        }
        const hasCol = (table: string, col: string) => colMap.get(table)?.has(col) ?? false
        const hasTable = (table: string) => colMap.get(table)?.has('EXISTS') ?? false

        const hasBillingStatus = hasCol('projects', 'billing_status')
        const hasGroups = hasCol('projects', 'project_group_id') && hasTable('project_groups')
        const hasChance = hasCol('projects', 'chance_id')
        const hasProjectName = hasCol('projects', 'name')
        const hasCustomerName = hasCol('customers', 'name')
        const hasPtName = hasTable('project_types') && hasCol('project_types', 'name')
        const hasMcName = hasTable('milestone_configs') && hasCol('milestone_configs', 'name')
        const hasMcCode = hasTable('milestone_configs') && hasCol('milestone_configs', 'code')
        const hasMcColor = hasTable('milestone_configs') && hasCol('milestone_configs', 'color')
        const hasPmName = hasCol('project_milestones', 'name')
        const hasPmPayment = hasCol('project_milestones', 'invoice_amount')
        const hasIssues = hasTable('project_issues')

        let whereClause = `WHERE p.is_active = 1`

        // Exclude projects without a group
        if (hasGroups) {
            whereClause += ` AND p.project_group_id IS NOT NULL`
        }

        // Show all billing statuses by default for sales-cashin view
        if (hasBillingStatus && filters?.billingStatus && filters.billingStatus !== 'ALL') {
            whereClause += ` AND ISNULL(p.billing_status, 'BILLING') = @billingStatus`
            request.input('billingStatus', filters.billingStatus)
        }

        if (filters?.projectId) {
            whereClause += ' AND p.id = @projectId'
            request.input('projectId', filters.projectId)
        }
        if (filters?.customerId) {
            whereClause += ' AND p.customer_id = @customerId'
            request.input('customerId', filters.customerId)
        }
        if (filters?.search) {
            const searchCols = ['p.project_code']
            if (hasProjectName) searchCols.push('p.name')
            if (hasCustomerName) searchCols.push('c.name')
            whereClause += ` AND (${searchCols.map(c => `${c} LIKE @search`).join(' OR ')})`
            request.input('search', `%${filters.search}%`)
        }

        // Build conditional SELECT parts
        const projectNameSelect = hasProjectName ? `p.name AS project_name,` : `p.project_code AS project_name,`
        const customerNameSelect = hasCustomerName ? `c.name AS customer_name, c.short_name AS customer_short_name,` : `NULL AS customer_name, NULL AS customer_short_name,`
        const typeNameSelect = hasPtName ? `pt.name AS project_type_name,` : `NULL AS project_type_name,`
        const billingSelect = hasBillingStatus
            ? `ISNULL(p.billing_status, 'BILLING') AS billing_status,`
            : `'BILLING' AS billing_status,`
        const groupSelect = hasGroups
            ? `pg.name AS project_group_name, pgp.name AS project_group_parent_name,`
            : `NULL AS project_group_name, NULL AS project_group_parent_name,`

        // Milestone name: try mc.name -> pm.name -> 'Milestone'
        const milestoneNameSelect = hasMcName && hasPmName
            ? `ISNULL(mc.name, pm.name) AS milestone_name,`
            : hasMcName ? `mc.name AS milestone_name,`
            : hasPmName ? `pm.name AS milestone_name,`
            : `'Milestone' AS milestone_name,`
        const milestoneCodeSelect = hasMcCode ? `ISNULL(mc.code, 'UNKNOWN') AS milestone_code,` : `'UNKNOWN' AS milestone_code,`
        const milestoneColorSelect = hasMcColor ? `ISNULL(mc.color, '#94A3B8') AS milestone_color,` : `'#94A3B8' AS milestone_color,`

        // Payment columns on milestones (added by script 53)
        const paymentSelect = hasPmPayment ? `
                pm.invoice_date,
                pm.invoice_amount,
                pm.payment_amount,
                ISNULL(pm.payment_status, 'NOT_INVOICED') AS payment_status,
                pm.invoice_no,
                pm.payment_due_date,
                pm.payment_received_date,
                pm.payment_notes,` : `
                NULL AS invoice_date,
                NULL AS invoice_amount,
                NULL AS payment_amount,
                'NOT_INVOICED' AS payment_status,
                NULL AS invoice_no,
                NULL AS payment_due_date,
                NULL AS payment_received_date,
                NULL AS payment_notes,`

        // JOINs
        const groupJoin = hasGroups
            ? `LEFT JOIN pms.project_groups pg ON p.project_group_id = pg.id
               LEFT JOIN pms.project_groups pgp ON pg.parent_id = pgp.id`
            : ''
        const mcJoin = hasMcName || hasMcCode || hasMcColor
            ? `LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id`
            : ''
        const ptJoin = hasPtName || hasChance
            ? `LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id`
            : ''
        const customerJoin = hasCustomerName
            ? `LEFT JOIN pms.customers c ON p.customer_id = c.id`
            : ''
        const chanceJoin = hasChance ? `LEFT JOIN pms.chance_configs ch ON p.chance_id = ch.id` : ''
        const chanceFilter = hasChance
            ? `AND (pt.code IS NULL OR pt.code <> 'MKT' OR ISNULL(ch.percentage, 0) >= 50)`
            : hasPtName ? `AND (pt.code IS NULL OR pt.code <> 'MKT')` : ''
        const issueSelect = hasIssues
            ? `(SELECT COUNT(*) FROM pms.project_issues pi
                WHERE pi.project_id = p.id
                AND pi.status IN ('OPEN','IN_PROGRESS','ESCALATED')) AS issue_count`
            : `0 AS issue_count`

        // Fetch all active projects with all their milestones
        const result = await request.query(`
            SELECT
                p.id AS project_id,
                p.project_code,
                ${projectNameSelect}
                ${customerNameSelect}
                ${typeNameSelect}
                ${groupSelect}
                ${billingSelect}
                ISNULL(p.sold_mandays, 0) * ISNULL(p.manday_rate, 0) AS total_contract_value,

                pm.id AS milestone_id,
                ${milestoneCodeSelect}
                ${milestoneNameSelect}
                ${milestoneColorSelect}
                pm.due_date,
                ${paymentSelect}
                pm.status AS milestone_status,
                pm.sort_order,
                ${issueSelect}
            FROM pms.projects p
            LEFT JOIN pms.project_milestones pm ON pm.project_id = p.id
            ${mcJoin}
            ${ptJoin}
            ${groupJoin}
            ${customerJoin}
            ${chanceJoin}
            ${whereClause}
            ${chanceFilter}
            ORDER BY p.project_code, pm.sort_order
        `)

        // Group by project
        const projectMap = new Map<string, SalesCashInProject>()
        for (const row of result.recordset) {
            if (!projectMap.has(row.project_id)) {
                projectMap.set(row.project_id, {
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    customer_name: row.customer_name,
                    customer_short_name: row.customer_short_name,
                    project_type_name: row.project_type_name,
                    project_group_name: row.project_group_name,
                    project_group_parent_name: row.project_group_parent_name,
                    billing_status: row.billing_status,
                    total_contract_value: row.total_contract_value || 0,
                    milestones: [],
                    issue_count: row.issue_count || 0,
                    remark: null,
                })
            }

            const project = projectMap.get(row.project_id)!

            // Skip if no milestone (LEFT JOIN may produce NULL milestone)
            if (!row.milestone_id) continue

            // Determine sales month from due_date (only if in selected year)
            let salesMonth: number | null = null
            if (row.due_date) {
                const d = new Date(row.due_date)
                if (d.getFullYear() === year) salesMonth = d.getMonth() + 1
            }
            // Determine cashin month from payment_received_date, fallback to payment_due_date (only if in selected year)
            let cashinMonth: number | null = null
            if (row.payment_received_date) {
                const d = new Date(row.payment_received_date)
                if (d.getFullYear() === year) cashinMonth = d.getMonth() + 1
            } else if (row.payment_due_date) {
                const d = new Date(row.payment_due_date)
                if (d.getFullYear() === year) cashinMonth = d.getMonth() + 1
            }

            // Invoice actual month from invoice_date
            let invoiceActualMonth: number | null = null
            if (row.invoice_date) {
                const d = new Date(row.invoice_date)
                if (d.getFullYear() === year) invoiceActualMonth = d.getMonth() + 1
            }

            // Cash in forecast month from payment_due_date
            let cashinForecastMonth: number | null = null
            if (row.payment_due_date) {
                const d = new Date(row.payment_due_date)
                if (d.getFullYear() === year) cashinForecastMonth = d.getMonth() + 1
            }

            // Cash in actual month from payment_received_date
            let cashinActualMonth: number | null = null
            if (row.payment_received_date) {
                const d = new Date(row.payment_received_date)
                if (d.getFullYear() === year) cashinActualMonth = d.getMonth() + 1
            }

            project.milestones.push({
                milestone_id: row.milestone_id,
                milestone_name: row.milestone_name,
                milestone_code: row.milestone_code,
                milestone_color: row.milestone_color,
                sales_month: salesMonth,
                cashin_month: cashinMonth,
                invoice_actual_month: invoiceActualMonth,
                cashin_forecast_month: cashinForecastMonth,
                cashin_actual_month: cashinActualMonth,
                invoice_amount: row.invoice_amount,
                payment_amount: row.payment_amount,
                payment_status: row.payment_status,
                invoice_no: row.invoice_no,
                invoice_date: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
                payment_due_date: row.payment_due_date ? new Date(row.payment_due_date).toISOString().split('T')[0] : null,
                payment_received_date: row.payment_received_date ? new Date(row.payment_received_date).toISOString().split('T')[0] : null,
                payment_notes: row.payment_notes,
                milestone_due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
                milestone_status: row.milestone_status,
            })
        }

        const projects = Array.from(projectMap.values())
        console.log('[Forecast Debug] SQL rows:', result.recordset.length, '| projects:', projects.length)

        // Compute monthly totals
        const monthlyTotals: {
            month: number; total_sales: number; total_cashin: number
            invoice_forecast: number; invoice_actual: number
            cashin_forecast: number; cashin_actual: number
        }[] = []
        let grandTotalSales = 0, grandTotalCashin = 0
        let grandInvoiceForecast = 0, grandInvoiceActual = 0
        let grandCashinForecast = 0, grandCashinActual = 0

        for (let m = 1; m <= 12; m++) {
            let totalSales = 0, totalCashin = 0
            let invoiceForecast = 0, invoiceActual = 0
            let cashinForecast = 0, cashinActual = 0
            for (const proj of projects) {
                for (const ms of proj.milestones) {
                    if (ms.sales_month === m) {
                        totalSales += ms.invoice_amount || 0
                        invoiceForecast += ms.invoice_amount || 0
                    }
                    if (ms.cashin_month === m) totalCashin += ms.payment_amount || 0
                    if (ms.invoice_actual_month === m) invoiceActual += ms.invoice_amount || 0
                    if (ms.cashin_forecast_month === m) cashinForecast += ms.invoice_amount || 0
                    if (ms.cashin_actual_month === m) cashinActual += ms.payment_amount || 0
                }
            }
            monthlyTotals.push({
                month: m, total_sales: totalSales, total_cashin: totalCashin,
                invoice_forecast: invoiceForecast, invoice_actual: invoiceActual,
                cashin_forecast: cashinForecast, cashin_actual: cashinActual,
            })
            grandTotalSales += totalSales
            grandTotalCashin += totalCashin
            grandInvoiceForecast += invoiceForecast
            grandInvoiceActual += invoiceActual
            grandCashinForecast += cashinForecast
            grandCashinActual += cashinActual
        }

        return {
            success: true,
            data: {
                year,
                target_amount: DEFAULT_YEARLY_TARGET,
                projects,
                monthly_totals: monthlyTotals,
                grand_total_sales: grandTotalSales,
                grand_total_cashin: grandTotalCashin,
                grand_invoice_forecast: grandInvoiceForecast,
                grand_invoice_actual: grandInvoiceActual,
                grand_cashin_forecast: grandCashinForecast,
                grand_cashin_actual: grandCashinActual,
            }
        }
    } catch (error: any) {
        console.error('[Forecast Debug] ERROR:', error?.message || error)
        return { success: false, error: error?.message || 'Failed to fetch sales cash in plan' }
    }
}
