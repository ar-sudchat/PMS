import { Suspense } from 'react'
import { MyCalendarView } from '@/components/calendar/MyCalendarView'
import { getMyCalendarEvents, getEmployeesForCalendar } from '@/lib/actions/my-calendar-actions'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format
} from 'date-fns'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function CalendarContent() {
  const now = new Date()
  // Get 3 months of data (prev, current, next)
  const start = startOfMonth(subMonths(now, 1))
  const end = endOfMonth(addMonths(now, 1))

  const [data, employees] = await Promise.all([
    getMyCalendarEvents(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    ),
    getEmployeesForCalendar()
  ])

  return (
    <MyCalendarView
      initialData={data}
      initialDate={now}
      employees={employees}
    />
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-slate-500">กำลังโหลดปฏิทิน...</p>
      </div>
    </div>
  )
}

export default function MyCalendarPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<LoadingSpinner />}>
        <CalendarContent />
      </Suspense>
    </div>
  )
}
