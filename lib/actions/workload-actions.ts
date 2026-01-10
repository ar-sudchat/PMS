'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { getWorkloadConfig } from './config-actions'

// ============================================
// TYPES
// ============================================

export interface DailyWorkload {
    work_date: string
    day_name: string
    assigned_hours: number
    capacity_hours: number
    available_hours: number
    workload_percent: number
    status: 'available' | 'warning' | 'full' | 'overload'
}

export interface EmployeeWorkload {
    employee_id: string
    employee_code: string
    employee_name: string
    nickname: string
    position_code: string
    position_name: string
    daily_workload: DailyWorkload[]
    average_workload_percent: number
    total_assigned_hours: number
    total_available_hours: number
}

export interface TaskSchedule {
    task_id: string
    task_code: string
    task_title: string
    task_type: string
    task_type_name: string
    task_type_color: string
    priority: string
    status: string
    start_date: string
    due_date: string
    estimated_hours: number
    hours_per_day: number
    project_code: string
    project_name: string
    story_code: string
}

// ============================================
// GET EMPLOYEE WORKLOAD FOR DATE RANGE
// ============================================

export async function getEmployeeWorkload(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; data: EmployeeWorkload | null; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const config = await getWorkloadConfig()
        const pool = await getConnection()

        // Get daily workload
        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, employeeId)
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(`
        SELECT 
          employee_id,
          employee_code,
          employee_name,
          nickname,
          position_code,
          position_name,
          work_date,
          day_name,
          assigned_hours,
          capacity_hours,
          available_hours,
          workload_percent
        FROM pms.vw_employee_daily_workload
        WHERE employee_id = @employeeId
          AND work_date BETWEEN @startDate AND @endDate
        ORDER BY work_date
      `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Employee not found', data: null }
        }

        const firstRow = result.recordset[0]
        const dailyWorkload: DailyWorkload[] = result.recordset.map(row => ({
            work_date: row.work_date,
            day_name: row.day_name,
            assigned_hours: parseFloat(row.assigned_hours) || 0,
            capacity_hours: parseFloat(row.capacity_hours) || config.data.workingHoursPerDay,
            available_hours: parseFloat(row.available_hours) || config.data.workingHoursPerDay,
            workload_percent: row.workload_percent || 0,
            status: getWorkloadStatus(row.workload_percent, config.data)
        }))

        const totalAssigned = dailyWorkload.reduce((sum, d) => sum + d.assigned_hours, 0)
        const totalAvailable = dailyWorkload.reduce((sum, d) => sum + d.available_hours, 0)
        const avgPercent = dailyWorkload.length > 0
            ? Math.round(dailyWorkload.reduce((sum, d) => sum + d.workload_percent, 0) / dailyWorkload.length)
            : 0

        return {
            success: true,
            data: {
                employee_id: firstRow.employee_id,
                employee_code: firstRow.employee_code,
                employee_name: firstRow.employee_name,
                nickname: firstRow.nickname,
                position_code: firstRow.position_code,
                position_name: firstRow.position_name,
                daily_workload: dailyWorkload,
                average_workload_percent: avgPercent,
                total_assigned_hours: totalAssigned,
                total_available_hours: totalAvailable
            }
        }

    } catch (error: any) {
        console.error('getEmployeeWorkload error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET ALL EMPLOYEES WORKLOAD FOR DATE RANGE
// ============================================

export async function getTeamWorkloadForDateRange(
    startDate: string,
    endDate: string
): Promise<{ success: boolean; data: EmployeeWorkload[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const config = await getWorkloadConfig()
        const pool = await getConnection()

        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(`
        SELECT
          employee_id,
          employee_code,
          employee_name,
          nickname,
          position_code,
          position_name,
          work_date,
          day_name,
          assigned_hours,
          capacity_hours,
          available_hours,
          workload_percent
        FROM pms.vw_employee_daily_workload
        WHERE work_date BETWEEN @startDate AND @endDate
          AND position_code IN ('SA', 'BA', 'PG')
        ORDER BY position_code, employee_name, work_date
      `)

        // Group by employee
        const employeeMap = new Map<string, EmployeeWorkload>()

        for (const row of result.recordset) {
            if (!employeeMap.has(row.employee_id)) {
                employeeMap.set(row.employee_id, {
                    employee_id: row.employee_id,
                    employee_code: row.employee_code,
                    employee_name: row.employee_name,
                    nickname: row.nickname,
                    position_code: row.position_code,
                    position_name: row.position_name,
                    daily_workload: [],
                    average_workload_percent: 0,
                    total_assigned_hours: 0,
                    total_available_hours: 0
                })
            }

            const emp = employeeMap.get(row.employee_id)!
            emp.daily_workload.push({
                work_date: row.work_date,
                day_name: row.day_name,
                assigned_hours: parseFloat(row.assigned_hours) || 0,
                capacity_hours: parseFloat(row.capacity_hours) || config.data.workingHoursPerDay,
                available_hours: parseFloat(row.available_hours) || config.data.workingHoursPerDay,
                workload_percent: row.workload_percent || 0,
                status: getWorkloadStatus(row.workload_percent, config.data)
            })
        }

        // Calculate totals
        const employees: EmployeeWorkload[] = []
        for (const emp of employeeMap.values()) {
            emp.total_assigned_hours = emp.daily_workload.reduce((sum, d) => sum + d.assigned_hours, 0)
            emp.total_available_hours = emp.daily_workload.reduce((sum, d) => sum + d.available_hours, 0)
            emp.average_workload_percent = emp.daily_workload.length > 0
                ? Math.round(emp.daily_workload.reduce((sum, d) => sum + d.workload_percent, 0) / emp.daily_workload.length)
                : 0
            employees.push(emp)
        }

        // Sort by average workload (least busy first for assignment suggestion)
        employees.sort((a, b) => a.average_workload_percent - b.average_workload_percent)

        return { success: true, data: employees }

    } catch (error: any) {
        console.error('getTeamWorkloadForDateRange error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET EMPLOYEE TASKS FOR DATE RANGE
// ============================================

export async function getEmployeeTaskSchedule(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; data: TaskSchedule[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, employeeId)
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(`
        SELECT 
          task_id,
          task_code,
          task_title,
          task_type,
          task_type_name,
          task_type_color,
          task_type_icon,
          priority,
          status,
          start_date,
          due_date,
          estimated_hours,
          hours_per_day,
          project_code,
          project_name,
          story_code
        FROM pms.vw_employee_task_schedule
        WHERE employee_id = @employeeId
          AND (
            (start_date BETWEEN @startDate AND @endDate)
            OR (due_date BETWEEN @startDate AND @endDate)
            OR (start_date <= @startDate AND due_date >= @endDate)
          )
        ORDER BY start_date, priority
      `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getEmployeeTaskSchedule error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// CHECK WORKLOAD BEFORE ASSIGN
// ============================================

export async function checkWorkloadBeforeAssign(
    employeeId: string,
    startDate: string,
    endDate: string,
    estimatedHours: number
): Promise<{
    success: boolean
    canAssign: boolean
    warning: string | null
    dailyImpact: DailyWorkload[]
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, canAssign: false, warning: 'Unauthorized', dailyImpact: [], error: 'Unauthorized' }
        }

        const config = await getWorkloadConfig()
        const workloadResult = await getEmployeeWorkload(employeeId, startDate, endDate)

        if (!workloadResult.success || !workloadResult.data) {
            return { success: false, canAssign: false, warning: 'Cannot get workload', dailyImpact: [], error: workloadResult.error }
        }

        const dailyWorkload = workloadResult.data.daily_workload
        const workingDays = dailyWorkload.length
        const hoursPerDay = workingDays > 0 ? estimatedHours / workingDays : estimatedHours

        // Calculate impact
        const dailyImpact: DailyWorkload[] = dailyWorkload.map(day => {
            const newAssigned = day.assigned_hours + hoursPerDay
            const newPercent = Math.round((newAssigned / day.capacity_hours) * 100)
            return {
                ...day,
                assigned_hours: newAssigned,
                available_hours: day.capacity_hours - newAssigned,
                workload_percent: newPercent,
                status: getWorkloadStatus(newPercent, config.data)
            }
        })

        // Check if any day is overloaded
        const overloadedDays = dailyImpact.filter(d => d.status === 'overload')
        const fullDays = dailyImpact.filter(d => d.status === 'full')
        const warningDays = dailyImpact.filter(d => d.status === 'warning')

        let warning: string | null = null
        let canAssign = true

        if (overloadedDays.length > 0) {
            warning = `⚠️ Overload ${overloadedDays.length} วัน - งานเกินกำลัง!`
            canAssign = true // Still allow but with warning
        } else if (fullDays.length > 0) {
            warning = `🔴 เต็ม ${fullDays.length} วัน`
            canAssign = true
        } else if (warningDays.length > 0) {
            warning = `🟡 ใกล้เต็ม ${warningDays.length} วัน`
            canAssign = true
        }

        return {
            success: true,
            canAssign,
            warning,
            dailyImpact
        }

    } catch (error: any) {
        console.error('checkWorkloadBeforeAssign error:', error)
        return { success: false, canAssign: false, warning: error.message, dailyImpact: [], error: error.message }
    }
}

// ============================================
// GET BEST ASSIGNEE SUGGESTION
// ============================================

export async function suggestBestAssignee(
    startDate: string,
    endDate: string,
    estimatedHours: number,
    excludeEmployeeIds?: string[]
): Promise<{ success: boolean; data: { employee: EmployeeWorkload; reason: string }[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const teamResult = await getTeamWorkloadForDateRange(startDate, endDate)

        if (!teamResult.success) {
            return { success: false, error: teamResult.error, data: [] }
        }

        // Filter and sort
        let candidates = teamResult.data

        if (excludeEmployeeIds && excludeEmployeeIds.length > 0) {
            candidates = candidates.filter(e => !excludeEmployeeIds.includes(e.employee_id))
        }

        // Sort by average workload (least busy first)
        candidates.sort((a, b) => a.average_workload_percent - b.average_workload_percent)

        // Return top 3 suggestions with reasons
        const suggestions = candidates.slice(0, 3).map(emp => {
            let reason = ''
            if (emp.average_workload_percent < 30) {
                reason = '✅ ว่างมาก - Workload ต่ำ'
            } else if (emp.average_workload_percent < 70) {
                reason = '✅ ว่าง - มี Capacity เพียงพอ'
            } else if (emp.average_workload_percent < 100) {
                reason = '⚠️ ค่อนข้างเต็ม - ยังรับได้'
            } else {
                reason = '🔴 เต็มแล้ว - ควรเลือกคนอื่น'
            }

            return { employee: emp, reason }
        })

        return { success: true, data: suggestions }

    } catch (error: any) {
        console.error('suggestBestAssignee error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWorkloadStatus(
    percent: number,
    config: { workloadWarningPercent: number; workloadFullPercent: number }
): 'available' | 'warning' | 'full' | 'overload' {
    if (percent > config.workloadFullPercent) return 'overload'
    if (percent >= config.workloadFullPercent) return 'full'
    if (percent >= config.workloadWarningPercent) return 'warning'
    return 'available'
}
