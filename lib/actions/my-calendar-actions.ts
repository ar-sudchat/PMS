'use server'

import sql from 'mssql'
import { getConnection } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  fetchMSTeamsCalendarEvents,
  checkMSTeamsConnection,
  getAuthorizationUrl,
  disconnectMSTeams,
  type MSTeamsCalendarEvent
} from '@/lib/services/ms-teams-calendar-service'

// Calendar event from PMS system
export interface PMSCalendarEvent {
  id: string
  type: 'task' | 'meeting' | 'milestone' | 'deadline' | 'leave' | 'ms_teams'
  title: string
  description?: string
  start: Date
  end?: Date
  allDay?: boolean
  projectId?: string
  projectCode?: string
  projectName?: string
  taskId?: string
  taskCode?: string
  color?: string
  isRecurring?: boolean
  location?: string
  webLink?: string
  importance?: 'high' | 'normal' | 'low'
}

export interface CalendarData {
  events: PMSCalendarEvent[]
  msTeamsConnected: boolean
  msTeamsAuthUrl?: string
  currentEmployeeId?: string
  currentEmployeeName?: string
}

export interface EmployeeOption {
  id: string
  name: string
  employeeCode: string
  positionName?: string
}

/**
 * Get list of employees for selector
 */
export async function getEmployeesForCalendar(): Promise<EmployeeOption[]> {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  try {
    const pool = await getConnection()

    const result = await pool.request()
      .query(`
        SELECT
          e.id,
          e.employee_code,
          COALESCE(
            NULLIF(e.first_name_th, '') + ' ' + NULLIF(e.last_name_th, ''),
            NULLIF(e.first_name, '') + ' ' + NULLIF(e.last_name, ''),
            e.nickname,
            e.employee_code
          ) as full_name,
          p.name as position_name
        FROM pms.employees e
        LEFT JOIN pms.positions p ON e.position_id = p.id
        WHERE e.is_active = 1
        ORDER BY e.first_name_th, e.first_name, e.nickname
      `)

    return result.recordset.map(r => ({
      id: r.id,
      name: r.full_name,
      employeeCode: r.employee_code,
      positionName: r.position_name
    }))
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}

/**
 * Get all calendar events for a date range
 */
export async function getMyCalendarEvents(
  startDate: string,
  endDate: string,
  includeMSTeams: boolean = true,
  targetEmployeeId?: string
): Promise<CalendarData> {
  const user = await getCurrentUser()
  if (!user) {
    return { events: [], msTeamsConnected: false }
  }

  const pool = await getConnection()
  // Use target employee if specified, otherwise use logged-in user
  const employeeId = targetEmployeeId || user.id
  const isOwnCalendar = employeeId === user.id

  // Get employee name
  let employeeName = user.nameTh || user.name
  if (!isOwnCalendar) {
    const empResult = await pool.request()
      .input('empId', sql.UniqueIdentifier, employeeId)
      .query(`
        SELECT COALESCE(
          NULLIF(first_name_th, '') + ' ' + NULLIF(last_name_th, ''),
          NULLIF(first_name, '') + ' ' + NULLIF(last_name, ''),
          nickname,
          employee_code
        ) as full_name
        FROM pms.employees WHERE id = @empId
      `)
    if (empResult.recordset.length > 0) {
      employeeName = empResult.recordset[0].full_name
    }
  }
  const events: PMSCalendarEvent[] = []

  try {
    // 1. Get tasks with deadlines
    const tasksResult = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT
          t.id as task_id,
          t.task_code,
          t.title,
          t.description,
          t.due_date,
          t.start_date,
          p.id as project_id,
          p.project_code,
          p.name as project_name,
          t.status as status_name
        FROM pms.tasks t
        JOIN pms.stories s ON t.story_id = s.id
        JOIN pms.projects p ON s.project_id = p.id
        WHERE t.assignee_id = @employeeId
        AND t.status NOT IN ('done', 'done_not_planned', 'cancelled')
        AND t.is_active = 1
        AND (
          (t.due_date >= @startDate AND t.due_date <= @endDate)
          OR (t.start_date >= @startDate AND t.start_date <= @endDate)
        )
        ORDER BY t.due_date
      `)

    for (const task of tasksResult.recordset) {
      if (task.due_date) {
        events.push({
          id: `task-deadline-${task.task_id}`,
          type: 'deadline',
          title: `📌 ${task.task_code}: ${task.title}`,
          description: task.description || undefined,
          start: task.due_date,
          allDay: true,
          projectId: task.project_id,
          projectCode: task.project_code,
          projectName: task.project_name,
          taskId: task.task_id,
          taskCode: task.task_code,
          color: '#ef4444',
          importance: 'high'
        })
      }
    }

    // 2. Get project milestones (try-catch separately to avoid blocking other queries)
    try {
      const milestonesResult = await pool.request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate)
        .query(`
          SELECT
            pm.id,
            pm.milestone_name as name,
            pm.target_date,
            p.id as project_id,
            p.project_code,
            p.name as project_name,
            pm.is_completed
          FROM pms.project_milestones pm
          JOIN pms.projects p ON pm.project_id = p.id
          LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
          JOIN pms.project_members pmem ON p.id = pmem.project_id
          WHERE pmem.employee_id = @employeeId
          AND pm.is_completed = 0
          AND (ps.code IS NULL OR ps.code <> 'cancelled')
          AND pm.target_date >= @startDate
          AND pm.target_date <= @endDate
          ORDER BY pm.target_date
          `)

      for (const milestone of milestonesResult.recordset) {
        events.push({
          id: `milestone-${milestone.id}`,
          type: 'milestone',
          title: `🎯 ${milestone.name}`,
          start: milestone.target_date,
          allDay: true,
          projectId: milestone.project_id,
          projectCode: milestone.project_code,
          projectName: milestone.project_name,
          color: '#8b5cf6',
          importance: 'high'
        })
      }
    } catch (milestoneError) {
      // Milestones table may not exist or have different schema - skip silently
      console.log('Milestones query skipped:', (milestoneError as Error).message)
    }

    // 3. Get meetings from meeting_minutes where user is organizer or attendee
    // Note: meeting_date is DATETIME2 (includes time), meeting_end_time is end datetime
    const meetingsResult = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT
          m.id,
          m.meeting_title,
          m.meeting_date,
          m.meeting_end_time,
          p.id as project_id,
          p.project_code,
          p.name as project_name
        FROM pms.meeting_minutes_records m
        LEFT JOIN pms.projects p ON m.project_id = p.id
        LEFT JOIN pms.project_status_configs ps ON p.status_id = ps.id
        WHERE m.organized_by = @employeeId
        AND CAST(m.meeting_date AS DATE) >= @startDate
        AND CAST(m.meeting_date AS DATE) <= @endDate
        AND (p.id IS NULL OR ps.code IS NULL OR ps.code <> 'cancelled')
        ORDER BY m.meeting_date
      `)

    for (const meeting of meetingsResult.recordset) {
      // meeting_date is DATETIME2 with both date and time
      const start = new Date(meeting.meeting_date)
      const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0

      let end: Date | undefined
      if (meeting.meeting_end_time) {
        end = new Date(meeting.meeting_end_time)
      }

      events.push({
        id: `meeting - ${meeting.id}`,
        type: 'meeting',
        title: `📅 ${meeting.meeting_title}`,
        start,
        end,
        allDay: !hasTime,
        projectId: meeting.project_id,
        projectCode: meeting.project_code,
        projectName: meeting.project_name,
        color: '#3b82f6',
      })
    }

    // 4. Get timesheet entries for reference
    const timesheetResult = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT
          te.entry_date,
          te.hours,
          t.task_code,
          t.title as task_title,
          p.project_code
        FROM pms.timesheet_entries te
        JOIN pms.tasks t ON te.task_id = t.id
        JOIN pms.stories s ON t.story_id = s.id
        JOIN pms.projects p ON s.project_id = p.id
        WHERE te.employee_id = @employeeId
        AND te.entry_date >= @startDate
        AND te.entry_date <= @endDate
        AND te.is_active = 1
        ORDER BY te.entry_date
          `)

    // Group timesheet by date
    const timesheetByDate = new Map<string, { hours: number; tasks: string[] }>()
    for (const entry of timesheetResult.recordset) {
      const dateKey = entry.entry_date.toISOString().split('T')[0]
      if (!timesheetByDate.has(dateKey)) {
        timesheetByDate.set(dateKey, { hours: 0, tasks: [] })
      }
      const data = timesheetByDate.get(dateKey)!
      data.hours += entry.hours
      data.tasks.push(`${entry.task_code}: ${entry.hours}h`)
    }

    for (const [dateKey, data] of timesheetByDate) {
      events.push({
        id: `timesheet - ${dateKey}`,
        type: 'task',
        title: `⏱️ ทำงาน ${data.hours}h`,
        description: data.tasks.join('\n'),
        start: new Date(dateKey),
        allDay: true,
        color: '#10b981',
        importance: 'low'
      })
    }

  } catch (error) {
    console.error('Error fetching calendar events:', error)
  }

  // 5. Check MS Teams connection and fetch events
  let msTeamsConnected = false
  let msTeamsAuthUrl: string | undefined

  if (includeMSTeams) {
    try {
      const msConnection = await checkMSTeamsConnection()
      msTeamsConnected = msConnection.connected

      if (msTeamsConnected) {
        const msResult = await fetchMSTeamsCalendarEvents(
          new Date(startDate),
          new Date(endDate)
        )

        if (msResult.success && msResult.events) {
          for (const msEvent of msResult.events) {
            events.push(convertMSTeamsEvent(msEvent))
          }
        } else if (msResult.requiresAuth && msResult.authUrl) {
          msTeamsAuthUrl = msResult.authUrl
          msTeamsConnected = false
        }
      } else {
        const authUrl = await getAuthorizationUrl()
        msTeamsAuthUrl = authUrl || undefined
      }
    } catch (error) {
      console.error('MS Teams sync error:', error)
    }
  }

  // Sort events by start date
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return {
    events,
    msTeamsConnected,
    msTeamsAuthUrl,
    currentEmployeeId: employeeId,
    currentEmployeeName: employeeName
  }
}

/**
 * Convert MS Teams event to PMS format
 */
function convertMSTeamsEvent(msEvent: MSTeamsCalendarEvent): PMSCalendarEvent {
  const isAllDay = msEvent.start.dateTime.includes('T00:00:00')

  return {
    id: `ms - teams - ${msEvent.id}`,
    type: 'ms_teams',
    title: `📞 ${msEvent.subject}`,
    description: msEvent.bodyPreview,
    start: new Date(msEvent.start.dateTime),
    end: new Date(msEvent.end.dateTime),
    allDay: isAllDay,
    color: msEvent.isOnlineMeeting ? '#7c3aed' : '#6366f1',
    location: msEvent.location?.displayName,
    webLink: msEvent.onlineMeetingUrl || msEvent.webLink,
    importance: msEvent.importance === 'high' ? 'high' : 'normal'
  }
}

/**
 * Get MS Teams connection status
 */
export async function getMSTeamsStatus(): Promise<{
  connected: boolean
  email?: string
  expiresAt?: Date
  authUrl?: string
}> {
  const connection = await checkMSTeamsConnection()

  if (!connection.connected) {
    const authUrl = await getAuthorizationUrl()
    return { connected: false, authUrl: authUrl || undefined }
  }

  return {
    connected: true,
    email: connection.email,
    expiresAt: connection.expiresAt
  }
}

/**
 * Disconnect from MS Teams
 */
export async function disconnectFromMSTeams(): Promise<{ success: boolean }> {
  const result = await disconnectMSTeams()
  if (result.success) {
    revalidatePath('/my-calendar')
  }
  return result
}

/**
 * Get calendar summary for dashboard widgets
 */
export async function getCalendarSummary(): Promise<{
  todayEvents: number
  upcomingDeadlines: number
  thisWeekMeetings: number
  pendingTasks: number
}> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      todayEvents: 0,
      upcomingDeadlines: 0,
      thisWeekMeetings: 0,
      pendingTasks: 0
    }
  }

  const pool = await getConnection()
  const employeeId = user.id

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const dayOfWeek = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const next7Days = new Date(today)
  next7Days.setDate(today.getDate() + 7)

  try {
    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('todayStr', sql.Date, todayStr)
      .input('weekStartStr', sql.Date, weekStart.toISOString().split('T')[0])
      .input('weekEndStr', sql.Date, weekEnd.toISOString().split('T')[0])
      .input('next7DaysStr', sql.Date, next7Days.toISOString().split('T')[0])
      .query(`
        --Today's meetings
        SELECT
            (SELECT COUNT(*) FROM pms.meeting_minutes_records m
           WHERE m.organized_by = @employeeId
           AND CAST(m.meeting_date AS DATE) = @todayStr) as today_events,

          --Upcoming deadlines
            (SELECT COUNT(*) FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
           AND t.status NOT IN('done', 'done_not_planned', 'cancelled')
           AND t.is_active = 1
           AND t.due_date >= @todayStr
           AND t.due_date <= @next7DaysStr) as upcoming_deadlines,

          --This week meetings
            (SELECT COUNT(*) FROM pms.meeting_minutes_records m
           WHERE m.organized_by = @employeeId
           AND m.meeting_date >= @weekStartStr
           AND m.meeting_date <= @weekEndStr) as this_week_meetings,

          --Pending tasks
            (SELECT COUNT(*) FROM pms.tasks t
           WHERE t.assignee_id = @employeeId
           AND t.status NOT IN('done', 'done_not_planned', 'cancelled')
           AND t.is_active = 1) as pending_tasks
      `)

    const row = result.recordset[0]
    return {
      todayEvents: row?.today_events || 0,
      upcomingDeadlines: row?.upcoming_deadlines || 0,
      thisWeekMeetings: row?.this_week_meetings || 0,
      pendingTasks: row?.pending_tasks || 0
    }
  } catch (error) {
    console.error('Error getting calendar summary:', error)
    return {
      todayEvents: 0,
      upcomingDeadlines: 0,
      thisWeekMeetings: 0,
      pendingTasks: 0
    }
  }
}
