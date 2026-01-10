'use client'

import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { StoryNode } from './StoryNode'
import { useState } from 'react'

interface Milestone {
    id: string
    code: string
    name: string
    color?: string
    due_date?: string | null
    status?: 'pending' | 'in_progress' | 'completed'
}

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

interface MilestoneNodeProps {
    milestone: Milestone
    stories: Story[]
    isExpanded: boolean
    onToggleExpand: () => void
    onCreateStory: (milestoneId: string, title: string) => Promise<void>
    onStoryExpand: (storyId: string) => void
    expandedStories: Set<string>
    tasks: Map<string, any[]>
    onFieldChange: (entityType: 'story' | 'task', entityId: string, field: string, newValue: any, oldValue: any) => void
    isFieldModified: (entityType: 'story' | 'task', entityId: string, field: string) => boolean
    onDeleteStory: (storyId: string) => Promise<void>
    onCreateTask: (storyId: string, title: string) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
}

export function MilestoneNode({
    milestone,
    stories,
    isExpanded,
    onToggleExpand,
    onCreateStory,
    onStoryExpand,
    expandedStories,
    tasks,
    onFieldChange,
    isFieldModified,
    onDeleteStory,
    onCreateTask,
    onDeleteTask
}: MilestoneNodeProps) {
    const [isCreatingStory, setIsCreatingStory] = useState(false)
    const [newStoryTitle, setNewStoryTitle] = useState('')

    // Calculate progress from tasks
    const safeStories = Array.isArray(stories) ? stories : []
    const allTasks = safeStories.flatMap(story => {
        const storyTasks = tasks.get(story.id)
        return Array.isArray(storyTasks) ? storyTasks : []
    })
    const completedTasks = allTasks.filter((t: any) => t.status === 'done').length
    const totalTasks = allTasks.length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Status badge colors
    const statusColors = {
        pending: 'bg-slate-100 text-slate-700',
        in_progress: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700'
    }

    // Format date in Thai
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }

    const handleCreateStory = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newStoryTitle.trim()) {
            e.preventDefault()
            await onCreateStory(milestone.id, newStoryTitle.trim())
            setNewStoryTitle('')
            setIsCreatingStory(false)
        } else if (e.key === 'Escape') {
            setNewStoryTitle('')
            setIsCreatingStory(false)
        }
    }

    return (
        <div className="border rounded-lg bg-white">
            {/* Milestone Header */}
            <div className="p-4">
                <div className="flex items-center gap-3">
                    {/* Expand/Collapse Button */}
                    <button
                        onClick={onToggleExpand}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        )}
                    </button>

                    {/* Color Indicator */}
                    {milestone.color && (
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: milestone.color }}
                        />
                    )}

                    {/* Milestone Code & Name */}
                    <div className="flex-1">
                        <span className="font-semibold text-slate-800">
                            {milestone.code} • {milestone.name}
                        </span>
                    </div>

                    {/* Due Date */}
                    {milestone.due_date && (
                        <span className="text-sm text-slate-600">
                            Due: {formatDate(milestone.due_date)}
                        </span>
                    )}

                    {/* Status Badge */}
                    {milestone.status && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[milestone.status] || 'bg-slate-100 text-slate-700'}`}>
                            {milestone.status === 'in_progress' ? 'In Progress' :
                             milestone.status === 'pending' ? 'Pending' : 'Completed'}
                        </span>
                    )}

                    {/* Story Count */}
                    <span className="text-sm text-slate-600">
                        {safeStories.length} {safeStories.length === 1 ? 'story' : 'stories'}
                    </span>
                </div>

                {/* Progress Bar */}
                {totalTasks > 0 && (
                    <div className="mt-2 ml-9">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-600 font-medium">
                                {progress}% ({completedTasks}/{totalTasks} tasks)
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t px-4 pb-4">
                    {/* Add Story Button */}
                    <div className="mt-3 ml-9">
                        {isCreatingStory ? (
                            <input
                                type="text"
                                value={newStoryTitle}
                                onChange={(e) => setNewStoryTitle(e.target.value)}
                                onKeyDown={handleCreateStory}
                                onBlur={() => {
                                    setNewStoryTitle('')
                                    setIsCreatingStory(false)
                                }}
                                placeholder="Enter story title (press Enter to create)"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        ) : (
                            <button
                                onClick={() => setIsCreatingStory(true)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Story
                            </button>
                        )}
                    </div>

                    {/* Stories List */}
                    {safeStories.length === 0 && !isCreatingStory && (
                        <div className="mt-3 ml-9 text-sm text-slate-400 italic">
                            No stories yet
                        </div>
                    )}

                    <div className="mt-3 space-y-2">
                        {safeStories.map(story => (
                            <StoryNode
                                key={story.id}
                                story={story}
                                tasks={tasks.get(story.id) || []}
                                isExpanded={expandedStories.has(story.id)}
                                onToggleExpand={() => onStoryExpand(story.id)}
                                onFieldChange={onFieldChange}
                                isFieldModified={isFieldModified}
                                onDelete={onDeleteStory}
                                onCreateTask={onCreateTask}
                                onDeleteTask={onDeleteTask}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
