import { Suspense } from 'react'
import { ProjectOwnerDashboardClient } from './ProjectOwnerDashboardClient'
import {
    getOwnerDashboardDataWithFilters,
    getOwnerOptions,
    getProjectTypeOptions,
    getProjectStatusOptions
} from '@/lib/actions/project-owner-dashboard-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export const metadata = {
    title: 'My Projects Dashboard | PMS',
    description: 'Project Owner Dashboard - Track your project progress'
}

function LoadingSkeleton() {
    return (
        <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    )
}

export default async function ProjectOwnerDashboardPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const [dashboardData, ownerOptions, projectTypeOptions, projectStatusOptions] = await Promise.all([
        getOwnerDashboardDataWithFilters({
            ownerId: user.id,
            excludeCancelled: true
        }),
        getOwnerOptions(),
        getProjectTypeOptions(),
        getProjectStatusOptions()
    ])

    // Compute initial selected owner on server
    const currentUserLabel = user.nameTh || user.name || 'User'
    const foundOwner = ownerOptions.find(o => o.id === user.id)
    const initialSelectedOwner = foundOwner
        ? {
            value: foundOwner.id,
            label: `${foundOwner.name}${foundOwner.position_code ? ` (${foundOwner.position_code})` : ''} - ${foundOwner.project_count} โครงการ`
        }
        : {
            value: user.id,
            label: `${currentUserLabel} - 0 โครงการ`
        }

    return (
        <div className="p-6 bg-gray-50/50 min-h-screen">
            <Suspense fallback={<LoadingSkeleton />}>
                <ProjectOwnerDashboardClient
                    initialData={dashboardData}
                    ownerOptions={ownerOptions}
                    projectTypeOptions={projectTypeOptions}
                    projectStatusOptions={projectStatusOptions}
                    currentUser={{
                        id: user.id,
                        name: user.name,
                        nameTh: user.nameTh
                    }}
                    initialSelectedOwner={initialSelectedOwner}
                />
            </Suspense>
        </div>
    )
}
