'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getProjectRequestDetailForSheet } from '@/lib/actions/project-request-actions'
import { ApprovalFlowSteps } from '@/components/approval/ApprovalFlowSteps'
import { ProjectRequestForm } from '@/components/project-requests/ProjectRequestForm'
import { ProjectRequestAttachments } from '@/components/project-requests/ProjectRequestAttachments'
import { ProjectRequestHistory } from '@/components/project-requests/ProjectRequestHistory'
import { ProjectRequestDialogFooter } from '@/components/project-requests/ProjectRequestDialogFooter'
import { WorkflowStepProgress } from '@/components/project-requests/WorkflowStepProgress'
import { WorkflowStepHistory } from '@/components/project-requests/WorkflowStepHistory'
import type { WorkflowStep } from '@/components/project-requests/WorkflowStepProgress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    getWorkflowStepsForRequest
} from '@/lib/actions/project-request-actions'
import { useAlert } from '@/components/ui/central-alert'

interface ProjectRequestDetailDialogProps {
    requestId: string | null
    isOpen: boolean
    onClose: () => void
    currentUserId: string
    customers: any[]
    requestTypes: any[]
    priorities: any[]
    onUpdateSuccess?: () => void
}

export function ProjectRequestDetailDialog({
    requestId,
    isOpen,
    onClose,
    currentUserId,
    customers,
    requestTypes,
    priorities,
    onUpdateSuccess
}: ProjectRequestDetailDialogProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const alert = useAlert()

    // Refs to store form action functions
    const saveRef = useRef<(() => Promise<void>) | null>(null)
    const submitRef = useRef<(() => Promise<void>) | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (requestId && isOpen) {
                setLoading(true)
                try {
                    const result = await getProjectRequestDetailForSheet(requestId)
                    setData(result)

                    // Fetch workflow steps if request exists
                    if (result?.request?.workflow_template_id) {
                        const steps = await getWorkflowStepsForRequest(requestId)
                        setWorkflowSteps(steps)
                    }
                } catch (error) {
                    console.error('Failed to fetch request details:', error)
                } finally {
                    setLoading(false)
                }
            } else {
                setData(null)
                setWorkflowSteps([])
            }
        }

        fetchData()
    }, [requestId, isOpen])

    // Handlers for form actions
    const handleSave = useCallback(async () => {
        if (saveRef.current) {
            await saveRef.current()
        }
    }, [])

    const handleSaveAndSubmit = useCallback(async () => {
        if (submitRef.current) {
            await submitRef.current()
        }
    }, [])

    const handleLoadingChange = useCallback((saving: boolean, submitting: boolean) => {
        setIsSaving(saving)
        setIsSubmitting(submitting)
    }, [])

    // Refresh data after footer actions
    const handleUpdateSuccess = useCallback(async () => {
        if (requestId) {
            const newData = await getProjectRequestDetailForSheet(requestId)
            setData(newData)
            if (newData?.request?.workflow_template_id) {
                const steps = await getWorkflowStepsForRequest(requestId)
                setWorkflowSteps(steps)
            }
        }
        if (onUpdateSuccess) onUpdateSuccess()
    }, [requestId, onUpdateSuccess])

    const request = data?.request
    const history = data?.history || []
    const approvalInstance = data?.approvalInstance
    const flowSteps = data?.flowSteps || []
    const canApprove = data?.approvalInfoStatus?.canApprove || false
    // Edit mode if existing request is DRAFT/REVISION. Create mode (no request) is always editable.
    const canEdit = !request || request.status === 'DRAFT' || request.status === 'REVISION' || request.status === 'PENDING'
    const isCreateMode = !requestId

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[1000px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border-none shadow-2xl">
                {/* Header Section */}
                <DialogHeader className="px-8 py-6 border-b bg-white relative z-10 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {isCreateMode ? 'สร้างคำขอโครงการใหม่' : (request ? request.request_code : 'รายละเอียดคำขอ')}
                                </DialogTitle>
                                {request && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border
                                        ${request.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                            request.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {request.status}
                                    </span>
                                )}
                            </div>
{isCreateMode && (
                                <DialogDescription className="text-base text-slate-500 max-w-[600px]">
                                    กรอกรายละเอียดเพื่อสร้างคำขอโครงการใหม่
                                </DialogDescription>
                            )}

                            {/* Converted Project Link */}
                            {request?.converted_project_id && (
                                <div className="mt-3 flex items-center gap-3 text-sm bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 rounded-lg border border-green-200 w-fit shadow-sm">
                                    <span className="font-medium text-slate-600">แปลงเป็นโครงการแล้ว:</span>
                                    <Link
                                        href={`/projects?search=${request.converted_project_code}`}
                                        className="font-bold text-green-700 hover:text-green-900 flex items-center gap-2 transition-colors"
                                    >
                                        <span className="font-mono text-base bg-white px-2 py-0.5 rounded border border-green-300">
                                            {request.converted_project_code}
                                        </span>
                                        <span className="max-w-[300px] truncate">
                                            {request.converted_project_name}
                                        </span>
                                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-9 w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                        <p className="text-muted-foreground text-sm font-medium">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : (
                    <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                        {/* Workflow Step Progress - แสดงด้านบนสุดก่อน tabs (compact mode - ปุ่มอยู่ที่ footer) */}
                        {!isCreateMode && request && workflowSteps.length > 0 && (
                            <div className="px-6 py-4 bg-slate-50/50 border-b shrink-0">
                                <WorkflowStepProgress
                                    steps={workflowSteps}
                                    currentStep={request.current_step || 1}
                                    workflowStatus={request.workflow_status || 'DRAFT'}
                                    compact={true}
                                />
                            </div>
                        )}

                        {/* Tabs Navigation - Hide in Create Mode */}
                        {!isCreateMode && (
                            <div className="px-6 border-b bg-white relative z-10 shrink-0">
                                <TabsList className="h-auto p-0 bg-transparent gap-6">
                                    <TabsTrigger
                                        value="details"
                                        className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                                    >
                                        รายละเอียด
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="attachments"
                                        className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                                    >
                                        เอกสารแนบ ({request?.attachment_count || 0})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                                    >
                                        ประวัติการดำเนินการ
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        )}

                        <ScrollArea className="flex-1 bg-white">
                            <div className="p-6 max-w-5xl mx-auto min-h-[400px]">
                                <TabsContent value="details" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
                                    {/* Approval Flow Section */}
                                    {!isCreateMode && approvalInstance && flowSteps.length > 0 && (
                                        <section>
                                            <div className="mb-4 flex items-center gap-2">
                                                <div className="h-4 w-1 bg-blue-500 rounded-full" />
                                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                                    สถานะการอนุมัติ (Approval Workflow)
                                                </h3>
                                            </div>
                                            <ApprovalFlowSteps
                                                steps={flowSteps}
                                                currentStepOrder={approvalInstance.current_step_order}
                                                status={approvalInstance.status}
                                                currentApprovers={approvalInstance.current_approvers}
                                            />
                                            <div className="my-6 border-b border-slate-100" />
                                        </section>
                                    )}

                                    {/* Main Form Section */}
                                    <section>
                                        <ProjectRequestForm
                                            request={request}
                                            customers={customers}
                                            requestTypes={requestTypes}
                                            priorities={priorities}
                                            currentUserId={currentUserId}
                                            hideActions={true}
                                            onSaveRef={(fn) => { saveRef.current = fn }}
                                            onSubmitRef={(fn) => { submitRef.current = fn }}
                                            onLoadingChange={handleLoadingChange}
                                            onSuccess={() => {
                                                handleUpdateSuccess()
                                            }}
                                        />
                                    </section>
                                </TabsContent>

                                <TabsContent value="attachments" className="mt-0 animate-in fade-in-50 duration-300">
                                    {request && (
                                        <ProjectRequestAttachments
                                            requestId={request.id}
                                            canEdit={canEdit}
                                            currentUserId={currentUserId}
                                        />
                                    )}
                                </TabsContent>

                                <TabsContent value="history" className="mt-0 animate-in fade-in-50 duration-300 space-y-8">
                                    {/* Workflow Step History */}
                                    {request && (
                                        <section>
                                            <div className="mb-4 flex items-center gap-2">
                                                <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                                    ประวัติขั้นตอน Workflow
                                                </h3>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-lg p-4 border">
                                                <WorkflowStepHistory requestId={request.id} />
                                            </div>
                                        </section>
                                    )}

                                    {/* Request History */}
                                    <section>
                                        <div className="mb-4 flex items-center gap-2">
                                            <div className="h-4 w-1 bg-slate-500 rounded-full" />
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                                ประวัติการเปลี่ยนแปลงสถานะ
                                            </h3>
                                        </div>
                                        <ProjectRequestHistory history={history} />
                                    </section>
                                </TabsContent>
                            </div>
                        </ScrollArea>

                        {/* Footer with all action buttons */}
                        <ProjectRequestDialogFooter
                            request={request}
                            currentUserId={currentUserId}
                            workflowSteps={workflowSteps}
                            isCreateMode={isCreateMode}
                            isSaving={isSaving}
                            isSubmitting={isSubmitting}
                            onSave={handleSave}
                            onSaveAndSubmit={handleSaveAndSubmit}
                            onClose={onClose}
                            onUpdateSuccess={handleUpdateSuccess}
                        />
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    )
}
