'use client'

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, Users, Target, ListTodo, Eye, Award, X, Zap, BarChart3 } from "lucide-react"
import {
    getIssueClearingKPI,
    getTasksNotAsPlanned,
    getIssueClearingMonthlyTrend,
    IssueClearingKPIResult,
    TaskNotAsPlanned
} from "@/lib/actions/issue-clearing-actions"
import { getActiveEmployeesForIssueClearing } from "@/lib/actions/issue-clearing-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { NOT_AS_PLANNED_REASONS } from "@/lib/constants/task-status"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface IssueClearingKPIViewProps {
    currentUserId?: string
    currentUserName?: string
}

const MONTHS = [
    { value: 0, label: 'ทั้งปี' },
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

export default function IssueClearingKPIView({ currentUserId = '', currentUserName = '' }: IssueClearingKPIViewProps) {
    const [kpiData, setKpiData] = useState<IssueClearingKPIResult[]>([])
    const [tasksNotPlanned, setTasksNotPlanned] = useState<TaskNotAsPlanned[]>([])
    const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<number>(0)
    const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)

    // Modal
    const [showTasksModal, setShowTasksModal] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<IssueClearingKPIResult | null>(null)

    // Summary
    const [summary, setSummary] = useState({
        totalEmployees: 0,
        totalCompleted: 0,
        doneAsPlanned: 0,
        doneNotAsPlanned: 0,
        overallRate: 100,
        passCount: 0,
        failCount: 0
    })

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const kpiResult = await getIssueClearingKPI({
                year: yearFilter,
                month: monthFilter || undefined,
                employeeId: employeeFilter || undefined
            })

            if (kpiResult.success) {
                setKpiData(kpiResult.data)

                const totalCompleted = kpiResult.data.reduce((sum, r) => sum + r.total_completed, 0)
                const doneAsPlanned = kpiResult.data.reduce((sum, r) => sum + r.done_as_planned, 0)
                const doneNotAsPlanned = kpiResult.data.reduce((sum, r) => sum + r.done_not_as_planned, 0)
                const overallRate = totalCompleted > 0 ? Math.round((doneAsPlanned / totalCompleted) * 10000) / 100 : 100
                const passCount = kpiResult.data.filter(r => r.is_pass).length
                const failCount = kpiResult.data.filter(r => !r.is_pass).length

                setSummary({
                    totalEmployees: kpiResult.data.length,
                    totalCompleted,
                    doneAsPlanned,
                    doneNotAsPlanned,
                    overallRate,
                    passCount,
                    failCount
                })
            }

            const tasksResult = await getTasksNotAsPlanned({
                year: yearFilter,
                month: monthFilter || undefined,
                employeeId: employeeFilter || undefined
            })
            if (tasksResult.success) {
                setTasksNotPlanned(tasksResult.data)
            }

            const trendResult = await getIssueClearingMonthlyTrend({
                year: yearFilter,
                employeeId: employeeFilter || undefined
            })
            if (trendResult.success) {
                setMonthlyTrend(trendResult.data)
            }

        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
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

    const getReasonLabel = (reasonValue: string | null) => {
        if (!reasonValue) return '-'
        const found = NOT_AS_PLANNED_REASONS.find(r => r.value === reasonValue)
        return found?.label || reasonValue
    }

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
    const monthName = MONTHS.find(m => m.value === monthFilter)?.label || 'ทั้งปี'

    const handleViewEmployeeTasks = (employee: IssueClearingKPIResult) => {
        setSelectedEmployee(employee)
        setShowTasksModal(true)
    }

    const employeeTasksNotPlanned = selectedEmployee
        ? tasksNotPlanned.filter(t => t.assignee_name === selectedEmployee.employee_name)
        : []

    // Score gradient
    const getScoreGradient = (rate: number) => {
        if (rate >= 85) return 'from-emerald-500 via-green-500 to-teal-500'
        if (rate >= 70) return 'from-yellow-500 via-amber-500 to-orange-500'
        return 'from-rose-500 via-red-500 to-pink-500'
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Page Header with Gradient */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-6 mb-6 shadow-lg">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Zap size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Issue Clearing KPI</h1>
                            <p className="text-purple-100 text-sm mt-1">Task completion rate (Done / Total) - Target: &ge; 85%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                            <div className="text-white/70 text-xs">Employees</div>
                            <div className="text-white font-bold text-lg">{summary.passCount}/{summary.totalEmployees} Pass</div>
                        </div>
                        <button
                            onClick={() => fetchData()}
                            disabled={isLoading}
                            className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all"
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Overall Rate Card */}
                <div className={`rounded-2xl shadow-lg overflow-hidden ${summary.overallRate >= 85 ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200' : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-2 border-rose-200'}`}>
                    <div className="p-5">
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                            <Target size={18} className={summary.overallRate >= 85 ? 'text-emerald-600' : 'text-rose-600'} />
                            <span className="text-sm font-semibold">Overall Rate</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getScoreGradient(summary.overallRate)} p-0.5`}>
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <span className={`text-2xl font-black ${summary.overallRate >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {summary.overallRate}%
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${summary.overallRate >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {summary.overallRate >= 85 ? '✓ Pass' : '✗ Below'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">Target: 85%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Completed Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                    <div className="flex items-center gap-2 text-slate-600 mb-3">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                            <ListTodo size={18} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold">Total Completed</span>
                    </div>
                    <div className="text-4xl font-black text-slate-800">{summary.totalCompleted}</div>
                    <div className="text-xs text-slate-500 mt-1">tasks completed</div>
                </div>

                {/* Done (As Planned) Card */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 text-emerald-600 mb-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle2 size={18} className="text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold">Done (As Planned)</span>
                    </div>
                    <div className="text-4xl font-black text-emerald-600">{summary.doneAsPlanned}</div>
                    <div className="text-xs text-emerald-600 mt-1">tasks on track</div>
                </div>

                {/* Not as Planned Card */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 text-amber-600 mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle size={18} className="text-amber-600" />
                        </div>
                        <span className="text-sm font-semibold">Not as Planned</span>
                    </div>
                    <div className="text-4xl font-black text-amber-600">{summary.doneNotAsPlanned}</div>
                    <div className="text-xs text-amber-600 mt-1">need attention</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-purple-500 outline-none bg-white font-medium"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Month Filter */}
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-purple-500 outline-none bg-white font-medium"
                    >
                        {MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    {/* Employee Filter */}
                    <div className="min-w-[220px]">
                        <SmartCombobox
                            options={[
                                { value: '', label: 'All Employees' },
                                ...employees.map(e => ({ value: e.id, label: e.name }))
                            ]}
                            value={employeeFilter ? { value: employeeFilter, label: employees.find(e => e.id === employeeFilter)?.name || '' } : { value: '', label: 'All Employees' }}
                            onChange={(opt) => setEmployeeFilter(opt?.value?.toString() || null)}
                            placeholder="Employee"
                        />
                    </div>

                    {(employeeFilter || monthFilter !== 0) && (
                        <button
                            onClick={() => { setEmployeeFilter(null); setMonthFilter(0) }}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg">
                            <BarChart3 size={18} className="text-violet-600" />
                        </div>
                        Monthly Trend - {yearFilter}
                    </h3>
                    {monthFilter !== 0 && (
                        <button
                            onClick={() => setMonthFilter(0)}
                            className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-violet-50 transition-colors"
                        >
                            <X size={14} />
                            แสดงทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const monthData = monthlyTrend.find(m => m.month === month)
                        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
                        const isSelected = monthFilter === month

                        if (!monthData || monthData.total_completed === 0) {
                            return (
                                <div
                                    key={month}
                                    onClick={() => setMonthFilter(isSelected ? 0 : month)}
                                    className={`bg-slate-50 border rounded-lg p-2 text-center cursor-pointer transition-all hover:shadow-sm ${
                                        isSelected ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-xs font-medium text-slate-400 mb-1">{monthNames[month - 1]}</div>
                                    <div className="text-sm font-bold text-slate-300">-</div>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={month}
                                onClick={() => setMonthFilter(isSelected ? 0 : month)}
                                className={`rounded-lg p-2 text-center border cursor-pointer transition-all hover:shadow-sm ${
                                    isSelected
                                        ? 'ring-2 ring-violet-300 border-violet-400 shadow-md'
                                        : monthData.is_pass
                                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                                            : 'bg-rose-50 border-rose-200 hover:border-rose-300'
                                } ${monthData.is_pass ? 'bg-emerald-50' : 'bg-rose-50'}`}
                            >
                                <div className={`text-xs font-medium mb-1 ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {monthNames[month - 1]}
                                </div>
                                <div className={`text-sm font-bold ${monthData.is_pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {monthData.clearing_rate}%
                                </div>
                                <div className={`text-xs ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {monthData.done_as_planned}/{monthData.total_completed}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-5 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded" />
                        <span className="font-medium">Pass (&ge; 85%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-rose-100 border border-rose-300 rounded" />
                        <span className="font-medium">Fail (&lt; 85%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded" />
                        <span className="font-medium">No Data</span>
                    </div>
                </div>
            </div>

            {/* KPI by Employee Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-violet-600" />
                        KPI by Employee - {monthName} {yearFilter}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-semibold flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            Pass: {summary.passCount}
                        </span>
                        <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg font-semibold flex items-center gap-1">
                            <X size={14} />
                            Fail: {summary.failCount}
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-sm font-semibold text-slate-600">Employee</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Total</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Done</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Not Planned</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Rate</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-violet-500" />
                                        <div className="font-medium">Loading...</div>
                                    </td>
                                </tr>
                            ) : kpiData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-500">
                                        <ListTodo size={28} className="mx-auto mb-3 text-slate-300" />
                                        <div className="font-medium">ไม่มีข้อมูล Task ที่เสร็จในช่วงเวลานี้</div>
                                    </td>
                                </tr>
                            ) : (
                                kpiData.map((row) => (
                                    <tr
                                        key={row.employee_id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${row.is_pass
                                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                                    : 'bg-gradient-to-br from-rose-500 to-red-600'
                                                    }`}>
                                                    {row.employee_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-800">{row.employee_name}</span>
                                                    {row.employee_id === currentUserId && (
                                                        <span className="ml-2 text-xs text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full">(You)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-4 font-bold text-slate-800 text-lg">
                                            {row.total_completed}
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <span className="font-bold text-emerald-600 text-lg">{row.done_as_planned}</span>
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <span className="font-bold text-amber-600 text-lg">{row.done_not_as_planned}</span>
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${row.clearing_rate >= 85 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-rose-500 to-red-500'}`}
                                                        style={{ width: `${Math.min(row.clearing_rate, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`font-black text-lg ${row.clearing_rate >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {row.clearing_rate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm ${row.is_pass
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                                                }`}>
                                                {row.is_pass ? <CheckCircle2 size={14} /> : <X size={14} />}
                                                {row.is_pass ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-4">
                                            {row.done_not_as_planned > 0 && (
                                                <button
                                                    onClick={() => handleViewEmployeeTasks(row)}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg text-sm font-semibold transition-all"
                                                >
                                                    <Eye size={15} />
                                                    View
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tasks Not as Planned */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-600" />
                        Tasks Not as Planned
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-sm ml-1">{tasksNotPlanned.length}</span>
                    </h3>
                    <span className="text-sm text-amber-600 font-medium">รายการ Tasks ที่เสร็จไม่ตามแผน</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-sm font-semibold text-slate-600">Date</th>
                                <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-600">Task</th>
                                <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-600">Project</th>
                                <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-600">Employee</th>
                                <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-600">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksNotPlanned.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="text-5xl mb-3">🎉</div>
                                        <div className="text-slate-600 font-semibold">ไม่มี Tasks ที่เสร็จไม่ตามแผน</div>
                                        <div className="text-slate-400 text-sm mt-1">ทุกคนทำงานได้ตามแผนทั้งหมด!</div>
                                    </td>
                                </tr>
                            ) : (
                                tasksNotPlanned.slice(0, 10).map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy', { locale: th }) : '-'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div>
                                                <span className="font-semibold text-slate-800">{task.task_code}</span>
                                                <p className="text-sm text-slate-500 truncate max-w-[200px]">{task.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">{task.project_code}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-slate-700 font-medium">
                                            {task.assignee_name}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                                                {getReasonLabel(task.not_as_planned_reason)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {tasksNotPlanned.length > 10 && (
                        <div className="px-5 py-3 text-center text-sm text-slate-500 bg-slate-50 border-t border-slate-100">
                            แสดง 10 จาก {tasksNotPlanned.length} รายการ
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Tasks Modal */}
            <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-lg">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <AlertTriangle className="text-amber-600" size={20} />
                            </div>
                            Tasks Not as Planned - {selectedEmployee?.employee_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Date</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Task</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeTasksNotPlanned.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="font-semibold text-slate-800">{task.task_code}</span>
                                                <p className="text-xs text-slate-500">{task.title}</p>
                                                <p className="text-xs text-blue-600 font-medium">{task.project_code}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                                {getReasonLabel(task.not_as_planned_reason)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
