'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { ProjectFormData } from '@/types/project'

// Cache for optional column existence checks
let _optionalCols: { hasContractValue: boolean; hasPaymentPercent: boolean } | null = null
async function checkOptionalColumns(pool: any) {
    if (_optionalCols) return _optionalCols
    const res = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND (
            (TABLE_NAME = 'projects' AND COLUMN_NAME = 'contract_value')
            OR (TABLE_NAME = 'project_milestones' AND COLUMN_NAME = 'payment_percent')
        )
    `)
    const cols = new Set(res.recordset.map((r: any) => `${r.TABLE_NAME}.${r.COLUMN_NAME}`))
    _optionalCols = {
        hasContractValue: cols.has('projects.contract_value'),
        hasPaymentPercent: cols.has('project_milestones.payment_percent'),
    }
    return _optionalCols
}

// Generate Project Code
export async function generateProjectCode(year: number): Promise<string> {
    const pool = await getConnection()
    let code = ''

    // Logic: yyXXXX (e.g., 260001 for year 2026)
    // 1. Get last 2 digits of year
    const yy = year.toString().slice(-2)
    const prefix = yy

    try {
        // Manual generation logic as primary method to ensure yyXXXX format
        // Find max project_code starting with yy
        const result = await pool.request()
            .input('prefix', `${prefix}%`)
            .query(`
          SELECT MAX(project_code) as max_code 
          FROM pms.projects 
          WHERE project_code LIKE @prefix AND LEN(project_code) = 6
        `)

        const maxCode = result.recordset[0].max_code
        let nextNum = 1

        if (maxCode) {
            // Extract last 4 digits
            const currentNum = parseInt(maxCode.substring(2))
            if (!isNaN(currentNum)) {
                nextNum = currentNum + 1
            }
        }

        code = `${prefix}${nextNum.toString().padStart(4, '0')}`

    } catch (error) {
        console.warn('Failed to generate project code, using fallback.', error)
        // Fallback: yy-{random}
        code = `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    }

    return code
}

// Get Options
export async function getCustomers() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT id, code, name FROM pms.customers WHERE is_active = 1 ORDER BY name')
    return result.recordset
}

export async function getEmployees() {
    const pool = await getConnection()
    try {
        const result = await pool.request()
            .query(`
                SELECT e.id,
                       COALESCE(e.first_name_th + ' ' + e.last_name_th, e.first_name + ' ' + e.last_name) as full_name,
                       ISNULL(p.name, '') as position_name,
                       ISNULL(p.code, '') as position_code
                FROM pms.employees e
                LEFT JOIN pms.positions p ON e.position_id = p.id
                WHERE e.is_active = 1
                ORDER BY e.first_name_th, e.first_name
            `)
        return result.recordset
    } catch (error) {
        console.error('Error fetching employees:', error)
        return []
    }
}

// Default weight values by milestone name pattern
const DEFAULT_WEIGHTS: Record<string, { ttd: number; mdc: number }> = {
    'MAPPING': { ttd: 35, mdc: 30 },
    'SYSTEMTEST': { ttd: 20, mdc: 30 },
    'UAT': { ttd: 30, mdc: 20 },
    'GOLIVE': { ttd: 15, mdc: 10 },
    'CLOSEGOLIVE': { ttd: 0, mdc: 10 },
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
        .query('SELECT * FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order')

    // Add ttd_weight and mdc_weight with fallback logic
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

export async function getDeliverableConfigs() {
    const pool = await getConnection()

    // Check if name_th column exists
    const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'deliverable_configs'
        AND COLUMN_NAME = 'name_th'
    `)
    const hasNameThColumn = columnCheck.recordset.length > 0

    const selectColumns = hasNameThColumn
        ? `dc.id, dc.milestone_config_id, dc.name, dc.name_th, dc.description, dc.is_required, dc.is_active, dc.sort_order`
        : `dc.id, dc.milestone_config_id, dc.name, NULL as name_th, dc.description, dc.is_required, dc.is_active, dc.sort_order`

    const result = await pool.request()
        .query(`
            SELECT
                ${selectColumns},
                mc.name as milestone_name
            FROM pms.deliverable_configs dc
            LEFT JOIN pms.milestone_configs mc ON dc.milestone_config_id = mc.id
            WHERE dc.is_active = 1
            ORDER BY mc.sort_order, dc.sort_order
        `)
    return result.recordset
}

export async function getProjectStatusConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order')
    return result.recordset
}

// ============================================
// Types
// ============================================

export interface ProjectFilters {
    year?: number
    customerId?: string
    managerId?: string
    ownerId?: string
    statusId?: string
    projectTypeId?: string
    milestoneIds?: string[]  // Multi-select
    search?: string
}

export interface FilterOptions {
    customers: any[]
    managers: any[]
    owners: any[]
    years: number[]
    statuses: any[]
    milestones: any[]
    projectTypes: any[]
}

// ============================================
// GET FILTER OPTIONS
// ============================================

export async function getProjectFilterOptions() {
    try {
        const pool = await getConnection()

        // Check if name_th column exists in various config tables
        const columnCheck = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms'
            AND TABLE_NAME IN ('project_status_configs', 'milestone_configs', 'project_types')
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameTh = (table: string) => columnCheck.recordset.some((r: any) => r.TABLE_NAME === table)

        // Customers
        const customers = await pool.request().query(`
      SELECT id, code, name
      FROM pms.customers
      WHERE is_active = 1
      ORDER BY name
    `)

        // Project Managers (role = 'manager')
        const managers = await pool.request().query(`
      SELECT DISTINCT
        e.id,
        CONCAT(e.first_name, ' ', e.last_name) as name,
        CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th
      FROM pms.employees e
      WHERE e.is_active = 1 AND e.role = 'manager'
      ORDER BY name
    `)

        // Project Owners (all employees)
        const owners = await pool.request().query(`
      SELECT DISTINCT
        e.id,
        CONCAT(e.first_name, ' ', e.last_name) as name,
        CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th,
        p.code as position_code
      FROM pms.employees e
      LEFT JOIN pms.positions p ON e.position_id = p.id
      WHERE e.is_active = 1
      ORDER BY name
    `)

        // Years
        const years = await pool.request().query(`
      SELECT DISTINCT project_year
      FROM pms.projects
      WHERE is_active = 1
      ORDER BY project_year DESC
    `)

        // Statuses
        const statusQuery = hasNameTh('project_status_configs')
            ? `SELECT id, code, name, name_th, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`
        const statuses = await pool.request().query(statusQuery)

        // Milestones
        const milestoneQuery = hasNameTh('milestone_configs')
            ? `SELECT id, code, name, name_th, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`
        const milestones = await pool.request().query(milestoneQuery)

        // Project Types
        const projectTypeQuery = hasNameTh('project_types')
            ? `SELECT id, code, name, name_th, color FROM pms.project_types WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th, color FROM pms.project_types WHERE is_active = 1 ORDER BY sort_order`
        const projectTypes = await pool.request().query(projectTypeQuery)

        return {
            success: true,
            data: {
                customers: customers.recordset,
                managers: managers.recordset,
                owners: owners.recordset,
                years: years.recordset.map((y: any) => y.project_year),
                statuses: statuses.recordset,
                milestones: milestones.recordset,
                projectTypes: projectTypes.recordset
            }
        }
    } catch (error) {
        console.error('getProjectFilterOptions error:', error)
        return { success: false, error: 'Failed to load filter options', data: null }
    }
}

// ============================================
// GET PROJECTS (with filters)
// ============================================

export async function getProjects(filters?: ProjectFilters) {
    try {
        const pool = await getConnection()

        // Check if name_th column exists in projects table
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms' AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'name_th'
        `)
        const hasProjectNameTh = columnCheck.recordset.length > 0
        const nameThCol = hasProjectNameTh ? 'p.name_th' : 'NULL as name_th'

        let query = `
      SELECT
        p.id,
        p.project_code,
        p.project_year,
        p.name,
        ${nameThCol},
        p.sold_mandays,
        p.manday_rate,
        p.total_value,

        -- Customer
        p.customer_id,
        c.code as customer_code,
        c.name as customer_name,

        -- Project Manager
        p.project_manager_id,
        CONCAT(pm.first_name_th, ' ', pm.last_name_th) as pm_name,

        -- Project Owner
        p.project_owner_id,
        CONCAT(po.first_name_th, ' ', po.last_name_th) as owner_name,
        pos_o.code as owner_position_code,

        -- Project Type
        p.project_type_id,
        pt.code as project_type_code,
        pt.name as project_type_name,
        pt.color as project_type_color,

        -- Status
        p.status_id,
        ps.code as status_code,
        ps.name as status_name,
        ps.color as status_color,

        -- Current Milestone
        p.current_milestone_id,
        mc.id as current_milestone_config_id,
        mc.code as current_milestone_code,
        mc.name as current_milestone_name,
        mc.color as current_milestone_color,

        -- Progress (JOIN instead of subquery)
        ISNULL(ms_sum.actual_mandays, 0) as actual_mandays,

        p.created_at

      FROM pms.projects p
      LEFT JOIN pms.customers c ON p.customer_id = c.id
      LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
      LEFT JOIN pms.employees po ON p.project_owner_id = po.id
      LEFT JOIN pms.positions pos_o ON po.position_id = pos_o.id
      LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
      LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
      LEFT JOIN pms.project_milestones cpm ON p.current_milestone_id = cpm.id
      LEFT JOIN pms.milestone_configs mc ON cpm.milestone_config_id = mc.id
      LEFT JOIN (
          SELECT project_id, SUM(actual_mandays) as actual_mandays
          FROM pms.project_milestones
          GROUP BY project_id
      ) ms_sum ON ms_sum.project_id = p.id
      WHERE p.is_active = 1
    `

        const request = pool.request()

        if (filters?.year) {
            query += ` AND p.project_year = @year`
            request.input('year', sql.Int, filters.year)
        }

        if (filters?.customerId) {
            query += ` AND p.customer_id = @customerId`
            request.input('customerId', sql.UniqueIdentifier, filters.customerId)
        }

        if (filters?.managerId) {
            query += ` AND p.project_manager_id = @managerId`
            request.input('managerId', sql.UniqueIdentifier, filters.managerId)
        }

        if (filters?.ownerId) {
            query += ` AND p.project_owner_id = @ownerId`
            request.input('ownerId', sql.UniqueIdentifier, filters.ownerId)
        }

        if (filters?.statusId) {
            query += ` AND p.status_id = @statusId`
            request.input('statusId', sql.UniqueIdentifier, filters.statusId)
        }

        if (filters?.projectTypeId) {
            query += ` AND p.project_type_id = @projectTypeId`
            request.input('projectTypeId', sql.UniqueIdentifier, filters.projectTypeId)
        }

        // Multi-select Milestones
        if (filters?.milestoneIds && filters.milestoneIds.length > 0) {
            query += ` AND mc.id IN (${filters.milestoneIds.map((_, i) => `@ms${i}`).join(',')})`
            filters.milestoneIds.forEach((id, i) => {
                request.input(`ms${i}`, sql.UniqueIdentifier, id)
            })
        }

        if (filters?.search) {
            if (hasProjectNameTh) {
                query += ` AND (p.name LIKE @search OR p.name_th LIKE @search OR p.project_code LIKE @search)`
            } else {
                query += ` AND (p.name LIKE @search OR p.project_code LIKE @search)`
            }
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        query += ` ORDER BY p.created_at DESC`

        const result = await request.query(query)

        // Fetch milestones for all projects (for export due dates)
        const projectIds = result.recordset.map((p: any) => p.id)
        let milestonesMap: Record<string, any[]> = {}

        if (projectIds.length > 0) {
            const msRequest = pool.request()
            const idPlaceholders = projectIds.map((id: string, i: number) => {
                msRequest.input(`pid${i}`, sql.UniqueIdentifier, id)
                return `@pid${i}`
            })
            const msResult = await msRequest.query(`
                SELECT
                    pm.project_id,
                    mc.code,
                    mc.name,
                    pm.due_date,
                    pm.completed_date,
                    pm.status
                FROM pms.project_milestones pm
                LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
                WHERE pm.project_id IN (${idPlaceholders.join(',')})
                ORDER BY pm.sort_order
            `)
            for (const ms of msResult.recordset) {
                const pid = String(ms.project_id).toLowerCase()
                if (!milestonesMap[pid]) milestonesMap[pid] = []
                milestonesMap[pid].push(ms)
            }
        }

        const projects = result.recordset.map((p: any) => ({
            ...p,
            progress_percent: p.sold_mandays > 0
                ? Math.round((p.actual_mandays / p.sold_mandays) * 100)
                : 0,
            milestones: milestonesMap[String(p.id).toLowerCase()] || []
        }))

        return { success: true, data: projects }

    } catch (error) {
        console.error('getProjects error:', error)
        return { success: false, error: 'Failed to load projects', data: [] }
    }
}

// ============================================
// GET PROJECT BY ID (with full details)
// ============================================

export async function getProjectById(id: string) {
    try {
        const pool = await getConnection()
        const { hasPaymentPercent } = await checkOptionalColumns(pool)

        // Check if name_th columns exist in status and milestone configs
        const columnCheck = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms'
            AND TABLE_NAME IN ('project_status_configs', 'milestone_configs')
            AND COLUMN_NAME = 'name_th'
        `)
        const hasStatusNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'project_status_configs')
        const hasMilestoneNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'milestone_configs')

        const statusNameThCol = hasStatusNameTh ? 'ps.name_th' : 'NULL'
        const milestoneNameThCol = hasMilestoneNameTh ? 'mc.name_th' : 'NULL'

        // Get project with all relations
        const projectResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
        SELECT
          p.*,

          -- Customer
          c.code as customer_code,
          c.name as customer_name,

          -- Project Manager
          CONCAT(pm.first_name_th, ' ', pm.last_name_th) as pm_name,
          pm.email as pm_email,

          -- Project Owner
          CONCAT(po.first_name_th, ' ', po.last_name_th) as owner_name,
          pos_o.code as owner_position_code,
          pos_o.name as owner_position_name,

          -- Prime & Partner
          cp.code as prime_code,
          cp.name as prime_name,
          cpa.code as partner_code,
          cpa.name as partner_name,

          -- Project Type
          pt.code as project_type_code,
          pt.name as project_type_name,
          pt.color as project_type_color,
          pt.has_milestones,
          pt.has_deliverables,

          -- Project Group
          pg.code as project_group_code,
          pg.name as project_group_name,
          pg.color as project_group_color,
          pgp.name as project_group_parent_name,

          -- Chance
          ch.code as chance_code,
          ch.name as chance_name,
          ch.color as chance_color,
          ch.percentage as chance_percentage,

          -- Status
          ps.code as status_code,
          ps.name as status_name,
          ${statusNameThCol} as status_name_th,
          ps.color as status_color,

          -- Current Milestone Config
          mc.code as current_milestone_code,
          mc.name as current_milestone_name,
          mc.color as current_milestone_color

        FROM pms.projects p
        LEFT JOIN pms.customers c ON p.customer_id = c.id
        LEFT JOIN pms.customers cp ON p.prime_id = cp.id
        LEFT JOIN pms.customers cpa ON p.partner_id = cpa.id
        LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
        LEFT JOIN pms.employees po ON p.project_owner_id = po.id
        LEFT JOIN pms.positions pos_o ON po.position_id = pos_o.id
        LEFT JOIN pms.project_types pt ON p.project_type_id = pt.id
        LEFT JOIN pms.project_groups pg ON p.project_group_id = pg.id
        LEFT JOIN pms.project_groups pgp ON pg.parent_id = pgp.id
        LEFT JOIN pms.chance_configs ch ON p.chance_id = ch.id
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
        LEFT JOIN pms.project_milestones cpm ON p.current_milestone_id = cpm.id
        LEFT JOIN pms.milestone_configs mc ON cpm.milestone_config_id = mc.id
        WHERE p.id = @id
      `)

        if (projectResult.recordset.length === 0) {
            return { success: false, error: 'Project not found', data: null }
        }

        const project = projectResult.recordset[0]

        // Get milestones
        const milestonesResult = await pool.request()
            .input('project_id', sql.UniqueIdentifier, id)
            .input('current_ms_id', sql.UniqueIdentifier, project.current_milestone_id || null)
            .query(`
        SELECT
          pm.id,
          pm.milestone_config_id,
          pm.planned_mandays,
          ISNULL(ts_md.actual_mandays, 0) as actual_mandays,
          -- Legacy weight for backward comaptibility/display
          ISNULL(pm.weight_percent, 0) as weight_percent,

          -- New Weight Columns (TTD/MDC)
          COALESCE(pm.weight_ttd, mc.default_weight_ttd) as weight_ttd,
          COALESCE(pm.weight_mdc, mc.default_weight_mdc) as weight_mdc,
          ${hasPaymentPercent ? 'ISNULL(pm.payment_percent, 0)' : '0'} as payment_percent,
          mc.default_weight_ttd,
          mc.default_weight_mdc,

          pm.progress_percent,
          pm.due_date,
          pm.completed_date,
          pm.status,
          pm.sort_order,

          -- Lock & KPI
          ISNULL(pm.is_approved, 0) as is_approved,
          ISNULL(pm.is_locked, 0) as is_locked,
          pm.approved_at,
          pm.kpi_ttd_pass,
          pm.kpi_mdc_pass,
          pm.kpi_docs_pass,
          ISNULL(pm.kpi_ttd_manual_fail, 0) as kpi_ttd_manual_fail,

          -- Verification
          ISNULL(pm.is_verified, 0) as is_verified,
          pm.verified_at,
          pm.verified_by,
          pm.support_end_date,

          mc.code as milestone_code,
          mc.name as milestone_name,
          ${milestoneNameThCol} as milestone_name_th,
          mc.color as milestone_color,

          -- Is current milestone?
          CASE WHEN pm.id = @current_ms_id THEN 1 ELSE 0 END as is_current,

          -- Deliverables
          (SELECT COUNT(*) FROM pms.project_deliverables d WHERE d.project_milestone_id = pm.id AND d.is_active = 1 AND d.is_required = 1) as deliverable_count,
          (SELECT COUNT(*) FROM pms.project_deliverables d WHERE d.project_milestone_id = pm.id AND d.is_active = 1 AND d.is_required = 1 AND d.submitted_date IS NOT NULL) as submitted_count,

          -- Legacy Deliverable IDs (Deprecated but kept for now)
          (
            SELECT STRING_AGG(CAST(deliverable_config_id AS NVARCHAR(50)), ',')
            FROM pms.project_milestone_deliverables
            WHERE project_milestone_id = pm.id
          ) as deliverable_ids_str

        FROM pms.project_milestones pm
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        LEFT JOIN (
            SELECT
                s.milestone_id,
                CAST(ROUND(SUM(te.hours) / 7.0, 2) AS DECIMAL(10,2)) AS actual_mandays
            FROM pms.timesheet_entries te
            INNER JOIN pms.tasks t ON te.task_id = t.id
            INNER JOIN pms.stories s ON t.story_id = s.id
            WHERE te.is_active = 1 AND t.is_active = 1 AND s.is_active = 1
            AND s.project_id = @project_id
            GROUP BY s.milestone_id
        ) ts_md ON ts_md.milestone_id = pm.id
        WHERE pm.project_id = @project_id
        ORDER BY pm.sort_order
      `)

        // 3. Get Project Deliverables (Full details)
        const deliverablesResult = await pool.request()
            .input('project_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT 
                    pd.*,
                    dc.name as config_name,
                    dc.is_required as config_is_required
                FROM pms.project_deliverables pd
                LEFT JOIN pms.deliverable_configs dc ON pd.deliverable_config_id = dc.id
                WHERE pd.project_milestone_id IN (
                    SELECT id FROM pms.project_milestones WHERE project_id = @project_id
                )
                ORDER BY pd.sort_order
            `)

        const deliverables = deliverablesResult.recordset

        // Calculate totals and format milestones
        const milestonesRaw = milestonesResult.recordset
        const milestones = milestonesRaw.map((m: any) => {
            const milestoneDeliverables = deliverables.filter((d: any) => d.project_milestone_id === m.id)
            return {
                ...m,
                deliverable_ids: m.deliverable_ids_str ? m.deliverable_ids_str.split(',') : [],
                deliverables: milestoneDeliverables
            }
        })

        const totalPlannedMD = milestones.reduce((sum: number, m: any) => sum + (m.planned_mandays || 0), 0)
        const totalActualMD = milestones.reduce((sum: number, m: any) => sum + (m.actual_mandays || 0), 0)
        const completedCount = milestones.filter((m: any) => m.status === 'completed').length

        return {
            success: true,
            data: {
                ...project,
                milestones, // Now includes nested deliverables
                total_planned_mandays: totalPlannedMD,
                total_actual_mandays: totalActualMD,
                milestone_count: milestones.length,
                completed_milestone_count: completedCount,
                progress_percent: project.sold_mandays > 0
                    ? Math.round((totalActualMD / project.sold_mandays) * 100)
                    : 0
            }
        }
    } catch (error) {
        console.error('getProjectById error:', error)
        return { success: false, error: 'Failed to load project', data: null }
    }
}

// ============================================
// GET FORM OPTIONS (for Create/Edit)
// ============================================

export async function getProjectFormOptions() {
    try {
        const pool = await getConnection()

        // Check if name_th column exists in various config tables
        const columnCheck = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'pms'
            AND TABLE_NAME IN ('deliverable_configs', 'milestone_configs', 'project_status_configs')
            AND COLUMN_NAME = 'name_th'
        `)
        const hasNameTh = (table: string) => columnCheck.recordset.some((r: any) => r.TABLE_NAME === table)

        const deliverableQuery = hasNameTh('deliverable_configs')
            ? `SELECT id, code, name, name_th FROM pms.deliverable_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th FROM pms.deliverable_configs WHERE is_active = 1 ORDER BY sort_order`

        const milestoneQuery = hasNameTh('milestone_configs')
            ? `SELECT id, code, name, name_th, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`

        const statusQuery = hasNameTh('project_status_configs')
            ? `SELECT id, code, name, name_th, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`
            : `SELECT id, code, name, NULL as name_th, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`

        const [customers, employees, milestones, deliverables, statuses] = await Promise.all([
            pool.request().query(`SELECT id, code, name FROM pms.customers WHERE is_active = 1 ORDER BY name`),
            pool.request().query(`
        SELECT e.id, e.employee_code,
          COALESCE(CONCAT(e.first_name_th, ' ', e.last_name_th), CONCAT(e.first_name, ' ', e.last_name)) as name,
          CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th,
          e.role, p.code as position_code
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1
        ORDER BY e.first_name_th, e.first_name
      `),
            pool.request().query(milestoneQuery),
            pool.request().query(deliverableQuery),
            pool.request().query(statusQuery)
        ])

        return {
            success: true,
            data: {
                customers: customers.recordset,
                employees: employees.recordset,
                managers: employees.recordset.filter((e: any) => e.role === 'manager'),
                milestoneConfigs: milestones.recordset,
                deliverableConfigs: deliverables.recordset,
                statusConfigs: statuses.recordset
            }
        }
    } catch (error) {
        console.error('getProjectFormOptions error:', error)
        return { success: false, error: 'Failed to load form options', data: null }
    }
}

// Create Project
export async function createProject(data: ProjectFormData) {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)

    // Check if name_th column exists in projects, deliverable_configs, and project_deliverables (before transaction)
    const columnCheck = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms'
        AND TABLE_NAME IN ('projects', 'deliverable_configs', 'project_deliverables')
        AND COLUMN_NAME = 'name_th'
    `)
    const hasProjectNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'projects')
    const hasDeliverableConfigNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'deliverable_configs')
    const hasProjectDeliverableNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'project_deliverables')
    // Both tables need name_th for the INSERT...SELECT to work
    const hasDeliverableNameTh = hasDeliverableConfigNameTh && hasProjectDeliverableNameTh
    const { hasContractValue, hasPaymentPercent } = await checkOptionalColumns(pool)

    try {
        await transaction.begin()

        // 1. Insert Project
        const projectRequest = transaction.request()
            .input('project_code', data.project_code)
            .input('project_year', data.project_year)
            .input('name', data.name)
            .input('description', data.description || null)
            .input('customer_id', data.customer_id || null)
            .input('prime_id', data.prime_id || null)
            .input('partner_id', data.partner_id || null)
            .input('project_manager_id', data.project_manager_id || null)
            .input('project_owner_id', data.project_owner_id || null)
            .input('project_type_id', data.project_type_id || null)
            .input('project_group_id', data.project_group_id || null)
            .input('chance_id', data.chance_id || null)
            .input('sold_mandays', data.sold_mandays)
            .input('manday_rate', data.manday_rate)
            .input('warranty_end_date', data.warranty_end_date || null)
            .input('status_id', data.status_id || null)
        if (hasContractValue) {
            projectRequest.input('contract_value', sql.Decimal(18, 2), data.contract_value || null)
        }

        const cvCol = hasContractValue ? ', contract_value' : ''
        const cvVal = hasContractValue ? ', @contract_value' : ''

        let projectResult
        if (hasProjectNameTh) {
            projectRequest.input('name_th', data.name_th || null)
            projectResult = await projectRequest.query(`
                INSERT INTO pms.projects
                (project_code, project_year, name, name_th, description, customer_id, prime_id, partner_id,
                 project_manager_id, project_owner_id, project_type_id, project_group_id, chance_id, sold_mandays, manday_rate${cvCol}, warranty_end_date, status_id)
                OUTPUT INSERTED.id
                VALUES
                (@project_code, @project_year, @name, @name_th, @description, @customer_id, @prime_id, @partner_id,
                 @project_manager_id, @project_owner_id, @project_type_id, @project_group_id, @chance_id, @sold_mandays, @manday_rate${cvVal}, @warranty_end_date, @status_id)
            `)
        } else {
            projectResult = await projectRequest.query(`
                INSERT INTO pms.projects
                (project_code, project_year, name, description, customer_id, prime_id, partner_id,
                 project_manager_id, project_owner_id, project_type_id, project_group_id, chance_id, sold_mandays, manday_rate${cvCol}, warranty_end_date, status_id)
                OUTPUT INSERTED.id
                VALUES
                (@project_code, @project_year, @name, @description, @customer_id, @prime_id, @partner_id,
                 @project_manager_id, @project_owner_id, @project_type_id, @project_group_id, @chance_id, @sold_mandays, @manday_rate${cvVal}, @warranty_end_date, @status_id)
            `)
        }

        const projectId = projectResult.recordset[0].id

        // 2. Auto-add MKT milestone if project type is MKT and no milestones provided
        if (data.milestones.length === 0 && data.project_type_id) {
            const ptCheck = await transaction.request()
                .input('ptId', data.project_type_id)
                .query(`SELECT code FROM pms.project_types WHERE id = @ptId`)
            if (ptCheck.recordset.length > 0 && ptCheck.recordset[0].code === 'MKT') {
                const mktMc = await transaction.request()
                    .query(`SELECT id FROM pms.milestone_configs WHERE code = 'MKT'`)
                if (mktMc.recordset.length > 0) {
                    await transaction.request()
                        .input('project_id', projectId)
                        .input('milestone_config_id', mktMc.recordset[0].id)
                        .query(`
                            INSERT INTO pms.project_milestones
                            (project_id, milestone_config_id, planned_mandays, weight_percent, sort_order, progress_percent)
                            VALUES (@project_id, @milestone_config_id, 0, 100, 0, 0)
                        `)
                }
            }
        }

        // Insert Milestones
        for (let i = 0; i < data.milestones.length; i++) {
            const m = data.milestones[i]
            if (!m.milestone_config_id) continue; // Skip empty milestones

            const msResult = await transaction.request()
                .input('project_id', projectId)
                .input('milestone_config_id', m.milestone_config_id)
                .input('planned_mandays', m.planned_mandays)
                .input('weight_percent', m.weight_percent)
                .input('due_date', m.due_date || null)
                .input('sort_order', i + 1)
                .input('progress_percent', m.progress_percent || 0)
                .query(`
            INSERT INTO pms.project_milestones
            (project_id, milestone_config_id, planned_mandays, weight_percent, due_date, sort_order, progress_percent)
            OUTPUT INSERTED.id
            VALUES
            (@project_id, @milestone_config_id, @planned_mandays, @weight_percent, @due_date, @sort_order, @progress_percent)
          `)


            const milestoneId = msResult.recordset[0].id

            // Update new fields (weight_ttd, weight_mdc)
            // We can do this in the insert above, but I'll add a quick update to keep it clean or merge into insert.
            // Merging into insert is better.
            // Wait, I didn't update the INSERT query above. I should update the INSERT query.
            // Let's rewrite the INSERT query block in createProject.

            const msUpdateReq = transaction.request()
                .input('id', milestoneId)
                .input('weight_ttd', m.weight_ttd || 0)
                .input('weight_mdc', m.weight_mdc || 0)
            if (hasPaymentPercent) {
                msUpdateReq.input('payment_percent', sql.Decimal(5, 2), m.payment_percent || 0)
            }
            await msUpdateReq.query(`UPDATE pms.project_milestones SET weight_ttd = @weight_ttd, weight_mdc = @weight_mdc${hasPaymentPercent ? ', payment_percent = @payment_percent' : ''} WHERE id = @id`)

            // 3. Insert Deliverables
            for (const deliverableId of m.deliverable_ids) {
                await transaction.request()
                    .input('project_milestone_id', milestoneId)
                    .input('deliverable_config_id', deliverableId)
                    .query(`
              INSERT INTO pms.project_milestone_deliverables 
              (project_milestone_id, deliverable_config_id)
              VALUES (@project_milestone_id, @deliverable_config_id)
            `)
            }

            // 4. Insert Actual Project Deliverables (New System)
            const deliverableInsertQuery = hasDeliverableNameTh
                ? `INSERT INTO pms.project_deliverables (
                        id, project_milestone_id, deliverable_config_id, name, name_th, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at
                    )
                    SELECT
                        NEWID(), @ms_id, id, name, name_th, is_required, sort_order, 1, 0, 0, GETDATE(), GETDATE()
                    FROM pms.deliverable_configs
                    WHERE milestone_config_id = @config_id`
                : `INSERT INTO pms.project_deliverables (
                        id, project_milestone_id, deliverable_config_id, name, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at
                    )
                    SELECT
                        NEWID(), @ms_id, id, name, is_required, sort_order, 1, 0, 0, GETDATE(), GETDATE()
                    FROM pms.deliverable_configs
                    WHERE milestone_config_id = @config_id`

            await transaction.request()
                .input('ms_id', milestoneId)
                .input('config_id', m.milestone_config_id)
                .query(deliverableInsertQuery)
        }

        await transaction.commit()
        revalidatePath('/projects')
        return { success: true, id: projectId }

    } catch (error) {
        if (transaction) await transaction.rollback()
        console.error('Create project error:', error)
        throw error
    }
}

// Update Project
export async function updateProject(id: string, data: ProjectFormData) {
    console.log('[UPDATE_PROJECT] Starting update for id:', id);

    // Get current user for verification tracking
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)

    // Check if name_th column exists in projects, deliverable_configs, and project_deliverables (before transaction)
    const columnCheck = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pms'
        AND TABLE_NAME IN ('projects', 'deliverable_configs', 'project_deliverables')
        AND COLUMN_NAME = 'name_th'
    `)
    const hasProjectNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'projects')
    const hasDeliverableConfigNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'deliverable_configs')
    const hasProjectDeliverableNameTh = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'project_deliverables')
    // Both tables need name_th for the INSERT...SELECT to work
    const hasDeliverableNameTh = hasDeliverableConfigNameTh && hasProjectDeliverableNameTh
    const { hasContractValue, hasPaymentPercent } = await checkOptionalColumns(pool)

    try {
        await transaction.begin()
        console.log('[UPDATE_PROJECT] Transaction begun');

        // 0. Update Project Core Data
        const updateRequest = transaction.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('project_year', sql.Int, data.project_year)
            .input('name', sql.NVarChar, data.name)
            .input('customer_id', sql.UniqueIdentifier, data.customer_id)
            .input('prime_id', sql.UniqueIdentifier, data.prime_id || null)
            .input('partner_id', sql.UniqueIdentifier, data.partner_id || null)
            .input('project_manager_id', sql.UniqueIdentifier, data.project_manager_id)
            .input('project_owner_id', sql.UniqueIdentifier, data.project_owner_id || null)
            .input('project_type_id', sql.UniqueIdentifier, data.project_type_id || null)
            .input('project_group_id', sql.UniqueIdentifier, data.project_group_id || null)
            .input('chance_id', sql.UniqueIdentifier, data.chance_id || null)
            .input('description', sql.NVarChar, data.description)
            .input('sold_mandays', sql.Decimal(10, 2), data.sold_mandays)
            .input('manday_rate', sql.Decimal(10, 2), data.manday_rate)
            .input('warranty_end_date', sql.Date, data.warranty_end_date || null)
            .input('status_id', sql.UniqueIdentifier, data.status_id || null)
            .input('current_milestone_id', sql.UniqueIdentifier, data.current_milestone_id || null)
        if (hasContractValue) {
            updateRequest.input('contract_value', sql.Decimal(18, 2), data.contract_value || null)
        }
        const cvSet = hasContractValue ? 'contract_value = @contract_value,' : ''

        if (hasProjectNameTh) {
            updateRequest.input('name_th', sql.NVarChar, data.name_th)
            await updateRequest.query(`
                UPDATE pms.projects
                SET
                    project_year = @project_year,
                    name = @name,
                    name_th = @name_th,
                    customer_id = @customer_id,
                    prime_id = @prime_id,
                    partner_id = @partner_id,
                    project_manager_id = @project_manager_id,
                    project_owner_id = @project_owner_id,
                    project_type_id = @project_type_id,
                    project_group_id = @project_group_id,
                    chance_id = @chance_id,
                    description = @description,
                    sold_mandays = @sold_mandays,
                    manday_rate = @manday_rate,
                    ${cvSet}
                    warranty_end_date = @warranty_end_date,
                    status_id = @status_id,
                    current_milestone_id = @current_milestone_id,
                    updated_at = GETDATE()
                WHERE id = @id
            `)
        } else {
            await updateRequest.query(`
                UPDATE pms.projects
                SET
                    project_year = @project_year,
                    name = @name,
                    customer_id = @customer_id,
                    prime_id = @prime_id,
                    partner_id = @partner_id,
                    project_manager_id = @project_manager_id,
                    project_owner_id = @project_owner_id,
                    project_type_id = @project_type_id,
                    project_group_id = @project_group_id,
                    chance_id = @chance_id,
                    description = @description,
                    sold_mandays = @sold_mandays,
                    manday_rate = @manday_rate,
                    ${cvSet}
                    warranty_end_date = @warranty_end_date,
                    status_id = @status_id,
                    current_milestone_id = @current_milestone_id,
                    updated_at = GETDATE()
                WHERE id = @id
            `)
        }

        // 1. Get existing milestones to diff (include due_date for change log)
        const existingResult = await transaction.request()
            .input('project_id', id)
            .query(`
                SELECT id, milestone_config_id, due_date
                FROM pms.project_milestones
                WHERE project_id = @project_id
            `)

        const existingMap = new Map<string, { id: string; due_date: string | null }>(); // config_id -> { id, due_date }
        existingResult.recordset.forEach((r: any) => {
            if (r.milestone_config_id) {
                existingMap.set(r.milestone_config_id.toString(), {
                    id: r.id,
                    due_date: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : null
                });
            }
        });

        const touchedMilestoneIds = new Set<string>();
        let newCurrentMilestoneId = null;

        // 2. Clear current milestone on project to allow safe updates/deletes if needed
        // (We might set it back later)
        await transaction.request()
            .input('id', id)
            .query('UPDATE pms.projects SET current_milestone_id = NULL WHERE id = @id')

        // 3. Loop through submitted milestones (Upsert)
        for (let i = 0; i < data.milestones.length; i++) {
            const m = data.milestones[i] as any
            if (!m.milestone_config_id) continue;

            const configId = m.milestone_config_id.toString();
            const existingEntry = existingMap.get(configId);
            let milestoneId = existingEntry?.id;

            if (milestoneId) {
                // UPDATE existing
                const msUpdateReq = transaction.request()
                    .input('id', milestoneId)
                    .input('planned_mandays', m.planned_mandays)
                    .input('weight_percent', m.weight_percent)
                    .input('due_date', m.due_date || null)
                    .input('sort_order', i + 1)
                    .input('progress_percent', m.progress_percent || 0)
                    .input('weight_ttd', m.weight_ttd || 0)
                    .input('weight_mdc', m.weight_mdc || 0)
                    .input('completed_date', m.completed_date || null)
                    .input('kpi_ttd_manual_fail', sql.Bit, m.kpi_ttd_manual_fail ? 1 : 0)
                if (hasPaymentPercent) {
                    msUpdateReq.input('payment_percent', sql.Decimal(5, 2), m.payment_percent || 0)
                }
                await msUpdateReq.query(`
                        UPDATE pms.project_milestones
                        SET planned_mandays = @planned_mandays,
                            weight_percent = @weight_percent,
                            due_date = @due_date,
                            sort_order = @sort_order,
                            progress_percent = @progress_percent,
                            weight_ttd = @weight_ttd,
                            weight_mdc = @weight_mdc,
                            ${hasPaymentPercent ? 'payment_percent = @payment_percent,' : ''}
                            completed_date = @completed_date,
                            kpi_ttd_manual_fail = @kpi_ttd_manual_fail,
                            updated_at = GETDATE()
                        WHERE id = @id AND is_locked = 0
                    `)

                // Log due date change if different
                const newDueDate = m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : null
                const oldDueDate = existingEntry?.due_date || null
                if (oldDueDate !== newDueDate && (oldDueDate || newDueDate)) {
                    try {
                        await transaction.request()
                            .input('cl_project_id', sql.UniqueIdentifier, id)
                            .input('cl_milestone_id', sql.UniqueIdentifier, milestoneId)
                            .input('cl_change_type', sql.NVarChar(30), 'DUE_DATE_CHANGE')
                            .input('cl_old_value', sql.NVarChar(200), oldDueDate)
                            .input('cl_new_value', sql.NVarChar(200), newDueDate)
                            .input('cl_reason', sql.NVarChar(sql.MAX), m.due_date_change_reason || 'Due date updated')
                            .input('cl_changed_by', sql.UniqueIdentifier, user.id)
                            .query(`
                                INSERT INTO pms.milestone_change_logs
                                    (project_id, milestone_id, change_type, old_value, new_value, reason, changed_by)
                                VALUES
                                    (@cl_project_id, @cl_milestone_id, @cl_change_type, @cl_old_value, @cl_new_value, @cl_reason, @cl_changed_by)
                            `)
                    } catch (logErr) {
                        // Don't fail the whole save if change_logs table doesn't exist yet
                        console.warn('Could not log due date change:', logErr)
                    }
                }

                // Refresh Deliverables (Simpler to delete all for this MS and re-insert)
                // Note: pms.project_milestone_deliverables usually doesn't have restrictive FKs from other tables
                await transaction.request()
                    .input('ms_id', milestoneId)
                    .query('DELETE FROM pms.project_milestone_deliverables WHERE project_milestone_id = @ms_id')

                touchedMilestoneIds.add(milestoneId);
            } else {
                // INSERT new
                const msInsertReq = transaction.request()
                    .input('project_id', id)
                    .input('milestone_config_id', m.milestone_config_id)
                    .input('planned_mandays', m.planned_mandays)
                    .input('weight_percent', m.weight_percent)
                    .input('due_date', m.due_date || null)
                    .input('sort_order', i + 1)
                    .input('progress_percent', m.progress_percent || 0)
                if (hasPaymentPercent) {
                    msInsertReq.input('payment_percent', sql.Decimal(5, 2), m.payment_percent || 0)
                }
                const ppCol = hasPaymentPercent ? ', payment_percent' : ''
                const ppVal = hasPaymentPercent ? ', @payment_percent' : ''
                const msResult = await msInsertReq.query(`
                        INSERT INTO pms.project_milestones
                        (project_id, milestone_config_id, planned_mandays, weight_percent${ppCol}, due_date, sort_order, progress_percent)
                        OUTPUT INSERTED.id
                        VALUES
                        (@project_id, @milestone_config_id, @planned_mandays, @weight_percent${ppVal}, @due_date, @sort_order, @progress_percent)
                    `)
                milestoneId = msResult.recordset[0].id;
            }

            // Insert Deliverables for this milestone
            if (m.deliverable_ids && m.deliverable_ids.length > 0) {
                for (const delId of m.deliverable_ids) {
                    await transaction.request()
                        .input('project_milestone_id', milestoneId)
                        .input('deliverable_config_id', delId)
                        .query(`
                             INSERT INTO pms.project_milestone_deliverables (project_milestone_id, deliverable_config_id)
                             VALUES (@project_milestone_id, @deliverable_config_id)
                         `)
                }
            }

            // Insert Actual Project Deliverables for NEW milestones (New System)
            if (!milestoneId) continue; // Should have been set above

            // Only insert defaults if it's a NEW milestone (not found in existingMap)
            if (!existingEntry) {
                const deliverableInsertQuery = hasDeliverableNameTh
                    ? `INSERT INTO pms.project_deliverables (
                            id, project_milestone_id, deliverable_config_id, name, name_th, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at
                        )
                        SELECT
                            NEWID(), @ms_id, id, name, name_th, is_required, sort_order, 1, 0, 0, GETDATE(), GETDATE()
                        FROM pms.deliverable_configs
                        WHERE milestone_config_id = @config_id`
                    : `INSERT INTO pms.project_deliverables (
                            id, project_milestone_id, deliverable_config_id, name, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at
                        )
                        SELECT
                            NEWID(), @ms_id, id, name, is_required, sort_order, 1, 0, 0, GETDATE(), GETDATE()
                        FROM pms.deliverable_configs
                        WHERE milestone_config_id = @config_id`

                await transaction.request()
                    .input('ms_id', milestoneId)
                    .input('config_id', m.milestone_config_id)
                    .query(deliverableInsertQuery)
            }

            // Handle Approval & Locking
            if (m.will_approve || m.is_approved) {
                await transaction.request()
                    .input('id', milestoneId)
                    .input('today', new Date())
                    .query(`
                        UPDATE pms.project_milestones
                        SET is_approved = 1,
                            is_locked = 1,
                            approved_at = COALESCE(approved_at, @today),
                            completed_date = COALESCE(completed_date, @today),
                            status = 'completed', 
                            progress_percent = 100
                        WHERE id = @id
                    `)

                // TODO: Calculate KPI here if needed (could be complex, maybe do client side calc and pass it? Or purely DB)
                // For now, let's trust the input or simple defaults.
            }

            // Handle Verification (will_verify checkbox)
            if (m.will_verify && !m.is_verified) {
                await transaction.request()
                    .input('id', milestoneId)
                    .input('today', new Date())
                    .input('userId', user.id)
                    .query(`
                        UPDATE pms.project_milestones
                        SET is_verified = 1,
                            verified_at = @today,
                            verified_by = @userId
                        WHERE id = @id
                    `)
            }

            // Check if this is the current milestone
            const originalId = m.id || `temp-${i}`;
            if (data.current_milestone_id && (data.current_milestone_id === originalId || data.current_milestone_id === m.id || data.current_milestone_id === milestoneId)) {
                newCurrentMilestoneId = milestoneId;
            }
        }

        // 4. Delete removed milestones
        // Identify IDs in DB that were NOT touched
        const idsToDelete = Array.from(existingMap.values()).map(v => v.id).filter(dbId => !touchedMilestoneIds.has(dbId));

        if (idsToDelete.length > 0) {
            for (const delId of idsToDelete) {
                // Unlink stories first (FK constraint fix)
                await transaction.request()
                    .input('ms_id', delId)
                    .query('UPDATE pms.stories SET milestone_id = NULL WHERE milestone_id = @ms_id')

                // Delete linked deliverables (cascade delete)
                await transaction.request()
                    .input('ms_id', delId)
                    .query('DELETE FROM pms.project_deliverables WHERE project_milestone_id = @ms_id')

                // Delete milestone
                await transaction.request()
                    .input('id', delId)
                    .query('DELETE FROM pms.project_milestones WHERE id = @id')
            }
        }

        // 5. Update Project Info (with conditional name_th based on column existence)
        const updateProjectRequest = transaction.request()
            .input('id', id)
            .input('name', data.name)
            .input('description', data.description || null)
            .input('customer_id', data.customer_id || null)
            .input('project_manager_id', data.project_manager_id || null)
            .input('project_owner_id', (data as any).project_owner_id || null)
            .input('chance_id', data.chance_id || null)
            .input('sold_mandays', data.sold_mandays)
            .input('manday_rate', data.manday_rate)
            .input('warranty_end_date', data.warranty_end_date || null)
            .input('status_id', data.status_id || null)
            .input('current_milestone_id', newCurrentMilestoneId)
        if (hasContractValue) {
            updateProjectRequest.input('contract_value', sql.Decimal(18, 2), data.contract_value || null)
        }

        if (hasProjectNameTh) {
            updateProjectRequest.input('name_th', data.name_th || null)
            await updateProjectRequest.query(`
                UPDATE pms.projects SET
                  name = @name,
                  name_th = @name_th,
                  description = @description,
                  customer_id = @customer_id,
                  project_manager_id = @project_manager_id,
                  project_owner_id = @project_owner_id,
                  chance_id = @chance_id,
                  sold_mandays = @sold_mandays,
                  manday_rate = @manday_rate,
                  ${hasContractValue ? 'contract_value = @contract_value,' : ''}
                  warranty_end_date = @warranty_end_date,
                  status_id = @status_id,
                  current_milestone_id = @current_milestone_id
                WHERE id = @id
            `)
        } else {
            await updateProjectRequest.query(`
                UPDATE pms.projects SET
                  name = @name,
                  description = @description,
                  customer_id = @customer_id,
                  project_manager_id = @project_manager_id,
                  project_owner_id = @project_owner_id,
                  chance_id = @chance_id,
                  sold_mandays = @sold_mandays,
                  manday_rate = @manday_rate,
                  ${hasContractValue ? 'contract_value = @contract_value,' : ''}
                  warranty_end_date = @warranty_end_date,
                  status_id = @status_id,
                  current_milestone_id = @current_milestone_id
                WHERE id = @id
            `)
        }

        console.log('[UPDATE_PROJECT] Committing transaction');
        await transaction.commit()
        revalidatePath('/projects')
        revalidatePath(`/projects/${id}`)
        revalidatePath('/my-projects')
        return { success: true, id: id }

    } catch (error) {
        if (transaction) await transaction.rollback()
        console.error('Update project error:', error)
        throw error
    }
}

// Delete Project (soft delete)
// Delete Project (soft delete)
export async function deleteProject(id: string) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .query('UPDATE pms.projects SET is_active = 0 WHERE id = @id')

    revalidatePath('/projects')
    return { success: true }
}

export async function deleteProjectDeliverable(id: string) {
    try {
        const pool = await getConnection()
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM pms.project_deliverables WHERE id = @id')

        return { success: true }
    } catch (error: any) {
        console.error('deleteProjectDeliverable error:', error)
        return { success: false, error: error.message }
    }
}

// Get active projects for dropdowns
export async function getActiveProjects() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
            SELECT id, project_code, name
            FROM pms.projects
            WHERE is_active = 1
            ORDER BY project_code DESC
        `)

        return { success: true, data: result.recordset }
    } catch (error) {
        console.error('Error fetching active projects:', error)
        return { success: false, error: 'Failed to fetch projects', data: [] }
    }
}

export async function createCustomDeliverable(data: {
    project_milestone_id: string
    name: string
    is_required: boolean
}) {
    try {
        const pool = await getConnection()

        // Get max sort order
        const maxOrderResult = await pool.request()
            .input('ms_id', sql.UniqueIdentifier, data.project_milestone_id)
            .query('SELECT MAX(sort_order) as max_order FROM pms.project_deliverables WHERE project_milestone_id = @ms_id')

        const nextOrder = (maxOrderResult.recordset[0].max_order || 0) + 1

        await pool.request()
            .input('project_milestone_id', sql.UniqueIdentifier, data.project_milestone_id)
            .input('name', sql.NVarChar, data.name)
            .input('is_required', sql.Bit, data.is_required)
            .input('sort_order', sql.Int, nextOrder)
            .query(`
                INSERT INTO pms.project_deliverables (id, project_milestone_id, name, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at)
                VALUES (NEWID(), @project_milestone_id, @name, @is_required, @sort_order, 1, 0, 0, GETDATE(), GETDATE())
            `)

        return { success: true }
    } catch (error: any) {
        console.error('createCustomDeliverable error:', error)
        return { success: false, error: error.message }
    }
}

// Create deliverable from template config
export async function createDeliverableFromConfig(data: {
    project_milestone_id: string
    deliverable_config_id: string
}) {
    try {
        const pool = await getConnection()

        // Get config details
        const configResult = await pool.request()
            .input('config_id', sql.UniqueIdentifier, data.deliverable_config_id)
            .query('SELECT id, name, description, is_required, sort_order FROM pms.deliverable_configs WHERE id = @config_id')

        if (configResult.recordset.length === 0) {
            return { success: false, error: 'Deliverable config not found' }
        }

        const config = configResult.recordset[0]

        // Check if already exists
        const existingResult = await pool.request()
            .input('ms_id', sql.UniqueIdentifier, data.project_milestone_id)
            .input('config_id', sql.UniqueIdentifier, data.deliverable_config_id)
            .query('SELECT id FROM pms.project_deliverables WHERE project_milestone_id = @ms_id AND deliverable_config_id = @config_id')

        if (existingResult.recordset.length > 0) {
            return { success: false, error: 'Deliverable already exists for this milestone' }
        }

        // Get max sort order
        const maxOrderResult = await pool.request()
            .input('ms_id', sql.UniqueIdentifier, data.project_milestone_id)
            .query('SELECT MAX(sort_order) as max_order FROM pms.project_deliverables WHERE project_milestone_id = @ms_id')

        const nextOrder = (maxOrderResult.recordset[0].max_order || 0) + 1

        await pool.request()
            .input('project_milestone_id', sql.UniqueIdentifier, data.project_milestone_id)
            .input('deliverable_config_id', sql.UniqueIdentifier, data.deliverable_config_id)
            .input('name', sql.NVarChar, config.name)
            .input('description', sql.NVarChar, config.description || null)
            .input('is_required', sql.Bit, config.is_required)
            .input('sort_order', sql.Int, nextOrder)
            .query(`
                INSERT INTO pms.project_deliverables
                (id, project_milestone_id, deliverable_config_id, name, description, is_required, sort_order, is_active, is_verified, is_locked, created_at, updated_at)
                VALUES (NEWID(), @project_milestone_id, @deliverable_config_id, @name, @description, @is_required, @sort_order, 1, 0, 0, GETDATE(), GETDATE())
            `)

        return { success: true }
    } catch (error: any) {
        console.error('createDeliverableFromConfig error:', error)
        return { success: false, error: error.message }
    }
}


// ============================================
// VERIFY DELIVERABLE
// ============================================

export async function verifyDeliverable(
    deliverableId: string,
    isVerified: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // 1. Check if milestone is locked & document is submitted
        const checkResult = await pool.request()
            .input('id', sql.UniqueIdentifier, deliverableId)
            .query(`
                SELECT 
                    pd.id, pd.submitted_date,
                    pm.is_locked, pm.status as milestone_status
                FROM pms.project_deliverables pd
                LEFT JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                WHERE pd.id = @id
            `)

        if (checkResult.recordset.length === 0) {
            return { success: false, error: 'Deliverable not found' }
        }

        const deliverable = checkResult.recordset[0]

        // Allow un-verify even if locked? No, usually lock means frozen.
        // But user might need to unlock milestone first.
        if (deliverable.is_locked) {
            return { success: false, error: 'Milestone is locked. Cannot update verification.' }
        }

        // Must be submitted to verify (unless un-verifying)
        if (isVerified && !deliverable.submitted_date) {
            return { success: false, error: 'Cannot verify: Document has not been submitted.' }
        }

        // 2. Update DB
        await pool.request()
            .input('id', sql.UniqueIdentifier, deliverableId)
            .input('isVerified', sql.Bit, isVerified)
            .input('verifiedBy', sql.UniqueIdentifier, isVerified ? user.id : null)
            .input('verifiedAt', sql.DateTime2, isVerified ? new Date() : null)
            .query(`
                UPDATE pms.project_deliverables
                SET 
                    is_verified = @isVerified,
                    verified_at = @verifiedAt,
                    verified_by = @verifiedBy,
                    updated_at = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/projects')
        return { success: true }

    } catch (error: any) {
        console.error('verifyDeliverable error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UPDATE DELIVERABLE (Batch/Individual)
// ============================================

export async function updateDeliverable(
    deliverableId: string,
    data: {
        submitted_date?: string | null
        is_verified?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const pool = await getConnection()

        // 1. Get current deliverable & milestone lock status
        const checkResult = await pool.request()
            .input('id', sql.UniqueIdentifier, deliverableId)
            .query(`
                SELECT 
                    pd.id, pd.project_milestone_id, pd.is_verified, pd.verified_at, pd.verified_by,
                    pm.is_locked, pm.due_date
                FROM pms.project_deliverables pd
                LEFT JOIN pms.project_milestones pm ON pd.project_milestone_id = pm.id
                WHERE pd.id = @id
            `)

        if (checkResult.recordset.length === 0) {
            return { success: false, error: 'Deliverable not found' }
        }

        const current = checkResult.recordset[0]

        if (current.is_locked) {
            return { success: false, error: 'Milestone is locked. Cannot update.' }
        }

        // 2. Prepare updates
        let updateSql = `UPDATE pms.project_deliverables SET updated_at = GETDATE()`
        const request = pool.request().input('id', sql.UniqueIdentifier, deliverableId)

        if (data.submitted_date !== undefined) {
            request.input('submittedDate', sql.Date, data.submitted_date)
            updateSql += `, submitted_date = @submittedDate`

            // Recalc On-Time
            // If we have a submitted date and a due date
            if (data.submitted_date && current.due_date) {
                const isLate = new Date(data.submitted_date) > new Date(current.due_date)
                request.input('isOnTime', sql.Bit, !isLate)
                updateSql += `, is_on_time = @isOnTime`
            } else if (data.submitted_date === null) {
                // Cleared submission
                updateSql += `, is_on_time = NULL`
            }
        }

        if (data.is_verified !== undefined) {
            // Logic: Update verified info
            const isVerified = data.is_verified
            request.input('isVerified', sql.Bit, isVerified)

            if (isVerified) {
                request.input('verifiedAt', sql.DateTime2, new Date())
                request.input('verifiedBy', sql.UniqueIdentifier, user.id)
                updateSql += `, is_verified = 1, verified_at = @verifiedAt, verified_by = @verifiedBy`
            } else {
                updateSql += `, is_verified = 0, verified_at = NULL, verified_by = NULL`
            }
        }

        updateSql += ` WHERE id = @id`

        await request.query(updateSql)

        revalidatePath('/projects')
        return { success: true }

    } catch (error: any) {
        console.error('updateDeliverable error:', error)
        return { success: false, error: error.message }
    }
}
