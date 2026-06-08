'use server'

import { getConnection } from '@/lib/db'

// Types
export interface DeliverableWithOwner {
    deliverable_id: string
    document_name: string
    is_required: boolean
    submitted_date: string | null
    is_on_time: boolean | null
    milestone_id: string
    milestone_name: string
    milestone_due_date: string
    project_id: string
    project_code: string
    project_name: string
    project_owner_id: string | null
    owner_name: string | null
    owner_code: string | null
    calculated_on_time: number | null
    status: 'On-time' | 'Late' | 'Pending' | 'Overdue'
    days_overdue: number | null
    days_late: number | null
    due_year: number
}

export interface DocsOntimeSummary {
    total: number
    on_time: number
    late: number
    pending: number
    overdue: number
    rate: number
    is_pass: boolean
}

export interface OwnerKPISummary {
    owner_id: string
    owner_name: string
    total: number
    on_time: number
    late: number
    pending: number
    overdue: number
    rate: number
    is_pass: boolean
}

export interface DocsOntimeFilters {
    year: number
    ownerId?: string
    status?: 'all' | 'on-time' | 'late' | 'pending' | 'overdue'
    projectId?: string
    search?: string
    page?: number
    pageSize?: number
}

// Get Docs On-time by Owner with filters
export async function getDocsOntimeByOwner(filters: DocsOntimeFilters) {
    try {
        const pool = await getConnection()
        const { year, ownerId, status, projectId, search, page = 1, pageSize = 20 } = filters

        let whereClause = 'due_year = @year'
        const request = pool.request()
        request.input('year', year)

        if (ownerId) {
            whereClause += ' AND project_owner_id = @ownerId'
            request.input('ownerId', ownerId)
        }

        if (projectId) {
            whereClause += ' AND project_id = @projectId'
            request.input('projectId', projectId)
        }

        if (status && status !== 'all') {
            const statusMap: Record<string, string> = {
                'on-time': 'On-time',
                'late': 'Late',
                'pending': 'Pending',
                'overdue': 'Overdue'
            }
            whereClause += ' AND status = @status'
            request.input('status', statusMap[status])
        }

        if (search) {
            whereClause += ' AND (project_code LIKE @search OR project_name LIKE @search OR document_name LIKE @search OR milestone_name LIKE @search)'
            request.input('search', `%${search}%`)
        }

        // Get total count
        const countResult = await request.query(`
            SELECT COUNT(*) as total
            FROM pms.vw_deliverables_by_owner
            WHERE ${whereClause}
        `)

        const total = countResult.recordset[0].total
        const offset = (page - 1) * pageSize

        // Get documents with sorting: Overdue > Late > Pending > On-time
        const result = await pool.request()
            .input('year', year)
            .input('ownerId', ownerId || null)
            .input('projectId', projectId || null)
            .input('status', status && status !== 'all' ? { 'on-time': 'On-time', 'late': 'Late', 'pending': 'Pending', 'overdue': 'Overdue' }[status] : null)
            .input('search', search ? `%${search}%` : null)
            .input('offset', offset)
            .input('pageSize', pageSize)
            .query(`
                SELECT *
                FROM pms.vw_deliverables_by_owner
                WHERE ${whereClause}
                ORDER BY
                    CASE status
                        WHEN 'Overdue' THEN 1
                        WHEN 'Late' THEN 2
                        WHEN 'Pending' THEN 3
                        ELSE 4
                    END,
                    milestone_due_date DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `)

        // Get summary for filtered results
        const summaryResult = await pool.request()
            .input('year', year)
            .input('ownerId', ownerId || null)
            .input('projectId', projectId || null)
            .input('search', search ? `%${search}%` : null)
            .query(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'On-time' THEN 1 ELSE 0 END) AS on_time,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue
                FROM pms.vw_deliverables_by_owner
                WHERE due_year = @year
                ${ownerId ? 'AND project_owner_id = @ownerId' : ''}
                ${projectId ? 'AND project_id = @projectId' : ''}
                ${search ? "AND (project_code LIKE @search OR project_name LIKE @search OR document_name LIKE @search)" : ''}
            `)

        const s = summaryResult.recordset[0]
        const submitted = (s.on_time || 0) + (s.late || 0)
        const rate = submitted > 0 ? ((s.on_time || 0) / submitted) * 100 : 100

        return {
            success: true,
            documents: result.recordset as DeliverableWithOwner[],
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            summary: {
                total: s.total || 0,
                on_time: s.on_time || 0,
                late: s.late || 0,
                pending: s.pending || 0,
                overdue: s.overdue || 0,
                rate: Math.round(rate * 100) / 100,
                is_pass: rate >= 95
            } as DocsOntimeSummary
        }
    } catch (error) {
        console.error('Error fetching docs on-time:', error)
        return {
            success: false,
            error: 'Failed to fetch docs on-time data',
            documents: [],
            total: 0,
            summary: { total: 0, on_time: 0, late: 0, pending: 0, overdue: 0, rate: 100, is_pass: true }
        }
    }
}

// Get KPI Summary for All Owners
export async function getDocsOntimeKPIAllOwners(year: number) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    project_owner_id AS owner_id,
                    owner_name,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'On-time' THEN 1 ELSE 0 END) AS on_time,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue
                FROM pms.vw_deliverables_by_owner
                WHERE due_year = @year
                AND project_owner_id IS NOT NULL
                GROUP BY project_owner_id, owner_name
                ORDER BY owner_name
            `)

        const data: OwnerKPISummary[] = result.recordset.map((r: any) => {
            const submitted = (r.on_time || 0) + (r.late || 0)
            const rate = submitted > 0 ? ((r.on_time || 0) / submitted) * 100 : 100
            return {
                owner_id: r.owner_id,
                owner_name: r.owner_name || 'Unknown',
                total: r.total || 0,
                on_time: r.on_time || 0,
                late: r.late || 0,
                pending: r.pending || 0,
                overdue: r.overdue || 0,
                rate: Math.round(rate * 100) / 100,
                is_pass: rate >= 95
            }
        })

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching docs on-time KPI for all owners:', error)
        return { success: false, error: 'Failed to fetch KPI data', data: [] }
    }
}

// Get Monthly Trend for Docs On-time
export async function getDocsOntimeMonthlyTrend(year: number, ownerId?: string) {
    try {
        const pool = await getConnection()
        const request = pool.request().input('year', year)

        let ownerClause = ''
        if (ownerId) {
            ownerClause = 'AND project_owner_id = @ownerId'
            request.input('ownerId', ownerId)
        }

        const result = await request.query(`
            SELECT
                MONTH(milestone_due_date) as month,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'On-time' THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue
            FROM pms.vw_deliverables_by_owner
            WHERE due_year = @year
            ${ownerClause}
            GROUP BY MONTH(milestone_due_date)
            ORDER BY MONTH(milestone_due_date)
        `)

        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        const data = result.recordset.map((r: any) => {
            // Fold overdue into late so the trend matches the project/milestone table.
            // (Manual-fail flag isn't on the view, so it's only applied in the
            // project-milestone breakdown — trend is best-effort.)
            const effLate = (r.late || 0) + (r.overdue || 0)
            const submitted = (r.on_time || 0) + effLate
            const rate = submitted > 0 ? Math.round(((r.on_time || 0) / submitted) * 100) : 100
            return {
                month: r.month,
                month_name: monthNames[r.month - 1],
                total: r.total || 0,
                on_time: r.on_time || 0,
                late: effLate,
                pending: r.pending || 0,
                overdue: 0,
                on_time_rate: rate,
                is_pass: rate >= 95
            }
        })

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching docs on-time monthly trend:', error)
        return { success: false, error: 'Failed to fetch monthly trend', data: [] }
    }
}

// ============================================
// Get Docs On-Time by Project and Milestone (for KPI table with milestone columns)
// ============================================

export interface MilestoneDocsDetail {
    milestone_name: string
    due_date: string | null
    total_docs: number
    on_time_docs: number
    late_docs: number
    pending_docs: number
    overdue_docs: number
    on_time_rate: number
    kpi_docs_manual_fail?: boolean
}

export interface ProjectDocsData {
    project_id: string
    project_code: string
    project_name: string
    owner_name: string | null
    kpi_excluded?: boolean
    milestones: MilestoneDocsDetail[]
    total_docs: number
    on_time_docs: number
    late_docs: number
    on_time_rate: number
    is_pass: boolean
}

export async function getDocsOntimeByProjectMilestone(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}): Promise<{ success: boolean; data: ProjectDocsData[] }> {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE YEAR(pm.due_date) = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND MONTH(pm.due_date) = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND DATEPART(QUARTER, pm.due_date) = @periodValue'
        }

        const result = await pool.request()
            .input('year', year)
            .input('periodValue', periodValue || null)
            .query(`
                SELECT
                    p.id AS project_id,
                    p.project_code,
                    p.name AS project_name,
                    e.first_name + ' ' + e.last_name AS owner_name,
                    mc.name AS milestone_name,
                    MIN(pm.due_date) AS due_date,
                    COUNT(*) AS total_docs,
                    SUM(CASE WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1 ELSE 0 END) AS on_time_docs,
                    SUM(CASE WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date > pm.due_date THEN 1 ELSE 0 END) AS late_docs,
                    SUM(CASE WHEN pd.submitted_date IS NULL AND pm.due_date >= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS pending_docs,
                    SUM(CASE WHEN pd.submitted_date IS NULL AND pm.due_date < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS overdue_docs,
                    MAX(CAST(ISNULL(pm.kpi_docs_manual_fail, 0) AS INT)) AS kpi_docs_manual_fail,
                    MAX(CAST(ISNULL(p.kpi_exclude_docs, 0) AS INT)) AS kpi_exclude_docs
                FROM pms.project_deliverables pd
                INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                INNER JOIN pms.projects p ON pm.project_id = p.id
                LEFT JOIN pms.employees e ON p.project_owner_id = e.id
                LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
                LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
                ${whereClause}
                AND pd.is_required = 1
                AND p.is_active = 1
                AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
                AND (pt.code IS NULL OR pt.code <> 'MKT')
                GROUP BY p.id, p.project_code, p.name, e.first_name, e.last_name, mc.name
                ORDER BY p.project_code,
                    CASE mc.name
                        WHEN 'Mapping Data' THEN 1
                        WHEN 'System Test' THEN 2
                        WHEN 'User Acceptance Test' THEN 3
                        WHEN 'Go-Live' THEN 4
                        WHEN 'Close Go-Live' THEN 5
                        ELSE 99
                    END
            `)

        // Group by project
        const projectMap = new Map<string, ProjectDocsData>()

        for (const row of result.recordset) {
            const key = row.project_id
            if (!projectMap.has(key)) {
                projectMap.set(key, {
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    owner_name: row.owner_name,
                    kpi_excluded: row.kpi_exclude_docs === 1,
                    milestones: [],
                    total_docs: 0,
                    on_time_docs: 0,
                    late_docs: 0,
                    on_time_rate: 0,
                    is_pass: true
                })
            }

            const proj = projectMap.get(key)!
            const isManualFail = row.kpi_docs_manual_fail === 1

            // Effective counts: collapse overdue + manual-fail into "Late" so the user
            // sees a single failure bucket. Pending stays as the truly unsubmitted but
            // not-yet-due docs only.
            //
            // - manual_fail=1 → milestone is force-failed: all non-on-time docs become Late
            // - manual_fail=0 → Late = submitted-late + overdue (past due, unsubmitted)
            const rawOnTime = row.on_time_docs || 0
            const rawLate = row.late_docs || 0
            const rawPending = row.pending_docs || 0
            const rawOverdue = row.overdue_docs || 0
            const total = row.total_docs || 0

            const effLate = isManualFail
                ? total - rawOnTime              // everything not on-time fails
                : rawLate + rawOverdue
            const effPending = isManualFail ? 0 : rawPending
            // overdue is now folded into Late everywhere, so always zero in the
            // returned shape — UI's msPending math (pending + overdue) keeps working.
            const effOverdue = 0

            const submitted = rawOnTime + effLate
            const rate = submitted > 0 ? Math.round((rawOnTime / submitted) * 100) : 100

            proj.milestones.push({
                milestone_name: row.milestone_name,
                due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
                total_docs: total,
                on_time_docs: rawOnTime,
                late_docs: effLate,
                pending_docs: effPending,
                overdue_docs: effOverdue,
                on_time_rate: isManualFail ? 0 : rate,
                kpi_docs_manual_fail: isManualFail
            })

            proj.total_docs += total
            proj.on_time_docs += rawOnTime
            proj.late_docs += effLate
        }

        // Calculate project-level on-time rate
        for (const proj of projectMap.values()) {
            const hasManualFail = proj.milestones.some(m => m.kpi_docs_manual_fail)
            if (hasManualFail) {
                // If any milestone has manual fail, project fails
                proj.on_time_rate = 0
                proj.is_pass = false
            } else {
                const submitted = proj.on_time_docs + proj.late_docs
                proj.on_time_rate = submitted > 0 ? Math.round((proj.on_time_docs / submitted) * 100) : 100
                proj.is_pass = proj.on_time_rate >= 95
            }
        }

        return { success: true, data: Array.from(projectMap.values()) }
    } catch (error) {
        console.error('getDocsOntimeByProjectMilestone error:', error)
        return { success: false, data: [] }
    }
}

// Get Active Owners (for filter dropdown)
export async function getActiveOwners() {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT DISTINCT
                p.project_owner_id AS id,
                COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS name,
                e.employee_code AS code
            FROM pms.projects p
            INNER JOIN pms.employees e ON p.project_owner_id = e.id
            WHERE p.project_owner_id IS NOT NULL
            AND p.status IN ('Active', 'active')
            ORDER BY name
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching active owners:', error)
        return { success: false, error: 'Failed to fetch owners', data: [] }
    }
}
