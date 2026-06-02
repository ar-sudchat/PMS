// Shared helpers used by main board AND sub-gantt popup so both grids align identically.

export const TH_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
export const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function firstOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
export function lastOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
export function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
export function daysBetween(a: Date, b: Date) {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}
export function toISODate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}
export function thMonthHeader(d: Date) {
    return `${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
export function thMonthShort(d: Date) {
    return TH_MONTH_SHORT[d.getMonth()]
}
export function thShortDate(iso: string | null): string {
    if (!iso) return '—'
    const [, m, dd] = iso.split('-')
    return `${parseInt(dd, 10)}-${TH_MONTH_SHORT[parseInt(m, 10) - 1]}`
}

export function getWeeksForMonth(monthStart: Date): { start: Date; days: number }[] {
    return getWeeksForRange(monthStart, lastOfMonth(monthStart))
}

/** Generate week segments between two dates (inclusive). Week boundary = Sunday. */
export function getWeeksForRange(rangeStart: Date, rangeEnd: Date): { start: Date; days: number }[] {
    const weeks: { start: Date; days: number }[] = []
    let cursor = new Date(rangeStart)
    while (cursor <= rangeEnd) {
        const dayOfWeek = cursor.getDay()
        const daysToWeekEnd = (7 - dayOfWeek) % 7 || 7
        const weekEndCandidate = new Date(cursor)
        weekEndCandidate.setDate(cursor.getDate() + daysToWeekEnd - 1)
        const segmentEnd = weekEndCandidate > rangeEnd ? rangeEnd : weekEndCandidate
        const days = daysBetween(cursor, segmentEnd) + 1
        weeks.push({ start: new Date(cursor), days })
        cursor = new Date(segmentEnd)
        cursor.setDate(cursor.getDate() + 1)
    }
    return weeks
}

/** Convert ISO date (or single date point) to a bar position relative to a window. */
export function computeBarPosition(
    startISO: string | null,
    endISO: string | null,
    rangeStart: Date,
    totalDays: number
): { leftPct: number; widthPct: number } | null {
    if (!startISO && !endISO) return null
    // If only one is provided, treat the bar as a single-day marker on that date.
    const start = new Date(startISO || endISO || '')
    const end = new Date(endISO || startISO || '')
    const rangeEnd = new Date(rangeStart)
    rangeEnd.setDate(rangeStart.getDate() + totalDays - 1)
    const clampedStart = start < rangeStart ? rangeStart : start
    const clampedEnd = end > rangeEnd ? rangeEnd : end
    if (clampedEnd < clampedStart) return null
    const offsetDays = Math.round((clampedStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    const durationDays = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return {
        leftPct: (offsetDays / totalDays) * 100,
        widthPct: (durationDays / totalDays) * 100,
    }
}
