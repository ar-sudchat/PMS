'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Types
export interface TimesheetEntry {
  entry_id: string
  task_id: string
  task_code: string
  task_title: string
  project_code: string
  project_name: string
  entry_date: string
  hours: number
  work_description: string
  activity_type: string
  is_overtime: boolean
}

export interface WeeklyTimesheetData {
  tasks: {
    task_id: string
    task_code: string
    task_title: string
    project_code: string
    project_name: string
    entries: Record<string, { entry_id: string; hours: number; description: string }> // key = date string
    total_hours: number
  }[]
  daily_totals: Record<string, number> // key = date string
  week_total: number
  target_hours: number // 7 * 5 = 35
}

// Get weekly timesheet for current user
export async function getWeeklyTimesheet(weekStart: string): Promise<WeeklyTimesheetData> {
  const user = await getCurrentUser()
  if (!user) {
    return { tasks: [], daily_totals: {}, week_total: 0, target_hours: 35 }
  }

  try {
    const pool = await getConnection()
    const employeeId = (user as any).employeeId || user.id

    // Get all entries for the week
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('weekStart', sql.Date, weekStart)
      .query(`
        SELECT 
          te.id AS entry_id,
          te.task_id,
          te.entry_date,
          te.hours,
          te.description AS work_description,
          te.activity_type,
          t.task_code,
          t.title AS task_title,
          p.project_code,
          p.name AS project_name
        FROM pms.timesheet_entries te
        INNER JOIN pms.tasks t ON te.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        WHERE te.employee_id = @employeeId
          AND te.entry_date >= @weekStart
          AND te.entry_date < DATEADD(day, 7, @weekStart)
          AND te.is_active = 1
        ORDER BY te.entry_date, t.task_code
      `)

    // Also get assigned tasks (to show tasks even without entries)
    // Filter out canceled or completed if too old? 
    // Usually only active tasks ('todo', 'in_progress', 'review'). 'done' might be needed if I logged time this week?
    // The previous query (entries) covers tasks with time logged.
    // This query covers tasks WITHOUT time logged but assigned.
    const tasksResult = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT DISTINCT
          t.id AS task_id,
          t.task_code,
          t.title AS task_title,
          p.project_code,
          p.name AS project_name
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        WHERE t.assignee_id = @employeeId
          AND t.status IN ('todo', 'in_progress', 'review')
          AND t.is_active = 1
        ORDER BY p.project_code, t.task_code
      `)

    // Build the data structure
    const taskMap = new Map<string, WeeklyTimesheetData['tasks'][0]>()
    const dailyTotals: Record<string, number> = {}
    let weekTotal = 0

    // Initialize with assigned tasks
    tasksResult.recordset.forEach((task: any) => {
      taskMap.set(task.id || task.task_id, { // Check if alias worked. SQL says t.id AS task_id
        task_id: task.task_id,
        task_code: task.task_code,
        task_title: task.task_title,
        project_code: task.project_code,
        project_name: task.project_name,
        entries: {},
        total_hours: 0
      })
    })

    // Fill in entries
    result.recordset.forEach((entry: any) => {
      const dateKey = entry.entry_date.toISOString().split('T')[0]

      // Add task if not exists (e.g. task is done but has entry this week)
      if (!taskMap.has(entry.task_id)) {
        taskMap.set(entry.task_id, {
          task_id: entry.task_id,
          task_code: entry.task_code,
          task_title: entry.task_title,
          project_code: entry.project_code,
          project_name: entry.project_name,
          entries: {},
          total_hours: 0
        })
      }

      const task = taskMap.get(entry.task_id)!

      // Sum hours if multiple entries for same task on same date
      if (task.entries[dateKey]) {
        task.entries[dateKey].hours += entry.hours
        task.entries[dateKey].description = entry.work_description || task.entries[dateKey].description
      } else {
        task.entries[dateKey] = {
          entry_id: entry.entry_id,
          hours: entry.hours,
          description: entry.work_description || ''
        }
      }
      task.total_hours += entry.hours

      // Daily totals
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.hours
      weekTotal += entry.hours
    })

    return {
      tasks: Array.from(taskMap.values()),
      daily_totals: dailyTotals,
      week_total: weekTotal,
      target_hours: 35
    }
  } catch (error) {
    console.error('Error fetching weekly timesheet:', error)
    return { tasks: [], daily_totals: {}, week_total: 0, target_hours: 35 }
  }
}

// Log time entry
export async function logTimeEntry(data: {
  taskId: string
  entryDate: string
  hours: number
  description?: string
  activityType?: string
  isOvertime?: boolean
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  if (data.hours <= 0 || data.hours > 24) {
    return { success: false, error: 'Hours must be between 0 and 24' }
  }

  try {
    const pool = await getConnection()
    const employeeId = (user as any).employeeId || user.id

    // Check if user is assignee of the task
    const assigneeCheck = await pool.request()
      .input('taskId', sql.UniqueIdentifier, data.taskId)
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT assignee_id FROM pms.tasks WHERE id = @taskId
      `)

    if (assigneeCheck.recordset.length === 0) {
      return { success: false, error: 'Task not found' }
    }

    if (assigneeCheck.recordset[0].assignee_id !== employeeId) {
      return { success: false, error: 'คุณไม่สามารถลงเวลาใน Task ที่ไม่ได้ถูก Assign ให้คุณ' }
    }

    // Check if milestone is locked
    const lockCheck = await pool.request()
      .input('taskId', sql.UniqueIdentifier, data.taskId)
      .query(`
        SELECT ISNULL(pm.is_locked, 0) AS is_locked
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
        WHERE t.id = @taskId
      `)

    if (lockCheck.recordset[0]?.is_locked) {
      return { success: false, error: 'Milestone นี้ถูก Lock แล้ว ไม่สามารถบันทึก Timesheet ได้' }
    }

    let entryId: string

    // Always create new entry (allow multiple entries per task per day)
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('taskId', sql.UniqueIdentifier, data.taskId)
      .input('entryDate', sql.Date, data.entryDate)
      .input('hours', sql.Decimal(10, 2), data.hours)
      .input('description', sql.NVarChar, data.description || null)
      .input('activityType', sql.NVarChar, data.activityType || 'development')
      .input('isOvertime', sql.Bit, data.isOvertime || false)
      .query(`
        DECLARE @InsertedId TABLE (id UNIQUEIDENTIFIER);
        
        INSERT INTO pms.timesheet_entries 
        (id, employee_id, task_id, entry_date, hours, description, activity_type, is_overtime, is_billable, status, is_active, created_at, updated_at)
        OUTPUT INSERTED.id INTO @InsertedId
        VALUES (NEWID(), @employeeId, @taskId, @entryDate, @hours, @description, @activityType, @isOvertime, 1, 'draft', 1, GETDATE(), GETDATE());
        
        SELECT id FROM @InsertedId;
      `)
    entryId = result.recordset[0].id

    // Update task actual_hours AND milestone actual_mandays
    // Re-use connection? Yes.
    // Helper function needs to use SAME pool to be efficient? Or separate. 
    // getConnection returns same pool singleton.

    await updateTaskActualHours(pool, data.taskId)
    await updateMilestoneActualMandays(pool, data.taskId)

    // Note: Removed revalidatePath calls to prevent page flickering
    // Client will manually refresh display if needed via postLogAction callback

    return { success: true, entryId }
  } catch (error) {
    console.error('Error logging time:', error)
    const errorMessage = error instanceof Error ? error.message : 'Database error'
    return { success: false, error: errorMessage }
  }
}

// Delete time entry
export async function deleteTimeEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const pool = await getConnection()
    const employeeId = (user as any).employeeId || user.id

    // Get task_id before deleting
    const entry = await pool.request()
      .input('entryId', sql.UniqueIdentifier, entryId)
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT task_id FROM pms.timesheet_entries 
        WHERE id = @entryId AND employee_id = @employeeId
      `)

    if (entry.recordset.length === 0) {
      return { success: false, error: 'Entry not found' }
    }

    const taskId = entry.recordset[0].task_id

    // Soft delete
    await pool.request()
      .input('entryId', sql.UniqueIdentifier, entryId)
      .query(`
        UPDATE pms.timesheet_entries 
        SET is_active = 0, updated_at = GETDATE()
        WHERE id = @entryId
      `)

    // Update task actual_hours
    await updateTaskActualHours(pool, taskId)

    // Update milestone actual_mandays
    await updateMilestoneActualMandays(pool, taskId)

    // Note: Removed revalidatePath to prevent flickering
    // Database is updated, client should refresh display if needed

    return { success: true }
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return { success: false, error: 'Database error' }
  }
}

// Helper: Update task actual_hours from timesheet
async function updateTaskActualHours(pool: sql.ConnectionPool, taskId: string) {
  await pool.request()
    .input('taskId', sql.UniqueIdentifier, taskId)
    .query(`
      UPDATE pms.tasks 
      SET actual_hours = (
        SELECT ISNULL(SUM(hours), 0) 
        FROM pms.timesheet_entries 
        WHERE task_id = @taskId AND is_active = 1
      ),
      updated_at = GETDATE()
      WHERE id = @taskId
    `)
}

// Helper: Update milestone actual_mandays from timesheet
async function updateMilestoneActualMandays(pool: sql.ConnectionPool, taskId: string) {
  await pool.request()
    .input('taskId', sql.UniqueIdentifier, taskId)
    .query(`
      UPDATE pm
      SET pm.actual_mandays = calc.total_mandays,
          pm.updated_at = GETDATE()
      FROM pms.project_milestones pm
      INNER JOIN (
        SELECT 
          s.milestone_id,
          ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS total_mandays
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        LEFT JOIN pms.timesheet_entries te ON te.task_id = t.id AND te.is_active = 1
        WHERE s.milestone_id = (SELECT milestone_id FROM pms.stories s2 JOIN pms.tasks t2 ON s2.id = t2.story_id WHERE t2.id = @taskId)
        GROUP BY s.milestone_id
      ) calc ON pm.id = calc.milestone_id
    `)
  // Note: The subquery `calc` complexity: need to group ALL tasks in that milestone, not just the single task.
  // The query above filters by `WHERE s.milestone_id = ...`.
  // It sums hours for ALL tasks in that milestone. This is correct.
}

// Get available tasks for timesheet (to add new task row)
export async function getAvailableTasksForTimesheet(): Promise<{
  task_id: string
  task_code: string
  task_title: string
  project_code: string
  project_name: string
}[]> {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    const pool = await getConnection()
    const employeeId = (user as any).employeeId || user.id

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT 
          t.id AS task_id,
          t.task_code,
          t.title AS task_title,
          p.project_code,
          p.name AS project_name
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        WHERE t.assignee_id = @employeeId
          AND t.status NOT IN ('done', 'cancelled')
          AND t.is_active = 1
        ORDER BY p.project_code, t.task_code
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching available tasks:', error)
    return []
  }
}

// Get time entries for a specific task
export interface TaskTimeEntry {
  id: string
  entry_date: string
  hours: number
  description: string | null
  activity_type: string
  is_overtime: boolean
  status: string
  created_at: string
}

export async function getTimeEntriesForTask(taskId: string): Promise<TaskTimeEntry[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('taskId', sql.UniqueIdentifier, taskId)
      .query(`
        SELECT 
          id,
          entry_date,
          hours,
          description,
          activity_type,
          is_overtime,
          status,
          created_at
        FROM pms.timesheet_entries
        WHERE task_id = @taskId
          AND is_active = 1
        ORDER BY entry_date DESC, created_at DESC
      `)

    return result.recordset.map((r: any) => ({
      ...r,
      entry_date: r.entry_date?.toISOString?.() || r.entry_date
    }))
  } catch (error) {
    console.error('Error fetching time entries for task:', error)
    return []
  }
}

