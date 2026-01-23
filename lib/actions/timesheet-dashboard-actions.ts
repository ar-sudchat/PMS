'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'

// Types
export interface TimesheetSummary {
  year: number
  month: number
  active_employees: number
  active_stories: number
  active_projects: number
  total_hours: number
  total_work_days: number
  avg_hours_per_employee: number
  avg_hours_per_day: number
  prev_month_hours?: number
  hours_change_percent?: number
}

export interface EmployeeTimesheetRow {
  employee_id: string
  employee_code: string
  employee_name: string
  department_name: string
  week1_hours: number
  week2_hours: number
  week3_hours: number
  week4_hours: number
  week5_hours: number
  total_hours: number
  utilization_percent: number
}

export interface DepartmentHours {
  department_id: string
  department_name: string
  employee_count: number
  total_hours: number
  avg_hours_per_entry: number
}

export interface ProjectHours {
  project_id: string
  project_code: string
  project_name: string
  planned_mandays: number
  total_hours: number
  actual_mandays: number
  budget_used_percent: number
  employee_count: number
}

export interface MissingTimesheet {
  employee_id: string
  employee_code: string
  employee_name: string
  department_name: string
  last_entry_date: string | null
  days_since_last_entry: number | null
  status: string
}

export interface WeeklyTrend {
  year: number
  week_number: number
  week_start: string
  employee_count: number
  total_hours: number
  target_hours: number
}

export interface LowUtilizationEmployee {
  employee_id: string
  employee_code: string
  employee_name: string
  department_name: string
  total_hours: number
  utilization_percent: number
}

// ดึงข้อมูล Summary
export async function getTimesheetSummary(year: number, month: number): Promise<TimesheetSummary> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        SELECT * FROM pms.vw_timesheet_dashboard_summary
        WHERE year = @year AND month = @month
      `)

    // ดึงเดือนก่อนหน้าเพื่อเปรียบเทียบ
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const prevResult = await pool.request()
      .input('year', sql.Int, prevYear)
      .input('month', sql.Int, prevMonth)
      .query(`
        SELECT total_hours FROM pms.vw_timesheet_dashboard_summary
        WHERE year = @year AND month = @month
      `)

    const current = result.recordset[0] || {
      year,
      month,
      active_employees: 0,
      active_stories: 0,
      active_projects: 0,
      total_hours: 0,
      total_work_days: 0,
      avg_hours_per_employee: 0,
      avg_hours_per_day: 0
    }
    const prevHours = prevResult.recordset[0]?.total_hours || 0

    return {
      ...current,
      prev_month_hours: prevHours,
      hours_change_percent: prevHours > 0
        ? Math.round((current.total_hours - prevHours) * 100 / prevHours)
        : 0
    }
  } catch (error) {
    console.error('Error fetching timesheet summary:', error)
    return {
      year,
      month,
      active_employees: 0,
      active_stories: 0,
      active_projects: 0,
      total_hours: 0,
      total_work_days: 0,
      avg_hours_per_employee: 0,
      avg_hours_per_day: 0,
      prev_month_hours: 0,
      hours_change_percent: 0
    }
  }
}

// ดึงข้อมูลพนักงานรายเดือน พร้อมแยกรายสัปดาห์
export async function getEmployeeTimesheetMonthly(year: number, month: number): Promise<EmployeeTimesheetRow[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        WITH MonthStart AS (
          SELECT DATEFROMPARTS(@year, @month, 1) AS month_start
        ),
        WeekNumbers AS (
          SELECT
            t.assignee_id,
            te.hours,
            DATEDIFF(WEEK, ms.month_start, te.entry_date) + 1 AS week_of_month
          FROM pms.timesheet_entries te
          INNER JOIN pms.tasks t ON te.task_id = t.id
          CROSS JOIN MonthStart ms
          WHERE te.is_active = 1
            AND YEAR(te.entry_date) = @year
            AND MONTH(te.entry_date) = @month
        )
        SELECT
          e.id AS employee_id,
          e.employee_code,
          COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,
          ISNULL(d.name, 'No Department') AS department_name,
          ISNULL(SUM(CASE WHEN wn.week_of_month = 1 THEN wn.hours END), 0) AS week1_hours,
          ISNULL(SUM(CASE WHEN wn.week_of_month = 2 THEN wn.hours END), 0) AS week2_hours,
          ISNULL(SUM(CASE WHEN wn.week_of_month = 3 THEN wn.hours END), 0) AS week3_hours,
          ISNULL(SUM(CASE WHEN wn.week_of_month = 4 THEN wn.hours END), 0) AS week4_hours,
          ISNULL(SUM(CASE WHEN wn.week_of_month >= 5 THEN wn.hours END), 0) AS week5_hours,
          ISNULL(SUM(wn.hours), 0) AS total_hours,
          CAST(ROUND(ISNULL(SUM(wn.hours), 0) * 100.0 / 140, 1) AS DECIMAL(5,1)) AS utilization_percent
        FROM pms.employees e
        LEFT JOIN pms.departments d ON e.department_id = d.id
        LEFT JOIN WeekNumbers wn ON e.id = wn.assignee_id
        WHERE e.is_active = 1
        GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.first_name, e.last_name, d.name
        ORDER BY total_hours DESC
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching employee timesheet monthly:', error)
    return []
  }
}

// ดึงชั่วโมงรายแผนก
export async function getHoursByDepartment(year: number, month: number): Promise<DepartmentHours[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        SELECT
          d.id AS department_id,
          d.name AS department_name,
          COUNT(DISTINCT t.assignee_id) AS employee_count,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          CAST(ROUND(AVG(te.hours), 2) AS DECIMAL(10,2)) AS avg_hours_per_entry
        FROM pms.departments d
        LEFT JOIN pms.employees e ON d.id = e.department_id AND e.is_active = 1
        LEFT JOIN pms.tasks t ON e.id = t.assignee_id
        LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
          AND te.is_active = 1
          AND YEAR(te.entry_date) = @year
          AND MONTH(te.entry_date) = @month
        WHERE d.is_active = 1
        GROUP BY d.id, d.name
        HAVING ISNULL(SUM(te.hours), 0) > 0
        ORDER BY total_hours DESC
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching hours by department:', error)
    return []
  }
}

// ดึงชั่วโมงรายโครงการ
export async function getHoursByProject(year: number, month: number): Promise<ProjectHours[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        SELECT TOP 10
          p.id AS project_id,
          p.project_code,
          p.name AS project_name,
          ISNULL(p.sold_mandays, 0) AS planned_mandays,
          COUNT(DISTINCT t.assignee_id) AS employee_count,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          CAST(ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
          CASE
            WHEN ISNULL(p.sold_mandays, 0) > 0
            THEN CAST(ROUND((ISNULL(SUM(te.hours), 0) / 7.0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
            ELSE 0
          END AS budget_used_percent
        FROM pms.projects p
        LEFT JOIN pms.stories s ON p.id = s.project_id
        LEFT JOIN pms.tasks t ON s.id = t.story_id
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
        LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
          AND te.is_active = 1
          AND YEAR(te.entry_date) = @year
          AND MONTH(te.entry_date) = @month
        WHERE p.is_active = 1
          AND (ps.code IS NULL OR ps.code <> 'cancelled')
        GROUP BY p.id, p.project_code, p.name, p.sold_mandays
        HAVING ISNULL(SUM(te.hours), 0) > 0
        ORDER BY total_hours DESC
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching hours by project:', error)
    return []
  }
}

// ดึง Trend รายสัปดาห์
export async function getWeeklyTrend(year: number): Promise<WeeklyTrend[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT
          YEAR(te.entry_date) AS year,
          DATEPART(WEEK, te.entry_date) AS week_number,
          MIN(te.entry_date) AS week_start,
          COUNT(DISTINCT t.assignee_id) AS employee_count,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          COUNT(DISTINCT t.assignee_id) * 35 AS target_hours
        FROM pms.timesheet_entries te
        LEFT JOIN pms.tasks t ON te.task_id = t.id
        WHERE te.is_active = 1
          AND YEAR(te.entry_date) = @year
        GROUP BY YEAR(te.entry_date), DATEPART(WEEK, te.entry_date)
        ORDER BY week_number
      `)

    return result.recordset.map((r: any) => ({
      ...r,
      week_start: r.week_start?.toISOString?.().split('T')[0] || r.week_start
    }))
  } catch (error) {
    console.error('Error fetching weekly trend:', error)
    return []
  }
}

// ดึงพนักงานที่ยังไม่บันทึก
export async function getMissingTimesheet(): Promise<MissingTimesheet[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .query(`
        WITH WeekDates AS (
          SELECT
            DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()), 0) AS current_week_start,
            DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()) - 1, 0) AS last_week_start
        ),
        EmployeeTimesheet AS (
          SELECT
            e.id AS employee_id,
            e.employee_code,
            COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,
            ISNULL(d.name, 'No Department') AS department_name,
            MAX(te.entry_date) AS last_entry_date
          FROM pms.employees e
          LEFT JOIN pms.departments d ON e.department_id = d.id
          LEFT JOIN pms.tasks t ON e.id = t.assignee_id
          LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.is_active = 1
          WHERE e.is_active = 1
          GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.first_name, e.last_name, d.name
        )
        SELECT
          et.*,
          DATEDIFF(DAY, et.last_entry_date, GETDATE()) AS days_since_last_entry,
          CASE
            WHEN et.last_entry_date IS NULL THEN 'Never submitted'
            WHEN et.last_entry_date < wd.last_week_start THEN 'Missing > 1 week'
            WHEN et.last_entry_date < wd.current_week_start THEN 'Missing this week'
            ELSE 'Up to date'
          END AS status
        FROM EmployeeTimesheet et
        CROSS JOIN WeekDates wd
        WHERE et.last_entry_date IS NULL
           OR et.last_entry_date < wd.current_week_start
        ORDER BY days_since_last_entry DESC
      `)

    return result.recordset.map((r: any) => ({
      ...r,
      last_entry_date: r.last_entry_date?.toISOString?.().split('T')[0] || null
    }))
  } catch (error) {
    console.error('Error fetching missing timesheet:', error)
    return []
  }
}

// ดึงพนักงานที่ Utilization ต่ำ
export async function getLowUtilizationEmployees(year: number, month: number, threshold: number = 70): Promise<LowUtilizationEmployee[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .input('threshold', sql.Decimal(5, 1), threshold)
      .query(`
        SELECT
          e.id AS employee_id,
          e.employee_code,
          COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS employee_name,
          ISNULL(d.name, 'No Department') AS department_name,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          CAST(ROUND(ISNULL(SUM(te.hours), 0) * 100.0 / 140, 1) AS DECIMAL(5,1)) AS utilization_percent
        FROM pms.employees e
        LEFT JOIN pms.departments d ON e.department_id = d.id
        LEFT JOIN pms.tasks t ON e.id = t.assignee_id
        LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
          AND te.is_active = 1
          AND YEAR(te.entry_date) = @year
          AND MONTH(te.entry_date) = @month
        WHERE e.is_active = 1
        GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.first_name, e.last_name, d.name
        HAVING CAST(ROUND(ISNULL(SUM(te.hours), 0) * 100.0 / 140, 1) AS DECIMAL(5,1)) < @threshold
          AND ISNULL(SUM(te.hours), 0) > 0
        ORDER BY utilization_percent ASC
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching low utilization employees:', error)
    return []
  }
}

// ดึงโครงการที่เกิน Budget
export async function getOverBudgetProjects(year: number, month: number): Promise<ProjectHours[]> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        SELECT
          p.id AS project_id,
          p.project_code,
          p.name AS project_name,
          ISNULL(p.sold_mandays, 0) AS planned_mandays,
          COUNT(DISTINCT t.assignee_id) AS employee_count,
          ISNULL(SUM(te.hours), 0) AS total_hours,
          CAST(ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
          CASE
            WHEN ISNULL(p.sold_mandays, 0) > 0
            THEN CAST(ROUND((ISNULL(SUM(te.hours), 0) / 7.0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
            ELSE 0
          END AS budget_used_percent
        FROM pms.projects p
        LEFT JOIN pms.stories s ON p.id = s.project_id
        LEFT JOIN pms.tasks t ON s.id = t.story_id
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
        LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
          AND te.is_active = 1
          AND YEAR(te.entry_date) = @year
          AND MONTH(te.entry_date) = @month
        WHERE p.is_active = 1
          AND ISNULL(p.sold_mandays, 0) > 0
          AND (ps.code IS NULL OR ps.code <> 'cancelled')
        GROUP BY p.id, p.project_code, p.name, p.sold_mandays
        HAVING (ISNULL(SUM(te.hours), 0) / 7.0) > p.sold_mandays
        ORDER BY budget_used_percent DESC
      `)

    return result.recordset
  } catch (error) {
    console.error('Error fetching over budget projects:', error)
    return []
  }
}

// ดึงข้อมูลทั้งหมดสำหรับ AI Analysis
export async function getTimesheetDataForAI(year: number, month: number) {
  const [
    summary,
    employees,
    departments,
    projects,
    weeklyTrend,
    missing,
    lowUtil,
    overBudget
  ] = await Promise.all([
    getTimesheetSummary(year, month),
    getEmployeeTimesheetMonthly(year, month),
    getHoursByDepartment(year, month),
    getHoursByProject(year, month),
    getWeeklyTrend(year),
    getMissingTimesheet(),
    getLowUtilizationEmployees(year, month),
    getOverBudgetProjects(year, month)
  ])

  return {
    summary,
    employees,
    departments,
    projects,
    weeklyTrend,
    missing,
    lowUtil,
    overBudget,
    meta: { year, month }
  }
}

// Types for AI data
export type TimesheetDashboardData = Awaited<ReturnType<typeof getTimesheetDataForAI>>
