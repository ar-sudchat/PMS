'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import { getTeamWorkloadForDateRange, EmployeeWorkload, unassignTask } from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ResourceDemandPanel } from './ResourceDemandPanel'
import { ResizablePanelLayout } from './ResizablePanelLayout'
import { TaskEditModal } from './TaskEditModal'

// ============================================
// CONSTANTS
// ============================================

const HOUR_WIDTH = 60 // pixels per hour
const ROW_HEIGHT = 70 // Increased for more task details
const HEADER_HEIGHT = 40 // Reduced since no hour labels
const START_HOUR = 8 // Start at 8:00
const EMPLOYEE_COL_WIDTH = 200 // Wider employee column

// ============================================
// TYPES
// ============================================

interface TaskBlock {
    id: string
    title: string
    projectCode: string
    hours: number
    priority: string
    status: string
    isLocked: boolean
    // Position info
    employeeId: string
    date: string
    startHour?: number // Optional: for future time-based positioning
}

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

// ============================================
// TASK BAR
// ============================================

function TaskBar({
    task,
    onUnassign,
    onClick
}: {
    task: TaskBlock
    onUnassign?: (taskId: string) => void
    onClick?: (task: TaskBlock) => void
}) {
    const priorityColors: Record<string, string> = {
        critical: 'bg-red-500 border-red-600',
        high: 'bg-amber-500 border-amber-600',
        medium: 'bg-blue-500 border-blue-600',
        low: 'bg-slate-400 border-slate-500'
    }

    const barWidth = Math.max(task.hours * HOUR_WIDTH - 4, 50) // Min 50px
    const barHeight = ROW_HEIGHT - 10 // Leave some padding

    return (
        <div
            onClick={(e) => {
                e.stopPropagation()
                onClick?.(task)
            }}
            className={cn(
                "rounded-md border-2 flex flex-col justify-center px-2 py-1 text-white text-xs font-medium shadow-sm transition-all group overflow-hidden relative cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100",
                priorityColors[task.priority] || priorityColors.medium,
                task.isLocked && "opacity-60 cursor-not-allowed"
            )}
            style={{ width: barWidth, height: barHeight }}
            title={`${task.projectCode} - ${task.title} (${task.hours}h)`}
        >
            {/* Top row: Project code + hours */}
            <div className="flex items-center justify-between">
                <span className="font-bold text-[11px]">{task.projectCode}</span>
                <span className="bg-white/20 px-1 rounded text-[10px]">
                    {task.hours}h
                </span>
            </div>
            {/* Bottom row: Task title */}
            <div className="truncate opacity-90 text-[11px] leading-tight mt-0.5">
                {task.title}
            </div>

            {/* Unassign button on hover */}
            {!task.isLocked && onUnassign && (
                <button
                    onPointerDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onUnassign(task.id)
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/30 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] z-20"
                    title="ถอนงาน"
                >
                    ×
                </button>
            )}
        </div>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GanttResourceView() {
    // States
    const [startDate, setStartDate] = useState(() => {
        const today = new Date()
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(today)
        monday.setDate(diff)
        return monday.toISOString().split('T')[0]
    })
    const [employees, setEmployees] = useState<EmployeeWorkload[]>([])
    const [config, setConfig] = useState<WorkloadConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<PositionFilter>('PG')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [demandRefreshKey, setDemandRefreshKey] = useState(0)

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<{
        id: string
        title: string
        projectCode: string
        hours: number
        start: string
        end: string
        employeeId?: string
    } | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)

    // Calculate dates for the week
    const dates = useMemo(() => {
        const d: Date[] = []
        let current = new Date(startDate)
        for (let i = 0; i < 5; i++) { // Mon-Fri
            d.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        return d
    }, [startDate])

    const endDate = useMemo(() => {
        const end = new Date(startDate)
        end.setDate(end.getDate() + 4)
        return end.toISOString().split('T')[0]
    }, [startDate])

    // Load data
    useEffect(() => {
        loadData()
    }, [startDate])

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true)
        try {
            const [configResult, teamResult] = await Promise.all([
                getWorkloadConfig(),
                getTeamWorkloadForDateRange(startDate, endDate)
            ])
            if (configResult.success) setConfig(configResult.data)
            if (teamResult.success) setEmployees(teamResult.data)
        } catch (e) {
            toast.error("Failed to load data")
        } finally {
            if (!silent) setIsLoading(false)
        }
    }, [startDate, endDate])

    const navigateWeek = (direction: 'prev' | 'next') => {
        const current = new Date(startDate)
        current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
        setStartDate(current.toISOString().split('T')[0])
    }

    // Filter employees
    const filteredEmployees = useMemo(() => {
        if (activeTab === 'all') return employees
        return employees.filter(emp => emp.position_code === activeTab)
    }, [employees, activeTab])

    const positionCounts = useMemo(() => ({
        all: employees.length,
        SA: employees.filter(e => e.position_code === 'SA').length,
        BA: employees.filter(e => e.position_code === 'BA').length,
        PG: employees.filter(e => e.position_code === 'PG').length
    }), [employees])

    // Convert employee workload to task blocks
    const getTasksForEmployeeDate = (employee: EmployeeWorkload, dateStr: string): TaskBlock[] => {
        const dayData = employee.daily_workload.find(d => d.work_date === dateStr)
        if (!dayData) return []

        return dayData.tasks.map(t => ({
            id: t.id,
            title: t.title,
            projectCode: t.project_code,
            hours: t.estimated_hours,
            priority: t.priority,
            status: t.status,
            isLocked: t.milestone_locked,
            employeeId: employee.employee_id,
            date: dateStr
        }))
    }

    // Unassign handler - no confirmation, just unassign with toast notification
    const handleUnassignTask = async (taskId: string) => {
        const toastId = toast.loading("กำลังถอนงาน...")
        const result = await unassignTask(taskId, false)
        if (result.success) {
            toast.success("ถอนงานสำเร็จ", { id: toastId })
            loadData()
            setDemandRefreshKey(k => k + 1)
        } else {
            toast.error(result.error || "ถอนงานล้มเหลว", { id: toastId })
        }
    }

    const handleTaskClick = (task: TaskBlock | any) => {
        // Handle both TaskBlock (from Gantt) and UnassignedTask (from Resource Demand)
        let mappedTask

        if ('employeeId' in task && 'date' in task) {
            // TaskBlock from Gantt
            mappedTask = {
                id: task.id,
                title: task.title,
                projectCode: task.projectCode,
                hours: task.hours,
                start: task.date,
                end: task.date,
                employeeId: task.employeeId
            }
        } else {
            // UnassignedTask from Resource Demand
            mappedTask = {
                id: task.id,
                title: task.title,
                projectCode: task.project_code || task.projectCode,
                projectName: task.project_name || task.projectName,
                hours: task.estimated_hours || task.hours || 0,
                start: task.start_date || task.start || '',
                end: task.due_date || task.end || '',
                employeeId: task.assignee_id || task.employeeId,
                reviewerId: task.reviewer_id || task.reviewerId,
                position: task.position
            }
        }

        setEditingTask(mappedTask)
        setIsEditModalOpen(true)
    }

    const handleTaskSaved = () => {
        loadData(true) // Silent reload
        setDemandRefreshKey(k => k + 1)
    }

    // Calculate hours array based on config (e.g., 7 hours = 8:00-15:00)
    const hours = useMemo(() => {
        const workingHours = config?.workingHoursPerDay || 7
        return Array.from({ length: workingHours }, (_, i) => START_HOUR + i)
    }, [config])

    // Calculate total width
    const totalDayWidth = hours.length * HOUR_WIDTH

    // Left Panel - Resource Demand
    const leftPanel = (
        <ResourceDemandPanel
            onRefresh={() => loadData(false)}
            excludeTaskIds={[]} // Simplified: Always show unassigned in Demand even if dragged before (now not dragging)
            refreshTrigger={demandRefreshKey}
            startDate={startDate}
            endDate={endDate}
            dates={dates}
            onTaskClick={handleTaskClick}
        />
    )

    // Right Panel - Gantt Chart
    const rightPanel = (
        <div className={cn(
            "h-full flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden",
            isFullscreen && "fixed inset-0 z-50 rounded-none w-screen h-screen"
        )}>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Resource Gantt</h2>
                        <p className="text-xs text-slate-500">
                            {new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Position Filter */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        {(['all', 'SA', 'BA', 'PG'] as PositionFilter[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                                    activeTab === tab
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {tab === 'all' ? 'All' : tab}
                                <span className="ml-1 bg-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">
                                    {positionCounts[tab]}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Week Navigation */}
                    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                        <button onClick={() => navigateWeek('prev')} className="p-1.5 hover:bg-slate-50 border-r">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                            const today = new Date()
                            const day = today.getDay()
                            const diff = today.getDate() - day + (day === 0 ? -6 : 1)
                            const monday = new Date(today)
                            monday.setDate(diff)
                            setStartDate(monday.toISOString().split('T')[0])
                        }} className="px-2 hover:bg-slate-50 text-xs font-medium text-slate-600 h-full">
                            To Week
                        </button>
                        <button onClick={() => navigateWeek('next')} className="p-1.5 hover:bg-slate-50 border-l">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button onClick={() => loadData(false)} className="p-1.5 hover:bg-slate-100 rounded-lg border text-slate-500 bg-white">
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border text-slate-500 bg-white"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Gantt Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50" ref={containerRef}>
                {isLoading && employees.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="min-w-max pb-4">
                        {/* Header Row */}
                        <div className="flex border-b bg-white sticky top-0 z-20 shadow-sm" style={{ height: HEADER_HEIGHT }}>
                            {/* Employee Column Header */}
                            <div className="sticky left-0 z-30 bg-white border-r flex items-center px-3" style={{ width: EMPLOYEE_COL_WIDTH }}>
                                <span className="font-semibold text-sm text-slate-600">Employee</span>
                            </div>

                            {/* Day Headers */}
                            <div className="flex">
                                {dates.map(date => {
                                    const dateStr = date.toISOString().split('T')[0]
                                    const isToday = dateStr === new Date().toISOString().split('T')[0]

                                    return (
                                        <div
                                            key={dateStr}
                                            className={cn(
                                                "border-r flex items-center justify-center font-medium text-sm transition-colors",
                                                isToday ? "bg-blue-600 text-white" : "text-slate-700 bg-slate-50"
                                            )}
                                            style={{ width: totalDayWidth, height: HEADER_HEIGHT }}
                                        >
                                            {date.toLocaleDateString('th-TH', { weekday: 'short' })} {date.getDate()}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Employee Rows */}
                        {filteredEmployees.map(emp => (
                            <div key={emp.employee_id} className="flex border-b bg-white hover:bg-slate-50/30 transition-colors group/row">
                                {/* Employee Info - Fixed */}
                                <div
                                    className="sticky left-0 z-10 bg-white border-r group-hover/row:bg-slate-50/30 flex items-center gap-3 px-3 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                    style={{ width: EMPLOYEE_COL_WIDTH, height: ROW_HEIGHT }}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border-2 border-white",
                                        emp.position_code === 'SA' ? 'bg-green-500' :
                                            emp.position_code === 'BA' ? 'bg-purple-500' : 'bg-blue-500'
                                    )}>
                                        {(emp.nickname || emp.employee_name || '?').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-800 truncate">
                                            {emp.nickname || emp.employee_name}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={cn(
                                                "px-1.5 py-0 rounded text-[9px] font-bold text-white shadow-sm",
                                                emp.position_code === 'SA' ? 'bg-green-500' :
                                                    emp.position_code === 'BA' ? 'bg-purple-500' : 'bg-blue-500'
                                            )}>
                                                {emp.position_code}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-medium px-1.5 py-0 rounded-full border",
                                                emp.average_workload_percent > 100 ? "text-red-600 bg-red-50 border-red-100" :
                                                    emp.average_workload_percent > 80 ? "text-amber-600 bg-amber-50 border-amber-100" : "text-green-600 bg-green-50 border-green-100"
                                            )}>
                                                {emp.average_workload_percent}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline for this employee */}
                                <div className="flex">
                                    {dates.map(date => {
                                        const dateStr = date.toISOString().split('T')[0]
                                        const tasks = getTasksForEmployeeDate(emp, dateStr)
                                        const isToday = dateStr === new Date().toISOString().split('T')[0]

                                        return (
                                            <div
                                                key={dateStr}
                                                className={cn(
                                                    "relative border-r box-content",
                                                    isToday ? "bg-blue-50/20" : ""
                                                )}
                                                style={{ width: totalDayWidth, height: ROW_HEIGHT }}
                                            >
                                                {/* Hour reference lines */}
                                                <div className="absolute inset-0 flex pointer-events-none z-[1]">
                                                    {hours.map((hour, idx) => (
                                                        <div
                                                            key={hour}
                                                            className={cn(
                                                                "h-full border-r border-slate-100",
                                                                idx === hours.length - 1 && "border-r-0"
                                                            )}
                                                            style={{ width: HOUR_WIDTH }}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Task bars */}
                                                <div className="absolute inset-0 flex items-center px-1 z-10 pointer-events-none">
                                                    {tasks.map((task, idx) => {
                                                        // Calculate horizontal position - stack tasks horizontally
                                                        let leftOffset = 0
                                                        for (let i = 0; i < idx; i++) {
                                                            leftOffset += tasks[i].hours * HOUR_WIDTH
                                                        }

                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className="absolute pointer-events-auto"
                                                                style={{ left: leftOffset }}
                                                            >
                                                                <TaskBar
                                                                    task={task}
                                                                    onUnassign={handleUnassignTask}
                                                                    onClick={handleTaskClick}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <>
            <ResizablePanelLayout
                leftPanel={leftPanel}
                rightPanel={rightPanel}
                defaultLeftWidth={20}
                minLeftWidth={15}
                maxLeftWidth={40}
            />

            <TaskEditModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                task={editingTask}
                onSaved={handleTaskSaved}
            />
        </>
    )
}
