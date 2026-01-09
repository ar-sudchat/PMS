// Timesheet utility functions
// These are pure client-side utilities, not server actions

export function getCurrentYearWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1
  const weekNumber = Math.ceil((dayOfYear + jan4.getDay() - 1) / 7)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

export function getWeekDates(yearWeek: string): { start: Date; end: Date; dates: Date[] } {
  const [year, week] = yearWeek.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    dates.push(d)
  }
  return { start: weekStart, end: weekEnd, dates }
}
