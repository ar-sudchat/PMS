
import sql from 'mssql'

// Database configuration
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P@ssword123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'pms_db',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}

async function dropTaskTypeConstraint() {
    try {
        console.log('Connecting to database...')
        await sql.connect(config)
        console.log('Connected!')

        // Drop the constraint if it exists
        console.log('Dropping chk_tasks_type constraint...')
        await sql.query(`
            IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'chk_tasks_type')
            BEGIN
                ALTER TABLE pms.tasks DROP CONSTRAINT chk_tasks_type;
                PRINT 'Constraint chk_tasks_type dropped.'
            END
            ELSE
            BEGIN
                PRINT 'Constraint chk_tasks_type does not exist.'
            END
        `)

        console.log('Drop constraint completed successfully.')

    } catch (err) {
        console.error('Error dropping constraint:', err)
    } finally {
        await (sql as any).close()
    }
}

dropTaskTypeConstraint()
