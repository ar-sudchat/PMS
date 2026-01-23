'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns'

// Types
export interface EmployeeForReport {
  id: string
  name: string
  nickname: string | null
  role: string
}

export interface EmployeeWorkSummary {
  employee_id: string
  employee_name: string
  period_start: string
  period_end: string
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  todo_tasks: number
  total_hours_logged: number
  completion_rate: number
}

export interface WeeklyHours {
  week_number: number
  week_start: string
  week_end: string
  daily_hours: number[]  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  total_hours: number
  target_hours: number   // 35
}

export interface TaskRow {
  task_id: string
  project_code: string
  project_name: string
  task_code: string
  task_title: string
  task_type: string
  status: string
  estimated_hours: number
  actual_hours: number
  due_date: string | null
  is_overdue: boolean
}

export interface TaskTypeBreakdown {
  task_type: string
  task_type_name: string
  hours: number
  percentage: number
  is_defect: boolean
}

export interface ProjectBreakdown {
  project_id: string
  project_code: string
  project_name: string
  hours: number
  percentage: number
}

// Get employees for dropdown
export async function getEmployeesForReport(): Promise<EmployeeForReport[]> {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT
        e.id,
        COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS name,
        e.nickname,
        ISNULL(p.name, 'Staff') AS role
      FROM pms.employees e
      LEFT JOIN pms.positions p ON e.position_id = p.id
      WHERE e.is_active = 1
      ORDER BY e.first_name_th, e.first_name
    `)
    return result.recordset
  } catch (error) {
    console.error('Error fetching employees for report:', error)
    return []
  }
}

// Get employee work summary - นับจาก assignee_id (คนที่ถูกจ่ายงาน)
export async function getEmployeeWorkSummary(
  employeeId: string,
  year: number,
  month: number
): Promise<EmployeeWorkSummary | null> {
  try {
    const pool = await getConnection()
    const periodStart = startOfMonth(new Date(year, month - 1))
    const periodEnd = endOfMonth(new Date(year, month - 1))

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('periodStart', sql.Date, format(periodStart, 'yyyy-MM-dd'))
      .input('periodEnd', sql.Date, format(periodEnd, 'yyyy-MM-dd'))
      .query(`
        SELECT
          e.id AS employee_id,
          COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,

          -- Total Tasks = tasks ที่ assignee_id = employee และมี due_date หรือ created_at ใน period
          (SELECT COUNT(*)
           FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
             AND t.is_active = 1
             AND t.status <> 'cancelled'
             AND (
               (t.due_date BETWEEN @periodStart AND @periodEnd)
               OR (t.created_at BETWEEN @periodStart AND @periodEnd)
               OR (t.status IN ('in_progress', 'review') AND t.due_date IS NULL)
             )
          ) AS total_tasks,

          -- Completed = tasks ที่ assignee และ status = done/done_not_planned และ completed ใน period
          (SELECT COUNT(*)
           FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
             AND t.is_active = 1
             AND t.status IN ('done', 'done_not_planned')
             AND (
               t.completed_date BETWEEN @periodStart AND @periodEnd
               OR (t.completed_date IS NULL AND t.updated_at BETWEEN @periodStart AND @periodEnd)
             )
          ) AS completed_tasks,

          -- In Progress = tasks ที่ assignee และ status = in_progress
          (SELECT COUNT(*)
           FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
             AND t.is_active = 1
             AND t.status = 'in_progress'
          ) AS in_progress_tasks,

          -- To Do = tasks ที่ assignee และ status = todo, backlog, review
          (SELECT COUNT(*)
           FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
             AND t.is_active = 1
             AND t.status IN ('todo', 'backlog', 'review')
          ) AS todo_tasks,

          -- Hours logged in period (ยังคงนับจาก timesheet ของ employee)
          ISNULL((
            SELECT SUM(hours) FROM pms.timesheet_entries
            WHERE employee_id = @employeeId AND is_active = 1
            AND entry_date BETWEEN @periodStart AND @periodEnd
          ), 0) AS total_hours_logged

        FROM pms.employees e
        WHERE e.id = @employeeId
      `)

    if (result.recordset.length === 0) return null

    const data = result.recordset[0]
    const completionRate = data.total_tasks > 0
      ? Math.round((data.completed_tasks / data.total_tasks) * 100)
      : 0

    return {
      employee_id: data.employee_id,
      employee_name: data.employee_name,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      total_tasks: data.total_tasks,
      completed_tasks: data.completed_tasks,
      in_progress_tasks: data.in_progress_tasks,
      todo_tasks: data.todo_tasks,
      total_hours_logged: data.total_hours_logged,
      completion_rate: completionRate
    }
  } catch (error) {
    console.error('Error fetching employee work summary:', error)
    return null
  }
}

// Get weekly hours breakdown
export async function getEmployeeWeeklyHours(
  employeeId: string,
  year: number,
  month: number
): Promise<WeeklyHours[]> {
  try {
    const pool = await getConnection()
    const periodStart = startOfMonth(new Date(year, month - 1))
    const periodEnd = endOfMonth(new Date(year, month - 1))

    // Get all daily entries for the month
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('periodStart', sql.Date, format(periodStart, 'yyyy-MM-dd'))
      .input('periodEnd', sql.Date, format(periodEnd, 'yyyy-MM-dd'))
      .query(`
        SELECT 
          entry_date,
          SUM(hours) AS total_hours
        FROM pms.timesheet_entries 
        WHERE employee_id = @employeeId 
          AND is_active = 1
          AND entry_date BETWEEN @periodStart AND @periodEnd
        GROUP BY entry_date
        ORDER BY entry_date
      `)

    // Build hours map by date
    const hoursMap: Record<string, number> = {}
    result.recordset.forEach((row: any) => {
      const dateKey = row.entry_date.toISOString().split('T')[0]
      hoursMap[dateKey] = row.total_hours
    })

    // Generate weeks for the month
    const weeks: WeeklyHours[] = []
    let currentDate = startOfWeek(periodStart, { weekStartsOn: 1 }) // Monday start
    let weekNum = 1

    while (currentDate <= periodEnd) {
      const weekStart = currentDate
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

      const dailyHours: number[] = []
      let weekTotal = 0

      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i)
        const dateKey = format(day, 'yyyy-MM-dd')
        const hours = hoursMap[dateKey] || 0
        dailyHours.push(hours)
        weekTotal += hours
      }

      weeks.push({
        week_number: weekNum,
        week_start: format(weekStart, 'yyyy-MM-dd'),
        week_end: format(weekEnd, 'yyyy-MM-dd'),
        daily_hours: dailyHours,
        total_hours: weekTotal,
        target_hours: 35
      })

      currentDate = addDays(weekEnd, 1)
      weekNum++

      // Stop if we've gone past the month
      if (weekStart > periodEnd) break
    }

    return weeks
  } catch (error) {
    console.error('Error fetching employee weekly hours:', error)
    return []
  }
}

// Get employee tasks - tasks ที่ถูก assign ให้ employee (assignee_id)
export async function getEmployeeTasks(
  employeeId: string,
  year: number,
  month: number,
  filters?: { status?: string; projectId?: string; taskType?: string }
): Promise<TaskRow[]> {
  try {
    const pool = await getConnection()
    const periodStart = startOfMonth(new Date(year, month - 1))
    const periodEnd = endOfMonth(new Date(year, month - 1))

    let query = `
      SELECT
        t.id AS task_id,
        p.project_code,
        p.name AS project_name,
        t.task_code,
        t.title AS task_title,
        ISNULL(t.task_type, 'other') AS task_type,
        t.status,
        ISNULL(t.estimated_hours, 0) AS estimated_hours,
        -- actual_hours รวมทั้งหมดของ task นี้
        ISNULL((
          SELECT SUM(hours) FROM pms.timesheet_entries
          WHERE task_id = t.id AND is_active = 1
        ), 0) AS actual_hours,
        t.due_date,
        CASE WHEN t.due_date < GETDATE() AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END AS is_overdue
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      WHERE t.assignee_id = @employeeId
        AND t.is_active = 1
        AND t.status <> 'cancelled'
        AND (
          (t.due_date BETWEEN @periodStart AND @periodEnd)
          OR (t.created_at BETWEEN @periodStart AND @periodEnd)
          OR (t.status IN ('in_progress', 'review', 'todo'))
        )
    `

    const request = pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('periodStart', sql.Date, format(periodStart, 'yyyy-MM-dd'))
      .input('periodEnd', sql.Date, format(periodEnd, 'yyyy-MM-dd'))

    if (filters?.status && filters.status !== 'all') {
      query += ` AND t.status = @status`
      request.input('status', sql.NVarChar, filters.status)
    }

    if (filters?.projectId && filters.projectId !== 'all') {
      query += ` AND p.id = @projectId`
      request.input('projectId', sql.UniqueIdentifier, filters.projectId)
    }

    if (filters?.taskType && filters.taskType !== 'all') {
      query += ` AND t.task_type = @taskType`
      request.input('taskType', sql.NVarChar, filters.taskType)
    }

    query += ` ORDER BY
          CASE t.status
            WHEN 'in_progress' THEN 1
            WHEN 'review' THEN 2
            WHEN 'todo' THEN 3
            WHEN 'done' THEN 4
            ELSE 5
          END,
          t.due_date,
          p.project_code,
          t.task_code`

    const result = await request.query(query)

    return result.recordset.map((row: any) => ({
      ...row,
      due_date: row.due_date?.toISOString?.()?.split('T')[0] || null,
      is_overdue: !!row.is_overdue
    }))
  } catch (error) {
    console.error('Error fetching employee tasks:', error)
    return []
  }
}

// Get hours breakdown by task type - จาก tasks ที่ถูก assign ให้ employee
export async function getHoursByTaskType(
  employeeId: string,
  year: number,
  month: number
): Promise<TaskTypeBreakdown[]> {
  try {
    const pool = await getConnection()
    const periodStart = startOfMonth(new Date(year, month - 1))
    const periodEnd = endOfMonth(new Date(year, month - 1))

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('periodStart', sql.Date, format(periodStart, 'yyyy-MM-dd'))
      .input('periodEnd', sql.Date, format(periodEnd, 'yyyy-MM-dd'))
      .query(`
        SELECT
          ISNULL(t.task_type, 'other') AS task_type,
          ISNULL(ttc.name, ISNULL(t.task_type, 'Other')) AS task_type_name,
          ISNULL(ttc.is_defect, 0) AS is_defect,
          COUNT(*) AS task_count,
          SUM(ISNULL(t.estimated_hours, 0)) AS hours
        FROM pms.tasks t
        LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
        WHERE t.assignee_id = @employeeId
          AND t.is_active = 1
          AND t.status <> 'cancelled'
          AND (
            (t.due_date BETWEEN @periodStart AND @periodEnd)
            OR (t.created_at BETWEEN @periodStart AND @periodEnd)
            OR (t.status IN ('in_progress', 'review', 'todo'))
          )
        GROUP BY t.task_type, ttc.name, ttc.is_defect
        ORDER BY COUNT(*) DESC
      `)

    const total = result.recordset.reduce((sum: number, row: any) => sum + row.task_count, 0)

    return result.recordset.map((row: any) => ({
      task_type: row.task_type,
      task_type_name: row.task_type_name,
      hours: row.task_count, // ใช้จำนวน tasks แทน hours
      percentage: total > 0 ? Math.round((row.task_count / total) * 100) : 0,
      is_defect: !!row.is_defect
    }))
  } catch (error) {
    console.error('Error fetching hours by task type:', error)
    return []
  }
}

// Get hours breakdown by project - จาก tasks ที่ถูก assign ให้ employee
export async function getHoursByProject(
  employeeId: string,
  year: number,
  month: number
): Promise<ProjectBreakdown[]> {
  try {
    const pool = await getConnection()
    const periodStart = startOfMonth(new Date(year, month - 1))
    const periodEnd = endOfMonth(new Date(year, month - 1))

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('periodStart', sql.Date, format(periodStart, 'yyyy-MM-dd'))
      .input('periodEnd', sql.Date, format(periodEnd, 'yyyy-MM-dd'))
      .query(`
        SELECT
          p.id AS project_id,
          p.project_code,
          p.name AS project_name,
          COUNT(*) AS task_count,
          SUM(ISNULL(t.estimated_hours, 0)) AS hours
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        WHERE t.assignee_id = @employeeId
          AND t.is_active = 1
          AND t.status <> 'cancelled'
          AND (
            (t.due_date BETWEEN @periodStart AND @periodEnd)
            OR (t.created_at BETWEEN @periodStart AND @periodEnd)
            OR (t.status IN ('in_progress', 'review', 'todo'))
          )
        GROUP BY p.id, p.project_code, p.name
        ORDER BY COUNT(*) DESC
      `)

    const total = result.recordset.reduce((sum: number, row: any) => sum + row.task_count, 0)

    return result.recordset.map((row: any) => ({
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      hours: row.task_count, // ใช้จำนวน tasks แทน hours
      percentage: total > 0 ? Math.round((row.task_count / total) * 100) : 0
    }))
  } catch (error) {
    console.error('Error fetching hours by project:', error)
    return []
  }
}
