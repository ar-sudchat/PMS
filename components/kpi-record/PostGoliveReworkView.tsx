"use client"

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { getProjectById } from '@/lib/actions/project-actions'
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Wrench, Target, TrendingDown, FolderKanban, Users, X, Award, BarChart3 } from 'lucide-react'
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

    // Project edit modal
    const [selectedProject, setSelectedProject] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleRowClick = async (projectId: string) => {
        try {
            const result = await getProjectById(projectId)
            if (result.success && result.data) {
                setSelectedProject(result.data)
                setIsModalOpen(true)
            }
        } catch (error) {
            console.error('Error fetching project:', error)
        }
    }

    // Filters
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'post-golive'>('all')
    const [ownerFilter, setOwnerFilter] = useState<string>('')
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

    // Table sort


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

    // Filtered data by selected month
    const filteredByMonth = useMemo(() => {
        const monthFilter = (p: { golive_completed_date: string }) => {
            if (!selectedMonth) return true
            const d = new Date(p.golive_completed_date)
            return d.getMonth() + 1 === selectedMonth
        }

        const fp = projects.filter(monthFilter)
        const fpIds = new Set(fp.map(p => p.project_id))
        const fe = exceedingProjects.filter(p => !selectedMonth || fpIds.has(p.project_id))

        if (selectedMonth && summary) {
            const totalManday = fp.reduce((sum, p) => sum + (p.sold_mandays || 0), 0)
            const reworkManday = fp.reduce((sum, p) => sum + (p.rework_manday || 0), 0)
            const overallRatio = totalManday > 0 ? Math.round((reworkManday / totalManday) * 100 * 100) / 100 : 0
            const passCount = fp.filter(p => p.is_pass).length
            const failCount = fp.filter(p => !p.is_pass).length
            return {
                projects: fp,
                exceedingProjects: fe,
                summary: {
                    ...summary,
                    total_projects: fp.length,
                    closed_count: fp.filter(p => p.project_status === 'Closed').length,
                    post_golive_count: fp.filter(p => p.project_status !== 'Closed').length,
                    total_manday: Math.round(totalManday * 10) / 10,
                    rework_manday: Math.round(reworkManday * 10) / 10,
                    overall_ratio: overallRatio,
                    projects_pass: passCount,
                    projects_fail: failCount,
                    is_pass: overallRatio <= TARGET_RATIO
                }
            }
        }

        return { projects: fp, exceedingProjects: fe, summary }
    }, [projects, exceedingProjects, summary, selectedMonth])

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

    // SuperTable column definitions for Project Breakdown
    const projectColumns: ColumnDef<PostGoliveReworkProject, any>[] = useMemo(() => [
        {
            id: 'row_number',
            header: '#',
            size: 50,
            enableSorting: false,
            cell: ({ row, table }) => {
                const rows = table.getRowModel().rows
                const idx = rows.findIndex(r => r.id === row.id)
                const { pageIndex, pageSize } = table.getState().pagination
                return <span className="text-sm text-slate-400 font-medium">{pageIndex * pageSize + idx + 1}</span>
            },
        },
        {
            accessorKey: 'project_code',
            header: 'Code',
            size: 100,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.original.is_pass ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-slate-800 text-sm">{row.original.project_code}</span>
                </div>
            ),
        },
        {
            accessorKey: 'project_name',
            header: 'Name',
            size: 300,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.project_name}</span>
            ),
        },
        {
            accessorKey: 'owner_name',
            header: 'Owner',
            size: 140,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.owner_name || '-'}</span>
            ),
        },
        {
            accessorKey: 'golive_completed_date',
            header: 'Go-Live',
            size: 110,
            cell: ({ row }) => (
                <span className="text-xs text-slate-500">{formatDate(row.original.golive_completed_date)}</span>
            ),
        },
        {
            accessorKey: 'sold_mandays',
            header: 'Sold MD',
            size: 90,
            cell: ({ row }) => (
                <div className="text-right">
                    <span className="text-sm font-bold text-slate-700">{row.original.sold_mandays}</span>
                </div>
            ),
        },
        {
            accessorKey: 'rework_manday',
            header: 'Rework MD',
            size: 100,
            cell: ({ row }) => (
                <div className="text-right">
                    <span className={`text-sm font-bold ${row.original.rework_manday > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                        {row.original.rework_manday}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'rework_ratio',
            header: 'Ratio',
            size: 160,
            cell: ({ row }) => {
                const ratio = row.original.rework_ratio
                const isPass = row.original.is_pass
                const width = Math.min(ratio, 100)
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                            <div
                                className={`h-full rounded-full transition-all ${isPass ? 'bg-emerald-500' : ratio > 15 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold min-w-[42px] text-right ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {ratio.toFixed(1)}%
                        </span>
                    </div>
                )
            },
        },
        {
            id: 'result',
            header: 'Result',
            size: 70,
            enableSorting: false,
            cell: ({ row }) => (
                <div className="text-center">
                    {row.original.is_pass ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={11} /> Pass
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            <XCircle size={11} /> Fail
                        </span>
                    )}
                </div>
            ),
        },
    ], [formatDate])

    // SuperTable column definitions for Exceeding Target
    const exceedingColumns: ColumnDef<ProjectExceedingTarget, any>[] = useMemo(() => [
        {
            id: 'row_number',
            header: '#',
            size: 50,
            enableSorting: false,
            cell: ({ row, table }) => {
                const rows = table.getRowModel().rows
                const idx = rows.findIndex(r => r.id === row.id)
                const { pageIndex, pageSize } = table.getState().pagination
                return <span className="text-sm text-slate-400 font-medium">{pageIndex * pageSize + idx + 1}</span>
            },
        },
        {
            accessorKey: 'project_code',
            header: 'Code',
            size: 100,
            cell: ({ row }) => (
                <span className="font-bold text-slate-800 text-sm">{row.original.project_code}</span>
            ),
        },
        {
            accessorKey: 'project_name',
            header: 'Name',
            size: 300,
            cell: ({ row }) => (
                <span className="text-sm text-slate-600">{row.original.project_name}</span>
            ),
        },
        {
            accessorKey: 'rework_ratio',
            header: 'Ratio',
            size: 100,
            cell: ({ row }) => (
                <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full font-bold text-sm">{row.original.rework_ratio}%</span>
            ),
        },
        {
            accessorKey: 'rework_manday',
            header: 'Rework MD',
            size: 100,
            cell: ({ row }) => (
                <span className="text-sm font-medium text-slate-600">{row.original.rework_manday}</span>
            ),
        },
        {
            accessorKey: 'sold_mandays',
            header: 'Sold MD',
            size: 100,
            cell: ({ row }) => (
                <span className="text-sm font-medium text-slate-600">{row.original.sold_mandays}</span>
            ),
        },
        {
            accessorKey: 'over_by',
            header: 'Over By',
            size: 90,
            cell: ({ row }) => (
                <span className="text-rose-600 font-bold text-sm">+{row.original.over_by}%</span>
            ),
        },
    ], [])

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
                                    <div className="text-white font-bold text-lg">{filteredByMonth.summary?.projects_pass}/{filteredByMonth.summary?.total_projects}</div>
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
                                onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                                className={`rounded-lg p-2 text-center border cursor-pointer transition-all hover:scale-105 ${isPass
                                    ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                                    : 'bg-rose-50 border-rose-200 hover:border-rose-400'
                                    } ${selectedMonth === month ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''}`}
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


            {/* Alert: Projects Exceeding Target */}
            {filteredByMonth.exceedingProjects.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-sm">
                    <div className={`${embedded ? 'p-3' : 'px-5 py-4'} border-b border-rose-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center gap-3`}>
                        <div className="p-2 bg-rose-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-rose-700" />
                        </div>
                        <h3 className="font-bold text-rose-800 text-lg">
                            Projects Exceeding Target (&gt; {TARGET_RATIO}%)
                        </h3>
                        <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full text-sm font-semibold">{filteredByMonth.exceedingProjects.length}</span>
                    </div>
                    <SuperTable
                        data={filteredByMonth.exceedingProjects}
                        columns={exceedingColumns}
                        enableGlobalFilter={false}
                        enableSorting={true}
                        defaultSorting={[{ id: 'rework_ratio', desc: true }]}
                        enablePagination={true}
                        pageSize={10}
                        pageSizeOptions={[10, 20, 50]}
                        enableExport={true}
                        exportFileName={`exceeding-target-${yearFilter}`}
                        size="sm"
                        onRowClick={(row) => handleRowClick(row.project_id)}
                    />
                </div>
            )}

            {/* Project Breakdown - SuperTable */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`${embedded ? 'p-3' : 'px-5 py-4'} border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between`}>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-amber-600" />
                        Project Breakdown
                        <span className="text-sm font-normal text-slate-500 ml-2">
                            ({filteredByMonth.projects.length} projects)
                        </span>
                        {selectedMonth && (
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200 transition-colors"
                            >
                                {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][selectedMonth - 1]} {yearFilter}
                                <X size={12} />
                            </button>
                        )}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-emerald-500 rounded-full" /><span>Pass</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-rose-500 rounded-full" /><span>Fail</span></div>
                    </div>
                </div>
                <SuperTable
                    data={filteredByMonth.projects}
                    columns={projectColumns}
                    isLoading={isLoading}
                    enableGlobalFilter={true}
                    searchPlaceholder="ค้นหาโครงการ..."
                    enableSorting={true}
                    defaultSorting={[{ id: 'rework_ratio', desc: true }]}
                    enablePagination={true}
                    pageSize={10}
                    pageSizeOptions={[10, 20, 50, 100]}
                    enableExport={true}
                    exportFileName={`post-golive-rework-${yearFilter}`}
                    enableColumnVisibility={true}
                    size="sm"
                    emptyMessage="ไม่พบข้อมูลโครงการ"
                    emptyIcon={<FolderKanban size={24} className="text-slate-300" />}
                    onRowClick={(row) => handleRowClick(row.project_id)}
                />
            </div>

            {/* Project Edit Modal */}
            <ProjectModal
                open={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedProject(null) }}
                mode="edit"
                project={selectedProject}
                onSuccess={() => { setIsModalOpen(false); setSelectedProject(null); fetchData() }}
            />
        </div>
    )
}
