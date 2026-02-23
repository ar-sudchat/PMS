'use client'

import { useState } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface DueDateChangeReasonDialogProps {
    open: boolean
    onClose: () => void
    milestoneName: string
    oldDate: string
    newDate: string
    onConfirm: (reason: string) => void
}

export function DueDateChangeReasonDialog({
    open, onClose, milestoneName, oldDate, newDate, onConfirm
}: DueDateChangeReasonDialogProps) {
    const [reason, setReason] = useState('')

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'd MMM yyyy', { locale: th })
        } catch {
            return dateStr || '-'
        }
    }

    const handleConfirm = () => {
        if (!reason.trim()) return
        onConfirm(reason.trim())
        setReason('')
    }

    const handleCancel = () => {
        setReason('')
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        เหตุผลในการเลื่อน Due Date
                    </DialogTitle>
                    <DialogDescription>
                        กรุณาระบุเหตุผลในการเปลี่ยนแปลง Due Date ของ Milestone
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Milestone info */}
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <div className="text-sm font-medium text-slate-700">{milestoneName}</div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {formatDate(oldDate)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                                {formatDate(newDate)}
                            </span>
                        </div>
                    </div>

                    {/* Reason textarea */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            เหตุผล <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="ระบุเหตุผลในการเปลี่ยน Due Date..."
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!reason.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ยืนยัน
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
