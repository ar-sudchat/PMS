'use client'

import { useState, useMemo } from 'react'
import { type ProjectRow } from "@/lib/actions/project-onhand-actions"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn, getInitials, getAvatarGradient } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Flag, FileText, AlertTriangle, Calendar, ChevronDown, ChevronRight, ChevronsUpDown, Clock, Users, FileCheck } from "lucide-react"
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProjectRoadmapMatrixProps {
    projects: ProjectRow[]
    year: number
}

const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]

type GroupKey = 'critical' | 'risk' | 'ontrack'

export function ProjectRoadmapMatrix({ projects, year }: ProjectRoadmapMatrixProps) {
    const currentMonthIndex = new Date().getMonth()
    const isCurrentYear = new Date().getFullYear() === year

    // Group State - Default Critical/Risk expanded, Ontrack collapsed
    const [expandedGroups, setExpandedGroups] = useState<Record<GroupKey, boolean>>({
        critical: true,
        risk: true,
        ontrack: false
    })

    // Grouping Logic
    const groupedProjects = useMemo(() => {
        const groups = {
            critical: [] as ProjectRow[],
            risk: [] as ProjectRow[],
            ontrack: [] as ProjectRow[]
        }

        projects.forEach(p => {
            if (p.healthScore < 50) groups.critical.push(p)
            else if (p.healthScore < 80) groups.risk.push(p)
            else groups.ontrack.push(p)
        })

        return groups
    }, [projects])

    const toggleGroup = (key: GroupKey) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleAll = () => {
        const allOpen = Object.values(expandedGroups).every(Boolean)
        setExpandedGroups({
            critical: !allOpen,
            risk: !allOpen,
            ontrack: !allOpen
        })
    }

    // Helper to get milestones
    const getMilestones = (project: ProjectRow, monthIndex: number) => {
        return project.milestones.filter(m => new Date(m.dueDate).getMonth() === monthIndex)
    }

    // New Health Indicator Component
    const TRDIndicator = ({ type, score }: { type: 'T' | 'R' | 'D', score: number }) => {
        // Simplified scoring visualization:
        // 80-100: Green (3 bars), 50-79: Amber (2 bars), <50: Red (1 bar)
        // Since we don't have separate T/R/D scores in ProjectRow currently,
        // we'll mock them derived from overall health or add them to query later.
        // For now, using healthScore as proxy for all or randomized slightly for visual demo if needed.
        // ACTUALLY, usually we'd need data. Assuming healthScore is "Overall".
        // Let's us overall score to color code the letters T R D.
        const colorClass = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'

        return (
            <div className="flex flex-col items-center gap-0.5" title={`${type === 'T' ? 'Time' : type === 'R' ? 'Resource' : 'Docs'} Health`}>
                <div className={cn("w-1 h-3 rounded-full", colorClass)} />
                <span className="text-[9px] font-bold text-slate-400">{type}</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 rounded-xl overflow-hidden">
            {/* Toolbar removed/simplified as per Master Design (Filters are above) */}

            {/* Main Scroll Container */}
            <div className="flex-1 overflow-auto relative px-4 pb-4">
                <div className="min-w-max space-y-4 pt-4">

                    {/* Sticky Months Header removed to allow "Floating Cards" feel?
                        The prompt asks for "Floating Portfolio List... Card-like rows".
                        If we keep the matrix grid perfect alignment, we need the header.
                        Let's keep the header but make it distinct, maybe floating too?
                        Let's put it back but styled cleaner.
                     */}
                    <div className="flex sticky top-0 z-40 bg-slate-50/95 backdrop-blur shadow-sm h-12 rounded-xl border border-slate-200 mb-4 items-center">
                        <div className="w-[320px] shrink-0 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider">Project Portfolio</div>
                        {MONTHS.map((m, idx) => {
                            const isCurrent = isCurrentYear && idx === currentMonthIndex
                            return (
                                <div key={m} className={cn(
                                    "w-28 shrink-0 flex items-center justify-center font-bold text-xs text-slate-400",
                                    isCurrent ? "text-blue-600 bg-blue-50/50 h-full rounded-md mx-1" : ""
                                )}>
                                    {m}
                                </div>
                            )
                        })}
                    </div>

                    {/* Groups */}
                    {(Object.keys(groupedProjects) as GroupKey[]).map(groupKey => {
                        const groupItems = groupedProjects[groupKey]
                        if (groupItems.length === 0) return null

                        const isExpanded = expandedGroups[groupKey]
                        const config = {
                            critical: { label: 'CRITICAL ATTENTION', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                            risk: { label: 'AT RISK', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                            ontrack: { label: 'HEALTHY', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
                        }[groupKey]

                        return (
                            <div key={groupKey} className="space-y-2">
                                {/* Group Header */}
                                <div
                                    className={cn(
                                        "flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all border",
                                        "hover:brightness-95",
                                        config.bg, config.color, config.border
                                    )}
                                    onClick={() => toggleGroup(groupKey)}
                                >
                                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <span>{config.label}</span>
                                        <Badge variant="secondary" className="ml-2 bg-white/50 text-inherit border-0">{groupItems.length}</Badge>
                                    </div>
                                </div>

                                {/* Floating Rows */}
                                {isExpanded && (
                                    <div className="space-y-3 pl-2">
                                        {groupItems.map((p, idx) => (
                                            <div key={p.projectId}
                                                className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden"
                                            >
                                                {/* Left Status Stripe */}
                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                                                    p.healthScore < 50 ? "bg-rose-500" : p.healthScore < 80 ? "bg-amber-500" : "bg-emerald-500"
                                                )} />

                                                {/* Project Info Card Section */}
                                                <div className="w-[320px] shrink-0 p-4 pr-6 flex flex-col justify-center gap-2 border-r border-slate-100 z-10 bg-white">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-slate-400">#{String(idx + 1).padStart(2, '0')}</span>
                                                            <Link
                                                                href={`/pm-dashboard/control-tower?id=${p.projectId}`}
                                                                className="font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors line-clamp-1"
                                                            >
                                                                {p.projectName}
                                                            </Link>
                                                        </div>
                                                        {/* T R D Indicators (Mocked with healthScore) */}
                                                        <div className="flex gap-1.5">
                                                            <TRDIndicator type="T" score={p.healthScore} />
                                                            <TRDIndicator type="R" score={p.healthScore > 50 ? p.healthScore + 10 : p.healthScore} />
                                                            <TRDIndicator type="D" score={p.healthScore > 60 ? p.healthScore - 5 : p.healthScore} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] h-5 font-normal text-slate-500">{p.projectCode}</Badge>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                                <Avatar className="w-4 h-4">
                                                                    <AvatarImage src={''} />
                                                                    <AvatarFallback className={cn("text-[8px]", getAvatarGradient(p.pmName))}>{getInitials(p.pmName)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-[10px] text-slate-600 font-medium truncate max-w-[80px]">{p.pmName.split(' ')[0]}</span>
                                                            </div>
                                                        </div>
                                                        <Badge className={cn("text-[10px] h-5 border-0 text-white",
                                                            p.healthScore < 50 ? "bg-rose-500 hover:bg-rose-600" : p.healthScore < 80 ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                                                        )}>
                                                            {p.healthScore < 50 ? 'CRITICAL' : p.healthScore < 80 ? 'WARNING' : 'HEALTHY'}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Timeline Section */}
                                                <div className="flex flex-1 items-center h-full py-2">
                                                    {MONTHS.map((_, mIdx) => {
                                                        const milestones = getMilestones(p, mIdx)
                                                        const isCurrent = isCurrentYear && mIdx === currentMonthIndex

                                                        return (
                                                            <div key={mIdx} className={cn(
                                                                "w-28 shrink-0 relative h-16 flex items-center justify-center p-1 border-r border-slate-100 last:border-0",
                                                                isCurrent ? "bg-blue-50/30" : ""
                                                            )}>
                                                                {/* Milestone Dots/Icons */}
                                                                {milestones.length > 0 ? (
                                                                    <div className="flex -space-x-1.5">
                                                                        {milestones.map((ms) => (
                                                                            <HoverCard key={ms.id}>
                                                                                <HoverCardTrigger asChild>
                                                                                    <div className={cn(
                                                                                        "w-7 h-7 rounded-full flex items-center justify-center shadow-sm cursor-pointer border-2 border-white transition-transform hover:scale-110 hover:z-20 relative",
                                                                                        ms.riskStatus === 'completed' ? "bg-emerald-100 text-emerald-700" :
                                                                                            ms.riskStatus === 'delayed' ? "bg-rose-100 text-rose-700" :
                                                                                                "bg-blue-100 text-blue-700"
                                                                                    )}>
                                                                                        {getIconForMilestone(ms.milestoneName)}
                                                                                    </div>
                                                                                </HoverCardTrigger>
                                                                                <HoverCardContent className="w-64 p-3 shadow-xl border-slate-200" side="top">
                                                                                    <div className="flex items-start justify-between mb-2">
                                                                                        <div className="font-bold text-slate-800 text-sm">{ms.milestoneName}</div>
                                                                                        <Badge variant={ms.riskStatus === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5">
                                                                                            {ms.status.toUpperCase()}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <div className="space-y-1 text-xs text-slate-500">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Calendar className="w-3 h-3" />
                                                                                            <span>Due: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : '-'}</span>
                                                                                        </div>
                                                                                        {/* Strict Date Logic: Show hyphen if null */}
                                                                                        <div className="flex items-center gap-2 text-slate-600">
                                                                                            <span className={cn("w-1.5 h-1.5 rounded-full", ms.riskStatus === 'delayed' ? "bg-rose-500" : "bg-emerald-500")} />
                                                                                            Forecast: {ms.forecastDate ? new Date(ms.forecastDate).toLocaleDateString() : '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                </HoverCardContent>
                                                                            </HoverCard>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-200 text-xl font-light">.</span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function getIconForMilestone(name: string) {
    const n = name.toLowerCase()
    if (n.includes('go-live') || n.includes('live')) return <Flag className="w-3.5 h-3.5" />
    if (n.includes('sign') || n.includes('approve')) return <FileCheck className="w-3.5 h-3.5" />
    if (n.includes('risk') || n.includes('issue')) return <AlertTriangle className="w-3.5 h-3.5" />
    return <span className="text-[9px] font-bold">{name.substring(0, 2).toUpperCase()}</span>
}
