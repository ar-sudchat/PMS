'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { getMilestoneEmployeeTasks, MilestoneEmployeeTask } from '@/lib/actions/resource-planning-actions'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { th } from 'date-fns/locale'

interface TaskDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestoneId: string
    milestoneName: string
    employeeId: string
    employeeName: string
    projectCode: string
    currentMonth?: Date
}

const STATUS_COLORS: Record<string, string> = {
    'todo': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'done': 'bg-green-100 text-green-800',
    'review': 'bg-purple-100 text-purple-800',
    'testing': 'bg-orange-100 text-orange-800',
    'closed': 'bg-green-100 text-green-800',
}

const STATUS_LABELS: Record<string, string> = {
    'todo': 'รอดำเนินการ',
    'in_progress': 'กำลังทำ',
    'done': 'เสร็จ',
    'review': 'รีวิว',
    'testing': 'ทดสอบ',
    'closed': 'ปิด',
}

const formatDate = (d: string | null) => {
    if (!d) return '-'
    try {
        return format(new Date(d), 'd MMM yy', { locale: th })
    } catch {
        return d
    }
}

interface MonthGroup {
    key: string
    label: string
    tasks: MilestoneEmployeeTask[]
    isCurrent: boolean
}

export function TaskDetailDialog({
    open,
    onOpenChange,
    milestoneId,
    milestoneName,
    employeeId,
    employeeName,
    projectCode,
    currentMonth,
}: TaskDetailDialogProps) {
    const [tasks, setTasks] = useState<MilestoneEmployeeTask[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (open && milestoneId && employeeId) {
            setIsLoading(true)
            setCollapsedMonths(new Set())
            getMilestoneEmployeeTasks(milestoneId, employeeId)
                .then((result) => {
                    if (result.success && result.data) {
                        setTasks(result.data)
                    } else {
                        setTasks([])
                    }
                })
                .finally(() => setIsLoading(false))
        }
    }, [open, milestoneId, employeeId])

    // Group tasks by month based on due_date
    const monthGroups = useMemo<MonthGroup[]>(() => {
        if (tasks.length === 0) return []

        const groups = new Map<string, MilestoneEmployeeTask[]>()

        tasks.forEach(task => {
            const date = task.due_date ? new Date(task.due_date) : null
            const key = date ? format(date, 'yyyy-MM') : 'no-date'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(task)
        })

        // Current month range
        const cm = currentMonth || new Date()
        const currentKey = format(cm, 'yyyy-MM')

        // Sort by key
        const sortedKeys = Array.from(groups.keys()).sort()

        return sortedKeys.map(key => {
            const isCurrent = key === currentKey
            const label = key === 'no-date'
                ? 'ไม่มีกำหนด'
                : format(new Date(key + '-01'), 'MMMM yyyy', { locale: th })
            return { key, label, tasks: groups.get(key)!, isCurrent }
        })
    }, [tasks, currentMonth])

    const totalEstimated = tasks.reduce((s, t) => s + t.estimated_hours, 0)
    const totalActual = tasks.reduce((s, t) => s + t.actual_hours, 0)

    const toggleMonth = (key: string) => {
        setCollapsedMonths(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        รายละเอียด Tasks - {projectCode} / {milestoneName}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        พนักงาน: {employeeName} • รวม {tasks.length} tasks
                    </p>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                        ไม่พบ Task
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b bg-muted/50 sticky top-0 z-10">
                                    <th className="text-left py-2 px-2 font-medium w-[25%]">Task</th>
                                    <th className="text-left py-2 px-2 font-medium w-[15%]">Story</th>
                                    <th className="text-center py-2 px-2 font-medium w-[10%]">Status</th>
                                    <th className="text-center py-2 px-2 font-medium w-[15%]">Date</th>
                                    <th className="text-right py-2 px-2 font-medium w-[10%]">MD (Act/Est)</th>
                                    <th className="text-left py-2 px-2 font-medium w-[15%]">Assigner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthGroups.map((group) => {
                                    const isCollapsed = collapsedMonths.has(group.key)
                                    const groupActual = group.tasks.reduce((s, t) => s + t.actual_hours, 0)
                                    const mandayHours = tasks[0]?.manday_hours || 7

                                    return (
                                        <Fragment key={group.key}>
                                            {/* Month header */}
                                            <tr
                                                className={`border-b cursor-pointer hover:bg-muted/40 ${group.isCurrent ? 'bg-blue-50' : 'bg-muted/20'}`}
                                                onClick={() => toggleMonth(group.key)}
                                            >
                                                <td colSpan={6} className="py-1.5 px-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {isCollapsed
                                                                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                            }
                                                            <span className={`font-semibold text-[11px] ${group.isCurrent ? 'text-blue-700' : ''}`}>
                                                                {group.label}
                                                            </span>
                                                            {group.isCurrent && (
                                                                <Badge variant="default" className="text-[9px] h-4 px-1.5">เดือนนี้</Badge>
                                                            )}
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {group.tasks.length} tasks
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-emerald-700">
                                                            {Math.round((groupActual / mandayHours) * 100) / 100} MD
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Tasks in this month */}
                                            {!isCollapsed && group.tasks.map((task) => (
                                                <tr key={task.id} className="border-b hover:bg-muted/30">
                                                    <td className="py-1.5 px-2 align-top">
                                                        <div className="font-medium truncate max-w-[200px]" title={task.title}>{task.title}</div>
                                                    </td>
                                                    <td className="py-1.5 px-2 align-top text-muted-foreground truncate max-w-[120px]" title={task.story_name}>
                                                        {task.story_name}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-center align-top">
                                                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
                                                            {STATUS_LABELS[task.status] || task.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-center align-top text-muted-foreground text-[10px]">
                                                        <div className="whitespace-nowrap">{formatDate(task.start_date)}</div>
                                                        <div className="whitespace-nowrap">{formatDate(task.due_date)}</div>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right align-top">
                                                        <div className={task.actual_hours > task.estimated_hours && task.estimated_hours > 0 ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>
                                                            {Math.round((task.actual_hours / (task.manday_hours || 7)) * 100) / 100}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            ({Math.round((task.estimated_hours / (task.manday_hours || 7)) * 100) / 100})
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 px-2 align-top text-muted-foreground truncate max-w-[120px]" title={task.assigner_name}>
                                                        {task.assigner_name}
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/30 font-semibold text-xs">
                                    <td colSpan={4} className="py-2 px-2 text-right">
                                        รวม {tasks.length} tasks
                                    </td>
                                    <td className="py-2 px-2 text-right text-emerald-700">
                                        {Math.round((totalActual / (tasks[0]?.manday_hours || 7)) * 100) / 100} MD
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

