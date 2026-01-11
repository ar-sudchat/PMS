'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
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
    tasks: {
        id: string
        task_code: string
        title: string
        estimated_hours: number
        due_date: string
        priority: string
        status: string
        project_code: string
        project_name: string
        milestone_locked: boolean
    }[]
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
    image_url?: string
}

export interface TaskSchedule {
    task_id: string
    task_code: string
    task_title: string
    task_type: string
    task_type_name: string
    task_type_color: string
    task_type_icon: string
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
    // Reuse the team logic for consistency or keep separate if simplified view needed. 
    // For now, let's keep it but ideally it should fetch tasks too.
    // Updating to use similar logic to team query for consistency
    try {
        const teamResult = await getTeamWorkloadForDateRange(startDate, endDate, { employeeIds: [employeeId] })
        if (teamResult.success && teamResult.data.length > 0) {
            return { success: true, data: teamResult.data[0] }
        }
        return { success: false, error: 'Employee not found', data: null }
    } catch (error: any) {
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET ALL EMPLOYEES WORKLOAD FOR DATE RANGE
// ============================================

export async function getTeamWorkloadForDateRange(
    startDate: string,
    endDate: string,
    filters?: { roles?: string[]; employeeIds?: string[] }
): Promise<{ success: boolean; data: EmployeeWorkload[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const configConfig = await getWorkloadConfig()
        const pool = await getConnection()
        const config = configConfig.data

        // 1. Get Employees basic info first
        let employeeQuery = `
            SELECT 
                e.id as employee_id,
                e.employee_code,
                ISNULL(e.first_name, '') + ' ' + ISNULL(e.last_name, '') as employee_name,
                e.nickname,
                CASE 
                    WHEN r.name LIKE '%System Analyst%' THEN 'SA'
                    WHEN r.name LIKE '%Business Analyst%' THEN 'BA'
                    WHEN r.name LIKE '%Programmer%' OR r.name LIKE '%Developer%' THEN 'PG'
                    WHEN r.name LIKE '%Quality Assurance%' OR r.name LIKE '%QA%' THEN 'QA'
                    WHEN r.name LIKE '%Manager%' OR r.name LIKE '%Project Manager%' THEN 'PM'
                    ELSE 'Other'
                END as position_code,
                r.name as position_name
            FROM pms.employees e
            LEFT JOIN pms.positions r ON e.position_id = r.id
            WHERE e.is_active = 1
        `

        if (filters?.roles && filters.roles.length > 0) {
            // Note: This filter logic might need adjustment if passing codes like 'SA'
            // For now, let's assume we fetch all and filter in memory or ignore this complex mapping for inputs
            // Since UI sends no filters, this is fine.
            // If we needed to support input 'SA', we'd need to map back to 'System Analyst'
            employeeQuery += ` AND (
                (r.name LIKE '%System Analyst%' AND 'SA' IN ('${filters.roles.join("','")}')) OR
                (r.name LIKE '%Business Analyst%' AND 'BA' IN ('${filters.roles.join("','")}')) OR
                ((r.name LIKE '%Programmer%' OR r.name LIKE '%Developer%') AND 'PG' IN ('${filters.roles.join("','")}')) OR
                ('SA' NOT IN ('${filters.roles.join("','")}') AND 'BA' NOT IN ('${filters.roles.join("','")}') AND 'PG' NOT IN ('${filters.roles.join("','")}')) 
             )`
        } else {
            // Default "All Roles": Filter to only SA, BA, PG
            employeeQuery += ` AND (
                r.name LIKE '%System Analyst%' OR
                r.name LIKE '%Business Analyst%' OR
                r.name LIKE '%Programmer%' OR 
                r.name LIKE '%Developer%'
             )`
        }

        if (filters?.employeeIds && filters.employeeIds.length > 0) {
            employeeQuery += ` AND e.id IN ('${filters.employeeIds.join("','")}')`
        }

        employeeQuery += ` ORDER BY r.name, e.first_name`

        const employeeResult = await pool.request().query(employeeQuery)
        const employeesRaw = employeeResult.recordset

        // 2. Get Tasks for these employees in date range
        let tasks: any[] = []

        if (employeesRaw.length > 0) {
            const employeeIds = employeesRaw.map((e: any) => `'${e.employee_id}'`).join(',')

            // Note: Using LEFT JOIN to get all tasks assigned to these employees in range
            const taskQuery = `
                SELECT 
                    t.id,
                    t.task_code,
                    t.title,
                    t.estimated_hours,
                    t.due_date,
                    t.status,
                    t.priority,
                    t.assignee_id,
                    p.project_code,
                    p.name as project_name,
                    ISNULL(pm.is_locked, 0) as milestone_locked
                FROM pms.tasks t
                LEFT JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.projects p ON s.project_id = p.id
                LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                WHERE t.assignee_id IN (${employeeIds})
                  AND t.due_date BETWEEN @startDate AND @endDate
                  AND t.status NOT IN ('done', 'cancelled')
            `

            const tasksResult = await pool.request()
                .input('startDate', sql.Date, new Date(startDate))
                .input('endDate', sql.Date, new Date(endDate))
                .query(taskQuery)

            tasks = tasksResult.recordset
        }

        // 3. Generate Date Range
        const dates: Date[] = []
        let currentDate = new Date(startDate)
        const end = new Date(endDate)
        while (currentDate <= end) {
            dates.push(new Date(currentDate))
            currentDate.setDate(currentDate.getDate() + 1)
        }

        // 4. Construct Result
        const employeeWorkloads: EmployeeWorkload[] = employeesRaw.map(emp => {
            const dailyWorkload: DailyWorkload[] = dates.map(date => {
                const dateStr = date.toISOString().split('T')[0]
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

                // Filter tasks for this employee and date
                const dayTasks = tasks.filter((t: any) =>
                    t.assignee_id === emp.employee_id &&
                    new Date(t.due_date).toISOString().split('T')[0] === dateStr
                ).map((t: any) => ({
                    id: t.id,
                    task_code: t.task_code,
                    title: t.title,
                    estimated_hours: t.estimated_hours || 0,
                    due_date: new Date(t.due_date).toISOString().split('T')[0],
                    priority: t.priority,
                    status: t.status,
                    project_code: t.project_code,
                    project_name: t.project_name,
                    milestone_locked: !!t.milestone_locked
                }))

                const assignedHours = dayTasks.reduce((sum: number, t: any) => sum + t.estimated_hours, 0)

                // Check if weekend (Sat=6, Sun=0) - Simple logic, can be enhanced with config
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const capacityHours = isWeekend ? 0 : config.workingHoursPerDay

                const workloadPercent = capacityHours > 0 ? Math.round((assignedHours / capacityHours) * 100) : (assignedHours > 0 ? 100 : 0)

                return {
                    work_date: dateStr,
                    day_name: dayName,
                    assigned_hours: assignedHours,
                    capacity_hours: capacityHours,
                    available_hours: Math.max(0, capacityHours - assignedHours),
                    workload_percent: workloadPercent,
                    status: getWorkloadStatus(workloadPercent, config),
                    tasks: dayTasks
                }
            })

            const totalAssigned = dailyWorkload.reduce((sum, d) => sum + d.assigned_hours, 0)
            const totalAvailable = dailyWorkload.reduce((sum, d) => sum + d.available_hours, 0)
            // Avg only working days? Or all days? Let's do working days (capacity > 0)
            const workingDays = dailyWorkload.filter(d => d.capacity_hours > 0)
            const avgPercent = workingDays.length > 0
                ? Math.round(workingDays.reduce((sum, d) => sum + d.workload_percent, 0) / workingDays.length)
                : 0

            return {
                employee_id: emp.employee_id,
                employee_code: emp.employee_code,
                employee_name: emp.employee_name,
                nickname: emp.nickname,
                position_code: emp.position_code,
                position_name: emp.position_name,
                image_url: undefined,
                daily_workload: dailyWorkload,
                average_workload_percent: avgPercent,
                total_assigned_hours: totalAssigned,
                total_available_hours: totalAvailable
            }
        })

        // Sort by average workload (least busy first)
        employeeWorkloads.sort((a, b) => a.average_workload_percent - b.average_workload_percent)

        return { success: true, data: employeeWorkloads }

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
// REASSIGN TASK (DRAG & DROP)
// ============================================

export async function reassignTask(
    taskId: string,
    newAssigneeId: string,
    newDueDate: string,
    reason?: string,
    note?: string
): Promise<{ success: boolean; error?: string; warning?: string }> {
    try {
        const pool = await getConnection()
        const user = await getCurrentUser()

        // 1. Get Task & Milestone Info
        const taskResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT t.id, t.title, t.estimated_hours, pm.is_locked, 
                       s.project_id, p.name as project_name, 
                       t.assignee_id as old_assignee_id
                FROM pms.tasks t
                LEFT JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.projects p ON s.project_id = p.id
                LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                WHERE t.id = @taskId
            `)

        if (taskResult.recordset.length === 0) {
            return { success: false, error: 'Task not found' }
        }

        const task = taskResult.recordset[0]

        // 2. Check Lock
        if (task.is_locked) {
            return { success: false, error: 'Cannot move task: Milestone is locked.' }
        }

        // 3. Check Target Workload
        const configConfig = await getWorkloadConfig()
        const config = configConfig.data

        const workloadResult = await pool.request()
            .input('assigneeId', sql.UniqueIdentifier, newAssigneeId)
            .input('date', sql.Date, new Date(newDueDate))
            .query(`
                SELECT SUM(estimated_hours) as current_hours
                FROM pms.tasks
                WHERE assignee_id = @assigneeId
                  AND due_date = @date
                  AND status NOT IN ('done', 'cancelled')
                  AND id != @taskId
            `)

        const currentHours = workloadResult.recordset[0].current_hours || 0
        const newTotal = currentHours + task.estimated_hours

        let warning: string | undefined
        if (newTotal > config.workingHoursPerDay) {
            warning = `Assignee will be overloaded (${newTotal}h / ${config.workingHoursPerDay}h)`
        }

        // 4. Update Task
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .input('assigneeId', sql.UniqueIdentifier, newAssigneeId)
            .input('dueDate', sql.Date, new Date(newDueDate))
            .query(`
                UPDATE pms.tasks
                SET assignee_id = @assigneeId, due_date = @dueDate, updated_at = GETDATE()
                WHERE id = @taskId
            `)

        // 5. Create Notification (Simulated/Log)
        // In a real system, insert into pms.notifications
        // For now, we will log it.
        console.log(`[Notification] Task '${task.title}' reassigned.`)
        console.log(`From: ${task.old_assignee_id} To: ${newAssigneeId}`)
        console.log(`By: ${user?.name} Reason: ${reason} Note: ${note}`)

        // If we had a notifications table:
        /*
        await pool.request()
            .input('userId', sql.UniqueIdentifier, task.old_assignee_id) // Notify old owner?
            .input('title', sql.NVarChar, 'Task Reassigned')
            .input('message', sql.NVarChar, `Task ${task.title} was reassigned. Reason: ${reason}`)
            .query('INSERT INTO pms.notifications ...')
        */

        revalidatePath('/projects/resource-planning')
        return { success: true, warning }

    } catch (error: any) {
        console.error('reassignTask error:', error)
        return { success: false, error: error.message }
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
