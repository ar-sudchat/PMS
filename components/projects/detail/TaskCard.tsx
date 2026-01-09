'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { updateTaskStatus, deleteTask } from '@/lib/actions/task-actions'

interface TaskCardProps {
    task: any
    onRefresh: () => void
}

export function TaskCard({ task, onRefresh }: TaskCardProps) {
    const handleStatusChange = async (newStatus: string) => {
        const result = await updateTaskStatus(task.id, newStatus)
        if (result.success) {
            onRefresh()
        } else {
            alert(result.error)
        }
    }

    const handleDelete = async () => {
        if (!confirm(`Delete task ${task.task_code}?`)) return

        const result = await deleteTask(task.id)
        if (result.success) {
            onRefresh()
        } else {
            alert(result.error)
        }
    }

    const statusColors = {
        todo: 'bg-slate-100 text-slate-700',
        in_progress: 'bg-blue-100 text-blue-700',
        review: 'bg-yellow-100 text-yellow-700',
        done: 'bg-green-100 text-green-700',
        blocked: 'bg-red-100 text-red-700',
        cancelled: 'bg-gray-100 text-gray-700'
    }

    const priorityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🔵',
        low: '⚪'
    }

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

    return (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={(e) => handleStatusChange(e.target.checked ? 'done' : 'todo')}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-slate-500">{task.task_code}</span>
                            <span className={task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}>
                                {task.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span style={{ color: task.task_type_color }}>{task.task_type_icon} {task.task_type_name}</span>
                            {task.assignee_nickname && <span>👤 {task.assignee_nickname}</span>}
                            {task.due_date && (
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                    📅 {new Date(task.due_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                    {isOverdue && ' (Overdue)'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Priority & Status */}
                    <div className="flex

 items-center gap-2">
                        <span className="text-lg">{priorityEmoji[task.priority as keyof typeof priorityEmoji]}</span>
                        <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${statusColors[task.status as keyof typeof statusColors]}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" title="Edit">
                            <Pencil className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
