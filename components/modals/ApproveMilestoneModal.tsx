'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { getMilestoneApprovalStatus, approveMilestone, MilestoneApprovalStatus } from '@/lib/actions/milestone-approval-actions'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertTriangle, Calendar, Clock, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApproveMilestoneModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestoneId: string | null
    onApproved: () => void
}

export function ApproveMilestoneModal({ open, onOpenChange, milestoneId, onApproved }: ApproveMilestoneModalProps) {
    const [status, setStatus] = useState<MilestoneApprovalStatus | null>(null)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [completedDate, setCompletedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState('')
    const [confirmed, setConfirmed] = useState(false)

    useEffect(() => {
        if (open && milestoneId) {
            loadStatus()
        }
    }, [open, milestoneId])

    const loadStatus = async () => {
        if (!milestoneId) return
        setLoading(true)
        const data = await getMilestoneApprovalStatus(milestoneId)
        setStatus(data)
        if (data?.completed_date) {
            setCompletedDate(data.completed_date)
        }
        setLoading(false)
    }

    const handleApprove = async () => {
        if (!milestoneId || !confirmed) return

        setSubmitting(true)
        const result = await approveMilestone(milestoneId, completedDate, notes)
        setSubmitting(false)

        if (result.success) {
            toast.success('Milestone approved and locked successfully')
            onApproved()
            onOpenChange(false)
        } else {
            toast.error(result.error || 'Failed to approve milestone')
        }
    }

    const isCompletedOnTime = status?.summary && (!status.due_date || new Date(completedDate) <= new Date(status.due_date))
    const isWithinBudget = status?.summary && status.summary.actual_mandays <= status.summary.plan_mandays

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Approve Milestone: {status?.milestone_name}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                ) : status ? (
                    <div className="space-y-4">
                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <strong>คุณกำลังจะ Approve และ Lock Milestone นี้</strong>
                                <div className="text-xs mt-1 text-amber-700">
                                    หลัง Approve แล้วจะไม่สามารถเพิ่ม/แก้ไข Story, Task หรือบันทึก Timesheet ได้
                                </div>
                            </div>
                        </div>

                        {/* Summary Info */}
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Milestone:</span>
                                <span className="font-medium text-slate-900">{status.milestone_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Due Date:</span>
                                <span className="font-medium text-slate-900">
                                    {status.due_date ? format(new Date(status.due_date), 'dd MMM yyyy') : '-'}
                                </span>
                            </div>

                            <div className="border-t border-slate-200 pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Plan Mandays:</span>
                                    <span className="font-medium">{status.summary.plan_mandays} MD</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-slate-500">Actual Mandays:</span>
                                    <span className={cn("font-medium", isWithinBudget ? "text-green-600" : "text-red-600")}>
                                        {status.summary.actual_mandays} MD {isWithinBudget ? '✅' : '⚠️ เกิน Budget'}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 flex items-center gap-1">
                                        <ListTodo className="w-3 h-3" /> Stories:
                                    </span>
                                    <span className={cn("font-medium",
                                        status.summary.done_stories === status.summary.total_stories ? "text-green-600" : "text-amber-600"
                                    )}>
                                        {status.summary.done_stories}/{status.summary.total_stories} Done
                                        {status.summary.done_stories === status.summary.total_stories && ' ✅'}
                                    </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Tasks:
                                    </span>
                                    <span className={cn("font-medium",
                                        status.summary.done_tasks === status.summary.total_tasks ? "text-green-600" : "text-amber-600"
                                    )}>
                                        {status.summary.done_tasks}/{status.summary.total_tasks} Done
                                        {status.summary.done_tasks === status.summary.total_tasks && ' ✅'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Completed Date Input */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Completed Date
                            </label>
                            <Input
                                type="date"
                                value={completedDate}
                                onChange={(e) => setCompletedDate(e.target.value)}
                            />
                            {isCompletedOnTime ? (
                                <div className="text-xs text-green-600 mt-1">✅ ตรงเวลา</div>
                            ) : (
                                <div className="text-xs text-red-500 mt-1">⚠️ เกิน Due Date</div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">หมายเหตุ (Optional)</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="บันทึกเพิ่มเติม..."
                                rows={2}
                            />
                        </div>

                        {/* Confirmation Checkbox */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                            <Checkbox
                                id="confirm"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            <label htmlFor="confirm" className="text-sm text-slate-700 cursor-pointer">
                                ฉันเข้าใจว่าหลัง Approve แล้วจะไม่สามารถแก้ไขได้
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">ไม่พบข้อมูล Milestone</div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApprove}
                        disabled={!confirmed || submitting || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approve & Lock
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
