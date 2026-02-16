'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarRange } from 'lucide-react'
import { PlanningMilestone } from '@/lib/actions/project-planning-actions'

// ============================================
// Types
// ============================================

interface GanttViewProps {
    milestones: PlanningMilestone[]
    projectStartDate: string | null
    projectEndDate: string | null
}

// ============================================
// Helpers
// ============================================

function formatThaiShortDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
        })
    } catch {
        return '-'
    }
}

function daysBetween(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime()
    return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1)
}

function generateMonthLabels(start: Date, end: Date): { label: string; leftPercent: number; widthPercent: number }[] {
    const labels: { label: string; leftPercent: number; widthPercent: number }[] = []
    const totalDays = daysBetween(start, end)
    const current = new Date(start.getFullYear(), start.getMonth(), 1)

    while (current <= end) {
        const monthStart = current < start ? start : new Date(current)
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
        const effectiveEnd = monthEnd > end ? end : monthEnd

        const leftDays = daysBetween(start, monthStart)
        const widthDays = daysBetween(monthStart, effectiveEnd)

        labels.push({
            label: monthStart.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            leftPercent: (leftDays / totalDays) * 100,
            widthPercent: (widthDays / totalDays) * 100,
        })

        current.setMonth(current.getMonth() + 1)
    }

    return labels
}

// ============================================
// Component
// ============================================

export function GanttView({ milestones, projectStartDate, projectEndDate }: GanttViewProps) {
    // Parse project dates
    const projectStart = useMemo(() => {
        if (!projectStartDate) return null
        try { return new Date(projectStartDate) } catch { return null }
    }, [projectStartDate])

    const projectEnd = useMemo(() => {
        if (!projectEndDate) return null
        try { return new Date(projectEndDate) } catch { return null }
    }, [projectEndDate])

    // Compute month labels for the header
    const monthLabels = useMemo(() => {
        if (!projectStart || !projectEnd) return []
        return generateMonthLabels(projectStart, projectEnd)
    }, [projectStart, projectEnd])

    // Total project duration in days
    const totalDays = useMemo(() => {
        if (!projectStart || !projectEnd) return 0
        return daysBetween(projectStart, projectEnd)
    }, [projectStart, projectEnd])

    // Today marker position
    const todayPercent = useMemo(() => {
        if (!projectStart || !projectEnd || totalDays === 0) return null
        const today = new Date()
        if (today < projectStart || today > projectEnd) return null
        return (daysBetween(projectStart, today) / totalDays) * 100
    }, [projectStart, projectEnd, totalDays])

    // Sort milestones by sort_order
    const sortedMilestones = useMemo(
        () => [...milestones].sort((a, b) => a.sort_order - b.sort_order),
        [milestones]
    )

    // No dates available
    if (!projectStart || !projectEnd) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <CalendarRange className="h-10 w-10" />
                        <p className="text-sm">ยังไม่ได้กำหนดวันที่โครงการ</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    Gantt Chart
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        {/* Month header */}
                        <div className="flex mb-1">
                            <div className="w-[150px] flex-shrink-0" />
                            <div className="flex-1 relative h-7 border-b border-gray-200">
                                {monthLabels.map((m, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 text-[10px] text-muted-foreground border-l border-gray-200 px-1 truncate"
                                        style={{
                                            left: `${m.leftPercent}%`,
                                            width: `${m.widthPercent}%`,
                                        }}
                                    >
                                        {m.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Milestone rows */}
                        {sortedMilestones.map((ms) => {
                            const dueDate = ms.due_date ? new Date(ms.due_date) : null
                            const progress = ms.progress_percent ?? 0

                            // Calculate bar position: from project start to due_date
                            // Bar starts at 0% (project start) and ends at the due_date position
                            let barLeftPercent = 0
                            let barWidthPercent = 0

                            if (dueDate && totalDays > 0) {
                                const dueDays = daysBetween(projectStart, dueDate)
                                // Bar stretches from the beginning to the due date
                                // We give each milestone a proportional bar from start
                                barWidthPercent = Math.min((dueDays / totalDays) * 100, 100)
                                barLeftPercent = 0
                            }

                            return (
                                <div key={ms.id} className="flex items-center group hover:bg-muted/30 transition-colors">
                                    {/* Milestone name */}
                                    <div className="w-[150px] flex-shrink-0 pr-2 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: ms.milestone_color || '#6b7280' }}
                                            />
                                            <span className="text-xs font-medium truncate" title={ms.milestone_name}>
                                                {ms.milestone_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bar area */}
                                    <div className="flex-1 relative h-8 border-b border-gray-100">
                                        {/* Today line */}
                                        {todayPercent !== null && (
                                            <div
                                                className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                                                style={{ left: `${todayPercent}%` }}
                                            />
                                        )}

                                        {dueDate && barWidthPercent > 0 ? (
                                            <>
                                                {/* Background bar (total) */}
                                                <div
                                                    className="absolute top-1.5 h-5 rounded-sm opacity-30"
                                                    style={{
                                                        left: `${barLeftPercent}%`,
                                                        width: `${barWidthPercent}%`,
                                                        backgroundColor: ms.milestone_color || '#6b7280',
                                                    }}
                                                />
                                                {/* Progress fill */}
                                                <div
                                                    className="absolute top-1.5 h-5 rounded-sm transition-all duration-300"
                                                    style={{
                                                        left: `${barLeftPercent}%`,
                                                        width: `${barWidthPercent * (progress / 100)}%`,
                                                        backgroundColor: ms.milestone_color || '#6b7280',
                                                    }}
                                                />
                                                {/* Due date label */}
                                                <div
                                                    className="absolute top-1.5 h-5 flex items-center text-[10px] font-medium text-white px-1 pointer-events-none"
                                                    style={{
                                                        left: `${barLeftPercent}%`,
                                                        width: `${barWidthPercent}%`,
                                                    }}
                                                >
                                                    <span className="truncate drop-shadow-sm">
                                                        {formatThaiShortDate(ms.due_date)} ({progress}%)
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute top-1.5 h-5 flex items-center text-[10px] text-muted-foreground px-1">
                                                ยังไม่กำหนด
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Empty state */}
                        {sortedMilestones.length === 0 && (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                ยังไม่มี Milestone
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <div className="h-2 w-6 bg-gray-400 opacity-30 rounded-sm" />
                                <span>แผน</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <div className="h-2 w-6 bg-gray-400 rounded-sm" />
                                <span>ความคืบหน้าจริง</span>
                            </div>
                            {todayPercent !== null && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <div className="h-3 w-px bg-red-400" />
                                    <span>วันนี้</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
