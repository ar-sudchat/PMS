'use client'

import { useState } from 'react'
import {
    CheckCircle2,
    Truck,
    Clock,
    AlertTriangle,
    FileText,
    Share2,
    Copy,
    User,
    Building2,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectTrackingData, TrackingMilestone } from '@/lib/actions/tracking-actions'

interface ProjectTrackingClientProps {
    data: ProjectTrackingData
}

export function ProjectTrackingClient({ data }: ProjectTrackingClientProps) {
    const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
    const [copied, setCopied] = useState(false)

    const toggleMilestone = (id: string) => {
        setExpandedMilestones(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const handleShare = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback
            const input = document.createElement('input')
            input.value = url
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-500 mb-1">Project Tracking</div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                                {data.project.code}
                            </h1>
                        </div>
                        <button
                            onClick={handleShare}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                                copied
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            )}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Project Info Card */}
                <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg md:text-xl font-semibold text-slate-800 mb-2">
                            {data.project.name}
                        </h2>
                        {data.project.name_th && (
                            <p className="text-slate-500 mb-4">{data.project.name_th}</p>
                        )}

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <div>
                                    <div className="text-xs text-slate-500">Customer</div>
                                    <div className="text-sm font-medium">{data.project.customer_name}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                    <div className="text-xs text-slate-500">Project Manager</div>
                                    <div className="text-sm font-medium">{data.project.project_manager_name}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />
                                <div>
                                    <div className="text-xs text-slate-500">Current Phase</div>
                                    <div className="text-sm font-medium text-blue-600">
                                        {data.project.current_milestone_name || '-'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: data.project.status_color }}
                                />
                                <div>
                                    <div className="text-xs text-slate-500">Status</div>
                                    <div className="text-sm font-medium">{data.project.status_name}</div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 font-medium">Overall Progress</span>
                                <span className="text-blue-600 font-bold">{data.project.progress_percent}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                    style={{ width: `${data.project.progress_percent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>{data.summary.completed_milestones} of {data.summary.total_milestones} phases completed</span>
                                <span>{data.summary.verified_deliverables}/{data.summary.total_deliverables} docs verified</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tracking Timeline (Parcel Style) */}
                <div className="bg-white rounded-2xl shadow-lg border p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        Project Timeline
                    </h3>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-slate-200" />

                        {/* Milestones */}
                        <div className="space-y-6">
                            {data.milestones.map((milestone, index) => (
                                <MilestoneStep
                                    key={milestone.id}
                                    milestone={milestone}
                                    isFirst={index === 0}
                                    isLast={index === data.milestones.length - 1}
                                    isExpanded={expandedMilestones.has(milestone.id)}
                                    onToggle={() => toggleMilestone(milestone.id)}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Milestone Step Component
// ============================================

interface MilestoneStepProps {
    milestone: TrackingMilestone
    isFirst: boolean
    isLast: boolean
    isExpanded: boolean
    onToggle: () => void
    formatDate: (date?: string) => string
}

function MilestoneStep({ milestone, isExpanded, onToggle, formatDate }: MilestoneStepProps) {
    const isCompleted = milestone.status === 'completed'
    const isCurrent = milestone.is_current
    const isDelayed = milestone.is_delayed

    // Icon & Colors
    let icon = <Clock className="w-5 h-5" />
    let bgColor = 'bg-slate-300'
    let ringColor = ''
    let textColor = 'text-slate-500'

    if (isCompleted) {
        icon = <CheckCircle2 className="w-5 h-5" />
        bgColor = 'bg-emerald-500'
        textColor = 'text-emerald-700'
    } else if (isCurrent) {
        icon = <Truck className="w-5 h-5" />
        bgColor = 'bg-blue-500'
        ringColor = 'ring-4 ring-blue-200 animate-pulse'
        textColor = 'text-blue-700'
    } else if (isDelayed) {
        icon = <AlertTriangle className="w-5 h-5" />
        bgColor = 'bg-amber-500'
        textColor = 'text-amber-700'
    }

    const verifiedDeliverables = milestone.deliverables.filter(d => d.is_verified)
    const hasDeliverables = milestone.deliverables.length > 0

    return (
        <div className="relative flex gap-4">
            {/* Node */}
            <div className={cn(
                "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0",
                bgColor,
                ringColor
            )}>
                {icon}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
                <div
                    className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer",
                        isCompleted && "bg-emerald-50 border-emerald-200",
                        isCurrent && "bg-blue-50 border-blue-200 shadow-md",
                        isDelayed && "bg-amber-50 border-amber-200",
                        !isCompleted && !isCurrent && !isDelayed && "bg-slate-50 border-slate-200"
                    )}
                    onClick={hasDeliverables ? onToggle : undefined}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: milestone.color }}
                                >
                                    {milestone.code}
                                </span>
                                {isCurrent && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                        กำลังดำเนินการ
                                    </span>
                                )}
                                {isDelayed && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500 text-white">
                                        ล่าช้า
                                    </span>
                                )}
                            </div>
                            <h4 className={cn("font-semibold", textColor)}>
                                {milestone.name}
                            </h4>
                            {milestone.name_th && (
                                <p className="text-sm text-slate-500">{milestone.name_th}</p>
                            )}

                            {/* Date Info */}
                            <p className="text-xs text-slate-500 mt-2">
                                {isCompleted ? (
                                    <>✅ เสร็จเมื่อ {formatDate(milestone.completed_date)}</>
                                ) : milestone.due_date ? (
                                    <>📅 กำหนดส่ง {formatDate(milestone.due_date)}</>
                                ) : (
                                    <>⏳ รอกำหนดวันที่</>
                                )}
                            </p>
                        </div>

                        {/* Expand Button */}
                        {hasDeliverables && (
                            <button className="p-1 hover:bg-white rounded-full transition-colors">
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Verified Deliverables Preview */}
                    {!isExpanded && verifiedDeliverables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {verifiedDeliverables.slice(0, 3).map(d => (
                                <span
                                    key={d.id}
                                    className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1"
                                >
                                    <FileText className="w-3 h-3" />
                                    {d.name}
                                </span>
                            ))}
                            {verifiedDeliverables.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                                    +{verifiedDeliverables.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                    {/* Expanded Deliverables List */}
                    {isExpanded && hasDeliverables && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                Deliverables ({milestone.deliverables.length})
                            </div>
                            {milestone.deliverables.map(d => (
                                <div
                                    key={d.id}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-lg text-sm",
                                        d.is_verified ? "bg-emerald-100" : "bg-slate-100"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className={cn(
                                            "w-4 h-4",
                                            d.is_verified ? "text-emerald-600" : "text-slate-400"
                                        )} />
                                        <span className={d.is_verified ? "text-emerald-700" : "text-slate-600"}>
                                            {d.name}
                                        </span>
                                        {d.is_required && (
                                            <span className="text-xs text-red-500">*</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {d.is_verified ? (
                                            <span className="text-emerald-600 font-medium">✓ Verified</span>
                                        ) : d.submitted_date ? (
                                            <span>Submitted {formatDate(d.submitted_date)}</span>
                                        ) : (
                                            <span className="text-slate-400">Pending</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
