'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react'
import { format } from 'date-fns'
import {
    getResourcePlans,
    createResourcePlan,
    updateResourcePlan,
    deleteResourcePlan,
    getMilestonePlans,
    getEmployeesForPlanning,
    ResourcePlan,
    MilestonePlan,
} from '@/lib/actions/project-planning-actions'

// Position options
const POSITION_OPTIONS: Option[] = [
    { value: 'PM', label: 'Project Manager (PM)' },
    { value: 'SA', label: 'System Analyst (SA)' },
    { value: 'PG', label: 'Programmer (PG)' },
    { value: 'Tester', label: 'Tester' },
    { value: 'Other', label: 'Other' },
]

interface ResourcePlanSectionProps {
    planId: string
    readOnly: boolean
}

interface FormData {
    position: string
    quantity: number
    employeeId: string
    employeeNamePlaceholder: string
    allocationPercent: number
    startDate: string
    endDate: string
    milestonePlanId: string
    notes: string
}

const emptyForm: FormData = {
    position: '',
    quantity: 1,
    employeeId: '',
    employeeNamePlaceholder: '',
    allocationPercent: 100,
    startDate: '',
    endDate: '',
    milestonePlanId: '',
    notes: '',
}

export function ResourcePlanSection({ planId, readOnly }: ResourcePlanSectionProps) {
    const [resources, setResources] = useState<ResourcePlan[]>([])
    const [milestones, setMilestones] = useState<MilestonePlan[]>([])
    const [employees, setEmployees] = useState<{ id: string; full_name: string; position_name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<ResourcePlan | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [resResult, msResult, empResult] = await Promise.all([
                getResourcePlans(planId),
                getMilestonePlans(planId),
                getEmployeesForPlanning(),
            ])
            if (resResult.success && resResult.data) setResources(resResult.data)
            if (msResult.success && msResult.data) setMilestones(msResult.data)
            if (empResult.success && empResult.data) setEmployees(empResult.data)
        } catch {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId])

    // Combobox options
    const milestoneOptions: Option[] = useMemo(
        () => milestones.map((m) => ({ value: m.milestone_plan_id, label: m.milestone_name })),
        [milestones]
    )

    const employeeOptions: Option[] = useMemo(
        () => employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.position_name})` })),
        [employees]
    )

    // Selected options for form
    const selectedPosition = useMemo(
        () => POSITION_OPTIONS.find((p) => p.value === formData.position) || null,
        [formData.position]
    )
    const selectedEmployee = useMemo(
        () => employeeOptions.find((e) => e.value === formData.employeeId) || null,
        [employeeOptions, formData.employeeId]
    )
    const selectedMilestone = useMemo(
        () => milestoneOptions.find((m) => m.value === formData.milestonePlanId) || null,
        [milestoneOptions, formData.milestonePlanId]
    )

    // Summary calculations
    const summary = useMemo(() => {
        const totalTeam = resources.reduce((sum, r) => sum + (r.quantity || 0), 0)
        const totalMandays = resources.reduce((sum, r) => sum + (r.planned_mandays || 0), 0)
        const byPosition: Record<string, { count: number; mandays: number }> = {}
        resources.forEach((r) => {
            const pos = r.position || 'Other'
            if (!byPosition[pos]) byPosition[pos] = { count: 0, mandays: 0 }
            byPosition[pos].count += r.quantity || 0
            byPosition[pos].mandays += r.planned_mandays || 0
        })
        return { totalTeam, totalMandays, byPosition }
    }, [resources])

    // Format helpers
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy')
        } catch {
            return '-'
        }
    }

    const toInputDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd')
        } catch {
            return ''
        }
    }

    // Dialog actions
    const handleAdd = () => {
        setEditingItem(null)
        setFormData(emptyForm)
        setDialogOpen(true)
    }

    const handleEdit = (item: ResourcePlan) => {
        setEditingItem(item)
        setFormData({
            position: item.position || '',
            quantity: item.quantity || 1,
            employeeId: item.employee_id || '',
            employeeNamePlaceholder: item.employee_name || '',
            allocationPercent: item.allocation_percent || 100,
            startDate: toInputDate(item.start_date),
            endDate: toInputDate(item.end_date),
            milestonePlanId: item.milestone_plan_id || '',
            notes: item.notes || '',
        })
        setDialogOpen(true)
    }

    const handleDeleteClick = (id: string) => {
        setDeletingId(id)
        setDeleteDialogOpen(true)
    }

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.position) {
            toast.error('กรุณาเลือกตำแหน่ง')
            return
        }
        if (!formData.startDate || !formData.endDate) {
            toast.error('กรุณาระบุวันที่เริ่มต้นและสิ้นสุด')
            return
        }
        if (formData.endDate < formData.startDate) {
            toast.error('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น')
            return
        }

        setSaving(true)
        try {
            if (editingItem) {
                const result = await updateResourcePlan(editingItem.resource_plan_id, {
                    position: formData.position,
                    quantity: formData.quantity,
                    employeeId: formData.employeeId || null,
                    employeeNamePlaceholder: formData.employeeNamePlaceholder || null,
                    allocationPercent: formData.allocationPercent,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    milestonePlanId: formData.milestonePlanId || null,
                    notes: formData.notes || null,
                })
                if (result.success) {
                    toast.success('อัปเดตทรัพยากรสำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถอัปเดตได้')
                }
            } else {
                const result = await createResourcePlan({
                    planId,
                    position: formData.position,
                    quantity: formData.quantity,
                    employeeId: formData.employeeId || undefined,
                    employeeNamePlaceholder: formData.employeeNamePlaceholder || undefined,
                    allocationPercent: formData.allocationPercent,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    milestonePlanId: formData.milestonePlanId || undefined,
                    notes: formData.notes || undefined,
                })
                if (result.success) {
                    toast.success('เพิ่มทรัพยากรสำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถเพิ่มได้')
                }
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดที่ไม่คาดคิด')
        } finally {
            setSaving(false)
        }
    }

    // Delete
    const handleDelete = async () => {
        if (!deletingId) return
        setSaving(true)
        try {
            const result = await deleteResourcePlan(deletingId)
            if (result.success) {
                toast.success('ลบทรัพยากรสำเร็จ')
                setDeleteDialogOpen(false)
                setDeletingId(null)
                await loadData()
            } else {
                toast.error(result.error || 'ไม่สามารถลบได้')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการลบ')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Resource Plan</h3>
                    <span className="text-sm text-muted-foreground">({resources.length} รายการ)</span>
                </div>
                {!readOnly && (
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่มทรัพยากร
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </div>
            ) : resources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มีทรัพยากร</p>
                    {!readOnly && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-1" />
                            เพิ่มทรัพยากรแรก
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* Resource Table */}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ตำแหน่ง</TableHead>
                                <TableHead className="w-[60px] text-center">จำนวน</TableHead>
                                <TableHead>ชื่อ</TableHead>
                                <TableHead className="w-[90px] text-center">Allocation%</TableHead>
                                <TableHead className="w-[100px]">เริ่ม</TableHead>
                                <TableHead className="w-[100px]">สิ้นสุด</TableHead>
                                <TableHead className="w-[80px] text-right">Man-days</TableHead>
                                <TableHead>Milestone</TableHead>
                                {!readOnly && <TableHead className="w-[100px] text-center">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resources.map((r) => (
                                <TableRow key={r.resource_plan_id}>
                                    <TableCell>
                                        <Badge variant="outline">{r.position}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">{r.quantity}</TableCell>
                                    <TableCell className="text-sm">
                                        {r.employee_name || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">{r.allocation_percent}%</TableCell>
                                    <TableCell className="text-sm">{formatDate(r.start_date)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(r.end_date)}</TableCell>
                                    <TableCell className="text-right font-medium">{r.planned_mandays || 0}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {r.milestone_name || '-'}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEdit(r)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteClick(r.resource_plan_id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Summary */}
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-sm text-muted-foreground">ทีมรวม</div>
                            <div className="text-2xl font-bold">{summary.totalTeam} <span className="text-sm font-normal">คน</span></div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-sm text-muted-foreground">Man-days รวม</div>
                            <div className="text-2xl font-bold">{summary.totalMandays}</div>
                        </div>
                        {Object.entries(summary.byPosition).map(([pos, data]) => (
                            <div key={pos} className="bg-muted/50 rounded-lg p-3">
                                <div className="text-sm text-muted-foreground">{pos}</div>
                                <div className="text-lg font-bold">
                                    {data.count} <span className="text-sm font-normal">คน</span>
                                    <span className="text-sm text-muted-foreground ml-2">({data.mandays} MD)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'แก้ไขทรัพยากร' : 'เพิ่มทรัพยากร'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'แก้ไขข้อมูลทรัพยากรที่เลือก'
                                : 'กรอกข้อมูลสำหรับทรัพยากรใหม่'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>
                                        ตำแหน่ง <span className="text-red-500">*</span>
                                    </Label>
                                    <SmartCombobox
                                        options={POSITION_OPTIONS}
                                        value={selectedPosition}
                                        onChange={(opt) =>
                                            setFormData({ ...formData, position: (opt?.value as string) || '' })
                                        }
                                        placeholder="เลือกตำแหน่ง"
                                        searchable={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rp-qty">จำนวน (คน)</Label>
                                    <Input
                                        id="rp-qty"
                                        type="number"
                                        min={1}
                                        value={formData.quantity}
                                        onChange={(e) =>
                                            setFormData({ ...formData, quantity: Number(e.target.value) || 1 })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>พนักงาน (ถ้ามี)</Label>
                                <SmartCombobox
                                    options={employeeOptions}
                                    value={selectedEmployee}
                                    onChange={(opt) =>
                                        setFormData({
                                            ...formData,
                                            employeeId: (opt?.value as string) || '',
                                            employeeNamePlaceholder: opt ? '' : formData.employeeNamePlaceholder,
                                        })
                                    }
                                    placeholder="เลือกพนักงาน..."
                                />
                            </div>

                            {!formData.employeeId && (
                                <div className="space-y-2">
                                    <Label htmlFor="rp-placeholder">ชื่อ (placeholder)</Label>
                                    <Input
                                        id="rp-placeholder"
                                        value={formData.employeeNamePlaceholder}
                                        onChange={(e) =>
                                            setFormData({ ...formData, employeeNamePlaceholder: e.target.value })
                                        }
                                        placeholder="ระบุชื่อทรัพยากร (กรณียังไม่ระบุพนักงาน)"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rp-alloc">Allocation %</Label>
                                    <Input
                                        id="rp-alloc"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={formData.allocationPercent}
                                        onChange={(e) =>
                                            setFormData({ ...formData, allocationPercent: Number(e.target.value) || 100 })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rp-start">
                                        วันที่เริ่ม <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="rp-start"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rp-end">
                                        วันที่สิ้นสุด <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="rp-end"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Milestone (ไม่บังคับ)</Label>
                                <SmartCombobox
                                    options={milestoneOptions}
                                    value={selectedMilestone}
                                    onChange={(opt) =>
                                        setFormData({ ...formData, milestonePlanId: (opt?.value as string) || '' })
                                    }
                                    placeholder="เลือก Milestone..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rp-notes">หมายเหตุ</Label>
                                <Textarea
                                    id="rp-notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="หมายเหตุเพิ่มเติม..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                            >
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingItem ? 'บันทึก' : 'เพิ่ม'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณต้องการลบทรัพยากรนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
