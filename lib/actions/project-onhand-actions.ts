'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'

export interface SalesMetric {
    title: string
    value: string
    subValue: string
    trend: 'up' | 'down' | 'neutral'
    trendValue?: string
    color: 'emerald' | 'rose' | 'slate' | 'blue' | 'amber'
}

export interface MilestoneForecast {
    id: string
    projectCode: string
    projectName: string
    milestoneName: string
    amount: number
    dueDate: Date
    forecastDate: Date
    status: string
    riskStatus: 'on_track' | 'delayed' | 'completed'
    delayDays: number
    pmAvatar?: string
    pmName?: string
}

export interface ProjectRow {
    projectId: string
    projectCode: string
    projectName: string
    pmName: string
    healthScore: number
    milestones: MilestoneForecast[]
}

export async function getSalesForecastMetrics(): Promise<SalesMetric[]> {
    try {
        const pool = await getConnection()

        // 1. Current Month Commitment (Sum of payment_amount for milestones due this month)
        // Assuming 'payment_amount' exists in project_milestones, or we use 0 if not.
        // Let's try to query it. If it fails, we catch.
        // 1. Current Month Commitment (Sum of payment_amount for milestones due this month)
        // Calculated as Project Total Value * Milestone Weight %
        const commitQuery = `
            SELECT SUM((p.total_value * ISNULL(pm.weight_percent, 0) / 100)) as total
            FROM pms.project_milestones pm
            JOIN pms.projects p ON pm.project_id = p.id
            WHERE MONTH(pm.due_date) = MONTH(GETDATE()) 
              AND YEAR(pm.due_date) = YEAR(GETDATE())
        `
        let currentMonthCommit = 0
        try {
            const commitResult = await pool.request().query(commitQuery)
            currentMonthCommit = commitResult.recordset[0].total || 0
        } catch (e) {
            console.warn("Failed to calc commitment", e)
        }

        // 2. Handover Confidence (Avg % of milestones on track)
        // On Track = Not delayed (due_date > now OR completed_date <= due_date)
        const confidenceResult = await pool.request().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE 
                    WHEN pm.completed_date IS NOT NULL AND pm.completed_date <= pm.due_date THEN 1
                    WHEN pm.completed_date IS NULL AND pm.due_date >= GETDATE() THEN 1
                    ELSE 0 
                END) as on_track
            FROM pms.project_milestones pm
            LEFT JOIN pms.projects p ON pm.project_id = p.id
            WHERE p.status_id = (SELECT id FROM pms.project_status_configs WHERE name = 'Production') -- Filter active/relevant? Or just all.
               OR p.is_active = 1
        `)

        const totalActive = confidenceResult.recordset[0].total || 1
        const onTrack = confidenceResult.recordset[0].on_track || 0
        const confidenceScore = Math.round((onTrack / totalActive) * 100) || 100

        // 3. High Priority Dues (Milestones due in next 7 days and NOT completed)
        const urgentResult = await pool.request().query(`
            SELECT COUNT(*) as exact_count
            FROM pms.project_milestones pm
            JOIN pms.projects p ON pm.project_id = p.id
            WHERE pm.completed_date IS NULL
              AND p.is_active = 1
              AND pm.due_date BETWEEN GETDATE() AND DATEADD(DAY, 7, GETDATE())
        `)
        const urgentCount = urgentResult.recordset[0].exact_count || 0

        return [
            {
                title: 'Current Month Commitment',
                value: `฿${currentMonthCommit.toLocaleString()}`,
                subValue: 'Due this month',
                trend: 'neutral',
                color: 'blue'
            },
            {
                title: 'Handover Confidence',
                value: `${confidenceScore}%`,
                subValue: 'Based on Milestone status',
                trend: confidenceScore > 80 ? 'up' : 'down',
                color: confidenceScore > 80 ? 'emerald' : 'rose'
            },
            {
                title: 'High-Priority Dues',
                value: `${urgentCount}`,
                subValue: 'Due next 7 days',
                trend: urgentCount > 0 ? 'down' : 'neutral',
                color: urgentCount > 0 ? 'amber' : 'slate'
            }
        ]

    } catch (e) {
        console.error("Error fetching metrics", e)
        return []
    }
}

export interface TimelineFilters {
    year: number
    search?: string
    myPortfolio?: boolean // Kept for interface compatibility but removed from UI
    statusId?: string
    pmId?: string
    ownerId?: string
    projectTypeId?: string
    customerId?: string
}

export async function getMilestoneTimeline(filters: TimelineFilters): Promise<ProjectRow[]> {
    try {
        const pool = await getConnection()

        let query = `
                SELECT 
                    p.id as project_id,
                    p.project_code,
                    p.name as project_name,
                    p.status_id,
                    p.total_value,
                    
                    -- PM Info
                    e.first_name_th, e.last_name_th,
                    
                    -- Milestone Info
                    pm.id as milestone_id,
                    mc.name as milestone_config_name,
                    pm.due_date,
                    pm.completed_date,
                    pm.weight_percent,
                    (p.total_value * ISNULL(pm.weight_percent, 0) / 100) as payment_amount,
                    
                    -- Calc Status
                    CASE 
                        WHEN pm.completed_date IS NOT NULL THEN 'completed'
                        WHEN pm.due_date < GETDATE() THEN 'delayed'
                        ELSE 'pending'
                    END as computed_status,
                    
                    DATEDIFF(day, pm.due_date, GETDATE()) as days_delayed

                FROM pms.projects p
                LEFT JOIN pms.employees e ON p.project_owner_id = e.id
                LEFT JOIN pms.project_milestones pm ON p.id = pm.project_id
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                
                WHERE (p.project_year = @year OR YEAR(pm.due_date) = @year)
            `

        const request = pool.request()
        request.input('year', sql.Int, filters.year)

        // Dynamic Filters
        if (filters.search) {
            query += ` AND (p.project_code LIKE @search OR p.name LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        if (filters.statusId) {
            query += ` AND p.status_id = @statusId`
            request.input('statusId', sql.UniqueIdentifier, filters.statusId)
        }

        if (filters.pmId) {
            query += ` AND p.project_manager_id = @pmId`
            request.input('pmId', sql.UniqueIdentifier, filters.pmId)
        }

        if (filters.ownerId) {
            query += ` AND p.project_owner_id = @ownerId`
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        }

        if (filters.customerId) {
            query += ` AND p.customer_id = @customerId`
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }

        if (filters.projectTypeId) {
            query += ` AND p.project_type_id = @projectTypeId`
            request.input('projectTypeId', sql.UniqueIdentifier, filters.projectTypeId)
        }

        query += ` ORDER BY p.project_code, pm.due_date`

        // Execute
        const result = await request.query(query)

        const projectMap = new Map<string, ProjectRow>()

        result.recordset.forEach((row: any) => {
            if (!projectMap.has(row.project_id)) {
                projectMap.set(row.project_id, {
                    projectId: row.project_id,
                    projectCode: row.project_code,
                    projectName: row.project_name,
                    pmName: `${row.first_name_th || ''} ${row.last_name_th || ''}`.trim() || 'Unassigned',
                    healthScore: 100, // Default, calc later
                    milestones: []
                })
            }

            const p = projectMap.get(row.project_id)!

            // Only push if milestone exists (LEFT JOIN might return nulls)
            if (row.milestone_id) {
                // Determine Risk
                let riskStatus: 'on_track' | 'delayed' | 'completed' = 'on_track'
                if (row.computed_status === 'completed') riskStatus = 'completed'
                else if (row.computed_status === 'delayed') riskStatus = 'delayed'

                p.milestones.push({
                    id: row.milestone_id,
                    projectCode: row.project_code,
                    projectName: row.project_name,
                    milestoneName: row.milestone_config_name || 'Milestone',
                    amount: row.payment_amount || 0,
                    dueDate: row.due_date,
                    forecastDate: row.due_date, // Use due date as forecast for now
                    status: row.computed_status,
                    riskStatus,
                    delayDays: row.days_delayed > 0 ? row.days_delayed : 0,
                    pmAvatar: '',
                    pmName: p.pmName
                })
            }
        })

        // Recalculate Health Score based on delayed milestones
        for (const p of projectMap.values()) {
            const total = p.milestones.length
            const delayed = p.milestones.filter(m => m.riskStatus === 'delayed').length
            const score = total === 0 ? 100 : Math.round(((total - delayed) / total) * 100)
            p.healthScore = score
        }

        return Array.from(projectMap.values())

    } catch (e) {
        console.error("Error fetching timeline", e)
        return []
    }
}
