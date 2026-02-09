"use client"

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Wrench, Target, TrendingDown, FolderKanban, Users, X, Award, BarChart3 } from 'lucide-react'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import {
    getPostGoliveReworkSummary,
    getPostGoliveReworkProjects,
    getProjectsExceedingTarget,
    getProjectOwnersForRework,
    getAvailableYearsForRework,
    getPostGoliveReworkMonthlyTrend,
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
    const [monthlyTrend, setMonthlyTrend] = useState<{ month: number; month_name: string; total_projects: number; total_manday: number; rework_manday: number; rework_ratio: number; is_pass: boolean }[]>([])

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'post-golive'>('all')
    const [ownerFilter, setOwnerFilter] = useState<string>('')

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
            const [summaryRes, projectsRes, exceedingRes, trendRes] = await Promise.all([
                getPostGoliveReworkSummary(yearFilter),
                getPostGoliveReworkProjects({
                    year: yearFilter,
                    status: statusFilter,
                    ownerId: ownerFilter || undefined
                }),
                getProjectsExceedingTarget(yearFilter),
                getPostGoliveReworkMonthlyTrend(yearFilter)
            ])

            if (summaryRes.success) setSummary(summaryRes.data)
            if (projectsRes.success) setProjects(projectsRes.data)
            if (exceedingRes.success) setExceedingProjects(exceedingRes.data)
            if (trendRes.success) setMonthlyTrend(trendRes.data)
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

    // Score gradient
    const getScoreGradient = (ratio: number) => {
        if (ratio <= 8) return 'from-emerald-500 via-green-500 to-teal-500'
        if (ratio <= 12) return 'from-yellow-500 via-amber-500 to-orange-500'
        return 'from-rose-500 via-red-500 to-pink-500'
    }

    // Table columns
    const columns = [
        {
            header: 'Project',
            accessorKey: 'project_code',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.original.project_code}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[280px]">{row.original.project_name}</p>
                </div>
            ),
            size: 300,
        },
        {
            header: 'Owner',
            accessorKey: 'owner_name',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-sm font-medium text-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 px-2.5 py-1 rounded-full border border-violet-200">
                    {row.original.owner_name}
                </span>
            ),
            size: 200,
        },
        {
            header: 'Go-Live',
            accessorKey: 'golive_completed_date',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-sm text-slate-600 font-medium">{formatDate(row.original.golive_completed_date)}</span>
            ),
            size: 110,
        },
        {
            header: 'Status',
            accessorKey: 'project_status',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => {
                const status = row.original.project_status
                return (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${status === 'Closed'
                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
                        : 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200'
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
                <span className="text-slate-800 font-bold text-lg">{row.original.total_manday}</span>
            ),
            size: 90,
        },
        {
            header: 'Rework',
            accessorKey: 'rework_manday',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => (
                <span className="text-amber-600 font-bold text-lg">{row.original.rework_manday}</span>
            ),
            size: 90,
        },
        {
            header: 'Ratio',
            accessorKey: 'rework_ratio',
            cell: ({ row }: { row: { original: PostGoliveReworkProject } }) => {
                const { rework_ratio, is_pass } = row.original
                return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${is_pass
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                        : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                        }`}>
                        {is_pass ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {rework_ratio}%
                    </span>
                )
            },
            size: 100,
        },
    ]

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full"}>
            {/* Header with Gradient */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Wrench size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Post Go-live Rework Ratio</h1>
                                <p className="text-orange-100 text-sm mt-1">Measure rework effort after go-live - Target: &le; {TARGET_RATIO}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {summary && (
                                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <div className="text-white/70 text-xs">Projects Pass</div>
                                    <div className="text-white font-bold text-lg">{summary.projects_pass}/{summary.total_projects}</div>
                                </div>
                            )}
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all"
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={`flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-sm ${embedded ? 'p-3' : 'p-4'} rounded-xl border border-slate-200 shadow-sm`}>
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
                {(statusFilter !== 'all' || ownerFilter) && (
                    <button
                        onClick={() => { setStatusFilter('all'); setOwnerFilter('') }}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium"
                    >
                        <X size={16} />
                        Clear
                    </button>
                )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                        <BarChart3 size={18} className="text-amber-600" />
                    </div>
                    Monthly Trend - {yearFilter}
                    <span className="text-sm font-normal text-slate-500 ml-2">(Lower is better)</span>
                </h3>
                <div className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const monthData = monthlyTrend.find(m => m.month === month)
                        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

                        if (!monthData || monthData.total_projects === 0) {
                            return (
                                <div key={month} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                    <div className="text-xs font-medium text-slate-400 mb-1">{monthNames[month - 1]}</div>
                                    <div className="text-sm font-bold text-slate-300">-</div>
                                    <div className="text-xs text-slate-300">No data</div>
                                </div>
                            )
                        }

                        const reworkManday = monthData.rework_manday || 0
                        const totalManday = monthData.total_manday || 0
                        const ratio = totalManday > 0 ? (reworkManday / totalManday) * 100 : 0
                        const isPass = ratio <= 8

                        return (
                            <div
                                key={month}
                                className={`rounded-lg p-2 text-center border ${
                                    isPass
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-rose-50 border-rose-200'
                                }`}
                            >
                                <div className={`text-xs font-medium mb-1 ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {monthNames[month - 1]}
                                </div>
                                <div className={`text-sm font-bold ${isPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {ratio.toFixed(2)}%
                                </div>
                                <div className={`text-xs ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {reworkManday.toFixed(1)}/{totalManday.toFixed(1)}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-5 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded" />
                        <span className="font-medium">Pass (≤ 8%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-rose-100 border border-rose-300 rounded" />
                        <span className="font-medium">Fail (&gt; 8%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded" />
                        <span className="font-medium">No Data</span>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            {summary && (
                <div className={`bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden ${embedded ? 'p-4' : 'p-6'}`}>
                    <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                            <TrendingDown size={18} className="text-amber-600" />
                        </div>
                        Summary {yearFilter}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main KPI */}
                        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${summary.is_pass
                            ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200'
                            : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-2 border-rose-200'
                            }`}>
                            <div className="relative">
                                <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${getScoreGradient(summary.overall_ratio)} p-1`}>
                                    <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                                        <span className={`text-3xl font-black ${summary.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {summary.overall_ratio}%
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">Rework Ratio</span>
                                    </div>
                                </div>
                                {summary.is_pass && (
                                    <div className="absolute -top-1 -right-1 p-1.5 bg-emerald-500 rounded-full shadow-lg">
                                        <Award size={14} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div className={`mt-4 px-4 py-2 rounded-xl font-bold ${summary.is_pass
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                                }`}>
                                {summary.is_pass ? '✓ PASS' : '✗ OVER TARGET'}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">Target: &le; {TARGET_RATIO}%</div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200">
                                <div className="p-2 bg-slate-100 rounded-lg inline-block mb-2">
                                    <FolderKanban size={18} className="text-slate-600" />
                                </div>
                                <p className="text-2xl font-black text-slate-800">{summary.total_projects}</p>
                                <p className="text-xs text-slate-500 font-medium">Total Projects</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                <div className="p-2 bg-blue-100 rounded-lg inline-block mb-2">
                                    <CheckCircle2 size={18} className="text-blue-600" />
                                </div>
                                <p className="text-2xl font-black text-blue-600">{summary.closed_count}</p>
                                <p className="text-xs text-slate-500 font-medium">Closed</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                                <div className="p-2 bg-amber-100 rounded-lg inline-block mb-2">
                                    <Target size={18} className="text-amber-600" />
                                </div>
                                <p className="text-2xl font-black text-amber-600">{summary.post_golive_count}</p>
                                <p className="text-xs text-slate-500 font-medium">Post GL</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200">
                                <div className="p-2 bg-slate-100 rounded-lg inline-block mb-2">
                                    <Users size={18} className="text-slate-600" />
                                </div>
                                <p className="text-2xl font-black text-slate-800">{summary.total_manday}</p>
                                <p className="text-xs text-slate-500 font-medium">Total MD</p>
                            </div>
                        </div>

                        {/* Pass/Fail Stats */}
                        <div className="flex flex-col justify-center gap-3">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <Wrench size={16} className="text-amber-600" />
                                    <span className="text-sm text-slate-600 font-medium">Rework Manday</span>
                                </div>
                                <span className="font-black text-amber-600 text-lg">{summary.rework_manday} MD</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    <span className="text-sm text-emerald-700 font-medium">Projects Pass</span>
                                </div>
                                <span className="font-black text-emerald-600 text-lg">{summary.projects_pass}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-red-50 rounded-xl border border-rose-200">
                                <div className="flex items-center gap-2">
                                    <XCircle size={16} className="text-rose-600" />
                                    <span className="text-sm text-rose-700 font-medium">Projects Fail</span>
                                </div>
                                <span className="font-black text-rose-600 text-lg">{summary.projects_fail}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert: Projects Exceeding Target */}
            {exceedingProjects.length > 0 && (
                <div className={`rounded-2xl overflow-hidden shadow-sm ${embedded ? 'p-3' : 'p-5'}`} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-rose-700" />
                        </div>
                        <h3 className="font-bold text-rose-800 text-lg">
                            Projects Exceeding Target (&gt; {TARGET_RATIO}%)
                        </h3>
                        <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full text-sm font-semibold">{exceedingProjects.length}</span>
                    </div>
                    <div className="space-y-2">
                        {exceedingProjects.map((proj, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-xl px-5 py-3 border border-rose-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                        {proj.project_code?.substring(0, 2) || '?'}
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800">{proj.project_code}</span>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{proj.project_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="px-3 py-1.5 bg-rose-500 text-white rounded-full font-bold shadow-sm">{proj.rework_ratio}%</span>
                                    <span className="text-slate-500 font-medium">
                                        {proj.rework_manday} / {proj.total_manday} MD
                                    </span>
                                    <span className="text-rose-600 font-bold">+{proj.over_by}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`${embedded ? 'p-3' : 'px-5 py-4'} border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between`}>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-amber-600" />
                        Project Breakdown
                        <span className="text-sm font-normal text-slate-500 ml-2">({projects.length} projects)</span>
                    </h3>
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
