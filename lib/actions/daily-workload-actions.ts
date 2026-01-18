'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { getWorkloadConfig } from './config-actions'

// ============================================
// TYPES
// ============================================

export interface DailyTaskItem {
    id: string
    task_code: string
    title: string
    project_id: string
    project_code: string
    project_name: string
    story_id: string
    story_code: string
    story_title: string
    estimated_hours: number
    priority: 'critical' | 'high' | 'medium' | 'low'
    status: string
    assignee_id: string | null
    assignee_name: string | null
    assignee_position_code: string | null
    reviewer_id: string | null
    reviewer_name: string | null
    is_planned: boolean // Y = มีแผน, N = ยังไม่วางแผน
    is_completed: boolean
}

export interface DailyWorkloadSummary {
    date: string
    day_name: string
    total_capacity_hours: number
    booked_hours: number
    remaining_hours: number
    tasks: DailyTaskItem[]
}

export interface PositionWorkloadSummary {
    position_code: string
    position_name: string
    employee_count: number
    total_capacity_hours: number
    booked_hours: number
    remaining_hours: number
}

// ============================================
// GET DAILY WORKLOAD FOR SA TEAM
// ============================================

export async function getDailyWorkload(
    date: string,
    filters?: {
        positionCodes?: string[] // SA, BA, PG
        employeeIds?: string[]
        projectIds?: string[]
    }
): Promise<{ success: boolean; data: DailyWorkloadSummary | null; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()
        const configResult = await getWorkloadConfig()
        const config = configResult.data

        // Parse date
        const targetDate = new Date(date)
        const dayOfWeek = targetDate.getDay()
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
        const dayName = dayNames[dayOfWeek]

        // Check if it's a working day
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

        // Build position filter - default to SA, BA, PG
        const positionCodes = filters?.positionCodes || ['SA', 'BA', 'PG']

        // 1. Get Employee count for capacity calculation
        let employeeQuery = `
            SELECT COUNT(DISTINCT e.id) as emp_count
            FROM pms.employees e
            LEFT JOIN pms.positions p ON e.position_id = p.id
            WHERE e.is_active = 1
            AND (
                p.name LIKE '%System Analyst%' OR
                p.name LIKE '%Business Analyst%' OR
                p.name LIKE '%Programmer%' OR
                p.name LIKE '%Developer%'
            )
        `

        if (filters?.employeeIds && filters.employeeIds.length > 0) {
            employeeQuery += ` AND e.id IN ('${filters.employeeIds.join("','")}')`
        }

        const empCountResult = await pool.request().query(employeeQuery)
        const employeeCount = empCountResult.recordset[0]?.emp_count || 0

        // 2. Calculate total capacity
        const hoursPerDay = config?.workingHoursPerDay || 7
        const totalCapacityHours = isWeekend ? 0 : employeeCount * hoursPerDay

        // 3. Get all tasks for this date
        let taskQuery = `
            SELECT
                t.id,
                t.task_code,
                t.title,
                p.id as project_id,
                p.project_code,
                p.name as project_name,
                s.id as story_id,
                s.story_code,
                s.title as story_title,
                ISNULL(t.estimated_hours, 0) as estimated_hours,
                t.priority,
                t.status,
                t.assignee_id,
                ISNULL(NULLIF(CONCAT(assignee.first_name_th, ' ', assignee.last_name_th), ' '),
                       CONCAT(assignee.first_name, ' ', assignee.last_name)) as assignee_name,
                CASE
                    WHEN pos.name LIKE '%System Analyst%' THEN 'SA'
                    WHEN pos.name LIKE '%Business Analyst%' THEN 'BA'
                    WHEN pos.name LIKE '%Programmer%' OR pos.name LIKE '%Developer%' THEN 'PG'
                    ELSE 'Other'
                END as assignee_position_code,
                t.reviewer_id,
                ISNULL(NULLIF(CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th), ' '),
                       CONCAT(reviewer.first_name, ' ', reviewer.last_name)) as reviewer_name,
                CASE WHEN t.due_date IS NOT NULL AND t.assignee_id IS NOT NULL THEN 1 ELSE 0 END as is_planned,
                CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END as is_completed
            FROM pms.tasks t
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.projects p ON s.project_id = p.id
            LEFT JOIN pms.employees assignee ON t.assignee_id = assignee.id
            LEFT JOIN pms.positions pos ON assignee.position_id = pos.id
            LEFT JOIN pms.employees reviewer ON t.reviewer_id = reviewer.id
            WHERE t.is_active = 1
              AND t.due_date = @targetDate
              AND t.status NOT IN ('cancelled')
        `

        // Filter by project
        if (filters?.projectIds && filters.projectIds.length > 0) {
            taskQuery += ` AND p.id IN ('${filters.projectIds.join("','")}')`
        }

        // Filter by position (assignee's position)
        if (positionCodes.length > 0) {
            const positionConditions = positionCodes.map(code => {
                switch (code) {
                    case 'SA': return "pos.name LIKE '%System Analyst%'"
                    case 'BA': return "pos.name LIKE '%Business Analyst%'"
                    case 'PG': return "(pos.name LIKE '%Programmer%' OR pos.name LIKE '%Developer%')"
                    default: return '1=0'
                }
            }).join(' OR ')
            taskQuery += ` AND (${positionConditions} OR t.assignee_id IS NULL)`
        }

        // Filter by specific employees
        if (filters?.employeeIds && filters.employeeIds.length > 0) {
            taskQuery += ` AND t.assignee_id IN ('${filters.employeeIds.join("','")}')`
        }

        taskQuery += ` ORDER BY
            CASE t.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            p.project_code,
            t.task_code
        `

        const tasksResult = await pool.request()
            .input('targetDate', sql.Date, targetDate)
            .query(taskQuery)

        const tasks: DailyTaskItem[] = tasksResult.recordset.map(row => ({
            id: row.id,
            task_code: row.task_code,
            title: row.title,
            project_id: row.project_id,
            project_code: row.project_code,
            project_name: row.project_name,
            story_id: row.story_id,
            story_code: row.story_code,
            story_title: row.story_title,
            estimated_hours: row.estimated_hours || 0,
            priority: row.priority,
            status: row.status,
            assignee_id: row.assignee_id,
            assignee_name: row.assignee_name,
            assignee_position_code: row.assignee_position_code,
            reviewer_id: row.reviewer_id,
            reviewer_name: row.reviewer_name,
            is_planned: !!row.is_planned,
            is_completed: !!row.is_completed
        }))

        // 4. Calculate booked hours (sum of estimated_hours for all tasks on this date)
        const bookedHours = tasks.reduce((sum, t) => sum + t.estimated_hours, 0)
        const remainingHours = Math.max(0, totalCapacityHours - bookedHours)

        return {
            success: true,
            data: {
                date,
                day_name: dayName,
                total_capacity_hours: totalCapacityHours,
                booked_hours: bookedHours,
                remaining_hours: remainingHours,
                tasks
            }
        }

    } catch (error: any) {
        console.error('getDailyWorkload error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET WORKLOAD SUMMARY BY POSITION
// ============================================

export async function getWorkloadByPosition(
    date: string
): Promise<{ success: boolean; data: PositionWorkloadSummary[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()
        const configResult = await getWorkloadConfig()
        const config = configResult.data

        const targetDate = new Date(date)
        const dayOfWeek = targetDate.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const hoursPerDay = config?.workingHoursPerDay || 7

        const query = `
            SELECT
                CASE
                    WHEN pos.name LIKE '%System Analyst%' THEN 'SA'
                    WHEN pos.name LIKE '%Business Analyst%' THEN 'BA'
                    WHEN pos.name LIKE '%Programmer%' OR pos.name LIKE '%Developer%' THEN 'PG'
                    ELSE 'Other'
                END as position_code,
                pos.name as position_name,
                COUNT(DISTINCT e.id) as employee_count,
                ISNULL(SUM(t.estimated_hours), 0) as booked_hours
            FROM pms.employees e
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            LEFT JOIN pms.tasks t ON t.assignee_id = e.id
                AND t.due_date = @targetDate
                AND t.status NOT IN ('cancelled', 'done', 'done_not_planned')
            WHERE e.is_active = 1
            AND (
                pos.name LIKE '%System Analyst%' OR
                pos.name LIKE '%Business Analyst%' OR
                pos.name LIKE '%Programmer%' OR
                pos.name LIKE '%Developer%'
            )
            GROUP BY
                CASE
                    WHEN pos.name LIKE '%System Analyst%' THEN 'SA'
                    WHEN pos.name LIKE '%Business Analyst%' THEN 'BA'
                    WHEN pos.name LIKE '%Programmer%' OR pos.name LIKE '%Developer%' THEN 'PG'
                    ELSE 'Other'
                END,
                pos.name
            ORDER BY position_code
        `

        const result = await pool.request()
            .input('targetDate', sql.Date, targetDate)
            .query(query)

        const data: PositionWorkloadSummary[] = result.recordset.map(row => ({
            position_code: row.position_code,
            position_name: row.position_name || row.position_code,
            employee_count: row.employee_count || 0,
            total_capacity_hours: isWeekend ? 0 : (row.employee_count || 0) * hoursPerDay,
            booked_hours: row.booked_hours || 0,
            remaining_hours: isWeekend ? 0 : Math.max(0, ((row.employee_count || 0) * hoursPerDay) - (row.booked_hours || 0))
        }))

        return { success: true, data }

    } catch (error: any) {
        console.error('getWorkloadByPosition error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET TASKS BY REVIEWER (SA ที่เปิด Task)
// ============================================

export async function getTasksByReviewer(
    date: string,
    reviewerId?: string
): Promise<{ success: boolean; data: DailyTaskItem[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()
        const targetDate = new Date(date)

        let query = `
            SELECT
                t.id,
                t.task_code,
                t.title,
                p.id as project_id,
                p.project_code,
                p.name as project_name,
                s.id as story_id,
                s.story_code,
                s.title as story_title,
                ISNULL(t.estimated_hours, 0) as estimated_hours,
                t.priority,
                t.status,
                t.assignee_id,
                ISNULL(NULLIF(CONCAT(assignee.first_name_th, ' ', assignee.last_name_th), ' '),
                       CONCAT(assignee.first_name, ' ', assignee.last_name)) as assignee_name,
                CASE
                    WHEN pos.name LIKE '%System Analyst%' THEN 'SA'
                    WHEN pos.name LIKE '%Business Analyst%' THEN 'BA'
                    WHEN pos.name LIKE '%Programmer%' OR pos.name LIKE '%Developer%' THEN 'PG'
                    ELSE 'Other'
                END as assignee_position_code,
                t.reviewer_id,
                ISNULL(NULLIF(CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th), ' '),
                       CONCAT(reviewer.first_name, ' ', reviewer.last_name)) as reviewer_name,
                CASE WHEN t.due_date IS NOT NULL AND t.assignee_id IS NOT NULL THEN 1 ELSE 0 END as is_planned,
                CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END as is_completed
            FROM pms.tasks t
            INNER JOIN pms.stories s ON t.story_id = s.id
            INNER JOIN pms.projects p ON s.project_id = p.id
            LEFT JOIN pms.employees assignee ON t.assignee_id = assignee.id
            LEFT JOIN pms.positions pos ON assignee.position_id = pos.id
            LEFT JOIN pms.employees reviewer ON t.reviewer_id = reviewer.id
            WHERE t.is_active = 1
              AND t.due_date = @targetDate
              AND t.status NOT IN ('cancelled')
        `

        if (reviewerId) {
            query += ` AND t.reviewer_id = @reviewerId`
        }

        query += ` ORDER BY
            CASE t.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            p.project_code,
            t.task_code
        `

        const request = pool.request()
            .input('targetDate', sql.Date, targetDate)

        if (reviewerId) {
            request.input('reviewerId', sql.UniqueIdentifier, reviewerId)
        }

        const result = await request.query(query)

        const tasks: DailyTaskItem[] = result.recordset.map(row => ({
            id: row.id,
            task_code: row.task_code,
            title: row.title,
            project_id: row.project_id,
            project_code: row.project_code,
            project_name: row.project_name,
            story_id: row.story_id,
            story_code: row.story_code,
            story_title: row.story_title,
            estimated_hours: row.estimated_hours || 0,
            priority: row.priority,
            status: row.status,
            assignee_id: row.assignee_id,
            assignee_name: row.assignee_name,
            assignee_position_code: row.assignee_position_code,
            reviewer_id: row.reviewer_id,
            reviewer_name: row.reviewer_name,
            is_planned: !!row.is_planned,
            is_completed: !!row.is_completed
        }))

        return { success: true, data: tasks }

    } catch (error: any) {
        console.error('getTasksByReviewer error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET PROJECTS FOR FILTER
// ============================================

export async function getProjectsForDailyWorkload(): Promise<{
    success: boolean
    data: { id: string; project_code: string; name: string }[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                p.id,
                p.project_code,
                p.name
            FROM pms.projects p
            INNER JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE psc.code = 'active'
            ORDER BY p.project_code
        `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getProjectsForDailyWorkload error:', error)
        return { success: false, error: error.message, data: [] }
    }
}
