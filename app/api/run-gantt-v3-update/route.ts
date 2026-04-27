import { getConnection } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

// Reads a bundled migration script from the project's scripts/ folder.
// file-service.ts is for user-uploaded files in the configurable storage path,
// not for source-controlled assets, so direct fs use is appropriate here.
export async function GET() {
    try {
        const pool = await getConnection()
        const sqlPath = path.join(process.cwd(), 'scripts', 'gantt-schema-v3.sql')
        const sqlContent = await fs.readFile(sqlPath, 'utf8')

        // Split by GO to run in batches if needed, but for SP creation usually we run as a block or split.
        // mssql driver might handle it or fail on GO.
        // Ideally we remove GO or split.
        const batches = sqlContent.split(/^GO\s*$/gm)

        for (const batch of batches) {
            if (batch.trim()) {
                await pool.request().query(batch)
            }
        }

        return NextResponse.json({ success: true, message: 'Gantt V3 Schema updated' })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
