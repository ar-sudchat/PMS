
import * as dotenv from 'dotenv'
import path from 'path'
import sql from 'mssql'

// Load env before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') })

if (!process.env.DB_SERVER) {
    console.error('DB_SERVER not found despite dotenv config.')
    // Fallback to define it manually if needed, or exit
}

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

async function inspectSchema() {
    try {
        console.log('Connecting to DB...')
        const pool = await sql.connect(config)
        console.log('Connected.')

        const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'pms'
      AND TABLE_NAME IN ('projects')
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `)

        console.log(JSON.stringify(result.recordset, null, 2))
        process.exit(0)
    } catch (error) {
        console.error('Error inspecting schema:', error)
        process.exit(1)
    }
}

inspectSchema()
