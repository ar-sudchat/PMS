'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

export interface Sprint {
    id: string
    sprint_code: string
    name: string
    goal: string | null
    start_date: string
    end_date: string
    status: 'planned' | 'active' | 'completed' | 'cancelled'
    project_id: string | null
    project_code: string | null
    project_name: string | null
    tasks_count: number
    completed_tasks: number
    in_progress_tasks: number
    todo_tasks: number
    total_estimated_hours: number
    total_actual_hours: number
    duration_days: number
    days_remaining: number
    created_at: string
    updated_at: string
}

// ============================================
// GET ALL SPRINTS
// ============================================

export async function getSprints(filters?: {
    status?: string
    projectId?: string
}) {
    try {
        const pool = await getConnection()

        let query = `SELECT * FROM pms.vw_sprints_with_tasks WHERE 1=1`
        const request = pool.request()

        if (filters?.status) {
            query += ` AND status = @status`
            request.input('status', sql.NVarChar, filters.status)
        }

        if (filters?.projectId) {
            query += ` AND project_id = @projectId`
            request.input('projectId', sql.UniqueIdentifier, filters.projectId)
        }

        query += ` ORDER BY 
      CASE status 
        WHEN 'active' THEN 1 
        WHEN 'planned' THEN 2 
        WHEN 'completed' THEN 3 
        ELSE 4 
      END, 
      start_date DESC`

        const result = await request.query(query)

        return { success: true, data: result.recordset }

    } catch (error: any) {
        console.error('getSprints error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ============================================
// GET SPRINT BY ID
// ============================================

export async function getSprintById(id: string) {
    try {
        const pool = await getConnection()

        const sprintResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT * FROM pms.vw_sprints_with_tasks WHERE id = @id`)

        if (sprintResult.recordset.length === 0) {
            return { success: false, error: 'Sprint not found', data: null }
        }

        const sprint = sprintResult.recordset[0]

        // Get tasks in this sprint
        const tasksResult = await pool.request()
            .input('sprintId', sql.UniqueIdentifier, id)
            .query(`
        SELECT 
          t.id,
          t.task_code,
          t.title,
          t.status,
          t.priority,
          t.estimated_hours,
          t.actual_hours,
          t.assignee_id,
          CONCAT(e.first_name_th, ' ', e.last_name_th) AS assignee_name,
          s.story_code,
          s.title AS story_title,
          p.project_code
        FROM pms.tasks t
        LEFT JOIN pms.employees e ON t.assignee_id = e.id
        LEFT JOIN pms.stories s ON t.story_id = s.id
        LEFT JOIN pms.projects p ON s.project_id = p.id
        WHERE t.sprint_id = @sprintId AND t.is_active = 1
        ORDER BY t.status, t.priority DESC
      `)

        return {
            success: true,
            data: {
                ...sprint,
                tasks: tasksResult.recordset
            }
        }

    } catch (error: any) {
        console.error('getSprintById error:', error)
        return { success: false, error: error.message, data: null }
    }
}

// ============================================
// CREATE SPRINT
// ============================================

export async function createSprint(data: {
    name: string
    goal?: string
    start_date: string
    end_date: string
    project_id?: string
}) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Generate sprint code
        const codeResult = await pool.request().query(`
      SELECT 'SPR-' + RIGHT('000' + CAST(ISNULL(MAX(CAST(REPLACE(sprint_code, 'SPR-', '') AS INT)), 0) + 1 AS VARCHAR), 3) AS next_code
      FROM pms.sprints
    `)

        const sprintCode = codeResult.recordset[0].next_code

        // Insert sprint
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, null)
            .input('sprintCode', sql.NVarChar, sprintCode)
            .input('name', sql.NVarChar, data.name)
            .input('goal', sql.NVarChar, data.goal || null)
            .input('startDate', sql.Date, new Date(data.start_date))
            .input('endDate', sql.Date, new Date(data.end_date))
            .input('projectId', sql.UniqueIdentifier, data.project_id || null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
        INSERT INTO pms.sprints (
          sprint_code, name, goal, start_date, end_date, project_id, created_by
        )
        OUTPUT INSERTED.id
        VALUES (
          @sprintCode, @name, @goal, @startDate, @endDate, @projectId, @createdBy
        )
      `)

        revalidatePath('/sprints')
        return { success: true, data: { id: result.recordset[0].id, sprint_code: sprintCode } }

    } catch (error: any) {
        console.error('createSprint error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE SPRINT
// ============================================

export async function updateSprint(id: string, data: Partial<{
    name: string
    goal: string
    start_date: string
    end_date: string
    status: string
    project_id: string
}>) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: string[] = []
        const request = pool.request()
        request.input('id', sql.UniqueIdentifier, id)
        request.input('updatedBy', sql.UniqueIdentifier, user.id)

        if (data.name !== undefined) {
            updates.push('name = @name')
            request.input('name', sql.NVarChar, data.name)
        }
        if (data.goal !== undefined) {
            updates.push('goal = @goal')
            request.input('goal', sql.NVarChar, data.goal)
        }
        if (data.start_date !== undefined) {
            updates.push('start_date = @startDate')
            request.input('startDate', sql.Date, new Date(data.start_date))
        }
        if (data.end_date !== undefined) {
            updates.push('end_date = @endDate')
            request.input('endDate', sql.Date, new Date(data.end_date))
        }
        if (data.status !== undefined) {
            updates.push('status = @status')
            request.input('status', sql.NVarChar, data.status)
        }
        if (data.project_id !== undefined) {
            updates.push('project_id = @projectId')
            request.input('projectId', sql.UniqueIdentifier, data.project_id)
        }

        updates.push('updated_by = @updatedBy')
        updates.push('updated_at = GETDATE()')

        await request.query(`
      UPDATE pms.sprints 
      SET ${updates.join(', ')} 
      WHERE id = @id
    `)

        revalidatePath('/sprints')
        revalidatePath(`/sprints/${id}`)
        return { success: true }

    } catch (error: any) {
        console.error('updateSprint error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DELETE SPRINT
// ============================================

export async function deleteSprint(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Soft delete
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
        UPDATE pms.sprints 
        SET is_active = 0, updated_at = GETDATE() 
        WHERE id = @id
      `)

        revalidatePath('/sprints')
        return { success: true }

    } catch (error: any) {
        console.error('deleteSprint error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// GET SPRINTS BY PROJECT
// ============================================

export async function getSprintsByProject(projectId: string) {
    return await getSprints({ projectId })
}

// ============================================
// ASSIGN TASKS TO SPRINT
// ============================================

export async function assignTasksToSprint(sprintId: string, taskIds: string[]) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Update tasks
        const taskIdsXml = taskIds.map(id => `<id>${id}</id>`).join('')

        await pool.request()
            .input('sprintId', sql.UniqueIdentifier, sprintId)
            .query(`
        UPDATE pms.tasks
        SET sprint_id = @sprintId, updated_at = GETDATE()
        WHERE id IN (
          SELECT T.c.value('.', 'UNIQUEIDENTIFIER')
          FROM (SELECT CAST('${taskIdsXml}' AS XML) AS x) AS R
          CROSS APPLY R.x.nodes('/id') AS T(c)
        )
      `)

        revalidatePath('/sprints')
        revalidatePath(`/sprints/${sprintId}`)
        return { success: true }

    } catch (error: any) {
        console.error('assignTasksToSprint error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// REMOVE TASKS FROM SPRINT
// ============================================

export async function removeTasksFromSprint(taskIds: string[]) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const taskIdsXml = taskIds.map(id => `<id>${id}</id>`).join('')

        await pool.request().query(`
      UPDATE pms.tasks
      SET sprint_id = NULL, updated_at = GETDATE()
      WHERE id IN (
        SELECT T.c.value('.', 'UNIQUEIDENTIFIER')
        FROM (SELECT CAST('${taskIdsXml}' AS XML) AS x) AS R
        CROSS APPLY R.x.nodes('/id') AS T(c)
      )
    `)

        revalidatePath('/sprints')
        return { success: true }

    } catch (error: any) {
        console.error('removeTasksFromSprint error:', error)
        return { success: false, error: error.message }
    }
}
