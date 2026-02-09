'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MyTask, unassignFromTask } from '@/lib/actions/my-tasks-actions'
import { getTimeEntriesForTask, deleteTimeEntry, TaskTimeEntry } from '@/lib/actions/timesheet-actions'
import { getChecklistItems, toggleChecklistItem, ChecklistItem } from '@/lib/actions/checklist-actions'
import { getTaskAttachments, Attachment } from '@/lib/actions/attachment-actions'
import { format } from 'date-fns'
import { Calendar, Clock, CheckSquare, AlignLeft, AlertCircle, Trash2, History, ListChecks, Square, CheckSquare2, Paperclip, FileText, Image, ExternalLink, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusSelect } from '@/components/tasks/TaskStatusSelect'
import { toast } from 'sonner'

type DetailTab = 'checklist' | 'timelog' | 'attachments'

interface TaskDetailModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: MyTask | null
    activeTab?: DetailTab
    onTabChange?: (tab: DetailTab) => void
    onLogTime: (task: MyTask) => void
    onStatusChange: (task: MyTask, status: string, reason?: string) => void
    onDataChange?: () => void  // Called when time entries are modified
    refreshTrigger?: number    // When this changes, refresh internal data (time entries, checklist, etc.)
    onUnassign?: () => void   // Called after successful unassign
    canUnassign?: boolean     // Only show unassign button when viewing own tasks
}

export function TaskDetailModal({ open, onOpenChange, task, activeTab: controlledTab, onTabChange, onLogTime, onStatusChange, onDataChange, refreshTrigger, onUnassign, canUnassign = true }: TaskDetailModalProps) {
    // Use controlled tab if provided, otherwise use internal state
    const [internalTab, setInternalTab] = useState<DetailTab>('checklist')
    const activeTab = controlledTab ?? internalTab
    const setActiveTab = (tab: DetailTab) => {
        if (onTabChange) {
            onTabChange(tab)
        } else {
            setInternalTab(tab)
        }
    }
    const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([])
    const [loadingEntries, setLoadingEntries] = useState(false)
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
    const [loadingChecklist, setLoadingChecklist] = useState(false)
    const [togglingItem, setTogglingItem] = useState<string | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [loadingAttachments, setLoadingAttachments] = useState(false)

    // Unassign state
    const [isUnassigning, setIsUnassigning] = useState(false)

    useEffect(() => {
        if (open && task) {
            loadTimeEntries()
            loadChecklistItems()
            loadAttachments()
        }
    }, [open, task])

    // Refresh internal data when refreshTrigger changes (e.g., after logging time)
    // Don't show loading spinner on refresh - just silently update data
    useEffect(() => {
        if (open && task && refreshTrigger !== undefined && refreshTrigger > 0) {
            loadTimeEntries(false)  // silent refresh
            loadChecklistItems(false)  // silent refresh
        }
    }, [refreshTrigger])

    const loadTimeEntries = async (showLoading = true) => {
        if (!task) return
        if (showLoading) setLoadingEntries(true)
        try {
            const entries = await getTimeEntriesForTask(task.task_id)
            setTimeEntries(entries)
        } catch (error) {
            console.error('Failed to load time entries:', error)
        } finally {
            setLoadingEntries(false)
        }
    }

    const loadChecklistItems = async (showLoading = true) => {
        if (!task) return
        if (showLoading) setLoadingChecklist(true)
        try {
            const items = await getChecklistItems(task.task_id)
            setChecklistItems(items)
        } catch (error) {
            console.error('Failed to load checklist items:', error)
        } finally {
            setLoadingChecklist(false)
        }
    }

    const loadAttachments = async (showLoading = true) => {
        if (!task) return
        if (showLoading) setLoadingAttachments(true)
        try {
            const result = await getTaskAttachments(task.task_id)
            if (result.success) {
                setAttachments(result.data)
            }
        } catch (error) {
            console.error('Failed to load attachments:', error)
        } finally {
            setLoadingAttachments(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
        return <FileText className="w-4 h-4 text-slate-500" />
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

    const handleUnassign = async () => {
        if (!task) return
        if (!confirm('ต้องการถอนออกจาก Task นี้ใช่ไหม?\n\nTask จะถูกส่งกลับเพื่อมอบหมายใหม่')) return

        setIsUnassigning(true)
        try {
            const result = await unassignFromTask(task.task_id, 'ถอนออกจาก Task')
            if (result.success) {
                toast.success('ถอนออกจาก Task สำเร็จ')
                onOpenChange(false) // Close detail modal
                if (onUnassign) onUnassign()
                if (onDataChange) onDataChange()
            } else {
                toast.error(result.error || 'ไม่สามารถถอนตัวได้')
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsUnassigning(false)
        }
    }

    if (!task) return null

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center gap-3 mb-1">
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
                    <DialogTitle className="text-lg font-bold text-slate-900">
                        {task.task_title}
                    </DialogTitle>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
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

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 min-h-0 overflow-hidden">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 flex flex-col min-h-0 overflow-hidden">
                        {/* Description - 3 lines */}
                        <div className="flex-shrink-0 mb-3">
                            <h4 className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                <AlignLeft className="w-3.5 h-3.5" />
                                Description
                            </h4>
                            <div className="bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-slate-100 min-h-[4.5rem] max-h-24 overflow-y-auto">
                                {task.task_description || 'No description provided.'}
                            </div>
                        </div>

                        {/* Acceptance Criteria - compact */}
                        {task.acceptance_criteria && (
                            <div className="flex-shrink-0 mb-3">
                                <h4 className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Acceptance Criteria
                                </h4>
                                <div className="bg-green-50/50 px-3 py-2 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-green-100 max-h-20 overflow-y-auto">
                                    {task.acceptance_criteria}
                                </div>
                            </div>
                        )}

                        {/* Notes - compact */}
                        {task.notes && (
                            <div className="flex-shrink-0 mb-3">
                                <h4 className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Notes</h4>
                                <div className="text-sm text-slate-600 italic bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-100 max-h-16 overflow-y-auto">
                                    {task.notes}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex-shrink-0 border-b border-slate-200">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setActiveTab('checklist')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                        activeTab === 'checklist'
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <ListChecks className="w-4 h-4" />
                                    Checklist
                                    {checklistItems.length > 0 && (
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded-full",
                                            activeTab === 'checklist'
                                                ? checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-emerald-100 text-emerald-600"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {checklistItems.filter(i => i.is_completed).length}/{checklistItems.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('timelog')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                        activeTab === 'timelog'
                                            ? "border-indigo-500 text-indigo-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <History className="w-4 h-4" />
                                    Time Log
                                    {timeEntries.length > 0 && (
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded-full",
                                            activeTab === 'timelog'
                                                ? "bg-indigo-100 text-indigo-600"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {timeEntries.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('attachments')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                        activeTab === 'attachments'
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <Paperclip className="w-4 h-4" />
                                    Attachments
                                    {attachments.length > 0 && (
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded-full",
                                            activeTab === 'attachments'
                                                ? "bg-blue-100 text-blue-600"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {attachments.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Tab Content - flex-grow to fill available space */}
                        <div className="flex-1 min-h-0 overflow-hidden mt-3">
                            {/* Checklist Tab */}
                            {activeTab === 'checklist' && (
                                <div className="h-full flex flex-col">
                                    {loadingChecklist ? (
                                        <div className="text-sm text-slate-500 text-center py-8">กำลังโหลด...</div>
                                    ) : checklistItems.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                                            <ListChecks className="w-10 h-10 text-slate-300 mb-2" />
                                            ไม่มี Checklist สำหรับ Task นี้
                                        </div>
                                    ) : (
                                        <>
                                            {/* Progress bar - compact */}
                                            <div className="flex-shrink-0 mb-3">
                                                <div className="flex items-center justify-between text-xs mb-1.5">
                                                    <span className="text-slate-600">Progress</span>
                                                    <span className={cn(
                                                        "font-semibold",
                                                        checklistItems.filter(i => i.is_completed).length === checklistItems.length
                                                            ? "text-emerald-600"
                                                            : "text-slate-600"
                                                    )}>
                                                        {Math.round((checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100)}%
                                                    </span>
                                                </div>
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

                                            {/* Checklist Items - expand to fill */}
                                            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                                                {checklistItems.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleToggleChecklist(item)}
                                                        disabled={togglingItem === item.id}
                                                        className={cn(
                                                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left",
                                                            item.is_completed
                                                                ? "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
                                                                : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                                                            togglingItem === item.id && "opacity-60"
                                                        )}
                                                    >
                                                        {item.is_completed ? (
                                                            <CheckSquare2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
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
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Time Log Tab */}
                            {activeTab === 'timelog' && (
                                <div className="h-full flex flex-col">
                                    {loadingEntries ? (
                                        <div className="text-sm text-slate-500 text-center py-8">กำลังโหลด...</div>
                                    ) : timeEntries.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                                            <History className="w-10 h-10 text-slate-300 mb-2" />
                                            ยังไม่มีการบันทึกเวลา
                                        </div>
                                    ) : (
                                        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-0">
                                            {/* Scrollable table body */}
                                            <div className="flex-1 overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr>
                                                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">วันที่</th>
                                                            <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 uppercase w-20">ชั่วโมง</th>
                                                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">ประเภท</th>
                                                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">รายละเอียด</th>
                                                            <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 uppercase w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {timeEntries.map((entry) => (
                                                            <tr key={entry.id} className="hover:bg-slate-50">
                                                                <td className="px-3 py-2 text-slate-700">
                                                                    {format(new Date(entry.entry_date), 'dd MMM yyyy')}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className="font-semibold text-indigo-600">{entry.hours}</span>
                                                                    {entry.is_overtime && (
                                                                        <span className="ml-1 text-xs text-amber-500">(OT)</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-600 capitalize">
                                                                    {entry.activity_type}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">
                                                                    {entry.description || '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                        title="ลบรายการ"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Sticky footer */}
                                            <div className="bg-slate-100 border-t border-slate-200 flex-shrink-0">
                                                <div className="flex items-center px-3 py-2 text-sm">
                                                    <span className="text-xs font-medium text-slate-600 w-[100px]">รวม</span>
                                                    <span className="text-center font-bold text-indigo-600 w-20">
                                                        {timeEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-auto">
                                                        {timeEntries.length} รายการ
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Attachments Tab */}
                            {activeTab === 'attachments' && (
                                <div className="h-full flex flex-col">
                                    {loadingAttachments ? (
                                        <div className="text-sm text-slate-500 text-center py-8">กำลังโหลด...</div>
                                    ) : attachments.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                                            <Paperclip className="w-10 h-10 text-slate-300 mb-2" />
                                            ยังไม่มีไฟล์แนบ
                                        </div>
                                    ) : (
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto content-start pr-1">
                                            {attachments.map((file, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors h-fit"
                                                >
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        {getFileIcon(file.type || file.mimeType || '')}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-700 truncate">
                                                                {file.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {formatFileSize(file.size)}
                                                                {file.uploadedAt && ` • ${format(new Date(file.uploadedAt), 'dd MMM yyyy')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={`/api/files/${encodeURIComponent(file.path)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="ดูไฟล์"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Meta & Actions */}
                    <div className="overflow-y-auto">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                            {/* Status */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                                <TaskStatusSelect
                                    value={task.status}
                                    onChange={(status, reason) => onStatusChange(task, status, reason)}
                                    fullWidth
                                />
                            </div>

                            {/* Dates - compact inline */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Start
                                    </label>
                                    <div className="text-sm text-slate-700">
                                        {task.start_date ? format(new Date(task.start_date), 'dd MMM yy') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Due
                                    </label>
                                    <div className={cn("text-sm font-medium", task.is_overdue ? "text-red-600" : "text-slate-700")}>
                                        {task.due_date ? format(new Date(task.due_date), 'dd MMM yy') : '-'}
                                        {task.days_until_due <= 3 && task.days_until_due >= 0 && (
                                            <span className="text-amber-500 block text-xs">({task.days_until_due}d left)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Effort - compact */}
                            <div className="pt-2 border-t border-slate-200/50">
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Effort
                                </label>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-600">Progress</span>
                                        <span className="font-semibold">{task.progress_percent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", task.progress_percent >= 100 ? "bg-green-500" : "bg-indigo-500")}
                                            style={{ width: `${Math.min(task.progress_percent, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-1.5">
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
                                    className="w-full mt-2 py-1.5 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Clock className="w-4 h-4" /> Log Time
                                </button>

                                {/* Unassign Button - only show when viewing own tasks */}
                                {canUnassign && (
                                    <button
                                        onClick={handleUnassign}
                                        disabled={isUnassigning}
                                        className="w-full mt-2 py-1.5 flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        <UserX className="w-4 h-4" /> {isUnassigning ? 'กำลังดำเนินการ...' : 'ถอนออกจาก Task'}
                                    </button>
                                )}
                            </div>

                            {/* Meta - compact */}
                            <div className="pt-2 border-t border-slate-200/50 grid grid-cols-2 gap-x-2 gap-y-1">
                                <div className="text-xs text-slate-500">Type</div>
                                <div className="text-xs text-slate-700 capitalize text-right">{task.task_type}</div>
                                <div className="text-xs text-slate-500">Phase</div>
                                <div className="text-xs text-slate-700 capitalize text-right">{task.work_phase || 'Development'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        </>
    )
}
