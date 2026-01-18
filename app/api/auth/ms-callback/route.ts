import { NextRequest, NextResponse } from 'next/server'
import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long-security-is-important!'
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle error from Microsoft
  if (error) {
    console.error('MS OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/my-calendar?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/my-calendar?error=No+authorization+code', request.url)
    )
  }

  try {
    // Get user from session
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=Not+authenticated', request.url)
      )
    }

    const { payload } = await jwtVerify(token, SECRET_KEY)
    const employeeId = (payload as { id?: string; employeeId?: string }).id || (payload as { employeeId?: string }).employeeId
    if (!employeeId) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+token', request.url)
      )
    }

    // Get MS Teams configuration
    const pool = await getConnection()

    const configResult = await pool.request()
      .query(`
        SELECT config_key, config_value
        FROM pms.system_configs
        WHERE config_key IN (
          'MS_TEAMS_CLIENT_ID',
          'MS_TEAMS_TENANT_ID',
          'MS_TEAMS_CLIENT_SECRET',
          'MS_TEAMS_REDIRECT_URI'
        )
      `)

    const config = new Map(configResult.recordset.map((r: { config_key: string; config_value: string }) => [r.config_key, r.config_value]))
    const clientId = config.get('MS_TEAMS_CLIENT_ID')
    const tenantId = config.get('MS_TEAMS_TENANT_ID')
    const clientSecret = config.get('MS_TEAMS_CLIENT_SECRET')
    const redirectUri = config.get('MS_TEAMS_REDIRECT_URI') ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/ms-callback`

    if (!clientId || !tenantId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/my-calendar?error=MS+Teams+not+configured', request.url)
      )
    }

    // Exchange code for token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'Calendars.Read Calendars.ReadWrite User.Read offline_access'
        })
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL(`/my-calendar?error=${encodeURIComponent(errorData.error_description || 'Token exchange failed')}`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Get user info from Microsoft
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    let msEmail = null
    let msUserId = null

    if (userResponse.ok) {
      const userData = await userResponse.json()
      msEmail = userData.mail || userData.userPrincipalName
      msUserId = userData.id
    }

    // Save token to database (upsert using MERGE)
    await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('accessToken', sql.NVarChar(sql.MAX), tokenData.access_token)
      .input('refreshToken', sql.NVarChar(sql.MAX), tokenData.refresh_token)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('msEmail', sql.NVarChar(255), msEmail)
      .input('msUserId', sql.NVarChar(255), msUserId)
      .query(`
        MERGE pms.user_ms_tokens AS target
        USING (SELECT @employeeId AS employee_id) AS source
        ON target.employee_id = source.employee_id
        WHEN MATCHED THEN
          UPDATE SET
            access_token = @accessToken,
            refresh_token = @refreshToken,
            expires_at = @expiresAt,
            ms_email = @msEmail,
            ms_user_id = @msUserId,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (employee_id, access_token, refresh_token, expires_at, ms_email, ms_user_id)
          VALUES (@employeeId, @accessToken, @refreshToken, @expiresAt, @msEmail, @msUserId);
      `)

    // Redirect back to calendar
    return NextResponse.redirect(
      new URL('/my-calendar?connected=true', request.url)
    )
  } catch (error) {
    console.error('MS OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/my-calendar?error=Authentication+failed', request.url)
    )
  }
}
