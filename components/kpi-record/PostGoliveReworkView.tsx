"use client"

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { SuperTable } from '@/components/shared/SuperTable/SuperTable'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { getProjectById } from '@/lib/actions/project-actions'
import { RefreshCw, CheckCircle2, XCircle, Wrench, FolderKanban, ExternalLink } from 'lucide-react'
import {
    getPostGoliveReworkSummary,
    getPostGoliveReworkProjects,
    getProjectOwnersForRework,
    getPostGoliveReworkMonthlyTrend,
    PostGoliveReworkSummary,
    PostGoliveReworkProject,
} from '@/lib/actions/post-golive-rework-actions'

const TARGET_RATIO = 8

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

interface PostGoliveReworkViewProps {
    embedded?: boolean
}

export default function PostGoliveReworkView({ embedded = false }: PostGoliveReworkViewProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [summary, setSummary] = useState<PostGoliveReworkSummary | null>(null)
    const [projects, setProjects] = useState<PostGoliveReworkProject[]>([])
    const [owners, setOwners] = useState<{ id: string; name: string }[]>([])
    const [monthlyTrend, setMonthlyTrend] = useState<{ month: number; total_projects: number; total_manday: number; rework_manday: number; rework_ratio: number; is_pass: boolean }[]>([])

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
    const [monthFilter, setMonthFilter] = useState<string>("all")

    useEffect(() => {
        fetchData()
        fetchOwners()
    }, [yearFilter, statusFilter, ownerFilter, monthFilter])

    const fetchOwners = async () => {
        const result = await getProjectOwnersForRework(yearFilter)
        if (result.success) setOwners(result.data)
    }

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [summaryRes, projectsRes, trendRes] = await Promise.all([
                getPostGoliveReworkSummary(yearFilter),
                getPostGoliveReworkProjects({
                    year: yearFilter,
                    status: statusFilter,
                    ownerId: ownerFilter || undefined
                }),
                getPostGoliveReworkMonthlyTrend(yearFilter)
            ])

            if (summaryRes.success) setSummary(summaryRes.data)
            if (projectsRes.success) setProjects(projectsRes.data)
            if (trendRes.success) setMonthlyTrend(trendRes.data)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
    }

    // Filter by selected month
    const displayProjects = useMemo(() => {
        if (monthFilter === "all") return projects
        const m = parseInt(monthFilter)
        return projects.filter(p => {
            const d = new Date(p.golive_completed_date)
            return d.getMonth() + 1 === m
        })
    }, [projects, monthFilter])

    // Recalculate summary for filtered data
    const displaySummary = useMemo(() => {
        if (monthFilter === "all" || !summary) return summary
        const totalManday = displayProjects.reduce((sum, p) => sum + (p.sold_mandays || 0), 0)
        const reworkManday = displayProjects.reduce((sum, p) => sum + (p.rework_manday || 0), 0)
        const overallRatio = totalManday > 0 ? Math.round((reworkManday / totalManday) * 100 * 100) / 100 : 0
        const passCount = displayProjects.filter(p => p.is_pass).length
        const failCount = displayProjects.filter(p => !p.is_pass).length
        return {
            ...summary,
            total_projects: displayProjects.length,
            total_manday: Math.round(totalManday * 10) / 10,
            rework_manday: Math.round(reworkManday * 10) / 10,
            overall_ratio: overallRatio,
            projects_pass: passCount,
            projects_fail: failCount,
            is_pass: overallRatio <= TARGET_RATIO
        }
    }, [displayProjects, summary, monthFilter])

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
    const overallRatio = displaySummary?.overall_ratio || 0
    const passCount = displaySummary?.projects_pass || 0
    const totalProjects = displaySummary?.total_projects || 0

    // SuperTable columns
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
                <button
                    onClick={(e) => { e.stopPropagation(); handleRowClick(row.original.project_id) }}
                    className="font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                >
                    {row.original.project_code}
                    <ExternalLink size={12} className="opacity-50" />
                </button>
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
            size: 100,
            cell: ({ row }) => (
                <div className="text-right">
                    <span className={`text-sm font-bold ${row.original.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.original.rework_ratio.toFixed(1)}%
                    </span>
                </div>
            ),
        },
        {
            id: 'result',
            header: 'ผล',
            size: 70,
            enableSorting: false,
            cell: ({ row }) => (
                <div className="text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${row.original.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {row.original.is_pass ? "Pass" : "Fail"}
                    </span>
                </div>
            ),
        },
    ], [formatDate])

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top: Title + Score + Filters */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <Wrench size={18} className="text-amber-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Post Go-live Rework</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {displaySummary && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${displaySummary.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {displaySummary.is_pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {overallRatio}%
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{totalProjects} โปรเจค</span>
                                    <span className="text-emerald-600 font-medium">{passCount} ผ่าน</span>
                                    <span className="text-rose-600 font-medium">{displaySummary.projects_fail} ไม่ผ่าน</span>
                                    <span className="text-slate-400">|</span>
                                    <span>Rework: <span className="font-medium text-amber-600">{displaySummary.rework_manday}</span>/<span className="text-slate-600">{displaySummary.total_manday} MD</span></span>
                                </div>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
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
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="closed">Closed</option>
                                <option value="post-golive">Post Go-Live</option>
                            </select>
                            {owners.length > 0 && (
                                <select
                                    value={ownerFilter}
                                    onChange={(e) => setOwnerFilter(e.target.value)}
                                    className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm max-w-[160px]"
                                >
                                    <option value="">All Owners</option>
                                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            )}
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
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
                                const hasData = monthData && monthData.total_projects > 0
                                const reworkMD = monthData?.rework_manday || 0
                                const totalMD = monthData?.total_manday || 0
                                const ratio = totalMD > 0 ? (reworkMD / totalMD) * 100 : 0
                                const isPass = ratio <= TARGET_RATIO

                                return (
                                    <button
                                        key={month.value}
                                        onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                        className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                            isSelected
                                                ? 'ring-2 ring-amber-300 border-amber-400 shadow-sm bg-amber-50'
                                                : hasData
                                                    ? (isPass ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100')
                                                    : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`text-[9px] font-medium ${hasData ? (isPass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{month.label}</div>
                                        <div className={`text-xs font-bold leading-tight ${hasData ? (isPass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                            {hasData ? `${ratio.toFixed(1)}%` : "-"}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="h-8 w-px bg-slate-200 shrink-0" />

                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                            <span className="text-emerald-600 font-medium">&lt;=8%: Pass</span>
                            <span className="text-rose-600 font-medium">&gt;8%: Fail</span>
                            <span className="text-slate-500">(Lower is better)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Table - SuperTable */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-amber-600" />
                        รายละเอียดตามโครงการ
                        <span className="text-sm font-normal text-slate-500 ml-2">({displayProjects.length} โปรเจค)</span>
                    </h3>
                </div>
                <SuperTable
                    data={displayProjects}
                    columns={projectColumns}
                    isLoading={isLoading}
                    enableGlobalFilter={true}
                    searchPlaceholder="ค้นหาโครงการ..."
                    enableSorting={true}
                    defaultSorting={[{ id: 'rework_ratio', desc: true }]}
                    enablePagination={true}
                    pageSize={20}
                    pageSizeOptions={[20, 50, 100]}
                    enableExport={true}
                    exportFileName={`post-golive-rework-${yearFilter}`}
                    size="sm"
                    emptyMessage="ไม่พบข้อมูลโครงการ"
                    emptyIcon={<FolderKanban size={24} className="text-slate-300" />}
                />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (&lt;= 8%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&gt; 8%)</span>
                </div>
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
