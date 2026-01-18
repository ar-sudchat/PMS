'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { SuperTable } from "@/components/shared/SuperTable/SuperTable"
import { CheckCircle2, Clock, X, Search, RefreshCw, AlertCircle, FileText, User, AlertTriangle, Target, TrendingUp, Award, Users } from "lucide-react"
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
    const [ownerFilter, setOwnerFilter] = useState<string | null>(currentUserId || null)
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
                    <span className="flex items-center gap-1.5 text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 size={13} />
                        On-time
                    </span>
                )
            case 'Late':
                return (
                    <span className="flex items-center gap-1.5 text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                        <AlertTriangle size={13} />
                        Late
                    </span>
                )
            case 'Pending':
                return (
                    <span className="flex items-center gap-1.5 text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200">
                        <Clock size={13} />
                        Pending
                    </span>
                )
            case 'Overdue':
                return (
                    <span className="flex items-center gap-1.5 text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-200">
                        <AlertCircle size={13} />
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
                    <div className="font-semibold text-slate-800">{row.original.project_code}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[180px]">{row.original.project_name}</div>
                </div>
            ),
        },
        {
            accessorKey: "milestone_name",
            header: "Milestone",
            size: 150,
            cell: ({ row }) => (
                <span className="text-sm text-slate-700 font-medium">{row.original.milestone_name}</span>
            ),
        },
        {
            accessorKey: "document_name",
            header: "Document",
            size: 400,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                        <FileText size={14} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate max-w-[360px]" title={row.original.document_name}>
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
            size: 110,
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: "owner_name",
            header: "Owner",
            size: 130,
            cell: ({ row }) => (
                <span className="text-sm font-medium text-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 px-2.5 py-1 rounded-full border border-violet-200">
                    {row.original.owner_name || '-'}
                </span>
            ),
        },
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const currentOwnerKPI = ownerFilter
        ? allOwnerKPIs.find(k => k.owner_id === ownerFilter) || null
        : null
    const displaySummary = currentOwnerKPI || summary
    const displayOwnerName = currentOwnerKPI?.owner_name || (ownerFilter === currentUserId ? currentUserName : 'All Owners')

    // Calculate pass/fail counts
    const passCount = allOwnerKPIs.filter(k => k.is_pass).length
    const failCount = allOwnerKPIs.filter(k => !k.is_pass).length

    // Score gradient based on rate
    const getScoreGradient = (rate: number) => {
        if (rate >= 95) return 'from-emerald-500 via-green-500 to-teal-500'
        if (rate >= 85) return 'from-yellow-500 via-amber-500 to-orange-500'
        return 'from-rose-500 via-red-500 to-pink-500'
    }

    return (
        <div className={embedded ? "p-4" : "p-6 w-full"}>
            {/* Page Header with Gradient */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-6 mb-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <FileText size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Required Docs On-time</h1>
                                <p className="text-cyan-100 text-sm mt-1">Track document submission timeliness - Target: &ge; 95%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                <div className="text-white/70 text-xs">Pass Rate</div>
                                <div className="text-white font-bold text-lg">{passCount}/{allOwnerKPIs.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Summary Card */}
            <div className={`rounded-2xl shadow-lg overflow-hidden ${embedded ? 'mb-4' : 'mb-6'}`}>
                <div className={`p-6 ${displaySummary.is_pass
                    ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200'
                    : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-2 border-rose-200'
                    }`}>
                    {/* Owner Info */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2.5 rounded-xl ${displaySummary.is_pass ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            <User size={22} className={displaySummary.is_pass ? 'text-emerald-600' : 'text-rose-600'} />
                        </div>
                        <div>
                            <span className="font-bold text-lg text-slate-800">{displayOwnerName}</span>
                            {ownerFilter === currentUserId && (
                                <span className="ml-2 text-sm text-slate-500">(You)</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Big Rate Circle */}
                        <div className="relative">
                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getScoreGradient(displaySummary.rate)} p-1`}>
                                <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-black ${displaySummary.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {displaySummary.rate}%
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">On-time Rate</span>
                                </div>
                            </div>
                            {displaySummary.is_pass && (
                                <div className="absolute -top-1 -right-1 p-1.5 bg-emerald-500 rounded-full shadow-lg">
                                    <Award size={16} className="text-white" />
                                </div>
                            )}
                        </div>

                        {/* Progress Bar & Target */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-600">Progress to Target</span>
                                <span className={`text-sm font-bold ${displaySummary.rate >= 95 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {displaySummary.on_time}/{displaySummary.on_time + displaySummary.late} On-time
                                </span>
                            </div>
                            <div className="relative">
                                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getScoreGradient(displaySummary.rate)}`}
                                        style={{ width: `${Math.min(displaySummary.rate, 100)}%` }}
                                    />
                                </div>
                                {/* Target marker */}
                                <div className="absolute top-0 h-4 w-0.5 bg-slate-700" style={{ left: '95%' }} />
                                <div className="absolute -top-5 text-xs font-bold text-slate-600" style={{ left: '95%', transform: 'translateX(-50%)' }}>
                                    95%
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>0%</span>
                                <span className="text-amber-600 font-semibold">Target: 95%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Pass/Fail Badge */}
                        <div className={`px-6 py-4 rounded-2xl font-bold text-lg shadow-lg ${displaySummary.is_pass
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                            : 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                            }`}>
                            {displaySummary.is_pass ? '✓ PASS' : '✗ BELOW TARGET'}
                        </div>
                    </div>

                    {/* Stats Pills */}
                    <div className="flex gap-3 text-sm mt-5">
                        <span className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl font-semibold border border-emerald-200 shadow-sm">
                            <CheckCircle2 size={14} className="inline mr-1.5" />
                            {displaySummary.on_time} On-time
                        </span>
                        <span className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-xl font-semibold border border-amber-200 shadow-sm">
                            <AlertTriangle size={14} className="inline mr-1.5" />
                            {displaySummary.late} Late
                        </span>
                        <span className="px-4 py-2 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 rounded-xl font-semibold border border-slate-200 shadow-sm">
                            <Clock size={14} className="inline mr-1.5" />
                            {displaySummary.pending} Pending
                        </span>
                        {displaySummary.overdue > 0 && (
                            <span className="px-4 py-2 bg-gradient-to-r from-rose-100 to-red-100 text-rose-700 rounded-xl font-semibold border border-rose-200 shadow-sm">
                                <AlertCircle size={14} className="inline mr-1.5" />
                                {displaySummary.overdue} Overdue
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm ${embedded ? 'p-3 mb-3' : 'p-4 mb-5'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search project, document..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none bg-white"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none bg-white"
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
                        className="p-2.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    {/* Clear Filters */}
                    {(searchQuery || ownerFilter !== currentUserId || statusFilter !== 'all' || projectFilter) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Document Table */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${embedded ? 'mb-4' : 'mb-6'}`}>
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText size={18} className="text-cyan-600" />
                        Document List
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} documents)</span>
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
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-700">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
                            <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of{' '}
                            <span className="font-medium text-slate-700">{pagination.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg font-medium">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={18} className="text-violet-600" />
                            All Owners Summary ({yearFilter})
                        </h3>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-semibold">
                                Pass: {passCount}
                            </span>
                            <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg font-semibold">
                                Fail: {failCount}
                            </span>
                            <span className="text-slate-500">Target: &ge; 95%</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-5 py-3.5 text-sm font-semibold text-slate-600">Owner</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Total</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">On-time</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Late</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Pending</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Overdue</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">Rate</th>
                                    <th className="text-center px-4 py-3.5 text-sm font-semibold text-slate-600">KPI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOwnerKPIs.map((kpi) => (
                                    <tr
                                        key={kpi.owner_id}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${kpi.owner_id === ownerFilter ? 'bg-cyan-50 hover:bg-cyan-100' : ''}`}
                                        onClick={() => setOwnerFilter(kpi.owner_id)}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${kpi.is_pass
                                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                                    : 'bg-gradient-to-br from-rose-500 to-red-600'
                                                    }`}>
                                                    {kpi.owner_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-800">{kpi.owner_name}</span>
                                                    {kpi.owner_id === currentUserId && (
                                                        <span className="ml-2 text-xs text-cyan-600 font-medium">(You)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-3.5 font-semibold text-slate-700">{kpi.total}</td>
                                        <td className="text-center px-4 py-3.5 font-semibold text-emerald-600">{kpi.on_time}</td>
                                        <td className="text-center px-4 py-3.5 font-semibold text-amber-600">{kpi.late}</td>
                                        <td className="text-center px-4 py-3.5 text-slate-500">{kpi.pending}</td>
                                        <td className="text-center px-4 py-3.5 font-semibold text-rose-600">{kpi.overdue}</td>
                                        <td className="text-center px-4 py-3.5">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${kpi.rate >= 95 ? 'bg-emerald-500' : kpi.rate >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(kpi.rate, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`font-bold ${kpi.rate >= 95 ? 'text-emerald-600' : kpi.rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    {kpi.rate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${kpi.is_pass
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                                                }`}>
                                                {kpi.is_pass ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                {kpi.is_pass ? 'Pass' : 'Fail'}
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
