import { getTrackingProjects, getTrackingFilterOptions } from '@/lib/actions/tracking-dashboard-actions'
import { TrackingDashboardClient } from '@/components/tracking/TrackingDashboardClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TrackingPage() {
    const currentYear = new Date().getFullYear()

    const [projects, filterOptions] = await Promise.all([
        getTrackingProjects({ year: currentYear }),
        getTrackingFilterOptions()
    ])

    return (
        <TrackingDashboardClient
            initialProjects={projects}
            filterOptions={filterOptions}
            currentYear={currentYear}
        />
    )
}
