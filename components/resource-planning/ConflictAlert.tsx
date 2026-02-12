'use client'

import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResourceConflict } from '@/lib/actions/resource-planning-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ConflictAlertProps {
    conflicts: ResourceConflict[]
}

export function ConflictAlert({ conflicts }: ConflictAlertProps) {
    if (conflicts.length === 0) return null

    const formatDate = (d: string) => {
        try {
            return format(new Date(d), 'd MMM yy', { locale: th })
        } catch {
            return d
        }
    }

    return (
        <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    พบ Conflict {conflicts.length} รายการ
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {conflicts.map((c, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-red-100 text-sm">
                        <div className="font-medium text-red-800 mb-1">
                            {c.employee_name}
                            {c.employee_nickname ? ` (${c.employee_nickname})` : ''}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                                <Badge variant="outline" className="text-[10px] mb-1">{c.a_role}</Badge>
                                <div>{c.project_a_code} - {c.milestone_a_name}</div>
                                <div>{formatDate(c.a_start_date)} - {formatDate(c.a_end_date)}</div>
                            </div>
                            <div>
                                <Badge variant="outline" className="text-[10px] mb-1">{c.b_role}</Badge>
                                <div>{c.project_b_code} - {c.milestone_b_name}</div>
                                <div>{formatDate(c.b_start_date)} - {formatDate(c.b_end_date)}</div>
                            </div>
                        </div>
                        {c.overlap_days > 0 && (
                            <div className="mt-1 text-xs text-red-600 font-medium">
                                ซ้อนกัน {c.overlap_days} วัน
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
