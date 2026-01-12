'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MyTask } from '@/lib/actions/my-tasks-actions'
import { getTimeEntriesForTask, deleteTimeEntry, TaskTimeEntry } from '@/lib/actions/timesheet-actions'
import { getChecklistItems, toggleChecklistItem, ChecklistItem } from '@/lib/actions/checklist-actions'
import { format } from 'date-fns'
import { Calendar, Clock, CheckSquare, AlignLeft, AlertCircle, Trash2, History, ListChecks, Square, CheckSquare2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusSelect } from '@/components/tasks/TaskStatusSelect'
import { toast } from 'sonner'

interface TaskDetailModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: MyTask | null
    onLogTime: (task: MyTask) => void
    onStatusChange: (task: MyTask, status: string, reason?: string) => void
    onDataChange?: () => void  // Called when time entries are modified
}

export function TaskDetailModal({ open, onOpenChange, task, onLogTime, onStatusChange, onDataChange }: TaskDetailModalProps) {
    const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([])
    const [loadingEntries, setLoadingEntries] = useState(false)
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
    const [loadingChecklist, setLoadingChecklist] = useState(false)
    const [togglingItem, setTogglingItem] = useState<string | null>(null)

    useEffect(() => {
        if (open && task) {
            loadTimeEntries()
            loadChecklistItems()
        }
    }, [open, task])

    const loadTimeEntries = async () => {
        if (!task) return
        setLoadingEntries(true)
        try {
            const entries = await getTimeEntriesForTask(task.task_id)
            setTimeEntries(entries)
        } catch (error) {
            console.error('Failed to load time entries:', error)
        } finally {
            setLoadingEntries(false)
        }
    }

    const loadChecklistItems = async () => {
        if (!task) return
        setLoadingChecklist(true)
        try {
            const items = await getChecklistItems(task.task_id)
            setChecklistItems(items)
        } catch (error) {
            console.error('Failed to load checklist items:', error)
        } finally {
            setLoadingChecklist(false)
        }
    }

    const handleToggleChecklist = async (item: ChecklistItem) => {
        setTogglingItem(item.id)
        const newState = !item.is_completed

        // Optimistic update
        setChecklistItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, is_completed: newState } : i
        ))

        const result = await toggleChecklistItem(item.id, newState)
        if (result.success) {
            if (onDataChange) onDataChange() // Notify parent to refresh task data (for checklist_completed count)
        } else {
            // Revert on error
            setChecklistItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, is_completed: !newState } : i
            ))
            toast.error(result.error || 'ไม่สามารถอัพเดทได้')
        }
        setTogglingItem(null)
    }

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return

        const result = await deleteTimeEntry(entryId)
        if (result.success) {
            toast.success('ลบรายการสำเร็จ')
            loadTimeEntries() // Refresh list
            if (onDataChange) onDataChange()  // Notify parent to refresh task data
        } else {
            toast.error(result.error || 'ลบไม่สำเร็จ')
        }
    }

    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {task.task_code}
                        </span>
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full border uppercase font-medium",
                            task.priority === 'High' ? 'text-red-600 bg-red-50 border-red-100' :
                                task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                    'text-slate-600 bg-slate-50 border-slate-100'
                        )}>
                            {task.priority || 'Normal'}
                        </span>
                        {task.is_overdue && (
                            <span className="text-xs flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                <AlertCircle className="w-3 h-3" /> Overdue
                            </span>
                        )}
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        {task.task_title}
                    </DialogTitle>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="font-medium text-slate-700">{task.project_code}: {task.project_name}</span>
                        <span>•</span>
                        <span>{task.story_code}: {task.story_title}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.milestone_color || '#ccc' }} />
                            {task.milestone_name}
                        </span>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-slate-400" />
                                Description
                            </h4>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                                {task.task_description || 'No description provided.'}
                            </div>
                        </div>

                        {/* Acceptance Criteria */}
                        {task.acceptance_criteria && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-slate-400" />
                                    Acceptance Criteria
                                </h4>
                                <div className="bg-green-50/50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-green-100">
                                    {task.acceptance_criteria}
                                </div>
                            </div>
                        )}

                        {/* Checklist */}
                        {(checklistItems.length > 0 || loadingChecklist) && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <ListChecks className="w-4 h-4 text-emerald-500" />
                                    Checklist
                                    {checklistItems.length > 0 && (
                                        <span className={cn(
                                            "text-xs font-normal px-2 py-0.5 rounded-full",
                                            checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {checklistItems.filter(i => i.is_completed).length}/{checklistItems.length}
                                        </span>
                                    )}
                                </h4>

                                {loadingChecklist ? (
                                    <div className="text-sm text-slate-500 text-center py-4">กำลังโหลด...</div>
                                ) : (
                                    <div className="space-y-1">
                                        {checklistItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleToggleChecklist(item)}
                                                disabled={togglingItem === item.id}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                                                    item.is_completed
                                                        ? "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
                                                        : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                                                    togglingItem === item.id && "opacity-60"
                                                )}
                                            >
                                                {item.is_completed ? (
                                                    <CheckSquare2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                )}
                                                <span className={cn(
                                                    "text-sm flex-1",
                                                    item.is_completed ? "text-slate-500 line-through" : "text-slate-700"
                                                )}>
                                                    {item.title}
                                                </span>
                                                {item.is_completed && item.completed_by_name && (
                                                    <span className="text-xs text-slate-400">
                                                        {item.completed_by_name}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Progress bar */}
                                {checklistItems.length > 0 && (
                                    <div className="mt-3">
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                        ? "bg-emerald-500"
                                                        : "bg-emerald-400"
                                                )}
                                                style={{
                                                    width: `${(checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Time Log History */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-400" />
                                Time Log History
                                <span className="text-xs font-normal text-slate-500">
                                    ({timeEntries.length} รายการ)
                                </span>
                            </h4>

                            {loadingEntries ? (
                                <div className="text-sm text-slate-500 text-center py-4">กำลังโหลด...</div>
                            ) : timeEntries.length === 0 ? (
                                <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-slate-100">
                                    ยังไม่มีการบันทึกเวลา
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {timeEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-center min-w-[50px]">
                                                    <div className="text-lg font-bold text-indigo-600">{entry.hours}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase">hrs</div>
                                                </div>
                                                <div className="border-l border-slate-200 pl-3">
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {format(new Date(entry.entry_date), 'dd MMM yyyy')}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {entry.activity_type}
                                                        {entry.is_overtime && <span className="ml-1 text-amber-500">(OT)</span>}
                                                    </div>
                                                    {entry.description && (
                                                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                            {entry.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="ลบรายการ"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {task.notes && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Notes</h4>
                                <div className="text-sm text-slate-600 italic">
                                    {task.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Meta & Actions */}
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Status</label>
                                <TaskStatusSelect
                                    value={task.status}
                                    onChange={(status, reason) => onStatusChange(task, status, reason)}
                                />
                            </div>

                            {/* Dates */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/50">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Start Date
                                    </label>
                                    <div className="text-sm text-slate-700">
                                        {task.start_date ? format(new Date(task.start_date), 'dd MMM yyyy') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Due Date
                                    </label>
                                    <div className={cn("text-sm font-medium", task.is_overdue ? "text-red-600" : "text-slate-700")}>
                                        {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : '-'}
                                        {task.days_until_due <= 3 && task.days_until_due >= 0 && (
                                            <span className="text-amber-500 ml-2 text-xs">({task.days_until_due}d left)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Effort */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/50">
                                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Effort
                                </label>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Progress</span>
                                        <span className="font-semibold">{task.progress_percent}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", task.progress_percent >= 100 ? "bg-green-500" : "bg-indigo-500")}
                                            style={{ width: `${Math.min(task.progress_percent, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span>Est: {task.estimated_hours}h</span>
                                        <span>Act: {task.actual_hours}h</span>
                                    </div>
                                    {task.remaining_hours < 0 && (
                                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Over budget by {Math.abs(task.remaining_hours)}h
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        onLogTime(task)
                                    }}
                                    className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Clock className="w-4 h-4" /> Log Time
                                </button>
                            </div>

                            {/* Meta */}
                            <div className="space-y-2 pt-3 border-t border-slate-200/50">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Type</span>
                                    <span className="capitalize">{task.task_type}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Phase</span>
                                    <span className="capitalize">{task.work_phase || 'Development'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
