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
function getDaysDiff(start: string | Date, end: string | Date): number {
    const d1 = new Date(start)
    const d2 = new Date(end)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// ============================================
// Shared Options
// ============================================
export async function getPresaleProjects() {
    try {
        const pool = await getConnection()
        // Fetch active projects for the combobox
        const result = await pool.request().query(`
            SELECT DISTINCT 
                p.id, 
                p.project_code, 
                p.name,
                CONCAT(p.project_code, ': ', p.name) as label
            FROM pms.projects p
            WHERE p.is_active = 1
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
            const daysTaken = getDaysDiff(r.sales_handover_date, r.customer_contact_date)
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
            SELECT * FROM pms.manday_assessment_records 
            WHERE 1=1
        `
        const req = pool.request()

        if (year) {
            query += ` AND YEAR(final_meeting_date) = @year`
            req.input('year', sql.Int, year)
        }
        if (employeeId) {
            query += ` AND created_by = @employeeId`
            req.input('employeeId', sql.UniqueIdentifier, employeeId)
        }

        query += ` ORDER BY created_at DESC`

        const result = await req.query(query)

        return result.recordset.map((r: any) => {
            const daysTaken = getDaysDiff(r.final_meeting_date, r.manday_submit_date)
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
