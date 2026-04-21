'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'

// Types
export interface TeamMember {
  employee_id: string
  employee_code: string
  employee_name: string
  position_name: string
  department_name: string
  total_tasks: number
  todo_tasks: number
  in_progress_tasks: number
  review_tasks: number
  done_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  total_hours_this_month: number
  utilization_percent: number
  last_timesheet_date: string | null
  days_since_last_entry: number | null
}

export interface TeamTaskSummary {
  total_tasks: number
  todo: number
  in_progress: number
  review: number
  done: number
  blocked: number
  cancelled: number
  overdue: number
  done_rate: number
}

export interface TeamProject {
  project_id: string
  project_code: string
  project_name: string
  status_code: string
  status_name: string
  total_tasks: number
  done_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  progress_percent: number
  sold_mandays: number
  actual_mandays: number
  budget_used_percent: number
  member_count: number
}

export interface BlockedTask {
  task_id: string
  task_code: string
  task_title: string
  assignee_name: string
  project_name: string
  project_code: string
  blocked_since: string | null
  days_blocked: number
}

export interface OverdueTask {
  task_id: string
  task_code: string
  task_title: string
  assignee_name: string
  project_name: string
  project_code: string
  due_date: string
  days_overdue: number
  priority: string
  status: string
}

export interface TeamDashboardData {
  taskSummary: TeamTaskSummary
  members: TeamMember[]
  projects: TeamProject[]
  blockedTasks: BlockedTask[]
  overdueTasks: OverdueTask[]
}

// Get team dashboard data for a department
export async function getTeamDashboardData(departmentId?: string): Promise<TeamDashboardData> {
  try {
    const pool = await getConnection()

    // Build department filter
    const deptFilter = departmentId && departmentId !== 'all'
      ? 'AND e.department_id = @departmentId'
      : ''

    const request = pool.request()
    if (departmentId && departmentId !== 'all') {
      request.input('departmentId', sql.UniqueIdentifier, departmentId)
    }

    // 1. Team Members with task counts and timesheet info
    const membersResult = await request.query(`
      WITH MemberTasks AS (
        SELECT
          t.assignee_id,
          COUNT(*) AS total_tasks,
          SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
          SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) AS review_tasks,
          SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS done_tasks,
          SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
          SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE t.is_active = 1 AND t.status <> 'cancelled'
        GROUP BY t.assignee_id
      ),
      MemberTimesheet AS (
        SELECT
          t.assignee_id,
          ISNULL(SUM(CASE WHEN YEAR(te.entry_date) = YEAR(GETDATE()) AND MONTH(te.entry_date) = MONTH(GETDATE()) THEN te.hours ELSE 0 END), 0) AS total_hours_this_month,
          MAX(te.entry_date) AS last_timesheet_date
        FROM pms.timesheet_entries te
        INNER JOIN pms.tasks t ON te.task_id = t.id
        WHERE te.is_active = 1
        GROUP BY t.assignee_id
      )
      SELECT
        e.id AS employee_id,
        e.employee_code,
        COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,
        ISNULL(p.name, '-') AS position_name,
        ISNULL(d.name, '-') AS department_name,
        ISNULL(mt.total_tasks, 0) AS total_tasks,
        ISNULL(mt.todo_tasks, 0) AS todo_tasks,
        ISNULL(mt.in_progress_tasks, 0) AS in_progress_tasks,
        ISNULL(mt.review_tasks, 0) AS review_tasks,
        ISNULL(mt.done_tasks, 0) AS done_tasks,
        ISNULL(mt.blocked_tasks, 0) AS blocked_tasks,
        ISNULL(mt.overdue_tasks, 0) AS overdue_tasks,
        ISNULL(mts.total_hours_this_month, 0) AS total_hours_this_month,
        CAST(ROUND(ISNULL(mts.total_hours_this_month, 0) * 100.0 / 140, 1) AS DECIMAL(5,1)) AS utilization_percent,
        mts.last_timesheet_date,
        DATEDIFF(DAY, mts.last_timesheet_date, GETDATE()) AS days_since_last_entry
      FROM pms.employees e
      LEFT JOIN pms.positions p ON e.position_id = p.id
      LEFT JOIN pms.departments d ON e.department_id = d.id
      LEFT JOIN MemberTasks mt ON e.id = mt.assignee_id
      LEFT JOIN MemberTimesheet mts ON e.id = mts.assignee_id
      WHERE e.is_active = 1 ${deptFilter}
      ORDER BY ISNULL(mt.overdue_tasks, 0) DESC, ISNULL(mt.blocked_tasks, 0) DESC, employee_name
    `)

    const members: TeamMember[] = membersResult.recordset.map((r: any) => ({
      ...r,
      last_timesheet_date: r.last_timesheet_date?.toISOString?.().split('T')[0] || null
    }))

    // 2. Task Summary
    const request2 = pool.request()
    if (departmentId && departmentId !== 'all') {
      request2.input('departmentId', sql.UniqueIdentifier, departmentId)
    }

    const taskSummaryResult = await request2.query(`
      SELECT
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) AS review,
        SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
        SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END) AS overdue
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.employees e ON t.assignee_id = e.id
      WHERE t.is_active = 1 ${deptFilter}
    `)

    const ts = taskSummaryResult.recordset[0] || emptyTaskSummary()
    const taskSummary: TeamTaskSummary = {
      ...ts,
      done_rate: ts.total_tasks > 0 ? Math.round((ts.done / ts.total_tasks) * 100) : 0
    }

    // 3. Projects with department members
    const request3 = pool.request()
    if (departmentId && departmentId !== 'all') {
      request3.input('departmentId', sql.UniqueIdentifier, departmentId)
    }

    const projectsResult = await request3.query(`
      SELECT
        p.id AS project_id,
        p.project_code,
        p.name AS project_name,
        ISNULL(ps.code, 'unknown') AS status_code,
        ISNULL(ps.name, 'Unknown') AS status_name,
        COUNT(DISTINCT t.id) AS total_tasks,
        SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS done_tasks,
        SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
        SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks,
        0 AS progress_percent,
        ISNULL(p.sold_mandays, 0) AS sold_mandays,
        ISNULL((
          SELECT CAST(ROUND(SUM(te2.hours) / 7.0, 2) AS DECIMAL(10,2))
          FROM pms.timesheet_entries te2
          INNER JOIN pms.tasks t2 ON te2.task_id = t2.id
          INNER JOIN pms.stories s2 ON t2.story_id = s2.id
          WHERE s2.project_id = p.id AND te2.is_active = 1
        ), 0) AS actual_mandays,
        CASE
          WHEN ISNULL(p.sold_mandays, 0) > 0
          THEN CAST(ROUND(ISNULL((
            SELECT SUM(te2.hours) / 7.0
            FROM pms.timesheet_entries te2
            INNER JOIN pms.tasks t2 ON te2.task_id = t2.id
            INNER JOIN pms.stories s2 ON t2.story_id = s2.id
            WHERE s2.project_id = p.id AND te2.is_active = 1
          ), 0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
          ELSE 0
        END AS budget_used_percent,
        COUNT(DISTINCT t.assignee_id) AS member_count
      FROM pms.projects p
      LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
      INNER JOIN pms.stories s ON p.id = s.project_id
      INNER JOIN pms.tasks t ON s.id = t.story_id AND t.is_active = 1
      INNER JOIN pms.employees e ON t.assignee_id = e.id AND e.is_active = 1
      WHERE p.is_active = 1
        AND (ps.code IS NULL OR ps.code NOT IN ('cancelled', 'completed'))
        ${deptFilter}
      GROUP BY p.id, p.project_code, p.name, ps.code, ps.name, p.sold_mandays
      ORDER BY overdue_tasks DESC, blocked_tasks DESC, project_name
    `)

    // 4. Blocked Tasks
    const request4 = pool.request()
    if (departmentId && departmentId !== 'all') {
      request4.input('departmentId', sql.UniqueIdentifier, departmentId)
    }

    const blockedResult = await request4.query(`
      SELECT
        t.id AS task_id,
        t.task_code,
        t.title AS task_title,
        COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS assignee_name,
        p.name AS project_name,
        p.project_code,
        t.updated_at AS blocked_since,
        DATEDIFF(DAY, t.updated_at, GETDATE()) AS days_blocked
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.employees e ON t.assignee_id = e.id
      WHERE t.is_active = 1 AND t.status = 'blocked'
        AND e.is_active = 1
        ${deptFilter}
      ORDER BY days_blocked DESC
    `)

    const blockedTasks: BlockedTask[] = blockedResult.recordset.map((r: any) => ({
      ...r,
      blocked_since: r.blocked_since?.toISOString?.().split('T')[0] || null
    }))

    // 5. Overdue Tasks
    const request5 = pool.request()
    if (departmentId && departmentId !== 'all') {
      request5.input('departmentId', sql.UniqueIdentifier, departmentId)
    }

    const overdueResult = await request5.query(`
      SELECT TOP 20
        t.id AS task_id,
        t.task_code,
        t.title AS task_title,
        COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS assignee_name,
        p.name AS project_name,
        p.project_code,
        t.due_date,
        DATEDIFF(DAY, t.due_date, GETDATE()) AS days_overdue,
        t.priority,
        t.status
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.employees e ON t.assignee_id = e.id
      WHERE t.is_active = 1
        AND t.due_date < CAST(GETDATE() AS DATE)
        AND t.status NOT IN ('done', 'done_not_planned', 'cancelled')
        AND e.is_active = 1
        ${deptFilter}
      ORDER BY days_overdue DESC
    `)

    const overdueTasks: OverdueTask[] = overdueResult.recordset.map((r: any) => ({
      ...r,
      due_date: r.due_date?.toISOString?.().split('T')[0] || ''
    }))

    return { taskSummary, members, projects: projectsResult.recordset, blockedTasks, overdueTasks }

  } catch (error: any) {
    console.error('Error fetching team dashboard data:', error?.message || error)
    throw error
  }
}

// ===== Daily View =====

export interface DailyMember {
  employee_id: string
  employee_code: string
  employee_name: string
  position_name: string
  position_code: string
  tasks: DailyTask[]
  hours_logged: number
}

export interface DailyTask {
  task_id: string
  task_code: string
  title: string
  status: string
  priority: string
  project_code: string
  project_name: string
  task_type_name: string
  task_type_color: string
  estimated_hours: number
  actual_hours: number
  due_date: string | null
  is_overdue: boolean
}

export interface DailyViewData {
  date: string
  members: DailyMember[]
}

// Get daily view: each member's tasks for a specific date
export async function getDailyViewData(date: string, departmentId?: string): Promise<DailyViewData> {
  try {
    const pool = await getConnection()

    const deptFilter = departmentId && departmentId !== 'all'
      ? 'AND e.department_id = @deptId'
      : ''

    // Get members with their active tasks (due on/before date OR in_progress/review/blocked)
    const request = pool.request()
    request.input('date', sql.Date, date)
    if (departmentId && departmentId !== 'all') {
      request.input('deptId', sql.UniqueIdentifier, departmentId)
    }

    // Check if name_th column exists
    let taskTypeNameCol = 'ttc.name'
    try {
      await pool.request().query('SELECT TOP 1 name_th FROM pms.task_type_configs')
      taskTypeNameCol = 'ISNULL(ttc.name_th, ttc.name)'
    } catch { /* column doesn't exist */ }

    const result = await request.query(`
      SELECT
        e.id AS employee_id,
        e.employee_code,
        COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,
        ISNULL(pos.name, '-') AS position_name,
        ISNULL(pos.code, '-') AS position_code,
        t.id AS task_id,
        t.task_code,
        t.title,
        t.status,
        t.priority,
        p.project_code,
        p.name AS project_name,
        ISNULL(${taskTypeNameCol}, '-') AS task_type_name,
        ISNULL(ttc.color, '#6B7280') AS task_type_color,
        ISNULL(t.estimated_hours, 0) AS estimated_hours,
        ISNULL(t.actual_hours, 0) AS actual_hours,
        t.due_date,
        CASE WHEN t.due_date < @date AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END AS is_overdue,
        ISNULL((
          SELECT SUM(te.hours) FROM pms.timesheet_entries te
          INNER JOIN pms.tasks t2 ON te.task_id = t2.id
          WHERE t2.assignee_id = e.id AND te.is_active = 1 AND te.entry_date = @date
        ), 0) AS hours_logged
      FROM pms.employees e
      LEFT JOIN pms.positions pos ON e.position_id = pos.id
      LEFT JOIN pms.tasks t ON t.assignee_id = e.id
        AND t.is_active = 1
        AND t.status NOT IN ('cancelled')
        AND (
          t.status IN ('in_progress', 'review', 'blocked')
          OR (t.due_date = @date)
          OR (t.status = 'todo' AND t.due_date <= @date)
          OR (t.status IN ('done', 'done_not_planned') AND t.completed_date >= @date AND t.completed_date < DATEADD(DAY, 1, @date))
        )
      LEFT JOIN pms.stories s ON t.story_id = s.id
      LEFT JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
      WHERE e.is_active = 1 ${deptFilter}
      ORDER BY e.employee_code,
        CASE t.status WHEN 'blocked' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 WHEN 'todo' THEN 4 WHEN 'done' THEN 5 WHEN 'done_not_planned' THEN 6 END,
        CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    `)

    // Group by member
    const memberMap = new Map<string, DailyMember>()
    for (const row of result.recordset) {
      if (!memberMap.has(row.employee_id)) {
        memberMap.set(row.employee_id, {
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          employee_name: row.employee_name,
          position_name: row.position_name,
          position_code: row.position_code,
          tasks: [],
          hours_logged: row.hours_logged || 0,
        })
      }
      const member = memberMap.get(row.employee_id)!
      if (row.task_id) {
        member.tasks.push({
          task_id: row.task_id,
          task_code: row.task_code,
          title: row.title,
          status: row.status,
          priority: row.priority,
          project_code: row.project_code,
          project_name: row.project_name,
          task_type_name: row.task_type_name,
          task_type_color: row.task_type_color,
          estimated_hours: row.estimated_hours,
          actual_hours: row.actual_hours,
          due_date: row.due_date?.toISOString?.().split('T')[0] || null,
          is_overdue: !!row.is_overdue,
        })
      }
    }

    // Sort: members with blocked/overdue first, then by task count desc
    const members = Array.from(memberMap.values()).sort((a, b) => {
      const aIssue = a.tasks.some(t => t.status === 'blocked' || t.is_overdue) ? 0 : 1
      const bIssue = b.tasks.some(t => t.status === 'blocked' || t.is_overdue) ? 0 : 1
      if (aIssue !== bIssue) return aIssue - bIssue
      return b.tasks.length - a.tasks.length
    })

    return { date, members }

  } catch (error: any) {
    console.error('Error fetching daily view data:', error?.message || error)
    throw error
  }
}

// Get all departments for filter
export async function getDepartmentOptions(): Promise<{ id: string; name: string }[]> {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT id, COALESCE(name_th, name) AS name
      FROM pms.departments
      WHERE is_active = 1
      ORDER BY name
    `)
    return result.recordset
  } catch (error) {
    console.error('Error fetching departments:', error)
    return []
  }
}

function emptyTaskSummary(): TeamTaskSummary {
  return { total_tasks: 0, todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0, cancelled: 0, overdue: 0, done_rate: 0 }
}
