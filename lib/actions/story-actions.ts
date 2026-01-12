'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { isMilestoneLocked } from './milestone-actions'

export interface Story {
  id: string
  project_id: string
  milestone_id: string | null
  story_code: string
  title: string
  title_th: string | null
  description: string | null
  acceptance_criteria: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'cancelled'
  estimated_md: number
  actual_md: number
  progress_percent: number
  start_date: string | null
  due_date: string | null
  completed_date: string | null
  depends_on_story_id: string | null
  sort_order: number
}

export interface StoryFilters {
  projectId: string
  milestoneId?: string
  status?: string
  priority?: string
  search?: string
}

export async function getStories(filters: StoryFilters) {
  try {
    const pool = await getConnection()

    let query = `
      SELECT 
        s.*,
        p.project_code,
        p.name AS project_name,
        mc.code AS milestone_code,
        mc.name AS milestone_name,
        mc.color AS milestone_color,
        (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) AS total_tasks,
        (SELECT COUNT(*) FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1 AND t.status = 'done') AS completed_tasks,
        (SELECT ISNULL(SUM(t.estimated_hours), 0) / 8 FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) AS calculated_estimated_md,
        (SELECT ISNULL(SUM(t.actual_hours), 0) / 8 FROM pms.tasks t WHERE t.story_id = s.id AND t.is_active = 1) AS calculated_actual_md
      FROM pms.stories s
      LEFT JOIN pms.projects p ON s.project_id = p.id
      LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
      LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
      WHERE s.is_active = 1 AND s.project_id = @projectId
    `

    const request = pool.request()
    request.input('projectId', sql.UniqueIdentifier, filters.projectId)

    if (filters.milestoneId) {
      query += ` AND s.milestone_id = @milestoneId`
      request.input('milestoneId', sql.UniqueIdentifier, filters.milestoneId)
    }

    if (filters.status) {
      query += ` AND s.status = @status`
      request.input('status', sql.NVarChar, filters.status)
    }

    if (filters.priority) {
      query += ` AND s.priority = @priority`
      request.input('priority', sql.NVarChar, filters.priority)
    }

    if (filters.search) {
      query += ` AND (s.title LIKE @search OR s.title_th LIKE @search OR s.story_code LIKE @search)`
      request.input('search', sql.NVarChar, `%${filters.search}%`)
    }

    query += ` ORDER BY s.sort_order, s.created_at`

    const result = await request.query(query)

    const stories = result.recordset.map((s: any) => ({
      ...s,
      progress_percent: s.total_tasks > 0
        ? Math.round((s.completed_tasks / s.total_tasks) * 100)
        : 0
    }))

    return { success: true, data: stories }

  } catch (error: any) {
    console.error('getStories error:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getStoryById(id: string) {
  try {
    const pool = await getConnection()

    // Check if name_th column exists in task_type_configs
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'task_type_configs'
      AND COLUMN_NAME = 'name_th'
    `)
    const hasTaskTypeNameTh = columnCheck.recordset.length > 0

    const storyResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT
          s.*,
          p.project_code,
          p.name AS project_name,
          mc.code AS milestone_code,
          mc.name AS milestone_name,
          mc.color AS milestone_color,
          ds.story_code AS depends_on_code,
          ds.title AS depends_on_title
        FROM pms.stories s
        LEFT JOIN pms.projects p ON s.project_id = p.id
        LEFT JOIN pms.project_milestones pm ON s.milestone_id = pm.id
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN pms.stories ds ON s.depends_on_story_id = ds.id
        WHERE s.id = @id
      `)

    if (storyResult.recordset.length === 0) {
      return { success: false, error: 'Story not found', data: null }
    }

    const story = storyResult.recordset[0]

    const taskTypeNameColumn = hasTaskTypeNameTh ? 'ttc.name_th' : 'ttc.name'

    const tasksResult = await pool.request()
      .input('storyId', sql.UniqueIdentifier, id)
      .query(`
        SELECT
          t.*,
          CONCAT(ea.first_name_th, ' ', ea.last_name_th) AS assignee_name,
          ea.employee_code AS assignee_code,
          pa.code AS assignee_position,
          CONCAT(er.first_name_th, ' ', er.last_name_th) AS reviewer_name,
          ${taskTypeNameColumn} AS task_type_name,
          ttc.color AS task_type_color,
          ttc.icon AS task_type_icon
        FROM pms.tasks t
        LEFT JOIN pms.employees ea ON t.assignee_id = ea.id
        LEFT JOIN pms.positions pa ON ea.position_id = pa.id
        LEFT JOIN pms.employees er ON t.reviewer_id = er.id
        LEFT JOIN pms.task_type_configs ttc ON t.task_type = ttc.code
        WHERE t.story_id = @storyId AND t.is_active = 1
        ORDER BY t.sort_order, t.created_at
      `)

    const tasks = tasksResult.recordset
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t: any) => t.status === 'done').length
    const totalEstimatedHours = tasks.reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0)
    const totalActualHours = tasks.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0)

    return {
      success: true,
      data: {
        ...story,
        tasks,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        calculated_estimated_md: totalEstimatedHours / 8,
        calculated_actual_md: totalActualHours / 8,
        progress_percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    }

  } catch (error: any) {
    console.error('getStoryById error:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function createStory(data: {
  project_id: string
  milestone_id?: string
  title: string
  title_th?: string
  description?: string
  acceptance_criteria?: string
  priority?: string
  estimated_md?: number
  start_date?: string
  due_date?: string
  depends_on_story_id?: string
}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const pool = await getConnection()

    // Check if milestone is locked
    if (data.milestone_id) {
      const isLocked = await isMilestoneLocked(data.milestone_id)
      if (isLocked) {
        return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถเพิ่ม Story ได้' }
      }
    }

    const codeResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, data.project_id)
      .query(`
        SELECT ISNULL(MAX(CAST(REPLACE(story_code, 'S-', '') AS INT)), 0) + 1 AS next_num
        FROM pms.stories
        WHERE project_id = @projectId
      `)

    const nextNum = codeResult.recordset[0].next_num
    const storyCode = 'S-' + String(nextNum).padStart(3, '0')

    const sortResult = await pool.request()
      .input('projectId', sql.UniqueIdentifier, data.project_id)
      .input('milestoneId', sql.UniqueIdentifier, data.milestone_id || null)
      .query(`
        SELECT ISNULL(MAX(sort_order), 0) + 1 AS next_sort
        FROM pms.stories
        WHERE project_id = @projectId 
          AND (milestone_id = @milestoneId OR (@milestoneId IS NULL AND milestone_id IS NULL))
      `)

    const sortOrder = sortResult.recordset[0].next_sort

    const result = await pool.request()
      .input('projectId', sql.UniqueIdentifier, data.project_id)
      .input('milestoneId', sql.UniqueIdentifier, data.milestone_id || null)
      .input('storyCode', sql.NVarChar, storyCode)
      .input('title', sql.NVarChar, data.title)
      .input('titleTh', sql.NVarChar, data.title_th || null)
      .input('description', sql.NVarChar, data.description || null)
      .input('acceptanceCriteria', sql.NVarChar, data.acceptance_criteria || null)
      .input('priority', sql.NVarChar, data.priority || 'medium')
      .input('estimatedMd', sql.Decimal(10, 2), data.estimated_md || 0)
      .input('startDate', sql.Date, data.start_date ? new Date(data.start_date) : null)
      .input('dueDate', sql.Date, data.due_date ? new Date(data.due_date) : null)
      .input('dependsOnStoryId', sql.UniqueIdentifier, data.depends_on_story_id || null)
      .input('sortOrder', sql.Int, sortOrder)
      .input('createdBy', sql.UniqueIdentifier, user.id)
      .query(`
        INSERT INTO pms.stories (
          project_id, milestone_id, story_code, title, title_th,
          description, acceptance_criteria, priority, estimated_md,
          start_date, due_date, depends_on_story_id, sort_order, created_by
        ) OUTPUT INSERTED.id VALUES (
          @projectId, @milestoneId, @storyCode, @title, @titleTh,
          @description, @acceptanceCriteria, @priority, @estimatedMd,
          @startDate, @dueDate, @dependsOnStoryId, @sortOrder, @createdBy
        )
      `)

    revalidatePath(`/projects/${data.project_id}/stories`)
    return { success: true, data: { id: result.recordset[0].id, story_code: storyCode } }

  } catch (error: any) {
    console.error('createStory error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateStory(id: string, data: Partial<Story>) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const pool = await getConnection()

    // Check if milestone is locked (for existing or new milestone)
    if (data.milestone_id) {
      const isLocked = await isMilestoneLocked(data.milestone_id)
      if (isLocked) {
        return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถย้าย Story ได้' }
      }
    }

    // Also check current milestone of the story
    const currentStoryResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT milestone_id FROM pms.stories WHERE id = @id')

    if (currentStoryResult.recordset.length > 0 && currentStoryResult.recordset[0].milestone_id) {
      const currentMilestoneId = currentStoryResult.recordset[0].milestone_id
      const isLocked = await isMilestoneLocked(currentMilestoneId)
      if (isLocked) {
        return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถแก้ไข Story ได้' }
      }
    }

    const updates: string[] = []
    const request = pool.request()
    request.input('id', sql.UniqueIdentifier, id)
    request.input('updatedBy', sql.UniqueIdentifier, user.id)

    if (data.milestone_id !== undefined) {
      updates.push('milestone_id = @milestoneId')
      request.input('milestoneId', sql.UniqueIdentifier, data.milestone_id)
    }
    if (data.title !== undefined) {
      updates.push('title = @title')
      request.input('title', sql.NVarChar, data.title)
    }
    if (data.status !== undefined) {
      updates.push('status = @status')
      request.input('status', sql.NVarChar, data.status)

      if (data.status === 'done') {
        updates.push('completed_date = GETDATE()')
      } else {
        updates.push('completed_date = NULL')
      }
    }

    updates.push('updated_by = @updatedBy')
    updates.push('updated_at = GETDATE()')

    await request.query(`
      UPDATE pms.stories SET ${updates.join(', ')} WHERE id = @id
    `)

    const projectResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT project_id FROM pms.stories WHERE id = @id`)

    if (projectResult.recordset.length > 0) {
      revalidatePath(`/projects/${projectResult.recordset[0].project_id}/stories`)
    }

    return { success: true }

  } catch (error: any) {
    console.error('updateStory error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteStory(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const pool = await getConnection()

    // Check if parent milestone is locked
    const storyResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT milestone_id FROM pms.stories WHERE id = @id')

    if (storyResult.recordset.length > 0 && storyResult.recordset[0].milestone_id) {
      const milestoneId = storyResult.recordset[0].milestone_id
      const isLocked = await isMilestoneLocked(milestoneId)
      if (isLocked) {
        return { success: false, error: 'Milestone ถูก Lock แล้ว ไม่สามารถลบ Story ได้' }
      }
    }

    const projectResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT project_id FROM pms.stories WHERE id = @id`)

    const projectId = projectResult.recordset[0]?.project_id

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE pms.tasks SET is_active = 0, updated_at = GETDATE() WHERE story_id = @id;
        UPDATE pms.stories SET is_active = 0, updated_at = GETDATE() WHERE id = @id;
      `)

    if (projectId) {
      revalidatePath(`/projects/${projectId}/stories`)
    }

    return { success: true }

  } catch (error: any) {
    console.error('deleteStory error:', error)
    return { success: false, error: error.message }
  }
}

export async function getStoryOptions(projectId: string) {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('projectId', sql.UniqueIdentifier, projectId)
      .query(`
        SELECT id, story_code, title, status
        FROM pms.stories
        WHERE project_id = @projectId AND is_active = 1
        ORDER BY sort_order, created_at
      `)

    return { success: true, data: result.recordset }

  } catch (error: any) {
    console.error('getStoryOptions error:', error)
    return { success: false, error: error.message, data: [] }
  }
}
