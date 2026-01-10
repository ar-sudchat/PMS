'use client'

import { MilestoneGroup as MilestoneType } from '@/lib/actions/work-items-actions'
import { MilestoneGroup } from './MilestoneGroup'
import { Loader2 } from 'lucide-react'

interface WorkItemsTableProps {
    data: MilestoneType[]
    isLoading: boolean
    employees: { id: string, name: string }[]
    onRefresh: () => void
    onAddStory: (milestoneId?: string) => void
}

export function WorkItemsTable({ data, isLoading, employees, onRefresh, onAddStory }: WorkItemsTableProps) {
    if (isLoading && data.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                <p>No work items found.</p>
                <button
                    onClick={() => onAddStory()}
                    className="mt-4 text-indigo-600 hover:underline"
                >
                    Create your first story
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_100px_150px_80px_100px_100px_50px] gap-2 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border rounded-t-lg ml-7">
                <div className="pl-12">Title / Code</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Assignee</div>
                <div className="text-right">Est.</div>
                <div className="text-right">Actual</div>
                <div>Due Date</div>
                <div className="text-center">Action</div>
            </div>

            {data.map(milestone => (
                <MilestoneGroup
                    key={milestone.id}
                    milestone={milestone}
                    employees={employees}
                    onRefresh={onRefresh}
                    onAddStory={onAddStory}
                />
            ))}
        </div>
    )
}
