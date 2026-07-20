'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'

import { getCurrentUser } from '@/lib/auth'
import { effectivePlanMdSql } from '@/lib/actions/milestone-plan'

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
    mandays: number
    dueDate: Date
    forecastDate: Date
    status: string
    riskStatus: 'on_track' | 'delayed' | 'completed'
    delayDays: number
    pmAvatar?: string
    pmName?: string
    noteCount?: number
    openIssueCount?: number
}

export interface ProjectRow {
    projectId: string
    projectCode: string
    projectName: string
    customerName: string
    pmName: string
    healthScore: number
    soldMandays: number
    projectTypeCode: string
    projectTypeColor?: string
    milestones: MilestoneForecast[]
}

export async function getSalesForecastMetrics(): Promise<SalesMetric[]> {
    try {
        const pool = await getConnection()
        const year = new Date().getFullYear();

        // 1. Handover This Month: Count of milestones due in current month (Active Projects)
        const currentMonthStart = new Date(year, new Date().getMonth(), 1).toISOString().slice(0, 10);
        const currentMonthEnd = new Date(year, new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

        const handoverQuery = `
            SELECT COUNT(pm.id) as count
            FROM pms.project_milestones pm
            JOIN pms.projects p ON pm.project_id = p.id
            WHERE pm.due_date BETWEEN @start AND @end
            AND p.status_id = 'active'
            AND pm.status != 'completed'
        `
        const handoverRequest = pool.request()
        handoverRequest.input('start', sql.Date, currentMonthStart)
        handoverRequest.input('end', sql.Date, currentMonthEnd)
        const handoverResult = await handoverRequest.query(handoverQuery);

        // 2. Pending Verify: Count of deliverables with status 'submitted' (Active Projects)
        const pendingVerifyQuery = `
            SELECT COUNT(pd.id) as count
            FROM pms.project_deliverables pd
            JOIN pms.projects p ON pd.project_id = p.id
            WHERE pd.verification_status = 'submitted'
            AND p.status_id = 'active'
        `
        const pendingVerifyResult = await pool.request().query(pendingVerifyQuery);

        // 3. Critical Overdue: Count of projects with Critical status (health score < 50) and overdue milestones
        // Using vw_project_health if available, or calculating
        const overdueQuery = `
             SELECT COUNT(DISTINCT p.id) as count
            FROM pms.projects p
            JOIN pms.project_milestones pm ON p.id = pm.project_id
            WHERE p.status_id = 'active'
            AND pm.status != 'completed'
            AND pm.due_date < GETDATE()
        `
        const overdueResult = await pool.request().query(overdueQuery);

        return [
            {
                title: "Handover This Month",
                value: handoverResult.recordset[0].count.toString(),
                subValue: "Milestones",
                trend: "neutral",
                color: "blue"
            },
            {
                title: "Pending Verify",
                value: pendingVerifyResult.recordset[0].count.toString(),
                subValue: "Deliverables",
                trend: "neutral", // Orange/Yellow handled by color
                color: "amber"
            },
            {
                title: "Critical Overdue", // Renamed from Late Projects
                value: overdueResult.recordset[0].count.toString(),
                subValue: "Projects",
                trend: "down", // Red
                color: "rose"
            }
        ];

    } catch (error) {
        console.error('Error fetching sales metrics:', error);
        return [
            { title: "Handover This Month", value: "0", subValue: "Milestones", trend: "neutral", color: "blue" },
            { title: "Pending Verify", value: "0", subValue: "Deliverables", trend: "neutral", color: "amber" },
            { title: "Critical Overdue", value: "0", subValue: "Projects", trend: "neutral", color: "rose" }
        ];
    }
}

export interface TimelineFilters {
    year: number
    search?: string
    myPortfolio?: boolean
    criticalOnly?: boolean
    statusId?: string
    pmId?: string
    ownerId?: string
    projectTypeId?: string
    customerId?: string
}

export async function getMilestoneTimeline(filters: TimelineFilters): Promise<ProjectRow[]> {
    try {
        const pool = await getConnection()
        const user = await getCurrentUser()

        let query = `
                SELECT 
                    p.id as project_id,
                    p.project_code,
                    p.name as project_name,
                    p.status_id,
                    p.total_value,
                    p.sold_mandays,
                    pt.code as project_type_code,
                    pt.color as project_type_color,
                    p.project_manager_id,
                    p.project_owner_id,
                    c.name as customer_name,
                    
                    -- PM Info
                    e.first_name_th, e.last_name_th,
                    
                    -- Milestone Info
                    pm.id as milestone_id,
                    mc.name as milestone_config_name,
                    pm.due_date,
                    pm.completed_date,
                    pm.weight_percent,
                    ep.eff_plan AS planned_mandays,
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
                OUTER APPLY (SELECT ${effectivePlanMdSql('p.sold_mandays', 'pm', 'mc')} AS eff_plan) ep
                LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
                LEFT JOIN pms.customers c ON p.customer_id = c.id
                
                WHERE (p.project_year = @year OR YEAR(pm.due_date) = @year)
                AND (pt.code IS NULL OR pt.code != 'MA')
            `

        const request = pool.request()
        request.input('year', sql.Int, filters.year)

        // Dynamic Filters
        if (filters.search) {
            query += ` AND (p.project_code LIKE @search OR p.name LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        if (filters.myPortfolio && user) {
            query += ` AND (p.project_manager_id = @userId OR p.project_owner_id = @userId)`
            request.input('userId', sql.UniqueIdentifier, user.id)
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
                    customerName: row.customer_name || '-',
                    pmName: `${row.first_name_th || ''} ${row.last_name_th || ''}`.trim() || 'Unassigned',
                    healthScore: 100, // Default, calc later
                    soldMandays: row.sold_mandays || 0,
                    projectTypeCode: row.project_type_code || '',
                    projectTypeColor: row.project_type_color,
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
                    mandays: row.planned_mandays || 0,
                    dueDate: row.due_date,
                    forecastDate: row.due_date, // Use due date as forecast for now
                    status: row.computed_status,
                    riskStatus,
                    delayDays: row.days_delayed > 0 ? row.days_delayed : 0,
                    pmAvatar: '',
                    pmName: p.pmName,
                    noteCount: 0,
                    openIssueCount: 0
                })
            }
        })

        // Fetch note counts (defensive: skip if table doesn't exist)
        try {
            const noteResult = await pool.request().query(`
                SELECT milestone_id,
                    COUNT(*) as note_count,
                    COUNT(CASE WHEN note_type = 'ISSUE' AND resolved_at IS NULL THEN 1 END) as open_issue_count
                FROM pms.milestone_notes
                WHERE is_active = 1 AND milestone_id IS NOT NULL
                GROUP BY milestone_id
            `)
            const noteMap = new Map<string, { noteCount: number; openIssueCount: number }>()
            noteResult.recordset.forEach((r: any) => {
                noteMap.set(r.milestone_id, { noteCount: r.note_count, openIssueCount: r.open_issue_count })
            })
            // Assign to milestones
            for (const p of projectMap.values()) {
                for (const ms of p.milestones) {
                    const counts = noteMap.get(ms.id)
                    if (counts) {
                        ms.noteCount = counts.noteCount
                        ms.openIssueCount = counts.openIssueCount
                    }
                }
            }
        } catch {
            // Table might not exist yet — skip silently
        }

        // Recalculate Health Score based on delayed milestones
        let results = Array.from(projectMap.values())

        for (const p of results) {
            const total = p.milestones.length
            const delayed = p.milestones.filter(m => m.riskStatus === 'delayed').length
            const score = total === 0 ? 100 : Math.round(((total - delayed) / total) * 100)
            p.healthScore = score
        }

        // Apply Critical Only Filter (In-Memory)
        if (filters.criticalOnly) {
            results = results.filter(p => p.healthScore < 80)
        }

        return results

    } catch (e) {
        console.error("Error fetching timeline", e)
        return []
    }
}
