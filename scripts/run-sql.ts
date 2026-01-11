
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

async function runSqlFile() {
    try {
        console.log('Connecting to DB...')
        const pool = await sql.connect(config)
        console.log('Connected.')

        const executeFile = async (filename: string) => {
            const sqlPath = path.resolve(process.cwd(), `scripts/${filename}`)
            if (!fs.existsSync(sqlPath)) {
                console.error(`File not found: ${filename}`)
                return
            }
            const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
            console.log(`Executing ${filename}...`)
            await pool.request().query(sqlContent)
            console.log(`Executed ${filename}.`)
        }

        await executeFile('01_schema_update.sql')
        await executeFile('02_mock_data.sql')
        await executeFile('update_thai_names.sql')

        console.log('All Scripts Executed Successfully.')
        process.exit(0)
    } catch (error) {
        console.error('Error running SQL:', error)
        process.exit(1)
    }
}

runSqlFile()
