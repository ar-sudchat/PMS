'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Types
export interface MyTask {
    task_id: string
    task_code: string
    task_title: string
    task_description: string
    acceptance_criteria: string | null
    notes: string | null
    task_type: string
    work_phase: string
    priority: string
    status: string
    estimated_hours: number
    actual_hours: number
    remaining_hours: number
    progress_percent: number
    start_date: string | null
    due_date: string | null
    is_overdue: boolean
    days_until_due: number
    // Related info
    project_id: string
    project_code: string
    project_name: string
    story_id: string
    story_code: string
    story_title: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
}

export interface TaskFilters {
    status?: string
    priority?: string
    projectId?: string
    weekStart?: string // Filter tasks due in this week
}

// Get my tasks (assigned to current user)
export async function getMyTasks(filters?: TaskFilters): Promise<MyTask[]> {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const pool = await getConnection()
        let query = `
      SELECT * FROM pms.vw_my_tasks 
      WHERE assignee_id = @employeeId
    `
        const request = pool.request()
        // Using employeeId from session. Assuming session logic maps correctly. 
        // Usually user.id is login ID (from AspNetUsers?), but app uses employees table. 
        // previous actions use `(user as any).employeeId || user.id`. I will assume user object structure.
        const employeeId = (user as any).employeeId || user.id
        request.input('employeeId', sql.UniqueIdentifier, employeeId)

        if (filters?.status && filters.status !== 'all') {
            query += ' AND status = @status'
            request.input('status', sql.NVarChar, filters.status)
        }
        if (filters?.priority && filters.priority !== 'all') {
            // 'all' check for priority as well just in case
            query += ' AND priority = @priority'
            request.input('priority', sql.NVarChar, filters.priority)
        }
        if (filters?.projectId && filters.projectId !== 'all') {
            query += ' AND project_id = @projectId'
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }
        if (filters?.weekStart) {
            query += ' AND due_date >= @weekStart AND due_date < DATEADD(day, 7, @weekStart)'
            request.input('weekStart', sql.Date, filters.weekStart)
        }

        query += ' ORDER BY is_overdue DESC, due_date ASC, priority DESC'

        const result = await request.query(query)
        return result.recordset
    } catch (error) {
        console.error('Error fetching my tasks:', error)
        return []
    }
}

// Get task counts by status
export async function getMyTaskCounts(): Promise<Record<string, number>> {
    const user = await getCurrentUser()
    if (!user) return {}

    try {
        const pool = await getConnection()
        const employeeId = (user as any).employeeId || user.id
        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, employeeId)
            .query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM pms.vw_my_tasks 
        WHERE assignee_id = @employeeId
        GROUP BY status
      `)

        const counts: Record<string, number> = { all: 0 }
        result.recordset.forEach((row: { status: string; count: number }) => {
            counts[row.status] = row.count
            counts.all += row.count
        })
        return counts
    } catch (error) {
        console.error('Error fetching task counts:', error)
        return {}
    }
}

// Get single task detail
export async function getTaskDetail(taskId: string): Promise<MyTask | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query('SELECT * FROM pms.vw_my_tasks WHERE task_id = @taskId')

        return result.recordset[0] || null
    } catch (error) {
        console.error('Error fetching task detail:', error)
        return null
    }
}

// Update task status (quick action)
export async function updateTaskStatus(
    taskId: string,
    status: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked']
    if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' }
    }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .input('status', sql.NVarChar, status)
            .query(`
        UPDATE pms.tasks 
        SET status = @status, updated_at = GETDATE()
        WHERE id = @taskId
      `)

        return { success: true }
    } catch (error) {
        console.error('Error updating task status:', error)
        return { success: false, error: 'Database error' }
    }
}
