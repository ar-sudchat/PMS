'use client'

import { ChevronRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SemiCircularGauge, TripleHealthBar } from './SemiCircularGauge'
import { CompactActivityRings } from './ActivityRings'

interface FloatingProjectRowProps {
    index: number
    projectCode: string
    projectName: string
    customerName: string
    projectType?: string
    projectTypeColor?: string
    currentMilestone?: string
    timeScore: number | null
    resourceScore: number | null
    docsScore: number | null
    overallHealth: number
    healthStatus: 'on-track' | 'at-risk' | 'critical'
    onClick?: () => void
}

export function FloatingProjectRow({
    index,
    projectCode,
    projectName,
    customerName,
    projectType,
    projectTypeColor,
    currentMilestone,
    timeScore,
    resourceScore,
    docsScore,
    overallHealth,
    healthStatus,
    onClick
}: FloatingProjectRowProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'on-track':
                return {
                    icon: CheckCircle2,
                    label: 'ON TRACK',
                    className: 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }
            case 'at-risk':
                return {
                    icon: AlertTriangle,
                    label: 'AT RISK',
                    className: 'bg-amber-50 text-amber-600 border-amber-200'
                }
            default:
                return {
                    icon: XCircle,
                    label: 'CRITICAL',
                    className: 'bg-rose-50 text-rose-600 border-rose-200'
                }
        }
    }

    const statusConfig = getStatusConfig(healthStatus)
    const StatusIcon = statusConfig.icon

    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex items-center bg-white p-5 mb-3 rounded-2xl",
                "border border-slate-100 hover:border-indigo-300",
                "hover:shadow-md hover:shadow-indigo-100/50",
                "transition-all duration-300 cursor-pointer"
            )}
        >
            {/* Row Number */}
            <div className="w-12 shrink-0">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 font-mono text-sm font-medium group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                    {String(index).padStart(2, '0')}
                </span>
            </div>

            {/* Project Identity */}
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                        #{projectCode}
                    </span>
                    {projectType && (
                        <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                            style={{
                                backgroundColor: projectTypeColor ? `${projectTypeColor}20` : '#e0e7ff',
                                color: projectTypeColor || '#4338ca'
                            }}
                        >
                            {projectType}
                        </span>
                    )}
                </div>
                <h3 className="text-base font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                    {projectName}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                    {customerName}
                    {currentMilestone && (
                        <span className="ml-2 text-slate-300">• {currentMilestone}</span>
                    )}
                </p>
            </div>

            {/* Health Bars */}
            <div className="w-48 shrink-0 px-4">
                <TripleHealthBar
                    time={timeScore}
                    resource={resourceScore}
                    docs={docsScore}
                />
            </div>

            {/* Activity Rings (Compact) */}
            <div className="w-16 shrink-0 flex justify-center px-2">
                <CompactActivityRings
                    time={timeScore}
                    resource={resourceScore}
                    docs={docsScore}
                    size={48}
                />
            </div>

            {/* Overall Score */}
            <div className="w-24 shrink-0 flex flex-col items-center px-2">
                <SemiCircularGauge value={overallHealth} size="sm" />
            </div>

            {/* Status Badge */}
            <div className="w-24 shrink-0 flex justify-center px-2">
                <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border",
                    statusConfig.className
                )}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                </span>
            </div>

            {/* Action Button */}
            <div className="w-28 shrink-0 flex justify-end">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100">
                    View Detail <ChevronRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    )
}
