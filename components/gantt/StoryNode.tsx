'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { TaskNode } from './TaskNode'

interface Story {
    id: string
    story_code: string
    title: string
    status: string
    priority: string
    start_date: string | null
    due_date: string | null
    estimated_md: number
    progress_percent: number
    milestone_id: string | null
    total_tasks?: number
    completed_tasks?: number
}

interface Task {
    id: string
    task_code: string
    title: string
    status: string
    priority: string
    task_type: string
    assignee_id: string | null
    assignee_name: string | null
    reviewer_id: string | null
    estimated_hours: number | null
    actual_hours: number
    due_date: string | null
    story_id: string
}

interface StoryNodeProps {
    story: Story
    tasks: Task[]
    isExpanded: boolean
    onToggleExpand: () => void
    onFieldChange: (entityType: 'story' | 'task', entityId: string, field: string, newValue: any, oldValue: any) => void
    isFieldModified: (entityType: 'story' | 'task', entityId: string, field: string) => boolean
    onDelete: (storyId: string) => Promise<void>
    onCreateTask: (storyId: string, title: string) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
}

export function StoryNode({
    story,
    tasks,
    isExpanded,
    onToggleExpand,
    onFieldChange,
    isFieldModified,
    onDelete,
    onCreateTask,
    onDeleteTask
}: StoryNodeProps) {
    const [isCreatingTask, setIsCreatingTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<any>('')

    // Calculate progress from tasks
    const completedTasks = tasks.filter(t => t.status === 'done').length
    const totalTasks = tasks.length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Priority colors
    const priorityColors = {
        critical: 'bg-red-100 text-red-700',
        high: 'bg-orange-100 text-orange-700',
        medium: 'bg-blue-100 text-blue-700',
        low: 'bg-slate-100 text-slate-700'
    }

    // Status colors
    const statusColors = {
        backlog: 'bg-slate-100 text-slate-700',
        ready: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-purple-100 text-purple-700',
        review: 'bg-yellow-100 text-yellow-700',
        done: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
    }

    // Format date
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'Not set'
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // Check if any field is modified
    const hasModifications = ['title', 'status', 'priority', 'start_date', 'due_date', 'estimated_md']
        .some(field => isFieldModified('story', story.id, field))

    // Handle inline edit
    const startEdit = (field: string, currentValue: any) => {
        setEditingField(field)
        setEditValue(currentValue || '')
    }

    const saveEdit = (field: string) => {
        if (editValue !== story[field as keyof Story]) {
            onFieldChange('story', story.id, field, editValue, story[field as keyof Story])
        }
        setEditingField(null)
    }

    const cancelEdit = () => {
        setEditingField(null)
        setEditValue('')
    }

    // Handle delete
    const handleDelete = async () => {
        if (confirm(`Delete story ${story.story_code} and its ${totalTasks} tasks? This cannot be undone.`)) {
            await onDelete(story.id)
        }
    }

    // Handle create task
    const handleCreateTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTaskTitle.trim()) {
            e.preventDefault()
            await onCreateTask(story.id, newTaskTitle.trim())
            setNewTaskTitle('')
            setIsCreatingTask(false)
        } else if (e.key === 'Escape') {
            setNewTaskTitle('')
            setIsCreatingTask(false)
        }
    }

    return (
        <div className="ml-9 border-l-2 border-blue-300 pl-4">
            {/* Story Header */}
            <div className="flex items-center gap-2 py-2">
                {/* Expand/Collapse */}
                <button
                    onClick={onToggleExpand}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    )}
                </button>

                {/* Story Code */}
                <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {story.story_code}
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
                        className={`flex-1 px-2 py-1 border-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isFieldModified('story', story.id, 'title') ? 'border-amber-400' : 'border-blue-300'
                        }`}
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => startEdit('title', story.title)}
                        className={`flex-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded ${
                            isFieldModified('story', story.id, 'title') ? 'border-2 border-amber-400' : ''
                        }`}
                    >
                        {story.title}{hasModifications && '*'}
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
                        className={`px-2 py-1 border-2 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isFieldModified('story', story.id, 'status') ? 'border-amber-400' : 'border-blue-300'
                        }`}
                        autoFocus
                    >
                        <option value="backlog">Backlog</option>
                        <option value="ready">Ready</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                ) : (
                    <span
                        onClick={() => startEdit('status', story.status)}
                        className={`px-2 py-1 text-xs font-medium rounded cursor-pointer ${
                            statusColors[story.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-700'
                        } ${isFieldModified('story', story.id, 'status') ? 'ring-2 ring-amber-400' : ''}`}
                    >
                        {story.status.replace('_', ' ')}
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
                        className={`px-2 py-1 border-2 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isFieldModified('story', story.id, 'priority') ? 'border-amber-400' : 'border-blue-300'
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
                        onClick={() => startEdit('priority', story.priority)}
                        className={`px-2 py-1 text-xs font-medium rounded cursor-pointer ${
                            priorityColors[story.priority as keyof typeof priorityColors] || 'bg-slate-100 text-slate-700'
                        } ${isFieldModified('story', story.id, 'priority') ? 'ring-2 ring-amber-400' : ''}`}
                    >
                        {story.priority}
                    </span>
                )}

                {/* Task Count */}
                <span className="text-xs text-slate-600">
                    {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                </span>

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                    title="Delete story"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Story Details (when expanded) */}
            {isExpanded && (
                <div className="mt-2 mb-3 ml-6 space-y-2">
                    {/* Dates and Estimates Row */}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div>
                            <span className="font-medium">Start:</span>{' '}
                            {editingField === 'start_date' ? (
                                <input
                                    type="date"
                                    value={editValue || ''}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit('start_date')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelEdit()
                                    }}
                                    className={`px-2 py-0.5 border-2 rounded text-sm ${
                                        isFieldModified('story', story.id, 'start_date') ? 'border-amber-400' : 'border-blue-300'
                                    }`}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    onClick={() => startEdit('start_date', story.start_date || '')}
                                    className={`cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded ${
                                        isFieldModified('story', story.id, 'start_date') ? 'border-2 border-amber-400' : ''
                                    }`}
                                >
                                    {formatDate(story.start_date)}
                                </span>
                            )}
                        </div>

                        <div>
                            <span className="font-medium">Due:</span>{' '}
                            {editingField === 'due_date' ? (
                                <input
                                    type="date"
                                    value={editValue || ''}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit('due_date')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelEdit()
                                    }}
                                    className={`px-2 py-0.5 border-2 rounded text-sm ${
                                        isFieldModified('story', story.id, 'due_date') ? 'border-amber-400' : 'border-blue-300'
                                    }`}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    onClick={() => startEdit('due_date', story.due_date || '')}
                                    className={`cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded ${
                                        isFieldModified('story', story.id, 'due_date') ? 'border-2 border-amber-400' : ''
                                    }`}
                                >
                                    {formatDate(story.due_date)}
                                </span>
                            )}
                        </div>

                        <div>
                            <span className="font-medium">Est. MD:</span>{' '}
                            {editingField === 'estimated_md' ? (
                                <input
                                    type="number"
                                    step="0.5"
                                    value={editValue}
                                    onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                                    onBlur={() => saveEdit('estimated_md')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit('estimated_md')
                                        if (e.key === 'Escape') cancelEdit()
                                    }}
                                    className={`w-20 px-2 py-0.5 border-2 rounded text-sm ${
                                        isFieldModified('story', story.id, 'estimated_md') ? 'border-amber-400' : 'border-blue-300'
                                    }`}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    onClick={() => startEdit('estimated_md', story.estimated_md)}
                                    className={`cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded ${
                                        isFieldModified('story', story.id, 'estimated_md') ? 'border-2 border-amber-400' : ''
                                    }`}
                                >
                                    {story.estimated_md || 0}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {totalTasks > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-green-500 h-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-600 font-medium">
                                {progress}% ({completedTasks}/{totalTasks})
                            </span>
                        </div>
                    )}

                    {/* Add Task Button */}
                    <div>
                        {isCreatingTask ? (
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={handleCreateTask}
                                onBlur={() => {
                                    setNewTaskTitle('')
                                    setIsCreatingTask(false)
                                }}
                                placeholder="Enter task title (press Enter to create)"
                                className="w-full px-3 py-1.5 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                autoFocus
                            />
                        ) : (
                            <button
                                onClick={() => setIsCreatingTask(true)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add Task
                            </button>
                        )}
                    </div>

                    {/* Tasks List */}
                    {tasks.length === 0 && !isCreatingTask && (
                        <div className="text-xs text-slate-400 italic">No tasks yet</div>
                    )}

                    <div className="space-y-1.5">
                        {tasks.map(task => (
                            <TaskNode
                                key={task.id}
                                task={task}
                                onFieldChange={onFieldChange}
                                isFieldModified={isFieldModified}
                                onDelete={onDeleteTask}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
