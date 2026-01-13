'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Briefcase, FileSignature, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { acknowledgeActivity, type ActivityItem } from '@/lib/actions/activity-actions'

interface ActivityCardProps {
    activity: ActivityItem
}

export function ActivityCard({ activity }: ActivityCardProps) {
    const router = useRouter()
    const [isAcknowledged, setIsAcknowledged] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    if (isAcknowledged) return null

    const handleAcknowledge = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsLoading(true)

        // Determine DB Type from UI Type if logic requires
        // Logic mapping:
        let dbType = 'info'
        if (activity.type === 'urgent') dbType = 'task_due'
        if (activity.type === 'approval') {
            if (activity.id.startsWith('ts-')) dbType = 'timesheet_approval'
            if (activity.id.startsWith('del-')) dbType = 'deliverable_verify'
        }
        if (activity.type === 'success') dbType = 'milestone_success'

        // Extract raw ID
        const rawId = activity.id.split('-')[1]

        const result = await acknowledgeActivity(rawId, dbType)
        if (result.success) {
            setIsAcknowledged(true)
            router.refresh()
        }
        setIsLoading(false)
    }

    const handleClick = () => {
        if (activity.link) {
            router.push(activity.link)
        }
    }

    const config = {
        urgent: {
            icon: AlertTriangle,
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            iconColor: 'text-rose-600',
            hover: 'hover:border-rose-200 hover:shadow-rose-100/50'
        },
        assignment: {
            icon: Briefcase,
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            iconColor: 'text-blue-600',
            hover: 'hover:border-blue-200 hover:shadow-blue-100/50'
        },
        approval: {
            icon: FileSignature,
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            iconColor: 'text-purple-600',
            hover: 'hover:border-purple-200 hover:shadow-purple-100/50'
        },
        success: {
            icon: CheckCircle2,
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            iconColor: 'text-emerald-600',
            hover: 'hover:border-emerald-200 hover:shadow-emerald-100/50'
        },
        info: {
            icon: Briefcase,
            bg: 'bg-slate-50',
            border: 'border-slate-100',
            iconColor: 'text-slate-600',
            hover: 'hover:border-slate-200'
        }
    }

    const style = config[activity.type] || config.info
    const Icon = style.icon

    return (
        <div
            onClick={handleClick}
            className={cn(
                "relative group flex items-start p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                style.bg,
                style.border,
                style.hover,
                "shadow-sm hover:shadow-md"
            )}
        >
            {/* Icon */}
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm",
                style.iconColor
            )}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 ml-4 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", style.iconColor)}>
                        {activity.type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                        {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1 truncate">
                    {activity.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                    {activity.description}
                </p>

                {/* Actions */}
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs hover:bg-white/50"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (activity.link) router.push(activity.link)
                        }}
                    >
                        View Detail
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs bg-white hover:bg-slate-100 text-slate-600 shadow-sm"
                        onClick={handleAcknowledge}
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : 'Acknowledge'}
                    </Button>
                </div>
            </div>

            {/* Close Button (Quick Acknowledge) */}
            <button
                onClick={handleAcknowledge}
                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-all"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
