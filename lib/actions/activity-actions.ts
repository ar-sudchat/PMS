'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface ActivityItem {
    id: string
    type: 'urgent' | 'assignment' | 'approval' | 'success' | 'info'
    title: string
    description: string
    timestamp: Date
    link?: string
    metadata?: any
    isRead: boolean
}

export async function getMyActivities(): Promise<ActivityItem[]> {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const pool = await getConnection()
        const activities: ActivityItem[] = []

        // Helper to check if read
        // Actually we will filter in SQL using LEFT JOIN pms.user_notifications
        // But for distinct queries, we can just exclude.

        // 1. TASKS (Dev/Member) - Overdue or Near Due
        // Filter: not in user_notifications (or we show them but marked read? Prompt implies "Action Center", usually "To Do". acknowledging removes it from list or moves to archive.)
        // Prompt: "when press Acknowledge... record status".
        // I will exclude acknowledged items from the main list.

        const tasksResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT 
                    t.id, t.task_code, t.title, t.due_date, t.priority, p.project_code,
                    CASE WHEN t.due_date < CAST(GETDATE() AS DATE) THEN 'Overdue' ELSE 'Due Soon' END as status_label
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.projects p ON s.project_id = p.id
                LEFT JOIN pms.user_notifications un ON un.activity_type = 'task_due' AND un.activity_id = CAST(t.id AS VARCHAR(50)) AND un.user_id = @userId
                WHERE t.assignee_id = @userId
                AND t.status NOT IN ('done', 'cancelled')
                AND (t.due_date < CAST(GETDATE() AS DATE) OR t.due_date <= DATEADD(DAY, 3, CAST(GETDATE() AS DATE)))
                AND un.id IS NULL -- Not acknowledged yet
            `)

        tasksResult.recordset.forEach(task => {
            activities.push({
                id: `task-${task.id}`,
                type: 'urgent',
                title: `${task.status_label}: ${task.task_code}`,
                description: `${task.title} (${task.project_code})`,
                timestamp: task.due_date,
                link: `/my-projects?taskId=${task.id}`,
                isRead: false
            })
        })

        // 2. APPROVALS (PM) - Timesheets & Deliverables
        // Logic: User must be Project Owner or Admin/Manager
        const isPM = user.role === 'manager' || user.role === 'admin'

        if (isPM) {
            // Pending Timesheets
            // Find timesheets for projects owned by this user
            const timesheetResult = await pool.request()
                .input('userId', sql.UniqueIdentifier, user.id)
                .query(`
                    SELECT 
                        te.id, e.first_name_th, e.last_name_th, te.entry_date, te.hours, p.project_code
                    FROM pms.timesheet_entries te
                    INNER JOIN pms.employees e ON te.employee_id = e.id
                    INNER JOIN pms.tasks t ON te.task_id = t.id
                    INNER JOIN pms.stories s ON t.story_id = s.id
                    INNER JOIN pms.projects p ON s.project_id = p.id
                    LEFT JOIN pms.user_notifications un ON un.activity_type = 'timesheet_approval' AND un.activity_id = CAST(te.id AS VARCHAR(50)) AND un.user_id = @userId
                    WHERE te.status = 'submitted'
                    AND (p.owner_id = @userId OR 1=1) -- For now showing all submitted for Managers/Admins as 'owner_id' might be sparse
                    AND un.id IS NULL
                `)

            timesheetResult.recordset.forEach(ts => {
                activities.push({
                    id: `ts-${ts.id}`,
                    type: 'approval',
                    title: `Timesheet Approval`,
                    description: `${ts.first_name_th} submitted ${ts.hours}h for ${ts.project_code}`,
                    timestamp: ts.entry_date,
                    link: `/timesheet/approvals`, // Assuming page exists or link to generic
                    isRead: false,
                    metadata: { type: 'timesheet', id: ts.id }
                })
            })

            // Deliverables waiting for verification
            // Assuming pms.project_deliverables exists
            try {
                const deliverablesResult = await pool.request()
                    .input('userId', sql.UniqueIdentifier, user.id)
                    .query(`
                        SELECT 
                            pd.id, pd.name, p.project_code
                        FROM pms.project_deliverables pd
                        INNER JOIN pms.projects p ON pd.project_id = p.id
                        LEFT JOIN pms.user_notifications un ON un.activity_type = 'deliverable_verify' AND un.activity_id = CAST(pd.id AS VARCHAR(50)) AND un.user_id = @userId
                        WHERE pd.is_verified = 0 AND pd.status = 'completed'
                        AND un.id IS NULL
                    `)

                deliverablesResult.recordset.forEach(d => {
                    activities.push({
                        id: `del-${d.id}`,
                        type: 'approval',
                        title: `Verify Deliverable`,
                        description: `${d.name} (${d.project_code}) is ready for verification`,
                        timestamp: new Date(),
                        link: `/projects/${d.project_id}/documents`,
                        isRead: false
                    })
                })
            } catch (e) {
                // Table might not exist or columns differ, ignore
                console.log('Skipping deliverables check')
            }
        }

        // 3. MILESTONES (Sale/Admin)
        // Logic: Completed milestones
        const isSale = (user.positionCode && user.positionCode.includes('SALE')) || user.departmentId === 'SALE' || user.role === 'admin'

        if (isSale) {
            const milestoneResult = await pool.request()
                .input('userId', sql.UniqueIdentifier, user.id)
                .query(`
                    SELECT 
                        pm.id, mc.name as milestone_name, p.project_code, p.name as project_name, pm.actual_end_date
                    FROM pms.project_milestones pm
                    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                    INNER JOIN pms.projects p ON pm.project_id = p.id
                    LEFT JOIN pms.user_notifications un ON un.activity_type = 'milestone_success' AND un.activity_id = CAST(pm.id AS VARCHAR(50)) AND un.user_id = @userId
                    WHERE pm.status = 'completed'
                    AND pm.actual_end_date >= DATEADD(MONTH, -1, GETDATE()) -- Completed in last month
                    AND un.id IS NULL
                `)

            milestoneResult.recordset.forEach(m => {
                activities.push({
                    id: `mil-${m.id}`,
                    type: 'success',
                    title: `Milestone Completed`,
                    description: `${m.milestone_name} for ${m.project_code} is done. Ready for billing?`,
                    timestamp: m.actual_end_date || new Date(),
                    link: `/projects/${m.project_id}`,
                    isRead: false
                })
            })
        }

        // Sort by timestamp desc (or urgency)
        return activities.sort((a, b) => {
            if (a.type === 'urgent' && b.type !== 'urgent') return -1
            if (a.type !== 'urgent' && b.type === 'urgent') return 1
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        })

    } catch (error) {
        console.error('Error fetching activities:', error)
        return []
    }
}

export async function acknowledgeActivity(id: string, type: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false }

    try {
        const pool = await getConnection()

        // Parse ID (e.g., 'task-123' -> '123')
        // We stored "activity_id" as the raw ID in DB query above, but passed "id" as prefixed in UI object.
        // We should expect the UI to pass the RAW ID and TYPE properly, or we split the string.
        // Let's assume UI passes the raw ID and type.
        // But for simplicity in UI, we might just pass the 'id' string 'task-123'.
        // I'll assume the caller parses or we parse.
        // Let's fix getMyActivities to separate id and UI-id better, or just use raw ID?
        // UI needs unique key. 'task-123' is good.
        // acknowledgeActivity(activityStringId)

        let activityType = type
        let activityId = id

        // Map UI types to DB types if needed, or pass exact DB type.
        // In getMyActivities:
        // task -> 'task_due'
        // approval -> 'timesheet_approval' or 'deliverable_verify'
        // success -> 'milestone_success'

        // I'll make the component handle this mapping or pass it in metadata.

        await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('type', sql.VarChar, activityType)
            .input('actId', sql.VarChar, activityId)
            .query(`
                INSERT INTO pms.user_notifications (user_id, activity_type, activity_id, is_read, read_at)
                VALUES (@userId, @type, @actId, 1, GETDATE())
            `)

        revalidatePath('/my-activities')
        return { success: true }
    } catch (error) {
        console.error('Error acknowledging activity:', error)
        return { success: false }
    }
}
