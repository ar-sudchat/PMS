'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import { getTeamWorkloadForDateRange, EmployeeWorkload, unassignTask } from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { cn, stringToColor } from '@/lib/utils'
import { toast } from 'sonner'
import { ResourceDemandPanel } from './ResourceDemandPanel'
import { ResizablePanelLayout } from './ResizablePanelLayout'
import { TaskEditModal } from './TaskEditModal'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    DragStartEvent
} from '@dnd-kit/core'
import { reassignTask } from '@/lib/actions/workload-actions'

// ============================================
// CONSTANTS
// ============================================

const HOUR_WIDTH = 60 // pixels per hour
const TASK_HEIGHT = 50 // Height per task row (increased 10%)
const MIN_ROW_HEIGHT = 60 // Minimum row height when no tasks
const HEADER_HEIGHT = 40 // Reduced since no hour labels
const START_HOUR = 8 // Start at 8:00
const EMPLOYEE_COL_WIDTH = 135 // Increased 10%

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
    reviewerId?: string
    reviewerName?: string
    projectName?: string
    customerName?: string
}

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

// ============================================
// DRAG & DROP COMPONENTS
// ============================================

function DraggableTask({ task, children }: { task: TaskBlock, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `task-${task.id}`,
        data: task,
        disabled: task.isLocked
    })

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn("touch-none w-full", isDragging && "opacity-50")}
            style={{ cursor: task.isLocked ? 'not-allowed' : 'grab' }}
        >
            {children}
        </div>
    )
}

function DroppableCell({
    date,
    employeeId,
    children,
    className,
    style
}: {
    date: string
    employeeId: string
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${employeeId}-${date}`,
        data: { date, employeeId }
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(className, isOver && "bg-blue-100 ring-2 ring-blue-400 ring-inset")}
            style={style}
        >
            {children}
        </div>
    )
}

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

    const barHeight = TASK_HEIGHT - 6 // Leave some padding

    // Dynamic Color based on SA (Reviewer)
    const bgColor = task.reviewerId ? stringToColor(task.reviewerId) : null

    // Base classes
    let colorClasses = ""
    if (!bgColor) {
        if (task.status === 'done' || task.status === 'done_not_planned') {
            colorClasses = "bg-emerald-100 text-emerald-700 border-emerald-200"
        } else if (task.status === 'in_progress') {
            colorClasses = "bg-blue-100 text-blue-700 border-blue-200"
        } else {
            colorClasses = "bg-white text-slate-600 border-slate-200"
        }
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation()
                onClick?.(task)
            }}
            className={cn(
                "rounded-md border flex flex-col justify-center px-2 py-1 text-xs font-medium shadow-sm transition-all group overflow-hidden relative cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100",
                !bgColor && (priorityColors[task.priority] || priorityColors.medium),
                task.isLocked && "opacity-60 cursor-not-allowed"
            )}
            style={{
                width: '100%',
                height: barHeight,
                backgroundColor: bgColor || undefined,
                borderColor: bgColor ? bgColor.replace('85%)', '75%)') : undefined,
                color: bgColor ? '#334155' : undefined
            }}
            title={`${task.projectCode} - ${task.title} (${task.hours}h)`}
        >
            {/* Top row: Project code + hours */}
            <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] truncate flex-1 mr-1" title={task.projectName}>
                    {task.projectCode} {task.projectName ? `- ${task.projectName}` : ''}
                </span>
                <span className="bg-white/30 px-1.5 py-0.5 rounded text-xs font-bold shrink-0">
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
    const [activeDragTask, setActiveDragTask] = useState<TaskBlock | null>(null)

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    )
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [demandRefreshKey, setDemandRefreshKey] = useState(0)

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<{
        id: string
        title: string
        projectCode: string
        projectName?: string
        customerName?: string
        hours: number
        start: string
        end: string
        employeeId?: string
        reviewerId?: string
        position?: string
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
            date: dateStr,
            reviewerId: t.reviewer_id,
            reviewerName: t.reviewer_name,
            projectName: t.project_name,
            customerName: t.customer_name
        }))
    }

    // Calculate max tasks in any single day for an employee (for dynamic row height)
    const getMaxTasksForEmployee = (employee: EmployeeWorkload): number => {
        let maxTasks = 0
        dates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0]
            const tasks = getTasksForEmployeeDate(employee, dateStr)
            if (tasks.length > maxTasks) maxTasks = tasks.length
        })
        return maxTasks
    }

    // Calculate dynamic row height based on max tasks
    const getEmployeeRowHeight = (employee: EmployeeWorkload): number => {
        const maxTasks = getMaxTasksForEmployee(employee)
        return Math.max(maxTasks * TASK_HEIGHT, MIN_ROW_HEIGHT)
    }

    // Generate Legend Data
    const saLegend = useMemo(() => {
        const uniqueReviewers = new Map<string, string>()
        employees.forEach(emp => {
            emp.daily_workload.forEach(day => {
                day.tasks.forEach(t => {
                    if (t.reviewer_id && t.reviewer_id.toLowerCase() !== 'null') { // Check for string 'null' just in case
                        // We might not have reviewer name directly in task if it wasn't joined well, but daily-workload-actions does join it.
                        // Let's rely on what we have. 
                        // Wait, daily-workload-actions.ts `getTeamWorkloadForDateRange` DOES NOT fetch reviewer_name!
                        // It only fetches reviewer_id.
                        // I need to update backend to fetch reviewer_name if I want to show names.
                        // For now I will show reviewer_id if name missing, but I should fix backend.
                        uniqueReviewers.set(t.reviewer_id, t.reviewer_name || t.reviewer_id)
                    }
                })
            })
        })
        return Array.from(uniqueReviewers.entries()).map(([id, name]) => ({
            id,
            name,
            color: stringToColor(id)
        }))
    }, [employees])

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
                projectName: task.projectName,
                customerName: task.customerName,
                hours: task.hours,
                start: task.date,
                end: task.date,
                employeeId: task.employeeId,
                reviewerId: task.reviewerId
            }
        } else {
            // UnassignedTask from Resource Demand
            mappedTask = {
                id: task.id,
                title: task.title,
                projectCode: task.project_code || task.projectCode,
                projectName: task.project_name || task.projectName,
                customerName: task.customer_name || task.customerName,
                hours: task.estimated_hours || task.hours || 0,
                start: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : (task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : (task.start || '')),
                end: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : (task.end || ''),
                employeeId: task.assignee_id || task.employeeId,
                reviewerId: task.reviewer_id || task.created_by || task.reviewerId,
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
    const totalDayWidth = Math.round(hours.length * HOUR_WIDTH * 0.5) // Reduced to 50%

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

    // Drag End Handler
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveDragTask(null)

        if (!over) return

        const activeTask = active.data.current as TaskBlock & { fromDemandPanel?: boolean }
        const overData = over.data.current as { date: string, employeeId: string }

        if (!activeTask || !overData) return

        // Check if changed (skip check for tasks from demand panel - always allow assignment)
        const isFromDemandPanel = activeTask.fromDemandPanel
        if (!isFromDemandPanel && activeTask.employeeId === overData.employeeId && activeTask.date === overData.date) {
            return
        }

        const toastId = toast.loading(isFromDemandPanel ? "กำลังจ่ายงาน..." : "Saving changes...")

        try {
            // Optimistic update could go here, but for now we wait for server
            const result = await reassignTask(
                activeTask.id,
                overData.employeeId,
                overData.date, // This becomes the new Due Date (and Start Date due to sync logic)
                isFromDemandPanel ? "Assigned from Demand Panel" : "Drag and Drop",
                isFromDemandPanel ? "Assigned via Drag & Drop" : "Moved via Gantt"
            )

            if (result.success) {
                toast.success(isFromDemandPanel ? "จ่ายงานสำเร็จ" : "Task moved successfully", { id: toastId })
                if (result.warning) toast.warning(result.warning)
                loadData(true) // Silent reload
                setDemandRefreshKey(k => k + 1)
            } else {
                toast.error(result.error || "Failed to assign task", { id: toastId })
            }
        } catch (error) {
            toast.error("An error occurred", { id: toastId })
        }
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragTask(event.active.data.current as TaskBlock)
    }

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
                            {filteredEmployees.map(emp => {
                                const rowHeight = getEmployeeRowHeight(emp)
                                return (
                                <div key={emp.employee_id} className="flex border-b bg-white hover:bg-slate-50/30 transition-colors group/row">
                                    {/* Employee Info - Fixed */}
                                    <div
                                        className="sticky left-0 z-10 bg-white border-r group-hover/row:bg-slate-50/30 flex items-center px-2 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                        style={{ width: EMPLOYEE_COL_WIDTH, minHeight: rowHeight }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-slate-800 truncate">
                                                {emp.nickname || emp.employee_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn(
                                                    "px-1.5 py-0 rounded text-[10px] font-bold text-white",
                                                    emp.position_code === 'SA' ? 'bg-green-500' :
                                                        emp.position_code === 'BA' ? 'bg-purple-500' : 'bg-blue-500'
                                                )}>
                                                    {emp.position_code}
                                                </span>
                                                <span className={cn(
                                                    "text-[11px] font-medium px-1.5 rounded-full border",
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
                                                <DroppableCell
                                                    key={dateStr}
                                                    date={dateStr}
                                                    employeeId={emp.employee_id}
                                                    className={cn(
                                                        "relative border-r box-content transition-colors",
                                                        isToday ? "bg-blue-50/20" : ""
                                                    )}
                                                    style={{ width: totalDayWidth, minHeight: rowHeight }}
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
                                                                style={{ width: Math.round(HOUR_WIDTH * 0.5) }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Task bars - stacked vertically, full width */}
                                                    <div className="absolute inset-0 flex flex-col py-1 px-2 z-10 pointer-events-none">
                                                        {tasks.map((task, idx) => (
                                                            <div
                                                                key={task.id}
                                                                className="pointer-events-auto w-full"
                                                                style={{ marginBottom: idx < tasks.length - 1 ? 2 : 0 }}
                                                            >
                                                                <DraggableTask task={task}>
                                                                    <TaskBar
                                                                        task={task}
                                                                        onUnassign={handleUnassignTask}
                                                                        onClick={handleTaskClick}
                                                                    />
                                                                </DraggableTask>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </DroppableCell>
                                            )
                                        })}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>

                {/* Legend Bar */}
                {saLegend.length > 0 && (
                    <div className="border-t bg-white px-4 py-2 flex items-center gap-4 shrink-0 overflow-x-auto">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">SA Legend:</span>
                        <div className="flex items-center gap-3">
                            {saLegend.map(sa => (
                                <div key={sa.id} className="flex items-center gap-1.5">
                                    <div
                                        className="w-3 h-3 rounded-full border shadow-sm"
                                        style={{ backgroundColor: sa.color, borderColor: sa.color.replace('0.2)', '1)') }}
                                    />
                                    <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                        {sa.name || 'SA'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
    )

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
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

            <DragOverlay dropAnimation={null}>
                {activeDragTask ? (
                    <div
                        className="bg-white rounded-lg border-2 border-blue-500 shadow-2xl px-3 py-2 min-w-[180px] max-w-[250px]"
                        style={{ transform: 'rotate(2deg)' }}
                    >
                        <div className="font-bold text-blue-600 text-xs truncate">
                            {activeDragTask.projectCode}
                        </div>
                        <div className="text-slate-700 text-[11px] truncate mt-0.5">
                            {activeDragTask.title}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-1">
                            {activeDragTask.hours}h
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
