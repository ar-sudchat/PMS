
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
    getProjectRequests,
    getRequestStatistics
} from '@/lib/actions/project-request-actions'
import { ProjectRequestList } from '@/components/project-requests/ProjectRequestList'
import { ProjectRequestStats } from '@/components/project-requests/ProjectRequestStats'

export const metadata = {
    title: 'Project Requests | PM Software',
}

interface PageProps {
    searchParams: {
        status?: string
        search?: string
    }
}

export default async function ProjectRequestsPage({ searchParams }: PageProps) {
    // Fetch data in parallel
    const statsPromise = getRequestStatistics()
    const requestsPromise = getProjectRequests({
        status: searchParams.status,
        search: searchParams.search
    })

    const [stats, requests] = await Promise.all([
        statsPromise,
        requestsPromise
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Project Requests</h1>
                <Link href="/project-requests/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        สร้างคำขอใหม่
                    </Button>
                </Link>
            </div>

            <ProjectRequestStats stats={stats} />

            <Suspense fallback={<div>Loading...</div>}>
                <ProjectRequestList requests={requests} />
            </Suspense>
        </div>
    )
}
