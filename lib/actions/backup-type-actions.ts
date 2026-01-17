'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

// Types
export interface BackupType {
    id: string
    code: string
    name: string
    description: string | null
    is_kpi_counted: boolean
    is_active: boolean
    sort_order: number
    created_at: string
    created_by: string | null
    updated_at: string | null
}

// Get Backup Types with filters
export async function getBackupTypes(filters?: {
    search?: string
    isActive?: boolean
    isKpiCounted?: boolean
}) {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = '1=1'

        if (filters?.search) {
            whereClause += ' AND (code LIKE @search OR name LIKE @search OR description LIKE @search)'
            request.input('search', `%${filters.search}%`)
        }

        if (filters?.isActive !== undefined) {
            whereClause += ' AND is_active = @isActive'
            request.input('isActive', filters.isActive ? 1 : 0)
        }

        if (filters?.isKpiCounted !== undefined) {
            whereClause += ' AND is_kpi_counted = @isKpiCounted'
            request.input('isKpiCounted', filters.isKpiCounted ? 1 : 0)
        }

        const result = await request.query(`
            SELECT
                id,
                code,
                name,
                description,
                is_kpi_counted,
                is_active,
                sort_order,
                created_at,
                created_by,
                updated_at
            FROM pms.backup_types
            WHERE ${whereClause}
            ORDER BY sort_order ASC, name ASC
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching backup types:', error)
        return { success: false, error: 'Failed to fetch backup types', data: [] }
    }
}

// Get active backup types for dropdown
export async function getActiveBackupTypes() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT
                id,
                code,
                name,
                is_kpi_counted
            FROM pms.backup_types
            WHERE is_active = 1
            ORDER BY sort_order ASC, name ASC
        `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching active backup types:', error)
        return { success: false, error: 'Failed to fetch backup types', data: [] }
    }
}

// Get single backup type
export async function getBackupType(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT * FROM pms.backup_types WHERE id = @id')

        if (result.recordset.length === 0) {
            return { success: false, error: 'Backup type not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching backup type:', error)
        return { success: false, error: 'Failed to fetch backup type' }
    }
}

// Create backup type
export async function createBackupType(data: {
    code: string
    name: string
    description?: string
    is_kpi_counted?: boolean
    is_active?: boolean
    sort_order?: number
    created_by?: string
}) {
    try {
        const pool = await getConnection()

        // Check if code already exists
        const existing = await pool.request()
            .input('code', data.code)
            .query('SELECT id FROM pms.backup_types WHERE code = @code')

        if (existing.recordset.length > 0) {
            return { success: false, error: 'Code already exists' }
        }

        const result = await pool.request()
            .input('code', data.code)
            .input('name', data.name)
            .input('description', data.description || null)
            .input('is_kpi_counted', data.is_kpi_counted !== false ? 1 : 0)
            .input('is_active', data.is_active !== false ? 1 : 0)
            .input('sort_order', data.sort_order || 0)
            .input('created_by', data.created_by || null)
            .query(`
                INSERT INTO pms.backup_types
                (code, name, description, is_kpi_counted, is_active, sort_order, created_by)
                OUTPUT INSERTED.id
                VALUES (@code, @name, @description, @is_kpi_counted, @is_active, @sort_order, @created_by)
            `)

        revalidatePath('/kpi-record/backup-types')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating backup type:', error)
        return { success: false, error: 'Failed to create backup type' }
    }
}

// Update backup type
export async function updateBackupType(id: string, data: {
    code?: string
    name?: string
    description?: string
    is_kpi_counted?: boolean
    is_active?: boolean
    sort_order?: number
}) {
    try {
        const pool = await getConnection()

        // Check if code already exists for another record
        if (data.code) {
            const existing = await pool.request()
                .input('code', data.code)
                .input('id', sql.UniqueIdentifier, id)
                .query('SELECT id FROM pms.backup_types WHERE code = @code AND id != @id')

            if (existing.recordset.length > 0) {
                return { success: false, error: 'Code already exists' }
            }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('code', data.code)
            .input('name', data.name)
            .input('description', data.description || null)
            .input('is_kpi_counted', data.is_kpi_counted !== false ? 1 : 0)
            .input('is_active', data.is_active !== false ? 1 : 0)
            .input('sort_order', data.sort_order || 0)
            .query(`
                UPDATE pms.backup_types
                SET code = @code,
                    name = @name,
                    description = @description,
                    is_kpi_counted = @is_kpi_counted,
                    is_active = @is_active,
                    sort_order = @sort_order,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/backup-types')
        return { success: true }
    } catch (error) {
        console.error('Error updating backup type:', error)
        return { success: false, error: 'Failed to update backup type' }
    }
}

// Delete backup type
export async function deleteBackupType(id: string) {
    try {
        const pool = await getConnection()

        // Check if type is being used in backup records
        const usageCheck = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT COUNT(*) as count FROM pms.deploy_backup_records
                WHERE backup_type = (SELECT code FROM pms.backup_types WHERE id = @id)
            `)

        if (usageCheck.recordset[0].count > 0) {
            return { success: false, error: 'Cannot delete: This type is being used in backup records' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.backup_types WHERE id = @id')

        revalidatePath('/kpi-record/backup-types')
        return { success: true }
    } catch (error) {
        console.error('Error deleting backup type:', error)
        return { success: false, error: 'Failed to delete backup type' }
    }
}
