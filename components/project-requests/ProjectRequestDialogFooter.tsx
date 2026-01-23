'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Loader2, Save, Send, FolderPlus,
    ChevronRight, SkipForward, CheckCircle
} from 'lucide-react'
import {
    convertToProject,
    advanceWorkflowStep,
    skipWorkflowStep,
    completeWorkflowEarly
} from '@/lib/actions/project-request-actions'
import { useAlert } from '@/components/ui/central-alert'
import { WorkflowStep } from './WorkflowStepProgress'

interface ProjectRequestDialogFooterProps {
    request: any
    currentUserId: string
    workflowSteps: WorkflowStep[]
    isCreateMode: boolean
    isSaving: boolean
    isSubmitting: boolean
    onSave: () => void
    onSaveAndSubmit: () => void
    onClose: () => void
    onUpdateSuccess: () => void
}

export function ProjectRequestDialogFooter({
    request,
    currentUserId,
    workflowSteps,
    isCreateMode,
    isSaving,
    isSubmitting,
    onSave,
    onSaveAndSubmit,
    onClose,
    onUpdateSuccess
}: ProjectRequestDialogFooterProps) {
    const router = useRouter()
    const alert = useAlert()
    const [isLoading, setIsLoading] = useState(false)

    const canEdit = !request || request.status === 'DRAFT' || request.status === 'REVISION'
    const canEditAfterApproved = request?.status === 'APPROVED' || request?.status === 'CONVERTED'
    const canConvert = request?.status === 'APPROVED' && !request?.converted_project_id

    // Workflow info
    const currentStepDef = workflowSteps.find(s => s.step_order === (request?.current_step || 1))
    const workflowCompleted = request?.workflow_status === 'COMPLETED'
    // Can edit workflow when status is PENDING or APPROVED and workflow not yet completed
    const canEditWorkflow = (request?.status === 'APPROVED' || request?.status === 'PENDING') && !workflowCompleted
    // Check if at last step
    const isLastStep = request?.current_step === workflowSteps.length

    const handleConvert = async () => {
        const confirmed = await alert.confirm('สร้าง Project', 'คุณต้องการสร้าง Project จากคำขอนี้ใช่หรือไม่?')
        if (!confirmed) return

        setIsLoading(true)
        const result = await convertToProject(request.id, currentUserId)
        if (result.success) {
            await alert.success('สร้าง Project สำเร็จ', `รหัส Project: ${result.projectCode || ''}`)
            router.refresh()
            onUpdateSuccess()
        } else {
            await alert.error('เกิดข้อผิดพลาด', result.error || 'ไม่สามารถสร้าง Project ได้')
        }
        setIsLoading(false)
    }

    const handleNextStep = async () => {
        setIsLoading(true)
        const result = await advanceWorkflowStep(request.id, currentUserId)
        if (result.success) {
            // Check if this was the last step (workflow completed)
            if (result.workflowCompleted) {
                await alert.success('สำเร็จ', 'ดำเนินการครบทุกขั้นตอนแล้ว สามารถสร้าง Project ได้')
            } else {
                await alert.success('สำเร็จ', 'ดำเนินการขั้นตอนถัดไปเรียบร้อย')
            }
            router.refresh()
            onUpdateSuccess()
        } else {
            await alert.error('ผิดพลาด', result.error || 'ไม่สามารถดำเนินการได้')
        }
        setIsLoading(false)
    }

    // Handle completing the last step (finalize workflow)
    const handleCompleteLastStep = async () => {
        setIsLoading(true)
        const result = await advanceWorkflowStep(request.id, currentUserId)
        if (result.success) {
            await alert.success('เสร็จสิ้น', 'ดำเนินการครบทุกขั้นตอนแล้ว สามารถสร้าง Project ได้')
            router.refresh()
            onUpdateSuccess()
        } else {
            await alert.error('ผิดพลาด', result.error || 'ไม่สามารถดำเนินการได้')
        }
        setIsLoading(false)
    }

    const handleSkipStep = async () => {
        const confirmed = await alert.confirm('ข้ามขั้นตอน', 'คุณต้องการข้ามขั้นตอนนี้ใช่หรือไม่?')
        if (!confirmed) return

        setIsLoading(true)
        const result = await skipWorkflowStep(request.id, currentUserId)
        if (result.success) {
            await alert.success('สำเร็จ', 'ข้ามขั้นตอนเรียบร้อย')
            router.refresh()
            onUpdateSuccess()
        } else {
            await alert.error('ผิดพลาด', result.error || 'ไม่สามารถข้ามได้')
        }
        setIsLoading(false)
    }

    const handleCompleteEarly = async () => {
        const confirmed = await alert.confirm('เปิดโครงการ', 'คุณต้องการจบ workflow และเปิดโครงการจากขั้นตอนนี้ใช่หรือไม่?')
        if (!confirmed) return

        setIsLoading(true)
        const result = await completeWorkflowEarly(request.id, currentUserId, 'เปิดโครงการก่อนครบขั้นตอน')
        if (result.success) {
            await alert.success('สำเร็จ', 'จบ workflow เรียบร้อย สามารถสร้าง Project ได้แล้ว')
            router.refresh()
            onUpdateSuccess()
        } else {
            await alert.error('ผิดพลาด', result.error || 'ไม่สามารถดำเนินการได้')
        }
        setIsLoading(false)
    }

    const isAnyLoading = isLoading || isSaving || isSubmitting

    return (
        <div className="px-6 py-4 border-t bg-slate-50/50 shrink-0">
            <div className="flex items-center justify-between gap-4">
                {/* Left side - Workflow actions */}
                <div className="flex items-center gap-2">
                    {canEditWorkflow && currentStepDef && (
                        <>
                            {/* Next Step - only show if NOT at last step */}
                            {!isLastStep && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleNextStep}
                                    disabled={isAnyLoading}
                                    className="gap-1.5"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                    ขั้นตอนถัดไป
                                </Button>
                            )}

                            {/* Complete Last Step - only show at last step */}
                            {isLastStep && (
                                <Button
                                    size="sm"
                                    onClick={handleCompleteLastStep}
                                    disabled={isAnyLoading}
                                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    เสร็จสิ้น
                                </Button>
                            )}

                            {/* Skip - only if can_skip and not at last step */}
                            {currentStepDef.can_skip && !isLastStep && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSkipStep}
                                    disabled={isAnyLoading}
                                    className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    ข้าม
                                </Button>
                            )}

                            {/* Complete Early - only if can_complete_early and not at last step */}
                            {currentStepDef.can_complete_early && !isLastStep && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCompleteEarly}
                                    disabled={isAnyLoading}
                                    className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    เปิดโครงการ
                                </Button>
                            )}
                        </>
                    )}
                </div>

                {/* Right side - Main actions */}
                <div className="flex items-center gap-2">
                    {/* Create/Edit mode - Save & Submit buttons */}
                    {(isCreateMode || canEdit) && (
                        <>
                            <Button
                                variant="outline"
                                onClick={onSave}
                                disabled={isAnyLoading}
                                className="gap-1.5"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                บันทึก
                            </Button>
                            <Button
                                onClick={onSaveAndSubmit}
                                disabled={isAnyLoading}
                                className="gap-1.5"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                ส่งดำเนินการ
                            </Button>
                        </>
                    )}

                    {/* Approved/Pending mode - Save button for dates only */}
                    {canEditAfterApproved && !canEdit && (
                        <Button
                            onClick={onSave}
                            disabled={isAnyLoading}
                            className="gap-1.5"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            บันทึก
                        </Button>
                    )}

                    {/* Convert to Project - show when workflow completed */}
                    {canConvert && workflowCompleted && (
                        <Button
                            onClick={handleConvert}
                            disabled={isAnyLoading}
                            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                            สร้าง Project
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
