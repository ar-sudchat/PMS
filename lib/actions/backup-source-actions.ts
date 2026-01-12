'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Types
export interface BackupSource {
    id: string
    code: string
    name: string
    description: string | null
    source_type: string
    is_active: boolean
    sort_order: number
    created_at: string
    created_by: string | null
    updated_at: string | null
}

// Get Backup Sources with filters
export async function getBackupSources(filters?: {
    search?: string
    type?: string
    isActive?: boolean
}) {
    try {
        const pool = await getConnection()
        const request = pool.request()

        let whereClause = '1=1'

        if (filters?.search) {
            whereClause += ' AND (code LIKE @search OR name LIKE @search OR description LIKE @search)'
            request.input('search', `%${filters.search}%`)
        }

        if (filters?.type) {
            whereClause += ' AND source_type = @type'
            request.input('type', filters.type)
        }

        if (filters?.isActive !== undefined) {
            whereClause += ' AND is_active = @isActive'
            request.input('isActive', filters.isActive ? 1 : 0)
        }

        const result = await request.query(`
            SELECT
                id,
                code,
                name,
                description,
                source_type,
                is_active,
                sort_order,
                created_at,
                created_by,
                updated_at
            FROM pms.backup_sources
            WHERE ${whereClause}
            ORDER BY sort_order ASC, name ASC
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching backup sources:', error)
        return { success: false, error: 'Failed to fetch backup sources', data: [] }
    }
}

// Get active backup sources for dropdown
export async function getActiveBackupSources() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT
                id,
                code,
                name,
                source_type
            FROM pms.backup_sources
            WHERE is_active = 1
            ORDER BY sort_order ASC, name ASC
        `)
        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching active backup sources:', error)
        return { success: false, error: 'Failed to fetch backup sources', data: [] }
    }
}

// Get single backup source
export async function getBackupSource(id: string) {
    try {
        const pool = await getConnection()
        const result = await pool.request()
            .input('id', id)
            .query('SELECT * FROM pms.backup_sources WHERE id = @id')

        if (result.recordset.length === 0) {
            return { success: false, error: 'Backup source not found' }
        }

        return { success: true, data: result.recordset[0] }
    } catch (error) {
        console.error('Error fetching backup source:', error)
        return { success: false, error: 'Failed to fetch backup source' }
    }
}

// Create backup source
export async function createBackupSource(data: {
    code: string
    name: string
    source_type: string
    description?: string
    is_active?: boolean
    sort_order?: number
    created_by?: string
}) {
    try {
        const pool = await getConnection()

        // Check if code already exists
        const existing = await pool.request()
            .input('code', data.code)
            .query('SELECT id FROM pms.backup_sources WHERE code = @code')

        if (existing.recordset.length > 0) {
            return { success: false, error: 'Code already exists' }
        }

        const result = await pool.request()
            .input('code', data.code)
            .input('name', data.name)
            .input('source_type', data.source_type)
            .input('description', data.description || null)
            .input('is_active', data.is_active !== false ? 1 : 0)
            .input('sort_order', data.sort_order || 0)
            .input('created_by', data.created_by || null)
            .query(`
                INSERT INTO pms.backup_sources
                (code, name, source_type, description, is_active, sort_order, created_by)
                OUTPUT INSERTED.id
                VALUES (@code, @name, @source_type, @description, @is_active, @sort_order, @created_by)
            `)

        revalidatePath('/kpi-record/backup-sources')
        return { success: true, id: result.recordset[0].id }
    } catch (error) {
        console.error('Error creating backup source:', error)
        return { success: false, error: 'Failed to create backup source' }
    }
}

// Update backup source
export async function updateBackupSource(id: string, data: {
    code?: string
    name?: string
    source_type?: string
    description?: string
    is_active?: boolean
    sort_order?: number
}) {
    try {
        const pool = await getConnection()

        // Check if code already exists for another record
        if (data.code) {
            const existing = await pool.request()
                .input('code', data.code)
                .input('id', id)
                .query('SELECT id FROM pms.backup_sources WHERE code = @code AND id != @id')

            if (existing.recordset.length > 0) {
                return { success: false, error: 'Code already exists' }
            }
        }

        await pool.request()
            .input('id', id)
            .input('code', data.code)
            .input('name', data.name)
            .input('source_type', data.source_type)
            .input('description', data.description || null)
            .input('is_active', data.is_active !== false ? 1 : 0)
            .input('sort_order', data.sort_order || 0)
            .query(`
                UPDATE pms.backup_sources
                SET code = @code,
                    name = @name,
                    source_type = @source_type,
                    description = @description,
                    is_active = @is_active,
                    sort_order = @sort_order,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi-record/backup-sources')
        return { success: true }
    } catch (error) {
        console.error('Error updating backup source:', error)
        return { success: false, error: 'Failed to update backup source' }
    }
}

// Delete backup source
export async function deleteBackupSource(id: string) {
    try {
        const pool = await getConnection()

        // Check if source is being used in backup records
        const usageCheck = await pool.request()
            .input('id', id)
            .query('SELECT COUNT(*) as count FROM pms.deploy_backup_records WHERE backup_source_id = @id')

        if (usageCheck.recordset[0].count > 0) {
            return { success: false, error: 'Cannot delete: This source is being used in backup records' }
        }

        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.backup_sources WHERE id = @id')

        revalidatePath('/kpi-record/backup-sources')
        return { success: true }
    } catch (error) {
        console.error('Error deleting backup source:', error)
        return { success: false, error: 'Failed to delete backup source' }
    }
}
