'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

export interface MSTeamsCalendarEvent {
  id: string
  subject: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: {
    displayName: string
  }
  organizer?: {
    emailAddress: {
      name: string
      address: string
    }
  }
  attendees?: Array<{
    emailAddress: {
      name: string
      address: string
    }
    status?: {
      response: string
    }
  }>
  bodyPreview?: string
  webLink?: string
  isOnlineMeeting?: boolean
  onlineMeetingUrl?: string
  importance?: string
  showAs?: string
  categories?: string[]
}

export interface CalendarSyncResult {
  success: boolean
  events?: MSTeamsCalendarEvent[]
  error?: string
  requiresAuth?: boolean
  authUrl?: string
}

export interface MSTeamsAuthConfig {
  clientId: string
  tenantId: string
  redirectUri: string
  scopes: string[]
}

/**
 * Get Microsoft Teams calendar configuration from system config
 */
export async function getMSTeamsConfig(): Promise<MSTeamsAuthConfig | null> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .query(`
        SELECT config_key, config_value
        FROM pms.system_configs
        WHERE config_key IN (
          'MS_TEAMS_CLIENT_ID',
          'MS_TEAMS_TENANT_ID',
          'MS_TEAMS_REDIRECT_URI'
        )
      `)

    const configMap = new Map(result.recordset.map((r: { config_key: string; config_value: string }) => [r.config_key, r.config_value]))

    const clientId = configMap.get('MS_TEAMS_CLIENT_ID')
    const tenantId = configMap.get('MS_TEAMS_TENANT_ID')
    const redirectUri = configMap.get('MS_TEAMS_REDIRECT_URI')

    if (!clientId || !tenantId) {
      return null
    }

    return {
      clientId,
      tenantId,
      redirectUri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/ms-callback`,
      scopes: ['Calendars.Read', 'Calendars.ReadWrite', 'User.Read']
    }
  } catch (error) {
    console.error('Failed to get MS Teams config:', error)
    return null
  }
}

/**
 * Generate OAuth2 authorization URL for Microsoft
 */
export async function getAuthorizationUrl(): Promise<string | null> {
  const config = await getMSTeamsConfig()
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: config.scopes.join(' '),
    state: crypto.randomUUID()
  })

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

/**
 * Check if user has valid MS Teams token
 */
export async function checkMSTeamsConnection(): Promise<{
  connected: boolean
  expiresAt?: Date
  email?: string
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { connected: false }
  }

  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, user.id)
      .query(`
        SELECT access_token, refresh_token, expires_at, ms_email
        FROM pms.user_ms_tokens
        WHERE employee_id = @employeeId
      `)

    if (result.recordset.length === 0) {
      return { connected: false }
    }

    const token = result.recordset[0]
    const now = new Date()

    // Check if token is expired
    if (new Date(token.expires_at) <= now) {
      // Try to refresh token
      const refreshed = await refreshAccessToken(user.id, token.refresh_token)
      if (!refreshed) {
        return { connected: false }
      }
      return {
        connected: true,
        expiresAt: refreshed.expiresAt,
        email: token.ms_email
      }
    }

    return {
      connected: true,
      expiresAt: token.expires_at,
      email: token.ms_email
    }
  } catch (error) {
    console.error('Failed to check MS Teams connection:', error)
    return { connected: false }
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(
  employeeId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const config = await getMSTeamsConfig()
  if (!config) return null

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: config.scopes.join(' ')
        })
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Update token in database
    const pool = await getConnection()
    await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('accessToken', sql.NVarChar(sql.MAX), data.access_token)
      .input('refreshToken', sql.NVarChar(sql.MAX), data.refresh_token || refreshToken)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        UPDATE pms.user_ms_tokens
        SET
          access_token = @accessToken,
          refresh_token = @refreshToken,
          expires_at = @expiresAt,
          updated_at = GETDATE()
        WHERE employee_id = @employeeId
      `)

    return { accessToken: data.access_token, expiresAt }
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}

/**
 * Get user's access token
 */
async function getUserAccessToken(employeeId: string): Promise<string | null> {
  try {
    const pool = await getConnection()

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT access_token, refresh_token, expires_at
        FROM pms.user_ms_tokens
        WHERE employee_id = @employeeId
      `)

    if (result.recordset.length === 0) return null

    const token = result.recordset[0]
    const now = new Date()

    // Check if token is expired
    if (new Date(token.expires_at) <= now) {
      const refreshed = await refreshAccessToken(employeeId, token.refresh_token)
      return refreshed?.accessToken || null
    }

    return token.access_token
  } catch (error) {
    console.error('Failed to get access token:', error)
    return null
  }
}

/**
 * Fetch calendar events from Microsoft Graph API
 */
export async function fetchMSTeamsCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarSyncResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const accessToken = await getUserAccessToken(user.id)
  if (!accessToken) {
    const authUrl = await getAuthorizationUrl()
    return {
      success: false,
      requiresAuth: true,
      authUrl: authUrl || undefined,
      error: 'MS Teams not connected'
    }
  }

  try {
    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    const response = await fetch(
      `${GRAPH_API_BASE}/me/calendarView?startDateTime=${startISO}&endDateTime=${endISO}&$orderby=start/dateTime&$top=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'outlook.timezone="Asia/Bangkok"'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        const authUrl = await getAuthorizationUrl()
        return {
          success: false,
          requiresAuth: true,
          authUrl: authUrl || undefined,
          error: 'Token expired'
        }
      }
      return { success: false, error: `API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, events: data.value }
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return { success: false, error: 'Failed to fetch events' }
  }
}

/**
 * Create event in MS Teams calendar
 */
export async function createMSTeamsEvent(event: {
  subject: string
  start: Date
  end: Date
  location?: string
  body?: string
  isOnlineMeeting?: boolean
}): Promise<{ success: boolean; event?: MSTeamsCalendarEvent; error?: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const accessToken = await getUserAccessToken(user.id)
  if (!accessToken) {
    return { success: false, error: 'MS Teams not connected' }
  }

  try {
    const response = await fetch(`${GRAPH_API_BASE}/me/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.timezone="Asia/Bangkok"'
      },
      body: JSON.stringify({
        subject: event.subject,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'Asia/Bangkok'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'Asia/Bangkok'
        },
        location: event.location ? { displayName: event.location } : undefined,
        body: event.body ? { contentType: 'text', content: event.body } : undefined,
        isOnlineMeeting: event.isOnlineMeeting
      })
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` }
    }

    const createdEvent = await response.json()
    return { success: true, event: createdEvent }
  } catch (error) {
    console.error('Failed to create event:', error)
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * Disconnect MS Teams
 */
export async function disconnectMSTeams(): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false }
  }

  try {
    const pool = await getConnection()

    await pool.request()
      .input('employeeId', sql.UniqueIdentifier, user.id)
      .query(`
        DELETE FROM pms.user_ms_tokens
        WHERE employee_id = @employeeId
      `)

    return { success: true }
  } catch (error) {
    console.error('Failed to disconnect MS Teams:', error)
    return { success: false }
  }
}
