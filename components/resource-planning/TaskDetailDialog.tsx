'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { getMilestoneEmployeeTasks, MilestoneEmployeeTask } from '@/lib/actions/resource-planning-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface TaskDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestoneId: string
    milestoneName: string
    employeeId: string
    employeeName: string
    projectCode: string
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

export function TaskDetailDialog({
    open,
    onOpenChange,
    milestoneId,
    milestoneName,
    employeeId,
    employeeName,
    projectCode,
}: TaskDetailDialogProps) {
    const [tasks, setTasks] = useState<MilestoneEmployeeTask[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && milestoneId && employeeId) {
            setIsLoading(true)
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

    const totalEstimated = tasks.reduce((s, t) => s + t.estimated_hours, 0)
    const totalActual = tasks.reduce((s, t) => s + t.actual_hours, 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        รายละเอียด Tasks - {projectCode} / {milestoneName}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        พนักงาน: {employeeName}
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
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 sticky top-0">
                                    <th className="text-left py-2 px-2 font-medium text-xs">#</th>
                                    <th className="text-left py-2 px-2 font-medium text-xs">Task</th>
                                    <th className="text-left py-2 px-2 font-medium text-xs">Story</th>
                                    <th className="text-center py-2 px-2 font-medium text-xs">Status</th>
                                    <th className="text-center py-2 px-2 font-medium text-xs">Start</th>
                                    <th className="text-center py-2 px-2 font-medium text-xs">Due</th>
                                    <th className="text-right py-2 px-2 font-medium text-xs">Est.Hrs</th>
                                    <th className="text-right py-2 px-2 font-medium text-xs">Act.Hrs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task, i) => (
                                    <tr key={task.id} className="border-b hover:bg-muted/30">
                                        <td className="py-1.5 px-2 text-xs text-muted-foreground">{i + 1}</td>
                                        <td className="py-1.5 px-2 text-xs max-w-[200px] truncate" title={task.title}>
                                            {task.title}
                                        </td>
                                        <td className="py-1.5 px-2 text-xs text-muted-foreground max-w-[120px] truncate" title={task.story_name}>
                                            {task.story_name}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {STATUS_LABELS[task.status] || task.status}
                                            </Badge>
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-xs text-muted-foreground">
                                            {formatDate(task.start_date)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-xs text-muted-foreground">
                                            {formatDate(task.due_date)}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-xs">
                                            {task.estimated_hours > 0 ? task.estimated_hours : '-'}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-xs font-medium">
                                            {task.actual_hours > 0 ? (
                                                <span className={task.actual_hours > task.estimated_hours && task.estimated_hours > 0 ? 'text-red-600' : 'text-emerald-700'}>
                                                    {task.actual_hours}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/30 font-semibold">
                                    <td colSpan={6} className="py-2 px-2 text-xs text-right">
                                        รวม {tasks.length} tasks
                                    </td>
                                    <td className="py-2 px-2 text-right text-xs">{totalEstimated > 0 ? totalEstimated : '-'}</td>
                                    <td className="py-2 px-2 text-right text-xs">
                                        {totalActual > 0 ? totalActual : '-'}
                                        {totalActual > 0 && (
                                            <span className="text-muted-foreground ml-1">
                                                ({Math.round((totalActual / 8) * 100) / 100} MD)
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
