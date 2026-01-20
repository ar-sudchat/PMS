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
        <Card>
            <CardHeader>
                <CardTitle>ประวัติการดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {history.map((log) => {
                        const badge = actionBadges[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' }

                        return (
                            <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                                <div className="flex-none pt-1">
                                    <Badge className={badge.color}>{badge.label}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className="font-medium text-gray-900">{log.action_by_name}</span>
                                        <span>•</span>
                                        <span>{format(new Date(log.action_at), 'dd MMM yyyy HH:mm', { locale: th })}</span>
                                    </div>
                                    {log.comments && (
                                        <p className="text-sm bg-gray-50 p-2 rounded text-gray-600">
                                            {log.comments}
                                        </p>
                                    )}
                                    {log.from_status && log.to_status && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            {log.from_status} ➔ {log.to_status}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
