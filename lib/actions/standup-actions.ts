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

// ... (Top of file)
export type StandupGroup = {
    id: number
    name: string
    memberCount?: number
    webhookUrl?: string
}

// ...

export async function getUserGroups() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT g.id, g.name, g.webhook_url as webhookUrl,
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

export async function getAllStandupGroups() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const result = await pool.request()
            .query(`
                SELECT id, name, webhook_url as webhookUrl
                FROM pms.standup_groups
                ORDER BY name
            `)

        return { success: true, data: result.recordset as StandupGroup[] }
    } catch (error) {
        console.error('Error fetching all groups:', error)
        return { success: false, error: 'Failed to fetch groups' }
    }
}

// ...
// ...

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
    } catch (error: any) {
        console.error('Error creating group:', error)
        return { success: false, error: error.message || 'Failed to create group' }
    }
}

export async function updateStandupGroup(groupId: number, name: string, webhookUrl?: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const req = pool.request()
            .input('id', sql.Int, groupId)
            .input('name', sql.NVarChar, name)

        if (webhookUrl !== undefined) {
            req.input('webhookUrl', sql.NVarChar, webhookUrl || null)
            await req.query('UPDATE pms.standup_groups SET name = @name, webhook_url = @webhookUrl WHERE id = @id')
        } else {
            await req.query('UPDATE pms.standup_groups SET name = @name WHERE id = @id')
        }

        revalidatePath('/standup')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to update group' }
    }
}

// ... (existing code)

// Send Summary to MS Teams
export async function sendSummaryToMSTeams(groupId: number, summaryMarkdown: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // 1. Get Webhook URL and Group Name
        const groupResult = await pool.request()
            .input('id', sql.Int, groupId)
            .query('SELECT webhook_url, name FROM pms.standup_groups WHERE id = @id')

        const webhookUrl = groupResult.recordset[0]?.webhook_url
        const groupName = groupResult.recordset[0]?.name || 'Team'

        if (!webhookUrl) {
            return { success: false, error: 'Webhook URL not configured for this group' }
        }

        // 2. Prepare Payload (Adaptive Card or Simple Message)
        // MS Teams webhooks support "text" with basic markdown
        const payload = {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    contentUrl: null,
                    content: {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.2",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": `Daily Stand-up Summary - ${groupName}`,
                                "weight": "Bolder",
                                "size": "Medium",
                                "color": "Accent"
                            },
                            {
                                "type": "TextBlock",
                                "text": summaryMarkdown,
                                "wrap": true
                            },
                            {
                                "type": "TextBlock",
                                "text": `Generated by ${user.name} via PM Software`,
                                "size": "Small",
                                "isSubtle": true,
                                "spacing": "Medium"
                            }
                        ]
                    }
                }
            ]
        }

        // 3. Send Request
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const text = await response.text()
            console.error('MS Teams Webhook Error:', text)
            return { success: false, error: `Failed to send to Teams: ${response.statusText}` }
        }

        return { success: true }
    } catch (error: any) {
        console.error('Send to Teams error:', error)
        return { success: false, error: error.message || 'Failed to send' }
    }
}

export async function deleteStandupGroup(groupId: number) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        // Delete members first (or CASCADE if DB supports it, safer to prompt helper or do transactional)
        // We assume simple deletion for now. DB constraints might exist.

        // Transaction manually
        const transaction = new sql.Transaction(pool)
        await transaction.begin()

        try {
            const request = new sql.Request(transaction)
            request.input('id', sql.Int, groupId)

            await request.query('DELETE FROM pms.standup_group_members WHERE group_id = @id')
            await request.query('DELETE FROM pms.daily_standups WHERE group_id = @id') // Optional: might want to keep history? User asked to delete group.
            await request.query('DELETE FROM pms.standup_groups WHERE id = @id')

            await transaction.commit()
            revalidatePath('/standup')
            return { success: true }
        } catch (err) {
            await transaction.rollback()
            throw err
        }
    } catch (error) {
        return { success: false, error: 'Failed to delete group' }
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

        // 1. Get Standup Record (Notes & Mood only)
        const standupResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('groupId', sql.Int, groupId)
            .input('date', sql.Date, today)
            .query(`
                SELECT id, user_id, group_id, date, morning_note, evening_note, mood
                FROM pms.daily_standups
                WHERE user_id = @userId AND group_id = @groupId AND date = @date
            `)

        const standup = standupResult.recordset[0] || {
            id: null,
            userId: user.id,
            groupId,
            date: new Date(),
            morningNote: '',
            eveningNote: '',
            mood: null
        }

        // 2. Fetch "My Tasks" for today (Dynamic Dashboard)
        // Criteria: Assigned to me AND (Due Today OR Planned Start Today OR In Progress OR Logged Time Today OR Completed Today)
        // Also exclude Cancelled tasks.
        const tasksResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('date', sql.Date, today)
            .query(`
                SELECT DISTINCT
                    t.id as taskId,
                    t.task_code,
                    t.title as taskTitle,
                    t.status,
                    t.priority,
                    t.due_date,
                    p.name as projectTitle,
                    p.project_code,
                    (SELECT SUM(hours) FROM pms.timesheet_entries WHERE task_id = t.id AND entry_date = @date AND is_active = 1) as today_hours
                FROM pms.tasks t
                JOIN pms.stories s ON t.story_id = s.id
                JOIN pms.projects p ON s.project_id = p.id
                LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.entry_date = @date AND te.is_active = 1
                WHERE t.assignee_id = @userId
                AND t.status <> 'cancelled'
                AND (
                    t.status = 'in_progress'
                    OR t.due_date = @date
                    OR t.start_date = @date
                    OR te.id IS NOT NULL -- Computed work today
                    OR CAST(t.completed_date AS DATE) = @date -- Finished today
                )
            `)
        // Note: @standupId might be null if no record, so we handle remark separately or via left join if standup exists.
        // Simplified query above assumes basic fetch. Let's refine the remark fetch if needed, but user said "no special recording".

        // Combine to match UI expected format (StandupTask)
        const tasks: StandupTask[] = tasksResult.recordset.map((t: any) => {
            let status = 'PENDING'
            if (t.status === 'done' || t.status === 'done_not_planned') status = 'COMPLETED'
            if (t.status === 'in_progress') status = 'PENDING' // Or 'IN_PROGRESS' if supported
            // Map generic status to Standup Status if needed, or just use task status string.
            // The UI expects 'PENDING' | 'COMPLETED' | 'BLOCKED' | 'DEFERRED'.
            // matching: done -> COMPLETED, others -> PENDING.

            return {
                taskId: t.taskId,
                customTaskName: t.taskTitle, // or task_code + title
                taskTitle: `${t.task_code}: ${t.taskTitle}`,
                projectTitle: t.projectTitle,
                isPlanned: true, // Auto-detected means relevant
                status: (t.status === 'done' || t.status === 'done_not_planned') ? 'COMPLETED' : 'PENDING',
                remark: t.today_hours ? `Logged ${t.today_hours}h` : '', // Show logged hours as remark?
            } as StandupTask
        })

        return {
            success: true,
            data: {
                ...standup,
                tasks
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

export async function getTeamStandupStatus(groupId: number, dateString?: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        const today = dateString || new Date().toISOString().split('T')[0]

        // 0. Get group name
        const groupResult = await pool.request()
            .input('groupId', sql.Int, groupId)
            .query('SELECT name FROM pms.standup_groups WHERE id = @groupId')

        const groupName = groupResult.recordset[0]?.name || ''

        // 1. Get all members of the group
        const membersResult = await pool.request()
            .input('groupId', sql.Int, groupId)
            .query(`
                SELECT e.id, e.first_name_th, e.last_name_th, e.nickname, e.avatar_url
                FROM pms.standup_group_members m
                JOIN pms.employees e ON m.user_id = e.id
                WHERE m.group_id = @groupId
            `)

        const members = membersResult.recordset

        // If groupId is 0, we want ALL active employees (SA, BA, PG)
        if (groupId === 0) {
            const allMembersResult = await pool.request().query(`
                SELECT e.id, e.first_name_th, e.last_name_th, e.nickname, e.avatar_url
                FROM pms.employees e
                JOIN pms.positions p ON e.position_id = p.id
                WHERE e.is_active = 1
                AND (p.name LIKE '%Programmer%' OR p.name LIKE '%Analyst%' OR p.name LIKE '%Developer%')
                ORDER BY e.first_name_th
            `)
            // Overwrite members list
            // Note: const members above is a const reference to array, but we reassigned variable in similar scope? logic error in thought.
            // Let's change variable declaration or return fresh.
            // Actually, we can just branch logic
        }

        let targetMembers = members
        let targetGroupName = groupName

        if (groupId === 0) {
            targetGroupName = 'All Teams'
            const allActiveResult = await pool.request().query(`
                SELECT e.id, e.first_name_th, e.last_name_th, e.nickname, e.avatar_url
                FROM pms.employees e
                JOIN pms.positions p ON e.position_id = p.id
                WHERE e.is_active = 1
                AND (p.name LIKE '%Programmer%' OR p.name LIKE '%Analyst%' OR p.name LIKE '%Developer%')
                ORDER BY e.first_name_th
            `)
            targetMembers = allActiveResult.recordset
        }

        if (targetMembers.length === 0) return { success: true, data: [] }

        // 2. Fetch Tasks for ALL members involved
        // We can do this efficiently by fetching ALL tasks for these users for today in one query
        const memberIds = targetMembers.map((m: any) => `'${m.id}'`).join(',')

        // Safety check for empty group
        if (!memberIds) return { success: true, data: [] }

        const tasksResult = await pool.request()
            .input('date', sql.Date, today)
            .query(`
                SELECT DISTINCT
                    t.assignee_id,
                    t.id as taskId,
                    t.task_code,
                    t.title as taskTitle,
                    t.status,
                    t.priority,
                    t.due_date,
                    p.name as projectTitle,
                    p.project_code,
                    (SELECT SUM(hours) FROM pms.timesheet_entries WHERE task_id = t.id AND entry_date = @date AND is_active = 1) as today_hours
                FROM pms.tasks t
                JOIN pms.stories s ON t.story_id = s.id
                JOIN pms.projects p ON s.project_id = p.id
                LEFT JOIN pms.timesheet_entries te ON t.id = te.task_id AND te.entry_date = @date AND te.is_active = 1
                WHERE t.assignee_id IN (${memberIds})
                AND t.status <> 'cancelled'
                AND (
                    t.status = 'in_progress'
                    OR t.due_date = @date
                    OR t.start_date = @date
                    OR te.id IS NOT NULL -- Computed work today
                    OR CAST(t.completed_date AS DATE) = @date -- Finished today
                )
            `)

        const allTasks = tasksResult.recordset

        // 3. Get generic standup notes (if any still used)
        const standupsResult = await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('date', sql.Date, today)
            .query(`
                SELECT s.id, s.user_id, s.morning_note, s.evening_note, s.mood
                FROM pms.daily_standups s
                WHERE s.group_id = @groupId AND s.date = @date
            `)
        const standups = standupsResult.recordset

        // 4. Merge Data
        const teamStatus = targetMembers.map((member: any) => {
            const memberTasks = allTasks.filter((t: any) => t.assignee_id === member.id)
            const standup = standups.find((s: any) => s.user_id === member.id)

            // Format tasks
            const tasks: StandupTask[] = memberTasks.map((t: any) => ({
                taskId: t.taskId,
                customTaskName: t.taskTitle,
                taskTitle: `${t.task_code}: ${t.taskTitle}`,
                projectTitle: t.projectTitle,
                isPlanned: true,
                status: (t.status === 'done' || t.status === 'done_not_planned') ? 'COMPLETED' : 'PENDING',
                remark: t.today_hours ? `Logged ${t.today_hours}h` : '',
            }))

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
                    mood: standup.mood
                } : null,
                tasks // Attach dynamic tasks
            }
        })

        return { success: true, data: teamStatus, groupName: targetGroupName }

    } catch (error) {
        console.error('getTeamStandupStatus error:', error)
        return { success: false, error: 'Failed to fetch team status' }
    }
}

// Add Member
export async function addMemberToGroup(groupId: number, userId: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()

        // Check if exists
        const check = await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT id FROM pms.standup_group_members WHERE group_id = @groupId AND user_id = @userId')

        if (check.recordset.length > 0) return { success: false, error: 'User already in group' }

        await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query('INSERT INTO pms.standup_group_members (group_id, user_id) VALUES (@groupId, @userId)')

        revalidatePath('/standup')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to add member' }
    }
}

// Remove Member
export async function removeMemberFromGroup(groupId: number, userId: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query('DELETE FROM pms.standup_group_members WHERE group_id = @groupId AND user_id = @userId')

        revalidatePath('/standup')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to remove member' }
    }
}

// Get Potential Members
export async function getPotentialMembers(groupId: number) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('groupId', sql.Int, groupId)
            .query(`
                SELECT id, first_name_th, last_name_th, nickname
                FROM pms.employees
                WHERE is_active = 1
                AND id NOT IN (SELECT user_id FROM pms.standup_group_members WHERE group_id = @groupId)
                ORDER BY first_name_th
            `)
        return {
            success: true,
            data: result.recordset.map((e: any) => ({
                value: e.id,
                label: `${e.first_name_th} ${e.last_name_th} (${e.nickname})`
            }))
        }
    } catch (error) {
        return { success: false, data: [] }
    }
}

// Generate Team Summary
export async function generateTeamSummaryAction(groupId: number, dateString?: string) {
    const res = await getTeamStandupStatus(groupId, dateString)
    if (!res.success || !res.data) return { success: false, error: 'Failed to generate summary' }

    const data = res.data
    const date = dateString || new Date().toISOString().split('T')[0]
    const groupName = res.groupName || 'Team'

    let summary = `## Daily Stand-up Summary - ${groupName} (${date})\n\n`

    // Overview
    const totalMembers = data.length
    const activeMembers = data.filter((m: any) => m.tasks.length > 0).length
    summary += `**Overview**: ${activeMembers}/${totalMembers} members active.\n\n`

    // By Member
    for (const member of data) {
        summary += `### ${member.user.nickname || member.user.name}\n`

        if (member.standup?.morningNote) {
            summary += `> **Morning**: ${member.standup.morningNote}\n`
        }
        if (member.standup?.eveningNote) {
            summary += `> **Evening**: ${member.standup.eveningNote}\n`
        }

        if (member.tasks.length === 0) {
            summary += `- *No tasks logged*\n`
        } else {
            const completed = member.tasks.filter((t: any) => t.status === 'COMPLETED')
            const pending = member.tasks.filter((t: any) => t.status === 'PENDING')

            // Logic for "Not as Planned": Tasks due today but not completed
            // Frontend passes 'PENDING'.
            // Simple logic: If status is PENDING, show as "In Progress" or "Not as Planned"??
            // User requested "Status: Done, Not as Planned".
            // "Not as Planned" usually means something went wrong. For now let's list them.

            if (completed.length > 0) {
                summary += `✅ **Done**: ${completed.length} tasks\n`
            }
            if (pending.length > 0) {
                summary += `⚠️ **Not as Planned / In Progress**: ${pending.length} tasks\n`
            }
        }
        summary += `\n`
    }

    return { success: true, summary }
}
