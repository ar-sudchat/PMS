'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Check, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { SalesTaskDialog } from './SalesTaskDialog'
import {
    SalesTask, ActionTypeConfig,
    createSalesTask, updateSalesTask, completeTask, reopenTask, deleteSalesTask
} from '@/lib/actions/sales-action-log-actions'
import { toast } from 'sonner'

interface SalesTaskTabProps {
    projectId: string
    tasks: SalesTask[]
    actionTypes: ActionTypeConfig[]
    employees: { id: string; employee_code: string; first_name: string; last_name: string; nickname?: string }[]
    currentUserId: string
    onRefresh: () => void
}

const priorityStyles = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
}

const priorityLabels = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

const dueStatusStyles: Record<string, string> = {
    OVERDUE: 'text-red-600 bg-red-50',
    TODAY: 'text-blue-600 bg-blue-50',
    THIS_WEEK: 'text-amber-600 bg-amber-50',
    UPCOMING: 'text-slate-500 bg-slate-50',
    DONE: 'text-green-600 bg-green-50',
    CANCELLED: 'text-gray-400 bg-gray-50',
}

export function SalesTaskTab({ projectId, tasks, actionTypes, employees, currentUserId, onRefresh }: SalesTaskTabProps) {
    const [showDialog, setShowDialog] = useState(false)
    const [editData, setEditData] = useState<SalesTask | null>(null)

    const handleCreate = () => {
        setEditData(null)
        setShowDialog(true)
    }

    const handleEdit = (task: SalesTask) => {
        setEditData(task)
        setShowDialog(true)
    }

    const handleSave = async (data: any) => {
        if (editData) {
            return await updateSalesTask(editData.task_id, data)
        } else {
            return await createSalesTask({ ...data, projectId })
        }
    }

    const handleDialogClose = () => {
        setShowDialog(false)
        setEditData(null)
        onRefresh()
    }

    const handleComplete = async (taskId: string) => {
        const result = await completeTask(taskId)
        if (result.success) { toast.success('เสร็จสิ้น'); onRefresh() }
        else toast.error(result.error || 'เกิดข้อผิดพลาด')
    }

    const handleReopen = async (taskId: string) => {
        const result = await reopenTask(taskId)
        if (result.success) { toast.success('เปิดงานอีกครั้ง'); onRefresh() }
        else toast.error(result.error || 'เกิดข้อผิดพลาด')
    }

    const handleDelete = async (taskId: string) => {
        if (!confirm('ต้องการลบ Task นี้?')) return
        const result = await deleteSalesTask(taskId)
        if (result.success) { toast.success('ลบสำเร็จ'); onRefresh() }
        else toast.error(result.error || 'เกิดข้อผิดพลาด')
    }

    const formatDate = (dateStr: string) => {
        try { return format(new Date(dateStr), 'd MMM yyyy', { locale: th }) }
        catch { return dateStr }
    }

    const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Next Steps & Tasks</h3>
                <Button onClick={handleCreate} size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> เพิ่ม Task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p>ยังไม่มี Task</p>
                    <p className="text-sm mt-1">คลิก "เพิ่ม Task" เพื่อเพิ่มนัดหมายหรือสิ่งที่ต้องทำ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Pending tasks */}
                    {pendingTasks.map(task => (
                        <div key={task.task_id} className={`rounded-lg border p-4 bg-white ${task.due_status === 'OVERDUE' ? 'border-red-200' : 'border-gray-200'}`}>
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => handleComplete(task.task_id)}
                                    className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center flex-shrink-0 transition-colors"
                                    title="ทำเสร็จแล้ว"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityStyles[task.priority]}`}>
                                            {priorityLabels[task.priority]}
                                        </span>
                                        {task.task_type_name && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                style={{ backgroundColor: (task.task_color || '#6B7280') + '20', color: task.task_color || '#6B7280' }}>
                                                {task.task_type_name}
                                            </span>
                                        )}
                                        <span className="font-medium text-sm text-slate-800">{task.title}</span>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                                        <span className={`px-1.5 py-0.5 rounded font-medium ${dueStatusStyles[task.due_status] || ''}`}>
                                            {formatDate(task.due_date)}
                                            {task.due_time && ` ${task.due_time.slice(0, 5)}`}
                                            {task.due_status === 'OVERDUE' && ` (เลย ${Math.abs(task.days_until_due)} วัน)`}
                                        </span>
                                        {task.contact_person && (
                                            <span>ผู้ติดต่อ: {task.contact_person}</span>
                                        )}
                                        {task.assigned_to_name && (
                                            <span>มอบหมาย: {task.assigned_to_name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => handleEdit(task)}>
                                        <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDelete(task.task_id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Completed tasks */}
                    {completedTasks.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-medium text-slate-400 mb-2">เสร็จแล้ว ({completedTasks.length})</p>
                            {completedTasks.map(task => (
                                <div key={task.task_id} className="rounded-lg border border-gray-100 p-3 bg-gray-50 mb-2 opacity-70">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleReopen(task.task_id)}
                                            className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-green-600"
                                            title="เปิดงานอีกครั้ง"
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                        <span className="text-sm text-slate-500 line-through flex-1">{task.title}</span>
                                        <span className="text-xs text-slate-400">{formatDate(task.due_date)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <SalesTaskDialog
                open={showDialog}
                onClose={handleDialogClose}
                onSave={handleSave}
                actionTypes={actionTypes}
                employees={employees}
                currentUserId={currentUserId}
                editData={editData}
            />
        </div>
    )
}
