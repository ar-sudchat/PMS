import { getMilestoneHealthDetail } from '@/lib/actions/dashboard-actions'
import { MilestoneHealthDetailClient } from './MilestoneHealthDetailClient'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ projectId: string; milestoneId: string }>
}

export default async function MilestoneHealthDetailPage({ params }: PageProps) {
    const { projectId, milestoneId } = await params
    const result = await getMilestoneHealthDetail(milestoneId)

    if (!result.success || !result.milestone) {
        notFound()
    }

    return (
        <MilestoneHealthDetailClient
            projectId={projectId}
            milestone={result.milestone}
            health={result.health}
            tasks={result.tasks || []}
            deliverables={result.deliverables || []}
            resources={result.resources || []}
        />
    )
}
