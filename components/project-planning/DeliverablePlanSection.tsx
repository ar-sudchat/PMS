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
import { SmartCombobox, Option } from '@/components/shared/SmartCombobox'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, FileCheck } from 'lucide-react'
import { format } from 'date-fns'
import {
    getDeliverablePlans,
    createDeliverablePlan,
    updateDeliverablePlan,
    deleteDeliverablePlan,
    getMilestonePlans,
    DeliverablePlan,
    MilestonePlan,
} from '@/lib/actions/project-planning-actions'

// Deliverable type options
const TYPE_OPTIONS: Option[] = [
    { value: 'Document', label: 'Document' },
    { value: 'Code', label: 'Code' },
    { value: 'Sign-off', label: 'Sign-off' },
    { value: 'Other', label: 'Other' },
]

// Status badge variant map
const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline' }> = {
    PENDING: { label: 'รอดำเนินการ', variant: 'secondary' },
    IN_PROGRESS: { label: 'กำลังดำเนินการ', variant: 'warning' },
    COMPLETED: { label: 'เสร็จสิ้น', variant: 'success' },
    CANCELLED: { label: 'ยกเลิก', variant: 'outline' },
}

interface DeliverablePlanSectionProps {
    planId: string
    readOnly: boolean
}

interface FormData {
    name: string
    description: string
    milestonePlanId: string
    dueDate: string
    deliverableType: string
}

const emptyForm: FormData = {
    name: '',
    description: '',
    milestonePlanId: '',
    dueDate: '',
    deliverableType: '',
}

export function DeliverablePlanSection({ planId, readOnly }: DeliverablePlanSectionProps) {
    const [deliverables, setDeliverables] = useState<DeliverablePlan[]>([])
    const [milestones, setMilestones] = useState<MilestonePlan[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<DeliverablePlan | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(emptyForm)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [delResult, msResult] = await Promise.all([
                getDeliverablePlans(planId),
                getMilestonePlans(planId),
            ])
            if (delResult.success && delResult.data) setDeliverables(delResult.data)
            if (msResult.success && msResult.data) setMilestones(msResult.data)
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

    // Selected options for form
    const selectedType = useMemo(
        () => TYPE_OPTIONS.find((t) => t.value === formData.deliverableType) || null,
        [formData.deliverableType]
    )
    const selectedMilestone = useMemo(
        () => milestoneOptions.find((m) => m.value === formData.milestonePlanId) || null,
        [milestoneOptions, formData.milestonePlanId]
    )

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

    const handleEdit = (item: DeliverablePlan) => {
        setEditingItem(item)
        setFormData({
            name: item.name || '',
            description: item.description || '',
            milestonePlanId: item.milestone_plan_id || '',
            dueDate: toInputDate(item.due_date),
            deliverableType: item.deliverable_type || '',
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

        if (!formData.name.trim()) {
            toast.error('กรุณากรอกชื่อ Deliverable')
            return
        }
        if (!formData.dueDate) {
            toast.error('กรุณาระบุกำหนดส่ง')
            return
        }

        setSaving(true)
        try {
            if (editingItem) {
                const result = await updateDeliverablePlan(editingItem.id, {
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                    milestonePlanId: formData.milestonePlanId || null,
                    dueDate: formData.dueDate,
                    deliverableType: formData.deliverableType || null,
                })
                if (result.success) {
                    toast.success('อัปเดต Deliverable สำเร็จ')
                    setDialogOpen(false)
                    await loadData()
                } else {
                    toast.error(result.error || 'ไม่สามารถอัปเดตได้')
                }
            } else {
                const result = await createDeliverablePlan({
                    planId,
                    name: formData.name.trim(),
                    description: formData.description.trim() || undefined,
                    milestonePlanId: formData.milestonePlanId || undefined,
                    dueDate: formData.dueDate,
                    deliverableType: formData.deliverableType || undefined,
                })
                if (result.success) {
                    toast.success('เพิ่ม Deliverable สำเร็จ')
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
            const result = await deleteDeliverablePlan(deletingId)
            if (result.success) {
                toast.success('ลบ Deliverable สำเร็จ')
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
                    <FileCheck className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Deliverable Plan</h3>
                    <span className="text-sm text-muted-foreground">({deliverables.length} รายการ)</span>
                </div>
                {!readOnly && (
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่ม Deliverable
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </div>
            ) : deliverables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มี Deliverable</p>
                    {!readOnly && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-1" />
                            เพิ่ม Deliverable แรก
                        </Button>
                    )}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อ</TableHead>
                            <TableHead className="w-[100px]">ประเภท</TableHead>
                            <TableHead>Milestone</TableHead>
                            <TableHead className="w-[110px]">กำหนดส่ง</TableHead>
                            <TableHead className="w-[120px]">สถานะ</TableHead>
                            {!readOnly && <TableHead className="w-[100px] text-center">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deliverables.map((d) => {
                            const statusInfo = STATUS_BADGE[d.status] || STATUS_BADGE.PENDING
                            return (
                                <TableRow key={d.id}>
                                    <TableCell>
                                        <div>
                                            <span className="font-medium">{d.name}</span>
                                            {d.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                    {d.description}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{d.deliverable_type || '-'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {d.milestone_name || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(d.due_date)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEdit(d)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteClick(d.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'แก้ไข Deliverable' : 'เพิ่ม Deliverable'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'แก้ไขข้อมูล Deliverable ที่เลือก'
                                : 'กรอกข้อมูลสำหรับ Deliverable ใหม่'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="dl-name">
                                    ชื่อ Deliverable <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dl-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น SRS Document, User Manual"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dl-desc">รายละเอียด</Label>
                                <Textarea
                                    id="dl-desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>ประเภท</Label>
                                    <SmartCombobox
                                        options={TYPE_OPTIONS}
                                        value={selectedType}
                                        onChange={(opt) =>
                                            setFormData({ ...formData, deliverableType: (opt?.value as string) || '' })
                                        }
                                        placeholder="เลือกประเภท"
                                        searchable={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dl-due">
                                        กำหนดส่ง <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dl-due"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                            คุณต้องการลบ Deliverable นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
