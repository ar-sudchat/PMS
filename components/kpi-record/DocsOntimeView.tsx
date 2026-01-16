'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { CheckCircle2, Clock, X, Search, RefreshCw, AlertCircle, FileText, User, AlertTriangle } from "lucide-react"
import { getDocsOntimeByOwner, getDocsOntimeKPIAllOwners, getActiveOwners, DeliverableWithOwner, DocsOntimeSummary, OwnerKPISummary } from "@/lib/actions/docs-ontime-actions"
import { getActiveProjects } from "@/lib/actions/project-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { SmartCombobox } from "@/components/shared/SmartCombobox"

interface DocsOntimeViewProps {
    currentUserId?: string
    currentUserName?: string
    embedded?: boolean
}

export default function DocsOntimeView({ currentUserId, currentUserName, embedded = false }: DocsOntimeViewProps) {
    const [data, setData] = useState<DeliverableWithOwner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    const [summary, setSummary] = useState<DocsOntimeSummary>({
        total: 0, on_time: 0, late: 0, pending: 0, overdue: 0, rate: 100, is_pass: true
    })
    const [allOwnerKPIs, setAllOwnerKPIs] = useState<OwnerKPISummary[]>([])

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [ownerFilter, setOwnerFilter] = useState<string | null>(currentUserId || null) // Default to current user
    const [statusFilter, setStatusFilter] = useState<'all' | 'on-time' | 'late' | 'pending' | 'overdue'>('all')
    const [projectFilter, setProjectFilter] = useState<string | null>(null)
    const [owners, setOwners] = useState<{ id: string, name: string }[]>([])
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getDocsOntimeByOwner({
                year: yearFilter,
                ownerId: ownerFilter || undefined,
                status: statusFilter,
                projectId: projectFilter || undefined,
                search: searchQuery || undefined,
                page: pagination.page,
                pageSize: pagination.pageSize
            })

            if (result.success) {
                setData(result.documents || [])
                setPagination(prev => ({
                    ...prev,
                    total: result.total || 0,
                    totalPages: result.totalPages || 0
                }))
                setSummary(result.summary)
            } else {
                toast.error("Failed to load docs on-time data")
            }

            // Fetch all owners KPI summary
            const kpiResult = await getDocsOntimeKPIAllOwners(yearFilter)
            if (kpiResult.success && kpiResult.data) {
                setAllOwnerKPIs(kpiResult.data)
            }
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, ownerFilter, statusFilter, projectFilter, searchQuery, pagination.page, pagination.pageSize])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const loadFilters = async () => {
            const [ownersRes, projectsRes] = await Promise.all([
                getActiveOwners(),
                getActiveProjects()
            ])
            if (ownersRes.success && ownersRes.data) {
                setOwners(ownersRes.data.map((o: any) => ({ id: o.id, name: o.name })))
            }
            if (projectsRes.success && projectsRes.data) {
                setProjects(projectsRes.data.map((p: any) => ({ id: p.id, name: `${p.project_code} - ${p.name}` })))
            }
        }
        loadFilters()
    }, [])

    const clearFilters = () => {
        setSearchQuery('')
        setOwnerFilter(currentUserId || null)
        setYearFilter(new Date().getFullYear())
        setStatusFilter('all')
        setProjectFilter(null)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'On-time':
                return (
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                        <CheckCircle2 size={14} />
                        On-time
                    </span>
                )
            case 'Late':
                return (
                    <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">
                        <AlertTriangle size={14} />
                        Late
                    </span>
                )
            case 'Pending':
                return (
                    <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                        <Clock size={14} />
                        Pending
                    </span>
                )
            case 'Overdue':
                return (
                    <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">
                        <AlertCircle size={14} />
                        Overdue
                    </span>
                )
            default:
                return <span className="text-slate-400">-</span>
        }
    }

    const columns: ColumnDef<DeliverableWithOwner>[] = [
        {
            accessorKey: "project_code",
            header: "Project",
            size: 200,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-slate-800">{row.original.project_code}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[180px]">{row.original.project_name}</div>
                </div>
            ),
        },
        {
            accessorKey: "milestone_name",
            header: "Milestone",
            size: 150,
            cell: ({ row }) => (
                <span className="text-sm text-slate-700">{row.original.milestone_name}</span>
            ),
        },
        {
            accessorKey: "document_name",
            header: "Document",
            size: 400,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-slate-800 truncate max-w-[380px]" title={row.original.document_name}>
                        {row.original.document_name}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "milestone_due_date",
            header: "Due Date",
            size: 100,
            cell: ({ row }) => (
                <span className="text-sm text-slate-700">
                    {format(new Date(row.original.milestone_due_date), 'd MMM yyyy', { locale: th })}
                </span>
            ),
        },
        {
            accessorKey: "submitted_date",
            header: "Submitted",
            size: 100,
            cell: ({ row }) => (
                row.original.submitted_date ? (
                    <span className="text-sm text-slate-700">
                        {format(new Date(row.original.submitted_date), 'd MMM yyyy', { locale: th })}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400 italic">-</span>
                )
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 100,
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: "owner_name",
            header: "Owner",
            size: 130,
            cell: ({ row }) => (
                <span className="text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {row.original.owner_name || '-'}
                </span>
            ),
        },
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    // Get current user's summary from allOwnerKPIs or use the general summary
    const currentOwnerKPI = ownerFilter
        ? allOwnerKPIs.find(k => k.owner_id === ownerFilter) || null
        : null
    const displaySummary = currentOwnerKPI || summary
    const displayOwnerName = currentOwnerKPI?.owner_name || (ownerFilter === currentUserId ? currentUserName : 'All Owners')

    return (
        <div className={embedded ? "p-4" : "p-6 w-full"}>
            {/* Page Header - only show when not embedded */}
            {!embedded && (
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Required Docs On-time</h1>
                        <p className="text-slate-500 text-sm mt-1">Track document submission - Target: &gt;= 95%</p>
                    </div>
                </div>
            )}

            {/* KPI Card */}
            <div className={`rounded-xl border-2 ${embedded ? 'p-4 mb-4' : 'p-5 mb-6'} ${displaySummary.is_pass ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <User size={24} className="text-slate-600" />
                    <span className="font-semibold text-lg text-slate-800">{displayOwnerName}</span>
                    {ownerFilter === currentUserId && (
                        <span className="text-sm text-slate-500">(Current User)</span>
                    )}
                </div>

                <div className="flex items-center gap-8">
                    {/* Big Rate Number */}
                    <div className="text-center">
                        <div className={`text-5xl font-bold ${displaySummary.is_pass ? 'text-green-600' : 'text-red-600'}`}>
                            {displaySummary.rate}%
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                            {displaySummary.on_time}/{displaySummary.on_time + displaySummary.late} On-time
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1">
                        <div className="w-full h-5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${displaySummary.is_pass ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(displaySummary.rate, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>0%</span>
                            <span className="text-orange-600 font-medium">95% Target</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Pass/Fail Badge */}
                    <div className={`px-5 py-3 rounded-lg font-bold text-lg ${displaySummary.is_pass
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {displaySummary.is_pass ? '✅ Pass' : '❌ Below Target'}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm mt-4">
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded font-medium">
                        ✅ {displaySummary.on_time} On-time
                    </span>
                    <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded font-medium">
                        ⚠️ {displaySummary.late} Late
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-medium">
                        ⏳ {displaySummary.pending} Pending
                    </span>
                    {displaySummary.overdue > 0 && (
                        <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded font-medium">
                            🔴 {displaySummary.overdue} Overdue
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className={`bg-white border border-slate-200 rounded-xl ${embedded ? 'p-3 mb-3' : 'p-4 mb-4'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search project, document..."
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

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="on-time">On-time</option>
                        <option value="late">Late</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                    </select>

                    {/* Owner Filter */}
                    <div className="min-w-[180px]">
                        <SmartCombobox
                            options={[
                                { value: '', label: 'All Owners' },
                                ...owners.map(o => ({ value: o.id, label: o.name }))
                            ]}
                            value={ownerFilter ? { value: ownerFilter, label: owners.find(o => o.id === ownerFilter)?.name || currentUserName || 'User' } : { value: '', label: 'All Owners' }}
                            onChange={(opt) => setOwnerFilter(opt?.value?.toString() || null)}
                            placeholder="Owner"
                        />
                    </div>

                    {/* Project Filter */}
                    <div className="min-w-[200px]">
                        <SmartCombobox
                            options={projects.map(p => ({ value: p.id, label: p.name }))}
                            value={projectFilter ? { value: projectFilter, label: projects.find(p => p.id === projectFilter)?.name || '' } : null}
                            onChange={(opt) => setProjectFilter(opt?.value?.toString() || null)}
                            placeholder="All Projects"
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
                    {(searchQuery || ownerFilter !== currentUserId || statusFilter !== 'all' || projectFilter) && (
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

            {/* Document Table */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${embedded ? 'mb-4' : 'mb-6'}`}>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={18} />
                        Document List
                    </h3>
                </div>
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

            {/* All Owners Summary Table */}
            {allOwnerKPIs.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">All Owners Summary ({yearFilter})</h3>
                        <span className="text-sm text-slate-500">Target: &gt;= 95%</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Owner</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Total</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">On-time</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Late</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Pending</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Overdue</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Rate</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">KPI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOwnerKPIs.map((kpi) => (
                                    <tr
                                        key={kpi.owner_id}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${kpi.owner_id === ownerFilter ? 'bg-blue-50' : ''}`}
                                        onClick={() => setOwnerFilter(kpi.owner_id)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-800">{kpi.owner_name}</span>
                                            {kpi.owner_id === currentUserId && (
                                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                                            )}
                                        </td>
                                        <td className="text-center px-4 py-3 font-medium text-slate-700">{kpi.total}</td>
                                        <td className="text-center px-4 py-3 text-green-600 font-medium">{kpi.on_time}</td>
                                        <td className="text-center px-4 py-3 text-orange-600 font-medium">{kpi.late}</td>
                                        <td className="text-center px-4 py-3 text-slate-500">{kpi.pending}</td>
                                        <td className="text-center px-4 py-3 text-red-600 font-medium">{kpi.overdue}</td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`font-bold ${kpi.rate >= 95 ? 'text-green-600' : kpi.rate >= 80 ? 'text-orange-600' : 'text-red-600'}`}>
                                                {kpi.rate}%
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
        </div>
    )
}
