'use client'

import { useEffect, useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight, MessageSquare, Calendar, Edit, Trophy, Trash2 } from 'lucide-react'
import { MKT_STAGES } from '@/lib/constants/mkt-stages'
import { MktTrackingLog, fetchMktTrackingLogs } from '@/lib/actions/mkt-tracking-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface MktHistoryPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string | null
    projectTitle?: string
}

const actionTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    STAGE_CHANGE: {
        label: 'เปลี่ยน Stage',
        icon: <ArrowRight className="h-4 w-4" />,
        color: 'bg-blue-100 text-blue-800',
    },
    NOTE_ADDED: {
        label: 'เพิ่มหมายเหตุ',
        icon: <MessageSquare className="h-4 w-4" />,
        color: 'bg-gray-100 text-gray-800',
    },
    MEETING_SCHEDULED: {
        label: 'นัดประชุม',
        icon: <Calendar className="h-4 w-4" />,
        color: 'bg-purple-100 text-purple-800',
    },
    DETAILS_UPDATED: {
        label: 'แก้ไขข้อมูล',
        icon: <Edit className="h-4 w-4" />,
        color: 'bg-yellow-100 text-yellow-800',
    },
    CONVERTED_TO_DEV: {
        label: 'Won - เปลี่ยนเป็น DEV',
        icon: <Trophy className="h-4 w-4" />,
        color: 'bg-green-100 text-green-800',
    },
    DELETED: {
        label: 'ลบ',
        icon: <Trash2 className="h-4 w-4" />,
        color: 'bg-red-100 text-red-800',
    },
}

const getStageLabel = (code: string | null | undefined) => {
    if (!code) return '-'
    const stage = MKT_STAGES.find(s => s.code === code)
    return stage?.label || code
}

export function MktHistoryPanel({ open, onOpenChange, projectId, projectTitle }: MktHistoryPanelProps) {
    const [logs, setLogs] = useState<MktTrackingLog[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && projectId) {
            loadLogs()
        }
    }, [open, projectId])

    const loadLogs = async () => {
        if (!projectId) return
        setIsLoading(true)
        try {
            const result = await fetchMktTrackingLogs(projectId)
            if (result.success && result.data) {
                setLogs(result.data)
            }
        } catch {
            console.error('Failed to load logs')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>ประวัติการดำเนินการ</SheetTitle>
                    <SheetDescription>{projectTitle}</SheetDescription>
                </SheetHeader>

                <div className="mt-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            ยังไม่มีประวัติ
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                            <div className="space-y-6">
                                {logs.map((log) => {
                                    const config = actionTypeConfig[log.action_type] || {
                                        label: log.action_type,
                                        icon: <Edit className="h-4 w-4" />,
                                        color: 'bg-gray-100 text-gray-800',
                                    }

                                    return (
                                        <div key={log.id} className="relative pl-10">
                                            {/* Timeline dot */}
                                            <div className={`absolute left-2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center ${config.color}`}>
                                                {config.icon}
                                            </div>

                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge variant="outline" className={config.color}>
                                                        {config.label}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                </div>

                                                {log.action_type === 'STAGE_CHANGE' && (
                                                    <div className="flex items-center gap-2 text-sm my-2">
                                                        <Badge variant="secondary">{getStageLabel(log.from_stage)}</Badge>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                        <Badge variant="default">{getStageLabel(log.to_stage)}</Badge>
                                                    </div>
                                                )}

                                                {log.notes && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        {log.notes}
                                                    </p>
                                                )}

                                                <p className="text-xs text-muted-foreground mt-2">
                                                    โดย: {log.created_by_name || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
