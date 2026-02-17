'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'

// ============================================
// Types
// ============================================

export interface StatusProject {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    current_milestone_label: string
    current_milestone_code: string
    current_milestone_color: string
    current_milestone_sort: number
    mapping_due_date: string | null
    systemtest_due_date: string | null
    uat_due_date: string | null
    golive_due_date: string | null
    grouping_month: number
    budget_mandays: number
    actual_mandays: number
}

export interface StatusOverviewFilters {
    year?: number
    customerId?: string
    managerId?: string
    ownerId?: string
    statusId?: string
    projectTypeId?: string
    milestoneIds?: string[]
    search?: string
}

export interface StatusOverviewData {
    projects: StatusProject[]
    summary: {
        total: number
        finished: number
        finished_pct: number
        active: number
    }
    focus_month: number
}

export interface StatusFilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; color: string }[]
    milestones: { id: string; code: string; name: string; color: string }[]
    projectTypes: { id: string; code: string; name: string; color: string }[]
}

// ============================================
// GET FILTER OPTIONS
// ============================================

export async function getStatusOverviewFilterOptions(): Promise<{ success: boolean; data: StatusFilterOptions | null }> {
    try {
        const pool = await getConnection()

        const [customers, managers, owners, years, statuses, milestones, projectTypes] = await Promise.all([
            pool.request().query(`SELECT id, code, name FROM pms.customers WHERE is_active = 1 ORDER BY name`),
            pool.request().query(`
                SELECT DISTINCT e.id,
                    CONCAT(e.first_name, ' ', e.last_name) as name,
                    CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th
                FROM pms.employees e WHERE e.is_active = 1 AND e.role = 'manager' ORDER BY name
            `),
            pool.request().query(`
                SELECT DISTINCT e.id,
                    CONCAT(e.first_name, ' ', e.last_name) as name,
                    CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th,
                    ISNULL(p.code, '') as position_code
                FROM pms.employees e
                LEFT JOIN pms.positions p ON e.position_id = p.id
                WHERE e.is_active = 1 ORDER BY name
            `),
            pool.request().query(`SELECT DISTINCT project_year FROM pms.projects WHERE is_active = 1 ORDER BY project_year DESC`),
            pool.request().query(`SELECT id, code, name, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`),
            pool.request().query(`SELECT id, code, name, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`),
            pool.request().query(`SELECT id, code, name, color FROM pms.project_types WHERE is_active = 1 ORDER BY sort_order`),
        ])

        return {
            success: true,
            data: {
                customers: customers.recordset,
                managers: managers.recordset,
                owners: owners.recordset,
                years: years.recordset.map((y: any) => y.project_year),
                statuses: statuses.recordset,
                milestones: milestones.recordset,
                projectTypes: projectTypes.recordset,
            }
        }
    } catch (error) {
        console.error('getStatusOverviewFilterOptions error:', error)
        return { success: false, data: null }
    }
}

// ============================================
// GET PROJECT STATUS OVERVIEW (with filters)
// ============================================

export async function getProjectStatusOverview(filters?: StatusOverviewFilters): Promise<StatusOverviewData> {
    try {
        const pool = await getConnection()
        const year = filters?.year || new Date().getFullYear()

        let query = `
            SELECT
                p.id as project_id,
                p.project_code,
                p.name as project_name,
                c.name as customer_name,

                -- Current Milestone
                mc.code as ms_code,
                mc.name as ms_name,
                mc.color as ms_color,
                mc.sort_order as ms_sort,

                -- Project Status
                psc.code as status_code,

                -- Mapping due date
                (SELECT TOP 1 pm1b.due_date
                 FROM pms.project_milestones pm1b
                 INNER JOIN pms.milestone_configs mc1b ON pm1b.milestone_config_id = mc1b.id
                 WHERE pm1b.project_id = p.id AND mc1b.code = 'MAPPING'
                ) as mapping_due_date,

                -- System Test due date
                (SELECT TOP 1 pm1c.due_date
                 FROM pms.project_milestones pm1c
                 INNER JOIN pms.milestone_configs mc1c ON pm1c.milestone_config_id = mc1c.id
                 WHERE pm1c.project_id = p.id AND mc1c.code = 'SYSTEMTEST'
                ) as systemtest_due_date,

                -- UAT due date (prefer UAT, fallback SYSTEMTEST)
                (SELECT TOP 1 pm2.due_date
                 FROM pms.project_milestones pm2
                 INNER JOIN pms.milestone_configs mc2 ON pm2.milestone_config_id = mc2.id
                 WHERE pm2.project_id = p.id AND mc2.code IN ('UAT', 'SYSTEMTEST')
                 ORDER BY mc2.sort_order DESC
                ) as uat_due_date,

                -- Go-Live due date
                (SELECT TOP 1 pm3.due_date
                 FROM pms.project_milestones pm3
                 INNER JOIN pms.milestone_configs mc3 ON pm3.milestone_config_id = mc3.id
                 WHERE pm3.project_id = p.id AND mc3.code = 'GOLIVE'
                ) as golive_due_date,

                ISNULL(p.sold_mandays, 0) AS budget_mandays,

                -- Actual mandays from timesheet (exclude cancelled tasks and cancelled timesheet entries)
                ISNULL((
                    SELECT CAST(SUM(te.hours) / 8.0 AS DECIMAL(10,1))
                    FROM pms.timesheet_entries te
                    INNER JOIN pms.tasks t ON te.task_id = t.id
                    INNER JOIN pms.stories s ON t.story_id = s.id
                    INNER JOIN pms.project_milestones pm_ts ON s.milestone_id = pm_ts.id
                    WHERE pm_ts.project_id = p.id
                      AND t.status <> 'cancelled'
                      AND te.status <> 'cancelled'
                ), 0) AS actual_mandays,

                -- Grouping date
                COALESCE(
                    (SELECT TOP 1 pm4.due_date FROM pms.project_milestones pm4
                     INNER JOIN pms.milestone_configs mc4 ON pm4.milestone_config_id = mc4.id
                     WHERE pm4.project_id = p.id AND mc4.code = 'GOLIVE'),
                    (SELECT TOP 1 pm5.due_date FROM pms.project_milestones pm5
                     INNER JOIN pms.milestone_configs mc5 ON pm5.milestone_config_id = mc5.id
                     WHERE pm5.project_id = p.id AND mc5.code IN ('UAT', 'SYSTEMTEST')
                     ORDER BY mc5.sort_order DESC),
                    p.end_date
                ) as grouping_date

            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
            LEFT JOIN pms.employees po ON p.project_owner_id = po.id
            LEFT JOIN pms.project_milestones cpm ON p.current_milestone_id = cpm.id
            LEFT JOIN pms.milestone_configs mc ON cpm.milestone_config_id = mc.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id

            WHERE p.is_active = 1
              AND (pt.code IS NULL OR pt.code <> 'MKT')
              AND p.project_year = @year
        `

        const request = pool.request()
        request.input('year', sql.Int, year)

        if (filters?.customerId) {
            query += ` AND p.customer_id = @customerId`
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }

        if (filters?.managerId) {
            query += ` AND p.project_manager_id = @managerId`
            request.input('managerId', sql.UniqueIdentifier, filters.managerId)
        }

        if (filters?.ownerId) {
            query += ` AND p.project_owner_id = @ownerId`
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        }

        if (filters?.statusId) {
            query += ` AND p.status_id = @statusId`
            request.input('statusId', sql.UniqueIdentifier, filters.statusId)
        }

        if (filters?.projectTypeId) {
            query += ` AND p.project_type_id = @projectTypeId`
            request.input('projectTypeId', sql.UniqueIdentifier, filters.projectTypeId)
        }

        if (filters?.milestoneIds && filters.milestoneIds.length > 0) {
            query += ` AND mc.id IN (${filters.milestoneIds.map((_, i) => `@ms${i}`).join(',')})`
            filters.milestoneIds.forEach((id, i) => {
                request.input(`ms${i}`, sql.UniqueIdentifier, id)
            })
        }

        if (filters?.search) {
            query += ` AND (p.name LIKE @search OR p.project_code LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        query += ` ORDER BY mc.sort_order, p.project_code`

        const result = await request.query(query)

        const today = new Date()
        const currentMonth = today.getMonth() + 1

        // Process projects
        const projects: StatusProject[] = result.recordset.map((r: any) => {
            const statusCode = (r.status_code || '').toUpperCase()
            const isFinished = statusCode === 'COMPLETED' || statusCode === 'CANCELLED'
            const isWait = !r.ms_code && !isFinished

            let label = r.ms_name || 'Wait'
            let color = r.ms_color || '#64748b'
            let sort = r.ms_sort ?? 99

            if (isFinished) {
                label = 'Finish'
                color = '#16a34a'
                sort = 100
            } else if (isWait) {
                label = 'Wait'
                color = '#64748b'
                sort = 99
            }

            let gMonth = 0
            if (r.grouping_date) {
                gMonth = new Date(r.grouping_date).getMonth() + 1
            }

            return {
                project_id: r.project_id,
                project_code: r.project_code,
                project_name: r.project_name,
                customer_name: r.customer_name || '',
                current_milestone_label: label,
                current_milestone_code: r.ms_code || '',
                current_milestone_color: color,
                current_milestone_sort: sort,
                mapping_due_date: r.mapping_due_date ? r.mapping_due_date.toISOString() : null,
                systemtest_due_date: r.systemtest_due_date ? r.systemtest_due_date.toISOString() : null,
                uat_due_date: r.uat_due_date ? r.uat_due_date.toISOString() : null,
                golive_due_date: r.golive_due_date ? r.golive_due_date.toISOString() : null,
                grouping_month: gMonth,
                budget_mandays: r.budget_mandays || 0,
                actual_mandays: parseFloat(r.actual_mandays) || 0,
            }
        })

        // Sort
        projects.sort((a, b) => {
            if (a.current_milestone_sort !== b.current_milestone_sort) {
                return a.current_milestone_sort - b.current_milestone_sort
            }
            const da = a.golive_due_date || a.uat_due_date || ''
            const db = b.golive_due_date || b.uat_due_date || ''
            return da.localeCompare(db)
        })

        // Summary
        const finished = projects.filter(p => p.current_milestone_label === 'Finish').length
        const active = projects.filter(p => p.current_milestone_label !== 'Finish').length
        const total = projects.length

        // Focus month
        let focusMonth = currentMonth

        return {
            projects,
            summary: {
                total,
                finished,
                finished_pct: total > 0 ? Math.round((finished / total) * 100) : 0,
                active,
            },
            focus_month: focusMonth,
        }

    } catch (error) {
        console.error('getProjectStatusOverview error:', error)
        return {
            projects: [],
            summary: { total: 0, finished: 0, finished_pct: 0, active: 0 },
            focus_month: new Date().getMonth() + 1,
        }
    }
}
