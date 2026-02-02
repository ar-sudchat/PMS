'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getPresaleKPIStats, getCustomerContactRecords, getMandayAssessmentRecords } from '@/lib/actions/presale-kpi-actions'

// ============================================
// Department KPI Definitions
// ============================================

// All 6 Department KPIs with their definitions
const ALL_DEPARTMENT_KPIS = [
  { kpi_name: 'Time to Delivery', category: 'Performance', target: '>= 80%', target_value: 80, affected_positions: 'PM,PG,SA', higherIsBetter: true },
  { kpi_name: 'Man-day Control', category: 'Performance', target: '>= 85%', target_value: 85, affected_positions: 'PM,PG,SA', higherIsBetter: true },
  { kpi_name: 'Defect Ratio', category: 'Quality', target: '<= 15%', target_value: 15, affected_positions: 'PG,SA', higherIsBetter: false },
  { kpi_name: 'Post Go-live Rework', category: 'Quality', target: '<= 8%', target_value: 8, affected_positions: 'PG,SA', higherIsBetter: false },
  { kpi_name: 'Deploy Success Rate', category: 'Quality', target: '>= 95%', target_value: 95, affected_positions: 'PG,SA', higherIsBetter: true },
  { kpi_name: 'Pre-deploy Backup', category: 'Availability', target: '100%', target_value: 100, affected_positions: 'PG', higherIsBetter: true }
]



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

    // Ensure all 6 KPIs are returned (fill missing with "no data" state)
    const existingKPIs = new Map(result.recordset.map((k: any) => [k.kpi_name, k]))

    return ALL_DEPARTMENT_KPIS.map(kpiDef => {
      const existing = existingKPIs.get(kpiDef.kpi_name)
      if (existing) {
        return existing
      }
      // Return KPI with "no data" state - show as pass (no data = not failing)
      return {
        kpi_name: kpiDef.kpi_name,
        category: kpiDef.category,
        target: kpiDef.target,
        actual_value: null,
        target_value: kpiDef.target_value,
        is_pass: 1, // No data = pass (not penalized)
        affected_positions: kpiDef.affected_positions,
        no_data: true
      }
    })
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

    const summaryData = result.recordset

    // --- Inject Presale KPIs ---
    try {
      const presaleStats = await getPresaleKPIStats(employeeId, year, period, periodValue)

      // 1. Contact Customer (PM)
      summaryData.push({
        kpi_name: 'Contact Customer',
        actual_value: presaleStats.customer_contact.actual_value,
        target_value: 85,
        is_pass: presaleStats.customer_contact.is_pass ? 1 : 0,
        affected_positions: 'PM'
      })

      // 2. Manday Assessment (SA, PM)
      summaryData.push({
        kpi_name: 'Manday Assessment',
        actual_value: presaleStats.manday_assessment.actual_value,
        target_value: 85,
        is_pass: presaleStats.manday_assessment.is_pass ? 1 : 0,
        affected_positions: 'SA,PM'
      })
    } catch (err) {
      console.error('Error injecting presale kpis:', err)
    }

    return summaryData
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

// All 5 Personal KPIs with their definitions
const ALL_PERSONAL_KPIS = [
  { kpi_name: 'Issue Clearing', target: '>= 85%', target_value: 85, affected_positions: 'PG,SA', higherIsBetter: true },
  { kpi_name: 'On-time Meeting Minutes', target: '<= 3 ครั้ง', target_value: 3, affected_positions: 'PM,SA', higherIsBetter: false },
  { kpi_name: 'Required Docs On-time', target: '>= 95%', target_value: 95, affected_positions: 'SA', higherIsBetter: true },
  { kpi_name: 'Contact Customer', target: '>= 85%', target_value: 85, affected_positions: 'PM', higherIsBetter: true },
  { kpi_name: 'Manday Assessment', target: '>= 85%', target_value: 85, affected_positions: 'SA,PM', higherIsBetter: true }
]

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
    // PM: On-time Meeting Minutes(5) + Contact Customer + Manday Assessment
    'PM': ['On-time Meeting Minutes', 'Contact Customer', 'Manday Assessment'],
    // PG: Issue Clearing(15)
    'PG': ['Issue Clearing'],
    // SA: On-time Meeting Minutes(5) + Required Docs On-time(5) + Issue Clearing(5) + Manday Assessment
    'SA': ['On-time Meeting Minutes', 'Required Docs On-time', 'Issue Clearing', 'Manday Assessment']
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
  const personalKPIGroupsFromData = personalKPIs.reduce((acc: any, k: any) => {
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

  // Ensure all 3 Personal KPIs are shown (fill missing with "no data" state)
  const personalKPIGroups: Record<string, any> = {}
  for (const kpiDef of ALL_PERSONAL_KPIS) {
    if (personalKPIGroupsFromData[kpiDef.kpi_name]) {
      personalKPIGroups[kpiDef.kpi_name] = personalKPIGroupsFromData[kpiDef.kpi_name]
    } else {
      // No data for this KPI
      personalKPIGroups[kpiDef.kpi_name] = {
        pass: 0,
        fail: 0,
        total: 0,
        affected_positions: kpiDef.affected_positions,
        no_data: true
      }
    }
  }

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

// ============================================
// KPI Detail Actions (for popup/modal)
// ============================================

export interface KPIDetailData {
  kpiName: string
  category: string
  target: string
  targetValue: number
  actualValue: number
  isPass: boolean
  description: string
  formula: string
  details: any[]
}

export async function getKPIDetail(
  kpiName: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number,
  employeeId?: string
): Promise<KPIDetailData | null> {
  try {
    const pool = await getConnection()

    let whereClause = 'WHERE year = @year'
    if (period === 'month' && periodValue) {
      whereClause += ' AND month = @periodValue'
    } else if (period === 'quarter' && periodValue) {
      whereClause += ' AND quarter = @periodValue'
    }

    // KPI descriptions and formulas
    const kpiInfo: Record<string, { category: string; target: string; description: string; formula: string }> = {
      'Time to Delivery': {
        category: 'Delivery',
        target: '≥80%',
        description: 'วัดความสามารถในการส่งมอบงานตาม Milestone ที่กำหนด (Mapping Data, System Test, UAT, Go-Live)',
        formula: 'Σ(Achievement% × Weight × Planned Mandays) / Σ(Planned Mandays × Weight)'
      },
      'Man-day Control': {
        category: 'Delivery',
        target: '≥85%',
        description: 'วัดการควบคุมการใช้ทรัพยากร (Man-days) ให้เป็นไปตามแผน',
        formula: 'Σ(Control% × Weight × Planned Mandays) / Σ(Planned Mandays × Weight)'
      },
      'Defect Ratio': {
        category: 'Quality',
        target: '≤15%',
        description: 'ควบคุมคุณภาพงานพัฒนา โดยวัด Man-day ที่ใช้แก้ไข Bug/Defect เทียบกับ Man-day ทั้งหมด เพื่อลดการแก้ไขซ้ำและการสูญเสียทรัพยากร',
        formula: '(Manday แก้ Defect / Manday พัฒนาทั้งหมด) × 100'
      },
      'Post Go-live Rework': {
        category: 'Quality',
        target: '≤8%',
        description: 'วัด Man-day ที่ใช้แก้ไข Bug/Defect หลัง Go-Live เทียบกับ Man-day ทั้งหมด เพื่อควบคุมคุณภาพหลังส่งมอบ',
        formula: '(Manday แก้ไขหลัง Go-Live / Manday ทั้งหมด) × 100'
      },
      'Deploy Success Rate': {
        category: 'Availability',
        target: '≥95%',
        description: 'อัตราความสำเร็จในการ Deploy ระบบ',
        formula: '(Success Deploys / Total Deploys) × 100'
      },
      'Pre-deploy Backup': {
        category: 'Availability',
        target: '100%',
        description: 'อัตราการทำ Pre-deploy Backup ที่ผ่านการตรวจสอบ (ต้องมี 5 Version)',
        formula: '(Backups ผ่าน / Total Backups) × 100'
      },
      'On-time Meeting Minutes': {
        category: 'Personal',
        target: '≤3 ครั้ง',
        description: 'จำนวนครั้งที่ส่ง Meeting Minutes ล่าช้า (เกิน 3 วันหลังประชุม)',
        formula: 'นับจำนวน Meeting Minutes ที่ส่งหลัง 3 วัน'
      },
      'Required Docs On-time': {
        category: 'Personal',
        target: '≥85%',
        description: 'สัดส่วนของเอกสาร Deliverables ที่ส่งตรงเวลา',
        formula: '(On-time Docs / Total Required Docs) × 100'
      },
      'Issue Clearing': {
        category: 'Personal',
        target: '≥85%',
        description: 'สัดส่วนของ Issues/Tasks ที่ Clear ได้ตามเวลา',
        formula: '(Cleared Tasks / Total Assigned Tasks) × 100'
      }
    }

    const info = kpiInfo[kpiName]
    if (!info) return null

    let details: any[] = []
    let actualValue = 0

    // Query specific data based on KPI type
    switch (kpiName) {
      case 'Time to Delivery': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              project_code,
              project_name,
              time_to_delivery_percent as actual_percent,
              target_percent,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_time_to_delivery
            ${whereClause}
            ORDER BY time_to_delivery_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }

      case 'Man-day Control': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              project_code,
              project_name,
              manday_control_percent as actual_percent,
              target_percent,
              total_planned_mandays as planned_mandays,
              total_actual_mandays as actual_mandays,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_manday_control
            ${whereClause}
            ORDER BY manday_control_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }

      case 'Defect Ratio': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              project_code,
              project_name,
              defect_ratio_percent as actual_percent,
              defect_mandays,
              total_mandays,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_defect_ratio
            ${whereClause}
            ORDER BY defect_ratio_percent ASC
          `)
        details = result.recordset
        // Calculate from totals: (Sum Defect MD / Sum Total MD) × 100
        const totalDefectMD = details.reduce((sum, d) => sum + parseFloat(d.defect_mandays || 0), 0)
        const totalMD = details.reduce((sum, d) => sum + parseFloat(d.total_mandays || 0), 0)
        actualValue = totalMD > 0
          ? Math.round(totalDefectMD * 100 / totalMD * 100) / 100
          : 0
        break
      }

      case 'Post Go-live Rework': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              project_code,
              project_name,
              rework_ratio_percent as actual_percent,
              rework_mandays,
              total_mandays,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_post_golive_rework
            ${whereClause}
            ORDER BY rework_ratio_percent ASC
          `)
        details = result.recordset
        // Calculate from totals: (Sum Rework MD / Sum Total MD) × 100
        const totalReworkMD = details.reduce((sum, d) => sum + parseFloat(d.rework_mandays || 0), 0)
        const totalMDRework = details.reduce((sum, d) => sum + parseFloat(d.total_mandays || 0), 0)
        actualValue = totalMDRework > 0
          ? Math.round(totalReworkMD * 100 / totalMDRework * 100) / 100
          : 0
        break
      }

      case 'Deploy Success Rate': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              customer_code as project_code,
              customer_name as project_name,
              success_rate_percent as actual_percent,
              successful_deploys as success_count,
              total_deploys,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_deploy_success
            ${whereClause}
            ORDER BY success_rate_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }

      case 'Pre-deploy Backup': {
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .query(`
            SELECT
              source_code as project_code,
              source_name as project_name,
              backup_compliance_percent as actual_percent,
              passed_backups as pass_count,
              total_backups,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_predeploy_backup
            ${whereClause}
            ORDER BY backup_compliance_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }

      case 'On-time Meeting Minutes': {
        let empWhereClause = whereClause
        if (employeeId) {
          empWhereClause += ' AND employee_id = @employeeId'
        }
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .input('employeeId', sql.UniqueIdentifier, employeeId)
          .query(`
            SELECT
              employee_name,
              employee_code as project_code,
              position as project_name,
              late_count,
              total_meetings,
              ontime_count,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_meeting_minutes
            ${empWhereClause}
            ORDER BY late_count ASC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? details.reduce((sum, d) => sum + (d.late_count || 0), 0)
          : 0
        break
      }

      case 'Required Docs On-time': {
        let empWhereClause = whereClause
        if (employeeId) {
          empWhereClause += ' AND employee_id = @employeeId'
        }
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .input('employeeId', sql.UniqueIdentifier, employeeId)
          .query(`
            SELECT
              employee_name,
              project_code,
              project_name,
              ontime_percent as actual_percent,
              ontime_count,
              total_docs,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_docs_ontime
            ${empWhereClause}
            ORDER BY ontime_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }

      case 'Issue Clearing': {
        let empWhereClause = whereClause
        if (employeeId) {
          empWhereClause += ' AND employee_id = @employeeId'
        }
        const result = await pool.request()
          .input('year', sql.Int, year)
          .input('periodValue', sql.Int, periodValue)
          .input('employeeId', sql.UniqueIdentifier, employeeId)
          .query(`
            SELECT
              employee_name,
              clearing_percent as actual_percent,
              cleared_tasks,
              pending_count,
              total_tasks,
              CASE WHEN is_pass = 1 THEN 'ผ่าน' ELSE 'ไม่ผ่าน' END as status
            FROM pms.vw_kpi_issue_clearing
            ${empWhereClause}
            ORDER BY clearing_percent DESC
          `)
        details = result.recordset
        actualValue = details.length > 0
          ? Math.round(details.reduce((sum, d) => sum + parseFloat(d.actual_percent || 0), 0) / details.length)
          : 0
        break
      }
    }

    // Determine target value
    const targetValue = kpiName === 'On-time Meeting Minutes' ? 3 :
      kpiName === 'Defect Ratio' ? 15 :
        kpiName === 'Post Go-live Rework' ? 8 :
          kpiName === 'Man-day Control' ? 85 :
            kpiName === 'Pre-deploy Backup' ? 100 :
              kpiName === 'Deploy Success Rate' ? 95 : 80

    // Determine pass/fail
    const isPass = kpiName === 'On-time Meeting Minutes' ? actualValue <= 3 :
      kpiName === 'Defect Ratio' ? actualValue <= 15 :
        kpiName === 'Post Go-live Rework' ? actualValue <= 8 :
          actualValue >= targetValue

    return {
      kpiName,
      category: info.category,
      target: info.target,
      targetValue,
      actualValue,
      isPass,
      description: info.description,
      formula: info.formula,
      details
    }
  } catch (error) {
    console.error('getKPIDetail error:', error)
    return null
  }
}

// ============================================
// Employee List for Personal KPI Filter
// ============================================

export interface EmployeeKPIOption {
  id: string
  name: string
  employeeCode: string
  position: string
}

export async function getEmployeesForPersonalKPI(
  kpiName: string,
  year: number,
  period: 'month' | 'quarter' | 'year',
  periodValue?: number
): Promise<EmployeeKPIOption[]> {
  try {
    const pool = await getConnection()

    // Get all active employees (like my-calendar does)
    // This ensures dropdown always has options even if no KPI data exists yet
    const result = await pool.request()
      .query(`
        SELECT
          e.id,
          e.employee_code,
          COALESCE(
            NULLIF(e.first_name_th, '') + ' ' + NULLIF(e.last_name_th, ''),
            NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''),
            e.nickname,
            e.employee_code
          ) as full_name,
          ISNULL(p.name, 'Unknown') as position_name
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1
        ORDER BY e.first_name_th, e.first_name, e.nickname
      `)

    return result.recordset.map(r => ({
      id: r.id,
      name: r.full_name,
      employeeCode: r.employee_code,
      position: r.position_name
    }))
  } catch (error) {
    console.error('getEmployeesForPersonalKPI error:', error)
    return []
  }
}
