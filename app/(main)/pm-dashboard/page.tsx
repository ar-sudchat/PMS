import { getProjectsHealthOverview } from '@/lib/actions/dashboard-actions'
import { ProjectHealthDashboardClient } from './ProjectHealthDashboardClient'

export default async function ProjectHealthPage() {
    const currentYear = new Date().getFullYear()
    const { summary, projects, oee } = await getProjectsHealthOverview({ year: currentYear })

    return (
        <ProjectHealthDashboardClient
            initialSummary={summary}
            initialProjects={projects}
            initialOee={oee}
            currentYear={currentYear}
        />
    )
}
