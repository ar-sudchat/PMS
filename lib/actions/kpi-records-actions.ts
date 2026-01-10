'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Types
export interface WeeklyKPIRecord {
    id?: string
    year: number
    week_number: number
    week_start_date: string // ISO string when input
    week_end_date: string // ISO string when input
    total_deploys: number
    total_rollbacks: number
    deploy_success_rate?: number
    rollback_notes?: string
    backup_completed: boolean
    backup_date?: string | null
    backup_versions?: number
    backup_location?: string
    notes?: string
    is_recorded?: boolean
}

export interface LateMeetingRecord {
    id?: string
    project_id?: string
    project_name?: string
    meeting_date: string
    meeting_end_time: string
    meeting_type: string
    submitted_date: string
    submitted_time: string
    hours_late?: number
    late_reason?: string
    year: number
}

export interface KPIOperationalSummary {
    year: number
    total_deploys: number
    total_rollbacks: number
    deploy_success_rate: number
    deploy_target: number
    deploy_status: 'PASS' | 'FAIL'
    total_weeks: number
    weeks_backup_done: number
    backup_rate: number
    backup_target: number
    backup_status: 'PASS' | 'FAIL'
    late_meeting_count: number
    late_meeting_target: number
    late_meeting_status: 'PASS' | 'FAIL'
}

// Get KPI Summary
export async function getKPIOperationalSummary(year?: number): Promise<KPIOperationalSummary | null> {
    try {
        const pool = await getConnection()
        const targetYear = year || new Date().getFullYear()

        const result = await pool.request()
            .input('year', sql.Int, targetYear)
            .query(`
                SELECT TOP 1 * 
                FROM pms.vw_kpi_operational_summary 
                WHERE year = @year
            `)

        if (result.recordset.length > 0) {
            return result.recordset[0] as KPIOperationalSummary
        }

        // Return default empty if no records
        return {
            year: targetYear,
            total_deploys: 0,
            total_rollbacks: 0,
            deploy_success_rate: 100,
            deploy_target: 95,
            deploy_status: 'PASS',
            total_weeks: 0,
            weeks_backup_done: 0,
            backup_rate: 0,
            backup_target: 100,
            backup_status: 'FAIL', // Default fail if 0 records usually? Or 0%
            late_meeting_count: 0,
            late_meeting_target: 3,
            late_meeting_status: 'PASS'
        }
    } catch (error) {
        console.error('getKPIOperationalSummary error:', error)
        return null
    }
}

// Get Weekly Records List
export async function getWeeklyKPIRecords(year?: number): Promise<WeeklyKPIRecord[]> {
    try {
        const pool = await getConnection()
        const targetYear = year || new Date().getFullYear()

        const result = await pool.request()
            .input('year', sql.Int, targetYear)
            .query(`
                SELECT * FROM pms.vw_kpi_weekly_list 
                WHERE year = @year
                ORDER BY week_number DESC
            `)

        return result.recordset
    } catch (error) {
        console.error('getWeeklyKPIRecords error:', error)
        return []
    }
}

// Save Weekly Record (create or update)
export async function saveWeeklyKPIRecord(data: WeeklyKPIRecord): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const employeeId = (user as any).employeeId || user.id

        // Check if exists
        const check = await pool.request()
            .input('year', sql.Int, data.year)
            .input('week_number', sql.Int, data.week_number)
            .query(`SELECT id FROM pms.kpi_weekly_records WHERE year = @year AND week_number = @week_number AND is_active = 1`)

        if (check.recordset.length > 0) {
            // Update
            await pool.request()
                .input('id', sql.UniqueIdentifier, check.recordset[0].id)
                .input('total_deploys', sql.Int, data.total_deploys)
                .input('total_rollbacks', sql.Int, data.total_rollbacks)
                .input('rollback_notes', sql.NVarChar, data.rollback_notes || null)
                .input('backup_completed', sql.Bit, data.backup_completed)
                .input('backup_date', sql.Date, data.backup_date || null)
                .input('backup_location', sql.NVarChar, data.backup_location || null)
                .input('notes', sql.NVarChar, data.notes || null)
                .input('updated_at', sql.DateTime2, new Date())
                .query(`
                    UPDATE pms.kpi_weekly_records
                    SET total_deploys = @total_deploys,
                        total_rollbacks = @total_rollbacks,
                        rollback_notes = @rollback_notes,
                        backup_completed = @backup_completed,
                        backup_date = @backup_date,
                        backup_location = @backup_location,
                        notes = @notes,
                        updated_at = @updated_at
                    WHERE id = @id
                `)
        } else {
            // Create
            await pool.request()
                .input('year', sql.Int, data.year)
                .input('week_number', sql.Int, data.week_number)
                .input('week_start_date', sql.Date, data.week_start_date)
                .input('week_end_date', sql.Date, data.week_end_date)
                .input('total_deploys', sql.Int, data.total_deploys)
                .input('total_rollbacks', sql.Int, data.total_rollbacks)
                .input('rollback_notes', sql.NVarChar, data.rollback_notes || null)
                .input('backup_completed', sql.Bit, data.backup_completed)
                .input('backup_date', sql.Date, data.backup_date || null)
                .input('backup_location', sql.NVarChar, data.backup_location || null)
                .input('notes', sql.NVarChar, data.notes || null)
                .input('recorded_by', sql.UniqueIdentifier, employeeId)
                .query(`
                    INSERT INTO pms.kpi_weekly_records
                    (year, week_number, week_start_date, week_end_date, total_deploys, total_rollbacks, rollback_notes, backup_completed, backup_date, backup_location, notes, recorded_by)
                    VALUES
                    (@year, @week_number, @week_start_date, @week_end_date, @total_deploys, @total_rollbacks, @rollback_notes, @backup_completed, @backup_date, @backup_location, @notes, @recorded_by)
                `)
        }

        revalidatePath('/kpi/records')
        return { success: true }
    } catch (error) {
        console.error('saveWeeklyKPIRecord error:', error)
        return { success: false, error: 'Failed to save record' }
    }
}

// Get Late Meeting Records
export async function getLateMeetingRecords(year?: number): Promise<LateMeetingRecord[]> {
    try {
        const pool = await getConnection()
        const targetYear = year || new Date().getFullYear()

        const result = await pool.request()
            .input('year', sql.Int, targetYear)
            .query(`
                SELECT 
                    m.*,
                    p.project_code + ' - ' + p.name AS project_name
                FROM pms.kpi_late_meeting_minutes m
                LEFT JOIN pms.projects p ON m.project_id = p.id
                WHERE m.year = @year AND m.is_active = 1
                ORDER BY m.meeting_date DESC
            `)

        return result.recordset
    } catch (error) {
        console.error('getLateMeetingRecords error:', error)
        return []
    }
}

// Add Late Meeting Record
export async function addLateMeetingRecord(data: LateMeetingRecord): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        const employeeId = (user as any).employeeId || user.id

        // Calculate year from submitted_date usually
        const year = new Date(data.submitted_date).getFullYear()

        await pool.request()
            .input('project_id', sql.UniqueIdentifier, data.project_id)
            .input('meeting_date', sql.Date, data.meeting_date)
            .input('meeting_end_time', sql.VarChar, data.meeting_end_time) // Time string HH:mm
            .input('meeting_type', sql.NVarChar, data.meeting_type)
            .input('submitted_date', sql.Date, data.submitted_date)
            .input('submitted_time', sql.VarChar, data.submitted_time)
            .input('late_reason', sql.NVarChar, data.late_reason)
            .input('year', sql.Int, year)
            .input('recorded_by', sql.UniqueIdentifier, employeeId)
            .query(`
                INSERT INTO pms.kpi_late_meeting_minutes
                (project_id, meeting_date, meeting_end_time, meeting_type, submitted_date, submitted_time, late_reason, year, recorded_by)
                VALUES
                (@project_id, @meeting_date, @meeting_end_time, @meeting_type, @submitted_date, @submitted_time, @late_reason, @year, @recorded_by)
            `)

        revalidatePath('/kpi/records')
        return { success: true }
    } catch (error) {
        console.error('addLateMeetingRecord error:', error)
        return { success: false, error: 'Failed to add record' }
    }
}

// Delete Late Meeting Record
export async function deleteLateMeetingRecord(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                UPDATE pms.kpi_late_meeting_minutes 
                SET is_active = 0, updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/kpi/records')
        return { success: true }
    } catch (error) {
        console.error('deleteLateMeetingRecord error:', error)
        return { success: false, error: 'Failed to delete record' }
    }
}
