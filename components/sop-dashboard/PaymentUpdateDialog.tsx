'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateMilestonePayment, type PaymentMilestone } from '@/lib/actions/sop-actions'
import { PAYMENT_STATUSES, type PaymentStatusCode } from '@/lib/constants/sop-constants'

interface PaymentUpdateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestone: PaymentMilestone | null
    onSuccess: () => void
}

export function PaymentUpdateDialog({
    open,
    onOpenChange,
    milestone,
    onSuccess,
}: PaymentUpdateDialogProps) {
    const [invoiceNo, setInvoiceNo] = useState('')
    const [invoiceDate, setInvoiceDate] = useState('')
    const [invoiceAmount, setInvoiceAmount] = useState('')
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatusCode>('NOT_INVOICED')
    const [paymentDueDate, setPaymentDueDate] = useState('')
    const [paymentReceivedDate, setPaymentReceivedDate] = useState('')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open || !milestone) return
        const fmt = (d: any) => {
            if (!d) return ''
            try { return new Date(d).toISOString().split('T')[0] } catch { return '' }
        }
        setInvoiceNo(milestone.invoice_no || '')
        setInvoiceDate(fmt(milestone.invoice_date))
        setInvoiceAmount(milestone.invoice_amount != null ? String(milestone.invoice_amount) : '')
        setPaymentStatus((milestone.payment_status as PaymentStatusCode) || 'NOT_INVOICED')
        setPaymentDueDate(fmt(milestone.payment_due_date))
        setPaymentReceivedDate(fmt(milestone.payment_received_date))
        setPaymentAmount(milestone.payment_amount != null ? String(milestone.payment_amount) : '')
        setPaymentNotes(milestone.payment_notes || '')
    }, [open, milestone])

    const handleSubmit = async () => {
        if (!milestone) return

        setIsSubmitting(true)
        try {
            const result = await updateMilestonePayment(milestone.milestone_id, {
                invoice_no: invoiceNo.trim() || null,
                invoice_date: invoiceDate || null,
                invoice_amount: invoiceAmount ? parseFloat(invoiceAmount) : null,
                payment_status: paymentStatus,
                payment_due_date: paymentDueDate || null,
                payment_received_date: paymentReceivedDate || null,
                payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
                payment_notes: paymentNotes.trim() || null,
            })

            if (result.success) {
                toast.success('อัพเดตสถานะการชำระสำเร็จ')
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        อัพเดตสถานะการชำระ
                    </DialogTitle>
                    {milestone && (
                        <p className="text-sm text-muted-foreground">
                            {milestone.project_code} / {milestone.milestone_name}
                        </p>
                    )}
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Invoice No */}
                    <div className="space-y-1.5">
                        <Label>เลขที่ Invoice</Label>
                        <Input
                            value={invoiceNo}
                            onChange={e => setInvoiceNo(e.target.value)}
                            placeholder="เลขที่ใบแจ้งหนี้"
                        />
                    </div>

                    {/* Invoice Date + Amount */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>วันที่ออก Invoice</Label>
                            <Input
                                type="date"
                                value={invoiceDate}
                                onChange={e => setInvoiceDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>จำนวนเงิน Invoice</Label>
                            <Input
                                type="number"
                                value={invoiceAmount}
                                onChange={e => setInvoiceAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1.5">
                        <Label>สถานะการชำระ</Label>
                        <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v as PaymentStatusCode)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_STATUSES.map(s => (
                                    <SelectItem key={s.code} value={s.code}>
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            {s.labelTh}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Due Date + Received Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>กำหนดชำระ</Label>
                            <Input
                                type="date"
                                value={paymentDueDate}
                                onChange={e => setPaymentDueDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>วันที่ได้รับเงิน</Label>
                            <Input
                                type="date"
                                value={paymentReceivedDate}
                                onChange={e => setPaymentReceivedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Payment Amount */}
                    <div className="space-y-1.5">
                        <Label>จำนวนเงินที่ได้รับ</Label>
                        <Input
                            type="number"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>หมายเหตุ</Label>
                        <Textarea
                            value={paymentNotes}
                            onChange={e => setPaymentNotes(e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
