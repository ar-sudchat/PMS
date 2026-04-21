'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, CheckCircle2, Clock, RefreshCw, Database, Code, Server, Settings, FileText, FolderOpen, Archive, XCircle } from "lucide-react"
import { getDeployBackupRecords, deleteDeployBackupRecord, getBackupKPI, DeployBackupRecord, BackupKPIResult, approveAllPendingDeployBackups, getDeployBackupMonthlyTrend } from "@/lib/actions/deploy-backup-actions"
import { getActiveBackupSources } from "@/lib/actions/backup-source-actions"
import { DeployBackupModal } from "@/components/kpi-record/DeployBackupModal"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
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

interface DeployBackupViewProps {
    currentUserId: string
    embedded?: boolean
}

export function DeployBackupView({ currentUserId, embedded = false }: DeployBackupViewProps) {
    const [data, setData] = useState<DeployBackupRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<DeployBackupRecord | undefined>(undefined)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    const [kpiData, setKpiData] = useState<BackupKPIResult | null>(null)
    const [monthlyTrend, setMonthlyTrend] = useState<{
        month: number
        month_name: string
        total: number
        passed: number
        failed: number
        pass_rate: number
        is_pass: boolean
    }[]>([])

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [backupSourceFilter, setBackupSourceFilter] = useState<string | null>(null)
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")
    const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending'>('all')
    const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all')
    const [backupSources, setBackupSources] = useState<{ id: string, name: string, code: string, type: string }[]>([])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const verified = verifiedFilter === 'all' ? 'all' : verifiedFilter === 'verified'

            const result = await getDeployBackupRecords({
                backupSourceId: backupSourceFilter || undefined,
                year: yearFilter,
                verified: verified,
                result: resultFilter,
                search: searchQuery || undefined,
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
                toast.error("Failed to load backup records")
            }

            // Fetch KPI data
            const kpiResult = await getBackupKPI(yearFilter)
            if (kpiResult.success && kpiResult.data) {
                setKpiData(kpiResult.data)
            }

            // Fetch monthly trend
            const trendResult = await getDeployBackupMonthlyTrend(yearFilter)
            if (trendResult.success && trendResult.data) {
                setMonthlyTrend(trendResult.data)
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [backupSourceFilter, yearFilter, verifiedFilter, resultFilter, searchQuery, pagination.page, pagination.pageSize])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const loadBackupSources = async () => {
            const result = await getActiveBackupSources()
            if (result.success && result.data) {
                setBackupSources(result.data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    type: s.source_type
                })))
            }
        }
        loadBackupSources()
    }, [])

    const handleCreate = () => {
        setSelectedRecord(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (record: DeployBackupRecord) => {
        setSelectedRecord(record)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return

        try {
            const result = await deleteDeployBackupRecord(id)
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

    const handleApproveAllPending = async () => {
        try {
            const result = await approveAllPendingDeployBackups()
            if (result.success) {
                toast.success(`Approved ${result.count || 0} pending records`)
                fetchData()
            } else {
                toast.error(result.error || 'Failed to approve')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    // Count pending records (not yet verified)
    const pendingCount = data.filter(d => !d.is_verified).length

    const getSourceTypeIcon = (type: string) => {
        switch (type) {
            case 'Database': return <Database size={14} className="text-blue-600" />
            case 'Source Code': return <Code size={14} className="text-green-600" />
            case 'Server': return <Server size={14} className="text-purple-600" />
            case 'Application': return <Settings size={14} className="text-orange-600" />
            case 'Config': return <FileText size={14} className="text-amber-600" />
            case 'Files': return <FolderOpen size={14} className="text-slate-600" />
            default: return <Archive size={14} className="text-slate-400" />
        }
    }

    const getBackupTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Database': 'bg-purple-100 text-purple-700',
            'Source Code': 'bg-blue-100 text-blue-700',
            'Config': 'bg-orange-100 text-orange-700',
            'Full': 'bg-green-100 text-green-700',
            'Files': 'bg-slate-100 text-slate-700',
        }
        return colors[type] || 'bg-slate-100 text-slate-700'
    }

    const columns: ColumnDef<DeployBackupRecord>[] = [
        {
            accessorKey: "backup_date",
            header: "Date",
            size: 100,
            cell: ({ row }) => (
                <div className="text-sm text-slate-700">
                    {format(new Date(row.original.backup_date), 'd MMM yyyy', { locale: th })}
                </div>
            ),
        },
        {
            accessorKey: "backup_source_code",
            header: "Backup Source",
            size: 350,
            cell: ({ row }) => (
                <div>
                    <div className="flex items-center gap-2">
                        {getSourceTypeIcon(row.original.backup_source_type || '')}
                        <span className="font-mono text-sm font-medium text-slate-800">{row.original.backup_source_code}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[300px] ml-5">{row.original.backup_source_name}</div>
                </div>
            ),
        },
        {
            accessorKey: "backup_type",
            header: "Type",
            size: 110,
            cell: ({ row }) => {
                const type = row.original.backup_type
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded ${getBackupTypeColor(type)}`}>
                        {type}
                    </span>
                )
            },
        },
        {
            accessorKey: "version_number",
            header: "Ver",
            size: 60,
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
                    #{row.original.version_number}
                </span>
            ),
        },
        {
            accessorKey: "is_passed",
            header: "Result",
            size: 90,
            cell: ({ row }) => {
                const isPassed = row.original.is_passed
                return isPassed ? (
                    <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-medium">Pass</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-red-600" title={row.original.failed_reason || ''}>
                        <XCircle size={16} />
                        <span className="text-xs font-medium">Fail</span>
                    </span>
                )
            },
        },
        {
            accessorKey: "is_verified",
            header: "Verified",
            size: 80,
            cell: ({ row }) => {
                const isVerified = row.original.is_verified
                return isVerified ? (
                    <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={16} />
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-amber-500">
                        <Clock size={14} />
                    </span>
                )
            },
        },
        {
            accessorKey: "approval_status",
            header: "Approval",
            size: 100,
            cell: ({ row }) => {
                const record = row.original as any
                const status = record.approval_status || 'DRAFT'
                return <ApprovalStatusBadge status={status} size="sm" />
            },
        },
        {
            id: "actions",
            header: "",
            size: 100,
            cell: ({ row }) => {
                const record = row.original as any
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

    // Filter data by month if selected
    const filteredData = monthFilter !== "all"
        ? data.filter(d => new Date(d.backup_date).getMonth() + 1 === parseInt(monthFilter))
        : data

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top Row: Icon + Title + Score + Summary + Filters + Actions */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Database size={18} className="text-blue-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Deploy Backup</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {kpiData && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${kpiData.is_kpi_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {kpiData.is_kpi_passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {kpiData.pass_rate}%
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{kpiData.total} backups</span>
                                    <span className="text-emerald-600 font-medium">{kpiData.passed} pass</span>
                                    <span className="text-rose-600 font-medium">{kpiData.failed} fail</span>
                                </div>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            {/* Backup Source Filter */}
                            <div className="min-w-[200px]">
                                <SmartCombobox
                                    options={backupSources.map(s => ({ value: s.id, label: `${s.code}: ${s.name}` }))}
                                    value={backupSourceFilter ? { value: backupSourceFilter, label: backupSources.find(s => s.id === backupSourceFilter)?.code + ': ' + backupSources.find(s => s.id === backupSourceFilter)?.name || '' } : null}
                                    onChange={(opt) => setBackupSourceFilter(opt?.value?.toString() || null)}
                                    placeholder="All Sources"
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

                            <select
                                value={resultFilter}
                                onChange={(e) => setResultFilter(e.target.value as any)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="passed">Pass</option>
                                <option value="failed">Fail</option>
                            </select>

                            <select
                                value={verifiedFilter}
                                onChange={(e) => setVerifiedFilter(e.target.value as any)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                <option value="all">Verified ทั้งหมด</option>
                                <option value="verified">Verified</option>
                                <option value="pending">Pending</option>
                            </select>

                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>

                            {pendingCount > 0 && (
                                <button
                                    onClick={handleApproveAllPending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                >
                                    <CheckCircle2 size={14} />
                                    Approve ({pendingCount})
                                </button>
                            )}

                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <Plus size={14} />
                                New
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Monthly Trend Inline + Legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const item = monthlyTrend.find(t => t.month === month.value)
                                const hasData = item && item.total > 0
                                const isPass = hasData && item.is_pass
                                const rate = item?.pass_rate || 0
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
                            <span className="text-emerald-600 font-medium">100%: Pass</span>
                            <span className="text-rose-600 font-medium">&lt;100%: Fail</span>
                            <span className="text-slate-500">(Target: 100% Pass)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Embedded mode: minimal header */}
            {embedded && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">Target: 100% Pass - Maintain 5 versions</div>
                    <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                            <button
                                onClick={handleApproveAllPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                            >
                                <CheckCircle2 size={14} />
                                Approve ({pendingCount})
                            </button>
                        )}
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Plus size={14} />
                            New
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
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

            {/* Bottom Legend */}
            <div className="text-center text-xs text-slate-400">
                Target: Backup ทุกครั้งก่อน Deploy ต้อง Pass 100% และเก็บอย่างน้อย 5 versions
            </div>

            {/* Modal */}
            <DeployBackupModal
                open={isModalOpen}
                onClose={handleModalClose}
                record={selectedRecord}
                currentUserId={currentUserId}
            />
        </div>
    )
}
