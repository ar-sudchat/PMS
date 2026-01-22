/**
 * Fix Activity Type CHECK Constraint
 * 
 * Problem: The CHECK constraint on timesheet_entries.activity_type only allows:
 * 'development', 'bug_fix', 'meeting', 'documentation', 'testing', 'support', 'other'
 * 
 * But task_type_configs has other types like 'design', 'refactor', etc.
 * 
 * Solution: Drop the strict constraint and replace with a flexible one
 */

import sql from 'mssql';

const config = {
    server: 'localhost',
    database: 'MoveonDB',
    user: 'sa',
    password: '1q2w3E*',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function fixActivityTypeConstraint() {
    let pool: sql.ConnectionPool | null = null;

    try {
        console.log('🔗 Connecting to database...');
        pool = await sql.connect(config);

        // Step 1: Check if constraint exists
        console.log('📋 Checking existing constraint...');
        const checkResult = await pool.request().query(`
      SELECT * FROM sys.check_constraints 
      WHERE object_id = OBJECT_ID('pms.CK_timesheet_activity_type')
    `);

        // Step 2: Drop existing constraint if it exists
        if (checkResult.recordset.length > 0) {
            console.log('🗑️  Dropping old strict constraint...');
            await pool.request().query(`
        ALTER TABLE pms.timesheet_entries 
        DROP CONSTRAINT CK_timesheet_activity_type
      `);
            console.log('✅ Old constraint dropped successfully');
        } else {
            console.log('ℹ️  No existing constraint found');
        }

        // Step 3: Add new flexible constraint
        console.log('➕ Adding new flexible constraint...');
        await pool.request().query(`
      ALTER TABLE pms.timesheet_entries 
      ADD CONSTRAINT CK_timesheet_activity_type 
      CHECK (activity_type IS NOT NULL AND LEN(activity_type) > 0 AND LEN(activity_type) <= 50)
    `);
        console.log('✅ New constraint added successfully');

        // Step 4: Update any NULL or empty values
        console.log('🔄 Updating NULL/empty values to default...');
        const updateResult = await pool.request().query(`
      UPDATE pms.timesheet_entries 
      SET activity_type = 'development' 
      WHERE activity_type IS NULL OR activity_type = ''
    `);
        console.log(`✅ Updated ${updateResult.rowsAffected[0]} rows`);

        console.log('\n✨ Migration completed successfully!');
        console.log('📌 Activity type can now accept any task type from task_type_configs');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run migration
fixActivityTypeConstraint()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
