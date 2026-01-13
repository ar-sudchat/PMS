'use client'

import { useState } from 'react'
import { type ProjectHealthSummary } from '@/lib/actions/dashboard-actions'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
    projects: ProjectHealthSummary[]
    onProjectClick: (projectId: string) => void
}

export function CalendarView({ projects, onProjectClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    // Get projects with milestones for a specific day
    const getMilestonesForDay = (day: number) => {
        return projects.filter(p => {
            if (!p.next_due_date) return false
            const dueDate = new Date(p.next_due_date)
            return dueDate.getDate() === day &&
                dueDate.getMonth() === month &&
                dueDate.getFullYear() === year
        })
    }

    const days = []
    for (let i = 0; i < firstDay; i++) {
        days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">
                        {monthNames[month]} {year}
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={prevMonth}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={nextMonth}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, index) => {
                        const milestones = day ? getMilestonesForDay(day) : []
                        const isToday = day === new Date().getDate() &&
                            month === new Date().getMonth() &&
                            year === new Date().getFullYear()

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "min-h-[100px] p-2 rounded-lg border transition-all",
                                    day ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer" : "bg-slate-50 border-transparent",
                                    isToday && "bg-indigo-50 border-indigo-400"
                                )}
                            >
                                {day && (
                                    <>
                                        <div className={cn(
                                            "text-sm font-semibold mb-1",
                                            isToday ? "text-indigo-600" : "text-slate-700"
                                        )}>
                                            {day}
                                        </div>
                                        <div className="space-y-1">
                                            {milestones.map((project) => (
                                                <div
                                                    key={project.project_id}
                                                    onClick={() => onProjectClick(project.project_id)}
                                                    className={cn(
                                                        "text-xs px-1.5 py-1 rounded truncate font-medium cursor-pointer",
                                                        project.health_status === 'critical'
                                                            ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                                            : project.health_status === 'at-risk'
                                                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                    )}
                                                    title={project.project_name}
                                                >
                                                    {project.project_code}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
