import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/db'

/**
 * Temporary API endpoint to fix activity_type CHECK constraint
 * 
 * Run once by visiting: http://localhost:3000/api/migrate/fix-activity-constraint
 */
export async function GET(request: NextRequest) {
    try {
        const pool = await getConnection()

        console.log('📋 Starting migration: Fix activity_type constraint...')

        // Step 1: Check if constraint exists
        const checkResult = await pool.request().query(`
      SELECT * FROM sys.check_constraints 
      WHERE object_id = OBJECT_ID('pms.CK_timesheet_activity_type')
    `)

        let dropped = false
        let added = false
        let updated = 0

        // Step 2: Drop existing constraint if it exists
        if (checkResult.recordset.length > 0) {
            console.log('🗑️  Dropping old strict constraint...')
            await pool.request().query(`
        ALTER TABLE pms.timesheet_entries 
        DROP CONSTRAINT CK_timesheet_activity_type
      `)
            dropped = true
            console.log('✅ Old constraint dropped')
        }

        // Step 3: Add new flexible constraint
        console.log('➕ Adding new flexible constraint...')
        try {
            await pool.request().query(`
        ALTER TABLE pms.timesheet_entries 
        ADD CONSTRAINT CK_timesheet_activity_type 
        CHECK (activity_type IS NOT NULL AND LEN(activity_type) > 0 AND LEN(activity_type) <= 50)
      `)
            added = true
            console.log('✅ New constraint added')
        } catch (err: any) {
            // Constraint might already exist
            if (!err.message.includes('already exists')) {
                throw err
            }
        }

        // Step 4: Update any NULL or empty values
        console.log('🔄 Updating NULL/empty values...')
        const updateResult = await pool.request().query(`
      UPDATE pms.timesheet_entries 
      SET activity_type = 'development' 
      WHERE activity_type IS NULL OR activity_type = ''
    `)
        updated = updateResult.rowsAffected[0] || 0
        console.log(`✅ Updated ${updated} rows`)

        return NextResponse.json({
            success: true,
            message: 'Migration completed successfully!',
            details: {
                constraintDropped: dropped,
                constraintAdded: added,
                rowsUpdated: updated,
                info: 'Activity type can now accept any task type from task_type_configs table'
            }
        })

    } catch (error: any) {
        console.error('❌ Migration failed:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
