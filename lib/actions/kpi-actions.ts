'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface KPISummary {
    kpi_code: string
    kpi_name: string
    total_projects: number
    passed_projects: number
    failed_projects: number
    avg_score: number
    target: number
    overall_status: 'PASS' | 'FAIL'
}

export interface ProjectKPI {
    project_id: string
    project_code: string
    project_name: string
    project_year: number
    customer_id: string | null
    project_manager_id: string | null
    total_milestones: number
    kpi_score: number
    kpi_target: number
    kpi_status: 'PASS' | 'FAIL'
}

export interface TimeToDeliveryKPI extends ProjectKPI {
    on_time_milestones: number
    late_milestones: number
    total_weight: number
}

export interface MandayControlKPI extends ProjectKPI {
    within_budget_milestones: number
    over_budget_milestones: number
    total_planned_mandays: number
    total_actual_mandays: number
    total_variance: number
    total_weight: number
}

export interface MilestoneKPIDetail {
    project_id: string
    project_code: string
    project_name: string
    project_year: number
    milestone_id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string | null
    kpi_category: string | null
    weight_percent: number
    progress_percent: number
    status: string
    sort_order: number
    // Time to Delivery
    due_date: string | null
    completed_date: string | null
    days_variance: number
    time_status: 'on_time' | 'late' | 'on_track' | 'overdue' | 'no_date'
    // Man-day Control
    planned_mandays: number
    actual_mandays: number
    manday_variance: number
    manday_variance_percent: number
    budget_status: 'within_budget' | 'over_budget' | 'no_budget'
}

export interface KPIYearlySummary {
    project_year: number
    kpi_code: string
    total_projects: number
    passed_projects: number
    avg_score: number
    target: number
}

export interface KPIFilters {
    year?: number
    customerId?: string
    managerId?: string
}

// ============================================
// GET KPI DASHBOARD SUMMARY (Both KPIs)
// ============================================

export async function getKPIDashboardSummary(): Promise<{ success: boolean; data: KPISummary[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, data: [], error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const result = await pool.request()
            .query('SELECT * FROM pms.vw_kpi_dashboard_summary')

        return {
            success: true,
            data: result.recordset as KPISummary[]
        }
    } catch (error) {
        console.error('Error fetching KPI summary:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Failed to fetch KPI summary'
        }
    }
}

// ============================================
// GET TIME TO DELIVERY KPI
// ============================================

export async function getTimeToDeliveryKPI(filters?: KPIFilters): Promise<{ success: boolean; data: TimeToDeliveryKPI[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, data: [], error: 'Unauthorized' }
        }

        const pool = await getConnection()
        let query = 'SELECT * FROM pms.vw_kpi_time_to_delivery WHERE 1=1'
        const request = pool.request()

        if (filters?.year) {
            query += ' AND project_year = @year'
            request.input('year', sql.Int, filters.year)
        }
        if (filters?.customerId) {
            query += ' AND customer_id = @customerId'
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }
        if (filters?.managerId) {
            query += ' AND project_manager_id = @managerId'
            request.input('managerId', sql.UniqueIdentifier, filters.managerId)
        }

        query += ' ORDER BY project_code'
        const result = await request.query(query)

        return {
            success: true,
            data: result.recordset as TimeToDeliveryKPI[]
        }
    } catch (error) {
        console.error('Error fetching Time to Delivery KPI:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Failed to fetch Time to Delivery KPI'
        }
    }
}

// ============================================
// GET MAN-DAY CONTROL KPI
// ============================================

export async function getMandayControlKPI(filters?: KPIFilters): Promise<{ success: boolean; data: MandayControlKPI[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, data: [], error: 'Unauthorized' }
        }

        const pool = await getConnection()
        let query = 'SELECT * FROM pms.vw_kpi_manday_control WHERE 1=1'
        const request = pool.request()

        if (filters?.year) {
            query += ' AND project_year = @year'
            request.input('year', sql.Int, filters.year)
        }
        if (filters?.customerId) {
            query += ' AND customer_id = @customerId'
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }
        if (filters?.managerId) {
            query += ' AND project_manager_id = @managerId'
            request.input('managerId', sql.UniqueIdentifier, filters.managerId)
        }

        query += ' ORDER BY project_code'
        const result = await request.query(query)

        return {
            success: true,
            data: result.recordset as MandayControlKPI[]
        }
    } catch (error) {
        console.error('Error fetching Man-day Control KPI:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Failed to fetch Man-day Control KPI'
        }
    }
}

// ============================================
// GET PROJECT KPI DETAIL (Milestones breakdown)
// ============================================

export async function getProjectKPIDetail(projectId: string): Promise<{ success: boolean; data: MilestoneKPIDetail[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, data: [], error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT * FROM pms.vw_kpi_milestone_detail
                WHERE project_id = @projectId
                ORDER BY sort_order, due_date, milestone_code
            `)

        return {
            success: true,
            data: result.recordset as MilestoneKPIDetail[]
        }
    } catch (error) {
        console.error('Error fetching project KPI detail:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Failed to fetch project KPI detail'
        }
    }
}

// ============================================
// GET KPI YEARLY SUMMARY
// ============================================

export async function getKPIYearlySummary(): Promise<{ success: boolean; data: KPIYearlySummary[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, data: [], error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const result = await pool.request()
            .query('SELECT * FROM pms.vw_kpi_yearly_summary ORDER BY project_year DESC, kpi_code')

        return {
            success: true,
            data: result.recordset as KPIYearlySummary[]
        }
    } catch (error) {
        console.error('Error fetching KPI yearly summary:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Failed to fetch KPI yearly summary'
        }
    }
}

// ============================================
// UPDATE MILESTONE PROGRESS
// ============================================

export async function updateMilestoneProgress(
    milestoneId: string,
    progress: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        if (progress < 0 || progress > 100) {
            return { success: false, error: 'Progress must be between 0 and 100' }
        }

        const pool = await getConnection()

        // Update milestone progress
        await pool.request()
            .input('id', sql.UniqueIdentifier, milestoneId)
            .input('progress', sql.Decimal(5, 2), progress)
            .query(`
                UPDATE pms.project_milestones
                SET progress_percent = @progress,
                    updated_at = GETDATE(),
                    -- Auto-update status based on progress
                    status = CASE
                        WHEN @progress = 100 THEN 'completed'
                        WHEN @progress > 0 THEN 'in_progress'
                        ELSE status
                    END,
                    -- Set completed_date when reaching 100%
                    completed_date = CASE
                        WHEN @progress = 100 AND completed_date IS NULL THEN CAST(GETDATE() AS DATE)
                        WHEN @progress < 100 THEN NULL
                        ELSE completed_date
                    END
                WHERE id = @id
            `)

        // Revalidate related paths
        revalidatePath('/reports/kpi')
        revalidatePath('/projects')

        return { success: true }
    } catch (error) {
        console.error('Error updating milestone progress:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update milestone progress'
        }
    }
}

// ============================================
// GET ALL KPI DATA (Combined for Dashboard)
// ============================================

export async function getAllKPIData(filters?: KPIFilters): Promise<{
    success: boolean
    summary: KPISummary[]
    timeToDelivery: TimeToDeliveryKPI[]
    mandayControl: MandayControlKPI[]
    yearlySummary: KPIYearlySummary[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return {
                success: false,
                summary: [],
                timeToDelivery: [],
                mandayControl: [],
                yearlySummary: [],
                error: 'Unauthorized'
            }
        }

        // Fetch all data in parallel
        const [summaryResult, ttdResult, mdcResult, yearlyResult] = await Promise.all([
            getKPIDashboardSummary(),
            getTimeToDeliveryKPI(filters),
            getMandayControlKPI(filters),
            getKPIYearlySummary()
        ])

        return {
            success: true,
            summary: summaryResult.data,
            timeToDelivery: ttdResult.data,
            mandayControl: mdcResult.data,
            yearlySummary: yearlyResult.data
        }
    } catch (error) {
        console.error('Error fetching all KPI data:', error)
        return {
            success: false,
            summary: [],
            timeToDelivery: [],
            mandayControl: [],
            yearlySummary: [],
            error: error instanceof Error ? error.message : 'Failed to fetch KPI data'
        }
    }
}

// ============================================
// GET KPI FILTER OPTIONS
// ============================================

export async function getKPIFilterOptions(): Promise<{
    success: boolean
    years: number[]
    customers: { id: string; name: string }[]
    managers: { id: string; name: string }[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return {
                success: false,
                years: [],
                customers: [],
                managers: [],
                error: 'Unauthorized'
            }
        }

        const pool = await getConnection()

        // Get distinct years
        const yearsResult = await pool.request()
            .query(`
                SELECT DISTINCT project_year
                FROM pms.projects
                WHERE is_active = 1
                ORDER BY project_year DESC
            `)

        // Get customers with active projects
        const customersResult = await pool.request()
            .query(`
                SELECT DISTINCT c.id, c.name
                FROM pms.customers c
                INNER JOIN pms.projects p ON c.id = p.customer_id
                WHERE p.is_active = 1 AND c.is_active = 1
                ORDER BY c.name
            `)

        // Get managers with active projects
        const managersResult = await pool.request()
            .query(`
                SELECT DISTINCT e.id, CONCAT(e.first_name_th, ' ', e.last_name_th) AS name
                FROM pms.employees e
                INNER JOIN pms.projects p ON e.id = p.project_manager_id
                WHERE p.is_active = 1 AND e.is_active = 1
                ORDER BY name
            `)

        return {
            success: true,
            years: yearsResult.recordset.map((r: { project_year: number }) => r.project_year),
            customers: customersResult.recordset,
            managers: managersResult.recordset
        }
    } catch (error) {
        console.error('Error fetching KPI filter options:', error)
        return {
            success: false,
            years: [],
            customers: [],
            managers: [],
            error: error instanceof Error ? error.message : 'Failed to fetch filter options'
        }
    }
}
