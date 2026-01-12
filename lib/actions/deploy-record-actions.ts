'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Types
export interface DeployRecord {
    id: string
    customer_id: string
    customer_name?: string
    week_start_date: string
    year: number
    week_number: number
    deploy_count: number
    rollback_count: number
    success_rate?: number
    notes: string | null
    created_at: string
    created_by: string
    created_by_name?: string
}

export interface DeployRecordFilters {
    year: number
    customerId?: string
    page?: number
    pageSize?: number
}

// Get Deploy Records with filters
export async function getDeployRecords(filters: DeployRecordFilters) {
    try {
        const pool = await getConnection()
        const { year, customerId, page = 1, pageSize = 50 } = filters

        let whereClause = 'dr.year = @year'
        const request = pool.request()
        request.input('year', year)

        if (customerId) {
            whereClause += ' AND dr.customer_id = @customerId'
            request.input('customerId', customerId)
        }

        // Get total count
        const countResult = await pool.request()
            .input('year', year)
            .input('customerId', customerId || null)
            .query(`
                SELECT COUNT(*) as total
                FROM pms.deploy_success_records dr
                WHERE ${whereClause}
            `)

        const total = countResult.recordset[0].total
        const offset = (page - 1) * pageSize

        // Get records
        const result = await pool.request()
            .input('year', year)
            .input('customerId', customerId || null)
            .input('offset', offset)
            .input('pageSize', pageSize)
            .query(`
                SELECT
                    dr.id,
                    dr.customer_id,
                    c.name as customer_name,
                    dr.week_start_date,
                    dr.year,
                    dr.week_number,
                    dr.deploy_count,
                    dr.rollback_count,
                    dr.notes,
                    dr.created_at,
                    dr.created_by,
                    CONCAT(e.first_name, ' ', e.last_name) as created_by_name
                FROM pms.deploy_success_records dr
                LEFT JOIN pms.customers c ON dr.customer_id = c.id
                LEFT JOIN pms.employees e ON dr.created_by = e.id
                WHERE ${whereClause}
                ORDER BY dr.week_number DESC, c.name ASC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `)

        // Calculate success rate for each record
        const data = result.recordset.map((r: any) => ({
            ...r,
            success_rate: r.deploy_count > 0
                ? Math.round(((r.deploy_count - r.rollback_count) / r.deploy_count) * 100 * 10) / 10
                : 100
        }))

        return {
            success: true,
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }
    } catch (error) {
        console.error('Error fetching deploy records:', error)
        return { success: false, error: 'Failed to fetch deploy records', data: [], total: 0 }
    }
}

// Get single deploy record
export async function getDeployRecord(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT
                    dr.*,
                    c.name as customer_name,
                    CONCAT(e.first_name, ' ', e.last_name) as created_by_name
                FROM pms.deploy_success_records dr
                LEFT JOIN pms.customers c ON dr.customer_id = c.id
                LEFT JOIN pms.employees e ON dr.created_by = e.id
                WHERE dr.id = @id
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Record not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching deploy record:', error)
        return { success: false, error: 'Failed to fetch deploy record' }
    }
}

// Create deploy record
export async function createDeployRecord(data: {
    customer_id: string
    week_start_date: string
    year: number
    week_number: number
    deploy_count: number
    rollback_count: number
    notes?: string
    created_by: string
}) {
    try {
        const pool = await getConnection()

        // Check if record already exists for this customer + week
        const existing = await pool.request()
            .input('customer_id', data.customer_id)
            .input('year', data.year)
            .input('week_number', data.week_number)
            .query(`
                SELECT id FROM pms.deploy_success_records
                WHERE customer_id = @customer_id AND year = @year AND week_number = @week_number
            `)

        if (existing.recordset.length > 0) {
            return { success: false, error: 'Record already exists for this customer and week' }
        }

        const result = await pool.request()
            .input('customer_id', data.customer_id)
            .input('week_start_date', data.week_start_date)
            .input('year', data.year)
            .input('week_number', data.week_number)
            .input('deploy_count', data.deploy_count)
            .input('rollback_count', data.rollback_count)
            .input('notes', data.notes || null)
            .input('created_by', data.created_by)
            .query(`
                INSERT INTO pms.deploy_success_records
                (customer_id, week_start_date, year, week_number, deploy_count, rollback_count, notes, created_by)
                OUTPUT INSERTED.id
                VALUES (@customer_id, @week_start_date, @year, @week_number, @deploy_count, @rollback_count, @notes, @created_by)
            `)

        revalidatePath('/kpi-record/deploy-success')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating deploy record:', error)
        return { success: false, error: 'Failed to create deploy record' }
    }
}

// Update deploy record
export async function updateDeployRecord(id: string, data: {
    deploy_count: number
    rollback_count: number
    notes?: string
}) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .input('deploy_count', data.deploy_count)
            .input('rollback_count', data.rollback_count)
            .input('notes', data.notes || null)
            .query(`
                UPDATE pms.deploy_success_records
                SET deploy_count = @deploy_count,
                    rollback_count = @rollback_count,
                    notes = @notes,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/deploy-success')
        return { success: true }
    } catch (error) {
        console.error('Error updating deploy record:', error)
        return { success: false, error: 'Failed to update deploy record' }
    }
}

// Delete deploy record
export async function deleteDeployRecord(id: string) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.deploy_success_records WHERE id = @id')

        revalidatePath('/kpi-record/deploy-success')
        return { success: true }
    } catch (error) {
        console.error('Error deleting deploy record:', error)
        return { success: false, error: 'Failed to delete deploy record' }
    }
}

// Get deploy success KPI summary
export async function getDeploySuccessKPI(year: number, customerId?: string) {
    try {
        const pool = await getConnection()
        const request = pool.request()
        request.input('year', year)

        let whereClause = 'year = @year'
        if (customerId) {
            whereClause += ' AND customer_id = @customerId'
            request.input('customerId', customerId)
        }

        const result = await request.query(`
            SELECT
                ISNULL(SUM(deploy_count), 0) as total_deploy,
                ISNULL(SUM(rollback_count), 0) as total_rollback
            FROM pms.deploy_success_records
            WHERE ${whereClause}
        `)

        const stats = result.recordset[0]
        const totalDeploy = stats.total_deploy || 0
        const totalRollback = stats.total_rollback || 0
        const successCount = totalDeploy - totalRollback
        const successRate = totalDeploy > 0
            ? Math.round((successCount / totalDeploy) * 100 * 10) / 10
            : 100

        return {
            success: true,
            data: {
                total_deploy: totalDeploy,
                total_rollback: totalRollback,
                success_count: successCount,
                success_rate: successRate,
                target: 95,
                is_pass: successRate >= 95
            }
        }
    } catch (error) {
        console.error('Error fetching deploy success KPI:', error)
        return { success: false, error: 'Failed to fetch KPI' }
    }
}

// Get active customers for dropdown
export async function getActiveCustomers() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT id, name
            FROM pms.customers
            WHERE is_active = 1
            ORDER BY name ASC
        `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching customers:', error)
        return { success: false, error: 'Failed to fetch customers', data: [] }
    }
}
