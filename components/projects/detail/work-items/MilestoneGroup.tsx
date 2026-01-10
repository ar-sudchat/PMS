'use client'

import { useState } from 'react'
import { MilestoneGroup as MilestoneType } from '@/lib/actions/work-items-actions'
import { StoryRow } from './StoryRow'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MilestoneGroupProps {
    milestone: MilestoneType
    employees: { id: string, name: string }[]
    onRefresh: () => void
    onAddStory: (milestoneId: string) => void
}

export function MilestoneGroup({ milestone, employees, onRefresh, onAddStory }: MilestoneGroupProps) {
    const [expanded, setExpanded] = useState(true)

    return (
        <div className="mb-6">
            {/* Milestone Header */}
            <div
                className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors mb-2 select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="p-1 text-slate-400">
                    {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>

                <div className="flex items-center gap-3 flex-1">
                    <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: milestone.color || '#cbd5e1' }}
                    />
                    <h3 className="font-bold text-slate-800 text-lg">
                        {milestone.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>({milestone.stories.length} stories)</span>
                        <span className="mx-1">•</span>
                        <span className={cn(
                            "font-medium",
                            milestone.completed_percent >= 100 ? "text-green-600" : "text-blue-600"
                        )}>
                            {milestone.completed_percent}% complete
                        </span>
                    </div>
                </div>
            </div>

            {/* Stories */}
            {expanded && (
                <div className="pl-4 border-l-2 border-slate-100 ml-3 space-y-2">
                    {/* Header for Table Cols (Optional, maybe at top of page or just implicit) */}

                    {milestone.stories.map(story => (
                        <StoryRow
                            key={story.id}
                            story={story}
                            employees={employees}
                            onRefresh={onRefresh}
                        />
                    ))}

                    <Button
                        variant="outline"
                        className="w-full border-dashed text-slate-500 hover:text-indigo-600 hover:border-indigo-200 mt-2"
                        onClick={() => onAddStory(milestone.id)}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Story to {milestone.name}
                    </Button>
                </div>
            )}
        </div>
    )
}
