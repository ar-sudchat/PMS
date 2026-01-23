'use client'

import { cn } from '@/lib/utils'
import {
    FileText,
    UserCheck,
    Phone,
    Users,
    Calculator,
    CheckCircle,
    ChevronRight,
    SkipForward,
    FolderPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Icon mapping
const iconMap: Record<string, any> = {
    FileText,
    UserCheck,
    Phone,
    Users,
    Calculator,
    CheckCircle
}

// Color mapping
const colorMap: Record<string, { bg: string, border: string, text: string, ring: string }> = {
    slate: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', ring: 'ring-slate-400' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-600', ring: 'ring-blue-400' },
    cyan: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-600', ring: 'ring-cyan-400' },
    violet: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-600', ring: 'ring-violet-400' },
    amber: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-600', ring: 'ring-amber-400' },
    green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-600', ring: 'ring-green-400' },
}

export interface WorkflowStep {
    step_order: number
    step_code: string
    step_name: string
    description?: string
    icon?: string
    color?: string
    is_required: boolean
    can_skip: boolean
    can_complete_early: boolean
}

interface WorkflowStepProgressProps {
    steps: WorkflowStep[]
    currentStep: number
    workflowStatus: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    onNextStep?: () => void
    onSkipStep?: () => void
    onCompleteEarly?: () => void
    isLoading?: boolean
    canEdit?: boolean
    compact?: boolean // แสดงแบบกระชับ ไม่มีปุ่มด้านล่าง
}

// Simple hover tooltip component
function StepTooltip({ children, step }: { children: React.ReactNode, step: WorkflowStep }) {
    return (
        <div className="group relative">
            {children}
            <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white rounded-lg shadow-lg text-xs">
                <p className="font-semibold">{step.step_name}</p>
                {step.description && (
                    <p className="text-slate-300 mt-1">{step.description}</p>
                )}
                <div className="mt-2 space-y-1">
                    {step.can_skip && (
                        <p className="text-amber-400">• ข้ามได้</p>
                    )}
                    {step.can_complete_early && (
                        <p className="text-green-400">• เปิดโครงการได้จาก step นี้</p>
                    )}
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
        </div>
    )
}

export function WorkflowStepProgress({
    steps,
    currentStep,
    workflowStatus,
    onNextStep,
    onSkipStep,
    onCompleteEarly,
    isLoading = false,
    canEdit = false,
    compact = false
}: WorkflowStepProgressProps) {
    const currentStepDef = steps.find(s => s.step_order === currentStep)
    const isCompleted = workflowStatus === 'COMPLETED'
    const isCancelled = workflowStatus === 'CANCELLED'

    return (
        <div className="space-y-4">
            {/* Step Progress Bar */}
            <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200" />
                <div
                    className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step) => {
                        const Icon = iconMap[step.icon || 'FileText'] || FileText
                        const colors = colorMap[step.color || 'slate'] || colorMap.slate
                        const isPast = step.step_order < currentStep
                        const isCurrent = step.step_order === currentStep
                        const isFuture = step.step_order > currentStep

                        return (
                            <StepTooltip key={step.step_order} step={step}>
                                <div className="flex flex-col items-center cursor-pointer">
                                    {/* Step Circle */}
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                            isPast && 'bg-primary border-primary text-white',
                                            isCurrent && !isCompleted && `${colors.bg} ${colors.border} ${colors.text} ring-2 ${colors.ring} ring-offset-2`,
                                            isCurrent && isCompleted && 'bg-green-500 border-green-500 text-white',
                                            isFuture && 'bg-white border-slate-200 text-slate-400'
                                        )}
                                    >
                                        {isPast || (isCurrent && isCompleted) ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </div>

                                    {/* Step Label */}
                                    <div className="mt-2 text-center">
                                        <p className={cn(
                                            'text-xs font-medium max-w-[80px] truncate',
                                            isPast && 'text-slate-600',
                                            isCurrent && 'text-slate-900 font-semibold',
                                            isFuture && 'text-slate-400'
                                        )}>
                                            {step.step_name}
                                        </p>
                                        {!step.is_required && (
                                            <span className="text-[10px] text-slate-400">(ไม่บังคับ)</span>
                                        )}
                                    </div>
                                </div>
                            </StepTooltip>
                        )
                    })}
                </div>
            </div>

            {/* Action Buttons - แสดงเฉพาะเมื่อไม่ใช่ compact mode */}
            {!compact && canEdit && !isCompleted && !isCancelled && currentStepDef && (
                <div className="flex items-center justify-center gap-3 pt-4 border-t">
                    {/* Next Step Button */}
                    {currentStep < steps.length && (
                        <Button
                            size="sm"
                            onClick={onNextStep}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <ChevronRight className="w-4 h-4" />
                            ขั้นตอนถัดไป
                        </Button>
                    )}

                    {/* Skip Button */}
                    {currentStepDef.can_skip && currentStep < steps.length && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onSkipStep}
                            disabled={isLoading}
                            className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                            <SkipForward className="w-4 h-4" />
                            ข้าม
                        </Button>
                    )}

                    {/* Complete Early / Open Project Button */}
                    {currentStepDef.can_complete_early && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onCompleteEarly}
                            disabled={isLoading}
                            className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
                        >
                            <FolderPlus className="w-4 h-4" />
                            เปิดโครงการ
                        </Button>
                    )}
                </div>
            )}

            {/* Status Badge */}
            {(isCompleted || isCancelled) && (
                <div className="flex justify-center pt-2">
                    <span className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        isCompleted && 'bg-green-100 text-green-700',
                        isCancelled && 'bg-red-100 text-red-700'
                    )}>
                        {isCompleted ? '✓ ดำเนินการเสร็จสิ้น' : '✗ ยกเลิก'}
                    </span>
                </div>
            )}
        </div>
    )
}

// Compact action buttons component สำหรับแสดงใน header
interface WorkflowActionButtonsProps {
    currentStepDef: WorkflowStep | undefined
    currentStep: number
    totalSteps: number
    workflowStatus: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    onNextStep?: () => void
    onSkipStep?: () => void
    onCompleteEarly?: () => void
    isLoading?: boolean
    canEdit?: boolean
}

export function WorkflowActionButtons({
    currentStepDef,
    currentStep,
    totalSteps,
    workflowStatus,
    onNextStep,
    onSkipStep,
    onCompleteEarly,
    isLoading = false,
    canEdit = false
}: WorkflowActionButtonsProps) {
    const isCompleted = workflowStatus === 'COMPLETED'
    const isCancelled = workflowStatus === 'CANCELLED'

    if (!canEdit || isCompleted || isCancelled || !currentStepDef) {
        return null
    }

    return (
        <div className="flex items-center gap-2">
            {/* Next Step Button */}
            {currentStep < totalSteps && (
                <Button
                    size="sm"
                    onClick={onNextStep}
                    disabled={isLoading}
                    className="gap-1.5 h-8 text-xs"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                    ถัดไป
                </Button>
            )}

            {/* Skip Button */}
            {currentStepDef.can_skip && currentStep < totalSteps && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onSkipStep}
                    disabled={isLoading}
                    className="gap-1.5 h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                    <SkipForward className="w-3.5 h-3.5" />
                    ข้าม
                </Button>
            )}

            {/* Complete Early / Open Project Button */}
            {currentStepDef.can_complete_early && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCompleteEarly}
                    disabled={isLoading}
                    className="gap-1.5 h-8 text-xs text-green-600 border-green-300 hover:bg-green-50"
                >
                    <FolderPlus className="w-3.5 h-3.5" />
                    เปิดโครงการ
                </Button>
            )}
        </div>
    )
}
