'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getPresaleKPIStats } from '@/lib/actions/presale-kpi-actions'

// ============================================
// Types
// ============================================

export interface EmployeeOption {
    id: string
    name: string
    employee_code: string
    position: string
    department: string
}

export interface KPISummaryItem {
    kpi_name: string
    type: 'department' | 'personal'
    actual_value: number | null
    target_value: number
    target_label: string
    is_pass: boolean
    higher_is_better: boolean
    no_data?: boolean
    description: string
    formula: string
    raw_detail?: string // e.g. "Cleared 10/12 tasks" or "Defect 2.5 / Total 30 MD"
}

export interface ProjectKPIDetail {
    project_id: string
    project_code: string
    project_name: string
    kpi_name: string
    actual_value: number
    target_value: number
    is_pass: boolean
    detail_1_label: string
    detail_1_value: string
    detail_2_label: string
    detail_2_value: string
    remark?: string
}

export interface MonthlyKPIRow {
    month: number
    month_name: string
    kpi_name: string
    actual_value: number | null
    target_value: number
    is_pass: boolean
    raw_detail?: string
}

export interface IndividualKPIData {
    employee: EmployeeOption | null
    kpiSummary: KPISummaryItem[]
    projectDetails: ProjectKPIDetail[]
    monthlyBreakdown: MonthlyKPIRow[]
    overallScore: number
    passCount: number
    failCount: number
    totalCount: number
}

// ============================================
// KPI Descriptions (for executives)
// ============================================

const KPI_DESCRIPTIONS: Record<string, { description: string; formula: string }> = {
    'Time to Delivery': {
        description: 'วัดความสามารถในการส่งมอบ Milestone ตรงตามแผน (Mapping Data 35%, System Test 20%, UAT 30%, Go-Live 15%)',
        formula: 'Σ(Achievement% × Weight × Planned MD) / Σ(Planned MD × Weight) — ตรงเวลา=100%, ล่าช้า≤7วัน=80%, ≤14วัน=60%, >14วัน=40%'
    },
    'Man-day Control': {
        description: 'วัดการควบคุมการใช้ Man-day ในแต่ละ Milestone ให้เป็นไปตามแผน',
        formula: 'Σ(Control% × Weight × Planned MD) / Σ(Planned MD × Weight) — ตามแผน=100%, เกิน≤10%=90%, ≤20%=70%, >20%=50%'
    },
    'Defect Ratio': {
        description: 'สัดส่วน Man-day ที่ใช้แก้ Bug/Defect เทียบกับ Man-day ทั้งหมด — ยิ่งน้อยยิ่งดี',
        formula: '(MD แก้ Defect / MD พัฒนาทั้งหมด) × 100 — นับจาก task_type ที่เป็น Bug, Defect, Hotfix'
    },
    'Post Go-live Rework': {
        description: 'สัดส่วน Man-day ที่ใช้ทำงาน "ทุกประเภท" หลัง Go-Live เทียบกับ Man-day ทั้งหมด (ไม่ใช่เฉพาะ Bug)',
        formula: '(MD ทำงานหลัง Go-Live / MD ทั้งหมด) × 100 — นับ timesheet ทุก task หลังวัน Go-Live complete'
    },
    'Deploy Success Rate': {
        description: 'อัตราความสำเร็จในการ Deploy ระบบ (ไม่ Rollback)',
        formula: '(จำนวน Deploy สำเร็จ / จำนวน Deploy ทั้งหมด) × 100'
    },
    'Pre-deploy Backup': {
        description: 'อัตราการทำ Backup ก่อน Deploy และผ่านการตรวจสอบ',
        formula: '(Backup ที่ verified / Backup ทั้งหมด) × 100'
    },
    'Issue Clearing': {
        description: 'สัดส่วน Task ที่ assign ให้พนักงานคนนี้แล้ว Clear ได้ (status=Done หรือ Done Not Planned)',
        formula: '(Task ที่ Done / Task ที่ Due ถึงแล้ว + Task ที่ Done) × 100'
    },
    'On-time Meeting Minutes': {
        description: 'จำนวนครั้งที่ส่ง Meeting Minutes ล่าช้า (เกิน 24 ชม. หลังประชุมจบ) — ยิ่งน้อยยิ่งดี',
        formula: 'นับจำนวน MoM ที่ส่งหลังเกิน 24 ชม. + ที่ยังไม่ส่งแต่เกิน deadline แล้ว'
    },
    'Required Docs On-time': {
        description: 'สัดส่วนเอกสาร Deliverable ที่ส่งตรงเวลา (ตาม due_date ของ Milestone)',
        formula: '(เอกสารที่ submit ≤ due_date / เอกสารที่ due ถึงแล้ว) × 100'
    },
    'Contact Customer': {
        description: 'อัตราการติดต่อลูกค้าภายใน 2 วันทำการหลัง Sales ส่งต่อ',
        formula: '(ติดต่อได้ภายใน 2 วันทำการ / ทั้งหมด) × 100'
    },
    'Manday Assessment': {
        description: 'อัตราการส่ง Manday Assessment ภายใน 3 วันทำการหลังประชุมครั้งสุดท้าย',
        formula: '(ส่งได้ภายใน 3 วันทำการ / ทั้งหมด) × 100'
    }
}

// ============================================
// Month Names
// ============================================
const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// ============================================
// Get Active Employees with Position
// ============================================

export async function getEmployeesForAnalysis(): Promise<EmployeeOption[]> {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT
                e.id,
                e.employee_code,
                COALESCE(
                    NULLIF(e.first_name_th, '') + ' ' + NULLIF(e.last_name_th, ''),
                    NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''),
                    e.nickname,
                    e.employee_code
                ) AS name,
                ISNULL(p.code, 'N/A') AS position,
                ISNULL(d.name, '-') AS department
            FROM pms.employees e
            LEFT JOIN pms.positions p ON e.position_id = p.id
            LEFT JOIN pms.departments d ON e.department_id = d.id
            WHERE e.is_active = 1
            ORDER BY e.first_name_th, e.first_name, e.nickname
        `)
        return result.recordset
    } catch (error) {
        console.error('getEmployeesForAnalysis error:', error)
        return []
    }
}

// ============================================
// Get Individual KPI Analysis
// ============================================

export async function getIndividualKPIAnalysis(
    employeeId: string,
    year: number,
    month?: number // specific month or undefined for whole year
): Promise<IndividualKPIData> {
    const empty: IndividualKPIData = {
        employee: null, kpiSummary: [], projectDetails: [], monthlyBreakdown: [],
        overallScore: 0, passCount: 0, failCount: 0, totalCount: 0
    }

    try {
        const pool = await getConnection()

        // 1. Get employee info
        const empResult = await pool.request()
            .input('empId', sql.UniqueIdentifier, employeeId)
            .query(`
                SELECT
                    e.id, e.employee_code,
                    COALESCE(
                        NULLIF(e.first_name_th, '') + ' ' + NULLIF(e.last_name_th, ''),
                        NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''),
                        e.nickname, e.employee_code
                    ) AS name,
                    ISNULL(p.code, 'N/A') AS position,
                    ISNULL(d.name, '-') AS department
                FROM pms.employees e
                LEFT JOIN pms.positions p ON e.position_id = p.id
                LEFT JOIN pms.departments d ON e.department_id = d.id
                WHERE e.id = @empId
            `)
        if (empResult.recordset.length === 0) return empty
        const employee = empResult.recordset[0]
        // Normalize position code to uppercase for matching
        const position = (employee.position || '').toUpperCase()
        employee.position = position

        // 2. Get projects owned/managed by this employee
        const projResult = await pool.request()
            .input('empId', sql.UniqueIdentifier, employeeId)
            .query(`
                SELECT id FROM pms.projects
                WHERE is_active = 1
                AND (project_owner_id = @empId OR project_manager_id = @empId)
            `)
        const myProjectIds = projResult.recordset.map((r: any) => r.id)

        // Build period clause
        const monthClause = month ? 'AND month = @month' : ''
        const monthClauseWhere = month ? 'AND v.month = @month' : ''

        // KPI definitions by position
        const deptKPIDefs: Record<string, string[]> = {
            'PM': ['Time to Delivery', 'Man-day Control'],
            'PG': ['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate', 'Pre-deploy Backup'],
            'SA': ['Time to Delivery', 'Man-day Control', 'Post Go-live Rework', 'Deploy Success Rate'],
            'BA': ['Time to Delivery', 'Man-day Control', 'Post Go-live Rework', 'Deploy Success Rate'],
        }
        const personalKPIDefs: Record<string, string[]> = {
            'PM': ['On-time Meeting Minutes', 'Contact Customer', 'Manday Assessment'],
            'PG': ['Issue Clearing'],
            'SA': ['On-time Meeting Minutes', 'Required Docs On-time', 'Manday Assessment'],
            'BA': ['On-time Meeting Minutes', 'Required Docs On-time', 'Manday Assessment'],
        }

        const myDeptKPIs = deptKPIDefs[position] || []
        const myPersonalKPIs = personalKPIDefs[position] || []

        const kpiSummary: KPISummaryItem[] = []
        const projectDetails: ProjectKPIDetail[] = []
        const monthlyBreakdown: MonthlyKPIRow[] = []

        // Helper to make KPISummaryItem
        const makeKPI = (name: string, type: 'department' | 'personal', actual: number | null, target: number, label: string, isPass: boolean, hib: boolean, noData: boolean, rawDetail?: string): KPISummaryItem => ({
            kpi_name: name, type, actual_value: actual, target_value: target, target_label: label,
            is_pass: isPass, higher_is_better: hib, no_data: noData,
            description: KPI_DESCRIPTIONS[name]?.description || '', formula: KPI_DESCRIPTIONS[name]?.formula || '',
            raw_detail: rawDetail
        })

        // ============================================
        // Department KPIs — filter by employee's projects
        // ============================================

        // Build project filter
        const hasProjects = myProjectIds.length > 0
        const projectInClause = hasProjects
            ? `AND v.project_id IN (${myProjectIds.map((_: string, i: number) => `'${myProjectIds[i]}'`).join(',')})`
            : 'AND 1=0'

        // Time to Delivery
        if (myDeptKPIs.includes('Time to Delivery') && hasProjects) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT v.project_id, v.project_code, v.project_name, v.month,
                            v.milestone_name, v.milestone_weight,
                            v.time_to_delivery_percent, v.is_pass,
                            v.planned_date, v.actual_date, v.planned_mandays
                        FROM pms.vw_kpi_time_to_delivery v
                        INNER JOIN pms.projects p ON v.project_id = p.id
                        WHERE v.year = @year ${monthClauseWhere}
                        AND ISNULL(p.kpi_exclude_ttd, 0) = 0
                        ${projectInClause}
                        ORDER BY v.project_code
                    `)
                const rows = r.recordset
                if (rows.length > 0) {
                    const projectMap = new Map<string, any[]>()
                    for (const row of rows) {
                        if (!projectMap.has(row.project_id)) projectMap.set(row.project_id, [])
                        projectMap.get(row.project_id)!.push(row)
                    }
                    const sumWP = rows.reduce((s, d) => s + (d.time_to_delivery_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                    const sumWM = rows.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                    const overall = sumWM > 0 ? Math.round(sumWP * 100 / sumWM) : 0

                    kpiSummary.push(makeKPI('Time to Delivery', 'department', overall, 80, '≥ 80%', overall >= 80, true, false,
                        `${projectMap.size} โครงการ, ${rows.filter(r => r.is_pass === 0).length} milestone ไม่ผ่าน`))

                    for (const [projId, milestones] of projectMap) {
                        const wp = milestones.reduce((s, d) => s + (d.time_to_delivery_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                        const wm = milestones.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                        const projPct = wm > 0 ? Math.round(wp * 100 / wm * 100) / 100 : 0
                        const failedMs = milestones.filter(m => m.is_pass === 0)
                        projectDetails.push({
                            project_id: projId, project_code: milestones[0].project_code, project_name: milestones[0].project_name,
                            kpi_name: 'Time to Delivery', actual_value: projPct, target_value: 80, is_pass: projPct >= 80,
                            detail_1_label: 'Milestones', detail_1_value: `${milestones.length} milestones`,
                            detail_2_label: 'ไม่ผ่าน', detail_2_value: failedMs.length > 0 ? failedMs.map(m => m.milestone_name).join(', ') : '-',
                            remark: failedMs.length > 0 ? `ล่าช้า: ${failedMs.map(m => m.milestone_name).join(', ')}` : undefined
                        })
                    }

                    // Monthly breakdown for TTD
                    if (!month) {
                        const byMonth = new Map<number, any[]>()
                        for (const row of rows) { if (!byMonth.has(row.month)) byMonth.set(row.month, []); byMonth.get(row.month)!.push(row) }
                        for (const [m, mRows] of byMonth) {
                            const wp = mRows.reduce((s, d) => s + (d.time_to_delivery_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                            const wm = mRows.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                            const val = wm > 0 ? Math.round(wp * 100 / wm) : 0
                            monthlyBreakdown.push({ month: m, month_name: MONTH_NAMES[m - 1], kpi_name: 'Time to Delivery', actual_value: val, target_value: 80, is_pass: val >= 80 })
                        }
                    }
                } else {
                    kpiSummary.push(makeKPI('Time to Delivery', 'department', null, 80, '≥ 80%', true, true, true))
                }
            } catch (e) { console.error('TTD error:', e) }
        } else if (myDeptKPIs.includes('Time to Delivery')) {
            kpiSummary.push(makeKPI('Time to Delivery', 'department', null, 80, '≥ 80%', true, true, true, 'ไม่มีโครงการที่รับผิดชอบ'))
        }

        // Man-day Control
        if (myDeptKPIs.includes('Man-day Control') && hasProjects) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT v.project_id, v.project_code, v.project_name, v.month,
                            v.milestone_name, v.milestone_weight,
                            v.manday_control_percent, v.is_pass,
                            v.planned_mandays, v.actual_mandays
                        FROM pms.vw_kpi_manday_control v
                        INNER JOIN pms.projects p ON v.project_id = p.id
                        WHERE v.year = @year ${monthClauseWhere}
                        AND ISNULL(p.kpi_exclude_mdc, 0) = 0
                        ${projectInClause}
                        ORDER BY v.project_code
                    `)
                const rows = r.recordset
                if (rows.length > 0) {
                    const projectMap = new Map<string, any[]>()
                    for (const row of rows) { if (!projectMap.has(row.project_id)) projectMap.set(row.project_id, []); projectMap.get(row.project_id)!.push(row) }
                    const sumWP = rows.reduce((s, d) => s + (d.manday_control_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                    const sumWM = rows.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                    const overall = sumWM > 0 ? Math.round(sumWP * 100 / sumWM) : 0
                    const totalPlanned = rows.reduce((s, d) => s + (d.planned_mandays || 0), 0)
                    const totalActual = rows.reduce((s, d) => s + (d.actual_mandays || 0), 0)

                    kpiSummary.push(makeKPI('Man-day Control', 'department', overall, 85, '≥ 85%', overall >= 85, true, false,
                        `แผน ${Math.round(totalPlanned * 10) / 10} MD / จริง ${Math.round(totalActual * 10) / 10} MD`))

                    for (const [projId, milestones] of projectMap) {
                        const wp = milestones.reduce((s, d) => s + (d.manday_control_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                        const wm = milestones.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                        const projPct = wm > 0 ? Math.round(wp * 100 / wm * 100) / 100 : 0
                        const tP = milestones.reduce((s, d) => s + (d.planned_mandays || 0), 0)
                        const tA = milestones.reduce((s, d) => s + (d.actual_mandays || 0), 0)
                        projectDetails.push({
                            project_id: projId, project_code: milestones[0].project_code, project_name: milestones[0].project_name,
                            kpi_name: 'Man-day Control', actual_value: projPct, target_value: 85, is_pass: projPct >= 85,
                            detail_1_label: 'แผน', detail_1_value: `${Math.round(tP * 10) / 10} MD`,
                            detail_2_label: 'จริง', detail_2_value: `${Math.round(tA * 10) / 10} MD`,
                            remark: tA > tP ? `เกินแผน ${Math.round((tA - tP) * 10) / 10} MD` : undefined
                        })
                    }

                    if (!month) {
                        const byMonth = new Map<number, any[]>()
                        for (const row of rows) { if (!byMonth.has(row.month)) byMonth.set(row.month, []); byMonth.get(row.month)!.push(row) }
                        for (const [m, mRows] of byMonth) {
                            const wp = mRows.reduce((s, d) => s + (d.manday_control_percent || 0) * (d.milestone_weight || 0) * (d.planned_mandays || 1) / 100, 0)
                            const wm = mRows.reduce((s, d) => s + (d.planned_mandays || 1) * (d.milestone_weight || 0), 0)
                            const val = wm > 0 ? Math.round(wp * 100 / wm) : 0
                            monthlyBreakdown.push({ month: m, month_name: MONTH_NAMES[m - 1], kpi_name: 'Man-day Control', actual_value: val, target_value: 85, is_pass: val >= 85 })
                        }
                    }
                } else {
                    kpiSummary.push(makeKPI('Man-day Control', 'department', null, 85, '≥ 85%', true, true, true))
                }
            } catch (e) { console.error('MDC error:', e) }
        } else if (myDeptKPIs.includes('Man-day Control')) {
            kpiSummary.push(makeKPI('Man-day Control', 'department', null, 85, '≥ 85%', true, true, true, 'ไม่มีโครงการที่รับผิดชอบ'))
        }

        // Defect Ratio
        if (myDeptKPIs.includes('Defect Ratio') && hasProjects) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT v.project_id, v.project_code, v.project_name, v.month,
                            v.defect_mandays, v.total_mandays, v.defect_ratio_percent, v.is_pass
                        FROM pms.vw_kpi_defect_ratio v
                        INNER JOIN pms.projects p ON v.project_id = p.id
                        WHERE v.year = @year ${monthClauseWhere}
                        AND ISNULL(p.kpi_exclude_defect, 0) = 0
                        ${projectInClause}
                        ORDER BY v.defect_ratio_percent ASC
                    `)
                const rows = r.recordset
                if (rows.length > 0) {
                    const totalDefect = rows.reduce((s, d) => s + parseFloat(d.defect_mandays || 0), 0)
                    const totalMD = rows.reduce((s, d) => s + parseFloat(d.total_mandays || 0), 0)
                    const overall = totalMD > 0 ? Math.round(totalDefect * 100 / totalMD * 100) / 100 : 0

                    kpiSummary.push(makeKPI('Defect Ratio', 'department', overall, 15, '≤ 15%', overall <= 15, false, false,
                        `Defect ${Math.round(totalDefect * 100) / 100} / Total ${Math.round(totalMD * 100) / 100} MD`))

                    // Group by project
                    const projectMap = new Map<string, any[]>()
                    for (const row of rows) { if (!projectMap.has(row.project_id)) projectMap.set(row.project_id, []); projectMap.get(row.project_id)!.push(row) }
                    for (const [projId, pRows] of projectMap) {
                        const d = pRows.reduce((s, r) => s + parseFloat(r.defect_mandays || 0), 0)
                        const t = pRows.reduce((s, r) => s + parseFloat(r.total_mandays || 0), 0)
                        const pct = t > 0 ? Math.round(d * 100 / t * 100) / 100 : 0
                        projectDetails.push({
                            project_id: projId, project_code: pRows[0].project_code, project_name: pRows[0].project_name,
                            kpi_name: 'Defect Ratio', actual_value: pct, target_value: 15, is_pass: pct <= 15,
                            detail_1_label: 'Defect MD', detail_1_value: `${Math.round(d * 100) / 100}`,
                            detail_2_label: 'Total MD', detail_2_value: `${Math.round(t * 100) / 100}`
                        })
                    }

                    if (!month) {
                        const byMonth = new Map<number, any[]>()
                        for (const row of rows) { if (!byMonth.has(row.month)) byMonth.set(row.month, []); byMonth.get(row.month)!.push(row) }
                        for (const [m, mRows] of byMonth) {
                            const d = mRows.reduce((s, r) => s + parseFloat(r.defect_mandays || 0), 0)
                            const t = mRows.reduce((s, r) => s + parseFloat(r.total_mandays || 0), 0)
                            const val = t > 0 ? Math.round(d * 100 / t * 100) / 100 : 0
                            monthlyBreakdown.push({ month: m, month_name: MONTH_NAMES[m - 1], kpi_name: 'Defect Ratio', actual_value: val, target_value: 15, is_pass: val <= 15, raw_detail: `${Math.round(d * 10) / 10}/${Math.round(t * 10) / 10} MD` })
                        }
                    }
                } else {
                    kpiSummary.push(makeKPI('Defect Ratio', 'department', null, 15, '≤ 15%', true, false, true))
                }
            } catch (e) { console.error('DR error:', e) }
        } else if (myDeptKPIs.includes('Defect Ratio')) {
            kpiSummary.push(makeKPI('Defect Ratio', 'department', null, 15, '≤ 15%', true, false, true))
        }

        // Post Go-live Rework
        if (myDeptKPIs.includes('Post Go-live Rework') && hasProjects) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT v.project_id, v.project_code, v.project_name, v.month,
                            v.rework_mandays, v.total_mandays, v.rework_ratio_percent, v.is_pass
                        FROM pms.vw_kpi_post_golive_rework v
                        INNER JOIN pms.projects p ON v.project_id = p.id
                        WHERE v.year = @year ${monthClauseWhere}
                        AND ISNULL(p.kpi_exclude_rework, 0) = 0
                        ${projectInClause}
                        ORDER BY v.rework_ratio_percent ASC
                    `)
                const rows = r.recordset
                if (rows.length > 0) {
                    const totalRework = rows.reduce((s, d) => s + parseFloat(d.rework_mandays || 0), 0)
                    const totalMD = rows.reduce((s, d) => s + parseFloat(d.total_mandays || 0), 0)
                    const overall = totalMD > 0 ? Math.round(totalRework * 100 / totalMD * 100) / 100 : 0

                    kpiSummary.push(makeKPI('Post Go-live Rework', 'department', overall, 8, '≤ 8%', overall <= 8, false, false,
                        `Rework ${Math.round(totalRework * 100) / 100} / Total ${Math.round(totalMD * 100) / 100} MD`))

                    const projectMap = new Map<string, any[]>()
                    for (const row of rows) { if (!projectMap.has(row.project_id)) projectMap.set(row.project_id, []); projectMap.get(row.project_id)!.push(row) }
                    for (const [projId, pRows] of projectMap) {
                        const rw = pRows.reduce((s, r) => s + parseFloat(r.rework_mandays || 0), 0)
                        const t = pRows.reduce((s, r) => s + parseFloat(r.total_mandays || 0), 0)
                        const pct = t > 0 ? Math.round(rw * 100 / t * 100) / 100 : 0
                        projectDetails.push({
                            project_id: projId, project_code: pRows[0].project_code, project_name: pRows[0].project_name,
                            kpi_name: 'Post Go-live Rework', actual_value: pct, target_value: 8, is_pass: pct <= 8,
                            detail_1_label: 'Rework MD', detail_1_value: `${Math.round(rw * 100) / 100}`,
                            detail_2_label: 'Total MD', detail_2_value: `${Math.round(t * 100) / 100}`
                        })
                    }

                    if (!month) {
                        const byMonth = new Map<number, any[]>()
                        for (const row of rows) { if (!byMonth.has(row.month)) byMonth.set(row.month, []); byMonth.get(row.month)!.push(row) }
                        for (const [m, mRows] of byMonth) {
                            const rw = mRows.reduce((s, r) => s + parseFloat(r.rework_mandays || 0), 0)
                            const t = mRows.reduce((s, r) => s + parseFloat(r.total_mandays || 0), 0)
                            const val = t > 0 ? Math.round(rw * 100 / t * 100) / 100 : 0
                            monthlyBreakdown.push({ month: m, month_name: MONTH_NAMES[m - 1], kpi_name: 'Post Go-live Rework', actual_value: val, target_value: 8, is_pass: val <= 8 })
                        }
                    }
                } else {
                    kpiSummary.push(makeKPI('Post Go-live Rework', 'department', null, 8, '≤ 8%', true, false, true))
                }
            } catch (e) { console.error('Rework error:', e) }
        } else if (myDeptKPIs.includes('Post Go-live Rework')) {
            kpiSummary.push(makeKPI('Post Go-live Rework', 'department', null, 8, '≤ 8%', true, false, true))
        }

        // Deploy Success Rate (shared, not individual)
        if (myDeptKPIs.includes('Deploy Success Rate')) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT AVG(success_rate_percent) AS avg_rate, SUM(total_deploys) AS total_deploys, SUM(successful_deploys) AS success_deploys
                        FROM pms.vw_kpi_deploy_success
                        WHERE year = @year ${month ? 'AND month = @month' : ''}
                    `)
                const row = r.recordset[0]
                const avg = row?.avg_rate ? Math.round(parseFloat(row.avg_rate)) : null
                kpiSummary.push(makeKPI('Deploy Success Rate', 'department', avg, 95, '≥ 95%', avg === null || avg >= 95, true, avg === null,
                    avg !== null ? `Deploy ${row.success_deploys}/${row.total_deploys} ครั้ง` : undefined))
            } catch (e) { console.error('Deploy error:', e) }
        }

        // Pre-deploy Backup (shared, not individual)
        if (myDeptKPIs.includes('Pre-deploy Backup')) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT AVG(backup_compliance_percent) AS avg_rate, SUM(total_backups) AS total_backups, SUM(passed_backups) AS passed
                        FROM pms.vw_kpi_predeploy_backup
                        WHERE year = @year ${month ? 'AND month = @month' : ''}
                    `)
                const row = r.recordset[0]
                const avg = row?.avg_rate ? Math.round(parseFloat(row.avg_rate)) : null
                kpiSummary.push(makeKPI('Pre-deploy Backup', 'department', avg, 100, '100%', avg === null || avg >= 100, true, avg === null,
                    avg !== null ? `Verified ${row.passed}/${row.total_backups}` : undefined))
            } catch (e) { console.error('Backup error:', e) }
        }

        // ============================================
        // Personal KPIs (employee-specific)
        // ============================================

        // Issue Clearing
        if (myPersonalKPIs.includes('Issue Clearing')) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .query(`
                        SELECT month, SUM(cleared_tasks) AS cleared, SUM(pending_count) AS pending, SUM(total_tasks) AS total
                        FROM pms.vw_kpi_issue_clearing
                        WHERE employee_id = @empId AND year = @year ${monthClause}
                        GROUP BY month ORDER BY month
                    `)
                const rows = r.recordset
                const totalCleared = rows.reduce((s, r) => s + (r.cleared || 0), 0)
                const totalTasks = rows.reduce((s, r) => s + (r.total || 0), 0)
                const val = totalTasks > 0 ? Math.round(totalCleared * 100 / totalTasks * 100) / 100 : null

                kpiSummary.push(makeKPI('Issue Clearing', 'personal', val, 85, '≥ 85%', val === null || val >= 85, true, val === null,
                    val !== null ? `Clear ${totalCleared}/${totalTasks} tasks (ค้าง ${totalTasks - totalCleared})` : undefined))

                if (!month) {
                    for (const row of rows) {
                        const mVal = row.total > 0 ? Math.round(row.cleared * 100 / row.total * 100) / 100 : null
                        monthlyBreakdown.push({ month: row.month, month_name: MONTH_NAMES[row.month - 1], kpi_name: 'Issue Clearing', actual_value: mVal, target_value: 85, is_pass: mVal === null || mVal >= 85, raw_detail: `${row.cleared}/${row.total}` })
                    }
                }
            } catch (e) { console.error('IC error:', e) }
        }

        // On-time Meeting Minutes
        if (myPersonalKPIs.includes('On-time Meeting Minutes')) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .query(`
                        SELECT month, late_count, total_meetings, ontime_count
                        FROM pms.vw_kpi_meeting_minutes
                        WHERE employee_id = @empId AND year = @year ${monthClause}
                        ORDER BY month
                    `)
                const rows = r.recordset
                const totalLate = rows.reduce((s, r) => s + (r.late_count || 0), 0)
                const totalMeetings = rows.reduce((s, r) => s + (r.total_meetings || 0), 0)

                kpiSummary.push(makeKPI('On-time Meeting Minutes', 'personal', totalMeetings > 0 ? totalLate : null, 3, '≤ 3 ครั้ง', totalMeetings === 0 || totalLate <= 3, false, totalMeetings === 0,
                    totalMeetings > 0 ? `ล่าช้า ${totalLate} ครั้ง จากทั้งหมด ${totalMeetings} ครั้ง` : undefined))

                if (!month) {
                    for (const row of rows) {
                        monthlyBreakdown.push({ month: row.month, month_name: MONTH_NAMES[row.month - 1], kpi_name: 'On-time Meeting Minutes', actual_value: row.late_count, target_value: 3, is_pass: row.late_count <= 3, raw_detail: `ล่าช้า ${row.late_count}/${row.total_meetings}` })
                    }
                }
            } catch (e) { console.error('MoM error:', e) }
        }

        // Required Docs On-time
        if (myPersonalKPIs.includes('Required Docs On-time')) {
            try {
                const r = await pool.request()
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .query(`
                        SELECT month, SUM(ontime_count) AS ontime, SUM(late_count) AS late, SUM(total_docs) AS total
                        FROM pms.vw_kpi_docs_ontime
                        WHERE employee_id = @empId AND year = @year ${monthClause}
                        GROUP BY month ORDER BY month
                    `)
                const rows = r.recordset
                const totalOntime = rows.reduce((s, r) => s + (r.ontime || 0), 0)
                const totalDocs = rows.reduce((s, r) => s + (r.total || 0), 0)
                const val = totalDocs > 0 ? Math.round(totalOntime * 100 / totalDocs * 100) / 100 : null

                kpiSummary.push(makeKPI('Required Docs On-time', 'personal', val, 95, '≥ 95%', val === null || val >= 95, true, val === null,
                    val !== null ? `ตรงเวลา ${totalOntime}/${totalDocs} เอกสาร` : undefined))

                if (!month) {
                    for (const row of rows) {
                        const mVal = row.total > 0 ? Math.round(row.ontime * 100 / row.total * 100) / 100 : null
                        monthlyBreakdown.push({ month: row.month, month_name: MONTH_NAMES[row.month - 1], kpi_name: 'Required Docs On-time', actual_value: mVal, target_value: 95, is_pass: mVal === null || mVal >= 95, raw_detail: `${row.ontime}/${row.total}` })
                    }
                }
            } catch (e) { console.error('Docs error:', e) }
        }

        // Contact Customer & Manday Assessment
        if (myPersonalKPIs.includes('Contact Customer') || myPersonalKPIs.includes('Manday Assessment')) {
            try {
                const stats = await getPresaleKPIStats(employeeId, year, month ? 'month' : 'year', month || undefined)
                if (myPersonalKPIs.includes('Contact Customer')) {
                    const val = stats.customer_contact.actual_value
                    const total = stats.customer_contact.total
                    const passCount = stats.customer_contact.details?.filter((d: any) => d.is_pass).length || 0
                    kpiSummary.push(makeKPI('Contact Customer', 'personal', total > 0 ? val : null, 85, '≥ 85%', total <= 0 || stats.customer_contact.is_pass, true, total <= 0,
                        total > 0 ? `ผ่าน ${passCount}/${total} โครงการ` : undefined))
                }
                if (myPersonalKPIs.includes('Manday Assessment')) {
                    const val = stats.manday_assessment.actual_value
                    const total = stats.manday_assessment.total
                    const passCount = stats.manday_assessment.details?.filter((d: any) => d.is_pass).length || 0
                    kpiSummary.push(makeKPI('Manday Assessment', 'personal', total > 0 ? val : null, 85, '≥ 85%', total <= 0 || stats.manday_assessment.is_pass, true, total <= 0,
                        total > 0 ? `ผ่าน ${passCount}/${total} โครงการ` : undefined))
                }
            } catch (e) {
                if (myPersonalKPIs.includes('Contact Customer'))
                    kpiSummary.push(makeKPI('Contact Customer', 'personal', null, 85, '≥ 85%', true, true, true))
                if (myPersonalKPIs.includes('Manday Assessment'))
                    kpiSummary.push(makeKPI('Manday Assessment', 'personal', null, 85, '≥ 85%', true, true, true))
            }
        }

        // Calculate overall
        const withData = kpiSummary.filter(k => !k.no_data)
        const passCount = withData.filter(k => k.is_pass).length
        const failCount = withData.filter(k => !k.is_pass).length
        const totalCount = withData.length
        const overallScore = totalCount > 0 ? Math.round(passCount * 100 / totalCount) : 0

        // Sort monthly breakdown
        monthlyBreakdown.sort((a, b) => a.month - b.month || a.kpi_name.localeCompare(b.kpi_name))

        return { employee, kpiSummary, projectDetails, monthlyBreakdown, overallScore, passCount, failCount, totalCount }
    } catch (error) {
        console.error('getIndividualKPIAnalysis error:', error)
        return empty
    }
}

// ============================================
// Get Personal KPI Detail (for popup)
// ============================================

export interface PersonalKPIDetailRow {
    id: string
    date: string
    title: string
    status: string
    is_pass: boolean
    detail: string
    project_code?: string
    project_name?: string
}

export interface PersonalKPIDetailResult {
    kpi_name: string
    description: string
    formula: string
    target_label: string
    actual_value: number | null
    is_pass: boolean
    rows: PersonalKPIDetailRow[]
    summary: { total: number; pass: number; fail: number }
}

export async function getPersonalKPIDetail(
    employeeId: string,
    kpiName: string,
    year: number,
    month?: number
): Promise<PersonalKPIDetailResult> {
    const info = KPI_DESCRIPTIONS[kpiName] || { description: '', formula: '' }
    const empty: PersonalKPIDetailResult = {
        kpi_name: kpiName, description: info.description, formula: info.formula,
        target_label: '', actual_value: null, is_pass: true, rows: [], summary: { total: 0, pass: 0, fail: 0 }
    }

    try {
        const pool = await getConnection()
        const monthClause = month ? 'AND MONTH(date_col) = @month' : ''

        switch (kpiName) {
            case 'Issue Clearing': {
                empty.target_label = '≥ 85%'
                const r = await pool.request()
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT
                            t.id, t.title, t.task_code,
                            t.status, t.due_date,
                            s.project_id,
                            p.project_code, p.name AS project_name,
                            CASE WHEN t.status IN ('done','done_not_planned') THEN 1 ELSE 0 END AS is_cleared
                        FROM pms.tasks t
                        INNER JOIN pms.stories s ON t.story_id = s.id
                        INNER JOIN pms.projects p ON s.project_id = p.id
                        WHERE t.assignee_id = @empId AND t.is_active = 1 AND p.is_active = 1
                        AND t.due_date IS NOT NULL AND YEAR(t.due_date) = @year
                        ${month ? 'AND MONTH(t.due_date) = @month' : ''}
                        AND (t.status IN ('done','done_not_planned') OR t.due_date < GETDATE())
                        ORDER BY t.due_date DESC
                    `)
                const rows: PersonalKPIDetailRow[] = r.recordset.map((row: any) => ({
                    id: row.id,
                    date: row.due_date,
                    title: `${row.task_code || ''} ${row.title}`.trim(),
                    status: row.is_cleared ? 'Done' : 'ค้าง',
                    is_pass: row.is_cleared === 1,
                    detail: row.status,
                    project_code: row.project_code,
                    project_name: row.project_name
                }))
                const pass = rows.filter(r => r.is_pass).length
                const total = rows.length
                const val = total > 0 ? Math.round(pass * 100 / total * 100) / 100 : null
                return { ...empty, actual_value: val, is_pass: val === null || val >= 85, rows, summary: { total, pass, fail: total - pass } }
            }

            case 'On-time Meeting Minutes': {
                empty.target_label = '≤ 3 ครั้ง'
                const r = await pool.request()
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT
                            m.id, m.meeting_title, m.meeting_date, m.meeting_end_time,
                            m.mom_sent_at, m.meeting_type,
                            p.project_code, p.name AS project_name,
                            CASE
                                WHEN m.mom_sent_at IS NOT NULL AND
                                     DATEDIFF(HOUR, ISNULL(m.meeting_end_time, DATEADD(HOUR, 2, m.meeting_date)), m.mom_sent_at) <= 24
                                THEN 1
                                WHEN m.mom_sent_at IS NULL AND
                                     DATEADD(HOUR, 24, ISNULL(m.meeting_end_time, DATEADD(HOUR, 2, m.meeting_date))) >= GETDATE()
                                THEN 1
                                ELSE 0
                            END AS is_ontime
                        FROM pms.meeting_minutes_records m
                        LEFT JOIN pms.projects p ON m.project_id = p.id
                        WHERE m.organized_by = @empId
                        AND YEAR(m.meeting_date) = @year
                        ${month ? 'AND MONTH(m.meeting_date) = @month' : ''}
                        ORDER BY m.meeting_date DESC
                    `)
                const rows: PersonalKPIDetailRow[] = r.recordset.map((row: any) => {
                    const sentAt = row.mom_sent_at ? new Date(row.mom_sent_at).toLocaleString('th-TH') : 'ยังไม่ส่ง'
                    return {
                        id: row.id,
                        date: row.meeting_date,
                        title: row.meeting_title || row.meeting_type || '-',
                        status: row.is_ontime ? 'ตรงเวลา' : 'ล่าช้า',
                        is_pass: row.is_ontime === 1,
                        detail: `MoM: ${sentAt}`,
                        project_code: row.project_code,
                        project_name: row.project_name
                    }
                })
                const lateCount = rows.filter(r => !r.is_pass).length
                return { ...empty, actual_value: lateCount, is_pass: lateCount <= 3, rows, summary: { total: rows.length, pass: rows.filter(r => r.is_pass).length, fail: lateCount } }
            }

            case 'Required Docs On-time': {
                empty.target_label = '≥ 95%'
                const r = await pool.request()
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT
                            pd.id, dc.name AS doc_name,
                            pm.due_date, pd.submitted_date,
                            p.project_code, p.name AS project_name,
                            mc.name AS milestone_name,
                            CASE
                                WHEN pd.submitted_date IS NOT NULL AND pd.submitted_date <= pm.due_date THEN 1
                                ELSE 0
                            END AS is_ontime
                        FROM pms.project_deliverables pd
                        INNER JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                        INNER JOIN pms.projects p ON pm.project_id = p.id
                        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                        LEFT JOIN pms.deliverable_configs dc ON pd.deliverable_config_id = dc.id
                        WHERE p.project_owner_id = @empId AND p.is_active = 1
                        AND pm.due_date IS NOT NULL AND pd.is_required = 1
                        AND YEAR(pm.due_date) = @year
                        ${month ? 'AND MONTH(pm.due_date) = @month' : ''}
                        AND (pd.submitted_date IS NOT NULL OR pm.due_date < GETDATE())
                        ORDER BY pm.due_date DESC
                    `)
                const rows: PersonalKPIDetailRow[] = r.recordset.map((row: any) => ({
                    id: row.id,
                    date: row.due_date,
                    title: row.doc_name || 'Deliverable',
                    status: row.is_ontime ? 'ตรงเวลา' : (row.submitted_date ? 'ส่งล่าช้า' : 'ยังไม่ส่ง'),
                    is_pass: row.is_ontime === 1,
                    detail: row.milestone_name || '-',
                    project_code: row.project_code,
                    project_name: row.project_name
                }))
                const pass = rows.filter(r => r.is_pass).length
                const total = rows.length
                const val = total > 0 ? Math.round(pass * 100 / total * 100) / 100 : null
                return { ...empty, actual_value: val, is_pass: val === null || val >= 95, rows, summary: { total, pass, fail: total - pass } }
            }

            case 'Contact Customer': {
                empty.target_label = '≥ 85%'
                const r = await pool.request()
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT id, project_name, sales_handover_date, customer_contact_date, remark
                        FROM pms.customer_contact_records
                        WHERE created_by = @empId
                        AND YEAR(sales_handover_date) = @year
                        ${month ? 'AND MONTH(sales_handover_date) = @month' : ''}
                        ORDER BY sales_handover_date DESC
                    `)
                const rows: PersonalKPIDetailRow[] = r.recordset.map((row: any) => {
                    const d1 = new Date(row.sales_handover_date)
                    const d2 = new Date(row.customer_contact_date)
                    // Simple business days calc
                    let bDays = 0
                    const cur = new Date(d1); cur.setDate(cur.getDate() + 1)
                    while (cur <= d2) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) bDays++; cur.setDate(cur.getDate() + 1) }
                    return {
                        id: row.id, date: row.sales_handover_date,
                        title: row.project_name || '-',
                        status: bDays <= 2 ? 'ผ่าน' : 'ไม่ผ่าน',
                        is_pass: bDays <= 2,
                        detail: `${bDays} วันทำการ (เป้า ≤2)`
                    }
                })
                const pass = rows.filter(r => r.is_pass).length
                const total = rows.length
                const val = total > 0 ? Math.round(pass * 100 / total * 100) / 100 : null
                return { ...empty, actual_value: val, is_pass: val === null || val >= 85, rows, summary: { total, pass, fail: total - pass } }
            }

            case 'Manday Assessment': {
                empty.target_label = '≥ 85%'
                const r = await pool.request()
                    .input('empId', sql.UniqueIdentifier, employeeId)
                    .input('year', sql.Int, year).input('month', sql.Int, month || 0)
                    .query(`
                        SELECT id, project_name, final_meeting_date, manday_submit_date, remark
                        FROM pms.manday_assessment_records
                        WHERE created_by = @empId
                        AND YEAR(final_meeting_date) = @year
                        ${month ? 'AND MONTH(final_meeting_date) = @month' : ''}
                        ORDER BY final_meeting_date DESC
                    `)
                const rows: PersonalKPIDetailRow[] = r.recordset.map((row: any) => {
                    const d1 = new Date(row.final_meeting_date)
                    const d2 = new Date(row.manday_submit_date)
                    let bDays = 0
                    const cur = new Date(d1); cur.setDate(cur.getDate() + 1)
                    while (cur <= d2) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) bDays++; cur.setDate(cur.getDate() + 1) }
                    return {
                        id: row.id, date: row.final_meeting_date,
                        title: row.project_name || '-',
                        status: bDays <= 3 ? 'ผ่าน' : 'ไม่ผ่าน',
                        is_pass: bDays <= 3,
                        detail: `${bDays} วันทำการ (เป้า ≤3)`
                    }
                })
                const pass = rows.filter(r => r.is_pass).length
                const total = rows.length
                const val = total > 0 ? Math.round(pass * 100 / total * 100) / 100 : null
                return { ...empty, actual_value: val, is_pass: val === null || val >= 85, rows, summary: { total, pass, fail: total - pass } }
            }

            default:
                return empty
        }
    } catch (error) {
        console.error('getPersonalKPIDetail error:', error)
        return empty
    }
}
