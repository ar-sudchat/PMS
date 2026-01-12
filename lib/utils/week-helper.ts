import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear } from 'date-fns'
import { th } from 'date-fns/locale'

export interface WeekOption {
    value: string           // "2026-W02"
    label: string           // "W2: 6 ม.ค. - 12 ม.ค. 2569"
    week_start_date: string // "2026-01-06"
    week_end_date: string   // "2026-01-12"
    year: number
    week_number: number
}

// Generate weeks for a given year
export function getWeeksOfYear(year: number): WeekOption[] {
    const weeks: WeekOption[] = []

    // Start from first Monday of the year
    let date = new Date(year, 0, 1)

    // Find first Monday
    while (date.getDay() !== 1) {
        date.setDate(date.getDate() + 1)
    }

    let weekNum = 1

    while (weekNum <= 53) {
        const weekStart = new Date(date)
        const weekEnd = new Date(date)
        weekEnd.setDate(weekEnd.getDate() + 6)

        // Stop if week start is in next year
        if (weekStart.getFullYear() > year && weekNum > 1) break

        weeks.push({
            value: `${year}-W${weekNum.toString().padStart(2, '0')}`,
            label: `W${weekNum}: ${format(weekStart, 'd MMM', { locale: th })} - ${format(weekEnd, 'd MMM yyyy', { locale: th })}`,
            week_start_date: format(weekStart, 'yyyy-MM-dd'),
            week_end_date: format(weekEnd, 'yyyy-MM-dd'),
            year,
            week_number: weekNum
        })

        date.setDate(date.getDate() + 7)
        weekNum++
    }

    return weeks
}

// Get current week info
export function getCurrentWeek(): WeekOption {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const year = getYear(weekStart)
    const weekNum = getWeek(weekStart, { weekStartsOn: 1 })

    return {
        value: `${year}-W${weekNum.toString().padStart(2, '0')}`,
        label: `W${weekNum}: ${format(weekStart, 'd MMM', { locale: th })} - ${format(weekEnd, 'd MMM yyyy', { locale: th })}`,
        week_start_date: format(weekStart, 'yyyy-MM-dd'),
        week_end_date: format(weekEnd, 'yyyy-MM-dd'),
        year,
        week_number: weekNum
    }
}

// Calculate success rate
export function calculateSuccessRate(deployCount: number, rollbackCount: number): number {
    if (deployCount === 0) return 100
    return Math.round(((deployCount - rollbackCount) / deployCount) * 100 * 10) / 10
}

// Check if pass target (≥95%)
export function isPassTarget(successRate: number, target: number = 95): boolean {
    return successRate >= target
}

// Parse week value "2026-W02" to { year, week_number }
export function parseWeekValue(value: string): { year: number; week_number: number } | null {
    const match = value.match(/^(\d{4})-W(\d{2})$/)
    if (!match) return null
    return {
        year: parseInt(match[1]),
        week_number: parseInt(match[2])
    }
}
