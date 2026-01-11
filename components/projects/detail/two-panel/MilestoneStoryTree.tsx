'use client'

import { MilestoneWithStories } from '@/lib/actions/project-detail-actions'
import { MilestoneSection } from './MilestoneSection'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MilestoneStoryTreeProps {
    milestones: MilestoneWithStories[]
    selectedStoryId: string | null
    onSelectStory: (id: string) => void
    onAddStory: () => void
}

export function MilestoneStoryTree({ milestones, selectedStoryId, onSelectStory, onAddStory }: MilestoneStoryTreeProps) {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-semibold text-slate-800">Milestones & Stories</h3>
                <Button variant="ghost" size="sm" onClick={onAddStory} className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                    <Plus className="w-4 h-4 text-indigo-600" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {milestones.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <p>No project structure found.</p>
                        <p className="text-xs mt-2">Add a story or milestones to get started.</p>
                    </div>
                ) : (
                    milestones.map(milestone => (
                        <MilestoneSection
                            key={milestone.id}
                            milestone={milestone}
                            selectedStoryId={selectedStoryId}
                            onSelectStory={onSelectStory}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
