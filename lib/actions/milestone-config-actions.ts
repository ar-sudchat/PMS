"use server"

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { MilestoneConfigFormData } from '@/types/milestone-config'

// Default weight values by milestone name pattern
const DEFAULT_WEIGHTS: Record<string, { ttd: number; mdc: number }> = {
    'MAPPING': { ttd: 35, mdc: 30 },
    'SYSTEMTEST': { ttd: 20, mdc: 30 },
    'UAT': { ttd: 30, mdc: 20 },
    'GOLIVE': { ttd: 15, mdc: 10 },
    'CLOSEGOLIVE': { ttd: 0, mdc: 10 },
}

// Helper to check if name_th column exists in milestone_configs table
async function checkMilestoneConfigNameThColumn(pool: any): Promise<boolean> {
    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs'
        AND COLUMN_NAME = 'name_th'
    `)
    return columnCheck.recordset.length > 0
}

function getDefaultWeight(name: string, code: string): { ttd: number; mdc: number } {
    const upperName = name.toUpperCase()
    const upperCode = code.toUpperCase()

    if (upperName.includes('MAPPING') || upperCode.includes('MAPPING')) return DEFAULT_WEIGHTS['MAPPING']
    if (upperName.includes('SYSTEM') && upperName.includes('TEST') || upperCode.includes('SYSTEMTEST')) return DEFAULT_WEIGHTS['SYSTEMTEST']
    if (upperName.includes('UAT') || upperCode.includes('UAT')) return DEFAULT_WEIGHTS['UAT']
    if ((upperName.includes('GO') && upperName.includes('LIVE') && !upperName.includes('CLOSE')) || upperCode === 'GOLIVE') return DEFAULT_WEIGHTS['GOLIVE']
    if (upperName.includes('CLOSE') || upperCode.includes('CLOSE')) return DEFAULT_WEIGHTS['CLOSEGOLIVE']

    return { ttd: 0, mdc: 0 }
}

// GET ALL
export async function getMilestoneConfigs() {
    const pool = await getConnection()

    // Check if default_weight columns exist
    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs'
        AND COLUMN_NAME IN ('default_weight_ttd', 'default_weight_mdc')
    `)
    const hasDefaultWeightColumns = columnCheck.recordset.length >= 2

    const result = await pool.request()
        .query(`
            SELECT *
            FROM pms.milestone_configs
            WHERE is_active = 1
            ORDER BY sort_order
        `)

    // Add ttd_weight and mdc_weight with fallback logic in JavaScript
    return result.recordset.map((config: any) => {
        // Priority: default_weight > kpi_weight > hardcoded defaults
        let ttdValue = 0
        let mdcValue = 0

        if (hasDefaultWeightColumns) {
            ttdValue = Number(config.default_weight_ttd) || 0
            mdcValue = Number(config.default_weight_mdc) || 0
        }

        // Fallback to kpi_weight if default_weight is 0
        if (ttdValue === 0) ttdValue = Number(config.kpi_weight_ttd) || 0
        if (mdcValue === 0) mdcValue = Number(config.kpi_weight_mdc) || 0

        // Final fallback to hardcoded defaults based on name/code
        if (ttdValue === 0 && mdcValue === 0) {
            const defaults = getDefaultWeight(config.name || '', config.code || '')
            ttdValue = defaults.ttd
            mdcValue = defaults.mdc
        }

        return {
            ...config,
            ttd_weight: ttdValue,
            mdc_weight: mdcValue,
        }
    })
}

// GET ALL (include inactive)
export async function getAllMilestoneConfigs() {
    const pool = await getConnection()

    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs'
        AND COLUMN_NAME IN ('default_weight_ttd', 'default_weight_mdc')
    `)
    const hasDefaultWeightColumns = columnCheck.recordset.length >= 2

    const result = await pool.request()
        .query(`SELECT * FROM pms.milestone_configs ORDER BY sort_order`)

    return result.recordset.map((config: any) => {
        let ttdValue = 0
        let mdcValue = 0

        if (hasDefaultWeightColumns) {
            ttdValue = Number(config.default_weight_ttd) || 0
            mdcValue = Number(config.default_weight_mdc) || 0
        }

        if (ttdValue === 0) ttdValue = Number(config.kpi_weight_ttd) || 0
        if (mdcValue === 0) mdcValue = Number(config.kpi_weight_mdc) || 0

        if (ttdValue === 0 && mdcValue === 0) {
            const defaults = getDefaultWeight(config.name || '', config.code || '')
            ttdValue = defaults.ttd
            mdcValue = defaults.mdc
        }

        return {
            ...config,
            ttd_weight: ttdValue,
            mdc_weight: mdcValue,
        }
    })
}

// GET BY ID
export async function getMilestoneConfigById(id: string) {
    const pool = await getConnection()

    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'milestone_configs'
        AND COLUMN_NAME IN ('default_weight_ttd', 'default_weight_mdc')
    `)
    const hasDefaultWeightColumns = columnCheck.recordset.length >= 2

    const result = await pool.request()
        .input('id', id)
        .query(`SELECT * FROM pms.milestone_configs WHERE id = @id`)

    const config = result.recordset[0]
    if (!config) return null

    let ttdValue = 0
    let mdcValue = 0

    if (hasDefaultWeightColumns) {
        ttdValue = Number(config.default_weight_ttd) || 0
        mdcValue = Number(config.default_weight_mdc) || 0
    }

    if (ttdValue === 0) ttdValue = Number(config.kpi_weight_ttd) || 0
    if (mdcValue === 0) mdcValue = Number(config.kpi_weight_mdc) || 0

    if (ttdValue === 0 && mdcValue === 0) {
        const defaults = getDefaultWeight(config.name || '', config.code || '')
        ttdValue = defaults.ttd
        mdcValue = defaults.mdc
    }

    return {
        ...config,
        ttd_weight: ttdValue,
        mdc_weight: mdcValue,
    }
}

// CREATE
export async function createMilestoneConfig(data: MilestoneConfigFormData) {
    const pool = await getConnection()
    const hasNameTh = await checkMilestoneConfigNameThColumn(pool)

    // Check duplicate code
    const existing = await pool.request()
        .input('code', data.code)
        .query('SELECT id FROM pms.milestone_configs WHERE code = @code')

    if (existing.recordset.length > 0) {
        throw new Error('รหัส Milestone นี้มีอยู่แล้ว');
    }

    const request = pool.request()
        .input('code', data.code.toUpperCase())
        .input('name', data.name)
        .input('description', data.description || null)
        .input('color', data.color || '#6366f1')
        .input('icon', data.icon || null)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .input('kpi_weight_ttd', data.kpi_weight_ttd || 0)
        .input('kpi_weight_mdc', data.kpi_weight_mdc || 0)
        .input('is_go_live', data.is_go_live ? 1 : 0)
        .input('is_post_go_live', data.is_post_go_live ? 1 : 0)

    let result
    if (hasNameTh) {
        request.input('name_th', data.name_th || null)
        result = await request.query(`
            INSERT INTO pms.milestone_configs
            (code, name, name_th, description, color, icon, sort_order, is_active, kpi_weight_ttd, kpi_weight_mdc, is_go_live, is_post_go_live)
            OUTPUT INSERTED.id
            VALUES
            (@code, @name, @name_th, @description, @color, @icon, @sort_order, @is_active, @kpi_weight_ttd, @kpi_weight_mdc, @is_go_live, @is_post_go_live)
        `)
    } else {
        result = await request.query(`
            INSERT INTO pms.milestone_configs
            (code, name, description, color, icon, sort_order, is_active, kpi_weight_ttd, kpi_weight_mdc, is_go_live, is_post_go_live)
            OUTPUT INSERTED.id
            VALUES
            (@code, @name, @description, @color, @icon, @sort_order, @is_active, @kpi_weight_ttd, @kpi_weight_mdc, @is_go_live, @is_post_go_live)
        `)
    }

    revalidatePath('/projects/settings/milestones')
    return { success: true, id: result.recordset[0].id }
}

// UPDATE
export async function updateMilestoneConfig(id: string, data: MilestoneConfigFormData) {
    const pool = await getConnection()
    const hasNameTh = await checkMilestoneConfigNameThColumn(pool)

    const request = pool.request()
        .input('id', id)
        .input('name', data.name)
        .input('description', data.description || null)
        .input('color', data.color || '#6366f1')
        .input('icon', data.icon || null)
        .input('sort_order', data.sort_order || 0)
        .input('is_active', data.is_active ? 1 : 0)
        .input('kpi_weight_ttd', data.kpi_weight_ttd || 0)
        .input('kpi_weight_mdc', data.kpi_weight_mdc || 0)
        .input('is_go_live', data.is_go_live ? 1 : 0)
        .input('is_post_go_live', data.is_post_go_live ? 1 : 0)

    if (hasNameTh) {
        request.input('name_th', data.name_th || null)
        await request.query(`
            UPDATE pms.milestone_configs SET
                name = @name,
                name_th = @name_th,
                description = @description,
                color = @color,
                icon = @icon,
                sort_order = @sort_order,
                is_active = @is_active,
                kpi_weight_ttd = @kpi_weight_ttd,
                kpi_weight_mdc = @kpi_weight_mdc,
                is_go_live = @is_go_live,
                is_post_go_live = @is_post_go_live
            WHERE id = @id
        `)
    } else {
        await request.query(`
            UPDATE pms.milestone_configs SET
                name = @name,
                description = @description,
                color = @color,
                icon = @icon,
                sort_order = @sort_order,
                is_active = @is_active,
                kpi_weight_ttd = @kpi_weight_ttd,
                kpi_weight_mdc = @kpi_weight_mdc,
                is_go_live = @is_go_live,
                is_post_go_live = @is_post_go_live
            WHERE id = @id
        `)
    }

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}

// DELETE (soft delete)
// DELETE (hard delete, fallback to soft delete if used)
export async function deleteMilestoneConfig(id: string) {
    const pool = await getConnection()

    try {
        await pool.request()
            .input('id', id)
            .query('DELETE FROM pms.milestone_configs WHERE id = @id')
    } catch (error: any) {
        // If FK constraint exists (number 547), fallback to soft delete
        if (error.number === 547) {
            console.warn("Hard delete failed due to FK, falling back to soft delete:", error.message)
            await pool.request()
                .input('id', id)
                .query('UPDATE pms.milestone_configs SET is_active = 0 WHERE id = @id')
        } else {
            throw error
        }
    }

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}

// REORDER
export async function reorderMilestoneConfigs(items: { id: string, sort_order: number }[]) {
    const pool = await getConnection()

    for (const item of items) {
        await pool.request()
            .input('id', item.id)
            .input('sort_order', item.sort_order)
            .query('UPDATE pms.milestone_configs SET sort_order = @sort_order WHERE id = @id')
    }

    revalidatePath('/projects/settings/milestones')
    return { success: true }
}
