'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface Task {
    id: string
    task_code: string
    title: string
    description: string | null
    story_id: string
    story_code: string
    project_id: string
    project_code: string
    milestone_code: string | null
    task_type: string
    task_type_name: string
    task_type_color: string
    task_type_icon: string
    assignee_id: string | null
    assignee_name: string | null
    assignee_nickname: string | null
    reviewer_id: string | null
    reviewer_name: string | null
    priority: 'critical' | 'high' | 'medium' | 'low'
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled'
    estimated_hours: number | null
    actual_hours: number
    due_date: string | null
}

// ============================================
// GET TASK BY ID
// ============================================

export async function getTaskById(taskId: string) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
        SELECT 
          t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
          p.id AS project_id, p.project_code, mc.code AS milestone_code,
          t.task_type, ttc.name_th AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
          t.assignee_id, CONCAT(assignee.first_name_th, ' ', assignee.last_name_th) AS assignee_name, assignee.nickname AS assignee_nickname,
          t.reviewer_id, CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th) AS reviewer_name,
          t.priority, t.[status], t.estimated_hours, t.actual_hours, t.due_date
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
        LEFT JOIN pms.employees assignee ON t.assignee_id = assignee.id
        LEFT JOIN pms.employees reviewer ON t.reviewer_id = reviewer.id
        WHERE t.id = @taskId
      `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Task not found', data: null }
        }

        return { success: true, data: result.recordset[0] as Task }

    } catch (error: any) {
        console.error('getTaskById error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// GET TASKS BY STORY
// ============================================

export async function getTasksByStory(storyId: string) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .query(`
        SELECT 
          t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
          p.id AS project_id, p.project_code, mc.code AS milestone_code,
          t.task_type, ttc.name_th AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
          t.assignee_id, CONCAT(assignee.first_name_th, ' ', assignee.last_name_th) AS assignee_name, assignee.nickname AS assignee_nickname,
          t.reviewer_id, CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th) AS reviewer_name,
          t.priority, t.[status], t.estimated_hours, t.actual_hours, t.due_date
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        INNER JOIN pms.projects p ON s.project_id = p.id
        LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
        LEFT JOIN pms.employees assignee ON t.assignee_id = assignee.id
        LEFT JOIN pms.employees reviewer ON t.reviewer_id = reviewer.id
        WHERE t.story_id = @storyId AND t.[is_active] = 1
        ORDER BY CASE t.[status] WHEN 'blocked' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 ELSE 4 END, t.task_code
      `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getTasksByStory error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET TASKS BY PROJECT
// ============================================

export async function getTasksByProject(projectId: string, filters?: {
    storyId?: string
    status?: string
    assigneeId?: string
    taskType?: string
    search?: string
}) {
    try {
        const pool = await getConnection()

        let query = `
      SELECT 
        t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
        p.id AS project_id, p.project_code, mc.code AS milestone_code,
        t.task_type, ttc.name_th AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
        t.assignee_id, CONCAT(assignee.first_name_th, ' ', assignee.last_name_th) AS assignee_name, assignee.nickname AS assignee_nickname,
        t.reviewer_id, CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th) AS reviewer_name,
        t.priority, t.[status], t.estimated_hours, t.actual_hours, t.due_date
      FROM pms.tasks t
      INNER JOIN pms.stories s ON t.story_id = s.id
      INNER JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
      LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
      LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
      LEFT JOIN pms.employees assignee ON t.assignee_id = assignee.id
      LEFT JOIN pms.employees reviewer ON t.reviewer_id = reviewer.id
      WHERE s.project_id = @projectId AND t.[is_active] = 1
    `

        const request = pool.request()
        request.input('projectId', sql.UniqueIdentifier, projectId)

        if (filters?.storyId) {
            query += ` AND t.story_id = @storyId`
            request.input('storyId', sql.UniqueIdentifier, filters.storyId)
        }
        if (filters?.status) {
            query += ` AND t.[status] = @status`
            request.input('status', sql.NVarChar, filters.status)
        }
        if (filters?.assigneeId) {
            query += ` AND t.assignee_id = @assigneeId`
            request.input('assigneeId', sql.UniqueIdentifier, filters.assigneeId)
        }
        if (filters?.taskType) {
            query += ` AND t.task_type = @taskType`
            request.input('taskType', sql.NVarChar, filters.taskType)
        }
        if (filters?.search) {
            query += ` AND (t.task_code LIKE @search OR t.title LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        query += ` ORDER BY t.due_date, t.task_code`

        const result = await request.query(query)
        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getTasksByProject error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// CREATE TASK
// ============================================

export async function createTask(data: {
    story_id: string
    title: string
    description?: string
    task_type: string
    assignee_id?: string
    reviewer_id?: string
    priority: string
    estimated_hours?: number
    due_date?: string
}) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Generate task code
        const codeResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .query(`
        SELECT CONCAT('T-', RIGHT('000' + CAST(ISNULL(MAX(TRY_CAST(REPLACE(task_code, 'T-', '') AS INT)), 0) + 1 AS VARCHAR), 3)) AS new_code
        FROM pms.tasks WHERE story_id = @storyId
      `)

        const taskCode = codeResult.recordset[0].new_code

        const result = await pool.request()
            .input('taskCode', sql.NVarChar, taskCode)
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('taskType', sql.NVarChar, data.task_type)
            .input('assigneeId', sql.UniqueIdentifier, data.assignee_id || null)
            .input('reviewerId', sql.UniqueIdentifier, data.reviewer_id || null)
            .input('priority', sql.NVarChar, data.priority)
            .input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours || null)
            .input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
        INSERT INTO pms.tasks (task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by)
        OUTPUT INSERTED.id, INSERTED.task_code
        VALUES (@taskCode, @storyId, @title, @description, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy)
      `)

        // Revalidate
        const storyResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .query(`SELECT project_id FROM pms.stories WHERE id = @storyId`)

        if (storyResult.recordset[0]) {
            revalidatePath(`/projects/${storyResult.recordset[0].project_id}`)
        }

        return { success: true, data: result.recordset[0] }

    } catch (error: any) {
        console.error('createTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE TASK
// ============================================

export async function updateTask(taskId: string, data: Partial<{
    title: string
    description: string
    task_type: string
    assignee_id: string
    reviewer_id: string
    priority: string
    status: string
    estimated_hours: number
    due_date: string
}>) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const updates: string[] = []
        const request = pool.request()
        request.input('taskId', sql.UniqueIdentifier, taskId)

        if (data.title !== undefined) {
            updates.push('title = @title')
            request.input('title', sql.NVarChar, data.title)
        }
        if (data.description !== undefined) {
            updates.push('description = @description')
            request.input('description', sql.NVarChar, data.description)
        }
        if (data.task_type !== undefined) {
            updates.push('task_type = @taskType')
            request.input('taskType', sql.NVarChar, data.task_type)
        }
        if (data.assignee_id !== undefined) {
            updates.push('assignee_id = @assigneeId')
            request.input('assigneeId', sql.UniqueIdentifier, data.assignee_id || null)
        }
        if (data.reviewer_id !== undefined) {
            updates.push('reviewer_id = @reviewerId')
            request.input('reviewerId', sql.UniqueIdentifier, data.reviewer_id || null)
        }
        if (data.priority !== undefined) {
            updates.push('priority = @priority')
            request.input('priority', sql.NVarChar, data.priority)
        }
        if (data.status !== undefined) {
            updates.push('[status] = @status')
            request.input('status', sql.NVarChar, data.status)
            if (data.status === 'done') updates.push('completed_date = GETDATE()')
        }
        if (data.estimated_hours !== undefined) {
            updates.push('estimated_hours = @estimatedHours')
            request.input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours)
        }
        if (data.due_date !== undefined) {
            updates.push('due_date = @dueDate')
            request.input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
        }

        updates.push('updated_at = GETDATE()')

        await request.query(`UPDATE pms.tasks SET ${updates.join(', ')} WHERE id = @taskId`)

        // Revalidate
        const taskResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`SELECT p.id AS project_id FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id INNER JOIN pms.projects p ON s.project_id = p.id WHERE t.id = @taskId`)

        if (taskResult.recordset[0]) {
            revalidatePath(`/projects/${taskResult.recordset[0].project_id}`)
        }

        return { success: true }

    } catch (error: any) {
        console.error('updateTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE TASK STATUS (Quick)
// ============================================

export async function updateTaskStatus(taskId: string, status: string) {
    return updateTask(taskId, { status })
}

// ============================================
// DELETE TASK
// ============================================

export async function deleteTask(taskId: string) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const taskResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`SELECT p.id AS project_id FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id INNER JOIN pms.projects p ON s.project_id = p.id WHERE t.id = @taskId`)

        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`UPDATE pms.tasks SET [is_active] = 0, updated_at = GETDATE() WHERE id = @taskId`)

        if (taskResult.recordset[0]) {
            revalidatePath(`/projects/${taskResult.recordset[0].project_id}`)
        }

        return { success: true }

    } catch (error: any) {
        console.error('deleteTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// GET TASK TYPES
// ============================================

export async function getTaskTypes() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT code as value, name as label, name, name_th, color, icon, is_defect
            FROM pms.task_type_configs
            WHERE is_active = 1
            ORDER BY sort_order
        `)

        return result.recordset
    } catch (error) {
        console.error('getTaskTypes error:', error)
        // Fallback to static data if DB fails
        return [
            { value: 'development', label: 'Development' },
            { value: 'bug_fix', label: 'Bug Fix' },
            { value: 'design', label: 'Design' },
            { value: 'testing', label: 'Testing' },
            { value: 'documentation', label: 'Documentation' }
        ]
    }
}
