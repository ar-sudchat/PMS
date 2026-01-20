import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
    getProjectRequests,
    getRequestStatistics,
    getProjectRequestTypes,
    getProjectRequestPriorities
} from '@/lib/actions/project-request-actions'
import { getCustomers } from '@/lib/actions/customer-actions'
import { ProjectRequestList } from '@/components/project-requests/ProjectRequestList'
import { ProjectRequestStats } from '@/components/project-requests/ProjectRequestStats'

export const metadata = {
    title: 'Project Requests | PM Software',
}

interface PageProps {
    searchParams: Promise<{
        status?: string
        search?: string
    }>
}

export default async function ProjectRequestsPage(props: PageProps) {
    const searchParams = await props.searchParams
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch data in parallel
    const [stats, requests, customers, requestTypes, priorities] = await Promise.all([
        getRequestStatistics(),
        getProjectRequests({
            status: searchParams.status,
            search: searchParams.search
        }),
        getCustomers(),
        getProjectRequestTypes(),
        getProjectRequestPriorities()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Project Requests</h1>
            </div>

            <ProjectRequestStats stats={stats} />

            <Suspense fallback={<div>Loading...</div>}>
                <ProjectRequestList
                    requests={requests}
                    customers={customers}
                    requestTypes={requestTypes}
                    priorities={priorities}
                    currentUserId={user.id}
                />
            </Suspense>
        </div>
    )
}
