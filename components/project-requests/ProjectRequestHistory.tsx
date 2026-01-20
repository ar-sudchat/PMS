'use client'

import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProjectRequestHistoryProps {
    history: any[]
}

const actionBadges: Record<string, { label: string, color: string }> = {
    submit: { label: 'ส่งอนุมัติ', color: 'bg-yellow-100 text-yellow-700' },
    approve: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700' },
    reject: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-700' },
    revision: { label: 'ส่งแก้ไข', color: 'bg-orange-100 text-orange-700' },
    convert: { label: 'สร้าง Project', color: 'bg-blue-100 text-blue-700' },
    create: { label: 'สร้างคำขอ', color: 'bg-gray-100 text-gray-700' },
    update: { label: 'แก้ไขข้อมูล', color: 'bg-gray-100 text-gray-700' },
}

export function ProjectRequestHistory({ history }: ProjectRequestHistoryProps) {
    if (!history || history.length === 0) return null

    return (
        <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-slate-200">
            {history.map((log) => {
                const badge = actionBadges[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700' }

                return (
                    <div key={log.id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-10 top-1 h-4 w-4 rounded-full border-2 border-white ring-4 ring-slate-50 bg-slate-300 shadow-sm" />

                        <div className="flex flex-col gap-2">
                            {/* Header: User & Action */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-900">{log.action_by_name}</span>
                                    <span className="text-slate-400 text-xs">•</span>
                                    <span className="text-slate-500 text-xs">
                                        {format(new Date(log.action_at), 'dd MMM yyyy HH:mm', { locale: th })}
                                    </span>
                                </div>
                                <Badge variant="secondary" className={`${badge.color} border-0 font-normal`}>
                                    {badge.label}
                                </Badge>
                            </div>

                            {/* Status Change Info */}
                            {log.from_status && log.to_status && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-md w-fit">
                                    <span>{log.from_status}</span>
                                    <span className="text-slate-300">➜</span>
                                    <span>{log.to_status}</span>
                                </div>
                            )}

                            {/* Comment Bubble */}
                            {log.comments && (
                                <div className="relative mt-1 bg-white border border-slate-200 p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-slate-700">
                                    {log.comments}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
