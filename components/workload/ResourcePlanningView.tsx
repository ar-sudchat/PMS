'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react'
import { getTeamWorkloadForDateRange, EmployeeWorkload, reassignTask, getUnassignedTasks, UnassignedTask, unassignTask } from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { cn } from '@/lib/utils'
import { EmployeeWorkloadCard } from './EmployeeWorkloadCard'
import { ResourceDemandPanel } from './ResourceDemandPanel'
import { ResizablePanelLayout } from './ResizablePanelLayout'
import { toast } from 'sonner'
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
} from '@dnd-kit/core'
import { TaskCard } from './TaskCard'
import { TaskEditModal } from './TaskEditModal'

// Helper to disable touch action for dnd
class SmartPointerSensor extends PointerSensor {
    static activators = [{
        eventName: 'onPointerDown' as const, handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
            if (!event.isPrimary || event.button !== 0 || isInteractiveElement(event.target as HTMLElement)) {
                return false;
            }
            return true;
        }
    }]
}

function isInteractiveElement(element: HTMLElement | null) {
    const interactiveElements = ['button', 'input', 'textarea', 'select', 'option'];
    while (element) {
        if (interactiveElements.includes(element.tagName.toLowerCase())) return true;
        element = element.parentElement;
    }
    return false;
}

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

export function ResourcePlanningView() {
    // States for workload
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

    // States for demand panel
    const [demandTasks, setDemandTasks] = useState<UnassignedTask[]>([])
    const [demandRefreshKey, setDemandRefreshKey] = useState(0)

    // DnD States
    const [activeId, setActiveId] = useState<string | null>(null)
    const [dragData, setDragData] = useState<any>(null)

    const sensors = useSensors(
        useSensor(SmartPointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const endDate = useMemo(() => {
        const start = new Date(startDate)
        const end = new Date(start)
        end.setDate(start.getDate() + 4)
        return end.toISOString().split('T')[0]
    }, [startDate])

    const dates = useMemo(() => {
        const d = []
        let current = new Date(startDate)
        const end = new Date(endDate)
        while (current <= end) {
            d.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        return d
    }, [startDate, endDate])

    useEffect(() => {
        loadData()
    }, [startDate])

    const loadData = useCallback(async () => {
        setIsLoading(true)
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
            setIsLoading(false)
        }
    }, [startDate, endDate])

    const refreshDemandPanel = useCallback(() => {
        setDemandRefreshKey(k => k + 1)
    }, [])

    const navigateWeek = (direction: 'prev' | 'next') => {
        const current = new Date(startDate)
        current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
        setStartDate(current.toISOString().split('T')[0])
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
        setDragData(event.active.data.current)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setDragData(null)

        if (!over) return

        const taskId = active.id as string
        const [employeeId, dateStr] = (over.id as string).split(':')

        if (!employeeId || !dateStr) return

        const toastId = toast.loading("Assigning task...")

        const result = await reassignTask(taskId, employeeId, dateStr)

        if (result.success) {
            toast.success("Task assigned successfully", { id: toastId })
            if (result.warning) {
                toast.warning(result.warning, { duration: 5000 })
            }
            // Refresh both panels
            loadData()
            refreshDemandPanel()
        } else {
            toast.error(result.error || "Failed to assign task", { id: toastId })
        }
    }

    // Handle unassign task
    const handleUnassignTask = async (taskId: string) => {
        const toastId = toast.loading("กำลังถอนงาน...")

        const result = await unassignTask(taskId, false) // Keep due_date

        if (result.success) {
            toast.success("ถอนงานสำเร็จ", { id: toastId })
            // Refresh both panels
            loadData()
            refreshDemandPanel()
        } else {
            toast.error(result.error || "ถอนงานล้มเหลว", { id: toastId })
        }
    }

    const filteredEmployees = useMemo(() => {
        if (activeTab === 'all') return employees
        return employees.filter(emp => emp.position_code === activeTab)
    }, [employees, activeTab])

    const positionCounts = useMemo(() => {
        return {
            all: employees.length,
            SA: employees.filter(e => e.position_code === 'SA').length,
            BA: employees.filter(e => e.position_code === 'BA').length,
            PG: employees.filter(e => e.position_code === 'PG').length
        }
    }, [employees])

    // Summary calculation for Team Workload
    const summary = useMemo(() => {
        if (!filteredEmployees.length || !config) return null

        const hoursPerDay = config.workingHoursPerDay || 8
        const totalDays = dates.length
        const totalCapacity = filteredEmployees.length * hoursPerDay * totalDays

        let totalAllocated = 0
        let overloadedCount = 0

        filteredEmployees.forEach(emp => {
            emp.daily_workload?.forEach(day => {
                totalAllocated += day.assigned_hours || 0
                if ((day.assigned_hours || 0) > hoursPerDay) {
                    overloadedCount++
                }
            })
        })

        const totalAvailable = Math.max(0, totalCapacity - totalAllocated)
        const allocatedPercent = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0

        return {
            totalCapacity,
            totalAllocated,
            totalAvailable,
            allocatedPercent,
            overloadedCount
        }
    }, [filteredEmployees, config, dates])

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<any>(null) // Using any for now to map between different task types

    const handleTaskClick = (task: any) => {
        // Map incoming task to TaskEditModal format
        // TaskEditModal expects: { id, title, projectCode, projectName, hours, start, end, employeeId, reviewerId }
        const mappedTask = {
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
        setEditingTask(mappedTask)
        setIsEditModalOpen(true)
    }

    const handleTaskUpdate = () => {
        loadData()
        refreshDemandPanel() // Refresh left panel too
    }

    // Left Panel - Resource Demand
    const leftPanel = (
        <ResourceDemandPanel
            key={demandRefreshKey}
            onRefresh={loadData}
            startDate={startDate}
            endDate={endDate}
            dates={dates}
            onTaskClick={handleTaskClick}
        />
    )

    // Right Panel - Team Workload
    const rightPanel = (
        <div className="h-full flex flex-col">
            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
                    <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="font-bold text-base">👥</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{summary.totalCapacity}h</h3>
                            <p className="text-xs text-slate-500">Total Capacity</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="font-bold text-base">🎯</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{summary.totalAllocated}h</h3>
                            <p className="text-xs text-slate-500">Allocated ({summary.allocatedPercent}%)</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                            <span className="font-bold text-base">🕒</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{summary.totalAvailable}h</h3>
                            <p className="text-xs text-slate-500">Available</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                            <span className="font-bold text-base">⚠️</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{summary.overloadedCount}</h3>
                            <p className="text-xs text-slate-500">Overloaded</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-3 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Team Workload</h2>
                            <p className="text-xs text-slate-500">
                                {new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
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

                        <div className="flex items-center border rounded-lg overflow-hidden">
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
                            }} className="px-2 hover:bg-slate-50 text-xs font-medium text-slate-600">
                                Today
                            </button>
                            <button onClick={() => navigateWeek('next')} className="p-1.5 hover:bg-slate-50 border-l">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button onClick={loadData} className="p-1.5 hover:bg-slate-100 rounded-lg border ml-2 text-slate-500">
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="min-w-[1000px] p-4">
                        {/* Global Week Header */}
                        <div className="grid grid-cols-[280px_repeat(5,1fr)_100px] gap-3 mb-3 px-3">
                            <div className="font-semibold text-slate-500 text-xs flex items-end pb-1">Employee</div>
                            {dates.map((date) => {
                                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                                return (
                                    <div key={date.toISOString()} className={cn(
                                        "rounded-lg p-1.5 text-center transition-colors",
                                        isToday ? "bg-blue-600 text-white shadow-md" : "bg-white border text-slate-600"
                                    )}>
                                        <div className={cn("text-[10px] font-medium uppercase", isToday ? "text-blue-100" : "text-slate-400")}>
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </div>
                                        <div className="text-lg font-bold leading-none">
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )
                            })}
                            <div className="font-semibold text-slate-500 text-xs text-right flex items-end justify-end pb-1">Util.</div>
                        </div>

                        {/* Employee Rows */}
                        <div className="space-y-2">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mb-3" />
                                    <p className="text-sm">Loading workload data...</p>
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed">
                                    <Filter className="w-6 h-6 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">No employees found for this filter</p>
                                </div>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <EmployeeWorkloadCard
                                        key={emp.employee_id}
                                        employee={emp}
                                        config={config}
                                        dates={dates}
                                        isSelected={false}
                                        onSelect={() => { }}
                                        onTaskClick={handleTaskClick}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <ResizablePanelLayout
                leftPanel={leftPanel}
                rightPanel={rightPanel}
                defaultLeftWidth={25}
                minLeftWidth={18}
                maxLeftWidth={40}
            />

            <TaskEditModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                task={editingTask}
                onSaved={handleTaskUpdate}
            />
        </>
    )
}
