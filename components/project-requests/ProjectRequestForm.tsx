'use client'

import { useState } from 'react'
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
}

export function ProjectRequestForm({
    request,
    customers,
    requestTypes,
    priorities,
    currentUserId
}: ProjectRequestFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const isEdit = !!request
    const canEdit = !request || request.status === 'DRAFT' || request.status === 'REVISION'

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
            expected_start_date: request?.expected_start_date ? new Date(request.expected_start_date).toISOString().split('T')[0] : '',
            expected_end_date: request?.expected_end_date ? new Date(request.expected_end_date).toISOString().split('T')[0] : '',
            notes: request?.notes || ''
        }
    })

    // Save Draft
    const handleSave = async (data: any) => {
        setIsSaving(true)

        try {
            let result
            if (isEdit) {
                result = await updateProjectRequest(request.id, data, currentUserId)
            } else {
                result = await createProjectRequest(data, currentUserId)
            }

            if (result.success) {
                toast.success('บันทึกสำเร็จ')
                if (!isEdit && result.request) {
                    router.push(`/project-requests/${result.request.id}`)
                } else {
                    router.refresh();
                }
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
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
                router.push('/project-requests')
            } else {
                toast.error(submitResult.error || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="space-y-6">
            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle>ข้อมูลคำขอ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label>ชื่อโครงการ *</Label>
                            <Input
                                {...register('title', { required: 'กรุณากรอกชื่อโครงการ' })}
                                placeholder="ชื่อโครงการ"
                                disabled={!canEdit}
                            />
                            {errors.title && (
                                <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>
                            )}
                        </div>

                        <div>
                            <Label>ประเภทโครงการ *</Label>
                            <Select
                                value={watch('project_type')}
                                onValueChange={(v) => setValue('project_type', v)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger>
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
                            <Label>ความสำคัญ *</Label>
                            <Select
                                value={watch('priority')}
                                onValueChange={(v) => setValue('priority', v)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger>
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

                        <div className="md:col-span-2">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                {...register('description')}
                                placeholder="รายละเอียดโครงการ"
                                rows={4}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
                <CardHeader>
                    <CardTitle>ข้อมูลลูกค้า</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>ลูกค้า</Label>
                            <Select
                                value={watch('customer_id') || ''}
                                onValueChange={(v) => setValue('customer_id', v)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger>
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

                        <div>
                            <Label>ผู้ติดต่อ</Label>
                            <Input
                                {...register('contact_person')}
                                placeholder="ชื่อผู้ติดต่อ"
                                disabled={!canEdit}
                            />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input
                                {...register('contact_email')}
                                type="email"
                                placeholder="email@example.com"
                                disabled={!canEdit}
                            />
                        </div>

                        <div>
                            <Label>เบอร์โทร</Label>
                            <Input
                                {...register('contact_phone')}
                                placeholder="0xx-xxx-xxxx"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estimates */}
            <Card>
                <CardHeader>
                    <CardTitle>ประมาณการ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>งบประมาณ (บาท)</Label>
                            <Input
                                {...register('estimated_budget')}
                                type="number"
                                placeholder="0.00"
                                disabled={!canEdit}
                            />
                        </div>

                        <div>
                            <Label>Man-day</Label>
                            <Input
                                {...register('estimated_mandays')}
                                type="number"
                                placeholder="0"
                                disabled={!canEdit}
                            />
                        </div>

                        <div>
                            <Label>วันที่เริ่มต้น (คาดการณ์)</Label>
                            <Input
                                {...register('expected_start_date')}
                                type="date"
                                disabled={!canEdit}
                            />
                        </div>

                        <div>
                            <Label>วันที่สิ้นสุด (คาดการณ์)</Label>
                            <Input
                                {...register('expected_end_date')}
                                type="date"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            <Card>
                <CardHeader>
                    <CardTitle>หมายเหตุ</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        {...register('notes')}
                        placeholder="หมายเหตุเพิ่มเติม"
                        rows={3}
                        disabled={!canEdit}
                    />
                </CardContent>
            </Card>

            {/* Actions */}
            {canEdit && (
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSubmit(handleSave)}
                        disabled={isSaving || isSubmitting}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        บันทึกร่าง
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSubmit(handleSaveAndSubmit)}
                        disabled={isSaving || isSubmitting}
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
        </form>
    )
}
