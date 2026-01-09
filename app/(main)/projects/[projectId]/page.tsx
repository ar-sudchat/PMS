import { getProjectDetail } from '@/lib/actions/project-detail-actions'
import { getProjectGanttData } from '@/lib/actions/gantt-actions'
import { ProjectGanttPage } from '@/components/projects/detail/ProjectGanttPage'
import { redirect, notFound } from 'next/navigation'

interface Props {
    params: { projectId: string }
}

export default async function ProjectDetailRoute({ params }: Props) {
    const [projectResult, ganttResult] = await Promise.all([
        getProjectDetail(params.projectId),
        getProjectGanttData(params.projectId)
    ])

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
        />
    )
}
