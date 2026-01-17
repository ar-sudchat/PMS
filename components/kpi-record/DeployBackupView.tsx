'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { Plus, Edit, Trash2, CheckCircle2, Clock, X, Search, RefreshCw, Database, Code, Server, Settings, FileText, FolderOpen, Archive, XCircle, AlertTriangle, Send } from "lucide-react"
import { getDeployBackupRecords, deleteDeployBackupRecord, getBackupKPI, DeployBackupRecord, BackupKPIResult, submitDeployBackupForApproval } from "@/lib/actions/deploy-backup-actions"
import { getActiveBackupSources } from "@/lib/actions/backup-source-actions"
import { DeployBackupModal } from "@/components/kpi-record/DeployBackupModal"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { SmartCombobox } from "@/components/shared/SmartCombobox"
import { ApprovalStatusBadge } from "@/components/approval/ApprovalStatusBadge"

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

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [backupSourceFilter, setBackupSourceFilter] = useState<string | null>(null)
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
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

    const handleSubmitForApproval = async (record: DeployBackupRecord) => {
        try {
            const result = await submitDeployBackupForApproval(
                record.id,
                `Backup - ${record.backup_source_code} - ${format(new Date(record.backup_date), 'd MMM yyyy', { locale: th })}`
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

    const clearFilters = () => {
        setSearchQuery('')
        setBackupSourceFilter(null)
        setYearFilter(new Date().getFullYear())
        setVerifiedFilter('all')
        setResultFilter('all')
    }

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

    const getSourceTypeColor = (type: string) => {
        switch (type) {
            case 'Database': return 'bg-blue-100 text-blue-700'
            case 'Source Code': return 'bg-green-100 text-green-700'
            case 'Server': return 'bg-purple-100 text-purple-700'
            case 'Application': return 'bg-orange-100 text-orange-700'
            case 'Config': return 'bg-amber-100 text-amber-700'
            case 'Files': return 'bg-slate-100 text-slate-700'
            default: return 'bg-slate-100 text-slate-700'
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
                const status = record.approval_status || 'DRAFT'
                return (
                    <div className="flex items-center gap-1 justify-end">
                        {/* Submit for approval button - only for DRAFT status */}
                        {status === 'DRAFT' && (
                            <button
                                onClick={() => handleSubmitForApproval(record)}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
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
        <div className={embedded ? "p-4" : "p-6 w-full"}>
            {/* Page Header */}
            <div className={`flex items-center justify-between ${embedded ? 'mb-3' : 'mb-6'}`}>
                {!embedded && (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Deploy Backup Records</h1>
                        <p className="text-slate-500 text-sm mt-1">Track backups before deployment - Maintain 5 versions</p>
                    </div>
                )}
                {embedded && <div className="text-sm text-slate-500">Target: 100% Pass - Maintain 5 versions</div>}
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 font-medium text-sm"
                >
                    <Plus size={16} />
                    New Backup
                </button>
            </div>

            {/* KPI Summary */}
            {kpiData && (
                <div className={`rounded-xl border p-4 mb-6 ${kpiData.is_kpi_passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-slate-800">KPI Summary {yearFilter}</h3>
                        <span className="text-sm text-slate-500">Target: 100% Pass</span>
                    </div>

                    <div className="flex items-center gap-6 mb-3">
                        <div>
                            <span className="text-slate-500 text-sm">Total:</span>
                            <span className="font-bold ml-2 text-slate-800">{kpiData.total} backups</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <span className="text-sm text-green-600">Pass:</span>
                            <span className="font-bold text-green-600">{kpiData.passed}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <XCircle size={16} className="text-red-600" />
                            <span className="text-sm text-red-600">Fail:</span>
                            <span className="font-bold text-red-600">{kpiData.failed}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-sm">Rate:</span>
                            <span className="font-bold ml-2">{kpiData.pass_rate}%</span>
                        </div>
                        <div className={`font-bold px-3 py-1 rounded-full text-sm ${kpiData.is_kpi_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {kpiData.is_kpi_passed ? '✅ KPI Passed' : '❌ KPI Failed'}
                        </div>
                    </div>

                    {/* Failed Records */}
                    {kpiData.failed_records.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                            <div className="flex items-center gap-1 text-sm text-red-600 font-medium mb-2">
                                <AlertTriangle size={14} />
                                <span>Failed Records:</span>
                            </div>
                            <ul className="text-sm text-slate-600 space-y-1">
                                {kpiData.failed_records.slice(0, 5).map((r, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-slate-400">•</span>
                                        <span>
                                            <span className="font-medium">{format(new Date(r.date), 'd MMM yyyy', { locale: th })}</span>
                                            <span className="text-slate-400 mx-1">-</span>
                                            <span>{r.source_name}:</span>
                                            <span className="text-red-600 ml-1">{r.reason}</span>
                                        </span>
                                    </li>
                                ))}
                                {kpiData.failed_records.length > 5 && (
                                    <li className="text-slate-500 italic">...and {kpiData.failed_records.length - 5} more</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search source, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

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

                    {/* Result Filter */}
                    <select
                        value={resultFilter}
                        onChange={(e) => setResultFilter(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Results</option>
                        <option value="passed">Pass Only</option>
                        <option value="failed">Fail Only</option>
                    </select>

                    {/* Verified Filter */}
                    <select
                        value={verifiedFilter}
                        onChange={(e) => setVerifiedFilter(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Verified</option>
                        <option value="verified">Verified</option>
                        <option value="pending">Pending</option>
                    </select>

                    {/* Backup Source Filter */}
                    <div className="min-w-[220px]">
                        <SmartCombobox
                            options={backupSources.map(s => ({ value: s.id, label: `${s.code}: ${s.name}` }))}
                            value={backupSourceFilter ? { value: backupSourceFilter, label: backupSources.find(s => s.id === backupSourceFilter)?.code + ': ' + backupSources.find(s => s.id === backupSourceFilter)?.name || '' } : null}
                            onChange={(opt) => setBackupSourceFilter(opt?.value?.toString() || null)}
                            placeholder="All Sources"
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
                    {(searchQuery || backupSourceFilter || verifiedFilter !== 'all' || resultFilter !== 'all') && (
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
            <DeployBackupModal
                open={isModalOpen}
                onClose={handleModalClose}
                record={selectedRecord}
                currentUserId={currentUserId}
            />
        </div>
    )
}
