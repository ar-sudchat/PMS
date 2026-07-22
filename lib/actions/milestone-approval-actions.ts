'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Types
export interface MilestoneApprovalStatus {
    milestone_id: string
    milestone_name: string
    is_approved: boolean
    is_locked: boolean
    approved_at: string | null
    approved_by_name: string | null
    approval_notes: string | null
    can_approve: boolean
    due_date: string | null
    completed_date: string | null
    summary: {
        total_stories: number
        done_stories: number
        total_tasks: number
        done_tasks: number
        plan_mandays: number
        actual_mandays: number
        is_on_time: boolean

        is_within_budget: boolean
        required_docs_count: number
        missing_docs_count: number
        unverified_docs_count: number
        docs_on_time_count: number
    }
}

// Check if milestone is locked
export async function isMilestoneLocked(milestoneId: string): Promise<boolean> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
    SELECT ISNULL(is_locked, 0) AS is_locked 
    FROM pms.project_milestones 
    WHERE id = @milestoneId
  `)
        return result.recordset[0]?.is_locked === true
    } catch (error) {
        console.error('Error checking milestone lock:', error)
        return false
    }
}

// Check if milestone is locked by task ID
export async function isMilestoneLockedByTaskId(taskId: string): Promise<boolean> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
    SELECT ISNULL(pm.is_locked, 0) AS is_locked 
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
    WHERE t.id = @taskId
  `)
        return result.recordset[0]?.is_locked === true
    } catch (error) {
        console.error('Error checking milestone lock by task:', error)
        return false
    }
}

// Check if milestone is locked by story ID
export async function isMilestoneLockedByStoryId(storyId: string): Promise<boolean> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .query(`
    SELECT ISNULL(pm.is_locked, 0) AS is_locked 
    FROM pms.stories s
    INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
    WHERE s.id = @storyId
  `)
        return result.recordset[0]?.is_locked === true
    } catch (error) {
        console.error('Error checking milestone lock by story:', error)
        return false
    }
}

// Get milestone approval status with summary
export async function getMilestoneApprovalStatus(milestoneId: string): Promise<MilestoneApprovalStatus | null> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
    SELECT 
      pm.id AS milestone_id,
      pm.name AS milestone_name,
      ISNULL(pm.is_approved, 0) AS is_approved,
      ISNULL(pm.is_locked, 0) AS is_locked,
      pm.approved_at,
      COALESCE(e.first_name_th + ' ' + ISNULL(e.last_name_th, ''), e.first_name + ' ' + ISNULL(e.last_name, '')) AS approved_by_name,
      pm.approval_notes,
      pm.due_date,
      pm.completed_date,
      ISNULL(vp.effective_planned_mandays, 0) AS plan_mandays,
      ISNULL(pm.actual_mandays, 0) AS actual_mandays,
      
      -- Story counts
      (SELECT COUNT(*) FROM pms.stories WHERE milestone_id = pm.id AND is_active = 1) AS total_stories,
      (SELECT COUNT(*) FROM pms.stories WHERE milestone_id = pm.id AND is_active = 1 AND status = 'done') AS done_stories,
      
      -- Task counts
      (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id 
       WHERE s.milestone_id = pm.id AND t.is_active = 1) AS total_tasks,
      (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id 
       WHERE s.milestone_id = pm.id AND t.is_active = 1 AND t.status = 'done') AS done_tasks,

      -- Document counts
      (SELECT COUNT(*) FROM pms.project_deliverables WHERE project_milestone_id = pm.id AND is_required = 1 AND is_active = 1) AS required_docs_count,
      (SELECT COUNT(*) FROM pms.project_deliverables WHERE project_milestone_id = pm.id AND is_required = 1 AND is_active = 1 AND submitted_date IS NULL) AS missing_docs_count,
      (SELECT COUNT(*) FROM pms.project_deliverables WHERE project_milestone_id = pm.id AND is_required = 1 AND is_active = 1 AND submitted_date IS NOT NULL AND is_verified = 0) AS unverified_docs_count,
      (SELECT COUNT(*) FROM pms.project_deliverables WHERE project_milestone_id = pm.id AND is_required = 1 AND is_active = 1 AND submitted_date IS NOT NULL AND is_on_time = 1) AS docs_on_time_count
       
    FROM pms.project_milestones pm
    LEFT JOIN pms.employees e ON pm.approved_by = e.id
    LEFT JOIN pms.vw_milestone_plan_md vp ON vp.project_milestone_id = pm.id
    WHERE pm.id = @milestoneId
  `)

        if (result.recordset.length === 0) return null

        const data = result.recordset[0]
        const allTasksDone = data.total_tasks > 0 && data.done_tasks === data.total_tasks
        const allDocsReady = data.missing_docs_count === 0 && data.unverified_docs_count === 0

        return {
            milestone_id: data.milestone_id,
            milestone_name: data.milestone_name,
            is_approved: !!data.is_approved,
            is_locked: !!data.is_locked,
            approved_at: data.approved_at?.toISOString() || null,
            approved_by_name: data.approved_by_name,
            approval_notes: data.approval_notes,
            can_approve: allTasksDone && allDocsReady && !data.is_approved,
            due_date: data.due_date?.toISOString()?.split('T')[0] || null,
            completed_date: data.completed_date?.toISOString()?.split('T')[0] || null,
            summary: {
                total_stories: data.total_stories,
                done_stories: data.done_stories,
                total_tasks: data.total_tasks,
                done_tasks: data.done_tasks,
                plan_mandays: data.plan_mandays || 0,
                actual_mandays: data.actual_mandays || 0,
                is_on_time: !data.completed_date || !data.due_date || new Date(data.completed_date) <= new Date(data.due_date),
                is_within_budget: data.actual_mandays <= (data.plan_mandays || 0),
                required_docs_count: data.required_docs_count,
                missing_docs_count: data.missing_docs_count,
                unverified_docs_count: data.unverified_docs_count,
                docs_on_time_count: data.docs_on_time_count || 0
            }
        }
    } catch (error) {
        console.error('Error getting milestone approval status:', error)
        return null
    }
}

// Approve and Lock Milestone
export async function approveMilestone(
    milestoneId: string,
    completedDate: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const employeeId = (user as any).employeeId || user.id

        // Check if already approved
        const status = await getMilestoneApprovalStatus(milestoneId)
        if (!status) return { success: false, error: 'Milestone not found' }
        if (status.is_approved) return { success: false, error: 'Milestone already approved' }

        // Update milestone
        await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .input('completedDate', sql.Date, completedDate)
            .input('approvedBy', sql.UniqueIdentifier, employeeId)
            .input('notes', sql.NVarChar, notes || null)
            .query(`
        UPDATE pms.project_milestones SET
          status = 'completed',
          completed_date = @completedDate,
          is_approved = 1,
          is_locked = 1,
          approved_at = GETDATE(),
          approved_by = @approvedBy,
          approval_notes = @notes,
          updated_at = GETDATE()
        WHERE id = @milestoneId
      `)

        revalidatePath('/projects')
        revalidatePath('/my-projects')

        return { success: true }
    } catch (error) {
        console.error('Error approving milestone:', error)
        return { success: false, error: 'Database error' }
    }
}

// Unlock Milestone (Admin only)
export async function unlockMilestone(
    milestoneId: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // TODO: Check admin permission

    try {
        const pool = await getConnection()

        await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .input('reason', sql.NVarChar, reason)
            .query(`
        UPDATE pms.project_milestones SET
          is_locked = 0,
          approval_notes = ISNULL(approval_notes, '') + ' | UNLOCKED: ' + @reason,
          updated_at = GETDATE()
        WHERE id = @milestoneId
      `)

        revalidatePath('/projects')
        revalidatePath('/my-projects')

        return { success: true }
    } catch (error) {
        console.error('Error unlocking milestone:', error)
        return { success: false, error: 'Database error' }
    }
}

// Get milestones with approval status for a project
export async function getProjectMilestonesWithApproval(projectId: string): Promise<{
    id: string
    name: string
    color: string
    weight_percent: number
    planned_mandays: number
    actual_mandays: number
    due_date: string | null
    completed_date: string | null
    status: string
    is_approved: boolean
    is_locked: boolean
    can_approve: boolean
    done_tasks: number
    total_tasks: number
}[]> {
    try {
        const pool = await getConnection()
        console.log('[DEBUG] getProjectMilestonesWithApproval - projectId:', projectId)

        const result = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
        SELECT 
          pm.id,
          ISNULL(mc.name, pm.name) AS name,
          ISNULL(mc.color, ISNULL(pm.color, '#6366f1')) AS color,
          ISNULL(pm.weight_percent, 0) AS weight_percent,
          ISNULL(vp.effective_planned_mandays, 0) AS planned_mandays,
          ISNULL(pm.actual_mandays, 0) AS actual_mandays,
          pm.due_date,
          pm.completed_date,
          pm.status,
          ISNULL(pm.is_approved, 0) AS is_approved,
          ISNULL(pm.is_locked, 0) AS is_locked,
          
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id 
           WHERE s.milestone_id = pm.id AND t.is_active = 1) AS total_tasks,
          (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id 
           WHERE s.milestone_id = pm.id AND t.is_active = 1 AND t.status = 'done') AS done_tasks
           
        FROM pms.project_milestones pm
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN pms.vw_milestone_plan_md vp ON vp.project_milestone_id = pm.id
        WHERE pm.project_id = @projectId AND pm.is_active = 1
        ORDER BY pm.display_order, pm.due_date
      `)

        console.log('[DEBUG] Query result count:', result.recordset.length)
        if (result.recordset.length > 0) {
            console.log('[DEBUG] First milestone:', result.recordset[0])
        }

        return result.recordset.map((row: any) => ({
            ...row,
            due_date: row.due_date?.toISOString()?.split('T')[0] || null,
            completed_date: row.completed_date?.toISOString()?.split('T')[0] || null,
            is_approved: !!row.is_approved,
            is_locked: !!row.is_locked,
            can_approve: row.total_tasks > 0 && row.done_tasks === row.total_tasks && !row.is_approved
        }))
    } catch (error) {
        console.error('Error fetching project milestones with approval:', error)
        return []
    }
}
