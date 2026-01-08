'use server'

import { getConnection } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface EmployeeFormData {
  employee_code: string;
  first_name: string;
  last_name: string;
  first_name_th?: string;
  last_name_th?: string;
  nickname?: string;
  email: string;
  phone?: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
  role: 'admin' | 'manager' | 'member';
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  employment_status: 'active' | 'inactive' | 'suspended';
  start_date?: string;
  probation_end_date?: string;
  working_hours_per_day: number;
  working_days_per_week: number;
}

export async function getEmployees() {
  const pool = await getConnection()
  const result = await pool.request()
    .query('SELECT * FROM pms.v_employees WHERE is_active = 1 ORDER BY created_at DESC')
  return result.recordset
}

export async function getEmployeeById(id: string) {
  const pool = await getConnection()
  const result = await pool.request()
    .input('id', id)
    .query('SELECT * FROM pms.v_employees WHERE id = @id')
  return result.recordset[0]
}

export async function createEmployee(data: EmployeeFormData) {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('employee_code', data.employee_code)
      .input('first_name', data.first_name)
      .input('last_name', data.last_name)
      .input('first_name_th', data.first_name_th)
      .input('last_name_th', data.last_name_th)
      .input('nickname', data.nickname)
      .input('email', data.email)
      .input('phone', data.phone)
      .input('department_id', data.department_id || null)
      .input('position_id', data.position_id || null)
      .input('manager_id', data.manager_id || null)
      .input('role', data.role)
      .input('employment_type', data.employment_type)
      .input('employment_status', data.employment_status)
      .input('start_date', data.start_date || null)
      .input('probation_end_date', data.probation_end_date || null)
      .input('working_hours_per_day', data.working_hours_per_day)
      .input('working_days_per_week', data.working_days_per_week)
      .query(`
      INSERT INTO pms.employees (
        employee_code, first_name, last_name, first_name_th, last_name_th, nickname,
        email, phone, department_id, position_id, manager_id, role,
        employment_type, employment_status, start_date, probation_end_date,
        working_hours_per_day, working_days_per_week
      )
      OUTPUT INSERTED.id
      VALUES (
        @employee_code, @first_name, @last_name, @first_name_th, @last_name_th, @nickname,
        @email, @phone, @department_id, @position_id, @manager_id, @role,
        @employment_type, @employment_status, @start_date, @probation_end_date,
        @working_hours_per_day, @working_days_per_week
      )
    `)

    revalidatePath('/team')
    return { success: true, id: result.recordset[0].id }
  } catch (error: any) {
    console.error('Create Employee Error:', error)
    throw error
  }
}

export async function updateEmployee(id: string, data: EmployeeFormData) {
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', id)
      .input('first_name', data.first_name)
      .input('last_name', data.last_name)
      .input('first_name_th', data.first_name_th)
      .input('last_name_th', data.last_name_th)
      .input('nickname', data.nickname)
      .input('email', data.email)
      .input('phone', data.phone)
      .input('department_id', data.department_id || null)
      .input('position_id', data.position_id || null)
      .input('manager_id', data.manager_id || null)
      .input('role', data.role)
      .input('employment_type', data.employment_type)
      .input('employment_status', data.employment_status)
      .input('start_date', data.start_date || null)
      .input('probation_end_date', data.probation_end_date || null)
      .input('working_hours_per_day', data.working_hours_per_day)
      .input('working_days_per_week', data.working_days_per_week)
      .query(`
          UPDATE pms.employees 
          SET 
            first_name = @first_name,
            last_name = @last_name,
            first_name_th = @first_name_th,
            last_name_th = @last_name_th,
            nickname = @nickname,
            email = @email,
            phone = @phone,
            department_id = @department_id,
            position_id = @position_id,
            manager_id = @manager_id,
            role = @role,
            employment_type = @employment_type,
            employment_status = @employment_status,
            start_date = @start_date,
            probation_end_date = @probation_end_date,
            working_hours_per_day = @working_hours_per_day,
            working_days_per_week = @working_days_per_week,
            updated_at = GETDATE()
          WHERE id = @id
        `)

    revalidatePath('/team')
    revalidatePath(`/team/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error('Update Employee Error:', error)
    throw error
  }
}

export async function deleteEmployee(id: string) {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', id)
      .query('UPDATE pms.employees SET is_active = 0 WHERE id = @id')

    revalidatePath('/team')

    if (result.rowsAffected[0] === 0) {
      return { success: false, message: 'No employee found with the given ID.' }
    }

    return { success: true, message: 'Employee deleted successfully.' }
  } catch (error: any) {
    console.error('Database Error:', error);
    return { success: false, message: error.message || 'Failed to delete employee.' }
  }
}
