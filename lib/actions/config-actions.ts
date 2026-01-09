'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface SystemConfig {
    id: string
    config_key: string
    config_value: string
    config_type: string
    description: string
}

export interface WorkloadConfig {
    workingHoursPerDay: number
    workingDaysPerWeek: number
    workloadWarningPercent: number
    workloadFullPercent: number
    mandayHours: number
}

// ============================================
// GET WORKLOAD CONFIG
// ============================================

export async function getWorkloadConfig(): Promise<{ success: boolean; data: WorkloadConfig; error?: string }> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .query(`
        SELECT config_key, config_value 
        FROM pms.system_configs 
        WHERE config_key IN (
          'WORKING_HOURS_PER_DAY',
          'WORKING_DAYS_PER_WEEK', 
          'WORKLOAD_WARNING_PERCENT',
          'WORKLOAD_FULL_PERCENT',
          'MANDAY_HOURS'
        )
      `)

        const configMap: Record<string, string> = {}
        for (const row of result.recordset) {
            configMap[row.config_key] = row.config_value
        }

        return {
            success: true,
            data: {
                workingHoursPerDay: parseFloat(configMap['WORKING_HOURS_PER_DAY'] || '7'),
                workingDaysPerWeek: parseInt(configMap['WORKING_DAYS_PER_WEEK'] || '5'),
                workloadWarningPercent: parseInt(configMap['WORKLOAD_WARNING_PERCENT'] || '70'),
                workloadFullPercent: parseInt(configMap['WORKLOAD_FULL_PERCENT'] || '100'),
                mandayHours: parseFloat(configMap['MANDAY_HOURS'] || '7')
            }
        }

    } catch (error: any) {
        console.error('getWorkloadConfig error:', error)
        return {
            success: false,
            error: error.message,
            data: {
                workingHoursPerDay: 7,
                workingDaysPerWeek: 5,
                workloadWarningPercent: 70,
                workloadFullPercent: 100,
                mandayHours: 7
            }
        }
    }
}

// ============================================
// UPDATE WORKLOAD CONFIG
// ============================================

export async function updateWorkloadConfig(config: Partial<WorkloadConfig>): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: { key: string; value: string }[] = []

        if (config.workingHoursPerDay !== undefined) {
            updates.push({ key: 'WORKING_HOURS_PER_DAY', value: config.workingHoursPerDay.toString() })
        }
        if (config.workingDaysPerWeek !== undefined) {
            updates.push({ key: 'WORKING_DAYS_PER_WEEK', value: config.workingDaysPerWeek.toString() })
        }
        if (config.workloadWarningPercent !== undefined) {
            updates.push({ key: 'WORKLOAD_WARNING_PERCENT', value: config.workloadWarningPercent.toString() })
        }
        if (config.workloadFullPercent !== undefined) {
            updates.push({ key: 'WORKLOAD_FULL_PERCENT', value: config.workloadFullPercent.toString() })
        }
        if (config.mandayHours !== undefined) {
            updates.push({ key: 'MANDAY_HOURS', value: config.mandayHours.toString() })
        }

        for (const update of updates) {
            await pool.request()
                .input('key', sql.NVarChar, update.key)
                .input('value', sql.NVarChar, update.value)
                .query(`
          UPDATE pms.system_configs 
          SET config_value = @value, updated_at = GETDATE()
          WHERE config_key = @key
        `)
        }

        revalidatePath('/settings')
        return { success: true }

    } catch (error: any) {
        console.error('updateWorkloadConfig error:', error)
        return { success: false, error: error.message }
    }
}
