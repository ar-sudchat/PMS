'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export interface KanbanTask {
  id: string
  task_code: string
  title: string
  priority: string
  status: string
  task_type: string
  task_type_name: string
  task_type_color: string
  assignee_id: string | null
  assignee_name: string | null
  assignee_nickname: string | null
  project_id: string
  project_code: string
  project_name: string
  story_code: string
  estimated_hours: number
  actual_hours: number
  due_date: string | null
  is_overdue: boolean
  days_until_due: number | null
  checklist_total: number
  checklist_completed: number
}

export interface KanbanFilters {
  projectId?: string
  assigneeId?: string
  positionCode?: string
  dateFrom?: string
  dateTo?: string
}

// Get tasks grouped for Kanban board
export async function getKanbanTasks(filters?: KanbanFilters): Promise<KanbanTask[]> {
  try {
    const pool = await getConnection()

    // Check if name_th column exists in task_type_configs
    let taskTypeNameCol = 'ttc.name'
    try {
      await pool.request().query(`SELECT TOP 1 name_th FROM pms.task_type_configs`)
      taskTypeNameCol = 'ISNULL(ttc.name_th, ttc.name)'
    } catch { /* column doesn't exist */ }

    let query = `
      SELECT
        t.id,
        t.task_code,
        t.title,
        t.priority,
        t.status,
        ISNULL(t.task_type, '') AS task_type,
        ISNULL(${taskTypeNameCol}, '-') AS task_type_name,
        ISNULL(ttc.color, '#6B7280') AS task_type_color,
        t.assignee_id,
        COALESCE(a.first_name_th + ' ' + ISNULL(a.last_name_th, ''), a.first_name + ' ' + ISNULL(a.last_name, '')) AS assignee_name,
        a.nickname AS assignee_nickname,
        p.id AS project_id,
        p.project_code,
        p.name AS project_name,
        s.story_code,
        ISNULL(t.estimated_hours, 0) AS estimated_hours,
        ISNULL(t.actual_hours, 0) AS actual_hours,
        t.due_date,
        CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END AS is_overdue,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), t.due_date) AS days_until_due,
        (SELECT COUNT(*) FROM pms.task_checklist_items ci WHERE ci.task_id = t.id) AS checklist_total,
        (SELECT COUNT(*) FROM pms.task_checklist_items ci WHERE ci.task_id = t.id AND ci.is_completed = 1) AS checklist_completed
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
      LEFT JOIN pms.employees a ON t.assignee_id = a.id
      WHERE t.is_active = 1
        AND t.status NOT IN ('cancelled')
    `

    const request = pool.request()

    if (filters?.projectId && filters.projectId !== 'all') {
      query += ' AND p.id = @projectId'
      request.input('projectId', sql.UniqueIdentifier, filters.projectId)
    }
    if (filters?.assigneeId && filters.assigneeId !== 'all') {
      query += ' AND t.assignee_id = @assigneeId'
      request.input('assigneeId', sql.UniqueIdentifier, filters.assigneeId)
    }
    if (filters?.positionCode && filters.positionCode !== 'all') {
      query += ' AND EXISTS (SELECT 1 FROM pms.positions pos WHERE pos.id = a.position_id AND pos.code = @positionCode)'
      request.input('positionCode', sql.NVarChar, filters.positionCode)
    }
    if (filters?.dateFrom) {
      query += ' AND (t.due_date >= @dateFrom OR t.due_date IS NULL)'
      request.input('dateFrom', sql.Date, filters.dateFrom)
    }
    if (filters?.dateTo) {
      query += ' AND (t.due_date <= @dateTo OR t.due_date IS NULL)'
      request.input('dateTo', sql.Date, filters.dateTo)
    }

    query += ` ORDER BY
      CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
      t.due_date,
      t.task_code
    `

    const result = await request.query(query)

    return result.recordset.map((r: any) => ({
      ...r,
      is_overdue: !!r.is_overdue,
      due_date: r.due_date?.toISOString?.().split('T')[0] || null,
    }))

  } catch (error: any) {
    console.error('Error fetching kanban tasks:', error?.message || error)
    return []
  }
}

// Get project options for filter
export async function getProjectOptions(): Promise<{ id: string; code: string; name: string }[]> {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT DISTINCT p.id, p.project_code AS code, p.name
      FROM pms.projects p
      LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
      WHERE p.is_active = 1 AND (ps.code IS NULL OR ps.code NOT IN ('cancelled', 'completed'))
      ORDER BY p.name
    `)
    return result.recordset
  } catch {
    return []
  }
}

// Get employee options for filter (only SA, PG, PM roles)
export async function getEmployeeOptions(positionCodes?: string[]): Promise<{ id: string; name: string; position_code: string }[]> {
  try {
    const pool = await getConnection()
    const codes = positionCodes || ['SA', 'PG', 'PM']
    const inClause = codes.map((_, i) => `@pos${i}`).join(',')
    const request = pool.request()
    codes.forEach((c, i) => request.input(`pos${i}`, sql.NVarChar, c))

    const result = await request.query(`
      SELECT e.id,
        COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS name,
        ISNULL(p.code, '') AS position_code
      FROM pms.employees e
      LEFT JOIN pms.positions p ON e.position_id = p.id
      WHERE e.is_active = 1 AND p.code IN (${inClause})
      ORDER BY p.code, name
    `)
    return result.recordset
  } catch {
    return []
  }
}

// Get position options for filter
export async function getPositionOptions(): Promise<{ code: string; name: string }[]> {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT code, name FROM pms.positions
      WHERE is_active = 1 AND code IN ('SA', 'PG', 'PM')
      ORDER BY CASE code WHEN 'PM' THEN 1 WHEN 'SA' THEN 2 WHEN 'PG' THEN 3 END
    `)
    return result.recordset
  } catch {
    return []
  }
}

// Update task status (for drag & drop)
export async function updateKanbanTaskStatus(
  taskId: string,
  newStatus: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const validStatuses = ['todo', 'in_progress', 'review', 'done', 'done_not_planned', 'blocked']
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' }
  }

  try {
    const pool = await getConnection()

    if (newStatus === 'done_not_planned') {
      await pool.request()
        .input('taskId', sql.UniqueIdentifier, taskId)
        .input('status', sql.NVarChar, newStatus)
        .input('reason', sql.NVarChar, reason || null)
        .query(`
          UPDATE pms.tasks
          SET status = @status, completed_date = GETDATE(), not_as_planned_reason = @reason, updated_at = GETDATE()
          WHERE id = @taskId
        `)
    } else if (newStatus === 'done') {
      await pool.request()
        .input('taskId', sql.UniqueIdentifier, taskId)
        .input('status', sql.NVarChar, newStatus)
        .query(`
          UPDATE pms.tasks
          SET status = @status, completed_date = GETDATE(), not_as_planned_reason = NULL, updated_at = GETDATE()
          WHERE id = @taskId
        `)
    } else {
      await pool.request()
        .input('taskId', sql.UniqueIdentifier, taskId)
        .input('status', sql.NVarChar, newStatus)
        .query(`
          UPDATE pms.tasks
          SET status = @status, completed_date = NULL, not_as_planned_reason = NULL, updated_at = GETDATE()
          WHERE id = @taskId
        `)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating kanban task status:', error?.message || error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}
