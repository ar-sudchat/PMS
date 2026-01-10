'use client'

import { cn } from "@/lib/utils"

interface StatusSelectProps {
    status: string
    onChange: (status: string) => void
}

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
    'backlog': { label: 'Backlog', color: 'text-slate-600', bg: 'bg-slate-100' },
    'ready': { label: 'Ready', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    'in_progress': { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
    'working': { label: 'Working', color: 'text-amber-600', bg: 'bg-amber-100' }, // Alias
    'review': { label: 'Review', color: 'text-blue-600', bg: 'bg-blue-100' },
    'done': { label: 'Done', color: 'text-green-600', bg: 'bg-green-100' },
    'blocked': { label: 'Blocked', color: 'text-red-600', bg: 'bg-red-100' },
    'cancelled': { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-100 line-through' }
}

export function StatusSelect({ status, onChange }: StatusSelectProps) {
    const current = statusConfig[status.toLowerCase()] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100' }

    return (
        <select
            value={status}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500",
                current.color,
                current.bg
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                    {config.label}
                </option>
            ))}
        </select>
    )
}
