import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long-security-is-important!'
)

export interface UserSession {
    id: string
    employeeCode: string
    email: string
    name: string
    nameTh: string
    nickname?: string  // Added for dashboard
    role: 'admin' | 'manager' | 'member'
    positionCode?: string
    departmentId?: string
    mustChangePassword: boolean
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 10)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword)
}

// Create JWT token
export async function createToken(user: UserSession): Promise<string> {
    return await new SignJWT({ ...user })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(SECRET_KEY)
}

// Verify JWT token
export async function verifyToken(token: string): Promise<UserSession | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as unknown as UserSession
    } catch {
        return null
    }
}

// Get current user from cookies
export async function getCurrentUser(): Promise<UserSession | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) return null

    return await verifyToken(token)
}

// Set auth cookie
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8 // 8 hours
    })
}

// Clear auth cookie
export async function clearAuthCookie() {
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
}
