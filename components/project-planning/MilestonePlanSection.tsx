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
import { Separator } from '@/components/ui/separator'
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Milestone } from 'lucide-react'
import { format } from 'date-fns'
import {
    getMilestonePlans,
    createMilestonePlan,
    updateMilestonePlan,
    deleteMilestonePlan,
    MilestonePlan,
} from '@/lib/actions/project-planning-actions'

// Preset color options for milestones
const PRESET_COLORS: Option[] = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#F97316', label: 'Orange' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#6366F1', label: 'Indigo' },
]

interface MilestonePlanSectionProps {
    planId: string
    readOnly: boolean
}

interface FormData {
    name: string
    description: string
    plannedStartDate: string
    plannedEndDate: string
    plannedMandays: number
    sortOrder: number
    color: string
}

const emptyForm: FormData = {
    name: '',
    description: '',
    plannedStartDate: '',
    plannedEndDate: '',
    plannedMandays: 0,
    sortOrder: 0,
    color: '#3B82F6',
}

export function MilestonePlanSection({ planId, readOnly }: MilestonePlanSectionProps) {
    const [milestones, setMilestones] = useState<MilestonePlan[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<MilestonePlan | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)

    // Load milestones
    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getMilestonePlans(planId)
            if (result.success && result.data) {
                setMilestones(result.data)
            } else {
                toast.error(result.error || 'ไม่สามารถโหลดข้อมูล Milestone ได้')
            }
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

    // Compute timeline boundaries for Gantt chart
    const timelineBounds = useMemo(() => {
        if (milestones.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 }
        const dates = milestones.flatMap((m) => [
            new Date(m.planned_start_date),
            new Date(m.planned_end_date),
        ])
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
        const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        return { minDate, maxDate, totalDays }
    }, [milestones])

    // Selected color option for combobox
    const selectedColorOption = useMemo(() => {
        return PRESET_COLORS.find((c) => c.value === formData.color) || null
    }, [formData.color])

    // Color option renderer with swatch
    const colorOptions: Option[] = useMemo(() => {
        return PRESET_COLORS.map((c) => ({
            ...c,
            render: (
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block w-4 h-4 rounded-full border"
                        style={{ backgroundColor: c.value as string }}
                    />
                    <span>{c.label}</span>
                </div>
            ),
        }))
    }, [])

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy')
        } catch {
            return '-'
        }
    }

    // Format date for input value
    const toInputDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd')
        } catch {
            return ''
        }
    }

    // Open dialog for adding
    const handleAdd = () => {
        setEditingItem(null)
        setFormData({
            ...emptyForm,
            sortOrder: milestones.length + 1,
        })
        setDialogOpen(true)
    }

    // Open dialog for editing
    const handleEdit = (item: MilestonePlan) => {
        setEditingItem(item)
        setFormData({
            name: item.milestone_name,
            description: item.milestone_description || '',
            plannedStartDate: toInputDate(item.planned_start_date),
            plannedEndDate: toInputDate(item.planned_end_date),
            plannedMandays: item.planned_mandays || 0,
            sortOrder: item.sort_order || 0,
            color: item.color || '#3B82F6',
        })
        setDialogOpen(true)
    }

    // Open delete confirmation
    const handleDeleteClick = (id: string) => {
        setDeletingId(id)
        setDeleteDialogOpen(true)
    }

    // Submit form (create or update)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('กรุณากรอกชื่อ Milestone')
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
            if (editingItem) {
                const result = await updateMilestonePlan(editingItem.milestone_plan_id, {
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    plannedStartDate: formData.plannedStartDate,
                    plannedEndDate: formData.plannedEndDate,
                    plannedMandays: formData.plannedMandays,
                    sortOrder: formData.sortOrder,
                    color: formData.color,
                })
                if (result.success) {
                    toast.success('อัปเดต Milestone สำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถอัปเดตได้')
                }
            } else {
                const result = await createMilestonePlan({
                    planId,
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    plannedStartDate: formData.plannedStartDate,
                    plannedEndDate: formData.plannedEndDate,
                    plannedMandays: formData.plannedMandays,
                    sortOrder: formData.sortOrder,
                    color: formData.color,
                })
                if (result.success) {
                    toast.success('เพิ่ม Milestone สำเร็จ')
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
            const result = await deleteMilestonePlan(deletingId)
            if (result.success) {
                toast.success('ลบ Milestone สำเร็จ')
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

    // Calculate Gantt bar position
    const getBarStyle = (startDate: string, endDate: string) => {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const offsetDays = Math.ceil((start.getTime() - timelineBounds.minDate.getTime()) / (1000 * 60 * 60 * 24))
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const leftPercent = (offsetDays / timelineBounds.totalDays) * 100
        const widthPercent = (durationDays / timelineBounds.totalDays) * 100
        return { left: `${leftPercent}%`, width: `${Math.max(widthPercent, 2)}%` }
    }

    // Summary totals
    const totalMandays = milestones.reduce((sum, m) => sum + (m.planned_mandays || 0), 0)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Milestone className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Milestone Plan</h3>
                    <span className="text-sm text-muted-foreground">({milestones.length} รายการ)</span>
                </div>
                {!readOnly && (
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่ม Milestone
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </div>
            ) : milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Milestone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มี Milestone</p>
                    {!readOnly && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-1" />
                            เพิ่ม Milestone แรก
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* Milestone Table */}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">ลำดับ</TableHead>
                                <TableHead>ชื่อ Milestone</TableHead>
                                <TableHead className="w-[110px]">เริ่ม</TableHead>
                                <TableHead className="w-[110px]">สิ้นสุด</TableHead>
                                <TableHead className="w-[90px] text-right">Man-days</TableHead>
                                <TableHead className="w-[60px] text-center">สี</TableHead>
                                {!readOnly && <TableHead className="w-[100px] text-center">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {milestones.map((m, idx) => (
                                <TableRow key={m.milestone_plan_id}>
                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                    <TableCell>
                                        <div>
                                            <span className="font-medium">{m.milestone_name}</span>
                                            {m.milestone_description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                    {m.milestone_description}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(m.planned_start_date)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(m.planned_end_date)}</TableCell>
                                    <TableCell className="text-right font-medium">{m.planned_mandays || 0}</TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className="inline-block w-5 h-5 rounded-full border"
                                            style={{ backgroundColor: m.color || '#3B82F6' }}
                                        />
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEdit(m)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteClick(m.milestone_plan_id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {/* Summary row */}
                            <TableRow className="bg-muted/50 font-semibold">
                                <TableCell colSpan={4} className="text-right">
                                    รวม Man-days:
                                </TableCell>
                                <TableCell className="text-right">{totalMandays}</TableCell>
                                <TableCell />
                                {!readOnly && <TableCell />}
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* Simple Gantt-like Timeline */}
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Timeline</h4>
                        <div className="text-xs text-muted-foreground flex justify-between mb-1">
                            <span>{formatDate(timelineBounds.minDate.toISOString())}</span>
                            <span>{formatDate(timelineBounds.maxDate.toISOString())}</span>
                        </div>
                        <div className="space-y-1.5">
                            {milestones.map((m) => {
                                const barStyle = getBarStyle(m.planned_start_date, m.planned_end_date)
                                return (
                                    <div key={m.milestone_plan_id} className="flex items-center gap-2">
                                        <div className="w-[140px] text-xs truncate font-medium">
                                            {m.milestone_name}
                                        </div>
                                        <div className="flex-1 relative h-6 bg-muted rounded">
                                            <div
                                                className="absolute top-0 h-full rounded text-[10px] text-white flex items-center justify-center overflow-hidden"
                                                style={{
                                                    ...barStyle,
                                                    backgroundColor: m.color || '#3B82F6',
                                                }}
                                                title={`${formatDate(m.planned_start_date)} - ${formatDate(m.planned_end_date)} (${m.planned_mandays} man-days)`}
                                            >
                                                <span className="px-1 truncate">{m.planned_mandays}d</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'แก้ไข Milestone' : 'เพิ่ม Milestone'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'แก้ไขข้อมูล Milestone ที่เลือก'
                                : 'กรอกข้อมูลสำหรับ Milestone ใหม่'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="ms-name">
                                    ชื่อ Milestone <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="ms-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น Requirement Analysis, Development"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ms-desc">รายละเอียด</Label>
                                <Textarea
                                    id="ms-desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ms-start">
                                        วันที่เริ่ม <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="ms-start"
                                        type="date"
                                        value={formData.plannedStartDate}
                                        onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ms-end">
                                        วันที่สิ้นสุด <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="ms-end"
                                        type="date"
                                        value={formData.plannedEndDate}
                                        onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ms-mandays">Man-days</Label>
                                    <Input
                                        id="ms-mandays"
                                        type="number"
                                        min={0}
                                        value={formData.plannedMandays}
                                        onChange={(e) =>
                                            setFormData({ ...formData, plannedMandays: Number(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ms-order">ลำดับ</Label>
                                    <Input
                                        id="ms-order"
                                        type="number"
                                        min={0}
                                        value={formData.sortOrder}
                                        onChange={(e) =>
                                            setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>สี</Label>
                                    <SmartCombobox
                                        options={colorOptions}
                                        value={selectedColorOption}
                                        onChange={(opt) =>
                                            setFormData({ ...formData, color: (opt?.value as string) || '#3B82F6' })
                                        }
                                        placeholder="เลือกสี"
                                        searchable={false}
                                    />
                                </div>
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
                            คุณต้องการลบ Milestone นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
