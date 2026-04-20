'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, FolderKanban, Clock, ExternalLink, ChevronDown, ChevronRight } from "lucide-react"
import {
    getTimeToDeliveryKPI,
    getTimeToDeliveryTrend,
    getTimeToDeliveryMilestones,
    TimeToDeliveryProject,
    TimeToDeliverySummary,
    ProjectTTDMilestoneData
} from "@/lib/actions/department-kpi-actions"
import { getProjectById } from "@/lib/actions/project-actions"
import { ProjectModal } from "@/components/modals/ProjectModal"
import { toast } from "sonner"

interface TimeToDeliveryViewProps {
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

// Score calculation: days late → score
function calcTTDScore(daysDiff: number | null, manualFail?: boolean): { score: number; label: string; color: string } {
    if (manualFail) return { score: 0, label: 'Manual Fail', color: 'text-rose-700' }
    if (daysDiff === null) return { score: 0, label: '-', color: 'text-slate-400' }
    if (daysDiff <= 0) return { score: 100, label: 'ตรงเวลา', color: 'text-emerald-700' }
    if (daysDiff <= 7) return { score: 80, label: `+${daysDiff}d`, color: 'text-blue-700' }
    if (daysDiff <= 14) return { score: 60, label: `+${daysDiff}d`, color: 'text-amber-700' }
    return { score: 40, label: `+${daysDiff}d`, color: 'text-rose-700' }
}

export default function TimeToDeliveryView({ embedded = false }: TimeToDeliveryViewProps) {
    const [data, setData] = useState<TimeToDeliveryProject[]>([])
    const [summary, setSummary] = useState<TimeToDeliverySummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [milestoneData, setMilestoneData] = useState<ProjectTTDMilestoneData[]>([])
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

    const expandAll = () => setExpandedProjects(new Set(milestoneData.map(p => p.project_id)))
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

            const [kpiResult, trendResult, milestonesResult] = await Promise.all([
                getTimeToDeliveryKPI(params),
                getTimeToDeliveryTrend(yearFilter),
                getTimeToDeliveryMilestones(params),
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
                setExpandedProjects(new Set(milestonesResult.data.map((p: ProjectTTDMilestoneData) => p.project_id)))
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

    // Build project KPI lookup
    const projectKPIMap = useMemo(() => {
        const map = new Map<string, TimeToDeliveryProject>()
        for (const d of data) map.set(d.project_id, d)
        return map
    }, [data])

    // Compute summary excluding kpi_excluded projects
    const displaySummary = useMemo(() => {
        const includedData = data.filter(d => {
            const proj = milestoneData.find(p => p.project_id === d.project_id)
            return !proj?.kpi_excluded
        })
        const total = includedData.length
        const pass = includedData.filter(d => d.is_pass === 1).length
        const fail = total - pass
        const avg = total > 0 ? includedData.reduce((sum, d) => sum + (d.time_to_delivery_percent || 0), 0) / total : 0
        const isPass = avg >= 80
        return { totalProjects: total, passCount: pass, failCount: fail, averagePercent: avg, isPass }
    }, [data, milestoneData])

    const overallKPI = displaySummary.averagePercent || 0
    const passCount = displaySummary.passCount || 0
    const totalProjects = displaySummary.totalProjects || 0

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-4 w-full bg-slate-50 min-h-screen"}>
            {/* Compact Header Bar */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    {/* Top: Title + Score + Filters */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Clock size={18} className="text-blue-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800">Time to Delivery</h1>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {summary && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${displaySummary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {displaySummary.isPass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {overallKPI.toFixed(1)}%
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{totalProjects} โปรเจค</span>
                                    <span className="text-emerald-600 font-medium">{passCount} ผ่าน</span>
                                    <span className="text-rose-600 font-medium">{displaySummary.failCount} ไม่ผ่าน</span>
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
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom: Monthly Trend + Scoring Legend */}
                    <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {MONTHS.map((month) => {
                                const monthData = trend.find((t: any) => t.month === month.value)
                                const avgPercent = monthData?.avg_percent || 0
                                const projectCount = monthData?.project_count || 0
                                const hasData = projectCount > 0
                                const isPass = avgPercent >= 80
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
                                            {hasData ? `${avgPercent.toFixed(0)}%` : "-"}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="h-8 w-px bg-slate-200 shrink-0" />

                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                            <span className="text-emerald-600 font-medium">ตรงเวลา: 100%</span>
                            <span className="text-blue-600 font-medium">&lt;=7d: 80%</span>
                            <span className="text-amber-600 font-medium">&lt;=14d: 60%</span>
                            <span className="text-rose-600 font-medium">&gt;14d: 40%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Simple Table: Project → Milestone Rows ===== */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-blue-600" />
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
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-24">Completed</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 w-20">น้ำหนัก</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">วันเลย</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-20">คะแนน</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">ผล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : milestoneData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                milestoneData.map((proj) => {
                                    const isExpanded = expandedProjects.has(proj.project_id)
                                    const kpiRow = projectKPIMap.get(proj.project_id)
                                    const kpiPercent = kpiRow?.time_to_delivery_percent ?? 0
                                    const isPass = kpiRow?.is_pass === 1

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
                                                            className="font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
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
                                                <td className="text-center px-4 py-3 text-slate-400 text-xs">-</td>
                                                <td className="text-right px-4 py-3 text-slate-400 text-xs">รวม</td>
                                                <td className="text-center px-4 py-3">-</td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`text-lg font-black ${kpiPercent >= 80 ? 'text-emerald-600' : kpiPercent >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {kpiPercent}%
                                                    </span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {isPass ? "Pass" : "Fail"}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Milestone Rows */}
                                            {isExpanded && [...proj.milestones].sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''))).map((ms, msIdx) => {
                                                const scoreInfo = calcTTDScore(ms.days_diff, ms.kpi_ttd_manual_fail)
                                                const hasCompleted = ms.completed_date !== null

                                                return (
                                                    <tr key={`${proj.project_id}-${msIdx}`} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-4 py-2.5"></td>
                                                        <td className="px-3 py-2.5 pl-10">
                                                            <span className="text-slate-700">{ms.milestone_name}</span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5 text-xs text-slate-500">
                                                            {ms.due_date ? new Date(ms.due_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="text-center px-4 py-2.5 text-xs">
                                                            {ms.completed_date ? (
                                                                <span className={ms.days_diff !== null && ms.days_diff > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                                    {new Date(ms.completed_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">รอ</span>
                                                            )}
                                                        </td>
                                                        <td className="text-right px-4 py-2.5 text-slate-500">
                                                            {ms.weight_ttd != null ? `${ms.weight_ttd}%` : '-'}
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={`text-xs font-medium ${scoreInfo.color}`}>
                                                                {hasCompleted ? scoreInfo.label : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            <span className={`text-sm font-bold ${scoreInfo.color}`}>
                                                                {hasCompleted || ms.kpi_ttd_manual_fail ? `${scoreInfo.score}%` : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center px-4 py-2.5">
                                                            {(hasCompleted || ms.kpi_ttd_manual_fail) && (
                                                                <span className={`inline-block w-2 h-2 rounded-full ${scoreInfo.score >= 100 ? 'bg-emerald-500' : scoreInfo.score >= 80 ? 'bg-blue-500' : scoreInfo.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
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
                                    <td className="px-3 py-3 font-bold text-slate-700">รวมทั้งหมด ({totalProjects} โปรเจค)</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`text-lg font-black ${overallKPI >= 80 ? 'text-emerald-600' : overallKPI >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {overallKPI.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${displaySummary.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {displaySummary.isPass ? "Pass" : "Fail"}
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
                    <span>100% (ตรงเวลา)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>80% (&lt;=7d)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>60% (&lt;=14d)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>40% (&gt;14d)</span>
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
