'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { addWorkingDays, subtractWorkingDays, getWorkingDaysBetween } from '@/lib/utils/date-math'

// ============================================
// Types
// ============================================

export interface TaskDependency {
    id: string
    predecessor_task_id: string
    successor_task_id: string
    dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
    lag_days: number
    created_at: string
    created_by?: string
    predecessor_title?: string
    successor_title?: string
}

export interface ImpactedTask {
    id: string
    title: string
    milestone_id: string | null
    milestone_name: string | null
    original_start_date: string | null
    original_due_date: string | null
    new_start_date: string | null
    new_due_date: string | null
    delay_days: number
}

export interface ImpactedMilestone {
    id: string
    name: string
    original_due_date: string | null
    new_due_date: string | null
    delay_days: number
}

export interface ChangeImpactReport {
    success: boolean
    hasImpact: boolean
    severity: 'minor' | 'moderate' | 'major'
    impactedTasks: ImpactedTask[]
    impactedMilestones: ImpactedMilestone[]
    totalTasksShifted: number
    maxDelayDays: number
    error?: string
}

// ============================================
// Working Day Heuristics Helpers (Imported from @/lib/utils/date-math)
// ============================================

// ============================================
// Actions
// ============================================

/**
 * Get all task dependencies in a specific project
 */
export async function getTaskDependencies(projectId: string): Promise<{
    success: boolean
    data?: TaskDependency[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    td.id,
                    td.predecessor_task_id,
                    td.successor_task_id,
                    td.dependency_type,
                    td.lag_days,
                    td.created_at,
                    td.created_by,
                    pt.title AS predecessor_title,
                    st.title AS successor_title
                FROM pms.task_dependencies td
                INNER JOIN pms.tasks pt ON td.predecessor_task_id = pt.id
                INNER JOIN pms.tasks st ON td.successor_task_id = st.id
                INNER JOIN pms.stories s ON pt.story_id = s.id
                WHERE s.project_id = @projectId AND pt.is_active = 1 AND st.is_active = 1
            `)

        return { success: true, data: result.recordset }
    } catch (error: any) {
        console.error('getTaskDependencies error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Create a task dependency link (Finish-to-Start only for now)
 * Includes recursive cycle detection
 */
export async function createTaskDependency(
    predecessorTaskId: string,
    successorTaskId: string,
    lagDays: number = 0
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        if (predecessorTaskId === successorTaskId) {
            return { success: false, error: 'งานไม่สามารถขึ้นต่อกับตัวเองได้ (Self-dependency is not allowed)' }
        }

        const pool = await getConnection()

        // 1. Circular dependency check using SQL Recursive CTE
        const circularCheck = await pool.request()
            .input('predecessorId', sql.UniqueIdentifier, predecessorTaskId)
            .input('successorId', sql.UniqueIdentifier, successorTaskId)
            .query(`
                WITH Downstream AS (
                    -- Anchor: direct successors of B (successorId)
                    SELECT successor_task_id
                    FROM pms.task_dependencies
                    WHERE predecessor_task_id = @successorId
                    
                    UNION ALL
                    
                    -- Recursive step: successors of successors
                    SELECT td.successor_task_id
                    FROM pms.task_dependencies td
                    INNER JOIN Downstream d ON td.predecessor_task_id = d.successor_task_id
                )
                SELECT COUNT(1) as loop_exists FROM Downstream WHERE successor_task_id = @predecessorId
            `)

        if (circularCheck.recordset[0]?.loop_exists > 0) {
            return { 
                success: false, 
                error: 'ไม่สามารถสร้างเส้นเชื่อมนี้ได้ เนื่องจากจะทำให้เกิดความสัมพันธ์แบบวงกลม (Circular dependency detected)' 
            }
        }

        // 2. Insert link
        await pool.request()
            .input('predecessorId', sql.UniqueIdentifier, predecessorTaskId)
            .input('successorId', sql.UniqueIdentifier, successorTaskId)
            .input('lagDays', sql.Int, lagDays)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.task_dependencies (predecessor_task_id, successor_task_id, dependency_type, lag_days, created_by)
                VALUES (@predecessorId, @successorId, 'FS', @lagDays, @createdBy)
            `)

        // 3. Revalidate paths
        const projectResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, predecessorTaskId)
            .query(`
                SELECT s.project_id 
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.id = @taskId
            `)
        if (projectResult.recordset[0]?.project_id) {
            revalidatePath(`/projects/${projectResult.recordset[0].project_id}`)
            revalidatePath(`/resource-planning`)
        }

        return { success: true }
    } catch (error: any) {
        console.error('createTaskDependency error:', error)
        if (error.message?.includes('UQ_predecessor_successor')) {
            return { success: false, error: 'คู่งานนี้มีความสัมพันธ์เชื่อมต่อกันอยู่แล้ว' }
        }
        return { success: false, error: error.message }
    }
}

/**
 * Delete a task dependency
 */
export async function deleteTaskDependency(dependencyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()

        // Fetch task to revalidate path later
        const taskResult = await pool.request()
            .input('depId', sql.UniqueIdentifier, dependencyId)
            .query(`
                SELECT s.project_id 
                FROM pms.task_dependencies td
                INNER JOIN pms.tasks t ON td.predecessor_task_id = t.id
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE td.id = @depId
            `)

        await pool.request()
            .input('depId', sql.UniqueIdentifier, dependencyId)
            .query(`DELETE FROM pms.task_dependencies WHERE id = @depId`)

        if (taskResult.recordset[0]?.project_id) {
            revalidatePath(`/projects/${taskResult.recordset[0].project_id}`)
            revalidatePath(`/resource-planning`)
        }

        return { success: true }
    } catch (error: any) {
        console.error('deleteTaskDependency error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Simulate the downstream date changes (dry-run) and generate an impact report.
 */
export async function getChangeImpactReport(
    taskId: string,
    newDueDateStr: string
): Promise<ChangeImpactReport> {
    try {
        const pool = await getConnection()

        // 1. Get Project ID for the task
        const projRes = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT s.project_id 
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.id = @taskId
            `)
        if (projRes.recordset.length === 0) {
            return { success: false, hasImpact: false, severity: 'minor', impactedTasks: [], impactedMilestones: [], totalTasksShifted: 0, maxDelayDays: 0, error: 'Task not found' }
        }
        const projectId = projRes.recordset[0].project_id

        // 2. Fetch all active tasks in this project
        const tasksRes = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    t.id, 
                    t.title, 
                    t.start_date, 
                    t.due_date, 
                    t.status, 
                    s.milestone_id,
                    pm.due_date as milestone_due_date, 
                    mc.name as milestone_name
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE s.project_id = @projectId AND t.is_active = 1 AND t.status <> 'cancelled'
            `)

        // 3. Fetch all dependencies
        const depsRes = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT td.predecessor_task_id, td.successor_task_id, td.dependency_type, td.lag_days
                FROM pms.task_dependencies td
                INNER JOIN pms.tasks pt ON td.predecessor_task_id = pt.id
                INNER JOIN pms.stories s ON pt.story_id = s.id
                WHERE s.project_id = @projectId
            `)

        const allTasks = tasksRes.recordset
        const allDeps = depsRes.recordset

        // Build adjacency and lookup maps
        const taskMap = new Map<string, any>()
        const successorsMap = new Map<string, any[]>()

        for (const t of allTasks) {
            taskMap.set(t.id, {
                ...t,
                orig_start: t.start_date ? new Date(t.start_date) : null,
                orig_due: t.due_date ? new Date(t.due_date) : null,
                sim_start: t.start_date ? new Date(t.start_date) : null,
                sim_due: t.due_date ? new Date(t.due_date) : null,
            })
        }

        for (const d of allDeps) {
            const predId = d.predecessor_task_id
            if (!successorsMap.has(predId)) {
                successorsMap.set(predId, [])
            }
            successorsMap.get(predId)!.push(d)
        }

        // Target task setup
        const targetTask = taskMap.get(taskId)
        if (!targetTask) {
            return { success: false, hasImpact: false, severity: 'minor', impactedTasks: [], impactedMilestones: [], totalTasksShifted: 0, maxDelayDays: 0, error: 'Target task not found in project' }
        }

        const simDueDate = new Date(newDueDateStr)
        simDueDate.setHours(0, 0, 0, 0)
        
        // Calculate duration and shift target start date
        if (targetTask.orig_start && targetTask.orig_due) {
            const duration = getWorkingDaysBetween(targetTask.orig_start, targetTask.orig_due)
            targetTask.sim_due = simDueDate
            if (duration > 0) {
                targetTask.sim_start = subtractWorkingDays(simDueDate, duration - 1)
            } else {
                targetTask.sim_start = simDueDate
            }
        } else {
            targetTask.sim_due = simDueDate
            targetTask.sim_start = simDueDate
        }

        // Cascade simulation Queue
        const queue: string[] = [taskId]
        const visitedCount = new Map<string, number>() // loop safety

        while (queue.length > 0) {
            const currId = queue.shift()!
            visitedCount.set(currId, (visitedCount.get(currId) || 0) + 1)
            
            // Loop protection threshold
            if (visitedCount.get(currId)! > allTasks.length) {
                throw new Error('ตรวจพบความสัมพันธ์วงกลมในฐานข้อมูลระหว่างพรีวิว')
            }

            const currTask = taskMap.get(currId)
            if (!currTask || !currTask.sim_due) continue

            const depLinks = successorsMap.get(currId) || []
            for (const link of depLinks) {
                const succId = link.successor_task_id
                const succTask = taskMap.get(succId)
                if (!succTask) continue

                // FS: Successor Start Date = Predecessor Due Date + 1 working day + lag_days
                const reqStartDate = addWorkingDays(currTask.sim_due, 1 + link.lag_days)
                
                const currSimStart = succTask.sim_start || succTask.sim_due
                if (!currSimStart || reqStartDate > currSimStart) {
                    // Update successor dates
                    succTask.sim_start = reqStartDate
                    
                    if (succTask.orig_start && succTask.orig_due) {
                        const duration = getWorkingDaysBetween(succTask.orig_start, succTask.orig_due)
                        if (duration > 0) {
                            succTask.sim_due = addWorkingDays(reqStartDate, duration - 1)
                        } else {
                            succTask.sim_due = reqStartDate
                        }
                    } else {
                        succTask.sim_due = reqStartDate
                    }
                    
                    if (!queue.includes(succId)) {
                        queue.push(succId)
                    }
                }
            }
        }

        // Build list of actually impacted tasks (shifted downstream)
        const impactedTasks: ImpactedTask[] = []
        let maxDelayDays = 0

        // Track milestone delay simulations
        const milestoneMap = new Map<string, {
            id: string
            name: string
            original_due: Date | null
            max_sim_due: Date | null
        }>()

        for (const [id, t] of taskMap.entries()) {
            if (id === taskId) continue // exclude the primary target from successor list

            const origDueTime = t.orig_due ? t.orig_due.getTime() : null
            const simDueTime = t.sim_due ? t.sim_due.getTime() : null

            if (simDueTime && origDueTime && simDueTime > origDueTime) {
                // Calculate delay in working days
                const delay = getWorkingDaysBetween(t.orig_due!, t.sim_due!) - 1
                if (delay > 0) {
                    maxDelayDays = Math.max(maxDelayDays, delay)
                    impactedTasks.push({
                        id: t.id,
                        title: t.title,
                        milestone_id: t.milestone_id,
                        milestone_name: t.milestone_name || null,
                        original_start_date: t.orig_start ? t.orig_start.toISOString().split('T')[0] : null,
                        original_due_date: t.orig_due ? t.orig_due.toISOString().split('T')[0] : null,
                        new_start_date: t.sim_start ? t.sim_start.toISOString().split('T')[0] : null,
                        new_due_date: t.sim_due ? t.sim_due.toISOString().split('T')[0] : null,
                        delay_days: delay
                    })
                }
            }

            // Track milestone impact
            if (t.milestone_id) {
                if (!milestoneMap.has(t.milestone_id)) {
                    milestoneMap.set(t.milestone_id, {
                        id: t.milestone_id,
                        name: t.milestone_name || 'Milestone',
                        original_due: t.milestone_due_date ? new Date(t.milestone_due_date) : null,
                        max_sim_due: null
                    })
                }
                const ms = milestoneMap.get(t.milestone_id)!
                const tSimDue = t.sim_due
                if (tSimDue) {
                    if (!ms.max_sim_due || tSimDue > ms.max_sim_due) {
                        ms.max_sim_due = tSimDue
                    }
                }
            }
        }

        // Build list of actually delayed milestones
        const impactedMilestones: ImpactedMilestone[] = []
        for (const ms of milestoneMap.values()) {
            if (ms.original_due && ms.max_sim_due && ms.max_sim_due > ms.original_due) {
                const delay = getWorkingDaysBetween(ms.original_due, ms.max_sim_due) - 1
                if (delay > 0) {
                    impactedMilestones.push({
                        id: ms.id,
                        name: ms.name,
                        original_due_date: ms.original_due.toISOString().split('T')[0],
                        new_due_date: ms.max_sim_due.toISOString().split('T')[0],
                        delay_days: delay
                    })
                }
            }
        }

        const totalTasksShifted = impactedTasks.length
        const hasImpact = totalTasksShifted > 0 || impactedMilestones.length > 0

        // Determine severity
        let severity: 'minor' | 'moderate' | 'major' = 'minor'
        if (impactedMilestones.length > 0 || totalTasksShifted > 5 || maxDelayDays > 5) {
            severity = 'major'
        } else if (totalTasksShifted > 2 || maxDelayDays > 2) {
            severity = 'moderate'
        }

        return {
            success: true,
            hasImpact,
            severity,
            impactedTasks,
            impactedMilestones,
            totalTasksShifted,
            maxDelayDays
        }
    } catch (error: any) {
        console.error('getChangeImpactReport error:', error)
        return {
            success: false,
            hasImpact: false,
            severity: 'minor',
            impactedTasks: [],
            impactedMilestones: [],
            totalTasksShifted: 0,
            maxDelayDays: 0,
            error: error.message
        }
    }
}
