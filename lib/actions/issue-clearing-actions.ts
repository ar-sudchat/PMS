'use server'

import { getConnection } from '@/lib/db'

// Types
export interface DailyClearing {
    employee_id: string
    employee_name: string
    employee_code: string
    work_date: string
    work_year: number
    work_month: number
    work_week: number
    day_name: string
    tasks_worked: number
    tasks_completed: number
    clearing_rate: number
    total_hours: number
}

export interface MonthSummary {
    total_tasks_worked: number
    total_tasks_completed: number
    working_days: number
    total_hours: number
    clearing_rate: number
    avg_per_day: number
    is_pass: boolean
}

export interface EmployeeMonthSummary {
    employee_id: string
    employee_name: string
    employee_code: string
    work_year: number
    work_month: number
    working_days: number
    total_tasks_worked: number
    total_tasks_completed: number
    total_hours: number
    clearing_rate: number
    is_pass: boolean
}

export interface TaskDetail {
    id: string
    task_code: string
    task_name: string
    status: string
    project_code: string
    project_name: string
    is_completed_today: boolean
    hours_logged: number | null
}

export interface IssueClearingFilters {
    year: number
    month: number
    employeeId?: string
    page?: number
    pageSize?: number
}

// Get Daily Issue Clearing data
export async function getIssueClearingDaily(filters: IssueClearingFilters) {
    try {
        const pool = await getConnection()
        const { year, month, employeeId, page = 1, pageSize = 31 } = filters

        let whereClause = 'work_year = @year AND work_month = @month'
        if (employeeId) {
            whereClause += ' AND employee_id = @employeeId'
        }

        // Get daily data
        const result = await pool.request()
            .input('year', year)
            .input('month', month)
            .input('employeeId', employeeId || null)
            .query(`
                SELECT *
                FROM pms.vw_issue_clearing_daily
                WHERE ${whereClause}
                ORDER BY work_date DESC
            `)

        // Get summary
        const summaryResult = await pool.request()
            .input('year', year)
            .input('month', month)
            .input('employeeId', employeeId || null)
            .query(`
                SELECT
                    COUNT(DISTINCT work_date) AS working_days,
                    SUM(tasks_worked) AS total_tasks_worked,
                    SUM(tasks_completed) AS total_tasks_completed,
                    SUM(total_hours) AS total_hours
                FROM pms.vw_issue_clearing_daily
                WHERE ${whereClause}
            `)

        const s = summaryResult.recordset[0]
        const totalWorked = s.total_tasks_worked || 0
        const totalCompleted = s.total_tasks_completed || 0
        const workingDays = s.working_days || 0
        const rate = totalWorked > 0 ? (totalCompleted / totalWorked) * 100 : 100

        return {
            success: true,
            dailyData: result.recordset as DailyClearing[],
            summary: {
                total_tasks_worked: totalWorked,
                total_tasks_completed: totalCompleted,
                working_days: workingDays,
                total_hours: s.total_hours || 0,
                clearing_rate: Math.round(rate * 100) / 100,
                avg_per_day: workingDays > 0 ? Math.round((totalCompleted / workingDays) * 10) / 10 : 0,
                is_pass: rate >= 85
            } as MonthSummary
        }
    } catch (error) {
        console.error('Error fetching issue clearing daily:', error)
        return {
            success: false,
            error: 'Failed to fetch issue clearing data',
            dailyData: [],
            summary: {
                total_tasks_worked: 0,
                total_tasks_completed: 0,
                working_days: 0,
                total_hours: 0,
                clearing_rate: 100,
                avg_per_day: 0,
                is_pass: true
            }
        }
    }
}

// Get Tasks for a specific date
export async function getTasksForDate(employeeId: string, date: string) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', employeeId)
            .input('date', date)
            .query(`
                SELECT DISTINCT
                    t.id,
                    t.task_code,
                    t.title AS task_name,
                    t.status,
                    p.project_code,
                    p.name AS project_name,
                    CASE WHEN t.status = 'done' THEN 1 ELSE 0 END AS is_completed_today,
                    ts.hours AS hours_logged,
                    ts.description AS work_description
                FROM pms.timesheet_entries ts
                INNER JOIN pms.tasks t ON ts.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.projects p ON s.project_id = p.id
                WHERE ts.employee_id = @employeeId
                AND ts.entry_date = @date
                ORDER BY is_completed_today DESC, t.task_code
            `)

        return { success: true, data: result.recordset as TaskDetail[] }
    } catch (error) {
        console.error('Error fetching tasks for date:', error)
        return { success: false, error: 'Failed to fetch tasks', data: [] }
    }
}

// Get Issue Clearing KPI for all employees in a month
export async function getIssueClearingAllEmployees(year: number, month: number) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', year)
            .input('month', month)
            .query(`
                SELECT *
                FROM pms.vw_issue_clearing_monthly
                WHERE work_year = @year AND work_month = @month
                ORDER BY clearing_rate DESC
            `)

        const data: EmployeeMonthSummary[] = result.recordset.map((r: any) => ({
            employee_id: r.employee_id,
            employee_name: r.employee_name || 'Unknown',
            employee_code: r.employee_code,
            work_year: r.work_year,
            work_month: r.work_month,
            working_days: r.working_days || 0,
            total_tasks_worked: r.total_tasks_worked || 0,
            total_tasks_completed: r.total_tasks_completed || 0,
            total_hours: r.total_hours || 0,
            clearing_rate: Math.round((r.clearing_rate || 100) * 100) / 100,
            is_pass: (r.clearing_rate || 100) >= 85
        }))

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching issue clearing for all employees:', error)
        return { success: false, error: 'Failed to fetch KPI data', data: [] }
    }
}

// Get Issue Clearing KPI yearly summary
export async function getIssueClearingYearly(year: number, employeeId?: string) {
    try {
        const pool = await getConnection()

        let whereClause = 'work_year = @year'
        if (employeeId) {
            whereClause += ' AND employee_id = @employeeId'
        }

        const result = await pool.request()
            .input('year', year)
            .input('employeeId', employeeId || null)
            .query(`
                SELECT *
                FROM pms.vw_issue_clearing_yearly
                WHERE ${whereClause}
                ORDER BY clearing_rate DESC
            `)

        return {
            success: true,
            data: result.recordset.map((r: any) => ({
                ...r,
                clearing_rate: Math.round((r.clearing_rate || 100) * 100) / 100,
                is_pass: (r.clearing_rate || 100) >= 85
            }))
        }
    } catch (error) {
        console.error('Error fetching issue clearing yearly:', error)
        return { success: false, error: 'Failed to fetch yearly data', data: [] }
    }
}

// Get Active Employees (for filter dropdown)
export async function getActiveEmployeesForIssueClearing() {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT DISTINCT
                e.id,
                e.first_name + ' ' + e.last_name AS name,
                e.employee_code AS code
            FROM pms.employees e
            INNER JOIN pms.timesheet_entries ts ON e.id = ts.employee_id
            WHERE e.status = 'Active'
            ORDER BY name
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching active employees:', error)
        return { success: false, error: 'Failed to fetch employees', data: [] }
    }
}
