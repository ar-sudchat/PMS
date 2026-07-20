'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { effectivePlanMdSql } from '@/lib/actions/milestone-plan'

// ============================================
// Types
// ============================================

export interface ProjectSummary {
    project_id: string
    project_code: string
    project_name: string
    customer_name: string | null
    owner_id: string
    owner_name: string
    status_code: string | null
    status_name: string | null

    // Timeline
    start_date: string | null
    planned_end_date: string | null
    planned_duration_days: number
    elapsed_days: number
    overdue_days: number

    // Man-day
    planned_mandays: number
    actual_mandays: number
    remaining_mandays: number
    manday_percent: number

    // Budget
    planned_budget: number
    actual_budget: number
    remaining_budget: number
    budget_percent: number

    // Progress
    overall_progress: number

    // Milestones
    total_milestones: number
    completed_milestones: number
    in_progress_milestones: number
    pending_milestones: number
    delayed_milestones: number
    current_milestone: string | null
    current_milestone_status: string | null
    current_milestone_date: string | null
    current_milestone_days_until: number | null

    // Health
    health_status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'OVER_BUDGET' | 'COMPLETED' | 'CANCELLED'

    // Project Type
    project_type_code: string | null
    project_type_name: string | null
}

export interface DashboardStats {
    owner_id: string
    owner_name: string
    total_projects: number
    on_track_count: number
    at_risk_count: number
    delayed_count: number
    completed_count: number
    cancelled_count: number
    total_planned_mandays: number
    total_actual_mandays: number
    total_remaining_mandays: number
    overall_manday_percent: number
    total_planned_budget: number
    total_actual_budget: number
}

export interface AttentionItem {
    project_id: string
    project_code: string
    project_name: string
    owner_id: string
    owner_name: string
    issue_type: string
    issue_description: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface MilestoneDetail {
    milestone_id: string
    project_id: string
    project_code: string
    project_name: string
    milestone_name: string
    milestone_code: string
    status: string
    planned_date: string | null
    actual_date: string | null
    planned_mandays: number
    actual_mandays: number
    days_until_due: number
    days_overdue: number
    completion_percent: number
    milestone_status_code: string
}

export interface UpcomingMilestone {
    milestone_id: string
    project_id: string
    project_code: string
    project_name: string
    milestone_name: string
    planned_date: string
    days_until_due: number
    status: string
    owner_id: string
    owner_name: string
    urgency: string
}

export interface ProjectMilestone {
    milestone_id: string
    milestone_name: string
    milestone_code: string
    status: string
    due_date: string | null
    completed_date: string | null
    planned_mandays: number
    actual_mandays: number
    progress_percent: number
    days_until_due: number
    days_overdue: number
    sort_order: number
}

export interface ProjectWithMilestones extends ProjectSummary {
    milestones: ProjectMilestone[]
}

// ============================================
// Helper function to check if view exists
// ============================================

async function viewExists(pool: sql.ConnectionPool, viewName: string): Promise<boolean> {
    const result = await pool.request()
        .input('viewName', sql.NVarChar, viewName)
        .query(`
            SELECT 1 FROM INFORMATION_SCHEMA.VIEWS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = @viewName
        `)
    return result.recordset.length > 0
}

// ============================================
// Dashboard Actions
// ============================================

// Get Dashboard Stats for Owner
export async function getOwnerDashboardStats(ownerId: string): Promise<DashboardStats | null> {
    try {
        const pool = await getConnection()

        // Check if view exists
        if (await viewExists(pool, 'vw_owner_dashboard_stats')) {
            const result = await pool.request()
                .input('owner_id', sql.UniqueIdentifier, ownerId)
                .query(`
                    SELECT * FROM pms.vw_owner_dashboard_stats
                    WHERE owner_id = @owner_id
                `)
            return result.recordset[0] || null
        }

        // Fallback: Calculate stats directly
        const projects = await getOwnerProjects(ownerId)
        if (!projects || projects.length === 0) return null

        const stats: DashboardStats = {
            owner_id: ownerId,
            owner_name: projects[0]?.owner_name || '',
            total_projects: projects.length,
            on_track_count: projects.filter(p => p.health_status === 'ON_TRACK').length,
            at_risk_count: projects.filter(p => p.health_status === 'AT_RISK').length,
            delayed_count: projects.filter(p => ['DELAYED', 'OVER_BUDGET'].includes(p.health_status)).length,
            completed_count: projects.filter(p => p.health_status === 'COMPLETED').length,
            cancelled_count: projects.filter(p => p.health_status === 'CANCELLED').length,
            total_planned_mandays: projects.reduce((sum, p) => sum + (p.planned_mandays || 0), 0),
            total_actual_mandays: projects.reduce((sum, p) => sum + (p.actual_mandays || 0), 0),
            total_remaining_mandays: projects.reduce((sum, p) => sum + (p.remaining_mandays || 0), 0),
            overall_manday_percent: 0,
            total_planned_budget: projects.reduce((sum, p) => sum + (p.planned_budget || 0), 0),
            total_actual_budget: projects.reduce((sum, p) => sum + (p.actual_budget || 0), 0)
        }

        if (stats.total_planned_mandays > 0) {
            stats.overall_manday_percent = Math.round((stats.total_actual_mandays / stats.total_planned_mandays) * 1000) / 10
        }

        return stats
    } catch (error) {
        console.error('getOwnerDashboardStats error:', error)
        return null
    }
}

// Get Projects for Owner
export async function getOwnerProjects(ownerId: string): Promise<ProjectSummary[]> {
    try {
        const pool = await getConnection()

        // Check if view exists
        if (await viewExists(pool, 'vw_project_owner_summary')) {
            const result = await pool.request()
                .input('owner_id', sql.UniqueIdentifier, ownerId)
                .query(`
                    SELECT * FROM pms.vw_project_owner_summary
                    WHERE owner_id = @owner_id
                    ORDER BY
                        CASE health_status
                            WHEN 'OVER_BUDGET' THEN 1
                            WHEN 'DELAYED' THEN 2
                            WHEN 'AT_RISK' THEN 3
                            WHEN 'ON_TRACK' THEN 4
                            WHEN 'COMPLETED' THEN 5
                            WHEN 'CANCELLED' THEN 6
                        END,
                        project_code
                `)
            return result.recordset
        }

        // Fallback: Query directly from tables
        const result = await pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)
            .query(`
                SELECT
                    p.id AS project_id,
                    p.project_code,
                    p.name AS project_name,
                    c.name AS customer_name,
                    COALESCE(p.project_owner_id, p.project_manager_id) AS owner_id,
                    COALESCE(
                        CONCAT(po.first_name_th, ' ', po.last_name_th),
                        CONCAT(pm.first_name_th, ' ', pm.last_name_th)
                    ) AS owner_name,
                    ps.code AS status_code,
                    ps.name AS status_name,
                    p.created_at AS start_date,
                    p.warranty_end_date AS planned_end_date,
                    ISNULL(p.sold_mandays, 0) AS planned_mandays,
                    ISNULL((
                        SELECT CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2))
                        FROM pms.timesheet_entries te
                        INNER JOIN pms.tasks t ON te.task_id = t.id
                        INNER JOIN pms.stories s ON t.story_id = s.id
                        WHERE s.project_id = p.id AND t.is_active = 1
                    ), 0) AS actual_mandays,
                    pt.code AS project_type_code,
                    pt.name AS project_type_name,
                    (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id) AS total_milestones,
                    (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status = 'completed') AS completed_milestones,
                    (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status = 'in_progress') AS in_progress_milestones,
                    p.updated_at
                FROM pms.projects p
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
                LEFT JOIN pms.employees po ON p.project_owner_id = po.id
                LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
                WHERE p.is_active = 1
                AND p.project_owner_id = @owner_id
                ORDER BY p.project_code
            `)

        // Transform and add calculated fields
        return result.recordset.map((p: any) => {
            const planned = p.sold_mandays || 0
            const actual = p.actual_mandays || 0
            const remaining = planned - actual
            const mandayPercent = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : 0
            const budget = planned * 10000
            const actualBudget = actual * 10000

            let healthStatus: ProjectSummary['health_status'] = 'ON_TRACK'
            if (p.status_code === 'COMPLETED' || p.status_code === 'CLOSED') {
                healthStatus = 'COMPLETED'
            } else if (p.status_code === 'CANCELLED') {
                healthStatus = 'CANCELLED'
            } else if (mandayPercent > 100) {
                healthStatus = 'OVER_BUDGET'
            } else if (mandayPercent > 90) {
                healthStatus = 'AT_RISK'
            }

            return {
                ...p,
                remaining_mandays: remaining,
                manday_percent: mandayPercent,
                planned_budget: budget,
                actual_budget: actualBudget,
                remaining_budget: budget - actualBudget,
                budget_percent: budget > 0 ? Math.round((actualBudget / budget) * 1000) / 10 : 0,
                overall_progress: p.total_milestones > 0 ? Math.round((p.completed_milestones / p.total_milestones) * 100) : 0,
                pending_milestones: p.total_milestones - p.completed_milestones - p.in_progress_milestones,
                delayed_milestones: 0,
                health_status: healthStatus,
                planned_duration_days: 0,
                elapsed_days: 0,
                overdue_days: 0,
                current_milestone: null,
                current_milestone_status: null,
                current_milestone_date: null,
                current_milestone_days_until: null
            } as ProjectSummary
        })
    } catch (error) {
        console.error('getOwnerProjects error:', error)
        return []
    }
}

// Get Single Project Summary
export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
    try {
        const pool = await getConnection()

        if (await viewExists(pool, 'vw_project_owner_summary')) {
            const result = await pool.request()
                .input('project_id', sql.UniqueIdentifier, projectId)
                .query(`
                    SELECT * FROM pms.vw_project_owner_summary
                    WHERE project_id = @project_id
                `)
            return result.recordset[0] || null
        }

        return null
    } catch (error) {
        console.error('getProjectSummary error:', error)
        return null
    }
}

// Get Attention Required Items
export async function getAttentionRequired(ownerId: string): Promise<AttentionItem[]> {
    try {
        const pool = await getConnection()

        if (await viewExists(pool, 'vw_project_attention_required')) {
            const result = await pool.request()
                .input('owner_id', sql.UniqueIdentifier, ownerId)
                .query(`
                    SELECT * FROM pms.vw_project_attention_required
                    WHERE owner_id = @owner_id
                    ORDER BY
                        CASE severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                        created_at DESC
                `)
            return result.recordset
        }

        // Fallback: Generate from projects
        const projects = await getOwnerProjects(ownerId)
        const attention: AttentionItem[] = []

        for (const p of projects) {
            if (p.manday_percent > 100) {
                attention.push({
                    project_id: p.project_id,
                    project_code: p.project_code,
                    project_name: p.project_name,
                    owner_id: p.owner_id,
                    owner_name: p.owner_name,
                    issue_type: 'MANDAY_OVER',
                    issue_description: `Man-day เกิน Budget ${Math.round(p.manday_percent - 100)}% (${Math.round(p.actual_mandays)}/${Math.round(p.planned_mandays)} MD)`,
                    severity: p.manday_percent > 120 ? 'HIGH' : 'MEDIUM'
                })
            }
        }

        return attention.sort((a, b) => {
            const severityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 }
            return severityOrder[a.severity] - severityOrder[b.severity]
        })
    } catch (error) {
        console.error('getAttentionRequired error:', error)
        return []
    }
}

// Get Project Milestones
export async function getProjectMilestones(projectId: string): Promise<MilestoneDetail[]> {
    try {
        const pool = await getConnection()

        if (await viewExists(pool, 'vw_project_milestones_detail')) {
            const result = await pool.request()
                .input('project_id', sql.UniqueIdentifier, projectId)
                .query(`
                    SELECT * FROM pms.vw_project_milestones_detail
                    WHERE project_id = @project_id
                    ORDER BY sort_order, planned_date
                `)
            return result.recordset
        }

        // Fallback
        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    pm.id AS milestone_id,
                    pm.project_id,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    mc.code AS milestone_code,
                    pm.status,
                    pm.due_date AS planned_date,
                    pm.completed_date AS actual_date,
                    ep.eff_plan AS planned_mandays,
                    ISNULL(pm.actual_mandays, 0) AS actual_mandays,
                    pm.sort_order,
                    DATEDIFF(DAY, GETDATE(), pm.due_date) AS days_until_due,
                    CASE
                        WHEN pm.status = 'completed' THEN 'COMPLETED'
                        WHEN pm.due_date < GETDATE() AND pm.status != 'completed' THEN 'DELAYED'
                        WHEN pm.status = 'in_progress' THEN 'IN_PROGRESS'
                        ELSE 'PENDING'
                    END AS milestone_status_code,
                    ISNULL(pm.progress_percent, 0) AS completion_percent
                FROM pms.project_milestones pm
                INNER JOIN pms.projects p ON pm.project_id = p.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                CROSS APPLY (SELECT ${effectivePlanMdSql('p.sold_mandays', 'pm', 'mc')} AS eff_plan) ep
                WHERE pm.project_id = @project_id
                ORDER BY pm.sort_order, pm.due_date
            `)

        return result.recordset.map((m: any) => ({
            ...m,
            days_overdue: m.days_until_due < 0 && m.milestone_status_code !== 'COMPLETED' ? Math.abs(m.days_until_due) : 0
        }))
    } catch (error) {
        console.error('getProjectMilestones error:', error)
        return []
    }
}

// Get Upcoming Milestones
export async function getUpcomingMilestones(ownerId: string): Promise<UpcomingMilestone[]> {
    try {
        const pool = await getConnection()

        if (await viewExists(pool, 'vw_upcoming_milestones')) {
            const result = await pool.request()
                .input('owner_id', sql.UniqueIdentifier, ownerId)
                .query(`
                    SELECT * FROM pms.vw_upcoming_milestones
                    WHERE owner_id = @owner_id
                    ORDER BY planned_date
                `)
            return result.recordset
        }

        // Fallback
        const result = await pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)
            .query(`
                SELECT
                    pm.id AS milestone_id,
                    pm.project_id,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    pm.due_date AS planned_date,
                    DATEDIFF(DAY, GETDATE(), pm.due_date) AS days_until_due,
                    pm.status,
                    COALESCE(p.project_owner_id, p.project_manager_id) AS owner_id,
                    COALESCE(
                        CONCAT(po.first_name_th, ' ', po.last_name_th),
                        CONCAT(pmgr.first_name_th, ' ', pmgr.last_name_th)
                    ) AS owner_name,
                    CASE
                        WHEN DATEDIFF(DAY, GETDATE(), pm.due_date) < 0 THEN 'OVERDUE'
                        WHEN DATEDIFF(DAY, GETDATE(), pm.due_date) <= 7 THEN 'THIS_WEEK'
                        WHEN DATEDIFF(DAY, GETDATE(), pm.due_date) <= 14 THEN 'NEXT_WEEK'
                        WHEN DATEDIFF(DAY, GETDATE(), pm.due_date) <= 30 THEN 'THIS_MONTH'
                        ELSE 'FUTURE'
                    END AS urgency
                FROM pms.project_milestones pm
                INNER JOIN pms.projects p ON pm.project_id = p.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                LEFT JOIN pms.employees po ON p.project_owner_id = po.id
                LEFT JOIN pms.employees pmgr ON p.project_manager_id = pmgr.id
                WHERE p.is_active = 1
                AND p.project_owner_id = @owner_id
                AND pm.status != 'completed'
                AND DATEDIFF(DAY, GETDATE(), pm.due_date) <= 30
                ORDER BY pm.due_date
            `)

        return result.recordset
    } catch (error) {
        console.error('getUpcomingMilestones error:', error)
        return []
    }
}

// Get Projects with Milestones
export async function getOwnerProjectsWithMilestones(ownerId: string): Promise<ProjectWithMilestones[]> {
    try {
        const pool = await getConnection()

        // Get projects
        const projects = await getOwnerProjects(ownerId)

        // Get milestones for all projects
        const projectIds = projects.map(p => p.project_id)
        if (projectIds.length === 0) return []

        const milestonesResult = await pool.request().query(`
            SELECT
                pm.id AS milestone_id,
                pm.project_id,
                mc.name AS milestone_name,
                mc.code AS milestone_code,
                pm.status,
                pm.due_date,
                pm.completed_date,
                ISNULL(vp.effective_planned_mandays, 0) AS planned_mandays,
                ISNULL(pm.actual_mandays, 0) AS actual_mandays,
                ISNULL(pm.progress_percent, 0) AS progress_percent,
                DATEDIFF(DAY, GETDATE(), pm.due_date) AS days_until_due,
                CASE
                    WHEN pm.due_date < GETDATE() AND pm.status != 'completed'
                    THEN DATEDIFF(DAY, pm.due_date, GETDATE())
                    ELSE 0
                END AS days_overdue,
                pm.sort_order
            FROM pms.project_milestones pm
            LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            LEFT JOIN pms.vw_milestone_plan_md vp ON vp.project_milestone_id = pm.id
            WHERE pm.project_id IN (${projectIds.map((_, i) => `@p${i}`).join(',')})
            ORDER BY pm.project_id, pm.sort_order
        `.replace(/@p\d+/g, (match, offset) => {
            const idx = parseInt(match.substring(2))
            return `'${projectIds[idx]}'`
        }))

        // Group milestones by project
        const milestonesByProject = new Map<string, ProjectMilestone[]>()
        for (const m of milestonesResult.recordset) {
            const projectId = m.project_id
            if (!milestonesByProject.has(projectId)) {
                milestonesByProject.set(projectId, [])
            }
            milestonesByProject.get(projectId)!.push({
                milestone_id: m.milestone_id,
                milestone_name: m.milestone_name,
                milestone_code: m.milestone_code,
                status: m.status,
                due_date: m.due_date,
                completed_date: m.completed_date,
                planned_mandays: m.planned_mandays,
                actual_mandays: m.actual_mandays,
                progress_percent: m.progress_percent,
                days_until_due: m.days_until_due,
                days_overdue: m.days_overdue,
                sort_order: m.sort_order
            })
        }

        // Combine projects with milestones
        return projects.map(p => ({
            ...p,
            milestones: milestonesByProject.get(p.project_id) || []
        }))
    } catch (error) {
        console.error('getOwnerProjectsWithMilestones error:', error)
        return []
    }
}

// Get All Dashboard Data
export async function getOwnerDashboardData(ownerId?: string) {
    try {
        let userId = ownerId

        if (!userId) {
            const user = await getCurrentUser()
            if (!user) {
                return { stats: null, projects: [], projectsWithMilestones: [], attention: [], upcomingMilestones: [] }
            }
            userId = user.id
        }

        const [stats, projects, projectsWithMilestones, attention, upcomingMilestones] = await Promise.all([
            getOwnerDashboardStats(userId),
            getOwnerProjects(userId),
            getOwnerProjectsWithMilestones(userId),
            getAttentionRequired(userId),
            getUpcomingMilestones(userId)
        ])

        return {
            stats,
            projects,
            projectsWithMilestones,
            attention,
            upcomingMilestones
        }
    } catch (error) {
        console.error('getOwnerDashboardData error:', error)
        return { stats: null, projects: [], projectsWithMilestones: [], attention: [], upcomingMilestones: [] }
    }
}

// ============================================
// Man-day Analysis
// ============================================

export async function getProjectMandayBreakdown(projectId: string) {
    try {
        const pool = await getConnection()

        // Man-day by Story/Module
        const byStory = await pool.request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    s.id AS story_id,
                    s.title AS story_name,
                    ISNULL(s.planned_mandays, 0) AS planned_mandays,
                    CAST(ROUND(ISNULL(SUM(te.hours), 0) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
                    CASE
                        WHEN ISNULL(s.planned_mandays, 0) > 0
                        THEN CAST(ROUND(ISNULL(SUM(te.hours), 0) / 7.0 * 100.0 / s.planned_mandays, 1) AS DECIMAL(5,1))
                        ELSE 0
                    END AS percent_used
                FROM pms.stories s
                LEFT JOIN pms.tasks t ON s.id = t.story_id AND t.is_active = 1
                LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id
                WHERE s.project_id = @project_id AND s.is_active = 1
                GROUP BY s.id, s.title, s.planned_mandays
                ORDER BY actual_mandays DESC
            `)

        // Man-day by Employee
        const byEmployee = await pool.request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    e.id AS employee_id,
                    CONCAT(e.first_name_th, ' ', e.last_name_th) AS employee_name,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.employees e ON te.employee_id = e.id
                WHERE s.project_id = @project_id AND t.is_active = 1
                GROUP BY e.id, e.first_name_th, e.last_name_th
                ORDER BY mandays DESC
            `)

        // Man-day by Month (Trend)
        const byMonth = await pool.request()
            .input('project_id', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    YEAR(te.work_date) AS year,
                    MONTH(te.work_date) AS month,
                    CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS mandays
                FROM pms.timesheet_entries te
                INNER JOIN pms.tasks t ON te.task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE s.project_id = @project_id AND t.is_active = 1
                GROUP BY YEAR(te.work_date), MONTH(te.work_date)
                ORDER BY year, month
            `)

        return {
            byStory: byStory.recordset,
            byEmployee: byEmployee.recordset,
            byMonth: byMonth.recordset
        }
    } catch (error) {
        console.error('getProjectMandayBreakdown error:', error)
        return { byStory: [], byEmployee: [], byMonth: [] }
    }
}

// ============================================
// Owner Options for Combobox
// ============================================

export interface OwnerOption {
    id: string
    name: string
    position_code: string | null
    project_count: number
}

export interface ProjectTypeOption {
    id: string
    code: string
    name: string
    project_count: number
}

export interface ProjectStatusOption {
    id: string
    code: string
    name: string
    project_count: number
}

export interface DashboardFilters {
    ownerId: string
    projectTypeId?: string
    statusId?: string
    excludeCancelled?: boolean
}

export async function getOwnerOptions(): Promise<OwnerOption[]> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT DISTINCT
                e.id,
                COALESCE(
                    CONCAT(e.first_name_th, ' ', e.last_name_th),
                    CONCAT(e.first_name, ' ', e.last_name)
                ) AS name,
                p.code AS position_code,
                (
                    SELECT COUNT(*)
                    FROM pms.projects proj
                    LEFT JOIN pms.project_status_configs psc ON proj.status_id = psc.id
                    WHERE proj.is_active = 1
                    AND proj.project_owner_id = e.id
                    AND (psc.code IS NULL OR psc.code != 'CANCELLED')
                ) AS project_count
            FROM pms.employees e
            LEFT JOIN pms.positions p ON e.position_id = p.id
            WHERE e.is_active = 1
            AND EXISTS (SELECT 1 FROM pms.projects WHERE project_owner_id = e.id AND is_active = 1)
            ORDER BY name
        `)

        return result.recordset
    } catch (error) {
        console.error('getOwnerOptions error:', error)
        return []
    }
}

// Get Project Type Options
export async function getProjectTypeOptions(): Promise<ProjectTypeOption[]> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                pt.id,
                pt.code,
                pt.name,
                (
                    SELECT COUNT(*)
                    FROM pms.projects p
                    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
                    WHERE p.project_type_id = pt.id AND p.is_active = 1
                    AND (psc.code IS NULL OR psc.code != 'CANCELLED')
                ) AS project_count
            FROM pms.project_types pt
            WHERE pt.is_active = 1
            ORDER BY pt.code
        `)

        return result.recordset
    } catch (error) {
        console.error('getProjectTypeOptions error:', error)
        return []
    }
}

// Get Project Status Options
export async function getProjectStatusOptions(): Promise<ProjectStatusOption[]> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT
                psc.id,
                psc.code,
                ISNULL(psc.name_th, psc.name) AS name,
                (
                    SELECT COUNT(*)
                    FROM pms.projects p
                    WHERE p.status_id = psc.id AND p.is_active = 1
                ) AS project_count
            FROM pms.project_status_configs psc
            WHERE psc.is_active = 1
            ORDER BY psc.sort_order
        `)

        return result.recordset
    } catch (error) {
        console.error('getProjectStatusOptions error:', error)
        return []
    }
}

// Get Dashboard Data with Filters
export async function getOwnerDashboardDataWithFilters(filters: DashboardFilters) {
    try {
        const { ownerId, projectTypeId, statusId, excludeCancelled = true } = filters

        const [stats, projectsWithMilestones, attention, upcomingMilestones] = await Promise.all([
            getOwnerDashboardStatsFiltered(ownerId, projectTypeId, statusId, excludeCancelled),
            getOwnerProjectsWithMilestonesFiltered(ownerId, projectTypeId, statusId, excludeCancelled),
            getAttentionRequiredFiltered(ownerId, projectTypeId, statusId),
            getUpcomingMilestonesFiltered(ownerId, projectTypeId, statusId)
        ])

        return {
            stats,
            projects: [],
            projectsWithMilestones,
            attention,
            upcomingMilestones
        }
    } catch (error) {
        console.error('getOwnerDashboardDataWithFilters error:', error)
        return { stats: null, projects: [], projectsWithMilestones: [], attention: [], upcomingMilestones: [] }
    }
}

// Filtered Dashboard Stats
async function getOwnerDashboardStatsFiltered(
    ownerId: string,
    projectTypeId?: string,
    statusId?: string,
    excludeCancelled: boolean = true
): Promise<DashboardStats | null> {
    try {
        console.log('getOwnerDashboardStatsFiltered - ownerId:', ownerId, 'projectTypeId:', projectTypeId, 'statusId:', statusId, 'excludeCancelled:', excludeCancelled)

        const pool = await getConnection()

        const request = pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)

        let whereClause = `p.project_owner_id = @owner_id AND p.is_active = 1`

        if (projectTypeId) {
            request.input('project_type_id', sql.UniqueIdentifier, projectTypeId)
            whereClause += ` AND p.project_type_id = @project_type_id`
        }

        if (statusId) {
            request.input('status_id', sql.UniqueIdentifier, statusId)
            whereClause += ` AND p.status_id = @status_id`
        }

        if (excludeCancelled) {
            whereClause += ` AND (psc.code IS NULL OR psc.code != 'CANCELLED')`
        }

        // Use simpler query without complex aggregates
        const result = await request.query(`
            SELECT
                @owner_id AS owner_id,
                (SELECT COALESCE(CONCAT(first_name_th, ' ', last_name_th), CONCAT(first_name, ' ', last_name)) FROM pms.employees WHERE id = @owner_id) AS owner_name,
                COUNT(*) AS total_projects,
                SUM(CASE WHEN psc.code IN ('ACTIVE', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS on_track_count,
                0 AS at_risk_count,
                0 AS delayed_count,
                SUM(CASE WHEN psc.code = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN psc.code = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
                ISNULL(SUM(p.sold_mandays), 0) AS total_planned_mandays,
                0 AS total_actual_mandays,
                ISNULL(SUM(p.sold_mandays), 0) AS total_remaining_mandays,
                0 AS overall_manday_percent,
                ISNULL(SUM(p.sold_mandays * p.manday_rate), 0) AS total_planned_budget,
                0 AS total_actual_budget
            FROM pms.projects p
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE ${whereClause}
        `)

        console.log('getOwnerDashboardStatsFiltered - whereClause:', whereClause)
        console.log('getOwnerDashboardStatsFiltered - result:', result.recordset[0])

        return result.recordset[0] || null
    } catch (error) {
        console.error('getOwnerDashboardStatsFiltered error:', error)
        return null
    }
}

// Filtered Projects with Milestones
async function getOwnerProjectsWithMilestonesFiltered(
    ownerId: string,
    projectTypeId?: string,
    statusId?: string,
    excludeCancelled: boolean = true
): Promise<ProjectWithMilestones[]> {
    try {
        const pool = await getConnection()

        const request = pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)

        let whereClause = `p.project_owner_id = @owner_id AND p.is_active = 1`

        if (projectTypeId) {
            request.input('project_type_id', sql.UniqueIdentifier, projectTypeId)
            whereClause += ` AND p.project_type_id = @project_type_id`
        }

        if (statusId) {
            request.input('status_id', sql.UniqueIdentifier, statusId)
            whereClause += ` AND p.status_id = @status_id`
        }

        if (excludeCancelled) {
            whereClause += ` AND (psc.code IS NULL OR psc.code != 'CANCELLED')`
        }

        const projectsResult = await request.query(`
            SELECT
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                c.name AS customer_name,
                p.project_owner_id AS owner_id,
                COALESCE(CONCAT(e.first_name_th, ' ', e.last_name_th), CONCAT(e.first_name, ' ', e.last_name)) AS owner_name,
                psc.code AS status_code,
                ISNULL(psc.name_th, psc.name) AS status_name,
                NULL AS start_date,
                NULL AS planned_end_date,
                0 AS planned_duration_days,
                0 AS elapsed_days,
                0 AS overdue_days,
                ISNULL(p.sold_mandays, 0) AS planned_mandays,
                CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays,
                ISNULL(p.sold_mandays, 0) - CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) AS remaining_mandays,
                CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                    THEN CAST(ROUND(CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                    ELSE 0 END AS manday_percent,
                ISNULL(p.sold_mandays * p.manday_rate, 0) AS planned_budget,
                0 AS actual_budget,
                ISNULL(p.sold_mandays * p.manday_rate, 0) AS remaining_budget,
                0 AS budget_percent,
                0 AS overall_progress,
                (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id) AS total_milestones,
                (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status = 'completed') AS completed_milestones,
                (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status = 'in_progress') AS in_progress_milestones,
                (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status = 'pending') AS pending_milestones,
                (SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status != 'completed' AND due_date < GETDATE()) AS delayed_milestones,
                (SELECT TOP 1 mc.name FROM pms.project_milestones pm LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id WHERE pm.project_id = p.id AND pm.status = 'in_progress' ORDER BY pm.sort_order) AS current_milestone,
                'in_progress' AS current_milestone_status,
                (SELECT TOP 1 pm.due_date FROM pms.project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'in_progress' ORDER BY pm.sort_order) AS current_milestone_date,
                (SELECT TOP 1 DATEDIFF(day, GETDATE(), pm.due_date) FROM pms.project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'in_progress' ORDER BY pm.sort_order) AS current_milestone_days_until,
                CASE
                    WHEN psc.code = 'CANCELLED' THEN 'CANCELLED'
                    WHEN psc.code = 'COMPLETED' THEN 'COMPLETED'
                    WHEN CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                        THEN CAST(ROUND(CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                        ELSE 0 END > 110 THEN 'DELAYED'
                    WHEN CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                        THEN CAST(ROUND(CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                        ELSE 0 END > 100 THEN 'AT_RISK'
                    ELSE 'ON_TRACK'
                END AS health_status,
                pt.code AS project_type_code,
                pt.name AS project_type_name
            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.employees e ON p.project_owner_id = e.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
            WHERE ${whereClause}
            ORDER BY
                CASE
                    WHEN CASE
                        WHEN psc.code = 'CANCELLED' THEN 'CANCELLED'
                        WHEN psc.code = 'COMPLETED' THEN 'COMPLETED'
                        WHEN CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                            THEN CAST(ROUND(CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                            ELSE 0 END > 110 THEN 'DELAYED'
                        WHEN CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                            THEN CAST(ROUND(CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays, 1) AS DECIMAL(5,1))
                            ELSE 0 END > 100 THEN 'AT_RISK'
                        ELSE 'ON_TRACK'
                    END = 'DELAYED' THEN 1
                    WHEN CASE
                        WHEN psc.code = 'CANCELLED' THEN 'CANCELLED'
                        WHEN psc.code = 'COMPLETED' THEN 'COMPLETED'
                        ELSE 'ON_TRACK'
                    END = 'AT_RISK' THEN 2
                    ELSE 3
                END,
                p.project_code
        `)

        const projects = projectsResult.recordset

        if (projects.length === 0) return []

        // Get milestones for these projects
        const projectIds = projects.map(p => p.project_id)
        const milestonesResult = await pool.request().query(`
            SELECT
                m.id AS milestone_id,
                m.project_id,
                ISNULL(mc.name, 'Milestone') AS milestone_name,
                ISNULL(mc.code, '') AS milestone_code,
                m.status AS status,
                m.due_date AS due_date,
                m.completed_date AS completed_date,
                ep.eff_plan AS planned_mandays,
                ISNULL(m.actual_mandays, 0) AS actual_mandays,
                ISNULL(m.progress_percent, 0) AS progress_percent,
                CASE WHEN m.status != 'completed' THEN DATEDIFF(day, GETDATE(), m.due_date) ELSE 0 END AS days_until_due,
                CASE WHEN m.status != 'completed' AND m.due_date < GETDATE() THEN DATEDIFF(day, m.due_date, GETDATE()) ELSE 0 END AS days_overdue,
                ISNULL(m.sort_order, 0) AS sort_order
            FROM pms.project_milestones m
            LEFT JOIN pms.milestone_configs mc ON m.milestone_config_id = mc.id
            INNER JOIN pms.projects p ON p.id = m.project_id
            CROSS APPLY (SELECT ${effectivePlanMdSql('p.sold_mandays', 'm', 'mc')} AS eff_plan) ep
            WHERE m.project_id IN ('${projectIds.join("','")}')
            ORDER BY m.project_id, m.sort_order
        `)

        // Group milestones by project
        const milestonesByProject = new Map<string, ProjectMilestone[]>()
        for (const m of milestonesResult.recordset) {
            const projectId = m.project_id
            if (!milestonesByProject.has(projectId)) {
                milestonesByProject.set(projectId, [])
            }
            milestonesByProject.get(projectId)!.push({
                milestone_id: m.milestone_id,
                milestone_name: m.milestone_name,
                milestone_code: m.milestone_code,
                status: m.status,
                due_date: m.due_date,
                completed_date: m.completed_date,
                planned_mandays: m.planned_mandays,
                actual_mandays: m.actual_mandays,
                progress_percent: m.progress_percent,
                days_until_due: m.days_until_due,
                days_overdue: m.days_overdue,
                sort_order: m.sort_order
            })
        }

        return projects.map(p => ({
            ...p,
            milestones: milestonesByProject.get(p.project_id) || []
        }))
    } catch (error) {
        console.error('getOwnerProjectsWithMilestonesFiltered error:', error)
        return []
    }
}

// Filtered Attention Required
async function getAttentionRequiredFiltered(
    ownerId: string,
    projectTypeId?: string,
    statusId?: string
): Promise<AttentionItem[]> {
    try {
        const pool = await getConnection()

        const request = pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)

        let whereClause = `p.project_owner_id = @owner_id AND p.is_active = 1 AND (psc.code IS NULL OR psc.code NOT IN ('COMPLETED', 'CANCELLED'))`

        if (projectTypeId) {
            request.input('project_type_id', sql.UniqueIdentifier, projectTypeId)
            whereClause += ` AND p.project_type_id = @project_type_id`
        }

        if (statusId) {
            request.input('status_id', sql.UniqueIdentifier, statusId)
            whereClause += ` AND p.status_id = @status_id`
        }

        const result = await request.query(`
            SELECT
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                p.project_owner_id AS owner_id,
                COALESCE(CONCAT(e.first_name_th, ' ', e.last_name_th), CONCAT(e.first_name, ' ', e.last_name)) AS owner_name,
                'MANDAY_OVERRUN' AS issue_type,
                N'ใช้ Man-day เกินแผน ' +
                    CAST(CAST(ROUND(
                        CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                        THEN CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays - 100
                        ELSE 0 END
                    , 0) AS INT) AS NVARCHAR) + '%' AS issue_description,
                'HIGH' AS severity
            FROM pms.projects p
            LEFT JOIN pms.employees e ON p.project_owner_id = e.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE ${whereClause}
            AND CASE WHEN ISNULL(p.sold_mandays, 0) > 0
                THEN CAST(ROUND(ISNULL((SELECT SUM(te.hours) FROM pms.timesheet_entries te INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id), 0) / 7.0, 2) AS DECIMAL(10,2)) * 100.0 / p.sold_mandays
                ELSE 0 END > 100

            UNION ALL

            SELECT
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                p.project_owner_id AS owner_id,
                COALESCE(CONCAT(e.first_name_th, ' ', e.last_name_th), CONCAT(e.first_name, ' ', e.last_name)) AS owner_name,
                'MILESTONE_OVERDUE' AS issue_type,
                N'มี Milestone เกินกำหนด ' + CAST((SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id AND status != 'completed' AND due_date < GETDATE()) AS NVARCHAR) + N' รายการ' AS issue_description,
                'MEDIUM' AS severity
            FROM pms.projects p
            LEFT JOIN pms.employees e ON p.project_owner_id = e.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE ${whereClause}
            AND EXISTS (SELECT 1 FROM pms.project_milestones WHERE project_id = p.id AND status != 'completed' AND due_date < GETDATE())

            ORDER BY severity DESC, project_code
        `)

        return result.recordset
    } catch (error) {
        console.error('getAttentionRequiredFiltered error:', error)
        return []
    }
}

// Filtered Upcoming Milestones
async function getUpcomingMilestonesFiltered(
    ownerId: string,
    projectTypeId?: string,
    statusId?: string
): Promise<UpcomingMilestone[]> {
    try {
        const pool = await getConnection()

        const request = pool.request()
            .input('owner_id', sql.UniqueIdentifier, ownerId)

        let whereClause = `p.project_owner_id = @owner_id AND p.is_active = 1 AND (psc.code IS NULL OR psc.code NOT IN ('COMPLETED', 'CANCELLED'))`

        if (projectTypeId) {
            request.input('project_type_id', sql.UniqueIdentifier, projectTypeId)
            whereClause += ` AND p.project_type_id = @project_type_id`
        }

        if (statusId) {
            request.input('status_id', sql.UniqueIdentifier, statusId)
            whereClause += ` AND p.status_id = @status_id`
        }

        const result = await request.query(`
            SELECT TOP 20
                m.id AS milestone_id,
                p.id AS project_id,
                p.project_code,
                p.name AS project_name,
                ISNULL(mc.name, 'Milestone') AS milestone_name,
                m.due_date AS planned_date,
                DATEDIFF(day, GETDATE(), m.due_date) AS days_until_due,
                m.status AS status,
                p.project_owner_id AS owner_id,
                COALESCE(CONCAT(e.first_name_th, ' ', e.last_name_th), CONCAT(e.first_name, ' ', e.last_name)) AS owner_name,
                CASE
                    WHEN m.due_date < GETDATE() THEN 'OVERDUE'
                    WHEN DATEDIFF(day, GETDATE(), m.due_date) <= 7 THEN 'THIS_WEEK'
                    WHEN DATEDIFF(day, GETDATE(), m.due_date) <= 14 THEN 'NEXT_WEEK'
                    ELSE 'UPCOMING'
                END AS urgency
            FROM pms.project_milestones m
            LEFT JOIN pms.milestone_configs mc ON m.milestone_config_id = mc.id
            INNER JOIN pms.projects p ON m.project_id = p.id
            LEFT JOIN pms.employees e ON p.project_owner_id = e.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE ${whereClause}
            AND m.status != 'completed'
            AND m.due_date <= DATEADD(day, 30, GETDATE())
            ORDER BY m.due_date
        `)

        return result.recordset
    } catch (error) {
        console.error('getUpcomingMilestonesFiltered error:', error)
        return []
    }
}
