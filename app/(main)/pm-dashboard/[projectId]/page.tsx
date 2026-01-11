import { getProjectHealthDetail } from '@/lib/actions/dashboard-actions'
import { ProjectHealthDetailClient } from './ProjectHealthDetailClient'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ projectId: string }>
}

export default async function ProjectHealthDetailPage({ params }: PageProps) {
    const { projectId } = await params
    const result = await getProjectHealthDetail(projectId)

    if (!result.success || !result.project) {
        notFound()
    }

    return (
        <ProjectHealthDetailClient
            project={result.project}
            overallHealth={result.overallHealth!}
            milestones={result.milestones || []}
        />
    )
}
