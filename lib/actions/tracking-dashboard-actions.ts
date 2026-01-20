'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'

export interface TrackingProject {
    project_id: string
    project_code: string
    project_name: string
    project_type: string
    project_type_color: string
    customer_name: string
    status_name: string
    status_color: string
    owner_name: string
    owner_nickname: string
    pm_name: string
    pm_nickname: string
    sold_mandays: number
    used_mandays: number
    progress_percent: number
    milestones: TrackingMilestone[]
}

export interface TrackingMilestone {
    id: string
    name: string
    code: string
    color: string
    due_date: string
    month: number
    year: number
    status: 'completed' | 'current' | 'upcoming' | 'overdue'
}

export interface TrackingFilters {
    year?: number
    projectTypes?: string[]
    statuses?: string[]
    customerIds?: string[]
    ownerIds?: string[]
}

export interface FilterOption {
    value: string
    label: string
    color?: string
}

/**
 * Get filter options from database
 */
export async function getTrackingFilterOptions(): Promise<{
    projectTypes: FilterOption[]
    statuses: FilterOption[]
    customers: FilterOption[]
    owners: FilterOption[]
}> {
    try {
        const pool = await getConnection()

        const [typesResult, statusesResult, customersResult, ownersResult] = await Promise.all([
            pool.request().query(`SELECT id as value, name as label, color FROM pms.project_types WHERE is_active = 1`),
            pool.request().query(`SELECT id as value, name as label, color FROM pms.project_status_configs WHERE is_active = 1`),
            pool.request().query(`SELECT id as value, name as label FROM pms.customers WHERE is_active = 1 ORDER BY name`),
            pool.request().query(`
                SELECT DISTINCT e.id as value,
                       CONCAT(e.nickname, ' (', e.first_name_th, ')') as label
                FROM pms.employees e
                INNER JOIN pms.projects p ON p.project_owner_id = e.id
                WHERE e.is_active = 1
                ORDER BY label
            `)
        ])

        return {
            projectTypes: typesResult.recordset,
            statuses: statusesResult.recordset,
            customers: customersResult.recordset,
            owners: ownersResult.recordset
        }
    } catch (error) {
        console.error('Error getting filter options:', error)
        return { projectTypes: [], statuses: [], customers: [], owners: [] }
    }
}

/**
 * Get project tracking data with timeline
 */
export async function getTrackingProjects(filters: TrackingFilters = {}): Promise<TrackingProject[]> {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = 'WHERE p.is_active = 1'

        if (filters.year) {
            whereClause += ` AND p.project_year = @year`
            request.input('year', sql.Int, filters.year)
        }

        // Main projects query
        const projectsResult = await request.query(`
            SELECT
                p.id as project_id,
                p.project_code,
                p.name as project_name,
                ISNULL(pt.name, 'N/A') as project_type,
                ISNULL(pt.color, '#6b7280') as project_type_color,
                ISNULL(c.name, '-') as customer_name,
                ISNULL(ps.name, 'Unknown') as status_name,
                ISNULL(ps.color, '#6b7280') as status_color,
                ISNULL(CONCAT(e.first_name_th, ' ', e.last_name_th), '-') as owner_name,
                ISNULL(e.nickname, '-') as owner_nickname,
                ISNULL(CONCAT(pm.first_name_th, ' ', pm.last_name_th), '-') as pm_name,
                ISNULL(pm.nickname, '-') as pm_nickname,
                ISNULL(p.sold_mandays, 0) as sold_mandays,
                (SELECT ISNULL(SUM(ISNULL(hours,0))/8.0, 0) FROM pms.timesheet_entries te
                 INNER JOIN pms.tasks t ON te.task_id = t.id
                 INNER JOIN pms.stories s ON t.story_id = s.id
                 INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                 WHERE pm.project_id = p.id) as used_mandays,
                0 as progress_percent
            FROM pms.projects p
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.employees e ON p.project_owner_id = e.id
            LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
            ${whereClause}
            ORDER BY p.project_code
        `)

        // Get milestones for each project
        const projects: TrackingProject[] = []

        for (const project of projectsResult.recordset) {
            const milestonesResult = await pool.request()
                .input('projectId', sql.UniqueIdentifier, project.project_id)
                .query(`
                    SELECT 
                        pm.id,
                        mc.name,
                        mc.code,
                        ISNULL(mc.color, '#6b7280') as color,
                        pm.due_date,
                        MONTH(pm.due_date) as month,
                        YEAR(pm.due_date) as year,
                        CASE 
                            WHEN pm.completed_date IS NOT NULL THEN 'completed'
                            WHEN pm.due_date < GETDATE() AND pm.completed_date IS NULL THEN 'overdue'
                            WHEN pm.id = (SELECT current_milestone_id FROM pms.projects WHERE id = @projectId) THEN 'current'
                            ELSE 'upcoming'
                        END as status
                    FROM pms.project_milestones pm
                    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                    WHERE pm.project_id = @projectId
                    ORDER BY pm.sort_order
                `)

            projects.push({
                ...project,
                milestones: milestonesResult.recordset
            })
        }

        return projects
    } catch (error) {
        console.error('Error getting tracking projects:', error)
        return []
    }
}
