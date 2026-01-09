'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface GanttTask {
    id: string
    text: string
    start_date: string
    end_date: string
    duration: number
    progress: number
    parent: string
    type: 'project' | 'milestone' | 'task'
    entity_type: 'project' | 'milestone' | 'story' | 'task'
    entity_id: string
    project_id: string
    milestone_id: string | null
    story_id: string | null
    color: string
    assignee_id: string | null
    assignee_name: string | null
    open: boolean
    status: string
    estimated_hours?: number
    task_type?: string
    priority?: string
    is_overdue?: boolean
}

export interface GanttData {
    data: GanttTask[]
    links: { id: string; source: string; target: string; type: string }[]
}

// ============================================
// GET GANTT DATA
// ============================================

export async function getGanttData(): Promise<{
    success: boolean
    data: GanttData | null
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()

        // Call stored procedure
        const result = await pool.request()
            .input('employee_id', sql.UniqueIdentifier, user.employeeId || user.id)
            .execute('pms.sp_get_gantt_data')

        const tasks: GanttTask[] = []

        // Process all 4 result sets
        const resultSets = [
            { index: 0, name: 'projects' },
            { index: 1, name: 'milestones' },
            { index: 2, name: 'stories' },
            { index: 3, name: 'tasks' }
        ]

        for (const rs of resultSets) {
            if (result.recordsets[rs.index]) {
                for (const row of result.recordsets[rs.index]) {
                    tasks.push({
                        id: row.id,
                        text: row.text || 'Untitled',
                        start_date: row.start_date,
                        end_date: row.end_date,
                        duration: Math.max(row.duration || 0, 0),
                        progress: (row.progress || 0) / 100, // Convert to 0-1 range
                        parent: row.parent || '0',
                        type: row.type === 'milestone' ? 'milestone' : (row.type === 'task' ? 'task' : 'project'),
                        entity_type: row.entity_type,
                        entity_id: row.entity_id,
                        project_id: row.project_id,
                        milestone_id: row.milestone_id || null,
                        story_id: row.story_id || null,
                        color: row.color || '#3b82f6',
                        assignee_id: row.assignee_id || null,
                        assignee_name: row.assignee_name || null,
                        open: row.open === 1,
                        status: row.status || '',
                        estimated_hours: row.estimated_hours,
                        task_type: row.task_type,
                        priority: row.priority,
                        is_overdue: row.is_overdue === 1
                    })
                }
            }
        }

        return {
            success: true,
            data: {
                data: tasks,
                links: []
            }
        }

    } catch (error: any) {
        console.error('getGanttData error:', error)
        return { success: false, error: error.message, data: null }
    }
}
// ============================================
// WRAPPER FUNCTIONS (For Backward Compatibility)
// ============================================

export async function getMyProjectsGanttData() {
    return getGanttData()
}

export async function getProjectGanttData(projectId: string): Promise<{
    success: boolean
    data: GanttData | null
    error?: string
}> {
    // Reuse the main function but filter for specific project
    // ideally we should have a specific SP or param, but this works for now
    const result = await getGanttData()

    if (!result.success || !result.data) return result

    // Filter tasks for this project
    const projectTasks = result.data.data.filter(t => t.project_id === projectId)

    return {
        success: true,
        data: {
            data: projectTasks,
            links: []
        }
    }
}

// ============================================
// UPDATE TASK DATES (Drag & Drop)
// ============================================

export async function updateGanttTaskDates(
    ganttId: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const [entityType, entityId] = ganttId.split('_')

        switch (entityType) {
            case 'task':
                await pool.request()
                    .input('id', sql.UniqueIdentifier, entityId)
                    .input('startDate', sql.Date, new Date(startDate))
                    .input('dueDate', sql.Date, new Date(endDate))
                    .query(`
            UPDATE pms.tasks 
            SET start_date = @startDate, 
                due_date = @dueDate, 
                updated_at = GETDATE()
            WHERE id = @id
          `)
                break

            case 'story':
                await pool.request()
                    .input('id', sql.UniqueIdentifier, entityId)
                    .input('startDate', sql.Date, new Date(startDate))
                    .input('dueDate', sql.Date, new Date(endDate))
                    .query(`
            UPDATE pms.stories 
            SET start_date = @startDate, 
                due_date = @dueDate, 
                updated_at = GETDATE()
            WHERE id = @id
          `)
                break

            case 'milestone':
                await pool.request()
                    .input('id', sql.UniqueIdentifier, entityId)
                    .input('dueDate', sql.Date, new Date(endDate))
                    .query(`
            UPDATE pms.project_milestones 
            SET due_date = @dueDate, 
                updated_at = GETDATE()
            WHERE id = @id
          `)
                break

            case 'project':
                // Projects don't have start_date column apparently based on recent debugging.
                // We should only update warranty_end_date if available?
                // Or strictly updated columns that EXIST.
                // Debug showed: no start_date. only warranty_end_date.
                // So we might skip updating project start via drag for now, or use another field?
                // Assuming we can fix projects table later. For now let's comment out start_date update or use separate try/catch.

                // Actually, let's just update warranty_end_date.
                await pool.request()
                    .input('id', sql.UniqueIdentifier, entityId)
                    //.input('startDate', sql.Date, new Date(startDate)) // Column invalid
                    .input('endDate', sql.Date, new Date(endDate))
                    .query(`
            UPDATE pms.projects 
            SET warranty_end_date = @endDate, 
                updated_at = GETDATE()
            WHERE id = @id
          `)
                break
        }

        revalidatePath('/my-projects')
        return { success: true }

    } catch (error: any) {
        console.error('updateGanttTaskDates error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE TASK PROGRESS
// ============================================

export async function updateGanttTaskProgress(
    ganttId: string,
    progress: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const [entityType, entityId] = ganttId.split('_')

        if (entityType === 'task') {
            // Map progress to status
            let status = 'todo'
            if (progress >= 1) status = 'done'
            else if (progress >= 0.8) status = 'review'
            else if (progress > 0) status = 'in_progress'

            await pool.request()
                .input('id', sql.UniqueIdentifier, entityId)
                .input('status', sql.NVarChar, status)
                .query(`
          UPDATE pms.tasks 
          SET status = @status,
              completed_date = CASE WHEN @status = 'done' THEN GETDATE() ELSE NULL END,
              updated_at = GETDATE()
          WHERE id = @id
        `)
        }

        revalidatePath('/my-projects')
        return { success: true }

    } catch (error: any) {
        console.error('updateGanttTaskProgress error:', error)
        return { success: false, error: error.message }
    }
}

// Helper function to clean ID
function cleanEntityId(id: string, prefix: string): string {
    if (!id) return ''
    return id.startsWith(prefix) ? id.replace(prefix, '') : id
}

// ============================================
// CREATE STORY
// ============================================

export async function createStory(data: {
    project_id: string
    milestone_id?: string
    title: string
    description?: string
    priority?: string
    start_date?: string
    due_date?: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const projectId = cleanEntityId(data.project_id, 'project_')

        const pool = await getConnection()

        // Generate story code
        const codeResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT TOP 1 story_code 
        FROM pms.stories 
        WHERE project_id = @projectId 
        ORDER BY created_at DESC
      `)

        let nextNum = 1
        if (codeResult.recordset.length > 0) {
            const lastCode = codeResult.recordset[0].story_code || 'S-000'
            const match = lastCode.match(/S-(\d+)/)
            if (match) nextNum = parseInt(match[1]) + 1
        }
        const storyCode = `S-${String(nextNum).padStart(3, '0')}`

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('milestoneId', sql.UniqueIdentifier, data.milestone_id || null)
            .input('storyCode', sql.NVarChar, storyCode)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('priority', sql.NVarChar, data.priority || 'medium')
            .input('startDate', sql.Date, data.start_date ? new Date(data.start_date) : null)
            .input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
            .input('createdBy', sql.UniqueIdentifier, user.employeeId || user.id)
            .query(`
        INSERT INTO pms.stories (
          id, project_id, milestone_id, story_code, title, description,
          priority, status, start_date, due_date, created_by, created_at, is_active
        )
        OUTPUT INSERTED.*
        VALUES (
          NEWID(), @projectId, @milestoneId, @storyCode, @title, @description,
          @priority, 'backlog', @startDate, @dueDate, @createdBy, GETDATE(), 1
        )
      `)

        revalidatePath('/my-projects')
        return { success: true, data: result.recordset[0] }

    } catch (error: any) {
        console.error('createStory error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// CREATE TASK
// ============================================

export async function createTask(data: {
    story_id: string
    title: string
    description?: string
    task_type?: string
    priority?: string
    assignee_id?: string
    estimated_hours?: number
    start_date?: string
    due_date?: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        // Validate story_id
        if (!data.story_id) {
            return { success: false, error: 'Story ID is required' }
        }

        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storyId = cleanEntityId(data.story_id, 'story_')

        const pool = await getConnection()

        // Generate task code
        const codeResult = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .query(`
        SELECT TOP 1 task_code 
        FROM pms.tasks 
        WHERE story_id = @storyId 
        ORDER BY created_at DESC
      `)

        let nextNum = 1
        if (codeResult.recordset.length > 0) {
            const lastCode = codeResult.recordset[0].task_code || 'T-000'
            const match = lastCode.match(/T-(\d+)/)
            if (match) nextNum = parseInt(match[1]) + 1
        }
        const taskCode = `T-${String(nextNum).padStart(3, '0')}`

        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, data.story_id)
            .input('taskCode', sql.NVarChar, taskCode)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('taskType', sql.NVarChar, data.task_type || 'dev')
            .input('priority', sql.NVarChar, data.priority || 'medium')
            .input('assigneeId', sql.UniqueIdentifier, data.assignee_id || null)
            .input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours || null)
            .input('startDate', sql.Date, data.start_date ? new Date(data.start_date) : null)
            .input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
            .input('createdBy', sql.UniqueIdentifier, user.employeeId || user.id)
            .query(`
        INSERT INTO pms.tasks (
          id, story_id, task_code, title, description, task_type,
          priority, status, assignee_id, estimated_hours, start_date, due_date,
          created_by, created_at, is_active
        )
        OUTPUT INSERTED.*
        VALUES (
          NEWID(), @storyId, @taskCode, @title, @description, @taskType,
          @priority, 'todo', @assigneeId, @estimatedHours, @startDate, @dueDate,
          @createdBy, GETDATE(), 1
        )
      `)

        revalidatePath('/my-projects')
        return { success: true, data: result.recordset[0] }

    } catch (error: any) {
        console.error('createTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE TASK ASSIGNEE
// ============================================

export async function updateTaskAssignee(
    taskId: string,
    assigneeId: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, taskId)
            .input('assigneeId', sql.UniqueIdentifier, assigneeId)
            .query(`
        UPDATE pms.tasks 
        SET assignee_id = @assigneeId, updated_at = GETDATE()
        WHERE id = @id
      `)

        revalidatePath('/my-projects')
        return { success: true }

    } catch (error: any) {
        console.error('updateTaskAssignee error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DELETE STORY (Soft)
// ============================================

export async function deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .query(`
        UPDATE pms.tasks SET is_active = 0, updated_at = GETDATE() WHERE story_id = @storyId;
        UPDATE pms.stories SET is_active = 0, updated_at = GETDATE() WHERE id = @storyId;
      `)

        revalidatePath('/my-projects')
        return { success: true }

    } catch (error: any) {
        console.error('deleteStory error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DELETE TASK (Soft)
// ============================================

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
        UPDATE pms.tasks SET is_active = 0, updated_at = GETDATE() WHERE id = @taskId
      `)

        revalidatePath('/my-projects')
        return { success: true }

    } catch (error: any) {
        console.error('deleteTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// GET MILESTONES FOR DROPDOWN
// ============================================

export async function getProjectMilestones(projectId: string): Promise<{
    success: boolean
    data: { id: string; code: string; name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT pm.id, mc.code, mc.name
        FROM pms.project_milestones pm
        INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        WHERE pm.project_id = @projectId
        ORDER BY mc.sort_order
      `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getProjectMilestones error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET TEAM MEMBERS FOR DROPDOWN
// ============================================

export async function getTeamMembers(): Promise<{
    success: boolean
    data: { id: string; name: string; position: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .query(`
        SELECT 
          e.id,
          COALESCE(e.nickname, e.first_name_th, e.first_name) AS name,
          COALESCE(p.name, '') AS position
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1
        ORDER BY name
      `)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getTeamMembers error:', error)
        return { success: false, error: error.message, data: [] }
    }
}
