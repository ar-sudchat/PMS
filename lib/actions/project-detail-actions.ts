'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface ProjectDetail {
    id: string
    project_code: string
    name: string
    description: string | null
    customer_id: string
    customer_name: string
    owner_id: string
    owner_name: string
    owner_nickname: string
    status: string
    status_name: string
    status_color: string
    project_year: number
    sold_mandays: number
    actual_mandays: number
    start_date: string
    end_date: string
    contract_end_date: string

    // Calculated
    total_stories: number
    completed_stories: number
    total_tasks: number
    completed_tasks: number
    used_mandays: number
    progress_percent: number
    health_status: 'on_track' | 'at_risk' | 'overdue'

    // KPIs
    defect_ratio: number
    rework_ratio: number
}

export interface ProjectMilestone {
    id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    due_date: string
    weight_percent: number
    planned_mandays: number
    actual_mandays: number
    stories_count: number
    tasks_count: number
    completed_tasks: number
    progress_percent: number
}

export interface ProjectTeamMember {
    employee_id: string
    employee_code: string
    employee_name: string
    nickname: string
    position_code: string
    position_name: string
    role_in_project: string
    assigned_tasks: number
    completed_tasks: number
    logged_hours: number
}

// ============================================
// GET PROJECT DETAIL
// ============================================

export async function getProjectDetail(projectId: string) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT 
          p.id,
          p.project_code,
          p.[name],
          p.[description],
          p.customer_id,
          c.[name] AS customer_name,
          p.[owner_id],
          CONCAT(owner.first_name_th, ' ', owner.last_name_th) AS owner_name,
          owner.nickname AS owner_nickname,
          p.[status],
          ps.[name] AS status_name,
          ps.color AS status_color,
          p.project_year,
          p.sold_mandays,
          p.[actual_mandays],
          p.start_date,
          p.[end_date],
          
          -- Stories count
          (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.[is_active] = 1) AS total_stories,
          (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.[is_active] = 1 AND s.[status] = 'done') AS completed_stories,
          
          -- Tasks count
          (SELECT COUNT(*) FROM pms.tasks t 
           INNER JOIN pms.stories s ON t.story_id = s.id 
           WHERE s.project_id = p.id AND t.[is_active] = 1) AS total_tasks,
          (SELECT COUNT(*) FROM pms.tasks t 
           INNER JOIN pms.stories s ON t.story_id = s.id 
           WHERE s.project_id = p.id AND t.[is_active] = 1 AND t.[status] = 'done') AS completed_tasks,
          
          -- Used mandays
          (SELECT ISNULL(SUM(te.hours), 0) / 8 FROM pms.timesheet_entries te
           INNER JOIN pms.tasks t ON te.task_id = t.id
           INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.project_id = p.id AND te.[is_active] = 1) AS used_mandays
          
        FROM pms.projects p
        LEFT JOIN pms.customers c ON p.customer_id = c.id
        LEFT JOIN pms.employees owner ON p.[owner_id] = owner.id
        LEFT JOIN pms.project_status_configs ps ON p.[status] = ps.code
        WHERE p.id = @projectId AND p.[is_active] = 1
      `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Project not found', data: null }
        }

        const project = result.recordset[0]

        // Calculate progress
        const progress_percent = project.total_tasks > 0
            ? Math.round((project.completed_tasks / project.total_tasks) * 100)
            : 0

        // Calculate health
        let health_status = 'on_track'
        if (new Date(project.end_date) < new Date()) {
            health_status = 'overdue'
        } else {
            const overdueCheck = await pool.request()
                .input('projectId', sql.UniqueIdentifier, projectId)
                .query(`
          SELECT COUNT(*) AS cnt FROM pms.tasks t
          INNER JOIN pms.stories s ON t.story_id = s.id
          WHERE s.project_id = @projectId 
            AND t.[is_active] = 1 
            AND t.[status] NOT IN ('done', 'cancelled')
            AND t.due_date < CAST(GETDATE() AS DATE)
        `)
            if (overdueCheck.recordset[0].cnt > 0) {
                health_status = 'at_risk'
            }
        }

        // Get KPIs
        const kpiResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT 
          CASE WHEN SUM(te.hours) > 0 
            THEN ROUND(SUM(CASE WHEN t.task_type = 'bug' THEN te.hours ELSE 0 END) / SUM(te.hours) * 100, 2)
            ELSE 0 END AS defect_ratio,
          CASE WHEN SUM(te.hours) > 0 
            THEN ROUND(SUM(CASE WHEN t.task_type = 'rework' THEN te.hours ELSE 0 END) / SUM(te.hours) * 100, 2)
            ELSE 0 END AS rework_ratio
        FROM pms.timesheet_entries te
        INNER JOIN pms.tasks t ON te.task_id = t.id
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE s.project_id = @projectId AND te.[is_active] = 1
      `)

        return {
            success: true,
            data: {
                ...project,
                progress_percent,
                health_status,
                defect_ratio: kpiResult.recordset[0]?.defect_ratio || 0,
                rework_ratio: kpiResult.recordset[0]?.rework_ratio || 0
            }
        }

    } catch (error: any) {
        console.error('getProjectDetail error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET PROJECT MILESTONES
// ============================================

export async function getProjectMilestones(projectId: string) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT 
          pm.id,
          mc.code AS milestone_code,
          mc.[name] AS milestone_name,
          mc.color AS milestone_color,
          pm.due_date,
          pm.weight_percent,
          pm.planned_mandays,
          
          (SELECT ISNULL(SUM(te.hours), 0) / 8 FROM pms.timesheet_entries te
           INNER JOIN pms.tasks t ON te.task_id = t.id
           INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.milestone_id = pm.id AND te.[is_active] = 1) AS actual_mandays,
          
          (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.[is_active] = 1) AS stories_count,
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.milestone_id = pm.id AND t.[is_active] = 1) AS tasks_count,
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.milestone_id = pm.id AND t.[is_active] = 1 AND t.[status] = 'done') AS completed_tasks
          
        FROM pms.project_milestones pm
        INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        WHERE pm.project_id = @projectId
        ORDER BY mc.[sequence]
      `)

        const milestones = result.recordset.map((m: any) => ({
            ...m,
            progress_percent: m.tasks_count > 0 ? Math.round((m.completed_tasks / m.tasks_count) * 100) : 0
        }))

        return { success: true, data: milestones }

    } catch (error: any) {
        console.error('getProjectMilestones error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET PROJECT TEAM
// ============================================

export async function getProjectTeam(projectId: string) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT DISTINCT
          e.id AS employee_id,
          e.employee_code,
          CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
          e.nickname,
          pos.code AS position_code,
          pos.[name] AS position_name,
          CASE WHEN p.[owner_id] = e.id THEN 'Owner' ELSE 'Member' END AS role_in_project,
          
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.[is_active] = 1) AS assigned_tasks,
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.[is_active] = 1 AND t.[status] = 'done') AS completed_tasks,
          (SELECT ISNULL(SUM(te.hours), 0) FROM pms.timesheet_entries te
           INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.project_id = @projectId AND te.employee_id = e.id AND te.[is_active] = 1) AS logged_hours
          
        FROM pms.employees e
        LEFT JOIN pms.positions pos ON e.position_id = pos.id
        LEFT JOIN pms.projects p ON p.id = @projectId
        WHERE e.[is_active] = 1
          AND (p.[owner_id] = e.id OR EXISTS (
              SELECT 1 FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
              WHERE s.project_id = @projectId AND t.assignee_id = e.id
            ))
        ORDER BY role_in_project DESC, e.first_name_th
      `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getProjectTeam error:', error)
        return { success: false, error: error.message, data: [] }
    }
}
