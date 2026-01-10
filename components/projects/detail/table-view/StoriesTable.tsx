'use client'

import { useState, useEffect } from 'react'
import { StoryListItem, updateStoryField } from '@/lib/actions/project-detail-actions'
import { InlineStatusSelect } from './InlineStatusSelect'
import { InlinePrioritySelect } from './InlinePrioritySelect'
import { Loader2, MoreVertical, Search, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
            onRefresh() // Refresh list to sync or update totals
            return true
        }
        return false
    }

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading stories...</div>
    }

    if (stories.length === 0) {
        return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50 border-dashed">No stories found.</div>
    }

    return (
        <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b font-medium">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => onSortChange('story_code')}>Code</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => onSortChange('title')}>Title</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => onSortChange('milestone_id')}>Milestone</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => onSortChange('status')}>Status</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => onSortChange('priority')}>Priority</th>
                            <th className="px-4 py-3 text-center">Est. MD</th>
                            <th className="px-4 py-3 text-center">Tasks</th>
                            <th className="px-4 py-3">Progress</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-2 py-3 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stories.map(story => (
                            <tr key={story.id} className="hover:bg-slate-50/80 group">
                                <td className="px-4 py-3 font-medium text-indigo-600">
                                    <Link href={`?storyId=${story.id}`} className="hover:underline">{story.story_code}</Link>
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-medium max-w-[300px] truncate" title={story.title}>
                                    {story.title}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                        style={{ backgroundColor: story.milestone_color + '20', color: story.milestone_color }}
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
                                <td className="px-4 py-3 text-center text-slate-500">
                                    {story.estimated_md || '-'}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500">
                                    {story.task_count}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-[60px]">
                                            <div
                                                className="h-full bg-green-500"
                                                style={{ width: `${story.progress_percent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500">{story.progress_percent}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                    {story.due_date ? format(new Date(story.due_date), 'dd MMM') : '-'}
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
                                            {/* Add more actions */}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
