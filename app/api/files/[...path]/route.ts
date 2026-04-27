import { NextRequest, NextResponse } from 'next/server'
import { readFile } from '@/lib/services/file-service'
import { getCurrentUser } from '@/lib/auth'
import path from 'path'

/**
 * GET /api/files/[...path]
 * อ่านไฟล์จาก storage และ stream กลับไปที่ browser
 * ใช้สำหรับ <a href="/api/files/{path}"> ในการดู/ดาวน์โหลดไฟล์
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { path: segments } = await params
        if (!segments || segments.length === 0) {
            return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
        }

        // Decode each segment then rejoin (frontend uses encodeURIComponent on full path)
        const relativePath = segments.map((s) => decodeURIComponent(s)).join('/')

        // Path traversal protection
        const normalized = path.posix.normalize(relativePath)
        if (normalized.startsWith('..') || normalized.includes('../') || path.isAbsolute(normalized)) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
        }

        const result = await readFile(normalized)
        if (!result.success || !result.data) {
            return NextResponse.json(
                { error: result.error || 'ไม่พบไฟล์' },
                { status: 404 }
            )
        }

        const filename = path.basename(normalized)
        const isDownload = request.nextUrl.searchParams.get('download') === '1'
        const disposition = isDownload ? 'attachment' : 'inline'

        // Stored filenames embed a UUID + timestamp (see generateStoredName), so the
        // bytes at a given path are effectively immutable. Allow the browser to
        // cache aggressively to avoid re-streaming on every preview/download.
        return new NextResponse(new Uint8Array(result.data), {
            status: 200,
            headers: {
                'Content-Type': result.mimeType || 'application/octet-stream',
                'Content-Length': String(result.data.length),
                'Content-Disposition': `${disposition}; filename="${encodeURIComponent(filename)}"`,
                'Cache-Control': 'private, max-age=86400, immutable'
            }
        })
    } catch (error: any) {
        console.error('GET /api/files error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to read file' },
            { status: 500 }
        )
    }
}
