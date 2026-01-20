'use client'

import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { getProjectRequestDetailForSheet } from '@/lib/actions/project-request-actions'
import { ApprovalFlowSteps } from '@/components/approval/ApprovalFlowSteps'
import { ProjectRequestDetail } from '@/components/project-requests/ProjectRequestDetail'
import { ProjectRequestAttachments } from '@/components/project-requests/ProjectRequestAttachments'
import { ProjectRequestHistory } from '@/components/project-requests/ProjectRequestHistory'
import { ProjectRequestActions } from '@/components/project-requests/ProjectRequestActions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjectRequestDetailSheetProps {
    requestId: string | null
    isOpen: boolean
    onClose: () => void
    currentUserId: string
}

export function ProjectRequestDetailSheet({
    requestId,
    isOpen,
    onClose,
    currentUserId
}: ProjectRequestDetailSheetProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (requestId && isOpen) {
                setLoading(true)
                try {
                    const result = await getProjectRequestDetailForSheet(requestId)
                    setData(result)
                } catch (error) {
                    console.error('Failed to fetch request details:', error)
                } finally {
                    setLoading(false)
                }
            } else {
                setData(null)
            }
        }

        fetchData()
    }, [requestId, isOpen])

    const request = data?.request
    const history = data?.history || []
    const approvalInstance = data?.approvalInstance
    const flowSteps = data?.flowSteps || []
    const canApprove = data?.approvalInfoStatus?.canApprove || false
    const canEdit = request?.status === 'DRAFT' || request?.status === 'REVISION'

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[90vw] sm:max-w-[800px] p-0 overflow-hidden" side="right">
                <div className="h-full flex flex-col">
                    <SheetHeader className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl">
                                    {request ? request.request_code : 'รายละเอียดคำขอ'}
                                </SheetTitle>
                                <SheetDescription>
                                    {request?.title}
                                </SheetDescription>
                            </div>

                            {/* Actions Header */}
                            {request && (
                                <ProjectRequestActions
                                    request={request}
                                    currentUserId={currentUserId}
                                    canApprove={canApprove}
                                />
                            )}
                        </div>
                    </SheetHeader>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : request ? (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {/* Approval Flow */}
                                {approvalInstance && flowSteps.length > 0 && (
                                    <div className="bg-slate-50 p-4 rounded-lg border">
                                        <h3 className="text-sm font-semibold text-gray-500 mb-2">สถานะการอนุมัติ</h3>
                                        <ApprovalFlowSteps
                                            steps={flowSteps}
                                            currentStepOrder={approvalInstance.current_step_order}
                                            status={approvalInstance.status}
                                            currentApprovers={approvalInstance.current_approvers}
                                        />
                                    </div>
                                )}

                                <ProjectRequestDetail request={request} />

                                <Tabs defaultValue="attachments" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="attachments">เอกสารแนบ ({request.attachment_count || 0})</TabsTrigger>
                                        <TabsTrigger value="history">ประวัติการดำเนินการ</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="attachments" className="mt-4">
                                        <ProjectRequestAttachments
                                            requestId={request.id}
                                            canEdit={canEdit}
                                            currentUserId={currentUserId}
                                        />
                                    </TabsContent>
                                    <TabsContent value="history" className="mt-4">
                                        <ProjectRequestHistory history={history} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="p-6 text-center text-muted-foreground">
                            ไม่พบข้อมูล
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
