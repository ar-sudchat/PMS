'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react'
import { getTeamWorkloadForDateRange, EmployeeWorkload, reassignTask } from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { cn } from '@/lib/utils'
import { EmployeeWorkloadCard } from './EmployeeWorkloadCard'
import { toast } from 'sonner'
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { TaskCard } from './TaskCard'
import { ImpactAnalysisModal } from './ImpactAnalysisModal'

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

export function TeamWorkloadView() {
    const [startDate, setStartDate] = useState(() => {
        const today = new Date()
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        const monday = new Date(today)
        monday.setDate(diff)
        return monday.toISOString().split('T')[0]
    })
    const [employees, setEmployees] = useState<EmployeeWorkload[]>([])
    const [config, setConfig] = useState<WorkloadConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<PositionFilter>('all')
    const [activeId, setActiveId] = useState<string | null>(null)
    const [dragData, setDragData] = useState<any>(null)

    const sensors = useSensors(
        useSensor(SmartPointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const endDate = (() => {
        const start = new Date(startDate)
        const end = new Date(start)
        end.setDate(start.getDate() + 4) // 5 days (Mon-Fri)
        return end.toISOString().split('T')[0]
    })()

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

    const loadData = async () => {
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
    }

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

        // Optimistic UI could happen here, but for safety lets wait API
        const toastId = toast.loading("Updating assignment...")

        const result = await reassignTask(taskId, employeeId, dateStr)

        if (result.success) {
            toast.success("Task reassigned", { id: toastId })
            if (result.warning) {
                toast.warning(result.warning, { duration: 5000 })
            }
            loadData() // Refresh data
        } else {
            toast.error(result.error || "Failed to reassign task", { id: toastId })
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

    // Summary Calculations
    const summary = useMemo(() => {
        if (!config || employees.length === 0) return null

        const totalCapacity = employees.length * config.workingHoursPerDay * 5 // 5 days
        const totalAllocated = employees.reduce((sum, e) => sum + e.total_assigned_hours, 0)
        const totalAvailable = Math.max(0, totalCapacity - totalAllocated)
        const overloadedCount = employees.filter(e => e.average_workload_percent > 100).length
        const availableCount = employees.filter(e => e.average_workload_percent < 70).length // Using 70 as per typical warning threshold

        return {
            totalCapacity,
            totalAllocated,
            totalAvailable,
            overloadedCount,
            availableCount,
            allocatedPercent: Math.round((totalAllocated / totalCapacity) * 100)
        }

    }, [employees, config])

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-6">

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">👥</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{summary.totalCapacity}h</h3>
                                <p className="text-xs text-slate-500">Total Capacity</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">🎯</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{summary.totalAllocated}h</h3>
                                <p className="text-xs text-slate-500">Allocated ({summary.allocatedPercent}%)</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <span className="font-bold text-lg">🕒</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{summary.totalAvailable}h</h3>
                                <p className="text-xs text-slate-500">Available • {summary.availableCount} people</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                <span className="font-bold text-lg">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{summary.overloadedCount}</h3>
                                <p className="text-xs text-slate-500">Overloaded</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border shadow-sm flex flex-col h-[calc(100vh-280px)]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Resource Planning</h2>
                                <p className="text-sm text-slate-500">
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
                                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                            activeTab === tab
                                                ? "bg-white text-slate-800 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {tab === 'all' ? 'All Roles' : tab}
                                        <span className="ml-1.5 bg-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">
                                            {positionCounts[tab]}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center border rounded-lg overflow-hidden">
                                <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-slate-50 border-r">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => setStartDate(new Date().toISOString().split('T')[0])} className="px-3 hover:bg-slate-50 text-sm font-medium text-slate-600">
                                    Today
                                </button>
                                <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-slate-50 border-l">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg border ml-2 text-slate-500">
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            </button>
                        </div>
                    </div>


                    {/* Content Grid */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/50">
                        <div className="min-w-[1000px] p-6">
                            {/* Global Week Header */}
                            <div className="grid grid-cols-[300px_repeat(5,1fr)_120px] gap-4 mb-4 px-4">
                                <div className="font-semibold text-slate-500 text-sm flex items-end pb-2">Employee</div>
                                {dates.map((date) => {
                                    const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                                    return (
                                        <div key={date.toISOString()} className={cn(
                                            "rounded-lg p-2 text-center transition-colors",
                                            isToday ? "bg-blue-600 text-white shadow-md scale-105 origin-bottom" : "bg-white border text-slate-600"
                                        )}>
                                            <div className={cn("text-xs font-medium uppercase mb-0.5", isToday ? "text-blue-100" : "text-slate-400")}>
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div className="text-xl font-bold leading-none">
                                                {date.getDate()}
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className="font-semibold text-slate-500 text-sm text-right flex items-end justify-end pb-2">Utilization</div>
                            </div>

                            {/* Employee Rows */}
                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                        <p>Loading workload data...</p>
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed">
                                        <Filter className="w-8 h-8 mx-auto mb-4 opacity-50" />
                                        <p>No employees found for this filter</p>
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
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeId && dragData ? (
                    <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                        <TaskCard
                            id={activeId}
                            title={dragData.title}
                            hours={dragData.hours}
                            priority={dragData.priority}
                            status="Dragging"
                            projectCode={dragData.projectCode}
                            isLocked={dragData.isLocked}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
