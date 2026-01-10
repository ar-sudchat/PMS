'use client'

import { useState } from 'react'
import { StoryData, TaskData, updateStory, deleteStory } from '@/lib/actions/work-items-actions'
import { TaskRow } from './TaskRow'
import { AddTaskInline } from './AddTaskInline'
import { InlineEdit } from './InlineEdit'
import { StatusSelect } from './StatusSelect'
import { PrioritySelect } from './PrioritySelect'
import { toast } from 'sonner'
import { ChevronRight, ChevronDown, Plus, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from "@/lib/utils"

interface StoryRowProps {
    story: StoryData
    employees: { id: string, name: string }[]
    onRefresh: () => void
}

export function StoryRow({ story, employees, onRefresh }: StoryRowProps) {
    const [expanded, setExpanded] = useState(true)
    const [isAddingTask, setIsAddingTask] = useState(false)

    const handleUpdate = async (field: string, value: any) => {
        try {
            const result = await updateStory(story.id, { [field]: value })
            if (result.success) {
                onRefresh()
                toast.success('Updated')
            } else {
                toast.error('Update failed')
            }
        } catch (error) {
            toast.error('Update failed')
        }
    }

    const handleDelete = async () => {
        if (!confirm('Delete this story?')) return
        try {
            const result = await deleteStory(story.id)
            if (result.success) {
                onRefresh()
                toast.success('Deleted')
            } else {
                toast.error('Delete failed')
            }
        } catch (error) {
            toast.error('Delete failed')
        }
    }

    return (
        <div className="border border-slate-200 rounded-lg mb-2 overflow-hidden bg-white shadow-sm">
            {/* Story Header Row */}
            <div className="grid grid-cols-[1fr_100px_100px_150px_80px_100px_100px_50px] gap-2 p-3 bg-slate-50 border-b items-center hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="text-indigo-600 font-mono text-xs font-medium">{story.story_code}</span>
                    <InlineEdit
                        value={story.title}
                        onSave={(val) => handleUpdate('title', val)}
                        className="font-semibold text-slate-900 truncate"
                    />
                </div>

                <div>
                    <StatusSelect
                        status={story.status}
                        onChange={(val) => handleUpdate('status', val)}
                    />
                </div>

                <div>
                    <PrioritySelect
                        priority={story.priority}
                        onChange={(val) => handleUpdate('priority', val)}
                    />
                </div>

                <div className="text-xs text-slate-500 italic px-2">
                    {/* Story Assignee usually blank or owner, reusing assignee select if needed or just blank */}
                    -
                </div>

                <div className="text-right">
                    <InlineEdit
                        value={story.estimated_md || 0}
                        type="number"
                        onSave={(val) => handleUpdate('estimated_md', Number(val))}
                        className="text-right font-medium"
                    />
                    <span className="text-xs text-slate-400 ml-1">MD</span>
                </div>

                <div className="text-right text-xs text-slate-500">
                    {/* Actual from tasks rollup or story field? Using story field for now */}
                    {story.actual_md || '-'}
                </div>

                <div className="text-xs text-slate-500 truncate">
                    {story.due_date ? new Date(story.due_date).toLocaleDateString() : '-'}
                </div>

                <div className="flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-slate-200 rounded">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsAddingTask(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Add Task
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Tasks List */}
            {expanded && (
                <div className="bg-white">
                    {story.tasks.map(task => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            employees={employees}
                            onRefresh={onRefresh}
                        />
                    ))}

                    {/* Add Task Inline Form */}
                    {isAddingTask && (
                        <AddTaskInline
                            storyId={story.id}
                            employees={employees}
                            onCancel={() => setIsAddingTask(false)}
                            onSuccess={() => {
                                setIsAddingTask(false)
                                onRefresh()
                            }}
                        />
                    )}

                    {/* Empty State / Add Button */}
                    {!isAddingTask && (
                        <div className="p-2 pl-12 border-b border-dashed">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 hover:text-indigo-600 h-8 text-xs"
                                onClick={() => setIsAddingTask(true)}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Task
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
