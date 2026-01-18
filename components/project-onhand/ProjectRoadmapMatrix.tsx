'use client'

import { useState } from 'react'
import { type ProjectRow } from "@/lib/actions/project-onhand-actions"
import { cn, getInitials, getAvatarGradient } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Flag, FileCheck, AlertTriangle, Calendar, ChevronLeft, ChevronRight, ListFilter, Check } from "lucide-react"
import Link from 'next/link'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ProjectRoadmapMatrixProps {
    projects: ProjectRow[]
    year: number
    selectedTypes: string[]
}

const ALL_MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]

export function ProjectRoadmapMatrix({ projects, year, selectedTypes }: ProjectRoadmapMatrixProps) {
    const currentMonthIndex = new Date().getMonth()
    const isCurrentYear = new Date().getFullYear() === year

    // View State: Default to showing 4 months, starting from current month (or Jan if future/past year)
    const [startMonthIdx, setStartMonthIdx] = useState(() => {
        if (!isCurrentYear) return 0
        return Math.min(Math.max(0, currentMonthIndex), 8) // Cap at Sep so we show Sep, Oct, Nov, Dec
    })

    // Extract unique project types
    // const availableTypes = Array.from(new Set(projects.map(p => p.projectTypeCode))).filter(Boolean).sort()

    const [excludedProjectIds, setExcludedProjectIds] = useState<string[]>([])

    const visibleMonthsCount = 4
    const visibleMonths = ALL_MONTHS.slice(startMonthIdx, startMonthIdx + visibleMonthsCount)
    const visibleMonthIndices = Array.from({ length: visibleMonthsCount }, (_, i) => startMonthIdx + i)

    const handleNext = () => {
        if (startMonthIdx + visibleMonthsCount < 12) {
            setStartMonthIdx(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (startMonthIdx > 0) {
            setStartMonthIdx(prev => prev - 1)
        }
    }

    // Helper to get milestones by month and week
    const getMilestones = (project: ProjectRow, monthIndex: number, weekIndex: number) => {
        return project.milestones.filter(m => {
            if (!m.dueDate) return false
            const d = new Date(m.dueDate)
            if (d.getFullYear() !== year) return false
            if (d.getMonth() !== monthIndex) return false

            const day = d.getDate()
            // Map days to weeks: 1-7=W1, 8-14=W2, 15-21=W3, 22+=W4
            let w = 0
            if (day <= 7) w = 0
            else if (day <= 14) w = 1
            else if (day <= 21) w = 2
            else w = 3

            return w === weekIndex
        })
    }

    // Filter excluded projects AND by Type
    const filteredProjects = projects.filter(p => !excludedProjectIds.includes(p.projectId) && selectedTypes.includes(p.projectTypeCode))

    // 4. Sort (Type priority: DEV->SUP->MA->Other, then missing UAT/GoLive last, then Health Score)
    const sortedProjects = filteredProjects
        .sort((a, b) => {
            // Priority 1: Project Type (DEV -> SUP -> MA -> Other)
            const typeOrder: Record<string, number> = { 'DEV': 1, 'SUP': 2, 'MA': 3 }
            const typeA = typeOrder[a.projectTypeCode?.toUpperCase()] || 99
            const typeB = typeOrder[b.projectTypeCode?.toUpperCase()] || 99

            if (typeA !== typeB) return typeA - typeB

            // Priority 2: Has UAT/GoLive Date (Existing logic: valid dates first)
            const hasDatesA = a.milestones.some(m =>
                (m.milestoneName?.toUpperCase().includes('UAT') ||
                    m.milestoneName?.toUpperCase().includes('ACCEPTANCE') ||
                    m.milestoneName?.toUpperCase().includes('GO') ||
                    m.milestoneName?.toUpperCase().includes('LIVE')) &&
                m.dueDate
            )

            const hasDatesB = b.milestones.some(m =>
                (m.milestoneName?.toUpperCase().includes('UAT') ||
                    m.milestoneName?.toUpperCase().includes('ACCEPTANCE') ||
                    m.milestoneName?.toUpperCase().includes('GO') ||
                    m.milestoneName?.toUpperCase().includes('LIVE')) &&
                m.dueDate
            )

            if (hasDatesA && !hasDatesB) return -1
            if (!hasDatesA && hasDatesB) return 1

            // Priority 3: Health Score (Ascending - critical first)
            return a.healthScore - b.healthScore
        })

    const TRDIndicator = ({ type, score }: { type: 'T' | 'R' | 'D', score: number }) => {
        const colorClass = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
        return (
            <div className="flex flex-col items-center gap-0.5" title={`${type === 'T' ? 'Time' : type === 'R' ? 'Resource' : 'Docs'} Health`}>
                <div className={cn("w-1.5 h-4 rounded-full", colorClass)} />
                <span className="text-[10px] font-bold text-slate-400">{type}</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            {/* Toolbar for View Control */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    {/* Top Type Filter */}
                    {/* Top Type Filter removed from here */}

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handlePrev}
                            disabled={startMonthIdx === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium text-slate-600 w-24 text-center">
                            {visibleMonths[0]} - {visibleMonths[visibleMonths.length - 1]}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleNext}
                            disabled={startMonthIdx + visibleMonthsCount >= 12}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-xs text-slate-500">
                        Showing {startMonthIdx + 1}-{startMonthIdx + visibleMonthsCount} of 12 Months
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto relative">
                <table className="w-full border-collapse">
                    <thead className="bg-slate-50 shadow-sm z-20">
                        {/* Month Header Row */}
                        <tr>
                            <th rowSpan={2} className="sticky left-0 top-0 z-30 bg-white border-b border-r border-slate-200 p-0 w-[600px] min-w-[600px] h-20 text-left align-middle shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)]">
                                <div className="grid grid-cols-[50px_1fr_80px_60px_60px] h-full">
                                    <div className="flex items-center justify-center border-r border-slate-100 h-full bg-slate-50/50 relative group">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</span>
                                            <DropdownMenu>
                                                {/* Filter menu removed as requested */}
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-4 border-r border-slate-100 h-full">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-600 text-sm uppercase tracking-wider">Project Portfolio</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 text-slate-400 hover:text-slate-600")}
                                                >
                                                    <ListFilter className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-[300px]">
                                                    <DropdownMenuLabel>Filter Projects</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <div className="max-h-[300px] overflow-y-auto">
                                                        {projects.map(p => (
                                                            <DropdownMenuCheckboxItem
                                                                key={p.projectId}
                                                                checked={!excludedProjectIds.includes(p.projectId)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setExcludedProjectIds(prev => prev.filter(id => id !== p.projectId))
                                                                    } else {
                                                                        setExcludedProjectIds(prev => [...prev, p.projectId])
                                                                    }
                                                                }}
                                                            >
                                                                <span className="truncate text-xs">{p.projectCode} {p.projectName}</span>
                                                            </DropdownMenuCheckboxItem>
                                                        ))}
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center border-r border-slate-100 h-full bg-slate-50/50">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Manday</span>
                                    </div>
                                    <div className="flex items-center justify-center border-r border-slate-100 h-full bg-slate-50/50">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase">UAT</span>
                                    </div>
                                    <div className="flex items-center justify-center h-full bg-slate-50/50">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase">GoLive</span>
                                    </div>
                                </div>
                            </th>
                            {visibleMonthIndices.map((monthIdx) => {
                                const m = ALL_MONTHS[monthIdx]
                                const isCurrent = isCurrentYear && monthIdx === currentMonthIndex
                                return (
                                    <th key={m} colSpan={4} className={cn(
                                        "sticky top-0 z-20 border-b border-r border-slate-200 h-12 text-center relative min-w-[200px]",
                                        isCurrent ? "bg-blue-50/30" : "bg-slate-50"
                                    )}>
                                        <div className="font-bold text-sm">
                                            {m}
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                        {/* Week Header Row */}
                        <tr>
                            {visibleMonthIndices.map((monthIdx) => {
                                const m = ALL_MONTHS[monthIdx]
                                return [0, 1, 2, 3].map(weekIdx => {
                                    const isCurrentMonth = isCurrentYear && monthIdx === currentMonthIndex
                                    return (
                                        <th key={`${m}-w${weekIdx}`} className={cn(
                                            "sticky top-12 z-20 border-b border-slate-200 h-8 text-center text-xs font-normal text-slate-500 w-12 min-w-[40px]",
                                            weekIdx === 3 ? "border-r" : "border-r border-slate-100",
                                            isCurrentMonth ? "bg-blue-50/10" : "bg-slate-50"
                                        )}>
                                            {weekIdx + 1}
                                        </th>
                                    )
                                })
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Flat Project Rows */}
                        {sortedProjects.map((p, idx) => (
                            <tr key={p.projectId} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
                                {/* Left Sticky Column: Project Info */}
                                <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 w-[600px] min-w-[600px] p-0 h-14">
                                    <div className="grid grid-cols-[50px_1fr_80px_60px_60px] h-full">
                                        {/* Type */}
                                        <div className="flex items-center justify-center border-r border-slate-50 h-full bg-slate-50/30">
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                p.projectTypeCode === 'DEV' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                    p.projectTypeCode === 'SUP' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        p.projectTypeCode === 'MA' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                            "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                {p.projectTypeCode}
                                            </span>
                                        </div>

                                        {/* Project Name & Code */}
                                        <div className="px-4 flex items-center gap-3 overflow-hidden border-r border-slate-50 h-full relative">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{p.projectCode}</span>
                                                <Link
                                                    href={`/pm-dashboard/control-tower?id=${p.projectId}`}
                                                    className="font-medium text-slate-800 text-sm hover:text-blue-600 transition-colors truncate max-w-[280px] block"
                                                    title={p.projectName}
                                                >
                                                    {p.projectName}
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Manday */}
                                        <div className="flex items-center justify-center border-r border-slate-50 h-full">
                                            <span className="text-xs font-medium text-slate-600">{p.soldMandays ? `${p.soldMandays} MD` : '-'}</span>
                                        </div>

                                        {/* UAT */}
                                        <div className="flex items-center justify-center border-r border-slate-50 h-full">
                                            <span className="text-xs font-medium text-amber-600">
                                                {(() => {
                                                    const uat = p.milestones.find(m => m.milestoneName?.toUpperCase().includes('UAT') || m.milestoneName?.toUpperCase().includes('ACCEPTANCE'))
                                                    return uat && uat.dueDate ? new Date(uat.dueDate).toLocaleString('en-US', { month: 'short' }).toUpperCase() : '-'
                                                })()}
                                            </span>
                                        </div>

                                        {/* GoLive */}
                                        <div className="flex items-center justify-center h-full">
                                            <span className="text-xs font-bold text-emerald-600">
                                                {(() => {
                                                    const golive = p.milestones.find(m => (m.milestoneName?.toUpperCase().includes('GO') && m.milestoneName?.toUpperCase().includes('LIVE')) || m.milestoneName?.toUpperCase() === 'GOLIVE')
                                                    return golive && golive.dueDate ? new Date(golive.dueDate).toLocaleString('en-US', { month: 'short' }).toUpperCase() : '-'
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* Weeks Cells */}
                                {visibleMonthIndices.map((mIdx) => {
                                    const isCurrentMonth = isCurrentYear && mIdx === currentMonthIndex
                                    return [0, 1, 2, 3].map(wIdx => {
                                        const milestones = getMilestones(p, mIdx, wIdx)

                                        return (
                                            <td key={`${mIdx}-${wIdx}`} className={cn(
                                                "h-14 p-0.5 align-middle relative border-b border-slate-100",
                                                wIdx === 3 ? "border-r border-slate-200" : "border-r border-slate-100 dashed",
                                                isCurrentMonth ? "bg-blue-50/5" : ""
                                            )}>
                                                {milestones.length > 0 && (
                                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                                        {milestones.map((ms) => (
                                                            <HoverCard key={ms.id}>
                                                                <HoverCardTrigger asChild>
                                                                    <div className={cn(
                                                                        "w-6 h-6 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-transform hover:scale-110 relative",
                                                                        ms.riskStatus === 'completed' ? "bg-white text-emerald-700 hover:z-20 border border-emerald-200" :
                                                                            ms.riskStatus === 'delayed' ? "bg-white text-rose-700 hover:z-20 border border-rose-200" :
                                                                                "bg-white text-blue-700 hover:z-20 border border-blue-200"
                                                                    )}>
                                                                        {getIconForMilestone(ms.milestoneName)}
                                                                        {ms.riskStatus === 'completed' && (
                                                                            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-[1px] border border-white z-10">
                                                                                <Check className="w-2 h-2 text-white" strokeWidth={3} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </HoverCardTrigger>
                                                                <HoverCardContent className="w-72 p-4 shadow-xl border-slate-200 z-50" side="top">
                                                                    <div className="flex items-start justify-between mb-3">
                                                                        <div className="font-bold text-slate-800 text-base">{ms.milestoneName}</div>
                                                                        <Badge variant={ms.riskStatus === 'completed' ? 'secondary' : 'outline'} className="text-xs h-6 px-2">
                                                                            {ms.status.toUpperCase()}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="space-y-2 text-sm text-slate-500">
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                                            <span>Due: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : '-'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                                            <span className={cn("w-2 h-2 rounded-full", ms.riskStatus === 'delayed' ? "bg-rose-500" : "bg-emerald-500")} />
                                                                            Forecast: {ms.forecastDate ? new Date(ms.forecastDate).toLocaleDateString() : '-'}
                                                                        </div>
                                                                    </div>
                                                                </HoverCardContent>
                                                            </HoverCard>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        )
                                    })
                                })}
                            </tr>
                        ))}
                        {sortedProjects.length === 0 && (
                            <tr>
                                <td colSpan={1 + (visibleMonthsCount * 4)} className="h-48 text-center text-slate-400">
                                    No projects found matching current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function getIconForMilestone(name: string) {
    const n = name.toLowerCase()
    if (n.includes('close') && (n.includes('go-live') || n.includes('live'))) return <Flag className="w-4 h-4 text-red-500 fill-red-500" />
    if (n.includes('go-live') || n.includes('live')) return <Flag className="w-4 h-4 text-orange-500 fill-orange-500" />
    if (n.includes('sign') || n.includes('approve')) return <FileCheck className="w-4 h-4" />
    if (n.includes('risk') || n.includes('issue')) return <AlertTriangle className="w-4 h-4" />
    return <span className="text-xs font-bold">{name.substring(0, 2).toUpperCase()}</span>
}
