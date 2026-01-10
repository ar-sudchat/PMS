'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface Task {
    id: string
    task_code: string
    title: string
    status: string
    priority: string
    task_type: string
    task_type_name?: string
    task_type_color?: string
    task_type_icon?: string
    assignee_id: string | null
    assignee_name: string | null
    reviewer_id: string | null
    estimated_hours: number | null
    actual_hours: number
    due_date: string | null
    story_id: string
}

interface TaskNodeProps {
    task: Task
    onFieldChange: (entityType: 'story' | 'task', entityId: string, field: string, newValue: any, oldValue: any) => void
    isFieldModified: (entityType: 'story' | 'task', entityId: string, field: string) => boolean
    onDelete: (taskId: string) => Promise<void>
}

export function TaskNode({ task, onFieldChange, isFieldModified, onDelete }: TaskNodeProps) {
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<any>('')

    // Priority colors and emojis
    const priorityEmojis = {
        critical: '🔴',
        high: '🟠',
        medium: '🔵',
        low: '⚪'
    }

    const priorityColors = {
        critical: 'bg-red-100 text-red-700',
        high: 'bg-orange-100 text-orange-700',
        medium: 'bg-blue-100 text-blue-700',
        low: 'bg-slate-100 text-slate-700'
    }

    // Status colors
    const statusColors = {
        todo: 'bg-slate-100 text-slate-700',
        in_progress: 'bg-purple-100 text-purple-700',
        review: 'bg-yellow-100 text-yellow-700',
        done: 'bg-green-100 text-green-700',
        blocked: 'bg-red-100 text-red-700',
        cancelled: 'bg-slate-100 text-slate-500'
    }

    // Format date
    const formatDate = (dateStr: string | null | undefined): { formatted: string; isOverdue: boolean } => {
        if (!dateStr) return { formatted: 'Not set', isOverdue: false }
        const date = new Date(dateStr)
        const now = new Date()
        const isOverdue = date < now && task.status !== 'done'

        const formatted = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        return { formatted, isOverdue }
    }

    // Check if any field is modified
    const hasModifications = [
        'title', 'status', 'priority', 'task_type', 'assignee_id',
        'reviewer_id', 'estimated_hours', 'actual_hours', 'due_date'
    ].some(field => isFieldModified('task', task.id, field))

    // Handle inline edit
    const startEdit = (field: string, currentValue: any) => {
        setEditingField(field)
        setEditValue(currentValue || '')
    }

    const saveEdit = (field: string) => {
        if (editValue !== task[field as keyof Task]) {
            onFieldChange('task', task.id, field, editValue, task[field as keyof Task])
        }
        setEditingField(null)
    }

    const cancelEdit = () => {
        setEditingField(null)
        setEditValue('')
    }

    // Handle checkbox toggle
    const handleStatusToggle = () => {
        const newStatus = task.status === 'done' ? 'todo' : 'done'
        onFieldChange('task', task.id, 'status', newStatus, task.status)
    }

    // Handle delete
    const handleDelete = async () => {
        if (confirm(`Delete task ${task.task_code}? This cannot be undone.`)) {
            await onDelete(task.id)
        }
    }

    const dueDateInfo = formatDate(task.due_date)

    return (
        <div className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 ${
            hasModifications ? 'bg-amber-50' : ''
        }`}>
            {/* Checkbox for completion */}
            <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={handleStatusToggle}
                className={`w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 ${
                    isFieldModified('task', task.id, 'status') ? 'ring-2 ring-amber-400' : ''
                }`}
            />

            {/* Task Type Icon */}
            {task.task_type_icon && (
                <span className="text-lg" title={task.task_type_name || task.task_type}>
                    {task.task_type_icon}
                </span>
            )}

            {/* Task Code */}
            <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{
                    backgroundColor: task.task_type_color || '#e2e8f0',
                    color: '#334155'
                }}
            >
                {task.task_code}
            </span>

            {/* Title (editable) */}
            {editingField === 'title' ? (
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('title')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit('title')
                        if (e.key === 'Escape') cancelEdit()
                    }}
                    className={`flex-1 px-2 py-0.5 text-sm border-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isFieldModified('task', task.id, 'title') ? 'border-amber-400' : 'border-blue-300'
                    }`}
                    autoFocus
                />
            ) : (
                <span
                    onClick={() => startEdit('title', task.title)}
                    className={`flex-1 text-sm cursor-pointer hover:bg-white px-2 py-0.5 rounded ${
                        task.status === 'done' ? 'line-through text-slate-400' : ''
                    } ${isFieldModified('task', task.id, 'title') ? 'border-2 border-amber-400' : ''}`}
                >
                    {task.title}{hasModifications && '*'}
                </span>
            )}

            {/* Assignee */}
            {task.assignee_name ? (
                <span className="text-xs text-slate-600">
                    @{task.assignee_name}
                </span>
            ) : (
                <span className="text-xs text-slate-400 italic">Unassigned</span>
            )}

            {/* Estimated Hours (editable) */}
            <div className="flex items-center gap-1">
                {editingField === 'estimated_hours' ? (
                    <input
                        type="number"
                        step="0.5"
                        value={editValue || ''}
                        onChange={(e) => setEditValue(parseFloat(e.target.value) || null)}
                        onBlur={() => saveEdit('estimated_hours')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit('estimated_hours')
                            if (e.key === 'Escape') cancelEdit()
                        }}
                        className={`w-16 px-2 py-0.5 text-xs border-2 rounded ${
                            isFieldModified('task', task.id, 'estimated_hours') ? 'border-amber-400' : 'border-blue-300'
                        }`}
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => startEdit('estimated_hours', task.estimated_hours)}
                        className={`text-xs cursor-pointer hover:bg-white px-1.5 py-0.5 rounded ${
                            isFieldModified('task', task.id, 'estimated_hours') ? 'border-2 border-amber-400' : ''
                        }`}
                    >
                        {task.estimated_hours || 0}h
                    </span>
                )}
            </div>

            {/* Due Date (editable) */}
            {editingField === 'due_date' ? (
                <input
                    type="date"
                    value={editValue || ''}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('due_date')}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                    }}
                    className={`px-2 py-0.5 text-xs border-2 rounded ${
                        isFieldModified('task', task.id, 'due_date') ? 'border-amber-400' : 'border-blue-300'
                    }`}
                    autoFocus
                />
            ) : (
                <span
                    onClick={() => startEdit('due_date', task.due_date || '')}
                    className={`text-xs cursor-pointer hover:bg-white px-1.5 py-0.5 rounded ${
                        dueDateInfo.isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'
                    } ${isFieldModified('task', task.id, 'due_date') ? 'border-2 border-amber-400' : ''}`}
                >
                    {dueDateInfo.formatted}
                </span>
            )}

            {/* Priority (editable) */}
            {editingField === 'priority' ? (
                <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('priority')}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                    }}
                    className={`px-2 py-0.5 text-xs border-2 rounded ${
                        isFieldModified('task', task.id, 'priority') ? 'border-amber-400' : 'border-blue-300'
                    }`}
                    autoFocus
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            ) : (
                <span
                    onClick={() => startEdit('priority', task.priority)}
                    className={`px-2 py-0.5 text-xs rounded cursor-pointer ${
                        priorityColors[task.priority as keyof typeof priorityColors] || 'bg-slate-100 text-slate-700'
                    } ${isFieldModified('task', task.id, 'priority') ? 'ring-2 ring-amber-400' : ''}`}
                    title={task.priority}
                >
                    {priorityEmojis[task.priority as keyof typeof priorityEmojis] || '⚪'}
                </span>
            )}

            {/* Status (editable) */}
            {editingField === 'status' ? (
                <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('status')}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                    }}
                    className={`px-2 py-0.5 text-xs border-2 rounded ${
                        isFieldModified('task', task.id, 'status') ? 'border-amber-400' : 'border-blue-300'
                    }`}
                    autoFocus
                >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            ) : (
                <span
                    onClick={() => startEdit('status', task.status)}
                    className={`px-2 py-0.5 text-xs font-medium rounded cursor-pointer ${
                        statusColors[task.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-700'
                    } ${isFieldModified('task', task.id, 'status') ? 'ring-2 ring-amber-400' : ''}`}
                >
                    {task.status.replace('_', ' ')}
                </span>
            )}

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                className="p-0.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                title="Delete task"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
