
import * as dotenv from 'dotenv'
import path from 'path'
import sql from 'mssql'

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

async function run() {
    try {
        await sql.connect(config)
        console.log("Connected")

        // Check task codes
        const data = await sql.query(`SELECT id, task_code, story_id FROM pms.tasks`)
        console.log("Tasks:", data.recordset)

    } catch (e) {
        console.error(e)
    } finally {
        process.exit(0)
    }
}

run()
