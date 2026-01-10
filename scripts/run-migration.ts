
import sql from 'mssql'
import fs from 'fs'
import path from 'path'
// import dotenv from 'dotenv'

// Load environment variables from .env.local manually
try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^['"]|['"]$/g, '') // remove quotes
            process.env[key] = value
        }
    })
} catch (e) {
    console.warn("Could not read .env.local")
}

if (!process.env.DB_SERVER) {
    console.error("DB_SERVER is missing in .env.local")
    process.exit(1)
}

const config: sql.config = {
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
    try {
        console.log('Connecting to database...')
        const pool = await sql.connect(config)
        console.log('Connected.')

        const sqlPath = path.join(process.cwd(), 'scripts', 'project-detail-table-views.sql')
        const sqlContent = fs.readFileSync(sqlPath, 'utf8')

        // Split by GO
        const batches = sqlContent.split(/^GO\s*$/gmi) // Regex for GO on its own line

        for (const batch of batches) {
            const query = batch.trim()
            if (query) {
                console.log('Executing batch...')
                try {
                    await pool.request().query(query)
                } catch (e: any) {
                    console.error('Error executing batch:', e.message)
                    // Continue or throw? Continue for now as some might fail if exists (though I added checks)
                }
            }
        }

        console.log('Migration completed.')
        await pool.close()

    } catch (err) {
        console.error('Migration failed:', err)
        process.exit(1)
    }
}

runMigration()
