'use client'

import { useMemo } from 'react'
import { MyTask } from '@/lib/actions/my-tasks-actions'
import { Calendar, Clock, AlertCircle, ListChecks, Eye, Timer, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusSelect } from '@/components/tasks/TaskStatusSelect'
import { format, isToday, isTomorrow, isYesterday, isPast, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { useState } from 'react'

interface TaskTableProps {
    tasks: MyTask[]
    onViewDetail: (task: MyTask) => void
    onLogTime: (task: MyTask) => void
    onStatusChange: (task: MyTask, newStatus: string, reason?: string) => void
    canLogTime?: boolean
}

interface GroupedTasks {
    [dateKey: string]: {
        label: string
        date: Date | null
        tasks: MyTask[]
        isOverdue?: boolean
        isToday?: boolean
    }
}

export function TaskTable({ tasks, onViewDetail, onLogTime, onStatusChange, canLogTime = true }: TaskTableProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

    // Helper to parse date (handles both string and Date)
    const parseDate = (value: string | Date | null): Date | null => {
        if (!value) return null
        if (value instanceof Date) return value
        if (typeof value === 'string') {
            try {
                return parseISO(value)
            } catch {
                return new Date(value)
            }
        }
        return null
    }

    // Group tasks by due_date
    const groupedTasks = useMemo(() => {
        const groups: GroupedTasks = {}

        // First, separate tasks with and without dates
        const tasksWithDate = tasks.filter(t => t.due_date)
        const tasksWithoutDate = tasks.filter(t => !t.due_date)

        // Group tasks with dates
        tasksWithDate.forEach(task => {
            const date = parseDate(task.due_date)
            if (!date) return
            const dateKey = format(date, 'yyyy-MM-dd')

            if (!groups[dateKey]) {
                let label = format(date, 'EEEE, d MMMM yyyy', { locale: th })

                // Add special labels
                if (isToday(date)) {
                    label = `วันนี้ - ${label}`
                } else if (isTomorrow(date)) {
                    label = `พรุ่งนี้ - ${label}`
                } else if (isYesterday(date)) {
                    label = `เมื่อวาน - ${label}`
                }

                groups[dateKey] = {
                    label,
                    date,
                    tasks: [],
                    isOverdue: isPast(date) && !isToday(date),
                    isToday: isToday(date)
                }
            }
            groups[dateKey].tasks.push(task)
        })

        // Add "No Due Date" group if there are tasks without dates
        if (tasksWithoutDate.length > 0) {
            groups['no-date'] = {
                label: 'ไม่มีกำหนด',
                date: null,
                tasks: tasksWithoutDate
            }
        }

        return groups
    }, [tasks])

    // Sort groups by date (today first, then future, then past, then no-date)
    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedTasks).sort((a, b) => {
            if (a === 'no-date') return 1
            if (b === 'no-date') return -1

            const dateA = groupedTasks[a].date
            const dateB = groupedTasks[b].date

            if (!dateA || !dateB) return 0

            // Today first
            if (isToday(dateA) && !isToday(dateB)) return -1
            if (!isToday(dateA) && isToday(dateB)) return 1

            // Then by date ascending
            return dateA.getTime() - dateB.getTime()
        })
    }, [groupedTasks])

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev)
            if (newSet.has(key)) {
                newSet.delete(key)
            } else {
                newSet.add(key)
            }
            return newSet
        })
    }

    const getPriorityBadge = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">High</span>
            case 'medium':
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Medium</span>
            default:
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Normal</span>
        }
    }

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-green-500'
        if (percent >= 75) return 'bg-blue-500'
        if (percent >= 50) return 'bg-amber-500'
        return 'bg-slate-400'
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm mt-1">You don't have any tasks in this view.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {sortedGroupKeys.map(dateKey => {
                const group = groupedTasks[dateKey]
                const isCollapsed = collapsedGroups.has(dateKey)

                return (
                    <div key={dateKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(dateKey)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                                group.isToday ? "bg-indigo-50 hover:bg-indigo-100" :
                                    group.isOverdue ? "bg-red-50 hover:bg-red-100" :
                                        "bg-slate-50 hover:bg-slate-100"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {isCollapsed ? (
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                                <Calendar className={cn(
                                    "w-4 h-4",
                                    group.isToday ? "text-indigo-600" :
                                        group.isOverdue ? "text-red-500" :
                                            "text-slate-400"
                                )} />
                                <span className={cn(
                                    "font-medium",
                                    group.isToday ? "text-indigo-700" :
                                        group.isOverdue ? "text-red-700" :
                                            "text-slate-700"
                                )}>
                                    {group.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2.5 py-1 text-xs font-medium rounded-full",
                                    group.isToday ? "bg-indigo-100 text-indigo-700" :
                                        group.isOverdue ? "bg-red-100 text-red-700" :
                                            "bg-slate-200 text-slate-600"
                                )}>
                                    {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </button>

                        {/* Tasks Table */}
                        {!isCollapsed && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                                                Code
                                            </th>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-48">
                                                Project / Story
                                            </th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                                                Priority
                                            </th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                                                Progress
                                            </th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                                                Hours
                                            </th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                                                Status
                                            </th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {group.tasks.map(task => (
                                            <tr
                                                key={task.task_id}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => onViewDetail(task)}
                                            >
                                                {/* Task Code */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {task.task_code}
                                                    </span>
                                                </td>

                                                {/* Task Title */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-start gap-2">
                                                        {task.is_overdue && (
                                                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onViewDetail(task)
                                                                }}
                                                                className="text-sm font-medium text-slate-900 hover:text-indigo-600 text-left line-clamp-1"
                                                            >
                                                                {task.task_title}
                                                            </button>
                                                            {task.checklist_total > 0 && (
                                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                                                                    <ListChecks className="w-3 h-3" />
                                                                    <span className={task.checklist_completed === task.checklist_total ? "text-emerald-600" : ""}>
                                                                        {task.checklist_completed}/{task.checklist_total}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Project / Story */}
                                                <td className="px-4 py-3">
                                                    <div className="text-xs">
                                                        <div className="font-medium text-slate-700 truncate max-w-[180px]">
                                                            {task.project_name}
                                                        </div>
                                                        <div className="text-slate-400 truncate max-w-[180px]">
                                                            {task.story_code}: {task.story_title}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="px-4 py-3 text-center">
                                                    {getPriorityBadge(task.priority)}
                                                </td>

                                                {/* Progress */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all", getProgressColor(task.progress_percent))}
                                                                style={{ width: `${Math.min(task.progress_percent, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 w-10 text-right">
                                                            {task.progress_percent}%
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Hours */}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span className={cn(
                                                            "font-medium",
                                                            task.actual_hours > task.estimated_hours ? "text-red-600" : "text-slate-600"
                                                        )}>
                                                            {task.actual_hours}h
                                                        </span>
                                                        <span className="text-slate-400">/</span>
                                                        <span className="text-slate-500">{task.estimated_hours}h</span>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-center">
                                                        <TaskStatusSelect
                                                            value={task.status}
                                                            onChange={(status, reason) => onStatusChange(task, status, reason)}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => onViewDetail(task)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="View Detail"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {canLogTime && (
                                                            <button
                                                                onClick={() => onLogTime(task)}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                                title="Log Time"
                                                            >
                                                                <Timer className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
