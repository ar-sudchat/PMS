'use client'

import { type ProjectRow, type MilestoneForecast } from "@/lib/actions/project-onhand-actions"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Flag, FileText, AlertTriangle, Calendar } from "lucide-react"

interface ProjectRoadmapMatrixProps {
    projects: ProjectRow[]
    year: number
}

const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]

import Link from 'next/link'

export function ProjectRoadmapMatrix({ projects, year }: ProjectRoadmapMatrixProps) {
    const currentMonthIndex = new Date().getMonth()
    const isCurrentYear = new Date().getFullYear() === year

    // Helper to get milestones for a specific project & month
    const getMilestones = (project: ProjectRow, monthIndex: number) => {
        return project.milestones.filter(m => new Date(m.dueDate).getMonth() === monthIndex)
    }

    return (
        <div className="flex h-full w-full overflow-hidden text-sm">
            {/* 1. Left Sticky Column (Project Names) */}
            <div className="w-[280px] shrink-0 border-r border-slate-200 bg-white shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] z-20 flex flex-col">
                {/* Header */}
                <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 font-bold text-slate-500 text-xs tracking-wider">
                    PROJECT
                </div>
                {/* Rows */}
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-slate-100">
                        {projects.map((p) => (
                            <div key={p.projectId} className="h-20 flex flex-col justify-center px-4 hover:bg-slate-50 transition-colors group relative">
                                <div className="flex items-center justify-between mb-1">
                                    <Link
                                        href={`/pm-dashboard/control-tower?id=${p.projectId}`}
                                        className="font-bold text-slate-700 truncate max-w-[180px] hover:text-blue-600 hover:underline cursor-pointer"
                                        title={p.projectName}
                                    >
                                        {p.projectName}
                                    </Link>
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        p.healthScore > 80 ? "bg-emerald-500" : p.healthScore > 40 ? "bg-amber-500" : "bg-rose-500"
                                    )} title={`Health: ${p.healthScore}%`} />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{p.projectCode}</span>
                                    <span className="truncate max-w-[100px]">{p.pmName.split(' ')[0]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* 2. Right Scrollable Area (Matrix) */}
            <ScrollArea className="flex-1 bg-white">
                <div className="w-max min-w-full">
                    {/* Header Month Grid */}
                    <div className="flex h-10 border-b border-slate-200 sticky top-0 bg-white z-10">
                        {MONTHS.map((m, idx) => {
                            const isCurrent = isCurrentYear && idx === currentMonthIndex
                            return (
                                <div key={m} className={cn(
                                    "w-32 shrink-0 flex items-center justify-center font-bold text-xs text-slate-400 border-r border-slate-100",
                                    isCurrent ? "bg-blue-50/50 text-blue-600" : ""
                                )}>
                                    {m}
                                </div>
                            )
                        })}
                    </div>

                    {/* Matrix Rows */}
                    <div className="divide-y divide-slate-100">
                        {projects.map((p) => (
                            <div key={p.projectId} className="flex h-20 hover:bg-slate-50/50 transition-colors">
                                {MONTHS.map((_, mIdx) => {
                                    const milestones = getMilestones(p, mIdx)
                                    const isCurrent = isCurrentYear && mIdx === currentMonthIndex

                                    return (
                                        <div key={mIdx} className={cn(
                                            "w-32 shrink-0 border-r border-slate-100 relative p-2 flex items-center justify-center gap-1",
                                            isCurrent ? "bg-blue-50/20" : ""
                                        )}>
                                            {/* Milestone Cards */}
                                            {milestones.map((ms) => (
                                                <HoverCard key={ms.id}>
                                                    <HoverCardTrigger asChild>
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm cursor-pointer border transition-all duration-200 hover:scale-110 z-10",
                                                            ms.riskStatus === 'completed' ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                                                                ms.riskStatus === 'delayed' ? "bg-rose-100 border-rose-200 text-rose-700" :
                                                                    "bg-blue-100 border-blue-200 text-blue-700"
                                                        )}>
                                                            {getIconForMilestone(ms.milestoneName)}
                                                        </div>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent className="w-64 p-3 shadow-xl border-slate-200" side="top">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="font-bold text-slate-800 text-sm">{ms.milestoneName}</div>
                                                            <Badge variant={ms.riskStatus === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5">
                                                                {ms.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1 text-xs text-slate-500">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>Due: {new Date(ms.dueDate).toLocaleDateString()}</span>
                                                            </div>
                                                            {ms.forecastDate && (
                                                                <div className="flex items-center gap-2 text-slate-600">
                                                                    <span className={cn(
                                                                        "w-1.5 h-1.5 rounded-full",
                                                                        ms.riskStatus === 'delayed' ? "bg-rose-500" : "bg-emerald-500"
                                                                    )} />
                                                                    Forecast: {new Date(ms.forecastDate).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                            <div className="pt-2 border-t border-slate-100 mt-2">
                                                                <strong>Deliverables:</strong>
                                                                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                                                                    <li>Software Package</li>
                                                                    <li>UAT Report</li>
                                                                    <li>User Manual</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </HoverCardContent>
                                                </HoverCard>
                                            ))}

                                            {/* Connecting Line (Fake Logic: If prev month had MS, draw line?) 
                                                Actually, user wants "Connecting Line" for continuity. 
                                                We can just draw a dashed line across the row behind cards. 
                                            */}
                                            <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-slate-300 -z-0" />
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    )
}

function getIconForMilestone(name: string) {
    const n = name.toLowerCase()
    if (n.includes('go-live') || n.includes('live')) return <Flag className="w-4 h-4" />
    if (n.includes('sign') || n.includes('approve')) return <FileText className="w-4 h-4" />
    if (n.includes('risk') || n.includes('issue')) return <AlertTriangle className="w-4 h-4" />
    return <span className="text-[10px] font-bold">{name.substring(0, 2).toUpperCase()}</span>
}
