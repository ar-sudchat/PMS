'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

export interface TimesheetEntry {
  id: string
  employee_id: string
  entry_date: string
  task_id: string
  hours: number
  is_overtime: boolean
  description: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  task_code: string
  task_title: string
  task_type: string
  task_type_name: string
  task_type_color: string
  story_id: string
  story_code: string
  story_title: string
  milestone_id: string
  milestone_code: string
  milestone_name: string
  milestone_color: string
  project_id: string
  project_code: string
  project_name: string
}

export interface WeeklyTimesheetData {
  employee_id: string
  employee_code: string
  employee_name: string
  nickname: string
  position_code: string
  department_name: string
  entries: { [date: string]: TimesheetEntry[] }
  daily_totals: { [date: string]: number }
  total_hours: number
}

export async function getMyTimesheetEntries(startDate: string, endDate: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }
    
    return await getTimesheetEntries({
      employeeId: user.id,
      startDate,
      endDate
    })
  } catch (error: any) {
    console.error('getMyTimesheetEntries error:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getTimesheetEntries(filters: {
  employeeId?: string
  startDate: string
  endDate: string
  projectId?: string
  status?: string
}) {
  try {
    const pool = await getConnection()
    
    let query = `
      SELECT 
        te.id, te.employee_id, te.entry_date, te.task_id, te.hours,
        te.is_overtime, te.description, te.status, te.created_at,
        e.employee_code,
        CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
        e.nickname,
        pos.code AS position_code,
        t.task_code, t.title AS task_title, t.task_type,
        ttc.name_th AS task_type_name,
        ttc.color AS task_type_color,
        ttc.icon AS task_type_icon,
        s.id AS story_id, s.story_code, s.title AS story_title,
        pm.id AS milestone_id,
        mc.code AS milestone_code,
        mc.name AS milestone_name,
        mc.color AS milestone_color,
        p.id AS project_id,
        p.project_code,
        p.name AS project_name
      FROM pms.timesheet_entries te
      INNER JOIN pms.employees e ON te.employee_id = e.id
      LEFT JOIN pms.positions pos ON e.position_id = pos.id
      INNER JOIN pms.tasks t ON te.task_id = t.id
      LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
      INNER JOIN pms.stories s ON t.story_id = s.id
      LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
      LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      WHERE te.is_active = 1
        AND te.entry_date BETWEEN @startDate AND @endDate
    `
    
    const request = pool.request()
    request.input('startDate', sql.Date, new Date(filters.startDate))
    request.input('endDate', sql.Date, new Date(filters.endDate))
    
    if (filters.employeeId) {
      query += ` AND te.employee_id = @employeeId`
      request.input('employeeId', sql.UniqueIdentifier, filters.employeeId)
    }
    
    if (filters.projectId) {
      query += ` AND p.id = @projectId`
      request.input('projectId', sql.UniqueIdentifier, filters.projectId)
    }
    
    if (filters.status) {
      query += ` AND te.status = @status`
      request.input('status', sql.NVarChar, filters.status)
    }
    
    query += ` ORDER BY te.entry_date, te.created_at`
    
    const result = await request.query(query)
    return { success: true, data: result.recordset }
  } catch (error: any) {
    console.error('getTimesheetEntries error:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getWeeklyTimesheetGrid(
  yearWeek: string,
  departmentId?: string,
  projectId?: string
) {
  try {
    const pool = await getConnection()
    
    const [year, week] = yearWeek.split('-W').map(Number)
    const jan4 = new Date(year, 0, 4)
    const dayOfWeek = jan4.getDay() || 7
    const weekStart = new Date(jan4)
    weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const startDateStr = weekStart.toISOString().split('T')[0]
    const endDateStr = weekEnd.toISOString().split('T')[0]
    
    let employeeQuery = `
      SELECT 
        e.id AS employee_id,
        e.employee_code,
        CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
        e.nickname,
        pos.code AS position_code,
        d.name AS department_name
      FROM pms.employees e
      LEFT JOIN pms.positions pos ON e.position_id = pos.id
      LEFT JOIN pms.departments d ON e.department_id = d.id
      WHERE e.is_active = 1
    `
    
    const empRequest = pool.request()
    
    if (departmentId) {
      employeeQuery += ` AND e.department_id = @departmentId`
      empRequest.input('departmentId', sql.UniqueIdentifier, departmentId)
    }
    
    employeeQuery += ` ORDER BY e.first_name_th`
    
    const employeesResult = await empRequest.query(employeeQuery)
    const employees = employeesResult.recordset
    
    const entriesResult = await getTimesheetEntries({
      startDate: startDateStr,
      endDate: endDateStr,
      projectId
    })
    
    const entries = entriesResult.data || []
    
    const weeklyData: WeeklyTimesheetData[] = employees.map((emp: any) => {
      const empEntries = entries.filter((e: any) => e.employee_id === emp.employee_id)
      
      const entriesByDate: { [date: string]: TimesheetEntry[] } = {}
      const dailyTotals: { [date: string]: number } = {}
      let totalHours = 0
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        entriesByDate[dateStr] = []
        dailyTotals[dateStr] = 0
      }
      
      empEntries.forEach((entry: any) => {
        const dateStr = new Date(entry.entry_date).toISOString().split('T')[0]
        if (entriesByDate[dateStr]) {
          entriesByDate[dateStr].push(entry)
          dailyTotals[dateStr] += entry.hours
          totalHours += entry.hours
        }
      })
      
      return {
        ...emp,
        entries: entriesByDate,
        daily_totals: dailyTotals,
        total_hours: totalHours
      }
    })
    
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    
    return {
      success: true,
      data: {
        year_week: yearWeek,
        week_start: startDateStr,
        week_end: endDateStr,
        dates,
        employees: weeklyData
      }
    }
  } catch (error: any) {
    console.error('getWeeklyTimesheetGrid error:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function createTimesheetEntry(data: {
  entry_date: string
  task_id: string
  hours: number
  is_overtime?: boolean
  description?: string
}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const pool = await getConnection()
    
    const existingCheck = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, user.id)
      .input('entryDate', sql.Date, new Date(data.entry_date))
      .input('taskId', sql.UniqueIdentifier, data.task_id)
      .query(`
        SELECT id FROM pms.timesheet_entries
        WHERE employee_id = @employeeId
          AND entry_date = @entryDate
          AND task_id = @taskId
          AND is_active = 1
      `)
    
    if (existingCheck.recordset.length > 0) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, existingCheck.recordset[0].id)
        .input('hours', sql.Decimal(4, 2), data.hours)
        .input('isOvertime', sql.Bit, data.is_overtime || false)
        .input('description', sql.NVarChar, data.description || null)
        .query(`
          UPDATE pms.timesheet_entries
          SET hours = @hours,
              is_overtime = @isOvertime,
              description = @description,
              updated_at = GETDATE()
          WHERE id = @id
        `)
      
      revalidatePath('/timesheet')
      return { success: true, data: { id: existingCheck.recordset[0].id, action: 'updated' } }
    }
    
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, user.id)
      .input('entryDate', sql.Date, new Date(data.entry_date))
      .input('taskId', sql.UniqueIdentifier, data.task_id)
      .input('hours', sql.Decimal(4, 2), data.hours)
      .input('isOvertime', sql.Bit, data.is_overtime || false)
      .input('description', sql.NVarChar, data.description || null)
      .input('createdBy', sql.UniqueIdentifier, user.id)
      .query(`
        INSERT INTO pms.timesheet_entries (
          employee_id, entry_date, task_id, hours, is_overtime, description, created_by
        ) OUTPUT INSERTED.id VALUES (
          @employeeId, @entryDate, @taskId, @hours, @isOvertime, @description, @createdBy
        )
      `)
    
    revalidatePath('/timesheet')
    return { success: true, data: { id: result.recordset[0].id, action: 'created' } }
  } catch (error: any) {
    console.error('createTimesheetEntry error:', error)
    return { success: false, error: error.message }
  }
}

export async function getMyTasksForTimesheet() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }
    
    const pool = await getConnection()
    
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, user.id)
      .query(`
        SELECT 
          t.id, t.task_code, t.title AS task_title, t.task_type,
          ttc.name_th AS task_type_name,
          ttc.color AS task_type_color,
          s.story_code, s.title AS story_title,
          mc.code AS milestone_code, mc.name AS milestone_name,
          p.project_code, p.name AS project_name,
          CONCAT(p.project_code, ' > ', s.story_code, ' > ', t.task_code, ' ', t.title) AS display_name
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
        WHERE t.assignee_id = @employeeId
          AND t.is_active = 1
          AND t.status NOT IN ('done', 'cancelled')
          AND p.is_active = 1
        ORDER BY p.project_code, s.story_code, t.task_code
      `)
    
    return { success: true, data: result.recordset }
  } catch (error: any) {
    console.error('getMyTasksForTimesheet error:', error)
    return { success: false, error: error.message, data: [] }
  }
}
