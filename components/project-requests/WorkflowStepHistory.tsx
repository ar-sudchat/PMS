'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Loader2, CheckCircle, SkipForward, Play, RotateCcw } from 'lucide-react'
import { getStepHistory } from '@/lib/actions/project-request-actions'
import { cn } from '@/lib/utils'

interface StepHistoryItem {
    id: string
    request_id: string
    step_order: number
    step_code: string
    step_name: string
    action: 'STARTED' | 'COMPLETED' | 'SKIPPED' | 'REVERTED'
    notes?: string
    completed_at?: string
    completed_by?: string
    completed_by_name?: string
    created_at: string
}

interface WorkflowStepHistoryProps {
    requestId: string
}

const actionConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
    STARTED: { label: 'เริ่มต้น', icon: Play, color: 'text-blue-600 bg-blue-50' },
    COMPLETED: { label: 'เสร็จสิ้น', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    SKIPPED: { label: 'ข้าม', icon: SkipForward, color: 'text-amber-600 bg-amber-50' },
    REVERTED: { label: 'ย้อนกลับ', icon: RotateCcw, color: 'text-orange-600 bg-orange-50' },
}

export function WorkflowStepHistory({ requestId }: WorkflowStepHistoryProps) {
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<StepHistoryItem[]>([])

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true)
            try {
                const data = await getStepHistory(requestId)
                setHistory(data)
            } catch (error) {
                console.error('Failed to load step history:', error)
            } finally {
                setLoading(false)
            }
        }

        loadHistory()
    }, [requestId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 text-sm">
                ยังไม่มีประวัติการดำเนินการ
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {/* Timeline */}
            <div className="relative">
                {history.map((item, index) => {
                    const config = actionConfig[item.action] || actionConfig.STARTED
                    const Icon = config.icon
                    const isLast = index === history.length - 1

                    return (
                        <div key={item.id} className="relative flex gap-4 pb-4">
                            {/* Timeline line */}
                            {!isLast && (
                                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />
                            )}

                            {/* Icon */}
                            <div className={cn(
                                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                config.color
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-700">
                                        {item.step_name}
                                    </span>
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                        config.color
                                    )}>
                                        {config.label}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ขั้นตอน {item.step_order}
                                    </span>
                                </div>

                                {item.notes && (
                                    <div className="text-sm text-slate-500 mt-1">
                                        {item.notes}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                    {item.completed_by_name && (
                                        <span>โดย {item.completed_by_name}</span>
                                    )}
                                    <span>
                                        {format(new Date(item.completed_at || item.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
