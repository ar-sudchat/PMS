'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, ArrowRight, History, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { MilestoneChangeLog } from '@/types/project'
import { getMilestoneChangeLogs, getProjectChangeLogs } from '@/lib/actions/milestone-note-actions'

interface MilestoneChangeLogTimelineProps {
    milestoneId?: string
    projectId?: string
}

export function MilestoneChangeLogTimeline({ milestoneId, projectId }: MilestoneChangeLogTimelineProps) {
    const [logs, setLogs] = useState<MilestoneChangeLog[]>([])
    const [loading, setLoading] = useState(true)

    const loadLogs = useCallback(async () => {
        setLoading(true)
        let res
        if (milestoneId) {
            res = await getMilestoneChangeLogs(milestoneId)
        } else if (projectId) {
            res = await getProjectChangeLogs(projectId)
        }
        if (res?.success) setLogs(res.data)
        setLoading(false)
    }, [milestoneId, projectId])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-'
        try {
            return format(new Date(dateStr), 'd MMM yyyy', { locale: th })
        } catch {
            return dateStr
        }
    }

    const formatDateTime = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'd MMM yy HH:mm', { locale: th })
        } catch {
            return dateStr
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        )
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <History className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-sm">ไม่มีประวัติการเปลี่ยนแปลง</span>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-slate-50/50">
                <History className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">ประวัติการเลื่อน Due Date</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded-full">
                    {logs.length}
                </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 pr-4 py-3">
                {/* Vertical line */}
                <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-slate-200" />

                <div className="space-y-4">
                    {logs.map((log, idx) => (
                        <div key={log.id} className="relative">
                            {/* Timeline dot */}
                            <div className={cn(
                                "absolute -left-[22px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                                idx === 0 ? "bg-amber-400 ring-2 ring-amber-100" : "bg-slate-300"
                            )}>
                                <Calendar className="w-2 h-2 text-white" />
                            </div>

                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                {/* Milestone name (when showing project-level) */}
                                {!milestoneId && log.milestone_name && (
                                    <div className="text-[11px] text-slate-400 mb-1 font-medium">
                                        {log.milestone_name}
                                    </div>
                                )}

                                {/* Date change */}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs">
                                        {formatDate(log.old_value)}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs font-medium">
                                        {formatDate(log.new_value)}
                                    </span>
                                </div>

                                {/* Reason */}
                                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border-l-2 border-amber-300">
                                    {log.reason}
                                </div>

                                {/* Meta */}
                                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                                    <span>{log.changed_by_name}</span>
                                    <span>{formatDateTime(log.changed_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
