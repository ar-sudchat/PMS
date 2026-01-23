
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
    getProjectRequestById,
    getRequestHistory
} from '@/lib/actions/project-request-actions'
import {
    getApprovalInstanceByDocumentId,
    getApprovalInstance,
    getFlowTemplate,
    getFlowSteps
} from '@/lib/services/approval-service'
import { ProjectRequestDetail } from '@/components/project-requests/ProjectRequestDetail'
import { ProjectRequestAttachments } from '@/components/project-requests/ProjectRequestAttachments'
import { ProjectRequestHistory } from '@/components/project-requests/ProjectRequestHistory'
import { ProjectRequestActions } from '@/components/project-requests/ProjectRequestActions'
import { ApprovalFlowSteps } from '@/components/approval/ApprovalFlowSteps'

interface PageProps {
    params: {
        id: string
    }
}

export default async function ProjectRequestDetailPage({ params }: PageProps) {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    const { id } = await params
    const [request, history, approvalInfoStatus] = await Promise.all([
        getProjectRequestById(id),
        getRequestHistory(id),
        getApprovalInstanceByDocumentId(id, 'PROJECT')
    ])

    let approvalInstance = null
    let flowSteps: any[] = []

    if (approvalInfoStatus.instanceId) {
        const [instance, steps] = await Promise.all([
            getApprovalInstance(approvalInfoStatus.instanceId),
            getFlowTemplate('PROJECT_REQUEST').then(t => t ? getFlowSteps(t.id) : [])
        ])
        approvalInstance = instance
        flowSteps = steps
    }

    if (!request) {
        notFound()
    }

    const canEdit = request.status === 'DRAFT' || request.status === 'REVISION'
    const canApprove = approvalInfoStatus.canApprove || false

    return (
        <div className="space-y-6 pb-12">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/project-requests">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {request.request_code}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Actions (Approve/Reject/Convert) */}
                    <ProjectRequestActions
                        request={request}
                        currentUserId={user.id}
                        canApprove={canApprove}
                    />

                    {/* Edit Button */}
                    {canEdit && (
                        <Link href={`/project-requests/${id}/edit`}>
                            <Button variant="outline">
                                <Edit className="h-4 w-4 mr-2" />

                                แก้ไข
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Approval Flow Steps */}
            {approvalInstance && flowSteps.length > 0 && (
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Approval Status</h3>
                    <ApprovalFlowSteps
                        steps={flowSteps}
                        currentStepOrder={approvalInstance.current_step_order}
                        status={approvalInstance.status}
                        currentApprovers={approvalInstance.current_approvers}
                    />
                </div>
            )}

            {/* Details */}
            <ProjectRequestDetail request={request} />

            {/* Attachments & History Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <ProjectRequestAttachments
                        requestId={request.id}
                        canEdit={canEdit}
                        currentUserId={user.id}
                    />
                </div>

                <div className="space-y-6">
                    <ProjectRequestHistory history={history} />
                </div>
            </div>
        </div>
    )
}
