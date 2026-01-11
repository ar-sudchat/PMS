'use client'

import { useState, useEffect } from 'react'
import { getProjectMilestonesWithStories, MilestoneWithStories, StorySimple } from '@/lib/actions/project-detail-actions'
import { MilestoneStoryTree } from './MilestoneStoryTree'
import { RightPanel } from './RightPanel'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { CreateStoryModal as StoryModal } from '@/components/modals/CreateStoryModal'

interface ProjectDetailTwoPanelProps {
    projectId: string
    currentUserId?: string
}

export function ProjectDetailTwoPanel({ projectId, currentUserId }: ProjectDetailTwoPanelProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // State
    const [isLoading, setIsLoading] = useState(true)
    const [milestones, setMilestones] = useState<MilestoneWithStories[]>([])
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(searchParams.get('storyId'))
    const [isAddStoryOpen, setIsAddStoryOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch Milestones & Stories
    const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await getProjectMilestonesWithStories(projectId)
            if (res.success) {
                setMilestones(res.data)

                // If no story selected, select the first one with tasks, or just first one
                if (!selectedStoryId && res.data.length > 0) {
                    const firstStory = res.data.flatMap(m => m.stories).find(s => s.task_count > 0) || res.data.flatMap(m => m.stories)[0]
                    if (firstStory) {
                        handleSelectStory(firstStory.id)
                    }
                }
            } else {
                setError(res.error || 'Failed to load project structure')
                console.error('Failed to load project structure:', res.error)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
            console.error('Unexpected error loading project structure:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [projectId])

    // Find selected story object
    const selectedStory: StorySimple | null = selectedStoryId
        ? milestones.flatMap(m => m.stories).find(s => s.id === selectedStoryId) || null
        : null

    const handleSelectStory = (id: string) => {
        setSelectedStoryId(id)
        // Update URL without reload
        const params = new URLSearchParams(searchParams.toString())
        params.set('storyId', id)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    if (isLoading && milestones.length === 0) {
        return <div className="p-12 flex justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Project Structure...</div>
    }

    if (error) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-red-500 gap-4">
                <p>Unable to load project structure.</p>
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-280px)] min-h-[600px] border rounded-lg shadow-sm overflow-hidden bg-white">
            {/* Left Panel (40%) */}
            <div className="w-[40%] min-w-[320px] max-w-[450px] border-r border-slate-200">
                <MilestoneStoryTree
                    milestones={milestones}
                    selectedStoryId={selectedStoryId}
                    onSelectStory={handleSelectStory}
                    onAddStory={() => setIsAddStoryOpen(true)}
                />
            </div>

            {/* Right Panel (60%) */}
            <div className="flex-1 min-w-0 bg-slate-50/50">
                <RightPanel
                    projectId={projectId}
                    selectedStory={selectedStory}
                    onRefreshStories={fetchData} // Reload left panel if tasks change counts
                    milestones={milestones.map(m => ({ id: m.id, name: m.name }))} // Pass simplified milestones for dropdowns
                    currentUserId={currentUserId} // Pass currentUserId to RightPanel
                />
            </div>

            {/* Modals */}
            <StoryModal
                isOpen={isAddStoryOpen}
                onClose={() => setIsAddStoryOpen(false)}
                projectId={projectId}
                milestones={milestones.map(m => ({ id: m.id, name: m.name }))} // Map to match props
                onSuccess={fetchData}
                mode="create"
            />
        </div>
    )
}
