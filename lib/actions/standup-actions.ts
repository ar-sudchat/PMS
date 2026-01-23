'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type StandupTask = {
    id?: number
    taskId?: string | null
    customTaskName?: string
    isPlanned: boolean
    status: 'PENDING' | 'COMPLETED' | 'BLOCKED' | 'DEFERRED'
    remark?: string
    taskTitle?: string // For display
    projectTitle?: string // For display
}

export type DailyStandup = {
    id: number
    userId: number
    groupId: number
    date: Date
    morningNote?: string
    eveningNote?: string
    mood?: string
    tasks: StandupTask[]
}

export type StandupGroup = {
    id: number
    name: string
    memberCount?: number
}

// --- Groups Management ---

export async function getUserGroups() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT g.id, g.name, 
                       (SELECT COUNT(*) FROM pms.standup_group_members WHERE group_id = g.id) as memberCount
                FROM pms.standup_groups g
                JOIN pms.standup_group_members m ON g.id = m.group_id
                WHERE m.user_id = @userId
            `)

        return { success: true, data: result.recordset as StandupGroup[] }
    } catch (error) {
        console.error('Error fetching user groups:', error)
        return { success: false, error: 'Failed to fetch groups' }
    }
}

export async function createStandupGroup(name: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // 1. Create Group
        const groupResult = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.standup_groups (name, created_by)
                OUTPUT INSERTED.id
                VALUES (@name, @userId)
            `)

        const groupId = groupResult.recordset[0].id

        // 2. Add Creator as Member
        await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.standup_group_members (group_id, user_id)
                VALUES (@groupId, @userId)
            `)

        revalidatePath('/standup')
        return { success: true, data: groupId }
    } catch (error) {
        console.error('Error creating group:', error)
        return { success: false, error: 'Failed to create group' }
    }
}

export async function joinGroup(inviteCode: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Simple logic: Invite Code = Group ID
    const groupId = parseInt(inviteCode)
    if (isNaN(groupId)) {
        return { success: false, error: 'Invalid invite code (must be numeric Group ID)' }
    }

    try {
        const pool = await getConnection()

        // 1. Check if group exists
        const groupCheck = await pool.request()
            .input('groupId', sql.Int, groupId)
            .query('SELECT id, name FROM pms.standup_groups WHERE id = @groupId')

        if (groupCheck.recordset.length === 0) {
            return { success: false, error: 'Group not found' }
        }

        // 2. Check if already member
        const memberCheck = await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query('SELECT id FROM pms.standup_group_members WHERE group_id = @groupId AND user_id = @userId')

        if (memberCheck.recordset.length > 0) {
            return { success: false, error: 'You are already a member of this group' }
        }

        // 3. Add Member
        await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.standup_group_members (group_id, user_id)
                VALUES (@groupId, @userId)
            `)

        revalidatePath('/standup')
        return { success: true, data: groupId }
    } catch (error) {
        console.error('Error joining group:', error)
        return { success: false, error: 'Failed to join group' }
    }
}

// --- Daily Standup Operations ---

export async function getTodayStandup(groupId: number) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const today = new Date().toISOString().split('T')[0]
        const pool = await getConnection()

        // 1. Get Standup Record
        const standupResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('groupId', sql.Int, groupId)
            .input('date', sql.Date, today)
            .query(`
                SELECT id, user_id, group_id, date, morning_note, evening_note, mood
                FROM pms.daily_standups
                WHERE user_id = @userId AND group_id = @groupId AND date = @date
            `)

        if (standupResult.recordset.length === 0) {
            return { success: true, data: null }
        }

        const standup = standupResult.recordset[0]

        // 2. Get Tasks
        const tasksResult = await pool.request()
            .input('standupId', sql.Int, standup.id)
            .query(`
                SELECT st.id, st.task_id, st.custom_task_name, st.is_planned, st.status, st.remark,
                       t.title as taskTitle, p.name as projectTitle
                FROM pms.standup_tasks st
                LEFT JOIN pms.tasks t ON st.task_id = t.id
                LEFT JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.projects p ON s.project_id = p.id
                WHERE st.standup_id = @standupId
            `)

        return {
            success: true,
            data: {
                ...standup,
                tasks: tasksResult.recordset.map((t: any) => ({
                    id: t.id,
                    taskId: t.task_id,
                    customTaskName: t.custom_task_name,
                    isPlanned: t.is_planned,
                    status: t.status,
                    remark: t.remark,
                    taskTitle: t.taskTitle || t.custom_task_name,
                    projectTitle: t.projectTitle
                }))
            } as DailyStandup
        }
    } catch (error) {
        console.error('Error fetching standup:', error)
        return { success: false, error: 'Failed to fetch standup' }
    }
}

export async function submitMorningStandup(groupId: number, tasks: { taskId?: string, customName?: string }[], note: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const today = new Date().toISOString().split('T')[0]
        const pool = await getConnection()

        // 1. Check if exists
        const check = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('date', sql.Date, today)
            .query(`
                SELECT id FROM pms.daily_standups 
                WHERE user_id = @userId AND date = @date
            `)

        let standupId
        if (check.recordset.length > 0) {
            standupId = check.recordset[0].id
            // Update note
            await pool.request()
                .input('note', sql.NVarChar, note)
                .input('groupId', sql.Int, groupId)
                .input('id', sql.Int, standupId)
                .query(`
                    UPDATE pms.daily_standups 
                    SET morning_note = @note, group_id = @groupId, updated_at = GETDATE()
                    WHERE id = @id
                `)
        } else {
            // Create
            const insert = await pool.request()
                .input('userId', sql.UniqueIdentifier, user.id)
                .input('groupId', sql.Int, groupId)
                .input('date', sql.Date, today)
                .input('note', sql.NVarChar, note)
                .query(`
                    INSERT INTO pms.daily_standups (user_id, group_id, date, morning_note)
                    OUTPUT INSERTED.id
                    VALUES (@userId, @groupId, @date, @note)
                `)
            standupId = insert.recordset[0].id
        }

        // 2. Insert Tasks (Planned)
        // Clear existing planned tasks
        await pool.request()
            .input('standupId', sql.Int, standupId)
            .query(`
                DELETE FROM pms.standup_tasks 
                WHERE standup_id = @standupId AND is_planned = 1
            `)

        for (const task of tasks) {
            const req = pool.request()
                .input('standupId', sql.Int, standupId)
                .input('customName', sql.NVarChar, task.customName || null)

            if (task.taskId) {
                req.input('taskId', sql.UniqueIdentifier, task.taskId)
            } else {
                req.input('taskId', sql.UniqueIdentifier, null)
            }

            await req.query(`
                INSERT INTO pms.standup_tasks (standup_id, task_id, custom_task_name, is_planned, status)
                VALUES (@standupId, @taskId, @customName, 1, 'PENDING')
            `)
        }

        revalidatePath('/standup')
        return { success: true }
    } catch (error) {
        console.error('Error submitting morning standup:', error)
        return { success: false, error: 'Failed to submit' }
    }
}

export async function submitEveningStandup(standupId: number, tasksUpdates: { id: number, status: string, remark: string }[], eveningNote: string, mood: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // 1. Update Standup Header
        await pool.request()
            .input('eveningNote', sql.NVarChar, eveningNote)
            .input('mood', sql.NVarChar, mood)
            .input('standupId', sql.Int, standupId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.daily_standups
                SET evening_note = @eveningNote, mood = @mood, updated_at = GETDATE()
                WHERE id = @standupId AND user_id = @userId
            `)

        // 2. Update Tasks
        for (const update of tasksUpdates) {
            await pool.request()
                .input('status', sql.NVarChar, update.status)
                .input('remark', sql.NVarChar, update.remark)
                .input('id', sql.Int, update.id)
                .input('standupId', sql.Int, standupId)
                .query(`
                    UPDATE pms.standup_tasks
                    SET status = @status, remark = @remark
                    WHERE id = @id AND standup_id = @standupId
                `)
        }

        revalidatePath('/standup')
        return { success: true }
    } catch (error) {
        console.error('Error submitting evening standup:', error)
        return { success: false, error: 'Failed to submit evening report' }
    }
}

export async function getPendingTasks() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        // Fetch tasks assigned to user that are not completed
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT t.id, t.title, p.name as projectTitle
                FROM pms.tasks t
                LEFT JOIN pms.stories s ON t.story_id = s.id
                LEFT JOIN pms.projects p ON s.project_id = p.id
                WHERE t.assignee_id = @userId AND t.status != 'Done' AND t.status != 'Completed'
                ORDER BY t.created_at DESC
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getPendingTasks error:', error)
        return { success: false, error: 'Failed to fetch pending tasks' }
    }
}

export async function getTeamStandupStatus(groupId: number) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const today = new Date().toISOString().split('T')[0]

        // Get all members of the group
        const membersResult = await pool.request()
            .input('groupId', sql.Int, groupId)
            .query(`
                SELECT e.id, e.first_name_th, e.last_name_th, e.nickname, e.avatar_url
                FROM pms.standup_group_members m
                JOIN pms.employees e ON m.user_id = e.id
                WHERE m.group_id = @groupId
            `)

        const members = membersResult.recordset

        // Get standups for today
        const standupsResult = await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('date', sql.Date, today)
            .query(`
                SELECT s.id, s.user_id, s.morning_note, s.evening_note, s.mood, s.created_at, s.updated_at
                FROM pms.daily_standups s
                WHERE s.group_id = @groupId AND s.date = @date
            `)

        const standups = standupsResult.recordset

        // Merge data
        const teamStatus = members.map((member: any) => {
            const standup = standups.find((s: any) => s.user_id === member.id)
            return {
                user: {
                    id: member.id,
                    name: `${member.first_name_th} ${member.last_name_th}`,
                    nickname: member.nickname,
                    avatarUrl: member.avatar_url
                },
                standup: standup ? {
                    id: standup.id,
                    morningNote: standup.morning_note,
                    eveningNote: standup.evening_note,
                    mood: standup.mood,
                    hasMorning: !!standup.morning_note,
                    hasEvening: !!standup.evening_note
                } : null
            }
        })

        return { success: true, data: teamStatus }

    } catch (error) {
        console.error('getTeamStandupStatus error:', error)
        return { success: false, error: 'Failed to fetch team status' }
    }
}
