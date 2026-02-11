'use client'

import { useState, useMemo } from 'react'
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
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { createProjectPlan } from '@/lib/actions/project-planning-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CreatePlanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectOptions: { id: string; project_code: string; name: string }[]
    onSuccess: (planId: string) => void
}

export function CreatePlanDialog({
    open,
    onOpenChange,
    projectOptions,
    onSuccess,
}: CreatePlanDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Option | null>(null)
    const [formData, setFormData] = useState({
        planName: 'แผนโครงการ v1',
        description: '',
        objectives: '',
        plannedStartDate: '',
        plannedEndDate: '',
        totalMandays: 0,
        mandayRate: 15000,
    })

    // Map project options to SmartCombobox format
    const comboboxOptions: Option[] = useMemo(() => {
        return projectOptions.map((p) => ({
            value: p.id,
            label: `${p.project_code} - ${p.name}`,
        }))
    }, [projectOptions])

    // Auto-calculate total budget
    const totalBudget = useMemo(() => {
        return formData.totalMandays * formData.mandayRate
    }, [formData.totalMandays, formData.mandayRate])

    // Format number with commas
    const formatNumber = (num: number) => {
        return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const resetForm = () => {
        setSelectedProject(null)
        setFormData({
            planName: 'แผนโครงการ v1',
            description: '',
            objectives: '',
            plannedStartDate: '',
            plannedEndDate: '',
            totalMandays: 0,
            mandayRate: 15000,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!selectedProject) {
            toast.error('กรุณาเลือกโครงการ')
            return
        }
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
        if (formData.totalMandays < 0) {
            toast.error('จำนวน Man-days ต้องไม่ติดลบ')
            return
        }

        setIsLoading(true)
        try {
            const result = await createProjectPlan({
                projectId: selectedProject.value as string,
                planName: formData.planName.trim(),
                description: formData.description.trim() || undefined,
                objectives: formData.objectives.trim() || undefined,
                plannedStartDate: formData.plannedStartDate,
                plannedEndDate: formData.plannedEndDate,
                totalMandays: formData.totalMandays,
                totalBudget: totalBudget || undefined,
                mandayRate: formData.mandayRate || undefined,
            })

            if (result.success && result.planId) {
                toast.success('สร้างแผนโครงการสำเร็จ')
                onOpenChange(false)
                resetForm()
                onSuccess(result.planId)
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาดในการสร้างแผนโครงการ')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>สร้างแผนโครงการใหม่</DialogTitle>
                    <DialogDescription>
                        กรอกข้อมูลเบื้องต้นสำหรับแผนโครงการ สามารถเพิ่มรายละเอียดเพิ่มเติมได้ภายหลัง
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Project Selection */}
                        <div className="space-y-2">
                            <Label>
                                โครงการ <span className="text-red-500">*</span>
                            </Label>
                            <SmartCombobox
                                options={comboboxOptions}
                                value={selectedProject}
                                onChange={setSelectedProject}
                                placeholder="เลือกโครงการ..."
                                required
                            />
                        </div>

                        {/* Plan Name */}
                        <div className="space-y-2">
                            <Label htmlFor="planName">
                                ชื่อแผน <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="planName"
                                value={formData.planName}
                                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                                placeholder="ชื่อแผนโครงการ"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="รายละเอียดแผนโครงการ..."
                                rows={3}
                            />
                        </div>

                        {/* Objectives */}
                        <div className="space-y-2">
                            <Label htmlFor="objectives">วัตถุประสงค์</Label>
                            <Textarea
                                id="objectives"
                                value={formData.objectives}
                                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                placeholder="วัตถุประสงค์ของแผนโครงการ..."
                                rows={3}
                            />
                        </div>

                        {/* Planned Start / End Date - side by side */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="plannedStartDate">
                                    วันที่เริ่มต้น <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="plannedStartDate"
                                    type="date"
                                    value={formData.plannedStartDate}
                                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plannedEndDate">
                                    วันที่สิ้นสุด <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="plannedEndDate"
                                    type="date"
                                    value={formData.plannedEndDate}
                                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Mandays, Rate, Total Budget - in a row */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalMandays">
                                    Man-days รวม <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="totalMandays"
                                    type="number"
                                    min={0}
                                    value={formData.totalMandays}
                                    onChange={(e) => setFormData({ ...formData, totalMandays: Number(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mandayRate">อัตรา/Man-day (บาท)</Label>
                                <Input
                                    id="mandayRate"
                                    type="number"
                                    min={0}
                                    value={formData.mandayRate}
                                    onChange={(e) => setFormData({ ...formData, mandayRate: Number(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>งบประมาณรวม (บาท)</Label>
                                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                                    {formatNumber(totalBudget)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            สร้างแผนโครงการ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
