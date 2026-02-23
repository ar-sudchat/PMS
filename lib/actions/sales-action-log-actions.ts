'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface ActionTypeConfig {
    id: number
    type_code: string
    type_name: string
    icon: string
    color: string
    sort_order: number
}

export interface ActionLog {
    log_id: string
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    action_type: string
    action_type_name: string
    action_icon: string
    action_color: string
    action_date: string
    title: string
    description: string
    contact_person: string
    contact_role: string
    participants: string
    old_status: string
    new_status: string
    has_attachment: boolean
    is_auto_generated: boolean
    attachment_count: number
    created_by: string
    created_by_name: string
    created_at: string
}

export interface SalesTask {
    task_id: string
    project_id: string
    project_code: string
    project_name: string
    customer_name: string
    title: string
    description: string
    task_type: string
    task_type_name: string
    task_icon: string
    task_color: string
    due_date: string
    due_time: string
    contact_person: string
    contact_role: string
    contact_phone: string
    location: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    due_status: 'DONE' | 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'CANCELLED'
    days_until_due: number
    is_synced_to_calendar: boolean
    assigned_to: string
    assigned_to_name: string
    completed_at: string
    completed_by_name: string
    completion_notes: string
    created_by_name: string
    created_at: string
}

export interface ProjectHealth {
    project_id: string
    project_code: string
    project_name: string
    project_status: string
    customer_name: string
    project_manager_id: string
    project_manager_name: string
    last_activity_date: string
    last_activity_type: string
    last_activity_title: string
    days_since_activity: number
    health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    pending_tasks_count: number
}

export interface TodoDashboardSummary {
    today_count: number
    overdue_count: number
    this_week_count: number
    pending_count: number
    completed_today_count: number
    no_activity_count: number
}

export interface TodoFilters {
    year?: number
    projectTypeId?: string
    customerId?: string
    managerId?: string
    ownerId?: string
    statusId?: string
    assigneeId?: string
    search?: string
    healthDays?: number // 0 = all, 7 = 7+ days, 14 = 14+ days, 30 = 30+ days
}

// ============================================
// Action Types
// ============================================

export async function getActionTypes(): Promise<ActionTypeConfig[]> {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`SELECT * FROM pms.action_type_configs WHERE is_active = 1 ORDER BY sort_order`)
    return result.recordset
}

// ============================================
// Action Logs CRUD
// ============================================

export async function getProjectActionLogs(projectId: string): Promise<ActionLog[]> {
    const pool = await getConnection()
    const result = await pool.request()
        .input('project_id', sql.UniqueIdentifier, projectId)
        .query(`SELECT * FROM pms.vw_project_action_logs WHERE project_id = @project_id ORDER BY action_date DESC`)
    return result.recordset
}

export async function createActionLog(data: {
    projectId: string
    actionType: string
    actionDate?: string
    title: string
    description?: string
    contactPerson?: string
    contactRole?: string
    participants?: string
    actionResult?: string
    followUpDate?: string
    followUpTitle?: string
}): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.projectId)
            .input('action_type', sql.NVarChar, data.actionType)
            .input('action_date', sql.DateTime2, data.actionDate || new Date())
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('contact_person', sql.NVarChar, data.contactPerson || null)
            .input('contact_role', sql.NVarChar, data.contactRole || null)
            .input('participants', sql.NVarChar, data.participants || null)
            .input('new_status', sql.NVarChar, data.actionResult || null)
            .input('created_by', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.project_action_logs
                  (project_id, action_type, action_date, title, description,
                   contact_person, contact_role, participants, new_status, created_by)
                OUTPUT INSERTED.id
                VALUES
                  (@project_id, @action_type, @action_date, @title, @description,
                   @contact_person, @contact_role, @participants, @new_status, @created_by)
            `)

        // Create follow-up task if needed
        if (data.followUpDate && ['FOLLOW_UP', 'WAITING'].includes(data.actionResult || '')) {
            const taskTitle = data.followUpTitle || `ติดตาม: ${data.title}`
            await pool.request()
                .input('project_id', sql.UniqueIdentifier, data.projectId)
                .input('title', sql.NVarChar, taskTitle)
                .input('description', sql.NVarChar, data.description || null)
                .input('task_type', sql.NVarChar, data.actionType)
                .input('due_date', sql.Date, data.followUpDate)
                .input('contact_person', sql.NVarChar, data.contactPerson || null)
                .input('contact_role', sql.NVarChar, data.contactRole || null)
                .input('priority', sql.NVarChar, 'MEDIUM')
                .input('assigned_to', sql.UniqueIdentifier, user.id)
                .input('created_by', sql.UniqueIdentifier, user.id)
                .query(`
                    INSERT INTO pms.project_tasks_sales
                      (project_id, title, description, task_type, due_date,
                       contact_person, contact_role, priority, assigned_to, created_by)
                    VALUES
                      (@project_id, @title, @description, @task_type, @due_date,
                       @contact_person, @contact_role, @priority, @assigned_to, @created_by)
                `)
        }

        revalidatePath('/sale')
        return { success: true, logId: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create action log error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateActionLog(logId: string, data: {
    actionType: string
    actionDate?: string
    title: string
    description?: string
    contactPerson?: string
    contactRole?: string
    participants?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, logId)
            .input('action_type', sql.NVarChar, data.actionType)
            .input('action_date', sql.DateTime2, data.actionDate || new Date())
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('contact_person', sql.NVarChar, data.contactPerson || null)
            .input('contact_role', sql.NVarChar, data.contactRole || null)
            .input('participants', sql.NVarChar, data.participants || null)
            .input('updated_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.project_action_logs SET
                    action_type = @action_type, action_date = @action_date,
                    title = @title, description = @description,
                    contact_person = @contact_person, contact_role = @contact_role,
                    participants = @participants, updated_by = @updated_by, updated_at = GETDATE()
                WHERE id = @id AND is_auto_generated = 0
            `)

        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteActionLog(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, logId)
            .query(`DELETE FROM pms.project_action_logs WHERE id = @id AND is_auto_generated = 0`)
        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ============================================
// Sales Tasks CRUD
// ============================================

export async function getProjectTasks(projectId: string): Promise<SalesTask[]> {
    const pool = await getConnection()
    const result = await pool.request()
        .input('project_id', sql.UniqueIdentifier, projectId)
        .query(`
            SELECT * FROM pms.vw_project_tasks_sales
            WHERE project_id = @project_id
            ORDER BY
                CASE status WHEN 'COMPLETED' THEN 1 WHEN 'CANCELLED' THEN 2 ELSE 0 END,
                due_date, due_time
        `)
    return result.recordset
}

export async function getMyTasks(): Promise<SalesTask[]> {
    const user = await getCurrentUser()
    if (!user) return []

    const pool = await getConnection()
    const result = await pool.request()
        .input('user_id', sql.UniqueIdentifier, user.id)
        .query(`
            SELECT * FROM pms.vw_project_tasks_sales
            WHERE assigned_to = @user_id AND status NOT IN ('CANCELLED')
            ORDER BY
                CASE status WHEN 'COMPLETED' THEN 1 ELSE 0 END,
                due_date, due_time
        `)
    return result.recordset
}

export async function createSalesTask(data: {
    projectId: string
    title: string
    description?: string
    taskType: string
    dueDate: string
    dueTime?: string
    contactPerson?: string
    contactRole?: string
    contactPhone?: string
    location?: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    assignedTo: string
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const result = await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.projectId)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('task_type', sql.NVarChar, data.taskType)
            .input('due_date', sql.Date, data.dueDate)
            .input('due_time', sql.NVarChar, data.dueTime || null)
            .input('contact_person', sql.NVarChar, data.contactPerson || null)
            .input('contact_role', sql.NVarChar, data.contactRole || null)
            .input('contact_phone', sql.NVarChar, data.contactPhone || null)
            .input('location', sql.NVarChar, data.location || null)
            .input('priority', sql.NVarChar, data.priority)
            .input('assigned_to', sql.UniqueIdentifier, data.assignedTo)
            .input('created_by', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.project_tasks_sales
                  (project_id, title, description, task_type, due_date, due_time,
                   contact_person, contact_role, contact_phone, location,
                   priority, assigned_to, created_by)
                OUTPUT INSERTED.id
                VALUES
                  (@project_id, @title, @description, @task_type, @due_date,
                   CASE WHEN @due_time IS NOT NULL AND @due_time != '' THEN CAST(@due_time AS TIME) ELSE NULL END,
                   @contact_person, @contact_role, @contact_phone, @location,
                   @priority, @assigned_to, @created_by)
            `)

        revalidatePath('/sale')
        return { success: true, taskId: result.recordset[0].id }
    } catch (error: any) {
        console.error('Create sales task error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateSalesTask(taskId: string, data: {
    title: string
    description?: string
    taskType: string
    dueDate: string
    dueTime?: string
    contactPerson?: string
    contactRole?: string
    contactPhone?: string
    location?: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    assignedTo: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, taskId)
            .input('title', sql.NVarChar, data.title)
            .input('description', sql.NVarChar, data.description || null)
            .input('task_type', sql.NVarChar, data.taskType)
            .input('due_date', sql.Date, data.dueDate)
            .input('due_time', sql.NVarChar, data.dueTime || null)
            .input('contact_person', sql.NVarChar, data.contactPerson || null)
            .input('contact_role', sql.NVarChar, data.contactRole || null)
            .input('contact_phone', sql.NVarChar, data.contactPhone || null)
            .input('location', sql.NVarChar, data.location || null)
            .input('priority', sql.NVarChar, data.priority)
            .input('assigned_to', sql.UniqueIdentifier, data.assignedTo)
            .input('updated_by', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.project_tasks_sales SET
                    title = @title, description = @description, task_type = @task_type,
                    due_date = @due_date,
                    due_time = CASE WHEN @due_time IS NOT NULL AND @due_time != '' THEN CAST(@due_time AS TIME) ELSE NULL END,
                    contact_person = @contact_person, contact_role = @contact_role,
                    contact_phone = @contact_phone, location = @location,
                    priority = @priority, assigned_to = @assigned_to,
                    updated_by = @updated_by, updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function completeTask(taskId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, taskId)
            .input('completed_by', sql.UniqueIdentifier, user.id)
            .input('notes', sql.NVarChar, notes || null)
            .query(`
                UPDATE pms.project_tasks_sales SET
                    status = 'COMPLETED', completed_at = GETDATE(),
                    completed_by = @completed_by, completion_notes = @notes, updated_at = GETDATE()
                WHERE id = @id
            `)
        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function reopenTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, taskId)
            .query(`
                UPDATE pms.project_tasks_sales SET
                    status = 'PENDING', completed_at = NULL, completed_by = NULL,
                    completion_notes = NULL, updated_at = GETDATE()
                WHERE id = @id
            `)
        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteSalesTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, taskId)
            .query(`DELETE FROM pms.project_tasks_sales WHERE id = @id`)
        revalidatePath('/sale')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ============================================
// Dashboard Data
// ============================================

export async function getTodoDashboardData(filters?: TodoFilters) {
    const user = await getCurrentUser()
    if (!user) return null

    const pool = await getConnection()

    // Helper: add filter parameters to a request
    const addFilterParams = (request: any) => {
        request
            .input('filter_year', sql.Int, filters?.year || null)
            .input('filter_type_id', sql.UniqueIdentifier, filters?.projectTypeId || null)
            .input('filter_customer_id', sql.UniqueIdentifier, filters?.customerId || null)
            .input('filter_manager_id', sql.UniqueIdentifier, filters?.managerId || null)
            .input('filter_owner_id', sql.UniqueIdentifier, filters?.ownerId || null)
            .input('filter_status_id', sql.UniqueIdentifier, filters?.statusId || null)
            .input('filter_assignee_id', sql.UniqueIdentifier, filters?.assigneeId || null)
            .input('filter_search', sql.NVarChar, filters?.search?.trim() || null)
            .input('filter_health_days', sql.Int, filters?.healthDays != null && filters.healthDays > 0 ? filters.healthDays : null)
        return request
    }

    // Common project filter WHERE clause (joined as p)
    const taskProjectFilter = `
        AND (@filter_year IS NULL OR p.project_year = @filter_year)
        AND (@filter_type_id IS NULL OR p.project_type_id = @filter_type_id)
        AND (@filter_customer_id IS NULL OR p.customer_id = @filter_customer_id)
        AND (@filter_manager_id IS NULL OR p.project_manager_id = @filter_manager_id)
        AND (@filter_owner_id IS NULL OR p.project_owner_id = @filter_owner_id)
        AND (@filter_status_id IS NULL OR p.status_id = @filter_status_id)
        AND (@filter_assignee_id IS NULL OR t.assigned_to = @filter_assignee_id)
        AND (@filter_search IS NULL OR t.project_code LIKE '%'+@filter_search+'%' OR t.project_name LIKE '%'+@filter_search+'%' OR t.title LIKE '%'+@filter_search+'%')
    `

    const healthProjectFilter = `
        AND (@filter_year IS NULL OR p.project_year = @filter_year)
        AND (@filter_type_id IS NULL OR p.project_type_id = @filter_type_id)
        AND (@filter_customer_id IS NULL OR p.customer_id = @filter_customer_id)
        AND (@filter_manager_id IS NULL OR h.project_manager_id = @filter_manager_id)
        AND (@filter_owner_id IS NULL OR p.project_owner_id = @filter_owner_id)
        AND (@filter_status_id IS NULL OR p.status_id = @filter_status_id)
        AND (@filter_search IS NULL OR h.project_code LIKE '%'+@filter_search+'%' OR h.project_name LIKE '%'+@filter_search+'%')
    `

    // Summary counts
    const summaryResult = await addFilterParams(pool.request())
        .query(`
            SELECT
                SUM(CASE WHEN t.due_status = 'TODAY' THEN 1 ELSE 0 END) AS today_count,
                SUM(CASE WHEN t.due_status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdue_count,
                SUM(CASE WHEN t.due_status IN ('TODAY','THIS_WEEK') THEN 1 ELSE 0 END) AS this_week_count,
                SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN t.status = 'COMPLETED' AND CAST(t.completed_at AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS completed_today_count
            FROM pms.vw_project_tasks_sales t
            INNER JOIN pms.projects p ON t.project_id = p.id
            WHERE t.status NOT IN ('CANCELLED')
            ${taskProjectFilter}
        `)

    // No activity projects count (always count 14+ days for summary card)
    const healthResult = await addFilterParams(pool.request())
        .query(`
            SELECT COUNT(*) AS no_activity_count
            FROM pms.vw_project_health h
            INNER JOIN pms.projects p ON h.project_id = p.id
            WHERE h.days_since_activity >= 14
            ${healthProjectFilter}
        `)

    // Today tasks
    const todayResult = await addFilterParams(pool.request())
        .query(`
            SELECT t.* FROM pms.vw_project_tasks_sales t
            INNER JOIN pms.projects p ON t.project_id = p.id
            WHERE t.due_status = 'TODAY' AND t.status NOT IN ('COMPLETED','CANCELLED')
            ${taskProjectFilter}
            ORDER BY t.due_time, t.priority DESC
        `)

    // Overdue tasks
    const overdueResult = await addFilterParams(pool.request())
        .query(`
            SELECT t.* FROM pms.vw_project_tasks_sales t
            INNER JOIN pms.projects p ON t.project_id = p.id
            WHERE t.due_status = 'OVERDUE' AND t.status NOT IN ('COMPLETED','CANCELLED')
            ${taskProjectFilter}
            ORDER BY t.due_date, t.priority DESC
        `)

    // This week tasks
    const weekResult = await addFilterParams(pool.request())
        .query(`
            SELECT t.* FROM pms.vw_project_tasks_sales t
            INNER JOIN pms.projects p ON t.project_id = p.id
            WHERE t.due_status IN ('TODAY','THIS_WEEK') AND t.status NOT IN ('COMPLETED','CANCELLED')
            ${taskProjectFilter}
            ORDER BY t.due_date, t.due_time, t.priority DESC
        `)

    // Health alerts - filter by healthDays (default: show all)
    const alertsResult = await addFilterParams(pool.request())
        .query(`
            SELECT h.* FROM pms.vw_project_health h
            INNER JOIN pms.projects p ON h.project_id = p.id
            WHERE 1=1
            AND (@filter_health_days IS NULL OR h.days_since_activity >= @filter_health_days)
            ${healthProjectFilter}
            ORDER BY h.days_since_activity DESC
        `)

    const s = summaryResult.recordset[0] || {}

    return {
        summary: {
            today_count: s.today_count || 0,
            overdue_count: s.overdue_count || 0,
            this_week_count: s.this_week_count || 0,
            pending_count: s.pending_count || 0,
            completed_today_count: s.completed_today_count || 0,
            no_activity_count: healthResult.recordset[0]?.no_activity_count || 0,
        } as TodoDashboardSummary,
        todayTasks: todayResult.recordset as SalesTask[],
        overdueTasks: overdueResult.recordset as SalesTask[],
        thisWeekTasks: weekResult.recordset as SalesTask[],
        healthAlerts: alertsResult.recordset as ProjectHealth[],
    }
}

// ============================================
// Get projects for dropdown
// ============================================

export async function getActiveProjects() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`
            SELECT p.id, p.project_code, p.name, c.name AS customer_name
            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            WHERE p.is_active = 1
            ORDER BY p.project_code
        `)
    return result.recordset
}

export async function getRecentActions(filters?: TodoFilters, limit: number = 20): Promise<ActionLog[]> {
    const user = await getCurrentUser()
    if (!user) return []

    const pool = await getConnection()
    const request = pool.request()
        .input('filter_year', sql.Int, filters?.year || null)
        .input('filter_type_id', sql.UniqueIdentifier, filters?.projectTypeId || null)
        .input('filter_customer_id', sql.UniqueIdentifier, filters?.customerId || null)
        .input('filter_status_id', sql.UniqueIdentifier, filters?.statusId || null)
        .input('filter_search', sql.NVarChar, filters?.search?.trim() || null)
        .input('limit', sql.Int, limit)

    const result = await request.query(`
        SELECT TOP (@limit) a.*
        FROM pms.vw_project_action_logs a
        INNER JOIN pms.projects p ON a.project_id = p.id
        WHERE 1=1
        AND (@filter_year IS NULL OR p.project_year = @filter_year)
        AND (@filter_type_id IS NULL OR p.project_type_id = @filter_type_id)
        AND (@filter_customer_id IS NULL OR p.customer_id = @filter_customer_id)
        AND (@filter_status_id IS NULL OR p.status_id = @filter_status_id)
        AND (@filter_search IS NULL OR a.project_code LIKE '%'+@filter_search+'%' OR a.project_name LIKE '%'+@filter_search+'%' OR a.title LIKE '%'+@filter_search+'%')
        ORDER BY a.action_date DESC, a.created_at DESC
    `)
    return result.recordset
}

export async function getEmployees() {
    const pool = await getConnection()
    const result = await pool.request()
        .query(`
            SELECT id, employee_code, first_name, last_name, nickname
            FROM pms.employees WHERE is_active = 1
            ORDER BY first_name
        `)
    return result.recordset
}
