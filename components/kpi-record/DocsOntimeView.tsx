'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, Calendar, Target, FileText, FolderKanban, BarChart3, Info, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import {
    getDocsOntimeByProjectMilestone,
    getDocsOntimeMonthlyTrend,
    ProjectDocsData,
    MilestoneDocsDetail
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

// Milestone config with colors
const MILESTONE_CONFIG: Record<string, { shortName: string; color: string }> = {
    "Mapping Data": { shortName: "Mapping", color: "#0ea5e9" },
    "System Test": { shortName: "ST", color: "#06b6d4" },
    "User Acceptance Test": { shortName: "UAT", color: "#14b8a6" },
    "Go-Live": { shortName: "Go-Live", color: "#10b981" },
    "Close Go-Live": { shortName: "Close", color: "#22c55e" },
}

function getStatusColor(val: number) {
    if (val >= 95) return "#10b981"
    if (val >= 80) return "#f59e0b"
    return "#ef4444"
}

// Summary Card Component
function SummaryCard({ title, value, icon: Icon, color, subtext }: { title: string; value: string | number; icon: any; color: string; subtext?: string }) {
    return (
        <div className={`rounded-xl p-4 border ${color === 'teal' ? 'bg-teal-50 border-teal-200' : color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color === 'teal' ? 'bg-teal-100' : color === 'emerald' ? 'bg-emerald-100' : color === 'amber' ? 'bg-amber-100' : 'bg-rose-100'}`}>
                    <Icon size={18} className={color === 'teal' ? 'text-teal-600' : color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-rose-600'} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 font-medium">{title}</div>
                    <div className={`text-xl font-bold ${color === 'teal' ? 'text-teal-700' : color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-rose-700'}`}>{value}</div>
                    {subtext && <div className="text-xs text-slate-400">{subtext}</div>}
                </div>
            </div>
        </div>
    )
}

// Progress Bar Component
function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
    const c = getStatusColor(value)
    return (
        <div style={{ width: "100%", height, background: "#e2e8f0", borderRadius: height / 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, value)}%`, height: "100%", borderRadius: height / 2, background: c, transition: "width 0.3s ease" }} />
        </div>
    )
}

// Weight Bar Component
function WeightBar({ milestones }: { milestones: { name: string; count: number }[] }) {
    const totalCount = milestones.reduce((sum, m) => sum + m.count, 0)
    if (totalCount === 0) return null

    return (
        <div className="flex rounded-lg overflow-hidden h-6 w-full border border-slate-200">
            {milestones.map((ms, i) => {
                const config = MILESTONE_CONFIG[ms.name] || { shortName: ms.name.substring(0, 6), color: "#94a3b8" }
                const widthPercent = (ms.count / totalCount) * 100
                return (
                    <div key={i} style={{ width: `${widthPercent}%`, background: config.color }} className="flex items-center justify-center text-[9px] font-bold text-white" title={ms.name}>
                        {ms.count}
                    </div>
                )
            })}
        </div>
    )
}

// Sparkline Component
function Sparkline({ data, width = 100, height = 28 }: { data: { month: number; value: number }[]; width?: number; height?: number }) {
    if (data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-slate-400 text-xs">-</div>
    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * (width - 4) + 2,
        y: height - 4 - (d.value / 100) * (height - 8)
    }))
    const pathD = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
    return (
        <svg width={width} height={height} className="block">
            <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinecap="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill="#0ea5e9" />
        </svg>
    )
}

export default function DocsOntimeView({ embedded = false }: DocsOntimeViewProps) {
    const [data, setData] = useState<ProjectDocsData[]>([])
    const [trend, setTrend] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    // Open edit project modal
    const handleEditProject = async (projectId: string) => {
        try {
            const result = await getProjectById(projectId)
            if (result.success && result.data) {
                setSelectedProject(result.data)
                setIsEditModalOpen(true)
            } else {
                toast.error("ไม่สามารถโหลดข้อมูลโครงการได้")
            }
        } catch (error) {
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
            }
            if (trendResult.success) {
                setTrend(trendResult.data)
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
        } finally {
            setIsLoading(false)
        }
    }, [yearFilter, monthFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const trendData = useMemo(() => {
        return trend.map(t => ({
            month: t.month,
            value: t.on_time_rate || 0
        }))
    }, [trend])

    // Build unique milestone columns from actual data
    const uniqueMilestones = useMemo(() => {
        const msSet = new Map<string, number>()
        for (const proj of data) {
            for (const ms of proj.milestones) {
                if (!msSet.has(ms.milestone_name)) {
                    msSet.set(ms.milestone_name, ms.total_docs)
                } else {
                    msSet.set(ms.milestone_name, msSet.get(ms.milestone_name)! + ms.total_docs)
                }
            }
        }
        const order = ["Mapping Data", "System Test", "User Acceptance Test", "Go-Live", "Close Go-Live"]
        return Array.from(msSet.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => {
                const aIdx = order.indexOf(a.name)
                const bIdx = order.indexOf(b.name)
                if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name)
                if (aIdx === -1) return 1
                if (bIdx === -1) return -1
                return aIdx - bIdx
            })
    }, [data])

    // Create lookup map: project_id -> { milestoneName: milestoneDetail }
    const projectMilestoneMap = useMemo(() => {
        const map = new Map<string, Map<string, MilestoneDocsDetail>>()
        for (const proj of data) {
            const msMap = new Map<string, MilestoneDocsDetail>()
            for (const ms of proj.milestones) {
                msMap.set(ms.milestone_name, ms)
            }
            map.set(proj.project_id, msMap)
        }
        return map
    }, [data])

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
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full bg-slate-50 min-h-screen"}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <FileText size={24} className="text-teal-600" />
                            </div>
                            Required Docs On-time
                        </h1>
                        <p className="text-slate-500 mt-1">ส่งเอกสารตามกำหนด - เป้าหมาย: ≥ 95%</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-slate-500">เกณฑ์คำนวณ</div>
                            <div className="text-xs text-slate-400">On-time Rate = (On-time Docs / Submitted Docs) × 100</div>
                        </div>
                        <div className="relative group">
                            <button className="p-2 hover:bg-slate-100 rounded-lg">
                                <Info size={20} className="text-slate-400" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-white shadow-xl rounded-xl p-4 w-72 z-50 hidden group-hover:block border border-slate-200">
                                <h5 className="font-semibold text-slate-700 text-sm mb-2">Scoring</h5>
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between"><span className="text-emerald-600">On-time (≤ Due Date)</span><span className="font-bold">Pass</span></div>
                                    <div className="flex justify-between"><span className="text-amber-600">Late (&gt; Due Date)</span><span className="font-bold">Count as Late</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Target</span><span className="font-bold">≥ 95%</span></div>
                                </div>
                                {uniqueMilestones.length > 0 && (
                                    <div className="mt-3">
                                        <h5 className="font-semibold text-slate-700 text-sm mb-2">Docs by Milestone</h5>
                                        <WeightBar milestones={uniqueMilestones} />
                                        <div className="text-[9px] text-slate-500 mt-1 text-center">* จำนวนเอกสาร (required) แตกต่างกันตามโปรเจค</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-400" />
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value="all">ทั้งปี</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    โหลดข้อมูล
                </button>

                <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                    <Target size={16} className="text-teal-500" />
                    <span>เป้าหมาย: <span className="font-semibold text-teal-600">≥ 95%</span></span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Overall Rate"
                    value={`${summary.rate}%`}
                    icon={BarChart3}
                    color={summary.isPass ? 'teal' : 'rose'}
                    subtext={summary.isPass ? 'Pass' : 'Below Target'}
                />
                <SummaryCard
                    title="Total Docs"
                    value={summary.totalDocs}
                    icon={FileText}
                    color="teal"
                    subtext={`${data.length} โครงการ`}
                />
                <SummaryCard
                    title="On-time"
                    value={summary.onTimeDocs}
                    icon={CheckCircle2}
                    color="emerald"
                    subtext={`${summary.lateDocs} Late`}
                />
                <SummaryCard
                    title="Pass / Fail"
                    value={`${summary.passCount} / ${summary.failCount}`}
                    icon={Target}
                    color={summary.passCount >= summary.failCount ? 'emerald' : 'rose'}
                    subtext="โครงการ"
                />
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-teal-600" />
                    Monthly Trend - {yearFilter}
                </h3>
                <div className="grid grid-cols-12 gap-2">
                    {MONTHS.map((month) => {
                        const monthData = trend.find((t: any) => t.month === month.value)
                        if (!monthData || (monthData.on_time + monthData.late) === 0) {
                            return (
                                <div key={month.value} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                    <div className="text-xs font-medium text-slate-400 mb-1">{month.label}</div>
                                    <div className="text-sm font-bold text-slate-300">-</div>
                                </div>
                            )
                        }
                        return (
                            <div
                                key={month.value}
                                className={`rounded-lg p-2 text-center border ${monthData.is_pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}
                            >
                                <div className={`text-xs font-medium mb-1 ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {month.label}
                                </div>
                                <div className={`text-sm font-bold ${monthData.is_pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {monthData.on_time_rate}%
                                </div>
                                <div className={`text-xs ${monthData.is_pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {monthData.on_time}/{monthData.on_time + monthData.late}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-teal-600" />
                        Project Docs On-time
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} โปรเจค)</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-700 w-16">รหัส</th>
                                <th className="text-left px-2 py-3 text-xs font-semibold text-slate-700 w-48">ชื่อโครงการ</th>
                                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-16">Docs</th>
                                {uniqueMilestones.map(ms => {
                                    const config = MILESTONE_CONFIG[ms.name] || { shortName: ms.name.substring(0, 6), color: "#94a3b8" }
                                    return (
                                        <th key={ms.name} className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-20">
                                            <div title={ms.name}>{config.shortName}</div>
                                        </th>
                                    )
                                })}
                                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-20">KPI</th>
                                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-16">Trend</th>
                                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-14">ผล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6 + uniqueMilestones.length} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-teal-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6 + uniqueMilestones.length} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => {
                                    const projMilestones = projectMilestoneMap.get(row.project_id)

                                    return (
                                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${!row.is_pass ? 'bg-rose-50/30' : ''}`}>
                                            <td className="px-3 py-2.5">
                                                <button
                                                    onClick={() => handleEditProject(row.project_id)}
                                                    className="font-bold text-teal-700 hover:text-teal-900 hover:underline text-sm flex items-center gap-1"
                                                    title="คลิกเพื่อแก้ไขโครงการ"
                                                >
                                                    {row.project_code}
                                                    <ExternalLink size={12} className="opacity-50" />
                                                </button>
                                            </td>
                                            <td className="px-2 py-2.5">
                                                <span className="text-sm text-slate-700 line-clamp-1">{row.project_name}</span>
                                            </td>
                                            <td className="text-center px-2 py-2.5">
                                                <div className="text-sm font-medium">
                                                    <span className="text-emerald-700">{row.on_time_docs}</span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className="text-slate-600">{row.on_time_docs + row.late_docs}</span>
                                                </div>
                                            </td>
                                            {uniqueMilestones.map((ms) => {
                                                const msData = projMilestones?.get(ms.name)

                                                if (!msData || msData.total_docs === 0) {
                                                    return (
                                                        <td key={ms.name} className="px-2 py-2.5 text-center">
                                                            <span className="text-slate-300">-</span>
                                                        </td>
                                                    )
                                                }

                                                const submitted = msData.on_time_docs + msData.late_docs
                                                const hasSubmitted = submitted > 0

                                                return (
                                                    <td key={ms.name} className="px-2 py-2.5">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <div className="text-xs font-medium">
                                                                <span className="text-emerald-700">{msData.on_time_docs}</span>
                                                                <span className="text-slate-400">/</span>
                                                                <span className={msData.late_docs > 0 ? 'text-rose-600' : 'text-slate-600'}>
                                                                    {submitted}
                                                                </span>
                                                            </div>
                                                            {hasSubmitted ? (
                                                                <>
                                                                    <span className={`text-xs font-bold ${msData.on_time_rate >= 95 ? 'text-emerald-600' : msData.on_time_rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                        {msData.on_time_rate}%
                                                                    </span>
                                                                    <div className="w-full max-w-[50px]">
                                                                        <ProgressBar value={msData.on_time_rate} height={3} />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">
                                                                    {msData.pending_docs > 0 ? (
                                                                        <span className="flex items-center gap-0.5">
                                                                            <Clock size={10} />
                                                                            {msData.pending_docs}
                                                                        </span>
                                                                    ) : msData.overdue_docs > 0 ? (
                                                                        <span className="flex items-center gap-0.5 text-rose-500">
                                                                            <AlertTriangle size={10} />
                                                                            {msData.overdue_docs}
                                                                        </span>
                                                                    ) : '-'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                            <td className="text-center px-2 py-2.5">
                                                <span className={`text-base font-black ${row.on_time_rate >= 95 ? 'text-emerald-600' : row.on_time_rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    {row.on_time_rate}%
                                                </span>
                                            </td>
                                            <td className="text-center px-2 py-2.5">
                                                <Sparkline data={trendData} width={50} height={20} />
                                            </td>
                                            <td className="text-center px-2 py-2.5">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${row.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {row.is_pass ? "Pass" : "Fail"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Summary Row */}
                        {data.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-slate-700">รวม</td>
                                    <td className="px-2 py-2.5 text-sm text-slate-600">{data.length} โปรเจค</td>
                                    <td className="text-center px-2 py-2.5">
                                        <div className="text-sm font-bold">
                                            <span className="text-emerald-700">{summary.onTimeDocs}</span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-slate-600">{summary.onTimeDocs + summary.lateDocs}</span>
                                        </div>
                                    </td>
                                    <td colSpan={uniqueMilestones.length}></td>
                                    <td className="text-center px-2 py-2.5">
                                        <span className={`text-lg font-black ${summary.rate >= 95 ? 'text-emerald-600' : summary.rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {summary.rate}%
                                        </span>
                                    </td>
                                    <td></td>
                                    <td className="text-center px-2 py-2.5">
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
                    <span>Pass (≥ 95%)</span>
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
