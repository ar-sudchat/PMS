'use client'

import { type ProjectRow, type SalesMetric } from "@/lib/actions/project-onhand-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Download, PieChart, TrendingUp, AlertCircle } from "lucide-react"

interface ExecutiveSummaryPanelProps {
    data: ProjectRow[]
    metrics: SalesMetric[]
}

const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))"
]

type DonutSegment = { label: string; value: number; color?: string }

const buildBreakdown = (
    items: ProjectRow[],
    getKey: (item: ProjectRow) => string,
    getColor?: (item: ProjectRow) => string | undefined,
    limit = 5
) => {
    const counts = new Map<string, number>()
    const colorMap = new Map<string, string>()

    for (const item of items) {
        const key = (getKey(item) || "Unknown").trim() || "Unknown"
        counts.set(key, (counts.get(key) || 0) + 1)
        if (getColor) {
            const c = getColor(item)
            if (c) colorMap.set(key, c)
        }
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((sum, [, value]) => sum + value, 0)
    const top = sorted.slice(0, limit)
    const rest = sorted.slice(limit).reduce((sum, [, value]) => sum + value, 0)

    const segments: DonutSegment[] = top.map(([label, value]) => ({
        label,
        value,
        color: colorMap.get(label)
    }))

    if (rest > 0) segments.push({ label: "Others", value: rest, color: "#94a3b8" }) // Slate-400 for Others

    return { total, segments }
}

function DonutCard({ title, segments, total }: { title: string; segments: DonutSegment[]; total: number }) {
    const radius = 34
    const circumference = 2 * Math.PI * radius
    let offset = 0

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <PieChart className="w-4 h-4" /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {total === 0 ? (
                    <div className="text-xs text-slate-400">No data available.</div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                {segments.map((segment, index) => {
                                    const value = segment.value
                                    const dash = (value / total) * circumference
                                    const currentOffset = offset
                                    offset += dash
                                    const strokeColor = segment.color || CHART_COLORS[index % CHART_COLORS.length]
                                    return (
                                        <circle
                                            key={segment.label}
                                            cx="50"
                                            cy="50"
                                            r={radius}
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth="12"
                                            strokeDasharray={`${dash} ${circumference}`}
                                            strokeDashoffset={`-${currentOffset}`}
                                        />
                                    )
                                })}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-slate-800">{total}</div>
                                    <div className="text-[10px] text-slate-400">Projects</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            {segments.map((segment, index) => {
                                const percent = total === 0 ? 0 : Math.round((segment.value / total) * 100)
                                const dotColor = segment.color || CHART_COLORS[index % CHART_COLORS.length]
                                return (
                                    <div key={segment.label} className="flex items-center justify-between text-xs text-slate-600">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            <span className="truncate max-w-[220px]" title={segment.label}>{segment.label}</span>
                                        </div>
                                        <span className="font-medium text-slate-500">{percent}%</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function ExecutiveSummaryPanel({ data, metrics }: ExecutiveSummaryPanelProps) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const element = document.getElementById('project-roadmap-snapshot')
            if (!element) return

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                backgroundColor: '#F8FAFC', // Match background
                ignoreElements: (element) => element.classList.contains('no-export')
            })

            const image = canvas.toDataURL("image/png")
            const link = document.createElement("a")
            link.href = image
            link.download = `Project_Onhand_Roadmap_${new Date().toISOString().split('T')[0]}.png`
            link.click()
        } catch (error) {
            console.error("Export failed:", error)
        } finally {
            setIsExporting(false)
        }
    }
    // Calculate Quarterly Handover
    const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }

    data.forEach(p => {
        p.milestones.forEach(m => {
            // Count "Handover" or distinct project finishing in quarter?
            // Let's count "Go-Live" or major milestones
            const month = new Date(m.dueDate).getMonth()
            if (month < 3) quarters.Q1++
            else if (month < 6) quarters.Q2++
            else if (month < 9) quarters.Q3++
            else quarters.Q4++
        })
    })

    const typeBreakdown = buildBreakdown(
        data,
        (item) => item.projectTypeCode || "Other",
        (item) => item.projectTypeColor,
        6
    )
    const customerBreakdown = buildBreakdown(
        data,
        (item) => item.customerName || "Unknown",
        undefined,
        6
    )

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Executive Summary</h3>
                <p className="text-xs text-slate-500">High-level view of 2026 delivery pipeline.</p>
            </div>

            {/* Quarterly Breakdown */}
            {/* Top 5 Projects by Mandays */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Top 5 Projects by MD
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data
                            .sort((a, b) => b.soldMandays - a.soldMandays)
                            .slice(0, 5)
                            .map((p, idx) => {
                                const uat = p.milestones.find(m => m.milestoneName?.toUpperCase().includes('UAT') || m.milestoneName?.toUpperCase().includes('ACCEPTANCE'))
                                const golive = p.milestones.find(m => (m.milestoneName?.toUpperCase().includes('GO') && m.milestoneName?.toUpperCase().includes('LIVE')) || m.milestoneName?.toUpperCase() === 'GOLIVE')

                                const uatMonth = uat && uat.dueDate ? new Date(uat.dueDate).toLocaleString('en-US', { month: 'short' }) : '-'
                                const goliveMonth = golive && golive.dueDate ? new Date(golive.dueDate).toLocaleString('en-US', { month: 'short' }) : '-'

                                return (
                                    <div key={p.projectId} className="flex items-center justify-between text-xs border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                                            <div className="font-medium text-slate-700 truncate" title={p.projectName}>
                                                {idx + 1}. {p.projectName}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{p.soldMandays} MD</span>
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: p.projectTypeColor || '#cbd5e1' }}
                                                    title={p.projectTypeCode}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] shrink-0">
                                            <div className="flex flex-col items-center w-10">
                                                <span className="text-slate-400 font-medium">UAT</span>
                                                <span className="font-bold text-amber-600">{uatMonth.toUpperCase()}</span>
                                            </div>
                                            <div className="w-[1px] h-6 bg-slate-100 mx-1" />
                                            <div className="flex flex-col items-center w-10">
                                                <span className="text-slate-400 font-medium">LIVE</span>
                                                <span className="font-bold text-emerald-600">{goliveMonth.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        {data.length === 0 && (
                            <div className="text-xs text-slate-400 text-center py-4">No projects available.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <DonutCard
                title="Onhand by Type"
                segments={typeBreakdown.segments}
                total={typeBreakdown.total}
            />

            <DonutCard
                title="Onhand by Customer"
                segments={customerBreakdown.segments}
                total={customerBreakdown.total}
            />

            {/* Portfolio Status (Mandays based) */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" /> Portfolio Progress
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(() => {
                        // Calculate Totals based on Milestone Mandays to be accurate to execution
                        // Or use Project Sold Mandays? Let's use Milestone Mandays for execution tracking.
                        // Actually, user focused on 'soldMandays' in top 5.
                        // But execution status comes from milestones.
                        // Let's sum up all milestone mandays for execution view.

                        let totalMD = 0
                        let completedMD = 0
                        let delayedMD = 0
                        let pendingMD = 0

                        data.forEach(p => {
                            p.milestones.forEach(m => {
                                const md = m.mandays || 0
                                totalMD += md
                                if (m.status === 'completed') completedMD += md
                                else if (m.riskStatus === 'delayed') delayedMD += md
                                else pendingMD += md
                            })
                        })

                        const progress = totalMD > 0 ? Math.round((completedMD / totalMD) * 100) : 0

                        return (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Overall Completion</span>
                                        <span className="font-bold text-slate-700">{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-400 text-right">
                                        {completedMD as number} / {totalMD as number} Mandays Done
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                                        <div className="text-lg font-bold text-emerald-600">{completedMD}</div>
                                        <div className="text-[10px] text-emerald-700 font-medium">Completed</div>
                                    </div>
                                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                        <div className="text-lg font-bold text-amber-600">{pendingMD}</div>
                                        <div className="text-[10px] text-amber-700 font-medium">Remaining</div>
                                    </div>
                                    <div className="bg-rose-50 p-2 rounded border border-rose-100">
                                        <div className="text-lg font-bold text-rose-600">{delayedMD}</div>
                                        <div className="text-[10px] text-rose-700 font-medium">At Risk</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </CardContent>
            </Card>

            <div className="flex-1" />

        </div>
    )
}

import { useState } from "react"
// import html2canvas from 'html2canvas' (removed)
// import { Loader2 } from "lucide-react" (removed)
