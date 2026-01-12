'use client'

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, Users, Target, ListTodo, Eye } from "lucide-react"
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
    const [monthFilter, setMonthFilter] = useState<number>(0) // 0 = whole year
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
            // Fetch KPI data
            const kpiResult = await getIssueClearingKPI({
                year: yearFilter,
                month: monthFilter || undefined,
                employeeId: employeeFilter || undefined
            })

            if (kpiResult.success) {
                setKpiData(kpiResult.data)

                // Calculate summary
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

            // Fetch tasks not as planned
            const tasksResult = await getTasksNotAsPlanned({
                year: yearFilter,
                month: monthFilter || undefined,
                employeeId: employeeFilter || undefined
            })
            if (tasksResult.success) {
                setTasksNotPlanned(tasksResult.data)
            }

            // Fetch monthly trend
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

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Issue Clearing KPI</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        อัตราการทำงานเสร็จตามแผน (Done / Total Completed) - Target: &gt;= 85%
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Overall Rate */}
                <div className={`rounded-xl border-2 p-4 ${summary.overallRate >= 85 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Target size={18} />
                        <span className="text-sm font-medium">Overall Rate</span>
                    </div>
                    <div className={`text-3xl font-bold ${summary.overallRate >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.overallRate}%
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${summary.overallRate >= 85 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(summary.overallRate, 100)}%` }}
                        />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {summary.overallRate >= 85 ? '✅ Pass' : '❌ Below Target'}
                    </div>
                </div>

                {/* Total Completed */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <ListTodo size={18} />
                        <span className="text-sm font-medium">Total Completed</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{summary.totalCompleted}</div>
                    <div className="text-xs text-slate-500 mt-1">tasks</div>
                </div>

                {/* Done (As Planned) */}
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-medium">Done (As Planned)</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{summary.doneAsPlanned}</div>
                    <div className="text-xs text-green-600 mt-1">✅ tasks</div>
                </div>

                {/* Not as Planned */}
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-medium">Not as Planned</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">{summary.doneNotAsPlanned}</div>
                    <div className="text-xs text-orange-600 mt-1">⚠️ tasks</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
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
                        {MONTHS.map(m => (
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
                            value={employeeFilter ? { value: employeeFilter, label: employees.find(e => e.id === employeeFilter)?.name || '' } : { value: '', label: 'All Employees' }}
                            onChange={(opt) => setEmployeeFilter(opt?.value?.toString() || null)}
                            placeholder="Employee"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchData()}
                        disabled={isLoading}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Monthly Trend */}
            {monthFilter === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <TrendingUp size={18} />
                        Monthly Trend - {yearFilter}
                    </h3>
                    <div className="flex items-end gap-2 h-32">
                        {monthlyTrend.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                    className={`w-full rounded-t transition-all ${item.total_completed === 0
                                        ? 'bg-slate-200'
                                        : item.is_pass
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
                                        }`}
                                    style={{ height: `${Math.max(item.clearing_rate, 10)}%` }}
                                    title={`${item.clearing_rate}% (${item.done_as_planned}/${item.total_completed})`}
                                />
                                <div className="text-xs text-slate-500 mt-1">
                                    {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][index]}
                                </div>
                                {item.total_completed > 0 && (
                                    <div className={`text-xs font-medium ${item.is_pass ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.clearing_rate}%
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded" />
                            <span>Pass (&gt;= 85%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded" />
                            <span>Fail (&lt; 85%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-slate-200 rounded" />
                            <span>No Data</span>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI by Employee Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Users size={18} />
                        KPI by Employee - {monthName} {yearFilter}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">✅ Pass: {summary.passCount}</span>
                        <span className="text-red-600">❌ Fail: {summary.failCount}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Employee</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Total Completed</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Done ✅</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Not as Planned ⚠️</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Rate</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : kpiData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500">
                                        ไม่มีข้อมูล Task ที่เสร็จในช่วงเวลานี้
                                    </td>
                                </tr>
                            ) : (
                                kpiData.map((row) => (
                                    <tr
                                        key={row.employee_id}
                                        className="border-b border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-800">{row.employee_name}</span>
                                            {row.employee_id === currentUserId && (
                                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                                            )}
                                        </td>
                                        <td className="text-center px-4 py-3 font-medium text-slate-800">
                                            {row.total_completed}
                                        </td>
                                        <td className="text-center px-4 py-3 font-medium text-green-600">
                                            {row.done_as_planned}
                                        </td>
                                        <td className="text-center px-4 py-3 font-medium text-orange-600">
                                            {row.done_not_as_planned}
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${row.clearing_rate >= 85 ? 'bg-green-500' : 'bg-red-500'}`}
                                                        style={{ width: `${Math.min(row.clearing_rate, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`font-bold ${row.clearing_rate >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {row.clearing_rate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${row.is_pass
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {row.is_pass ? '✅ Pass' : '❌ Fail'}
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            {row.done_not_as_planned > 0 && (
                                                <button
                                                    onClick={() => handleViewEmployeeTasks(row)}
                                                    className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
                                                >
                                                    <Eye size={14} />
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
                <div className="px-4 py-3 border-b border-slate-100 bg-orange-50 flex items-center justify-between">
                    <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Tasks Not as Planned ({tasksNotPlanned.length})
                    </h3>
                    <span className="text-sm text-orange-600">รายการ Tasks ที่เสร็จไม่ตามแผน</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Task</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Project</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Employee</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksNotPlanned.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500">
                                        ไม่มี Tasks ที่เสร็จไม่ตามแผน 🎉
                                    </td>
                                </tr>
                            ) : (
                                tasksNotPlanned.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy', { locale: th }) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="font-medium text-slate-800">{task.task_code}</span>
                                                <p className="text-sm text-slate-500 truncate max-w-[200px]">{task.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-600">{task.project_code}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {task.assignee_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                                {getReasonLabel(task.not_as_planned_reason)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Tasks Modal */}
            <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" size={20} />
                            Tasks Not as Planned - {selectedEmployee?.employee_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="text-left px-3 py-2 text-sm font-medium text-slate-600">Date</th>
                                    <th className="text-left px-3 py-2 text-sm font-medium text-slate-600">Task</th>
                                    <th className="text-left px-3 py-2 text-sm font-medium text-slate-600">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeTasksNotPlanned.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100">
                                        <td className="px-3 py-2 text-sm text-slate-600">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div>
                                                <span className="font-medium text-slate-800">{task.task_code}</span>
                                                <p className="text-xs text-slate-500">{task.title}</p>
                                                <p className="text-xs text-blue-600">{task.project_code}</p>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
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
