'use client'

import { useState, useEffect } from 'react'
import { History, CheckCircle2, XCircle, ArrowRight, UserCircle, Clock, MessageSquare, Loader2 } from 'lucide-react'
import { fetchApprovalHistory } from '@/lib/actions/approval-actions'

interface ApprovalHistoryItem {
    action_date: string
    action_type: string
    comments: string | null
    approver_name: string
    step_name: string
    step_order: number
}

interface ApprovalHistoryPanelProps {
    documentId: string
    moduleCode: string
    className?: string
}

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    APPROVE: {
        label: 'Approved',
        color: 'text-green-600',
        icon: <CheckCircle2 size={16} className="text-green-600" />
    },
    REJECT: {
        label: 'Rejected',
        color: 'text-red-600',
        icon: <XCircle size={16} className="text-red-600" />
    },
    DELEGATE: {
        label: 'Delegated',
        color: 'text-blue-600',
        icon: <ArrowRight size={16} className="text-blue-600" />
    },
    ROLLBACK: {
        label: 'Rolled Back',
        color: 'text-amber-600',
        icon: <ArrowRight size={16} className="text-amber-600 rotate-180" />
    },
    CANCEL: {
        label: 'Cancelled',
        color: 'text-slate-500',
        icon: <XCircle size={16} className="text-slate-500" />
    },
    REQUEST_INFO: {
        label: 'Info Requested',
        color: 'text-purple-600',
        icon: <MessageSquare size={16} className="text-purple-600" />
    }
}

export function ApprovalHistoryPanel({
    documentId,
    moduleCode,
    className = ''
}: ApprovalHistoryPanelProps) {
    const [history, setHistory] = useState<ApprovalHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true)
            try {
                const data = await fetchApprovalHistory(documentId, moduleCode)
                setHistory(data)
            } catch (error) {
                console.error('Error loading approval history:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (documentId && moduleCode) {
            loadHistory()
        }
    }, [documentId, moduleCode])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (isLoading) {
        return (
            <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
                <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Loading history...</span>
                </div>
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={18} />
                    <span className="text-sm">No approval history yet</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <History size={18} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Approval History</h3>
                <span className="ml-auto text-xs text-slate-400">{history.length} action(s)</span>
            </div>

            {/* Timeline */}
            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {history.map((item, index) => {
                    const config = actionConfig[item.action_type] || {
                        label: item.action_type,
                        color: 'text-slate-600',
                        icon: <Clock size={16} className="text-slate-400" />
                    }

                    return (
                        <div key={index} className="flex gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    {config.icon}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium text-sm ${config.color}`}>
                                        {config.label}
                                    </span>
                                    {item.step_name && (
                                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {item.step_name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                    <UserCircle size={12} />
                                    <span>{item.approver_name || 'Unknown'}</span>
                                    <span className="text-slate-300">|</span>
                                    <Clock size={12} />
                                    <span>{formatDate(item.action_date)}</span>
                                </div>

                                {item.comments && (
                                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border-l-2 border-slate-300">
                                        {item.comments}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
