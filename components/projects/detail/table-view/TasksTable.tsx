'use client'

import { TaskListItem, updateTaskField } from '@/lib/actions/project-detail-actions'
import { InlineStatusSelect } from './InlineStatusSelect'
import { InlinePrioritySelect } from './InlinePrioritySelect' // Not used in design 4 but might be useful? Text didn't ask for it in table, asked for 'Status', 'Type', 'Assignee'. Let me check Design 4 again.
// Design 4: Code | Title | Story | Status | Type | Assignee | Est | Due
// It does NOT show Priority.
import { InlineAssigneeSelect } from './InlineAssigneeSelect'
import { Loader2, MoreVertical, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import Link from 'next/link'

interface TasksTableProps {
    tasks: TaskListItem[]
    isLoading: boolean
    onRefresh: () => void
    sort: { field: string, order: 'asc' | 'desc' }
    onSortChange: (field: string) => void
}

export function TasksTable({ tasks, isLoading, onRefresh, sort, onSortChange }: TasksTableProps) {

    const handleUpdate = async (id: string, field: 'status' | 'priority' | 'assignee_id', value: string | null) => {
        const res = await updateTaskField(id, field, value)
        if (res.success) {
            onRefresh()
            return true
        }
        return false
    }

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading tasks...</div>
    }

    if (tasks.length === 0) {
        return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50 border-dashed">No tasks found matching your filters.</div>
    }

    return (
        <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b font-medium">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[100px]" onClick={() => onSortChange('task_code')}>Code</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSortChange('title')}>Title</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[100px]" onClick={() => onSortChange('story_code')}>Story</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[120px]" onClick={() => onSortChange('status')}>Status</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[100px]" onClick={() => onSortChange('task_type')}>Type</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-[180px]" onClick={() => onSortChange('assignee_id')}>Assignee</th>
                            <th className="px-4 py-3 text-center w-[60px]">Est</th>
                            <th className="px-4 py-3 w-[100px]">Due Date</th>
                            <th className="px-2 py-3 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 font-medium text-indigo-600">
                                    <span className="hover:underline cursor-pointer">{task.task_code}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-medium max-w-[250px] truncate" title={task.title}>
                                    {task.title}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                    {task.story_code}
                                </td>
                                <td className="px-4 py-3">
                                    <InlineStatusSelect
                                        currentStatus={task.status}
                                        type="task"
                                        onUpdate={(val) => handleUpdate(task.id, 'status', val)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                                        {task.task_type}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <InlineAssigneeSelect
                                        currentAssigneeId={task.assignee_id}
                                        onUpdate={(val) => handleUpdate(task.id, 'assignee_id', val)}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500">
                                    {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                    {task.due_date ? format(new Date(task.due_date), 'dd/MM') : '-'}
                                </td>
                                <td className="px-2 py-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 hover:text-slate-500">
                                            <MoreVertical className="w-4 h-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <CheckSquare className="w-4 h-4 mr-2" /> View Details
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
                <span>Showing {tasks.length} tasks</span>
                {/* Pagination placeholder */}
            </div>
        </div>
    )
}
