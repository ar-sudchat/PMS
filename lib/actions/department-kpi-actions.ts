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

export async function getProjectsFailingKPI(kpiType: 'time-to-delivery' | 'manday-control' | 'defect-ratio', year: number) {
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
                    ORDER BY defect_ratio_percent DESC
                `
                break
        }

        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(query)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('getProjectsFailingKPI error:', error)
        return { success: false, data: [] }
    }
}
