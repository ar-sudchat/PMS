'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmployeeAllocation } from '@/lib/actions/resource-planning-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users } from 'lucide-react'

interface ResourceSummaryTableProps {
    allocations: EmployeeAllocation[]
}

const ROLE_COLORS: Record<string, string> = {
    SA: 'bg-blue-100 text-blue-800',
    BA: 'bg-purple-100 text-purple-800',
    PG: 'bg-green-100 text-green-800',
}

export function ResourceSummaryTable({ allocations }: ResourceSummaryTableProps) {
    const formatDate = (d: string) => {
        try {
            return format(new Date(d), 'd MMM yy', { locale: th })
        } catch {
            return d
        }
    }

    if (allocations.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        สรุปการจัดสรรทรัพยากร
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-sm text-muted-foreground py-8">
                        ยังไม่มีการจัดสรรทรัพยากร
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    สรุปการจัดสรรทรัพยากร ({allocations.length} คน)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left py-2 px-3 font-medium">พนักงาน</th>
                                <th className="text-left py-2 px-3 font-medium">ตำแหน่ง</th>
                                <th className="text-center py-2 px-3 font-medium">รวม Working Days</th>
                                <th className="text-center py-2 px-3 font-medium">จำนวนงาน</th>
                                <th className="text-left py-2 px-3 font-medium">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map((emp) => (
                                <tr key={emp.employee_id} className="border-b hover:bg-muted/30">
                                    <td className="py-2 px-3">
                                        <div className="font-medium">{emp.employee_name}</div>
                                        {emp.employee_nickname && (
                                            <div className="text-xs text-muted-foreground">({emp.employee_nickname})</div>
                                        )}
                                    </td>
                                    <td className="py-2 px-3">
                                        <Badge variant="outline" className="text-xs">
                                            {emp.position_code}
                                        </Badge>
                                    </td>
                                    <td className="py-2 px-3 text-center font-semibold">
                                        {emp.total_working_days}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        {emp.assignments.length}
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="space-y-1">
                                            {emp.assignments.map((a, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    {a.source_type && (
                                                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                                                            a.source_type === 'PLAN'
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        }`}>
                                                            {a.source_type}
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[a.role] || 'bg-gray-100 text-gray-800'}`}>
                                                        {a.role}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {a.project_code} / {a.milestone_name}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        ({formatDate(a.start_date)} - {formatDate(a.end_date)}, {a.working_days}d)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
