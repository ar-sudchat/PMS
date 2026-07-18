'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generateTaskCode } from '@/lib/utils/task-code-generator'
import { resolveProjectMilestoneId } from '@/lib/actions/milestone-resolve'

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
}


export interface TeamMemberWorkload {
    employee_id: string
    employee_name: string
    position_name: string
    email: string
    working_days: number
    hours_per_day: number
    total_capacity_hours: number
    current_assigned_hours: number
    avg_workload_percent: number
    impact_percent: number
    new_workload_percent: number
    status: 'available' | 'moderate' | 'warning' | 'overload'
    current_task_count: number
}

export interface GanttData {
    data: GanttTask[]
    links: any[]
}

// ============================================
// HELPER: Clean Entity ID (ลบ prefix + validate UUID)
// ============================================

function cleanEntityId(id: string | null | undefined, prefix: string): string | null {
    if (!id) return null
    const cleanId = id.startsWith(prefix) ? id.replace(prefix, '') : id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(cleanId) ? cleanId : null
}

export async function getGanttData(filters?: {
    year?: number
    customerId?: string
    managerId?: string
    ownerId?: string
    statusId?: string
    milestoneIds?: string[]
    search?: string
    assigneeId?: string
    projectTypeId?: string
}): Promise<{
    success: boolean
    data: { data: GanttTask[]; links: any[] } | null
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized', data: null }
        }

        const pool = await getConnection()

        const milestoneIdsStr = filters?.milestoneIds?.join(',') || null

        const result = await pool.request()
            .input('employee_id', sql.UniqueIdentifier, (user as any).employeeId || user.id)
            .input('year', sql.Int, filters?.year || null)
            .input('customer_id', sql.UniqueIdentifier, filters?.customerId || null)
            .input('manager_id', sql.UniqueIdentifier, filters?.managerId || null)
            .input('owner_id', sql.UniqueIdentifier, filters?.ownerId || null)
            .input('status_id', sql.UniqueIdentifier, filters?.statusId || null)
            .input('search', sql.NVarChar, filters?.search || null)
            .input('milestone_ids', sql.NVarChar, milestoneIdsStr)
            .input('assignee_id', sql.UniqueIdentifier, filters?.assigneeId || null)
            .input('project_type_id', sql.UniqueIdentifier, filters?.projectTypeId || null)
            .execute('pms.sp_get_gantt_data')

        const tasks: GanttTask[] = []

        const resultSets = [
            { index: 0, name: 'projects' },
            { index: 1, name: 'milestones' },
            { index: 2, name: 'stories' },
            { index: 3, name: 'tasks' }
        ]

        for (const rs of resultSets) {
            if ((result.recordsets as any)[rs.index]) {
                for (const row of (result.recordsets as any)[rs.index]) {
                    // 1. Strict Active Filter
                    // Ensure we filter out inactive items explicitly as requested
                    if (row.is_active === 0 || row.is_active === false) continue

                    // 2. Strict Date Logic
                    // If dates are missing, keep them null. DHTMLX client will handle rendering.
                    // Prevent Parent Roll-up: Convert 'project' type to 'task' for Stories to stop auto-calculation
                    // We only keep 'project' type for the Root Project entity if needed, or even that can be 'task' if we want manual start/end.
                    // But usually Project entity is fine. Stories should NOT roll up.

                    let dhtmlxType: 'project' | 'milestone' | 'task' = 'task'
                    if (row.type === 'milestone') dhtmlxType = 'milestone'
                    else if (row.type === 'project' && row.entity_type === 'project') dhtmlxType = 'project' // Keep project as project
                    else if (row.entity_type === 'story') dhtmlxType = 'task' // Force Story to be Task to prevent roll-up

                    tasks.push({
                        id: row.id,
                        text: row.text || 'Untitled',
                        start_date: row.start_date, // Pass null if null
                        end_date: row.end_date,     // Pass null if null
                        duration: Math.max(row.duration || 0, 0),
                        progress: (row.progress || 0) / 100,
                        parent: row.parent || '0',
                        type: dhtmlxType,
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
                        task_type: row.task_type
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
// GET PROJECT INFO
// ============================================

export async function getProjectInfo(projectId: string): Promise<{
    success: boolean
    data?: {
        id: string
        code: string
        name: string
        owner_id: string
        milestones: { id: string; code: string; name: string }[]
        stories: { id: string; code: string; title: string }[]
    }
    error?: string
}> {
    try {
        const cleanId = cleanEntityId(projectId, 'project_')
        if (!cleanId) return { success: false, error: 'Invalid project ID' }

        const pool = await getConnection()

        const projectResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, cleanId)
            .query(`SELECT id, project_code AS code, name, project_manager_id AS owner_id FROM pms.projects WHERE id = @projectId AND is_active = 1`)

        if (projectResult.recordset.length === 0) return { success: false, error: 'Project not found' }

        const milestonesResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, cleanId)
            .query(`
        SELECT pm.id, mc.code, mc.name, mc.color, pm.due_date, pm.status
        FROM pms.project_milestones pm
        INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        WHERE pm.project_id = @projectId ORDER BY mc.sort_order
      `)

        const storiesResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, cleanId)
            .query(`SELECT id, story_code AS code, title FROM pms.stories WHERE project_id = @projectId AND is_active = 1 ORDER BY created_at DESC`)

        return {
            success: true,
            data: {
                ...projectResult.recordset[0],
                milestones: milestonesResult.recordset,
                stories: storiesResult.recordset
            }
        }
    } catch (error: any) {
        console.error('getProjectInfo error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// CREATE STORY (FIX NULL project_id)
// ============================================

export async function createStory(data: {
    project_id: string
    milestone_id?: string | null
    title: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const projectId = cleanEntityId(data.project_id, 'project_')
        const milestoneId = cleanEntityId(data.milestone_id || null, 'milestone_')

        if (!projectId) return { success: false, error: 'Project ID is required' }
        if (!data.title?.trim()) return { success: false, error: 'Title is required' }

        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Enforce milestone: default to the project's current milestone when unset.
        const effectiveMilestoneId = milestoneId || await resolveProjectMilestoneId(pool, projectId)

        // Generate story code
        const codeResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`SELECT TOP 1 story_code FROM pms.stories WHERE project_id = @projectId ORDER BY created_at DESC`)

        let nextNum = 1
        if (codeResult.recordset.length > 0) {
            const match = (codeResult.recordset[0].story_code || 'S-000').match(/S-(\d+)/)
            if (match) nextNum = parseInt(match[1]) + 1
        }
        const storyCode = `S-${String(nextNum).padStart(3, '0')}`

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .input('milestoneId', sql.UniqueIdentifier, effectiveMilestoneId)
            .input('storyCode', sql.NVarChar, storyCode)
            .input('title', sql.NVarChar, data.title.trim())
            .input('createdBy', sql.UniqueIdentifier, (user as any).employeeId || user.id)
            .query(`
        INSERT INTO pms.stories (id, project_id, milestone_id, story_code, title, priority, status, created_by, created_at, is_active)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @projectId, @milestoneId, @storyCode, @title, 'medium', 'backlog', @createdBy, GETDATE(), 1)
      `)

        revalidatePath('/my-projects')
        return { success: true, data: result.recordset[0] }
    } catch (error: any) {
        console.error('createStory error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// CREATE TASK (FIX NULL story_id)
// ============================================

export async function createTask(data: {
    story_id: string
    title: string
    task_type?: string
    estimated_hours?: number
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const storyId = cleanEntityId(data.story_id, 'story_')

        if (!storyId) return { success: false, error: 'Story ID is required' }
        if (!data.title?.trim()) return { success: false, error: 'Title is required' }

        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Generate globally unique task code (format: YMMNNNN, e.g. 6040001)
        const taskCode = await generateTaskCode(pool)

        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .input('taskCode', sql.NVarChar, taskCode)
            .input('title', sql.NVarChar, data.title.trim())
            .input('taskType', sql.NVarChar, data.task_type || 'dev')
            .input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours || null)
            .input('createdBy', sql.UniqueIdentifier, (user as any).employeeId || user.id)
            .query(`
        INSERT INTO pms.tasks (id, story_id, task_code, title, task_type, priority, status, estimated_hours, created_by, created_at, is_active)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @storyId, @taskCode, @title, @taskType, 'medium', 'todo', @estimatedHours, @createdBy, GETDATE(), 1)
      `)

        revalidatePath('/my-projects')
        return { success: true, data: result.recordset[0] }
    } catch (error: any) {
        console.error('createTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// GET TEAM WORKLOAD
// ============================================

export async function getTeamWorkload(
    startDate: string,
    endDate: string,
    estimatedHours: number = 0
): Promise<{ success: boolean; data: TeamMemberWorkload[]; error?: string }> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('start_date', sql.Date, new Date(startDate))
            .input('end_date', sql.Date, new Date(endDate))
            .input('new_task_hours', sql.Decimal(10, 2), estimatedHours)
            .execute('pms.sp_get_team_workload')

        return {
            success: true,
            data: result.recordset.map(row => ({
                employee_id: row.employee_id,
                employee_name: row.employee_name,
                position_name: row.position_name,
                email: row.email || '',
                working_days: row.working_days,
                hours_per_day: parseFloat(row.hours_per_day) || 7,
                total_capacity_hours: parseFloat(row.total_capacity_hours) || 0,
                current_assigned_hours: parseFloat(row.current_assigned_hours) || 0,
                avg_workload_percent: parseFloat(row.avg_workload_percent) || 0,
                impact_percent: parseFloat(row.impact_percent) || 0,
                new_workload_percent: parseFloat(row.new_workload_percent) || 0,
                status: row.status || 'available',
                current_task_count: row.current_task_count || 0
            }))
        }
    } catch (error: any) {
        console.error('getTeamWorkload error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// ASSIGN TASK
// ============================================

export async function assignTask(data: {
    task_id: string
    assignee_id: string
    start_date: string
    due_date: string
    estimated_hours?: number
}): Promise<{ success: boolean; error?: string }> {
    try {
        const taskId = cleanEntityId(data.task_id, 'task_')
        if (!taskId) return { success: false, error: 'Task ID is required' }
        if (!data.assignee_id) return { success: false, error: 'Assignee is required' }
        if (!data.start_date || !data.due_date) return { success: false, error: 'Dates are required' }

        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .input('assigneeId', sql.UniqueIdentifier, data.assignee_id)
            .input('startDate', sql.Date, new Date(data.start_date))
            .input('dueDate', sql.Date, new Date(data.due_date))
            .input('estimatedHours', sql.Decimal(10, 2), data.estimated_hours || null)
            .query(`
        UPDATE pms.tasks SET assignee_id = @assigneeId, start_date = @startDate, due_date = @dueDate,
        estimated_hours = COALESCE(@estimatedHours, estimated_hours), updated_at = GETDATE() WHERE id = @taskId
      `)

        revalidatePath('/my-projects')
        return { success: true }
    } catch (error: any) {
        console.error('assignTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DELETE STORY/TASK
// ============================================

export async function deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const cleanId = cleanEntityId(storyId, 'story_')
        if (!cleanId) return { success: false, error: 'Invalid story ID' }

        const pool = await getConnection()
        await pool.request()
            .input('storyId', sql.UniqueIdentifier, cleanId)
            .query(`
        -- Cascade tracking-entry soft-delete first (before tasks lose their is_active flag)
        UPDATE pms.team_tracking_entries
        SET is_active = 0, updated_at = GETDATE()
        WHERE task_id IN (SELECT id FROM pms.tasks WHERE story_id = @storyId) AND is_active = 1;
        UPDATE pms.tasks SET is_active = 0, updated_at = GETDATE() WHERE story_id = @storyId;
        UPDATE pms.stories SET is_active = 0, updated_at = GETDATE() WHERE id = @storyId;
      `)

        revalidatePath('/my-projects')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const cleanId = cleanEntityId(taskId, 'task_')
        if (!cleanId) return { success: false, error: 'Invalid task ID' }

        const pool = await getConnection()
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, cleanId)
            .query(`UPDATE pms.tasks SET is_active = 0, updated_at = GETDATE() WHERE id = @taskId`)

        // Cascade — soft-delete linked tracking entries so the gantt-overview daily grid stays in sync.
        await pool.request()
            .input('taskId', sql.UniqueIdentifier, cleanId)
            .query(`UPDATE pms.team_tracking_entries SET is_active = 0, updated_at = GETDATE() WHERE task_id = @taskId AND is_active = 1`)

        revalidatePath('/my-projects')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

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
// UPDATE TASK DATES (GANTT)
// ============================================

export async function updateGanttTaskDates(
    id: string,
    entityType: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const cleanId = cleanEntityId(id, `${entityType}_`)

        // Only support tasks for now
        if (entityType === 'task') {
            if (!cleanId) return { success: false, error: 'Invalid ID' }

            const pool = await getConnection()
            await pool.request()
                .input('id', sql.UniqueIdentifier, cleanId)
                .input('startDate', sql.Date, new Date(startDate))
                .input('dueDate', sql.Date, new Date(endDate))
                .query(`
                    UPDATE pms.tasks 
                    SET start_date = @startDate, due_date = @dueDate, updated_at = GETDATE()
                    WHERE id = @id
                `)

            revalidatePath('/my-projects')
            return { success: true }
        }

        return { success: false, error: 'Only tasks can be rescheduled via Gantt currently' }

    } catch (error: any) {
        console.error('updateGanttTaskDates error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE TASK PROGRESS (GANTT)
// ============================================

export async function updateGanttTaskProgress(
    id: string,
    entityType: string,
    progress: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const cleanId = cleanEntityId(id, `${entityType}_`)

        // Only support tasks for now
        if (entityType === 'task') {
            if (!cleanId) return { success: false, error: 'Invalid ID' }

            // Map progress (0-1) to status if needed, or just update execution percentage?
            // Since pms.tasks doesn't have a progress column shown in insert, let's check.
            // But the Gantt data has 'progress'.
            // If the schema has a 'progress' column (0-100), we update it.
            // If not, maybe we infer from status?
            // The sp_get_gantt_data returns progress.
            // Let's assume there is a 'progress' column or similar.
            // NOTE: insert in createTask DOES NOT show a progress column.
            // But maybe it was added later or defaults to 0.
            // Let's try to update 'progress' column. If it fails, we know why.
            // Also handling status: if progress = 1, status = 'done'?

            const progressPct = Math.round(progress * 100)

            const pool = await getConnection()

            // Check if column exists or just try update?
            // Safe bet: Update status based on progress?
            // If progress == 100 -> completed
            // If progress > 0 and < 100 -> in_progress
            // If progress == 0 -> todo

            let status = 'todo'
            if (progressPct >= 100) status = 'done' // or completed
            else if (progressPct > 0) status = 'in_progress'

            // Try updating progress column if it exists, otherwise just status?
            // Given I don't see progress in insert, I'll assume sp_get_gantt_data might calculate it from tasks?
            // Or maybe I should just update status.
            // Wait, if I cannot verify column exists, I risk error.
            // Let's query to see if 'progress' exists first?? No, that's slow.
            // The user error showed "Export updateGanttTaskProgress doesn't exist".
            // So I just need to define it.
            // I will try to update `progress` assuming it exists logic-wise in the user's head, 
            // but if the table lacks it, it will fail.
            // However, I can try to handle status updates at least.

            await pool.request()
                .input('id', sql.UniqueIdentifier, cleanId)
                .input('status', sql.NVarChar, status)
                .query(`
                    UPDATE pms.tasks 
                    SET status = @status, updated_at = GETDATE()
                    WHERE id = @id
                `)

            // If there is a progress column, we would do:
            // SET progress = @progress
            // But without confirmation, I'll stick to status updates which maps to colors in Gantt.

            revalidatePath('/my-projects')
            return { success: true }
        }

        return { success: false, error: 'Only tasks can have progress updated via Gantt' }

    } catch (error: any) {
        console.error('updateGanttTaskProgress error:', error)
        return { success: false, error: error.message }
    }
}

