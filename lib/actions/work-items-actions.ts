'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import sql from 'mssql'
import { generateTaskCode } from '@/lib/utils/task-code-generator'

// Types
export interface WorkItemFilters {
    milestoneId?: string
    status?: string
    assigneeId?: string
    search?: string
}

export interface StoryData {
    id: string
    project_id: string
    milestone_id: string
    story_code: string
    title: string
    title_th?: string
    description?: string
    priority: string
    status: string
    estimated_md?: number
    actual_md?: number
    progress_percent?: number
    start_date?: Date
    due_date?: Date
    sort_order?: number
    tasks: TaskData[]
}

export interface TaskData {
    id: string
    story_id: string
    task_code: string
    title: string
    description?: string
    task_type: string
    assignee_id?: string
    reviewer_id?: string
    priority: string
    status: string
    estimated_hours?: number
    actual_hours?: number
    start_date?: Date
    due_date?: Date
    assignee_name?: string
    assignee_avatar?: string
}

export interface MilestoneGroup {
    id: string
    milestone_config_id: string
    name: string
    color: string
    completed_percent: number
    status: string
    sort_order: number
    stories: StoryData[]
}

// ============================================
// GET WORK ITEMS (Grouped by Milestone)
// ============================================

// ============================================
// GET GLOBAL WORK ITEMS (ALL PROJECTS)
// ============================================

export interface GlobalMilestoneGroup extends MilestoneGroup {
    projectId: string
    projectName: string
}

export interface ProjectWorkItemsGroup {
    projectId: string
    projectName: string
    projectCode: string
    milestones: MilestoneGroup[]
}

export async function getGlobalWorkItems(filters?: {
    year?: number
    customerId?: string
    managerId?: string
    ownerId?: string
    statusId?: string
    search?: string
    milestoneIds?: string[]
    projectTypeId?: string
}): Promise<{ success: boolean; data: ProjectWorkItemsGroup[]; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, data: [], error: 'Unauthorized' }

        const pool = await getConnection()

        const milestoneIdsStr = filters?.milestoneIds?.join(',') || null

        // Reusing the filtering logic from sp_get_gantt_data effectively, 
        // but since we need hierarchical data for the Table View (Milestone->Story->Task),
        // we can fetch flat data and structure it.
        // Or we can just reuse getProjectWorkItems logic but across multiple projects.
        // Let's call a query that gets EVERYTHING enriched.

        const result = await pool.request()
            .input('employee_id', sql.UniqueIdentifier, (user as any).employeeId || user.id)
            .input('year', sql.Int, filters?.year || null)
            .input('customer_id', sql.UniqueIdentifier, filters?.customerId || null)
            .input('manager_id', sql.UniqueIdentifier, filters?.managerId || null)
            .input('owner_id', sql.UniqueIdentifier, filters?.ownerId || null)
            .input('status_id', sql.UniqueIdentifier, filters?.statusId || null)
            .input('milestone_ids', sql.NVarChar, milestoneIdsStr)
            .input('search', sql.NVarChar, filters?.search ? `%${filters.search}%` : null)
            .input('project_type_id', sql.UniqueIdentifier, filters?.projectTypeId || null)
            .query(`
                -- 1. Get filtered Projects
                SELECT DISTINCT p.id, p.project_code, p.name
                FROM pms.projects p
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                LEFT JOIN pms.employees owner ON p.project_owner_id = owner.id
                LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                WHERE p.is_active = 1
                AND (@year IS NULL OR p.project_year = @year)
                AND (@customer_id IS NULL OR p.customer_id = @customer_id)
                AND (@manager_id IS NULL OR p.project_manager_id = @manager_id)
                AND (@owner_id IS NULL OR p.project_owner_id = @owner_id)
                AND (@status_id IS NULL OR ps.id = @status_id)
                AND (@project_type_id IS NULL OR p.project_type_id = @project_type_id)
                AND (@search IS NULL OR p.project_code LIKE @search OR p.name LIKE @search)
                AND (
                    -- Access Control: Owner, Manager, Assignee, or Admin (simplified to check existence in tasks or role)
                    p.project_owner_id = @employee_id
                    OR p.project_manager_id = @employee_id
                    OR EXISTS (
                        SELECT 1 FROM pms.tasks t 
                        JOIN pms.stories s ON t.story_id = s.id 
                        WHERE s.project_id = p.id AND t.assignee_id = @employee_id
                    )
                    OR EXISTS (
                        SELECT 1 FROM pms.employees e 
                        WHERE e.id = @employee_id AND e.position_id IN (SELECT id FROM pms.positions WHERE code = 'ADMIN')
                    )
                );

                -- 2. Get Milestones
                SELECT pm.id, pm.project_id, pm.milestone_config_id, mc.name, mc.color, pm.status, pm.sort_order, pm.due_date,
                    (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.is_active = 1) as total_stories,
                    (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.is_active = 1 AND s.status = 'done') as completed_stories
                FROM pms.project_milestones pm
                JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id IN (
                    SELECT DISTINCT p.id
                    FROM pms.projects p
                    LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                    WHERE p.is_active = 1
                    AND (@year IS NULL OR p.project_year = @year)
                    AND (@customer_id IS NULL OR p.customer_id = @customer_id)
                    AND (@manager_id IS NULL OR p.project_manager_id = @manager_id)
                    AND (@owner_id IS NULL OR p.project_owner_id = @owner_id)
                    AND (@status_id IS NULL OR ps.id = @status_id)
                    AND (@search IS NULL OR p.project_code LIKE @search OR p.name LIKE @search)
                    AND (
                        p.project_owner_id = @employee_id 
                        OR p.project_manager_id = @employee_id
                        OR EXISTS (SELECT 1 FROM pms.tasks t JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.assignee_id = @employee_id)
                        OR EXISTS (SELECT 1 FROM pms.employees e WHERE e.id = @employee_id AND e.position_id IN (SELECT id FROM pms.positions WHERE code = 'ADMIN'))
                    )
                )
                ORDER BY pm.sort_order;

                -- 3. Get Stories
                SELECT s.* FROM pms.stories s
                WHERE s.project_id IN (
                    SELECT DISTINCT p.id
                    FROM pms.projects p
                    LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                    WHERE p.is_active = 1
                    AND (@year IS NULL OR p.project_year = @year)
                    AND (@customer_id IS NULL OR p.customer_id = @customer_id)
                    AND (@manager_id IS NULL OR p.project_manager_id = @manager_id)
                    AND (@owner_id IS NULL OR p.project_owner_id = @owner_id)
                    AND (@status_id IS NULL OR ps.id = @status_id)
                    AND (@search IS NULL OR p.project_code LIKE @search OR p.name LIKE @search)
                    AND (
                        p.project_owner_id = @employee_id 
                        OR p.project_manager_id = @employee_id
                        OR EXISTS (SELECT 1 FROM pms.tasks t JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.assignee_id = @employee_id)
                        OR EXISTS (SELECT 1 FROM pms.employees e WHERE e.id = @employee_id AND e.position_id IN (SELECT id FROM pms.positions WHERE code = 'ADMIN'))
                    )
                ) AND s.is_active = 1;

                -- 4. Get Tasks
                 SELECT t.*, COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as assignee_name, e.employee_code FROM pms.tasks t
                 JOIN pms.stories s ON t.story_id = s.id
                 LEFT JOIN pms.employees e ON t.assignee_id = e.id
                 WHERE s.project_id IN (
                    SELECT DISTINCT p.id
                    FROM pms.projects p
                    LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
                    WHERE p.is_active = 1
                    AND (@year IS NULL OR p.project_year = @year)
                    AND (@customer_id IS NULL OR p.customer_id = @customer_id)
                    AND (@manager_id IS NULL OR p.project_manager_id = @manager_id)
                    AND (@owner_id IS NULL OR p.project_owner_id = @owner_id)
                    AND (@status_id IS NULL OR ps.id = @status_id)
                    AND (@search IS NULL OR p.project_code LIKE @search OR p.name LIKE @search)
                    AND (
                        p.project_owner_id = @employee_id 
                        OR p.project_manager_id = @employee_id
                        OR EXISTS (SELECT 1 FROM pms.tasks t JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.assignee_id = @employee_id)
                        OR EXISTS (SELECT 1 FROM pms.employees e WHERE e.id = @employee_id AND e.position_id IN (SELECT id FROM pms.positions WHERE code = 'ADMIN'))
                    )
                ) AND t.is_active = 1;
            `)

        const projects = (result.recordsets as any)[0]
        const milestones = (result.recordsets as any)[1]
        const stories = (result.recordsets as any)[2]
        const tasks = (result.recordsets as any)[3]

        const projectGroups: ProjectWorkItemsGroup[] = projects.map((p: any) => {
            const pMilestones = milestones.filter((m: any) => m.project_id === p.id).map((m: any) => {
                const mStories = stories.filter((s: any) => s.milestone_id === m.id).map((s: any) => {
                    const sTasks = tasks.filter((t: any) => t.story_id === s.id)
                    return {
                        ...s,
                        tasks: sTasks
                    }
                })

                return {
                    ...m,
                    stories: mStories,
                    completed_percent: m.total_stories > 0 ? Math.round((m.completed_stories / m.total_stories) * 100) : 0
                }
            })

            return {
                projectId: p.id,
                projectName: p.name,
                projectCode: p.project_code,
                milestones: pMilestones
            }
        })

        return { success: true, data: projectGroups }

    } catch (error: any) {
        console.error('getGlobalWorkItems error:', error)
        return { success: false, data: [], error: 'Failed to load global work items' }
    }
}

export async function getProjectWorkItems(projectId: string, filters?: WorkItemFilters) {
    try {
        const pool = await getConnection()
        const request = pool.request()

        // 1. Get Milestones
        const milestonesResult = await request
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    pm.id,
                    pm.milestone_config_id,
                    mc.name,
                    mc.color,
                    pm.status,
                    pm.sort_order
                FROM pms.project_milestones pm
                JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id = @projectId
                ORDER BY pm.sort_order
            `)

        const milestones: MilestoneGroup[] = milestonesResult.recordset.map((m: any) => ({
            ...m,
            stories: [],
            completed_percent: 0
        }))

        // 2. Get Stories
        let storyQuery = `
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id) as total_tasks,
                (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.status = 'done') as completed_tasks
            FROM pms.stories s
            WHERE s.project_id = @projectId
        `

        if (filters?.milestoneId) {
            storyQuery += ` AND s.milestone_id = @milestoneId`
            request.input('milestoneId', sql.UniqueIdentifier, filters.milestoneId)
        }

        if (filters?.search) {
            storyQuery += ` AND (s.title LIKE @search OR s.story_code LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        storyQuery += ` ORDER BY s.sort_order`

        const storiesResult = await request.query(storyQuery)
        const stories = storiesResult.recordset

        // 3. Get Tasks
        let taskQuery = `
            SELECT
                t.*,
                COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as assignee_name,
                e.employee_code
            FROM pms.tasks t
            JOIN pms.stories s ON t.story_id = s.id
            LEFT JOIN pms.employees e ON t.assignee_id = e.id
            WHERE s.project_id = @projectId
        `

        if (filters?.assigneeId) {
            taskQuery += ` AND t.assignee_id = @assigneeId`
            request.input('assigneeId', sql.UniqueIdentifier, filters.assigneeId)
        }

        if (filters?.status) {
            taskQuery += ` AND t.status = @status`
            request.input('status', sql.NVarChar, filters.status)
        }

        const tasksResult = await request.query(taskQuery)
        const tasks = tasksResult.recordset

        // Assemble Data
        stories.forEach((story: any) => {
            story.tasks = tasks.filter((t: any) => t.story_id === story.id)

            // Filter out stories that have no matching tasks if task filters are active
            // but keep story if no task filters or if it matches search
            if ((filters?.assigneeId || filters?.status) && story.tasks.length === 0) {
                // Skip this story if it doesn't have matching tasks (refined logic needed?)
                // For now, simpler approach: if task filter applied, only show stories with matching tasks.
                // OR show empty stories? Requirement "Filter according to assignee" usually implies hiding non-matches.
            }
        })

        // Filter stories based on task filters (if tasks are filtered, remove stories with no tasks)
        const filteredStories = (filters?.assigneeId || filters?.status)
            ? stories.filter((s: any) => s.tasks.length > 0)
            : stories

        // Map stories to milestones
        milestones.forEach(ms => {
            ms.stories = filteredStories.filter((s: any) => s.milestone_id === ms.id)

            // Calculate Milestone Progress based on Tasks
            let totalTasks = 0;
            let doneTasks = 0;

            ms.stories.forEach((s: any) => {
                const storyTasks = tasks.filter((t: any) => t.story_id === s.id)
                totalTasks += storyTasks.length
                doneTasks += storyTasks.filter((t: any) => t.status === 'done').length
            })

            ms.completed_percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
        })

        // Also include stories with no milestone (if any) - create a "Backlog/No Milestone" group if needed
        // For now, assume all stories have milestones as per schema constraints usually.

        return { success: true, data: milestones }

    } catch (error) {
        console.error('getProjectWorkItems error:', error)
        return { success: false, error: 'Failed to load work items', data: [] }
    }
}

// ============================================
// GET SUMMARY
// ============================================
export async function getWorkItemsSummary(projectId: string) {
    try {
        const pool = await getConnection()

        const [milestonesInfo, tasksInfo] = await Promise.all([
            pool.request().input('projectId', projectId).query(`
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM pms.project_milestones WHERE project_id = @projectId
            `),
            pool.request().input('projectId', projectId).query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
                    SUM(CASE WHEN t.status = 'in_progress' OR t.status = 'working' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN t.due_date < GETDATE() AND t.status != 'done' THEN 1 ELSE 0 END) as overdue,
                    (SELECT COUNT(*) FROM pms.stories WHERE project_id = @projectId) as total_stories,
                    (SELECT COUNT(*) FROM pms.stories WHERE project_id = @projectId AND status = 'done') as completed_stories
                FROM pms.tasks t
                JOIN pms.stories s ON t.story_id = s.id
                WHERE s.project_id = @projectId
            `)
        ])

        const m = milestonesInfo.recordset[0]
        const t = tasksInfo.recordset[0]

        return {
            success: true,
            data: {
                totalMilestones: m.total || 0,
                milestoneProgress: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
                totalStories: t.total_stories || 0,
                completedStories: t.completed_stories || 0,
                totalTasks: t.total || 0,
                completedTasks: t.done || 0,
                inProgressTasks: t.in_progress || 0,
                overdueTasks: t.overdue || 0
            }
        }
    } catch (error) {
        console.error('getWorkItemsSummary error:', error)
        return { success: false, data: null }
    }
}


// ============================================
// CREATE STORY
// ============================================

export async function createStory(data: any) {
    try {
        const pool = await getConnection()

        // Generate Story Code (S-XXXX)
        const codeResult = await pool.request()
            .input('projectId', data.project_id)
            .query(`
                SELECT COUNT(*) as count FROM pms.stories WHERE project_id = @projectId
            `)
        const nextNum = codeResult.recordset[0].count + 1
        const storyCode = `S-${nextNum.toString().padStart(3, '0')}`

        const newId = require('crypto').randomUUID()

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, newId)
            .input('project_id', sql.UniqueIdentifier, data.project_id)
            .input('milestone_id', sql.UniqueIdentifier, data.milestone_id)
            .input('story_code', sql.NVarChar, storyCode)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('priority', sql.NVarChar, data.priority || 'medium')
            .input('due_date', sql.Date, data.due_date || null)
            .input('sort_order', sql.Int, nextNum)
            .query(`
                INSERT INTO pms.stories
                (id, project_id, milestone_id, story_code, title, description, priority, due_date, sort_order, status, is_active, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES
                (@id, @project_id, @milestone_id, @story_code, @title, @description, @priority, @due_date, @sort_order, 'backlog', 1, GETDATE(), GETDATE())
            `)

        revalidatePath(`/projects/${data.project_id}`)
        return { success: true, data: { id: result.recordset[0].id, code: storyCode } }

    } catch (error: any) {
        console.error('createStory error:', error)
        return { success: false, error: error.message || 'Failed to create story' }
    }
}

// ============================================
// UPDATE STORY
// ============================================

export async function updateStory(id: string, data: any) {
    try {
        const pool = await getConnection()
        const request = pool.request().input('id', id)

        let updateFields = []

        if (data.title !== undefined) {
            updateFields.push('title = @title')
            request.input('title', data.title)
        }
        if (data.milestone_id !== undefined) {
            updateFields.push('milestone_id = @milestone_id')
            request.input('milestone_id', data.milestone_id)
        }
        if (data.status !== undefined) {
            updateFields.push('status = @status')
            request.input('status', data.status)
        }
        if (data.priority !== undefined) {
            updateFields.push('priority = @priority')
            request.input('priority', data.priority)
        }
        if (data.estimated_md !== undefined) {
            updateFields.push('estimated_md = @estimated_md')
            request.input('estimated_md', data.estimated_md)
        }
        if (data.due_date !== undefined) {
            updateFields.push('due_date = @due_date')
            request.input('due_date', data.due_date)
        }

        if (updateFields.length === 0) return { success: true }

        await request.query(`UPDATE pms.stories SET ${updateFields.join(', ')} WHERE id = @id`)

        revalidatePath(`/projects/[id]`, 'page') // This might need the actual ID or use generic revalidate
        // Since we don't have projectId here easily without querying, we can rely on client refresh or pass projectId

        return { success: true }
    } catch (error) {
        console.error('updateStory error:', error)
        return { success: false, error: 'Failed to update story' }
    }
}

// ============================================
// DELETE STORY (Soft Delete)
// ============================================
export async function deleteStory(id: string) {
    try {
        const pool = await getConnection()

        // Soft delete all tasks in this story first (to avoid FK constraint with timesheets)
        await pool.request().input('id', id).query(`
            UPDATE pms.tasks
            SET is_active = 0, updated_at = GETDATE()
            WHERE story_id = @id
        `)

        // Soft delete the story
        await pool.request().input('id', id).query(`
            UPDATE pms.stories
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id
        `)

        return { success: true }
    } catch (error) {
        console.error('deleteStory error:', error)
        return { success: false, error: 'Failed to delete story' }
    }
}

// ============================================
// CREATE TASK
// ============================================

export async function createTask(data: any) {
    try {
        const pool = await getConnection()

        // Generate globally unique task code (format: YMMNNNN, e.g. 6040001)
        const taskCode = await generateTaskCode(pool)
        const newId = require('crypto').randomUUID()

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, newId)
            .input('story_id', sql.UniqueIdentifier, data.story_id)
            .input('task_code', sql.NVarChar, taskCode)
            .input('title', sql.NVarChar, data.title)
            .input('task_type', sql.NVarChar, data.task_type || 'DEV')
            .input('priority', sql.NVarChar, data.priority || 'medium')
            .input('assignee_id', sql.UniqueIdentifier, data.assignee_id || null)
            .input('estimated_hours', sql.Decimal(10, 2), data.estimated_hours || 8)
            .input('due_date', sql.Date, data.due_date || null)
            .query(`
                INSERT INTO pms.tasks
                (id, story_id, task_code, title, task_type, priority, assignee_id, estimated_hours, status, due_date, is_active, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES
                (@id, @story_id, @task_code, @title, @task_type, @priority, @assignee_id, @estimated_hours, 'todo', @due_date, 1, GETDATE(), GETDATE())
            `)

        return { success: true, id: result.recordset[0].id, code: taskCode }

    } catch (error: any) {
        console.error('createTask error:', error)
        return { success: false, error: error.message || 'Failed to create task' }
    }
}

// ============================================
// UPDATE TASK
// ============================================
export async function updateTask(id: string, data: any) {
    try {
        const pool = await getConnection()
        const request = pool.request().input('id', id)

        let updateFields = []

        if (data.title !== undefined) { updateFields.push('title = @title'); request.input('title', data.title); }
        if (data.status !== undefined) { updateFields.push('status = @status'); request.input('status', data.status); }
        if (data.priority !== undefined) { updateFields.push('priority = @priority'); request.input('priority', data.priority); }
        if (data.assignee_id !== undefined) { updateFields.push('assignee_id = @assignee_id'); request.input('assignee_id', data.assignee_id); }
        if (data.estimated_hours !== undefined) { updateFields.push('estimated_hours = @estimated_hours'); request.input('estimated_hours', data.estimated_hours); }
        if (data.actual_hours !== undefined) { updateFields.push('actual_hours = @actual_hours'); request.input('actual_hours', data.actual_hours); }
        if (data.due_date !== undefined) { updateFields.push('due_date = @due_date'); request.input('due_date', data.due_date); }
        if (data.task_type !== undefined) { updateFields.push('task_type = @task_type'); request.input('task_type', data.task_type); }

        if (updateFields.length === 0) return { success: true }

        await request.query(`UPDATE pms.tasks SET ${updateFields.join(', ')} WHERE id = @id`)

        return { success: true }
    } catch (error) {
        console.error('updateTask error:', error)
        return { success: false, error: 'Failed to update task' }
    }
}

// ============================================
// DELETE TASK (Soft Delete)
// ============================================
export async function deleteTask(id: string) {
    try {
        const pool = await getConnection()
        // Use soft delete (is_active = 0) to avoid FK constraint issues with timesheets
        await pool.request().input('id', id).query(`
            UPDATE pms.tasks
            SET is_active = 0, updated_at = GETDATE()
            WHERE id = @id
        `)
        return { success: true }
    } catch (error) {
        console.error('deleteTask error:', error)
        return { success: false, error: 'Failed to delete task' }
    }
}

// ============================================
// BULK CREATE TASKS
// ============================================
export async function bulkCreateTasks(storyId: string, tasks: any[]) {
    try {
        const pool = await getConnection()

        // Use transaction
        const transaction = new sql.Transaction(pool)
        await transaction.begin()

        for (const task of tasks) {
            // Generate globally unique task code for each task (format: YMMNNNN)
            const taskCode = await generateTaskCode(transaction.request())

            await transaction.request()
                .input('story_id', storyId)
                .input('task_code', taskCode)
                .input('title', task.title)
                .input('task_type', task.task_type || 'Feature')
                .input('priority', task.priority || 'Medium')
                .input('estimated_hours', task.estimated_hours || 8)
                .query(`
                    INSERT INTO pms.tasks
                    (story_id, task_code, title, task_type, priority, estimated_hours, status)
                    VALUES
                    (@story_id, @task_code, @title, @task_type, @priority, @estimated_hours, 'todo')
                `)
        }

        await transaction.commit()
        return { success: true }

    } catch (error) {
        console.error('bulkCreateTasks error:', error)
        return { success: false, error: 'Failed to bulk create tasks' }
    }
}
