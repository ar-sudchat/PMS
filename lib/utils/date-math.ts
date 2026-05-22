/**
 * Add working days (skipping Sat/Sun) to a starting date
 */
export function addWorkingDays(startDate: Date, days: number): Date {
    const result = new Date(startDate)
    result.setHours(0, 0, 0, 0)

    // If starting date is a weekend, first shift it to Monday
    while (result.getDay() === 0 || result.getDay() === 6) {
        result.setDate(result.getDate() + 1)
    }

    let remainingDays = days
    while (remainingDays > 0) {
        result.setDate(result.getDate() + 1)
        const day = result.getDay()
        if (day !== 0 && day !== 6) {
            remainingDays--
        }
    }
    return result
}

/**
 * Subtract working days (skipping Sat/Sun) from an ending date
 */
export function subtractWorkingDays(endDate: Date, days: number): Date {
    const result = new Date(endDate)
    result.setHours(0, 0, 0, 0)

    // If starting date is a weekend, first shift it to Friday
    while (result.getDay() === 0 || result.getDay() === 6) {
        result.setDate(result.getDate() - 1)
    }

    let remainingDays = days
    while (remainingDays > 0) {
        result.setDate(result.getDate() - 1)
        const day = result.getDay()
        if (day !== 0 && day !== 6) {
            remainingDays--
        }
    }
    return result
}

/**
 * Calculate count of working days (inclusive) between two dates
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    if (start > end) return 0

    let count = 0
    const current = new Date(start)
    while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) {
            count++
        }
        current.setDate(current.getDate() + 1)
    }
    return count
}
