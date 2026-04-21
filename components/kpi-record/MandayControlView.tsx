'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, FolderKanban, Calculator, ExternalLink, ChevronDown, ChevronRight } from "lucide-react"
import {
    getMandayControlKPI,
    getMandayControlTrend,
    getMandayControlMilestones,
    MandayControlProject,
    MandayControlSummary,
    ProjectMilestoneData
} from "@/lib/actions/department-kpi-actions"
import { getProjectById } from "@/lib/actions/project-actions"
import { ProjectModal } from "@/components/modals/ProjectModal"
import { toast } from "sonner"

interface MandayControlViewProps {
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

// Score calculation helper
function calcScore(planned: number | null, actual: number | null): { score: number; label: string; color: string; bgColor: string } {
    if (planned === null || actual === null || planned === 0 || actual === 0) return { score: 0, label: '-', color: 'text-slate-400', bgColor: '' }
    const ratio = actual / planned
    const pct = `${(ratio * 100).toFixed(0)}%`
    if (ratio <= 1) return { score: 100, label: pct, color: 'text-emerald-700', bgColor: 'bg-emerald-50' }
    if (ratio <= 1.1) return { score: 90, label: pct, color: 'text-yellow-700', bgColor: 'bg-yellow-50' }
    if (ratio <= 1.2) return { score: 70, label: pct, color: 'text-orange-700', bgColor: 'bg-orange-50' }
    return { score: 50, label: pct, color: 'text-rose-700', bgColor: 'bg-rose-50' }
}

export default function MandayControlView({ embedded = false }: MandayControlViewProps) {
    const [data, setData] = useState<MandayControlProject[]>([])
    const [summary, setSummary] = useState<MandayControlSummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [milestoneData, setMilestoneData] = useState<ProjectMilestoneData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    // Expanded projects (for collapsible rows)
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const expandAll = () => {
        setExpandedProjects(new Set(milestoneData.map(p => p.project_id)))
    }

    const collapseAll = () => {
        setExpandedProjects(new Set())
    }

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

            const [kpiResult, trendResult, milestonesResult] = await Promise.all([
                getMandayControlKPI(params),
                getMandayControlTrend(yearFilter),
                getMandayControlMilestones(params),
            ])

            if (kpiResult.success) {
                setData(kpiResult.data)
                setSummary(kpiResult.summary)
            }
            if (trendResult.success) {
                setTrend(trendResult.data)
            }
            if (milestonesResult.success) {
                setMilestoneData(milestonesResult.data)
                // Expand all by default
                setExpandedProjects(new Set(milestonesResult.data.map((p: ProjectMilestoneData) => p.project_id)))
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

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const activeMonths = useMemo(() => {
        const monthSet = new Set(data.map(d => d.month))
        return MONTHS.filter(m => monthSet.has(m.value))
    }, [data])

    // Build project KPI lookup from data
    const projectKPIMap = useMemo(() => {
        const map = new Map<string, MandayControlProject>()
        for (const d of data) {
            map.set(d.project_id, d)
        }
        return map
    }, [data])

    const overallKPI = summary?.averagePercent || 0
    const passCount = summary?.passCount || 0
    const totalProjects = summary?.totalProjects || 0

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top: Title + Score + Filters */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        {/* Title */}
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                <Calculator size={18} className="text-orange-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Man-day Control</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Score Badge */}
                        {summary && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${summary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {summary.isPass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {overallKPI}%
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{totalProjects} โปรเจค</span>
                                    <span className="text-emerald-600 font-medium">{passCount} ผ่าน</span>
                                    <span className="text-rose-600 font-medium">{summary.failCount} ไม่ผ่าน</span>
                                </div>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            {/* Year Filter */}
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium text-sm"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {/* Month Filter Combobox */}
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
                                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom: Monthly Trend (inline) + Scoring Legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        {/* Monthly Trend Inline */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const monthData = trend.find((t: any) => t.month === month.value)
                                const avgPercent = monthData?.avg_percent || 0
                                const projectCount = monthData?.project_count || 0
                                const hasData = projectCount > 0
                                const isPass = avgPercent >= 85
                                const isSelected = monthFilter === String(month.value)

                                return (
                                    <button
                                        key={month.value}
                                        onClick={() => setMonthFilter(isSelected ? "all" : String(month.value))}
                                        className={`flex-1 rounded-md px-1 py-1 text-center transition-all min-w-0 ${
                                            isSelected
                                                ? 'ring-2 ring-orange-300 border-orange-400 shadow-sm bg-orange-50'
                                                : hasData
                                                    ? (isPass ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100')
                                                    : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`text-[9px] font-medium ${hasData ? (isPass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{month.label}</div>
                                        <div className={`text-xs font-bold leading-tight ${hasData ? (isPass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                            {hasData ? `${avgPercent.toFixed(0)}%` : "-"}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="h-8 w-px bg-slate-200 shrink-0" />

                        {/* Scoring Legend Compact */}
                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                            <span className="text-emerald-600 font-medium">&lt;=Plan: 100%</span>
                            <span className="text-yellow-600 font-medium">&lt;=1.1x: 90%</span>
                            <span className="text-orange-600 font-medium">&lt;=1.2x: 70%</span>
                            <span className="text-rose-600 font-medium">&gt;1.2x: 50%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Simple Table: Project → Milestone Rows ===== */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-orange-600" />
                        รายละเอียดตามโครงการ / Milestone
                        <span className="text-sm font-normal text-slate-500 ml-2">({milestoneData.length} โปรเจค)</span>
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
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-20">น้ำหนัก</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Plan MD</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Actual MD</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Actual/Plan</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">เกณฑ์คะแนน</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">คะแนน</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-orange-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : milestoneData.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                milestoneData.map((proj) => {
                                    const isExpanded = expandedProjects.has(proj.project_id)
                                    const kpiRow = projectKPIMap.get(proj.project_id)
                                    const kpiPercent = kpiRow?.manday_control_percent ?? 0
                                    const isPass = kpiRow?.is_pass === 1
                                    const totalPlan = proj.milestones.reduce((s, m) => s + (m.planned_mandays || 0), 0)
                                    const totalActual = proj.milestones.reduce((s, m) => s + (m.actual_mandays || 0), 0)

                                    return (
                                        <React.Fragment key={proj.project_id}>
                                            {/* Project Header Row */}
                                            <tr
                                                className={`border-b border-slate-200 cursor-pointer transition-colors ${isPass === false ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'bg-slate-50/50 hover:bg-slate-100/70'}${proj.kpi_excluded ? ' opacity-50' : ''}`}
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
                                                            className="font-bold text-orange-700 hover:text-orange-900 hover:underline flex items-center gap-1"
                                                            title="คลิกเพื่อแก้ไขโครงการ"
                                                        >
                                                            {proj.project_code}
                                                            <ExternalLink size={12} className="opacity-50" />
                                                        </button>
                                                        <span className="text-slate-600 truncate max-w-[300px]">{proj.project_name}</span>
                                                        <span className="text-xs text-slate-400 ml-auto shrink-0">({proj.milestones.length} milestones)</span>
                                                        {proj.kpi_excluded && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">ยกเว้น</span>}
                                                    </div>
                                                </td>
                                                <td className="text-center px-4 py-3 text-slate-400 text-xs">-</td>
                                                <td className="text-right px-4 py-3 text-slate-400 text-xs">รวม</td>
                                                <td className="text-right px-4 py-3 font-semibold text-blue-700">{totalPlan.toFixed(1)}</td>
                                                <td className="text-right px-4 py-3 font-semibold">
                                                    <span className={totalActual > totalPlan ? 'text-rose-600' : 'text-emerald-600'}>
                                                        {totalActual.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="text-right px-4 py-3">
                                                    {totalPlan > 0 && (
                                                        <span className={`font-medium ${totalActual / totalPlan > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {((totalActual / totalPlan) * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center px-4 py-3">-</td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`text-lg font-black ${kpiPercent >= 85 ? 'text-emerald-600' : kpiPercent >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {kpiPercent}%
                                                    </span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {isPass ? "Pass" : "Fail"}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Milestone Rows (expanded) */}
                                            {isExpanded && [...proj.milestones].sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''))).map((ms, msIdx) => {
                                                const scoreInfo = calcScore(ms.planned_mandays, ms.actual_mandays)
                                                const ratio = (ms.planned_mandays && ms.actual_mandays != null && ms.planned_mandays > 0)
                                                    ? ((ms.actual_mandays / ms.planned_mandays) * 100).toFixed(0) + '%'
                                                    : '-'

                                                return (
                                                    <tr key={`${proj.project_id}-${msIdx}`} className="border-b border-slate-100 hover:bg-orange-50/30 transition-colors">
                                                        <td className="px-4 py-2.5"></td>
                                                        <td className="px-3 py-2.5 pl-10">
                                                            <span className="text-slate-700">{ms.milestone_name}</span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5 text-xs text-slate-500">
                                                            {ms.due_date ? new Date(ms.due_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="text-right px-4 py-2.5 text-slate-500">
                                                            {ms.weight_mdc != null ? `${ms.weight_mdc}%` : '-'}
                                                        </td>
                                                        <td className="text-right px-4 py-2.5 text-blue-700 font-medium">
                                                            {ms.planned_mandays != null ? ms.planned_mandays.toFixed(1) : '-'}
                                                        </td>
                                                        <td className="text-right px-4 py-2.5 font-medium">
                                                            {ms.actual_mandays != null ? (
                                                                <span className={ms.planned_mandays != null && ms.actual_mandays > ms.planned_mandays ? 'text-rose-600' : 'text-emerald-600'}>
                                                                    {ms.actual_mandays.toFixed(1)}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="text-right px-4 py-2.5">
                                                            <span className={`font-medium ${ms.planned_mandays != null && ms.actual_mandays != null && ms.actual_mandays > ms.planned_mandays ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {ratio}
                                                            </span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={`text-xs font-medium ${scoreInfo.color}`}>
                                                                {scoreInfo.label}
                                                            </span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={`text-sm font-bold ${scoreInfo.color}`}>
                                                                {scoreInfo.score > 0 ? `${scoreInfo.score}%` : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            {scoreInfo.score > 0 && (
                                                                <span className={`inline-block w-2 h-2 rounded-full ${scoreInfo.score >= 100 ? 'bg-emerald-500' : scoreInfo.score >= 90 ? 'bg-yellow-500' : scoreInfo.score >= 70 ? 'bg-orange-500' : 'bg-rose-500'}`} />
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
                        {summary && milestoneData.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-3 py-3 font-bold text-slate-700">รวมทั้งหมด ({data.length} โปรเจค)</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="text-right px-4 py-3"></td>
                                    <td className="text-right px-4 py-3 font-bold text-blue-700">{summary.totalPlannedMandays.toFixed(1)}</td>
                                    <td className="text-right px-4 py-3 font-bold">
                                        <span className={summary.totalActualMandays > summary.totalPlannedMandays ? 'text-rose-600' : 'text-emerald-600'}>
                                            {summary.totalActualMandays.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                        {summary.totalPlannedMandays > 0 && (
                                            <span className={`font-bold ${summary.totalActualMandays / summary.totalPlannedMandays > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {((summary.totalActualMandays / summary.totalPlannedMandays) * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center px-4 py-3">-</td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`text-lg font-black ${overallKPI >= 85 ? 'text-emerald-600' : overallKPI >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {overallKPI.toFixed(1)}%
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
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>100% (Actual &lt;= Plan)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>90% (&lt;= Plan x1.1)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>70% (&lt;= Plan x1.2)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>50% (&gt; Plan x1.2)</span>
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
