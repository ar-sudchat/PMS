'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { effectivePlanMdSql } from '@/lib/actions/milestone-plan'

// ============================================
// Get current user info (safe for client component use)
// ============================================
export async function getCurrentUserInfo(): Promise<{
    id: string
    role: string
} | null> {
    const user = await getCurrentUser()
    if (!user) return null
    return { id: user.id, role: user.role }
}

// ============================================
// Types
// ============================================

export interface PlanningProject {
    id: string
    project_code: string
    name: string
    customer_name: string
    project_manager_name: string
    status_name: string
    status_color: string
    start_date: string | null
    end_date: string | null
    sold_mandays: number
    manday_rate: number
    progress_percent: number
}

export interface PlanningMilestone {
    id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    sort_order: number
    due_date: string | null
    completed_date: string | null
    planned_mandays: number
    actual_mandays: number
    weight_percent: number
    stories_count: number
    tasks_count: number
    completed_tasks: number
    progress_percent: number
    status: string
    is_locked: boolean
    is_verified: boolean
    deliverables: PlanningDeliverable[]
}

export interface PlanningDeliverable {
    id: string
    name: string
    is_required: boolean
    submitted_date: string | null
    is_verified: boolean
}

export interface PlanningTeamMember {
    employee_id: string
    employee_name: string
    nickname: string
    position_code: string
    position_name: string
    role_in_project: string
    assigned_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    logged_hours: number
}

export interface PlanningCostItem {
    milestone_code: string
    milestone_name: string
    milestone_color: string
    planned_mandays: number
    actual_mandays: number
    planned_cost: number
    actual_cost: number
    variance: number
    variance_percent: number
}

export interface PlanningDashboardData {
    project: PlanningProject
    milestones: PlanningMilestone[]
    team: PlanningTeamMember[]
    cost: {
        total_sold_mandays: number
        total_planned_mandays: number
        total_actual_mandays: number
        manday_rate: number
        total_budget: number
        planned_cost: number
        actual_cost: number
        budget_variance: number
        items: PlanningCostItem[]
    }
    summary: {
        total_milestones: number
        total_stories: number
        total_tasks: number
        completed_tasks: number
        team_size: number
        duration_days: number
    }
}

// ============================================
// Get DEV projects for planning
// ============================================
export async function getProjectsForPlanning(): Promise<{
    success: boolean
    data?: { id: string; project_code: string; name: string; customer_name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT
                    p.id,
                    p.project_code,
                    p.name,
                    ISNULL(c.name, '-') AS customer_name
                FROM pms.projects p
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                LEFT JOIN pms.customers c ON c.id = p.customer_id
                LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
                WHERE pt.code = 'DEV'
                AND (psc.code IS NULL OR psc.code NOT IN ('CANCELLED', 'COMPLETED'))
                AND p.is_active = 1
                ORDER BY p.project_code DESC
            `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching projects for planning:', error)
        return { success: false, error: 'Failed to fetch projects' }
    }
}

// ============================================
// Main: Get all planning data for a project
// ============================================
export async function getProjectPlanningData(projectId: string): Promise<{
    success: boolean
    data?: PlanningDashboardData
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // 1. Get project info
        const projectResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    p.id,
                    p.project_code,
                    p.name,
                    ISNULL(c.name, '-') AS customer_name,
                    ISNULL(NULLIF(CONCAT(pm.first_name_th, ' ', pm.last_name_th), ' '), CONCAT(pm.first_name, ' ', pm.last_name)) AS project_manager_name,
                    ISNULL(psc.name, '-') AS status_name,
                    ISNULL(psc.color, '#6B7280') AS status_color,
                    p.start_date,
                    p.end_date,
                    ISNULL(p.sold_mandays, 0) AS sold_mandays,
                    ISNULL(p.manday_rate, 0) AS manday_rate,
                    (SELECT CASE WHEN COUNT(*) > 0
                        THEN CAST(COUNT(CASE WHEN t2.status = 'done' THEN 1 END) * 100.0 / COUNT(*) AS INT)
                        ELSE 0 END
                     FROM pms.tasks t2
                     INNER JOIN pms.stories s2 ON t2.story_id = s2.id
                     WHERE s2.project_id = p.id AND t2.is_active = 1) AS progress_percent
                FROM pms.projects p
                LEFT JOIN pms.customers c ON c.id = p.customer_id
                LEFT JOIN pms.employees pm ON pm.id = p.project_manager_id
                LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
                WHERE p.id = @projectId AND p.is_active = 1
            `)

        if (projectResult.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        const project = projectResult.recordset[0] as PlanningProject
        const mandayRate = project.manday_rate || 0

        // 2. Get milestones with deliverables
        const milestoneResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    pm.id,
                    mc.code AS milestone_code,
                    mc.name AS milestone_name,
                    mc.color AS milestone_color,
                    mc.sort_order,
                    pm.due_date,
                    pm.completed_date,
                    ep.eff_plan AS planned_mandays,
                    ISNULL(pm.weight_percent, 0) AS weight_percent,
                    pm.status,
                    ISNULL(pm.is_locked, 0) AS is_locked,
                    ISNULL(pm.is_verified, 0) AS is_verified,
                    (SELECT ISNULL(SUM(te.hours), 0) / 7.0 FROM pms.timesheet_entries te
                     INNER JOIN pms.tasks t ON te.task_id = t.id
                     INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.milestone_id = pm.id AND te.is_active = 1) AS actual_mandays,
                    (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.is_active = 1) AS stories_count,
                    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.milestone_id = pm.id AND t.is_active = 1) AS tasks_count,
                    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.milestone_id = pm.id AND t.is_active = 1 AND t.status = 'done') AS completed_tasks
                FROM pms.project_milestones pm
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects pr ON pr.id = pm.project_id
                CROSS APPLY (SELECT ${effectivePlanMdSql('pr.sold_mandays', 'pm', 'mc')} AS eff_plan) ep
                WHERE pm.project_id = @projectId
                ORDER BY mc.sort_order
            `)

        // 3. Get deliverables per milestone
        const deliverableResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT
                    pd.id,
                    pd.project_milestone_id,
                    pd.name,
                    ISNULL(pd.is_required, 0) AS is_required,
                    pd.submitted_date,
                    ISNULL(pd.is_verified, 0) AS is_verified
                FROM pms.project_deliverables pd
                INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                WHERE pm.project_id = @projectId
                ORDER BY pd.sort_order
            `)

        const deliverableMap = new Map<string, PlanningDeliverable[]>()
        for (const d of deliverableResult.recordset) {
            const msId = d.project_milestone_id
            if (!deliverableMap.has(msId)) deliverableMap.set(msId, [])
            deliverableMap.get(msId)!.push({
                id: d.id,
                name: d.name,
                is_required: !!d.is_required,
                submitted_date: d.submitted_date,
                is_verified: !!d.is_verified,
            })
        }

        const milestones: PlanningMilestone[] = milestoneResult.recordset.map((m: any) => ({
            id: m.id,
            milestone_code: m.milestone_code,
            milestone_name: m.milestone_name,
            milestone_color: m.milestone_color,
            sort_order: m.sort_order,
            due_date: m.due_date,
            completed_date: m.completed_date,
            planned_mandays: m.planned_mandays,
            actual_mandays: Math.round(m.actual_mandays * 10) / 10,
            weight_percent: m.weight_percent,
            stories_count: m.stories_count,
            tasks_count: m.tasks_count,
            completed_tasks: m.completed_tasks,
            progress_percent: m.tasks_count > 0 ? Math.round((m.completed_tasks / m.tasks_count) * 100) : 0,
            status: m.status || 'pending',
            is_locked: !!m.is_locked,
            is_verified: !!m.is_verified,
            deliverables: deliverableMap.get(m.id) || [],
        }))

        // 4. Get team members
        const teamResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT DISTINCT
                    e.id AS employee_id,
                    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '), CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                    ISNULL(e.nickname, '') AS nickname,
                    ISNULL(pos.code, '-') AS position_code,
                    ISNULL(pos.name, '-') AS position_name,
                    CASE WHEN p.project_manager_id = e.id THEN 'PM'
                         WHEN p.owner_id = e.id THEN 'Owner'
                         ELSE 'Member' END AS role_in_project,
                    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.is_active = 1) AS assigned_tasks,
                    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.is_active = 1 AND t.status = 'done') AS completed_tasks,
                    (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.is_active = 1 AND t.status = 'in_progress') AS in_progress_tasks,
                    (SELECT ISNULL(SUM(te.hours), 0) FROM pms.timesheet_entries te
                     INNER JOIN pms.tasks t ON te.task_id = t.id INNER JOIN pms.stories s ON t.story_id = s.id
                     WHERE s.project_id = @projectId AND te.employee_id = e.id AND te.is_active = 1) AS logged_hours
                FROM pms.employees e
                LEFT JOIN pms.positions pos ON e.position_id = pos.id
                LEFT JOIN pms.projects p ON p.id = @projectId
                WHERE e.is_active = 1
                  AND (p.project_manager_id = e.id OR p.owner_id = e.id OR EXISTS (
                      SELECT 1 FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id
                      WHERE s.project_id = @projectId AND t.assignee_id = e.id AND t.is_active = 1
                  ))
                ORDER BY role_in_project, e.first_name_th
            `)

        const team: PlanningTeamMember[] = teamResult.recordset

        // 5. Calculate cost summary
        const totalPlannedMandays = milestones.reduce((sum, m) => sum + m.planned_mandays, 0)
        const totalActualMandays = milestones.reduce((sum, m) => sum + m.actual_mandays, 0)
        const totalBudget = project.sold_mandays * mandayRate
        const plannedCost = totalPlannedMandays * mandayRate
        const actualCost = totalActualMandays * mandayRate

        const costItems: PlanningCostItem[] = milestones.map(m => {
            const mPlannedCost = m.planned_mandays * mandayRate
            const mActualCost = m.actual_mandays * mandayRate
            const variance = mPlannedCost - mActualCost
            return {
                milestone_code: m.milestone_code,
                milestone_name: m.milestone_name,
                milestone_color: m.milestone_color,
                planned_mandays: m.planned_mandays,
                actual_mandays: m.actual_mandays,
                planned_cost: mPlannedCost,
                actual_cost: mActualCost,
                variance,
                variance_percent: mPlannedCost > 0 ? Math.round((variance / mPlannedCost) * 100) : 0,
            }
        })

        // 6. Calculate totals
        const totalStories = milestones.reduce((sum, m) => sum + m.stories_count, 0)
        const totalTasks = milestones.reduce((sum, m) => sum + m.tasks_count, 0)
        const completedTasks = milestones.reduce((sum, m) => sum + m.completed_tasks, 0)
        const durationDays = project.start_date && project.end_date
            ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0

        return {
            success: true,
            data: {
                project,
                milestones,
                team,
                cost: {
                    total_sold_mandays: project.sold_mandays,
                    total_planned_mandays: totalPlannedMandays,
                    total_actual_mandays: totalActualMandays,
                    manday_rate: mandayRate,
                    total_budget: totalBudget,
                    planned_cost: plannedCost,
                    actual_cost: actualCost,
                    budget_variance: totalBudget - actualCost,
                    items: costItems,
                },
                summary: {
                    total_milestones: milestones.length,
                    total_stories: totalStories,
                    total_tasks: totalTasks,
                    completed_tasks: completedTasks,
                    team_size: team.length,
                    duration_days: durationDays,
                },
            },
        }
    } catch (error) {
        console.error('Error fetching planning data:', error)
        return { success: false, error: 'Failed to fetch planning data' }
    }
}

// ============================================
// Update milestone planning fields
// ============================================
export async function updateMilestonePlan(
    milestoneId: string,
    data: { dueDate?: string; plannedMandays?: number }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if milestone is locked
        const checkResult = await pool.request()
            .input('id', sql.UniqueIdentifier, milestoneId)
            .query(`SELECT is_locked FROM pms.project_milestones WHERE id = @id`)

        if (checkResult.recordset.length === 0) {
            return { success: false, error: 'Milestone not found' }
        }
        if (checkResult.recordset[0].is_locked) {
            return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถแก้ไขได้' }
        }

        // Build update query
        const setClauses: string[] = ['updated_at = GETDATE()']
        const request = pool.request().input('id', sql.UniqueIdentifier, milestoneId)

        if (data.dueDate !== undefined) {
            setClauses.push('due_date = @dueDate')
            request.input('dueDate', sql.Date, data.dueDate)
        }
        if (data.plannedMandays !== undefined) {
            setClauses.push('planned_mandays = @plannedMandays')
            request.input('plannedMandays', sql.Int, data.plannedMandays)
        }

        await request.query(`
            UPDATE pms.project_milestones
            SET ${setClauses.join(', ')}
            WHERE id = @id
        `)

        return { success: true }
    } catch (error) {
        console.error('Error updating milestone plan:', error)
        return { success: false, error: 'Failed to update milestone' }
    }
}
