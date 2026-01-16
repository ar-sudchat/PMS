'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Types
export interface MilestoneVerificationResult {
    success: boolean
    error?: string
    kpiResults?: {
        ttd_pass: boolean
        mdc_pass: boolean
        docs_pass: boolean
    }
}

export interface MilestoneValidation {
    canVerify: boolean
    checks: {
        hasCompletedDate: boolean
        hasSupportEndDate: boolean
        allRequiredDocsSubmitted: boolean
    }
    reason?: string
}

/**
 * Validate if a milestone can be verified
 */
export async function validateMilestoneForVerification(
    milestoneId: string,
    supportEndDate?: string
): Promise<MilestoneValidation> {
    try {
        const pool = await getConnection()

        // Get milestone data with deliverables
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
        SELECT 
          pm.id,
          pm.completed_date,
          pm.is_verified,
          pm.is_locked,
          COUNT(CASE WHEN pd.is_required = 1 THEN 1 END) AS required_docs_count,
          COUNT(CASE WHEN pd.is_required = 1 AND pd.submitted_date IS NOT NULL THEN 1 END) AS submitted_docs_count
        FROM pms.project_milestones pm
        LEFT JOIN pms.project_deliverables pd ON pm.id = pd.project_milestone_id
        WHERE pm.id = @milestoneId
        GROUP BY pm.id, pm.completed_date, pm.is_verified, pm.is_locked
      `)

        if (result.recordset.length === 0) {
            return {
                canVerify: false,
                checks: {
                    hasCompletedDate: false,
                    hasSupportEndDate: false,
                    allRequiredDocsSubmitted: false
                },
                reason: 'Milestone not found'
            }
        }

        const milestone = result.recordset[0]

        const checks = {
            hasCompletedDate: !!milestone.completed_date,
            hasSupportEndDate: !!supportEndDate,
            allRequiredDocsSubmitted: milestone.required_docs_count === milestone.submitted_docs_count
        }

        const canVerify = Object.values(checks).every(v => v) && !milestone.is_verified

        let reason: string | undefined
        if (milestone.is_verified) {
            reason = 'Milestone นี้ถูก Verify แล้ว'
        } else if (!checks.hasCompletedDate) {
            reason = 'กรุณากรอก Completed Date'
        } else if (!checks.hasSupportEndDate) {
            reason = 'กรุณากรอก Support End Date'
        } else if (!checks.allRequiredDocsSubmitted) {
            reason = `Required Documents ยังส่งไม่ครบ (${milestone.submitted_docs_count}/${milestone.required_docs_count})`
        }

        return { canVerify, checks, reason }
    } catch (error) {
        console.error('Error validating milestone:', error)
        return {
            canVerify: false,
            checks: {
                hasCompletedDate: false,
                hasSupportEndDate: false,
                allRequiredDocsSubmitted: false
            },
            reason: 'เกิดข้อผิดพลาดในการตรวจสอบ'
        }
    }
}

/**
 * Calculate KPI preview before verification
 */
export async function calculateMilestoneKPI(milestoneId: string): Promise<{
    ttd_pass: boolean
    mdc_pass: boolean
    docs_pass: boolean
    details: {
        ttd: { completed: string; due: string; onTime: boolean }
        mdc: { actual: number; planned: number; withinBudget: boolean }
        docs: { onTime: number; required: number; allOnTime: boolean }
    }
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
        SELECT 
          pm.completed_date,
          pm.due_date,
          pm.actual_mandays,
          pm.planned_mandays,
          CASE WHEN pm.completed_date <= pm.due_date THEN 1 ELSE 0 END AS ttd_pass,
          CASE WHEN pm.actual_mandays <= pm.planned_mandays THEN 1 ELSE 0 END AS mdc_pass,
          COUNT(CASE WHEN pd.is_required = 1 THEN 1 END) AS required_docs,
          COUNT(CASE 
            WHEN pd.is_required = 1 
            AND pd.submitted_date IS NOT NULL 
            AND pd.submitted_date <= pm.due_date 
            THEN 1 
          END) AS docs_on_time
        FROM pms.project_milestones pm
        LEFT JOIN pms.project_deliverables pd ON pm.id = pd.project_milestone_id
        WHERE pm.id = @milestoneId
        GROUP BY pm.id, pm.completed_date, pm.due_date, pm.actual_mandays, pm.planned_mandays
      `)

        if (result.recordset.length === 0) {
            throw new Error('Milestone not found')
        }

        const data = result.recordset[0]
        const docs_pass = data.required_docs === data.docs_on_time

        return {
            ttd_pass: !!data.ttd_pass,
            mdc_pass: !!data.mdc_pass,
            docs_pass,
            details: {
                ttd: {
                    completed: data.completed_date?.toISOString() || '',
                    due: data.due_date?.toISOString() || '',
                    onTime: !!data.ttd_pass
                },
                mdc: {
                    actual: data.actual_mandays || 0,
                    planned: data.planned_mandays || 0,
                    withinBudget: !!data.mdc_pass
                },
                docs: {
                    onTime: data.docs_on_time || 0,
                    required: data.required_docs || 0,
                    allOnTime: docs_pass
                }
            }
        }
    } catch (error) {
        console.error('Error calculating KPI:', error)
        throw error
    }
}

/**
 * Verify and lock a milestone
 */
export async function verifyAndLockMilestone(
    milestoneId: string,
    supportEndDate: string
): Promise<MilestoneVerificationResult> {
    const user = await getCurrentUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 1. Validate
        const validation = await validateMilestoneForVerification(milestoneId, supportEndDate)
        if (!validation.canVerify) {
            return { success: false, error: validation.reason || 'ไม่สามารถ Verify ได้' }
        }

        // 2. Calculate KPI
        const kpi = await calculateMilestoneKPI(milestoneId)

        // 3. Update database
        const pool = await getConnection()

        await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('supportEndDate', sql.Date, supportEndDate)
            .input('ttdPass', sql.Bit, kpi.ttd_pass)
            .input('mdcPass', sql.Bit, kpi.mdc_pass)
            .input('docsPass', sql.Bit, kpi.docs_pass)
            .query(`
        UPDATE pms.project_milestones
        SET 
          is_verified = 1,
          is_locked = 1,
          is_approved = 1,
          verified_at = GETDATE(),
          verified_by = @userId,
          approved_at = GETDATE(),
          support_end_date = @supportEndDate,
          kpi_ttd_pass = @ttdPass,
          kpi_mdc_pass = @mdcPass,
          kpi_docs_pass = @docsPass,
          updated_at = GETDATE()
        WHERE id = @milestoneId
      `)

        // 4. Lock all deliverables
        await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
        UPDATE pms.project_deliverables
        SET is_locked = 1, updated_at = GETDATE()
        WHERE project_milestone_id = @milestoneId
      `)

        // 5. Revalidate paths
        revalidatePath('/projects')
        revalidatePath('/my-projects')

        return {
            success: true,
            kpiResults: {
                ttd_pass: kpi.ttd_pass,
                mdc_pass: kpi.mdc_pass,
                docs_pass: kpi.docs_pass
            }
        }
    } catch (error) {
        console.error('Error verifying milestone:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการ Verify'
        }
    }
}

/**
 * Check if milestone is locked (for enforcement in other actions)
 */
export async function isMilestoneLocked(milestoneId: string): Promise<boolean> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
        SELECT is_locked
        FROM pms.project_milestones
        WHERE id = @milestoneId
      `)

        if (result.recordset.length === 0) {
            return false
        }

        // Only check is_locked (not is_verified)
        return !!result.recordset[0].is_locked
    } catch (error) {
        console.error('Error checking milestone lock:', error)
        return false
    }
}

/**
 * Get milestone ID from story ID (helper for lock enforcement)
 */
export async function getMilestoneIdFromStory(storyId: string): Promise<string | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('storyId', sql.UniqueIdentifier, storyId)
            .query(`
        SELECT milestone_id
        FROM pms.stories
        WHERE id = @storyId
      `)

        return result.recordset[0]?.milestone_id || null
    } catch (error) {
        console.error('Error getting milestone from story:', error)
        return null
    }
}

/**
 * Get milestone ID from task ID (helper for lock enforcement)
 */
export async function getMilestoneIdFromTask(taskId: string): Promise<string | null> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('taskId', sql.UniqueIdentifier, taskId)
            .query(`
        SELECT s.milestone_id
        FROM pms.tasks t
        INNER JOIN pms.stories s ON t.story_id = s.id
        WHERE t.id = @taskId
      `)

        return result.recordset[0]?.milestone_id || null
    } catch (error) {
        console.error('Error getting milestone from task:', error)
        return null
    }
}
