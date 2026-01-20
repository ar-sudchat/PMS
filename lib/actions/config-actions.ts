'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

/**
 * Expand tilde (~) to home directory path
 */
function expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
        return path.join(os.homedir(), inputPath.slice(2))
    }
    if (inputPath === '~') {
        return os.homedir()
    }
    return inputPath
}

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

export interface FileStorageConfig {
    prodPath: string
    devPath: string
    activePath: 'PROD' | 'DEV'
    currentPath: string  // The actual path to use based on activePath
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

// ============================================
// GET FILE STORAGE CONFIG
// ============================================

const DEFAULT_FILE_STORAGE: FileStorageConfig = {
    prodPath: '\\\\10.8.8.88\\ftp\\pms',
    devPath: '\\\\10.8.8.88\\ftp\\pms-non',
    activePath: 'PROD',
    currentPath: '\\\\10.8.8.88\\ftp\\pms'
}

export async function getFileStorageConfig(): Promise<{ success: boolean; data: FileStorageConfig; error?: string }> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .query(`
                SELECT config_key, config_value
                FROM pms.system_configs
                WHERE config_key IN (
                    'FILE_STORAGE_PATH_PROD',
                    'FILE_STORAGE_PATH_DEV',
                    'FILE_STORAGE_ACTIVE'
                )
            `)

        const configMap: Record<string, string> = {}
        for (const row of result.recordset) {
            configMap[row.config_key] = row.config_value
        }

        const prodPath = configMap['FILE_STORAGE_PATH_PROD'] || DEFAULT_FILE_STORAGE.prodPath
        const devPath = configMap['FILE_STORAGE_PATH_DEV'] || DEFAULT_FILE_STORAGE.devPath
        const activePath = (configMap['FILE_STORAGE_ACTIVE'] || 'PROD') as 'PROD' | 'DEV'

        return {
            success: true,
            data: {
                prodPath,
                devPath,
                activePath,
                currentPath: activePath === 'PROD' ? prodPath : devPath
            }
        }

    } catch (error: any) {
        console.error('getFileStorageConfig error:', error)
        return {
            success: false,
            error: error.message,
            data: DEFAULT_FILE_STORAGE
        }
    }
}

// ============================================
// UPDATE FILE STORAGE CONFIG
// ============================================

export async function updateFileStorageConfig(config: Partial<Omit<FileStorageConfig, 'currentPath'>>): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: { key: string; value: string }[] = []

        if (config.prodPath !== undefined) {
            updates.push({ key: 'FILE_STORAGE_PATH_PROD', value: config.prodPath })
        }
        if (config.devPath !== undefined) {
            updates.push({ key: 'FILE_STORAGE_PATH_DEV', value: config.devPath })
        }
        if (config.activePath !== undefined) {
            updates.push({ key: 'FILE_STORAGE_ACTIVE', value: config.activePath })
        }

        for (const update of updates) {
            // Upsert: Update if exists, insert if not
            await pool.request()
                .input('key', sql.NVarChar, update.key)
                .input('value', sql.NVarChar, update.value)
                .query(`
                    IF EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = @key)
                        UPDATE pms.system_configs
                        SET config_value = @value, updated_at = GETDATE()
                        WHERE config_key = @key
                    ELSE
                        INSERT INTO pms.system_configs (config_key, config_value, config_type, description)
                        VALUES (@key, @value, 'string', 'File storage configuration')
                `)
        }

        revalidatePath('/settings')
        return { success: true }

    } catch (error: any) {
        console.error('updateFileStorageConfig error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// TEST FILE STORAGE CONNECTION
// ============================================

export async function testFileStorageConnection(storagePath: string): Promise<{
    success: boolean
    message: string
    canRead: boolean
    canWrite: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return {
                success: false,
                message: 'Unauthorized',
                canRead: false,
                canWrite: false,
                error: 'Unauthorized'
            }
        }

        // Expand tilde (~) to home directory
        const expandedPath = expandPath(storagePath)

        const testFileName = `_pms_test_${Date.now()}.txt`
        const testFilePath = path.join(expandedPath, testFileName)
        const testContent = `PMS Connection Test - ${new Date().toISOString()}`

        let canRead = false
        let canWrite = false

        // Test write access
        try {
            await fs.writeFile(testFilePath, testContent, 'utf-8')
            canWrite = true
        } catch (writeError: any) {
            return {
                success: false,
                message: `ไม่สามารถเขียนไฟล์ได้: ${writeError.message}`,
                canRead: false,
                canWrite: false,
                error: writeError.message
            }
        }

        // Test read access
        try {
            const readContent = await fs.readFile(testFilePath, 'utf-8')
            canRead = readContent === testContent
        } catch (readError: any) {
            // Clean up if possible
            try { await fs.unlink(testFilePath) } catch { }
            return {
                success: false,
                message: `ไม่สามารถอ่านไฟล์ได้: ${readError.message}`,
                canRead: false,
                canWrite: true,
                error: readError.message
            }
        }

        // Clean up test file
        try {
            await fs.unlink(testFilePath)
        } catch (deleteError: any) {
            return {
                success: true,
                message: `เชื่อมต่อสำเร็จ แต่ไม่สามารถลบไฟล์ทดสอบได้: ${deleteError.message}`,
                canRead: true,
                canWrite: true,
                error: deleteError.message
            }
        }

        return {
            success: true,
            message: 'เชื่อมต่อสำเร็จ สามารถอ่านและเขียนไฟล์ได้',
            canRead: true,
            canWrite: true
        }

    } catch (error: any) {
        console.error('testFileStorageConnection error:', error)
        return {
            success: false,
            message: `เกิดข้อผิดพลาด: ${error.message}`,
            canRead: false,
            canWrite: false,
            error: error.message
        }
    }
}

// ============================================
// MS TEAMS CONFIG
// ============================================

export interface MSTeamsConfig {
    clientId: string
    tenantId: string
    clientSecret: string
}

export async function getMSTeamsConfig(): Promise<{ success: boolean; data: MSTeamsConfig; error?: string }> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .query(`
                SELECT config_key, config_value
                FROM pms.system_configs
                WHERE config_key IN (
                    'MS_TEAMS_CLIENT_ID',
                    'MS_TEAMS_TENANT_ID',
                    'MS_TEAMS_CLIENT_SECRET'
                )
            `)

        const configMap: Record<string, string> = {}
        for (const row of result.recordset) {
            configMap[row.config_key] = row.config_value
        }

        return {
            success: true,
            data: {
                clientId: configMap['MS_TEAMS_CLIENT_ID'] || '',
                tenantId: configMap['MS_TEAMS_TENANT_ID'] || '',
                clientSecret: configMap['MS_TEAMS_CLIENT_SECRET'] || ''
            }
        }

    } catch (error: any) {
        console.error('getMSTeamsConfig error:', error)
        return {
            success: false,
            error: error.message,
            data: {
                clientId: '',
                tenantId: '',
                clientSecret: ''
            }
        }
    }
}

export async function updateMSTeamsConfig(config: MSTeamsConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: { key: string; value: string }[] = [
            { key: 'MS_TEAMS_CLIENT_ID', value: config.clientId },
            { key: 'MS_TEAMS_TENANT_ID', value: config.tenantId },
            { key: 'MS_TEAMS_CLIENT_SECRET', value: config.clientSecret }
        ]

        for (const update of updates) {
            await pool.request()
                .input('key', sql.NVarChar, update.key)
                .input('value', sql.NVarChar, update.value)
                .query(`
                    IF EXISTS (SELECT 1 FROM pms.system_configs WHERE config_key = @key)
                        UPDATE pms.system_configs
                        SET config_value = @value, updated_at = GETDATE()
                        WHERE config_key = @key
                    ELSE
                        INSERT INTO pms.system_configs (config_key, config_value, config_type, description)
                        VALUES (@key, @value, 'string', 'MS Teams configuration')
                `)
        }

        revalidatePath('/settings')
        return { success: true }

    } catch (error: any) {
        console.error('updateMSTeamsConfig error:', error)
        return { success: false, error: error.message }
    }
}
