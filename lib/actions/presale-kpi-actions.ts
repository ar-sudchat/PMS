'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

// ============================================
// Types
// ============================================

// ============================================
// Types
// ============================================

export interface Attachment {
    id: string
    name: string
    path: string
    size: number
    type: string
}

export interface CustomerContactRecord {
    id: string
    project_name: string
    sales_handover_date: string // Date string
    customer_contact_date: string // Date string
    created_by: string
    created_at: string
    remark?: string
    attachments?: Attachment[]
    // Calculated
    days_taken?: number
    is_pass?: boolean
}

export interface MandayAssessmentRecord {
    id: string
    project_name: string
    final_meeting_date: string
    manday_submit_date: string
    created_by: string
    created_at: string
    remark?: string
    attachments?: Attachment[]
    // Calculated
    days_taken?: number
    is_pass?: boolean
}

// ============================================
// Helper Filters
// ============================================
// Count business days (exclude Sat/Sun) from day AFTER start to end (inclusive)
// e.g. meeting 5/3 (Thu), submit 11/3 (Wed) => count from 6/3 (Fri): Fri, Mon, Tue, Wed = 4 days
function getBusinessDaysDiff(start: string | Date, end: string | Date): number {
    const d1 = new Date(start)
    const d2 = new Date(end)
    // Normalize to date only (no time)
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)

    if (d2 <= d1) return 0

    let count = 0
    const current = new Date(d1)
    current.setDate(current.getDate() + 1) // Start from next day

    while (current <= d2) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
            count++
        }
        current.setDate(current.getDate() + 1)
    }
    return count
}

// ============================================
// Shared Options
// ============================================
export async function getPresaleProjects() {
    try {
        const pool = await getConnection()
        // Fetch active projects for the combobox (exclude cancelled)
        const result = await pool.request().query(`
            SELECT DISTINCT
                p.id,
                p.project_code,
                p.name,
                CONCAT(p.project_code, ': ', p.name) as label
            FROM pms.projects p
            LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
            WHERE p.is_active = 1
              AND (psc.code IS NULL OR psc.code NOT IN ('CANCELLED'))
            ORDER BY p.project_code DESC
        `)

        return result.recordset.map((r: any) => ({
            value: r.name, // We store Name as string in the record table for now
            label: r.label,
            code: r.project_code
        }))
    } catch (error) {
        console.error('getPresaleProjects error:', error)
        return []
    }
}

// ============================================
// 1. Customer Contact Records (Item 14)
// ============================================

// Get All (Filter by Year/Month optional, or fetch all for list)
export async function getCustomerContactRecords(year?: number, employeeId?: string) {
    try {
        const pool = await getConnection()
        let query = `
            SELECT * FROM pms.customer_contact_records 
            WHERE 1=1
        `
        const req = pool.request()

        if (year) {
            query += ` AND YEAR(sales_handover_date) = @year`
            req.input('year', sql.Int, year)
        }
        if (employeeId) {
            query += ` AND created_by = @employeeId`
            req.input('employeeId', sql.UniqueIdentifier, employeeId)
        }

        query += ` ORDER BY created_at DESC`

        const result = await req.query(query)

        return result.recordset.map((r: any) => {
            const daysTaken = getBusinessDaysDiff(r.sales_handover_date, r.customer_contact_date)
            let attachments: Attachment[] = []
            try {
                if (r.attachments) attachments = JSON.parse(r.attachments)
            } catch (e) {
                console.error('Error parsing attachments:', e)
            }

            return {
                ...r,
                days_taken: daysTaken,
                is_pass: daysTaken <= 2,
                attachments
            }
        })
    } catch (error) {
        console.error('getCustomerContactRecords error:', error)
        return []
    }
}

export async function createCustomerContactRecord(data: {
    project_name: string
    sales_handover_date: string
    customer_contact_date: string
    remark?: string
    attachments?: Attachment[]
}) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('projectName', sql.NVarChar, data.project_name)
            .input('handoverDate', sql.Date, data.sales_handover_date)
            .input('contactDate', sql.Date, data.customer_contact_date)
            .input('remark', sql.NVarChar, data.remark || null)
            .input('attachments', sql.NVarChar, data.attachments ? JSON.stringify(data.attachments) : null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.customer_contact_records 
                (project_name, sales_handover_date, customer_contact_date, created_by, created_at, updated_at, remark, attachments)
                VALUES (@projectName, @handoverDate, @contactDate, @createdBy, GETDATE(), GETDATE(), @remark, @attachments)
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('createCustomerContactRecord error:', error)
        return { success: false, error: 'Failed to create record' }
    }
}

// Update Customer Contact Record
export async function updateCustomerContactRecord(id: string, data: {
    project_name: string
    sales_handover_date: string
    customer_contact_date: string
    remark?: string
    attachments?: Attachment[]
}) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('projectName', sql.NVarChar, data.project_name)
            .input('handoverDate', sql.Date, data.sales_handover_date)
            .input('contactDate', sql.Date, data.customer_contact_date)
            .input('remark', sql.NVarChar, data.remark || null)
            .input('attachments', sql.NVarChar, data.attachments ? JSON.stringify(data.attachments) : null)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.customer_contact_records 
                SET project_name = @projectName,
                    sales_handover_date = @handoverDate,
                    customer_contact_date = @contactDate,
                    remark = @remark,
                    attachments = @attachments,
                    updated_at = GETDATE()
                WHERE id = @id AND created_by = @userId
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('updateCustomerContactRecord error:', error)
        return { success: false, error: 'Failed to update record' }
    }
}

// Delete Customer Contact Record
export async function deleteCustomerContactRecord(id: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                DELETE FROM pms.customer_contact_records 
                WHERE id = @id AND created_by = @userId
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('deleteCustomerContactRecord error:', error)
        return { success: false, error: 'Failed to delete record' }
    }
}

// ============================================
// 2. Manday Assessment Records (Item 15)
// ============================================

export async function getMandayAssessmentRecords(year?: number, employeeId?: string) {
    try {
        const pool = await getConnection()
        let query = `
            SELECT mar.*,
                p.project_code,
                p.id AS project_id
            FROM pms.manday_assessment_records mar
            LEFT JOIN pms.projects p ON p.name = mar.project_name AND p.is_active = 1
            WHERE 1=1
        `
        const req = pool.request()

        if (year) {
            query += ` AND YEAR(mar.final_meeting_date) = @year`
            req.input('year', sql.Int, year)
        }
        if (employeeId) {
            query += ` AND mar.created_by = @employeeId`
            req.input('employeeId', sql.UniqueIdentifier, employeeId)
        }

        query += ` ORDER BY mar.created_at DESC`

        const result = await req.query(query)

        return result.recordset.map((r: any) => {
            const daysTaken = getBusinessDaysDiff(r.final_meeting_date, r.manday_submit_date)
            let attachments: Attachment[] = []
            try {
                if (r.attachments) attachments = JSON.parse(r.attachments)
            } catch (e) {
                console.error('Error parsing attachments:', e)
            }

            return {
                ...r,
                days_taken: daysTaken,
                is_pass: daysTaken <= 3,
                attachments
            }
        })
    } catch (error) {
        console.error('getMandayAssessmentRecords error:', error)
        return []
    }
}

export async function createMandayAssessmentRecord(data: {
    project_name: string
    final_meeting_date: string
    manday_submit_date: string
    remark?: string
    attachments?: Attachment[]
}) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('projectName', sql.NVarChar, data.project_name)
            .input('meetingDate', sql.Date, data.final_meeting_date)
            .input('submitDate', sql.Date, data.manday_submit_date)
            .input('remark', sql.NVarChar, data.remark || null)
            .input('attachments', sql.NVarChar, data.attachments ? JSON.stringify(data.attachments) : null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.manday_assessment_records 
                (project_name, final_meeting_date, manday_submit_date, created_by, created_at, updated_at, remark, attachments)
                VALUES (@projectName, @meetingDate, @submitDate, @createdBy, GETDATE(), GETDATE(), @remark, @attachments)
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('createMandayAssessmentRecord error:', error)
        return { success: false, error: 'Failed to create record' }
    }
}

// Update Manday Assessment Record
export async function updateMandayAssessmentRecord(id: string, data: {
    project_name: string
    final_meeting_date: string
    manday_submit_date: string
    remark?: string
    attachments?: Attachment[]
}) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('projectName', sql.NVarChar, data.project_name)
            .input('meetingDate', sql.Date, data.final_meeting_date)
            .input('submitDate', sql.Date, data.manday_submit_date)
            .input('remark', sql.NVarChar, data.remark || null)
            .input('attachments', sql.NVarChar, data.attachments ? JSON.stringify(data.attachments) : null)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                UPDATE pms.manday_assessment_records 
                SET project_name = @projectName,
                    final_meeting_date = @meetingDate,
                    manday_submit_date = @submitDate,
                    remark = @remark,
                    attachments = @attachments,
                    updated_at = GETDATE()
                WHERE id = @id AND created_by = @userId
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('updateMandayAssessmentRecord error:', error)
        return { success: false, error: 'Failed to update record' }
    }
}

// Delete Manday Assessment Record
export async function deleteMandayAssessmentRecord(id: string) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                DELETE FROM pms.manday_assessment_records 
                WHERE id = @id AND created_by = @userId
            `)

        revalidatePath('/my-kpi')
        return { success: true }
    } catch (error) {
        console.error('deleteMandayAssessmentRecord error:', error)
        return { success: false, error: 'Failed to delete record' }
    }
}

// ============================================
// Monthly Trend Functions
// ============================================

export interface MonthlyTrendItem {
    month: number
    month_name: string
    total: number
    pass: number
    fail: number
    pass_rate: number
    is_pass: boolean
}

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export async function getCustomerContactMonthlyTrend(year: number): Promise<{ success: boolean; data: MonthlyTrendItem[] }> {
    try {
        const pool = await getConnection()

        // Fetch raw records and compute business days in JS for accuracy
        const result = await pool.request()
            .input('year', sql.Int, year)
            .query(`
                SELECT
                    MONTH(sales_handover_date) AS month,
                    sales_handover_date,
                    customer_contact_date
                FROM pms.customer_contact_records
                WHERE YEAR(sales_handover_date) = @year
            `)

        // Group by month and compute pass/fail using business days
        const monthMap = new Map<number, { total: number; pass: number; fail: number }>()
        for (const row of result.recordset) {
            const m = row.month as number
            if (!monthMap.has(m)) monthMap.set(m, { total: 0, pass: 0, fail: 0 })
            const entry = monthMap.get(m)!
            entry.total++
            const bizDays = getBusinessDaysDiff(row.sales_handover_date, row.customer_contact_date)
            if (bizDays <= 2) {
                entry.pass++
            } else {
                entry.fail++
            }
        }

        // Build monthly data for all 12 months
        const monthlyData: MonthlyTrendItem[] = []
        for (let m = 1; m <= 12; m++) {
            const found = monthMap.get(m)
            if (found) {
                const passRate = found.total > 0 ? Math.round((found.pass / found.total) * 100) : 100
                monthlyData.push({
                    month: m,
                    month_name: MONTH_NAMES[m - 1],
                    total: found.total,
                    pass: found.pass,
                    fail: found.fail,
                    pass_rate: passRate,
                    is_pass: passRate >= 85
                })
            } else {
                monthlyData.push({
                    month: m,
                    month_name: MONTH_NAMES[m - 1],
                    total: 0,
                    pass: 0,
                    fail: 0,
                    pass_rate: 100,
                    is_pass: true
                })
            }
        }

        return { success: true, data: monthlyData }
    } catch (error) {
        console.error('getCustomerContactMonthlyTrend error:', error)
        return { success: false, data: [] }
    }
}

export async function getMandayAssessmentMonthlyTrend(year: number, employeeId?: string): Promise<{ success: boolean; data: MonthlyTrendItem[] }> {
    try {
        const pool = await getConnection()

        // Fetch raw records and compute business days in JS for accuracy
        const req = pool.request()
            .input('year', sql.Int, year)

        let whereClause = 'WHERE YEAR(final_meeting_date) = @year'
        if (employeeId) {
            whereClause += ' AND created_by = @employeeId'
            req.input('employeeId', sql.UniqueIdentifier, employeeId)
        }

        const result = await req.query(`
                SELECT
                    MONTH(final_meeting_date) AS month,
                    final_meeting_date,
                    manday_submit_date
                FROM pms.manday_assessment_records
                ${whereClause}
            `)

        // Group by month and compute pass/fail using business days
        const monthMap = new Map<number, { total: number; pass: number; fail: number }>()
        for (const row of result.recordset) {
            const m = row.month as number
            if (!monthMap.has(m)) monthMap.set(m, { total: 0, pass: 0, fail: 0 })
            const entry = monthMap.get(m)!
            entry.total++
            const bizDays = getBusinessDaysDiff(row.final_meeting_date, row.manday_submit_date)
            if (bizDays <= 3) {
                entry.pass++
            } else {
                entry.fail++
            }
        }

        // Build monthly data for all 12 months
        const monthlyData: MonthlyTrendItem[] = []
        for (let m = 1; m <= 12; m++) {
            const found = monthMap.get(m)
            if (found) {
                const passRate = found.total > 0 ? Math.round((found.pass / found.total) * 100) : 100
                monthlyData.push({
                    month: m,
                    month_name: MONTH_NAMES[m - 1],
                    total: found.total,
                    pass: found.pass,
                    fail: found.fail,
                    pass_rate: passRate,
                    is_pass: passRate >= 85
                })
            } else {
                monthlyData.push({
                    month: m,
                    month_name: MONTH_NAMES[m - 1],
                    total: 0,
                    pass: 0,
                    fail: 0,
                    pass_rate: 100,
                    is_pass: true
                })
            }
        }

        return { success: true, data: monthlyData }
    } catch (error) {
        console.error('getMandayAssessmentMonthlyTrend error:', error)
        return { success: false, data: [] }
    }
}

// ============================================
// STATISTICS for Dashboard
// ============================================

export async function getPresaleKPIStats(
    employeeId: string,
    year: number,
    period: 'month' | 'quarter' | 'year',
    periodValue?: number
) {
    // 1. Customer Contact (Contact Customer) Stats
    const contacts = await getCustomerContactRecords(year, employeeId)
    // Filter by period
    const filteredContacts = contacts.filter(c => {
        const d = new Date(c.sales_handover_date) // Base on Handover date?
        if (period === 'month' && periodValue) return (d.getMonth() + 1) === periodValue
        if (period === 'quarter' && periodValue) return Math.ceil((d.getMonth() + 1) / 3) === periodValue
        return true
    })

    // Calculate Score
    const totalContacts = filteredContacts.length
    const passContacts = filteredContacts.filter(c => c.is_pass).length
    const contactScore = totalContacts > 0 ? (passContacts / totalContacts) * 100 : 100 // Default 100 if no task? 

    // 2. Manday Assessment Stats
    const assessments = await getMandayAssessmentRecords(year, employeeId)
    const filteredAssessments = assessments.filter(c => {
        const d = new Date(c.final_meeting_date)
        if (period === 'month' && periodValue) return (d.getMonth() + 1) === periodValue
        if (period === 'quarter' && periodValue) return Math.ceil((d.getMonth() + 1) / 3) === periodValue
        return true
    })

    const totalAssess = filteredAssessments.length
    const passAssess = filteredAssessments.filter(c => c.is_pass).length
    const assessScore = totalAssess > 0 ? (passAssess / totalAssess) * 100 : 100

    return {
        customer_contact: {
            actual_value: Math.round(contactScore),
            target_value: 85,
            is_pass: contactScore >= 85,
            total: totalContacts,
            details: filteredContacts
        },
        manday_assessment: {
            actual_value: Math.round(assessScore),
            target_value: 85,
            is_pass: assessScore >= 85,
            total: totalAssess,
            details: filteredAssessments
        }
    }
}
