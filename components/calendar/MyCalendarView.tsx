'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Filter,
  Link2,
  LinkIcon,
  Check,
  ExternalLink,
  RefreshCw,
  Clock,
  Target,
  CalendarDays,
  Video,
  Loader2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card'
import type { PMSCalendarEvent, CalendarData, EmployeeOption } from '@/lib/actions/my-calendar-actions'

type ViewMode = 'month' | 'week' | 'agenda'

interface MyCalendarViewProps {
  initialData: CalendarData
  initialDate?: Date
  employees: EmployeeOption[]
}

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  task: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  meeting: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  milestone: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  deadline: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  leave: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  ms_teams: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' }
}

export function MyCalendarView({ initialData, initialDate, employees }: MyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedEvent, setSelectedEvent] = useState<PMSCalendarEvent | null>(null)
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [data, setData] = useState<CalendarData>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialData.currentEmployeeId || ''
  )

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterTypes.length === 0) return data.events
    return data.events.filter(e => filterTypes.includes(e.type))
  }, [data.events, filterTypes])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start)
      return isSameDay(eventDate, day)
    })
  }

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Refresh data
  const handleRefresh = async (employeeId?: string) => {
    setIsLoading(true)
    try {
      const { getMyCalendarEvents } = await import('@/lib/actions/my-calendar-actions')
      const start = startOfMonth(subMonths(currentDate, 1))
      const end = endOfMonth(addMonths(currentDate, 1))
      const newData = await getMyCalendarEvents(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0],
        true,
        employeeId || selectedEmployeeId
      )
      setData(newData)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle employee change
  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    await handleRefresh(employeeId)
  }

  // Get selected employee name
  const selectedEmployeeName = useMemo(() => {
    const emp = employees.find(e => e.id === selectedEmployeeId)
    return emp?.name || data.currentEmployeeName || 'ฉัน'
  }, [selectedEmployeeId, employees, data.currentEmployeeName])

  // Toggle filter
  const toggleFilter = (type: string) => {
    setFilterTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Generate month calendar grid
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = calendarStart
    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate])

  // Generate week days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [currentDate])

  // Event type counts for filter badges
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    data.events.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1
    })
    return counts
  }, [data.events])

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 rounded-2xl mx-6 mt-6 p-6 shadow-lg shadow-teal-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Calendar</h1>
              <p className="text-teal-100 text-sm">
                ปฏิทินของ {selectedEmployeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Employee Selector */}
            <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className="w-[220px] bg-white/20 border-white/30 text-white">
                <SelectValue placeholder="เลือกพนักงาน" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* MS Teams Status */}
            {data.msTeamsConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Video className="w-4 h-4 text-white" />
                <span className="text-sm text-white">MS Teams Connected</span>
                <Check className="w-4 h-4 text-green-300" />
              </div>
            ) : data.msTeamsAuthUrl ? (
              <div className="flex items-center gap-2">
                <a
                  href={data.msTeamsAuthUrl}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <LinkIcon className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">เชื่อมต่อ MS Teams</span>
                </a>
                {/* Info Icon with Connection Instructions */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      <Info className="w-4 h-4 text-white" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" side="bottom" align="end">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">วิธีการเชื่อมต่อ MS Teams Calendar</h4>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <p className="font-medium text-foreground">ขั้นตอนสำหรับ Admin:</p>
                        <ol className="list-decimal list-inside space-y-1.5 pl-1">
                          <li>สร้าง Azure App Registration ที่ <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Azure Portal</a></li>
                          <li>เพิ่ม API Permissions: <code className="bg-slate-100 px-1 rounded">Calendars.Read</code>, <code className="bg-slate-100 px-1 rounded">User.Read</code></li>
                          <li>สร้าง Client Secret</li>
                          <li>ไปที่ Settings &gt; MS Teams แล้วกรอก:
                            <ul className="list-disc list-inside ml-3 mt-1 text-[11px]">
                              <li>Client ID</li>
                              <li>Tenant ID</li>
                              <li>Client Secret</li>
                            </ul>
                          </li>
                        </ol>
                        <p className="font-medium text-foreground pt-2">ขั้นตอนสำหรับผู้ใช้:</p>
                        <ol className="list-decimal list-inside space-y-1.5 pl-1">
                          <li>คลิกปุ่ม &quot;เชื่อมต่อ MS Teams&quot;</li>
                          <li>Login ด้วยบัญชี Microsoft ขององค์กร</li>
                          <li>อนุญาตให้ระบบเข้าถึง Calendar</li>
                        </ol>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            ) : (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors">
                    <Video className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60">MS Teams ยังไม่ได้ตั้งค่า</span>
                    <Info className="w-4 h-4 text-white/60" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80" side="bottom" align="end">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">ต้องตั้งค่า MS Teams ก่อน</h4>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>กรุณาติดต่อ Admin เพื่อตั้งค่า MS Teams Integration:</p>
                      <ol className="list-decimal list-inside space-y-1.5 pl-1">
                        <li>สร้าง Azure App Registration</li>
                        <li>ตั้งค่า Client ID, Tenant ID, Secret</li>
                        <li>บันทึกใน Settings &gt; MS Teams</li>
                      </ol>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => handleRefresh()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <SummaryCard
            icon={CalendarDays}
            label="วันนี้"
            value={getEventsForDay(new Date()).length}
            suffix="events"
          />
          <SummaryCard
            icon={Target}
            label="Deadline 7 วัน"
            value={filteredEvents.filter(e => e.type === 'deadline').length}
            suffix="งาน"
          />
          <SummaryCard
            icon={Video}
            label="Meeting"
            value={filteredEvents.filter(e => e.type === 'meeting' || e.type === 'ms_teams').length}
            suffix="นัดหมาย"
          />
          <SummaryCard
            icon={Target}
            label="Milestones"
            value={filteredEvents.filter(e => e.type === 'milestone').length}
            suffix="รายการ"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white mt-4 mx-6 rounded-t-xl">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="h-8 px-3 text-sm font-medium" onClick={handleToday}>
              วันนี้
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: th })
              : `${format(weekDays[0], 'd MMM')} - ${format(weekDays[6], 'd MMM yyyy')}`
            }
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {Object.entries(EVENT_COLORS).map(([type, colors]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-all",
                  filterTypes.length === 0 || filterTypes.includes(type)
                    ? `${colors.bg} ${colors.text}`
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {type === 'ms_teams' ? 'Teams' : type}
                {eventTypeCounts[type] ? ` (${eventTypeCounts[type]})` : ''}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === 'month' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === 'week' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === 'agenda' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto mx-6 mb-6 bg-white rounded-b-xl shadow-sm">
        {viewMode === 'month' && (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            getEventsForDay={getEventsForDay}
            onSelectEvent={setSelectedEvent}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            days={weekDays}
            getEventsForDay={getEventsForDay}
            onSelectEvent={setSelectedEvent}
          />
        )}
        {viewMode === 'agenda' && (
          <AgendaView
            events={filteredEvents}
            currentDate={currentDate}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix
}: {
  icon: React.ElementType
  label: string
  value: number
  suffix: string
}) {
  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-white/80" />
        <div>
          <p className="text-sm text-teal-100">{label}</p>
          <p className="text-xl font-bold text-white">
            {value} <span className="text-sm font-normal text-teal-200">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function MonthView({
  days,
  currentDate,
  getEventsForDay,
  onSelectEvent
}: {
  days: Date[]
  currentDate: Date
  getEventsForDay: (day: Date) => PMSCalendarEvent[]
  onSelectEvent: (event: PMSCalendarEvent) => void
}) {
  const weekDayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์']

  return (
    <div className="h-full flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDayNames.map(name => (
          <div key={name} className="px-2 py-3 text-center text-sm font-medium text-slate-500">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[120px] border-b border-r border-slate-100 p-1",
                !isCurrentMonth && "bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isCurrentDay && "bg-teal-600 text-white",
                    !isCurrentDay && !isCurrentMonth && "text-slate-400",
                    !isCurrentDay && isCurrentMonth && "text-slate-700"
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-xs text-slate-400">+{dayEvents.length - 3}</span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(event => {
                  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.task
                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-xs truncate",
                        colors.bg, colors.text,
                        "hover:opacity-80 transition-opacity"
                      )}
                    >
                      {event.title}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  days,
  getEventsForDay,
  onSelectEvent
}: {
  days: Date[]
  getEventsForDay: (day: Date) => PMSCalendarEvent[]
  onSelectEvent: (event: PMSCalendarEvent) => void
}) {
  const hours = Array.from({ length: 24 }).map((_, i) => i)

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="p-2" />
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center border-l border-slate-100",
                isToday(day) && "bg-teal-50"
              )}
            >
              <div className="text-xs text-slate-400">
                {format(day, 'EEE', { locale: th })}
              </div>
              <div className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-teal-600" : "text-slate-700"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
          <div className="p-2 text-xs text-slate-400">ทั้งวัน</div>
          {days.map(day => {
            const allDayEvents = getEventsForDay(day).filter(e => e.allDay)
            return (
              <div key={day.toISOString()} className="p-1 border-l border-slate-100 min-h-[40px]">
                {allDayEvents.map(event => {
                  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.task
                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-xs truncate mb-0.5",
                        colors.bg, colors.text
                      )}
                    >
                      {event.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] h-12 border-b border-slate-50">
              <div className="p-1 text-xs text-slate-400 text-right pr-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map(day => {
                const hourEvents = getEventsForDay(day).filter(e => {
                  if (e.allDay) return false
                  const eventHour = new Date(e.start).getHours()
                  return eventHour === hour
                })
                return (
                  <div key={day.toISOString()} className="border-l border-slate-100 relative">
                    {hourEvents.map(event => {
                      const colors = EVENT_COLORS[event.type] || EVENT_COLORS.task
                      return (
                        <button
                          key={event.id}
                          onClick={() => onSelectEvent(event)}
                          className={cn(
                            "absolute inset-x-1 px-1 py-0.5 rounded text-xs truncate z-10",
                            colors.bg, colors.text
                          )}
                          style={{ top: 2 }}
                        >
                          {format(new Date(event.start), 'HH:mm')} {event.title}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgendaView({
  events,
  currentDate,
  onSelectEvent
}: {
  events: PMSCalendarEvent[]
  currentDate: Date
  onSelectEvent: (event: PMSCalendarEvent) => void
}) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, PMSCalendarEvent[]> = {}
    events.forEach(event => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  return (
    <div className="p-4 space-y-4">
      {groupedEvents.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          ไม่มีกิจกรรมในช่วงเวลานี้
        </div>
      ) : (
        groupedEvents.map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey)
          return (
            <div key={dateKey} className="bg-slate-50 rounded-lg p-4">
              <h3 className={cn(
                "font-semibold mb-3",
                isToday(date) ? "text-teal-600" : "text-slate-700"
              )}>
                {isToday(date) ? 'วันนี้ - ' : ''}
                {format(date, 'EEEE d MMMM yyyy', { locale: th })}
              </h3>

              <div className="space-y-2">
                {dayEvents.map(event => {
                  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.task
                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all hover:shadow-md",
                        colors.bg, colors.border
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={cn("font-medium", colors.text)}>
                            {event.title}
                          </div>
                          {event.projectName && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {event.projectCode} - {event.projectName}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {event.allDay
                            ? 'ทั้งวัน'
                            : format(new Date(event.start), 'HH:mm')
                          }
                          {event.end && !event.allDay && (
                            <span> - {format(new Date(event.end), 'HH:mm')}</span>
                          )}
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function EventDetailModal({
  event,
  onClose
}: {
  event: PMSCalendarEvent
  onClose: () => void
}) {
  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.task

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className={cn("px-6 py-4", colors.bg)}>
          <h3 className={cn("text-lg font-semibold", colors.text)}>{event.title}</h3>
          <p className="text-sm text-slate-600 mt-1">
            {format(new Date(event.start), 'EEEE d MMMM yyyy', { locale: th })}
            {!event.allDay && (
              <span className="ml-2">
                {format(new Date(event.start), 'HH:mm')}
                {event.end && ` - ${format(new Date(event.end), 'HH:mm')}`}
              </span>
            )}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {event.projectName && (
            <div>
              <label className="text-xs text-slate-500">โครงการ</label>
              <p className="text-sm font-medium text-slate-700">
                {event.projectCode} - {event.projectName}
              </p>
            </div>
          )}

          {event.location && (
            <div>
              <label className="text-xs text-slate-500">สถานที่</label>
              <p className="text-sm text-slate-700">{event.location}</p>
            </div>
          )}

          {event.description && (
            <div>
              <label className="text-xs text-slate-500">รายละเอียด</label>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {event.webLink && (
            <a
              href={event.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
            >
              <ExternalLink className="w-4 h-4" />
              เปิดใน MS Teams
            </a>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </div>
  )
}
