'use client'

import { StorySimple } from '@/lib/actions/project-detail-actions'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TasksPanelHeaderProps {
    story: StorySimple | null
    onAddTask: () => void
}

export function TasksPanelHeader({ story, onAddTask }: TasksPanelHeaderProps) {
    if (!story) return null

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b bg-white gap-3 rounded-t-lg shadow-sm">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{story.code}</span>
                    {story.priority !== 'medium' && (
                        <span className="text-[10px] items-center px-1.5 py-0.5 rounded-full border border-slate-200 capitalize text-slate-500">
                            {story.priority} Priority
                        </span>
                    )}
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">{story.title}</h3>
            </div>

            <Button onClick={onAddTask} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm whitespace-nowrap">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Task
            </Button>
        </div>
    )
}
