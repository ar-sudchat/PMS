'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface TasksSummary {
    total_tasks: number
    todo_tasks: number
    in_progress_tasks: number
    review_tasks: number
    blocked_tasks: number
    overdue_tasks: number
    due_today_tasks: number
    due_this_week_tasks: number
    total_estimated_hours: number
    total_actual_hours: number
}

export interface OverdueTask {
    id: string
    task_code: string
    task_title: string
    task_type: string
    task_type_name: string
    task_type_color: string
    task_type_icon: string
    priority: string
    days_overdue: number
    due_date: string
    story_code: string
    story_title: string
    milestone_code: string
    milestone_name: string
    project_code: string
    project_name: string
}

export interface TodayTask {
    id: string
    task_code: string
    task_title: string
    task_type: string
    task_type_name: string
    task_type_color: string
    task_type_icon: string
    priority: string
    status: string
    estimated_hours: number
    story_code: string
    project_code: string
    project_name: string
}

export interface TimesheetToday {
    total_hours_today: number
    entry_count: number
    target_hours: number
    completion_percent: number
    entries: {
        id: string
        hours: number
        description: string
        task_code: string
        task_title: string
        task_type: string
        task_type_color: string
        project_code: string
        project_name: string
    }[]
}

export interface MyProject {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    status_name: string
    status_color: string
    total_stories: number
    completed_stories: number
    total_tasks: number
    completed_tasks: number
    sold_mandays: number
    used_mandays: number
    health_status: 'on_track' | 'at_risk' | 'overdue'
    end_date: string
}

export interface UpcomingMilestone {
    id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    due_date: string
    days_until_due: number
    milestone_status: string
    project_code: string
    project_name: string
    customer_name: string
    total_stories: number
    completed_stories: number
}

export interface TeamOverview {
    total_employees: number
    active_projects: number
    at_risk_projects: number
    pending_timesheet_approvals: number
    total_active_tasks: number
    completed_tasks_total: number
    overdue_tasks_total: number
}

export interface TeamWorkload {
    employee_id: string
    employee_code: string
    employee_name: string
    nickname: string
    position_code: string
    position_name: string
    department_name: string
    assigned_tasks: number
    estimated_hours_this_week: number
    logged_hours_this_week: number
    weekly_capacity_hours: number
    workload_percent: number
    overdue_tasks: number
}

export interface KpiSummary {
    avg_defect_ratio: number
    defect_ratio_target: number
    avg_rework_ratio: number
    rework_ratio_target: number
    on_time_delivery_percent: number
    on_time_delivery_target: number
    milestones_on_track_percent: number
    milestones_on_track_target: number
}

export interface DashboardData {
    user: {
        id: string
        name: string
        nickname: string
        role: string
    }
    summary: TasksSummary | null
    overdueTasks: OverdueTask[]
    todayTasks: TodayTask[]
    timesheetToday: TimesheetToday | null
    myProjects: MyProject[]
    upcomingMilestones: UpcomingMilestone[]
    teamOverview?: TeamOverview
    teamWorkload?: TeamWorkload[]
    kpiSummary?: KpiSummary
}

// ============================================
// GET DASHBOARD DATA (All in one)
// ============================================

export async function getDashboardData(): Promise<{ success: boolean; data: DashboardData | null; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()

        // 1. My Tasks Summary
        const summaryResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`SELECT * FROM pms.vw_dashboard_my_tasks_summary WHERE assignee_id = @employeeId`)

        const summary = summaryResult.recordset[0] || null

        // 2. Overdue Tasks (Top 5)
        const overdueResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT TOP 5 * FROM pms.vw_dashboard_overdue_tasks 
                WHERE assignee_id = @employeeId
                ORDER BY days_overdue DESC
            `)

        // 3. Today's Tasks
        const todayResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT * FROM pms.vw_dashboard_today_tasks 
                WHERE assignee_id = @employeeId
                ORDER BY 
                    CASE priority 
                        WHEN 'critical' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        ELSE 4 
                    END,
                    task_code
            `)

        // 4. My Timesheet Today
        const timesheetSummaryResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`SELECT * FROM pms.vw_dashboard_my_timesheet_today WHERE employee_id = @employeeId`)

        const timesheetDetailResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`SELECT * FROM pms.vw_dashboard_my_timesheet_today_detail WHERE employee_id = @employeeId`)

        const timesheetToday: TimesheetToday | null = timesheetSummaryResult.recordset[0]
            ? {
                ...timesheetSummaryResult.recordset[0],
                entries: timesheetDetailResult.recordset
            }
            : {
                total_hours_today: 0,
                entry_count: 0,
                target_hours: 7,
                completion_percent: 0,
                entries: []
            }

        // 5. My Projects (Top 5) - FIXED: ใช้ vw_dashboard_my_projects_by_member
        const projectsResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT TOP 5 
                    project_id, project_code, project_name, customer_name,
                    status_name, status_color, total_stories, completed_stories,
                    total_tasks, completed_tasks, sold_mandays, used_mandays,
                    health_status, end_date
                FROM (
                    SELECT DISTINCT
                        project_id, project_code, project_name, customer_name,
                        status_name, status_color, total_stories, completed_stories,
                        total_tasks, completed_tasks, sold_mandays, used_mandays,
                        health_status, contract_end_date AS end_date
                    FROM pms.vw_dashboard_my_projects_by_member 
                    WHERE owner_id = @employeeId OR team_member_id = @employeeId
                ) AS sub
                ORDER BY 
                    CASE health_status 
                        WHEN 'overdue' THEN 1 
                        WHEN 'at_risk' THEN 2 
                        ELSE 3 
                    END,
                    end_date
            `)

        // 6. Upcoming Milestones (Top 5) - FIXED: ใช้ subquery แทน
        const milestonesResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT TOP 5 
                    m.id, m.milestone_code, m.milestone_name, m.milestone_color,
                    m.due_date, m.days_until_due, m.milestone_status,
                    m.project_id, m.project_code, m.project_name, m.customer_name,
                    m.total_stories, m.completed_stories
                FROM pms.vw_dashboard_upcoming_milestones m
                WHERE m.owner_id = @employeeId
                   OR m.project_id IN (
                       SELECT DISTINCT project_id 
                       FROM pms.vw_dashboard_my_projects_by_member 
                       WHERE team_member_id = @employeeId
                   )
                ORDER BY m.due_date
            `)

        // Build base response
        const dashboardData: DashboardData = {
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname || '',
                role: user.role
            },
            summary,
            overdueTasks: overdueResult.recordset,
            todayTasks: todayResult.recordset,
            timesheetToday,
            myProjects: projectsResult.recordset,
            upcomingMilestones: milestonesResult.recordset
        }

        // Manager/Admin only data
        if (user.role === 'admin' || user.role === 'manager') {
            // 7. Team Overview
            const teamOverviewResult = await pool.request()
                .query(`SELECT * FROM pms.vw_dashboard_team_overview`)

            dashboardData.teamOverview = teamOverviewResult.recordset[0]

            // 8. Team Workload
            const teamWorkloadResult = await pool.request()
                .query(`SELECT * FROM pms.vw_dashboard_team_workload ORDER BY workload_percent DESC`)

            dashboardData.teamWorkload = teamWorkloadResult.recordset

            // 9. KPI Summary
            const kpiResult = await pool.request()
                .query(`SELECT * FROM pms.vw_dashboard_kpi_summary`)

            dashboardData.kpiSummary = kpiResult.recordset[0]
        }

        return { success: true, data: dashboardData }

    } catch (error: any) {
        console.error('getDashboardData error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET TASKS SUMMARY ONLY
// ============================================

export async function getMyTasksSummary() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`SELECT * FROM pms.vw_dashboard_my_tasks_summary WHERE assignee_id = @employeeId`)

        return { success: true, data: result.recordset[0] || null }

    } catch (error: any) {
        console.error('getMyTasksSummary error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET OVERDUE TASKS
// ============================================

export async function getMyOverdueTasks(limit: number = 5) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit) * FROM pms.vw_dashboard_overdue_tasks 
                WHERE assignee_id = @employeeId
                ORDER BY days_overdue DESC
            `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getMyOverdueTasks error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET TODAY TASKS
// ============================================

export async function getMyTodayTasks() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT * FROM pms.vw_dashboard_today_tasks 
                WHERE assignee_id = @employeeId
                ORDER BY 
                    CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                    task_code
            `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getMyTodayTasks error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET MY PROJECTS
// ============================================

export async function getMyProjects(limit: number = 5) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, user.id)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    project_id, project_code, project_name, customer_name,
                    status_name, status_color, total_stories, completed_stories,
                    total_tasks, completed_tasks, sold_mandays, used_mandays,
                    health_status, end_date
                FROM (
                    SELECT DISTINCT
                        project_id, project_code, project_name, customer_name,
                        status_name, status_color, total_stories, completed_stories,
                        total_tasks, completed_tasks, sold_mandays, used_mandays,
                        health_status, contract_end_date AS end_date
                    FROM pms.vw_dashboard_my_projects_by_member 
                    WHERE owner_id = @employeeId OR team_member_id = @employeeId
                ) AS sub
                ORDER BY 
                    CASE health_status 
                        WHEN 'overdue' THEN 1 
                        WHEN 'at_risk' THEN 2 
                        ELSE 3 
                    END,
                    end_date
            `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getMyProjects error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET TEAM WORKLOAD (Manager Only)
// ============================================

export async function getTeamWorkload() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: [] }
        }

        if (user.role !== 'admin' && user.role !== 'manager') {
            return { success: false, error: 'Not authorized', data: [] }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .query(`SELECT * FROM pms.vw_dashboard_team_workload ORDER BY workload_percent DESC`)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getTeamWorkload error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET KPI SUMMARY (Manager Only)
// ============================================

export async function getKpiSummary() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        if (user.role !== 'admin' && user.role !== 'manager') {
            return { success: false, error: 'Not authorized', data: null }
        }

        const pool = await getConnection()

        const result = await pool.request()
            .query(`SELECT * FROM pms.vw_dashboard_kpi_summary`)

        return { success: true, data: result.recordset[0] || null }

    } catch (error: any) {
        console.error('getKpiSummary error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// PROJECT HEALTH (OEE-STYLE) FUNCTIONS
// ============================================

import { calculateOverallHealth } from '@/lib/utils/health-calculator'

export interface ProjectHealthSummary {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    status: string
    current_milestone_name?: string
    next_due_date?: string | null
    delayed_milestones_count?: number
    pm_name?: string
    owner_name?: string
    time_score: number | null
    resource_score: number | null
    docs_score: number | null
    overall_health: number
    health_status: 'on-track' | 'at-risk' | 'critical'
}

export interface ProjectsOverviewSummary {
    total: number
    onTrack: number
    atRisk: number
    critical: number
    avgHealth: number
}

export interface MilestoneHealth {
    id: string
    milestone_name: string
    milestone_code: string
    due_date: string
    completed_date?: string
    is_verified: boolean
    is_locked: boolean
    time_score: number | null
    resource_score: number | null
    docs_score: number | null
    overall_health: number
    planned_mandays: number
    actual_mandays: number
    required_docs: number
    submitted_docs: number
}

/**
 * Level 1: Get projects health overview for portfolio view
 */
/**
 * Level 1: Get projects health overview for portfolio view (Enhanced)
 */
export async function getProjectsHealthOverview(filters?: {
    year?: number
    status?: string[]
    projectTypeId?: string[]
    pmId?: string[]
}): Promise<{
    success: boolean
    summary: ProjectsOverviewSummary
    projects: ProjectHealthSummary[]
    oee: { time: number; resource: number; docs: number; overall: number }
}> {
    try {
        const pool = await getConnection()

        let query = `
            SELECT 
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                ISNULL(c.name, '-') AS customer_name,
                ps.name AS status,
                mc.name AS current_milestone_name,
                -- Next Due Date Logic
                (SELECT TOP 1 pm.due_date 
                 FROM pms.project_milestones pm 
                 WHERE pm.project_id = p.id 
                 AND pm.completed_date IS NULL 
                 ORDER BY pm.due_date ASC) AS next_due_date,

                -- Delayed Milestones Count
                (SELECT COUNT(*) 
                 FROM pms.project_milestones pm 
                 WHERE pm.project_id = p.id 
                 AND pm.completed_date IS NULL 
                 AND pm.due_date < GETDATE()) AS delayed_milestones_count,
                
                -- Calculate scores from verified milestones
                (SELECT 
                    CASE WHEN COUNT(CASE WHEN pm.is_verified = 1 THEN 1 END) = 0 THEN NULL
                    ELSE ROUND(CAST(SUM(CASE WHEN pm.kpi_ttd_pass = 1 AND pm.is_verified = 1 THEN pm.weight_ttd ELSE 0 END) AS FLOAT) / 
                         NULLIF(SUM(CASE WHEN pm.is_verified = 1 THEN pm.weight_ttd ELSE 0 END), 0) * 100, 0)
                    END
                 FROM pms.project_milestones pm WHERE pm.project_id = p.id
                ) AS time_score,
                (SELECT 
                    CASE WHEN COUNT(CASE WHEN pm.is_verified = 1 THEN 1 END) = 0 THEN NULL
                    ELSE ROUND(CAST(SUM(CASE WHEN pm.kpi_mdc_pass = 1 AND pm.is_verified = 1 THEN pm.weight_mdc ELSE 0 END) AS FLOAT) / 
                         NULLIF(SUM(CASE WHEN pm.is_verified = 1 THEN pm.weight_mdc ELSE 0 END), 0) * 100, 0)
                    END
                 FROM pms.project_milestones pm WHERE pm.project_id = p.id
                ) AS resource_score,
                (SELECT 
                    CASE WHEN COUNT(CASE WHEN pd.is_required = 1 THEN 1 END) = 0 THEN NULL
                    ELSE ROUND(CAST(COUNT(CASE WHEN pd.is_required = 1 AND pd.submitted_date IS NOT NULL THEN 1 END) AS FLOAT) / 
                         NULLIF(COUNT(CASE WHEN pd.is_required = 1 THEN 1 END), 0) * 100, 0)
                    END
                 FROM pms.project_deliverables pd 
                 INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                 WHERE pm.project_id = p.id
                ) AS docs_score
            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
            LEFT JOIN pms.project_milestones cm ON p.current_milestone_id = cm.id
            LEFT JOIN pms.milestone_configs mc ON cm.milestone_config_id = mc.id
            WHERE 1=1
        `

        const request = pool.request()

        if (filters?.year) {
            query += ` AND p.project_year = @year`
            request.input('year', sql.Int, filters.year)
        }

        // Multi-select Filters using dynamic SQL injection safe approach (String split or multiple params)
        // For simplicity in MSSQL w/ node-mssql, passing lists is tricky. We'll iterate.
        if (filters?.status && filters.status.length > 0) {
            // Handle status list if passed (Assuming status names for now based on existing logic, or IDs)
            // Using simple IN clause with string injection (Safe if values are strictly controlled/validated)
            // But better to use parameters. For short lists:
            const params = filters.status.map((_, i) => `@status${i}`)
            query += ` AND ps.name IN (${params.join(',')})`
            filters.status.forEach((val, i) => request.input(`status${i}`, sql.NVarChar, val))
        }

        if (filters?.projectTypeId && filters.projectTypeId.length > 0) {
            const params = filters.projectTypeId.map((_, i) => `@ptype${i}`)
            query += ` AND p.project_type_id IN (${params.join(',')})`
            filters.projectTypeId.forEach((val, i) => request.input(`ptype${i}`, sql.UniqueIdentifier, val))
        }

        if (filters?.pmId && filters.pmId.length > 0) {
            const params = filters.pmId.map((_, i) => `@pm${i}`)
            query += ` AND p.project_manager_id IN (${params.join(',')})`
            filters.pmId.forEach((val, i) => request.input(`pm${i}`, sql.UniqueIdentifier, val))
        }

        query += ` ORDER BY p.project_code`

        const result = await request.query(query)

        const projects: ProjectHealthSummary[] = result.recordset.map((p: any) => {
            const overall = calculateOverallHealth(p.time_score, p.resource_score, p.docs_score)

            // Critical Attention Logic: < 50% OR Delayed Milestone
            let health_status: 'on-track' | 'at-risk' | 'critical' = 'on-track'

            if (overall < 50 || p.delayed_milestones_count > 0) {
                health_status = 'critical'
            } else if (overall < 80) {
                health_status = 'at-risk'
            }

            return {
                project_id: p.project_id,
                project_code: p.project_code,
                project_name: p.project_name,
                customer_name: p.customer_name,
                status: p.status,
                current_milestone_name: p.current_milestone_name,
                next_due_date: p.next_due_date,
                delayed_milestones_count: p.delayed_milestones_count,
                pm_name: p.pm_name,
                owner_name: p.owner_name,
                time_score: p.time_score,
                resource_score: p.resource_score,
                docs_score: p.docs_score,
                overall_health: overall,
                health_status
            }
        })

        const total = projects.length
        const onTrack = projects.filter(p => p.health_status === 'on-track').length
        const atRisk = projects.filter(p => p.health_status === 'at-risk').length
        const critical = projects.filter(p => p.health_status === 'critical').length
        const avgHealth = total > 0 ? Math.round(projects.reduce((sum, p) => sum + p.overall_health, 0) / total) : 0

        // Calculate OEE Aggregation
        const validTime = projects.filter(p => p.time_score !== null)
        const validResource = projects.filter(p => p.resource_score !== null)
        const validDocs = projects.filter(p => p.docs_score !== null)

        const oee = {
            time: validTime.length > 0 ? Math.round(validTime.reduce((s, p) => s + (p.time_score || 0), 0) / validTime.length) : 0,
            resource: validResource.length > 0 ? Math.round(validResource.reduce((s, p) => s + (p.resource_score || 0), 0) / validResource.length) : 0,
            docs: validDocs.length > 0 ? Math.round(validDocs.reduce((s, p) => s + (p.docs_score || 0), 0) / validDocs.length) : 0,
            overall: avgHealth
        }

        return {
            success: true,
            summary: { total, onTrack, atRisk, critical, avgHealth },
            projects,
            oee
        }
    } catch (error) {
        console.error('Error getting projects health overview:', error)
        return {
            success: false,
            summary: { total: 0, onTrack: 0, atRisk: 0, critical: 0, avgHealth: 0 },
            projects: [],
            oee: { time: 0, resource: 0, docs: 0, overall: 0 }
        }
    }
}

/**
 * Level 2: Get project health detail with milestone breakdown
 */
export async function getProjectHealthDetail(projectId: string): Promise<{
    success: boolean
    error?: string // Added error field
    project?: any
    overallHealth?: { time: number | null; resource: number | null; docs: number | null; overall: number }
    milestones?: MilestoneHealth[]
}> {
    try {
        const pool = await getConnection()

        const projectResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    p.id, p.project_code AS code, p.name, c.name AS customer_name,
                    ps.name AS status, ps.color AS status_color, -- Fixed: Join with status config
                    p.created_at AS start_date, p.warranty_end_date AS end_date
                FROM pms.projects p
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                WHERE p.id = @projectId
            `)

        if (projectResult.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        const milestonesResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    pm.id, mc.name AS milestone_name, mc.code AS milestone_code,
                    pm.due_date, pm.completed_date, pm.is_verified, pm.is_locked,
                    pm.kpi_ttd_pass, pm.kpi_mdc_pass, pm.kpi_docs_pass,
                    pm.planned_mandays, pm.actual_mandays, pm.weight_ttd, pm.weight_mdc,
                    (SELECT COUNT(*) FROM pms.project_deliverables pd WHERE pd.project_milestone_id = pm.id AND pd.is_required = 1) AS required_docs,
                    (SELECT COUNT(*) FROM pms.project_deliverables pd WHERE pd.project_milestone_id = pm.id AND pd.is_required = 1 AND pd.submitted_date IS NOT NULL) AS submitted_docs
                FROM pms.project_milestones pm
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id = @projectId
                ORDER BY pm.sort_order
            `)

        const milestones: MilestoneHealth[] = milestonesResult.recordset.map((m: any) => {
            const time_score = m.is_verified ? (m.kpi_ttd_pass ? 100 : 0) : null
            const resource_score = m.is_verified ? (m.kpi_mdc_pass ? 100 : 0) : null
            const docs_score = m.is_verified ? (m.required_docs > 0 ? Math.round((m.submitted_docs / m.required_docs) * 100) : 100) : null

            return {
                id: m.id,
                milestone_name: m.milestone_name,
                milestone_code: m.milestone_code,
                due_date: m.due_date,
                completed_date: m.completed_date,
                is_verified: m.is_verified,
                is_locked: m.is_locked,
                time_score, resource_score, docs_score,
                overall_health: calculateOverallHealth(time_score, resource_score, docs_score),
                planned_mandays: m.planned_mandays || 0,
                actual_mandays: m.actual_mandays || 0,
                required_docs: m.required_docs || 0,
                submitted_docs: m.submitted_docs || 0
            }
        })

        // Calculate overall project health from verified milestones
        const verified = milestones.filter(m => m.is_verified)
        const time = verified.length ? Math.round(verified.filter(m => m.time_score === 100).length / verified.length * 100) : null
        const resource = verified.length ? Math.round(verified.filter(m => m.resource_score === 100).length / verified.length * 100) : null
        const docs = verified.length ? Math.round(verified.reduce((s, m) => s + (m.docs_score || 0), 0) / verified.length) : null

        return {
            success: true,
            project: projectResult.recordset[0],
            overallHealth: { time, resource, docs, overall: calculateOverallHealth(time, resource, docs) },
            milestones
        }
    } catch (error: any) {
        console.error('Error getting project health detail:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Level 3: Get milestone health detail
 */
export async function getMilestoneHealthDetail(milestoneId: string): Promise<{
    success: boolean
    milestone?: any
    health?: any
    tasks?: any[]
    deliverables?: any[]
    resources?: any[]
}> {
    try {
        const pool = await getConnection()

        const msResult = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT pm.id, mc.name, mc.code, p.name AS project_name, pm.due_date, pm.completed_date,
                       pm.support_end_date, pm.is_verified, pm.planned_mandays, pm.actual_mandays,
                       pm.kpi_ttd_pass, pm.kpi_mdc_pass, pm.kpi_docs_pass
                FROM pms.project_milestones pm
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                WHERE pm.id = @milestoneId
            `)

        if (msResult.recordset.length === 0) return { success: false }
        const m = msResult.recordset[0]

        const tasksResult = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT t.id, t.task_code, t.title, CONCAT(e.first_name_th, ' ', e.last_name_th) AS assignee_name,
                       t.estimated_hours, t.actual_hours, t.progress_percent AS progress, t.status
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.employees e ON t.assignee_id = e.id
                WHERE s.milestone_id = @milestoneId AND t.is_active = 1
                ORDER BY t.sort_order
            `)

        const docsResult = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT id, name, is_required, submitted_date,
                       CASE WHEN submitted_date IS NOT NULL AND submitted_date <= (SELECT due_date FROM pms.project_milestones WHERE id = @milestoneId) THEN 1 ELSE 0 END AS is_on_time
                FROM pms.project_deliverables WHERE project_milestone_id = @milestoneId AND is_active = 1
                ORDER BY sort_order
            `)

        const resourcesResult = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT e.id AS employee_id, CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name, p.code AS position,
                       SUM(t.estimated_hours) AS planned_hours, SUM(t.actual_hours) AS actual_hours,
                       CASE WHEN SUM(t.estimated_hours) > 0 THEN ROUND((SUM(t.actual_hours) / SUM(t.estimated_hours)) * 100, 0) ELSE 0 END AS utilization
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.employees e ON t.assignee_id = e.id
                INNER JOIN pms.positions p ON e.position_id = p.id
                WHERE s.milestone_id = @milestoneId AND t.is_active = 1
                GROUP BY e.id, e.first_name_th, e.last_name_th, p.code
            `)

        const daysRemaining = m.due_date ? Math.ceil((new Date(m.due_date).getTime() - new Date().getTime()) / 86400000) : 0
        const totalDocs = docsResult.recordset.filter((d: any) => d.is_required).length
        const submittedDocs = docsResult.recordset.filter((d: any) => d.is_required && d.submitted_date).length

        return {
            success: true,
            milestone: { id: m.id, name: m.name, code: m.code, project_name: m.project_name, due_date: m.due_date, completed_date: m.completed_date, support_end_date: m.support_end_date, is_verified: m.is_verified, planned_mandays: m.planned_mandays || 0, actual_mandays: m.actual_mandays || 0 },
            health: {
                time: { score: m.is_verified ? (m.kpi_ttd_pass ? 100 : 0) : null, daysRemaining, status: daysRemaining > 0 ? 'On track' : 'Overdue' },
                resource: { score: m.is_verified ? (m.kpi_mdc_pass ? 100 : 0) : null, planned: m.planned_mandays || 0, actual: m.actual_mandays || 0, status: (m.actual_mandays || 0) <= (m.planned_mandays || 0) ? 'On budget' : 'Over budget' },
                docs: { score: m.is_verified ? (m.kpi_docs_pass ? 100 : 0) : null, submitted: submittedDocs, total: totalDocs, status: submittedDocs === totalDocs ? 'Complete' : 'Pending' }
            },
            tasks: tasksResult.recordset,
            deliverables: docsResult.recordset,
            resources: resourcesResult.recordset
        }
    } catch (error) {
        console.error('Error getting milestone health detail:', error)
        return { success: false }
    }
}
// ALIAS FOR USER COMPATIBILITY
export const getProjectDetail = getProjectHealthDetail

/**
 * Level 4: Project Control Tower Data (All-in-One for new UI)
 */
export async function getProjectControlTowerData(projectId: string): Promise<{
    success: boolean
    error?: string
    project?: any
    overallHealth?: { time: number | null; resource: number | null; docs: number | null; overall: number }
    milestones?: MilestoneHealth[]
    activeTasks?: any[]
    currentDeliverables?: any[]
    recentActivities?: any[]
}> {
    try {
        const healthResult = await getProjectHealthDetail(projectId)

        if (!healthResult.success || !healthResult.project) {
            return { success: false, error: healthResult.error || 'Project not found' }
        }

        const project = healthResult.project
        const milestones = healthResult.milestones || []

        // Identify Current Milestone
        const currentMilestoneIndex = milestones.findIndex(m => !m.is_verified)
        const currentMilestone = currentMilestoneIndex !== -1
            ? milestones[currentMilestoneIndex]
            : (milestones.length > 0 ? milestones[milestones.length - 1] : null)

        const pool = await getConnection()

        // 1. Fetch Active/Overdue Tasks
        const tasksResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    t.id, t.task_code, t.title, t.description, t.status, t.priority, t.due_date, t.estimated_hours, t.actual_hours, t.start_date,
                    e.first_name_th AS assignee_name, e.nickname AS assignee_nickname,
                    mc.name AS milestone_name, pm.id AS milestone_id,
                    s.id AS story_id, s.title AS story_title,
                    DATEDIFF(DAY, t.due_date, CAST(GETDATE() AS DATE)) AS days_overdue
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                LEFT JOIN pms.employees e ON t.assignee_id = e.id
                WHERE s.project_id = @projectId 
                  AND t.is_active = 1
                  AND t.status NOT IN ('done', 'cancelled')
                ORDER BY ISNULL(pm.sort_order, 9999), ISNULL(s.sort_order, 9999), t.due_date
            `)

        // 2. Fetch Deliverables for Current Milestone
        let deliverables: any[] = []
        if (currentMilestone) {
            const docsResult = await pool.request()
                .input('milestoneId', sql.UniqueIdentifier, currentMilestone.id)
                .query(`
                    SELECT 
                        pd.id, pdc.name, pd.is_required, pd.submitted_date, pd.file_path, pd.is_verified, pdc.id as config_id 
                    FROM pms.project_deliverables pd
                    INNER JOIN pms.deliverable_configs pdc ON pd.deliverable_config_id = pdc.id
                    WHERE pd.project_milestone_id = @milestoneId AND pd.is_active = 1
                    ORDER BY pd.sort_order
                `)
            deliverables = docsResult.recordset.map((d: any) => ({
                ...d,
                status: d.is_verified ? 'verified' : (d.submitted_date ? 'submitted' : 'pending'),
                verification_status: d.submitted_date ? 'submitted' : 'pending'
            }))
        }

        // 3. Fetch Recent Activities (Top 20)
        // Synthesizing log from tasks, deliverables, and milestones
        const activityResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT TOP 20 * FROM (
                    -- Task Completed (Activity)
                    SELECT 
                        'task_completed' as type,
                        t.title as name,
                        t.completed_date as date,
                        e.first_name_th as actor,
                        t.id as related_id
                    FROM pms.tasks t
                    JOIN pms.stories s ON t.story_id = s.id
                    LEFT JOIN pms.employees e ON t.assignee_id = e.id
                    WHERE s.project_id = @projectId 
                      AND t.status = 'done' 
                      AND t.completed_date IS NOT NULL
                    
                    UNION ALL

                     -- Task Created (Activity)
                    SELECT 
                        'task_created' as type,
                        t.title as name,
                        t.created_at as date,
                        e.first_name_th as actor,
                        t.id as related_id
                    FROM pms.tasks t
                    JOIN pms.stories s ON t.story_id = s.id
                    LEFT JOIN pms.employees e ON t.created_by = e.id
                    WHERE s.project_id = @projectId 
                      AND t.is_active = 1

                    UNION ALL

                    -- Deliverable Submitted
                    SELECT 
                        'deliverable_submitted' as type,
                        pdc.name as name,
                        pd.submitted_date as date,
                        CAST(NULL AS NVARCHAR(100)) as actor,
                        pd.id as related_id
                    FROM pms.project_deliverables pd
                    JOIN pms.deliverable_configs pdc ON pd.deliverable_config_id = pdc.id
                    JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                    WHERE pm.project_id = @projectId AND pd.submitted_date IS NOT NULL

                    UNION ALL

                    -- Milestone Completed
                    SELECT 
                        'milestone_completed' as type,
                        mc.name as name,
                        m.completed_date as date,
                        CAST(NULL AS NVARCHAR(100)) as actor,
                        m.id as related_id
                    FROM pms.project_milestones m
                    JOIN pms.milestone_configs mc ON m.milestone_config_id = mc.id
                    WHERE m.project_id = @projectId AND m.completed_date IS NOT NULL

                ) AS CombinedLog
                ORDER BY date DESC
            `)

        return {
            success: true,
            project: project,
            overallHealth: healthResult.overallHealth,
            milestones: milestones,
            activeTasks: tasksResult.recordset,
            currentDeliverables: deliverables,
            recentActivities: activityResult.recordset
        }

    } catch (error: any) {
        console.error('getProjectControlTowerData error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Verify all deliverables in a milestone and advance to the next milestone
 */
export async function verifyMilestoneAndAdvance(projectId: string, milestoneId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        const user = await getCurrentUser()
        const verifiedBy = user ? user.id : null

        const transaction = new sql.Transaction(pool)
        await transaction.begin()

        try {
            const request = new sql.Request(transaction)
            request.input('milestoneId', sql.UniqueIdentifier, milestoneId)
            request.input('projectId', sql.UniqueIdentifier, projectId)
            request.input('userId', sql.UniqueIdentifier, verifiedBy)

            // 1. Update Deliverables (Mark all as verified)
            // Note: In a real flow, we might check if they are submitted first, but "Verify All" implies manual override/approval.
            await request.query(`
                UPDATE pms.project_deliverables
                SET is_verified = 1, verified_at = GETDATE(), verified_by = @userId
                WHERE project_milestone_id = @milestoneId AND is_active = 1
            `)

            // 2. Update Milestone (Mark as verified/completed)
            await request.query(`
                UPDATE pms.project_milestones
                SET is_verified = 1, verified_at = GETDATE(), verified_by = @userId, completed_date = GETDATE()
                WHERE id = @milestoneId
            `)

            // 3. Find Next Milestone
            const nextMilestoneResult = await request.query(`
                SELECT TOP 1 id FROM pms.project_milestones
                WHERE project_id = @projectId 
                AND sort_order > (SELECT sort_order FROM pms.project_milestones WHERE id = @milestoneId)
                ORDER BY sort_order ASC
            `)

            if (nextMilestoneResult.recordset.length > 0) {
                const nextId = nextMilestoneResult.recordset[0].id
                await request.input('nextId', sql.UniqueIdentifier, nextId).query(`
                    UPDATE pms.projects SET current_milestone_id = @nextId WHERE id = @projectId
                 `)
            }

            await transaction.commit()
            return { success: true }

        } catch (err) {
            await transaction.rollback()
            throw err
        }

    } catch (error: any) {
        console.error('verifyMilestoneAndAdvance error:', error)
        return { success: false, error: error.message }
    }
}