import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { MandayMonitorClient } from './MandayMonitorClient'
import {
    getMandayDashboardData,
    getProjectOptions,
    getProjectTypeOptions,
    FilterParams
} from '@/lib/actions/manday-monitor-actions'

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic'

export default async function MandayMonitorPage({
    searchParams
}: {
    searchParams: Promise<{
        period?: string
        year?: string
        month?: string
        quarter?: string
        project?: string
        projectType?: string
    }>
}) {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    // Await searchParams in Next.js 15+
    const params = await searchParams
    const now = new Date()

    const filters: FilterParams = {
        periodType: (params.period || 'quarter') as FilterParams['periodType'],
        year: parseInt(params.year || now.getFullYear().toString()),
        month: params.month ? parseInt(params.month) : now.getMonth() + 1,
        quarter: params.quarter ? parseInt(params.quarter) : Math.ceil((now.getMonth() + 1) / 3),
        projectId: params.project || undefined,
        projectTypeCode: params.projectType || undefined
    }

    // Fetch all data in parallel
    const [dashboardData, projectOptions, projectTypeOptions] = await Promise.all([
        getMandayDashboardData(filters),
        getProjectOptions(),
        getProjectTypeOptions()
    ])

    return (
        <div className="p-4 md:p-6">
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }>
                <MandayMonitorClient
                    initialData={dashboardData}
                    filters={filters}
                    projectOptions={projectOptions.data || []}
                    projectTypeOptions={projectTypeOptions.data || []}
                />
            </Suspense>
        </div>
    )
}
