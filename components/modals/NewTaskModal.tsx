'use client'

import { useState, useEffect, useRef } from 'react'
import { X, CheckCircle, Calendar, Clock } from 'lucide-react'
import { createTask, updateTask, getTaskTypes } from '@/lib/actions/task-actions'
import { getAssignableEmployees, getEmployees } from '@/lib/actions/employee-actions'
import { SmartCombobox } from '@/components/shared/SmartCombobox'
import { WorkloadBadge } from '@/components/ui/WorkloadBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
// import { format } from 'date-fns'

export interface NewTaskModalProps {
    isOpen: boolean
    onClose: () => void
    storyId: string
    storyCode?: string
    storyTitle?: string
    onSuccess?: () => void
    // Extended for Edit
    mode?: 'create' | 'edit'
    task?: any
    projectId?: string // helpful for context if needed
    currentUserId?: string
}

export function NewTaskModal({
    isOpen,
    onClose,
    storyId,
    storyCode,
    storyTitle,
    onSuccess,
    mode = 'create',
    task,
    currentUserId
}: NewTaskModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        task_type: '',
        assignee_id: '',
        reviewer_id: '',
        priority: 'medium',
        estimated_hours: '',
        due_date: '',
        status: 'todo'
    })

    const [taskTypes, setTaskTypes] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [assignableEmployees, setAssignableEmployees] = useState<any[]>([])

    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingAssignees, setIsLoadingAssignees] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [keepValues, setKeepValues] = useState(false)

    const titleInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            loadInitialData()
            initializeForm()
        } else {
            setSuccessMessage(null)
        }
    }, [isOpen, mode, task])

    useEffect(() => {
        if (isOpen && formData.due_date) {
            loadAssignableEmployees(formData.due_date)
        } else {
            setAssignableEmployees([])
        }
    }, [formData.due_date, isOpen])

    const loadInitialData = async () => {
        try {
            const typesResult = await getTaskTypes()
            setTaskTypes(typesResult)
            const empResult = await getEmployees()
            if (empResult.success) {
                setEmployees(empResult.data as any[])
            }
        } catch (error) {
            console.error("Failed to load options", error)
        }
    }

    const loadAssignableEmployees = async (date: string) => {
        setIsLoadingAssignees(true)
        try {
            const result = await getAssignableEmployees(date)
            if (result.success) {
                setAssignableEmployees(result.data as any[])
            }
        } finally {
            setIsLoadingAssignees(false)
        }
    }

    const initializeForm = () => {
        if (mode === 'edit' && task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                task_type: task.task_type || '',
                assignee_id: task.assignee_id || '',
                reviewer_id: task.reviewer_id || '',
                priority: task.priority || 'medium',
                estimated_hours: task.estimated_hours ? String(task.estimated_hours) : '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
                status: task.status || 'todo'
            })
        } else if (mode === 'create') {
            if (!keepValues) {
                resetFormFull()
            }
        }
    }

    const resetFormFull = () => {
        setFormData({
            title: '', description: '', task_type: '', assignee_id: '',
            reviewer_id: currentUserId || '', priority: 'medium', estimated_hours: '', due_date: '', status: 'todo'
        })
    }

    const resetFormAfterCreate = () => {
        setFormData(prev => ({
            ...prev,
            title: '',
            description: '',
            estimated_hours: '',
            task_type: keepValues ? prev.task_type : '',
            assignee_id: keepValues ? prev.assignee_id : '',
            reviewer_id: keepValues ? prev.reviewer_id : (currentUserId || ''),
            due_date: keepValues ? prev.due_date : '',
            priority: 'medium'
        }))
    }

    const handleSubmit = async (closeAfter: boolean) => {
        if (!formData.title.trim()) return alert('Please enter task title')

        setIsSaving(true)
        setSuccessMessage(null)

        try {
            let result
            if (mode === 'create') {
                if (!storyId) return
                result = await createTask({
                    story_id: storyId,
                    title: formData.title,
                    description: formData.description || undefined,
                    task_type: formData.task_type,
                    assignee_id: formData.assignee_id || undefined,
                    reviewer_id: formData.reviewer_id || undefined,
                    priority: formData.priority,
                    estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
                    due_date: formData.due_date || undefined
                })
            } else {
                if (!task?.id) return
                result = await updateTask(task.id, {
                    title: formData.title,
                    description: formData.description,
                    task_type: formData.task_type,
                    assignee_id: formData.assignee_id || '',
                    reviewer_id: formData.reviewer_id || '',
                    priority: formData.priority,
                    estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
                    due_date: formData.due_date,
                    status: formData.status
                })
            }

            if (result && result.success) {
                if (onSuccess) onSuccess()

                if (closeAfter) {
                    onClose()
                } else {
                    const taskCode = (result as any).data?.task_code || 'Task'
                    setSuccessMessage(`Success! Created ${taskCode}: ${formData.title}`)
                    resetFormAfterCreate()
                    setTimeout(() => setSuccessMessage(null), 3000)
                    setTimeout(() => titleInputRef.current?.focus(), 100)
                }
            } else {
                alert(result?.error || 'Failed to save')
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    const taskTypeOptions = taskTypes.map((t: any) => ({
        value: t.value || t.code,
        label: t.label || t.name_th || t.name,
    }))

    const priorityOptions = [
        { value: 'critical', label: '🔴 Critical' },
        { value: 'high', label: '🟠 High' },
        { value: 'medium', label: '🔵 Medium' },
        { value: 'low', label: '⚪ Low' },
    ]

    const assigneeOptions = assignableEmployees.map((emp: any) => ({
        value: emp.id,
        label: emp.nickname ? `${emp.first_name} ${emp.last_name} (${emp.nickname})` : `${emp.first_name} ${emp.last_name}`,
        render: (
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Avatar className="h-6 w-6">
                        <AvatarFallback>{emp.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col truncate">
                        <span className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</span>
                        <span className="text-[10px] text-muted-foreground">{emp.role_code}</span>
                    </div>
                </div>
                <WorkloadBadge assigned={emp.assigned_hours} max={emp.max_hours_per_day} />
            </div>
        )
    }))

    const reviewerOptions = employees.map((emp: any) => ({
        value: emp.id,
        label: `${emp.first_name} ${emp.last_name}`,
        render: (
            <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                    <AvatarFallback>{emp.first_name?.[0]}</AvatarFallback>
                </Avatar>
                <span>{emp.first_name} {emp.last_name}</span>
            </div>
        )
    }))

    const statusOptions = [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'cancelled', label: 'Cancelled' },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        {mode === 'create'
                            ? (storyId ? 'New Task in Story' : 'Create Task')
                            : `Edit Task: ${task?.task_code}`}
                        {mode === 'create' && storyCode && <span className="text-sm font-normal text-slate-500">({storyCode})</span>}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Success Banner */}
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span>{successMessage}</span>
                            </div>
                            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <form className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter task title"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                required
                                autoFocus={mode === 'create'}
                            />
                        </div>

                        {/* Top Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Type <span className="text-red-500">*</span></label>
                                <SmartCombobox
                                    options={taskTypeOptions}
                                    value={taskTypeOptions.find((o: any) => o.value === formData.task_type) || null}
                                    onChange={(val) => setFormData({ ...formData, task_type: val?.value?.toString() || '' })}
                                    placeholder="Select Type"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority <span className="text-red-500">*</span></label>
                                <SmartCombobox
                                    options={priorityOptions}
                                    value={priorityOptions.find((o: any) => o.value === formData.priority) || null}
                                    onChange={(val) => setFormData({ ...formData, priority: val?.value?.toString() || 'medium' })}
                                    placeholder="Select Priority"
                                    required
                                />
                            </div>
                        </div>

                        {/* Middle Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimated Hours</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        placeholder="e.g. 8"
                                        min="0"
                                        step="0.5"
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignments */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400 font-medium">Assignments</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                                    Assignee
                                    {!formData.due_date && <span className="text-xs text-amber-600 font-normal">Select Due Date first</span>}
                                </label>
                                <SmartCombobox
                                    options={assigneeOptions}
                                    value={assigneeOptions.find((o: any) => o.value === formData.assignee_id) || null}
                                    onChange={(val) => setFormData({ ...formData, assignee_id: val?.value?.toString() || '' })}
                                    placeholder={!formData.due_date ? "Select Due Date first..." : "Select Assignee"}
                                    disabled={!formData.due_date}
                                    isLoading={isLoadingAssignees}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reviewer</label>
                                <SmartCombobox
                                    options={reviewerOptions}
                                    value={reviewerOptions.find((o: any) => o.value === formData.reviewer_id) || null}
                                    onChange={(val) => setFormData({ ...formData, reviewer_id: val?.value?.toString() || '' })}
                                    placeholder="Select Reviewer"
                                />
                            </div>
                        </div>

                        {/* Status (Edit only) */}
                        {mode === 'edit' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                                <SmartCombobox
                                    options={statusOptions}
                                    value={statusOptions.find((o: any) => o.value === formData.status) || null}
                                    onChange={(val) => setFormData({ ...formData, status: val?.value?.toString() || 'todo' })}
                                    placeholder="Select Status"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="Add task details..."
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-y min-h-[80px]"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        {mode === 'create' && (
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
                                <input
                                    type="checkbox"
                                    checked={keepValues}
                                    onChange={(e) => setKeepValues(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                Keep values after create
                            </label>
                        )}

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white hover:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all text-sm"
                            >
                                Cancel
                            </button>

                            {mode === 'create' && (
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={isSaving || !formData.title || !formData.task_type || !formData.due_date}
                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    Create & Close
                                </button>
                            )}

                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={isSaving || !formData.title || !formData.task_type || !formData.priority || (mode === 'create' && !formData.due_date)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all text-sm"
                            >
                                {isSaving ? 'Saving...' : (mode === 'create' ? 'Create Task' : 'Save Changes')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
