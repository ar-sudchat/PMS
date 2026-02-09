'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, Calendar, Target, FolderKanban, BarChart3, Clock, Info, AlertTriangle, ExternalLink, X } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface TimeToDeliveryViewProps {
    embedded?: boolean
}

// Interface for milestone detail popup
interface MilestoneDetailData {
    projectCode: string
    projectName: string
    milestoneName: string
    dueDate: string | null
    completedDate: string | null
    daysDiff: number | null
    achievement: number
    weight: number
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
    "Mapping Data": { shortName: "Mapping", color: "#6366f1" },
    "System Test": { shortName: "ST", color: "#8b5cf6" },
    "User Acceptance Test": { shortName: "UAT", color: "#a78bfa" },
    "Go-Live": { shortName: "Go-Live", color: "#c4b5fd" },
    "Close Go-Live": { shortName: "Close", color: "#ddd6fe" },
}

// Progress Bar Component
function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
    const c = value >= 100 ? "#10b981" : value >= 80 ? "#3b82f6" : value >= 60 ? "#f59e0b" : "#ef4444"
    return (
        <div className="relative">
            <div style={{ width: "100%", height, background: "#e2e8f0", borderRadius: height / 2, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, value)}%`, height: "100%", borderRadius: height / 2, background: c, transition: "width 0.3s ease" }} />
            </div>
        </div>
    )
}

// Sparkline Component
function Sparkline({ data, width = 100, height = 28 }: { data: { month: number; value: number }[]; width?: number; height?: number }) {
    if (data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-slate-400 text-xs">-</div>
    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * (width - 8) + 4,
        y: height - 4 - (d.value / 100) * (height - 8),
        ...d
    }))
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const last = pts[pts.length - 1]
    const color = last.value >= 80 ? "#10b981" : last.value >= 60 ? "#f59e0b" : "#ef4444"
    const tY = height - 4 - (80 / 100) * (height - 8)
    return (
        <svg width={width} height={height} className="block">
            <line x1={4} y1={tY} x2={width - 4} y2={tY} stroke="#3b82f640" strokeWidth={1} strokeDasharray="2,2" />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
        </svg>
    )
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

    // Milestone Detail Popup
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedMilestoneDetail, setSelectedMilestoneDetail] = useState<MilestoneDetailData | null>(null)

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

    // Open milestone detail popup
    const handleMilestoneClick = (detail: MilestoneDetailData) => {
        setSelectedMilestoneDetail(detail)
        setIsDetailOpen(true)
    }

    // Get score explanation based on days difference
    const getScoreExplanation = (daysDiff: number | null) => {
        if (daysDiff === null) return { label: '-', color: 'text-slate-500' }
        if (daysDiff <= 0) return { label: 'ตรงเวลา/ก่อนกำหนด → 100%', color: 'text-emerald-600' }
        if (daysDiff <= 7) return { label: `เลย ${daysDiff} วัน (≤7 วัน) → 80%`, color: 'text-blue-600' }
        if (daysDiff <= 14) return { label: `เลย ${daysDiff} วัน (≤14 วัน) → 60%`, color: 'text-amber-600' }
        return { label: `เลย ${daysDiff} วัน (>14 วัน) → 40%`, color: 'text-rose-600' }
    }

    // Format date for display
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
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

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const activeMonths = useMemo(() => {
        const monthSet = new Set(data.map(d => d.month))
        return MONTHS.filter(m => monthSet.has(m.value))
    }, [data])

    const trendData = useMemo(() => {
        return trend.map(t => ({
            month: t.month,
            value: parseFloat(t.avg_percent) || 0
        }))
    }, [trend])

    // Build unique milestone columns from actual data
    const uniqueMilestones = useMemo(() => {
        const msSet = new Map<string, number>()
        for (const proj of milestoneData) {
            for (const ms of proj.milestones) {
                if (!msSet.has(ms.milestone_name)) {
                    msSet.set(ms.milestone_name, ms.weight_ttd || 0)
                }
            }
        }
        const order = ["Mapping Data", "System Test", "User Acceptance Test", "Go-Live", "Close Go-Live"]
        return Array.from(msSet.entries())
            .map(([name, weight]) => ({ name, weight }))
            .sort((a, b) => {
                const aIdx = order.indexOf(a.name)
                const bIdx = order.indexOf(b.name)
                if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name)
                if (aIdx === -1) return 1
                if (bIdx === -1) return -1
                return aIdx - bIdx
            })
    }, [milestoneData])

    // Create lookup map
    const projectMilestoneMap = useMemo(() => {
        const map = new Map<string, Map<string, { dueDate: string | null; completedDate: string | null; daysDiff: number | null; achievement: number }>>()
        for (const proj of milestoneData) {
            const msMap = new Map<string, { dueDate: string | null; completedDate: string | null; daysDiff: number | null; achievement: number }>()
            for (const ms of proj.milestones) {
                msMap.set(ms.milestone_name, {
                    dueDate: ms.due_date,
                    completedDate: ms.completed_date,
                    daysDiff: ms.days_diff,
                    achievement: ms.achievement_percent
                })
            }
            map.set(proj.project_id, msMap)
        }
        return map
    }, [milestoneData])

    const overallKPI = summary?.averagePercent || 0
    const passCount = summary?.passCount || 0
    const totalProjects = summary?.totalProjects || 0

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-6 w-full bg-slate-50 min-h-screen"}>
            {/* Header */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 p-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Clock size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Time to Delivery</h1>
                                <p className="text-blue-100 text-sm mt-1">ส่งมอบงานตามกำหนด — Target ≥ 80%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {summary && (
                                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <div className="text-white/70 text-xs">Projects Pass</div>
                                    <div className="text-white font-bold text-lg">{passCount}/{totalProjects}</div>
                                </div>
                            )}
                            <button
                                onClick={() => fetchData()}
                                disabled={isLoading}
                                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all"
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Explanation */}
            {!embedded && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                            <Info size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h5 className="font-semibold text-slate-700 text-sm mb-2">เกณฑ์ให้คะแนน</h5>
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between"><span className="text-emerald-600">ตรงเวลา / ก่อนกำหนด</span><span className="font-bold">100%</span></div>
                                    <div className="flex justify-between"><span className="text-blue-600">เลย ≤ 7 วัน</span><span className="font-bold">80%</span></div>
                                    <div className="flex justify-between"><span className="text-amber-600">เลย ≤ 14 วัน</span><span className="font-bold">60%</span></div>
                                    <div className="flex justify-between"><span className="text-rose-600">เลย &gt; 14 วัน</span><span className="font-bold">40%</span></div>
                                </div>
                            </div>
                            <div>
                                <h5 className="font-semibold text-slate-700 text-sm mb-2">สูตรการคิด</h5>
                                <div className="bg-slate-50 p-2 rounded text-xs font-mono text-center border">
                                    <div>Σ (คะแนน × น้ำหนัก)</div>
                                    <div className="border-t border-slate-300 my-1"></div>
                                    <div>Σ น้ำหนัก</div>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-1 text-center">* น้ำหนักแตกต่างกันตามโปรเจค</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Calendar size={16} className="text-slate-400" />
                <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white font-medium text-sm"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <span className="text-slate-400">|</span>

                <button onClick={() => setMonthFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${monthFilter === "all" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    ทั้งปี
                </button>
                {activeMonths.map(m => (
                    <button key={m.value} onClick={() => setMonthFilter(m.value.toString())} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${monthFilter === m.value.toString() ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Score Card */}
                    <div className={`rounded-xl shadow-sm p-4 border-2 ${summary.isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                            <Target size={16} className={summary.isPass ? 'text-emerald-600' : 'text-rose-600'} />
                            <span className="text-xs font-semibold">คะแนนรวม</span>
                        </div>
                        <div className={`text-4xl font-black ${summary.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {overallKPI}%
                        </div>
                        <div className={`text-xs mt-1 ${summary.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {summary.isPass ? '✓ Pass' : '✗ Below Target'}
                        </div>
                    </div>

                    {/* Projects */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                            <FolderKanban size={16} className="text-blue-500" />
                            <span className="text-xs font-semibold">โปรเจค</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{totalProjects}</div>
                        <div className="text-xs text-slate-500">โปรเจคที่วัดผล</div>
                    </div>

                    {/* Pass */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-semibold">ผ่าน</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-600">{passCount}</div>
                        <div className="text-xs text-emerald-500">≥ 80%</div>
                    </div>

                    {/* Fail */}
                    <div className="rounded-xl bg-rose-50 border border-rose-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 text-rose-600 mb-2">
                            <XCircle size={16} />
                            <span className="text-xs font-semibold">ไม่ผ่าน</span>
                        </div>
                        <div className="text-3xl font-black text-rose-600">{summary.failCount}</div>
                        <div className="text-xs text-rose-500">&lt; 80%</div>
                    </div>
                </div>
            )}

            {/* Monthly Trend */}
            {monthFilter === "all" && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-blue-500" />
                        แนวโน้มรายเดือน {yearFilter}
                    </h3>
                    <div className="grid grid-cols-12 gap-2">
                        {MONTHS.map((month) => {
                            const monthData = trend.find((t: any) => t.month === month.value)
                            const avgPercent = monthData?.avg_percent || 0
                            const projectCount = monthData?.project_count || 0
                            const hasData = projectCount > 0
                            const isPass = avgPercent >= 80

                            return (
                                <div key={month.value} className={`rounded-lg p-2 text-center border ${hasData ? (isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200') : 'bg-slate-50 border-slate-200'}`}>
                                    <div className={`text-[10px] font-medium ${hasData ? (isPass ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{month.label}</div>
                                    <div className={`text-sm font-bold ${hasData ? (isPass ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-300'}`}>
                                        {hasData ? `${avgPercent.toFixed(0)}%` : "-"}
                                    </div>
                                    {hasData && (
                                        <div className={`text-[9px] ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {projectCount} proj
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Project Table with Milestone Columns */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-blue-600" />
                        รายละเอียดโปรเจค
                        <span className="text-sm font-normal text-slate-500 ml-2">({data.length} โปรเจค)</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-700 w-16">รหัส</th>
                                <th className="text-left px-2 py-3 text-xs font-semibold text-slate-700 w-48">ชื่อโครงการ</th>
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
                                    <td colSpan={5 + uniqueMilestones.length} className="text-center py-12 text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                                        <div className="text-sm">กำลังโหลด...</div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5 + uniqueMilestones.length} className="text-center py-12 text-slate-500">
                                        <FolderKanban size={24} className="mx-auto mb-3 text-slate-300" />
                                        <div className="text-sm">ไม่มีข้อมูลโปรเจค</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => {
                                    const kpi = row.time_to_delivery_percent
                                    const projMilestones = projectMilestoneMap.get(row.project_id)

                                    return (
                                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${row.is_pass !== 1 ? 'bg-rose-50/30' : ''}`}>
                                            <td className="px-3 py-2.5">
                                                <button
                                                    onClick={() => handleEditProject(row.project_id)}
                                                    className="font-bold text-blue-700 hover:text-blue-900 hover:underline text-sm flex items-center gap-1"
                                                    title="คลิกเพื่อแก้ไขโครงการ"
                                                >
                                                    {row.project_code}
                                                    <ExternalLink size={12} className="opacity-50" />
                                                </button>
                                            </td>
                                            <td className="px-2 py-2.5">
                                                <span className="text-sm text-slate-700 line-clamp-1">{row.project_name}</span>
                                            </td>
                                            {uniqueMilestones.map((ms) => {
                                                const msData = projMilestones?.get(ms.name)

                                                if (!msData) {
                                                    return (
                                                        <td key={ms.name} className="px-2 py-2.5 text-center">
                                                            <span className="text-slate-300">-</span>
                                                        </td>
                                                    )
                                                }

                                                const hasCompleted = msData.completedDate !== null

                                                return (
                                                    <td key={ms.name} className="px-2 py-2.5">
                                                        <button
                                                            onClick={() => handleMilestoneClick({
                                                                projectCode: row.project_code,
                                                                projectName: row.project_name,
                                                                milestoneName: ms.name,
                                                                dueDate: msData.dueDate,
                                                                completedDate: msData.completedDate,
                                                                daysDiff: msData.daysDiff,
                                                                achievement: msData.achievement,
                                                                weight: ms.weight
                                                            })}
                                                            className="w-full flex flex-col items-center gap-0.5 cursor-pointer hover:bg-slate-100 rounded-lg p-1 transition-colors"
                                                            title="คลิกเพื่อดูรายละเอียด"
                                                        >
                                                            {hasCompleted ? (
                                                                <>
                                                                    <div className={`text-xs font-medium ${msData.daysDiff !== null && msData.daysDiff <= 0 ? 'text-emerald-600' : msData.daysDiff !== null && msData.daysDiff <= 7 ? 'text-blue-600' : msData.daysDiff !== null && msData.daysDiff <= 14 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                        {msData.daysDiff !== null ? (msData.daysDiff <= 0 ? `✓` : `+${msData.daysDiff}d`) : '-'}
                                                                    </div>
                                                                    <span className={`text-xs font-bold ${msData.achievement >= 100 ? 'text-emerald-600' : msData.achievement >= 80 ? 'text-blue-600' : msData.achievement >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                        {msData.achievement}%
                                                                    </span>
                                                                    <div className="w-full max-w-[50px]">
                                                                        <ProgressBar value={msData.achievement} height={3} />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">รอ</span>
                                                            )}
                                                        </button>
                                                    </td>
                                                )
                                            })}
                                            <td className="text-center px-2 py-2.5">
                                                <span className={`text-base font-black ${kpi >= 80 ? 'text-emerald-600' : kpi >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    {kpi}%
                                                </span>
                                            </td>
                                            <td className="text-center px-2 py-2.5">
                                                <Sparkline data={trendData} width={50} height={20} />
                                            </td>
                                            <td className="text-center px-2 py-2.5">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${row.is_pass === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {row.is_pass === 1 ? "Pass" : "Fail"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Summary Row */}
                        {summary && data.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-slate-700">รวม</td>
                                    <td className="px-2 py-2.5 text-sm text-slate-600">{data.length} โปรเจค</td>
                                    <td colSpan={uniqueMilestones.length}></td>
                                    <td className="text-center px-2 py-2.5">
                                        <span className={`text-lg font-black ${overallKPI >= 80 ? 'text-emerald-600' : overallKPI >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {overallKPI.toFixed(1)}%
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
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (≥ 80%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Warning (60-79%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&lt; 60%)</span>
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

            {/* Milestone Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="text-blue-500" size={20} />
                            รายละเอียดการคำนวณ
                        </DialogTitle>
                    </DialogHeader>
                    {selectedMilestoneDetail && (
                        <div className="space-y-4">
                            {/* Project Info */}
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="text-xs text-slate-500 mb-1">โครงการ</div>
                                <div className="font-bold text-blue-700">{selectedMilestoneDetail.projectCode}</div>
                                <div className="text-sm text-slate-600 line-clamp-1">{selectedMilestoneDetail.projectName}</div>
                            </div>

                            {/* Milestone Info */}
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                <div className="text-xs text-indigo-500 mb-1">Milestone</div>
                                <div className="font-semibold text-indigo-700">{selectedMilestoneDetail.milestoneName}</div>
                                <div className="text-sm text-indigo-600">น้ำหนัก: {selectedMilestoneDetail.weight}%</div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 mb-1">กำหนดส่งมอบ</div>
                                    <div className="font-semibold text-slate-700">
                                        {formatDate(selectedMilestoneDetail.dueDate)}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 mb-1">วันที่เสร็จจริง</div>
                                    <div className="font-semibold text-slate-700">
                                        {formatDate(selectedMilestoneDetail.completedDate)}
                                    </div>
                                </div>
                            </div>

                            {/* Calculation */}
                            <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
                                <div className="text-sm font-semibold text-slate-700 mb-3">การคำนวณคะแนน</div>

                                {/* Days Difference */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-600">ความต่างของวัน:</span>
                                    <span className={`font-bold ${selectedMilestoneDetail.daysDiff !== null && selectedMilestoneDetail.daysDiff <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {selectedMilestoneDetail.daysDiff !== null
                                            ? (selectedMilestoneDetail.daysDiff <= 0
                                                ? `ก่อนกำหนด ${Math.abs(selectedMilestoneDetail.daysDiff)} วัน`
                                                : `เลย ${selectedMilestoneDetail.daysDiff} วัน`)
                                            : '-'}
                                    </span>
                                </div>

                                {/* Score Explanation */}
                                <div className="bg-slate-50 rounded p-2 mb-3">
                                    <div className={`text-sm font-medium ${getScoreExplanation(selectedMilestoneDetail.daysDiff).color}`}>
                                        {getScoreExplanation(selectedMilestoneDetail.daysDiff).label}
                                    </div>
                                </div>

                                {/* Final Score */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                    <span className="text-sm font-medium text-slate-700">คะแนนที่ได้:</span>
                                    <span className={`text-2xl font-black ${selectedMilestoneDetail.achievement >= 100 ? 'text-emerald-600' : selectedMilestoneDetail.achievement >= 80 ? 'text-blue-600' : selectedMilestoneDetail.achievement >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {selectedMilestoneDetail.achievement}%
                                    </span>
                                </div>
                            </div>

                            {/* Scoring Guide */}
                            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 border border-slate-200">
                                <div className="font-semibold mb-2">เกณฑ์ให้คะแนน:</div>
                                <div className="grid grid-cols-2 gap-1">
                                    <div className="text-emerald-600">ตรงเวลา/ก่อนกำหนด</div><div className="text-right font-medium">100%</div>
                                    <div className="text-blue-600">เลย ≤ 7 วัน</div><div className="text-right font-medium">80%</div>
                                    <div className="text-amber-600">เลย ≤ 14 วัน</div><div className="text-right font-medium">60%</div>
                                    <div className="text-rose-600">เลย &gt; 14 วัน</div><div className="text-right font-medium">40%</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
