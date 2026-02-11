'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Save, Info } from 'lucide-react'
import { format } from 'date-fns'
import {
    updateProjectPlan,
    ProjectPlan,
} from '@/lib/actions/project-planning-actions'

interface PlanInfoSectionProps {
    planId: string
    plan: ProjectPlan
    readOnly: boolean
    onUpdate: () => void
}

interface FormData {
    planName: string
    description: string
    objectives: string
    scopeSummary: string
    plannedStartDate: string
    plannedEndDate: string
    totalMandays: number
    totalBudget: number
    mandayRate: number
}

export function PlanInfoSection({ planId, plan, readOnly, onUpdate }: PlanInfoSectionProps) {
    const [saving, setSaving] = useState(false)

    // Convert date from plan to input format
    const toInputDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd')
        } catch {
            return ''
        }
    }

    const [formData, setFormData] = useState<FormData>({
        planName: plan.plan_name || '',
        description: plan.description || '',
        objectives: plan.objectives || '',
        scopeSummary: plan.scope_summary || '',
        plannedStartDate: toInputDate(plan.planned_start_date),
        plannedEndDate: toInputDate(plan.planned_end_date),
        totalMandays: plan.total_mandays || 0,
        totalBudget: plan.total_budget || 0,
        mandayRate: plan.manday_rate || 0,
    })

    // Auto-calculate budget from mandays * rate
    const calculatedBudget = useMemo(() => {
        return formData.totalMandays * formData.mandayRate
    }, [formData.totalMandays, formData.mandayRate])

    // Format number with commas
    const formatNumber = (num: number) => {
        return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    // Calculate duration in days
    const durationDays = useMemo(() => {
        if (!formData.plannedStartDate || !formData.plannedEndDate) return 0
        const start = new Date(formData.plannedStartDate)
        const end = new Date(formData.plannedEndDate)
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }, [formData.plannedStartDate, formData.plannedEndDate])

    // Save handler
    const handleSave = async () => {
        if (!formData.planName.trim()) {
            toast.error('กรุณากรอกชื่อแผน')
            return
        }
        if (!formData.plannedStartDate) {
            toast.error('กรุณาระบุวันที่เริ่มต้น')
            return
        }
        if (!formData.plannedEndDate) {
            toast.error('กรุณาระบุวันที่สิ้นสุด')
            return
        }
        if (formData.plannedEndDate < formData.plannedStartDate) {
            toast.error('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น')
            return
        }

        setSaving(true)
        try {
            const result = await updateProjectPlan(planId, {
                planName: formData.planName.trim(),
                description: formData.description.trim() || undefined,
                objectives: formData.objectives.trim() || undefined,
                scopeSummary: formData.scopeSummary.trim() || undefined,
                plannedStartDate: formData.plannedStartDate,
                plannedEndDate: formData.plannedEndDate,
                totalMandays: formData.totalMandays,
                totalBudget: calculatedBudget || formData.totalBudget,
                mandayRate: formData.mandayRate,
            })

            if (result.success) {
                toast.success('บันทึกข้อมูลแผนสำเร็จ')
                onUpdate()
            } else {
                toast.error(result.error || 'ไม่สามารถบันทึกได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดที่ไม่คาดคิด')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">ข้อมูลแผนโครงการ</h3>
                </div>
                {!readOnly && (
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        บันทึก
                    </Button>
                )}
            </div>

            <div className="grid gap-6">
                {/* Plan Name */}
                <div className="space-y-2">
                    <Label htmlFor="pi-name">
                        ชื่อแผน <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="pi-name"
                        value={formData.planName}
                        onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                        placeholder="ชื่อแผนโครงการ"
                        disabled={readOnly}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="pi-desc">รายละเอียด</Label>
                    <Textarea
                        id="pi-desc"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="รายละเอียดแผนโครงการ..."
                        rows={3}
                        disabled={readOnly}
                    />
                </div>

                {/* Objectives */}
                <div className="space-y-2">
                    <Label htmlFor="pi-objectives">วัตถุประสงค์</Label>
                    <Textarea
                        id="pi-objectives"
                        value={formData.objectives}
                        onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                        placeholder="วัตถุประสงค์ของแผนโครงการ..."
                        rows={3}
                        disabled={readOnly}
                    />
                </div>

                {/* Scope Summary */}
                <div className="space-y-2">
                    <Label htmlFor="pi-scope">ขอบเขตโครงการ (Scope Summary)</Label>
                    <Textarea
                        id="pi-scope"
                        value={formData.scopeSummary}
                        onChange={(e) => setFormData({ ...formData, scopeSummary: e.target.value })}
                        placeholder="สรุปขอบเขตโครงการ..."
                        rows={3}
                        disabled={readOnly}
                    />
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="pi-start">
                            วันที่เริ่มต้น <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="pi-start"
                            type="date"
                            value={formData.plannedStartDate}
                            onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pi-end">
                            วันที่สิ้นสุด <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="pi-end"
                            type="date"
                            value={formData.plannedEndDate}
                            onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>ระยะเวลา (วัน)</Label>
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                            {durationDays > 0 ? `${durationDays} วัน` : '-'}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Budget */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="pi-mandays">Man-days รวม</Label>
                        <Input
                            id="pi-mandays"
                            type="number"
                            min={0}
                            value={formData.totalMandays}
                            onChange={(e) =>
                                setFormData({ ...formData, totalMandays: Number(e.target.value) || 0 })
                            }
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pi-rate">อัตรา/Man-day (บาท)</Label>
                        <Input
                            id="pi-rate"
                            type="number"
                            min={0}
                            value={formData.mandayRate}
                            onChange={(e) =>
                                setFormData({ ...formData, mandayRate: Number(e.target.value) || 0 })
                            }
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>งบประมาณรวม (บาท)</Label>
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                            {formatNumber(calculatedBudget)}
                        </div>
                    </div>
                </div>

                {/* Read-only metadata */}
                {plan.created_by_name && (
                    <>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                                <span className="font-medium">สร้างโดย:</span>{' '}
                                {plan.created_by_name}
                                {plan.created_at && (
                                    <span className="ml-2">
                                        ({format(new Date(plan.created_at), 'dd/MM/yyyy HH:mm')})
                                    </span>
                                )}
                            </div>
                            {plan.submitted_by_name && (
                                <div>
                                    <span className="font-medium">ส่งขออนุมัติโดย:</span>{' '}
                                    {plan.submitted_by_name}
                                    {plan.submitted_at && (
                                        <span className="ml-2">
                                            ({format(new Date(plan.submitted_at), 'dd/MM/yyyy HH:mm')})
                                        </span>
                                    )}
                                </div>
                            )}
                            {plan.approved_by_name && (
                                <div>
                                    <span className="font-medium">อนุมัติโดย:</span>{' '}
                                    {plan.approved_by_name}
                                    {plan.approved_at && (
                                        <span className="ml-2">
                                            ({format(new Date(plan.approved_at), 'dd/MM/yyyy HH:mm')})
                                        </span>
                                    )}
                                </div>
                            )}
                            {plan.approval_comments && (
                                <div>
                                    <span className="font-medium">ความเห็น:</span>{' '}
                                    {plan.approval_comments}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
