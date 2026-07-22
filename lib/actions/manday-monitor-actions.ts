'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { effectivePlanMdSql } from '@/lib/actions/milestone-plan'

// ============================================
// Types
// ============================================

export interface MandaySummary {
    total_manday_used: number
    total_budget: number
    total_remaining: number
    utilization_percent: number
    active_projects: number
    active_employees: number
    prev_period_mandays: number
    change_percent: number
}

export interface MandayByProject {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    project_type_code: string | null
    status_code: string | null
    owner_name: string | null
    pm_name: string | null
    budget_mandays: number
    actual_mandays: number
    remaining_mandays: number
    percent_used: number
    budget_status: 'NORMAL' | 'WARNING' | 'OVER' | 'NO_BUDGET'
    employee_count: number
    has_milestone_over: boolean
    over_milestone_count: number
}

export interface MandayByEmployee {
    employee_id: string
    employee_code: string
    employee_name: string
    position_code: string | null
    position_name: string | null
    department_id: string | null
    department_name: string | null
    total_mandays: number
    total_hours: number
    avg_manday_per_day: number
    project_count: number
    working_days: number
    workload_percent: number
}

export interface MandayByCategory {
    category: string
    category_name: string
    category_color: string
    mandays: number
    total_hours: number
    percent: number
}

export interface MandayTrend {
    year: number
    month: number
    actual_mandays: number
    total_hours: number
    employee_count: number
    project_count: number
    target_mandays: number
    working_days: number
    target_employee_count: number
}

export interface EmployeeProjectMatrix {
    employee_id: string
    employee_name: string
    position_code: string | null
    project_id: string
    project_code: string
    project_name: string
    mandays: number
}

export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface FilterParams {
    periodType: PeriodType
    year: number
    month?: number
    quarter?: number
    week?: number
    projectId?: string
    employeeId?: string
    departmentId?: string
    projectTypeCode?: string
    ownerId?: string
}

export interface DepartmentOption {
    id: string
    name: string
}

export interface ProjectOption {
    id: string
    project_code: string
    name: string
}

export interface ProjectTypeOption {
    code: string
    name: string
}

export interface OwnerOption {
    id: string
    name: string
}

// ============================================
// Helper Functions
// ============================================

function buildPeriodWhereClause(
    filters: FilterParams,
    dateField: string = 'te.entry_date'
): { whereClause: string; params: Record<string, any> } {
    let whereClause = `YEAR(${dateField}) = @year`
    const params: Record<string, any> = { year: filters.year }

    switch (filters.periodType) {
        case 'day':
        case 'month':
            if (filters.month) {
                whereClause += ` AND MONTH(${dateField}) = @month`
                params.month = filters.month
            }
            break
        case 'week':
            if (filters.week) {
                whereClause += ` AND DATEPART(WEEK, ${dateField}) = @week`
                params.week = filters.week
            }
            break
        case 'quarter':
            if (filters.quarter) {
                whereClause += ` AND DATEPART(QUARTER, ${dateField}) = @quarter`
                params.quarter = filters.quarter
            }
            break
        case 'year':
            // Just year filter, already added
            break
    }

    return { whereClause, params }
}

// ============================================
// Dashboard Actions
// ============================================

// Get Summary Statistics
export async function getMandaySummary(filters: FilterParams): Promise<{
    success: boolean
    data?: MandaySummary
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        // Project-level filter — kept IDENTICAL to getMandayByProject so the KPI cards
        // reconcile exactly with the project table (and its "Budget Status" footer).
        // Previously the summary used a different status filter and the budget query
        // ignored projectId entirely, so card totals ≠ table totals and filtering by a
        // single project left the budget/utilization showing org-wide numbers.
        let projWhere = `p.is_active = 1 AND (ps.code IS NULL OR ps.code NOT IN ('CANCELLED'))`

        const request = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
        })
        if (filters.projectId) {
            projWhere += ' AND p.id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }
        if (filters.projectTypeCode) {
            projWhere += ' AND pt.code = @projectTypeCode'
            request.input('projectTypeCode', sql.NVarChar, filters.projectTypeCode)
        }
        if (filters.ownerId) {
            projWhere += ' AND p.project_owner_id = @ownerId'
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        }

        // total_manday_used = Σ of the SAME per-project rounded value the table shows
        // (round-per-project /7 then sum), and total_budget = Σ sold_mandays over the
        // SAME (non-cancelled, filtered) project set → the headline cards equal the
        // table sums exactly.
        const result = await request.query(`
            WITH md AS (
                SELECT
                    s.project_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                GROUP BY s.project_id
            )
            SELECT
                CAST(ISNULL(SUM(ISNULL(md.actual_mandays, 0)), 0) AS DECIMAL(12,2)) AS total_manday_used,
                ISNULL(SUM(ISNULL(p.sold_mandays, 0)), 0) AS total_budget,
                COUNT(DISTINCT CASE WHEN ISNULL(md.actual_mandays, 0) > 0 THEN p.id END) AS active_projects
            FROM pms.projects p
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            LEFT JOIN md ON md.project_id = p.id
            WHERE ${projWhere}
        `)

        // active_employees = distinct people who logged time in the period within the
        // same (non-cancelled, filtered) project set.
        const empRequest = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            empRequest.input(key, value)
        })
        if (filters.projectId) empRequest.input('projectId', sql.UniqueIdentifier, filters.projectId)
        if (filters.projectTypeCode) empRequest.input('projectTypeCode', sql.NVarChar, filters.projectTypeCode)
        if (filters.ownerId) empRequest.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        const empResult = await empRequest.query(`
            SELECT COUNT(DISTINCT te.employee_id) AS active_employees
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.projects p ON s.project_id = p.id
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
            AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied */
            AND ${projWhere}
        `)

        // Get previous period for the change % arrow — same project set + rounding.
        const prevParams: Record<string, any> = { ...params }
        if (filters.periodType === 'month' && filters.month) {
            prevParams.month = filters.month > 1 ? filters.month - 1 : 12
            if (filters.month === 1) prevParams.year = filters.year - 1
        } else if (filters.periodType === 'year') {
            prevParams.year = filters.year - 1
        }
        const prevWhereClause = buildPeriodWhereClause({ ...filters, ...prevParams }).whereClause

        const prevRequest = pool.request()
        Object.entries(prevParams).forEach(([key, value]) => {
            prevRequest.input(key, value)
        })
        if (filters.projectId) prevRequest.input('projectId', sql.UniqueIdentifier, filters.projectId)
        if (filters.projectTypeCode) prevRequest.input('projectTypeCode', sql.NVarChar, filters.projectTypeCode)
        if (filters.ownerId) prevRequest.input('ownerId', sql.UniqueIdentifier, filters.ownerId)

        const prevResult = await prevRequest.query(`
            WITH md AS (
                SELECT
                    s.project_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND ${prevWhereClause}
                GROUP BY s.project_id
            )
            SELECT CAST(ISNULL(SUM(ISNULL(md.actual_mandays, 0)), 0) AS DECIMAL(12,2)) AS prev_mandays
            FROM pms.projects p
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            LEFT JOIN md ON md.project_id = p.id
            WHERE ${projWhere}
        `)

        const data = result.recordset[0]
        const totalBudget = data.total_budget || 0
        const prevMandays = prevResult.recordset[0]?.prev_mandays || 0
        const totalUsed = data.total_manday_used || 0

        return {
            success: true,
            data: {
                total_manday_used: totalUsed,
                total_budget: totalBudget,
                total_remaining: totalBudget - totalUsed,
                utilization_percent: totalBudget > 0
                    ? Math.round((totalUsed / totalBudget) * 1000) / 10
                    : 0,
                active_projects: data.active_projects || 0,
                active_employees: empResult.recordset[0]?.active_employees || 0,
                prev_period_mandays: prevMandays,
                change_percent: prevMandays > 0
                    ? Math.round(((totalUsed - prevMandays) / prevMandays) * 1000) / 10
                    : 0
            }
        }
    } catch (error: any) {
        console.error('getMandaySummary error:', error)
        return { success: false, error: error.message }
    }
}

// Get Man-day by Project
export async function getMandayByProject(
    filters: FilterParams,
    limit?: number
): Promise<{
    success: boolean
    data?: MandayByProject[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        const request = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
        })

        let additionalWhere = ''
        if (filters.projectId) {
            additionalWhere += ' AND p.id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }
        if (filters.projectTypeCode) {
            additionalWhere += ' AND pt.code = @projectTypeCode'
            request.input('projectTypeCode', sql.NVarChar, filters.projectTypeCode)
        }
        if (filters.ownerId) {
            additionalWhere += ' AND p.project_owner_id = @ownerId'
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        }

        const result = await request.query(`
            SELECT
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                c.name AS customer_name,
                pt.code AS project_type_code,
                ps.code AS status_code,
                COALESCE(
                    CONCAT(po.first_name_th, ' ', po.last_name_th),
                    CONCAT(pm.first_name_th, ' ', pm.last_name_th)
                ) AS owner_name,
                CONCAT(pm.first_name_th, ' ', pm.last_name_th) AS pm_name,
                ISNULL(p.sold_mandays, 0) AS budget_mandays,
                ISNULL(md.actual_mandays, 0) AS actual_mandays,
                ISNULL(p.sold_mandays, 0) - ISNULL(md.actual_mandays, 0) AS remaining_mandays,
                CASE
                    WHEN ISNULL(p.sold_mandays, 0) > 0
                    THEN CAST(ROUND(ISNULL(md.actual_mandays, 0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                    ELSE 0
                END AS percent_used,
                CASE
                    WHEN ISNULL(p.sold_mandays, 0) = 0 THEN 'NO_BUDGET'
                    WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) THEN 'OVER'
                    WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) * 0.9 THEN 'WARNING'
                    ELSE 'NORMAL'
                END AS budget_status,
                ISNULL(md.employee_count, 0) AS employee_count,
                CASE WHEN ISNULL(ms_over.over_count, 0) > 0 THEN 1 ELSE 0 END AS has_milestone_over,
                ISNULL(ms_over.over_count, 0) AS over_milestone_count
            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
            LEFT JOIN pms.employees po ON p.project_owner_id = po.id
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            LEFT JOIN (
                SELECT
                    s.project_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
                    COUNT(DISTINCT te.employee_id) AS employee_count
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                GROUP BY s.project_id
            ) md ON p.id = md.project_id
            LEFT JOIN (
                SELECT
                    vma.project_id,
                    SUM(CASE WHEN vma.planned_mandays > 0 AND vma.calculated_actual_mandays > vma.planned_mandays THEN 1 ELSE 0 END) AS over_count
                FROM pms.vw_milestone_actual_mandays vma
                GROUP BY vma.project_id
            ) ms_over ON p.id = ms_over.project_id
            WHERE p.is_active = 1
            AND (ps.code IS NULL OR ps.code NOT IN ('CANCELLED'))
            ${additionalWhere}
            ORDER BY actual_mandays DESC
            ${limit ? `OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY` : ''}
        `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMandayByProject error:', error)
        return { success: false, error: error.message }
    }
}

// Get Man-day by Employee
export async function getMandayByEmployee(
    filters: FilterParams,
    limit?: number
): Promise<{
    success: boolean
    data?: MandayByEmployee[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        const request = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
        })

        // Build outer query filters (for employee table)
        let additionalWhere = ''
        if (filters.employeeId) {
            additionalWhere += ' AND e.id = @employeeId'
            request.input('employeeId', sql.UniqueIdentifier, filters.employeeId)
        }
        if (filters.departmentId) {
            additionalWhere += ' AND e.department_id = @departmentId'
            request.input('departmentId', sql.UniqueIdentifier, filters.departmentId)
        }

        // Build subquery filters (for timesheet/project data)
        let subqueryWhere = ''
        let needProjectJoin = false
        if (filters.projectId) {
            subqueryWhere += ' AND s.project_id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }
        if (filters.ownerId) {
            subqueryWhere += ' AND p.project_owner_id = @ownerId'
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
            needProjectJoin = true
        }

        const projectJoin = needProjectJoin ? 'INNER JOIN pms.projects p ON s.project_id = p.id' : ''

        const result = await request.query(`
            SELECT
                e.id AS employee_id,
                e.employee_code,
                COALESCE(
                    CONCAT(e.first_name_th, ' ', e.last_name_th),
                    CONCAT(e.first_name, ' ', e.last_name)
                ) AS employee_name,
                pos.code AS position_code,
                pos.name AS position_name,
                d.id AS department_id,
                d.name AS department_name,
                ISNULL(md.total_mandays, 0) AS total_mandays,
                ISNULL(md.total_hours, 0) AS total_hours,
                CASE
                    WHEN md.working_days > 0
                    THEN CAST(ROUND(md.total_mandays / md.working_days, 2) AS DECIMAL(5,2))
                    ELSE 0
                END AS avg_manday_per_day,
                ISNULL(md.project_count, 0) AS project_count,
                ISNULL(md.working_days, 0) AS working_days,
                CASE
                    WHEN md.working_days > 0
                    THEN CAST(ROUND(md.total_mandays * 100.0 / md.working_days, 1) AS DECIMAL(5,1))
                    ELSE 0
                END AS workload_percent
            FROM pms.employees e
            LEFT JOIN pms.departments d ON e.department_id = d.id
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            INNER JOIN (
                SELECT
                    te.employee_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS total_mandays,
                    SUM(te.hours) AS total_hours,
                    COUNT(DISTINCT s.project_id) AS project_count,
                    COUNT(DISTINCT te.entry_date) AS working_days
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                ${projectJoin}
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                ${subqueryWhere}
                GROUP BY te.employee_id
            ) md ON e.id = md.employee_id
            WHERE e.is_active = 1
            ${additionalWhere}
            ORDER BY total_mandays DESC
            ${limit ? `OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY` : ''}
        `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMandayByEmployee error:', error)
        return { success: false, error: error.message }
    }
}

// Get Man-day by Category
export async function getMandayByCategory(filters: FilterParams): Promise<{
    success: boolean
    data?: MandayByCategory[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        const request = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
        })

        let additionalWhere = ''
        if (filters.projectId) {
            additionalWhere += ' AND s.project_id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }
        if (filters.departmentId) {
            additionalWhere += ' AND e.department_id = @departmentId'
            request.input('departmentId', sql.UniqueIdentifier, filters.departmentId)
        }

        const result = await request.query(`
            WITH CategoryData AS (
                SELECT
                    ISNULL(t.task_type, 'Other') AS category,
                    ISNULL(ttc.name, ISNULL(t.task_type, 'อื่นๆ')) AS category_name,
                    ISNULL(ttc.color, '#6B7280') AS category_color,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
                    SUM(te.hours) AS total_hours
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
                LEFT JOIN pms.employees e ON te.employee_id = e.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                ${additionalWhere}
                GROUP BY t.task_type, ttc.name, ttc.color
            )
            SELECT
                category,
                category_name,
                category_color,
                mandays,
                total_hours,
                CAST(ROUND(mandays * 100.0 / NULLIF(SUM(mandays) OVER(), 0), 1) AS DECIMAL(5,1)) AS [percent]
            FROM CategoryData
            ORDER BY mandays DESC
        `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMandayByCategory error:', error)
        return { success: false, error: error.message }
    }
}

// Get Man-day Trend (Monthly)
export async function getMandayTrend(year: number): Promise<{
    success: boolean
    data?: MandayTrend[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(`
                WITH Months AS (
                    SELECT 1 AS month UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
                    UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
                ),
                ActualData AS (
                    SELECT
                        MONTH(te.entry_date) AS month,
                        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
                        SUM(te.hours) AS total_hours,
                        COUNT(DISTINCT te.employee_id) AS employee_count,
                        COUNT(DISTINCT s.project_id) AS project_count
                    FROM pms.timesheet_entries te
                    INNER JOIN pms.tasks t ON te.task_id = t.id
                    INNER JOIN pms.stories s ON t.story_id = s.id
                    WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                    AND YEAR(te.entry_date) = @year
                    GROUP BY MONTH(te.entry_date)
                ),
                -- Count SA, BA, PG employees (active)
                TargetEmployees AS (
                    SELECT COUNT(*) AS emp_count
                    FROM pms.employees e
                    INNER JOIN pms.positions p ON e.position_id = p.id
                    WHERE e.is_active = 1
                    AND p.code IN ('SA', 'BA', 'PG')
                ),
                -- Calculate working days per month (excluding weekends)
                WorkingDays AS (
                    SELECT
                        m.month,
                        (
                            SELECT COUNT(*)
                            FROM (
                                SELECT DATEADD(DAY, n.number, DATEFROMPARTS(@year, m.month, 1)) AS dt
                                FROM master.dbo.spt_values n
                                WHERE n.type = 'P'
                                AND n.number BETWEEN 0 AND 30
                                AND DATEADD(DAY, n.number, DATEFROMPARTS(@year, m.month, 1)) < DATEADD(MONTH, 1, DATEFROMPARTS(@year, m.month, 1))
                            ) dates
                            WHERE DATEPART(WEEKDAY, dates.dt) NOT IN (1, 7) -- Exclude Sun(1), Sat(7)
                        ) AS working_days
                    FROM Months m
                )
                SELECT
                    @year AS year,
                    m.month,
                    ISNULL(a.actual_mandays, 0) AS actual_mandays,
                    ISNULL(a.total_hours, 0) AS total_hours,
                    ISNULL(a.employee_count, 0) AS employee_count,
                    ISNULL(a.project_count, 0) AS project_count,
                    ISNULL(wd.working_days, 0) AS working_days,
                    te.emp_count AS target_employee_count,
                    CAST(ISNULL(wd.working_days, 0) * te.emp_count AS INT) AS target_mandays
                FROM Months m
                LEFT JOIN ActualData a ON m.month = a.month
                LEFT JOIN WorkingDays wd ON m.month = wd.month
                CROSS JOIN TargetEmployees te
                ORDER BY m.month
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getMandayTrend error:', error)
        return { success: false, error: error.message }
    }
}

// Get Employee-Project Matrix
export async function getEmployeeProjectMatrix(filters: FilterParams): Promise<{
    success: boolean
    data?: EmployeeProjectMatrix[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        const request = pool.request()
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
        })

        let additionalWhere = ''
        if (filters.departmentId) {
            additionalWhere += ' AND e.department_id = @departmentId'
            request.input('departmentId', sql.UniqueIdentifier, filters.departmentId)
        }
        if (filters.projectId) {
            additionalWhere += ' AND s.project_id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }

        const result = await request.query(`
            SELECT
                te.employee_id,
                COALESCE(
                    CONCAT(e.first_name_th, ' ', e.last_name_th),
                    CONCAT(e.first_name, ' ', e.last_name)
                ) AS employee_name,
                pos.code AS position_code,
                s.project_id,
                p.project_code,
                p.name AS project_name,
                CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            INNER JOIN pms.employees e ON te.employee_id = e.id
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.projects p ON s.project_id = p.id
            WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1 AND p.is_active = 1
            AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied */
            ${additionalWhere}
            GROUP BY
                te.employee_id,
                e.first_name_th,
                e.last_name_th,
                e.first_name,
                e.last_name,
                pos.code,
                s.project_id,
                p.project_code,
                p.name
            ORDER BY employee_name, project_name
        `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getEmployeeProjectMatrix error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Filter Options
// ============================================

export async function getDepartmentOptions(): Promise<{
    success: boolean
    data?: DepartmentOption[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT id, name
                FROM pms.departments
                WHERE is_active = 1
                ORDER BY name
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getDepartmentOptions error:', error)
        return { success: false, error: error.message }
    }
}

export async function getProjectOptions(): Promise<{
    success: boolean
    data?: ProjectOption[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT p.id, p.project_code, p.name
                FROM pms.projects p
                LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                WHERE p.is_active = 1
                AND (ps.code IS NULL OR ps.code NOT IN ('CANCELLED'))
                ORDER BY p.project_code DESC
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getProjectOptions error:', error)
        return { success: false, error: error.message }
    }
}

export async function getProjectTypeOptions(): Promise<{
    success: boolean
    data?: ProjectTypeOption[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT code, name
                FROM pms.project_types
                WHERE is_active = 1
                ORDER BY sort_order, name
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getProjectTypeOptions error:', error)
        return { success: false, error: error.message }
    }
}

export async function getOwnerOptions(): Promise<{
    success: boolean
    data?: OwnerOption[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT DISTINCT
                    e.id,
                    COALESCE(
                        CONCAT(e.first_name_th, ' ', e.last_name_th),
                        CONCAT(e.first_name, ' ', e.last_name)
                    ) AS name
                FROM pms.employees e
                INNER JOIN pms.projects p ON p.project_owner_id = e.id
                WHERE e.is_active = 1 AND p.is_active = 1
                ORDER BY name
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getOwnerOptions error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Get All Dashboard Data
// ============================================

export async function getMandayDashboardData(filters: FilterParams) {
    const [summary, projects, employees, trend] = await Promise.all([
        getMandaySummary(filters),
        getMandayByProject(filters),
        getMandayByEmployee(filters),
        getMandayTrend(filters.year)
    ])

    return {
        summary: summary.data,
        projects: projects.data || [],
        topProjects: (projects.data || []).slice(0, 5),
        employees: employees.data || [],
        topEmployees: (employees.data || []).slice(0, 5),
        trend: trend.data || []
    }
}

// ============================================
// Project Man-day Detail (for popup)
// ============================================

export interface MandayByMilestone {
    milestone_id: string | null
    milestone_name: string
    milestone_code: string | null
    sort_order: number
    planned_mandays: number
    mandays: number
    hours: number
    percent: number
    variance: number
    progress_percent: number
    color: string
}

export interface MandayByEmployeeInProject {
    [key: string]: string | number | null
    employee_id: string
    employee_code: string
    employee_name: string
    position_code: string | null
    mandays: number
    hours: number
    percent: number
}

export interface EmployeeMilestoneMatrix {
    employee_id: string
    employee_name: string
    position_code: string | null
    milestone_id: string | null
    milestone_name: string
    mandays: number
}

export interface DailyTimesheetEntry {
    entry_date: string
    employee_id: string
    employee_name: string
    position_code: string | null
    milestone_name: string | null
    task_name: string | null
    hours: number
    mandays: number
    description: string | null
}

export interface ProjectMandayDetail {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    budget_mandays: number
    total_planned_mandays: number
    actual_mandays: number
    remaining_mandays: number
    percent_used: number
    milestones: MandayByMilestone[]
    employees: MandayByEmployeeInProject[]
    matrix: EmployeeMilestoneMatrix[]
    dailyLog: DailyTimesheetEntry[]
}

// Colors for milestones
const MILESTONE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

export async function getProjectMandayDetail(
    projectId: string,
    filters: FilterParams
): Promise<{
    success: boolean
    data?: ProjectMandayDetail
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const { whereClause, params } = buildPeriodWhereClause(filters)

        // Get project info
        const projectResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    p.id AS project_id,
                    p.project_code,
                    p.name AS project_name,
                    c.name AS customer_name,
                    ISNULL(p.sold_mandays, 0) AS budget_mandays
                FROM pms.projects p
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                WHERE p.id = @projectId
            `)

        if (projectResult.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        const project = projectResult.recordset[0]

        // Get man-day by milestone
        const milestoneRequest = pool.request()
        milestoneRequest.input('projectId', sql.UniqueIdentifier, projectId)
        milestoneRequest.input('budget', sql.Decimal(18, 2), project.budget_mandays || 0)
        Object.entries(params).forEach(([key, value]) => {
            milestoneRequest.input(key, value)
        })

        const milestoneResult = await milestoneRequest.query(`
            WITH ActualData AS (
                SELECT
                    pm.id AS milestone_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
                    SUM(te.hours) AS hours
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND s.project_id = @projectId
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                GROUP BY pm.id
            ),
            UnassignedData AS (
                SELECT
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
                    SUM(te.hours) AS hours
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND s.project_id = @projectId
                AND s.milestone_id IS NULL
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
            ),
            AllMilestones AS (
                SELECT
                    pm.id AS milestone_id,
                    COALESCE(ms.name, N'Milestone #' + CAST(ISNULL(pm.sort_order, 0) AS NVARCHAR(10))) AS milestone_name,
                    ms.code AS milestone_code,
                    COALESCE(ms.sort_order, pm.sort_order, 0) AS sort_order,
                    ISNULL(ep.eff_plan, 0) AS planned_mandays,
                    ISNULL(ad.mandays, 0) AS mandays,
                    ISNULL(ad.hours, 0) AS hours
                FROM pms.project_milestones pm
                LEFT JOIN pms.milestone_configs ms ON pm.milestone_config_id = ms.id
                LEFT JOIN ActualData ad ON pm.id = ad.milestone_id
                CROSS APPLY (SELECT ${effectivePlanMdSql('@budget', 'pm', 'ms')} AS eff_plan) ep
                WHERE pm.project_id = @projectId

                UNION ALL

                SELECT
                    CAST(NULL AS UNIQUEIDENTIFIER) AS milestone_id,
                    N'ไม่ระบุ Milestone' AS milestone_name,
                    CAST(NULL AS NVARCHAR(20)) AS milestone_code,
                    999 AS sort_order,
                    CAST(0 AS DECIMAL(10,2)) AS planned_mandays,
                    ISNULL(ud.mandays, 0) AS mandays,
                    ISNULL(ud.hours, 0) AS hours
                FROM UnassignedData ud
                WHERE ISNULL(ud.mandays, 0) > 0
            )
            SELECT
                milestone_id,
                milestone_name,
                milestone_code,
                sort_order,
                planned_mandays,
                mandays,
                hours,
                CAST(ROUND(mandays * 100.0 / NULLIF(SUM(mandays) OVER(), 0), 1) AS DECIMAL(5,1)) AS [percent],
                planned_mandays - mandays AS variance,
                CASE
                    WHEN planned_mandays > 0
                    THEN CAST(ROUND(mandays * 100.0 / planned_mandays, 1) AS DECIMAL(5,1))
                    ELSE 0
                END AS progress_percent
            FROM AllMilestones
            ORDER BY sort_order, milestone_name
        `)

        // Get man-day by employee
        const employeeRequest = pool.request()
        employeeRequest.input('projectId', sql.UniqueIdentifier, projectId)
        Object.entries(params).forEach(([key, value]) => {
            employeeRequest.input(key, value)
        })

        const employeeResult = await employeeRequest.query(`
            WITH EmployeeData AS (
                SELECT
                    e.id AS employee_id,
                    e.employee_code,
                    COALESCE(
                        CONCAT(e.first_name_th, ' ', e.last_name_th),
                        CONCAT(e.first_name, ' ', e.last_name)
                    ) AS employee_name,
                    pos.code AS position_code,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays,
                    SUM(te.hours) AS hours
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.employees e ON te.employee_id = e.id
                LEFT JOIN pms.positions pos ON e.position_id = pos.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                AND s.project_id = @projectId
                AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied; see getMandayTrend for the period breakdown */
                GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.first_name, e.last_name, pos.code
            )
            SELECT
                employee_id,
                employee_code,
                employee_name,
                position_code,
                mandays,
                hours,
                CAST(ROUND(mandays * 100.0 / NULLIF(SUM(mandays) OVER(), 0), 1) AS DECIMAL(5,1)) AS [percent]
            FROM EmployeeData
            ORDER BY mandays DESC
        `)

        // Get employee-milestone matrix
        const matrixRequest = pool.request()
        matrixRequest.input('projectId', sql.UniqueIdentifier, projectId)
        Object.entries(params).forEach(([key, value]) => {
            matrixRequest.input(key, value)
        })

        const matrixResult = await matrixRequest.query(`
            SELECT
                e.id AS employee_id,
                COALESCE(
                    CONCAT(e.first_name_th, ' ', e.last_name_th),
                    CONCAT(e.first_name, ' ', e.last_name)
                ) AS employee_name,
                pos.code AS position_code,
                pm.id AS milestone_id,
                ISNULL(ms.name, 'ไม่ระบุ Milestone') AS milestone_name,
                CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.employees e ON te.employee_id = e.id
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
            LEFT JOIN pms.milestone_configs ms ON pm.milestone_config_id = ms.id
            WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
            AND s.project_id = @projectId
            AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied */
            GROUP BY e.id, e.first_name_th, e.last_name_th, e.first_name, e.last_name, pos.code, pm.id, ms.name
            ORDER BY employee_name, milestone_name
        `)

        // Get daily timesheet log
        const dailyRequest = pool.request()
        dailyRequest.input('projectId', sql.UniqueIdentifier, projectId)
        Object.entries(params).forEach(([key, value]) => {
            dailyRequest.input(key, value)
        })

        const dailyResult = await dailyRequest.query(`
            SELECT
                CONVERT(VARCHAR(10), te.entry_date, 120) AS entry_date,
                e.id AS employee_id,
                COALESCE(
                    CONCAT(e.first_name_th, ' ', e.last_name_th),
                    CONCAT(e.first_name, ' ', e.last_name)
                ) AS employee_name,
                pos.code AS position_code,
                ISNULL(msc.name, NULL) AS milestone_name,
                t.title AS task_name,
                te.hours,
                CAST(ROUND(te.hours / 7.0, 4) AS DECIMAL(10,4)) AS mandays,
                te.description
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.employees e ON te.employee_id = e.id
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
            LEFT JOIN pms.milestone_configs msc ON pm.milestone_config_id = msc.id
            WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
            AND s.project_id = @projectId
            AND 1 = 1 /* Actual MD is lifetime (cumulative) — period filter intentionally not applied */
            ORDER BY te.entry_date DESC, employee_name, t.title
        `)

        // Calculate totals
        const totalMandays = milestoneResult.recordset.reduce((sum: number, m: any) => sum + (m.mandays || 0), 0)
        const totalPlannedMandays = milestoneResult.recordset.reduce((sum: number, m: any) => sum + (m.planned_mandays || 0), 0)

        // Add colors to milestones
        const milestones = milestoneResult.recordset.map((m: any, idx: number) => ({
            ...m,
            color: MILESTONE_COLORS[idx % MILESTONE_COLORS.length]
        }))

        return {
            success: true,
            data: {
                project_id: project.project_id,
                project_code: project.project_code,
                project_name: project.project_name,
                customer_name: project.customer_name,
                budget_mandays: project.budget_mandays,
                total_planned_mandays: totalPlannedMandays,
                actual_mandays: totalMandays,
                remaining_mandays: project.budget_mandays - totalMandays,
                percent_used: project.budget_mandays > 0
                    ? Math.round((totalMandays / project.budget_mandays) * 1000) / 10
                    : 0,
                milestones,
                employees: employeeResult.recordset,
                matrix: matrixResult.recordset,
                dailyLog: dailyResult.recordset
            }
        }
    } catch (error: any) {
        console.error('getProjectMandayDetail error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// Missing Timesheet Check (SA/BA/PG)
// ============================================

export interface LowHoursEntry {
    date: string
    hours: number
}

export interface MissingTimesheetEmployee {
    employee_id: string
    employee_code: string
    employee_name: string
    position_code: string
    position_name: string
    department_name: string | null
    missing_dates: string[]
    missing_count: number
    low_hours_dates: LowHoursEntry[]  // Dates with < 5 hours
    low_hours_count: number
    logged_count: number
    total_working_days: number
}

export interface MissingTimesheetSummary {
    total_employees: number
    employees_with_missing: number
    employees_with_low_hours: number
    total_missing_entries: number
    total_low_hours_entries: number
    period_start: string
    period_end: string
    holidays: string[]  // Dates where no one logged time
}

export interface MissingTimesheetResult {
    summary: MissingTimesheetSummary
    employees: MissingTimesheetEmployee[]
}

export async function getMissingTimesheet(
    startDate: string,
    endDate: string
): Promise<{
    success: boolean
    data?: MissingTimesheetResult
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Get all weekdays in the date range (exclude weekends)
        const workingDaysResult = await pool.request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`
                WITH DateRange AS (
                    SELECT CAST(@startDate AS DATE) AS dt
                    UNION ALL
                    SELECT DATEADD(DAY, 1, dt)
                    FROM DateRange
                    WHERE DATEADD(DAY, 1, dt) <= @endDate
                )
                SELECT dt AS work_date
                FROM DateRange
                WHERE DATEPART(WEEKDAY, dt) NOT IN (1, 7) -- Exclude Sun(1), Sat(7)
                AND dt <= GETDATE() -- Only past dates
                OPTION (MAXRECURSION 400)
            `)

        const allWeekdays = workingDaysResult.recordset.map((r: { work_date: Date }) =>
            r.work_date.toISOString().split('T')[0]
        )

        if (allWeekdays.length === 0) {
            return {
                success: true,
                data: {
                    summary: {
                        total_employees: 0,
                        employees_with_missing: 0,
                        employees_with_low_hours: 0,
                        total_missing_entries: 0,
                        total_low_hours_entries: 0,
                        period_start: startDate,
                        period_end: endDate,
                        holidays: []
                    },
                    employees: []
                }
            }
        }

        // Get dates where at least one SA/BA/PG logged time (to detect holidays)
        const loggedDatesResult = await pool.request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`
                SELECT DISTINCT CONVERT(VARCHAR(10), te.entry_date, 120) AS logged_date
                FROM pms.timesheet_entries te
                INNER JOIN pms.employees e ON te.employee_id = e.id
                INNER JOIN pms.positions p ON e.position_id = p.id
                WHERE te.is_active = 1
                AND te.entry_date >= @startDate
                AND te.entry_date <= @endDate
                AND p.code IN ('SA', 'BA', 'PG')
            `)

        const datesWithLogs = new Set(loggedDatesResult.recordset.map((r: any) => r.logged_date))

        // Holidays = weekdays where no one logged time
        const holidays = allWeekdays.filter((d: string) => !datesWithLogs.has(d))

        // Working days = weekdays minus holidays
        const workingDays = allWeekdays.filter((d: string) => datesWithLogs.has(d))

        // Get SA, BA, PG employees with their logged dates and hours per day
        const employeesResult = await pool.request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`
                WITH TargetEmployees AS (
                    SELECT
                        e.id AS employee_id,
                        e.employee_code,
                        COALESCE(
                            CONCAT(e.first_name_th, ' ', e.last_name_th),
                            CONCAT(e.first_name, ' ', e.last_name)
                        ) AS employee_name,
                        p.code AS position_code,
                        p.name AS position_name,
                        d.name AS department_name
                    FROM pms.employees e
                    INNER JOIN pms.positions p ON e.position_id = p.id
                    LEFT JOIN pms.departments d ON e.department_id = d.id
                    WHERE e.is_active = 1
                    AND p.code IN ('SA', 'BA', 'PG')
                ),
                DailyHours AS (
                    SELECT
                        te.employee_id,
                        CONVERT(VARCHAR(10), te.entry_date, 120) AS logged_date,
                        SUM(te.hours) AS daily_hours
                    FROM pms.timesheet_entries te
                    WHERE te.is_active = 1
                    AND te.entry_date >= @startDate
                    AND te.entry_date <= @endDate
                    GROUP BY te.employee_id, CONVERT(VARCHAR(10), te.entry_date, 120)
                )
                SELECT
                    te.employee_id,
                    te.employee_code,
                    te.employee_name,
                    te.position_code,
                    te.position_name,
                    te.department_name,
                    STRING_AGG(dh.logged_date + ':' + CAST(dh.daily_hours AS VARCHAR(10)), ',') AS logged_data
                FROM TargetEmployees te
                LEFT JOIN DailyHours dh ON te.employee_id = dh.employee_id
                GROUP BY
                    te.employee_id,
                    te.employee_code,
                    te.employee_name,
                    te.position_code,
                    te.position_name,
                    te.department_name
                ORDER BY te.position_code, te.employee_name
            `)

        // Calculate missing dates and low hours for each employee
        const employees: MissingTimesheetEmployee[] = employeesResult.recordset.map((emp: any) => {
            // Parse logged_data: "2025-01-06:7.5,2025-01-07:3" => {date: hours}
            const loggedMap: Record<string, number> = {}
            if (emp.logged_data) {
                emp.logged_data.split(',').forEach((entry: string) => {
                    const [date, hours] = entry.split(':')
                    if (date && hours) {
                        loggedMap[date] = parseFloat(hours)
                    }
                })
            }

            const loggedDates = Object.keys(loggedMap)
            // Missing = working days not in logged dates
            const missingDates = workingDays.filter((wd: string) => !loggedMap[wd])

            // Low hours = logged but < 5 hours
            const lowHoursDates: LowHoursEntry[] = loggedDates
                .filter(d => loggedMap[d] < 5 && workingDays.includes(d))
                .map(d => ({ date: d, hours: loggedMap[d] }))
                .sort((a, b) => a.date.localeCompare(b.date))

            return {
                employee_id: emp.employee_id,
                employee_code: emp.employee_code,
                employee_name: emp.employee_name,
                position_code: emp.position_code,
                position_name: emp.position_name,
                department_name: emp.department_name,
                missing_dates: missingDates,
                missing_count: missingDates.length,
                low_hours_dates: lowHoursDates,
                low_hours_count: lowHoursDates.length,
                logged_count: loggedDates.filter(d => workingDays.includes(d)).length,
                total_working_days: workingDays.length
            }
        })

        // Sort by issues (missing + low hours) descending
        employees.sort((a, b) => (b.missing_count + b.low_hours_count) - (a.missing_count + a.low_hours_count))

        const employeesWithMissing = employees.filter(e => e.missing_count > 0)
        const employeesWithLowHours = employees.filter(e => e.low_hours_count > 0)
        const totalMissingEntries = employeesWithMissing.reduce((sum, e) => sum + e.missing_count, 0)
        const totalLowHoursEntries = employees.reduce((sum, e) => sum + e.low_hours_count, 0)

        return {
            success: true,
            data: {
                summary: {
                    total_employees: employees.length,
                    employees_with_missing: employeesWithMissing.length,
                    employees_with_low_hours: employeesWithLowHours.length,
                    total_missing_entries: totalMissingEntries,
                    total_low_hours_entries: totalLowHoursEntries,
                    period_start: startDate,
                    period_end: endDate,
                    holidays
                },
                employees
            }
        }
    } catch (error: any) {
        console.error('getMissingTimesheet error:', error)
        return { success: false, error: error.message }
    }
}
