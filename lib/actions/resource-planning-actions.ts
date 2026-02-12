'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface ResourceProject {
    id: string
    project_code: string
    name: string
    customer_id: string | null
    customer_name: string
    project_manager_id: string | null
    project_manager_name: string
    owner_id: string | null
    owner_name: string
    status_id: string | null
    status_code: string
    current_milestone_config_id: string | null
    project_year: number | null
    start_date: string | null
    end_date: string | null
    sold_mandays: number
    milestones: ResourceMilestone[]
}

export interface ResourceMilestone {
    id: string
    milestone_config_id: string
    milestone_code: string
    milestone_name: string
    milestone_color: string
    due_date: string | null
    sort_order: number
    planned_mandays: number
    resources: MilestoneResource[]
}

export interface MilestoneResource {
    id: string
    employee_id: string
    employee_name: string
    employee_nickname: string
    position_code: string
    role: string
    start_date: string
    end_date: string
    working_days: number
    notes: string | null
    source_type: 'PM' | 'PLAN' // PM = PM planned, PLAN = actual task assignment
    date_ranges?: { start_date: string; end_date: string }[] // For PLAN: multiple task date ranges
}

export interface EmployeeAllocation {
    employee_id: string
    employee_code: string
    employee_name: string
    employee_nickname: string
    position_code: string
    position_name: string
    total_working_days: number
    assignments: {
        project_code: string
        project_name: string
        milestone_name: string
        role: string
        start_date: string
        end_date: string
        working_days: number
        source_type?: 'PM' | 'PLAN'
    }[]
}

export interface ResourceConflict {
    employee_id: string
    employee_name: string
    employee_nickname: string
    resource_a_id: string
    project_a_code: string
    project_a_name: string
    milestone_a_name: string
    a_start_date: string
    a_end_date: string
    a_role: string
    resource_b_id: string
    project_b_code: string
    project_b_name: string
    milestone_b_name: string
    b_start_date: string
    b_end_date: string
    b_role: string
    overlap_days: number
}

export interface ResourceEmployee {
    id: string
    employee_code: string
    employee_name: string
    nickname: string
    position_code: string
    position_name: string
}

export interface ResourcePlanningData {
    projects: ResourceProject[]
    allocations: EmployeeAllocation[]
    conflicts: ResourceConflict[]
    employees: ResourceEmployee[]
}

// ============================================
// 1. Get DEV projects with milestones
// ============================================
export async function getDevProjectsWithMilestones(): Promise<{
    success: boolean
    data?: ResourceProject[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        // Get DEV projects
        const projectResult = await pool.request().query(`
            SELECT
                p.id,
                p.project_code,
                p.name,
                p.customer_id,
                ISNULL(c.name, '-') AS customer_name,
                p.project_manager_id,
                ISNULL(NULLIF(CONCAT(pm_emp.first_name_th, ' ', pm_emp.last_name_th), ' '),
                       CONCAT(pm_emp.first_name, ' ', pm_emp.last_name)) AS project_manager_name,
                p.project_owner_id AS owner_id,
                ISNULL(NULLIF(CONCAT(own_emp.first_name_th, ' ', own_emp.last_name_th), ' '),
                       CONCAT(own_emp.first_name, ' ', own_emp.last_name)) AS owner_name,
                p.status_id,
                ISNULL(psc.code, '-') AS status_code,
                (SELECT cpm.milestone_config_id FROM pms.project_milestones cpm WHERE cpm.id = p.current_milestone_id) AS current_milestone_config_id,
                p.project_year,
                (SELECT MIN(pm2.due_date) FROM pms.project_milestones pm2 WHERE pm2.project_id = p.id AND pm2.due_date IS NOT NULL) AS start_date,
                (SELECT MAX(pm2.due_date) FROM pms.project_milestones pm2 WHERE pm2.project_id = p.id AND pm2.due_date IS NOT NULL) AS end_date,
                ISNULL(p.sold_mandays, 0) AS sold_mandays
            FROM pms.projects p
            INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
            LEFT JOIN pms.customers c ON c.id = p.customer_id
            LEFT JOIN pms.employees pm_emp ON pm_emp.id = p.project_manager_id
            LEFT JOIN pms.employees own_emp ON own_emp.id = p.project_owner_id
            LEFT JOIN pms.project_status_configs psc ON psc.id = p.status_id
            WHERE pt.code = 'DEV'
              AND p.is_active = 1
            ORDER BY p.project_code DESC
        `)

        if (projectResult.recordset.length === 0) {
            return { success: true, data: [] }
        }

        const projectIds = projectResult.recordset.map((p: any) => p.id)

        // Get milestones for all projects
        const milestoneResult = await pool.request().query(`
            SELECT
                pm.id,
                pm.project_id,
                pm.milestone_config_id,
                mc.code AS milestone_code,
                mc.name AS milestone_name,
                mc.color AS milestone_color,
                pm.due_date,
                mc.sort_order,
                ISNULL(pm.planned_mandays, 0) AS planned_mandays
            FROM pms.project_milestones pm
            INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
            WHERE pm.project_id IN (${projectIds.map((_: string, i: number) => `'${projectIds[i]}'`).join(',')})
            ORDER BY mc.sort_order
        `)

        const milestoneIds = milestoneResult.recordset.map((m: any) => m.id)

        // Get PM-planned resources for all milestones (table may not exist yet)
        let pmResources: any[] = []
        if (milestoneIds.length > 0) {
            try {
                const resourceResult = await pool.request().query(`
                    SELECT
                        mr.id,
                        mr.project_milestone_id,
                        mr.employee_id,
                        ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                               CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                        ISNULL(e.nickname, '') AS employee_nickname,
                        ISNULL(pos.code, '-') AS position_code,
                        mr.role,
                        mr.start_date,
                        mr.end_date,
                        mr.working_days,
                        mr.notes
                    FROM pms.milestone_resources mr
                    INNER JOIN pms.employees e ON mr.employee_id = e.id
                    LEFT JOIN pms.positions pos ON e.position_id = pos.id
                    WHERE mr.project_milestone_id IN (${milestoneIds.map((id: string) => `'${id}'`).join(',')})
                    ORDER BY mr.role, e.first_name_th
                `)
                pmResources = resourceResult.recordset
            } catch {
                // Table milestone_resources may not exist yet
            }
        }

        // Get PLAN resources from tasks (actual employee assignments with dates + hours)
        let taskResources: any[] = []
        if (milestoneIds.length > 0) {
            try {
                const taskResult = await pool.request().query(`
                    SELECT
                        t.id,
                        s.milestone_id AS project_milestone_id,
                        t.assignee_id AS employee_id,
                        ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                               CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                        ISNULL(e.nickname, '') AS employee_nickname,
                        ISNULL(pos.code, '-') AS position_code,
                        ISNULL(t.start_date, t.due_date) AS start_date,
                        ISNULL(t.due_date, t.start_date) AS end_date,
                        ISNULL(t.actual_hours, 0) AS actual_hours,
                        ISNULL(t.estimated_hours, 0) AS estimated_hours,
                        t.title AS notes
                    FROM pms.tasks t
                    INNER JOIN pms.stories s ON t.story_id = s.id
                    INNER JOIN pms.employees e ON t.assignee_id = e.id
                    LEFT JOIN pms.positions pos ON e.position_id = pos.id
                    WHERE s.milestone_id IN (${milestoneIds.map((id: string) => `'${id}'`).join(',')})
                      AND t.assignee_id IS NOT NULL
                      AND (t.start_date IS NOT NULL OR t.due_date IS NOT NULL)
                      AND t.status NOT IN ('cancelled')
                      AND t.is_active = 1
                    ORDER BY pos.code, e.first_name_th
                `)
                taskResources = taskResult.recordset
            } catch {
                // tasks/stories tables may have different structure
            }
        }

        // Build resource map by milestone (merge PM + PLAN)
        const resourceMap = new Map<string, MilestoneResource[]>()

        // Add PM resources (1 row per entry)
        for (const r of pmResources) {
            const msId = r.project_milestone_id
            if (!resourceMap.has(msId)) resourceMap.set(msId, [])
            resourceMap.get(msId)!.push({
                id: r.id,
                employee_id: r.employee_id,
                employee_name: r.employee_name,
                employee_nickname: r.employee_nickname,
                position_code: r.position_code,
                role: r.role,
                start_date: r.start_date,
                end_date: r.end_date,
                working_days: r.working_days,
                notes: r.notes,
                source_type: 'PM',
            })
        }

        // Add PLAN resources (group by employee+milestone → 1 row per person per milestone)
        // Use actual_hours/8 for mandays (fall back to estimated_hours/8)
        const planGroupMap = new Map<string, {
            first: any
            ranges: { start_date: string; end_date: string }[]
            totalActualHours: number
            totalEstimatedHours: number
            taskCount: number
        }>()
        for (const t of taskResources) {
            const key = `${t.project_milestone_id}_${t.employee_id}`
            if (!planGroupMap.has(key)) {
                planGroupMap.set(key, {
                    first: t,
                    ranges: [],
                    totalActualHours: 0,
                    totalEstimatedHours: 0,
                    taskCount: 0,
                })
            }
            const group = planGroupMap.get(key)!
            group.ranges.push({ start_date: t.start_date, end_date: t.end_date })
            group.totalActualHours += t.actual_hours || 0
            group.totalEstimatedHours += t.estimated_hours || 0
            group.taskCount++
        }

        for (const [, group] of planGroupMap) {
            const t = group.first
            const msId = t.project_milestone_id
            // Overall min/max for summary
            const allStarts = group.ranges.map(r => new Date(r.start_date).getTime())
            const allEnds = group.ranges.map(r => new Date(r.end_date).getTime())
            const minStart = new Date(Math.min(...allStarts)).toISOString()
            const maxEnd = new Date(Math.max(...allEnds)).toISOString()

            // Calculate mandays: prefer actual_hours, fallback to estimated_hours, then count unique days
            const totalHours = group.totalActualHours > 0 ? group.totalActualHours : group.totalEstimatedHours
            // Convert hours to mandays (1 MD = 8 hours), round to 2 decimals
            const mandays = totalHours > 0
                ? Math.round((totalHours / 8) * 100) / 100
                : 0

            if (!resourceMap.has(msId)) resourceMap.set(msId, [])
            resourceMap.get(msId)!.push({
                id: t.id,
                employee_id: t.employee_id,
                employee_name: t.employee_name,
                employee_nickname: t.employee_nickname,
                position_code: t.position_code,
                role: t.position_code,
                start_date: minStart,
                end_date: maxEnd,
                working_days: mandays,
                notes: `${group.taskCount} tasks`,
                source_type: 'PLAN',
                date_ranges: group.ranges,
            })
        }

        // Build milestone map by project
        const milestoneMap = new Map<string, ResourceMilestone[]>()
        for (const m of milestoneResult.recordset) {
            const projId = m.project_id
            if (!milestoneMap.has(projId)) milestoneMap.set(projId, [])
            milestoneMap.get(projId)!.push({
                id: m.id,
                milestone_config_id: m.milestone_config_id,
                milestone_code: m.milestone_code,
                milestone_name: m.milestone_name,
                milestone_color: m.milestone_color,
                due_date: m.due_date,
                sort_order: m.sort_order,
                planned_mandays: m.planned_mandays,
                resources: resourceMap.get(m.id) || [],
            })
        }

        // Build final projects
        const projects: ResourceProject[] = projectResult.recordset.map((p: any) => ({
            id: p.id,
            project_code: p.project_code,
            name: p.name,
            customer_id: p.customer_id,
            customer_name: p.customer_name,
            project_manager_id: p.project_manager_id,
            project_manager_name: p.project_manager_name,
            owner_id: p.owner_id,
            owner_name: p.owner_name || '-',
            status_id: p.status_id,
            status_code: p.status_code,
            current_milestone_config_id: p.current_milestone_config_id,
            project_year: p.project_year,
            start_date: p.start_date,
            end_date: p.end_date,
            sold_mandays: p.sold_mandays,
            milestones: milestoneMap.get(p.id) || [],
        }))

        return { success: true, data: projects }
    } catch (error) {
        console.error('Error fetching dev projects with milestones:', error)
        const msg = error instanceof Error ? error.message : String(error)
        return { success: false, error: `Failed to fetch projects: ${msg}` }
    }
}

// ============================================
// 2. Get milestone resources
// ============================================
export async function getMilestoneResources(milestoneId: string): Promise<{
    success: boolean
    data?: MilestoneResource[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .query(`
                SELECT
                    mr.id,
                    mr.employee_id,
                    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                           CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                    ISNULL(e.nickname, '') AS employee_nickname,
                    ISNULL(pos.code, '-') AS position_code,
                    mr.role,
                    mr.start_date,
                    mr.end_date,
                    mr.working_days,
                    mr.notes
                FROM pms.milestone_resources mr
                INNER JOIN pms.employees e ON mr.employee_id = e.id
                LEFT JOIN pms.positions pos ON e.position_id = pos.id
                WHERE mr.project_milestone_id = @milestoneId
                ORDER BY mr.role, e.first_name_th
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching milestone resources:', error)
        return { success: false, error: 'Failed to fetch resources' }
    }
}

// ============================================
// 3. Add milestone resource
// ============================================
export async function addMilestoneResource(data: {
    project_milestone_id: string
    employee_id: string
    role: string
    start_date: string
    end_date: string
    working_days: number
    notes?: string
}): Promise<{ success: boolean; data?: { id: string }; conflict?: ResourceConflict; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // Check for conflict
        const conflictResult = await pool.request()
            .input('employeeId', sql.UniqueIdentifier, data.employee_id)
            .input('startDate', sql.Date, data.start_date)
            .input('endDate', sql.Date, data.end_date)
            .input('milestoneId', sql.UniqueIdentifier, data.project_milestone_id)
            .query(`
                SELECT TOP 1
                    mr.id,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    mr.start_date,
                    mr.end_date,
                    mr.role
                FROM pms.milestone_resources mr
                INNER JOIN pms.project_milestones pm ON mr.project_milestone_id = pm.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                WHERE mr.employee_id = @employeeId
                  AND mr.start_date <= @endDate
                  AND mr.end_date >= @startDate
                  AND mr.project_milestone_id != @milestoneId
            `)

        // Insert resource (even if conflict exists, just warn)
        const insertResult = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, data.project_milestone_id)
            .input('employeeId', sql.UniqueIdentifier, data.employee_id)
            .input('role', sql.NVarChar(20), data.role)
            .input('startDate', sql.Date, data.start_date)
            .input('endDate', sql.Date, data.end_date)
            .input('workingDays', sql.Int, data.working_days)
            .input('notes', sql.NVarChar(500), data.notes || null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.milestone_resources
                    (project_milestone_id, employee_id, role, start_date, end_date, working_days, notes, created_by)
                OUTPUT INSERTED.id
                VALUES
                    (@milestoneId, @employeeId, @role, @startDate, @endDate, @workingDays, @notes, @createdBy)
            `)

        const newId = insertResult.recordset[0].id

        revalidatePath('/resource-planning')

        // Return conflict warning if exists
        if (conflictResult.recordset.length > 0) {
            const c = conflictResult.recordset[0]
            return {
                success: true,
                data: { id: newId },
                conflict: {
                    employee_id: data.employee_id,
                    employee_name: '',
                    employee_nickname: '',
                    resource_a_id: newId,
                    project_a_code: c.project_code,
                    project_a_name: c.project_name,
                    milestone_a_name: c.milestone_name,
                    a_start_date: c.start_date,
                    a_end_date: c.end_date,
                    a_role: c.role,
                    resource_b_id: c.id,
                    project_b_code: '',
                    project_b_name: '',
                    milestone_b_name: '',
                    b_start_date: data.start_date,
                    b_end_date: data.end_date,
                    b_role: data.role,
                    overlap_days: 0,
                }
            }
        }

        return { success: true, data: { id: newId } }
    } catch (error) {
        console.error('Error adding milestone resource:', error)
        return { success: false, error: 'Failed to add resource' }
    }
}

// ============================================
// 4. Update milestone resource
// ============================================
export async function updateMilestoneResource(
    resourceId: string,
    data: {
        role?: string
        start_date?: string
        end_date?: string
        working_days?: number
        notes?: string
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        const setClauses: string[] = ['updated_at = GETDATE()']
        const request = pool.request().input('id', sql.UniqueIdentifier, resourceId)

        if (data.role !== undefined) {
            setClauses.push('role = @role')
            request.input('role', sql.NVarChar(20), data.role)
        }
        if (data.start_date !== undefined) {
            setClauses.push('start_date = @startDate')
            request.input('startDate', sql.Date, data.start_date)
        }
        if (data.end_date !== undefined) {
            setClauses.push('end_date = @endDate')
            request.input('endDate', sql.Date, data.end_date)
        }
        if (data.working_days !== undefined) {
            setClauses.push('working_days = @workingDays')
            request.input('workingDays', sql.Int, data.working_days)
        }
        if (data.notes !== undefined) {
            setClauses.push('notes = @notes')
            request.input('notes', sql.NVarChar(500), data.notes)
        }

        await request.query(`
            UPDATE pms.milestone_resources
            SET ${setClauses.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/resource-planning')
        return { success: true }
    } catch (error) {
        console.error('Error updating milestone resource:', error)
        return { success: false, error: 'Failed to update resource' }
    }
}

// ============================================
// 5. Remove milestone resource
// ============================================
export async function removeMilestoneResource(resourceId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, resourceId)
            .query(`DELETE FROM pms.milestone_resources WHERE id = @id`)

        revalidatePath('/resource-planning')
        return { success: true }
    } catch (error) {
        console.error('Error removing milestone resource:', error)
        return { success: false, error: 'Failed to remove resource' }
    }
}

// ============================================
// 6. Get employee allocations (PM + PLAN)
// ============================================
export async function getEmployeeAllocations(startDate?: string, endDate?: string): Promise<{
    success: boolean
    data?: EmployeeAllocation[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const empMap = new Map<string, EmployeeAllocation>()

        // Helper to add to map
        const addToMap = (r: any) => {
            if (!empMap.has(r.employee_id)) {
                empMap.set(r.employee_id, {
                    employee_id: r.employee_id,
                    employee_code: r.employee_code || '',
                    employee_name: r.employee_name,
                    employee_nickname: r.employee_nickname,
                    position_code: r.position_code,
                    position_name: r.position_name,
                    total_working_days: 0,
                    assignments: [],
                })
            }
            const emp = empMap.get(r.employee_id)!
            emp.total_working_days += r.working_days
            emp.assignments.push({
                project_code: r.project_code,
                project_name: r.project_name,
                milestone_name: r.milestone_name,
                role: r.role,
                start_date: r.start_date,
                end_date: r.end_date,
                working_days: r.working_days,
                source_type: r.source_type,
            })
        }

        // 1) PM resources from milestone_resources table
        try {
            let dateFilter = ''
            const request = pool.request()
            if (startDate && endDate) {
                dateFilter = 'AND mr.start_date <= @endDate AND mr.end_date >= @startDate'
                request.input('startDate', sql.Date, startDate)
                request.input('endDate', sql.Date, endDate)
            }

            const result = await request.query(`
                SELECT
                    mr.employee_id,
                    e.employee_code,
                    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                           CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                    ISNULL(e.nickname, '') AS employee_nickname,
                    ISNULL(pos.code, '-') AS position_code,
                    ISNULL(pos.name, '-') AS position_name,
                    mr.working_days,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    mr.role,
                    mr.start_date,
                    mr.end_date,
                    'PM' AS source_type
                FROM pms.milestone_resources mr
                INNER JOIN pms.employees e ON mr.employee_id = e.id
                LEFT JOIN pms.positions pos ON e.position_id = pos.id
                INNER JOIN pms.project_milestones pm ON mr.project_milestone_id = pm.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                WHERE e.is_active = 1
                ${dateFilter}
                ORDER BY e.first_name_th, mr.start_date
            `)

            for (const r of result.recordset) {
                addToMap(r)
            }
        } catch {
            // milestone_resources table may not exist yet
        }

        // 2) PLAN resources from tasks (grouped by employee + project + milestone)
        try {
            let taskDateFilter = ''
            const taskRequest = pool.request()
            if (startDate && endDate) {
                taskDateFilter = 'AND ISNULL(t.start_date, t.due_date) <= @endDate2 AND ISNULL(t.due_date, t.start_date) >= @startDate2'
                taskRequest.input('startDate2', sql.Date, startDate)
                taskRequest.input('endDate2', sql.Date, endDate)
            }

            const taskResult = await taskRequest.query(`
                SELECT
                    t.assignee_id AS employee_id,
                    e.employee_code,
                    ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                           CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                    ISNULL(e.nickname, '') AS employee_nickname,
                    ISNULL(pos.code, '-') AS position_code,
                    ISNULL(pos.name, '-') AS position_name,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    ISNULL(pos.code, '-') AS role,
                    MIN(ISNULL(t.start_date, t.due_date)) AS start_date,
                    MAX(ISNULL(t.due_date, t.start_date)) AS end_date,
                    ROUND(SUM(CASE WHEN ISNULL(t.actual_hours, 0) > 0 THEN t.actual_hours ELSE ISNULL(t.estimated_hours, 0) END) / 8.0, 2) AS working_days,
                    COUNT(*) AS task_count,
                    'PLAN' AS source_type
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                INNER JOIN pms.project_milestones pm ON s.milestone_id = pm.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                INNER JOIN pms.project_types pt ON pt.id = p.project_type_id
                INNER JOIN pms.employees e ON t.assignee_id = e.id
                LEFT JOIN pms.positions pos ON e.position_id = pos.id
                WHERE pt.code = 'DEV'
                  AND p.is_active = 1
                  AND t.assignee_id IS NOT NULL
                  AND (t.start_date IS NOT NULL OR t.due_date IS NOT NULL)
                  AND t.status NOT IN ('cancelled')
                  AND t.is_active = 1
                  AND e.is_active = 1
                  ${taskDateFilter}
                GROUP BY
                    t.assignee_id, e.employee_code, e.first_name_th, e.last_name_th, e.first_name, e.last_name,
                    e.nickname, pos.code, pos.name, p.project_code, p.name, mc.name, s.milestone_id
                ORDER BY e.first_name_th
            `)

            for (const r of taskResult.recordset) {
                addToMap(r)
            }
        } catch {
            // tasks/stories may not exist
        }

        return { success: true, data: Array.from(empMap.values()) }
    } catch (error) {
        console.error('Error fetching employee allocations:', error)
        return { success: true, data: [] }
    }
}

// ============================================
// 7. Get resource conflicts
// ============================================
export async function getResourceConflicts(): Promise<{
    success: boolean
    data?: ResourceConflict[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT * FROM pms.vw_employee_resource_conflicts
            ORDER BY employee_name, a_start_date
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        // View may not exist yet - return empty
        console.error('Error fetching resource conflicts:', error)
        return { success: true, data: [] }
    }
}

// ============================================
// 8. Get all resource employees (SA, BA, PG)
// ============================================
export async function getAllResourceEmployees(): Promise<{
    success: boolean
    data?: ResourceEmployee[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT
                e.id,
                e.employee_code,
                ISNULL(NULLIF(CONCAT(e.first_name_th, ' ', e.last_name_th), ' '),
                       CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
                ISNULL(e.nickname, '') AS nickname,
                ISNULL(pos.code, '-') AS position_code,
                ISNULL(pos.name, '-') AS position_name
            FROM pms.employees e
            LEFT JOIN pms.positions pos ON e.position_id = pos.id
            WHERE e.is_active = 1
              AND pos.code IN ('SA', 'BA', 'PG')
            ORDER BY pos.code, e.first_name_th
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching resource employees:', error)
        return { success: false, error: 'Failed to fetch employees' }
    }
}

// ============================================
// 9. Get tasks for employee in a milestone (for popup detail)
// ============================================
export interface MilestoneEmployeeTask {
    id: string
    title: string
    status: string
    start_date: string | null
    due_date: string | null
    completed_date: string | null
    estimated_hours: number
    actual_hours: number
    story_name: string
}

export async function getMilestoneEmployeeTasks(milestoneId: string, employeeId: string): Promise<{
    success: boolean
    data?: MilestoneEmployeeTask[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('milestoneId', sql.UniqueIdentifier, milestoneId)
            .input('employeeId', sql.UniqueIdentifier, employeeId)
            .query(`
                SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.start_date,
                    t.due_date,
                    t.completed_date,
                    ISNULL(t.estimated_hours, 0) AS estimated_hours,
                    ISNULL(t.actual_hours, 0) AS actual_hours,
                    ISNULL(s.title, '-') AS story_name
                FROM pms.tasks t
                INNER JOIN pms.stories s ON t.story_id = s.id
                WHERE s.milestone_id = @milestoneId
                  AND t.assignee_id = @employeeId
                  AND t.is_active = 1
                  AND t.status NOT IN ('cancelled')
                ORDER BY t.due_date, t.start_date, t.title
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching milestone employee tasks:', error)
        return { success: false, error: 'Failed to fetch tasks' }
    }
}

// ============================================
// 10. Get all resource planning data (wrapper)
// ============================================
export async function getResourcePlanningData(startDate?: string, endDate?: string): Promise<{
    success: boolean
    data?: ResourcePlanningData
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const [projectsResult, allocationsResult, conflictsResult, employeesResult] = await Promise.all([
            getDevProjectsWithMilestones(),
            getEmployeeAllocations(startDate, endDate),
            getResourceConflicts(),
            getAllResourceEmployees(),
        ])

        if (!projectsResult.success) return { success: false, error: projectsResult.error }
        if (!allocationsResult.success) return { success: false, error: allocationsResult.error }
        if (!conflictsResult.success) return { success: false, error: conflictsResult.error }
        if (!employeesResult.success) return { success: false, error: employeesResult.error }

        return {
            success: true,
            data: {
                projects: projectsResult.data || [],
                allocations: allocationsResult.data || [],
                conflicts: conflictsResult.data || [],
                employees: employeesResult.data || [],
            }
        }
    } catch (error) {
        console.error('Error fetching resource planning data:', error)
        return { success: false, error: 'Failed to fetch resource planning data' }
    }
}
