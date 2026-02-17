'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Inbox, Clock, Send, Timer, AlertTriangle, CheckCircle, Info, ArrowRight, TrendingUp, PackageCheck, PackageX, Users } from 'lucide-react'
import {
    MktDashboardData,
    MktDashboardPipeline,
    MktDashboardInsight,
    MktDashboardCustomer,
    MktDashboardFilters,
    MktDrilldownProject,
    MktDrilldownType,
    fetchMktDrilldownProjects,
} from '@/lib/actions/mkt-tracking-actions'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

interface MktDashboardProps {
    data: MktDashboardData | null
    isLoading: boolean
    filters?: MktDashboardFilters
}

const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toLocaleString()
}

// MKT stage label/color mapping
const STAGE_MAP: Record<string, { label: string; color: string }> = {
    NEW: { label: 'ใหม่', color: '#3B82F6' },
    CONTACT: { label: 'ติดต่อนัดวันประชุม', color: '#8B5CF6' },
    ESTIMATING: { label: 'กำลังประเมิน', color: '#EAB308' },
    QUOTED: { label: 'เสนอราคาแล้ว', color: '#22C55E' },
    PRICE_SENT: { label: 'ส่งราคาให้ลูกค้าแล้ว', color: '#14B8A6' },
}

export function MktDashboard({ data, isLoading, filters }: MktDashboardProps) {
    const [drilldown, setDrilldown] = useState<{
        open: boolean
        title: string
        loading: boolean
        projects: MktDrilldownProject[]
    }>({ open: false, title: '', loading: false, projects: [] })

    const handleDrilldown = async (title: string, type: MktDrilldownType) => {
        setDrilldown({ open: true, title, loading: true, projects: [] })
        try {
            const result = await fetchMktDrilldownProjects(filters || {}, type)
            if (result.success && result.data) {
                setDrilldown(prev => ({ ...prev, loading: false, projects: result.data! }))
            } else {
                setDrilldown(prev => ({ ...prev, loading: false }))
            }
        } catch {
            setDrilldown(prev => ({ ...prev, loading: false }))
        }
    }

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Section 1: KPI Summary Cards */}
            <KpiCards data={data} onDrilldown={handleDrilldown} />

            {/* Section 2: Pipeline Flow */}
            <PipelineFlow pipeline={data.pipeline} onDrilldown={handleDrilldown} />

            {/* Section 3: Insights */}
            {data.insights.length > 0 && <InsightsPanel insights={data.insights} />}

            {/* Section 4 & 5: Charts side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatusDonut pipeline={data.pipeline} onDrilldown={handleDrilldown} />
                <CustomerDistributionChart customers={data.customerDistribution} onDrilldown={handleDrilldown} />
            </div>

            {/* Section 6: Manday by Stage */}
            <MandayByStageChart pipeline={data.pipeline} onDrilldown={handleDrilldown} />

            {/* Drilldown Dialog */}
            <DrilldownDialog
                open={drilldown.open}
                onOpenChange={(open) => setDrilldown(prev => ({ ...prev, open }))}
                title={drilldown.title}
                loading={drilldown.loading}
                projects={drilldown.projects}
            />
        </div>
    )
}

// ============================================================
// Drilldown Dialog
// ============================================================

function DrilldownDialog({
    open,
    onOpenChange,
    title,
    loading,
    projects,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    loading: boolean
    projects: MktDrilldownProject[]
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span>{title}</span>
                        {!loading && (
                            <Badge variant="secondary" className="text-xs">
                                {projects.length} โครงการ
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto -mx-6 px-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground text-sm">
                            ไม่มีข้อมูลโครงการ
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-background z-10">
                                <tr className="border-b bg-slate-50/80">
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">รหัส</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">ชื่อโครงการ</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">ลูกค้า</th>
                                    <th className="text-center py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">สถานะ</th>
                                    <th className="text-right py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Manday</th>
                                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((p, i) => {
                                    const stageInfo = STAGE_MAP[p.mkt_stage] || { label: p.mkt_stage, color: '#64748b' }
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`border-b transition-colors hover:bg-slate-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                        >
                                            <td className="py-2.5 px-3">
                                                <span className="font-mono text-xs font-medium text-blue-600">{p.project_code}</span>
                                            </td>
                                            <td className="py-2.5 px-3 max-w-[250px]">
                                                <span className="truncate block" title={p.title}>{p.title}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground">{p.client_name}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                                    style={{ backgroundColor: stageInfo.color }}
                                                >
                                                    {stageInfo.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-medium">
                                                {p.mkt_mandays > 0 ? p.mkt_mandays.toLocaleString() : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground text-xs">
                                                {p.project_owner_name || '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-slate-50/80">
                                    <td colSpan={4} className="py-2.5 px-3 font-semibold text-xs text-muted-foreground">
                                        รวม {projects.length} โครงการ
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-xs">
                                        {projects.reduce((s, p) => s + p.mkt_mandays, 0).toLocaleString()} MD
                                    </td>
                                    <td />
                                </tr>
                                <tr className="bg-blue-50/80">
                                    <td colSpan={4} className="py-2.5 px-3 font-bold text-sm text-blue-700">
                                        Manday สุทธิ
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-sm text-blue-700">
                                        {projects.reduce((s, p) => s + p.mkt_mandays, 0).toLocaleString()} MD
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ============================================================
// Clickable Number Component
// ============================================================

function ClickableNumber({
    children,
    onClick,
    className = '',
}: {
    children: React.ReactNode
    onClick: () => void
    className?: string
}) {
    return (
        <span
            onClick={onClick}
            className={`cursor-pointer hover:underline decoration-2 underline-offset-2 transition-all hover:opacity-80 ${className}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            {children}
        </span>
    )
}

// ============================================================
// KPI Summary Cards
// ============================================================

type DrilldownHandler = (title: string, type: MktDrilldownType) => void

function KpiCards({ data, onDrilldown }: { data: MktDashboardData; onDrilldown: DrilldownHandler }) {
    const cards = [
        {
            label: 'รับงานทั้งหมด',
            value: data.kpi.totalProjects,
            subtitle: `${data.kpi.totalMandays.toLocaleString()} MD`,
            icon: Inbox,
            gradientFrom: '#3B82F6',
            gradientTo: '#1D4ED8',
            drilldown: { type: 'all' as const },
            drilldownTitle: 'รับงานทั้งหมด',
        },
        {
            label: 'รอเสนอราคา',
            value: data.kpi.waitingQuote,
            icon: Clock,
            gradientFrom: '#F59E0B',
            gradientTo: '#D97706',
            drilldown: { type: 'stages' as const, stages: ['NEW', 'CONTACT', 'ESTIMATING'] },
            drilldownTitle: 'รอเสนอราคา',
        },
        {
            label: 'เสนอราคาแล้ว',
            value: `${data.kpi.quoted}`,
            subtitle: `${data.kpi.quotedPercent}%`,
            icon: Send,
            gradientFrom: '#22C55E',
            gradientTo: '#16A34A',
            drilldown: { type: 'stages' as const, stages: ['QUOTED', 'PRICE_SENT'] },
            drilldownTitle: 'เสนอราคาแล้ว',
        },
        {
            label: 'DEV รับงานแล้ว',
            value: data.kpi.devAccepted,
            icon: PackageCheck,
            gradientFrom: '#10B981',
            gradientTo: '#059669',
            drilldown: { type: 'devAccepted' as const },
            drilldownTitle: 'DEV รับงานแล้ว',
        },
        {
            label: 'DEV ยังไม่รับงาน',
            value: data.kpi.devPending,
            icon: PackageX,
            gradientFrom: '#EF4444',
            gradientTo: '#DC2626',
            isAlert: data.kpi.devPending > 0,
            drilldown: { type: 'devPending' as const },
            drilldownTitle: 'DEV ยังไม่รับงาน',
        },
        {
            label: 'เวลาเฉลี่ย (วัน)',
            value: data.kpi.avgDaysToQuote || '-',
            icon: Timer,
            gradientFrom: '#6366F1',
            gradientTo: '#4338CA',
            drilldown: null,
            drilldownTitle: '',
        },
    ]

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card) => (
                <Card key={card.label} className={`relative overflow-hidden ${card.isAlert ? 'border-red-200 ring-1 ring-red-100' : ''}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    {card.drilldown ? (
                                        <ClickableNumber
                                            onClick={() => onDrilldown(card.drilldownTitle, card.drilldown!)}
                                            className={`text-2xl font-bold ${card.isAlert ? 'text-red-600' : ''}`}
                                        >
                                            {card.value}
                                        </ClickableNumber>
                                    ) : (
                                        <p className={`text-2xl font-bold ${card.isAlert ? 'text-red-600' : ''}`}>{card.value}</p>
                                    )}
                                    {card.subtitle && (
                                        <span className="text-sm font-semibold text-green-600">{card.subtitle}</span>
                                    )}
                                </div>
                            </div>
                            <div
                                className="flex items-center justify-center h-9 w-9 rounded-lg"
                                style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
                            >
                                <card.icon className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                    <div
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{ background: `linear-gradient(90deg, ${card.gradientFrom}, ${card.gradientTo})` }}
                    />
                </Card>
            ))}
        </div>
    )
}

// ============================================================
// Pipeline Flow
// ============================================================

const PIPELINE_COLORS: Record<string, { bg: string; border: string; text: string; arrow: string }> = {
    NEW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', arrow: 'text-blue-400' },
    CONTACT: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', arrow: 'text-purple-400' },
    ESTIMATING: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', arrow: 'text-yellow-400' },
    QUOTED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', arrow: 'text-green-400' },
    PRICE_SENT: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', arrow: 'text-teal-400' },
}

function PipelineFlow({ pipeline, onDrilldown }: { pipeline: MktDashboardPipeline[]; onDrilldown: DrilldownHandler }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {pipeline.map((stage, index) => {
                        const colors = PIPELINE_COLORS[stage.stage] || PIPELINE_COLORS.NEW
                        return (
                            <div key={stage.stage} className="flex items-center gap-2 flex-shrink-0">
                                <div className={`rounded-xl border ${colors.bg} ${colors.border} px-4 py-3 min-w-[140px] text-center`}>
                                    <p className={`text-xs font-medium ${colors.text} mb-1`}>{stage.label}</p>
                                    <ClickableNumber
                                        onClick={() => onDrilldown(stage.label, { type: 'stage', stage: stage.stage })}
                                        className={`text-2xl font-bold ${colors.text}`}
                                    >
                                        {stage.count}
                                    </ClickableNumber>
                                    <p className="text-xs text-muted-foreground mt-0.5">{stage.mandays.toLocaleString()} MD</p>
                                </div>
                                {index < pipeline.length - 1 && (
                                    <ArrowRight className={`h-5 w-5 flex-shrink-0 ${colors.arrow}`} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

// ============================================================
// Insights Panel
// ============================================================

function InsightsPanel({ insights }: { insights: MktDashboardInsight[] }) {
    const iconMap = {
        warning: AlertTriangle,
        success: CheckCircle,
        info: Info,
    }
    const colorMap = {
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    }
    const iconColorMap = {
        warning: 'text-amber-500',
        success: 'text-emerald-500',
        info: 'text-blue-500',
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Insights</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {insights.map((insight, i) => {
                        const Icon = iconMap[insight.type]
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${colorMap[insight.type]}`}
                            >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${iconColorMap[insight.type]}`} />
                                <span className="text-sm">{insight.message}</span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

// ============================================================
// Status Donut Chart
// ============================================================

function StatusDonut({ pipeline, onDrilldown }: { pipeline: MktDashboardPipeline[]; onDrilldown: DrilldownHandler }) {
    const chartData = pipeline.filter(p => p.count > 0)
    const total = pipeline.reduce((sum, p) => sum + p.count, 0)

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">สัดส่วนสถานะโครงการ</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="count"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                    >
                                        {chartData.map((entry) => (
                                            <Cell key={entry.stage} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [`${value} โครงการ`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold">{total}</span>
                                <span className="text-xs text-muted-foreground">โครงการ</span>
                            </div>
                        </div>
                        {/* Legend with clickable counts */}
                        <div className="flex-1 space-y-2">
                            {pipeline.map((entry) => (
                                <div key={entry.stage} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                        <span className="text-muted-foreground">{entry.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ClickableNumber
                                            onClick={() => onDrilldown(entry.label, { type: 'stage', stage: entry.stage })}
                                            className="font-bold"
                                        >
                                            {entry.count}
                                        </ClickableNumber>
                                        <span className="text-xs text-muted-foreground w-10 text-right">
                                            {total > 0 ? `${Math.round((entry.count / total) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================
// Customer Distribution Chart
// ============================================================

function CustomerDistributionChart({ customers, onDrilldown }: { customers: MktDashboardCustomer[]; onDrilldown: DrilldownHandler }) {
    const totalProjects = customers.reduce((sum, c) => sum + c.projectCount, 0)
    const totalMandays = customers.reduce((sum, c) => sum + c.totalMandays, 0)

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    โครงการแยกตามลูกค้า
                </CardTitle>
            </CardHeader>
            <CardContent>
                {customers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
                ) : (
                    <div className="space-y-2.5">
                        {customers.map((c) => {
                            const pct = totalProjects > 0 ? (c.projectCount / totalProjects) * 100 : 0
                            return (
                                <div key={c.customerName}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                                            <span className="text-sm text-muted-foreground truncate">{c.customerName}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <ClickableNumber
                                                onClick={() => onDrilldown(`ลูกค้า: ${c.customerName}`, { type: 'customer', customerName: c.customerName })}
                                                className="text-sm font-semibold"
                                            >
                                                {c.projectCount} โครงการ
                                            </ClickableNumber>
                                            <span className="text-xs text-muted-foreground w-14 text-right">{c.totalMandays.toLocaleString()} MD</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: c.color }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        <div className="pt-2 border-t flex justify-between items-center">
                            <span className="text-sm text-muted-foreground font-medium">รวม</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold">{totalProjects} โครงการ</span>
                                <span className="text-xs text-muted-foreground w-14 text-right">{totalMandays.toLocaleString()} MD</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================
// Manday by Stage Chart (Horizontal Bar)
// ============================================================

function MandayByStageChart({ pipeline, onDrilldown }: { pipeline: MktDashboardPipeline[]; onDrilldown: DrilldownHandler }) {
    const totalMandays = pipeline.reduce((sum, p) => sum + p.mandays, 0)

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Manday แยกตามสถานะ
                </CardTitle>
            </CardHeader>
            <CardContent>
                {totalMandays === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล Manday</p>
                ) : (
                    <div className="space-y-3">
                        {pipeline.map((stage) => {
                            const pct = totalMandays > 0 ? (stage.mandays / totalMandays) * 100 : 0
                            return (
                                <div key={stage.stage}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                                            <ClickableNumber
                                                onClick={() => onDrilldown(stage.label, { type: 'stage', stage: stage.stage })}
                                                className="text-sm text-muted-foreground"
                                            >
                                                {stage.label}
                                            </ClickableNumber>
                                        </div>
                                        <span className="text-sm font-semibold">{stage.mandays.toLocaleString()} MD</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: stage.color }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        <div className="pt-2 border-t flex justify-between items-center">
                            <span className="text-sm text-muted-foreground font-medium">Manday รวม</span>
                            <span className="text-base font-bold">{totalMandays.toLocaleString()} MD</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
