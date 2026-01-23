
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
    getProjectRequestById,
    getProjectRequestTypes,
    getProjectRequestPriorities
} from '@/lib/actions/project-request-actions'
import { getCustomers } from '@/lib/actions/customer-actions'
import { ProjectRequestForm } from '@/components/project-requests/ProjectRequestForm'

interface PageProps {
    params: {
        id: string
    }
}

export default async function EditProjectRequestPage({ params }: PageProps) {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const { id } = await params

    const [request, customers, requestTypes, priorities] = await Promise.all([
        getProjectRequestById(id),
        getCustomers(),
        getProjectRequestTypes(),
        getProjectRequestPriorities()
    ])

    if (!request) {
        notFound()
    }

    // Check if editable
    if (request.status !== 'DRAFT' && request.status !== 'REVISION') {
        redirect(`/project-requests/${id}`)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/project-requests/${id}`}>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">แก้ไขคำขอโครงการ</h1>
                    <p className="text-muted-foreground">{request.request_code}</p>
                </div>
            </div>

            <ProjectRequestForm
                request={request}
                customers={customers}
                requestTypes={requestTypes}
                priorities={priorities}
                currentUserId={user.id}
            />
        </div>
    )
}
