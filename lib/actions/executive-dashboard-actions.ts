'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'

// Types
export interface ExecutiveOverview {
  total_employees: number
  total_active_projects: number
  total_tasks: number
  done_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  total_hours_this_month: number
  avg_utilization_percent: number
  overdue_rate: number
  done_rate: number
}

export interface DepartmentSummary {
  department_id: string
  department_name: string
  employee_count: number
  total_tasks: number
  done_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  total_hours: number
  avg_utilization: number
  done_rate: number
  overdue_rate: number
}

export interface ProjectHealth {
  project_id: string
  project_code: string
  project_name: string
  project_manager: string
  status_code: string
  status_name: string
  health: 'green' | 'yellow' | 'red'
  sold_mandays: number
  actual_mandays: number
  budget_used_percent: number
  total_tasks: number
  done_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  progress_percent: number
}

export interface MonthlyTrend {
  month: number
  month_name: string
  total_hours: number
  employee_count: number
  avg_utilization: number
  done_tasks: number
  overdue_tasks: number
}

export interface LongBlockedTask {
  task_id: string
  task_code: string
  task_title: string
  assignee_name: string
  department_name: string
  project_name: string
  project_code: string
  days_blocked: number
}

export interface ExecutiveDashboardData {
  overview: ExecutiveOverview
  departments: DepartmentSummary[]
  projectHealth: ProjectHealth[]
  monthlyTrend: MonthlyTrend[]
  longBlockedTasks: LongBlockedTask[]
}

const MONTH_NAMES_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export async function getExecutiveDashboardData(year: number): Promise<ExecutiveDashboardData> {
  try {
    const pool = await getConnection()
    const currentMonth = new Date().getMonth() + 1

    // 1. Executive Overview
    const overviewResult = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, currentMonth)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM pms.employees WHERE is_active = 1) AS total_employees,
          (SELECT COUNT(DISTINCT p.id)
           FROM pms.projects p
           LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
           WHERE p.is_active = 1 AND (ps.code IS NULL OR ps.code NOT IN ('cancelled', 'completed'))
          ) AS total_active_projects,
          (SELECT COUNT(*) FROM pms.tasks WHERE is_active = 1 AND status <> 'cancelled') AS total_tasks,
          (SELECT COUNT(*) FROM pms.tasks WHERE is_active = 1 AND status IN ('done', 'done_not_planned')) AS done_tasks,
          (SELECT COUNT(*) FROM pms.tasks WHERE is_active = 1 AND status = 'blocked') AS blocked_tasks,
          (SELECT COUNT(*) FROM pms.tasks WHERE is_active = 1 AND due_date < CAST(GETDATE() AS DATE) AND status NOT IN ('done', 'done_not_planned', 'cancelled')) AS overdue_tasks,
          ISNULL((
            SELECT SUM(te.hours) FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            WHERE te.is_active = 1 AND YEAR(te.entry_date) = @year AND MONTH(te.entry_date) = @month
          ), 0) AS total_hours_this_month
      `)

    const ov = overviewResult.recordset[0]
    const empCount = ov.total_employees || 1
    const overview: ExecutiveOverview = {
      ...ov,
      avg_utilization_percent: Math.round((ov.total_hours_this_month / (empCount * 140)) * 100),
      overdue_rate: ov.total_tasks > 0 ? Math.round((ov.overdue_tasks / ov.total_tasks) * 100) : 0,
      done_rate: ov.total_tasks > 0 ? Math.round((ov.done_tasks / ov.total_tasks) * 100) : 0,
    }

    // 2. Department Summary
    const deptResult = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, currentMonth)
      .query(`
        SELECT
          d.id AS department_id,
          COALESCE(d.name_th, d.name) AS department_name,
          COUNT(DISTINCT e.id) AS employee_count,
          ISNULL(SUM(CASE WHEN t.id IS NOT NULL AND t.status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS total_tasks,
          ISNULL(SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END), 0) AS done_tasks,
          ISNULL(SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks,
          ISNULL(SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_tasks,
          ISNULL(SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END), 0) AS overdue_tasks,
          ISNULL((
            SELECT SUM(te.hours)
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t2 ON te.task_id = t2.id
            INNER JOIN pms.employees e2 ON t2.assignee_id = e2.id
            WHERE e2.department_id = d.id AND te.is_active = 1
              AND YEAR(te.entry_date) = @year AND MONTH(te.entry_date) = @month
          ), 0) AS total_hours
        FROM pms.departments d
        LEFT JOIN pms.employees e ON d.id = e.department_id AND e.is_active = 1
        LEFT JOIN pms.tasks t ON e.id = t.assignee_id AND t.is_active = 1
        WHERE d.is_active = 1
        GROUP BY d.id, d.name, d.name_th
        HAVING COUNT(DISTINCT e.id) > 0
        ORDER BY department_name
      `)

    const departments: DepartmentSummary[] = deptResult.recordset.map((d: any) => ({
      ...d,
      avg_utilization: d.employee_count > 0 ? Math.round((d.total_hours / (d.employee_count * 140)) * 100) : 0,
      done_rate: d.total_tasks > 0 ? Math.round((d.done_tasks / d.total_tasks) * 100) : 0,
      overdue_rate: d.total_tasks > 0 ? Math.round((d.overdue_tasks / d.total_tasks) * 100) : 0,
    }))

    // 3. Project Health
    const projectResult = await pool.request()
      .query(`
        SELECT
          p.id AS project_id,
          p.project_code,
          p.name AS project_name,
          COALESCE(pm.first_name_th + ' ' + ISNULL(pm.last_name_th, ''), pm.first_name + ' ' + ISNULL(pm.last_name, '')) AS project_manager,
          ISNULL(ps.code, 'unknown') AS status_code,
          ISNULL(ps.name, 'Unknown') AS status_name,
          ISNULL(p.sold_mandays, 0) AS sold_mandays,
          ISNULL((
            SELECT CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2))
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t2 ON te.task_id = t2.id
            INNER JOIN pms.stories s2 ON t2.story_id = s2.id
            WHERE s2.project_id = p.id AND te.is_active = 1
          ), 0) AS actual_mandays,
          COUNT(DISTINCT t.id) AS total_tasks,
          SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS done_tasks,
          SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
          SUM(CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks,
          0 AS progress_percent
        FROM pms.projects p
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
        LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
        LEFT JOIN pms.stories s ON p.id = s.project_id
        LEFT JOIN pms.tasks t ON s.id = t.story_id AND t.is_active = 1 AND t.status <> 'cancelled'
        WHERE p.is_active = 1
          AND (ps.code IS NULL OR ps.code NOT IN ('cancelled', 'completed'))
        GROUP BY p.id, p.project_code, p.name, pm.first_name_th, pm.last_name_th, pm.first_name, pm.last_name, ps.code, ps.name, p.sold_mandays
        ORDER BY overdue_tasks DESC, blocked_tasks DESC
      `)

    const projectHealth: ProjectHealth[] = projectResult.recordset.map((p: any) => {
      const budgetPercent = p.sold_mandays > 0 ? Math.round((p.actual_mandays / p.sold_mandays) * 100) : 0
      let health: 'green' | 'yellow' | 'red' = 'green'
      if (p.overdue_tasks > 0 || budgetPercent > 100) health = 'red'
      else if (p.blocked_tasks > 0 || budgetPercent > 80) health = 'yellow'

      return {
        ...p,
        budget_used_percent: budgetPercent,
        health
      }
    })

    // 4. Monthly Trend (this year)
    const trendResult = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT
          m.month_num AS month,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          COUNT(DISTINCT t.assignee_id) AS employee_count,
          ISNULL(COUNT(DISTINCT CASE WHEN t.status IN ('done', 'done_not_planned') AND YEAR(t.completed_date) = @year AND MONTH(t.completed_date) = m.month_num THEN t.id END), 0) AS done_tasks,
          ISNULL(COUNT(DISTINCT CASE WHEN t.due_date < EOMONTH(DATEFROMPARTS(@year, m.month_num, 1)) AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN t.id END), 0) AS overdue_tasks
        FROM (
          SELECT 1 AS month_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
          UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
          UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
        ) m
        LEFT JOIN pms.timesheet_entries te ON MONTH(te.entry_date) = m.month_num AND YEAR(te.entry_date) = @year AND te.is_active = 1
        LEFT JOIN pms.tasks t ON te.task_id = t.id
        WHERE m.month_num <= @month
        GROUP BY m.month_num
        ORDER BY m.month_num
      `)

    const monthlyTrend: MonthlyTrend[] = trendResult.recordset
      .filter((r: any) => r.month <= currentMonth)
      .map((r: any) => ({
        ...r,
        month_name: MONTH_NAMES_TH[r.month] || '',
        avg_utilization: r.employee_count > 0 ? Math.round((r.total_hours / (r.employee_count * 140)) * 100) : 0,
      }))

    // 5. Long Blocked Tasks (> 3 days)
    const longBlockedResult = await pool.request()
      .query(`
        SELECT TOP 10
          t.id AS task_id,
          t.task_code,
          t.title AS task_title,
          COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS assignee_name,
          ISNULL(d.name, '-') AS department_name,
          p.name AS project_name,
          p.project_code,
          DATEDIFF(DAY, t.updated_at, GETDATE()) AS days_blocked
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        LEFT JOIN pms.employees e ON t.assignee_id = e.id
        LEFT JOIN pms.departments d ON e.department_id = d.id
        WHERE t.is_active = 1 AND t.status = 'blocked'
          AND DATEDIFF(DAY, t.updated_at, GETDATE()) >= 3
        ORDER BY days_blocked DESC
      `)

    return { overview, departments, projectHealth, monthlyTrend, longBlockedTasks: longBlockedResult.recordset }

  } catch (error: any) {
    console.error('Error fetching executive dashboard data:', error?.message || error)
    throw error
    return {
      overview: { total_employees: 0, total_active_projects: 0, total_tasks: 0, done_tasks: 0, blocked_tasks: 0, overdue_tasks: 0, total_hours_this_month: 0, avg_utilization_percent: 0, overdue_rate: 0, done_rate: 0 },
      departments: [],
      projectHealth: [],
      monthlyTrend: [],
      longBlockedTasks: []
    }
  }
}
