
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

        // Check columns
        const schema = await sql.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'task_type_configs' AND TABLE_SCHEMA = 'pms'
        `)
        console.log("Columns:", schema.recordset.map(r => r.COLUMN_NAME))

        // Check data
        const data = await sql.query(`SELECT * FROM pms.task_type_configs`)
        console.log("Rows:", data.recordset)

    } catch (e) {
        console.error(e)
    } finally {
        process.exit(0)
    }
}

run()
