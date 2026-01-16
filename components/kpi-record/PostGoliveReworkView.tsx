"use client"

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import {
    getPostGoliveReworkSummary,
    getPostGoliveReworkProjects,
    getProjectsExceedingTarget,
    getProjectOwnersForRework,
    getAvailableYearsForRework,
    PostGoliveReworkSummary,
    PostGoliveReworkProject,
    ProjectExceedingTarget
} from '@/lib/actions/post-golive-rework-actions'

const TARGET_RATIO = 8

interface PostGoliveReworkViewProps {
    embedded?: boolean
}

export default function PostGoliveReworkView({ embedded = false }: PostGoliveReworkViewProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [summary, setSummary] = useState<PostGoliveReworkSummary | null>(null)
    const [projects, setProjects] = useState<PostGoliveReworkProject[]>([])
    const [exceedingProjects, setExceedingProjects] = useState<ProjectExceedingTarget[]>([])
    const [owners, setOwners] = useState<{ id: string; name: string }[]>([])
    const [availableYears, setAvailableYears] = useState<number[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'post-golive'>('all')
    const [ownerFilter, setOwnerFilter] = useState<string>('')

    // Fetch initial data
    useEffect(() => {
        fetchYears()
    }, [])

    useEffect(() => {
        if (yearFilter) {
            fetchData()
            fetchOwners()
        }
    }, [yearFilter, statusFilter, ownerFilter])

    const fetchYears = async () => {
        const result = await getAvailableYearsForRework()
        if (result.success) {
            setAvailableYears(result.data)
            if (result.data.length > 0 && !result.data.includes(yearFilter)) {
                setYearFilter(result.data[0])
            }
        }
    }

    const fetchOwners = async () => {
        const result = await getProjectOwnersForRework(yearFilter)
        if (result.success) {
            setOwners(result.data)
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [summaryRes, projectsRes, exceedingRes] = await Promise.all([
                getPostGoliveReworkSummary(yearFilter),
                getPostGoliveReworkProjects({
                    year: yearFilter,
                    status: statusFilter,
                    ownerId: ownerFilter || undefined
                }),
                getProjectsExceedingTarget(yearFilter)
            ])

            if (summaryRes.success) setSummary(summaryRes.data)
            if (projectsRes.success) setProjects(projectsRes.data)
            if (exceedingRes.success) setExceedingProjects(exceedingRes.data)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = () => {
        fetchData()
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Year options
    const yearOptions = availableYears.map(y => ({ value: String(y), label: String(y) }))
    if (!yearOptions.find(o => o.value === String(yearFilter))) {
        yearOptions.unshift({ value: String(yearFilter), label: String(yearFilter) })
    }

    // Status options
    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'closed', label: 'Closed' },
        { value: 'post-golive', label: 'Post Go-Live' }
    ]

    // Owner options
    const ownerOptions = [
        { value: '', label: 'All Owners' },
        ...owners.map(o => ({ value: o.id, label: o.name }))
    ]

    // Table columns
    const columns = [
        {
            header: 'Project',
            accessorKey: 'project_code',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <div>
                    <p className="font-medium text-slate-900">{row.original.project_code}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[280px]">{row.original.project_name}</p>
                </div>
            ),
            size: 300,
        },
        {
            header: 'Owner',
            accessorKey: 'owner_name',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-slate-700">{row.original.owner_name}</span>
            ),
            size: 200,
        },
        {
            header: 'Go-Live',
            accessorKey: 'golive_completed_date',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-slate-600 text-sm">{formatDate(row.original.golive_completed_date)}</span>
            ),
            size: 110,
        },
        {
            header: 'Status',
            accessorKey: 'project_status',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => {
                const status = row.original.project_status
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'Closed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {status === 'Closed' ? 'Closed' : 'Post GL'}
                    </span>
                )
            },
            size: 100,
        },
        {
            header: 'Total MD',
            accessorKey: 'total_manday',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-slate-700 font-medium">{row.original.total_manday}</span>
            ),
            size: 90,
        },
        {
            header: 'Rework',
            accessorKey: 'rework_manday',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-slate-700">{row.original.rework_manday}</span>
            ),
            size: 90,
        },
        {
            header: 'Ratio',
            accessorKey: 'rework_ratio',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => {
                const { rework_ratio, is_pass } = row.original
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${is_pass
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {is_pass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {rework_ratio}%
                    </span>
                )
            },
            size: 100,
        },
    ]

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full"}>
            {/* Header - only show when not embedded */}
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Wrench className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Post Go-live Rework Ratio</h1>
                            <p className="text-slate-500">Target: &le; {TARGET_RATIO}%</p>
                        </div>
                    </div>
                    <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className={`flex flex-wrap items-center gap-4 bg-white ${embedded ? 'p-3' : 'p-4'} rounded-xl border border-slate-200`}>
                <div className="w-32">
                    <SmartCombobox
                        options={yearOptions}
                        value={yearOptions.find(o => o.value === String(yearFilter)) || null}
                        onChange={(opt) => setYearFilter(Number(opt?.value || new Date().getFullYear()))}
                        placeholder="Year"
                    />
                </div>
                <div className="w-40">
                    <SmartCombobox
                        options={statusOptions}
                        value={statusOptions.find(o => o.value === statusFilter) || statusOptions[0]}
                        onChange={(opt) => setStatusFilter((opt?.value as 'all' | 'closed' | 'post-golive') || 'all')}
                        placeholder="Status"
                    />
                </div>
                <div className="w-52">
                    <SmartCombobox
                        options={ownerOptions}
                        value={ownerOptions.find(o => o.value === ownerFilter) || ownerOptions[0]}
                        onChange={(opt) => setOwnerFilter(opt?.value?.toString() || '')}
                        placeholder="Owner"
                    />
                </div>
            </div>

            {/* Summary Card */}
            {summary && (
                <div className={`bg-white rounded-xl border border-slate-200 ${embedded ? 'p-4' : 'p-6'}`}>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        Summary {yearFilter}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main KPI */}
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg">
                            <div className={`text-4xl font-bold ${summary.is_pass ? 'text-green-600' : 'text-red-600'}`}>
                                {summary.overall_ratio}%
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {summary.is_pass ? (
                                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                        <CheckCircle2 size={16} /> Pass (Target &le; {TARGET_RATIO}%)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                        <XCircle size={16} /> Fail (Target &le; {TARGET_RATIO}%)
                                    </span>
                                )}
                            </div>
                            {/* Progress bar */}
                            <div className="w-full mt-3">
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${summary.is_pass ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(summary.overall_ratio / (TARGET_RATIO * 2) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-2xl font-bold text-slate-800">{summary.total_projects}</p>
                                <p className="text-xs text-slate-500">Total Projects</p>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{summary.closed_count}</p>
                                <p className="text-xs text-slate-500">Closed</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                <p className="text-2xl font-bold text-yellow-600">{summary.post_golive_count}</p>
                                <p className="text-xs text-slate-500">Post GL</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <p className="text-2xl font-bold text-slate-800">{summary.total_manday}</p>
                                <p className="text-xs text-slate-500">Total MD</p>
                            </div>
                        </div>

                        {/* Pass/Fail Stats */}
                        <div className="flex flex-col justify-center gap-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm text-slate-600">Rework Manday</span>
                                <span className="font-bold text-slate-800">{summary.rework_manday} MD</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <span className="text-sm text-green-700">Projects Pass</span>
                                <span className="font-bold text-green-700">{summary.projects_pass}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <span className="text-sm text-red-700">Projects Fail</span>
                                <span className="font-bold text-red-700">{summary.projects_fail}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert: Projects Exceeding Target */}
            {exceedingProjects.length > 0 && (
                <div className={`bg-red-50 border border-red-200 rounded-xl ${embedded ? 'p-3' : 'p-4'}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-800">
                            Projects Exceeding Target (&gt; {TARGET_RATIO}%)
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {exceedingProjects.map((proj, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                                <div>
                                    <span className="font-medium text-slate-800">{proj.project_code}</span>
                                    <span className="text-slate-500 ml-2">{proj.project_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-red-600 font-bold">{proj.rework_ratio}%</span>
                                    <span className="text-slate-500">
                                        ({proj.rework_manday} MD / {proj.total_manday} MD)
                                    </span>
                                    <span className="text-red-500">Over by {proj.over_by}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className={`${embedded ? 'p-3' : 'p-4'} border-b border-slate-200`}>
                    <h3 className="font-semibold text-slate-800">Project Breakdown</h3>
                </div>
                <SuperTable
                    data={projects}
                    columns={columns}
                    isLoading={isLoading}
                    size="sm"
                />
            </div>
        </div>
    )
}
