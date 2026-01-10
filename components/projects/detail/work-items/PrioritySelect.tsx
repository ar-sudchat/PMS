'use client'

import { cn } from "@/lib/utils"

interface PrioritySelectProps {
    priority: string
    onChange: (priority: string) => void
}

const priorityConfig: Record<string, { label: string, color: string }> = {
    'Critical': { label: 'Critical', color: 'text-red-600' },
    'High': { label: 'High', color: 'text-orange-500' },
    'Medium': { label: 'Medium', color: 'text-yellow-600' },
    'Low': { label: 'Low', color: 'text-slate-500' }
}

export function PrioritySelect({ priority, onChange }: PrioritySelectProps) {
    const current = priorityConfig[priority] || { label: priority, color: 'text-slate-600' }

    return (
        <select
            value={priority}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "px-2 py-1 bg-transparent rounded text-xs font-semibold cursor-pointer hover:bg-slate-100",
                current.color
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {Object.entries(priorityConfig).map(([key, config]) => (
                <option key={key} value={key}>
                    {config.label}
                </option>
            ))}
        </select>
    )
}
