'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createTask, getTaskTypes } from '@/lib/actions/task-actions'
import { getEmployees } from '@/lib/actions/employee-actions'

interface TaskCreateModalProps {
    open: boolean
    onClose: () => void
    storyId: string
    projectId: string
    onSuccess: () => void
}

export function TaskCreateModal({ open, onClose, storyId, projectId, onSuccess }: TaskCreateModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        task_type: 'dev',
        assignee_id: '',
        reviewer_id: '',
        priority: 'medium',
        estimated_hours: '',
        due_date: ''
    })
    const [taskTypes, setTaskTypes] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (open) {
            loadOptions()
            resetForm()
        }
    }, [open])

    const loadOptions = async () => {
        const [typesResult, empResult] = await Promise.all([
            getTaskTypes(),
            getEmployees()
        ])
        if (typesResult.success) setTaskTypes(typesResult.data)

        // Handle both formats for employees
        if (empResult.success) {
            const emps = empResult.data || empResult
            setEmployees(Array.isArray(emps) ? emps : [])
        }
    }

    const resetForm = () => {
        setFormData({
            title: '', description: '', task_type: 'dev', assignee_id: '',
            reviewer_id: '', priority: 'medium', estimated_hours: '', due_date: ''
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return alert('Please enter task title')

        setIsSaving(true)

        const result = await createTask({
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

        if (result.success) {
            onSuccess()
            onClose()
        } else {
            alert(result.error)
        }

        setIsSaving(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <h2 className="text-lg font-semibold text-slate-900">New Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter task title"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Task Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Task Type *</label>
                            <select
                                value={formData.task_type}
                                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {taskTypes.map((type) => (
                                    <option key={type.code} value={type.code}>{type.icon} {type.name_th}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🔵 Medium</option>
                                <option value="low">⚪ Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee & Reviewer */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                            <select
                                value={formData.assignee_id}
                                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`} ({emp.position_code || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reviewer</label>
                            <select
                                value={formData.reviewer_id}
                                onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`} ({emp.position_code || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Estimated Hours & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Hours</label>
                            <input
                                type="number"
                                value={formData.estimated_hours}
                                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                placeholder="e.g. 8"
                                min="0"
                                step="0.5"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Task details..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.title}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? 'Creating...' : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>
    )
}
