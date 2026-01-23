'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
    createProjectRequest,
    updateProjectRequest,
    submitProjectRequest
} from '@/lib/actions/project-request-actions'
import { Save, Send, Loader2 } from 'lucide-react'

interface ProjectRequestFormProps {
    request?: any
    customers: any[]
    requestTypes: any[]
    priorities: any[]
    currentUserId: string
    onSuccess?: () => void
    hideActions?: boolean
    onSaveRef?: (fn: () => Promise<void>) => void
    onSubmitRef?: (fn: () => Promise<void>) => void
    onLoadingChange?: (isSaving: boolean, isSubmitting: boolean) => void
}

export function ProjectRequestForm({
    request,
    customers,
    requestTypes,
    priorities,
    currentUserId,
    onSuccess,
    hideActions = false,
    onSaveRef,
    onSubmitRef,
    onLoadingChange
}: ProjectRequestFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const isEdit = !!request
    // แก้ไขได้เฉพาะ DRAFT หรือ REVISION เท่านั้น (PENDING และ APPROVED ห้ามแก้)
    const canEdit = !request || request.status === 'DRAFT' || request.status === 'REVISION'
    // APPROVED แล้วแก้ไขได้เฉพาะบางฟิลด์ (วันที่ติดต่อ, ประชุม, ประเมินราคา, งบประมาณ, Man-day)
    const canEditAfterApproved = request?.status === 'APPROVED' || request?.status === 'CONVERTED'
    const canEditDates = canEdit || canEditAfterApproved

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            title: request?.title || '',
            description: request?.description || '',
            customer_id: request?.customer_id || '',
            contact_person: request?.contact_person || '',
            contact_email: request?.contact_email || '',
            contact_phone: request?.contact_phone || '',
            project_type: request?.project_type || 'NEW',
            priority: request?.priority || 'MEDIUM',
            estimated_budget: request?.estimated_budget || '',
            estimated_mandays: request?.estimated_mandays || '',
            created_at: request?.created_at ? new Date(request.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            submitted_at: request?.submitted_at ? new Date(request.submitted_at).toISOString().split('T')[0] : '',
            approval_date: request?.approval_date ? new Date(request.approval_date).toISOString().split('T')[0] : '',
            customer_contact_date: request?.customer_contact_date ? new Date(request.customer_contact_date).toISOString().split('T')[0] : '',
            last_meeting_date: request?.last_meeting_date ? new Date(request.last_meeting_date).toISOString().split('T')[0] : '',
            quotation_date: request?.quotation_date ? new Date(request.quotation_date).toISOString().split('T')[0] : '',
        }
    })

    // Save Draft
    const handleSave = async (data: any) => {
        setIsSaving(true)

        try {
            if (isEdit) {
                const result = await updateProjectRequest(request.id, data, currentUserId)
                if (result.success) {
                    toast.success('บันทึกสำเร็จ')
                    if (onSuccess) {
                        onSuccess()
                        router.refresh()
                    } else {
                        router.refresh()
                    }
                } else {
                    toast.error(result.error || 'เกิดข้อผิดพลาด')
                }
            } else {
                const result = await createProjectRequest(data, currentUserId)
                if (result.success) {
                    toast.success('บันทึกสำเร็จ')
                    if (onSuccess) {
                        onSuccess()
                        router.refresh()
                    } else if (result.request) {
                        router.push(`/project-requests/${result.request.id}`)
                    } else {
                        router.refresh()
                    }
                } else {
                    toast.error(result.error || 'เกิดข้อผิดพลาด')
                }
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSaving(false)
        }
    }

    // Save and Submit
    const handleSaveAndSubmit = async (data: any) => {
        setIsSubmitting(true)

        try {
            let requestId = request?.id

            // Create or Update first
            if (isEdit) {
                await updateProjectRequest(request.id, data, currentUserId)
            } else {
                const result = await createProjectRequest(data, currentUserId)
                if (!result.success) {
                    toast.error(result.error || 'เกิดข้อผิดพลาด')
                    return
                }
                requestId = result.request?.id
            }

            // Then Submit
            const submitResult = await submitProjectRequest(requestId!, currentUserId)

            if (submitResult.success) {
                toast.success('ส่งคำขอเรียบร้อย')
                if (onSuccess) {
                    onSuccess()
                    router.refresh()
                } else {
                    router.push('/project-requests')
                }
            } else {
                toast.error(submitResult.error || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Expose functions to parent via callback refs
    const triggerSave = useCallback(() => {
        return handleSubmit(handleSave)()
    }, [handleSubmit])

    const triggerSubmit = useCallback(() => {
        return handleSubmit(handleSaveAndSubmit)()
    }, [handleSubmit])

    // Register callbacks with parent
    useEffect(() => {
        if (onSaveRef) onSaveRef(triggerSave)
    }, [onSaveRef, triggerSave])

    useEffect(() => {
        if (onSubmitRef) onSubmitRef(triggerSubmit)
    }, [onSubmitRef, triggerSubmit])

    // Notify parent of loading state changes
    useEffect(() => {
        if (onLoadingChange) onLoadingChange(isSaving, isSubmitting)
    }, [isSaving, isSubmitting, onLoadingChange])

    return (
        <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Project Info */}
                <div className="space-y-6">
                    <div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label>ชื่อโครงการ <span className="text-red-500">*</span></Label>
                                <Input
                                    {...register('title', { required: 'กรุณากรอกชื่อโครงการ' })}
                                    placeholder="ชื่อโครงการ"
                                    disabled={!canEdit}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                                {errors.title && (
                                    <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>
                                )}
                            </div>

                            <div>
                                <Label>ประเภทโครงการ <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch('project_type')}
                                    onValueChange={(v) => setValue('project_type', v)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white">
                                        <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {requestTypes.map((type) => (
                                            <SelectItem key={type.code} value={type.code}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>ความสำคัญ <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch('priority')}
                                    onValueChange={(v) => setValue('priority', v)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white">
                                        <SelectValue placeholder="เลือกความสำคัญ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorities.map((p) => (
                                            <SelectItem key={p.code} value={p.code}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Label>รายละเอียด</Label>
                                <Textarea
                                    {...register('description')}
                                    placeholder="รายละเอียดโครงการ"
                                    rows={4}
                                    disabled={!canEdit}
                                    className="mt-1 resize-none disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>งบประมาณ (บาท)</Label>
                                <Input
                                    {...register('estimated_budget')}
                                    type="number"
                                    placeholder="0.00"
                                    disabled={!canEditDates}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>

                            <div>
                                <Label>Man-day</Label>
                                <Input
                                    {...register('estimated_mandays')}
                                    type="number"
                                    placeholder="0"
                                    disabled={!canEditDates}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>


                            <div>
                                <Label>วันที่สร้างเอกสาร</Label>
                                <Input
                                    {...register('created_at')}
                                    type="date"
                                    disabled={true}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-slate-50"
                                />
                            </div>

                            <div>
                                <Label>วันที่ส่งอนุมัติ</Label>
                                <Input
                                    {...register('submitted_at')}
                                    type="date"
                                    disabled={true}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer Info & Notes */}
                <div className="space-y-6">
                    <div>

                        <div className="space-y-3">
                            <div>
                                <Label>ลูกค้า</Label>
                                <Select
                                    value={watch('customer_id') || ''}
                                    onValueChange={(v) => setValue('customer_id', v)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white">
                                        <SelectValue placeholder="เลือกลูกค้า" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Label>ผู้ติดต่อ</Label>
                                    <Input
                                        {...register('contact_person')}
                                        placeholder="ชื่อผู้ติดต่อ"
                                        disabled={!canEdit}
                                        className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        {...register('contact_email')}
                                        type="email"
                                        placeholder="Email"
                                        disabled={!canEdit}
                                        className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <Label>เบอร์โทร</Label>
                                    <Input
                                        {...register('contact_phone')}
                                        placeholder="เบอร์โทร"
                                        disabled={!canEdit}
                                        className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>วันที่อนุมัติ</Label>
                                <Input
                                    {...register('approval_date')}
                                    type="date"
                                    disabled={true}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-slate-50"
                                />
                            </div>
                            <div>
                                <Label>วันที่ติดต่อลูกค้า</Label>
                                <Input
                                    {...register('customer_contact_date')}
                                    type="date"
                                    disabled={!canEditDates}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>
                            <div>
                                <Label>ประชุมครั้งสุดท้าย</Label>
                                <Input
                                    {...register('last_meeting_date')}
                                    type="date"
                                    disabled={!canEditDates}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>
                            <div>
                                <Label>วันที่ประเมินราคา</Label>
                                <Input
                                    {...register('quotation_date')}
                                    type="date"
                                    disabled={!canEditDates}
                                    className="mt-1 disabled:opacity-100 disabled:text-slate-900 bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions - hidden when controlled by parent */}
            {!hideActions && canEdit && (
                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSubmit(handleSave)}
                        disabled={isSaving || isSubmitting}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        บันทึก
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSubmit(handleSaveAndSubmit)}
                        disabled={isSaving || isSubmitting}
                        className="min-w-[120px]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        ส่งอนุมัติ
                    </Button>
                </div>
            )}

            {/* Save button for APPROVED/CONVERTED - only for editable date fields */}
            {!hideActions && canEditAfterApproved && (
                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button
                        type="button"
                        onClick={handleSubmit(handleSave)}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        บันทึก
                    </Button>
                </div>
            )}
        </form>
    )
}
