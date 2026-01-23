'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Calendar,
    Users,
    Filter,
    Briefcase
} from 'lucide-react'
import {
    getWeeklyWorkloadByEmployee,
    getProjectsForDailyWorkload,
    WeeklyWorkloadData,
    EmployeeWeeklyWorkload,
    WeeklyTaskEntry
} from '@/lib/actions/daily-workload-actions'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { th } from 'date-fns/locale'

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

export function WeeklyWorkloadTable() {
    const [weekStart, setWeekStart] = useState(() => {
        // Get Monday of current week
        const today = new Date()
        const day = today.getDay()
        const diff = day === 0 ? -6 : 1 - day
        const monday = new Date(today)
        monday.setDate(today.getDate() + diff)
        return monday.toISOString().split('T')[0]
    })

    const [workloadData, setWorkloadData] = useState<WeeklyWorkloadData | null>(null)
    const [projects, setProjects] = useState<{ id: string; project_code: string; name: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('PG')
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)

    useEffect(() => {
        loadProjects()
    }, [])

    useEffect(() => {
        loadData()
    }, [weekStart, positionFilter, selectedProject])

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

            const result = await getWeeklyWorkloadByEmployee(weekStart, {
                positionCodes,
                projectIds
            })

            if (result.success && result.data) {
                setWorkloadData(result.data)
            } else {
                toast.error(result.error || 'ไม่สามารถโหลดข้อมูลได้')
            }
        } catch (e) {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
        } finally {
            setIsLoading(false)
        }
    }

    const navigateWeek = (direction: 'prev' | 'next') => {
        const current = new Date(weekStart)
        const newDate = direction === 'next' ? addWeeks(current, 1) : subWeeks(current, 1)
        setWeekStart(newDate.toISOString().split('T')[0])
    }

    const goToCurrentWeek = () => {
        const today = new Date()
        const day = today.getDay()
        const diff = day === 0 ? -6 : 1 - day
        const monday = new Date(today)
        monday.setDate(today.getDate() + diff)
        setWeekStart(monday.toISOString().split('T')[0])
    }

    const projectOptions = useMemo<Option[]>(() => {
        return projects.map(p => ({
            value: p.id,
            label: `${p.project_code} - ${p.name}`
        }))
    }, [projects])

    const getPositionBadgeColor = (code: string) => {
        switch (code) {
            case 'SA': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'BA': return 'bg-cyan-100 text-cyan-700 border-cyan-200'
            case 'PG': return 'bg-green-100 text-green-700 border-green-200'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    // Group employees by position
    const employeesByPosition = useMemo(() => {
        if (!workloadData) return {}
        const grouped: Record<string, EmployeeWeeklyWorkload[]> = {}
        workloadData.employees.forEach(emp => {
            if (!grouped[emp.position_code]) {
                grouped[emp.position_code] = []
            }
            grouped[emp.position_code].push(emp)
        })
        return grouped
    }, [workloadData])

    const positionOrder = ['PG', 'SA', 'BA']

    // Format date for display
    const formatDateRange = () => {
        if (!workloadData) return ''
        const start = new Date(workloadData.week_start)
        const end = new Date(workloadData.week_end)
        return `${format(start, 'd MMM', { locale: th })} - ${format(end, 'd MMM yyyy', { locale: th })}`
    }

    const renderTasksCell = (tasks: WeeklyTaskEntry[], totalHours: number) => {
        if (tasks.length === 0) {
            return <span className="text-slate-300">-</span>
        }

        // Group by project and get project name
        const byProject: Record<string, { tasks: WeeklyTaskEntry[]; projectName: string }> = {}
        tasks.forEach(t => {
            if (!byProject[t.project_code]) {
                byProject[t.project_code] = { tasks: [], projectName: t.project_name }
            }
            byProject[t.project_code].tasks.push(t)
        })

        return (
            <div className="space-y-1.5">
                {Object.entries(byProject).map(([projectCode, { tasks: projectTasks, projectName }]) => {
                    const projectHours = projectTasks.reduce((sum, t) => sum + t.estimated_hours, 0)
                    return (
                        <div key={projectCode} className="text-xs border-l-2 border-slate-300 pl-2">
                            <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                    <div className="font-medium text-slate-700" title={projectCode}>
                                        {projectCode}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[100px]" title={projectName}>
                                        {projectName}
                                    </div>
                                </div>
                                <span className="text-slate-700 shrink-0 font-bold text-base">
                                    {projectHours}h
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                {/* Week Navigation */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-700">
                            {formatDateRange()}
                        </span>
                    </div>

                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>

                    <button
                        onClick={goToCurrentWeek}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        สัปดาห์นี้
                    </button>

                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")} />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    {/* Position Filter */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setPositionFilter('all')}
                            className={cn(
                                "px-3 py-1.5 text-sm rounded-md transition-all",
                                positionFilter === 'all'
                                    ? "bg-white shadow text-slate-900 font-medium"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Users className="w-4 h-4 inline-block mr-1" />
                            ทั้งหมด
                        </button>
                        {['SA', 'BA', 'PG'].map(pos => (
                            <button
                                key={pos}
                                onClick={() => setPositionFilter(pos as PositionFilter)}
                                className={cn(
                                    "px-3 py-1.5 text-sm rounded-md transition-all",
                                    positionFilter === pos
                                        ? "bg-white shadow text-slate-900 font-medium"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                {pos}
                            </button>
                        ))}
                    </div>

                    {/* Project Filter */}
                    <div className="w-64">
                        <SmartCombobox
                            options={projectOptions}
                            value={selectedProject}
                            onChange={setSelectedProject}
                            placeholder="เลือกโครงการ..."
                            searchPlaceholder="ค้นหาโครงการ..."
                            emptyMessage="ไม่พบโครงการ"
                            isClearable
                        />
                    </div>
                </div>
            </div>

            {/* Workload Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 bg-white rounded-lg border">
                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
            ) : !workloadData || workloadData.employees.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg border text-slate-400">
                    ไม่พบข้อมูล Workload
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 min-w-[50px] border-r">
                                        No
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-[50px] bg-slate-50 min-w-[180px] border-r">
                                        Name
                                    </th>
                                    {workloadData.date_headers.map((header, idx) => {
                                        const dateNum = new Date(header.date).getDate()
                                        return (
                                            <th
                                                key={header.date}
                                                className={cn(
                                                    "text-center px-3 py-3 font-semibold text-slate-700 min-w-[120px]",
                                                    idx < workloadData.date_headers.length - 1 && "border-r"
                                                )}
                                            >
                                                <div>{dateNum}</div>
                                                <div className="text-xs font-normal text-slate-500">
                                                    {header.day_name}
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {positionOrder.map(posCode => {
                                    const emps = employeesByPosition[posCode] || []
                                    if (emps.length === 0) return null

                                    return emps.map((emp, empIdx) => (
                                        <tr
                                            key={emp.employee_id}
                                            className={cn(
                                                "border-b hover:bg-slate-50/50 transition-colors",
                                                empIdx === emps.length - 1 && "border-b-2"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center text-slate-500 sticky left-0 bg-white border-r">
                                                {empIdx + 1}
                                            </td>
                                            <td className="px-4 py-3 sticky left-[50px] bg-white border-r">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0",
                                                        getPositionBadgeColor(emp.position_code)
                                                    )}>
                                                        {emp.position_code}
                                                    </span>
                                                    <span className="font-medium text-slate-700 truncate">
                                                        {emp.employee_name}
                                                    </span>
                                                </div>
                                            </td>
                                            {emp.days.map((day, dayIdx) => (
                                                <td
                                                    key={day.date}
                                                    className={cn(
                                                        "px-3 py-2 align-top",
                                                        dayIdx < emp.days.length - 1 && "border-r",
                                                        // Yellow background if no tasks
                                                        day.tasks.length === 0 && "bg-yellow-50/50"
                                                    )}
                                                >
                                                    {renderTasksCell(day.tasks, day.total_hours)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    )
}
