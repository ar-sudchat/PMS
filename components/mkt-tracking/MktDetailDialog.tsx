'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MktProject, updateMktDetails, updateMktStage, convertMktToDev, cancelMktProject } from '@/lib/actions/mkt-tracking-actions'
import { MKT_STAGES, MktStageCode } from '@/lib/constants/mkt-stages'
import { toast } from 'sonner'
import {
    Loader2,
    Banknote,
    CalendarDays,
    User,
    Phone,
    Mail,
    Calendar,
    CalendarCheck,
    CalendarClock,
    Send,
    FileText,
    ArrowRight,
    Trophy,
    XCircle,
    History,
    Clock,
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MktDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: MktProject | null
    onSuccess: () => void
    onViewHistory?: (project: MktProject) => void
}

const stageColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    CONTACT: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    ESTIMATING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    QUOTED: 'bg-green-100 text-green-800 hover:bg-green-200',
}

const stageActiveColors: Record<string, string> = {
    NEW: 'bg-blue-500 text-white',
    CONTACT: 'bg-purple-500 text-white',
    ESTIMATING: 'bg-yellow-500 text-white',
    QUOTED: 'bg-green-500 text-white',
}

export function MktDetailDialog({ open, onOpenChange, project, onSuccess, onViewHistory }: MktDetailDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isStageLoading, setIsStageLoading] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState<'won' | 'cancel' | null>(null)
    const [formData, setFormData] = useState({
        mkt_mandays: '',
        mkt_expected_value: '',
        mkt_expected_close_date: '',
        mkt_contact_person: '',
        mkt_contact_phone: '',
        mkt_contact_email: '',
        mkt_meeting_date: '',
        mkt_last_meeting_date: '',
        mkt_quote_sent_date: '',
        mkt_notes: '',
    })

    // Helper to safely extract date string (YYYY-MM-DD) from various formats
    const toDateString = (value: string | Date | undefined | null): string => {
        if (!value) return ''
        if (typeof value === 'string') {
            return value.split('T')[0]
        }
        if (value instanceof Date) {
            return value.toISOString().split('T')[0]
        }
        return ''
    }

    useEffect(() => {
        if (project) {
            setFormData({
                mkt_mandays: project.mkt_mandays?.toString() || '',
                mkt_expected_value: project.mkt_expected_value?.toString() || '',
                mkt_expected_close_date: toDateString(project.mkt_expected_close_date),
                mkt_contact_person: project.mkt_contact_person || '',
                mkt_contact_phone: project.mkt_contact_phone || '',
                mkt_contact_email: project.mkt_contact_email || '',
                mkt_meeting_date: toDateString(project.mkt_meeting_date),
                mkt_last_meeting_date: toDateString(project.mkt_last_meeting_date),
                mkt_quote_sent_date: toDateString(project.mkt_quote_sent_date),
                mkt_notes: project.mkt_notes || '',
            })
        }
    }, [project])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!project) {
            console.log('No project selected')
            return
        }

        setIsLoading(true)
        try {
            const payload = {
                mkt_mandays: formData.mkt_mandays ? parseFloat(formData.mkt_mandays) : null,
                mkt_expected_value: formData.mkt_expected_value ? parseFloat(formData.mkt_expected_value) : null,
                mkt_expected_close_date: formData.mkt_expected_close_date || null,
                mkt_contact_person: formData.mkt_contact_person || null,
                mkt_contact_phone: formData.mkt_contact_phone || null,
                mkt_contact_email: formData.mkt_contact_email || null,
                mkt_meeting_date: formData.mkt_meeting_date || null,
                mkt_last_meeting_date: formData.mkt_last_meeting_date || null,
                mkt_quote_sent_date: formData.mkt_quote_sent_date || null,
                mkt_notes: formData.mkt_notes || null,
            }

            const result = await updateMktDetails(project.id, payload)
            console.log('Update result:', result)

            if (result.success) {
                toast.success('บันทึกข้อมูลสำเร็จ')
                onOpenChange(false)
                onSuccess()
            } else {
                console.error('Update failed:', result.error)
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            console.error('Exception during update:', error)
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStageChange = async (newStage: MktStageCode) => {
        if (!project || newStage === project.mkt_stage) return

        setIsStageLoading(true)
        try {
            const result = await updateMktStage(project.id, newStage)
            if (result.success) {
                toast.success(`เปลี่ยน Stage เป็น "${MKT_STAGES.find(s => s.code === newStage)?.label}" สำเร็จ`)
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsStageLoading(false)
        }
    }

    const handleConfirmWon = async () => {
        if (!project) return
        setIsLoading(true)
        try {
            const result = await convertMktToDev(project.id)
            if (result.success) {
                toast.success('โครงการถูกย้ายไปเป็น DEV สำเร็จ')
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
            setConfirmDialog(null)
        }
    }

    const handleConfirmCancel = async () => {
        if (!project) return
        setIsLoading(true)
        try {
            const result = await cancelMktProject(project.id)
            if (result.success) {
                toast.success('ยกเลิกโครงการสำเร็จ')
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
            setConfirmDialog(null)
        }
    }

    const formatCurrency = (value: string) => {
        if (!value) return ''
        const num = parseFloat(value)
        if (isNaN(num)) return value
        return new Intl.NumberFormat('th-TH').format(num)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl">{project?.project_code}</DialogTitle>
                                <DialogDescription className="text-base mt-1">
                                    {project?.title}
                                </DialogDescription>
                            </div>
                            <Badge className={stageActiveColors[project?.mkt_stage || 'NEW']} variant="secondary">
                                {MKT_STAGES.find(s => s.code === project?.mkt_stage)?.label || 'ใหม่'}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        {/* Stage Selection */}
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {MKT_STAGES.map(stage => (
                                    <button
                                        key={stage.code}
                                        type="button"
                                        disabled={isStageLoading}
                                        onClick={() => handleStageChange(stage.code)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                            project?.mkt_stage === stage.code
                                                ? stageActiveColors[stage.code]
                                                : stageColors[stage.code]
                                        }`}
                                    >
                                        {project?.mkt_stage !== stage.code && <ArrowRight className="h-3 w-3" />}
                                        {stage.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Value Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="space-y-2">
                                <Label htmlFor="mandays" className="flex items-center gap-2 text-sm font-medium">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    Manday (ประมาณการ)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="mandays"
                                        type="number"
                                        step="0.5"
                                        value={formData.mkt_mandays}
                                        onChange={(e) => setFormData({ ...formData, mkt_mandays: e.target.value })}
                                        placeholder="0"
                                        className="pr-16"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                        วัน
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expected_value" className="flex items-center gap-2 text-sm font-medium">
                                    <Banknote className="h-4 w-4 text-green-600" />
                                    มูลค่า (Sale)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="expected_value"
                                        type="number"
                                        value={formData.mkt_expected_value}
                                        onChange={(e) => setFormData({ ...formData, mkt_expected_value: e.target.value })}
                                        placeholder="0"
                                        className="pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                        บาท
                                    </span>
                                </div>
                                {formData.mkt_expected_value && (
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(formData.mkt_expected_value)} บาท
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="close_date" className="flex items-center gap-2 text-sm font-medium">
                                    <CalendarDays className="h-4 w-4 text-orange-600" />
                                    วันที่คาดปิด
                                </Label>
                                <Input
                                    id="close_date"
                                    type="date"
                                    value={formData.mkt_expected_close_date}
                                    onChange={(e) => setFormData({ ...formData, mkt_expected_close_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Contact Info Section */}
                        <div className="mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person" className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-gray-500" />
                                        ชื่อผู้ติดต่อ
                                    </Label>
                                    <Input
                                        id="contact_person"
                                        value={formData.mkt_contact_person}
                                        onChange={(e) => setFormData({ ...formData, mkt_contact_person: e.target.value })}
                                        placeholder="ชื่อ-นามสกุล"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_phone" className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        เบอร์โทรศัพท์
                                    </Label>
                                    <Input
                                        id="contact_phone"
                                        value={formData.mkt_contact_phone}
                                        onChange={(e) => setFormData({ ...formData, mkt_contact_phone: e.target.value })}
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_email" className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        อีเมล
                                    </Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={formData.mkt_contact_email}
                                        onChange={(e) => setFormData({ ...formData, mkt_contact_email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Meeting & Quote Section */}
                        <div className="mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meeting_date" className="flex items-center gap-2 text-sm">
                                        <CalendarClock className="h-4 w-4 text-purple-600" />
                                        วันนัดประชุม
                                    </Label>
                                    <Input
                                        id="meeting_date"
                                        type="date"
                                        value={formData.mkt_meeting_date}
                                        onChange={(e) => setFormData({ ...formData, mkt_meeting_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="last_meeting_date" className="flex items-center gap-2 text-sm">
                                        <CalendarCheck className="h-4 w-4 text-green-600" />
                                        วันประชุมครั้งสุดท้าย
                                    </Label>
                                    <Input
                                        id="last_meeting_date"
                                        type="date"
                                        value={formData.mkt_last_meeting_date}
                                        onChange={(e) => setFormData({ ...formData, mkt_last_meeting_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="quote_sent_date" className="flex items-center gap-2 text-sm">
                                        <Send className="h-4 w-4 text-blue-600" />
                                        วันที่ส่งราคา
                                    </Label>
                                    <Input
                                        id="quote_sent_date"
                                        type="date"
                                        value={formData.mkt_quote_sent_date}
                                        onChange={(e) => setFormData({ ...formData, mkt_quote_sent_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Notes & Days in Stage */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="md:col-span-3 space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    หมายเหตุ
                                </Label>
                                <Textarea
                                    id="notes"
                                    rows={3}
                                    value={formData.mkt_notes}
                                    onChange={(e) => setFormData({ ...formData, mkt_notes: e.target.value })}
                                    placeholder="บันทึกรายละเอียดเพิ่มเติม..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    อยู่ในสถานะนี้
                                </Label>
                                <div className="flex items-center justify-center h-[76px] bg-muted/30 rounded-md">
                                    <Badge variant="outline" className="text-2xl px-4 py-2">
                                        {project?.days_in_stage || 0} วัน
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Actions */}
                        <div className="flex items-center gap-2 mb-4">
                            {onViewHistory && project && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onOpenChange(false)
                                        onViewHistory(project)
                                    }}
                                >
                                    <History className="mr-2 h-4 w-4" />
                                    ดูประวัติ
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setConfirmDialog('won')}
                            >
                                <Trophy className="mr-2 h-4 w-4" />
                                Won - ย้ายเป็น DEV
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setConfirmDialog('cancel')}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                ยกเลิกโครงการ
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                บันทึก
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <AlertDialog
                open={confirmDialog !== null}
                onOpenChange={(open) => !open && setConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmDialog === 'won' ? 'ยืนยัน Won - ย้ายเป็น DEV' : 'ยืนยันการยกเลิกโครงการ'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog === 'won' ? (
                                <>
                                    โครงการ <strong>{project?.project_code}</strong> - {project?.title}
                                    <br />
                                    จะถูกเปลี่ยนประเภทเป็น DEV และหายไปจากหน้า MKT Tracking
                                </>
                            ) : (
                                <>
                                    คุณต้องการยกเลิกโครงการ <strong>{project?.project_code}</strong> - {project?.title} หรือไม่?
                                    <br />
                                    โครงการจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" และหายไปจากหน้า MKT Tracking
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>ปิด</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDialog === 'won' ? handleConfirmWon : handleConfirmCancel}
                            disabled={isLoading}
                            className={confirmDialog === 'cancel' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
