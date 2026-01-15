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
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'done_not_planned' | 'blocked' | 'cancelled'
    not_as_planned_reason?: string | null
    estimated_hours: number | null
    actual_hours: number
    due_date: string | null
}

// Helper to check if task_type_configs has name_th column
async function checkTaskTypeNameThColumn(pool: any): Promise<boolean> {
    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_type_configs'
        AND COLUMN_NAME = 'name_th'
    `)
    return columnCheck.recordset.length > 0
}

// ============================================
// GET TASK BY ID
// ============================================

export async function getTaskById(taskId: string) {
    try {
        const pool = await getConnection()
        const hasTaskTypeNameTh = await checkTaskTypeNameThColumn(pool)
        const taskTypeNameCol = hasTaskTypeNameTh ? 'ttc.name_th' : 'ttc.name'

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
        SELECT
          t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
          p.id AS project_id, p.project_code, mc.code AS milestone_code,
          t.task_type, ${taskTypeNameCol} AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
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
        const hasTaskTypeNameTh = await checkTaskTypeNameThColumn(pool)
        const taskTypeNameCol = hasTaskTypeNameTh ? 'ttc.name_th' : 'ttc.name'

        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .query(`
        SELECT
          t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
          p.id AS project_id, p.project_code, mc.code AS milestone_code,
          t.task_type, ${taskTypeNameCol} AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
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
        const hasTaskTypeNameTh = await checkTaskTypeNameThColumn(pool)
        const taskTypeNameCol = hasTaskTypeNameTh ? 'ttc.name_th' : 'ttc.name'

        let query = `
      SELECT
        t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
        p.id AS project_id, p.project_code, mc.code AS milestone_code,
        t.task_type, ${taskTypeNameCol} AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
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
    checklist_items?: { title: string; sort_order: number }[]
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
        const newId = require('crypto').randomUUID()

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, newId)
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
        INSERT INTO pms.tasks (id, task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by, status, is_active, created_at, updated_at)
        OUTPUT INSERTED.id, INSERTED.task_code
        VALUES (@id, @taskCode, @storyId, @title, @description, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy, 'todo', 1, GETDATE(), GETDATE())
      `)

        const taskId = result.recordset[0].id

        // Create checklist items if provided
        if (data.checklist_items && data.checklist_items.length > 0) {
            for (const item of data.checklist_items) {
                await pool.request()
                    .input('taskId', sql.UniqueIdentifier, taskId)
                    .input('title', sql.NVarChar, item.title)
                    .input('sortOrder', sql.Int, item.sort_order)
                    .query(`
                        INSERT INTO pms.task_checklist_items (task_id, title, sort_order)
                        VALUES (@taskId, @title, @sortOrder)
                    `)
            }
        }

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
    not_as_planned_reason: string
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
            // Set completed_date for both 'done' and 'done_not_planned'
            if (data.status === 'done' || data.status === 'done_not_planned') {
                updates.push('completed_date = GETDATE()')
            }
        }
        if (data.not_as_planned_reason !== undefined) {
            updates.push('not_as_planned_reason = @notAsPlannedReason')
            request.input('notAsPlannedReason', sql.NVarChar, data.not_as_planned_reason || null)
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

        // Check if name_th column exists
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_type_configs'
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameTh = columnCheck.recordset.length > 0

        const query = hasNameTh
            ? `SELECT code as value, name as label, name, name_th, color, icon, is_defect
               FROM pms.task_type_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT code as value, name as label, name, NULL as name_th, color, icon, is_defect
               FROM pms.task_type_configs WHERE is_active = 1 ORDER BY sort_order`

        const result = await pool.request().query(query)
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
