import { getProjectStatusOverview, getStatusOverviewFilterOptions } from '@/lib/actions/project-status-overview-actions'
import { ProjectStatusOverviewClient } from '@/components/project-status-overview/ProjectStatusOverviewClient'

export default async function ProjectStatusOverviewPage() {
    const currentYear = new Date().getFullYear()

    const [data, filterOpts] = await Promise.all([
        getProjectStatusOverview({ year: currentYear }),
        getStatusOverviewFilterOptions()
    ])

    return (
        <ProjectStatusOverviewClient
            initialData={data}
            filterOptions={filterOpts.data}
            currentYear={currentYear}
        />
    )
}
