'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, FileText, FolderKanban, ExternalLink, ChevronDown, ChevronRight } from "lucide-react"
import {
    getDocsOntimeByProjectMilestone,
    getDocsOntimeMonthlyTrend,
    ProjectDocsData
} from "@/lib/actions/docs-ontime-actions"
import { getProjectById } from "@/lib/actions/project-actions"
import { ProjectModal } from "@/components/modals/ProjectModal"
import { toast } from "sonner"

interface DocsOntimeViewProps {
    embedded?: boolean
}

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

export default function DocsOntimeView({ embedded = false }: DocsOntimeViewProps) {
    const [data, setData] = useState<ProjectDocsData[]>([])
    const [trend, setTrend] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    // Expanded projects
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const expandAll = () => setExpandedProjects(new Set(data.map(p => p.project_id)))
    const collapseAll = () => setExpandedProjects(new Set())

    const handleEditProject = async (projectId: string) => {
        try {
            const result = await getProjectById(projectId)
            if (result.success && result.data) {
                setSelectedProject(result.data)
                setIsEditModalOpen(true)
            } else {
                toast.error("ไม่สามารถโหลดข้อมูลโครงการได้")
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด")
        }
    }

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = {
                year: yearFilter,
                period: monthFilter === "all" ? 'year' as const : 'month' as const,
                periodValue: monthFilter === "all" ? undefined : parseInt(monthFilter)
            }

            const [projectResult, trendResult] = await Promise.all([
                getDocsOntimeByProjectMilestone(params),
                getDocsOntimeMonthlyTrend(yearFilter),
            ])

            if (projectResult.success) {
                setData(projectResult.data)
                setExpandedProjects(new Set(projectResult.data.map((p: ProjectDocsData) => p.project_id)))
            }
            if (trendResult.success) {
                setTrend(trendResult.data)
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, monthFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Calculate summary
    const summary = useMemo(() => {
        let totalDocs = 0
        let onTimeDocs = 0
        let lateDocs = 0
        let passCount = 0
        for (const proj of data) {
            totalDocs += proj.total_docs
            onTimeDocs += proj.on_time_docs
            lateDocs += proj.late_docs
            if (proj.is_pass) passCount++
        }
        const submitted = onTimeDocs + lateDocs
        const rate = submitted > 0 ? Math.round((onTimeDocs / submitted) * 100) : 100
        return {
            totalProjects: data.length,
            totalDocs,
            onTimeDocs,
            lateDocs,
            passCount,
            failCount: data.length - passCount,
            rate,
            isPass: rate >= 95
        }
    }, [data])

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top: Title + Score + Filters */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-teal-100 rounded-lg">
                                <FileText size={18} className="text-teal-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Required Docs On-time</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {summary.isPass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                {summary.rate}%
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{summary.totalProjects} โปรเจค</span>
                                <span className="text-emerald-600 font-medium">{summary.onTimeDocs} on-time</span>
                                <span className="text-rose-600 font-medium">{summary.lateDocs} late</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-emerald-600 font-medium">{summary.passCount} ผ่าน</span>
                                <span className="text-rose-600 font-medium">{summary.failCount} ไม่ผ่าน</span>
                            </div>
                        </div>

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
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom: Monthly Trend + Target Legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const monthData = trend.find((t: any) => t.month === month.value)
                                const isSelected = monthFilter === String(month.value)
                                const hasData = monthData && (monthData.on_time + monthData.late) > 0
                                const rate = monthData?.on_time_rate || 0
                                const isPass = rate >= 95

                                return (
                                    <button
                                        key={month.value}
                                        onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                        className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                            isSelected
                                                ? 'ring-2 ring-teal-300 border-teal-400 shadow-sm bg-teal-50'
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
                            <span className="text-emerald-600 font-medium">Target: &gt;=95%</span>
                            <span className="text-slate-500">On-time = ส่งภายใน Due Date</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Simple Table: Project → Milestone Rows ===== */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-teal-600" />
                        รายละเอียดตามโครงการ / Milestone
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} โปรเจค)</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={expandAll} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            กางทั้งหมด
                        </button>
                        <button onClick={collapseAll} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            ยุบทั้งหมด
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-12"></th>
                                <th className="text-left px-3 py-3 font-semibold text-slate-700">โครงการ / Milestone</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-24">Due Date</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">ทั้งหมด</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">On-time</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Late</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">รอส่ง</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">Rate</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-teal-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((proj) => {
                                    const isExpanded = expandedProjects.has(proj.project_id)
                                    const submitted = proj.on_time_docs + proj.late_docs

                                    return (
                                        <React.Fragment key={proj.project_id}>
                                            {/* Project Header Row */}
                                            <tr
                                                className={`border-b border-slate-200 cursor-pointer transition-colors ${!proj.is_pass ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'bg-slate-50/50 hover:bg-slate-100/70'}`}
                                                onClick={() => toggleProject(proj.project_id)}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    {isExpanded
                                                        ? <ChevronDown size={16} className="text-slate-400 mx-auto" />
                                                        : <ChevronRight size={16} className="text-slate-400 mx-auto" />
                                                    }
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditProject(proj.project_id) }}
                                                            className="font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
                                                            title="คลิกเพื่อแก้ไขโครงการ"
                                                        >
                                                            {proj.project_code}
                                                            <ExternalLink size={12} className="opacity-50" />
                                                        </button>
                                                        <span className="text-slate-600 truncate max-w-[300px]">{proj.project_name}</span>
                                                        <span className="text-xs text-slate-400 ml-auto shrink-0">({proj.milestones.length} milestones)</span>
                                                    </div>
                                                </td>
                                                <td className="text-center px-4 py-3 text-slate-400 text-xs">-</td>
                                                <td className="text-center px-4 py-3 font-semibold text-slate-700">{proj.total_docs}</td>
                                                <td className="text-center px-4 py-3 font-semibold text-emerald-600">{proj.on_time_docs}</td>
                                                <td className="text-center px-4 py-3 font-semibold">
                                                    <span className={proj.late_docs > 0 ? 'text-rose-600' : 'text-slate-400'}>{proj.late_docs}</span>
                                                </td>
                                                <td className="text-center px-4 py-3 text-slate-400 text-xs">
                                                    {proj.total_docs - submitted > 0 ? proj.total_docs - submitted : '-'}
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`text-lg font-black ${proj.on_time_rate >= 95 ? 'text-emerald-600' : proj.on_time_rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {proj.on_time_rate}%
                                                    </span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${proj.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {proj.is_pass ? "Pass" : "Fail"}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Milestone Rows */}
                                            {isExpanded && [...proj.milestones].sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''))).map((ms, msIdx) => {
                                                const msSubmitted = ms.on_time_docs + ms.late_docs
                                                const msPending = ms.pending_docs + ms.overdue_docs

                                                return (
                                                    <tr key={`${proj.project_id}-${msIdx}`} className="border-b border-slate-100 hover:bg-teal-50/30 transition-colors">
                                                        <td className="px-4 py-2.5"></td>
                                                        <td className="px-3 py-2.5 pl-10">
                                                            <span className="text-slate-700">{ms.milestone_name}</span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5 text-xs text-slate-500">
                                                            {ms.due_date ? new Date(ms.due_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="text-center px-4 py-2.5 text-slate-600">{ms.total_docs}</td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={ms.on_time_docs > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{ms.on_time_docs}</span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={ms.late_docs > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'}>{ms.late_docs}</span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            {msPending > 0 ? (
                                                                <span className={ms.overdue_docs > 0 ? 'text-rose-500 text-xs' : 'text-amber-500 text-xs'}>
                                                                    {msPending}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            {msSubmitted > 0 ? (
                                                                <span className={`text-sm font-bold ${ms.on_time_rate >= 95 ? 'text-emerald-600' : ms.on_time_rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                    {ms.on_time_rate}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            {msSubmitted > 0 && (
                                                                <span className={`inline-block w-2 h-2 rounded-full ${ms.on_time_rate >= 95 ? 'bg-emerald-500' : ms.on_time_rate >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Summary Row */}
                        {data.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-3 py-3 font-bold text-slate-700">รวมทั้งหมด ({data.length} โปรเจค)</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="text-center px-4 py-3 font-bold text-slate-700">{summary.totalDocs}</td>
                                    <td className="text-center px-4 py-3 font-bold text-emerald-600">{summary.onTimeDocs}</td>
                                    <td className="text-center px-4 py-3 font-bold">
                                        <span className={summary.lateDocs > 0 ? 'text-rose-600' : 'text-slate-400'}>{summary.lateDocs}</span>
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`text-lg font-black ${summary.rate >= 95 ? 'text-emerald-600' : summary.rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {summary.rate}%
                                        </span>
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {summary.isPass ? "Pass" : "Fail"}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (&gt;= 95%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Warning (80-94%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&lt; 80%)</span>
                </div>
            </div>

            {/* Edit Project Modal */}
            <ProjectModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode="edit"
                project={selectedProject}
                onSuccess={() => {
                    setIsEditModalOpen(false)
                    fetchData()
                }}
            />
        </div>
    )
}
