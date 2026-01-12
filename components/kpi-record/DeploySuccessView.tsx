'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, CheckCircle2, XCircle, X, RefreshCw, TrendingUp } from "lucide-react"
import { getDeployRecords, deleteDeployRecord, getDeploySuccessKPI, getActiveCustomers, DeployRecord } from "@/lib/actions/deploy-record-actions"
import { DeployRecordModal } from "@/components/kpi-record/DeployRecordModal"
import { toast } from "sonner"
import { SmartCombobox } from "@/components/shared/SmartCombobox"

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

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
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

    const clearFilters = () => {
        setCustomerFilter(null)
        setYearFilter(new Date().getFullYear())
    }

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 95) return 'text-green-600'
        if (rate >= 80) return 'text-amber-600'
        return 'text-red-600'
    }

    const getSuccessRateBgColor = (rate: number) => {
        if (rate >= 95) return 'bg-green-100 text-green-700'
        if (rate >= 80) return 'bg-amber-100 text-amber-700'
        return 'bg-red-100 text-red-700'
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
            size: 200,
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
                    <span className={`text-lg font-bold ${row.original.rollback_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                            <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                            <XCircle size={18} className="text-red-600" />
                        )}
                        <span className={`px-2 py-1 rounded text-sm font-bold ${getSuccessRateBgColor(rate)}`}>
                            {rate}%
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "notes",
            header: "Notes",
            size: 180,
            cell: ({ row }) => (
                <span className="text-sm text-slate-500 truncate block max-w-[160px]" title={row.original.notes || ''}>
                    {row.original.notes || '-'}
                </span>
            ),
        },
        {
            id: "actions",
            header: "",
            size: 80,
            cell: ({ row }) => {
                const record = row.original
                return (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={() => handleEdit(record)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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

    return (
        <div className={embedded ? "p-4" : "p-6 max-w-[1400px] mx-auto"}>
            {/* Page Header */}
            <div className={`flex items-center justify-between ${embedded ? 'mb-3' : 'mb-6'}`}>
                {!embedded && (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Deploy Success Records</h1>
                        <p className="text-slate-500 text-sm mt-1">Track deployment success rate - Target: ≥95%</p>
                    </div>
                )}
                {embedded && <div className="text-sm text-slate-500">Target: ≥95% Success Rate</div>}
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium text-sm"
                >
                    <Plus size={16} />
                    New Record
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className={`grid grid-cols-5 gap-3 ${embedded ? 'mb-3' : 'mb-6'}`}>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-blue-600">{summary.total_deploy}</div>
                    <div className="text-sm text-slate-500">Total Deploys</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-green-600">{summary.success_count}</div>
                    <div className="text-sm text-slate-500">Successful</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className={`text-2xl font-bold ${summary.total_rollback > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {summary.total_rollback}
                    </div>
                    <div className="text-sm text-slate-500">Rollbacks</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className={`text-2xl font-bold ${getSuccessRateColor(summary.success_rate)}`}>
                        {summary.success_rate}%
                    </div>
                    <div className="text-sm text-slate-500">Success Rate</div>
                </div>
                <div className={`rounded-xl border p-4 ${summary.is_pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                        {summary.is_pass ? (
                            <>
                                <CheckCircle2 size={24} className="text-green-600" />
                                <span className="text-xl font-bold text-green-700">PASS</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={24} className="text-red-600" />
                                <span className="text-xl font-bold text-red-700">FAIL</span>
                            </>
                        )}
                    </div>
                    <div className="text-sm text-slate-500">Target: ≥{summary.target}%</div>
                </div>
            </div>

            {/* Filters */}
            <div className={`bg-white border border-slate-200 rounded-xl p-3 ${embedded ? 'mb-3' : 'mb-4'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Year Filter */}
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" />
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(parseInt(e.target.value))}
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Customer Filter */}
                    <div className="min-w-[200px]">
                        <SmartCombobox
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={customerFilter ? { value: customerFilter, label: customers.find(c => c.id === customerFilter)?.name || '' } : null}
                            onChange={(opt) => setCustomerFilter(opt?.value?.toString() || null)}
                            placeholder="All Customers"
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
                    {customerFilter && (
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

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <SuperTable
                    data={data}
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
