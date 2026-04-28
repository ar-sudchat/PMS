'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface DevCapacityRow {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    pm_name: string
    owner_name: string
    status_code: string
    project_year: number | null
    start_date: string | null
    end_date: string | null
    current_milestone_code: string | null
    current_milestone_name: string | null
    sold_mandays: number
    actual_mandays: number
    remaining_mandays: number
    percent_used: number
    budget_status: 'NORMAL' | 'WARNING' | 'OVER' | 'NO_BUDGET'
    assigned_employee_count: number
    total_tasks: number
    done_tasks: number
    in_progress_tasks: number
    blocked_tasks: number
    overdue_tasks: number
    progress_percent: number
}

export interface DevCapacitySummary {
    project_count: number
    total_sold_mandays: number
    total_actual_mandays: number
    total_remaining_mandays: number
    avg_utilization_percent: number
    total_assigned_employees: number
    over_budget_count: number
    warning_count: number
    blocked_task_count: number
    overdue_task_count: number
}

export interface DevCapacityPayload {
    summary: DevCapacitySummary
    projects: DevCapacityRow[]
    generated_at: string
}

// ============================================
// MAIN ACTION
// ============================================

/**
 * Returns onhand DEV projects (active, not closed/cancelled/on-hold) with
 * production-capacity metrics: sold vs actual mandays, assigned employees,
 * task health, current milestone. Designed to be the single payload feeding a
 * "Dev Capacity Dashboard" view.
 */
export async function getDevCapacityOverview(): Promise<{
    success: boolean
    data?: DevCapacityPayload
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                ISNULL(c.name, '-') AS customer_name,
                ISNULL(NULLIF(CONCAT(pm.first_name_th, ' ', pm.last_name_th), ' '),
                       CONCAT(pm.first_name, ' ', pm.last_name)) AS pm_name,
                COALESCE(
                    NULLIF(CONCAT(po.first_name_th, ' ', po.last_name_th), ' '),
                    NULLIF(CONCAT(po.first_name, ' ', po.last_name), ' '),
                    '-'
                ) AS owner_name,
                ISNULL(psc.code, '-') AS status_code,
                p.project_year,
                (SELECT MIN(pm2.due_date) FROM pms.project_milestones pm2 WHERE pm2.project_id = p.id AND pm2.due_date IS NOT NULL) AS start_date,
                (SELECT MAX(pm2.due_date) FROM pms.project_milestones pm2 WHERE pm2.project_id = p.id AND pm2.due_date IS NOT NULL) AS end_date,
                (SELECT mc.code FROM pms.project_milestones cur
                   INNER JOIN pms.milestone_configs mc ON cur.milestone_config_id = mc.id
                   WHERE cur.id = p.current_milestone_id) AS current_milestone_code,
                (SELECT mc.name FROM pms.project_milestones cur
                   INNER JOIN pms.milestone_configs mc ON cur.milestone_config_id = mc.id
                   WHERE cur.id = p.current_milestone_id) AS current_milestone_name,
                ISNULL(p.sold_mandays, 0) AS sold_mandays,
                ISNULL(md.actual_mandays, 0) AS actual_mandays,
                ISNULL(p.sold_mandays, 0) - ISNULL(md.actual_mandays, 0) AS remaining_mandays,
                CASE
                    WHEN ISNULL(p.sold_mandays, 0) > 0
                    THEN CAST(ROUND(ISNULL(md.actual_mandays, 0) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                    ELSE 0
                END AS percent_used,
                CASE
                    WHEN ISNULL(p.sold_mandays, 0) = 0 THEN 'NO_BUDGET'
                    WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) THEN 'OVER'
                    WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) * 0.9 THEN 'WARNING'
                    ELSE 'NORMAL'
                END AS budget_status,
                ISNULL(md.employee_count, 0) AS assigned_employee_count,
                ISNULL(tk.total_tasks, 0) AS total_tasks,
                ISNULL(tk.done_tasks, 0) AS done_tasks,
                ISNULL(tk.in_progress_tasks, 0) AS in_progress_tasks,
                ISNULL(tk.blocked_tasks, 0) AS blocked_tasks,
                ISNULL(tk.overdue_tasks, 0) AS overdue_tasks,
                CASE
                    WHEN ISNULL(tk.total_tasks, 0) > 0
                    THEN CAST(ROUND(ISNULL(tk.done_tasks, 0) * 100.0 / tk.total_tasks, 1) AS DECIMAL(5,1))
                    ELSE 0
                END AS progress_percent
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id AND pt.code = 'DEV'
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
            LEFT JOIN pms.employees po ON p.project_owner_id = po.id
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
            LEFT JOIN (
                SELECT
                    s.project_id,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
                    COUNT(DISTINCT te.employee_id) AS employee_count
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                GROUP BY s.project_id
            ) md ON p.id = md.project_id
            LEFT JOIN (
                SELECT
                    s.project_id,
                    COUNT(*) AS total_tasks,
                    SUM(CASE WHEN t.status IN ('done', 'done_not_planned') THEN 1 ELSE 0 END) AS done_tasks,
                    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
                    SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_tasks,
                    SUM(CASE
                        WHEN t.due_date < CAST(GETDATE() AS DATE)
                         AND t.status NOT IN ('done', 'done_not_planned', 'cancelled') THEN 1
                        ELSE 0 END) AS overdue_tasks
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.is_active = 1 AND s.is_active = 1 AND t.status <> 'cancelled'
                GROUP BY s.project_id
            ) tk ON p.id = tk.project_id
            WHERE p.is_active = 1
              AND (psc.code IS NULL OR psc.code NOT IN ('CLOSED', 'WARRANTY', 'CANCELLED', 'ON_HOLD'))
            ORDER BY
                CASE WHEN ISNULL(md.actual_mandays, 0) > ISNULL(p.sold_mandays, 0) THEN 0 ELSE 1 END,
                ISNULL(tk.overdue_tasks, 0) DESC,
                p.project_code DESC
        `)

        const projects: DevCapacityRow[] = result.recordset.map((r: any) => ({
            ...r,
            sold_mandays: Number(r.sold_mandays || 0),
            actual_mandays: Number(r.actual_mandays || 0),
            remaining_mandays: Number(r.remaining_mandays || 0),
            percent_used: Number(r.percent_used || 0),
            assigned_employee_count: Number(r.assigned_employee_count || 0),
            total_tasks: Number(r.total_tasks || 0),
            done_tasks: Number(r.done_tasks || 0),
            in_progress_tasks: Number(r.in_progress_tasks || 0),
            blocked_tasks: Number(r.blocked_tasks || 0),
            overdue_tasks: Number(r.overdue_tasks || 0),
            progress_percent: Number(r.progress_percent || 0),
        }))

        const summary: DevCapacitySummary = {
            project_count: projects.length,
            total_sold_mandays: projects.reduce((s, p) => s + p.sold_mandays, 0),
            total_actual_mandays: projects.reduce((s, p) => s + p.actual_mandays, 0),
            total_remaining_mandays: projects.reduce((s, p) => s + p.remaining_mandays, 0),
            avg_utilization_percent: projects.length > 0
                ? Math.round(projects.reduce((s, p) => s + p.percent_used, 0) / projects.length)
                : 0,
            total_assigned_employees: projects.reduce((s, p) => s + p.assigned_employee_count, 0),
            over_budget_count: projects.filter(p => p.budget_status === 'OVER').length,
            warning_count: projects.filter(p => p.budget_status === 'WARNING').length,
            blocked_task_count: projects.reduce((s, p) => s + p.blocked_tasks, 0),
            overdue_task_count: projects.reduce((s, p) => s + p.overdue_tasks, 0),
        }

        return {
            success: true,
            data: {
                summary,
                projects,
                generated_at: new Date().toISOString(),
            }
        }
    } catch (error: any) {
        console.error('getDevCapacityOverview error:', error)
        return { success: false, error: error.message }
    }
}
