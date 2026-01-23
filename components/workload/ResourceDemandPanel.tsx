'use client'

import { useState, useEffect, useMemo } from 'react'
import { getUnassignedTasks, UnassignedTask, autoAssignSABATasks, autoAssignAllReadyTasks } from '@/lib/actions/workload-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RefreshCw, Package, ChevronDown, AlertCircle, Clock, CheckCircle2, Calendar, Zap, Users, GripVertical } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'

// Task Card for Demand Panel (Click to Edit + Draggable)
function DemandTaskCard({ task, onClick }: { task: UnassignedTask, onClick?: (task: UnassignedTask) => void }) {
    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: `demand-task-${task.id}`,
        data: {
            id: task.id,
            title: task.title,
            projectCode: task.project_code,
            projectName: task.project_name,
            customerName: task.customer_name,
            hours: task.estimated_hours,
            priority: task.priority,
            status: task.status,
            isLocked: false,
            employeeId: task.assignee_id || '',
            date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
            reviewerId: task.reviewer_id,
            reviewerName: task.reviewer_name,
            fromDemandPanel: true
        }
    })

    const priorityColors: Record<string, string> = {
        critical: 'border-l-red-500 bg-red-50/50',
        high: 'border-l-amber-500 bg-amber-50/50',
        medium: 'border-l-blue-500 bg-blue-50/50',
        low: 'border-l-slate-400 bg-slate-50/50'
    }

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => {
                // Don't trigger click when dragging
                if (!isDragging && onClick) {
                    onClick(task)
                }
            }}
            className={cn(
                "p-2.5 pl-6 rounded-md border border-l-4 bg-white shadow-sm select-none text-xs transition-all relative group touch-none",
                priorityColors[task.priority] || priorityColors.medium,
                "cursor-grab active:cursor-grabbing hover:shadow-md hover:ring-2 hover:ring-blue-400",
                isDragging && "opacity-70 ring-2 ring-blue-500 shadow-xl z-50 scale-105"
            )}
        >
            {/* Drag Handle Icon */}
            <div className="absolute left-1 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                <GripVertical className="w-3.5 h-3.5 text-slate-300" />
            </div>

            {/* Row 1: Project Code + Project Name + Status */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-bold text-blue-600 shrink-0">{task.project_code}</span>
                    <span className="text-slate-500 truncate text-[10px]" title={task.project_name}>
                        {task.project_name}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {task.assignment_status === 'requested' ? (
                        <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                            <Clock className="w-2.5 h-2.5" />
                            รอจ่าย
                        </span>
                    ) : (
                        <span className="flex items-center gap-0.5 text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            จ่ายแล้ว
                        </span>
                    )}
                </div>
            </div>

            {/* Row 2: Task Title (Description) */}
            <p className="font-medium text-slate-800 line-clamp-2 mb-1.5 leading-tight" title={task.title}>
                {task.title}
            </p>

            {/* Row 3: SA, PG, Usage */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                {/* SA (Reviewer) */}
                {task.reviewer_name && (
                    <div className="flex items-center gap-0.5" title="SA (Reviewer/ผู้ขอ)">
                        <span className="font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            SA: {task.reviewer_name.split(' ')[0]}
                        </span>
                    </div>
                )}

                {/* PG (Preferred/Assigned Programmer) */}
                {task.assignee_name && (
                    <div className="flex items-center gap-0.5" title="PG (โปรแกรมเมอร์ที่ต้องการ)">
                        <span className="font-medium text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
                            PG: {task.assignee_name.split(' ')[0]}
                        </span>
                    </div>
                )}

                {/* Usage (Estimated Hours) */}
                <div className="flex items-center gap-0.5 ml-auto" title="Usage (ชั่วโมง)">
                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {task.estimated_hours}h
                    </span>
                </div>
            </div>
        </div>
    )
}

interface ResourceDemandPanelProps {
    onRefresh?: () => void
    excludeTaskIds?: string[]  // Tasks to hide (already assigned)
    refreshTrigger?: number    // Increment to trigger reload
    startDate: string
    endDate: string
    dates: Date[]
    onTaskClick?: (task: UnassignedTask) => void
}

export function ResourceDemandPanel({ onRefresh, excludeTaskIds = [], refreshTrigger = 0, startDate, endDate, dates, onTaskClick }: ResourceDemandPanelProps) {
    const [tasks, setTasks] = useState<UnassignedTask[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAutoAssigning, setIsAutoAssigning] = useState(false)
    const [isAutoAssigningAll, setIsAutoAssigningAll] = useState(false)
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState<string>('all')
    const [selectedPositionType, setSelectedPositionType] = useState<'all' | 'PG' | 'SA_BA'>('PG')

    // Reload when date range changes
    useEffect(() => {
        loadTasks()
    }, [startDate, endDate])

    // Reload when refreshTrigger changes (background sync - don't show loading)
    useEffect(() => {
        if (refreshTrigger > 0) {
            loadTasksBackground()
        }
    }, [refreshTrigger])

    const loadTasks = async () => {
        setIsLoading(true)
        try {
            const result = await getUnassignedTasks({
                assignmentStatus: 'all'
            })
            if (result.success) {
                setTasks(result.data)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Background load - doesn't show loading spinner, keeps current data visible
    const loadTasksBackground = async () => {
        try {
            const result = await getUnassignedTasks({
                assignmentStatus: 'all'
            })
            if (result.success) {
                setTasks(result.data)
            }
        } catch (e) {
            // Silently fail on background refresh
        }
    }

    // Get unique projects for filter
    const projects = useMemo(() => {
        const uniqueProjects = new Map<string, string>()
        tasks.forEach(t => {
            uniqueProjects.set(t.project_code, t.project_name)
        })
        return Array.from(uniqueProjects.entries())
    }, [tasks])

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Hide tasks that have been assigned (optimistic removal)
            if (excludeTaskIds.includes(t.id)) return false
            if (selectedProject !== 'all' && t.project_code !== selectedProject) return false
            if (selectedAssignmentStatus !== 'all' && t.assignment_status !== selectedAssignmentStatus) return false
            // Filter by position type
            if (selectedPositionType === 'PG') {
                // Show tasks where assignee is PG or unassigned
                if (t.assignee_position_code && t.assignee_position_code !== 'PG') return false
            } else if (selectedPositionType === 'SA_BA') {
                // Show tasks where assignee is SA or BA
                if (!t.assignee_position_code || !['SA', 'BA'].includes(t.assignee_position_code)) return false
            }
            return true
        })
    }, [tasks, excludeTaskIds, selectedProject, selectedAssignmentStatus, selectedPositionType])

    // Get SA/BA tasks for auto assign
    const saBaTasks = useMemo(() => {
        return filteredTasks.filter(t =>
            t.assignee_position_code &&
            ['SA', 'BA'].includes(t.assignee_position_code) &&
            t.due_date
        )
    }, [filteredTasks])

    // Get ALL ready tasks (have both assignee and due_date, not yet assigned)
    const readyToAssignTasks = useMemo(() => {
        return filteredTasks.filter(t =>
            t.assignee_id &&
            t.due_date &&
            t.assignment_status !== 'assigned'
        )
    }, [filteredTasks])

    // Handle auto assign SA/BA tasks
    const handleAutoAssignSABA = async () => {
        if (saBaTasks.length === 0) {
            toast.info('ไม่มี Task ของ SA/BA ที่พร้อมจะ Assign')
            return
        }

        setIsAutoAssigning(true)
        const toastId = toast.loading(`กำลัง Auto Assign ${saBaTasks.length} tasks...`)

        try {
            const taskIds = saBaTasks.map(t => t.id)
            const result = await autoAssignSABATasks(taskIds)

            if (result.success) {
                toast.success(`Auto Assign สำเร็จ ${result.assignedCount} tasks`, { id: toastId })
                loadTasks()
                onRefresh?.()
            } else {
                toast.error(result.error || 'Auto Assign ล้มเหลว', { id: toastId })
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด', { id: toastId })
        } finally {
            setIsAutoAssigning(false)
        }
    }

    // Handle auto assign ALL ready tasks
    const handleAutoAssignAll = async () => {
        if (readyToAssignTasks.length === 0) {
            toast.info('ไม่มี Task ที่พร้อมจะ Assign')
            return
        }

        setIsAutoAssigningAll(true)
        const toastId = toast.loading(`กำลัง Auto Assign ${readyToAssignTasks.length} tasks...`)

        try {
            const taskIds = readyToAssignTasks.map(t => t.id)
            const result = await autoAssignAllReadyTasks(taskIds)

            if (result.success) {
                const message = result.skippedCount > 0
                    ? `Assign สำเร็จ ${result.assignedCount} tasks (ข้าม ${result.skippedCount})`
                    : `Assign สำเร็จ ${result.assignedCount} tasks`
                toast.success(message, { id: toastId })
                loadTasks()
                onRefresh?.()
            } else {
                toast.error(result.error || 'Auto Assign ล้มเหลว', { id: toastId })
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด', { id: toastId })
        } finally {
            setIsAutoAssigningAll(false)
        }
    }

    // Group tasks by date
    const groupedByDate = useMemo(() => {
        const groups = new Map<string, UnassignedTask[]>()
        const outsideRangeTasks: UnassignedTask[] = []
        const noDueDateTasks: UnassignedTask[] = []

        // Initialize all dates in range
        dates.forEach(d => {
            const dateStr = d.toISOString().split('T')[0]
            groups.set(dateStr, [])
        })

        filteredTasks.forEach(t => {
            if (t.due_date) {
                // Handle both string and Date object
                const dateStr = typeof t.due_date === 'string'
                    ? t.due_date.split('T')[0]
                    : new Date(t.due_date).toISOString().split('T')[0]
                if (groups.has(dateStr)) {
                    // Task is within current week
                    groups.get(dateStr)!.push(t)
                } else {
                    // Task is outside current week range
                    outsideRangeTasks.push(t)
                }
            } else {
                // Task has no due_date
                noDueDateTasks.push(t)
            }
        })

        return { byDate: groups, outsideRange: outsideRangeTasks, noDate: noDueDateTasks }
    }, [filteredTasks, dates])

    // Summary
    const summary = useMemo(() => {
        const totalHours = filteredTasks.reduce((sum, t) => sum + t.estimated_hours, 0)
        const requestedCount = tasks.filter(t => t.assignment_status === 'requested').length
        const assignedCount = tasks.filter(t => t.assignment_status === 'assigned').length
        return { total: filteredTasks.length, totalHours, requestedCount, assignedCount }
    }, [filteredTasks, tasks])

    // Format date for display
    const formatDateHeader = (date: Date) => {
        const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
        return {
            day: date.toLocaleDateString('th-TH', { weekday: 'short' }),
            date: date.getDate(),
            isToday
        }
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border shadow-sm">
            {/* Header */}
            <div className="px-3 py-2 border-b shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                            <Package className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Resource Demand</h3>
                            <p className="text-[10px] text-slate-500">
                                {new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { loadTasks(); onRefresh?.() }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                    </button>
                </div>

                {/* Summary */}
                <div className="flex flex-wrap gap-1.5 text-[10px] mb-2">
                    <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                        <span className="text-slate-500">รวม:</span>
                        <span className="font-bold text-slate-700">{summary.total}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="font-bold">{summary.requestedCount}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded text-green-700">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span className="font-bold">{summary.assignedCount}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
                        <span className="font-bold">{summary.totalHours}h</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-1.5">
                    {/* Position Type Filter - NEW */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
                        <button
                            onClick={() => setSelectedPositionType('all')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all",
                                selectedPositionType === 'all'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            ทั้งหมด
                        </button>
                        <button
                            onClick={() => setSelectedPositionType('PG')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all flex items-center justify-center gap-0.5",
                                selectedPositionType === 'PG'
                                    ? "bg-cyan-100 text-cyan-700 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            <Users className="w-2.5 h-2.5" />
                            PG
                        </button>
                        <button
                            onClick={() => setSelectedPositionType('SA_BA')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all flex items-center justify-center gap-0.5",
                                selectedPositionType === 'SA_BA'
                                    ? "bg-purple-100 text-purple-700 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            <Users className="w-2.5 h-2.5" />
                            SA/BA
                        </button>
                    </div>

                    {/* Assignment Status Filter */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
                        <button
                            onClick={() => setSelectedAssignmentStatus('all')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all",
                                selectedAssignmentStatus === 'all'
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            ทั้งหมด
                        </button>
                        <button
                            onClick={() => setSelectedAssignmentStatus('requested')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all flex items-center justify-center gap-0.5",
                                selectedAssignmentStatus === 'requested'
                                    ? "bg-amber-100 text-amber-700 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            <Clock className="w-2.5 h-2.5" />
                            รอจ่าย
                        </button>
                        <button
                            onClick={() => setSelectedAssignmentStatus('assigned')}
                            className={cn(
                                "flex-1 px-1.5 py-1 rounded font-medium transition-all flex items-center justify-center gap-0.5",
                                selectedAssignmentStatus === 'assigned'
                                    ? "bg-green-100 text-green-700 shadow-sm"
                                    : "text-slate-500"
                            )}
                        >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            จ่ายแล้ว
                        </button>
                    </div>

                    {/* Project Filter */}
                    <div className="relative">
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="w-full text-[10px] border rounded-lg px-2 py-1 pr-6 appearance-none bg-white"
                        >
                            <option value="all">All Projects ({tasks.length})</option>
                            {projects.map(([code, name]) => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Auto Assign All Button - Always visible when there are ready tasks */}
                    {readyToAssignTasks.length > 0 && (
                        <button
                            onClick={handleAutoAssignAll}
                            disabled={isAutoAssigningAll}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Zap className={cn("w-3 h-3", isAutoAssigningAll && "animate-pulse")} />
                            {isAutoAssigningAll ? 'กำลัง Assign...' : `Auto Assign ทั้งหมด (${readyToAssignTasks.length})`}
                        </button>
                    )}

                    {/* Auto Assign Button for SA/BA (only when SA_BA filter is selected) */}
                    {selectedPositionType === 'SA_BA' && saBaTasks.length > 0 && (
                        <button
                            onClick={handleAutoAssignSABA}
                            disabled={isAutoAssigning}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Zap className={cn("w-3 h-3", isAutoAssigning && "animate-pulse")} />
                            {isAutoAssigning ? 'กำลัง Assign...' : `Auto Assign SA/BA (${saBaTasks.length})`}
                        </button>
                    )}
                </div>
            </div>

            {/* Task List - Grouped by Date */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mb-2" />
                        <p className="text-xs">Loading...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Package className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">ไม่มี Task ในช่วงนี้</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {/* Tasks grouped by date */}
                        {dates.map(date => {
                            const dateStr = date.toISOString().split('T')[0]
                            const dateTasks = groupedByDate.byDate.get(dateStr) || []
                            const { day, date: dayNum, isToday } = formatDateHeader(date)
                            const totalHours = dateTasks.reduce((sum, t) => sum + t.estimated_hours, 0)

                            return (
                                <div key={dateStr} className={cn(
                                    "px-3 py-2",
                                    isToday && "bg-blue-50/50"
                                )}>
                                    {/* Date Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex flex-col items-center justify-center text-xs",
                                                isToday
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-100 text-slate-600"
                                            )}>
                                                <span className="text-[9px] font-medium leading-none">{day}</span>
                                                <span className="font-bold leading-none">{dayNum}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600 font-medium">
                                                    {dateTasks.length} tasks
                                                </span>
                                                {totalHours > 0 && (
                                                    <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-full text-amber-700 font-medium">
                                                        {totalHours}h
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tasks for this date */}
                                    {dateTasks.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {dateTasks.map(task => (
                                                <DemandTaskCard key={task.id} task={task} onClick={onTaskClick} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-400 text-center py-2 border border-dashed rounded-lg">
                                            ไม่มี Task
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Tasks outside current week range */}
                        {groupedByDate.outsideRange.length > 0 && (
                            <div className="px-3 py-2 bg-orange-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-orange-700">สัปดาห์อื่น</span>
                                        <span className="text-[10px] bg-orange-200 px-1.5 py-0.5 rounded-full text-orange-700 font-medium">
                                            {groupedByDate.outsideRange.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {groupedByDate.outsideRange.map(task => (
                                        <DemandTaskCard key={task.id} task={task} onClick={onTaskClick} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tasks without due date */}
                        {groupedByDate.noDate.length > 0 && (
                            <div className="px-3 py-2 bg-slate-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-slate-600">ยังไม่กำหนดวัน</span>
                                        <span className="text-[10px] bg-slate-300 px-1.5 py-0.5 rounded-full text-slate-600 font-medium">
                                            {groupedByDate.noDate.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {groupedByDate.noDate.map(task => (
                                        <DemandTaskCard key={task.id} task={task} onClick={onTaskClick} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
