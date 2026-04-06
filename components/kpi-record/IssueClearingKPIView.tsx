'use client'

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle2, AlertTriangle, RefreshCw, Users, Eye, Zap, X } from "lucide-react"
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
    { value: 1, label: 'ม.ค.' },
    { value: 2, label: 'ก.พ.' },
    { value: 3, label: 'มี.ค.' },
    { value: 4, label: 'เม.ย.' },
    { value: 5, label: 'พ.ค.' },
    { value: 6, label: 'มิ.ย.' },
    { value: 7, label: 'ก.ค.' },
    { value: 8, label: 'ส.ค.' },
    { value: 9, label: 'ก.ย.' },
    { value: 10, label: 'ต.ค.' },
    { value: 11, label: 'พ.ย.' },
    { value: 12, label: 'ธ.ค.' },
]

export default function IssueClearingKPIView({ currentUserId = '', currentUserName = '' }: IssueClearingKPIViewProps) {
    const [kpiData, setKpiData] = useState<IssueClearingKPIResult[]>([])
    const [tasksNotPlanned, setTasksNotPlanned] = useState<TaskNotAsPlanned[]>([])
    const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")
    const [employeeFilter, setEmployeeFilter] = useState<string>("")

    // Modal
    const [showTasksModal, setShowTasksModal] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<IssueClearingKPIResult | null>(null)

    // Summary
    const [summary, setSummary] = useState({
        totalEmployees: 0, totalCompleted: 0, doneAsPlanned: 0, doneNotAsPlanned: 0,
        overallRate: 100, passCount: 0, failCount: 0
    })

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const monthVal = monthFilter === "all" ? undefined : parseInt(monthFilter)

            const kpiResult = await getIssueClearingKPI({
                year: yearFilter,
                month: monthVal,
                employeeId: employeeFilter || undefined
            })

            if (kpiResult.success) {
                setKpiData(kpiResult.data)
                const totalCompleted = kpiResult.data.reduce((sum, r) => sum + r.total_completed, 0)
                const doneAsPlanned = kpiResult.data.reduce((sum, r) => sum + r.done_as_planned, 0)
                const doneNotAsPlanned = kpiResult.data.reduce((sum, r) => sum + r.done_not_as_planned, 0)
                const overallRate = totalCompleted > 0 ? Math.round((doneAsPlanned / totalCompleted) * 10000) / 100 : 100
                setSummary({
                    totalEmployees: kpiResult.data.length,
                    totalCompleted, doneAsPlanned, doneNotAsPlanned, overallRate,
                    passCount: kpiResult.data.filter(r => r.is_pass).length,
                    failCount: kpiResult.data.filter(r => !r.is_pass).length
                })
            }

            const tasksResult = await getTasksNotAsPlanned({
                year: yearFilter, month: monthVal, employeeId: employeeFilter || undefined
            })
            if (tasksResult.success) setTasksNotPlanned(tasksResult.data)

            const trendResult = await getIssueClearingMonthlyTrend({
                year: yearFilter, employeeId: employeeFilter || undefined
            })
            if (trendResult.success) setMonthlyTrend(trendResult.data)
        } catch {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, monthFilter, employeeFilter])

    useEffect(() => { fetchData() }, [fetchData])

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
        return NOT_AS_PLANNED_REASONS.find(r => r.value === reasonValue)?.label || reasonValue
    }

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const handleViewEmployeeTasks = (employee: IssueClearingKPIResult) => {
        setSelectedEmployee(employee)
        setShowTasksModal(true)
    }

    const employeeTasksNotPlanned = selectedEmployee
        ? tasksNotPlanned.filter(t => t.assignee_name === selectedEmployee.employee_name)
        : []

    return (
        <div className="p-6 space-y-4 w-full bg-slate-50 min-h-screen">
            {/* Compact Header Bar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* Top: Title + Score + Filters */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-violet-100 rounded-lg">
                            <Zap size={18} className="text-violet-600" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">Issue Clearing</h1>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${summary.overallRate >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {summary.overallRate >= 85 ? <CheckCircle2 size={14} /> : <X size={14} />}
                            {summary.overallRate}%
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{summary.totalEmployees} คน</span>
                            <span className="text-emerald-600 font-medium">{summary.passCount} ผ่าน</span>
                            <span className="text-rose-600 font-medium">{summary.failCount} ไม่ผ่าน</span>
                            <span className="text-slate-400">|</span>
                            <span>Done: <span className="font-medium text-emerald-600">{summary.doneAsPlanned}</span>/<span className="text-slate-600">{summary.totalCompleted}</span></span>
                            {summary.doneNotAsPlanned > 0 && (
                                <span className="text-amber-600 font-medium">({summary.doneNotAsPlanned} not planned)</span>
                            )}
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <select value={yearFilter} onChange={(e) => setYearFilter(parseInt(e.target.value))}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm">
                            <option value="all">ทั้งปี</option>
                            {MONTHS.map(m => <option key={m.value} value={m.value.toString()}>{m.label}</option>)}
                        </select>
                        {employees.length > 0 && (
                            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm max-w-[160px]">
                                <option value="">ทุกคน</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        )}
                        <button onClick={() => fetchData()} disabled={isLoading}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Bottom: Monthly Trend + Target Legend */}
                <div className="flex items-center gap-3 px-5 py-2.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {MONTHS.map((month) => {
                            const monthData = monthlyTrend.find((t: any) => t.month === month.value)
                            const isSelected = monthFilter === String(month.value)
                            const hasData = monthData && monthData.total_completed > 0
                            const rate = monthData?.clearing_rate || 0
                            const isPass = rate >= 85

                            return (
                                <button
                                    key={month.value}
                                    onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                    className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                        isSelected
                                            ? 'ring-2 ring-violet-300 border-violet-400 shadow-sm bg-violet-50'
                                            : hasData
                                                ? (isPass ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100')
                                                : 'bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className={`text-[9px] font-medium ${hasData ? (isPass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{month.label}</div>
                                    <div className={`text-xs font-bold leading-tight ${hasData ? (isPass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                        {hasData ? `${rate}%` : "-"}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="h-8 w-px bg-slate-200 shrink-0" />

                    <div className="flex items-center gap-3 text-[10px] shrink-0">
                        <span className="text-emerald-600 font-medium">&gt;=85%: Pass</span>
                        <span className="text-rose-600 font-medium">&lt;85%: Fail</span>
                        <span className="text-slate-500">Done / Total</span>
                    </div>
                </div>
            </div>

            {/* KPI by Employee Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-violet-600" />
                        KPI by Employee
                        <span className="text-sm font-normal text-slate-500 ml-2">({kpiData.length} คน)</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">Employee</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Total</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Done</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-24">Not Planned</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Rate</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-violet-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : kpiData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-500">
                                        <div className="text-sm">ไม่มีข้อมูล Task ที่เสร็จในช่วงเวลานี้</div>
                                    </td>
                                </tr>
                            ) : (
                                kpiData.map((row) => (
                                    <tr key={row.employee_id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${!row.is_pass ? 'bg-rose-50/30' : ''}`}>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-800">{row.employee_name}</span>
                                                {row.employee_id === currentUserId && (
                                                    <span className="text-[10px] text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-full">You</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-2.5 font-semibold text-slate-700">{row.total_completed}</td>
                                        <td className="text-center px-4 py-2.5 font-semibold text-emerald-600">{row.done_as_planned}</td>
                                        <td className="text-center px-4 py-2.5">
                                            <span className={row.done_not_as_planned > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>{row.done_not_as_planned}</span>
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            <span className={`font-bold ${row.clearing_rate >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {row.clearing_rate}%
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${row.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {row.is_pass ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-2.5">
                                            {row.done_not_as_planned > 0 && (
                                                <button onClick={() => handleViewEmployeeTasks(row)}
                                                    className="p-1 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                                                    title="ดูรายละเอียด">
                                                    <Eye size={15} />
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
            {tasksNotPlanned.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-600" />
                            Tasks Not as Planned
                            <span className="text-sm font-normal text-amber-600 ml-2">({tasksNotPlanned.length} รายการ)</span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-24">Date</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Task</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Project</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Employee</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-36">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasksNotPlanned.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                                        <td className="px-4 py-2.5 text-xs text-slate-500">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy', { locale: th }) : '-'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="font-medium text-slate-800">{task.task_code}</span>
                                            <span className="text-slate-500 ml-2 truncate">{task.title}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">{task.project_code}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-700">{task.assignee_name}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                                {getReasonLabel(task.not_as_planned_reason)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Employee Tasks Modal */}
            <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-amber-600" size={18} />
                            Tasks Not as Planned - {selectedEmployee?.employee_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Date</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Task</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeTasksNotPlanned.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                            {task.completed_date ? format(new Date(task.completed_date), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="font-medium text-slate-800">{task.task_code}</span>
                                            <p className="text-xs text-slate-500">{task.title}</p>
                                            <p className="text-xs text-blue-600 font-medium">{task.project_code}</p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
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
