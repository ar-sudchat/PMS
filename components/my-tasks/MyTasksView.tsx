'use client'

import { useState, useMemo } from 'react'
import { MyTask, getMyTasks, getMyTaskCounts, updateTaskStatus } from '@/lib/actions/my-tasks-actions'
import { TaskCard } from './TaskCard'
import { TaskTable } from './TaskTable'
import { StatusFilter } from './StatusFilter'
import { TaskDetailModal } from './TaskDetailModal'
import { QuickLogTimeModal } from './QuickLogTimeModal'
import { Search, Loader2, ChevronLeft, ChevronRight, Calendar, User, LayoutGrid, Table2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { getCurrentWeek, type WeekOption } from '@/lib/utils/week-helper'
import { format, addWeeks, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Employee {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    nickname: string | null
    full_name: string
    position: string | null
}

interface MyTasksViewProps {
    initialTasks: MyTask[]
    initialCounts: Record<string, number>
    currentUserId: string
    currentUserName: string
    userRole: string
    employees: Employee[]
}

// Helper to calculate week info from Date
function getWeekInfo(date: Date): WeekOption {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
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

type ViewMode = 'card' | 'table'

export function MyTasksView({
    initialTasks,
    initialCounts,
    currentUserId,
    currentUserName,
    userRole,
    employees
}: MyTasksViewProps) {
    const [tasks, setTasks] = useState<MyTask[]>(initialTasks)
    const [counts, setCounts] = useState<Record<string, number>>(initialCounts)
    const [statusFilter, setStatusFilter] = useState('todo')
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('table') // Default to table view

    // New filters
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUserId)
    const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date())
    const [filterDate, setFilterDate] = useState<string>('')
    const currentWeek = useMemo(() => getWeekInfo(currentWeekDate), [currentWeekDate])

    // Modals
    const [detailTask, setDetailTask] = useState<MyTask | null>(null)
    const [logTimeTask, setLogTimeTask] = useState<MyTask | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isLogTimeOpen, setIsLogTimeOpen] = useState(false)
    const [detailRefreshKey, setDetailRefreshKey] = useState(0) // Key to trigger refresh in TaskDetailModal
    const [detailActiveTab, setDetailActiveTab] = useState<'checklist' | 'timelog' | 'attachments'>('checklist')

    // Employee options for combobox
    const employeeOptions = useMemo(() => {
        return employees.map(emp => ({
            value: emp.id,
            label: emp.nickname
                ? `${emp.full_name} (${emp.nickname})`
                : emp.full_name
        }))
    }, [employees])

    const selectedEmployeeOption = useMemo(() => {
        return employeeOptions.find(opt => opt.value === selectedEmployeeId) || null
    }, [employeeOptions, selectedEmployeeId])

    // Week navigation
    const handlePrevWeek = () => {
        setCurrentWeekDate(prev => addWeeks(prev, -1))
    }

    const handleNextWeek = () => {
        setCurrentWeekDate(prev => addWeeks(prev, 1))
    }

    const handleToday = () => {
        setCurrentWeekDate(new Date())
    }

    const fetchTasks = async (status: string, employeeId?: string, weekStart?: string, updateDetailTask?: boolean) => {
        setIsLoading(true)
        try {
            const res = await getMyTasks({
                status,
                employeeId: employeeId || selectedEmployeeId,
                weekStart: weekStart || currentWeek.week_start_date
            })

            const newCounts = await getMyTaskCounts({
                employeeId: employeeId || selectedEmployeeId,
                weekStart: weekStart || currentWeek.week_start_date
            })

            setTasks(res)
            setCounts(newCounts)

            // Update detailTask if it's open and we found the updated task
            if (updateDetailTask && detailTask) {
                const updatedTask = res.find(t => t.task_id === detailTask.task_id)
                if (updatedTask) {
                    setDetailTask(updatedTask)
                }
            }
        } catch (error) {
            toast.error('Failed to refresh tasks')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle employee change
    const handleEmployeeChange = async (option: { value: string | number; label: string } | null) => {
        if (option) {
            const empId = String(option.value)
            setSelectedEmployeeId(empId)
            await fetchTasks(statusFilter, empId, currentWeek.week_start_date)
        }
    }

    // Handle week change - refetch when week changes
    const handleWeekChange = async (newWeekDate: Date) => {
        const newWeek = getWeekInfo(newWeekDate)
        setCurrentWeekDate(newWeekDate)
        await fetchTasks(statusFilter, selectedEmployeeId, newWeek.week_start_date)
    }

    const handleStatusChange = async (newStatus: string) => {
        setStatusFilter(newStatus)
        await fetchTasks(newStatus, selectedEmployeeId, currentWeek.week_start_date)
    }

    const handleTaskStatusUpdate = async (task: MyTask, newStatus: string, reason?: string) => {
        const result = await updateTaskStatus(task.task_id, newStatus, reason)
        if (result.success) {
            const statusLabel = newStatus === 'done_not_planned' ? 'เสร็จไม่ตามแผน' : newStatus
            toast.success(`Task status updated to ${statusLabel}`)
            // Refresh list to ensure consistency and correct counts
            await fetchTasks(statusFilter, selectedEmployeeId, currentWeek.week_start_date)

            // If detail modal is open, update that task too
            if (detailTask && detailTask.task_id === task.task_id) {
                setDetailTask({ ...detailTask, status: newStatus })
            }
        } else {
            toast.error('Failed to update status')
        }
    }

    const handleViewDetail = (task: MyTask) => {
        setDetailTask(task)
        setIsDetailOpen(true)
    }

    const handleLogTime = (task: MyTask) => {
        setLogTimeTask(task)
        setIsLogTimeOpen(true)
    }

    const filteredTasks = tasks.filter(t =>
    ((search === '' ||
        t.task_title.toLowerCase().includes(search.toLowerCase()) ||
        t.task_code.toLowerCase().includes(search.toLowerCase()) ||
        t.project_name.toLowerCase().includes(search.toLowerCase())) &&
        (!filterDate || (t.due_date && t.due_date.startsWith(filterDate))))
    )

    // Get selected employee name for display
    const selectedEmployeeName = useMemo(() => {
        if (selectedEmployeeId === currentUserId) return currentUserName
        const emp = employees.find(e => e.id === selectedEmployeeId)
        return emp?.full_name || emp?.nickname || 'Employee'
    }, [selectedEmployeeId, currentUserId, currentUserName, employees])

    const isViewingOwnTasks = selectedEmployeeId === currentUserId
    const canViewOthers = userRole === 'admin' || userRole === 'manager'

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header / Filter Bar */}
            <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isViewingOwnTasks ? 'My Tasks' : `Tasks: ${selectedEmployeeName}`}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    viewMode === 'table'
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Table2 className="w-4 h-4" />
                                Table
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    viewMode === 'card'
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Cards
                            </button>
                        </div>

                        {/* Employee Selector (for managers) */}
                        {canViewOthers && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <div className="w-56">
                                    <SmartCombobox
                                        options={employeeOptions}
                                        value={selectedEmployeeOption}
                                        onChange={handleEmployeeChange}
                                        placeholder="Select employee..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
                            />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 w-40"
                            />
                            {filterDate && (
                                <button
                                    onClick={() => setFilterDate('')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Week Navigator */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWeekChange(addWeeks(currentWeekDate, -1))}
                            className="h-8 px-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-700">
                                {currentWeek.label}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWeekChange(addWeeks(currentWeekDate, 1))}
                            className="h-8 px-2"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWeekChange(new Date())}
                            className="h-8 ml-2"
                        >
                            Today
                        </Button>
                    </div>
                    <div className="text-sm text-slate-500">
                        {counts.all || 0} task{(counts.all || 0) !== 1 ? 's' : ''} this week
                    </div>
                </div>

                <StatusFilter
                    currentStatus={statusFilter}
                    onStatusChange={handleStatusChange}
                    counts={counts}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : viewMode === 'table' ? (
                    <TaskTable
                        tasks={filteredTasks}
                        onViewDetail={handleViewDetail}
                        onLogTime={handleLogTime}
                        onStatusChange={handleTaskStatusUpdate}
                        canLogTime={isViewingOwnTasks}
                    />
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-lg font-medium">No tasks found</p>
                        <p className="text-sm mt-1">You don't have any tasks in this view.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.task_id}
                                task={task}
                                onViewDetail={handleViewDetail}
                                onLogTime={handleLogTime}
                                onStatusChange={handleTaskStatusUpdate}
                                canLogTime={isViewingOwnTasks}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <TaskDetailModal
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                task={detailTask}
                activeTab={detailActiveTab}
                onTabChange={setDetailActiveTab}
                onLogTime={(t) => {
                    setLogTimeTask(t)
                    setIsLogTimeOpen(true)
                }}
                onStatusChange={handleTaskStatusUpdate}
                onDataChange={() => fetchTasks(statusFilter, selectedEmployeeId, currentWeek.week_start_date, true)}
                refreshTrigger={detailRefreshKey}
                onUnassign={() => fetchTasks(statusFilter, selectedEmployeeId, currentWeek.week_start_date)}
                canUnassign={true}
            />

            <QuickLogTimeModal
                open={isLogTimeOpen}
                onOpenChange={setIsLogTimeOpen}
                task={logTimeTask}
                postLogAction={() => {
                    // Fetch tasks and update detailTask with new progress/hours data
                    fetchTasks(statusFilter, selectedEmployeeId, currentWeek.week_start_date, true)
                    // Trigger TaskDetailModal to refresh its internal data (time entries, checklist)
                    setDetailRefreshKey(prev => prev + 1)
                }}
            />
        </div>
    )
}
