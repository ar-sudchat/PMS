'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { createTask } from '@/lib/actions/gantt-actions'
import { getActiveEmployees } from '@/lib/actions/employee-actions'

interface TaskModalProps {
    open: boolean
    onClose: () => void
    storyId: string
    onSuccess: () => void
}

interface Employee {
    id: string
    nickname: string
    full_name: string
    position: string
}

export function TaskModal({ open, onClose, storyId, onSuccess }: TaskModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [employees, setEmployees] = useState<Employee[]>([])

    const [error, setError] = useState<string>('')

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        taskType: 'dev',
        assigneeId: '',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        priority: 'medium'
    })

    useEffect(() => {
        if (open) {
            loadEmployees()
            setError('')
        }
    }, [open])

    const loadEmployees = async () => {
        setIsLoading(true)
        const result = await getActiveEmployees()
        if (result.success) {
            setEmployees(result.data)
        }
        setIsLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!storyId) {
            setError('Story ID is required')
            return
        }

        if (!formData.title.trim()) {
            setError('Title is required')
            return
        }

        setIsSaving(true)
        setError('')

        console.log('Creating task with story_id:', storyId)

        const result = await createTask({
            story_id: storyId,
            title: formData.title,
            description: formData.description || undefined,
            task_type: formData.taskType,
            assignee_id: formData.assigneeId || undefined,
            start_date: formData.startDate || undefined,
            due_date: formData.dueDate || undefined,
            estimated_hours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
            priority: formData.priority
        })

        setIsSaving(false)

        if (result.success) {
            onSuccess()
            onClose()
            // Reset form
            setFormData({
                title: '',
                description: '',
                taskType: 'dev',
                assigneeId: '',
                startDate: '',
                dueDate: '',
                estimatedHours: '',
                priority: 'medium'
            })
        } else {
            setError(result.error || 'Failed to create task')
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold">✏️ Create Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter task title"
                            required
                        />
                    </div>

                    {/* Task Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Task Type
                            </label>
                            <select
                                value={formData.taskType}
                                onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="dev">🔧 Development</option>
                                <option value="bug">🐛 Bug Fix</option>
                                <option value="rework">🔄 Rework</option>
                                <option value="doc">📄 Document</option>
                                <option value="test">🧪 Testing</option>
                                <option value="meeting">👥 Meeting</option>
                                <option value="support">💬 Support</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="low">🟢 Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Assignee
                        </label>
                        <select
                            value={formData.assigneeId}
                            onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                        >
                            <option value="">-- Unassigned --</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nickname || emp.full_name} ({emp.position})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            💡 Tip: Use "Assign Task" from context menu to see workload
                        </p>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Estimated Hours */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Estimated Hours
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.estimatedHours}
                            onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 8"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Enter description (optional)"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !formData.title.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
