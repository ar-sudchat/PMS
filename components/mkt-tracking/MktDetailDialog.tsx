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
import { getProjectAttachments, updateProjectAttachments, Attachment } from '@/lib/actions/attachment-actions'
import FileUpload from '@/components/ui/FileUpload'
import { toast } from 'sonner'
import {
    Loader2,
    Banknote,
    User,
    Phone,
    Mail,
    CalendarCheck,
    CalendarClock,
    Send,
    FileText,
    ArrowRight,
    Trophy,
    XCircle,
    History,
    Paperclip,
    MessageSquare,
} from 'lucide-react'
import { ActionLogTab } from '@/components/sales/ActionLogTab'
import {
    ActionLog, ActionTypeConfig,
    getProjectActionLogs, getActionTypes
} from '@/lib/actions/sales-action-log-actions'
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
    defaultTab?: 'details' | 'attachments' | 'actions'
}

const stageColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    CONTACT: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    ESTIMATING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    QUOTED: 'bg-green-100 text-green-800 hover:bg-green-200',
    PRICE_SENT: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
}

const stageActiveColors: Record<string, string> = {
    NEW: 'bg-blue-500 text-white',
    CONTACT: 'bg-purple-500 text-white',
    ESTIMATING: 'bg-yellow-500 text-white',
    QUOTED: 'bg-green-500 text-white',
    PRICE_SENT: 'bg-teal-500 text-white',
}

export function MktDetailDialog({ open, onOpenChange, project, onSuccess, onViewHistory, defaultTab }: MktDetailDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isStageLoading, setIsStageLoading] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState<'won' | 'cancel' | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [actionLogs, setActionLogs] = useState<ActionLog[]>([])
    const [actionTypes, setActionTypes] = useState<ActionTypeConfig[]>([])
    const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'actions'>('details')
    const [formData, setFormData] = useState({
        mkt_mandays: '',
        mkt_mandays_sa: '',
        mkt_mandays_pg: '',
        mkt_mandays_pm: '',
        mkt_expected_value: '',
        mkt_discount: '',
        mkt_contact_person: '',
        mkt_contact_phone: '',
        mkt_contact_email: '',
        mkt_meeting_date: '',
        mkt_last_meeting_date: '',
        mkt_quote_sent_date: '',
        mkt_dev_accepted_date: '',
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
            setActiveTab(defaultTab || 'details')
            setFormData({
                mkt_mandays: project.mkt_mandays?.toString() || '',
                mkt_mandays_sa: project.mkt_mandays_sa?.toString() || '',
                mkt_mandays_pg: project.mkt_mandays_pg?.toString() || '',
                mkt_mandays_pm: project.mkt_mandays_pm?.toString() || '',
                mkt_expected_value: project.mkt_expected_value?.toString() || '',
                mkt_discount: project.mkt_discount?.toString() || '',
                mkt_contact_person: project.mkt_contact_person || '',
                mkt_contact_phone: project.mkt_contact_phone || '',
                mkt_contact_email: project.mkt_contact_email || '',
                mkt_meeting_date: toDateString(project.mkt_meeting_date),
                mkt_last_meeting_date: toDateString(project.mkt_last_meeting_date),
                mkt_quote_sent_date: toDateString(project.mkt_quote_sent_date),
                mkt_dev_accepted_date: toDateString(project.mkt_dev_accepted_date),
                mkt_notes: project.mkt_notes || '',
            })
            // Load attachments and action logs
            loadAttachments(project.id)
            loadActionLogs(project.id)
            loadActionTypes()
        } else {
            setAttachments([])
            setActionLogs([])
        }
    }, [project])

    const loadAttachments = async (projectId: string) => {
        const result = await getProjectAttachments(projectId)
        if (result.success) {
            setAttachments(result.data)
        }
    }

    const loadActionLogs = async (projectId: string) => {
        const data = await getProjectActionLogs(projectId)
        setActionLogs(data)
    }

    const loadActionTypes = async () => {
        const data = await getActionTypes()
        setActionTypes(data)
    }

    const handleActionLogRefresh = async () => {
        if (project) {
            const data = await getProjectActionLogs(project.id)
            setActionLogs(data)
        }
    }

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
                mkt_mandays_sa: formData.mkt_mandays_sa ? parseFloat(formData.mkt_mandays_sa) : null,
                mkt_mandays_pg: formData.mkt_mandays_pg ? parseFloat(formData.mkt_mandays_pg) : null,
                mkt_mandays_pm: formData.mkt_mandays_pm ? parseFloat(formData.mkt_mandays_pm) : null,
                mkt_expected_value: formData.mkt_expected_value ? parseFloat(formData.mkt_expected_value) : null,
                mkt_discount: formData.mkt_discount ? parseFloat(formData.mkt_discount) : null,
                mkt_contact_person: formData.mkt_contact_person || null,
                mkt_contact_phone: formData.mkt_contact_phone || null,
                mkt_contact_email: formData.mkt_contact_email || null,
                mkt_meeting_date: formData.mkt_meeting_date || null,
                mkt_last_meeting_date: formData.mkt_last_meeting_date || null,
                mkt_quote_sent_date: formData.mkt_quote_sent_date || null,
                mkt_dev_accepted_date: formData.mkt_dev_accepted_date || null,
                mkt_notes: formData.mkt_notes || null,
            }

            const result = await updateMktDetails(project.id, payload)
            console.log('Update result:', result)

            // Save attachments
            const attachmentResult = await updateProjectAttachments(project.id, attachments)
            if (!attachmentResult.success) {
                console.error('Attachment save failed:', attachmentResult.error)
            }

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

                    {/* Stage Selection */}
                    <div className="mb-4">
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

                    {/* Custom Tabs - styled like ProjectModal */}
                        <div className="flex border-b mb-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === 'details'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <FileText className="h-4 w-4" />
                                รายละเอียด
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('actions')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === 'actions'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Action Log
                                {actionLogs.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {actionLogs.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('attachments')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === 'attachments'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Paperclip className="h-4 w-4" />
                                เอกสารแนบ
                                {attachments.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {attachments.length}
                                    </span>
                                )}
                            </button>
                        </div>

                    {/* Tab Content Container - Fixed height to prevent resize on tab switch */}
                    <div className="min-h-[420px]">
                        {/* Tab: Action Log - outside form to prevent button conflicts */}
                        <div className={`${activeTab === 'actions' ? 'block' : 'hidden'}`}>
                            {project && (
                                <ActionLogTab
                                    projectId={project.id}
                                    logs={actionLogs}
                                    actionTypes={actionTypes}
                                    onRefresh={handleActionLogRefresh}
                                />
                            )}
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Tab: Details */}
                            <div className={`${activeTab === 'details' ? 'block' : 'hidden'} space-y-4`}>
                                {/* Manday Section */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="mandays_sa" className="text-xs text-muted-foreground">
                                            Manday SA
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="mandays_sa"
                                                type="number"
                                                step="0.5"
                                                value={formData.mkt_mandays_sa}
                                                onChange={(e) => setFormData({ ...formData, mkt_mandays_sa: e.target.value })}
                                                placeholder="0"
                                                className="pr-10 h-9"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                                วัน
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="mandays_pg" className="text-xs text-muted-foreground">
                                            Manday PG
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="mandays_pg"
                                                type="number"
                                                step="0.5"
                                                value={formData.mkt_mandays_pg}
                                                onChange={(e) => setFormData({ ...formData, mkt_mandays_pg: e.target.value })}
                                                placeholder="0"
                                                className="pr-10 h-9"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                                วัน
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="mandays_pm" className="text-xs text-muted-foreground">
                                            Manday PM
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="mandays_pm"
                                                type="number"
                                                step="0.5"
                                                value={formData.mkt_mandays_pm}
                                                onChange={(e) => setFormData({ ...formData, mkt_mandays_pm: e.target.value })}
                                                placeholder="0"
                                                className="pr-10 h-9"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                                วัน
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            Manday รวม
                                        </Label>
                                        <div className="flex items-center justify-center h-9 bg-blue-50 border border-blue-200 rounded-md">
                                            <span className="font-semibold text-blue-700">
                                                {(
                                                    (parseFloat(formData.mkt_mandays_sa) || 0) +
                                                    (parseFloat(formData.mkt_mandays_pg) || 0) +
                                                    (parseFloat(formData.mkt_mandays_pm) || 0)
                                                ).toFixed(1)} วัน
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Value Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        <Label htmlFor="discount" className="flex items-center gap-2 text-sm font-medium">
                                            <Banknote className="h-4 w-4 text-orange-600" />
                                            ส่วนลด
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="discount"
                                                type="number"
                                                value={formData.mkt_discount}
                                                onChange={(e) => setFormData({ ...formData, mkt_discount: e.target.value })}
                                                placeholder="0"
                                                className="pr-12"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                บาท
                                            </span>
                                        </div>
                                        {formData.mkt_discount && (
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(formData.mkt_discount)} บาท
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm font-medium">
                                            <Banknote className="h-4 w-4 text-blue-600" />
                                            สุทธิ
                                        </Label>
                                        <div className="flex items-center justify-center h-10 bg-blue-50 border border-blue-200 rounded-md">
                                            <span className="font-semibold text-blue-700">
                                                {formatCurrency(
                                                    String(
                                                        (parseFloat(formData.mkt_expected_value) || 0) -
                                                        (parseFloat(formData.mkt_discount) || 0)
                                                    )
                                                )} บาท
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Contact Info Section */}
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

                                <Separator />

                                {/* Meeting & Quote Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                    <div className="space-y-2">
                                        <Label htmlFor="dev_accepted_date" className="flex items-center gap-2 text-sm">
                                            <CalendarCheck className="h-4 w-4 text-orange-600" />
                                            วันที่ DEV รับงาน
                                        </Label>
                                        <Input
                                            id="dev_accepted_date"
                                            type="date"
                                            value={formData.mkt_dev_accepted_date}
                                            onChange={(e) => setFormData({ ...formData, mkt_dev_accepted_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Notes & Days in Stage */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            </div>

                            {/* Tab: Attachments */}
                            <div className={`${activeTab === 'attachments' ? 'block' : 'hidden'}`}>
                                <FileUpload
                                    value={attachments}
                                    onChange={setAttachments}
                                    maxFiles={10}
                                    maxSizeMB={20}
                                    subFolder={`mkt-projects/${project?.id}`}
                                    label="อัพโหลดเอกสาร"
                                    helperText="รองรับไฟล์ รูปภาพ, PDF, Word, Excel (สูงสุด 10 ไฟล์, ไฟล์ละไม่เกิน 20MB)"
                                />
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
                    </div>
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
