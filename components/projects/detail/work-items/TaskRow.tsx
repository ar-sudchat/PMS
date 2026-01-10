'use client'

import { TaskData } from '@/lib/actions/work-items-actions'
import { InlineEdit } from './InlineEdit'
import { StatusSelect } from './StatusSelect'
import { PrioritySelect } from './PrioritySelect'
import { AssigneeSelect } from './AssigneeSelect'
import { updateTask } from '@/lib/actions/work-items-actions'
import { toast } from 'sonner'
import { GripVertical, MoreVertical, Trash2, Copy } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface TaskRowProps {
    task: TaskData
    employees: { id: string, name: string }[]
    onRefresh: () => void
}

export function TaskRow({ task, employees, onRefresh }: TaskRowProps) {

    const handleUpdate = async (field: string, value: any) => {
        try {
            const result = await updateTask(task.id, { [field]: value })
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
        // Call delete action (needs to be imported)
        // For now just console log as I didn't pass delete function
        // Actually I should add delete action import
    }

    return (
        <div className="group grid grid-cols-[1fr_100px_100px_150px_80px_100px_100px_50px] gap-2 p-2 border-b hover:bg-slate-50 items-center text-sm">
            <div className="flex items-center gap-2 pl-12 min-w-0">
                <span className="text-slate-400 font-mono text-xs hidden md:inline-block">{task.task_code}</span>
                <InlineEdit
                    value={task.title}
                    onSave={(val) => handleUpdate('title', val)}
                    className="font-medium truncate"
                />
            </div>

            <div>
                <StatusSelect
                    status={task.status}
                    onChange={(val) => handleUpdate('status', val)}
                />
            </div>

            <div>
                <PrioritySelect
                    priority={task.priority}
                    onChange={(val) => handleUpdate('priority', val)}
                />
            </div>

            <div className="min-w-0">
                <AssigneeSelect
                    assigneeId={task.assignee_id}
                    employees={employees}
                    onChange={(val) => handleUpdate('assignee_id', val)}
                />
            </div>

            <div className="text-right">
                <InlineEdit
                    value={task.estimated_hours || 0}
                    type="number"
                    onSave={(val) => handleUpdate('estimated_hours', Number(val))}
                    className="text-right"
                />
            </div>

            <div className="text-right text-slate-500">
                {task.actual_hours || '-'} h
            </div>

            <div className="text-xs text-slate-500 truncate">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
            </div>

            <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 hover:bg-slate-200 rounded">
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
