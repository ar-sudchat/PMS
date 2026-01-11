'use client'

import { useState } from 'react'
import { MilestoneWithStories } from '@/lib/actions/project-detail-actions'
import { StoryRow } from './StoryRow'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { cn } from '@/lib/utils'

interface MilestoneSectionProps {
    milestone: MilestoneWithStories
    selectedStoryId: string | null
    onSelectStory: (id: string) => void
    defaultExpanded?: boolean
}

export function MilestoneSection({ milestone, selectedStoryId, onSelectStory, defaultExpanded = true }: MilestoneSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    const toggleExpand = () => setIsExpanded(!isExpanded)

    return (
        <div className="border-b border-slate-100 last:border-0">
            {/* Header */}
            <div
                onClick={toggleExpand}
                className={cn(
                    "flex items-center justify-between py-3 px-4 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer select-none transition-colors",
                    isExpanded && "bg-slate-50"
                )}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: milestone.color }} />
                    <span className="font-semibold text-sm text-slate-700">{milestone.name}</span>
                    <span className="text-xs text-slate-400">({milestone.stories.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Progress value={milestone.progress} className="w-16 h-1.5 bg-slate-200" indicatorColor={milestone.color} />
                    <span className="text-xs font-medium text-slate-500 w-8 text-right">{milestone.progress}%</span>
                </div>
            </div>

            {/* Stories List */}
            {isExpanded && (
                <div className="bg-white">
                    {milestone.stories.length === 0 ? (
                        <div className="py-3 px-8 text-xs text-slate-400 italic">No stories in this milestone</div>
                    ) : (
                        milestone.stories.map(story => (
                            <StoryRow
                                key={story.id}
                                story={story}
                                isSelected={story.id === selectedStoryId}
                                onClick={() => onSelectStory(story.id)}
                                milestoneColor={milestone.color}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
