'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Types
export interface DeployBackupRecord {
    id: string
    backup_source_id: string
    backup_source_code?: string
    backup_source_name?: string
    backup_source_type?: string
    backup_date: string
    deploy_record_id: string | null
    backup_type: string
    backup_location: string | null
    backup_size: string | null
    version_number: number
    is_verified: boolean
    verified_by: string | null
    verified_by_name?: string
    verified_at: string | null
    is_passed: boolean
    failed_reason: string | null
    notes: string | null
    created_at: string
    created_by: string
    created_by_name?: string
}

export interface BackupKPIResult {
    total: number
    passed: number
    failed: number
    pass_rate: number
    is_kpi_passed: boolean
    failed_records: {
        date: string
        source_name: string
        reason: string
    }[]
}

export interface DeployBackupFilters {
    backupSourceId?: string
    year?: number
    verified?: boolean | 'all'
    result?: 'all' | 'passed' | 'failed'
    search?: string
    page?: number
    pageSize?: number
}

// Get Deploy Backup Records with filters
export async function getDeployBackupRecords(filters: DeployBackupFilters = {}) {
    try {
        const pool = await getConnection()
        const { backupSourceId, year, verified, result, search, page = 1, pageSize = 20 } = filters

        let whereClause = '1=1'
        const request = pool.request()

        if (backupSourceId) {
            whereClause += ' AND db.backup_source_id = @backupSourceId'
            request.input('backupSourceId', backupSourceId)
        }

        if (year) {
            whereClause += ' AND YEAR(db.backup_date) = @year'
            request.input('year', year)
        }

        if (verified !== undefined && verified !== 'all') {
            whereClause += verified ? ' AND db.is_verified = 1' : ' AND db.is_verified = 0'
        }

        if (result && result !== 'all') {
            whereClause += result === 'passed' ? ' AND db.is_passed = 1' : ' AND db.is_passed = 0'
        }

        if (search) {
            whereClause += ' AND (bs.code LIKE @search OR bs.name LIKE @search OR db.backup_location LIKE @search)'
            request.input('search', `%${search}%`)
        }

        // Get total count
        const countResult = await request.query(`
            SELECT COUNT(*) as total
            FROM pms.deploy_backup_records db
            LEFT JOIN pms.backup_sources bs ON db.backup_source_id = bs.id
            WHERE ${whereClause}
        `)

        const total = countResult.recordset[0].total
        const offset = (page - 1) * pageSize

        // Get records
        const result2 = await pool.request()
            .input('backupSourceId', backupSourceId || null)
            .input('year', year || null)
            .input('search', search ? `%${search}%` : null)
            .input('offset', offset)
            .input('pageSize', pageSize)
            .query(`
                SELECT
                    db.id,
                    db.backup_source_id,
                    bs.code as backup_source_code,
                    bs.name as backup_source_name,
                    bs.source_type as backup_source_type,
                    db.backup_date,
                    db.deploy_record_id,
                    db.backup_type,
                    db.backup_location,
                    db.backup_size,
                    db.version_number,
                    db.is_verified,
                    db.verified_by,
                    COALESCE(NULLIF(ev.first_name, '') + ' ' + NULLIF(ev.last_name, ''), ev.nickname, ev.employee_code) as verified_by_name,
                    db.verified_at,
                    db.is_passed,
                    db.failed_reason,
                    db.notes,
                    db.created_at,
                    db.created_by,
                    COALESCE(NULLIF(ec.first_name, '') + ' ' + NULLIF(ec.last_name, ''), ec.nickname, ec.employee_code) as created_by_name
                FROM pms.deploy_backup_records db
                LEFT JOIN pms.backup_sources bs ON db.backup_source_id = bs.id
                LEFT JOIN pms.employees ev ON db.verified_by = ev.id
                LEFT JOIN pms.employees ec ON db.created_by = ec.id
                WHERE ${whereClause}
                ORDER BY db.backup_date DESC, db.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `)

        return {
            success: true,
            data: result2.recordset,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }
    } catch (error) {
        console.error('Error fetching deploy backup records:', error)
        return { success: false, error: 'Failed to fetch backup records', data: [], total: 0 }
    }
}

// Get single backup record
export async function getDeployBackupRecord(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT
                    db.*,
                    bs.code as backup_source_code,
                    bs.name as backup_source_name,
                    bs.source_type as backup_source_type,
                    COALESCE(NULLIF(ev.first_name, '') + ' ' + NULLIF(ev.last_name, ''), ev.nickname) as verified_by_name
                FROM pms.deploy_backup_records db
                LEFT JOIN pms.backup_sources bs ON db.backup_source_id = bs.id
                LEFT JOIN pms.employees ev ON db.verified_by = ev.id
                WHERE db.id = @id
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Record not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching backup record:', error)
        return { success: false, error: 'Failed to fetch backup record' }
    }
}

// Create backup record
export async function createDeployBackupRecord(data: {
    backup_source_id: string
    backup_date: string
    deploy_record_id?: string
    backup_type: string
    backup_location?: string
    backup_size?: string
    version_number: number
    is_verified: boolean
    verified_by?: string
    is_passed: boolean
    failed_reason?: string
    notes?: string
    created_by: string
}) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('backup_source_id', data.backup_source_id)
            .input('backup_date', data.backup_date)
            .input('deploy_record_id', data.deploy_record_id || null)
            .input('backup_type', data.backup_type)
            .input('backup_location', data.backup_location || null)
            .input('backup_size', data.backup_size || null)
            .input('version_number', data.version_number)
            .input('is_verified', data.is_verified)
            .input('verified_by', data.is_verified ? data.verified_by : null)
            .input('verified_at', data.is_verified ? new Date() : null)
            .input('is_passed', data.is_passed)
            .input('failed_reason', data.is_passed ? null : (data.failed_reason || null))
            .input('notes', data.notes || null)
            .input('created_by', data.created_by)
            .query(`
                INSERT INTO pms.deploy_backup_records
                (backup_source_id, backup_date, deploy_record_id, backup_type, backup_location, backup_size, version_number, is_verified, verified_by, verified_at, is_passed, failed_reason, notes, created_by)
                OUTPUT INSERTED.id
                VALUES (@backup_source_id, @backup_date, @deploy_record_id, @backup_type, @backup_location, @backup_size, @version_number, @is_verified, @verified_by, @verified_at, @is_passed, @failed_reason, @notes, @created_by)
            `)

        revalidatePath('/kpi-record/deploy-backup')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating backup record:', error)
        return { success: false, error: 'Failed to create backup record' }
    }
}

// Update backup record
export async function updateDeployBackupRecord(id: string, data: Partial<DeployBackupRecord>) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .input('backup_source_id', data.backup_source_id)
            .input('backup_date', data.backup_date)
            .input('deploy_record_id', data.deploy_record_id || null)
            .input('backup_type', data.backup_type)
            .input('backup_location', data.backup_location || null)
            .input('backup_size', data.backup_size || null)
            .input('version_number', data.version_number)
            .input('is_verified', data.is_verified)
            .input('verified_by', data.is_verified ? data.verified_by : null)
            .input('verified_at', data.is_verified ? new Date() : null)
            .input('is_passed', data.is_passed)
            .input('failed_reason', data.is_passed ? null : (data.failed_reason || null))
            .input('notes', data.notes || null)
            .query(`
                UPDATE pms.deploy_backup_records
                SET backup_source_id = @backup_source_id,
                    backup_date = @backup_date,
                    deploy_record_id = @deploy_record_id,
                    backup_type = @backup_type,
                    backup_location = @backup_location,
                    backup_size = @backup_size,
                    version_number = @version_number,
                    is_verified = @is_verified,
                    verified_by = @verified_by,
                    verified_at = @verified_at,
                    is_passed = @is_passed,
                    failed_reason = @failed_reason,
                    notes = @notes,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/deploy-backup')
        return { success: true }
    } catch (error) {
        console.error('Error updating backup record:', error)
        return { success: false, error: 'Failed to update backup record' }
    }
}

// Delete backup record
export async function deleteDeployBackupRecord(id: string) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.deploy_backup_records WHERE id = @id')

        revalidatePath('/kpi-record/deploy-backup')
        return { success: true }
    } catch (error) {
        console.error('Error deleting backup record:', error)
        return { success: false, error: 'Failed to delete backup record' }
    }
}

// Get backup summary
export async function getDeployBackupSummary(year?: number, backupSourceId?: string) {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = '1=1'
        if (year) {
            whereClause += ' AND YEAR(backup_date) = @year'
            request.input('year', year)
        }
        if (backupSourceId) {
            whereClause += ' AND backup_source_id = @backupSourceId'
            request.input('backupSourceId', backupSourceId)
        }

        const result = await request.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN is_passed = 0 THEN 1 ELSE 0 END) as failed
            FROM pms.deploy_backup_records
            WHERE ${whereClause}
        `)

        const stats = result.recordset[0]
        return {
            success: true,
            data: {
                total: stats.total || 0,
                verified: stats.verified || 0,
                pending: stats.pending || 0,
                passed: stats.passed || 0,
                failed: stats.failed || 0
            }
        }
    } catch (error) {
        console.error('Error fetching backup summary:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

// Get Backup KPI (Target: 100% Pass)
// Only counts backup types where is_kpi_counted = 1
export async function getBackupKPI(year: number): Promise<{ success: boolean, data?: BackupKPIResult, error?: string }> {
    try {
        const pool = await getConnection()

        // Get summary stats - only for KPI-counted types
        const summaryResult = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN db.is_passed = 1 THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN db.is_passed = 0 THEN 1 ELSE 0 END) as failed
                FROM pms.deploy_backup_records db
                LEFT JOIN pms.backup_types bt ON db.backup_type = bt.code
                WHERE YEAR(db.backup_date) = @year
                AND ISNULL(bt.is_kpi_counted, 1) = 1
            `)

        const stats = summaryResult.recordset[0]

        // Get failed records - only for KPI-counted types
        const failedResult = await pool.request()
            .input('year', year)
            .query(`
                SELECT
                    db.backup_date,
                    bs.name as source_name,
                    db.failed_reason,
                    db.backup_type
                FROM pms.deploy_backup_records db
                INNER JOIN pms.backup_sources bs ON db.backup_source_id = bs.id
                LEFT JOIN pms.backup_types bt ON db.backup_type = bt.code
                WHERE YEAR(db.backup_date) = @year
                AND db.is_passed = 0
                AND ISNULL(bt.is_kpi_counted, 1) = 1
                ORDER BY db.backup_date DESC
            `)

        const total = stats.total || 0
        const passed = stats.passed || 0
        const failed = stats.failed || 0
        const passRate = total > 0 ? (passed / total) * 100 : 100

        return {
            success: true,
            data: {
                total,
                passed,
                failed,
                pass_rate: Math.round(passRate * 100) / 100,
                is_kpi_passed: failed === 0, // ต้อง 0 fail ถึงจะผ่าน KPI
                failed_records: failedResult.recordset.map((r: any) => ({
                    date: r.backup_date,
                    source_name: r.source_name,
                    reason: r.failed_reason || 'No reason specified'
                }))
            }
        }
    } catch (error) {
        console.error('Error fetching backup KPI:', error)
        return { success: false, error: 'Failed to fetch KPI data' }
    }
}
