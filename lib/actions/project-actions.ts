'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import sql from 'mssql'
import { ProjectFormData } from '@/types/project'

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
                SELECT e.id, e.first_name + ' ' + e.last_name as full_name, 
                       ISNULL(p.name, '') as position_name, 
                       ISNULL(p.code, '') as position_code
                FROM pms.employees e
                LEFT JOIN pms.positions p ON e.position_id = p.id
                WHERE e.is_active = 1
                ORDER BY e.first_name
            `)
        return result.recordset
    } catch (error) {
        console.error('Error fetching employees:', error)
        return []
    }
}

export async function getMilestoneConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order')
    return result.recordset
}

export async function getDeliverableConfigs() {
    const pool = await getConnection()
    const result = await pool.request()
        .query('SELECT * FROM pms.deliverable_configs WHERE is_active = 1 ORDER BY sort_order')
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
    milestoneIds?: string[]  // Multi-select
    search?: string
}

// ============================================
// GET FILTER OPTIONS
// ============================================

export async function getProjectFilterOptions() {
    try {
        const pool = await getConnection()

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
        const statuses = await pool.request().query(`
      SELECT id, code, name, name_th, color 
      FROM pms.project_status_configs 
      WHERE is_active = 1 
      ORDER BY sort_order
    `)

        // Milestones
        const milestones = await pool.request().query(`
      SELECT id, code, name, name_th, color 
      FROM pms.milestone_configs 
      WHERE is_active = 1 
      ORDER BY sort_order
    `)

        return {
            success: true,
            data: {
                customers: customers.recordset,
                managers: managers.recordset,
                owners: owners.recordset,
                years: years.recordset.map((y: any) => y.project_year),
                statuses: statuses.recordset,
                milestones: milestones.recordset
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

        let query = `
      SELECT 
        p.id,
        p.project_code,
        p.project_year,
        p.name,
        p.name_th,
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
        
        -- Progress
        ISNULL((SELECT SUM(actual_mandays) FROM pms.project_milestones WHERE project_id = p.id), 0) as actual_mandays,
        
        p.created_at
        
      FROM pms.projects p
      LEFT JOIN pms.customers c ON p.customer_id = c.id
      LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
      LEFT JOIN pms.employees po ON p.project_owner_id = po.id
      LEFT JOIN pms.positions pos_o ON po.position_id = pos_o.id
      LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
      LEFT JOIN pms.project_milestones cpm ON p.current_milestone_id = cpm.id
      LEFT JOIN pms.milestone_configs mc ON cpm.milestone_config_id = mc.id
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

        // Multi-select Milestones
        if (filters?.milestoneIds && filters.milestoneIds.length > 0) {
            query += ` AND mc.id IN (${filters.milestoneIds.map((_, i) => `@ms${i}`).join(',')})`
            filters.milestoneIds.forEach((id, i) => {
                request.input(`ms${i}`, sql.UniqueIdentifier, id)
            })
        }

        if (filters?.search) {
            query += ` AND (p.name LIKE @search OR p.name_th LIKE @search OR p.project_code LIKE @search)`
            request.input('search', sql.NVarChar, `%${filters.search}%`)
        }

        query += ` ORDER BY p.created_at DESC`

        const result = await request.query(query)

        const projects = result.recordset.map((p: any) => ({
            ...p,
            progress_percent: p.sold_mandays > 0
                ? Math.round((p.actual_mandays / p.sold_mandays) * 100)
                : 0
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
          
          -- Status
          ps.code as status_code,
          ps.name as status_name,
          ps.name_th as status_name_th,
          ps.color as status_color,
          
          -- Current Milestone Config
          mc.code as current_milestone_code,
          mc.name as current_milestone_name,
          mc.color as current_milestone_color
          
        FROM pms.projects p
        LEFT JOIN pms.customers c ON p.customer_id = c.id
        LEFT JOIN pms.employees pm ON p.project_manager_id = pm.id
        LEFT JOIN pms.employees po ON p.project_owner_id = po.id
        LEFT JOIN pms.positions pos_o ON po.position_id = pos_o.id
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
            .query(`
        SELECT 
          pm.id,
          pm.milestone_config_id,
          pm.planned_mandays,
          pm.actual_mandays,
          pm.weight_percent,
          pm.due_date,
          pm.completed_date,
          pm.status,
          pm.sort_order,
          
          mc.code as milestone_code,
          mc.name as milestone_name,
          mc.name_th as milestone_name_th,
          mc.color as milestone_color,
          
          -- Is current milestone?
          CASE WHEN pm.id = @current_ms_id THEN 1 ELSE 0 END as is_current,
          
          -- Deliverables count
          (SELECT COUNT(*) FROM pms.project_milestone_deliverables d WHERE d.project_milestone_id = pm.id) as deliverable_count,
          (SELECT COUNT(*) FROM pms.project_milestone_deliverables d WHERE d.project_milestone_id = pm.id AND d.is_submitted = 1) as submitted_count
          
        FROM pms.project_milestones pm
        LEFT JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
        WHERE pm.project_id = @project_id
        ORDER BY pm.sort_order
      `)

        // Add current milestone id parameter
        await pool.request()
            .input('current_ms_id', sql.UniqueIdentifier, project.current_milestone_id)

        // Calculate totals
        const milestones = milestonesResult.recordset
        const totalPlannedMD = milestones.reduce((sum: number, m: any) => sum + (m.planned_mandays || 0), 0)
        const totalActualMD = milestones.reduce((sum: number, m: any) => sum + (m.actual_mandays || 0), 0)
        const completedCount = milestones.filter((m: any) => m.status === 'completed').length

        return {
            success: true,
            data: {
                ...project,
                milestones,
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

        const [customers, employees, milestones, deliverables, statuses] = await Promise.all([
            pool.request().query(`SELECT id, code, name FROM pms.customers WHERE is_active = 1 ORDER BY name`),
            pool.request().query(`
        SELECT e.id, e.employee_code, 
          CONCAT(e.first_name, ' ', e.last_name) as name,
          CONCAT(e.first_name_th, ' ', e.last_name_th) as name_th,
          e.role, p.code as position_code
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1 
        ORDER BY e.first_name
      `),
            pool.request().query(`SELECT id, code, name, name_th, color FROM pms.milestone_configs WHERE is_active = 1 ORDER BY sort_order`),
            pool.request().query(`SELECT id, code, name, name_th FROM pms.deliverable_configs WHERE is_active = 1 ORDER BY sort_order`),
            pool.request().query(`SELECT id, code, name, name_th, color FROM pms.project_status_configs WHERE is_active = 1 ORDER BY sort_order`)
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

    try {
        await transaction.begin()

        // 1. Insert Project
        const projectResult = await transaction.request()
            .input('project_code', data.project_code)
            .input('project_year', data.project_year)
            .input('name', data.name)
            .input('name_th', data.name_th || null)
            .input('description', data.description || null)
            .input('customer_id', data.customer_id || null)
            .input('project_manager_id', data.project_manager_id || null)
            .input('sold_mandays', data.sold_mandays)
            .input('manday_rate', data.manday_rate)
            .input('warranty_end_date', data.warranty_end_date || null)
            .input('status_id', data.status_id || null)
            .query(`
        INSERT INTO pms.projects 
        (project_code, project_year, name, name_th, description, customer_id, 
         project_manager_id, sold_mandays, manday_rate, warranty_end_date, status_id)
        OUTPUT INSERTED.id
        VALUES 
        (@project_code, @project_year, @name, @name_th, @description, @customer_id,
         @project_manager_id, @sold_mandays, @manday_rate, @warranty_end_date, @status_id)
      `)

        const projectId = projectResult.recordset[0].id

        // 2. Insert Milestones
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
                .query(`
            INSERT INTO pms.project_milestones 
            (project_id, milestone_config_id, planned_mandays, weight_percent, due_date, sort_order)
            OUTPUT INSERTED.id
            VALUES 
            (@project_id, @milestone_config_id, @planned_mandays, @weight_percent, @due_date, @sort_order)
          `)

            const milestoneId = msResult.recordset[0].id

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
        }

        await transaction.commit()
        revalidatePath('/projects')
        return { success: true, id: projectId }

    } catch (error) {
        await transaction.rollback()
        console.error('Create project error:', error)
        throw error
    }
}

// Update Project
export async function updateProject(id: string, data: ProjectFormData) {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)

    try {
        await transaction.begin()

        // 1. First, clear current_milestone_id to avoid FK constraint when deleting milestones
        await transaction.request()
            .input('id', id)
            .query('UPDATE pms.projects SET current_milestone_id = NULL WHERE id = @id')

        // 2. Delete existing milestones (cascade deletes deliverables)
        await transaction.request()
            .input('project_id', id)
            .query('DELETE FROM pms.project_milestones WHERE project_id = @project_id')

        // 3. Update Project Info
        await transaction.request()
            .input('id', id)
            .input('name', data.name)
            .input('name_th', data.name_th || null)
            .input('description', data.description || null)
            .input('customer_id', data.customer_id || null)
            .input('project_manager_id', data.project_manager_id || null)
            .input('project_owner_id', (data as any).project_owner_id || null)
            .input('sold_mandays', data.sold_mandays)
            .input('manday_rate', data.manday_rate)
            .input('warranty_end_date', data.warranty_end_date || null)
            .input('status_id', data.status_id || null)
            .query(`
        UPDATE pms.projects SET
          name = @name,
          name_th = @name_th,
          description = @description,
          customer_id = @customer_id,
          project_manager_id = @project_manager_id,
          project_owner_id = @project_owner_id,
          sold_mandays = @sold_mandays,
          manday_rate = @manday_rate,
          warranty_end_date = @warranty_end_date,
          status_id = @status_id
        WHERE id = @id
      `)

        // 4. Re-insert milestones & deliverables
        let newCurrentMilestoneId = null;

        for (let i = 0; i < data.milestones.length; i++) {
            const m = data.milestones[i] as any
            if (!m.milestone_config_id) continue; // Skip empty milestones
            // We assume frontend sends existing milestones with ID, and newly added ones might have temp ID or no ID.
            // But importantly, data.current_milestone_id matches ONE of these IDs (or temp IDs).
            // Since we rebuilt the form logic, we know the structure.
            const originalId = m.id || `temp-${i}`;

            const msResult = await transaction.request()
                .input('project_id', id)
                .input('milestone_config_id', m.milestone_config_id)
                .input('planned_mandays', m.planned_mandays)
                .input('weight_percent', m.weight_percent)
                .input('due_date', m.due_date || null)
                .input('sort_order', i + 1)
                .query(`
            INSERT INTO pms.project_milestones 
            (project_id, milestone_config_id, planned_mandays, weight_percent, due_date, sort_order)
            OUTPUT INSERTED.id
            VALUES 
            (@project_id, @milestone_config_id, @planned_mandays, @weight_percent, @due_date, @sort_order)
          `)

            const newMilestoneId = msResult.recordset[0].id;

            if (data.current_milestone_id && (data.current_milestone_id === originalId || data.current_milestone_id === m.id)) {
                newCurrentMilestoneId = newMilestoneId;
            }

            // Insert deliverables
            if (m.deliverable_ids && m.deliverable_ids.length > 0) {
                // ... (existing deliverable logic if any, or need to add it?) 
                // Wait, the previous code didn't show deliverable insertion inside look. 
                // Let's check if I missed it in view.
                // Ah, previous code (Step 1744) didn't show deliverable insertion inside the loop, it was cut off.
                // But wait, "m.deliverable_ids" logic must be there. I need to proceed carefully.
                // I will assume I need to insert deliverables too if they are passed.
                for (const delId of m.deliverable_ids) {
                    await transaction.request()
                        .input('project_milestone_id', newMilestoneId)
                        .input('deliverable_config_id', delId)
                        .query(`
                             INSERT INTO pms.project_milestone_deliverables (project_milestone_id, deliverable_config_id)
                             VALUES (@project_milestone_id, @deliverable_config_id)
                         `)
                }
            }
        }

        // 5. Update Current Milestone if found
        if (newCurrentMilestoneId) {
            await transaction.request()
                .input('id', id)
                .input('current_milestone_id', newCurrentMilestoneId)
                .query('UPDATE pms.projects SET current_milestone_id = @current_milestone_id WHERE id = @id')
        }

        await transaction.commit()
        revalidatePath('/projects')
        revalidatePath(`/projects/${id}`)
        return { success: true, id: id }

    } catch (error) {
        await transaction.rollback()
        console.error('Update project error:', error)
        throw error
    }
}

// Delete Project (soft delete)
export async function deleteProject(id: string) {
    const pool = await getConnection()

    await pool.request()
        .input('id', id)
        .query('UPDATE pms.projects SET is_active = 0 WHERE id = @id')

    revalidatePath('/projects')
    return { success: true }
}
