import { getProjectTrackingData } from '@/lib/actions/tracking-actions'
import { ProjectTrackingClient } from '@/components/tracking/ProjectTrackingClient'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ projectId: string }>
}

export default async function ProjectTrackingPage({ params }: PageProps) {
    const { projectId } = await params

    const result = await getProjectTrackingData(projectId)

    if (!result.success || !result.data) {
        notFound()
    }

    return <ProjectTrackingClient data={result.data} />
}

export async function generateMetadata({ params }: PageProps) {
    const { projectId } = await params
    const result = await getProjectTrackingData(projectId)

    if (!result.success || !result.data) {
        return { title: 'Project Not Found' }
    }

    return {
        title: `${result.data.project.code} - Project Tracking`,
        description: `Track project ${result.data.project.name} status and milestones`
    }
}
