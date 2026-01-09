'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getWeeklyTimesheetGrid } from '@/lib/actions/timesheet-actions'
import { getCurrentYearWeek, getWeekDates } from '@/lib/utils/timesheet-utils'
import { TimesheetCell } from './TimesheetCell'
import { TimesheetEntryModal } from './TimesheetEntryModal'
import { cn } from '@/lib/utils'

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeeklyTimesheetGrid() {
  const [yearWeek, setYearWeek] = useState(getCurrentYearWeek())
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [yearWeek])

  const loadData = async () => {
    setIsLoading(true)
    const result = await getWeeklyTimesheetGrid(yearWeek)
    if (result.success) {
      setData(result.data)
    }
    setIsLoading(false)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const [year, week] = yearWeek.split('-W').map(Number)
    let newWeek = week + (direction === 'next' ? 1 : -1)
    let newYear = year

    if (newWeek < 1) {
      newYear--
      newWeek = 52
    } else if (newWeek > 52) {
      newYear++
      newWeek = 1
    }

    setYearWeek(`${newYear}-W${String(newWeek).padStart(2, '0')}`)
  }

  const weekDates = data ? getWeekDates(yearWeek) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Timesheet</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {weekDates && (
                <>
                  {weekDates.start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  {' - '}
                  {weekDates.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </>
              )}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0])
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : data && data.employees.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 sticky left-0 bg-slate-50">
                    Name
                  </th>
                  {data.dates.map((date: string, idx: number) => (
                    <th key={date} className="px-2 py-3 text-center text-sm font-medium text-slate-600 min-w-[140px]">
                      <div>{dayNames[idx]}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(date).getDate()}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp: any) => (
                  <tr key={emp.employee_id} className="border-b hover:bg-slate-50/50">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <div className="font-medium text-sm">{emp.employee_name}</div>
                      {emp.nickname && (
                        <div className="text-xs text-slate-500">{emp.nickname}</div>
                      )}
                    </td>
                    {data.dates.map((date: string) => (
                      <td key={date} className="px-1 py-1 align-top">
                        <TimesheetCell
                          entries={emp.entries[date] || []}
                          totalHours={emp.daily_totals[date] || 0}
                          date={date}
                          employeeId={emp.employee_id}
                          onAddClick={() => {
                            setSelectedDate(date)
                            setIsModalOpen(true)
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        "text-sm font-medium",
                        emp.total_hours >= 40 ? "text-green-600" : "text-slate-600"
                      )}>
                        {emp.total_hours}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
          No timesheet data for this week. Click "Add Entry" to get started!
        </div>
      )}

      <div className="flex items-center gap-6 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500"></span>
          🔧 Dev
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          🐛 Bug
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500"></span>
          🔄 Rework
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500"></span>
          📄 Doc
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          🧪 Test
        </span>
      </div>

      <TimesheetEntryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate || new Date().toISOString().split('T')[0]}
        onSuccess={loadData}
      />
    </div>
  )
}
