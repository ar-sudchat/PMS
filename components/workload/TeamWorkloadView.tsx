'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getTeamWorkloadForDateRange, EmployeeWorkload } from '@/lib/actions/workload-actions'
import { getWorkloadConfig, WorkloadConfig } from '@/lib/actions/config-actions'
import { WorkloadBar } from './WorkloadBar'
import { cn } from '@/lib/utils'

type PositionFilter = 'all' | 'SA' | 'BA' | 'PG'

export function TeamWorkloadView() {
    const [startDate, setStartDate] = useState(() => {
        const today = new Date()
        const monday = new Date(today)
        monday.setDate(today.getDate() - today.getDay() + 1)
        return monday.toISOString().split('T')[0]
    })
    const [employees, setEmployees] = useState<EmployeeWorkload[]>([])
    const [config, setConfig] = useState<WorkloadConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<PositionFilter>('all')

    const endDate = (() => {
        const end = new Date(startDate)
        end.setDate(end.getDate() + 4) // 5 days (Mon-Fri)
        return end.toISOString().split('T')[0]
    })()

    useEffect(() => {
        loadData()
    }, [startDate])

    const loadData = async () => {
        setIsLoading(true)

        const [configResult, teamResult] = await Promise.all([
            getWorkloadConfig(),
            getTeamWorkloadForDateRange(startDate, endDate)
        ])

        if (configResult.success) setConfig(configResult.data)
        if (teamResult.success) setEmployees(teamResult.data)

        setIsLoading(false)
    }

    const navigateWeek = (direction: 'prev' | 'next') => {
        const current = new Date(startDate)
        current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
        setStartDate(current.toISOString().split('T')[0])
    }

    const getDates = () => {
        const dates = []
        const current = new Date(startDate)
        for (let i = 0; i < 5; i++) {
            dates.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        return dates
    }

    const dates = getDates()

    // Filter employees by position
    const filteredEmployees = useMemo(() => {
        if (activeTab === 'all') return employees
        return employees.filter(emp => emp.position_code === activeTab)
    }, [employees, activeTab])

    // Count by position
    const positionCounts = useMemo(() => {
        const counts = {
            all: employees.length,
            SA: employees.filter(e => e.position_code === 'SA').length,
            BA: employees.filter(e => e.position_code === 'BA').length,
            PG: employees.filter(e => e.position_code === 'PG').length
        }
        return counts
    }, [employees])

    return (
        <div className="bg-white rounded-xl border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">📊 Team Workload</h2>
                    {config && (
                        <span className="text-sm text-slate-500">
                            ⚙️ {config.workingHoursPerDay}h/day
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 hover:bg-slate-100 rounded"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium px-3">
                        {new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 hover:bg-slate-100 rounded"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2 hover:bg-slate-100 rounded ml-2"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Position Tabs */}
            <div className="px-6 py-3 border-b bg-slate-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'all'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        All ({positionCounts.all})
                    </button>
                    <button
                        onClick={() => setActiveTab('SA')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'SA'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        System Analyst ({positionCounts.SA})
                    </button>
                    <button
                        onClick={() => setActiveTab('BA')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'BA'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        Business Analyst ({positionCounts.BA})
                    </button>
                    <button
                        onClick={() => setActiveTab('PG')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'PG'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        Programmer ({positionCounts.PG})
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-48">
                                Employee
                            </th>
                            {dates.map((date) => (
                                <th key={date.toISOString()} className="px-2 py-3 text-center text-sm font-medium text-slate-600 w-24">
                                    <div>{date.toLocaleDateString('th-TH', { weekday: 'short' })}</div>
                                    <div className="text-xs text-slate-400">
                                        {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-24">
                                Avg
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                    {activeTab === 'all'
                                        ? 'No data available'
                                        : `No ${activeTab} employees found`
                                    }
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <tr key={emp.employee_id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                                                {(emp.nickname || emp.employee_name).charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{emp.nickname || emp.employee_name}</p>
                                                <p className="text-xs text-slate-500">{emp.position_code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {dates.map((date) => {
                                        const dayData = emp.daily_workload.find(
                                            d => new Date(d.work_date).toDateString() === date.toDateString()
                                        )

                                        if (!dayData) {
                                            return (
                                                <td key={date.toISOString()} className="px-2 py-3 text-center">
                                                    <span className="text-slate-300">-</span>
                                                </td>
                                            )
                                        }

                                        return (
                                            <td key={date.toISOString()} className="px-2 py-3">
                                                <div className={cn(
                                                    "text-center p-2 rounded",
                                                    dayData.status === 'overload' ? "bg-red-100" :
                                                        dayData.status === 'full' ? "bg-amber-100" :
                                                            dayData.status === 'warning' ? "bg-yellow-100" :
                                                                "bg-green-50"
                                                )}>
                                                    <p className="text-sm font-medium">
                                                        {dayData.assigned_hours.toFixed(1)}/{dayData.capacity_hours}h
                                                    </p>
                                                    <p className={cn(
                                                        "text-xs font-bold",
                                                        dayData.status === 'overload' ? "text-red-600" :
                                                            dayData.status === 'full' ? "text-amber-600" :
                                                                dayData.status === 'warning' ? "text-yellow-600" :
                                                                    "text-green-600"
                                                    )}>
                                                        {dayData.workload_percent}%
                                                    </p>
                                                </div>
                                            </td>
                                        )
                                    })}
                                    <td className="px-4 py-3 text-center">
                                        <div className={cn(
                                            "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-bold",
                                            emp.average_workload_percent > 100 ? "bg-red-100 text-red-600" :
                                                emp.average_workload_percent >= 100 ? "bg-amber-100 text-amber-600" :
                                                    emp.average_workload_percent >= 70 ? "bg-yellow-100 text-yellow-600" :
                                                        "bg-green-100 text-green-600"
                                        )}>
                                            {emp.average_workload_percent}%
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t bg-slate-50">
                <div className="flex items-center gap-6 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-green-500 rounded"></span> Available (0-69%)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-yellow-500 rounded"></span> Warning (70-99%)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-amber-500 rounded"></span> Full (100%)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-red-500 rounded"></span> Overload (&gt;100%)
                    </span>
                </div>
            </div>
        </div>
    )
}
