"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Play,
    Pause,
    Square,
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Edit2
} from "lucide-react"
import { tasks, timeEntries, getProjectById } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function TimeTrackingPage() {
    const [isRunning, setIsRunning] = React.useState(false)
    const [elapsedTime, setElapsedTime] = React.useState(0)
    const [selectedTask, setSelectedTask] = React.useState(tasks[0])

    // Timer effect
    React.useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRunning) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isRunning])

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const formatDuration = (minutes: number) => {
        const hrs = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hrs === 0) return `${mins}m`
        return `${hrs}h ${mins}m`
    }

    // Weekly data (mock)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weeklyHours = [8, 7, 8, 6, 3, 0, 0]
    const totalWeeklyHours = weeklyHours.reduce((a, b) => a + b, 0)

    // Group time entries by date (using current date as fallback for mock data)
    const entriesByDate = timeEntries.reduce((acc, entry) => {
        const date = new Date().toISOString().split('T')[0] // Mock: all entries today
        if (!acc[date]) acc[date] = []
        acc[date].push(entry)
        return acc
    }, {} as Record<string, typeof timeEntries>)

    return (
        <div className="pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Time Tracking</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Jan 1 - 7, 2025
                    </Button>
                    <Button variant="outline" size="icon">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Current Timer */}
            <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-4xl font-mono font-bold">{formatTime(elapsedTime)}</p>
                            <p className="text-indigo-100 mt-1">{selectedTask.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isRunning ? (
                            <Button
                                onClick={() => setIsRunning(true)}
                                className="bg-white text-indigo-600 hover:bg-indigo-50"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Start
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => setIsRunning(false)}
                                    className="bg-white/20 hover:bg-white/30"
                                >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                </Button>
                                <Button
                                    onClick={() => { setIsRunning(false); setElapsedTime(0) }}
                                    variant="ghost"
                                    className="text-white hover:bg-white/20"
                                >
                                    <Square className="h-4 w-4 mr-2" />
                                    Stop
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            {/* Weekly Overview */}
            <Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">This Week</h3>
                    <span className="text-lg font-bold text-indigo-600">{totalWeeklyHours}h</span>
                </div>
                <div className="flex items-end gap-2 h-32">
                    {weekDays.map((day, i) => (
                        <div key={day} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg relative overflow-hidden" style={{ height: '100%' }}>
                                <div
                                    className={cn(
                                        "absolute bottom-0 w-full rounded-t-lg transition-all",
                                        weeklyHours[i] > 0 ? "bg-indigo-500" : "bg-transparent"
                                    )}
                                    style={{ height: `${(weeklyHours[i] / 8) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-500">{day}</span>
                            <span className="text-xs font-medium">{weeklyHours[i] > 0 ? `${weeklyHours[i]}h` : '-'}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Time Entries */}
            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Time Entries</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {Object.entries(entriesByDate).map(([date, entries]) => (
                        <div key={date}>
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                                </span>
                            </div>
                            {entries.map((entry) => {
                                const task = tasks.find(t => t.id === entry.task_id)
                                const project = task ? getProjectById(task.project_id) : null
                                return (
                                    <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                                {entry.description}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {task?.title}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">{formatDuration(entry.hours || 0)}</Badge>
                                        <button className="text-slate-400 hover:text-slate-600">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}
