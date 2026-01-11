'use client'

import { StorySimple } from '@/lib/actions/project-detail-actions'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface StoryRowProps {
    story: StorySimple
    isSelected: boolean
    onClick: () => void
    milestoneColor: string
}

const STATUS_COLORS: Record<string, string> = {
    backlog: 'bg-slate-100 text-slate-600',
    todo: 'bg-blue-100 text-blue-600',
    working: 'bg-amber-100 text-amber-700',
    review: 'bg-purple-100 text-purple-600',
    done: 'bg-green-100 text-green-600',
}

export function StoryRow({ story, isSelected, onClick, milestoneColor }: StoryRowProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex items-center justify-between py-2 px-4 pl-8 border-b border-slate-50 cursor-pointer transition-colors relative",
                isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
            )}
        >
            {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
            )}

            <div className="flex flex-col gap-0.5 overflow-hidden">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-600">{story.code}</span>
                    {/* Optional: Add priority icon here if needed */}
                </div>
                <div className="text-sm font-medium text-slate-700 truncate" title={story.title}>
                    {story.title}
                </div>
            </div>

            <Badge
                variant="secondary"
                className={cn(
                    "ml-2 text-[10px] px-1.5 py-0 h-5 font-normal whitespace-nowrap",
                    STATUS_COLORS[story.status] || 'bg-slate-100'
                )}
            >
                {story.status}
            </Badge>
        </div>
    )
}
