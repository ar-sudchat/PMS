import { getProjectControlTowerData } from '@/lib/actions/dashboard-actions'
import { ProjectHealthDetailClient } from './ProjectHealthDetailClient'
import { notFound } from 'next/navigation'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ControlTowerPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams
    const id = resolvedSearchParams.id

    if (!id || typeof id !== 'string') {
        console.log('Control Tower 404: Invalid or missing ID', id)
        notFound()
    }

    const result = await getProjectControlTowerData(id)

    if (!result.success || !result.project) {
        console.log('Control Tower 404: Project not found or error', result.error, id)
        notFound()
    }

    return (
        <ProjectHealthDetailClient
            project={result.project}
            overallHealth={result.overallHealth!}
            milestones={result.milestones || []}
            activeTasks={result.activeTasks || []}
            currentDeliverables={result.currentDeliverables || []}
            recentActivities={result.recentActivities || []}
        />
    )
}
