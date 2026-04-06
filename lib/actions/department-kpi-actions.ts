'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'

// ============================================
// Time to Delivery KPI Actions
// ============================================

export interface TimeToDeliveryProject {
    year: number
    month: number
    quarter: number
    project_id: string
    project_code: string
    project_name: string
    time_to_delivery_percent: number
    target_percent: number
    is_pass: number
}

export interface TimeToDeliverySummary {
    totalProjects: number
    passCount: number
    failCount: number
    averagePercent: number
    targetPercent: number
    isPass: boolean
}

export async function getTimeToDeliveryKPI(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}) {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE year = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND month = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND quarter = @periodValue'
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('periodValue', sql.Int, periodValue)
            .query(`
                SELECT
                    year,
                    month,
                    quarter,
                    project_id,
                    project_code,
                    project_name,
                    time_to_delivery_percent,
                    target_percent,
                    is_pass
                FROM pms.vw_kpi_time_to_delivery
                ${whereClause}
                ORDER BY time_to_delivery_percent DESC
            `)

        const data = result.recordset as TimeToDeliveryProject[]

        // Calculate summary
        const passCount = data.filter(p => p.is_pass === 1).length
        const failCount = data.filter(p => p.is_pass === 0).length
        const averagePercent = data.length > 0
            ? Math.round(data.reduce((sum, p) => sum + p.time_to_delivery_percent, 0) / data.length * 100) / 100
            : 0

        const summary: TimeToDeliverySummary = {
            totalProjects: data.length,
            passCount,
            failCount,
            averagePercent,
            targetPercent: 80,
            isPass: averagePercent >= 80
        }

        return { success: true, data, summary }
    } catch (error) {
        console.error('getTimeToDeliveryKPI error:', error)
        return { success: false, data: [], summary: null }
    }
}

export async function getTimeToDeliveryTrend(year: number) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(`
                SELECT
                    month,
                    AVG(time_to_delivery_percent) AS avg_percent,
                    COUNT(*) AS project_count,
                    SUM(CASE WHEN is_pass = 1 THEN 1 ELSE 0 END) AS pass_count,
                    80 AS target_percent
                FROM pms.vw_kpi_time_to_delivery
                WHERE year = @year
                GROUP BY month
                ORDER BY month
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getTimeToDeliveryTrend error:', error)
        return { success: false, data: [] }
    }
}

// Get milestone-level data for Time to Delivery
export interface TTDMilestoneDetail {
    milestone_name: string
    due_date: string | null
    completed_date: string | null
    weight_ttd: number | null
    achievement_percent: number
    days_diff: number | null
    kpi_ttd_manual_fail?: boolean
}

export interface ProjectTTDMilestoneData {
    project_id: string
    project_code: string
    project_name: string
    milestones: TTDMilestoneDetail[]
}

export async function getTimeToDeliveryMilestones(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}): Promise<{ success: boolean; data: ProjectTTDMilestoneData[] }> {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE YEAR(ISNULL(pm.completed_date, pm.due_date)) = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND MONTH(ISNULL(pm.completed_date, pm.due_date)) = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND DATEPART(QUARTER, ISNULL(pm.completed_date, pm.due_date)) = @periodValue'
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('periodValue', sql.Int, periodValue)
            .query(`
                SELECT
                    p.id AS project_id,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    pm.due_date,
                    pm.completed_date,
                    ISNULL(pm.kpi_ttd_manual_fail, 0) AS kpi_ttd_manual_fail,
                    COALESCE(pm.weight_ttd, mc.default_weight_ttd,
                        CASE mc.name
                            WHEN 'Mapping Data' THEN 30
                            WHEN 'System Test' THEN 30
                            WHEN 'User Acceptance Test' THEN 20
                            WHEN 'Go-Live' THEN 10
                            WHEN 'Close Go-Live' THEN 10
                            ELSE 0
                        END) AS weight_ttd,
                    CASE
                        WHEN ISNULL(pm.kpi_ttd_manual_fail, 0) = 1 THEN 0
                        WHEN pm.completed_date IS NULL THEN 0
                        WHEN pm.completed_date <= pm.due_date THEN 100
                        WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 7 THEN 80
                        WHEN DATEDIFF(DAY, pm.due_date, pm.completed_date) <= 14 THEN 60
                        ELSE 40
                    END AS achievement_percent,
                    CASE
                        WHEN pm.completed_date IS NULL THEN NULL
                        ELSE DATEDIFF(DAY, pm.due_date, pm.completed_date)
                    END AS days_diff
                FROM pms.project_milestones pm
                INNER JOIN pms.projects p ON pm.project_id = p.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
                LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
                ${whereClause}
                AND p.is_active = 1
                AND pm.due_date IS NOT NULL
                AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
                AND (pt.code IS NULL OR pt.code <> 'MKT')
                AND ISNULL(p.kpi_exclude_ttd, 0) = 0
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
        const projectMap = new Map<string, ProjectTTDMilestoneData>()

        for (const row of result.recordset) {
            const key = row.project_id
            if (!projectMap.has(key)) {
                projectMap.set(key, {
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    milestones: []
                })
            }

            projectMap.get(key)!.milestones.push({
                milestone_name: row.milestone_name,
                due_date: row.due_date,
                completed_date: row.completed_date,
                weight_ttd: row.weight_ttd,
                achievement_percent: row.achievement_percent,
                days_diff: row.days_diff,
                kpi_ttd_manual_fail: row.kpi_ttd_manual_fail === true || row.kpi_ttd_manual_fail === 1
            })
        }

        return { success: true, data: Array.from(projectMap.values()) }
    } catch (error) {
        console.error('getTimeToDeliveryMilestones error:', error)
        return { success: false, data: [] }
    }
}

// ============================================
// Man-day Control KPI Actions
// ============================================

export interface MandayControlProject {
    year: number
    month: number
    quarter: number
    project_id: string
    project_code: string
    project_name: string
    total_planned_mandays: number
    total_actual_mandays: number
    manday_control_percent: number
    target_percent: number
    is_pass: number
}

export interface MandayControlSummary {
    totalProjects: number
    passCount: number
    failCount: number
    totalPlannedMandays: number
    totalActualMandays: number
    averagePercent: number
    targetPercent: number
    isPass: boolean
}

export async function getMandayControlKPI(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}) {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE year = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND month = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND quarter = @periodValue'
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('periodValue', sql.Int, periodValue)
            .query(`
                SELECT
                    year,
                    month,
                    quarter,
                    project_id,
                    project_code,
                    project_name,
                    total_planned_mandays,
                    total_actual_mandays,
                    manday_control_percent,
                    target_percent,
                    is_pass
                FROM pms.vw_kpi_manday_control
                ${whereClause}
                ORDER BY manday_control_percent DESC
            `)

        const data = result.recordset as MandayControlProject[]

        // Calculate summary
        const passCount = data.filter(p => p.is_pass === 1).length
        const failCount = data.filter(p => p.is_pass === 0).length
        const totalPlannedMandays = data.reduce((sum, p) => sum + (p.total_planned_mandays || 0), 0)
        const totalActualMandays = data.reduce((sum, p) => sum + (p.total_actual_mandays || 0), 0)
        const averagePercent = data.length > 0
            ? Math.round(data.reduce((sum, p) => sum + p.manday_control_percent, 0) / data.length * 100) / 100
            : 0

        const summary: MandayControlSummary = {
            totalProjects: data.length,
            passCount,
            failCount,
            totalPlannedMandays: Math.round(totalPlannedMandays * 100) / 100,
            totalActualMandays: Math.round(totalActualMandays * 100) / 100,
            averagePercent,
            targetPercent: 85,
            isPass: averagePercent >= 85
        }

        return { success: true, data, summary }
    } catch (error) {
        console.error('getMandayControlKPI error:', error)
        return { success: false, data: [], summary: null }
    }
}

export async function getMandayControlTrend(year: number) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(`
                SELECT
                    month,
                    AVG(manday_control_percent) AS avg_percent,
                    SUM(total_planned_mandays) AS total_planned,
                    SUM(total_actual_mandays) AS total_actual,
                    COUNT(*) AS project_count,
                    SUM(CASE WHEN is_pass = 1 THEN 1 ELSE 0 END) AS pass_count,
                    85 AS target_percent
                FROM pms.vw_kpi_manday_control
                WHERE year = @year
                GROUP BY month
                ORDER BY month
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getMandayControlTrend error:', error)
        return { success: false, data: [] }
    }
}

// Get milestone-level data for Man-day Control
export interface MilestoneDetail {
    milestone_name: string
    planned_mandays: number | null
    actual_mandays: number | null
    weight_mdc: number | null
    achievement_percent: number
    due_date: string | null
}

export interface ProjectMilestoneData {
    project_id: string
    project_code: string
    project_name: string
    milestones: MilestoneDetail[]
}

export async function getMandayControlMilestones(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}): Promise<{ success: boolean; data: ProjectMilestoneData[] }> {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE pm.due_date IS NOT NULL AND YEAR(pm.due_date) = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND MONTH(pm.due_date) = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND DATEPART(QUARTER, pm.due_date) = @periodValue'
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('periodValue', sql.Int, periodValue)
            .query(`
                SELECT
                    p.id AS project_id,
                    p.project_code,
                    p.name AS project_name,
                    mc.name AS milestone_name,
                    pm.due_date,
                    pm.planned_mandays,
                    ISNULL(ts_md.actual_mandays, 0) AS actual_mandays,
                    COALESCE(pm.weight_mdc, mc.default_weight_mdc,
                        CASE mc.name
                            WHEN 'Mapping Data' THEN 30
                            WHEN 'System Test' THEN 30
                            WHEN 'User Acceptance Test' THEN 20
                            WHEN 'Go-Live' THEN 10
                            WHEN 'Close Go-Live' THEN 10
                            ELSE 0
                        END) AS weight_mdc,
                    CASE
                        WHEN ts_md.actual_mandays IS NULL OR ts_md.actual_mandays = 0 THEN 0
                        WHEN pm.planned_mandays IS NULL OR pm.planned_mandays = 0 THEN 0
                        WHEN ts_md.actual_mandays <= pm.planned_mandays THEN 100
                        WHEN ts_md.actual_mandays <= pm.planned_mandays * 1.1 THEN 90
                        WHEN ts_md.actual_mandays <= pm.planned_mandays * 1.2 THEN 70
                        ELSE 50
                    END AS achievement_percent
                FROM pms.project_milestones pm
                INNER JOIN pms.projects p ON pm.project_id = p.id
                INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                LEFT JOIN (
                    SELECT
                        s.milestone_id,
                        CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
                    FROM pms.timesheet_entries te
                    INNER JOIN pms.tasks t ON te.task_id = t.id
                    INNER JOIN pms.stories s ON t.story_id = s.id
                    WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
                    GROUP BY s.milestone_id
                ) ts_md ON ts_md.milestone_id = pm.id
                LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
                LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
                ${whereClause}
                AND p.is_active = 1
                AND (psc.code IS NULL OR psc.code <> 'CANCELLED')
                AND (pt.code IS NULL OR pt.code <> 'MKT')
                AND ISNULL(p.kpi_exclude_mdc, 0) = 0
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
        const projectMap = new Map<string, ProjectMilestoneData>()

        for (const row of result.recordset) {
            const key = row.project_id
            if (!projectMap.has(key)) {
                projectMap.set(key, {
                    project_id: row.project_id,
                    project_code: row.project_code,
                    project_name: row.project_name,
                    milestones: []
                })
            }

            projectMap.get(key)!.milestones.push({
                milestone_name: row.milestone_name,
                planned_mandays: row.planned_mandays,
                actual_mandays: row.actual_mandays,
                weight_mdc: row.weight_mdc,
                achievement_percent: row.achievement_percent,
                due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null
            })
        }

        return { success: true, data: Array.from(projectMap.values()) }
    } catch (error) {
        console.error('getMandayControlMilestones error:', error)
        return { success: false, data: [] }
    }
}

// ============================================
// Defect Ratio KPI Actions
// ============================================

export interface DefectRatioProject {
    year: number
    month: number
    quarter: number
    project_id: string
    project_code: string
    project_name: string
    defect_mandays: number
    total_mandays: number
    defect_ratio_percent: number
    target_percent: number
    is_pass: number
}

export interface DefectRatioSummary {
    totalProjects: number
    passCount: number
    failCount: number
    totalDefectMandays: number
    totalMandays: number
    averagePercent: number
    targetPercent: number
    isPass: boolean
}

export async function getDefectRatioKPI(params: {
    year: number
    period: 'month' | 'quarter' | 'year'
    periodValue?: number
}) {
    try {
        const pool = await getConnection()
        const { year, period, periodValue } = params

        let whereClause = 'WHERE year = @year'
        if (period === 'month' && periodValue) {
            whereClause += ' AND month = @periodValue'
        } else if (period === 'quarter' && periodValue) {
            whereClause += ' AND quarter = @periodValue'
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('periodValue', sql.Int, periodValue)
            .query(`
                SELECT
                    year,
                    month,
                    quarter,
                    project_id,
                    project_code,
                    project_name,
                    defect_mandays,
                    total_mandays,
                    defect_ratio_percent,
                    target_percent,
                    is_pass
                FROM pms.vw_kpi_defect_ratio
                ${whereClause}
                ORDER BY defect_ratio_percent ASC
            `)

        const data = result.recordset as DefectRatioProject[]

        // Calculate summary
        const passCount = data.filter(p => p.is_pass === 1).length
        const failCount = data.filter(p => p.is_pass === 0).length
        const totalDefectMandays = data.reduce((sum, p) => sum + (p.defect_mandays || 0), 0)
        const totalMandays = data.reduce((sum, p) => sum + (p.total_mandays || 0), 0)
        const averagePercent = totalMandays > 0
            ? Math.round(totalDefectMandays * 100 / totalMandays * 100) / 100
            : 0

        const summary: DefectRatioSummary = {
            totalProjects: data.length,
            passCount,
            failCount,
            totalDefectMandays: Math.round(totalDefectMandays * 100) / 100,
            totalMandays: Math.round(totalMandays * 100) / 100,
            averagePercent,
            targetPercent: 15,
            isPass: averagePercent <= 15
        }

        return { success: true, data, summary }
    } catch (error) {
        console.error('getDefectRatioKPI error:', error)
        return { success: false, data: [], summary: null }
    }
}

export async function getDefectRatioTrend(year: number) {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(`
                SELECT
                    month,
                    AVG(defect_ratio_percent) AS avg_percent,
                    SUM(defect_mandays) AS total_defect,
                    SUM(total_mandays) AS total_mandays,
                    COUNT(*) AS project_count,
                    SUM(CASE WHEN is_pass = 1 THEN 1 ELSE 0 END) AS pass_count,
                    15 AS target_percent
                FROM pms.vw_kpi_defect_ratio
                WHERE year = @year
                GROUP BY month
                ORDER BY month
            `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getDefectRatioTrend error:', error)
        return { success: false, data: [] }
    }
}

// ============================================
// Get projects that fail KPI targets
// ============================================

export async function getProjectsFailingKPI(kpiType: 'time-to-delivery' | 'manday-control' | 'defect-ratio', year: number, month?: number) {
    try {
        const pool = await getConnection()

        let query = ''
        switch (kpiType) {
            case 'time-to-delivery':
                query = `
                    SELECT project_code, project_name, time_to_delivery_percent AS value, 80 AS target, 'below' AS comparison
                    FROM pms.vw_kpi_time_to_delivery
                    WHERE year = @year AND is_pass = 0
                    ORDER BY time_to_delivery_percent ASC
                `
                break
            case 'manday-control':
                query = `
                    SELECT project_code, project_name, manday_control_percent AS value, 85 AS target, 'below' AS comparison,
                           total_planned_mandays, total_actual_mandays
                    FROM pms.vw_kpi_manday_control
                    WHERE year = @year AND is_pass = 0
                    ORDER BY manday_control_percent ASC
                `
                break
            case 'defect-ratio':
                query = `
                    SELECT project_code, project_name, defect_ratio_percent AS value, 15 AS target, 'above' AS comparison,
                           defect_mandays, total_mandays
                    FROM pms.vw_kpi_defect_ratio
                    WHERE year = @year AND is_pass = 0
                    ${month ? 'AND month = @month' : ''}
                    ORDER BY defect_ratio_percent DESC
                `
                break
        }

        const request = pool.request().input('year', sql.Int, year)
        if (month) request.input('month', sql.Int, month)
        const result = await request.query(query)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getProjectsFailingKPI error:', error)
        return { success: false, data: [] }
    }
}
