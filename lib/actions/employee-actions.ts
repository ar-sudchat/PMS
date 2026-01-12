'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { revalidatePath } from 'next/cache'

// Helper: แปลงค่าว่างเป็น null สำหรับ GUID
function toGuidOrNull(value: string | null | undefined): string | null {
  if (!value || value === '' || value === 'null' || value === 'undefined') {
    return null
  }
  return value
}

// ============================================
// CREATE EMPLOYEE
// ============================================

export async function createEmployee(data: {
  employee_code: string
  email: string
  first_name: string
  last_name: string
  first_name_th?: string
  last_name_th?: string
  nickname?: string
  phone?: string
  department_id?: string
  position_id?: string
  manager_id?: string
  role: string
  employment_type?: string
  employment_status?: string
  start_date?: string
}) {
  try {
    const pool = await getConnection()

    // แปลงค่าว่างเป็น null
    const departmentId = toGuidOrNull(data.department_id)
    const positionId = toGuidOrNull(data.position_id)
    const managerId = toGuidOrNull(data.manager_id)

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, crypto.randomUUID())
      .input('employee_code', sql.NVarChar(20), data.employee_code)
      .input('email', sql.NVarChar(100), data.email)
      .input('first_name', sql.NVarChar(100), data.first_name)
      .input('last_name', sql.NVarChar(100), data.last_name)
      .input('first_name_th', sql.NVarChar(100), data.first_name_th || null)
      .input('last_name_th', sql.NVarChar(100), data.last_name_th || null)
      .input('nickname', sql.NVarChar(50), data.nickname || null)
      .input('phone', sql.NVarChar(20), data.phone || null)
      .input('department_id', sql.UniqueIdentifier, departmentId)
      .input('position_id', sql.UniqueIdentifier, positionId)
      .input('manager_id', sql.UniqueIdentifier, managerId)
      .input('role', sql.NVarChar(20), data.role || 'member')
      .input('employment_type', sql.NVarChar(20), data.employment_type || 'full_time')
      .input('employment_status', sql.NVarChar(20), data.employment_status || 'active')
      .input('start_date', sql.Date, data.start_date ? new Date(data.start_date) : null)
      .query(`
        INSERT INTO pms.employees (
          id, employee_code, email, first_name, last_name, 
          first_name_th, last_name_th, nickname, phone,
          department_id, position_id, manager_id,
          role, employment_type, employment_status, start_date,
          is_active, created_at
        ) VALUES (
          @id, @employee_code, @email, @first_name, @last_name,
          @first_name_th, @last_name_th, @nickname, @phone,
          @department_id, @position_id, @manager_id,
          @role, @employment_type, @employment_status, @start_date,
          1, GETDATE()
        )
      `)

    revalidatePath('/team/employees')
    return { success: true, message: 'Employee created successfully' }

  } catch (error: any) {
    console.error('createEmployee error:', error)
    return { success: false, error: error.message || 'Failed to create employee' }
  }
}

// ============================================
// UPDATE EMPLOYEE
// ============================================

export async function updateEmployee(
  id: string,
  data: {
    employee_code?: string
    email?: string
    first_name?: string
    last_name?: string
    first_name_th?: string
    last_name_th?: string
    nickname?: string
    phone?: string
    department_id?: string
    position_id?: string
    manager_id?: string
    role?: string
    employment_type?: string
    employment_status?: string
    start_date?: string
    is_active?: boolean
  }
) {
  try {
    const pool = await getConnection()

    // แปลงค่าว่างเป็น null
    const departmentId = toGuidOrNull(data.department_id)
    const positionId = toGuidOrNull(data.position_id)
    const managerId = toGuidOrNull(data.manager_id)

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('employee_code', sql.NVarChar(20), data.employee_code)
      .input('email', sql.NVarChar(100), data.email)
      .input('first_name', sql.NVarChar(100), data.first_name)
      .input('last_name', sql.NVarChar(100), data.last_name)
      .input('first_name_th', sql.NVarChar(100), data.first_name_th || null)
      .input('last_name_th', sql.NVarChar(100), data.last_name_th || null)
      .input('nickname', sql.NVarChar(50), data.nickname || null)
      .input('phone', sql.NVarChar(20), data.phone || null)
      .input('department_id', sql.UniqueIdentifier, departmentId)
      .input('position_id', sql.UniqueIdentifier, positionId)
      .input('manager_id', sql.UniqueIdentifier, managerId)
      .input('role', sql.NVarChar(20), data.role || 'member')
      .input('employment_type', sql.NVarChar(20), data.employment_type || 'full_time')
      .input('employment_status', sql.NVarChar(20), data.employment_status || 'active')
      .input('start_date', sql.Date, data.start_date ? new Date(data.start_date) : null)
      .input('is_active', sql.Bit, data.is_active !== false ? 1 : 0)
      .query(`
        UPDATE pms.employees SET
          employee_code = @employee_code,
          email = @email,
          first_name = @first_name,
          last_name = @last_name,
          first_name_th = @first_name_th,
          last_name_th = @last_name_th,
          nickname = @nickname,
          phone = @phone,
          department_id = @department_id,
          position_id = @position_id,
          manager_id = @manager_id,
          role = @role,
          employment_type = @employment_type,
          employment_status = @employment_status,
          start_date = @start_date,
          is_active = @is_active,
          updated_at = GETDATE()
        WHERE id = @id
      `)

    revalidatePath('/team/employees')
    return { success: true, message: 'Employee updated successfully' }

  } catch (error: any) {
    console.error('updateEmployee error:', error)
    return { success: false, error: error.message || 'Failed to update employee' }
  }
}

// ============================================
// GET EMPLOYEES
// ============================================

export async function getEmployees(filters?: {
  departmentId?: string
  positionId?: string
  role?: string
  status?: string
  search?: string
}) {
  try {
    const pool = await getConnection()

    let query = `
      SELECT 
        e.id,
        e.employee_code,
        e.email,
        e.first_name,
        e.last_name,
        e.first_name_th,
        e.last_name_th,
        CONCAT(e.first_name_th, ' ', e.last_name_th) as full_name_th,
        CONCAT(e.first_name, ' ', e.last_name) as full_name,
        e.nickname,
        e.phone,
        e.avatar_url,
        e.department_id,
        d.name as department_name,
        e.position_id,
        p.code as position_code,
        p.name as position_name,
        e.manager_id,
        CONCAT(m.first_name_th, ' ', m.last_name_th) as manager_name,
        e.role,
        e.employment_type,
        e.employment_status,
        e.start_date,
        e.is_active,
        e.created_at
      FROM pms.employees e
      LEFT JOIN pms.departments d ON e.department_id = d.id
      LEFT JOIN pms.positions p ON e.position_id = p.id
      LEFT JOIN pms.employees m ON e.manager_id = m.id
      WHERE 1=1
    `

    const request = pool.request()

    if (filters?.departmentId) {
      query += ` AND e.department_id = @departmentId`
      request.input('departmentId', sql.UniqueIdentifier, filters.departmentId)
    }

    if (filters?.positionId) {
      query += ` AND e.position_id = @positionId`
      request.input('positionId', sql.UniqueIdentifier, filters.positionId)
    }

    if (filters?.role) {
      query += ` AND e.role = @role`
      request.input('role', sql.NVarChar, filters.role)
    }

    if (filters?.status) {
      query += ` AND e.employment_status = @status`
      request.input('status', sql.NVarChar, filters.status)
    }

    if (filters?.search) {
      query += ` AND (
        e.employee_code LIKE @search 
        OR e.first_name LIKE @search 
        OR e.last_name LIKE @search
        OR e.first_name_th LIKE @search
        OR e.last_name_th LIKE @search
        OR e.email LIKE @search
      )`
      request.input('search', sql.NVarChar, `%${filters.search}%`)
    }

    query += ` ORDER BY e.employee_code`

    const result = await request.query(query)
    return { success: true, data: result.recordset }

  } catch (error: any) {
    console.error('getEmployees error:', error)
    return { success: false, error: error.message, data: [] }
  }
}

// ============================================
// GET EMPLOYEE BY ID
// ============================================

export async function getEmployeeById(id: string) {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          e.*,
          d.name as department_name,
          p.code as position_code,
          p.name as position_name,
          CONCAT(m.first_name_th, ' ', m.last_name_th) as manager_name
        FROM pms.employees e
        LEFT JOIN pms.departments d ON e.department_id = d.id
        LEFT JOIN pms.positions p ON e.position_id = p.id
        LEFT JOIN pms.employees m ON e.manager_id = m.id
        WHERE e.id = @id
      `)

    if (result.recordset.length === 0) {
      return { success: false, error: 'Employee not found', data: null }
    }

    return { success: true, data: result.recordset[0] }

  } catch (error: any) {
    console.error('getEmployeeById error:', error)
    return { success: false, error: error.message, data: null }
  }
}

// ============================================
// DELETE EMPLOYEE
// ============================================

export async function deleteEmployee(id: string) {
  try {
    const pool = await getConnection()

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`UPDATE pms.employees SET is_active = 0, updated_at = GETDATE() WHERE id = @id`)

    revalidatePath('/team/employees')
    return { success: true, message: 'Employee deleted successfully' }

  } catch (error: any) {
    console.error('deleteEmployee error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// GET FORM OPTIONS
// ============================================

export async function getEmployeeFormOptions() {
  try {
    const pool = await getConnection()

    // Check if name_th columns exist in departments and positions
    const columnCheck = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'pms'
      AND TABLE_NAME IN ('departments', 'positions')
      AND COLUMN_NAME = 'name_th'
    `)
    const hasNameThDept = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'departments')
    const hasNameThPos = columnCheck.recordset.some((r: any) => r.TABLE_NAME === 'positions')

    const deptQuery = hasNameThDept
      ? `SELECT id, code, name, name_th FROM pms.departments WHERE is_active = 1 ORDER BY sort_order, name`
      : `SELECT id, code, name, NULL as name_th FROM pms.departments WHERE is_active = 1 ORDER BY sort_order, name`

    const posQuery = hasNameThPos
      ? `SELECT id, code, name, name_th, department_id FROM pms.positions WHERE is_active = 1 ORDER BY sort_order, name`
      : `SELECT id, code, name, NULL as name_th, department_id FROM pms.positions WHERE is_active = 1 ORDER BY sort_order, name`

    const [departments, positions, managers] = await Promise.all([
      pool.request().query(deptQuery),
      pool.request().query(posQuery),
      pool.request().query(`
        SELECT id, employee_code,
          CONCAT(first_name_th, ' ', last_name_th) as name_th,
          CONCAT(first_name, ' ', last_name) as name
        FROM pms.employees
        WHERE is_active = 1 AND role = 'manager'
        ORDER BY first_name
      `)
    ])

    return {
      success: true,
      data: {
        departments: departments.recordset,
        positions: positions.recordset,
        managers: managers.recordset
      }
    }

  } catch (error: any) {
    console.error('getEmployeeFormOptions error:', error)
    return { success: false, error: error.message, data: null }
  }
}

// ============================================
// GET EMPLOYEE OPTIONS (for dropdowns)
// ============================================

export async function getEmployeeOptions() {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .query(`
        SELECT 
          e.id,
          e.employee_code,
          e.first_name_th,
          e.last_name_th,
          e.nickname,
          p.code AS position_code
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.[is_active] = 1
        ORDER BY e.first_name_th, e.last_name_th
      `)

    return { success: true, data: result.recordset }

  } catch (error: any) {
    console.error('getEmployeeOptions error:', error)
    return { success: false, error: error.message, data: [] }
  }
}

// ============================================
// GET ACTIVE EMPLOYEES (for Task Assignment)
// ============================================

export async function getActiveEmployees() {
  try {
    const pool = await getConnection()

    // Get employees with basic info for dropdowns
    // Similar to getEmployees but lightweight and only active
    const result = await pool.request()
      .query(`
        SELECT
          e.id,
          e.employee_code,
          e.first_name,
          e.last_name,
          e.nickname,
          COALESCE(NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''), e.nickname, e.employee_code) as full_name,
          p.name as position
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1
        ORDER BY e.first_name, e.last_name, e.nickname
      `)

    return { success: true, data: result.recordset }

  } catch (error: any) {
    console.error('getActiveEmployees error:', error)
    return { success: false, error: error.message, data: [] }
  }
}
// ============================================
// GET ASSIGNABLE EMPLOYEES
// ============================================

export async function getAssignableEmployees(dueDate?: string) {
  try {
    const pool = await getConnection()
    const request = pool.request()

    let query = `
            SELECT 
                e.id,
                e.employee_code,
                e.first_name,
                e.last_name,
                e.nickname,
                p.code as role_code,
                p.name as role_name,
                ISNULL((
                    SELECT SUM(t.estimated_hours)
                    FROM pms.tasks t
                    WHERE t.assignee_id = e.id 
                    ${dueDate ? 'AND t.due_date = @dueDate' : ''}
                    AND t.status NOT IN ('done', 'cancelled')
                    AND t.is_active = 1
                ), 0) as assigned_hours,
                7 as max_hours_per_day
            FROM pms.employees e
            LEFT JOIN pms.positions p ON e.position_id = p.id
            WHERE e.is_active = 1
            ORDER BY CASE WHEN p.code = 'PG' THEN 1 ELSE 2 END, e.first_name
        `

    if (dueDate) {
      request.input('dueDate', sql.Date, new Date(dueDate))
    }

    const result = await request.query(query)
    return { success: true, data: result.recordset }

  } catch (error: any) {
    console.error('getAssignableEmployees error:', error)
    return { success: false, error: error.message, data: [] }
  }
}
