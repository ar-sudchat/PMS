'use server'

import { getConnection } from '@/lib/db'
import sql from 'mssql'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface DOARule {
    id: string
    rule_code: string
    rule_name: string
    module_code: string
    document_type?: string
    conditions: DOAConditions
    description?: string
    priority: number
    is_active: boolean
    effective_date?: Date
    expiry_date?: Date
    created_by?: string
    created_at: Date
}

export interface DOAConditions {
    type: 'AMOUNT_BASED' | 'HIERARCHY' | 'CUSTOM'
    field?: string
    rules: DOALevelRule[]
}

export interface DOALevelRule {
    level: string
    position?: string
    role?: string
    department_id?: string
    min_amount?: number
    max_amount?: number | null
    conditions?: any
}

export interface DOAAssignment {
    id: string
    doa_rule_id: string
    user_id: string
    position_code?: string
    department_id?: string
    min_amount?: number
    max_amount?: number
    conditions?: any
    is_active: boolean
    effective_date: Date
    expiry_date?: Date
    delegated_from?: string
    delegation_reason?: string
    created_by?: string
    created_at: Date
    // Joined fields
    user_name?: string
    rule_name?: string
    delegated_from_name?: string
}

// ============================================
// DOA RULE MANAGEMENT
// ============================================

/**
 * Get all DOA rules
 */
export async function fetchDOARules(moduleCode?: string): Promise<DOARule[]> {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        let query = `
            SELECT id, rule_code, rule_name, module_code, document_type, conditions,
                   description, priority, is_active, effective_date, expiry_date,
                   created_by, created_at
            FROM pms.doa_rules
            WHERE 1=1
        `

        if (moduleCode) {
            query += ` AND module_code = @moduleCode`
        }

        query += ` ORDER BY priority DESC, rule_code`

        const result = await pool.request()
            .input('moduleCode', sql.VarChar(50), moduleCode || null)
            .query(query)

        return result.recordset.map(row => ({
            ...row,
            conditions: row.conditions ? JSON.parse(row.conditions) : {}
        }))

    } catch (error) {
        console.error('fetchDOARules error:', error)
        return []
    }
}

/**
 * Get DOA rule by code
 */
export async function fetchDOARule(ruleCode: string): Promise<DOARule | null> {
    try {
        const pool = await getConnection()

        const result = await pool.request()
            .input('ruleCode', sql.VarChar(50), ruleCode)
            .query(`
                SELECT * FROM pms.doa_rules WHERE rule_code = @ruleCode
            `)

        if (result.recordset.length === 0) return null

        const row = result.recordset[0]
        return {
            ...row,
            conditions: row.conditions ? JSON.parse(row.conditions) : {}
        }

    } catch (error) {
        console.error('fetchDOARule error:', error)
        return null
    }
}

/**
 * Create a new DOA rule
 */
export async function createDOARule(data: {
    rule_code: string
    rule_name: string
    module_code: string
    document_type?: string
    conditions: DOAConditions
    description?: string
    priority?: number
    effective_date?: Date
    expiry_date?: Date
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('ruleCode', sql.VarChar(50), data.rule_code)
            .input('ruleName', sql.NVarChar(200), data.rule_name)
            .input('moduleCode', sql.VarChar(50), data.module_code)
            .input('documentType', sql.VarChar(50), data.document_type || null)
            .input('conditions', sql.NVarChar(sql.MAX), JSON.stringify(data.conditions))
            .input('description', sql.NVarChar(500), data.description || null)
            .input('priority', sql.Int, data.priority || 0)
            .input('effectiveDate', sql.Date, data.effective_date || new Date())
            .input('expiryDate', sql.Date, data.expiry_date || null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.doa_rules
                (id, rule_code, rule_name, module_code, document_type, conditions, description,
                 priority, is_active, effective_date, expiry_date, created_by)
                VALUES (@id, @ruleCode, @ruleName, @moduleCode, @documentType, @conditions, @description,
                        @priority, 1, @effectiveDate, @expiryDate, @createdBy)
            `)

        revalidatePath('/settings/doa')
        return { success: true, id }

    } catch (error: any) {
        console.error('createDOARule error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Update a DOA rule
 */
export async function updateDOARule(
    id: string,
    data: {
        rule_name?: string
        conditions?: DOAConditions
        description?: string
        priority?: number
        is_active?: boolean
        effective_date?: Date
        expiry_date?: Date
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: string[] = []
        const request = pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('updatedBy', sql.UniqueIdentifier, user.id)

        if (data.rule_name !== undefined) {
            updates.push('rule_name = @ruleName')
            request.input('ruleName', sql.NVarChar(200), data.rule_name)
        }
        if (data.conditions !== undefined) {
            updates.push('conditions = @conditions')
            request.input('conditions', sql.NVarChar(sql.MAX), JSON.stringify(data.conditions))
        }
        if (data.description !== undefined) {
            updates.push('description = @description')
            request.input('description', sql.NVarChar(500), data.description)
        }
        if (data.priority !== undefined) {
            updates.push('priority = @priority')
            request.input('priority', sql.Int, data.priority)
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = @isActive')
            request.input('isActive', sql.Bit, data.is_active ? 1 : 0)
        }
        if (data.effective_date !== undefined) {
            updates.push('effective_date = @effectiveDate')
            request.input('effectiveDate', sql.Date, data.effective_date)
        }
        if (data.expiry_date !== undefined) {
            updates.push('expiry_date = @expiryDate')
            request.input('expiryDate', sql.Date, data.expiry_date)
        }

        if (updates.length === 0) {
            return { success: false, error: 'No updates provided' }
        }

        updates.push('updated_by = @updatedBy', 'updated_at = GETDATE()')

        await request.query(`
            UPDATE pms.doa_rules
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/settings/doa')
        return { success: true }

    } catch (error: any) {
        console.error('updateDOARule error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a DOA rule
 */
export async function deleteDOARule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Check if rule is in use
        const inUseResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT COUNT(*) AS count FROM pms.doa_assignments WHERE doa_rule_id = @id
            `)

        if (inUseResult.recordset[0].count > 0) {
            return { success: false, error: 'Cannot delete rule that has assignments' }
        }

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.doa_rules WHERE id = @id`)

        revalidatePath('/settings/doa')
        return { success: true }

    } catch (error: any) {
        console.error('deleteDOARule error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DOA ASSIGNMENT MANAGEMENT
// ============================================

/**
 * Get DOA assignments
 */
export async function fetchDOAAssignments(
    ruleId?: string,
    userId?: string
): Promise<DOAAssignment[]> {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        let query = `
            SELECT
                da.id, da.doa_rule_id, da.user_id, da.position_code, da.department_id,
                da.min_amount, da.max_amount, da.conditions, da.is_active,
                da.effective_date, da.expiry_date, da.delegated_from, da.delegation_reason,
                da.created_by, da.created_at,
                CONCAT(e.first_name, ' ', e.last_name) AS user_name,
                dr.rule_name,
                CONCAT(df.first_name, ' ', df.last_name) AS delegated_from_name
            FROM pms.doa_assignments da
            JOIN pms.doa_rules dr ON da.doa_rule_id = dr.id
            LEFT JOIN pms.employees e ON da.user_id = e.id
            LEFT JOIN pms.employees df ON da.delegated_from = df.id
            WHERE 1=1
        `

        if (ruleId) {
            query += ` AND da.doa_rule_id = @ruleId`
        }
        if (userId) {
            query += ` AND da.user_id = @userId`
        }

        query += ` ORDER BY da.created_at DESC`

        const result = await pool.request()
            .input('ruleId', sql.UniqueIdentifier, ruleId || null)
            .input('userId', sql.UniqueIdentifier, userId || null)
            .query(query)

        return result.recordset.map(row => ({
            ...row,
            conditions: row.conditions ? JSON.parse(row.conditions) : null
        }))

    } catch (error) {
        console.error('fetchDOAAssignments error:', error)
        return []
    }
}

/**
 * Get my DOA assignments (current user's authority)
 */
export async function fetchMyDOAAssignments(): Promise<DOAAssignment[]> {
    try {
        const user = await getCurrentUser()
        if (!user) return []

        const pool = await getConnection()

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT
                    da.id, da.doa_rule_id, da.user_id, da.position_code, da.department_id,
                    da.min_amount, da.max_amount, da.conditions, da.is_active,
                    da.effective_date, da.expiry_date, da.delegated_from, da.delegation_reason,
                    da.created_by, da.created_at,
                    dr.rule_name, dr.rule_code, dr.module_code, dr.document_type,
                    CONCAT(df.first_name, ' ', df.last_name) AS delegated_from_name
                FROM pms.doa_assignments da
                JOIN pms.doa_rules dr ON da.doa_rule_id = dr.id
                LEFT JOIN pms.employees df ON da.delegated_from = df.id
                WHERE da.user_id = @userId
                  AND da.is_active = 1
                  AND dr.is_active = 1
                  AND (da.effective_date IS NULL OR da.effective_date <= GETDATE())
                  AND (da.expiry_date IS NULL OR da.expiry_date >= GETDATE())
                ORDER BY dr.module_code, dr.rule_code
            `)

        return result.recordset.map(row => ({
            ...row,
            conditions: row.conditions ? JSON.parse(row.conditions) : null
        }))

    } catch (error) {
        console.error('fetchMyDOAAssignments error:', error)
        return []
    }
}

/**
 * Create DOA assignment
 */
export async function createDOAAssignment(data: {
    doa_rule_id: string
    user_id: string
    position_code?: string
    department_id?: string
    min_amount?: number
    max_amount?: number
    conditions?: any
    effective_date: Date
    expiry_date?: Date
    delegated_from?: string
    delegation_reason?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('doaRuleId', sql.UniqueIdentifier, data.doa_rule_id)
            .input('userId', sql.UniqueIdentifier, data.user_id)
            .input('positionCode', sql.VarChar(50), data.position_code || null)
            .input('departmentId', sql.UniqueIdentifier, data.department_id || null)
            .input('minAmount', sql.Decimal(15, 2), data.min_amount || null)
            .input('maxAmount', sql.Decimal(15, 2), data.max_amount || null)
            .input('conditions', sql.NVarChar(sql.MAX), data.conditions ? JSON.stringify(data.conditions) : null)
            .input('effectiveDate', sql.Date, data.effective_date)
            .input('expiryDate', sql.Date, data.expiry_date || null)
            .input('delegatedFrom', sql.UniqueIdentifier, data.delegated_from || null)
            .input('delegationReason', sql.NVarChar(500), data.delegation_reason || null)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.doa_assignments
                (id, doa_rule_id, user_id, position_code, department_id, min_amount, max_amount,
                 conditions, is_active, effective_date, expiry_date, delegated_from, delegation_reason, created_by)
                VALUES (@id, @doaRuleId, @userId, @positionCode, @departmentId, @minAmount, @maxAmount,
                        @conditions, 1, @effectiveDate, @expiryDate, @delegatedFrom, @delegationReason, @createdBy)
            `)

        revalidatePath('/settings/doa')
        return { success: true, id }

    } catch (error: any) {
        console.error('createDOAAssignment error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Update DOA assignment
 */
export async function updateDOAAssignment(
    id: string,
    data: {
        min_amount?: number
        max_amount?: number
        conditions?: any
        is_active?: boolean
        effective_date?: Date
        expiry_date?: Date
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        const updates: string[] = []
        const request = pool.request().input('id', sql.UniqueIdentifier, id)

        if (data.min_amount !== undefined) {
            updates.push('min_amount = @minAmount')
            request.input('minAmount', sql.Decimal(15, 2), data.min_amount)
        }
        if (data.max_amount !== undefined) {
            updates.push('max_amount = @maxAmount')
            request.input('maxAmount', sql.Decimal(15, 2), data.max_amount)
        }
        if (data.conditions !== undefined) {
            updates.push('conditions = @conditions')
            request.input('conditions', sql.NVarChar(sql.MAX), JSON.stringify(data.conditions))
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = @isActive')
            request.input('isActive', sql.Bit, data.is_active ? 1 : 0)
        }
        if (data.effective_date !== undefined) {
            updates.push('effective_date = @effectiveDate')
            request.input('effectiveDate', sql.Date, data.effective_date)
        }
        if (data.expiry_date !== undefined) {
            updates.push('expiry_date = @expiryDate')
            request.input('expiryDate', sql.Date, data.expiry_date)
        }

        if (updates.length === 0) {
            return { success: false, error: 'No updates provided' }
        }

        await request.query(`
            UPDATE pms.doa_assignments
            SET ${updates.join(', ')}
            WHERE id = @id
        `)

        revalidatePath('/settings/doa')
        return { success: true }

    } catch (error: any) {
        console.error('updateDOAAssignment error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete DOA assignment
 */
export async function deleteDOAAssignment(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'admin') {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM pms.doa_assignments WHERE id = @id`)

        revalidatePath('/settings/doa')
        return { success: true }

    } catch (error: any) {
        console.error('deleteDOAAssignment error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DOA DELEGATION (User self-service)
// ============================================

/**
 * Delegate my authority to another user
 */
export async function delegateMyAuthority(data: {
    original_assignment_id: string
    delegate_to_user_id: string
    effective_date: Date
    expiry_date: Date
    delegation_reason: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Get original assignment
        const originalResult = await pool.request()
            .input('id', sql.UniqueIdentifier, data.original_assignment_id)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT * FROM pms.doa_assignments
                WHERE id = @id AND user_id = @userId AND is_active = 1
            `)

        if (originalResult.recordset.length === 0) {
            return { success: false, error: 'Assignment not found or not owned by you' }
        }

        const original = originalResult.recordset[0]

        // Create delegated assignment
        const id = uuidv4()

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('doaRuleId', sql.UniqueIdentifier, original.doa_rule_id)
            .input('userId', sql.UniqueIdentifier, data.delegate_to_user_id)
            .input('positionCode', sql.VarChar(50), original.position_code)
            .input('departmentId', sql.UniqueIdentifier, original.department_id)
            .input('minAmount', sql.Decimal(15, 2), original.min_amount)
            .input('maxAmount', sql.Decimal(15, 2), original.max_amount)
            .input('conditions', sql.NVarChar(sql.MAX), original.conditions)
            .input('effectiveDate', sql.Date, data.effective_date)
            .input('expiryDate', sql.Date, data.expiry_date)
            .input('delegatedFrom', sql.UniqueIdentifier, user.id)
            .input('delegationReason', sql.NVarChar(500), data.delegation_reason)
            .input('createdBy', sql.UniqueIdentifier, user.id)
            .query(`
                INSERT INTO pms.doa_assignments
                (id, doa_rule_id, user_id, position_code, department_id, min_amount, max_amount,
                 conditions, is_active, effective_date, expiry_date, delegated_from, delegation_reason, created_by)
                VALUES (@id, @doaRuleId, @userId, @positionCode, @departmentId, @minAmount, @maxAmount,
                        @conditions, 1, @effectiveDate, @expiryDate, @delegatedFrom, @delegationReason, @createdBy)
            `)

        revalidatePath('/settings/doa')
        return { success: true, id }

    } catch (error: any) {
        console.error('delegateMyAuthority error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Revoke my delegation
 */
export async function revokeMyDelegation(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const pool = await getConnection()

        // Check if this delegation was created by current user
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, assignmentId)
            .input('userId', sql.UniqueIdentifier, user.id)
            .query(`
                SELECT id FROM pms.doa_assignments
                WHERE id = @id AND delegated_from = @userId
            `)

        if (result.recordset.length === 0) {
            return { success: false, error: 'Delegation not found or not created by you' }
        }

        // Deactivate the delegation
        await pool.request()
            .input('id', sql.UniqueIdentifier, assignmentId)
            .query(`
                UPDATE pms.doa_assignments
                SET is_active = 0, expiry_date = GETDATE()
                WHERE id = @id
            `)

        revalidatePath('/settings/doa')
        return { success: true }

    } catch (error: any) {
        console.error('revokeMyDelegation error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DOA CHECKING
// ============================================

/**
 * Check if user has authority for a specific action
 */
export async function checkUserAuthority(
    userId: string,
    moduleCode: string,
    documentType: string,
    amount?: number
): Promise<{
    hasAuthority: boolean
    maxAmount?: number
    assignmentId?: string
}> {
    try {
        const pool = await getConnection()

        let query = `
            SELECT TOP 1 da.id, da.min_amount, da.max_amount
            FROM pms.doa_assignments da
            JOIN pms.doa_rules dr ON da.doa_rule_id = dr.id
            WHERE da.user_id = @userId
              AND dr.module_code = @moduleCode
              AND dr.is_active = 1
              AND da.is_active = 1
              AND (da.effective_date IS NULL OR da.effective_date <= GETDATE())
              AND (da.expiry_date IS NULL OR da.expiry_date >= GETDATE())
        `

        if (documentType) {
            query += ` AND (dr.document_type IS NULL OR dr.document_type = @documentType)`
        }

        if (amount !== undefined) {
            query += ` AND (da.min_amount IS NULL OR da.min_amount <= @amount)`
            query += ` AND (da.max_amount IS NULL OR da.max_amount >= @amount)`
        }

        query += ` ORDER BY dr.priority DESC, da.max_amount DESC`

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .input('moduleCode', sql.VarChar(50), moduleCode)
            .input('documentType', sql.VarChar(50), documentType)
            .input('amount', sql.Decimal(15, 2), amount || 0)
            .query(query)

        if (result.recordset.length === 0) {
            return { hasAuthority: false }
        }

        const assignment = result.recordset[0]
        return {
            hasAuthority: true,
            maxAmount: assignment.max_amount,
            assignmentId: assignment.id
        }

    } catch (error) {
        console.error('checkUserAuthority error:', error)
        return { hasAuthority: false }
    }
}

/**
 * Find approver by DOA for a document
 */
export async function findDOAApprover(
    moduleCode: string,
    documentType: string,
    amount: number
): Promise<{ user_id: string; user_name: string; email?: string } | null> {
    try {
        const pool = await getConnection()

        // Get matching DOA rule
        const ruleResult = await pool.request()
            .input('moduleCode', sql.VarChar(50), moduleCode)
            .input('documentType', sql.VarChar(50), documentType)
            .query(`
                SELECT TOP 1 * FROM pms.doa_rules
                WHERE module_code = @moduleCode
                  AND (document_type IS NULL OR document_type = @documentType)
                  AND is_active = 1
                  AND (effective_date IS NULL OR effective_date <= GETDATE())
                  AND (expiry_date IS NULL OR expiry_date >= GETDATE())
                ORDER BY priority DESC
            `)

        if (ruleResult.recordset.length === 0) return null

        const rule = ruleResult.recordset[0]
        const conditions = JSON.parse(rule.conditions)

        // Find matching level based on amount
        let matchingLevel: any = null
        for (const r of conditions.rules) {
            const minAmount = r.min_amount || 0
            const maxAmount = r.max_amount

            if (amount >= minAmount && (maxAmount === null || amount <= maxAmount)) {
                matchingLevel = r
                break
            }
        }

        if (!matchingLevel) return null

        // Find user with matching assignment
        const approverResult = await pool.request()
            .input('ruleId', sql.UniqueIdentifier, rule.id)
            .input('amount', sql.Decimal(15, 2), amount)
            .query(`
                SELECT TOP 1 e.id AS user_id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                FROM pms.doa_assignments da
                JOIN pms.employees e ON da.user_id = e.id
                WHERE da.doa_rule_id = @ruleId
                  AND da.is_active = 1
                  AND e.is_active = 1
                  AND (da.min_amount IS NULL OR da.min_amount <= @amount)
                  AND (da.max_amount IS NULL OR da.max_amount >= @amount)
                  AND (da.effective_date IS NULL OR da.effective_date <= GETDATE())
                  AND (da.expiry_date IS NULL OR da.expiry_date >= GETDATE())
                ORDER BY da.max_amount ASC
            `)

        if (approverResult.recordset.length === 0) {
            // Fallback: find by position code
            const roleResult = await pool.request()
                .input('positionCode', sql.VarChar(50), matchingLevel.position || matchingLevel.role)
                .query(`
                    SELECT TOP 1 e.id AS user_id, CONCAT(e.first_name, ' ', e.last_name) AS user_name, e.email
                    FROM pms.employees e
                    JOIN pms.positions p ON e.position_id = p.id
                    WHERE p.position_code = @positionCode AND e.is_active = 1
                    ORDER BY e.created_at
                `)

            return roleResult.recordset[0] || null
        }

        return approverResult.recordset[0]

    } catch (error) {
        console.error('findDOAApprover error:', error)
        return null
    }
}
