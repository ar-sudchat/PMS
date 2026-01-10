import { getProjectDetail } from '@/lib/actions/project-detail-actions'
import { getGanttData } from '@/lib/actions/gantt-actions'
import { ProjectGanttPage } from '@/components/projects/detail/ProjectGanttPage'
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

interface Props {
    params: { projectId: string }
    searchParams: { tab?: string }
}

export default async function ProjectDetailRoute(props: { params: Promise<{ projectId: string }>, searchParams: Promise<{ tab?: string }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    const [currentUser, projectResult, ganttResult] = await Promise.all([
        getCurrentUser(),
        getProjectDetail(params.projectId),
        getGanttData({}) // Get all data, will be filtered in component
    ])

    if (!currentUser) {
        redirect('/login')
    }

    if (!projectResult.success) {
        if (projectResult.error === 'Unauthorized') {
            redirect('/login')
        }
        notFound()
    }

    if (!projectResult.data) {
        notFound()
    }

    return (
        <ProjectGanttPage
            project={projectResult.data}
            ganttData={ganttResult.data}
            currentUser={currentUser}
            activeTab={searchParams.tab || 'gantt'}
        />
    )
}
