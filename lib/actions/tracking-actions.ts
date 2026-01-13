'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'

// ============================================
// TYPES
// ============================================

export interface TrackingDeliverable {
    id: string
    name: string
    name_th?: string
    is_required: boolean
    submitted_date?: string
    is_verified: boolean
}

export interface TrackingMilestone {
    id: string
    code: string
    name: string
    name_th?: string
    color: string
    sort_order: number
    status: 'pending' | 'in_progress' | 'completed'
    due_date?: string
    completed_date?: string
    is_current: boolean
    is_delayed: boolean
    deliverables: TrackingDeliverable[]
}

export interface ProjectTrackingData {
    project: {
        id: string
        code: string
        name: string
        name_th?: string
        customer_name: string
        project_manager_name: string
        project_manager_avatar?: string
        project_owner_name?: string
        project_owner_position?: string
        current_milestone_name?: string
        status_name: string
        status_color: string
        progress_percent: number
    }
    milestones: TrackingMilestone[]
    summary: {
        total_milestones: number
        completed_milestones: number
        total_deliverables: number
        verified_deliverables: number
    }
}

// ============================================
// GET PROJECT TRACKING DATA
// ============================================

export async function getProjectTrackingData(projectId: string): Promise<{
    success: boolean
    data?: ProjectTrackingData
    error?: string
}> {
    try {
        const pool = await getConnection()

        // 1. ดึงข้อมูลโครงการ
        const projectResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    p.id,
                    p.project_code AS code,
                    p.name,
                    p.name_th,
                    c.name AS customer_name,
                    COALESCE(pm_emp.nickname, pm_emp.first_name_th, pm_emp.first_name) AS project_manager_name,
                    COALESCE(po_emp.nickname, po_emp.first_name_th, po_emp.first_name) AS project_owner_name,
                    pos.name AS project_owner_position,
                    psc.name AS status_name,
                    psc.color AS status_color,
                    mc.name AS current_milestone_name,
                    COALESCE(p.progress_percent, 0) AS progress_percent
                FROM pms.projects p
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                LEFT JOIN pms.employees pm_emp ON p.project_manager_id = pm_emp.id
                LEFT JOIN pms.employees po_emp ON p.project_owner_id = po_emp.id
                LEFT JOIN pms.positions pos ON po_emp.position_id = pos.id
                LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
                LEFT JOIN pms.project_milestones curr_pm ON p.current_milestone_id = curr_pm.id
                LEFT JOIN pms.milestone_configs mc ON curr_pm.milestone_config_id = mc.id
                WHERE p.id = @projectId AND p.is_active = 1
            `)

        if (projectResult.recordset.length === 0) {
            return { success: false, error: 'Project not found' }
        }

        const projectData = projectResult.recordset[0]

        // 2. ดึงข้อมูล Milestones
        const milestonesResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    pm.id,
                    mc.code,
                    mc.name,
                    mc.name_th,
                    mc.color,
                    mc.sort_order,
                    pm.status,
                    pm.due_date,
                    pm.completed_date,
                    CASE WHEN p.current_milestone_id = pm.id THEN 1 ELSE 0 END AS is_current,
                    CASE 
                        WHEN pm.status != 'completed' AND pm.due_date < CAST(GETDATE() AS DATE) 
                        THEN 1 ELSE 0 
                    END AS is_delayed
                FROM pms.project_milestones pm
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                WHERE pm.project_id = @projectId
                ORDER BY mc.sort_order
            `)

        // 3. ดึงข้อมูล Deliverables ทั้งหมดของโครงการ
        const deliverablesResult = await pool.request()
            .input('projectId', sql.UniqueIdentifier, projectId)
            .query(`
                SELECT 
                    pd.id,
                    pd.project_milestone_id,
                    pd.name,
                    pd.name_th,
                    pd.is_required,
                    pd.submitted_date,
                    pd.is_verified
                FROM pms.project_deliverables pd
                INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                WHERE pm.project_id = @projectId
                ORDER BY pd.sort_order
            `)

        // 4. จัดกลุ่ม Deliverables ตาม Milestone
        const deliverablesByMilestone = new Map<string, TrackingDeliverable[]>()
        for (const d of deliverablesResult.recordset) {
            const milestoneId = d.project_milestone_id
            if (!deliverablesByMilestone.has(milestoneId)) {
                deliverablesByMilestone.set(milestoneId, [])
            }
            deliverablesByMilestone.get(milestoneId)!.push({
                id: d.id,
                name: d.name,
                name_th: d.name_th,
                is_required: d.is_required,
                submitted_date: d.submitted_date ? new Date(d.submitted_date).toISOString().split('T')[0] : undefined,
                is_verified: d.is_verified
            })
        }

        // 5. สร้าง Milestones array
        const milestones: TrackingMilestone[] = milestonesResult.recordset.map(m => ({
            id: m.id,
            code: m.code,
            name: m.name,
            name_th: m.name_th,
            color: m.color,
            sort_order: m.sort_order,
            status: m.status,
            due_date: m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : undefined,
            completed_date: m.completed_date ? new Date(m.completed_date).toISOString().split('T')[0] : undefined,
            is_current: m.is_current === 1,
            is_delayed: m.is_delayed === 1,
            deliverables: deliverablesByMilestone.get(m.id) || []
        }))

        // 6. คำนวณ Summary
        const completedMilestones = milestones.filter(m => m.status === 'completed').length
        const allDeliverables = deliverablesResult.recordset
        const verifiedDeliverables = allDeliverables.filter((d: any) => d.is_verified).length

        // 7. คำนวณ Progress (ถ้าไม่มีใน DB)
        const progressPercent = milestones.length > 0
            ? Math.round((completedMilestones / milestones.length) * 100)
            : 0

        return {
            success: true,
            data: {
                project: {
                    id: projectData.id,
                    code: projectData.code,
                    name: projectData.name,
                    name_th: projectData.name_th,
                    customer_name: projectData.customer_name || '-',
                    project_manager_name: projectData.project_manager_name || '-',
                    project_owner_name: projectData.project_owner_name,
                    project_owner_position: projectData.project_owner_position,
                    current_milestone_name: projectData.current_milestone_name,
                    status_name: projectData.status_name || 'Active',
                    status_color: projectData.status_color || '#3B82F6',
                    progress_percent: progressPercent
                },
                milestones,
                summary: {
                    total_milestones: milestones.length,
                    completed_milestones: completedMilestones,
                    total_deliverables: allDeliverables.length,
                    verified_deliverables: verifiedDeliverables
                }
            }
        }

    } catch (error: any) {
        console.error('[getProjectTrackingData] Error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// GET PROJECTS FOR TRACKING (List)
// ============================================

export async function getProjectsForTracking(filters?: {
    customerId?: string
    year?: number
    search?: string
}): Promise<{
    success: boolean
    data: {
        id: string
        code: string
        name: string
        customer_name: string
        current_milestone: string
        progress: number
        status: string
        status_color: string
    }[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        let query = `
            SELECT 
                p.id,
                p.project_code AS code,
                p.name,
                c.name AS customer_name,
                COALESCE(mc.name, '-') AS current_milestone,
                COALESCE(
                    (SELECT COUNT(*) * 100 / NULLIF((SELECT COUNT(*) FROM pms.project_milestones WHERE project_id = p.id), 0)
                     FROM pms.project_milestones 
                     WHERE project_id = p.id AND status = 'completed'),
                    0
                ) AS progress,
                psc.name AS status,
                psc.color AS status_color
            FROM pms.projects p
            LEFT JOIN pms.customers c ON p.customer_id = c.id
            LEFT JOIN pms.project_milestones curr_pm ON p.current_milestone_id = curr_pm.id
            LEFT JOIN pms.milestone_configs mc ON curr_pm.milestone_config_id = mc.id
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE p.is_active = 1
        `

        const request = pool.request()

        if (filters?.customerId) {
            query += ` AND p.customer_id = @customerId`
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }

        if (filters?.year) {
            query += ` AND p.project_year = @year`
            request.input('year', sql.Int, filters.year)
        }

        if (filters?.search) {
            query += ` AND (p.name LIKE @search OR p.project_code LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        query += ` ORDER BY p.project_code DESC`

        const result = await request.query(query)

        return {
            success: true,
            data: result.recordset.map(r => ({
                id: r.id,
                code: r.code,
                name: r.name,
                customer_name: r.customer_name || '-',
                current_milestone: r.current_milestone,
                progress: r.progress || 0,
                status: r.status || 'Active',
                status_color: r.status_color || '#3B82F6'
            }))
        }

    } catch (error: any) {
        console.error('[getProjectsForTracking] Error:', error)
        return { success: false, data: [], error: error.message }
    }
}
