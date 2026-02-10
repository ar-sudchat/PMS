'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, XCircle, RefreshCw, Calendar, Target, Users, FolderKanban, BarChart3, Calculator, Info, ExternalLink, LayoutGrid, Table2 } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface MandayControlViewProps {
    embedded?: boolean
}

interface MilestoneDetailData {
    projectCode: string
    projectName: string
    milestoneName: string
    planned: number | null
    actual: number | null
    weight: number | null
    achievement: number
}

const MONTHS = [
    { value: 1, label: 'ม.ค.', short: 'ม.ค.' },
    { value: 2, label: 'ก.พ.', short: 'ก.พ.' },
    { value: 3, label: 'มี.ค.', short: 'มี.ค.' },
    { value: 4, label: 'เม.ย.', short: 'เม.ย.' },
    { value: 5, label: 'พ.ค.', short: 'พ.ค.' },
    { value: 6, label: 'มิ.ย.', short: 'มิ.ย.' },
    { value: 7, label: 'ก.ค.', short: 'ก.ค.' },
    { value: 8, label: 'ส.ค.', short: 'ส.ค.' },
    { value: 9, label: 'ก.ย.', short: 'ก.ย.' },
    { value: 10, label: 'ต.ค.', short: 'ต.ค.' },
    { value: 11, label: 'พ.ย.', short: 'พ.ย.' },
    { value: 12, label: 'ธ.ค.', short: 'ธ.ค.' },
]

// Milestone config with colors
const MILESTONE_CONFIG: Record<string, { shortName: string; color: string }> = {
    "Mapping Data": { shortName: "Mapping", color: "#6366f1" },
    "System Test": { shortName: "ST", color: "#8b5cf6" },
    "User Acceptance Test": { shortName: "UAT", color: "#a78bfa" },
    "Go-Live": { shortName: "Go-Live", color: "#c4b5fd" },
    "Close Go-Live": { shortName: "Close", color: "#ddd6fe" },
}

// Status helpers
const STATUS_CONFIG = {
    pass: { color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "ผ่านเกณฑ์", icon: "✅", eng: "Pass", ring: "ring-emerald-200", headerGrad: "from-emerald-50 to-emerald-100/50", accent: "text-emerald-600", lightBg: "bg-emerald-100" },
    warning: { color: "#f59e0b", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "ใกล้เป้า", icon: "⚠️", eng: "Warning", ring: "ring-amber-200", headerGrad: "from-amber-50 to-amber-100/50", accent: "text-amber-600", lightBg: "bg-amber-100" },
    below: { color: "#ef4444", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", label: "ต่ำกว่าเป้า", icon: "🔴", eng: "Below", ring: "ring-rose-200", headerGrad: "from-rose-50 to-rose-100/50", accent: "text-rose-600", lightBg: "bg-rose-100" },
} as const

function getStatusColor(val: number) {
    if (val >= 85) return "#10b981"
    if (val >= 70) return "#f59e0b"
    return "#ef4444"
}

function getStatusKey(val: number): 'pass' | 'warning' | 'below' {
    if (val >= 85) return 'pass'
    if (val >= 70) return 'warning'
    return 'below'
}

function getStatusLabel(val: number) {
    if (val >= 85) return "Pass"
    if (val >= 70) return "Warning"
    return "Fail"
}

function getStatusBg(val: number) {
    if (val >= 85) return "bg-emerald-50 border-emerald-200 text-emerald-700"
    if (val >= 70) return "bg-amber-50 border-amber-200 text-amber-700"
    return "bg-rose-50 border-rose-200 text-rose-700"
}

// === GAUGE CHART (Light Theme) ===
function GaugeChart({ value, size = 180 }: { value: number; size?: number }) {
    const r = 68, cx = size / 2, cy = size / 2 + 10
    const sA = -210, eA = 30, range = eA - sA
    const v = Math.min(100, Math.max(0, value))
    const vA = sA + (v / 100) * range
    const p = (a: number) => { const rd = a * Math.PI / 180; return { x: cx + r * Math.cos(rd), y: cy + r * Math.sin(rd) } }
    const arc = (s: number, e: number) => { const sp = p(s), ep = p(e); return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y}` }
    const color = getStatusColor(value)
    const tA = sA + (85 / 100) * range, tp = p(tA)
    return (
        <svg width={size} height={size - 24} viewBox={`0 0 ${size} ${size - 24}`}>
            <path d={arc(sA, eA)} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="round" />
            {v > 0 && <path d={arc(sA, vA)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />}
            <line x1={tp.x} y1={tp.y - 10} x2={tp.x} y2={tp.y + 10} stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
            <text x={tp.x + 14} y={tp.y + 3} fill="#f59e0b" fontSize="8" fontWeight="700">TARGET 85%</text>
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#1e293b" fontSize="32" fontWeight="800">
                {value.toFixed(1)}<tspan fontSize="16" fill="#94a3b8">%</tspan>
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill={color} fontSize="12" fontWeight="700">{getStatusLabel(value)}</text>
        </svg>
    )
}

// === MINI RING (Light Theme) ===
function MiniRing({ value, size = 44 }: { value: number; size?: number }) {
    const r = 16, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r
    const color = getStatusColor(value)
    return (
        <svg width={size} height={size}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3.5} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3.5}
                strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`} />
            <text x={cx} y={cy + 4} textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="800">{Math.round(value)}</text>
        </svg>
    )
}

// === MILESTONE BAR (Light Theme) ===
function MilestoneBar({ milestones }: { milestones: { name: string; achievement: number; weight: number | null }[] }) {
    if (milestones.length === 0) return null
    return (
        <div className="flex gap-0.5 mt-2">
            {milestones.map((ms, i) => {
                const config = MILESTONE_CONFIG[ms.name] || { shortName: ms.name.substring(0, 6), color: "#94a3b8" }
                return (
                    <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" title={`${ms.name}: ${ms.achievement}%`}>
                        <div className="h-full rounded-full transition-all duration-300" style={{
                            width: `${Math.min(100, ms.achievement)}%`,
                            background: ms.achievement >= 100 ? "#10b981" : ms.achievement >= 70 ? config.color : "#f59e0b"
                        }} />
                    </div>
                )
            })}
        </div>
    )
}

// === WEIGHT BAR ===
function WeightBar({ milestones }: { milestones: { name: string; weight: number }[] }) {
    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0)
    if (totalWeight === 0) return null
    return (
        <div className="flex rounded-lg overflow-hidden h-6 w-full border border-slate-200">
            {milestones.map((ms, i) => {
                const config = MILESTONE_CONFIG[ms.name] || { shortName: ms.name.substring(0, 6), color: "#94a3b8" }
                const widthPercent = (ms.weight / totalWeight) * 100
                return (
                    <div key={i} style={{ width: `${widthPercent}%`, background: config.color }} className="flex items-center justify-center text-[9px] font-bold text-white" title={ms.name}>
                        {ms.weight}%
                    </div>
                )
            })}
        </div>
    )
}

// === PROGRESS BAR ===
function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
    const c = value >= 100 ? "#10b981" : value >= 50 ? "#3b82f6" : value > 0 ? "#f59e0b" : "#e2e8f0"
    return (
        <div style={{ width: "100%", height, background: "#e2e8f0", borderRadius: height / 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, value)}%`, height: "100%", borderRadius: height / 2, background: c, transition: "width 0.3s ease" }} />
        </div>
    )
}

// === SPARKLINE (Light Theme) ===
function Sparkline({ data, width = 100, height = 28 }: { data: { month: number; value: number }[]; width?: number; height?: number }) {
    if (data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-slate-400 text-xs">-</div>
    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * (width - 8) + 4,
        y: height - 4 - (d.value / 100) * (height - 8),
        ...d
    }))
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const last = pts[pts.length - 1]
    const color = getStatusColor(last.value)
    const tY = height - 4 - (85 / 100) * (height - 8)
    return (
        <svg width={width} height={height} className="block">
            <line x1={4} y1={tY} x2={width - 4} y2={tY} stroke="#fbbf2440" strokeWidth={1} strokeDasharray="2,2" />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
        </svg>
    )
}

// === KANBAN ROW (Compact 1-line per project) ===
function KanbanRow({ project, onEdit }: {
    project: MandayControlProject & { prevKpi?: number | null }
    onEdit: (id: string) => void
}) {
    const kpi = project.manday_control_percent
    const planned = project.total_planned_mandays || 0
    const actual = project.total_actual_mandays || 0
    const overBudget = actual > planned

    return (
        <button
            onClick={() => onEdit(project.project_id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors text-left group border-b border-slate-100 last:border-b-0"
        >
            {/* KPI dot */}
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: getStatusColor(kpi) }} />
            {/* Code */}
            <span className="text-xs font-bold text-orange-600 w-[60px] shrink-0 group-hover:underline">{project.project_code}</span>
            {/* Name */}
            <span className="text-xs text-slate-700 truncate flex-1 min-w-0">{project.project_name}</span>
            {/* MD */}
            <span className="text-[10px] text-slate-400 shrink-0 w-[70px] text-right tabular-nums">
                <span className="text-blue-600 font-medium">{planned.toFixed(0)}</span>
                <span className="text-slate-300">/</span>
                <span className={`font-medium ${overBudget ? 'text-rose-600' : 'text-emerald-600'}`}>{actual.toFixed(0)}</span>
            </span>
            {/* KPI % */}
            <span className={`text-xs font-bold shrink-0 w-[42px] text-right tabular-nums ${kpi >= 85 ? 'text-emerald-600' : kpi >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                {kpi.toFixed(0)}%
            </span>
        </button>
    )
}

// === KANBAN COLUMN (Compact rows) ===
function KanbanColumn({ statusKey, projects, totalManday, avgKpi, onEditProject }: {
    statusKey: 'pass' | 'warning' | 'below'
    projects: (MandayControlProject & { prevKpi?: number | null })[]
    totalManday: number
    avgKpi: number
    onEditProject: (id: string) => void
}) {
    const cfg = STATUS_CONFIG[statusKey]
    return (
        <div className="flex-1 min-w-[320px] flex flex-col">
            {/* Column Header */}
            <div className={`bg-gradient-to-br ${cfg.headerGrad} rounded-t-xl border ${cfg.border} border-b-0 px-4 py-3`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">{cfg.icon}</span>
                        <span className={`text-sm font-bold ${cfg.accent}`}>{cfg.eng}</span>
                        <span className={`text-xs ${cfg.accent} opacity-70`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500">
                            MD <span className="font-bold text-slate-700">{totalManday.toLocaleString()}</span>
                        </span>
                        <span className={`text-[10px] ${cfg.accent}`}>
                            Avg <span className="font-bold">{projects.length > 0 ? avgKpi.toFixed(1) + "%" : "—"}</span>
                        </span>
                        <span className={`text-base font-black ${cfg.accent} ${cfg.lightBg} px-2 py-0.5 rounded-md`}>
                            {projects.length}
                        </span>
                    </div>
                </div>
            </div>
            {/* Rows */}
            <div className={`flex-1 bg-white rounded-b-xl border ${cfg.border} border-t-0 overflow-hidden`}>
                {projects.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">ไม่มีโปรเจกต์</div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                        {projects.map(p => (
                            <KanbanRow
                                key={p.project_id}
                                project={p}
                                onEdit={onEditProject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// === MONTH STATUS STRIP (Light Theme) ===
function MonthStatusStrip({ trendData, selectedMonth, onSelect }: {
    trendData: { month: number; avg_percent: number; project_count: number; pass_count: number; total_planned: number; total_actual: number }[]
    selectedMonth: string
    onSelect: (month: string) => void
}) {
    return (
        <div className="flex gap-1.5 flex-wrap">
            {/* All year button */}
            <button
                onClick={() => onSelect("all")}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[52px] border-2 ${
                    selectedMonth === "all"
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-transparent bg-white hover:bg-slate-50'
                }`}
            >
                <span className={`text-[8px] font-bold uppercase tracking-wide ${selectedMonth === "all" ? 'text-orange-600' : 'text-slate-400'}`}>
                    ALL
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedMonth === "all" ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                }`}>
                    ∑
                </div>
                <span className={`text-[10px] font-medium ${selectedMonth === "all" ? 'text-slate-800' : 'text-slate-400'}`}>ทั้งปี</span>
            </button>
            {MONTHS.map(m => {
                const monthData = trendData.find(t => t.month === m.value)
                const kpi = monthData?.avg_percent || 0
                const count = monthData?.project_count || 0
                const active = selectedMonth === m.value.toString()
                const hasData = count > 0
                const color = hasData ? getStatusColor(kpi) : "#cbd5e1"

                return (
                    <button
                        key={m.value}
                        onClick={() => onSelect(m.value.toString())}
                        className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl transition-all min-w-[52px] border-2 ${
                            active
                                ? `border-orange-400 bg-orange-50 shadow-sm`
                                : 'border-transparent bg-white hover:bg-slate-50'
                        }`}
                    >
                        <span className={`text-[8px] font-bold uppercase tracking-wide`} style={{ color: hasData ? color : '#cbd5e1' }}>
                            {hasData ? kpi.toFixed(0) + "%" : "—"}
                        </span>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{
                            background: hasData ? `${color}20` : '#f1f5f9',
                            color: hasData ? color : '#cbd5e1',
                        }}>
                            {hasData ? count : "·"}
                        </div>
                        <span className={`text-[10px] font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}>{m.short}</span>
                    </button>
                )
            })}
        </div>
    )
}

// === MAIN COMPONENT ===
export default function MandayControlView({ embedded = false }: MandayControlViewProps) {
    const [data, setData] = useState<MandayControlProject[]>([])
    const [summary, setSummary] = useState<MandayControlSummary | null>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [milestoneData, setMilestoneData] = useState<ProjectMilestoneData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())
    const [monthFilter, setMonthFilter] = useState<string>("all")
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

    // Edit Project Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<any>(null)

    // Milestone Detail Popup
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedMilestoneDetail, setSelectedMilestoneDetail] = useState<MilestoneDetailData | null>(null)

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

    const handleMilestoneClick = (detail: MilestoneDetailData) => {
        setSelectedMilestoneDetail(detail)
        setIsDetailOpen(true)
    }

    const getScoreExplanation = (planned: number | null, actual: number | null) => {
        if (planned === null || actual === null || planned === 0) return { label: '-', color: 'text-slate-500' }
        const ratio = actual / planned
        if (ratio <= 1) return { label: `Actual ≤ Plan → 100%`, color: 'text-emerald-600' }
        if (ratio <= 1.1) return { label: `Actual ≤ Plan×1.1 (${(ratio * 100).toFixed(0)}%) → 90%`, color: 'text-yellow-600' }
        if (ratio <= 1.2) return { label: `Actual ≤ Plan×1.2 (${(ratio * 100).toFixed(0)}%) → 70%`, color: 'text-orange-600' }
        return { label: `Actual > Plan×1.2 (${(ratio * 100).toFixed(0)}%) → 50%`, color: 'text-rose-600' }
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

    const trendData = useMemo(() => {
        return trend.map(t => ({
            month: t.month,
            value: parseFloat(t.avg_percent) || 0
        }))
    }, [trend])

    // Build unique milestone columns
    const uniqueMilestones = useMemo(() => {
        const msSet = new Map<string, number>()
        for (const proj of milestoneData) {
            for (const ms of proj.milestones) {
                if (!msSet.has(ms.milestone_name)) {
                    msSet.set(ms.milestone_name, ms.weight_mdc || 0)
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

    // Milestone lookup map: project_id -> milestoneDetail[]
    const projectMilestoneMap = useMemo(() => {
        const map = new Map<string, Map<string, { planned: number | null; actual: number | null; weight: number | null; achievement: number }>>()
        for (const proj of milestoneData) {
            const msMap = new Map<string, { planned: number | null; actual: number | null; weight: number | null; achievement: number }>()
            for (const ms of proj.milestones) {
                msMap.set(ms.milestone_name, {
                    planned: ms.planned_mandays,
                    actual: ms.actual_mandays,
                    weight: ms.weight_mdc,
                    achievement: ms.achievement_percent
                })
            }
            map.set(proj.project_id, msMap)
        }
        return map
    }, [milestoneData])

    // Kanban milestone map: project_id -> { name, achievement, weight }[]
    const kanbanMilestoneMap = useMemo(() => {
        const map = new Map<string, { name: string; achievement: number; weight: number | null }[]>()
        for (const proj of milestoneData) {
            const order = ["Mapping Data", "System Test", "User Acceptance Test", "Go-Live", "Close Go-Live"]
            const sorted = [...proj.milestones].sort((a, b) => {
                const aI = order.indexOf(a.milestone_name)
                const bI = order.indexOf(b.milestone_name)
                return (aI === -1 ? 999 : aI) - (bI === -1 ? 999 : bI)
            })
            map.set(proj.project_id, sorted.map(ms => ({
                name: ms.milestone_name,
                achievement: ms.achievement_percent,
                weight: ms.weight_mdc
            })))
        }
        return map
    }, [milestoneData])

    // Kanban grouping
    const kanbanData = useMemo(() => {
        // Get previous month data for comparison
        const prevMonthTrend = monthFilter !== "all"
            ? trend.find((t: any) => t.month === parseInt(monthFilter) - 1)
            : null

        const projectsWithPrev = data.map(p => ({
            ...p,
            prevKpi: prevMonthTrend ? parseFloat(prevMonthTrend.avg_percent) || null : null
        }))

        const grouped: Record<'pass' | 'warning' | 'below', (MandayControlProject & { prevKpi?: number | null })[]> = {
            pass: [], warning: [], below: []
        }
        projectsWithPrev.forEach(p => {
            grouped[getStatusKey(p.manday_control_percent)].push(p)
        })
        // Sort each group by KPI desc
        Object.values(grouped).forEach(arr => arr.sort((a, b) => b.manday_control_percent - a.manday_control_percent))

        const colStats: Record<'pass' | 'warning' | 'below', { manday: number; avgKpi: number }> = {
            pass: { manday: 0, avgKpi: 0 },
            warning: { manday: 0, avgKpi: 0 },
            below: { manday: 0, avgKpi: 0 },
        }
        for (const k of ['pass', 'warning', 'below'] as const) {
            colStats[k] = {
                manday: grouped[k].reduce((s, r) => s + (r.total_planned_mandays || 0), 0),
                avgKpi: grouped[k].length > 0
                    ? grouped[k].reduce((s, r) => s + r.manday_control_percent, 0) / grouped[k].length
                    : 0,
            }
        }

        return { grouped, colStats }
    }, [data, trend, monthFilter])

    const overallKPI = summary?.averagePercent || 0
    const totalManday = summary?.totalPlannedMandays || 0
    const passCount = summary?.passCount || 0
    const totalProjects = summary?.totalProjects || 0
    const monthLabel = monthFilter === "all"
        ? `ปี ${yearFilter}`
        : MONTHS.find(m => m.value === parseInt(monthFilter))?.label + ` ${yearFilter + 543 - 2000}` || monthFilter

    return (
        <div className={embedded ? "p-4 space-y-4" : "p-6 space-y-5 w-full bg-slate-50 min-h-screen"}>
            {/* Header */}
            {!embedded && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 shadow-lg">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Calculator size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Man-day Control KPI</h1>
                                <p className="text-orange-100 text-sm mt-1">ควบคุมการใช้ทรัพยากรในการพัฒนาให้เป็นไปตามแผน — Target ≥ 85%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {summary && (
                                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <div className="text-white/70 text-xs">Projects Pass</div>
                                    <div className="text-white font-bold text-lg">{passCount}/{totalProjects}</div>
                                </div>
                            )}
                            {/* View Toggle */}
                            <div className="flex bg-white/20 backdrop-blur-sm rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`p-2.5 transition-all ${viewMode === 'kanban' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white'}`}
                                    title="Kanban View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-2.5 transition-all ${viewMode === 'table' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white'}`}
                                    title="Table View"
                                >
                                    <Table2 size={18} />
                                </button>
                            </div>
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

            {/* TOP ROW: Gauge + Month Strip + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
                {/* Gauge */}
                <div className={`rounded-2xl p-4 border-2 shadow-sm text-center ${summary?.isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        ประจำ{monthLabel}
                    </p>
                    <GaugeChart value={overallKPI} size={180} />
                </div>

                {/* Right Panel */}
                <div className="flex flex-col gap-3">
                    {/* Month Status Strip */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={12} />
                                สถานะรายเดือน — ปี {yearFilter}
                            </span>
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                                className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <MonthStatusStrip trendData={trend} selectedMonth={monthFilter} onSelect={setMonthFilter} />
                    </div>

                    {/* Summary Boxes */}
                    <div className="grid grid-cols-5 gap-2.5">
                        {[
                            { label: "โปรเจกต์", value: totalProjects.toString(), accent: "border-l-indigo-500", color: "text-indigo-900" },
                            { label: "Manday รวม", value: totalManday.toLocaleString(), accent: "border-l-blue-500", color: "text-blue-900" },
                            { label: "ผ่านเกณฑ์", value: passCount.toString(), accent: "border-l-emerald-500", color: "text-emerald-900" },
                            { label: "Warning", value: kanbanData.grouped.warning.length.toString(), accent: "border-l-amber-500", color: "text-amber-900" },
                            { label: "ต่ำกว่าเป้า", value: kanbanData.grouped.below.length.toString(), accent: "border-l-rose-500", color: "text-rose-900" },
                        ].map((s, i) => (
                            <div key={i} className={`bg-white rounded-xl p-3 border border-slate-200 border-l-[3px] ${s.accent} shadow-sm`}>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                                <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* =================== KANBAN VIEW =================== */}
            {viewMode === 'kanban' && (
                <>
                    {/* Kanban Board Header */}
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <LayoutGrid size={18} className="text-orange-500" />
                            Kanban Board
                        </h2>
                        <span className="text-xs text-slate-500 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 font-medium">{monthLabel}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] text-slate-400">▲▼ = เปลี่ยนแปลงจากเดือนก่อน</span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw size={24} className="animate-spin text-orange-500 mr-3" />
                            <span className="text-slate-500">กำลังโหลด...</span>
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {(['pass', 'warning', 'below'] as const).map(k => (
                                <KanbanColumn
                                    key={k}
                                    statusKey={k}
                                    projects={kanbanData.grouped[k]}
                                    totalManday={kanbanData.colStats[k].manday}
                                    avgKpi={kanbanData.colStats[k].avgKpi}
                                    onEditProject={handleEditProject}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* =================== TABLE VIEW =================== */}
            {viewMode === 'table' && (
                <>
                    {/* Monthly Trend */}
                    {monthFilter === "all" && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <BarChart3 size={18} className="text-orange-500" />
                                แนวโน้มรายเดือน {yearFilter}
                            </h3>
                            <div className="grid grid-cols-12 gap-2">
                                {MONTHS.map((month) => {
                                    const monthData = trend.find((t: any) => t.month === month.value)
                                    const avgPercent = monthData?.avg_percent || 0
                                    const projectCount = monthData?.project_count || 0
                                    const totalPlanned = monthData?.total_planned || 0
                                    const totalActual = monthData?.total_actual || 0
                                    const hasData = projectCount > 0
                                    return (
                                        <div key={month.value} className={`rounded-lg p-2 text-center border ${hasData ? getStatusBg(avgPercent) : 'bg-slate-50 border-slate-200'}`}>
                                            <div className={`text-[10px] font-medium ${hasData ? '' : 'text-slate-400'}`}>{month.label}</div>
                                            <div className={`text-sm font-bold ${hasData ? '' : 'text-slate-300'}`}>
                                                {hasData ? `${avgPercent.toFixed(0)}%` : "-"}
                                            </div>
                                            {hasData && (
                                                <div className="text-[9px] opacity-80">
                                                    <span className="text-blue-600">{totalPlanned.toFixed(0)}</span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className={totalActual > totalPlanned ? "text-rose-600" : "text-emerald-600"}>{totalActual.toFixed(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Project Table */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FolderKanban size={18} className="text-orange-600" />
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
                                        <th className="text-center px-2 py-3 text-xs font-semibold text-slate-700 w-16">MD</th>
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
                                                <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-orange-500" />
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
                                            const planned = row.total_planned_mandays || 0
                                            const actual = row.total_actual_mandays || 0
                                            const kpi = row.manday_control_percent
                                            const projMilestones = projectMilestoneMap.get(row.project_id)

                                            return (
                                                <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${row.is_pass !== 1 ? 'bg-rose-50/30' : ''}`}>
                                                    <td className="px-3 py-2.5">
                                                        <button
                                                            onClick={() => handleEditProject(row.project_id)}
                                                            className="font-bold text-orange-700 hover:text-orange-900 hover:underline text-sm flex items-center gap-1"
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
                                                            <span className="text-blue-700">{planned.toFixed(0)}</span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className={actual > planned ? 'text-rose-600' : 'text-emerald-600'}>{actual.toFixed(0)}</span>
                                                        </div>
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
                                                        const hasPlan = msData.planned !== null && msData.planned > 0
                                                        const hasActual = msData.actual !== null
                                                        return (
                                                            <td key={ms.name} className="px-2 py-2.5">
                                                                <button
                                                                    onClick={() => handleMilestoneClick({
                                                                        projectCode: row.project_code,
                                                                        projectName: row.project_name,
                                                                        milestoneName: ms.name,
                                                                        planned: msData.planned,
                                                                        actual: msData.actual,
                                                                        weight: msData.weight,
                                                                        achievement: msData.achievement
                                                                    })}
                                                                    className="w-full flex flex-col items-center gap-0.5 cursor-pointer hover:bg-slate-100 rounded-lg p-1 transition-colors"
                                                                    title="คลิกเพื่อดูรายละเอียด"
                                                                >
                                                                    {hasPlan ? (
                                                                        <>
                                                                            <div className="text-xs font-medium">
                                                                                <span className="text-blue-700">{msData.planned?.toFixed(0)}</span>
                                                                                <span className="text-slate-400">/</span>
                                                                                <span className={hasActual && msData.actual! > msData.planned! ? 'text-rose-600' : 'text-emerald-600'}>
                                                                                    {hasActual ? msData.actual?.toFixed(0) : '-'}
                                                                                </span>
                                                                            </div>
                                                                            <span className={`text-xs font-bold ${msData.achievement >= 100 ? 'text-emerald-600' : msData.achievement >= 90 ? 'text-blue-600' : msData.achievement >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                                {msData.achievement}%
                                                                            </span>
                                                                            <div className="w-full max-w-[50px]">
                                                                                <ProgressBar value={msData.achievement} height={3} />
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-400">-</span>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        )
                                                    })}
                                                    <td className="text-center px-2 py-2.5">
                                                        <span className={`text-base font-black ${kpi >= 85 ? 'text-emerald-600' : kpi >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
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
                                {summary && data.length > 0 && (
                                    <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                        <tr>
                                            <td className="px-3 py-2.5 font-bold text-slate-700">รวม</td>
                                            <td className="px-2 py-2.5 text-sm text-slate-600">{data.length} โปรเจค</td>
                                            <td className="text-center px-2 py-2.5">
                                                <div className="text-sm font-bold">
                                                    <span className="text-blue-700">{summary.totalPlannedMandays.toFixed(0)}</span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className={summary.totalActualMandays > summary.totalPlannedMandays ? 'text-rose-600' : 'text-emerald-600'}>{summary.totalActualMandays.toFixed(0)}</span>
                                                </div>
                                            </td>
                                            <td colSpan={uniqueMilestones.length}></td>
                                            <td className="text-center px-2 py-2.5">
                                                <span className={`text-lg font-black ${overallKPI >= 85 ? 'text-emerald-600' : overallKPI >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
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
                </>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Pass (≥ 85%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Warning (70-84%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail (&lt; 70%)</span>
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
                            <Calculator className="text-orange-500" size={20} />
                            รายละเอียดการคำนวณ
                        </DialogTitle>
                    </DialogHeader>
                    {selectedMilestoneDetail && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="text-xs text-slate-500 mb-1">โครงการ</div>
                                <div className="font-bold text-orange-700">{selectedMilestoneDetail.projectCode}</div>
                                <div className="text-sm text-slate-600 line-clamp-1">{selectedMilestoneDetail.projectName}</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                <div className="text-xs text-amber-500 mb-1">Milestone</div>
                                <div className="font-semibold text-amber-700">{selectedMilestoneDetail.milestoneName}</div>
                                <div className="text-sm text-amber-600">น้ำหนัก: {selectedMilestoneDetail.weight}%</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <div className="text-xs text-blue-500 mb-1">แผน (Plan)</div>
                                    <div className="font-bold text-2xl text-blue-700">
                                        {selectedMilestoneDetail.planned !== null ? selectedMilestoneDetail.planned.toFixed(1) : '-'}
                                    </div>
                                    <div className="text-xs text-blue-500">Man-days</div>
                                </div>
                                <div className={`rounded-lg p-3 border ${selectedMilestoneDetail.actual !== null && selectedMilestoneDetail.planned !== null && selectedMilestoneDetail.actual > selectedMilestoneDetail.planned ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div className={`text-xs mb-1 ${selectedMilestoneDetail.actual !== null && selectedMilestoneDetail.planned !== null && selectedMilestoneDetail.actual > selectedMilestoneDetail.planned ? 'text-rose-500' : 'text-emerald-500'}`}>จริง (Actual)</div>
                                    <div className={`font-bold text-2xl ${selectedMilestoneDetail.actual !== null && selectedMilestoneDetail.planned !== null && selectedMilestoneDetail.actual > selectedMilestoneDetail.planned ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        {selectedMilestoneDetail.actual !== null ? selectedMilestoneDetail.actual.toFixed(1) : '-'}
                                    </div>
                                    <div className={`text-xs ${selectedMilestoneDetail.actual !== null && selectedMilestoneDetail.planned !== null && selectedMilestoneDetail.actual > selectedMilestoneDetail.planned ? 'text-rose-500' : 'text-emerald-500'}`}>Man-days</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
                                <div className="text-sm font-semibold text-slate-700 mb-3">การคำนวณคะแนน</div>
                                {selectedMilestoneDetail.planned !== null && selectedMilestoneDetail.planned > 0 && selectedMilestoneDetail.actual !== null && (
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-600">อัตราส่วน (Actual/Plan):</span>
                                        <span className={`font-bold ${(selectedMilestoneDetail.actual / selectedMilestoneDetail.planned) <= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {((selectedMilestoneDetail.actual / selectedMilestoneDetail.planned) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded p-2 mb-3">
                                    <div className={`text-sm font-medium ${getScoreExplanation(selectedMilestoneDetail.planned, selectedMilestoneDetail.actual).color}`}>
                                        {getScoreExplanation(selectedMilestoneDetail.planned, selectedMilestoneDetail.actual).label}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                    <span className="text-sm font-medium text-slate-700">คะแนนที่ได้:</span>
                                    <span className={`text-2xl font-black ${selectedMilestoneDetail.achievement >= 100 ? 'text-emerald-600' : selectedMilestoneDetail.achievement >= 90 ? 'text-blue-600' : selectedMilestoneDetail.achievement >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {selectedMilestoneDetail.achievement}%
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 border border-slate-200">
                                <div className="font-semibold mb-2">เกณฑ์ให้คะแนน:</div>
                                <div className="grid grid-cols-2 gap-1">
                                    <div className="text-emerald-600">Actual ≤ Plan</div><div className="text-right font-medium">100%</div>
                                    <div className="text-yellow-600">Actual ≤ Plan×1.1</div><div className="text-right font-medium">90%</div>
                                    <div className="text-orange-600">Actual ≤ Plan×1.2</div><div className="text-right font-medium">70%</div>
                                    <div className="text-rose-600">Actual &gt; Plan×1.2</div><div className="text-right font-medium">50%</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
