
import * as dotenv from 'dotenv'
import path from 'path'
import sql from 'mssql'
import fs from 'fs'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
}

async function inspectConstraints() {
    try {
        console.log('Connecting to DB...')
        const pool = await sql.connect(config)
        console.log('Connected.')

        // Check existing values
        console.log('--- EXISTING TASKS task_type ---')
        const resTasks = await pool.request().query("SELECT TOP 10 task_type FROM pms.tasks GROUP BY task_type")
        console.log(JSON.stringify(resTasks.recordset, null, 2))

        console.log('--- EXISTING MILESTONES status ---')
        const resMilestones = await pool.request().query("SELECT TOP 10 status FROM pms.project_milestones GROUP BY status")
        console.log(JSON.stringify(resMilestones.recordset, null, 2))

        console.log('--- EXISTING STORIES status ---')
        const resStories = await pool.request().query("SELECT TOP 10 status FROM pms.stories GROUP BY status")
        console.log(JSON.stringify(resStories.recordset, null, 2))

        // Check Constraint Definitions
        console.log('--- CONSTRAINT DEFINITIONS ---')
        const resConstraints = await pool.request().query(`
        SELECT k.TABLE_NAME, c.CONSTRAINT_NAME, c.CHECK_CLAUSE 
        FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS c
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS k ON c.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE c.CONSTRAINT_SCHEMA = 'pms'
    `)
        console.log(JSON.stringify(resConstraints.recordset, null, 2))

        process.exit(0)
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

inspectConstraints()
