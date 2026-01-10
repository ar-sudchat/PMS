'use client'

import { cn } from '@/lib/utils'

interface StatusFilterProps {
    currentStatus: string
    onStatusChange: (status: string) => void
    counts: Record<string, number>
}

export function StatusFilter({ currentStatus, onStatusChange, counts }: StatusFilterProps) {
    const tabs = [
        { id: 'all', label: 'All Tasks' },
        { id: 'todo', label: 'To Do' },
        { id: 'in_progress', label: 'In Progress' },
        { id: 'review', label: 'Review' },
        { id: 'done', label: 'Done' }
    ]

    return (
        <div className="flex border-b w-full overflow-x-auto">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onStatusChange(tab.id)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                        currentStatus === tab.id
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    {tab.label}
                    {counts[tab.id] > 0 && (
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            currentStatus === tab.id ? "bg-indigo-100/50" : "bg-slate-100"
                        )}>
                            {counts[tab.id]}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}
