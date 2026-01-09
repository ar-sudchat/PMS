import { getConnection } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const pool = await getConnection()
        const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pms' 
        AND TABLE_NAME IN ('projects', 'stories', 'tasks', 'project_milestones')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `)
        return NextResponse.json({ success: true, data: result.recordset })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
