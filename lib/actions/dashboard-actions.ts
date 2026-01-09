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
                target_hours: 8,
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
                        health_status, end_date
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
                        health_status, end_date
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