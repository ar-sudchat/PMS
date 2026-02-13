'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { EmployeeAllocation } from '@/lib/actions/resource-planning-actions'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourceSummaryTableProps {
    allocations: EmployeeAllocation[]
}

const ROLE_BUTTONS = [
    { code: 'SA', label: 'SA', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', active: 'ring-2 ring-blue-500' },
    { code: 'BA', label: 'BA', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200', active: 'ring-2 ring-purple-500' },
    { code: 'PG', label: 'PG', color: 'bg-green-100 text-green-800 hover:bg-green-200', active: 'ring-2 ring-green-500' },
]

export function ResourceSummaryTable({ allocations }: ResourceSummaryTableProps) {
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
    const [selectedRole, setSelectedRole] = useState<string | null>(null)

    const toggleMonth = (employeeId: string, monthKey: string) => {
        const key = `${employeeId}-${monthKey}`
        setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Generate next 3 months (as requested)
    const months = useMemo(() => {
        const result = []
        const start = startOfMonth(new Date())
        for (let i = 0; i < 3; i++) {
            const date = addMonths(start, i)
            result.push({
                date,
                key: format(date, 'yyyy-MM'),
                label: format(date, 'MMM yyyy'), // e.g., Feb 2026
                fullLabel: format(date, 'MMMM yyyy', { locale: th }),
                days: eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) })
            })
        }
        return result
    }, [])

    const filteredAllocations = useMemo(() => {
        if (!selectedRole) return allocations
        return allocations.filter(a => a.position_code === selectedRole)
    }, [allocations, selectedRole])

    // Helper to calculate business days in a month
    const getBusinessDays = (days: Date[]) => days.filter(d => !isWeekend(d)).length

    // Helper to calculate MD for a specific month
    const calculateMonthMD = (assignment: EmployeeAllocation['assignments'][0], monthDays: Date[]) => {
        const start = new Date(assignment.start_date)
        const end = new Date(assignment.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        const monthStart = monthDays[0]
        const monthEnd = monthDays[monthDays.length - 1]

        // Check if assignment overlaps with month
        if (start > monthEnd || end < monthStart) return 0

        // Determine overlap range
        const overlapStart = start > monthStart ? start : monthStart
        const overlapEnd = end < monthEnd ? end : monthEnd

        let monthBusinessDays = 0
        let curr = new Date(overlapStart)
        while (curr <= overlapEnd) {
            if (!isWeekend(curr)) monthBusinessDays++
            curr.setDate(curr.getDate() + 1)
        }

        // Calculate fraction of total duration
        let totalBusinessDays = 0
        let iter = new Date(start)
        while (iter <= end) {
            if (!isWeekend(iter)) totalBusinessDays++
            iter.setDate(iter.getDate() + 1)
        }

        if (totalBusinessDays === 0) return 0

        return (monthBusinessDays / totalBusinessDays) * assignment.working_days
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
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    สรุปการจัดสรรทรัพยากร ({filteredAllocations.length} / {allocations.length} คน)
                </h2>

                {/* Role Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Filter className="h-3 w-3" /> กรองตำแหน่ง:
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedRole(null)}
                            className={cn(
                                "px-2.5 py-1 rounded text-xs font-medium transition-all",
                                !selectedRole
                                    ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-400 ring-offset-1"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            ทั้งหมด
                        </button>
                        {ROLE_BUTTONS.map(role => (
                            <button
                                key={role.code}
                                onClick={() => setSelectedRole(selectedRole === role.code ? null : role.code)}
                                className={cn(
                                    "px-2.5 py-1 rounded text-xs font-medium transition-all",
                                    role.color,
                                    selectedRole === role.code ? `ring-2 ring-offset-1 shadow-sm ${role.active}` : ""
                                )}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllocations.map((emp) => (
                    <Card key={emp.employee_id} className="overflow-hidden border-t-4 border-t-blue-500 shadow-sm transition-all hover:shadow-md">
                        <CardHeader className="pb-2 pt-4 px-4 bg-slate-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base font-bold text-blue-700">
                                        {emp.employee_name}
                                    </CardTitle>
                                    {emp.employee_nickname && (
                                        <div className="text-xs text-muted-foreground">({emp.employee_nickname})</div>
                                    )}
                                </div>
                                <Badge variant="outline" className="bg-white">
                                    {emp.position_code}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {months.map((month) => {
                                const businessDays = getBusinessDays(month.days)

                                // Calculate total MD allocated for this month
                                let monthlyMD = 0
                                const monthAssignments = emp.assignments.filter(a => {
                                    const md = calculateMonthMD(a, month.days)
                                    if (md > 0) {
                                        monthlyMD += md
                                        return true
                                    }
                                    return false
                                })

                                monthlyMD = Math.round(monthlyMD * 100) / 100
                                const utilization = Math.min(100, Math.round((monthlyMD / businessDays) * 100))
                                const isExpanded = expandedMonths[`${emp.employee_id}-${month.key}`]

                                // Determine color based on utilization
                                let progressColor = 'bg-blue-500'
                                if (utilization > 100) progressColor = 'bg-red-500'
                                else if (utilization >= 80) progressColor = 'bg-green-500'
                                else if (utilization === 0) progressColor = 'bg-slate-200'

                                return (
                                    <div key={month.key} className="border rounded-md p-3 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-sm">{month.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {monthlyMD}/{businessDays} ด.
                                            </span>
                                        </div>

                                        <div className="relative mb-2">
                                            <Progress value={utilization} className={cn("h-2", utilization > 100 && "bg-red-100")} indicatorClassName={progressColor} />
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-600 drop-shadow-sm bg-white/50 px-1 rounded-sm">
                                                    {utilization}% ({Math.round(monthlyMD)} ด.)
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-6 text-xs text-muted-foreground hover:text-primary p-0 flex items-center justify-center gap-1"
                                            onClick={() => toggleMonth(emp.employee_id, month.key)}
                                        >
                                            {isExpanded ? (
                                                <>ซ่อนรายละเอียด <ChevronUp className="h-3 w-3" /></>
                                            ) : (
                                                <>รายละเอียดโครงการ <ChevronDown className="h-3 w-3" /></>
                                            )}
                                        </Button>

                                        {isExpanded && (
                                            <div className="mt-2 text-xs space-y-2 border-t pt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                                {monthAssignments.length === 0 ? (
                                                    <div className="text-center text-muted-foreground py-1">ไม่มีข้อมูลโครงการในเดือนนี้</div>
                                                ) : (
                                                    monthAssignments.map((a, idx) => (
                                                        <div key={idx} className="flex flex-col gap-0.5 pb-1 border-b last:border-0 last:pb-0">
                                                            <div className="flex items-center justify-between font-medium">
                                                                <div className="flex flex-col min-w-0 pr-2">
                                                                    <span className="truncate text-xs font-bold text-blue-700" title={a.project_code}>
                                                                        {a.project_code}
                                                                    </span>
                                                                    <span className="truncate text-[10px] text-muted-foreground" title={a.project_name}>
                                                                        {a.project_name}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] bg-slate-100 px-1 rounded shrink-0 whitespace-nowrap">{a.milestone_name}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-muted-foreground text-[10px] mt-0.5">
                                                                <span>{a.role}</span>
                                                                <span>
                                                                    {format(new Date(a.start_date), 'd MMM')} - {format(new Date(a.end_date), 'd MMM')}
                                                                    <span className="ml-1 font-medium text-slate-600">({a.working_days} MD)</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
