'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'

interface InlineStatusSelectProps {
    currentStatus: string
    onUpdate: (newStatus: string) => Promise<boolean>
    type: 'story' | 'task'
}

const STORY_STATUSES = [
    { value: 'backlog', label: 'Backlog', color: 'bg-slate-100 text-slate-700' },
    { value: 'todo', label: 'To Do', color: 'bg-blue-100 text-blue-700' },
    { value: 'working', label: 'Working', color: 'bg-amber-100 text-amber-700' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
]

const TASK_STATUSES = [
    { value: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-700' },
    { value: 'working', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: 'Review', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700' },
]

export function InlineStatusSelect({ currentStatus, onUpdate, type }: InlineStatusSelectProps) {
    const [status, setStatus] = useState(currentStatus)
    const [isLoading, setIsLoading] = useState(false)

    const statuses = type === 'story' ? STORY_STATUSES : TASK_STATUSES
    const currentConfig = statuses.find(s => s.value === status) || statuses[0]

    const handleValueChange = async (newVal: string) => {
        setStatus(newVal) // Optimistic
        setIsLoading(true)
        try {
            const success = await onUpdate(newVal)
            if (!success) {
                setStatus(currentStatus) // Revert
                toast.error("Failed to update status")
            } else {
                toast.success("Status updated")
            }
        } catch (e) {
            setStatus(currentStatus)
            toast.error("Failed to update status")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Select value={status} onValueChange={handleValueChange} disabled={isLoading}>
            <SelectTrigger className={cn("h-7 px-2 text-xs border-0 font-medium w-[100px]", currentConfig?.color)}>
                <SelectValue>{currentConfig?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {statuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center">
                            <div className={cn("w-2 h-2 rounded-full mr-2", s.color.replace('text-', 'bg-').split(' ')[0])} />
                            {s.label}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
