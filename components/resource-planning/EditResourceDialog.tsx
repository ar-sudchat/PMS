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
import { updateMilestoneResource, MilestoneResource } from '@/lib/actions/resource-planning-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface EditResourceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    resource: MilestoneResource | null
    milestoneName: string
    projectCode: string
    onSuccess: () => void
}

export function EditResourceDialog({
    open,
    onOpenChange,
    resource,
    milestoneName,
    projectCode,
    onSuccess,
}: EditResourceDialogProps) {
    const [role, setRole] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [workingDays, setWorkingDays] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Pre-fill form when resource changes
    useEffect(() => {
        if (resource && open) {
            setRole(resource.role || '')
            // Handle both Date objects and ISO strings
            const formatDate = (d: any) => {
                if (!d) return ''
                try {
                    const date = new Date(d)
                    return date.toISOString().split('T')[0]
                } catch { return '' }
            }
            setStartDate(formatDate(resource.start_date))
            setEndDate(formatDate(resource.end_date))
            setWorkingDays(String(resource.working_days || ''))
            setNotes(resource.notes || '')
        }
    }, [resource, open])

    const handleSubmit = async () => {
        if (!resource) return

        if (!role) {
            toast.error('กรุณาเลือก Role')
            return
        }
        if (!startDate || !endDate) {
            toast.error('กรุณากรอกวันที่เริ่มต้นและสิ้นสุด')
            return
        }
        if (!workingDays || parseInt(workingDays) <= 0) {
            toast.error('กรุณากรอก Working Days')
            return
        }
        if (new Date(startDate) > new Date(endDate)) {
            toast.error('วันที่เริ่มต้นต้องก่อนวันที่สิ้นสุด')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await updateMilestoneResource(resource.id, {
                role,
                start_date: startDate,
                end_date: endDate,
                working_days: parseInt(workingDays),
                notes: notes || undefined,
            })

            if (result.success) {
                toast.success('อัพเดตสำเร็จ')
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        แก้ไขการจัดสรร - {projectCode} / {milestoneName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Employee (read-only) */}
                    <div className="space-y-1.5">
                        <Label>พนักงาน</Label>
                        <div className="px-3 py-2 text-sm border rounded-md bg-muted/50 text-muted-foreground">
                            {resource?.employee_name}
                            {resource?.employee_nickname ? ` (${resource.employee_nickname})` : ''}
                            {resource?.position_code ? ` [${resource.position_code}]` : ''}
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <Label>Role <span className="text-red-500">*</span></Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือก Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SA">SA (System Analyst)</SelectItem>
                                <SelectItem value="BA">BA (Business Analyst)</SelectItem>
                                <SelectItem value="PG">PG (Programmer)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>วันเริ่มต้น <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>วันสิ้นสุด <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Working Days */}
                    <div className="space-y-1.5">
                        <Label>Working Days <span className="text-red-500">*</span></Label>
                        <Input
                            type="number"
                            min="1"
                            value={workingDays}
                            onChange={(e) => setWorkingDays(e.target.value)}
                            placeholder="จำนวนวันทำงาน"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>หมายเหตุ</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
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
