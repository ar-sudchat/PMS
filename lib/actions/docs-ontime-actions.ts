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
