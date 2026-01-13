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

async function runMigration() {
    const filename = process.argv[2]
    if (!filename) {
        console.error('Usage: npx ts-node scripts/run-migration.ts <filename>')
        console.error('Example: npx ts-node scripts/run-migration.ts database/migrations/001_fix_gantt_null_dates.sql')
        process.exit(1)
    }

    try {
        console.log(`[Migration] Connecting to ${config.database}@${config.server}...`)
        const pool = await sql.connect(config)
        console.log('[Migration] Connected.')

        const sqlPath = path.resolve(process.cwd(), filename)
        if (!fs.existsSync(sqlPath)) {
            console.error(`[Migration] File not found: ${filename}`)
            process.exit(1)
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

        // Split by GO statements for SQL Server
        const batches = sqlContent.split(/^GO$/gmi).filter(b => b.trim())

        console.log(`[Migration] Executing ${batches.length} batch(es)...`)

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim()
            if (batch) {
                try {
                    await pool.request().query(batch)
                    console.log(`[Migration] Batch ${i + 1}/${batches.length} ✓`)
                } catch (err: any) {
                    console.error(`[Migration] Batch ${i + 1} failed:`, err.message)
                    throw err
                }
            }
        }

        console.log(`[Migration] ✅ ${filename} executed successfully!`)
        process.exit(0)
    } catch (error: any) {
        console.error('[Migration] Error:', error.message)
        process.exit(1)
    }
}

runMigration()
