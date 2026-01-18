'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Clock,
    CheckCircle2,
    Circle,
    AlertCircle,
    Users,
    Filter,
    Briefcase
} from 'lucide-react'
import {
    getDailyWorkload,
    getWorkloadByPosition,
    getProjectsForDailyWorkload,
    DailyWorkloadSummary,
    DailyTaskItem,
    PositionWorkloadSummary
} from '@/lib/actions/daily-workload-actions'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

export function DailyTaskWorkloadView() {
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })
    const [workloadData, setWorkloadData] = useState<DailyWorkloadSummary | null>(null)
    const [positionSummary, setPositionSummary] = useState<PositionWorkloadSummary[]>([])
    const [projects, setProjects] = useState<{ id: string; project_code: string; name: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('PG')
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)

    useEffect(() => {
        loadProjects()
    }, [])

    useEffect(() => {
        loadData()
    }, [selectedDate, positionFilter, selectedProject])

    const loadProjects = async () => {
        const result = await getProjectsForDailyWorkload()
        if (result.success) {
            setProjects(result.data)
        }
    }

    const loadData = async () => {
        setIsLoading(true)
        try {
            const positionCodes = positionFilter === 'all' ? ['SA', 'BA', 'PG'] : [positionFilter]
            const projectIds = selectedProject?.value ? [String(selectedProject.value)] : undefined

            const [workloadResult, positionResult] = await Promise.all([
                getDailyWorkload(selectedDate, { positionCodes, projectIds }),
                getWorkloadByPosition(selectedDate)
            ])

            if (workloadResult.success) {
                setWorkloadData(workloadResult.data)
            }
            if (positionResult.success) {
                setPositionSummary(positionResult.data)
            }
        } catch (e) {
            toast.error("ไม่สามารถโหลดข้อมูลได้")
        } finally {
            setIsLoading(false)
        }
    }

    const navigateDate = (direction: 'prev' | 'next') => {
        const current = new Date(selectedDate)
        current.setDate(current.getDate() + (direction === 'next' ? 1 : -1))
        setSelectedDate(current.toISOString().split('T')[0])
    }

    const goToToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0])
    }

    // Summary calculations
    const totalSummary = useMemo(() => {
        if (positionSummary.length === 0) return null

        const filteredPositions = positionFilter === 'all'
            ? positionSummary
            : positionSummary.filter(p => p.position_code === positionFilter)

        return {
            totalCapacity: filteredPositions.reduce((sum, p) => sum + p.total_capacity_hours, 0),
            booked: filteredPositions.reduce((sum, p) => sum + p.booked_hours, 0),
            remaining: filteredPositions.reduce((sum, p) => sum + p.remaining_hours, 0)
        }
    }, [positionSummary, positionFilter])

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        if (!workloadData?.tasks) return []
        return workloadData.tasks
    }, [workloadData])

    // Group tasks by project
    const tasksByProject = useMemo(() => {
        const grouped: Record<string, DailyTaskItem[]> = {}
        filteredTasks.forEach(task => {
            const key = task.project_code
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(task)
        })
        return grouped
    }, [filteredTasks])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200'
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'low': return 'bg-slate-100 text-slate-600 border-slate-200'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    const getStatusIcon = (task: DailyTaskItem) => {
        if (task.is_completed) return <CheckCircle2 className="w-4 h-4 text-green-500" />
        if (task.is_planned) return <Circle className="w-4 h-4 text-blue-500" />
        return <AlertCircle className="w-4 h-4 text-amber-500" />
    }

    const getPositionBadgeColor = (code: string | null) => {
        switch (code) {
            case 'SA': return 'bg-purple-100 text-purple-700'
            case 'BA': return 'bg-cyan-100 text-cyan-700'
            case 'PG': return 'bg-emerald-100 text-emerald-700'
            default: return 'bg-slate-100 text-slate-600'
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header Card with Summary */}
            <div className="bg-white rounded-xl border shadow-sm">
                {/* Date Navigation & Filters */}
                <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Daily Task Workload</h2>
                            <p className="text-sm text-slate-500">
                                {formatDate(selectedDate)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Project Filter - SmartCombobox */}
                        <div className="w-[280px]">
                            <SmartCombobox
                                options={[
                                    { value: '', label: 'ทุกโครงการ' },
                                    ...projects.map(p => ({
                                        value: p.id,
                                        label: `${p.project_code} - ${p.name}`
                                    }))
                                ]}
                                value={selectedProject}
                                onChange={(option) => setSelectedProject(option)}
                                placeholder="เลือกโครงการ..."
                                searchable={true}
                                maxDisplayItems={15}
                            />
                        </div>

                        {/* Position Filter Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['all', 'SA', 'BA', 'PG'] as PositionFilter[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setPositionFilter(tab)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        positionFilter === tab
                                            ? "bg-white text-slate-800 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {tab === 'all' ? 'ทั้งหมด' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Date Navigation */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 border-r">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={goToToday} className="px-3 py-1.5 hover:bg-slate-50 text-sm font-medium text-slate-600">
                                วันนี้
                            </button>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 border-l">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={loadData}
                            className="p-2 hover:bg-slate-100 rounded-lg border text-slate-500"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                {totalSummary && (
                    <div className="p-4 grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                <Users className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-blue-700">{totalSummary.totalCapacity}</p>
                                <p className="text-sm text-blue-600">ชั่วโมงทั้งหมด</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                <Briefcase className="w-7 h-7 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-amber-700">{totalSummary.booked}</p>
                                <p className="text-sm text-amber-600">จองแล้ว</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                <Clock className="w-7 h-7 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-emerald-700">{totalSummary.remaining}</p>
                                <p className="text-sm text-emerald-600">คงเหลือ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Position Breakdown */}
                {positionSummary.length > 0 && positionFilter === 'all' && (
                    <div className="px-4 pb-4">
                        <div className="grid grid-cols-3 gap-3">
                            {positionSummary.filter(p => ['SA', 'BA', 'PG'].includes(p.position_code)).map(pos => (
                                <div
                                    key={pos.position_code}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-semibold",
                                            getPositionBadgeColor(pos.position_code)
                                        )}>
                                            {pos.position_code}
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {pos.employee_count} คน
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-slate-700">
                                            {pos.booked_hours}/{pos.total_capacity_hours}h
                                        </span>
                                        <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    pos.total_capacity_hours > 0 && (pos.booked_hours / pos.total_capacity_hours) > 0.9
                                                        ? "bg-red-500"
                                                        : pos.total_capacity_hours > 0 && (pos.booked_hours / pos.total_capacity_hours) > 0.7
                                                            ? "bg-amber-500"
                                                            : "bg-emerald-500"
                                                )}
                                                style={{
                                                    width: `${Math.min(100, pos.total_capacity_hours > 0 ? (pos.booked_hours / pos.total_capacity_hours) * 100 : 0)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                {/* Table Header */}
                <div className="bg-slate-50 border-b px-4 py-3 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <div className="col-span-1">Project</div>
                    <div className="col-span-2">Project Name</div>
                    <div className="col-span-3">Task</div>
                    <div className="col-span-1 text-center">PG</div>
                    <div className="col-span-1 text-center">SA</div>
                    <div className="col-span-1 text-center">Plan</div>
                    <div className="col-span-1 text-center">Done</div>
                    <div className="col-span-2 text-center">Hours</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Calendar className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">ไม่มี Task ในวันนี้</p>
                            <p className="text-sm">ลองเลือกวันอื่นหรือเปลี่ยนตัวกรอง</p>
                        </div>
                    ) : (
                        Object.entries(tasksByProject).map(([projectCode, tasks]) => (
                            <div key={projectCode} className="border-b last:border-b-0">
                                {tasks.map((task, idx) => (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-blue-50/50 transition-colors",
                                            idx > 0 && "border-t border-dashed border-slate-100"
                                        )}
                                    >
                                        {/* Project Code */}
                                        <div className="col-span-1">
                                            {idx === 0 && (
                                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                    {task.project_code}
                                                </span>
                                            )}
                                        </div>

                                        {/* Project Name */}
                                        <div className="col-span-2">
                                            {idx === 0 && (
                                                <span className="text-sm text-slate-700 font-medium truncate block">
                                                    {task.project_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Task Title */}
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                                                    getPriorityColor(task.priority)
                                                )}>
                                                    {task.priority.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="text-sm text-slate-700 truncate">
                                                    {task.task_code}: {task.title}
                                                </span>
                                            </div>
                                        </div>

                                        {/* PG (Assignee) */}
                                        <div className="col-span-1 text-center">
                                            {task.assignee_position_code === 'PG' && task.assignee_name ? (
                                                <span className="text-xs text-emerald-600 font-medium">
                                                    {task.assignee_name.split(' ')[0]}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300">-</span>
                                            )}
                                        </div>

                                        {/* SA (Reviewer) */}
                                        <div className="col-span-1 text-center">
                                            {task.reviewer_name ? (
                                                <span className="text-xs text-purple-600 font-medium">
                                                    {task.reviewer_name.split(' ')[0]}
                                                </span>
                                            ) : task.assignee_position_code === 'SA' && task.assignee_name ? (
                                                <span className="text-xs text-purple-600 font-medium">
                                                    {task.assignee_name.split(' ')[0]}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300">-</span>
                                            )}
                                        </div>

                                        {/* Plan Status */}
                                        <div className="col-span-1 flex justify-center">
                                            {task.is_planned ? (
                                                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </span>
                                            ) : (
                                                <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Complete Status */}
                                        <div className="col-span-1 flex justify-center">
                                            {task.is_completed ? (
                                                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                                </span>
                                            ) : (
                                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Circle className="w-4 h-4 text-slate-300" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Hours */}
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="font-semibold text-slate-700">{task.estimated_hours}</span>
                                                <span className="text-slate-400">h</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Summary */}
                {!isLoading && filteredTasks.length > 0 && (
                    <div className="bg-slate-50 border-t px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>
                                <strong>{filteredTasks.length}</strong> Tasks
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <strong>{filteredTasks.filter(t => t.is_planned).length}</strong> วางแผนแล้ว
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                <strong>{filteredTasks.filter(t => t.is_completed).length}</strong> เสร็จแล้ว
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                                รวม <strong className="text-slate-800">{filteredTasks.reduce((sum, t) => sum + t.estimated_hours, 0)}</strong> ชั่วโมง
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
