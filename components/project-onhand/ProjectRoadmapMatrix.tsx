'use client'

import { useState, useMemo, Fragment } from 'react'
import { type ProjectRow } from "@/lib/actions/project-onhand-actions"
import { cn } from "@/lib/utils"
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
import { Flag, FileCheck, AlertTriangle, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ListFilter, Check, ChevronsUpDown } from "lucide-react"

interface ProjectRoadmapMatrixProps {
    projects: ProjectRow[]
    year: number
    selectedTypes: string[]
    onProjectClick?: (projectId: string) => void
}

const ALL_MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]

export function ProjectRoadmapMatrix({ projects, year, selectedTypes, onProjectClick }: ProjectRoadmapMatrixProps) {
    const currentMonthIndex = new Date().getMonth()
    const isCurrentYear = new Date().getFullYear() === year

    const [startMonthIdx, setStartMonthIdx] = useState(() => {
        if (!isCurrentYear) return 0
        return Math.min(Math.max(0, currentMonthIndex), 8)
    })

    const [excludedProjectIds, setExcludedProjectIds] = useState<string[]>([])
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
    const [allExpanded, setAllExpanded] = useState(false)

    const visibleMonthsCount = 4
    const visibleMonthIndices = Array.from({ length: visibleMonthsCount }, (_, i) => startMonthIdx + i)
    const visibleMonths = visibleMonthIndices.map(i => ALL_MONTHS[i])

    const handleNext = () => {
        if (startMonthIdx + visibleMonthsCount < 12) setStartMonthIdx(prev => prev + 1)
    }
    const handlePrev = () => {
        if (startMonthIdx > 0) setStartMonthIdx(prev => prev - 1)
    }

    const toggleExpand = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }

    const toggleAll = () => {
        if (allExpanded) {
            setExpandedProjects(new Set())
            setAllExpanded(false)
        } else {
            setExpandedProjects(new Set(sortedProjects.map(p => p.projectId)))
            setAllExpanded(true)
        }
    }

    // Helper: get week index from date
    const getWeekIndex = (date: Date) => {
        const day = date.getDate()
        if (day <= 7) return 0
        if (day <= 14) return 1
        if (day <= 21) return 2
        return 3
    }

    // Helper to get milestones by month and week
    const getMilestones = (project: ProjectRow, monthIndex: number, weekIndex: number) => {
        return project.milestones.filter(m => {
            if (!m.dueDate) return false
            const d = new Date(m.dueDate)
            if (d.getFullYear() !== year) return false
            if (d.getMonth() !== monthIndex) return false
            return getWeekIndex(d) === weekIndex
        })
    }

    // Check if a single milestone matches a month/week
    const isMilestoneInWeek = (ms: { dueDate: Date | null | string }, monthIndex: number, weekIndex: number) => {
        if (!ms.dueDate) return false
        const d = new Date(ms.dueDate)
        if (d.getFullYear() !== year) return false
        if (d.getMonth() !== monthIndex) return false
        return getWeekIndex(d) === weekIndex
    }

    // Filter & sort
    const filteredProjects = projects.filter(p => !excludedProjectIds.includes(p.projectId) && selectedTypes.includes(p.projectTypeCode))

    const sortedProjects = useMemo(() => {
        return [...filteredProjects].sort((a, b) => {
            const typeOrder: Record<string, number> = { 'DEV': 1, 'SUP': 2, 'MA': 3 }
            const typeA = typeOrder[a.projectTypeCode?.toUpperCase()] || 99
            const typeB = typeOrder[b.projectTypeCode?.toUpperCase()] || 99
            if (typeA !== typeB) return typeA - typeB

            const hasDatesA = a.milestones.some(m =>
                (m.milestoneName?.toUpperCase().includes('UAT') ||
                    m.milestoneName?.toUpperCase().includes('ACCEPTANCE') ||
                    m.milestoneName?.toUpperCase().includes('GO') ||
                    m.milestoneName?.toUpperCase().includes('LIVE')) && m.dueDate
            )
            const hasDatesB = b.milestones.some(m =>
                (m.milestoneName?.toUpperCase().includes('UAT') ||
                    m.milestoneName?.toUpperCase().includes('ACCEPTANCE') ||
                    m.milestoneName?.toUpperCase().includes('GO') ||
                    m.milestoneName?.toUpperCase().includes('LIVE')) && m.dueDate
            )
            if (hasDatesA && !hasDatesB) return -1
            if (!hasDatesA && hasDatesB) return 1

            return a.healthScore - b.healthScore
        })
    }, [filteredProjects])

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrev} disabled={startMonthIdx === 0}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium text-slate-600 w-24 text-center">
                            {visibleMonths[0]} - {visibleMonths[visibleMonths.length - 1]}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNext} disabled={startMonthIdx + visibleMonthsCount >= 12}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-xs text-slate-500">
                        Showing {startMonthIdx + 1}-{startMonthIdx + visibleMonthsCount} of 12 Months
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={toggleAll}>
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    {allExpanded ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
                </Button>
            </div>

            <div className="flex-1 overflow-auto relative">
                <table className="w-full border-collapse">
                    <thead className="bg-slate-50 shadow-sm z-20">
                        {/* Month Header Row */}
                        <tr>
                            <th rowSpan={2} className="sticky left-0 top-0 z-30 bg-white border-b border-r border-slate-200 p-0 w-[600px] min-w-[600px] h-20 text-left align-middle shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)]">
                                <div className="grid grid-cols-[50px_1fr_80px_60px_60px] h-full">
                                    <div className="flex items-center justify-center border-r border-slate-100 h-full bg-slate-50/50">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</span>
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
                                        <div className="font-bold text-sm">{m}</div>
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
                        {sortedProjects.map((p) => {
                            const isExpanded = expandedProjects.has(p.projectId)
                            const msCount = p.milestones.length

                            return (
                                <Fragment key={p.projectId}>
                                    {/* Project Row (Parent) */}
                                    <tr className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 border-b border-r border-slate-100 w-[600px] min-w-[600px] p-0 h-14 transition-colors">
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

                                                {/* Project Name & Code with Expand Toggle */}
                                                <div className="px-2 flex items-center gap-2 overflow-hidden border-r border-slate-50 h-full relative">
                                                    {msCount > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(p.projectId)}
                                                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                    {msCount === 0 && <div className="w-5 flex-shrink-0" />}
                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{p.projectCode}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onProjectClick?.(p.projectId)}
                                                        className="font-medium text-slate-800 text-sm hover:text-blue-600 transition-colors truncate block text-left"
                                                        title={p.projectName}
                                                    >
                                                        {p.projectName}
                                                    </button>
                                                    {msCount > 0 && (
                                                        <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                            {msCount}
                                                        </span>
                                                    )}
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

                                        {/* Timeline Cells */}
                                        {visibleMonthIndices.map((mIdx) => {
                                            const isCurrentMonth = isCurrentYear && mIdx === currentMonthIndex
                                            return [0, 1, 2, 3].map(wIdx => {
                                                const milestones = getMilestones(p, mIdx, wIdx)
                                                return (
                                                    <td key={`${mIdx}-${wIdx}`} className={cn(
                                                        "h-14 px-[3px] py-2 align-middle relative border-b border-slate-100",
                                                        wIdx === 3 ? "border-r border-slate-200" : "border-r border-slate-100",
                                                        isCurrentMonth ? "bg-blue-50/5" : ""
                                                    )}>
                                                        {milestones.length > 0 && (
                                                            <div className="flex flex-col gap-[3px] h-full justify-center">
                                                                {milestones.map((ms) => (
                                                                    <HoverCard key={ms.id}>
                                                                        <HoverCardTrigger asChild>
                                                                            <div className={cn(
                                                                                "flex items-center gap-[3px] cursor-pointer group/bar",
                                                                            )}>
                                                                                <div className={cn(
                                                                                    "w-[5px] h-[5px] rounded-full flex-shrink-0 ring-2 ring-white",
                                                                                    ms.riskStatus === 'completed' ? "bg-emerald-500" :
                                                                                        ms.riskStatus === 'delayed' ? "bg-rose-500" : "bg-blue-500"
                                                                                )} />
                                                                                <div className={cn(
                                                                                    "flex-1 h-[6px] rounded-r-full transition-all group-hover/bar:h-2 group-hover/bar:shadow-sm",
                                                                                    ms.riskStatus === 'completed'
                                                                                        ? "bg-gradient-to-r from-emerald-400 to-emerald-200"
                                                                                        : ms.riskStatus === 'delayed'
                                                                                            ? "bg-gradient-to-r from-rose-400 to-rose-200"
                                                                                            : "bg-gradient-to-r from-blue-400 to-blue-200"
                                                                                )} />
                                                                            </div>
                                                                        </HoverCardTrigger>
                                                                        <HoverCardContent className="w-64 p-3 shadow-xl border-slate-200 z-50" side="top">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="font-bold text-slate-800 text-sm">{ms.milestoneName}</span>
                                                                                <Badge variant={ms.riskStatus === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
                                                                                    {ms.status.toUpperCase()}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="text-xs text-slate-500 space-y-1">
                                                                                <div>Due: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : '-'}</div>
                                                                                <div>Forecast: {ms.forecastDate ? new Date(ms.forecastDate).toLocaleDateString() : '-'}</div>
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

                                    {/* Milestone Sub-Rows (Children) */}
                                    {isExpanded && p.milestones.map((ms, msIdx) => (
                                        <tr key={`${p.projectId}-ms-${ms.id}`} className="bg-slate-50/40 border-b border-slate-50 hover:bg-slate-100/50 transition-colors">
                                            <td className="sticky left-0 z-10 bg-slate-50/40 hover:bg-slate-100/50 border-b border-r border-slate-50 w-[600px] min-w-[600px] p-0 h-10 transition-colors">
                                                <div className="grid grid-cols-[50px_1fr_80px_60px_60px] h-full">
                                                    {/* Indent spacer */}
                                                    <div className="h-full border-r border-slate-50" />

                                                    {/* Milestone Name + Status */}
                                                    <div className="pl-10 pr-3 flex items-center gap-2 overflow-hidden h-full border-r border-slate-50">
                                                        {/* Tree connector line */}
                                                        <div className="flex-shrink-0 w-3 h-full relative">
                                                            <div className={cn(
                                                                "absolute left-1.5 top-0 w-px bg-slate-200",
                                                                msIdx === p.milestones.length - 1 ? "h-1/2" : "h-full"
                                                            )} />
                                                            <div className="absolute left-1.5 top-1/2 w-2 h-px bg-slate-200" />
                                                        </div>

                                                        {/* Status dot */}
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full flex-shrink-0",
                                                            ms.riskStatus === 'completed' ? "bg-emerald-500" :
                                                                ms.riskStatus === 'delayed' ? "bg-rose-500" :
                                                                    "bg-blue-500"
                                                        )} />

                                                        {/* Milestone icon + name */}
                                                        <span className="text-[11px] text-slate-600 truncate">
                                                            {ms.milestoneName}
                                                        </span>

                                                        {ms.riskStatus === 'delayed' && (
                                                            <span className="text-[9px] text-rose-500 bg-rose-50 px-1 py-0.5 rounded flex-shrink-0">
                                                                {ms.delayDays > 0 ? `+${ms.delayDays}d` : 'overdue'}
                                                            </span>
                                                        )}
                                                        {ms.riskStatus === 'completed' && (
                                                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                        )}

                                                        {/* Note count badge */}
                                                        {((ms.noteCount || 0) > 0 || (ms.openIssueCount || 0) > 0) && (
                                                            <span className={cn(
                                                                "text-[9px] px-1 py-0.5 rounded flex-shrink-0",
                                                                (ms.openIssueCount || 0) > 0
                                                                    ? "bg-amber-50 text-amber-600"
                                                                    : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {(ms.openIssueCount || 0) > 0
                                                                    ? `${ms.openIssueCount} issue`
                                                                    : `${ms.noteCount} note`
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Manday */}
                                                    <div className="flex items-center justify-center border-r border-slate-50 h-full">
                                                        <span className="text-[10px] text-slate-400">
                                                            {ms.mandays ? `${ms.mandays} MD` : '-'}
                                                        </span>
                                                    </div>

                                                    {/* Due Date (in UAT column) */}
                                                    <div className="flex items-center justify-center border-r border-slate-50 h-full col-span-2">
                                                        <span className="text-[10px] text-slate-400">
                                                            {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Timeline cells for this milestone */}
                                            {visibleMonthIndices.map((mIdx) => {
                                                const isCurrentMonth = isCurrentYear && mIdx === currentMonthIndex
                                                return [0, 1, 2, 3].map(wIdx => {
                                                    const isInWeek = isMilestoneInWeek(ms, mIdx, wIdx)
                                                    return (
                                                        <td key={`ms-${ms.id}-${mIdx}-${wIdx}`} className={cn(
                                                            "h-10 px-[3px] py-2.5 align-middle relative border-b border-slate-50",
                                                            wIdx === 3 ? "border-r border-slate-200" : "border-r border-slate-50",
                                                            isCurrentMonth ? "bg-blue-50/5" : ""
                                                        )}>
                                                            {isInWeek && (
                                                                <div className="flex items-center gap-[3px] h-full">
                                                                    <div className={cn(
                                                                        "w-[5px] h-[5px] rounded-full flex-shrink-0 ring-2 ring-white",
                                                                        ms.riskStatus === 'completed' ? "bg-emerald-500" :
                                                                            ms.riskStatus === 'delayed' ? "bg-rose-500" : "bg-blue-500"
                                                                    )} />
                                                                    <div className={cn(
                                                                        "flex-1 h-[5px] rounded-r-full",
                                                                        ms.riskStatus === 'completed'
                                                                            ? "bg-gradient-to-r from-emerald-300 to-emerald-100"
                                                                            : ms.riskStatus === 'delayed'
                                                                                ? "bg-gradient-to-r from-rose-300 to-rose-100"
                                                                                : "bg-gradient-to-r from-blue-300 to-blue-100"
                                                                    )} />
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })
                                            })}
                                        </tr>
                                    ))}
                                </Fragment>
                            )
                        })}
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
    if (n.includes('close') && (n.includes('go-live') || n.includes('live'))) return <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500" />
    if (n.includes('go-live') || n.includes('live')) return <Flag className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
    if (n.includes('sign') || n.includes('approve')) return <FileCheck className="w-3.5 h-3.5" />
    if (n.includes('risk') || n.includes('issue')) return <AlertTriangle className="w-3.5 h-3.5" />
    return <span className="text-[10px] font-bold">{name.substring(0, 2).toUpperCase()}</span>
}
