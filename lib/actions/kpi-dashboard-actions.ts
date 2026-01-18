'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// Department KPI Actions
// ============================================

export async function getDepartmentKPISummary(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  try {
    const pool = await getConnection()

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
          kpi_name,
          category,
          target,
          CAST(ROUND(AVG(actual_value), 2) AS DECIMAL(5,2)) AS actual_value,
          target_value,
          MAX(is_pass) AS is_pass,
          affected_positions
        FROM pms.vw_kpi_department_summary
        ${whereClause}
        GROUP BY kpi_name, category, target, target_value, affected_positions
        ORDER BY
          CASE kpi_name
            WHEN 'Time to Delivery' THEN 1
            WHEN 'Man-day Control' THEN 2
            WHEN 'Defect Ratio' THEN 3
            WHEN 'Post Go-live Rework' THEN 4
            WHEN 'Deploy Success Rate' THEN 5
            WHEN 'Pre-deploy Backup' THEN 6
          END
      `)

    return result.recordset
  } catch (error) {
    console.error('getDepartmentKPISummary error:', error)
    return []
  }
}

export async function getDepartmentKPIByProject(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  try {
    const pool = await getConnection()

    let whereClause = 'WHERE year = @year'
    if (period === 'month' && periodValue) {
      whereClause += ' AND month = @periodValue'
    } else if (period === 'quarter' && periodValue) {
      whereClause += ' AND quarter = @periodValue'
    }

    // Time to Delivery by Project
    const ttd = await pool.request()
      .input('year', sql.Int, year)
      .input('periodValue', sql.Int, periodValue)
      .query(`SELECT * FROM pms.vw_kpi_time_to_delivery ${whereClause}`)

    // Man-day Control by Project
    const mdc = await pool.request()
      .input('year', sql.Int, year)
      .input('periodValue', sql.Int, periodValue)
      .query(`SELECT * FROM pms.vw_kpi_manday_control ${whereClause}`)

    // Defect Ratio by Project
    const dr = await pool.request()
      .input('year', sql.Int, year)
      .input('periodValue', sql.Int, periodValue)
      .query(`SELECT * FROM pms.vw_kpi_defect_ratio ${whereClause}`)

    return {
      timeToDelivery: ttd.recordset,
      mandayControl: mdc.recordset,
      defectRatio: dr.recordset
    }
  } catch (error) {
    console.error('getDepartmentKPIByProject error:', error)
    return { timeToDelivery: [], mandayControl: [], defectRatio: [] }
  }
}

// ============================================
// Personal KPI Actions
// ============================================

export async function getPersonalKPISummary(
  employeeId: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  try {
    const pool = await getConnection()

    let whereClause = 'WHERE year = @year AND employee_id = @employeeId'
    if (period === 'month' && periodValue) {
      whereClause += ' AND month = @periodValue'
    } else if (period === 'quarter' && periodValue) {
      whereClause += ' AND quarter = @periodValue'
    }

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('periodValue', sql.Int, periodValue)
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT
          kpi_name,
          actual_value,
          target_value,
          is_pass,
          affected_positions
        FROM pms.vw_kpi_employee_summary
        ${whereClause}
      `)

    return result.recordset
  } catch (error) {
    console.error('getPersonalKPISummary error:', error)
    return []
  }
}

export async function getAllPersonalKPISummary(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number,
  departmentId?: string
) {
  try {
    const pool = await getConnection()

    let whereClause = 'WHERE k.year = @year'
    if (period === 'month' && periodValue) {
      whereClause += ' AND k.month = @periodValue'
    } else if (period === 'quarter' && periodValue) {
      whereClause += ' AND k.quarter = @periodValue'
    }

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('periodValue', sql.Int, periodValue)
      .query(`
        SELECT
          k.employee_id,
          k.employee_code,
          k.employee_name,
          k.position,
          k.kpi_name,
          k.actual_value,
          k.target_value,
          k.is_pass
        FROM pms.vw_kpi_employee_summary k
        ${whereClause}
        ORDER BY k.employee_name, k.kpi_name
      `)

    return result.recordset
  } catch (error) {
    console.error('getAllPersonalKPISummary error:', error)
    return []
  }
}

export async function getAtRiskEmployees(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  try {
    const pool = await getConnection()

    let whereClause = 'WHERE year = @year AND is_pass = 0'
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
          employee_id,
          employee_code,
          employee_name,
          position,
          STRING_AGG(kpi_name + ' (' + CAST(actual_value AS VARCHAR) +
            CASE
              WHEN kpi_name = 'On-time Meeting Minutes' THEN ' late)'
              ELSE '%)'
            END, ', ') AS failed_kpis,
          COUNT(*) AS failed_count
        FROM pms.vw_kpi_employee_summary
        ${whereClause}
        GROUP BY employee_id, employee_code, employee_name, position
        ORDER BY failed_count DESC
      `)

    return result.recordset
  } catch (error) {
    console.error('getAtRiskEmployees error:', error)
    return []
  }
}

// ============================================
// KPI Trend Actions
// ============================================

export async function getKPITrend(year: number, kpiName?: string) {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .query(`
        SELECT
          month,
          kpi_name,
          AVG(actual_value) AS actual_value,
          target_value
        FROM pms.vw_kpi_department_summary
        WHERE year = @year
        GROUP BY month, kpi_name, target_value
        ORDER BY month, kpi_name
      `)

    return result.recordset
  } catch (error) {
    console.error('getKPITrend error:', error)
    return []
  }
}

export async function getPersonalKPITrend(employeeId: string, year: number) {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('year', sql.Int, year)
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT
          month,
          kpi_name,
          actual_value,
          target_value,
          is_pass
        FROM pms.vw_kpi_employee_summary
        WHERE year = @year AND employee_id = @employeeId
        ORDER BY month, kpi_name
      `)

    return result.recordset
  } catch (error) {
    console.error('getPersonalKPITrend error:', error)
    return []
  }
}

// ============================================
// Employee Position Mapping
// ============================================

export async function getKPIsByPosition(position: string): Promise<string[]> {
  // Department KPIs ตาม Spec (รวมน้ำหนักตาม position)
  const deptKPIs: Record<string, string[]> = {
    // PM: Time to Delivery(25) + Man-day Control(30) = 55
    'PM': ['Time to Delivery', 'Man-day Control'],
    // PG: Time to Delivery(10) + Man-day Control(10) + Defect Ratio(10) + Post Go-live Rework(5) + Deploy Success Rate(5) + Pre-deploy Backup(5) = 45
    'PG': ['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate', 'Pre-deploy Backup'],
    // SA: Time to Delivery(15) + Man-day Control(15) + Defect Ratio(5) + Post Go-live Rework(5) + Deploy Success Rate(5) = 45
    'SA': ['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate']
  }

  // Personal KPIs ตาม Spec
  const personalKPIs: Record<string, string[]> = {
    // PM: On-time Meeting Minutes(5) = 5, รวม PM = 60
    'PM': ['On-time Meeting Minutes'],
    // PG: Issue Clearing(15) = 15, รวม PG = 60
    'PG': ['Issue Clearing'],
    // SA: On-time Meeting Minutes(5) + Required Docs On-time(5) + Issue Clearing(5) = 15, รวม SA = 60
    'SA': ['On-time Meeting Minutes', 'Required Docs On-time', 'Issue Clearing']
  }

  return [
    ...(deptKPIs[position] || []),
    ...(personalKPIs[position] || [])
  ]
}

// ============================================
// Dashboard Summary
// ============================================

export async function getKPIDashboardData(
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const [deptKPIs, personalKPIs, atRiskEmployees, kpiTrend] = await Promise.all([
    getDepartmentKPISummary(year, period, periodValue),
    getAllPersonalKPISummary(year, period, periodValue),
    getAtRiskEmployees(year, period, periodValue),
    getKPITrend(year)
  ])

  // Calculate summary stats
  const deptPassCount = deptKPIs.filter((k: any) => k.is_pass === 1).length
  const deptTotalCount = deptKPIs.length

  // Group personal KPIs by KPI name (include affected_positions from first record)
  const personalKPIGroups = personalKPIs.reduce((acc: any, k: any) => {
    if (!acc[k.kpi_name]) {
      acc[k.kpi_name] = { pass: 0, fail: 0, total: 0, affected_positions: k.affected_positions || '' }
    }
    acc[k.kpi_name].total++
    if (k.is_pass === 1) {
      acc[k.kpi_name].pass++
    } else {
      acc[k.kpi_name].fail++
    }
    return acc
  }, {} as Record<string, { pass: number; fail: number; total: number; affected_positions: string }>)

  return {
    summary: {
      deptKPIPass: deptPassCount,
      deptKPITotal: deptTotalCount,
      deptKPIPercent: deptTotalCount > 0 ? Math.round(deptPassCount * 100 / deptTotalCount) : 0,
      atRiskCount: atRiskEmployees.length
    },
    departmentKPIs: deptKPIs,
    personalKPIGroups,
    atRiskEmployees,
    kpiTrend
  }
}

// ============================================
// My KPI Dashboard
// ============================================

export async function getMyKPIDashboardData(
  employeeId: string,
  position: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
) {
  const [deptKPIs, personalKPIs, kpiTrend] = await Promise.all([
    getDepartmentKPISummary(year, period, periodValue),
    getPersonalKPISummary(employeeId, year, period, periodValue),
    getPersonalKPITrend(employeeId, year)
  ])

  // Filter dept KPIs by position
  const myDeptKPIs = deptKPIs.filter((k: any) =>
    k.affected_positions?.includes(position)
  )

  // Filter personal KPIs by position (PM ไม่มี Issue Clearing, SA มี On-time Meeting Minutes ฯลฯ)
  const myPersonalKPIs = personalKPIs.filter((k: any) =>
    k.affected_positions?.includes(position)
  )

  // Combine all KPIs
  const allMyKPIs = [
    ...myDeptKPIs.map((k: any) => ({ ...k, type: 'department' })),
    ...myPersonalKPIs.map((k: any) => ({ ...k, type: 'personal' }))
  ]

  const passCount = allMyKPIs.filter((k: any) => k.is_pass === 1).length
  const totalCount = allMyKPIs.length
  const failedKPIs = allMyKPIs.filter((k: any) => k.is_pass === 0)

  return {
    summary: {
      totalKPIs: totalCount,
      passCount,
      failCount: totalCount - passCount,
      passPercent: totalCount > 0 ? Math.round(passCount * 100 / totalCount) : 0,
      status: failedKPIs.length === 0 ? 'pass' : failedKPIs.length <= 2 ? 'at_risk' : 'fail'
    },
    departmentKPIs: myDeptKPIs,
    personalKPIs: myPersonalKPIs,
    failedKPIs,
    kpiTrend
  }
}
