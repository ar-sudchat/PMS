const dotenv = require('dotenv')
const sql = require('mssql')
const path = require('path')

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
}

async function run() {
    const pool = await sql.connect(config)

    // Check existing status values
    const existing = await pool.request().query(`
        SELECT DISTINCT status FROM pms.timesheet_entries
    `)
    console.log('Existing status values:', existing.recordset)

    // Check constraint definition
    const constraint = await pool.request().query(`
        SELECT definition 
        FROM sys.check_constraints 
        WHERE name = 'chk_timesheet_status'
    `)
    console.log('Constraint definition:', constraint.recordset)

    await pool.close()
}

run().catch(console.error)
