'use client'

import { cn } from '@/lib/utils'
import { Check, Clock, Circle, User, XCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ApprovalFlowStepsProps {
    steps: any[]
    currentStepOrder: number
    status: string
    currentApprovers?: any[]
}

export function ApprovalFlowSteps({
    steps,
    currentStepOrder,
    status,
    currentApprovers = []
}: ApprovalFlowStepsProps) {
    // Sort steps by order
    const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order)

    // Determine overall flow state
    const isRejected = status === 'REJECTED'
    const isApproved = status === 'APPROVED'

    // Helper function to determine step status
    const getStepStatus = (step: any) => {
        if (isRejected && step.step_order === currentStepOrder) {
            return 'rejected'
        }
        if (isApproved || step.step_order < currentStepOrder) {
            return 'completed'
        }
        if (step.step_order === currentStepOrder) {
            return 'current'
        }
        return 'pending'
    }

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div className="flex items-start min-w-max px-4 space-x-4">
                {sortedSteps.map((step, index) => {
                    const stepStatus = getStepStatus(step)
                    const isCurrent = stepStatus === 'current'
                    const isCompleted = stepStatus === 'completed'
                    // const isRejected = stepStatus === 'rejected' // Available if needed

                    return (
                        <div key={step.step_order} className="flex flex-col items-center relative group min-w-[120px]">
                            {/* Step Indicator */}
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full border-4 transition-all duration-200 bg-white z-10 mb-2",
                                isCompleted ? "border-emerald-500 text-emerald-500" :
                                    isCurrent ? "border-blue-500 text-blue-500 scale-110 shadow-lg shadow-blue-100" :
                                        stepStatus === 'rejected' ? "border-red-500 text-red-500 scale-110" :
                                            "border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? (
                                    <Check className="w-5 h-5 stroke-[3]" />
                                ) : isCurrent ? (
                                    <Clock className="w-5 h-5 animate-pulse" />
                                ) : stepStatus === 'rejected' ? (
                                    <XCircle className="w-5 h-5" />
                                ) : (
                                    <span className="text-sm font-bold">{step.step_order}</span>
                                )}
                            </div>

                            {/* Connecting Line (except last) */}
                            {index < sortedSteps.length - 1 && (
                                <div className={cn(
                                    "absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-1 -z-0",
                                    isCompleted && getStepStatus(sortedSteps[index + 1]) !== 'pending'
                                        ? "bg-emerald-500"
                                        : "bg-slate-100"
                                )} />
                            )}

                            {/* Step Title */}
                            <div className={cn(
                                "text-xs font-semibold px-2 py-1 rounded text-center max-w-[140px] leading-tight",
                                isCurrent ? "text-blue-700 bg-blue-50" :
                                    isCompleted ? "text-emerald-700" :
                                        stepStatus === 'rejected' ? "text-red-700 bg-red-50" :
                                            "text-slate-500"
                            )}>
                                {step.step_name}
                            </div>

                            {/* Current Approver Info (Only for current step) */}
                            {isCurrent && currentApprovers.length > 0 && (
                                <div className="mt-2 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-500">
                                    <span className="text-[10px] text-slate-400 mb-1 font-medium bg-white px-1">
                                        Waiting for
                                    </span>
                                    <div className="flex -space-x-2">
                                        {currentApprovers.map((approver, i) => (
                                            <Tooltip
                                                key={approver.id || i}
                                                content={
                                                    <div className="text-xs">
                                                        <p className="font-semibold">{approver.approver_name}</p>
                                                        <p className="text-slate-400">{approver.email}</p>
                                                    </div>
                                                }
                                                side="bottom"
                                            >
                                                <div className="cursor-help">
                                                    <Avatar className="w-8 h-8 border-2 border-white shadow-sm ring-2 ring-blue-100">
                                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                                                            {approver.approver_name?.substring(0, 2).toUpperCase() || '??'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
