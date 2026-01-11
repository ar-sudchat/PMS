'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, CheckCircle, XCircle, Clock, Users, FileText } from 'lucide-react'
import {
    validateMilestoneForVerification,
    calculateMilestoneKPI,
    verifyAndLockMilestone,
    type MilestoneValidation
} from '@/lib/actions/milestone-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VerifyMilestoneModalProps {
    isOpen: boolean
    onClose: () => void
    milestoneId: string
    milestoneName: string
    completedDate?: string
    dueDate?: string
    onSuccess: () => void
}

export function VerifyMilestoneModal({
    isOpen,
    onClose,
    milestoneId,
    milestoneName,
    completedDate,
    dueDate,
    onSuccess
}: VerifyMilestoneModalProps) {
    const [supportEndDate, setSupportEndDate] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [validation, setValidation] = useState<MilestoneValidation | null>(null)
    const [kpiPreview, setKpiPreview] = useState<any>(null)

    useEffect(() => {
        if (isOpen && milestoneId) {
            loadValidationAndKPI()
        } else {
            // Reset state when closed
            setSupportEndDate('')
            setValidation(null)
            setKpiPreview(null)
        }
    }, [isOpen, milestoneId])

    useEffect(() => {
        // Revalidate when support end date changes
        if (supportEndDate && milestoneId) {
            validateMilestoneForVerification(milestoneId, supportEndDate).then(setValidation)
        }
    }, [supportEndDate, milestoneId])

    const loadValidationAndKPI = async () => {
        setIsLoading(true)
        try {
            const [validationResult, kpiResult] = await Promise.all([
                validateMilestoneForVerification(milestoneId, supportEndDate),
                calculateMilestoneKPI(milestoneId)
            ])
            setValidation(validationResult)
            setKpiPreview(kpiResult)
        } catch (error) {
            console.error('Error loading validation:', error)
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerify = async () => {
        if (!validation?.canVerify) {
            toast.error(validation?.reason || 'ไม่สามารถ Verify ได้')
            return
        }

        setIsLoading(true)
        try {
            const result = await verifyAndLockMilestone(milestoneId, supportEndDate)

            if (result.success) {
                toast.success('✅ Verify Milestone สำเร็จ')
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            console.error('Error verifying milestone:', error)
            toast.error('เกิดข้อผิดพลาดในการ Verify')
        } finally {
            setIsLoading(false)
        }
    }

    const minSupportDate = completedDate || new Date().toISOString().split('T')[0]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        Verify & Lock Milestone
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Warning Box */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-yellow-900 mb-2">
                                    เมื่อ Verify แล้ว Milestone <strong>{milestoneName}</strong> จะถูก Lock ทันที
                                </p>
                                <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                                    <li>ไม่สามารถแก้ไข Milestone data (TTD%, MDC%, Plan MD, Due Date)</li>
                                    <li>ไม่สามารถเพิ่ม/แก้ไข Stories และ Tasks</li>
                                    <li>ไม่สามารถบันทึก Timesheet entries</li>
                                    <li>ไม่สามารถแก้ไข Deliverables</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Validation Checklist */}
                    {validation && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-slate-700">Checklist:</h4>
                            <div className="space-y-2">
                                <div className={cn(
                                    "flex items-center gap-2 text-sm",
                                    validation.checks.hasCompletedDate ? 'text-green-600' : 'text-red-600'
                                )}>
                                    {validation.checks.hasCompletedDate ?
                                        <CheckCircle className="w-4 h-4" /> :
                                        <XCircle className="w-4 h-4" />
                                    }
                                    Completed Date กรอกแล้ว
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 text-sm",
                                    validation.checks.hasSupportEndDate ? 'text-green-600' : 'text-red-600'
                                )}>
                                    {validation.checks.hasSupportEndDate ?
                                        <CheckCircle className="w-4 h-4" /> :
                                        <XCircle className="w-4 h-4" />
                                    }
                                    Support End Date กรอกแล้ว
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 text-sm",
                                    validation.checks.allRequiredDocsSubmitted ? 'text-green-600' : 'text-red-600'
                                )}>
                                    {validation.checks.allRequiredDocsSubmitted ?
                                        <CheckCircle className="w-4 h-4" /> :
                                        <XCircle className="w-4 h-4" />
                                    }
                                    Required Documents ส่งครบแล้ว
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Support End Date Input */}
                    <div className="space-y-2">
                        <Label htmlFor="supportEndDate" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Support End Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="supportEndDate"
                            type="date"
                            value={supportEndDate}
                            onChange={(e) => setSupportEndDate(e.target.value)}
                            min={minSupportDate}
                            className="w-full"
                        />
                        <p className="text-xs text-slate-500">
                            วันสิ้นสุดการ Support สำหรับ Milestone นี้ (ต้องเป็นวันหลัง Completed Date)
                        </p>
                    </div>

                    {/* KPI Preview */}
                    {kpiPreview && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <h4 className="font-medium text-sm text-slate-700 mb-3">KPI Preview:</h4>
                            <div className="grid grid-cols-3 gap-4">
                                {/* TTD */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-medium text-slate-600">TTD (Time)</span>
                                    </div>
                                    <div className={cn(
                                        "text-lg font-bold",
                                        kpiPreview.ttd_pass ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {kpiPreview.ttd_pass ? '✅ Pass' : '❌ Fail'}
                                    </div>
                                    {kpiPreview.details && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            {new Date(kpiPreview.details.ttd.completed).toLocaleDateString('th-TH')} vs{' '}
                                            {new Date(kpiPreview.details.ttd.due).toLocaleDateString('th-TH')}
                                        </div>
                                    )}
                                </div>

                                {/* MDC */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-medium text-slate-600">MDC (Resource)</span>
                                    </div>
                                    <div className={cn(
                                        "text-lg font-bold",
                                        kpiPreview.mdc_pass ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {kpiPreview.mdc_pass ? '✅ Pass' : '❌ Fail'}
                                    </div>
                                    {kpiPreview.details && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            {kpiPreview.details.mdc.actual} / {kpiPreview.details.mdc.planned} MD
                                        </div>
                                    )}
                                </div>

                                {/* Docs */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <FileText className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-medium text-slate-600">Docs</span>
                                    </div>
                                    <div className={cn(
                                        "text-lg font-bold",
                                        kpiPreview.docs_pass ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {kpiPreview.docs_pass ? '✅ Pass' : '❌ Fail'}
                                    </div>
                                    {kpiPreview.details && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            {kpiPreview.details.docs.onTime}/{kpiPreview.details.docs.required} On-time
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleVerify}
                        disabled={!validation?.canVerify || isLoading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isLoading ? 'กำลัง Verify...' : '✅ Verify & Lock'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
