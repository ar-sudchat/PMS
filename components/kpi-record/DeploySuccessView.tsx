'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, CheckCircle2, XCircle, RefreshCw, Send, Rocket } from "lucide-react"
import { getDeployRecords, deleteDeployRecord, getDeploySuccessKPI, getActiveCustomers, DeployRecord, submitDeployRecordForApproval, getDeploySuccessMonthlyTrend } from "@/lib/actions/deploy-record-actions"
import { DeployRecordModal } from "@/components/kpi-record/DeployRecordModal"
import { toast } from "sonner"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { ApprovalStatusBadge } from "@/components/approval/ApprovalStatusBadge"

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

interface DeploySuccessViewProps {
    currentUserId: string
    embedded?: boolean
}

export function DeploySuccessView({ currentUserId, embedded = false }: DeploySuccessViewProps) {
    const [data, setData] = useState<DeployRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<DeployRecord | undefined>(undefined)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 })

    const [summary, setSummary] = useState({
        total_deploy: 0,
        total_rollback: 0,
        success_count: 0,
        success_rate: 0,
        target: 95,
        is_pass: false
    })

    // Monthly trend data
    const [monthlyTrend, setMonthlyTrend] = useState<{
        month: number
        month_name: string
        total_deploy: number
        total_rollback: number
        success_count: number
        success_rate: number
        customer_count: number
        record_count: number
        is_pass: boolean
    }[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")
    const [customerFilter, setCustomerFilter] = useState<string | null>(null)
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getDeployRecords({
                year: yearFilter,
                customerId: customerFilter || undefined,
                page: pagination.page,
                pageSize: pagination.pageSize
            })

            if (result.success && result.data) {
                setData(result.data)
                setPagination(prev => ({
                    ...prev,
                    total: result.total || 0,
                    totalPages: result.totalPages || 0
                }))
            } else {
                toast.error("Failed to load deploy records")
            }

            // Fetch KPI summary
            const summaryResult = await getDeploySuccessKPI(yearFilter, customerFilter || undefined)
            if (summaryResult.success && summaryResult.data) {
                setSummary(summaryResult.data)
            }

            // Fetch monthly trend
            const trendResult = await getDeploySuccessMonthlyTrend(yearFilter, customerFilter || undefined)
            if (trendResult.success && trendResult.data) {
                setMonthlyTrend(trendResult.data)
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, customerFilter, pagination.page, pagination.pageSize])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const loadCustomers = async () => {
            const result = await getActiveCustomers()
            if (result.success && result.data) {
                setCustomers(result.data.map((c: any) => ({ id: c.id, name: c.name })))
            }
        }
        loadCustomers()
    }, [])

    const handleCreate = () => {
        setSelectedRecord(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (record: DeployRecord) => {
        setSelectedRecord(record)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return

        try {
            const result = await deleteDeployRecord(id)
            if (result.success) {
                toast.success("Record deleted successfully")
                fetchData()
            } else {
                toast.error(result.error || "Failed to delete")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        fetchData()
    }

    const handleSubmitForApproval = async (record: DeployRecord) => {
        try {
            const result = await submitDeployRecordForApproval(
                record.id,
                `Deploy Success - ${record.customer_name} - W${record.week_number}`
            )
            if (result.success) {
                toast.success('Submitted for approval')
                fetchData()
            } else {
                toast.error(result.error || 'Failed to submit')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const getSuccessRateBgColor = (rate: number) => {
        if (rate >= 95) return 'bg-emerald-100 text-emerald-700'
        if (rate >= 80) return 'bg-amber-100 text-amber-700'
        return 'bg-rose-100 text-rose-700'
    }

    const formatWeek = (weekNumber: number, weekStartDate: string) => {
        const startDate = new Date(weekStartDate)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)

        const startDay = startDate.getDate()
        const endDay = endDate.getDate()
        const startMonth = startDate.toLocaleDateString('th-TH', { month: 'short' })
        const endMonth = endDate.toLocaleDateString('th-TH', { month: 'short' })

        if (startDate.getMonth() === endDate.getMonth()) {
            return `W${weekNumber}: ${startDay}-${endDay} ${startMonth}`
        }
        return `W${weekNumber}: ${startDay} ${startMonth} - ${endDay} ${endMonth}`
    }

    const columns: ColumnDef<DeployRecord>[] = [
        {
            accessorKey: "week_number",
            header: "Week",
            size: 150,
            cell: ({ row }) => (
                <div className="text-sm font-medium text-slate-700">
                    {formatWeek(row.original.week_number, row.original.week_start_date)}
                </div>
            ),
        },
        {
            accessorKey: "customer_name",
            header: "Customer",
            size: 300,
            cell: ({ row }) => (
                <div className="font-medium text-slate-800">
                    {row.original.customer_name || '-'}
                </div>
            ),
        },
        {
            accessorKey: "deploy_count",
            header: "Deploy Count",
            size: 120,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className="text-lg font-bold text-blue-600">{row.original.deploy_count}</span>
                </div>
            ),
        },
        {
            accessorKey: "rollback_count",
            header: "Rollback",
            size: 100,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className={`text-lg font-bold ${row.original.rollback_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.original.rollback_count}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "success_rate",
            header: "Success Rate",
            size: 130,
            cell: ({ row }) => {
                const rate = row.original.success_rate || 0
                return (
                    <div className="flex items-center gap-2">
                        {rate >= 95 ? (
                            <CheckCircle2 size={18} className="text-emerald-600" />
                        ) : (
                            <XCircle size={18} className="text-rose-600" />
                        )}
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${getSuccessRateBgColor(rate)}`}>
                            {rate}%
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "approval_status",
            header: "Approval",
            size: 120,
            cell: ({ row }) => {
                const record = row.original as any
                const status = record.approval_status || 'DRAFT'
                return <ApprovalStatusBadge status={status} size="sm" />
            },
        },
        {
            accessorKey: "notes",
            header: "Notes",
            size: 150,
            cell: ({ row }) => (
                <span className="text-sm text-slate-500 truncate block max-w-[130px]" title={row.original.notes || ''}>
                    {row.original.notes || '-'}
                </span>
            ),
        },
        {
            id: "actions",
            header: "",
            size: 100,
            cell: ({ row }) => {
                const record = row.original as any
                const status = record.approval_status || 'DRAFT'
                return (
                    <div className="flex items-center gap-1 justify-end">
                        {status === 'DRAFT' && (
                            <button
                                onClick={() => handleSubmitForApproval(record)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Submit for Approval"
                            >
                                <Send size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => handleEdit(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            },
        },
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    // Filter data by selected month
    const filteredData = monthFilter !== "all"
        ? data.filter(d => new Date(d.week_start_date).getMonth() + 1 === parseInt(monthFilter))
        : data

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top row: Icon + Title + Score badge + summary + Customer filter + Year + Month + Add + Refresh */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Rocket size={18} className="text-blue-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Deploy Success</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Score badge + summary text */}
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${summary.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {summary.is_pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                {summary.success_rate}%
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Deploy: <span className="font-medium text-blue-600">{summary.total_deploy}</span></span>
                                <span>Success: <span className="font-medium text-emerald-600">{summary.success_count}</span></span>
                                <span>Rollback: <span className={`font-medium ${summary.total_rollback > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{summary.total_rollback}</span></span>
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            {/* Customer Filter */}
                            <div className="min-w-[180px]">
                                <SmartCombobox
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    value={customerFilter ? { value: customerFilter, label: customers.find(c => c.id === customerFilter)?.name || '' } : null}
                                    onChange={(opt) => setCustomerFilter(opt?.value?.toString() || null)}
                                    placeholder="All Customers"
                                />
                            </div>
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                <option value="all">ทั้งปี</option>
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value.toString()}>{m.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium text-sm"
                            >
                                <Plus size={15} />
                                New
                            </button>
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom row: Monthly Trend inline + Scoring legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const item = monthlyTrend.find(t => t.month === month.value)
                                const hasData = item && item.total_deploy > 0
                                const isPass = hasData && item.success_rate >= 95
                                const rate = item?.success_rate || 0
                                const isSelected = monthFilter === String(month.value)

                                return (
                                    <button
                                        key={month.value}
                                        onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                        className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                            isSelected
                                                ? 'ring-2 ring-blue-300 border-blue-400 shadow-sm bg-blue-50'
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
                            <span className="text-emerald-600 font-medium">&gt;=95%: Pass</span>
                            <span className="text-rose-600 font-medium">&lt;95%: Fail</span>
                            <span className="text-slate-500">(Higher is better)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Embedded: minimal inline controls */}
            {embedded && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">Target: &gt;=95% Success Rate</div>
                    <div className="flex items-center gap-2">
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(parseInt(e.target.value))}
                            className="px-2 py-1 border border-slate-200 rounded-lg outline-none bg-white text-sm"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <Plus size={15} />
                            New
                        </button>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <SuperTable
                    data={filteredData}
                    columns={columns}
                    isLoading={isLoading}
                    enableGlobalFilter={false}
                />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <div className="text-sm text-slate-500">
                            Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (&gt;= 95%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&lt; 95%)</span>
                </div>
            </div>

            {/* Modal */}
            <DeployRecordModal
                open={isModalOpen}
                onClose={handleModalClose}
                record={selectedRecord}
                currentUserId={currentUserId}
            />
        </div>
    )
}
