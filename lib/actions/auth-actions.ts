'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import {
    hashPassword,
    verifyPassword,
    createToken,
    setAuthCookie,
    clearAuthCookie,
    getCurrentUser,
    UserSession
} from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const DEFAULT_PASSWORD = '1234'

// ============================================
// LOGIN (Intranet Mode - No Password Required)
// ============================================

export async function login(employeeCode: string, _password?: string) {
    try {
        const pool = await getConnection()

        // Get employee by code only
        const result = await pool.request()
            .input('employeeCode', sql.NVarChar, employeeCode)
            .query(`
        SELECT
          e.id,
          e.employee_code,
          e.email,
          e.first_name,
          e.last_name,
          e.first_name_th,
          e.last_name_th,
          e.nickname,
          e.role,
          e.is_active,
          e.department_id,
          p.code as position_code
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.employee_code = @employeeCode
      `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'ไม่พบรหัสพนักงาน' }
        }

        const employee = result.recordset[0]

        // Check if active
        if (!employee.is_active) {
            return { success: false, error: 'บัญชีถูกระงับการใช้งาน' }
        }

        // Update last login
        await pool.request()
            .input('id', sql.UniqueIdentifier, employee.id)
            .query(`UPDATE pms.employees SET last_login = GETDATE() WHERE id = @id`)

        // Create session
        const userSession: UserSession = {
            id: employee.id,
            employeeCode: employee.employee_code,
            email: employee.email,
            name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            nameTh: `${employee.first_name_th || ''} ${employee.last_name_th || ''}`.trim(),
            nickname: employee.nickname,
            role: employee.role,
            positionCode: employee.position_code,
            departmentId: employee.department_id,
            mustChangePassword: false
        }

        // Create token and set cookie
        const token = await createToken(userSession)
        await setAuthCookie(token)

        return {
            success: true,
            user: userSession,
            mustChangePassword: false
        }

    } catch (error: any) {
        console.error('Login error:', error)
        return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
    }
}

// ============================================
// LOGOUT
// ============================================

export async function logout() {
    await clearAuthCookie()
    redirect('/login')
}

// ============================================
// CHANGE PASSWORD
// ============================================

export async function changePassword(currentPassword: string, newPassword: string) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        const pool = await getConnection()

        // Get current password hash
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, user.id)
            .query(`SELECT password_hash FROM pms.employees WHERE id = @id`)

        if (result.recordset.length === 0) {
            return { success: false, error: 'ไม่พบผู้ใช้' }
        }

        const employee = result.recordset[0]

        // Verify current password
        const isValid = await verifyPassword(currentPassword, employee.password_hash)
        if (!isValid) {
            return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }
        }

        // Validate new password
        if (newPassword.length < 4) {
            return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' }
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword)

        // Update password
        await pool.request()
            .input('id', sql.UniqueIdentifier, user.id)
            .input('passwordHash', sql.NVarChar, newPasswordHash)
            .query(`
        UPDATE pms.employees 
        SET password_hash = @passwordHash, 
            must_change_password = 0,
            updated_at = GETDATE()
        WHERE id = @id
      `)

        // Update session (remove mustChangePassword flag)
        const updatedUser: UserSession = { ...user, mustChangePassword: false }
        const token = await createToken(updatedUser)
        await setAuthCookie(token)

        return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' }

    } catch (error: any) {
        console.error('Change password error:', error)
        return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
}

// ============================================
// ADMIN: RESET PASSWORD TO 1234
// ============================================

export async function resetPassword(employeeId: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'ไม่มีสิทธิ์ดำเนินการ' }
        }

        const pool = await getConnection()

        // Hash default password
        const defaultPasswordHash = await hashPassword(DEFAULT_PASSWORD)

        // Update password
        await pool.request()
            .input('id', sql.UniqueIdentifier, employeeId)
            .input('passwordHash', sql.NVarChar, defaultPasswordHash)
            .query(`
        UPDATE pms.employees 
        SET password_hash = @passwordHash, 
            must_change_password = 1,
            login_attempts = 0,
            locked_until = NULL,
            updated_at = GETDATE()
        WHERE id = @id
      `)

        revalidatePath('/team/employees')
        return { success: true, message: 'รีเซ็ตรหัสผ่านเป็น 1234 สำเร็จ' }

    } catch (error: any) {
        console.error('Reset password error:', error)
        return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
}

// ============================================
// UPDATE PROFILE
// ============================================

export async function updateProfile(data: {
    email?: string
    phone?: string
    nickname?: string
    avatar_url?: string
}) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, user.id)
            .input('email', sql.NVarChar, data.email)
            .input('phone', sql.NVarChar, data.phone || null)
            .input('nickname', sql.NVarChar, data.nickname || null)
            .input('avatar_url', sql.NVarChar, data.avatar_url || null)
            .query(`
        UPDATE pms.employees 
        SET email = @email,
            phone = @phone,
            nickname = @nickname,
            avatar_url = @avatar_url,
            updated_at = GETDATE()
        WHERE id = @id
      `)

        return { success: true, message: 'อัพเดทข้อมูลสำเร็จ' }

    } catch (error: any) {
        console.error('Update profile error:', error)
        return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
}

// ============================================
// GET CURRENT USER (for client)
// ============================================

export async function getSession() {
    const user = await getCurrentUser()
    return user
}
