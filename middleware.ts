import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes ที่ไม่ต้อง login
const publicRoutes = ['/login', '/api/auth']

// Routes ที่ต้องเป็น admin (ปิดการจำกัดสิทธิ์ - เปิดทุกโปรแกรมสำหรับทุก user)
// const adminRoutes = ['/admin', '/team/employees']

// Routes ที่ต้องเป็น admin หรือ manager (ปิดการจำกัดสิทธิ์ - เปิดทุกโปรแกรมสำหรับทุก user)
// const managerRoutes = ['/projects/create', '/projects/edit']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Get token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verify token
    const user = await verifyToken(token)

    if (!user) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('auth-token')
        return response
    }

    // Check if must change password
    if (user.mustChangePassword && !pathname.startsWith('/change-password')) {
        return NextResponse.redirect(new URL('/change-password', request.url))
    }

    // เปิดทุกโปรแกรมสำหรับทุก user - ไม่จำกัดสิทธิ์ตาม role

    // Inject user info into headers potentially, or rely on token in cookies for server actions/components
    // Actually, better to just let it pass

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
