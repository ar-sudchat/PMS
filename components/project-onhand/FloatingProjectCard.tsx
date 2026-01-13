'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { type ProjectCommitment } from "@/lib/actions/sales-actions"
import { CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react"

interface FloatingProjectCardProps {
    project: ProjectCommitment
    index: number
}

export function FloatingProjectCard({ project, index }: FloatingProjectCardProps) {
    // Determine status color based on health score or velocity
    const isHealthy = project.healthScore >= 80
    const isWarning = project.healthScore >= 50 && project.healthScore < 80
    const isCritical = project.healthScore < 50

    return (
        <div className="group relative flex items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            {/* 1. Rank / Number */}
            <div className="hidden md:flex flex-col items-center justify-center w-12 shrink-0 mr-4">
                <span className="text-2xl font-bold text-slate-200 group-hover:text-blue-200 transition-colors">
                    {String(index).padStart(2, '0')}
                </span>
            </div>

            {/* 2. Project Info */}
            <div className="flex-1 min-w-0 mr-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {project.code}
                    </span>
                    <Badge variant={project.type === 'MA' ? 'secondary' : 'default'} className="text-[10px] h-5">
                        {project.type}
                    </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Next: <span className="font-semibold text-slate-700">{project.nextMilestone}</span>
                    </div>
                    {project.forecastDate && (
                        <div className={cn("flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full",
                            isHealthy ? "bg-emerald-50 text-emerald-700" :
                                isWarning ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        )}>
                            Forecast: <span className="font-bold">{new Date(project.forecastDate).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. PM & Metrics */}
            <div className="flex items-center gap-8 shrink-0">
                {/* Velocity Ring / Health Gauge equivalent (using Progress for simplicity or Ring SVG) */}
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Confidence</span>
                        {isHealthy ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                            <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <Progress value={project.healthScore} className={cn("w-24 h-2",
                            isHealthy ? "bg-emerald-100" : isCritical ? "bg-rose-100" : "bg-amber-100"
                        )} indicatorClassName={cn(
                            isHealthy ? "bg-emerald-500" : isCritical ? "bg-rose-500" : "bg-amber-500"
                        )} />
                        <span className="text-sm font-bold w-8 text-right">{project.healthScore}%</span>
                    </div>
                </div>

                {/* PM Avatar */}
                <div className="flex flex-col items-center">
                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                        <AvatarImage src={project.pmAvatar} />
                        <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">
                            {project.pmName ? project.pmName.charAt(0) : 'PM'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium text-slate-400 mt-1 max-w-[60px] truncate">
                        {project.pmName?.split(' ')[0]}
                    </span>
                </div>
            </div>
        </div>
    )
}
