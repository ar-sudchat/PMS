'use client'

import { StoryListItem, updateStoryField } from '@/lib/actions/project-detail-actions'
import { InlineStatusSelect } from './InlineStatusSelect'
import { InlinePrioritySelect } from './InlinePrioritySelect'
import { Loader2, MoreVertical, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import Link from 'next/link'

interface StoriesTableProps {
    stories: StoryListItem[]
    isLoading: boolean
    onRefresh: () => void
    sort: { field: string, order: 'asc' | 'desc' }
    onSortChange: (field: string) => void
}

export function StoriesTable({ stories, isLoading, onRefresh, sort, onSortChange }: StoriesTableProps) {

    const handleUpdate = async (id: string, field: 'status' | 'priority', value: string) => {
        const res = await updateStoryField(id, field, value)
        if (res.success) {
            onRefresh()
            return true
        }
        return false
    }

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading stories...</div>
    }

    if (stories.length === 0) {
        return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50 border-dashed">No stories found matching your filters.</div>
    }

    return (
        <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b font-medium">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[100px]" onClick={() => onSortChange('story_code')}>Code</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSortChange('title')}>Title</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[140px]" onClick={() => onSortChange('milestone_id')}>Milestone</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[120px]" onClick={() => onSortChange('status')}>Status</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[120px]" onClick={() => onSortChange('priority')}>Priority</th>
                            <th className="px-4 py-3 text-center w-[80px]">Tasks</th>
                            <th className="px-4 py-3 w-[100px]">Due Date</th>
                            <th className="px-2 py-3 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stories.map(story => (
                            <tr key={story.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 font-medium text-indigo-600">
                                    <Link href={`?storyId=${story.id}`} className="hover:underline">{story.story_code}</Link>
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-medium max-w-[300px] truncate" title={story.title}>
                                    {story.title}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                                        style={{
                                            backgroundColor: '#f8fafc', // Slate-50 
                                            borderColor: story.milestone_color,
                                            color: story.milestone_color
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: story.milestone_color }} />
                                        {story.milestone_code}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <InlineStatusSelect
                                        currentStatus={story.status}
                                        type="story"
                                        onUpdate={(val) => handleUpdate(story.id, 'status', val)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <InlinePrioritySelect
                                        currentPriority={story.priority}
                                        onUpdate={(val) => handleUpdate(story.id, 'priority', val)}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500 font-medium">
                                    {story.task_count}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                    {story.due_date ? format(new Date(story.due_date), 'dd/MM') : '-'}
                                </td>
                                <td className="px-2 py-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 hover:text-slate-500">
                                            <MoreVertical className="w-4 h-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <FileText className="w-4 h-4 mr-2" /> View Details
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-3 border-t bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                <span>Showing {stories.length} stories</span>
                {/* Pagination placeholder */}
            </div>
        </div>
    )
}
