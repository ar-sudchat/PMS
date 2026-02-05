import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import {
    getPendingProjectRequests,
    getProjectRequestTypes,
    getProjectRequestPriorities
} from '@/lib/actions/project-request-actions'
import { getCustomers } from '@/lib/actions/customer-actions'
import { ProjectRequestList } from '@/components/project-requests/ProjectRequestList'

export const metadata = {
    title: 'Pending Requests | PM Software',
}

export default async function PendingProjectRequestsPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const [requests, customers, requestTypes, priorities] = await Promise.all([
        getPendingProjectRequests(),
        getCustomers(),
        getProjectRequestTypes(),
        getProjectRequestPriorities()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/project-requests">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">คำขอรออนุมัติ</h1>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800 mb-6">
                <p>รายการคำขอทั้งหมดที่รอการตรวจสอบและอนุมัติ (Pending Approval)</p>
            </div>

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
