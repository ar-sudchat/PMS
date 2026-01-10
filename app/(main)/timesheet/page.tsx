
import { getWeeklyTimesheet } from '@/lib/actions/timesheet-actions'
import { TimesheetView } from '@/components/timesheet/TimesheetView'
import { startOfWeek, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function TimesheetPage() {
  // Determine current week start
  const today = new Date()
  const start = startOfWeek(today, { weekStartsOn: 1 }) // Monday start
  const dateStr = format(start, 'yyyy-MM-dd')

  const data = await getWeeklyTimesheet(dateStr)

  return (
    <div className="h-full">
      <TimesheetView initialData={data} initialWeekStart={dateStr} />
    </div>
  )
}
