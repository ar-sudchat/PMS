'use server'

import { getConnection } from '@/lib/db'

// Constants
const TARGET_REWORK_RATIO = 8 // Target is <= 8%

// Types
export interface PostGoliveReworkSummary {
    total_projects: number
    closed_count: number
    post_golive_count: number
    total_manday: number
    rework_manday: number
    overall_ratio: number
    projects_pass: number
    projects_fail: number
    is_pass: boolean
}

export interface PostGoliveReworkProject {
    project_id: string
    project_code: string
    project_name: string
    owner_id: string | null
    owner_name: string
    golive_completed_date: string
    close_golive_completed_date: string | null
    project_status: string
    sold_mandays: number
    total_manday: number
    rework_manday: number
    rework_ratio: number
    is_pass: boolean
}

export interface ProjectExceedingTarget {
    project_id: string
    project_code: string
    project_name: string
    sold_mandays: number
    rework_ratio: number
    rework_manday: number
    total_manday: number
    over_by: number
}

export interface PostGoliveReworkFilters {
    year: number
    status?: 'all' | 'closed' | 'post-golive'
    ownerId?: string
}

// Get Summary for a year
export async function getPostGoliveReworkSummary(year: number): Promise<{
    success: boolean
    data: PostGoliveReworkSummary
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    COUNT(*) AS total_projects,
                    SUM(CASE WHEN project_status = 'Closed' THEN 1 ELSE 0 END) AS closed_count,
                    SUM(CASE WHEN project_status = 'Post Go-Live' THEN 1 ELSE 0 END) AS post_golive_count,
                    SUM(sold_mandays) AS total_manday,
                    SUM(rework_manday) AS rework_manday
                FROM pms.vw_post_golive_rework
                WHERE project_year = @year
            `)

        const row = result.recordset[0]
        const totalManday = row.total_manday || 0
        const reworkManday = row.rework_manday || 0
        const overallRatio = totalManday > 0 ? (reworkManday / totalManday) * 100 : 0

        // Count pass/fail projects
        const projectsResult = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    SUM(CASE WHEN (rework_manday / NULLIF(sold_mandays, 0)) * 100 <= 8 THEN 1 ELSE 0 END) AS pass_count,
                    SUM(CASE WHEN (rework_manday / NULLIF(sold_mandays, 0)) * 100 > 8 THEN 1 ELSE 0 END) AS fail_count
                FROM pms.vw_post_golive_rework
                WHERE project_year = @year AND sold_mandays > 0
            `)

        const projRow = projectsResult.recordset[0]

        return {
            success: true,
            data: {
                total_projects: row.total_projects || 0,
                closed_count: row.closed_count || 0,
                post_golive_count: row.post_golive_count || 0,
                total_manday: Math.round(totalManday * 10) / 10,
                rework_manday: Math.round(reworkManday * 10) / 10,
                overall_ratio: Math.round(overallRatio * 100) / 100,
                projects_pass: projRow?.pass_count || 0,
                projects_fail: projRow?.fail_count || 0,
                is_pass: overallRatio <= TARGET_REWORK_RATIO
            }
        }
    } catch (error) {
        console.error('Error fetching post go-live rework summary:', error)
        return {
            success: false,
            error: 'Failed to fetch summary',
            data: {
                total_projects: 0,
                closed_count: 0,
                post_golive_count: 0,
                total_manday: 0,
                rework_manday: 0,
                overall_ratio: 0,
                projects_pass: 0,
                projects_fail: 0,
                is_pass: true
            }
        }
    }
}

// Get Projects list
export async function getPostGoliveReworkProjects(filters: PostGoliveReworkFilters): Promise<{
    success: boolean
    data: PostGoliveReworkProject[]
    error?: string
}> {
    try {
        const pool = await getConnection()
        const { year, status, ownerId } = filters

        let whereClause = 'project_year = @year'
        if (status && status !== 'all') {
            if (status === 'closed') {
                whereClause += " AND project_status = 'Closed'"
            } else if (status === 'post-golive') {
                whereClause += " AND project_status = 'Post Go-Live'"
            }
        }
        if (ownerId) {
            whereClause += ' AND project_owner_id = @ownerId'
        }

        const result = await pool.request()
            .input('year', year)
            .input('ownerId', ownerId || null)
            .query(`
                SELECT
                    project_id,
                    project_code,
                    project_name,
                    project_owner_id AS owner_id,
                    owner_name,
                    golive_completed_date,
                    close_golive_completed_date,
                    project_status,
                    sold_mandays,
                    total_manday,
                    rework_manday,
                    CASE
                        WHEN sold_mandays = 0 THEN 0
                        ELSE (rework_manday / sold_mandays) * 100
                    END AS rework_ratio
                FROM pms.vw_post_golive_rework
                WHERE ${whereClause}
                ORDER BY golive_completed_date DESC
            `)

        const data: PostGoliveReworkProject[] = result.recordset.map((row: any) => ({
            project_id: row.project_id,
            project_code: row.project_code,
            project_name: row.project_name,
            owner_id: row.owner_id,
            owner_name: row.owner_name || 'Unknown',
            golive_completed_date: row.golive_completed_date,
            close_golive_completed_date: row.close_golive_completed_date,
            project_status: row.project_status,
            sold_mandays: Math.round((row.sold_mandays || 0) * 10) / 10,
            total_manday: Math.round((row.total_manday || 0) * 10) / 10,
            rework_manday: Math.round((row.rework_manday || 0) * 10) / 10,
            rework_ratio: Math.round((row.rework_ratio || 0) * 100) / 100,
            is_pass: (row.rework_ratio || 0) <= TARGET_REWORK_RATIO
        }))

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching post go-live rework projects:', error)
        return { success: false, error: 'Failed to fetch projects', data: [] }
    }
}

// Get Projects exceeding target
export async function getProjectsExceedingTarget(year: number): Promise<{
    success: boolean
    data: ProjectExceedingTarget[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', year)
            .input('target', TARGET_REWORK_RATIO)
            .query(`
                SELECT
                    project_id,
                    project_code,
                    project_name,
                    sold_mandays,
                    total_manday,
                    rework_manday,
                    CASE
                        WHEN sold_mandays = 0 THEN 0
                        ELSE (rework_manday / sold_mandays) * 100
                    END AS rework_ratio
                FROM pms.vw_post_golive_rework
                WHERE project_year = @year
                AND sold_mandays > 0
                AND (rework_manday / sold_mandays) * 100 > @target
                ORDER BY (rework_manday / sold_mandays) DESC
            `)

        const data: ProjectExceedingTarget[] = result.recordset.map((row: any) => ({
            project_id: row.project_id,
            project_code: row.project_code,
            project_name: row.project_name,
            sold_mandays: Math.round((row.sold_mandays || 0) * 10) / 10,
            total_manday: Math.round((row.total_manday || 0) * 10) / 10,
            rework_manday: Math.round((row.rework_manday || 0) * 10) / 10,
            rework_ratio: Math.round((row.rework_ratio || 0) * 100) / 100,
            over_by: Math.round(((row.rework_ratio || 0) - TARGET_REWORK_RATIO) * 100) / 100
        }))

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching projects exceeding target:', error)
        return { success: false, error: 'Failed to fetch data', data: [] }
    }
}

// Get Project Owners who have go-live projects
export async function getProjectOwnersForRework(year?: number): Promise<{
    success: boolean
    data: { id: string; name: string }[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        let query = `
            SELECT DISTINCT
                e.id,
                COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) AS name
            FROM pms.vw_post_golive_rework v
            INNER JOIN pms.employees e ON v.project_owner_id = e.id
        `
        if (year) {
            query += ` WHERE v.project_year = @year`
        }
        query += ` ORDER BY name`

        const request = pool.request()
        if (year) {
            request.input('year', year)
        }

        const result = await request.query(query)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching project owners:', error)
        return { success: false, error: 'Failed to fetch owners', data: [] }
    }
}

// Get Monthly Trend for Post Go-Live Rework
export async function getPostGoliveReworkMonthlyTrend(year: number): Promise<{
    success: boolean
    data: { month: number; month_name: string; total_projects: number; total_manday: number; rework_manday: number; rework_ratio: number; is_pass: boolean }[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    MONTH(golive_completed_date) as month,
                    COUNT(*) as total_projects,
                    SUM(sold_mandays) as total_manday,
                    SUM(rework_manday) as rework_manday
                FROM pms.vw_post_golive_rework
                WHERE project_year = @year
                GROUP BY MONTH(golive_completed_date)
                ORDER BY MONTH(golive_completed_date)
            `)

        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        const data = result.recordset.map((r: any) => {
            const totalManday = r.total_manday || 0
            const reworkManday = r.rework_manday || 0
            const ratio = totalManday > 0 ? Math.round((reworkManday / totalManday) * 100 * 100) / 100 : 0
            return {
                month: r.month,
                month_name: monthNames[r.month - 1],
                total_projects: r.total_projects || 0,
                total_manday: Math.round(totalManday * 10) / 10,
                rework_manday: Math.round(reworkManday * 10) / 10,
                rework_ratio: ratio,
                is_pass: ratio <= TARGET_REWORK_RATIO
            }
        })

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching post go-live rework monthly trend:', error)
        return { success: false, error: 'Failed to fetch monthly trend', data: [] }
    }
}

// Get available years
export async function getAvailableYearsForRework(): Promise<{
    success: boolean
    data: number[]
    error?: string
}> {
    try {
        const pool = await getConnection()

        const result = await pool.request().query(`
            SELECT DISTINCT project_year
            FROM pms.vw_post_golive_rework
            ORDER BY project_year DESC
        `)

        const years = result.recordset.map((row: any) => row.project_year)

        // If no data, return current year
        if (years.length === 0) {
            years.push(new Date().getFullYear())
        }

        return { success: true, data: years }
    } catch (error) {
        console.error('Error fetching available years:', error)
        return { success: false, error: 'Failed to fetch years', data: [new Date().getFullYear()] }
    }
}
