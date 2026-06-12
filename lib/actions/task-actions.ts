'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { isMilestoneLocked } from './milestone-actions'
import { generateTaskCode } from '@/lib/utils/task-code-generator'
import { moveFile, deleteFile } from '@/lib/services/file-service'
import { getWorkingDaysBetween, addWorkingDays, subtractWorkingDays } from '@/lib/utils/date-math'


// ============================================
// ATTACHMENT HELPERS
// ============================================

type RawAttachment = {
    id?: string
    name: string
    path: string
    size: number
    mimeType?: string
    type?: string
    uploadedAt?: string
}

/**
 * Move temp-uploaded files into a permanent `tasks/{task_code}/` folder and
 * rewrite their `path` fields. Falls back to the original metadata if the move
 * fails so the user does not lose access to a successfully uploaded file.
 */
async function relocateTaskAttachments(attachments: RawAttachment[], taskCode: string) {
    const targetFolder = `tasks/${taskCode}`
    const result: RawAttachment[] = []
    for (const att of attachments) {
        if (!att.path.startsWith('tasks/temp-')) {
            result.push(att)
            continue
        }
        const filename = att.path.split('/').pop() || ''
        const destPath = `${targetFolder}/${filename}`
        const moveResult = await moveFile(att.path, destPath)
        if (moveResult.success) {
            result.push({ ...att, path: destPath })
        } else {
            console.error('relocateTaskAttachments: move failed', att.path, moveResult.error)
            result.push(att)
        }
    }
    return result
}

// ============================================
// BULK CREATE TASKS
// ============================================

export interface BulkTaskInput {
    title: string
    task_type: string
    priority: string
    estimated_hours?: number
    due_date?: string
    assignee_id?: string
    is_count_for_kpi?: boolean
    attachments?: RawAttachment[]
}

/**
 * Create up to N tasks for the same story in a single transaction.
 * - Generates a unique task_code per row (the code generator uses UPDLOCK so the
 *   loop is safe under concurrent inserts).
 * - Relocates each row's temp-uploaded attachments to its permanent
 *   `tasks/{task_code}/` folder after the inserts commit.
 * - Returns per-row results so the caller can show what was created.
 */
export async function createTasksBulk(input: {
    story_id: string
    tasks: BulkTaskInput[]
}) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        if (!input.tasks || input.tasks.length === 0) {
            return { success: false, error: 'No tasks to create' }
        }
        for (const t of input.tasks) {
            if (!t.title?.trim()) return { success: false, error: 'Task title is required for all rows' }
            if (!t.task_type) return { success: false, error: `Task type is required: "${t.title}"` }
            if (!t.priority) return { success: false, error: `Priority is required: "${t.title}"` }
        }

        const pool = await getConnection()

        // Milestone-lock check (same gate as createTask)
        const storyResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, input.story_id)
            .query(`SELECT milestone_id FROM pms.stories WHERE id = @storyId`)
        if (storyResult.recordset.length > 0 && storyResult.recordset[0].milestone_id) {
            const milestoneId = storyResult.recordset[0].milestone_id
            const isLocked = await isMilestoneLocked(milestoneId)
            if (isLocked) {
                return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถเพิ่ม Task ได้' }
            }
        }

        // Detect optional columns once outside the transaction
        const colCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
              AND COLUMN_NAME IN ('is_count_for_kpi', 'attachments')
        `)
        const hasKpiColumn = colCheck.recordset.some((r: any) => r.COLUMN_NAME === 'is_count_for_kpi')
        const hasAttachmentsColumn = colCheck.recordset.some((r: any) => r.COLUMN_NAME === 'attachments')

        const transaction = new sql.Transaction(pool)
        const created: { id: string; task_code: string; title: string }[] = []

        try {
            await transaction.begin()

            for (const t of input.tasks) {
                const codeRequest = new sql.Request(transaction)
                const taskCode = await generateTaskCode(codeRequest)
                const newId = require('crypto').randomUUID()

                const insertRequest = new sql.Request(transaction)
                    .input('id', sql.UniqueIdentifier, newId)
                    .input('taskCode', sql.NVarChar, taskCode)
                    .input('storyId', sql.UniqueIdentifier, input.story_id)
                    .input('title', sql.NVarChar, t.title.trim())
                    .input('taskType', sql.NVarChar, t.task_type)
                    .input('assigneeId', sql.UniqueIdentifier, t.assignee_id || null)
                    .input('reviewerId', sql.UniqueIdentifier, user.id)
                    .input('priority', sql.NVarChar, t.priority)
                    .input('estimatedHours', sql.Decimal(10, 2), t.estimated_hours ?? null)
                    .input('dueDate', sql.Date, t.due_date ? new Date(t.due_date) : null)
                    .input('createdBy', sql.UniqueIdentifier, user.id)

                let insertQuery: string
                if (hasKpiColumn) {
                    insertRequest.input('isCountForKpi', sql.Bit, t.is_count_for_kpi !== false ? 1 : 0)
                    insertQuery = `
                        INSERT INTO pms.tasks (id, task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by, status, is_active, is_count_for_kpi, created_at, updated_at)
                        VALUES (@id, @taskCode, @storyId, @title, NULL, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy, 'todo', 1, @isCountForKpi, GETDATE(), GETDATE())
                    `
                } else {
                    insertQuery = `
                        INSERT INTO pms.tasks (id, task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by, status, is_active, created_at, updated_at)
                        VALUES (@id, @taskCode, @storyId, @title, NULL, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy, 'todo', 1, GETDATE(), GETDATE())
                    `
                }
                await insertRequest.query(insertQuery)
                created.push({ id: newId, task_code: taskCode, title: t.title.trim() })
            }

            await transaction.commit()
        } catch (txErr: any) {
            try { await transaction.rollback() } catch { /* noop */ }
            throw txErr
        }

        // Post-commit: relocate temp attachments per task and persist metadata.
        // We do this outside the transaction because file moves are non-transactional
        // and a partial failure should not roll back tasks already created.
        if (hasAttachmentsColumn) {
            for (let i = 0; i < input.tasks.length; i++) {
                const row = input.tasks[i]
                const c = created[i]
                if (!row.attachments || row.attachments.length === 0) continue
                const finalAttachments = await relocateTaskAttachments(row.attachments, c.task_code)
                await pool.request()
                    .input('taskId', sql.UniqueIdentifier, c.id)
                    .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(finalAttachments))
                    .query(`UPDATE pms.tasks SET attachments = @attachments WHERE id = @taskId`)
            }
        }

        // Revalidate project view once
        const storyProjectResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, input.story_id)
            .query(`SELECT project_id FROM pms.stories WHERE id = @storyId`)
        const projectId = storyProjectResult.recordset[0]?.project_id
        if (projectId) {
            revalidatePath(`/projects/${projectId}`)
        }

        // Auto-create a matching tracking entry per task so they surface on the
        // gantt-overview daily grid. Skips silently when the column doesn't exist.
        if (projectId) {
            for (let i = 0; i < input.tasks.length; i++) {
                const row = input.tasks[i]
                const c = created[i]
                try {
                    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    await pool.request()
                        .input('id', sql.UniqueIdentifier, require('crypto').randomUUID())
                        .input('projectId', sql.UniqueIdentifier, projectId)
                        .input('entryDate', sql.Date, row.due_date ? new Date(row.due_date) : null)
                        .input('assigneeId', sql.UniqueIdentifier, row.assignee_id || null)
                        .input('note', sql.NVarChar(sql.MAX), `<p><b>${esc(c.title)}</b></p>`)
                        .input('taskId', sql.UniqueIdentifier, c.id)
                        .input('createdBy', sql.UniqueIdentifier, user.id)
                        .query(`
                            INSERT INTO pms.team_tracking_entries (
                                id, project_id, entry_date, assignee_id, assignee_role,
                                note, color, color_source, status, is_active,
                                task_id, created_by, created_at, updated_at
                            ) VALUES (
                                @id, @projectId, @entryDate, @assigneeId, 'EMPLOYEE',
                                @note, '#dc2626', 'MANUAL', 'PLANNED', 1,
                                @taskId, @createdBy, GETDATE(), GETDATE()
                            )
                        `)
                } catch (e) {
                    // Non-fatal — tracking entry is a convenience, not a requirement
                    console.error('createTasksBulk: tracking-entry mirror failed for', c.task_code, e)
                }
            }
        }

        return { success: true, data: { count: created.length, tasks: created } }
    } catch (error: any) {
        console.error('createTasksBulk error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete attachment files left in `tasks/temp-*` folders when the user cancels
 * create-task. Called from the modal so the storage doesn't accumulate orphans.
 */
export async function discardTempTaskAttachments(paths: string[]) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    for (const p of paths) {
        if (typeof p === 'string' && p.startsWith('tasks/temp-')) {
            try {
                await deleteFile(p)
            } catch (error) {
                console.error('discardTempTaskAttachments: delete failed', p, error)
            }
        }
    }
    return { success: true }
}

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
    is_count_for_kpi?: boolean
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

        // Check if is_count_for_kpi column exists
        const kpiColumnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
            AND COLUMN_NAME = 'is_count_for_kpi'
        `)
        const hasKpiColumn = kpiColumnCheck.recordset.length > 0
        const kpiSelect = hasKpiColumn ? ', t.is_count_for_kpi' : ', 1 AS is_count_for_kpi'

        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
        SELECT
          t.id, t.task_code, t.title, t.description, t.story_id, s.story_code,
          p.id AS project_id, p.project_code, mc.code AS milestone_code,
          t.task_type, ${taskTypeNameCol} AS task_type_name, ttc.color AS task_type_color, ttc.icon AS task_type_icon,
          t.assignee_id, CONCAT(assignee.first_name_th, ' ', assignee.last_name_th) AS assignee_name, assignee.nickname AS assignee_nickname,
          t.reviewer_id, CONCAT(reviewer.first_name_th, ' ', reviewer.last_name_th) AS reviewer_name,
          t.priority, t.[status], t.estimated_hours, t.actual_hours, t.due_date${kpiSelect}
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
        WHERE t.story_id = @storyId AND t.[is_active] = 1 AND t.[status] <> 'cancelled'
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
      WHERE s.project_id = @projectId AND t.[is_active] = 1 AND t.[status] <> 'cancelled'
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
    is_count_for_kpi?: boolean
    checklist_items?: { title: string; sort_order: number }[]
    attachments?: { id?: string; name: string; path: string; size: number; mimeType?: string; type?: string; uploadedAt?: string }[]
}) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if story's milestone is locked
        const storyResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .query(`SELECT milestone_id FROM pms.stories WHERE id = @storyId`)

        if (storyResult.recordset.length > 0 && storyResult.recordset[0].milestone_id) {
            const milestoneId = storyResult.recordset[0].milestone_id
            const isLocked = await isMilestoneLocked(milestoneId)
            if (isLocked) {
                return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถเพิ่ม Task ได้' }
            }
        }

        // Generate globally unique task code (format: YMMNNNN, e.g. 6040001)
        const taskCode = await generateTaskCode(pool)
        const newId = require('crypto').randomUUID()

        // Check if is_count_for_kpi column exists
        const kpiColumnCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
            AND COLUMN_NAME = 'is_count_for_kpi'
        `)
        const hasKpiColumn = kpiColumnCheck.recordset.length > 0

        const request = pool.request()
            .input('id', sql.UniqueIdentifier, newId)
            .input('taskCode', sql.NVarChar, taskCode)
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('taskType', sql.NVarChar, data.task_type)
            .input('assigneeId', sql.UniqueIdentifier, data.assignee_id || null)
            .input('reviewerId', sql.UniqueIdentifier, user.id) // Enforce current user as reviewer/creator
            .input('priority', sql.NVarChar, data.priority)
            .input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours || null)
            .input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
            .input('createdBy', sql.UniqueIdentifier, user.id)

        let insertQuery: string
        if (hasKpiColumn) {
            request.input('isCountForKpi', sql.Bit, data.is_count_for_kpi !== false ? 1 : 0)
            insertQuery = `
                INSERT INTO pms.tasks (id, task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by, status, is_active, is_count_for_kpi, created_at, updated_at)
                OUTPUT INSERTED.id, INSERTED.task_code
                VALUES (@id, @taskCode, @storyId, @title, @description, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy, 'todo', 1, @isCountForKpi, GETDATE(), GETDATE())
            `
        } else {
            insertQuery = `
                INSERT INTO pms.tasks (id, task_code, story_id, title, description, task_type, assignee_id, reviewer_id, priority, estimated_hours, due_date, created_by, status, is_active, created_at, updated_at)
                OUTPUT INSERTED.id, INSERTED.task_code
                VALUES (@id, @taskCode, @storyId, @title, @description, @taskType, @assigneeId, @reviewerId, @priority, @estimatedHours, @dueDate, @createdBy, 'todo', 1, GETDATE(), GETDATE())
            `
        }

        const result = await request.query(insertQuery)

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

        // Save attachments if provided
        if (data.attachments && data.attachments.length > 0) {
            // Check if attachments column exists
            const attachmentsColumnCheck = await pool.request().query(`
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
                AND COLUMN_NAME = 'attachments'
            `)
            if (attachmentsColumnCheck.recordset.length > 0) {
                // Move files from `tasks/temp-*` into the permanent `tasks/{task_code}` folder.
                const finalAttachments = await relocateTaskAttachments(data.attachments, taskCode)
                await pool.request()
                    .input('taskId', sql.UniqueIdentifier, taskId)
                    .input('attachments', sql.NVarChar, JSON.stringify(finalAttachments))
                    .query(`UPDATE pms.tasks SET attachments = @attachments WHERE id = @taskId`)
            }
        }

        // Revalidate
        const storyProjectResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .query(`SELECT project_id FROM pms.stories WHERE id = @storyId`)

        if (storyProjectResult.recordset[0]) {
            revalidatePath(`/projects/${storyProjectResult.recordset[0].project_id}`)
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
    is_count_for_kpi: boolean
}>) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check if task's milestone is locked
        const taskMilestoneResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT s.milestone_id
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.id = @taskId
            `)

        if (taskMilestoneResult.recordset.length > 0 && taskMilestoneResult.recordset[0].milestone_id) {
            const milestoneId = taskMilestoneResult.recordset[0].milestone_id
            const isLocked = await isMilestoneLocked(milestoneId)
            if (isLocked) {
                return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถแก้ไข Task ได้' }
            }
        }

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

        // Handle is_count_for_kpi if provided and column exists
        if (data.is_count_for_kpi !== undefined) {
            const kpiColumnCheck = await pool.request().query(`
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'tasks'
                AND COLUMN_NAME = 'is_count_for_kpi'
            `)
            if (kpiColumnCheck.recordset.length > 0) {
                updates.push('is_count_for_kpi = @isCountForKpi')
                request.input('isCountForKpi', sql.Bit, data.is_count_for_kpi ? 1 : 0)
            }
        }

        updates.push('updated_at = GETDATE()')

        await request.query(`UPDATE pms.tasks SET ${updates.join(', ')} WHERE id = @taskId`)

        // ====== Sync linked tracking entries when status / due_date / assignee changes ======
        // Tracking entries linked to this task (team_tracking_entries.task_id) mirror the task
        // on the daily grid. Keep them in sync so the grid stays accurate.
        if (data.status !== undefined || data.due_date !== undefined || data.assignee_id !== undefined) {
            const syncUpdates: string[] = []
            const syncReq = pool.request().input('taskId', sql.UniqueIdentifier, taskId)
            if (data.status !== undefined) {
                let trkStatus: 'PLANNED' | 'DONE' | 'POSTPONED' = 'PLANNED'
                if (data.status === 'done' || data.status === 'done_not_planned') trkStatus = 'DONE'
                else if (data.status === 'blocked') trkStatus = 'POSTPONED'
                syncUpdates.push('[status] = @trkStatus')
                syncReq.input('trkStatus', sql.NVarChar(20), trkStatus)
                if (trkStatus === 'DONE') syncUpdates.push('completed_date = GETDATE()')
                else syncUpdates.push('completed_date = NULL')
            }
            if (data.due_date !== undefined) {
                syncUpdates.push('entry_date = @trkDue')
                syncReq.input('trkDue', sql.Date, data.due_date ? new Date(data.due_date) : null)
            }
            if (data.assignee_id !== undefined) {
                syncUpdates.push('assignee_id = @trkAssignee')
                syncReq.input('trkAssignee', sql.UniqueIdentifier, data.assignee_id || null)
            }
            syncUpdates.push('updated_at = GETDATE()')
            await syncReq.query(`
                UPDATE pms.team_tracking_entries
                SET ${syncUpdates.join(', ')}
                WHERE task_id = @taskId AND is_active = 1
            `)
        }

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

        // Soft-delete the task
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`UPDATE pms.tasks SET [is_active] = 0, updated_at = GETDATE() WHERE id = @taskId`)

        // Cascade: also soft-delete tracking entries linked to this task.
        // This keeps /projects/gantt-overview daily grid in sync — deleting a task
        // from /my-projects, /projects/resource-planning, or any other surface that
        // calls deleteTask will remove the mirrored activity from the daily grid.
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`UPDATE pms.team_tracking_entries SET is_active = 0, updated_at = GETDATE() WHERE task_id = @taskId AND is_active = 1`)

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

// ============================================
// CASCADE RESCHEDULING ENGINE
// ============================================

/**
 * Update task start and due dates and cascade the rescheduling to all downstream successor tasks in a single database transaction.
 */
export async function updateTaskDateWithCascade(
    taskId: string,
    newDueDateStr: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // 1. Check if the task's milestone is locked
        const taskMilestoneResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
                SELECT s.milestone_id, s.project_id
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE t.id = @taskId
            `)

        if (taskMilestoneResult.recordset.length > 0 && taskMilestoneResult.recordset[0].milestone_id) {
            const milestoneId = taskMilestoneResult.recordset[0].milestone_id
            const isLocked = await isMilestoneLocked(milestoneId)
            if (isLocked) {
                return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถแก้ไข Task ได้' }
            }
        }

        const projectId = taskMilestoneResult.recordset[0]?.project_id
        if (!projectId) {
            return { success: false, error: 'Task or project not found' }
        }

        // 2. Fetch all project active tasks and dependencies for simulation
        const tasksRes = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT t.id, t.title, t.start_date, t.due_date, t.status, s.milestone_id
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE s.project_id = @projectId AND t.is_active = 1 AND t.status <> 'cancelled'
            `)

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

        const targetTask = taskMap.get(taskId)
        if (!targetTask) {
            return { success: false, error: 'Target task not found in project' }
        }

        const simDueDate = new Date(newDueDateStr)
        simDueDate.setHours(0, 0, 0, 0)
        
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
        const visitedCount = new Map<string, number>()

        while (queue.length > 0) {
            const currId = queue.shift()!
            visitedCount.set(currId, (visitedCount.get(currId) || 0) + 1)
            if (visitedCount.get(currId)! > allTasks.length) {
                throw new Error('ตรวจพบความสัมพันธ์วงกลมในฐานข้อมูลระหว่างคำนวณ')
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
                    // Rule: Do not shift successor tasks that are already completed
                    if (succTask.status === 'done' || succTask.status === 'closed') {
                        continue
                    }

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

        // 3. Update all shifted tasks in a single database transaction
        const transaction = new sql.Transaction(pool)
        try {
            await transaction.begin()

            for (const [id, t] of taskMap.entries()) {
                const origDue = t.orig_due ? t.orig_due.getTime() : null
                const simDue = t.sim_due ? t.sim_due.getTime() : null
                const origStart = t.orig_start ? t.orig_start.getTime() : null
                const simStart = t.sim_start ? t.sim_start.getTime() : null

                // Check if dates actually changed
                if (id === taskId || (simDue && origDue && simDue !== origDue) || (simStart && origStart && simStart !== origStart)) {
                    const req = new sql.Request(transaction)
                        .input('id', sql.UniqueIdentifier, id)
                        .input('startDate', sql.Date, t.sim_start)
                        .input('dueDate', sql.Date, t.sim_due)

                    await req.query(`
                        UPDATE pms.tasks 
                        SET start_date = @startDate, due_date = @dueDate, updated_at = GETDATE() 
                        WHERE id = @id
                    `)
                }
            }

            await transaction.commit()
        } catch (txErr: any) {
            try { await transaction.rollback() } catch { /* noop */ }
            throw txErr
        }

        // 4. Revalidate project path
        revalidatePath(`/projects/${projectId}`)
        revalidatePath(`/resource-planning`)

        return { success: true }
    } catch (error: any) {
        console.error('updateTaskDateWithCascade error:', error)
        return { success: false, error: error.message }
    }
}

