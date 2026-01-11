'use client'

import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { TaskCard } from './TaskCard'
import { NewTaskModal } from '@/components/modals/NewTaskModal'

interface StoryCardProps {
    story: any
    tasks: any[]
    projectId: string
    currentUserId: string
    onRefresh: () => void
}

export function StoryCard({ story, tasks, projectId, currentUserId, onRefresh }: StoryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showAddTask, setShowAddTask] = useState(false)

    const priorityColors = {
        critical: 'bg-red-100 text-red-800',
        high: 'bg-orange-100 text-orange-800',
        medium: 'bg-blue-100 text-blue-800',
        low: 'bg-slate-100 text-slate-800'
    }

    const statusColors = {
        backlog: 'bg-slate-100 text-slate-700',
        ready: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-purple-100 text-purple-700',
        review: 'bg-yellow-100 text-yellow-700',
        done: 'bg-green-100 text-green-700',
        cancelled: 'bg-gray-100 text-gray-700'
    }

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Story Header */}
            <div
                className="px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-slate-500">{story.story_code}</span>
                            <h3 className="font-medium text-slate-900">{story.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[story.priority as keyof typeof priorityColors]}`}>
                                {story.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[story.status as keyof typeof statusColors]}`}>
                                {story.status.replace('_', ' ')}
                            </span>
                        </div>

                        {story.milestone_name && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: story.milestone_color }}></span>
                                {story.milestone_name}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-slate-500">Tasks</div>
                            <div className="font-medium">{story.completed_tasks}/{story.total_tasks}</div>
                        </div>
                        <div className="w-32">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Progress</span>
                                <span>{story.progress_percent}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${story.progress_percent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-200">
                    <div className="px-4 py-3 space-y-2">
                        {tasks.length > 0 ? (
                            tasks.map((task) => (
                                <TaskCard key={task.id} task={task} onRefresh={onRefresh} />
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                No tasks yet. Click "+ Add Task" to create one.
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowAddTask(true)
                            }}
                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Task
                        </button>
                    </div>
                </div>
            )}

            <NewTaskModal
                isOpen={showAddTask}
                onClose={() => setShowAddTask(false)}
                storyId={story.id}
                mode="create"
                currentUserId={currentUserId}
                onSuccess={() => {
                    setShowAddTask(false)
                    onRefresh()
                }}
            />
        </div>
    )
}
