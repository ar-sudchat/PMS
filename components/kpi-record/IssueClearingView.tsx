'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { CheckCircle2, Clock, X, RefreshCw, AlertCircle, User, Calendar, Eye, XCircle } from "lucide-react"
import {
    getIssueClearingDaily,
    getIssueClearingAllEmployees,
    getActiveEmployeesForIssueClearing,
    DailyClearing,
    MonthSummary,
    EmployeeMonthSummary
} from "@/lib/actions/issue-clearing-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { TaskDetailModal } from "@/components/kpi-record/TaskDetailModal"

interface IssueClearingViewProps {
    currentUserId?: string
    currentUserName?: string
    embedded?: boolean
}

export default function IssueClearingView({ currentUserId = '', currentUserName = '', embedded = false }: IssueClearingViewProps) {
    const [dailyData, setDailyData] = useState<DailyClearing[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [summary, setSummary] = useState<MonthSummary>({
        total_tasks_worked: 0,
        total_tasks_completed: 0,
        working_days: 0,
        total_hours: 0,
        clearing_rate: 100,
        avg_per_day: 0,
        is_pass: true
    })
    const [allEmployeeKPIs, setAllEmployeeKPIs] = useState<EmployeeMonthSummary[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1)
    const [employeeFilter, setEmployeeFilter] = useState<string | null>(currentUserId)
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
    const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('')

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getIssueClearingDaily({
                year: yearFilter,
                month: monthFilter,
                employeeId: employeeFilter || undefined
            })

            if (result.success) {
                setDailyData(result.dailyData || [])
                setSummary(result.summary)
            } else {
                toast.error("Failed to load issue clearing data")
            }

            // Fetch all employees KPI summary
            const kpiResult = await getIssueClearingAllEmployees(yearFilter, monthFilter)
            if (kpiResult.success && kpiResult.data) {
                setAllEmployeeKPIs(kpiResult.data)
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, monthFilter, employeeFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const loadEmployees = async () => {
            const result = await getActiveEmployeesForIssueClearing()
            if (result.success && result.data) {
                setEmployees(result.data.map((e: any) => ({ id: e.id, name: e.name })))
            }
        }
        loadEmployees()
    }, [])

    const clearFilters = () => {
        setEmployeeFilter(currentUserId)
        setYearFilter(new Date().getFullYear())
        setMonthFilter(new Date().getMonth() + 1)
    }

    const handleViewTasks = (date: string, employeeId: string, employeeName: string) => {
        setSelectedDate(date)
        setSelectedEmployeeId(employeeId)
        setSelectedEmployeeName(employeeName)
        setIsModalOpen(true)
    }

    const getDailyStatusBadge = (rate: number) => {
        if (rate >= 100) {
            return (
                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle2 size={14} />
                    Excellent
                </span>
            )
        } else if (rate >= 85) {
            return (
                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle2 size={14} />
                    Good
                </span>
            )
        } else if (rate >= 70) {
            return (
                <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">
                    <AlertCircle size={14} />
                    Below
                </span>
            )
        } else {
            return (
                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">
                    <XCircle size={14} />
                    Poor
                </span>
            )
        }
    }

    const columns: ColumnDef<DailyClearing>[] = [
        {
            accessorKey: "work_date",
            header: "Date",
            size: 120,
            cell: ({ row }) => (
                <div className="text-sm">
                    <div className="font-medium text-slate-800">
                        {format(new Date(row.original.work_date), 'd MMM yyyy', { locale: th })}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "day_name",
            header: "Day",
            size: 80,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.day_name.slice(0, 3)}</span>
            ),
        },
        {
            accessorKey: "tasks_worked",
            header: "Tasks Open",
            size: 100,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className="text-lg font-bold text-blue-600">{row.original.tasks_worked}</span>
                </div>
            ),
        },
        {
            accessorKey: "tasks_completed",
            header: "Tasks Done",
            size: 100,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className={`text-lg font-bold ${row.original.tasks_completed > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {row.original.tasks_completed}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "clearing_rate",
            header: "Rate",
            size: 80,
            cell: ({ row }) => {
                const rate = Math.round(row.original.clearing_rate * 100) / 100
                return (
                    <span className={`font-bold ${rate >= 85 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                        {rate}%
                    </span>
                )
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 100,
            cell: ({ row }) => getDailyStatusBadge(row.original.clearing_rate),
        },
        {
            accessorKey: "total_hours",
            header: "Hours",
            size: 80,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.total_hours || 0}h</span>
            ),
        },
        {
            id: "actions",
            header: "",
            size: 80,
            cell: ({ row }) => (
                <button
                    onClick={() => handleViewTasks(
                        row.original.work_date,
                        row.original.employee_id,
                        row.original.employee_name
                    )}
                    className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
                >
                    <Eye size={14} />
                    View
                </button>
            ),
        },
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
    const months = [
        { value: 1, label: 'มกราคม' },
        { value: 2, label: 'กุมภาพันธ์' },
        { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' },
        { value: 5, label: 'พฤษภาคม' },
        { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' },
        { value: 8, label: 'สิงหาคม' },
        { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' },
        { value: 11, label: 'พฤศจิกายน' },
        { value: 12, label: 'ธันวาคม' },
    ]

    const monthName = months.find(m => m.value === monthFilter)?.label || ''
    const displayEmployeeName = employeeFilter
        ? (employees.find(e => e.id === employeeFilter)?.name || currentUserName)
        : 'All Employees'

    return (
        <div className={embedded ? "p-4" : "p-6 max-w-[1400px] mx-auto"}>
            {/* Page Header - only show when not embedded */}
            {!embedded && (
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Issue Clearing</h1>
                        <p className="text-slate-500 text-sm mt-1">Track task completion rate - Target: &gt;= 85%</p>
                    </div>
                </div>
            )}

            {/* KPI Card */}
            <div className={`rounded-xl border-2 ${embedded ? 'p-4 mb-4' : 'p-5 mb-6'} ${summary.is_pass ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <User size={24} className="text-slate-600" />
                    <span className="font-semibold text-lg text-slate-800">{displayEmployeeName}</span>
                    <span className="text-sm text-slate-500">- {monthName} {yearFilter}</span>
                    {employeeFilter === currentUserId && (
                        <span className="text-sm text-blue-600">(You)</span>
                    )}
                </div>

                <div className="flex items-center gap-8">
                    {/* Big Rate Number */}
                    <div className="text-center">
                        <div className={`text-5xl font-bold ${summary.is_pass ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.clearing_rate}%
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                            {summary.total_tasks_completed}/{summary.total_tasks_worked} Tasks
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1">
                        <div className="w-full h-5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${summary.is_pass ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(summary.clearing_rate, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>0%</span>
                            <span className="text-orange-600 font-medium">85% Target</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Pass/Fail Badge */}
                    <div className={`px-5 py-3 rounded-lg font-bold text-lg ${summary.is_pass
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {summary.is_pass ? '✅ Pass' : '❌ Below Target'}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-sm mt-4">
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded font-medium text-slate-700">
                        <Calendar size={16} />
                        Working Days: {summary.working_days}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded font-medium text-slate-700">
                        <CheckCircle2 size={16} />
                        Avg/Day: {summary.avg_per_day} tasks
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded font-medium text-slate-700">
                        <Clock size={16} />
                        Total Hours: {summary.total_hours}h
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className={`bg-white border border-slate-200 rounded-xl ${embedded ? 'p-3 mb-3' : 'p-4 mb-4'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Month Filter */}
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    {/* Employee Filter */}
                    <div className="min-w-[200px]">
                        <SmartCombobox
                            options={[
                                { value: '', label: 'All Employees' },
                                ...employees.map(e => ({ value: e.id, label: e.name }))
                            ]}
                            value={employeeFilter ? { value: employeeFilter, label: employees.find(e => e.id === employeeFilter)?.name || currentUserName } : { value: '', label: 'All Employees' }}
                            onChange={(opt) => setEmployeeFilter(opt?.value?.toString() || null)}
                            placeholder="Employee"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Clear Filters */}
                    {(employeeFilter !== currentUserId || monthFilter !== new Date().getMonth() + 1) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${embedded ? 'mb-4' : 'mb-6'}`}>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} />
                        Daily Breakdown
                    </h3>
                </div>
                <SuperTable
                    data={dailyData}
                    columns={columns}
                    isLoading={isLoading}
                    enableGlobalFilter={false}
                />
            </div>

            {/* All Employees Summary Table */}
            {allEmployeeKPIs.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">All Employees Summary - {monthName} {yearFilter}</h3>
                        <span className="text-sm text-slate-500">Target: &gt;= 85%</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Employee</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Days</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Tasks Open</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Tasks Done</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Hours</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Rate</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">KPI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allEmployeeKPIs.map((kpi) => (
                                    <tr
                                        key={kpi.employee_id}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${kpi.employee_id === employeeFilter ? 'bg-blue-50' : ''}`}
                                        onClick={() => setEmployeeFilter(kpi.employee_id)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-800">{kpi.employee_name}</span>
                                            {kpi.employee_id === currentUserId && (
                                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                                            )}
                                        </td>
                                        <td className="text-center px-4 py-3 text-slate-600">{kpi.working_days}</td>
                                        <td className="text-center px-4 py-3 font-medium text-blue-600">{kpi.total_tasks_worked}</td>
                                        <td className="text-center px-4 py-3 font-medium text-green-600">{kpi.total_tasks_completed}</td>
                                        <td className="text-center px-4 py-3 text-slate-600">{kpi.total_hours}h</td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`font-bold ${kpi.clearing_rate >= 85 ? 'text-green-600' : kpi.clearing_rate >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                                                {kpi.clearing_rate}%
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${kpi.is_pass
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {kpi.is_pass ? '✅ Pass' : '❌ Fail'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Task Detail Modal */}
            <TaskDetailModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                date={selectedDate || ''}
                employeeId={selectedEmployeeId || ''}
                employeeName={selectedEmployeeName}
            />
        </div>
    )
}
