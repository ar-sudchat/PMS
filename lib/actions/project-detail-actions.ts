'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { effectivePlanMdSql } from '@/lib/actions/milestone-plan'

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
    project_manager_id: string
    project_manager_name: string
    project_owner_id: string
    project_owner_name: string
    project_owner_nickname: string
    status_id: string
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

// New Types for Table View
export interface StoryListItem {
    id: string
    story_code: string
    title: string
    milestone_id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    status: string
    priority: string
    estimated_md: number | null
    task_count: number
    completed_task_count: number
    progress_percent: number
    due_date: string | null
}

export interface TaskListItem {
    id: string
    task_code: string
    title: string
    story_id: string
    story_code: string
    story_title: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    task_type: string
    status: string
    priority: string
    assignee_id: string | null
    assignee_name: string | null
    assignee_nickname: string | null
    assignee_avatar: string | null
    estimated_hours: number | null
    actual_hours: number | null
    due_date: string | null
    is_overdue: boolean
    is_count_for_kpi: boolean
    attachment_count: number
}

// ... (ProjectSummary interface remains unchanged)

// ...

// ============================================
// NEW: GET PROJECT TASKS
// ============================================

export async function getProjectTasks(
    projectId: string,
    filters?: {
        storyId?: string
        milestoneId?: string
        status?: string
        priority?: string
        assigneeId?: string
        taskType?: string
        search?: string
    },
    sort?: { field: string; order: 'asc' | 'desc' },
    pagination?: { page: number; pageSize: number }
): Promise<{ data: TaskListItem[]; total: number }> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('projectId', sql.UniqueIdentifier, projectId)

        // Base Query using JOINs instead of View
        let query = `
            SELECT 
                t.id,
                t.task_code,
                t.title,
                t.story_id,
                s.story_code,
                s.title AS story_title,
                mc.code AS milestone_code,
                mc.name AS milestone_name,
                mc.color AS milestone_color,
                t.task_type,
                t.status,
                t.priority,
                t.assignee_id,
                CONCAT(e.first_name_th, ' ', e.last_name_th) AS assignee_name,
                e.nickname AS assignee_nickname,
                NULL AS assignee_avatar, -- Placeholder if avatar logic exists
                t.estimated_hours,
                t.actual_hours,
                t.due_date,
                CASE WHEN t.due_date < CAST(GETDATE() AS DATE) AND t.status != 'done' THEN 1 ELSE 0 END AS is_overdue,
                t.is_count_for_kpi,
                t.attachments
            FROM pms.tasks t
            JOIN pms.stories s ON t.story_id = s.id
            LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
            LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            LEFT JOIN pms.employees e ON t.assignee_id = e.id
            WHERE s.project_id = @projectId AND t.is_active = 1
        `

        // Filters
        if (filters?.storyId) {
            request.input('storyId', sql.UniqueIdentifier, filters.storyId)
            query += ` AND t.story_id = @storyId`
        }
        if (filters?.milestoneId && filters.milestoneId !== 'all') {
            request.input('milestoneId', sql.UniqueIdentifier, filters.milestoneId)
            query += ` AND s.milestone_id = @milestoneId`
        }
        if (filters?.status && filters.status !== 'all') {
            request.input('status', sql.VarChar, filters.status)
            query += ` AND t.status = @status`
        }
        if (filters?.priority && filters.priority !== 'all') {
            request.input('priority', sql.VarChar, filters.priority)
            query += ` AND t.priority = @priority`
        }
        if (filters?.assigneeId && filters.assigneeId !== 'all') {
            if (filters.assigneeId === 'unassigned') {
                query += ` AND t.assignee_id IS NULL`
            } else {
                request.input('assigneeId', sql.UniqueIdentifier, filters.assigneeId)
                query += ` AND t.assignee_id = @assigneeId`
            }
        }
        if (filters?.taskType && filters.taskType !== 'all') {
            request.input('taskType', sql.VarChar, filters.taskType)
            query += ` AND t.task_type = @taskType`
        }
        if (filters?.search) {
            request.input('search', sql.NVarChar, `%${filters.search}%`)
            query += ` AND (t.title LIKE @search OR t.task_code LIKE @search OR s.story_code LIKE @search)`
        }

        // Count Total
        const countQueryText = `SELECT COUNT(*) as total FROM (${query}) AS sub`
        const countResult = await request.query(countQueryText)
        const total = countResult.recordset[0].total

        // Sorting
        const sortField = sort?.field || 't.sort_order'
        const sortOrder = sort?.order || 'asc'

        // Map frontend sort fields to actual columns
        let dbSortField = sortField
        if (sortField === 'task_code') dbSortField = 't.task_code'
        if (sortField === 'title') dbSortField = 't.title'
        if (sortField === 'status') dbSortField = 't.status'
        if (sortField === 'priority') dbSortField = 't.priority'
        if (sortField === 'sort_order') dbSortField = 't.sort_order'

        query += ` ORDER BY ${dbSortField} ${sortOrder}`

        // Pagination
        if (pagination) {
            const offset = (pagination.page - 1) * pagination.pageSize
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${pagination.pageSize} ROWS ONLY`
        }

        const result = await request.query(query)

        // Process attachments and other fields
        const data: TaskListItem[] = result.recordset.map(row => {
            let attachmentCount = 0
            if (row.attachments) {
                try {
                    const parsed = JSON.parse(row.attachments)
                    if (Array.isArray(parsed)) attachmentCount = parsed.length
                } catch (e) {
                    // Ignore parse error
                }
            }

            return {
                id: row.id,
                task_code: row.task_code,
                title: row.title,
                story_id: row.story_id,
                story_code: row.story_code,
                story_title: row.story_title,
                milestone_code: row.milestone_code,
                milestone_name: row.milestone_name,
                milestone_color: row.milestone_color,
                task_type: row.task_type,
                status: row.status,
                priority: row.priority,
                assignee_id: row.assignee_id,
                assignee_name: row.assignee_name,
                assignee_nickname: row.assignee_nickname,
                assignee_avatar: row.assignee_avatar,
                estimated_hours: row.estimated_hours,
                actual_hours: row.actual_hours,
                due_date: row.due_date,
                is_overdue: !!row.is_overdue,
                is_count_for_kpi: row.is_count_for_kpi === null ? true : !!row.is_count_for_kpi, // Default true if null
                attachment_count: attachmentCount
            }
        })

        return {
            data,
            total
        }
    } catch (error) {
        console.error('getProjectTasks error:', error)
        return { data: [], total: 0 }
    }
}

export interface ProjectSummary {
    project: ProjectDetail
    milestone_summary: ProjectMilestone[]
    totals: {
        milestones: number
        stories: number
        tasks: number
        progress_percent: number
        planned_mandays: number
        actual_mandays: number
    }
}

// ============================================
// GET PROJECT DETAIL (Existing)
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
          p.project_manager_id,
          CONCAT(pm.first_name_th, ' ', pm.last_name_th) AS project_manager_name,
          p.project_owner_id,
          CONCAT(owner.first_name_th, ' ', owner.last_name_th) AS project_owner_name,
          owner.nickname AS project_owner_nickname,
          p.status_id,
          ps.code AS status,
          ps.name AS status_name,
          ps.color AS status_color,
          p.project_year,
          p.sold_mandays,
          p.actual_mandays,
          p.created_at AS start_date,
          p.warranty_end_date AS end_date,
          p.warranty_end_date AS contract_end_date,
          
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
          (SELECT ISNULL(SUM(te.hours), 0) / 7.0 FROM pms.timesheet_entries te
           INNER JOIN pms.tasks t ON te.task_id = t.id
           INNER JOIN pms.stories s ON t.story_id = s.id
           WHERE s.project_id = p.id AND te.[is_active] = 1) AS used_mandays
          
        FROM pms.projects p
        LEFT JOIN pms.customers c ON p.customer_id = c.id
        LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
        LEFT JOIN pms.employees owner ON p.project_owner_id = owner.id
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
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
// GET PROJECT MILESTONES (Existing)
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
          ep.eff_plan AS planned_mandays,

          (SELECT ISNULL(SUM(te.hours), 0) / 7.0 FROM pms.timesheet_entries te
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
        INNER JOIN pms.projects pr ON pr.id = pm.project_id
        CROSS APPLY (SELECT ${effectivePlanMdSql('pr.sold_mandays', 'pm', 'mc')} AS eff_plan) ep
        WHERE pm.project_id = @projectId
        ORDER BY mc.sort_order
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
// GET PROJECT TEAM (Existing)
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

// ============================================
// NEW: PROJECT SUMMARY (For Tab 1)
// ============================================

export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
    const [detailRes, milestoneRes] = await Promise.all([
        getProjectDetail(projectId),
        getProjectMilestones(projectId)
    ])

    if (!detailRes.success || !detailRes.data || !milestoneRes.success) {
        return null
    }

    const project = detailRes.data as ProjectDetail
    const milestones = milestoneRes.data as ProjectMilestone[]

    const totals = {
        milestones: milestones.length,
        stories: project.total_stories,
        tasks: project.total_tasks,
        progress_percent: project.progress_percent,
        planned_mandays: milestones.reduce((sum, m) => sum + (m.planned_mandays || 0), 0),
        actual_mandays: project.used_mandays // Used from detail query
    }

    return {
        project,
        milestone_summary: milestones,
        totals
    }
}

// ============================================
// NEW: GET PROJECT STORIES
// ============================================

export async function getProjectStories(
    projectId: string,
    filters?: {
        milestoneId?: string
        status?: string
        priority?: string
        search?: string
    },
    sort?: { field: string; order: 'asc' | 'desc' },
    pagination?: { page: number; pageSize: number }
): Promise<{ data: StoryListItem[]; total: number }> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('projectId', sql.UniqueIdentifier, projectId)

        let query = `SELECT * FROM pms.vw_project_stories_list WHERE project_id = @projectId`

        // Filters
        if (filters?.milestoneId && filters.milestoneId !== 'all') {
            request.input('milestoneId', sql.UniqueIdentifier, filters.milestoneId)
            query += ` AND milestone_id = @milestoneId`
        }
        if (filters?.status && filters.status !== 'all') {
            request.input('status', sql.VarChar, filters.status)
            query += ` AND status = @status`
        }
        if (filters?.priority && filters.priority !== 'all') {
            request.input('priority', sql.VarChar, filters.priority)
            query += ` AND priority = @priority`
        }
        if (filters?.search) {
            request.input('search', sql.NVarChar, `%${filters.search}%`)
            query += ` AND (title LIKE @search OR story_code LIKE @search)`
        }

        // Count Total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total')
        const countResult = await request.query(countQuery)
        const total = countResult.recordset[0].total

        // Sorting
        const sortField = sort?.field || 'sort_order'
        const sortOrder = sort?.order || 'asc'
        query += ` ORDER BY ${sortField} ${sortOrder}`

        // Pagination
        if (pagination) {
            const offset = (pagination.page - 1) * pagination.pageSize
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${pagination.pageSize} ROWS ONLY`
        }

        const result = await request.query(query)

        return {
            data: result.recordset as StoryListItem[],
            total
        }
    } catch (error) {
        console.error('getProjectStories error:', error)
        return { data: [], total: 0 }
    }
}

// ============================================
// NEW: GET PROJECT TASKS
// ============================================



// ============================================
// NEW: INLINE UPDATES
// ============================================

export async function updateStoryField(
    storyId: string,
    field: 'status' | 'priority' | 'milestone_id',
    value: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('id', sql.UniqueIdentifier, storyId)
        request.input('value', value)

        let updateQuery = ''
        if (field === 'status') updateQuery = 'UPDATE pms.stories SET status = @value, updated_at = GETDATE() WHERE id = @id'
        else if (field === 'priority') updateQuery = 'UPDATE pms.stories SET priority = @value, updated_at = GETDATE() WHERE id = @id'
        else if (field === 'milestone_id') updateQuery = 'UPDATE pms.stories SET milestone_id = @value, updated_at = GETDATE() WHERE id = @id'

        await request.query(updateQuery)

        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateTaskField(
    taskId: string,
    field: 'status' | 'priority' | 'assignee_id' | 'task_type',
    value: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('id', sql.UniqueIdentifier, taskId)

        // Handle null for assignee
        if (value === 'null' || value === null) {
            request.input('value', sql.UniqueIdentifier, null)
        } else {
            // Basic casting, mssql driver handles string to UID usually
            request.input('value', field === 'assignee_id' ? sql.UniqueIdentifier : sql.VarChar, value)
        }

        let updateQuery = ''
        if (field === 'status') updateQuery = 'UPDATE pms.tasks SET status = @value, updated_at = GETDATE() WHERE id = @id'
        else if (field === 'priority') updateQuery = 'UPDATE pms.tasks SET priority = @value, updated_at = GETDATE() WHERE id = @id'
        else if (field === 'assignee_id') updateQuery = 'UPDATE pms.tasks SET assignee_id = @value, updated_at = GETDATE() WHERE id = @id'
        else if (field === 'task_type') updateQuery = 'UPDATE pms.tasks SET task_type = @value, updated_at = GETDATE() WHERE id = @id'

        await request.query(updateQuery)

        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export interface StorySimple {
    id: string
    code: string
    title: string
    status: string
    priority: string
    task_count: number
    percent_complete: number
}

export interface MilestoneWithStories {
    id: string
    code: string
    name: string
    color: string
    progress: number
    stories: StorySimple[]
}

// ============================================
// NEW: GET MILESTONES WITH STORIES (Tree)
// ============================================

export async function getProjectMilestonesWithStories(projectId: string): Promise<{ success: boolean; data: MilestoneWithStories[]; error?: string }> {
    try {
        const pool = await getConnection()

        // 1. Get Milestones
        const milestonesRes = await getProjectMilestones(projectId)
        if (!milestonesRes.success) throw new Error(milestonesRes.error)

        const milestones = milestonesRes.data

        // 2. Get Stories for Project
        const request = pool.request()
        request.input('projectId', sql.UniqueIdentifier, projectId)

        const storiesQuery = `
            SELECT 
                s.id,
                s.story_code AS code,
                s.title,
                s.status,
                s.priority,
                s.milestone_id,
                (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) as task_count,
                (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1 AND t.status = 'done') as completed_task_count
            FROM pms.stories s
            WHERE s.project_id = @projectId AND s.is_active = 1
            ORDER BY s.story_code
        `
        const storiesResult = await request.query(storiesQuery)
        const stories = storiesResult.recordset

        // 3. Merge
        const mappedMilestones: MilestoneWithStories[] = milestones.map((m: any) => {
            const milestoneStories = stories
                .filter((s: any) => s.milestone_id === m.id)
                .map((s: any) => ({
                    id: s.id,
                    code: s.code,
                    title: s.title,
                    status: s.status,
                    priority: s.priority,
                    task_count: s.task_count,
                    percent_complete: s.task_count > 0 ? Math.round((s.completed_task_count / s.task_count) * 100) : 0
                }))

            return {
                id: m.id,
                code: m.milestone_code,
                name: m.milestone_name,
                color: m.milestone_color,
                progress: m.progress_percent,
                stories: milestoneStories
            }
        })

        // 4. Handle "Unassigned" Stories (No milestone or milestone not found)
        const assignedStoryIds = new Set(mappedMilestones.flatMap(m => m.stories.map(s => s.id)))
        const unassignedStories = stories
            .filter((s: any) => !assignedStoryIds.has(s.id))
            .map((s: any) => ({
                id: s.id,
                code: s.code,
                title: s.title,
                status: s.status,
                priority: s.priority,
                task_count: s.task_count,
                percent_complete: s.task_count > 0 ? Math.round((s.completed_task_count / s.task_count) * 100) : 0
            }))

        if (unassignedStories.length > 0) {
            mappedMilestones.push({
                id: 'unassigned',
                code: 'N/A',
                name: 'Unassigned',
                color: '#64748b', // Slate-500
                progress: 0,
                stories: unassignedStories
            })
        }

        return { success: true, data: mappedMilestones }

    } catch (error: any) {
        console.error('getProjectMilestonesWithStories error:', error)
        return { success: false, data: [], error: error.message }
    }
}
